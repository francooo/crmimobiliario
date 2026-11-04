import { neon } from "@neondatabase/serverless";

/** Cliente SQL do Neon via HTTP — sem conexão persistente, ideal para Workers. */
export function sql(env: Env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
  return neon(env.DATABASE_URL);
}
