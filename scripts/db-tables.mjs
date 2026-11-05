// Lista as tabelas do banco e quantas linhas cada uma tem. Uso: npm run db:tables
import { neon } from "@neondatabase/serverless";
import { databaseUrl } from "./_env.mjs";

const url = databaseUrl();

const sql = neon(url);
const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
const out = [];
for (const { table_name } of tables) {
  const [{ n }] = await sql.query(`select count(*)::int as n from "${table_name}"`);
  out.push({ tabela: table_name, linhas: n });
}
console.table(out);
