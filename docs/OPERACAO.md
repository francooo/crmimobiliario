# Guia de operação — ImobiInsight

Sistema: **https://crm.imobiinsight.workers.dev** · Custo mensal: **R$ 0** (Cloudflare Workers Free, Neon Free, Google Apps Script).

## Como os dados chegam ao sistema

```
Planilhas Google (fonte única) ──▶ Apps Script "ImobiInsight Sync" (sua conta Google, a cada 10 min)
                                     valida as linhas e envia só o que mudou
                                              │
                                              ▼
                          Cloudflare Worker (/api/sync) ──▶ Neon (banco: espelho + fotos + vínculos + histórico)
                                              ▲
                     Telas do sistema (navegador) ─┘
```

- **Cadastrar, alterar ou excluir dados de negócio = editar a planilha.** Em até 10 minutos o sistema reflete.
- O sistema guarda sozinho só o que não existe nas planilhas: **fotos, vínculos manuais, códigos dos leads e histórico**.

## Tarefas do dia a dia

| Quero… | Onde |
|---|---|
| Liberar acesso para um corretor | Planilha **Corretores**: preencha `email` (conta Google) e `perfil` (Sócio / Gestor, Gerente de locações, Administrativo, Corretor), `ativo` = Sim |
| Tirar o acesso de alguém | Planilha Corretores: `ativo` = Não (perde o acesso em até 1 min após a sincronização) |
| Ver se as planilhas estão sincronizando | Tela **Sincronização** (situação, última sincronização, linhas recusadas) |
| Corrigir uma linha recusada | A tela Sincronização mostra planilha, linha e motivo → corrija na planilha |
| Ligar um contrato/atendimento ao lead certo | Sincronização → Pendências de vínculo → **Ligar…** |
| Sincronizar na hora | script.google.com → ImobiInsight Sync → executar `sincronizarAgora` (ou botão na tela, se o App da Web estiver publicado) |
| Ver quem fez o quê | **Governança** → Histórico de alterações (exporta CSV) |
| Enviar fotos de um imóvel | Imóveis → abrir o imóvel → **Enviar fotos** (o navegador reduz a foto antes de enviar) |

## Regras que protegem os dados
- **Não renomeie nem apague colunas da linha 1** das planilhas. Colunas novas são ignoradas.
- **Trava de remoção:** se uma planilha chegar com menos da metade dos registros que o sistema tem, ela é bloqueada (protege contra aba errada ou planilha esvaziada). Se a redução for proposital: executar `forcarSincronizacao` no Apps Script.
- Linhas com erro não entram e não bloqueiam as demais.
- Em falha, o Apps Script manda e-mail (no máximo 1 a cada 6 h).

## Limites do plano gratuito (e onde acompanhar)

| Serviço | Limite | Como acompanhar |
|---|---|---|
| Cloudflare Workers | 100 mil requisições/dia; 10 ms de CPU por requisição | dash.cloudflare.com → Workers → crm → Métricas |
| Neon | 1 GB de armazenamento; 5 GB/mês de tráfego; 100 h de processamento/mês | console.neon.tech → projeto → Monitoring |
| Fotos | teto de **700 MB** (≈ 4 mil fotos) imposto pelo sistema, para o banco não lotar | barra "Espaço de fotos" na página de qualquer imóvel |
| Apps Script | cotas diárias da conta Google (folgadas para este uso) | script.google.com → Execuções |

Se o Neon passar de 1 GB, **as gravações param** (inclusive a sincronização). Se passar de 5 GB de tráfego no mês, o banco fica suspenso até o mês virar. Por isso as listas usam miniaturas e as fotos ficam em cache no navegador.

## Cópia de segurança (mensal)
```bash
npm run db:backup -- --producao     # → backups/AAAA-MM-DD_HHMM/ (fotos + vínculos + códigos de lead + histórico)
```
Guarde a pasta fora do computador (ex.: Google Drive). As planilhas Google já são a cópia dos dados de negócio.

## Segredos (nunca no Git)
| Nome | Onde fica | Para que serve |
|---|---|---|
| `DATABASE_URL` | secret do Worker / `.dev.vars` | conexão do sistema com o Neon (usuário `crm_app`, só leitura e gravação de dados) |
| `DATABASE_URL_ADMIN`, `DATABASE_URL_PRODUCAO` | só `.dev.vars` | dono do banco — migrações e manutenção |
| `AUTH_SECRET` | secret do Worker / `.dev.vars` | assina as sessões. Trocar = desloga todo mundo |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | secret do Worker | login com Google (Google Cloud → projeto ifood-7sjqzb → Clientes) |
| `SYNC_SECRET` | secret do Worker + Propriedades do Apps Script | autentica o envio das planilhas. Trocar nos dois lugares |
| `APPS_SCRIPT_URL` (opcional) | secret do Worker | botão "Sincronizar agora" |

Trocar um secret de produção: `npx wrangler secret put NOME` (cole o valor quando pedir).

## Manutenção técnica
```bash
npm run dev                  # desenvolvimento (banco neondb_dev)
npm test                     # testes unitários
npm run preview              # versão compilada local, porta 3000
npm run test:integracao      # testes de integração (com o preview rodando; usam o banco de dev)
npm run deploy               # publica em produção
npm run db:migrate           # migrações no banco de dev
npm run db:migrate -- --producao   # migrações em produção
npm run build:apps-script    # regenera scripts/apps-script/Validacao.gs (cole de novo no Apps Script)
npm run sync:csv -- <pasta>  # importação manual de CSVs (emergência), mesmo formato do Apps Script
npm run db:resumo [-- --producao]  # totais, vínculos, pendências e últimas sincronizações
```

## Problemas comuns
| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Telas vazias | planilhas sem dados ou Apps Script parado | Sincronização → ver "Última sincronização"; script.google.com → Execuções |
| "Este e-mail não está cadastrado" no login | e-mail fora da planilha Corretores | cadastrar e aguardar a sincronização |
| Planilha com "Erro" na Sincronização | coluna obrigatória renomeada/apagada ou trava de remoção | ler a mensagem na tela; corrigir a planilha |
| "Sem conexão com o sistema" | internet ou instabilidade momentânea | "Tentar novamente"; a sessão não é perdida |
| E-mail "falha na sincronização" | permissão da planilha retirada, segredo trocado, sistema fora | conferir acesso às planilhas e o `SYNC_SECRET` |
