-- Fase 6 — reenvio seguro: o Apps Script tenta de novo quando a Cloudflare recusa (5xx/1102).
-- Se a parte reenviada pertence a um run que JÁ foi concluído (a 1ª tentativa gravou, só a resposta
-- se perdeu), devolve o resultado gravado em vez de erro. Partes intermediárias já eram idempotentes.

create or replace function sync_reenvio(p_planilha text, p_run bigint) returns jsonb language sql stable as $$
  select case
    when r.status = 'ok' then jsonb_build_object('status', 'ok', 'runId', r.id, 'planilha', r.planilha, 'reenvio', true,
      'inseridas', r.inseridas, 'atualizadas', r.atualizadas, 'removidas', r.removidas, 'avisos', r.avisos)
    else jsonb_build_object('status', 'erro', 'runId', r.id, 'erro', coalesce(r.erro, 'run não está em execução'))
  end
  from sync_runs r where r.id = p_run and r.planilha = p_planilha
$$;

do $$
declare
  src text;
begin
  select pg_get_functiondef('sync_receber(text,int,int,bigint,text,text,boolean,jsonb,text[])'::regprocedure) into src;
  if position('sync_reenvio(' in src) = 0 then
    src := replace(src,
      $q$return jsonb_build_object('status', 'erro', 'runId', v_run, 'erro', 'run não está em execução');$q$,
      $q$return coalesce(sync_reenvio(p_planilha, v_run), jsonb_build_object('status', 'erro', 'runId', v_run, 'erro', 'run não encontrado'));$q$);
    if position('sync_reenvio(' in src) = 0 then
      raise exception 'trecho esperado não encontrado em sync_receber';
    end if;
    execute src;
  end if;
end $$;
