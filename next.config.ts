import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Cache Components desligado: as telas do CRM são dinâmicas por usuário e o
  // adaptador OpenNext/Cloudflare é mais estável no modelo de cache anterior.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: { unoptimized: true },
};

export default nextConfig;

// Disponibiliza bindings/variáveis do Cloudflare (wrangler.jsonc + .dev.vars) no `next dev`
initOpenNextCloudflareForDev();
