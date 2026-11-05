import type { Context } from "hono";
import type { AppEnv } from "../auth";
import { sql } from "../db";
import { normText } from "../sync/parse";

/**
 * Executa uma consulta que devolve o JSON da resposta já montado pelo Postgres (coluna `body` texto)
 * e o repassa sem reinterpretar — o Worker não cria nem serializa objetos (economia de CPU).
 */
export async function jsonFromDb(c: Context<AppEnv>, query: (db: ReturnType<typeof sql>) => Promise<unknown>, notFound = "Não encontrado") {
  const rows = (await query(sql(c.env))) as { body: string | null }[];
  const body = rows[0]?.body;
  if (!body) return c.json({ error: notFound }, 404);
  return c.body(body, 200, { "content-type": "application/json; charset=utf-8" });
}

/** Corretor só enxerga os próprios registros; demais perfis veem todos (null = sem filtro). */
export function escopoCorretor(c: Context<AppEnv>): string | null {
  const u = c.get("user");
  return u.role === "corretor" ? u.nome : null;
}

/** Texto da busca: normalizado (sem acento) e só dígitos (telefone). */
export function termoBusca(raw: string | undefined): { texto: string | null; digitos: string | null } {
  const texto = normText(raw ?? "").slice(0, 80);
  const digitos = texto.replace(/\D/g, "");
  return { texto: texto || null, digitos: digitos.length >= 4 ? digitos : null };
}

/** Normalização de acentos dentro do SQL para colunas sem versão normalizada (ex.: bairro). */
export const SEM_ACENTO = (col: string) =>
  `translate(lower(${col}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;
