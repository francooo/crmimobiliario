import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare({ viteEnvironment: { name: "worker" } })],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Porta 3000: é a origem cadastrada no Google Cloud para o login local
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  environments: {
    worker: { build: { sourcemap: true } },
  },
});
