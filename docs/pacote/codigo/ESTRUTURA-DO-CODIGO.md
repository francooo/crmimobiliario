# Estrutura do código

O sistema é um arquivo só (`sistema/ImobiInsight Web.dc.html`) dividido em duas partes. Elas também foram separadas aqui para leitura:

- `template.html`: marcação de todas as telas e modais, com estilos inline. `{{ nome }}` insere um valor calculado, `<sc-if value>` mostra o bloco de forma condicional e `<sc-for list as>` repete o bloco para cada item.
- `logica.js`: a classe `Component`, com o estado, os dados e as regras.

## Estado (`state`)
| Chave | Uso |
|---|---|
| page | Tela atual. Fica salva no navegador (`imobi_web_page`) |
| role | Perfil ativo (socio, locacoes, admin, corretor) |
| leadId | Lead aberto no detalhe |
| stage, fCor, fOrig, fMod, q | Filtros de etapa, corretor, origem, modalidade e busca |
| period | Período global: '1', '3' ou '6' meses |
| finMonth | Mês do Financeiro ('05' a '10') |
| importKind | Tipo de importação selecionado |
| modal | Modal aberto (lead, interacao, imovel, agenciamento, caixa, contrato, campanha, corretor, senha) |
| cxTipo | Entrada ou Saída no modal de caixa (define as categorias) |
| approved | Itens da fila de conferência já tratados |
| newLeads, newAts, newProps, newAgs, newCamps, newPending, newRoster | Registros criados pelos modais na sessão |
| stageOv, nextOv | Etapa e próximo contato alterados por interações |
| toast, loginErr, resetSent | Mensagens de retorno |

## Fluxo de `renderVals()`
1. **Dados de base:** vêm dos CSVs (leadsCsv, atend, imoveis, campanhasCsv, agMonths, agRecent, vgvCor, vgvMonth, vgvOrig, cxBase) e são somados aos registros da sessão.
2. **Filtros:** são aplicados em `leadsBase`, `properties` e `agRows`.
3. **Indicadores:** KPIs, funil, ranking e financeiro, calculados de acordo com o período e o mês.
4. **Menu:** montado conforme o perfil (`roleAllowed`).
5. **Retorno:** a função devolve valores e ações (`nav`, `openM`, `submit`, `set*`) para o template.

## Como levar para produção
- Trocar os dados fixos por chamadas a uma API ou banco de dados, com uma tabela para cada CSV de `MAPEAMENTO-CSV.md`.
- Gravar os envios dos modais (`submit.*`) no servidor. Hoje eles ficam só na sessão.
- Fazer a autenticação real e aplicar as permissões no servidor, não só no menu.
- Persistir a fila de conferência e o histórico de alterações.
