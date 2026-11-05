// Utilitários dos testes de integração (rodam contra a API local, com o banco de DESENVOLVIMENTO).
import { neon } from "@neondatabase/serverless";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

export const B = process.env.BASE ?? "http://localhost:3000";
export const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const devUrl = vars.DATABASE_URL_ADMIN ?? vars.DATABASE_URL;
if (!/\/neondb_dev\?/.test(devUrl ?? "") || !/\/neondb_dev\?/.test(vars.DATABASE_URL ?? "")) {
  console.error("✘ Os testes de integração gravam dados de teste: só rodam com o banco neondb_dev (DATABASE_URL no .dev.vars).");
  process.exit(2);
}
/** SQL direto no banco de desenvolvimento (preparar/limpar cenários) */
export const sqlDev = neon(devUrl);

const b64u = (s) => Buffer.from(s).toString("base64url");
/** Cookie de sessão assinado com o AUTH_SECRET local (dispensa o login Google nos testes) */
export function sessao(email, { exp = Math.floor(Date.now() / 1000) + 3600, segredo = vars.AUTH_SECRET } = {}) {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify({ sub: email, nome: "teste", role: "socio", exp }));
  return `${h}.${p}.${createHmac("sha256", segredo).update(`${h}.${p}`).digest("base64url")}`;
}
export const SOCIO = "andrewsfranco93@gmail.com";
export const CORRETOR = "carlos.teste@example.com";
/** Dá ao "Carlos Lima" dos exemplos um e-mail de teste (a planilha de exemplo não tem e-mails).
 *  Chame ANTES do 1º uso: a API guarda o resultado da autorização por até 1 min. */
export async function prepararCorretor() {
  await sqlDev`update corretores set email = ${CORRETOR} where nome = 'Carlos Lima'`;
}

export function api(method, path, { email = SOCIO, cookie, body, origin = B, headers = {} } = {}) {
  return fetch(B + path, {
    method,
    redirect: "manual",
    headers: {
      ...(cookie !== null ? { cookie: `imobi_sessao=${cookie ?? sessao(email)}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...(origin ? { origin } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

let ok = 0, falhas = 0;
export function check(nome, cond, info = "") {
  if (cond) { ok++; console.log(`  ✔ ${nome}`); }
  else { falhas++; console.log(`  ✘ ${nome} ${info}`); }
}
export function resumo(titulo) {
  console.log(`${titulo}: ${ok} ok, ${falhas} falha(s)\n`);
  process.exitCode = falhas ? 1 : 0;
}
