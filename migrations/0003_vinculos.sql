-- Fase 2 — vínculos gerados pelo sistema e pendências em tempo real

alter table leads add column imovel_normalizado text;
create index leads_imovel_norm_idx on leads (imovel_normalizado);
create index contratos_imovel_norm_idx on contratos (imovel_normalizado);
create index atendimentos_cliente_norm_idx on atendimentos (cliente_normalizado);
create index contratos_cliente_norm_idx on contratos (cliente_normalizado);

-- Recalcula todos os vínculos (barato: tabelas pequenas, tudo em SQL).
-- Ordem de prioridade: vínculo manual → código informado na planilha → nome único → desempate por corretor.
create or replace function recalcular_vinculos() returns void language plpgsql as $$
begin
  -- atendimento → lead
  update atendimentos a set lead_id = v.lead_id
  from (
    select a2.activity_id,
      coalesce(
        (select m.alvo_chave from vinculos_manuais m where m.tipo = 'atendimento_lead' and m.origem_chave = a2.activity_id),
        (select l.lead_id from leads l where a2.lead_id_planilha is not null
           and (l.lead_id_planilha = a2.lead_id_planilha or l.lead_id = a2.lead_id_planilha) limit 1),
        (select min(l.lead_id) from leads l where l.cliente_normalizado = a2.cliente_normalizado having count(*) = 1),
        (select min(l.lead_id) from leads l where l.cliente_normalizado = a2.cliente_normalizado
           and lower(l.corretor) = lower(a2.corretor) having count(*) = 1)
      ) as lead_id
    from atendimentos a2
  ) v
  where a.activity_id = v.activity_id and a.lead_id is distinct from v.lead_id;

  -- contrato → lead
  update contratos c set lead_id = v.lead_id
  from (
    select c2.contract_id,
      coalesce(
        (select m.alvo_chave from vinculos_manuais m where m.tipo = 'contrato_lead' and m.origem_chave = c2.contract_id),
        (select l.lead_id from leads l where c2.lead_id_planilha is not null
           and (l.lead_id_planilha = c2.lead_id_planilha or l.lead_id = c2.lead_id_planilha) limit 1),
        (select min(l.lead_id) from leads l where l.cliente_normalizado = c2.cliente_normalizado having count(*) = 1),
        (select min(l.lead_id) from leads l where l.cliente_normalizado = c2.cliente_normalizado
           and lower(l.corretor) = lower(c2.corretor) having count(*) = 1)
      ) as lead_id
    from contratos c2
  ) v
  where c.contract_id = v.contract_id and c.lead_id is distinct from v.lead_id;

  -- lead → imóvel
  update leads l set codigo_imovel = v.codigo
  from (
    select l2.telefone,
      coalesce(
        (select m.alvo_chave from vinculos_manuais m where m.tipo = 'lead_imovel' and m.origem_chave = l2.telefone),
        (select l2.codigo_imovel_planilha where l2.codigo_imovel_planilha is not null and (
           exists (select 1 from imoveis i where i.code = l2.codigo_imovel_planilha) or
           exists (select 1 from agenciamentos g where g.codigo_imovel = l2.codigo_imovel_planilha))),
        (select min(x.code) from (
           select i.code from imoveis i where i.nome_normalizado = l2.imovel_normalizado
           union select g.codigo_imovel from agenciamentos g where g.imovel_normalizado = l2.imovel_normalizado and g.codigo_imovel is not null
         ) x having count(*) = 1)
      ) as codigo
    from leads l2
  ) v
  where l.telefone = v.telefone and l.codigo_imovel is distinct from v.codigo;

  -- contrato → imóvel
  update contratos c set codigo_imovel = v.codigo
  from (
    select c2.contract_id,
      coalesce(
        (select m.alvo_chave from vinculos_manuais m where m.tipo = 'contrato_imovel' and m.origem_chave = c2.contract_id),
        (select c2.codigo_imovel_planilha where c2.codigo_imovel_planilha is not null and (
           exists (select 1 from imoveis i where i.code = c2.codigo_imovel_planilha) or
           exists (select 1 from agenciamentos g where g.codigo_imovel = c2.codigo_imovel_planilha))),
        (select min(x.code) from (
           select i.code from imoveis i where i.nome_normalizado = c2.imovel_normalizado
           union select g.codigo_imovel from agenciamentos g where g.imovel_normalizado = c2.imovel_normalizado and g.codigo_imovel is not null
         ) x having count(*) = 1)
      ) as codigo
    from contratos c2
  ) v
  where c.contract_id = v.contract_id and c.codigo_imovel is distinct from v.codigo;
end;
$$;

-- Pendências mostradas na tela Sincronização (sempre atuais, sem depender de qual planilha sincronizou)
create or replace view pendencias as
with cad as (select nome, nome_normalizado from corretores),
nomes as (
  select 'agenciamentos'::text as planilha, corretor as nome, min(sheet_row) as linha, count(*)::int as registros from agenciamentos where corretor is not null group by corretor
  union all select 'agenciamentos', agenciador, min(sheet_row), count(*)::int from agenciamentos where agenciador is not null group by agenciador
  union all select 'leads', corretor, min(sheet_row), count(*)::int from leads where corretor is not null group by corretor
  union all select 'atendimentos', corretor, min(sheet_row), count(*)::int from atendimentos where corretor is not null group by corretor
  union all select 'contratos', corretor, min(sheet_row), count(*)::int from contratos where corretor is not null group by corretor
)
select 'atendimentos'::text as planilha, a.sheet_row as linha, a.activity_id as chave, 'sem_lead'::text as tipo,
       'Atendimento sem lead vinculado (cliente "' || coalesce(a.cliente, '?') || '")' as mensagem, null::text as sugestao
  from atendimentos a where a.lead_id is null
union all
select 'contratos', c.sheet_row, c.contract_id, 'sem_lead',
       'Contrato sem lead vinculado (cliente "' || coalesce(c.cliente, '?') || '")', null
  from contratos c where c.lead_id is null
union all
select 'leads', l.sheet_row, l.telefone, 'sem_imovel',
       'Lead sem imóvel vinculado ("' || l.imovel || '")', null
  from leads l where l.codigo_imovel is null and l.imovel is not null
union all
select 'contratos', c.sheet_row, c.contract_id, 'sem_imovel',
       'Contrato sem imóvel vinculado ("' || c.imovel || '")', null
  from contratos c where c.codigo_imovel is null and c.imovel is not null
union all
select n.planilha, n.linha, n.nome, 'corretor_nao_cadastrado',
       'Nome "' || n.nome || '" não está na planilha Corretores (' || n.registros || ' registro(s))',
       (select c.nome from cad c
         where similarity(c.nome_normalizado, lower(n.nome)) >= 0.45
         order by similarity(c.nome_normalizado, lower(n.nome)) desc limit 1)
  from nomes n
 where exists (select 1 from cad)
   and not exists (select 1 from cad c where lower(c.nome) = lower(n.nome));
