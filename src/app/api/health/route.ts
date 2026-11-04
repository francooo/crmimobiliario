import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Verifica se o Worker alcança o Neon. Não expõe dados nem credenciais. */
export async function GET() {
  const started = Date.now();
  try {
    const db = sql();
    const [row] = await db`select current_setting('server_version') as version`;
    return Response.json({ ok: true, db: "ok", postgres: row?.version, latencyMs: Date.now() - started });
  } catch (err) {
    console.error("health: falha no banco", err);
    return Response.json({ ok: false, db: "erro", latencyMs: Date.now() - started }, { status: 503 });
  }
}
