import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import { canAccess, parseRole, type ModuleKey, type Role, type SessionUser } from "../shared/permissions";
import { sql } from "./db";

/**
 * Login com Google (OAuth 2.0 Authorization Code + PKCE), feito na própria API.
 * Custo de CPU baixo: só HMAC/SHA-256 do Web Crypto; nada de hash de senha.
 *
 *   GET  /api/auth/google            → redireciona ao Google
 *   GET  /api/auth/callback/google   → troca o código, confere o e-mail, cria a sessão
 *   POST /api/auth/logout            → apaga a sessão
 *   GET  /api/me                     → usuário logado (401 se não houver)
 */

export type AppEnv = { Bindings: Env; Variables: { user: SessionUser } };

const SESSION_COOKIE = "imobi_sessao";
const OAUTH_COOKIE = "imobi_oauth";
const SESSION_DAYS = 7;
const RECHECK_MS = 60_000; // revalida o usuário no banco no máximo a cada 1 min por isolate

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

function secret(env: Env): string {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) throw new Error("AUTH_SECRET ausente ou curto (mínimo 32 caracteres)");
  return env.AUTH_SECRET;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1] ?? "";
  const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(json, (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Só aceita caminhos internos ("/leads"), nunca "//site" ou "https://…" */
function safeReturnPath(raw: string | undefined | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

function isSecure(c: Context): boolean {
  return new URL(c.req.url).protocol === "https:";
}

function callbackUrl(c: Context): string {
  return `${new URL(c.req.url).origin}/api/auth/callback/google`;
}

// ─────────────────────────── quem pode entrar ───────────────────────────

type Resolved = { ok: true; user: SessionUser } | { ok: false; reason: "nao-autorizado" | "inativo" };

/**
 * Autoriza pelo cadastro de Corretores (espelho da planilha). Antes da primeira sincronização,
 * os e-mails em ADMIN_EMAILS entram como Sócio para conseguir configurar o sistema.
 */
async function resolveUser(env: Env, email: string, googleName?: string, foto?: string | null): Promise<Resolved> {
  const rows = (await sql(env)`
    select nome, perfil, ativo from corretores where lower(email) = lower(${email}) limit 1
  `) as { nome: string; perfil: string | null; ativo: boolean }[];
  const row = rows[0];
  if (row) {
    if (!row.ativo) return { ok: false, reason: "inativo" };
    const role: Role = parseRole(row.perfil) ?? "corretor";
    return { ok: true, user: { email: email.toLowerCase(), nome: row.nome, role, foto } };
  }
  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.includes(email.toLowerCase())) {
    return { ok: true, user: { email: email.toLowerCase(), nome: googleName || email, role: "socio", foto } };
  }
  return { ok: false, reason: "nao-autorizado" };
}

async function audit(env: Env, usuario: string, acao: string, detalhe?: string) {
  try {
    await sql(env)`insert into audit_log (usuario, acao, detalhe) values (${usuario}, ${acao}, ${detalhe ?? null})`;
  } catch (err) {
    console.error("audit: falha ao registrar", acao, err);
  }
}

// ─────────────────────────── rotas ───────────────────────────

export async function loginStart(c: Context<AppEnv>) {
  if (!c.env.AUTH_GOOGLE_ID) return c.text("Login com Google não configurado (AUTH_GOOGLE_ID).", 500);
  const state = randomToken(16);
  const verifier = randomToken(32);
  const voltar = safeReturnPath(c.req.query("voltar"));

  await setSignedCookie(c, OAUTH_COOKIE, JSON.stringify({ state, verifier, voltar }), secret(c.env), {
    httpOnly: true,
    secure: isSecure(c),
    sameSite: "Lax",
    path: "/api/auth",
    maxAge: 600,
  });

  const url = new URL(GOOGLE_AUTH);
  url.search = new URLSearchParams({
    client_id: c.env.AUTH_GOOGLE_ID,
    redirect_uri: callbackUrl(c),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return c.redirect(url.toString());
}

export async function loginCallback(c: Context<AppEnv>) {
  const fail = (erro: string) => c.redirect(`/login?erro=${erro}`);

  const raw = await getSignedCookie(c, secret(c.env), OAUTH_COOKIE);
  deleteCookie(c, OAUTH_COOKIE, { path: "/api/auth", secure: isSecure(c) });
  if (!raw) return fail("sessao-expirada");

  let saved: { state: string; verifier: string; voltar: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return fail("sessao-expirada");
  }
  if (c.req.query("error")) return fail("cancelado");
  const code = c.req.query("code");
  if (!code || c.req.query("state") !== saved.state) return fail("sessao-expirada");

  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.AUTH_GOOGLE_ID ?? "",
      client_secret: c.env.AUTH_GOOGLE_SECRET ?? "",
      redirect_uri: callbackUrl(c),
      grant_type: "authorization_code",
      code_verifier: saved.verifier,
    }),
  });
  if (!tokenRes.ok) {
    console.error("auth: troca de código falhou", tokenRes.status, await tokenRes.text());
    return fail("google");
  }
  const { id_token } = (await tokenRes.json()) as { id_token?: string };
  if (!id_token) return fail("google");

  // O id_token veio direto do endpoint do Google por HTTPS (OIDC Core §3.1.3.7): validamos as
  // declarações; a assinatura dispensa checagem neste caso.
  const claims = decodeJwtPayload(id_token);
  const nowSec = Math.floor(Date.now() / 1000);
  const issOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issOk || claims.aud !== c.env.AUTH_GOOGLE_ID || typeof claims.exp !== "number" || claims.exp < nowSec) {
    return fail("google");
  }
  const email = String(claims.email ?? "").toLowerCase();
  if (!email || claims.email_verified !== true) return fail("email-nao-verificado");

  const resolved = await resolveUser(
    c.env,
    email,
    typeof claims.name === "string" ? claims.name : undefined,
    typeof claims.picture === "string" ? claims.picture : null,
  );
  if (!resolved.ok) {
    await audit(c.env, email, "login_negado", resolved.reason);
    return fail(resolved.reason);
  }

  const user = resolved.user;
  const token = await sign(
    { sub: user.email, nome: user.nome, role: user.role, foto: user.foto ?? null, exp: nowSec + SESSION_DAYS * 86400 },
    secret(c.env),
    "HS256",
  );
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(c),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  await audit(c.env, user.email, "login", `perfil ${user.role}`);
  return c.redirect(saved.voltar);
}

export function logout(c: Context<AppEnv>) {
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: isSecure(c) });
  return c.json({ ok: true });
}

// ─────────────────────────── middlewares ───────────────────────────

const recheck = new Map<string, { at: number; user: SessionUser | null }>();

/** Exige sessão válida e um usuário ainda autorizado no cadastro. */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "Não autenticado" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await verify(token, secret(c.env), "HS256");
  } catch {
    deleteCookie(c, SESSION_COOKIE, { path: "/", secure: isSecure(c) });
    return c.json({ error: "Sessão expirada" }, 401);
  }

  const email = String(payload.sub);
  const cached = recheck.get(email);
  let user: SessionUser | null;
  if (cached && Date.now() - cached.at < RECHECK_MS) {
    user = cached.user;
  } else {
    const r = await resolveUser(c.env, email, String(payload.nome ?? ""), (payload.foto as string | null) ?? null);
    user = r.ok ? r.user : null;
    recheck.set(email, { at: Date.now(), user });
  }
  if (!user) {
    deleteCookie(c, SESSION_COOKIE, { path: "/", secure: isSecure(c) });
    return c.json({ error: "Acesso revogado" }, 401);
  }
  c.set("user", user);
  await next();
};

/** Bloqueia no servidor o que o perfil não pode ver (não basta esconder no menu). */
export function requireModule(module: ModuleKey): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (!canAccess(c.get("user").role, module)) return c.json({ error: "Sem permissão para este módulo" }, 403);
    await next();
  };
}
