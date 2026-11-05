-- ImobiInsight — esquema inicial (Neon / PostgreSQL 18)
-- Tabelas "espelho" recebem os dados das planilhas Google (fonte única) via sincronização.
-- Tabelas "do sistema" guardam o que só existe aqui: códigos gerados, vínculos, fotos e logs.
-- Datas das planilhas são horário local (America/Sao_Paulo) → timestamp/date sem fuso.

-- ───────────────────────────── Espelho das planilhas ─────────────────────────────

create table corretores (
  nome              text primary key,
  nome_normalizado  text not null,               -- sem acento, minúsculo (busca de nomes parecidos)
  funcao            text,                        -- Corretor, Agenciador, Sócio…
  email             text,                        -- e-mail de acesso (login Google)
  perfil            text check (perfil in ('socio','locacoes','admin','corretor')),
  creci             text,
  telefone          text,
  ativo             boolean not null default true,
  observacoes       text,
  sheet_row         int,
  synced_at         timestamptz not null default now()
);
create unique index corretores_email_uk on corretores (lower(email)) where email is not null and email <> '';
create index corretores_nome_norm_idx on corretores (nome_normalizado);

create table imoveis (
  code          text primary key,                -- IMV-xxx
  nome          text not null,
  nome_normalizado text not null,
  bairro        text,
  tipo          text,
  modalidade    text check (modalidade in ('Venda','Locação')),  -- coluna sugerida; pode vir vazia
  preco         numeric(14,2),
  proprietario  text,
  status        text,
  sheet_row     int,
  synced_at     timestamptz not null default now()
);
create index imoveis_nome_norm_idx on imoveis (nome_normalizado);

create table agenciamentos (
  agenciamento_id  text primary key,             -- AG-xxxx
  codigo_imovel    text,                         -- PORT-xxxx
  data_cadastro    date not null,
  modalidade       text not null,
  corretor         text,
  agenciador       text,                         -- sem o prefixo "Agenciador "
  imovel           text,
  imovel_normalizado text,
  bairro           text,
  valor_anuncio    numeric(14,2),
  status           text,
  origem           text,                         -- "Portal imobiliário" → "Portais"
  observacoes      text,
  sheet_row        int,
  synced_at        timestamptz not null default now()
);
create index agenciamentos_data_idx on agenciamentos (data_cadastro);
create index agenciamentos_corretor_idx on agenciamentos (corretor);
create index agenciamentos_imovel_norm_idx on agenciamentos (imovel_normalizado);

create table leads (
  telefone          text primary key,            -- identifica o lead (só dígitos)
  lead_id           text not null,               -- gerado pelo sistema (lead_ids) ou vindo da planilha
  lead_id_planilha  text,
  cliente           text not null,
  cliente_normalizado text not null,
  imovel            text,
  codigo_imovel     text,                        -- preenchido pelo sistema (vínculo)
  bairro            text,
  corretor          text,
  origem            text,
  etapa             text not null,
  criado_em         timestamp,
  atualizado_em     timestamp,
  observacoes       text,
  proximo_contato   date,
  sheet_row         int,
  synced_at         timestamptz not null default now()
);
create unique index leads_lead_id_uk on leads (lead_id);
create index leads_cliente_norm_idx on leads (cliente_normalizado);
create index leads_corretor_idx on leads (corretor);
create index leads_etapa_idx on leads (etapa);
create index leads_proximo_idx on leads (proximo_contato);

create table atendimentos (
  activity_id       text primary key,            -- ATD-xxx
  lead_id_planilha  text,
  lead_id           text,                        -- preenchido pelo sistema (vínculo)
  cliente           text,
  cliente_normalizado text,
  imovel            text,
  data              timestamp,
  etapa             text,
  descricao         text,
  corretor          text,
  proximo_contato   date,
  tempo_resposta_min int,
  sheet_row         int,
  synced_at         timestamptz not null default now()
);
create index atendimentos_lead_idx on atendimentos (lead_id);
create index atendimentos_data_idx on atendimentos (data);

create table contratos (
  contract_id       text primary key,            -- VEN-xxxx / CTR-xxx
  lead_id_planilha  text,
  lead_id           text,                        -- preenchido pelo sistema (vínculo)
  cliente           text,
  cliente_normalizado text,
  imovel            text,
  imovel_normalizado text,
  codigo_imovel     text,                        -- preenchido pelo sistema (vínculo)
  tipo              text not null check (tipo in ('Venda','Locação')),
  valor             numeric(14,2) not null,      -- venda: total · locação: aluguel mensal (fora do VGV)
  data_fechamento   date not null,
  corretor          text,
  origem            text,
  comissao          numeric(14,2),
  sheet_row         int,
  synced_at         timestamptz not null default now()
);
create index contratos_data_idx on contratos (data_fechamento);
create index contratos_corretor_idx on contratos (corretor);

create table fluxo_caixa (
  entry_id     text primary key,                 -- CX-xxxx
  data         date not null,
  tipo         text not null check (tipo in ('Entrada','Saída')),
  categoria    text not null,
  descricao    text,
  valor        numeric(14,2) not null,
  status       text,
  contract_id  text,
  sheet_row    int,
  synced_at    timestamptz not null default now()
);
create index fluxo_caixa_data_idx on fluxo_caixa (data);

create table campanhas (
  nome       text primary key,
  canal      text,
  leads      int,
  custo      numeric(14,2),
  cpl        numeric(14,2),                      -- calculado (custo ÷ leads) quando vier vazio
  fechados   int,
  inicio     date,
  fim        date,
  sheet_row  int,
  synced_at  timestamptz not null default now()
);

-- ───────────────────────────── Dados do sistema ─────────────────────────────

-- Código fixo por telefone: nunca muda nem é reaproveitado, mesmo se a planilha for reordenada.
create sequence lead_id_seq;
create table lead_ids (
  telefone   text primary key,
  lead_id    text not null unique,
  criado_em  timestamptz not null default now()
);

-- Ligações feitas à mão na tela Sincronização; reaplicadas a cada sincronização.
create table vinculos_manuais (
  id           bigint generated always as identity primary key,
  tipo         text not null check (tipo in ('atendimento_lead','contrato_lead','lead_imovel','contrato_imovel')),
  origem_chave text not null,                    -- activity_id, contract_id ou telefone
  alvo_chave   text not null,                    -- lead_id ou código do imóvel
  usuario      text not null,
  criado_em    timestamptz not null default now(),
  unique (tipo, origem_chave)
);

-- Fotos dos imóveis (bytea). Teto de 700 MB controlado pela API para não estourar o 1 GB do Neon Free.
create table imovel_fotos (
  id           bigint generated always as identity primary key,
  imovel_code  text not null,                    -- IMV-xxx ou PORT-xxxx
  hash         text not null,
  ordem        int not null default 0,
  capa         boolean not null default false,
  tamanho      int not null,                     -- bytes da imagem + miniatura
  imagem       bytea not null,                   -- WebP ~1280 px
  miniatura    bytea not null,                   -- WebP ~400 px
  criado_por   text not null,
  criado_em    timestamptz not null default now()
);
create index imovel_fotos_imovel_idx on imovel_fotos (imovel_code, ordem);

create table sync_runs (
  id           bigint generated always as identity primary key,
  planilha     text not null,
  origem       text not null,                    -- gatilho, manual, menu
  iniciado_em  timestamptz not null default now(),
  concluido_em timestamptz,
  hash         text,
  linhas       int,
  inseridas    int,
  atualizadas  int,
  removidas    int,
  avisos       int,
  status       text not null default 'executando' check (status in ('executando','ok','erro','ignorado')),
  erro         text
);
create index sync_runs_planilha_idx on sync_runs (planilha, iniciado_em desc);

create table sync_issues (
  id         bigint generated always as identity primary key,
  run_id     bigint not null references sync_runs (id) on delete cascade,
  planilha   text not null,
  linha      int,
  coluna     text,
  tipo       text not null,                      -- invalido, sem_vinculo, nome_parecido, nao_cadastrado
  mensagem   text not null,
  chave      text                                -- registro afetado
);
create index sync_issues_run_idx on sync_issues (run_id);

create table audit_log (
  id        bigint generated always as identity primary key,
  em        timestamptz not null default now(),
  usuario   text not null,
  acao      text not null,                       -- login, login_negado, sincronizacao, foto_enviada…
  registro  text,
  detalhe   text
);
create index audit_log_em_idx on audit_log (em desc);
