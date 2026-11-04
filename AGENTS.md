<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Projeto ImobiInsight (CRM imobiliário)

- Plano e decisões: `docs/PLANO.md`. Regras de negócio, telas e design system: `docs/pacote/`. Análise dos dados: `docs/ANALISE-PLANILHAS.md`.
- **Custo zero, sem cartão**: Cloudflare Workers Free (Next.js via `@opennextjs/cloudflare`), Neon Free (dados e fotos em `bytea`), Google Sheets + Apps Script. Não introduzir serviços pagos nem R2.
- Workers Free = **10 ms de CPU por requisição**: agregações no SQL, nada de hash de senha, nada de processamento pesado de imagem no servidor.
- Google Sheets é a fonte única dos dados de negócio; o Neon é espelho + dados do sistema (fotos, vínculos, logs).
- `cacheComponents` está desligado de propósito (compatibilidade com OpenNext); use o modelo de cache anterior.
- Segredos só em `.dev.vars` (local) e `wrangler secret put` (produção). Nunca versionar `client_secret*.json`.
- Textos da interface em português do Brasil.
