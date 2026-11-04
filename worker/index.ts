import { Hono } from "hono";
import { sql } from "./db";

/**
 * API do ImobiInsight. Só as rotas /api/* executam o Worker (wrangler.jsonc → run_worker_first);
 * as telas são arquivos estáticos servidos pela Cloudflare sem custo de CPU.
 * Plano Free: 10 ms de CPU por requisição — manter handlers enxutos e agregar no SQL.
 */
const app = new Hono<{ Bindings: Env }>().basePath("/api");

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

app.notFound((c) => c.json({ error: "Rota não encontrada" }, 404));

app.onError((err, c) => {
  console.error("api: erro não tratado", err);
  return c.json({ error: "Erro interno" }, 500);
});

export default app satisfies ExportedHandler<Env>;
