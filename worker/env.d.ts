// Variáveis e segredos do Worker (wrangler.jsonc + `wrangler secret put` / .dev.vars)
interface Env {
  DATABASE_URL: string;
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  SYNC_SECRET?: string;
}
