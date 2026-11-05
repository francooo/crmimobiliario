// URL do banco para os scripts: desenvolvimento por padrão; produção só com --producao.
import { existsSync, readFileSync } from "node:fs";

function devVars() {
  if (!existsSync(".dev.vars")) return {};
  return Object.fromEntries(
    readFileSync(".dev.vars", "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

export const PRODUCAO = process.argv.includes("--producao");

export function databaseUrl() {
  const vars = devVars();
  // Scripts de manutenção usam o DONO do banco (migrações, limpeza); o Worker usa crm_app.
  const url = PRODUCAO
    ? process.env.DATABASE_URL_PRODUCAO ?? vars.DATABASE_URL_PRODUCAO
    : process.env.DATABASE_URL_ADMIN ?? vars.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL ?? vars.DATABASE_URL;
  if (!url) throw new Error(PRODUCAO ? "DATABASE_URL_PRODUCAO não encontrada" : "DATABASE_URL não encontrada");
  const banco = url.match(/\/([^/?]+)\?/)?.[1] ?? "?";
  console.error(`[banco: ${banco}${PRODUCAO ? " — PRODUÇÃO" : ""}]`);
  return url;
}
