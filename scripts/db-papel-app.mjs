// Cria (ou atualiza) o usuário de banco "crm_app" usado pelo Worker, com o mínimo de permissões:
// ler e gravar dados (SELECT/INSERT/UPDATE/DELETE) e usar sequências — sem DDL, sem TRUNCATE, sem criar usuários.
// O dono (neondb_owner) fica só para migrações e scripts de manutenção.
//
// Uso: node scripts/db-papel-app.mjs            → aplica nos bancos de desenvolvimento e produção
//      node scripts/db-papel-app.mjs --nova-senha → também troca a senha do crm_app
// Grava em .dev.vars: DATABASE_URL (dev, crm_app), DATABASE_URL_APP_PRODUCAO (prod, crm_app) e
// DATABASE_URL_ADMIN (dev, dono). Nada é impresso na tela.
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ROLE = "crm_app";
const raw = readFileSync(".dev.vars", "utf8").replace(/\r/g, "");
const vars = Object.fromEntries(raw.split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));

const ownerProd = vars.DATABASE_URL_PRODUCAO;
const ownerDev = vars.DATABASE_URL_ADMIN ?? vars.DATABASE_URL;
if (!ownerProd || !ownerDev || new URL(ownerDev).username !== "neondb_owner") {
  throw new Error("Preciso de DATABASE_URL_PRODUCAO e da URL do dono do banco de dev (DATABASE_URL ou DATABASE_URL_ADMIN).");
}

const atual = vars.DATABASE_URL && new URL(vars.DATABASE_URL).username === ROLE ? new URL(vars.DATABASE_URL).password : null;
const senha = process.argv.includes("--nova-senha") || !atual ? randomBytes(30).toString("base64url") : decodeURIComponent(atual);

const GRANTS = [
  `grant usage on schema public to ${ROLE}`,
  `grant select, insert, update, delete on all tables in schema public to ${ROLE}`,
  `grant usage, select, update on all sequences in schema public to ${ROLE}`,
  `grant execute on all functions in schema public to ${ROLE}`,
  `alter default privileges for role neondb_owner in schema public grant select, insert, update, delete on tables to ${ROLE}`,
  `alter default privileges for role neondb_owner in schema public grant usage, select, update on sequences to ${ROLE}`,
  `alter default privileges for role neondb_owner in schema public grant execute on functions to ${ROLE}`,
  // schema_migrations é só do dono
  `revoke insert, update, delete on schema_migrations from ${ROLE}`,
];

// O papel é do projeto (vale para todos os bancos); as permissões são por banco
const admin = neon(ownerProd);
const existe = await admin`select 1 from pg_roles where rolname = ${ROLE}`;
await admin.query(`${existe.length ? "alter" : "create"} role ${ROLE} with login password '${senha.replace(/'/g, "''")}'`);
console.log(`✔ usuário ${ROLE} ${existe.length ? "atualizado" : "criado"}`);

for (const [nome, url] of [["desenvolvimento", ownerDev], ["produção", ownerProd]]) {
  const db = neon(url);
  const banco = new URL(url).pathname.slice(1);
  await db.query(`grant connect on database ${banco} to ${ROLE}`);
  for (const g of GRANTS) await db.query(g);
  console.log(`✔ permissões aplicadas no banco de ${nome} (${banco})`);
}

const comPapel = (url) => {
  const u = new URL(url);
  u.username = ROLE;
  u.password = encodeURIComponent(senha);
  return u.toString();
};
const linhas = raw.split("\n").filter((l) => l && !/^(DATABASE_URL|DATABASE_URL_ADMIN|DATABASE_URL_APP_PRODUCAO)=/.test(l));
linhas.unshift(
  `DATABASE_URL=${comPapel(ownerDev)}`,
  `DATABASE_URL_ADMIN=${ownerDev}`,
  `DATABASE_URL_APP_PRODUCAO=${comPapel(ownerProd)}`,
);
writeFileSync(".dev.vars", linhas.join("\n") + "\n");
console.log("✔ .dev.vars atualizado (DATABASE_URL → crm_app; DATABASE_URL_ADMIN → dono, para migrações)");
console.log("  Produção: rode  node -e \"...\" | npx wrangler secret put DATABASE_URL  com DATABASE_URL_APP_PRODUCAO (veja docs/OPERACAO.md)");
