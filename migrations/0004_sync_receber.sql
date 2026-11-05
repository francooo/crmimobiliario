-- Fase 2 — recebimento da sincronização numa única chamada ao banco.
-- O Worker não interpreta o JSON (economia de CPU no plano grátis): repassa o corpo para cá.
-- Corpo: { "registros": [...], "avisos": [...], "fonte": {spreadsheetId,url,aba}, "erro": "..." (opcional) }
-- p_merge: comandos gerados por worker/sync/merge.ts (só na última parte), executados com $1 = run_id.

create or replace function sync_receber(
  p_planilha text, p_parte int, p_total int, p_run bigint, p_hash text,
  p_origem text, p_forcar boolean, p_body jsonb, p_merge text[]
) returns jsonb language plpgsql as $$
declare
  v_run bigint := p_run;
  v_hash text;
  v_partes int;
  v_novas int;
  v_atuais int;
  v_counts record;
  v_msg text;
  v_avisos int;
  m text;
  i int;
begin
  if p_parte = 1 then
    select ultimo_hash into v_hash from sync_fontes where planilha = p_planilha;
    if not p_forcar and v_hash is not null and v_hash = p_hash and p_body->>'erro' is null then
      return jsonb_build_object('status', 'ignorado', 'motivo', 'sem alterações desde a última sincronização');
    end if;
    -- runs abandonados no meio não ficam pendurados
    update sync_runs set status = 'erro', erro = 'interrompida', concluido_em = now()
     where planilha = p_planilha and status = 'executando' and iniciado_em < now() - interval '10 minutes';
    insert into sync_runs (planilha, origem, hash, partes_total)
    values (p_planilha, p_origem, p_hash, p_total) returning id into v_run;
  elsif not exists (select 1 from sync_runs where id = v_run and planilha = p_planilha and status = 'executando') then
    return jsonb_build_object('status', 'erro', 'runId', v_run, 'erro', 'run não está em execução');
  end if;

  -- Erro detectado no Apps Script (ex.: coluna obrigatória ausente): registra e encerra
  if p_body->>'erro' is not null then
    v_msg := left(p_body->>'erro', 1000);
    update sync_runs set status = 'erro', erro = v_msg, concluido_em = now() where id = v_run;
    insert into sync_issues (run_id, planilha, linha, coluna, tipo, mensagem, chave)
    select v_run, p_planilha, (a->>'linha')::int, a->>'coluna', a->>'tipo', a->>'mensagem', a->>'chave'
      from jsonb_array_elements(coalesce(p_body->'avisos', '[]')) a;
    insert into audit_log (usuario, acao, registro, detalhe) values ('apps-script', 'sincronizacao_erro', p_planilha, v_msg);
    return jsonb_build_object('status', 'erro', 'runId', v_run, 'erro', v_msg);
  end if;

  insert into sync_staging (run_id, parte, dados)
  values (v_run, p_parte, coalesce(p_body->'registros', '[]'))
  on conflict (run_id, parte) do update set dados = excluded.dados;

  insert into sync_issues (run_id, planilha, linha, coluna, tipo, mensagem, chave)
  select v_run, p_planilha, (a->>'linha')::int, a->>'coluna', a->>'tipo', a->>'mensagem', a->>'chave'
    from (select a from jsonb_array_elements(coalesce(p_body->'avisos', '[]')) a limit 1000) x;

  update sync_runs set partes_recebidas = partes_recebidas + 1 where id = v_run;

  if p_parte < p_total then
    return jsonb_build_object('status', 'parcial', 'runId', v_run, 'parte', p_parte, 'total', p_total);
  end if;

  -- Última parte: só aplica com todas as partes recebidas
  select count(*), coalesce(sum(jsonb_array_length(dados)), 0) into v_partes, v_novas from sync_staging where run_id = v_run;
  if v_partes <> p_total then
    v_msg := format('recebidas %s de %s partes', v_partes, p_total);
    update sync_runs set status = 'erro', erro = v_msg, concluido_em = now() where id = v_run;
    return jsonb_build_object('status', 'erro', 'runId', v_run, 'erro', 'Faltam partes: ' || v_msg);
  end if;

  -- Trava: planilha vazia ou aba errada não pode apagar o espelho inteiro
  execute format('select count(*) from %I', p_planilha) into v_atuais;
  if not p_forcar and v_atuais >= 10 and v_novas < v_atuais * 0.5 then
    v_msg := format('Bloqueado: a planilha trouxe %s registros e o sistema tem %s. Mais da metade seria removida. '
                    'Confira a planilha ou use "Forçar sincronização".', v_novas, v_atuais);
    update sync_runs set status = 'erro', erro = v_msg, concluido_em = now() where id = v_run;
    delete from sync_staging where run_id = v_run;
    insert into audit_log (usuario, acao, registro, detalhe) values ('apps-script', 'sincronizacao_bloqueada', p_planilha, v_msg);
    return jsonb_build_object('status', 'bloqueado', 'runId', v_run, 'erro', v_msg);
  end if;

  -- Espelho: o último comando devolve (inseridas, atualizadas, removidas)
  for i in 1 .. coalesce(array_length(p_merge, 1), 0) loop
    m := p_merge[i];
    if i = array_length(p_merge, 1) then
      execute m using v_run into v_counts;
    else
      execute m using v_run;
    end if;
  end loop;

  perform recalcular_vinculos();

  select count(*) into v_avisos from sync_issues where run_id = v_run;
  update sync_runs set status = 'ok', concluido_em = now(), linhas = v_novas, avisos = v_avisos,
         inseridas = v_counts.inseridas, atualizadas = v_counts.atualizadas, removidas = v_counts.removidas
   where id = v_run;

  insert into sync_fontes (planilha, spreadsheet_id, url, aba, ultimo_hash, ultima_sync, ultimo_run_id)
  values (p_planilha, p_body->'fonte'->>'spreadsheetId', p_body->'fonte'->>'url', p_body->'fonte'->>'aba', p_hash, now(), v_run)
  on conflict (planilha) do update set
    spreadsheet_id = coalesce(excluded.spreadsheet_id, sync_fontes.spreadsheet_id),
    url = coalesce(excluded.url, sync_fontes.url),
    aba = coalesce(excluded.aba, sync_fontes.aba),
    ultimo_hash = excluded.ultimo_hash, ultima_sync = excluded.ultima_sync, ultimo_run_id = excluded.ultimo_run_id;

  delete from sync_staging where run_id = v_run;

  insert into audit_log (usuario, acao, registro, detalhe)
  values ('apps-script', 'sincronizacao', p_planilha,
          format('%s novas, %s alteradas, %s removidas (%s)', v_counts.inseridas, v_counts.atualizadas, v_counts.removidas, p_origem));

  return jsonb_build_object('status', 'ok', 'runId', v_run, 'planilha', p_planilha,
    'inseridas', v_counts.inseridas, 'atualizadas', v_counts.atualizadas, 'removidas', v_counts.removidas, 'avisos', v_avisos);
end;
$$;
