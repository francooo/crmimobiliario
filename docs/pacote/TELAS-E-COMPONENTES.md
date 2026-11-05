# Telas, modais e componentes

## Estrutura
- **Barra lateral** (232px, fixa): fica à esquerda. Mostra o nome da marca, os grupos Comercial, Gestão e Administração (com contadores), e o usuário com o botão "Sair".
- **Cabeçalho** (68px, fixo): tem a busca global (com atalho ⌘K), o seletor de período, o seletor de perfil e as notificações.
- **Aviso de ambiente demonstrativo:** pode ser ocultado pela opção `showNotice`.

## Telas
| # | Tela | Conteúdo principal | Ações |
|---|---|---|---|
| 01 | Login | Painel da marca + formulário | Entrar, Esqueci a senha |
| 02 | Dashboard | 4 KPIs, etapas do funil, origem dos contratos, tempo de resposta, atendimentos recentes, VGV por corretor, próximos contatos vencidos | Exportar, + Novo lead |
| 03 | Leads | Filtros de etapa, corretor e origem; tabela paginada | Importar CSV, Exportar, + Novo lead |
| 04 | Funil | Kanban com 5 colunas por etapa | Filtro de corretor |
| 05 | Detalhe do lead | Etapas, histórico, próxima ação, imóvel de interesse, dados do lead | Ligar, WhatsApp, Registrar interação, Reagendar |
| 06 | Imóveis | Grade de cards com foto, status, preço e leads | Filtro de modalidade, + Cadastrar imóvel |
| 07 | Agenciamentos | KPIs, histórico de 6 meses, meta da roleta, tabela de captações | Importar CSV do portal, + Novo agenciamento |
| 08 | Corretores | Cards individuais, ranking de VGV, cadastro de corretores e agenciadores | + Cadastrar |
| 09 | Marketing | KPIs, contratos por canal, campanhas | + Campanha |
| 10 | Financeiro | KPIs, blocos Vendas, Locações e Despesas, evolução mensal | Filtro de mês, + Venda/locação, + Entrada/saída |
| 11 | Importações | Tipo de arquivo, mapeamento de colunas, avisos, envio, ordem recomendada, backup, histórico | Baixar modelo, Confirmar importação |
| 12 | Governança | Perfis, matriz de permissões, fila de conferência, histórico de alterações | Aprovar, Ajustar, Exportar CSV |

## Modais
Todos usam o mesmo formato:
- largura máxima de 640px (480px no de senha), raio 16 e fundo escurecido `rgba(22,23,25,.42)`;
- título de 20px e subtítulo;
- campos em grade de 2 colunas, com `*` nos obrigatórios;
- rodapé com os botões Cancelar e a ação principal.

Fecham ao clicar fora, no × ou em Cancelar. Ao salvar, aparece uma confirmação na parte de baixo da tela por cerca de 3 segundos.

| Modal | Onde abre | Campos |
|---|---|---|
| Novo lead | Dashboard, Leads | Cliente*, Telefone*, Origem*, Corretor*, Imóvel de interesse, Bairro, Etapa, Próximo contato, Observações |
| Registrar interação | Detalhe do lead (Registrar interação / Reagendar) | Tipo de contato*, Data e hora, Etapa após o contato, Tempo de resposta, Descrição, Próximo contato, Próxima ação |
| Cadastrar imóvel | Imóveis | Código, Nome*, Tipo*, Bairro*, Modalidade*, Valor*, Proprietário, Situação |
| Novo agenciamento | Agenciamentos | Código do portal, Data, Modalidade*, Valor anunciado*, Imóvel*, Bairro*, Corretor*, Agenciador, Situação |
| Nova entrada ou saída | Financeiro | Tipo* (as categorias mudam conforme o tipo), Data*, Categoria*, Valor*, Situação, Descrição, Contrato vinculado |
| Registrar venda ou locação | Financeiro | Tipo*, Data de fechamento*, Cliente*, Imóvel*, Valor*, Comissão, Corretor*, Origem |
| Nova campanha | Marketing | Nome*, Canal*, Investimento*, Início, Fim, Leads gerados, Negócios fechados |
| Cadastrar corretor ou agenciador | Corretores | Nome*, Função, E-mail de acesso, CRECI, Telefone |
| Recuperar acesso | Login | E-mail* |

## Estados
- **Item ativo do menu:** fundo `#2c2d30`, texto branco, peso 600.
- **Linha de tabela:** hover `#fafafa`. A linha é clicável quando leva a um detalhe.
- **Lista vazia:** aparece a mensagem centralizada "Nenhum … encontrado com os filtros atuais."
- **Erro no login:** fundo `#f6ece9`, texto `#8a3f34`.
- **Sucesso:** fundo `#e9efe7`, texto `#4b6446`.
- **Aviso:** fundo `#fbf6ea`, borda `#eadfc2`, texto `#6a5321`.
- **Botão desativado:** fundo `#c3c4c8` (por exemplo, "Confirmar importação" antes de escolher o arquivo).
