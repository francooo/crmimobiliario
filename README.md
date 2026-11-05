# ImobiInsight — CRM imobiliário

Gestão comercial e financeira para imobiliárias: leads, funil, imóveis com fotos, agenciamentos, corretores, marketing, financeiro e governança. Os dados vêm de **planilhas Google** (fonte única) e o sistema roda **sem custo mensal**.

**Produção:** https://crm.imobiinsight.workers.dev

## Arquitetura
- **Telas:** React 19 + Vite + React Router + Tailwind 4 (`src/`), servidas como arquivos estáticos pela Cloudflare.
- **API:** Hono no Cloudflare Worker (`worker/`), só em `/api/*`. Plano Free: 10 ms de CPU por requisição — as consultas devolvem o JSON pronto do Postgres.
- **Banco:** Neon Postgres (`migrations/`): espelho das planilhas + fotos (`bytea`) + vínculos + histórico.
- **Sincronização:** Google Apps Script (`scripts/apps-script/`) valida e envia as planilhas a cada 10 min.
- **Login:** Google OAuth (PKCE) feito na própria API; acesso pela planilha Corretores.

## Documentação
- [docs/OPERACAO.md](docs/OPERACAO.md) — guia de operação (dia a dia, limites, backup, segredos, problemas comuns)
- [docs/PLANO.md](docs/PLANO.md) — plano, decisões e andamento das fases
- [docs/ANALISE-PLANILHAS.md](docs/ANALISE-PLANILHAS.md) — análise dos dados das planilhas
- [scripts/apps-script/LEIA-ME.md](scripts/apps-script/LEIA-ME.md) — instalação da sincronização
- [docs/pacote/](docs/pacote/) — protótipo, regras de negócio e design system originais

## Começando
```bash
npm install
cp .dev.vars.example .dev.vars   # preencha (Neon, Google OAuth, SYNC_SECRET)
npm run db:migrate
npm run dev                      # http://localhost:3000
```
Testes: `npm test` (unitários) · `npm run preview` + `npm run test:integracao` (integração, banco de desenvolvimento).
