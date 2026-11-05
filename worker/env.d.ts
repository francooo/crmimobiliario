// Variáveis e segredos do Worker (wrangler.jsonc "vars" + `wrangler secret put` / .dev.vars)
interface Env {
  DATABASE_URL: string;
  /** HMAC das sessões — 32+ caracteres aleatórios */
  AUTH_SECRET?: string;
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  /** E-mails (separados por vírgula) que entram como Sócio mesmo antes da 1ª sincronização */
  ADMIN_EMAILS?: string;
  SYNC_SECRET?: string;
  /** URL do Web App do Apps Script (botão "Sincronizar agora"); opcional */
  APPS_SCRIPT_URL?: string;
}
