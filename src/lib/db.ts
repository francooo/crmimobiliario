import { neon } from "@neondatabase/serverless";

/**
 * Cliente SQL do Neon via HTTP (adequado ao Cloudflare Workers: sem conexão persistente).
 * DATABASE_URL vem de .dev.vars (local) ou do secret do Worker (produção).
 */
export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada");
  return neon(url);
}
