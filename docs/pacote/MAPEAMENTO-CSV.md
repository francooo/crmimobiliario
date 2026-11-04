# Mapeamento das planilhas para o sistema

Todos os arquivos usam ponto e vírgula como separador, UTF-8 e datas AAAA-MM-DD (com hora: AAAA-MM-DD HH:MM). Os modelos vazios e os exemplos preenchidos estão em `planilhas/`.

Ordem recomendada de importação: Imóveis → Agenciamentos → Leads → Atendimentos → Contratos com comissão → Fluxo de caixa → Campanhas.

## 1. Leads — `modelo_leads.csv`
Telas: Leads, Funil, Detalhe do lead, Dashboard.
| Coluna | Campo | Obrigatório |
|---|---|---|
| cliente | Cliente | sim |
| telefone | Telefone (identifica o lead na reimportação) | sim |
| imovel | Imóvel de interesse (nome) | não |
| bairro | Bairro | não |
| corretor | Corretor responsável | sim |
| origem | Origem | sim |
| stage | Etapa (Novo lead, Contato inicial, Visita, Proposta, Fechado, Perdido) | sim |
| createdAt | Data de entrada | sim |
| updatedAt | Última interação | não |
| observations | Observações / próxima ação | não |
| nextActionDate | Próximo contato | não |

## 2. Atendimentos — `modelo_atendimentos.csv`
Telas: Detalhe do lead (histórico), Dashboard (tempo de resposta).
Colunas: activityId, leadId, cliente, imovel, data, etapa, descricao, corretor, proximoContato, tempoRespostaMin.

## 3. Imóveis — `modelo_imoveis.csv`
Tela: Imóveis. Colunas: code, name, bairro, tipo, price, owner, status.

## 4. Agenciamentos — `modelo_importacao_agenciamentos.csv`
Tela: Agenciamentos (KPIs do mês, histórico de 6 meses, roleta semanal, tabela), Corretores (captações).
Colunas: agenciamentoId, codigoImovel, dataCadastro, modalidade, corretor, agenciador, imovel, bairro, valorAnuncio, status, origem, observacoes.

## 5. Contratos — `modelo_contratos.csv`
Telas: Financeiro, Governança (fila de conferência).
Colunas: contractId, leadId, cliente, imovel, tipo, valor, dataFechamento, corretor, origem.

## 6. Contratos com comissão — `modelo_vgv_contratos.csv`
Telas: Financeiro (VGV), Corretores (ranking), Dashboard, Marketing (origem).
Mesmas colunas de Contratos + `comissao`. Em locações, `valor` é o aluguel mensal e não soma ao VGV.

## 7. Fluxo de caixa — `modelo_fluxo_caixa.csv`
Tela: Financeiro. Colunas: entryId, data, tipo (Entrada/Saída), categoria, descricao, valor, status, contractId.
Categorias: Vendas - comissões recebidas · Vendas - distribuição aos sócios · Locações - administração recorrente · Locações - primeiro aluguel · Locações - repasse da intermediação · Despesas - pessoal · Despesas - estrutura · Despesas - marketing · Despesas - tecnologia e outras.

## 8. Campanhas — `modelo_campanhas.csv`
Tela: Marketing. Colunas: nome, canal, leads, custo, cpl (calculado se vazio), fechados.

## Pontos de atenção
- `leadId` vazio em atendimentos e contratos; `contractId` vazio no fluxo de caixa. O vínculo hoje é feito pelo nome do cliente.
- Leads não têm coluna de código.
- Imóveis aparecem como nome (leads/contratos), `IMV-` (imóveis) e `PORT-` (agenciamentos).
- Nomes de corretores diferem entre agenciamentos e contratos com comissão; "Aline Martins" e "Aline Oliveira" precisam de conferência.
- Origem "Portal imobiliário" é padronizada como "Portais"; o prefixo "Agenciador " é removido.
- Contratos e Contratos com comissão se sobrepõem — sugestão: usar só o modelo com comissão.
- Campanhas não têm período, então não acompanham o filtro de datas.
