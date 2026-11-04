# Regras de negócio — ImobiInsight Web

## 1. Acesso e perfis
- **Login:** o e-mail precisa ter formato válido e a senha pelo menos 6 caracteres. Se não tiver, aparece uma mensagem de erro e o acesso não é liberado.
- **Esqueci a senha:** abre um modal que pede o e-mail. A resposta é sempre a mesma ("se o e-mail estiver cadastrado…"), para não revelar quais contas existem.
- **Perfis:** o perfil define quais módulos aparecem no menu.

| Perfil | Módulos visíveis |
|---|---|
| Sócio / Gestor | Todos |
| Gerente de locações | Leads, Funil, Imóveis, Agenciamentos, Corretores, Governança |
| Administrativo | Agenciamentos, Financeiro, Importações, Governança |
| Corretor | Leads, Funil, Imóveis, Agenciamentos, Governança |

**Matriz de permissões**

| Operação | Sócio | Gerente | Admin. | Corretor |
|---|---|---|---|---|
| Registrar leads e atendimentos | ✓ | ✓ | — | ✓ |
| Importar contratos e caixa | ✓ | — | ✓ | — |
| Ver VGV e caixa consolidados | ✓ | — | — | — |
| Cadastrar agenciamentos | ✓ | ✓ | ✓ | ✓ |
| Ver indicadores de locação | ✓ | ✓ | — | — |
| Aprovar dados financeiros | ✓ | — | — | — |
| Configurar perfis | ✓ | — | — | — |

## 2. Leads e funil
- **Etapas, em ordem:** Novo lead → Contato inicial → Visita → Proposta → Fechado. "Perdido" encerra o lead sem fechamento.
- **Funil de etapas:** o lead conta em todas as etapas até a atual. Exemplo: um lead em Proposta aparece também em Novo lead, Contato inicial e Visita.
- **Próximo contato vencido:** data anterior a hoje. O lead fica destacado em vermelho e entra no card do Dashboard.
- **Identificação:** o telefone identifica o lead. Ao reimportar, um lead com o mesmo telefone é atualizado, não duplicado.
- **Registrar interação:** cria um atendimento no histórico e atualiza a etapa do lead. Se o próximo contato for informado, ele também é atualizado.
- **Tempo de resposta:** média de `tempoRespostaMin` dos atendimentos, em minutos.

## 3. Imóveis e agenciamentos
- **Situação do imóvel:** Disponível, Em negociação, Vendido ou Locado.
- **Valor:** em locação é o aluguel mensal e aparece como "R$ X/mês". Em venda é o valor total.
- **Códigos:** IMV-xxx para imóveis do CRM e PORT-xxxx para imóveis vindos do portal. Se o código ficar vazio no cadastro, o sistema gera um.
- **Meta da roleta:** quem fez 3 ou mais captações de venda na semana anterior participa da distribuição de leads.
- **Agenciador:** o prefixo "Agenciador " é removido do nome na importação. O campo é opcional.
- **Origem:** "Portal imobiliário" é padronizada como "Portais".

## 4. Financeiro
- **VGV:** soma apenas os contratos de **venda**. Locações não entram no VGV.
- **Caixa:** o saldo é a soma das entradas menos a soma das saídas.
- **Entradas:** comissões de vendas, administração recorrente de locação, primeiro aluguel e outras entradas.
- **Saídas:** distribuição aos sócios, repasse da intermediação, pessoal, estrutura, marketing, tecnologia e outras.
- **Separação:** Vendas, Locações e Despesas aparecem em blocos separados. Não há apuração contábil de lucro nem de impostos.
- **Conferência:** novos contratos e lançamentos (manuais ou importados) entram como **pendentes**. Só compõem os indicadores depois da aprovação de um sócio em Governança. O sócio pode aprovar ou pedir ajuste.

## 5. Marketing
- **Custo por lead:** investimento ÷ leads. Se a coluna `cpl` vier vazia, o sistema calcula.
- **Custo por fechamento:** investimento ÷ negócios fechados.
- **Origem dos contratos fechados:** vem da coluna `origem` dos contratos com comissão.

## 6. Corretores
- **Ranking:** ordenado pelo VGV vendido. A comissão aparece ao lado.
- **Participação no VGV:** VGV do corretor ÷ VGV total.
- **Cadastro único de corretores e agenciadores:** os registros importados só se ligam quando o nome está cadastrado. Nomes parecidos (por exemplo, Aline Martins e Aline Oliveira) ficam marcados para conferência.

## 7. Importações
- **Formato:** CSV em UTF-8, separado por ponto e vírgula, vírgula ou tabulação, com até 4 MB. Datas no formato AAAA-MM-DD.
- **Ordem recomendada:** Imóveis → Agenciamentos → Leads → Atendimentos → Contratos com comissão → Fluxo de caixa → Campanhas.
- **Atualização:** um registro com o mesmo identificador (activityId, contractId, entryId, code, agenciamentoId, nome da campanha ou telefone do lead) é atualizado em vez de duplicado.
- **Backup:** recomenda-se exportar um backup antes de importar lotes grandes.
- **Histórico:** cada importação fica registrada no histórico de alterações em Governança.

## 8. Filtros
- **Período (topo):** Outubro 2026, últimos 3 meses ou últimos 6 meses. Afeta os KPIs do Dashboard e de Agenciamentos.
- **Busca (topo):** procura por cliente, imóvel, bairro, telefone ou código em Leads, Funil, Imóveis e Agenciamentos. Se a busca for feita em outra tela, o sistema leva para Leads.
- **Leads:** etapa, corretor e origem, com o botão "Limpar filtros".
- **Funil:** corretor. O mesmo filtro vale para a tabela de Agenciamentos.
- **Imóveis:** venda, locação ou ambos.
- **Financeiro:** mês, de 05/2026 a 10/2026.
- Quando nenhum resultado aparece, a tela mostra uma mensagem.

## 9. Auditoria
- **Histórico de alterações:** registra data, usuário, ação, registro e detalhe de cada mudança, e pode ser exportado em CSV.
