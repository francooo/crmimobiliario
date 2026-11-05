import { Hono } from "hono";
import { loginCallback, loginStart, logout, requireUser, type AppEnv } from "./auth";
import { admin } from "./api/admin";
import { comercial } from "./api/comercial";
import { gestao } from "./api/gestao";
import { imoveis } from "./api/imoveis";
import { sql } from "./db";
import { syncRoutes } from "./sync/routes";

/**
 * API do ImobiInsight. Só as rotas /api/* executam o Worker (wrangler.jsonc → run_worker_first);
 * as telas são arquivos estáticos servidos pela Cloudflare sem custo de CPU.
 * Plano Free: 10 ms de CPU por requisição — manter handlers enxutos e agregar no SQL.
 */
const app = new Hono<AppEnv>().basePath("/api");

app.use("*", async (c, next) => {
  // CSRF: ações que alteram dados só podem vir das próprias telas (mesma origem).
  // A sincronização do Apps Script (/api/sync) usa segredo próprio e fica de fora.
  const method = c.req.method;
  if (method !== "GET" && method !== "HEAD" && !c.req.path.startsWith("/api/sync")) {
    const origin = c.req.header("origin");
    if (origin !== new URL(c.req.url).origin) return c.json({ error: "Origem não permitida" }, 403);
  }
  await next();
  c.header("Cache-Control", c.res.headers.get("Cache-Control") ?? "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});

/** Verifica se o Worker alcança o Neon. Não expõe dados nem credenciais. */
app.get("/health", async (c) => {
  const started = Date.now();
  try {
    const [row] = await sql(c.env)`select current_setting('server_version') as version`;
    return c.json({ ok: true, db: "ok", postgres: row?.version, latencyMs: Date.now() - started });
  } catch (err) {
    console.error("health: falha no banco", err);
    return c.json({ ok: false, db: "erro", latencyMs: Date.now() - started }, 503);
  }
});

// ── Autenticação ──
app.get("/auth/google", loginStart);
app.get("/auth/callback/google", loginCallback);
app.post("/auth/logout", logout);

// ── Sincronização (Apps Script → API, autenticada por SYNC_SECRET) ──
app.route("/sync", syncRoutes);

// ── Rotas autenticadas ──
app.get("/me", requireUser, (c) => c.json(c.get("user")));
app.use("/dashboard", requireUser);
app.use("/leads", requireUser);
app.use("/leads/*", requireUser);
app.use("/funil", requireUser);
app.use("/fontes", requireUser);
app.use("/imoveis", requireUser);
app.use("/imoveis/*", requireUser);
app.use("/fotos/*", requireUser);
app.use("/agenciamentos", requireUser);
app.use("/corretores", requireUser);
for (const p of ["/marketing", "/financeiro", "/governanca", "/sincronizacao", "/sincronizacao/*", "/vinculos", "/vinculos/*"]) app.use(p, requireUser);
app.route("/", comercial);
app.route("/", imoveis);
app.route("/", gestao);
app.route("/", admin);

app.notFound((c) => c.json({ error: "Rota não encontrada" }, 404));

app.onError((err, c) => {
  console.error("api: erro não tratado", err);
  return c.json({ error: "Erro interno" }, 500);
});

export default app satisfies ExportedHandler<Env>;
