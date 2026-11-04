# Análise das planilhas — `modelos-20261103T132307Z-1-001.zip`

Análise feita em 2026-11-04. Os 16 CSVs deste zip são **idênticos** (mesmo hash SHA-256) aos da pasta `planilhas/` do pacote `CRM web system design.zip`. Os dados são fictícios e servem para entender a estrutura e validar os cálculos.

**Formato comum:** UTF-8 com BOM, separador `;`, quebra de linha LF, datas `AAAA-MM-DD` ou `AAAA-MM-DD HH:MM`, números com ponto decimal (`35.71`, `8000.0`) e sem separador de milhar.

## Visão geral

| Planilha (Google Sheets) | Arquivo de exemplo | Linhas | Período | Chave única |
|---|---|---|---|---|
| Imóveis | exemplo_preenchido_imoveis | 3 | — | `code` (IMV-xxx) |
| Agenciamentos | exemplo_agenciamentos_6_meses | 245 | 02/05 → 27/10/2026 | `agenciamentoId` (AG-xxxx) |
| Leads | exemplo_preenchido_leads | 4 | 20/10 → 28/10/2026 | `telefone` (+ `leadId` proposto) |
| Atendimentos | exemplo_preenchido_atendimentos | 3 | 28/10 → 30/10/2026 | `activityId` (ATD-xxx) |
| Contratos (com comissão) | exemplo_preenchido_vgv_contratos | 111 | 02/05 → 21/10/2026 | `contractId` (VEN-xxxx) |
| Fluxo de caixa | exemplo_preenchido_fluxo_caixa | 54 | 04/05 → 25/10/2026 | `entryId` (CX-xxxx) |
| Campanhas | exemplo_preenchido_campanhas | 2 | sem período | `nome` |
| Contratos (sem comissão) | exemplo_preenchido_contratos | 1 | 31/10/2026 | `contractId` (CTR-xxx) — **descartado**, coberto pelo modelo com comissão |

Os arquivos `modelo_*.csv` trazem só o cabeçalho (às vezes com 1 linha de exemplo), com as mesmas colunas dos exemplos.

## Detalhe por planilha

### 1. Imóveis — 7 colunas
`code; name; bairro; tipo; price; owner; status`
- tipo: Apartamento, Casa, Sala Comercial
- status: Disponível, Em negociação (domínio completo: + Vendido, Locado)
- price: venda = valor total; locação = aluguel mensal (ex.: Sala 5 = 2.500). **Não há coluna de modalidade** — hoje o sistema teria que adivinhar pelo valor.

### 2. Agenciamentos — 12 colunas, 245 linhas
`agenciamentoId; codigoImovel; dataCadastro; modalidade; corretor; agenciador; imovel; bairro; valorAnuncio; status; origem; observacoes`
- modalidade: Venda 150, Locação 95
- corretor: 8 nomes (Paulo Mendes 38, Bianca Silva 38, Carlos Lima 38, Juliana Costa 36, Felipe Rocha 24, Aline Martins 24, Renato Silva 24, Marina Duarte 23)
- agenciador: vazio em 78; "Agenciador Luiza Ramos" 84, "Agenciador Diego Lopes" 83 → remover prefixo "Agenciador "
- bairro: 10 (Centro, Igara, Rio Branco, Marechal Rondon, Bela Vista, Mathias Velho, Estância Velha, Nossa Senhora das Graças, São José, Harmonia)
- status: Disponível 154, Em negociação 47, Vendido 27, Locado 17
- origem: 100% "Portal imobiliário" → normalizar para "Portais"
- valorAnuncio: venda 219 mil–399 mil; locação 1.250–3.100/mês (soma geral sem sentido de negócio: mistura venda e aluguel)
- codigoImovel PORT-xxxx **não** se liga à planilha Imóveis (IMV-xxx)
- Captações por mês (venda/locação): mai 24/15 · jun 27/16 · jul 21/18 · ago 29/15 · set 26/17 · out 23/14

### 3. Leads — 11 colunas (+ `leadId` proposto)
`cliente; telefone; imovel; bairro; corretor; origem; stage; createdAt; updatedAt; observations; nextActionDate`
- stage: Novo lead, Contato inicial, Visita, Proposta (domínio: + Fechado, Perdido)
- origem: Instagram/Facebook, Portais, Indicação (domínio: + WhatsApp, Site)
- telefone: 11 dígitos sem máscara (51999990001) → importar como **texto** para não virar número/notação científica no Sheets
- imovel: liga por **nome** à planilha Imóveis (Apartamento 203, Casa 10, Sala 5)

### 4. Atendimentos — 10 colunas
`activityId; leadId; cliente; imovel; data; etapa; descricao; corretor; proximoContato; tempoRespostaMin`
- leadId vazio em 100% → vínculo pelo nome do cliente (proposta: preencher com LEAD-xxx)
- tempoRespostaMin: 15–22 min (média 18,3)

### 5. Contratos com comissão — 10 colunas, 111 linhas
`contractId; leadId; cliente; imovel; tipo; valor; dataFechamento; corretor; origem; comissao`
- tipo: Venda 57, Locação 54
- **VGV (só vendas): R$ 9.015.000** · comissões de venda R$ 324.540,01 (sempre **3,6%** do valor)
- Locações: soma dos aluguéis R$ 125.000 · comissão = **50% do aluguel** (R$ 62.500) — não entra no VGV
- VGV por mês: mai 1.435.000 · jun 1.510.000 · jul 1.580.000 · ago 1.460.000 · set 1.540.000 · out 1.490.000
- corretor: 8 nomes (Juliana Costa 16, Carlos Lima 14, Bianca Silva 14, Aline Oliveira 14, Camila Torres 14, Paulo Mendes 13, Rafael Mendes 13, Bruno Ferreira 13)
- origem: Instagram/Facebook 32, Portais 31, Indicação 24, WhatsApp 12, Site 12
- imovel: 14 nomes genéricos ("Apartamento Centro", "Casa Locação Igara") que **não** existem em Imóveis nem em Agenciamentos
- leadId vazio em 100%

### 6. Fluxo de caixa — 8 colunas, 54 linhas
`entryId; data; tipo; categoria; descricao; valor; status; contractId`
- tipo: Entrada 18, Saída 36 · status: 100% Realizado · contractId vazio em 100%
- 9 categorias, cada uma 1× por mês (6 meses)
- **Total: entradas R$ 634.500 · saídas R$ 595.000 · saldo R$ 39.500**
- Saldo por mês: mai 5.000 · jun 7.500 · jul 6.500 · ago 11.000 · set 4.500 · out 5.000
- 30 valores com `.0` (ex.: `8000.0`) — o importador precisa aceitar
- Coerência: "Vendas - comissões recebidas" de maio (51.000) ≈ 3,6% do VGV de maio (51.660)

### 7. Campanhas — 6 colunas (+ `inicio`, `fim` propostos)
`nome; canal; leads; custo; cpl; fechados`
- 2 campanhas: 56 leads, investimento R$ 2.150, 3 fechados
- cpl vem preenchido no exemplo e vazio no modelo → calcular `custo ÷ leads` quando vazio

## Cruzamentos e problemas de qualidade

| # | Problema | Impacto | Tratamento no sistema |
|---|---|---|---|
| 1 | Corretores diferentes entre Agenciamentos e Contratos: só 4 em comum (Paulo, Bianca, Carlos, Juliana). Felipe Rocha, Aline Martins, Renato Silva e Marina Duarte só captam; Aline Oliveira, Camila Torres, Rafael Mendes e Bruno Ferreira só vendem | Ranking e cards por corretor ficam parciais | Planilha Corretores como cadastro único; aviso para nome não cadastrado |
| 2 | "Aline Martins" × "Aline Oliveira" (e "Paulo Mendes" × "Rafael Mendes", "Bianca Silva" × "Renato Silva") | Risco de serem a mesma pessoa | Aviso de nome parecido na tela Sincronização; decisão humana |
| 3 | Três códigos de imóvel sem ligação (IMV-, PORT-, nome livre nos contratos/leads) | Não dá para ligar contrato → imóvel → foto | Ligar por `code` quando existir; sugerir coluna `codigoImovel` em Leads e Contratos |
| 4 | leadId vazio em Atendimentos e Contratos; contractId vazio no Caixa | Vínculos frágeis (por nome) | Vincular por nome do cliente como fallback + aviso; coluna `leadId` nos Leads |
| 5 | Imóveis sem coluna de modalidade | Não sabe se price é venda ou aluguel | Sugerir coluna `modalidade` (Venda/Locação) em Imóveis |
| 6 | "Portal imobiliário" × "Portais" | Origem duplicada nos gráficos | Normalizar para "Portais" |
| 7 | Prefixo "Agenciador " no nome | Nome não casa com o cadastro | Remover na sincronização |
| 8 | Campanhas sem período | Não acompanham filtro de datas | Colunas `inicio`/`fim` |
| 9 | Números com `.0` e ponto decimal; telefone longo | Sheets em pt-BR pode converter errado | Importar sem conversão automática; parser aceita `1.250,50`, `1250.5` e números nativos |
| 10 | Contratos × Contratos com comissão sobrepostos | Duplicidade | Usar só o modelo com comissão |

## Números de referência para os testes (fase 2/3)
Com os exemplos carregados, o sistema deve mostrar:
- VGV total (6 meses): **R$ 9.015.000** (57 vendas) · outubro: **R$ 1.490.000** (9 vendas)
- Comissões de venda: **R$ 324.540,01**
- Caixa 6 meses: entradas **R$ 634.500**, saídas **R$ 595.000**, saldo **R$ 39.500** · outubro: saldo **R$ 5.000**
- Captações: **245** (150 venda, 95 locação) · outubro: **37** (23 venda, 14 locação)
- Campanhas: CPL **R$ 35,71** e **R$ 42,86**; custo por fechamento **R$ 625** e **R$ 900**
- Tempo médio de resposta: **18,3 min**
