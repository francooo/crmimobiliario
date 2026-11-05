-- Fase 2 — sincronização com as planilhas Google

-- Similaridade de nomes (avisos "nome parecido": Aline Martins × Aline Oliveira)
create extension if not exists pg_trgm;

-- Código do imóvel informado na própria planilha (coluna opcional codigoImovel)
alter table leads add column codigo_imovel_planilha text;
alter table contratos add column codigo_imovel_planilha text;
create index leads_lead_id_planilha_idx on leads (lead_id_planilha) where lead_id_planilha is not null;

-- O leadId da planilha só serve para vincular; o código exibido é sempre o gerado pelo sistema.
-- (sem unicidade na planilha — duplicados são avisados e ignorados na validação)

-- Origem de cada planilha (preenchida pelo Apps Script a cada envio)
create table sync_fontes (
  planilha        text primary key,
  spreadsheet_id  text,
  url             text,
  aba             text,
  ultimo_hash     text,
  ultima_sync     timestamptz,
  ultimo_run_id   bigint references sync_runs (id) on delete set null
);

-- Linhas recebidas em partes (lotes de até 500) antes da troca atômica no espelho
create table sync_staging (
  run_id  bigint not null references sync_runs (id) on delete cascade,
  parte   int not null,
  dados   jsonb not null,            -- array de registros já validados e normalizados
  primary key (run_id, parte)
);

alter table sync_runs add column partes_total int;
alter table sync_runs add column partes_recebidas int not null default 0;

create index corretores_nome_trgm on corretores using gin (nome_normalizado gin_trgm_ops);
