import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sem cache incremental em R2 (não usamos R2 para manter o custo zero sem cartão).
export default defineCloudflareConfig({});
