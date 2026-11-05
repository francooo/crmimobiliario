// Login Google (até o redirecionamento), sessão, perfis pela planilha Corretores e CSRF.
import { api, B, check, resumo, sessao, sqlDev, vars } from "./_util.mjs";

console.log("Autenticação");
let r = await api("GET", "/api/me", { cookie: null });
check("sem sessão → 401", r.status === 401);

r = await api("GET", "/api/auth/google?voltar=/leads", { cookie: null });
const loc = new URL(r.headers.get("location") ?? "http://x");
const setCookie = r.headers.get("set-cookie") ?? "";
check("redireciona ao Google com client_id, PKCE e state", r.status === 302 && loc.host === "accounts.google.com" && loc.searchParams.get("client_id") === vars.AUTH_GOOGLE_ID && loc.searchParams.get("code_challenge_method") === "S256" && (loc.searchParams.get("state") ?? "").length >= 16);
check("redirect_uri do ambiente", loc.searchParams.get("redirect_uri") === `${B}/api/auth/callback/google`);
check("só escopos básicos", loc.searchParams.get("scope") === "openid email profile");
check("cookie OAuth HttpOnly + SameSite=Lax", /imobi_oauth=/.test(setCookie) && /HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie));
const oauth = setCookie.split(";")[0];
const salvo = (c) => JSON.parse(decodeURIComponent(c.split("=")[1]).replace(/\.[^.]+$/, ""));
check("guarda o destino /leads", salvo(oauth).voltar === "/leads");
for (const externo of ["https://evil.example", "//evil.example"]) {
  r = await api("GET", `/api/auth/google?voltar=${encodeURIComponent(externo)}`, { cookie: null });
  check(`bloqueia redirecionamento para ${externo}`, salvo((r.headers.get("set-cookie") ?? "").split(";")[0]).voltar === "/");
}
const cb = (qs, cookie) => fetch(`${B}/api/auth/callback/google?${qs}`, { redirect: "manual", headers: cookie ? { cookie } : {} }).then((x) => x.headers.get("location"));
check("callback sem cookie → sessao-expirada", (await cb("code=x&state=y")) === "/login?erro=sessao-expirada");
check("callback com state errado → sessao-expirada", (await cb("code=x&state=errado", oauth)) === "/login?erro=sessao-expirada");
check("cookie OAuth adulterado → sessao-expirada", (await cb(`code=x&state=${salvo(oauth).state}`, oauth.replace(/.$/, "A"))) === "/login?erro=sessao-expirada");
check("usuário cancelou → erro=cancelado", (await cb(`error=access_denied&state=${salvo(oauth).state}`, oauth)) === "/login?erro=cancelado");

r = await api("GET", "/api/me");
const me = r.status === 200 ? await r.json() : null;
check("admin (ADMIN_EMAILS) entra como Sócio", me?.role === "socio");
check("e-mail não cadastrado → 401 (perfil nunca vem do token)", (await api("GET", "/api/me", { email: "intruso@example.com" })).status === 401);
check("assinatura falsa → 401", (await api("GET", "/api/me", { cookie: sessao("andrewsfranco93@gmail.com", { segredo: "x".repeat(40) }) })).status === 401);
check("sessão expirada → 401", (await api("GET", "/api/me", { cookie: sessao("andrewsfranco93@gmail.com", { exp: 1 }) })).status === 401);

// Perfil e desativação pela planilha Corretores
const tag = Date.now();
const ativo = `teste.${tag}@example.com`, inativo = `inativo.${tag}@example.com`;
await sqlDev`insert into corretores (nome, nome_normalizado, funcao, email, perfil, ativo) values
  (${"Teste " + tag}, 'teste', 'Corretor', ${ativo}, 'corretor', true), (${"Inativo " + tag}, 'inativo', 'Corretor', ${inativo}, 'locacoes', false)`;
try {
  const m = await (await api("GET", "/api/me", { email: ativo })).json();
  check("corretor da planilha entra com o perfil dela", m.role === "corretor");
  check("corretor desativado → 401", (await api("GET", "/api/me", { email: inativo })).status === 401);
  check("corretor não acessa Financeiro (403 no servidor)", (await api("GET", "/api/financeiro", { email: ativo })).status === 403);
  check("corretor não acessa Dashboard", (await api("GET", "/api/dashboard", { email: ativo })).status === 403);
} finally {
  await sqlDev`delete from corretores where email in (${ativo}, ${inativo})`;
}

check("POST sem Origin → 403 (CSRF)", (await api("POST", "/api/auth/logout", { origin: null })).status === 403);
check("POST de outra origem → 403", (await api("POST", "/api/auth/logout", { origin: "https://evil.example" })).status === 403);
r = await api("POST", "/api/auth/logout");
check("logout apaga o cookie", r.status === 200 && /imobi_sessao=;/.test(r.headers.get("set-cookie") ?? ""));
r = await api("GET", "/api/health", { cookie: null });
check("cabeçalhos de segurança na API", r.headers.get("x-frame-options") === "DENY" && r.headers.get("cache-control") === "no-store" && r.headers.get("x-content-type-options") === "nosniff");
resumo("Autenticação");
