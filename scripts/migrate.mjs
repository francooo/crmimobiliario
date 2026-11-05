// Aplica as migrações de ./migrations no Neon, em ordem, uma única vez cada.
// Uso: npm run db:migrate [-- --producao]   (desenvolvimento por padrão)
//      npm run db:migrate -- --status
import { Pool } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { databaseUrl } from "./_env.mjs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pool = new Pool({ connectionString: databaseUrl() });
const client = await pool.connect();

try {
  await client.query(`create table if not exists schema_migrations (
    nome text primary key, hash text not null, aplicada_em timestamptz not null default now())`);
  const { rows } = await client.query("select nome, hash from schema_migrations");
  const applied = new Map(rows.map((r) => [r.nome, r.hash]));

  const dir = join(root, "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  if (process.argv.includes("--status")) {
    for (const f of files) console.log(`${applied.has(f) ? "✔" : "·"} ${f}`);
  } else {
    let count = 0;
    for (const f of files) {
      const body = readFileSync(join(dir, f), "utf8");
      const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
      if (applied.has(f)) {
        if (applied.get(f) !== hash) console.warn(`⚠ ${f} mudou depois de aplicada — crie uma nova migração em vez de editar.`);
        continue;
      }
      await client.query("begin");
      try {
        await client.query(body);
        await client.query("insert into schema_migrations (nome, hash) values ($1, $2)", [f, hash]);
        await client.query("commit");
        console.log(`✔ aplicada ${f}`);
        count++;
      } catch (err) {
        await client.query("rollback");
        throw new Error(`falha em ${f}: ${err.message}`);
      }
    }
    console.log(count ? `${count} migração(ões) aplicada(s).` : "Banco já está atualizado.");
  }
} finally {
  client.release();
  await pool.end();
}
