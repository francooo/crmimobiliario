# ImobiInsight (CRM imobiliário)

- Plano e decisões: `docs/PLANO.md`. Regras de negócio, telas e design system: `docs/pacote/`. Análise dos dados: `docs/ANALISE-PLANILHAS.md`.
- **Custo zero, sem cartão**: Cloudflare Workers Free, Neon Free (dados e fotos em `bytea`), Google Sheets + Apps Script. Não introduzir serviços pagos nem R2.

## Arquitetura
- `src/` — app React (Vite + React Router + Tailwind 4) que roda **no navegador**. É servido como arquivo estático pela Cloudflare, sem acionar o Worker.
- `worker/` — API (Hono) no Cloudflare Worker. Só `/api/*` executa o Worker (`wrangler.jsonc` → `assets.run_worker_first`).
- `shared/` — tipos e regras usados pelos dois lados.
- **Workers Free = 10 ms de CPU por requisição.** Medido em 2026-11-04: Next.js com SSR gastava 16–144 ms, por isso foi trocado por SPA + API. Na API: agregações no SQL do Neon, respostas pequenas, nada de hash de senha nem processamento de imagem no servidor.
- Google Sheets é a fonte única dos dados de negócio; o Neon é espelho + dados do sistema (fotos, vínculos, logs).

## Comandos
- `npm run dev` — Vite + Worker local (lê `.dev.vars`)
- `npm run typecheck` · `npm run build` · `npm run deploy` (publica em https://crm.imobiinsight.workers.dev)

## Regras
- Segredos só em `.dev.vars` (local) e `npx wrangler secret put` (produção). Nunca versionar `client_secret*.json` nem `.dev.vars`.
- Textos da interface em português do Brasil; datas DD/MM e valores em R$.
- Visual segue `docs/pacote/design-system/` (tokens no `@theme` de `src/index.css`).
