# Instalação da sincronização (Apps Script)

O script roda **na sua conta Google** (a dona das planilhas), lê as 8 planilhas a cada 10 minutos,
valida as linhas e envia ao sistema só o que mudou. É grátis e não exige compartilhar as planilhas.

Arquivos desta pasta:

| Arquivo | O que é |
|---|---|
| `Codigo.gs` | Configuração (URLs) e funções que você executa |
| `Validacao.gs` | Regras de validação — **gerado** por `npm run build:apps-script`, não edite |
| `appsscript.json` | Permissões e fuso horário do projeto |

## 1. Criar o projeto
1. Acesse https://script.google.com com a conta dona das planilhas → **Novo projeto**.
2. Renomeie para **ImobiInsight Sync** (clique em "Projeto sem título").

## 2. Colar os arquivos
1. No arquivo `Código.gs` que já existe, apague tudo e cole o conteúdo de `Codigo.gs`.
2. Clique em **+** (Arquivos) → **Script** → nome `Validacao` → cole o conteúdo de `Validacao.gs`.
3. Em **Configurações do projeto** (engrenagem) → marque **Mostrar arquivo de manifesto "appsscript.json"**.
   Volte ao Editor, abra `appsscript.json`, apague tudo e cole o conteúdo de `appsscript.json`.
4. Salve (Ctrl+S).

## 3. Preencher as URLs
Em `Codigo.gs`, no bloco `PLANILHAS`, cole a URL de cada planilha (a do navegador mesmo):
```js
leads: { url: 'https://docs.google.com/spreadsheets/d/1AbC.../edit', aba: '' },
```
`aba` vazio = primeira aba da planilha. Se os dados estiverem em outra aba, escreva o nome dela.

## 4. Configurar o segredo
1. **Configurações do projeto** → **Propriedades do script** → **Adicionar propriedade do script**.
2. Propriedade: `SYNC_SECRET` · Valor: o valor de `SYNC_SECRET` do arquivo `.dev.vars` do projeto
   (o mesmo já cadastrado no sistema). Salve.

## 5. Testar e ligar
1. No Editor, escolha a função **testarConfiguracao** e clique em **Executar**.
   Na primeira vez o Google pede autorização: **Revisar permissões** → sua conta →
   "O Google não verificou este app" → **Avançado** → **Acessar ImobiInsight Sync (não seguro)** → **Permitir**.
   (O aviso aparece porque o script é seu e não passou por revisão pública — é esperado.)
2. Veja o **Registro de execução**: deve listar as 8 planilhas com o número de linhas e as colunas, e terminar com
   `Configuração OK.`
3. Execute **instalarGatilho**: cria a execução a cada 10 minutos e já faz a primeira sincronização.
   O registro mostra, por planilha: novas, alteradas, removidas e avisos.

## Funções úteis
| Função | Quando usar |
|---|---|
| `sincronizarAgora` | Enviar já o que mudou (sem esperar os 10 min) |
| `forcarSincronizacao` | Reenviar tudo e liberar a trava de remoção em massa (ver abaixo) |
| `removerGatilho` | Pausar a sincronização |
| `testarConfiguracao` | Conferir URLs, abas, colunas e conexão |

## Permissão nas planilhas
Basta **acesso de leitura** (leitor) às planilhas: o script nunca altera nada nelas. (O Google exige a permissão `spreadsheets` completa para abrir planilha por ID, mesmo que o código só leia.) Se o proprietário remover
o seu acesso, a sincronização daquela planilha falha e você recebe e-mail.

## Linhas de exemplo dos modelos
Os modelos vieram com uma linha fictícia (IMV-101, Mariana Souza, ATD-001, "Campanha Apartamento Centro").
Como não podem ser apagadas, o bloco `IGNORAR` no topo do `Codigo.gs` as descarta antes do envio. Só é ignorada
a linha idêntica ao exemplo (código **e** nome **e** um terceiro campo), então um registro real com o mesmo código entra.

## Regras importantes
- **Não renomeie nem apague colunas da linha 1.** Colunas novas são ignoradas; colunas obrigatórias ausentes
  bloqueiam só aquela planilha (você recebe e-mail).
- **Linhas com erro** (data inválida, valor não numérico, campo obrigatório vazio) não entram e aparecem como aviso;
  as demais entram normalmente.
- **Trava de segurança:** se uma planilha chegar com menos da metade dos registros que o sistema já tem, a
  sincronização dela é bloqueada (evita apagar tudo por aba errada ou planilha esvaziada). Se a redução for
  intencional, execute `forcarSincronizacao`.
- **Remover uma linha da planilha remove o registro do sistema** na sincronização seguinte (a planilha é a fonte única).
- Em caso de falha, o script manda **e-mail** para você (no máximo 1 a cada 6 horas).

## Botão "Sincronizar agora" no sistema (opcional)
Sem isto, a sincronização continua automática a cada 10 minutos; o botão só permite forçar na hora pela tela Sincronização.
1. No Apps Script: **Implantar → Nova implantação → (engrenagem) App da Web**.
   - Descrição: `ImobiInsight` · Executar como: **Eu** · Quem pode acessar: **Qualquer pessoa**.
   - Clique em **Implantar** e copie a **URL do app da Web** (termina em `/exec`).
   - "Qualquer pessoa" é necessário para o servidor da Cloudflare conseguir chamar; o script recusa quem não enviar o `SYNC_SECRET`.
2. Me passe a URL (ou, no terminal do projeto: `npx wrangler secret put APPS_SCRIPT_URL` e cole a URL).
3. O botão "Sincronizar agora" aparece na tela Sincronização.
Se alterar o código do script depois, use **Implantar → Gerenciar implantações → editar → Nova versão** para manter a mesma URL.
