# Plano — ImobiInsight Web (CRM imobiliário) em produção, custo zero

## Contexto
O repositório só tem `CRM web system design.zip` (pacote "pacote-imobiinsight"): protótipo navegável (12 telas, 9 modais) com dados fixos, regras de negócio, design system (tokens.json, logo/ícone), mapeamento CSV e planilhas modelo. O objetivo é transformar o protótipo em sistema real **sem custo mensal**:

- **Google Sheets = fonte única dos dados de negócio** (uma planilha separada por tipo, mesmas colunas dos modelos CSV).
- **Apps Script** (grátis) lê as planilhas e envia os dados ao sistema a cada 10 min.
- **Neon (Postgres, plano Free, região São Paulo)** = espelho dos dados das planilhas para consultas/KPIs + dados próprios do sistema (usuários, logs) + **fotos dos imóveis** (tabela `imovel_fotos`, coluna `bytea`).
- **Cloudflare Workers (plano Free, sem cartão)** = telas React servidas como arquivos estáticos (não acionam o Worker) + API Hono em `/api/*`. R2 descartado para não exigir cartão.
- **Mudança de 2026-11-04:** a fase 0 começou com Next.js (SSR via OpenNext), mas a medição em produção mostrou 16–144 ms de CPU por tela contra o limite de 10 ms do plano grátis. Trocado por SPA (Vite + React) + API enxuta; `/api/health` mede 5–13 ms mesmo dentro do Next.js. A versão Next.js ficou no commit `e13231c` do branch `fase-0`.
- **Login com Google**, liberado só para e-mails cadastrados na planilha de Corretores.
- Dados do Sheets entram **direto** (sem fila de aprovação).

Referências dentro do zip (extrair para `docs/pacote/` na fase 0): `REGRAS-DE-NEGOCIO.md`, `TELAS-E-COMPONENTES.md`, `MAPEAMENTO-CSV.md`, `design-system/tokens.json`, `codigo/logica.js` (cálculos de KPIs a portar), `codigo/template.html` (marcação das telas), `sistema/ImobiInsight Web.dc.html` (referência visual).

## Limites do plano grátis e como o desenho respeita cada um
| Serviço | Limite grátis (confirmado em nov/2026) | Uso previsto | Como respeitamos |
|---|---|---|---|
| Workers | 100 mil requisições/dia | algumas centenas a poucos milhares/dia | folga grande |
| Workers | **10 ms de CPU por requisição** (espera de rede/banco não conta) | só chamadas `/api/*`: consultas, sincronização, fotos | telas renderizam no navegador (arquivos estáticos não contam); contas pesadas no SQL do Neon; sincronização chega pronta do Apps Script; sem hash de senha (login Google); fotos já chegam reduzidas pelo navegador |
| Workers | 64 MiB de código, 128 MB de memória, 50 subrequisições | API Hono + driver Neon | API pequena, sem libs pesadas |
| Workers | arquivos estáticos | telas, JS, CSS, ícones | grátis e ilimitados; não acionam o Worker |
| Neon Free | **1 GB de armazenamento por projeto** — passou disso, gravações são bloqueadas (inclusive a sincronização) | dados: poucas dezenas de MB; fotos: ~150 KB + miniatura ~25 KB cada | **teto de 700 MB para fotos** controlado pelo sistema (≈ 4 mil fotos); upload bloqueado ao atingir, com aviso a partir de 80% |
| Neon Free | **5 GB/mês de tráfego de saída** — passou disso, o banco é suspenso até o mês virar | telas + exibição de fotos | listas usam só miniaturas; fotos com `Cache-Control: immutable` de 1 ano (navegador não baixa de novo); medidor de tráfego estimado na Governança |
| Neon Free | 100 CU-horas/mês; banco "dorme" após 5 min sem uso | uso em horário comercial | 1º acesso após inatividade ~1 s mais lento |
| Apps Script | gatilhos de tempo e UrlFetch com cota diária de conta Google | 144 execuções/dia (a cada 10 min) | bem abaixo da cota |

Plano B, se alguma rota da API passar de 10 ms de CPU com frequência: Workers Paid (US$ 5/mês, 30 s de CPU). O código não muda.

## Stack
- **Telas:** React 19 + Vite + React Router 7, TypeScript; Tailwind CSS 4 com `tokens.json` no `@theme`; fontes Geist/Geist Mono (Google Fonts)
- **API:** Hono no Cloudflare Worker (`worker/`), `@cloudflare/vite-plugin` para dev/build, deploy com Wrangler
- **Banco:** `@neondatabase/serverless` (driver HTTP) com SQL direto; migrações em arquivos `.sql` versionados
- **Login:** fluxo OAuth do Google implementado na própria API (`/api/auth/google` → `/api/auth/callback/google`, mesmo URI já cadastrado no Google Cloud); sessão em cookie `HttpOnly` assinado com HMAC (Web Crypto, barato em CPU); acesso só para e-mails da planilha Corretores
- Fotos em `bytea` no Neon; redução/compressão no navegador (canvas → WebP) antes do envio
- `zod` para validar linhas; Recharts para gráficos (renderizados no navegador)

## Arquitetura
```
8 planilhas Google ──▶ Apps Script (gatilho a cada 10 min / botão no menu da planilha)
                          lê as abas, converte em JSON, calcula hash, envia só o que mudou
                          │  POST /api/sync/<planilha>  (Authorization: Bearer SYNC_SECRET)
                          ▼
Cloudflare Worker (API Hono) ── valida (zod) ── 1 comando SQL em lote (jsonb_to_recordset) ──▶ Neon
     ▲  GET /api/... → JSON com KPIs já agregados no SQL                                          │
     └───────────────────────────────────────────────────────────────────────────────────────┘
Navegador ◀── telas React (arquivos estáticos da Cloudflare, sem CPU do Worker) ── chama /api/*
Fotos: navegador reduz a imagem (WebP 1280 px + miniatura 400 px) → POST /api/fotos → Worker grava bytea no Neon
       exibição: /api/fotos/<id>-<hash>.webp servido pelo Worker lendo o Neon, cache de 1 ano no navegador
```

Por que o Apps Script lê as planilhas (em vez do Worker chamar a Sheets API):
- elimina a conta de serviço e a assinatura de tokens Google no Worker (economiza CPU);
- o Apps Script tem até 6 min por execução para ler e montar os dados; o Worker só grava;
- uma planilha por requisição mantém cada chamada pequena.

### Planilhas (uma por tipo; IDs ficam nas Propriedades do Apps Script)
Imóveis, Agenciamentos, Leads, Atendimentos, Contratos (modelo **com comissão**, `modelo_vgv_contratos`), Fluxo de caixa, Campanhas, **Corretores** (nova: nome, função, e-mail, CRECI, telefone, ativo, perfil — também controla quem pode entrar).
Ajustes sugeridos (resolvem os "Pontos de atenção"): coluna `leadId` no Leads, `inicio`/`fim` em Campanhas, listas suspensas para etapa, status, origem, corretor e categoria.

### Tabelas Neon
- Espelho: `imoveis`, `agenciamentos`, `leads`, `atendimentos`, `contratos`, `fluxo_caixa`, `campanhas`, `corretores` — chaves naturais: code, agenciamentoId, telefone, activityId, contractId, entryId, nome. Cada linha guarda `sheet_row` e `synced_at`.
- Do sistema: `imovel_fotos` (id, imovel_code, hash, ordem, capa, tamanho, `imagem bytea`, `miniatura bytea` — miniatura separada para as listas não lerem a foto grande), `sync_runs` (planilha, início, fim, hash, contagens, status), `sync_issues` (planilha, linha, coluna, problema), `audit_log` (data, usuário, ação, registro, detalhe — exportável em CSV), `sessoes` (opcional; a sessão principal fica em cookie assinado).
- Identificadores do sistema: `lead_ids` (telefone normalizado → `LEAD-0001`, sequencial, nunca reaproveitado) e `vinculos_manuais` (tipo `atendimento→lead` | `contrato→lead` | `lead→imovel` | `contrato→imovel`, chave do registro de origem, chave do alvo, usuário, data). As colunas `lead_id` e `codigo_imovel` das tabelas espelho são **preenchidas pelo sistema** a cada sincronização.

### Sincronização
1. **Apps Script** (`scripts/apps-script/`): para cada planilha na ordem Corretores → Imóveis → Agenciamentos → Leads → Atendimentos → Contratos → Fluxo de caixa → Campanhas, lê `getDataRange().getValues()`, gera JSON, compara o hash com o último envio (guardado nas Propriedades) e envia só se mudou. Gatilho de tempo a cada 10 min + item de menu "Sincronizar agora" na planilha. Lotes grandes são divididos em partes de ~500 linhas.
2. **Worker** `/api/sync/[planilha]`: confere o segredo; valida linhas com zod (datas AAAA-MM-DD, números com vírgula/ponto, enums); linha inválida vai para `sync_issues` sem derrubar o lote.
3. Normaliza: "Portal imobiliário" → "Portais"; remove prefixo "Agenciador "; vincula corretor ao cadastro de Corretores (não cadastrado ou nome parecido, ex. Aline Martins/Aline Oliveira → aviso); vincula atendimento/contrato ao lead por `leadId` ou pelo nome do cliente.
3b. **Vínculos gerados pelo sistema** (depois de gravar todas as planilhas, na mesma transação):
   - `leadId`: telefone → código fixo em `lead_ids` (cria se novo). Coluna `leadId` da planilha, se existir e estiver preenchida, tem prioridade.
   - Atendimento/contrato → lead, em ordem: vínculo manual → `leadId` da planilha → nome do cliente normalizado (sem acento, minúsculo, espaços únicos) com resultado único → desempate por corretor → senão "sem vínculo".
   - Lead/contrato → imóvel, em ordem: vínculo manual → código na planilha (se a coluna existir) → nome do imóvel normalizado com resultado único em Imóveis (`name`) ou Agenciamentos (`imovel`) → senão "sem vínculo".
   - Fluxo de caixa → contrato: não é inferido (lançamentos são totais mensais).
   - Registros "sem vínculo" ou ambíguos aparecem na tela Sincronização com sugestões (nomes parecidos); a escolha do usuário grava em `vinculos_manuais` e é reaplicada em toda sincronização.
4. Espelho completo numa transação: upsert pela chave natural + remove o que saiu da planilha.
5. Grava `sync_runs` + `audit_log`. A tela Sincronização do sistema mostra o status e tem botão "Sincronizar agora", que chama um Web App do Apps Script (`doPost` com segredo).

### Fotos
- Upload só por Sócio/Gerente/Corretor na tela Imóveis. O navegador reduz para 1280 px (WebP qualidade ~0,75, alvo ≤ 200 KB) e gera miniatura de 400 px (~25 KB) antes de enviar — dispensa serviço pago de otimização (`next/image` com `unoptimized`).
- `POST /api/fotos`: confere perfil, tipo (só WebP gerado pelo navegador) e tamanho (rejeita > 300 KB), confere o teto de 700 MB (`sum(tamanho)`) e grava numa transação. Limite de 15 fotos por imóvel.
- `GET /api/fotos/<id>-<hash>.webp` (e `/api/miniaturas/...`): Worker lê só a coluna pedida e responde com `Cache-Control: public, max-age=31536000, immutable`; o hash na URL garante que foto trocada gera URL nova.
- Excluir foto remove a linha; o espaço volta para o teto do sistema (o Neon recupera o espaço automaticamente com o tempo).
- Governança mostra: espaço usado por fotos / 700 MB, nº de fotos e estimativa de tráfego do mês.
- Se no futuro o espaço não bastar: mover fotos para um 2º projeto Neon (Object Storage, 5 GB grátis) sem mudar as telas, só a rota `/fotos`.

## Telas (portar do protótipo, fiel ao design system)
Login (botão "Entrar com Google"), Dashboard, Leads, Funil (kanban), Detalhe do lead, Imóveis (cards com miniatura vinda do Neon), Agenciamentos, Corretores, Marketing, Financeiro, Importações → vira **Sincronização** (status por planilha, última sync, avisos por linha, botão sincronizar, link para cada planilha, modelos para baixar), Governança (perfis vindos da planilha Corretores, matriz de permissões, histórico de alterações).

Como o Sheets é fonte única, os modais de cadastro de dados de negócio viram botões **"Abrir na planilha"**. Gravam no sistema apenas: sessão de login, fotos e vínculos manuais (lead/imóvel) — os dados de negócio continuam vindo 100% das planilhas.

Regras a portar de `logica.js` para `lib/metrics/` (preferencialmente como consultas SQL agregadas, para poupar CPU do Worker): funil cumulativo, próximo contato vencido, tempo médio de resposta, VGV só de vendas, saldo de caixa e blocos Vendas/Locações/Despesas, CPL (calcula se vazio) e custo por fechamento, ranking e participação no VGV, meta da roleta (≥3 captações de venda na semana anterior), filtros de período (1/3/6 meses), mês do financeiro, busca global e filtros por tela.

Permissões aplicadas **no servidor** (middleware + checagem em cada rota/consulta) conforme a matriz de `REGRAS-DE-NEGOCIO.md` §1.

## Contas (todas grátis, nenhuma com cartão)
1. ✅ Cloudflare — Wrangler logado (Account ID `d3140ad74f62a6fc2bd1dbd246f41c4e`), subdomínio `imobiinsight.workers.dev`. Só Workers; sem R2.
2. ✅ Neon — projeto Free em `sa-east-1` (São Paulo), banco `neondb`, conexão testada.
3. ✅ Google Cloud — projeto `ifood-7sjqzb`, app OAuth "ImobiInsight" em produção (escopos openid, email, profile), domínio autorizado `imobiinsight.workers.dev`, cliente Web `861306334510-cu244qi8j7tove6o920nkr7q0dq5m4sg.apps.googleusercontent.com` (segredo fica só em `.dev.vars` / secret do Worker).
4. ⏳ Conta Google dona das planilhas e do Apps Script.
5. ✅ GitHub — `francooo/crmimobiliario` (deploy pode ser automático via Workers Builds, grátis).
Endereço: `crm.imobiinsight.workers.dev` (Worker `crm`, grátis). Domínio próprio é opcional (~R$ 40/ano no Registro.br).

## Fases
0. **Fundação** — extrair pacote para `docs/pacote/`, criar app React (Vite) + API Hono no Workers, deploy no ar (valida o ambiente grátis cedo, incluindo a medição de CPU), Tailwind com tokens, layout (sidebar 232px, header 68px), componentes base (Button, Chip, Badge de status, KpiCard, Table, EmptyState, Toast, BarH, Timeline). `.dev.vars.example` / `wrangler.jsonc`, páginas de privacidade e termos.
1. **Banco + login** — schema Drizzle, migrações no Neon, login Google na API, checagem do e-mail na tabela `corretores`, perfis e middleware.
2. **Sincronização** — Apps Script (leitura, hash, envio em lotes, gatilho, menu, Web App), rota `/api/sync/[planilha]`, validadores zod, normalizadores, espelho, `sync_runs`/`sync_issues`. **Medir CPU por requisição** (`wrangler tail`) com os CSVs de exemplo.
3. **Telas comerciais** — Dashboard, Leads, Funil, Detalhe do lead, busca e filtros. Medir CPU das telas.
4. **Imóveis e agenciamentos** — grade com fotos (redução no navegador, gravação em `bytea` no Neon, teto de 700 MB, cache imutável), Agenciamentos (KPIs, 6 meses, roleta), Corretores.
5. **Gestão** — Marketing, Financeiro, Governança, tela de Sincronização.
6. **Endurecimento** — testes, índices, retry no Apps Script, alerta por e-mail (Apps Script `MailApp`, grátis) quando uma sync falhar, guia de operação.

## Verificação
- Unitários (Vitest) para normalizadores, validadores e `lib/metrics/*` usando os CSVs de exemplo: conferir VGV, saldo de caixa, funil e roleta contra os números do protótipo `ImobiInsight Web.dc.html`.
- Integração: planilhas de teste com os exemplos → rodar o Apps Script → conferir `sync_runs` e linhas no Neon; editar/remover linha e sincronizar de novo (atualiza, não duplica; remove o que saiu).
- CPU: `wrangler tail` / painel da Cloudflare mostrando cada rota abaixo de 10 ms; se não, otimizar ou acionar o plano B.
- E2E (Playwright): login Google com e-mail cadastrado entra e não cadastrado é barrado; menu correto por perfil; corretor recebe 403 no Financeiro; foto enviada aparece no card; upload é recusado ao atingir o teto de fotos; segunda visita à tela Imóveis não baixa as fotos de novo (cache do navegador).

## Andamento
- **Fase 0 — concluída (2026-11-04).** SPA React + API Hono no ar em https://crm.imobiinsight.workers.dev. CPU medida: telas 0 ms (arquivos estáticos), API 0–8 ms.
- **Fase 1 — concluída (2026-11-04).** Esquema completo no Neon (`migrations/0001_inicial.sql`, `npm run db:migrate`). Login Google com PKCE + `state`, sessão JWT HS256 em cookie `HttpOnly; Secure; SameSite=Lax` (7 dias), usuário revalidado no banco a cada 1 min (perfil e desativação valem sem novo login). Antes da 1ª sincronização, os e-mails de `ADMIN_EMAILS` (wrangler.jsonc) entram como Sócio. Permissões no servidor (`requireModule`), CSRF por checagem de `Origin`. Testes: 15 unitários (`npm test`) + 26 de integração da autenticação. CPU das rotas de login: 0–8 ms (pico isolado de 13 ms na 1ª chamada).
- **Fase 2 — servidor pronto (2026-11-04); falta instalar o Apps Script com as URLs reais.** Para caber nos 10 ms de CPU, a validação roda **no Apps Script** (mesmo código de `worker/sync/schema.ts`, empacotado em `scripts/apps-script/Validacao.gs` por `npm run build:apps-script`) e o Worker só repassa o corpo para `sync_receber()` no banco (`migrations/0004`), que faz hash, staging em partes de 400, trava de remoção (> 50 %), espelho com upsert/delete e `recalcular_vinculos()`. CPU medida: 28 envios, 1–3 ms (máx. 8 ms); antes da mudança eram 8–27 ms. Vínculos: códigos `LEAD-0001` estáveis por telefone; atendimento/contrato → lead e lead/contrato → imóvel por código ou nome único; pendências na view `pendencias`. Ferramentas: `npm run sync:csv` (simula o Apps Script), `db:resumo`, `db:limpar`. Testes: 51 unitários + cenários (edição diária, 950 linhas em 3 partes, trava, coluna ausente, segredo errado, estabilidade do LEAD-id).
- **Fase 3 — concluída (2026-11-04).** Telas Dashboard, Leads (filtros na URL, contagem por etapa, paginação, CSV com proteção contra fórmula), Funil (5 colunas) e Detalhe do lead (etapas, histórico de atendimentos, imóvel vinculado, Ligar/WhatsApp, links "na planilha"). API em `worker/api/comercial.ts`: cada rota é 1 consulta que devolve o JSON pronto (`json_build_object(...)::text`) e o Worker só repassa o texto. Corretor vê só os próprios leads (404 nos dos outros); Dashboard só para Sócio. Período global (`shared/periodo.ts`): mês atual, anterior, 3/6/12 meses, fuso de São Paulo, guardado na sessão do navegador. Banco de desenvolvimento separado (`neondb_dev`, `DATABASE_URL` no `.dev.vars`; produção em `DATABASE_URL_PRODUCAO`, scripts com `--producao`). Testes: 57 unitários; telas conferidas por print autenticado (Sócio e Corretor).
- **Fase 4 — concluída (2026-11-04).** Imóveis = carteira (IMV-) + captações dos Agenciamentos (PORT-), com filtros de situação/modalidade e página própria por imóvel (galeria, envio múltiplo, capa, exclusão, leads e contratos ligados). Fotos: o navegador reduz para ~1280 px e gera miniatura de ~400 px em WebP (JPEG no Safari), envia em base64; o banco grava `bytea` com `decode()` e a API devolve com `Cache-Control: private, immutable` (URL leva o hash). Limites: 300 KB por foto, 15 por imóvel, teto de 700 MB no sistema; corretor só exclui as próprias fotos. Agenciamentos: KPIs, 6 meses, roleta (≥ 3 captações de venda na semana anterior, só função Corretor) e tabela. Corretores: cards, ranking (VGV/comissão só para Sócio, regra §1) e cadastro com "não cadastrado" + sugestão de nome parecido. Sessão não é perdida em falha de rede (tela "Sem conexão" com "Tentar novamente"). Testes: 57 unitários + 19 de fotos + envio real pelo navegador (PNG 182 KB → 70 KB).
- **Fase 5 — concluída (2026-11-04).** Marketing (investimento, CPL, custo por fechamento, leads e contratos por canal, campanhas filtradas por `inicio`/`fim` quando preenchidos), Financeiro (entradas, saídas, saldo, blocos Vendas/Locações/Despesas por categoria, evolução mensal ≥ 6 meses, lançamentos com CSV; VGV só para Sócio — Administrativo vê caixa), Governança (perfis com contagem pela planilha Corretores, matriz de operações e de módulos geradas de `shared/permissions.ts`, histórico de alterações com filtro e CSV — só Sócio/Administrativo) e Sincronização (situação de cada planilha, linhas recusadas, pendências de vínculo com janela "Ligar…" que grava em `vinculos_manuais`, vínculos manuais, últimas execuções, modelos para baixar em `/modelos/`). Sem fila de aprovação: os dados das planilhas entram direto (decisão do início). Botão "Sincronizar agora" depende de publicar o Apps Script como App da Web e configurar `APPS_SCRIPT_URL` (opcional). Testes: 57 unitários + 13 de vínculos (inclui sobreviver à nova sincronização) + janela "Ligar…" pelo navegador.
- **Fase 6 — concluída (2026-11-04).** Feito: celular (menu em gaveta, lista de leads em cartões, kanban com encaixe, login responsivo); cabeçalhos de segurança (CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy) sem violações no navegador; reenvio idempotente da última parte (`migrations/0005`) + até 3 tentativas no Apps Script contra os picos de CPU; testes de integração no projeto (`npm run test:integracao`: 61 verificações, só no banco de dev); backup do que só existe no sistema (`npm run db:backup`); guia `docs/OPERACAO.md` e `README.md`. Em produção (autorizado pelo usuário): migração 0005 aplicada; Worker passou a usar o usuário `crm_app` (sem DDL/TRUNCATE/criação de usuários — verificado nos dois bancos; 61 verificações de integração passando com ele); nova versão publicada com os cabeçalhos de segurança. Pendente do usuário: colar o novo `Codigo.gs` no Apps Script (tentativas automáticas) e trocar a senha do `neondb_owner` no Neon (ela apareceu na conversa).
