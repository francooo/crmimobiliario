import { Hono } from "hono";
import type { AppEnv } from "../auth";
import { sql } from "../db";
import { mergeStatements } from "./merge";
import { PLANILHAS, type Planilha } from "./schema";

/**
 * Recebe as planilhas enviadas pelo Apps Script (que já validou e normalizou as linhas com o
 * mesmo código de schema.ts). Para caber nos 10 ms de CPU do plano grátis, o Worker NÃO
 * interpreta o JSON: repassa o corpo para sync_receber() no banco (migrations/0004), que faz
 * hash, staging, trava de remoção, espelho e vínculos numa única chamada.
 *
 *   POST /api/sync/:planilha?parte=1&total=1&hash=…&origem=gatilho&forcar=0&runId=…
 *   Authorization: Bearer <SYNC_SECRET>
 *   { "registros": [...], "avisos": [...], "fonte": {...} }   ou   { "erro": "...", "avisos": [...] }
 */
export const syncRoutes = new Hono<AppEnv>();

const MAX_BYTES = 2_000_000; // ~500 linhas por parte ficam bem abaixo disso
const mergeCache = new Map<Planilha, string[]>();

function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

syncRoutes.use("*", async (c, next) => {
  const expected = c.env.SYNC_SECRET;
  if (!expected || expected.length < 32) return c.json({ error: "Sincronização não configurada (SYNC_SECRET)" }, 503);
  const got = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!timingSafeEqual(got, expected)) return c.json({ error: "Segredo de sincronização inválido" }, 401);
  await next();
});

const HTTP_STATUS: Record<string, 200 | 409 | 422> = { ok: 200, parcial: 200, ignorado: 200, bloqueado: 409, erro: 422 };

syncRoutes.post("/:planilha", async (c) => {
  const planilha = c.req.param("planilha") as Planilha;
  if (!PLANILHAS.includes(planilha)) return c.json({ error: `Planilha desconhecida: ${planilha}` }, 404);

  const q = c.req.query();
  const parte = Number(q.parte);
  const total = Number(q.total);
  const runId = q.runId ? Number(q.runId) : null;
  const hash = (q.hash ?? "").slice(0, 128);
  if (!Number.isInteger(parte) || !Number.isInteger(total) || parte < 1 || total < 1 || parte > total || total > 200) {
    return c.json({ error: "parte/total inválidos" }, 400);
  }
  if (parte > 1 && !Number.isInteger(runId)) return c.json({ error: "runId obrigatório a partir da parte 2" }, 400);
  if (!hash) return c.json({ error: "hash obrigatório" }, 400);

  const body = await c.req.text();
  if (body.length > MAX_BYTES) return c.json({ error: "Parte grande demais; envie em lotes menores" }, 413);
  if (!body.startsWith("{")) return c.json({ error: "Corpo deve ser um objeto JSON" }, 400);

  let merges: string[] = [];
  if (parte === total) {
    merges = mergeCache.get(planilha) ?? mergeStatements(planilha);
    mergeCache.set(planilha, merges);
  }

  try {
    const rows = (await sql(c.env)`
      select sync_receber(${planilha}, ${parte}, ${total}, ${runId}, ${hash}, ${(q.origem ?? "gatilho").slice(0, 40)},
                          ${q.forcar === "1"}, ${body}::jsonb, ${merges}::text[]) as r`) as { r: { status: string } }[];
    const r = rows[0]!.r;
    return c.json(r, HTTP_STATUS[r.status] ?? 200);
  } catch (err) {
    // JSON malformado ou tipo incompatível numa coluna: a transação inteira é desfeita
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`sync ${planilha}: falha`, msg);
    return c.json({ status: "erro", erro: `Falha ao gravar ${planilha}: ${msg.slice(0, 300)}` }, 422);
  }
});
