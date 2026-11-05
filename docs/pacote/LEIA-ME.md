# ImobiInsight — versão web do CRM

Pacote com tudo que compõe o sistema: as telas, a identidade visual, o código, as regras de negócio e as planilhas de dados.

## Conteúdo
- `sistema/ImobiInsight Web.dc.html` — sistema navegável e funcional, com 12 telas e 9 modais. Para abrir no navegador, mantenha o `support.js` na mesma pasta. É preciso internet para carregar as fontes.
- `sistema/versoes/` — primeira versão, com dados fictícios.
- `codigo/` — `template.html` (marcação), `logica.js` (estado, dados, filtros e ações) e `ESTRUTURA-DO-CODIGO.md`.
- `design-system/` — `DESIGN-SYSTEM.md` (guia e identidade visual), `tokens.json`, `icone.svg` e `logo.svg`.
- `REGRAS-DE-NEGOCIO.md` — perfis, funil, VGV, caixa, conferência, importação e filtros.
- `TELAS-E-COMPONENTES.md` — telas, modais com os campos, e estados.
- `MAPEAMENTO-CSV.md` — relação de cada coluna das planilhas com os campos e as telas.
- `planilhas/` — modelos vazios e exemplos preenchidos.
- `referencias/prototipo-original.html` — protótipo enviado no início.

## Uso rápido
- Login: qualquer e-mail válido e uma senha com 6 ou mais caracteres.
- O seletor de perfil no topo muda os módulos do menu.
- Os cadastros feitos pelos modais ficam só na sessão e somem ao recarregar a página.
