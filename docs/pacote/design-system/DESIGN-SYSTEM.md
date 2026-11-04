# ImobiInsight — Design system

Visual neutro em tons de cinza, derivado do protótipo original. A cor fica reservada para o status (etapas do funil, situação do imóvel, alertas). Os valores exatos estão em `tokens.json`.

## Marca
- `icone.svg`: casa estilizada com duas barras de gráfico (gestão + inteligência). Fundo `#2c2d30`.
- `logo.svg`: ícone + nome "ImobiInsight" em Geist Bold, espaçamento −0,8.
- Na barra lateral, o nome aparece só como texto: 21px, peso 700.

## Tipografia
- **Geist** (texto e números), **Geist Mono** (códigos, rótulos de seção, datas curtas, atalhos).
- Números de tabela e KPI usam `font-variant-numeric: tabular-nums`.

| Uso | Tamanho | Peso |
|---|---|---|
| Título de página | 30px | 600, −0,9 |
| Valor de KPI | 40px (28–36 em financeiro/marketing) | 600, −1,4 |
| Título de card | 16px | 600 |
| Corpo / tabela | 14px | 400 |
| Apoio | 13px | 400, cor `#6b6e74` |
| Legenda | 12,5px | 400, cor `#80838a` |
| Rótulo de grupo do menu | 11px mono, maiúsculas | 400, +0,8 |

## Cores
- Fundo `#f4f4f5` · Superfície `#ffffff` · Barra lateral `#ececee`
- Borda `#e3e3e6` · Borda de controles `#d6d7da` · Divisor de linha `#efeff1`
- Texto `#161719` → `#2e3135` → `#44474c` → `#55585d` → `#6b6e74` → `#80838a`
- Primária (botões, item ativo do menu) `#2c2d30`, hover `#45474b`
- Escala de gráficos (5 tons): `#5b5d62 #808287 #a2a4a8 #c0c1c5 #d9dadd`

### Status
| Status | Fundo | Texto |
|---|---|---|
| Novo lead | #eef0f3 | #3f4650 |
| Contato inicial | #efeff1 | #44474c |
| Visita | #e8edf3 | #3a4a5e |
| Proposta / Em negociação / Pendente | #f5f0e6 | #6b5523 |
| Fechado / Disponível / Atingiu meta | #e9efe7 | #4b6446 |
| Perdido / Vencido | #f6ece9 | #8a3f34 |
| Vendido / Locado | #efeff1 | #44474c |

Aviso (banner de ambiente demonstrativo, pontos de atenção): fundo `#fbf6ea`, borda `#eadfc2`, texto `#6a5321`.

## Forma e espaçamento
- Raios: chip 6 · botão 9 · input 10 · card 14 · avatar circular.
- Espaços: 4 / 8 / 14 / 20 / 28. Gap padrão entre cards: 14px. Padding de card: 18–20px.
- Layout: barra lateral fixa de 232px, cabeçalho fixo de 68px, conteúdo com padding 24px 28px.
- Sem sombras. Separação feita por borda de 1px.

## Componentes
- **Botão primário**: 38px de altura, fundo `#2c2d30`, texto branco 14px, raio 9.
- **Botão secundário**: 38px, fundo branco, borda `#d6d7da`.
- **Chip de filtro**: 34px, raio 8; ativo = fundo `#2c2d30` e texto branco.
- **Badge de status**: padding 4×9, raio 6, 12,5px, cores da tabela de status.
- **Card de KPI**: rótulo 14px `#55585d`, valor grande, tendência 13px verde `#5f7a5a`, apoio 13px.
- **Tabela**: cabeçalho `#f7f7f8` 12,5px peso 500; linhas 14px com divisor `#efeff1`; hover `#fafafa`; códigos em Geist Mono.
- **Barra horizontal**: trilho `#f1f1f3`, preenchimento cinza da escala; altura 10–22px.
- **Cartão do funil (kanban)**: coluna `#ececee` raio 12; cartão branco raio 10, borda `#e3e3e6`, hover `#c3c4c8`.
- **Item do menu**: 14,5px, padding 9×10, raio 8; ativo = fundo `#2c2d30`, peso 600; contador em mono à direita.
- **Espaço reservado de foto**: listras diagonais `#f1f1f3`/`#e8e8eb` com rótulo em mono.
- **Timeline**: ponto de 10px + linha de 1px `#e3e3e6`.
- **Modal**: overlay `rgba(22,23,25,.42)`, caixa branca raio 16, largura máx. 640px; cabeçalho 20px/600 + subtítulo 14px; campos em grade `repeat(auto-fit,minmax(220px,1fr))` gap 14×16; inputs 42px raio 9 borda `#d6d7da`; rodapé `#fafafa` com Cancelar + ação primária 40px.
- **Toast**: fundo `#2c2d30`, texto branco 14px, raio 10, ponto verde `#9dbf95`, centralizado a 24px do rodapé, some após ~3s.
- **Mensagem de erro**: fundo `#f6ece9`, texto `#8a3f34`, raio 8.
- **Estado vazio**: texto 14px `#6b6e74` centralizado, padding 28–32px.

## Identidade visual
- Tom sóbrio e profissional, voltado a sócios e gestores; cinza como base e cor apenas para significado (status, alerta, sucesso).
- Login em duas colunas: painel escuro `#2c2d30` com nome da marca, título 44px e descrição; formulário claro à direita.
- Textos em português, diretos, sem jargão; datas DD/MM, valores em R$ com separador de milhar.

## Telas
Login · Dashboard · Leads · Funil · Detalhe do lead · Imóveis · Agenciamentos · Corretores · Marketing · Financeiro · Importações · Governança.

O perfil escolhido no cabeçalho (Sócio, Gerente de locações, Administrativo, Corretor) filtra os módulos do menu conforme a matriz de permissões da tela Governança.
