import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes de funções puras (shared/ e worker/lib). Sem o plugin da Cloudflare.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["shared/**/*.test.ts", "worker/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node",
  },
});
