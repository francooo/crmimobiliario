import { Hono } from "hono";
import { periodo } from "../../shared/periodo";
import { requireModule, type AppEnv } from "../auth";
import { sql } from "../db";
import { jsonFromDb, termoBusca } from "./util";

/** Marketing, Financeiro, Governança e Sincronização. Cada GET = 1 consulta com JSON pronto. */
export const admin = new Hono<AppEnv>();

// ─────────────────────────── Marketing ───────────────────────────
admin.get("/marketing", requireModule("marketing"), (c) => {
  const p = periodo(c.req.query("periodo"));
  return jsonFromDb(c, (db) =>
    db.query(
      `with camp as (
        select * from campanhas
        where (inicio is null and fim is null)
           or (coalesce(inicio, '-infinity'::date) < $2::date and coalesce(fim, 'infinity'::date) >= $1::date)),
      origens as (
        select coalesce(origem, 'Sem origem') as origem, count(*)::int as n,
               coalesce(sum(valor) filter (where tipo = 'Venda'), 0) as vgv
        from contratos where data_fechamento >= $1::date and data_fechamento < $2::date group by 1 order by 2 desc, 1),
      leads_origem as (
        select coalesce(origem, 'Sem origem') as origem, count(*)::int as n from leads
        where criado_em >= $1::date and criado_em < $2::date group by 1)
      select json_build_object(
        'periodo', json_build_object('label', $3::text),
        'kpis', (select json_build_object('investimento', coalesce(sum(custo), 0), 'leads', coalesce(sum(leads), 0)::int,
                 'fechados', coalesce(sum(fechados), 0)::int, 'campanhas', count(*)::int,
                 'semPeriodo', count(*) filter (where inicio is null and fim is null)::int) from camp),
        'origens', coalesce((select json_agg(json_build_object('origem', o.origem, 'contratos', o.n, 'vgv', o.vgv,
                   'leads', coalesce(l.n, 0))) from origens o left join leads_origem l using (origem)), '[]'::json),
        'campanhas', coalesce((select json_agg(json_build_object('nome', nome, 'canal', canal, 'leads', leads, 'custo', custo, 'cpl', cpl,
                   'fechados', fechados, 'inicio', to_char(inicio, 'YYYY-MM-DD'), 'fim', to_char(fim, 'YYYY-MM-DD'))
                   order by coalesce(fim, inicio) desc nulls last, nome) from camp), '[]'::json)
      )::text as body`,
      [p.inicio, p.fim, p.label],
    ),
  );
});

// ─────────────────────────── Financeiro ───────────────────────────
admin.get("/financeiro", requireModule("financeiro"), (c) => {
  const p = periodo(c.req.query("periodo"));
  const verVgv = c.get("user").role === "socio";
  const mesesEvolucao = Math.max(6, p.meses);
  return jsonFromDb(c, (db) =>
    db.query(
      `with cx as (select * from fluxo_caixa where data >= $1::date and data < $2::date),
      ct as (select * from contratos where data_fechamento >= $1::date and data_fechamento < $2::date),
      evol as (
        select to_char(m, 'YYYY-MM') as mes,
               (select coalesce(sum(valor), 0) from contratos where tipo = 'Venda' and date_trunc('month', data_fechamento) = m) as vgv,
               (select coalesce(sum(valor), 0) from contratos where tipo = 'Locação' and date_trunc('month', data_fechamento) = m) as alugueis,
               (select coalesce(sum(valor), 0) from fluxo_caixa where tipo = 'Entrada' and date_trunc('month', data) = m) as entradas,
               (select coalesce(sum(valor), 0) from fluxo_caixa where tipo = 'Saída' and date_trunc('month', data) = m) as saidas
        from generate_series(date_trunc('month', $2::date - 1) - make_interval(months => $4::int - 1), date_trunc('month', $2::date - 1), interval '1 month') m
        order by m desc)
      select json_build_object(
        'periodo', json_build_object('label', $3::text),
        'verVgv', $5::boolean,
        'caixa', (select json_build_object(
            'entradas', coalesce(sum(valor) filter (where tipo = 'Entrada'), 0),
            'saidas', coalesce(sum(valor) filter (where tipo = 'Saída'), 0),
            'lancamentos', count(*)::int) from cx),
        'contratos', (select json_build_object(
            'vgv', case when $5 then coalesce(sum(valor) filter (where tipo = 'Venda'), 0) end,
            'vendas', count(*) filter (where tipo = 'Venda')::int,
            'alugueis', coalesce(sum(valor) filter (where tipo = 'Locação'), 0),
            'locacoes', count(*) filter (where tipo = 'Locação')::int,
            'comissoes', coalesce(sum(comissao), 0)) from ct),
        'categorias', coalesce((select json_agg(x order by x.tipo, x.total desc) from (
            select categoria, tipo, sum(valor) as total, count(*)::int as n from cx group by 1, 2) x), '[]'::json),
        'evolucao', coalesce((select json_agg(json_build_object('mes', mes, 'vgv', case when $5 then vgv end, 'alugueis', alugueis,
            'entradas', entradas, 'saidas', saidas)) from evol), '[]'::json),
        'lancamentos', coalesce((select json_agg(l) from (
            select entry_id, to_char(data, 'YYYY-MM-DD') as data, tipo, categoria, descricao, valor, status, contract_id
            from cx order by data desc, entry_id desc limit 300) l), '[]'::json)
      )::text as body`,
      [p.inicio, p.fim, p.label, mesesEvolucao, verVgv],
    ),
  );
});

// ─────────────────────────── Governança ───────────────────────────
admin.get("/governanca", requireModule("governanca"), (c) => {
  const user = c.get("user");
  const verHistorico = user.role === "socio" || user.role === "admin";
  const q = c.req.query();
  const { texto } = termoBusca(q.q);
  const limite = q.todos === "1" ? 5000 : 200;
  const admins = (c.env.ADMIN_EMAILS ?? "").split(",").filter((e) => e.trim()).length;
  return jsonFromDb(c, (db) =>
    db.query(
      `select json_build_object(
        'perfis', coalesce((select json_object_agg(perfil, n) from (
            select coalesce(perfil, 'corretor') as perfil, count(*)::int as n from corretores
            where ativo and email is not null and email <> '' group by 1) x), '{}'::json),
        'admins', $1::int,
        'corretoresCadastrados', (select count(*)::int from corretores),
        'verHistorico', $2::boolean,
        'historico', case when $2 then coalesce((select json_agg(a) from (
            select id, to_char(em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as em, usuario, acao, registro, detalhe
            from audit_log
            where $3::text is null or lower(usuario || ' ' || acao || ' ' || coalesce(registro, '') || ' ' || coalesce(detalhe, '')) like '%' || $3 || '%'
            order by id desc limit ${limite}) a), '[]'::json) end
      )::text as body`,
      [admins, verHistorico, texto],
    ),
  );
});

// ─────────────────────────── Sincronização ───────────────────────────
admin.get("/sincronizacao", requireModule("sincronizacao"), (c) =>
  jsonFromDb(c, (db) =>
    db.query(
      `with ultimo as (
        select distinct on (planilha) * from sync_runs order by planilha, id desc),
      ultimo_ok as (
        select distinct on (planilha) planilha, concluido_em from sync_runs where status = 'ok' order by planilha, id desc)
      select json_build_object(
        'planilhas', (select json_agg(json_build_object(
            'planilha', p.planilha, 'url', f.url, 'aba', f.aba,
            'ultimaSync', to_char(f.ultima_sync at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'),
            'ultimoOk', to_char(o.concluido_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'),
            'status', u.status, 'erro', u.erro, 'avisos', u.avisos, 'registros', (
              select count(*)::int from (
                select 1 from corretores where p.planilha = 'corretores' union all select 1 from imoveis where p.planilha = 'imoveis'
                union all select 1 from agenciamentos where p.planilha = 'agenciamentos' union all select 1 from leads where p.planilha = 'leads'
                union all select 1 from atendimentos where p.planilha = 'atendimentos' union all select 1 from contratos where p.planilha = 'contratos'
                union all select 1 from fluxo_caixa where p.planilha = 'fluxo_caixa' union all select 1 from campanhas where p.planilha = 'campanhas') r))
            order by p.ord)
          from (values ('corretores', 1), ('imoveis', 2), ('agenciamentos', 3), ('leads', 4), ('atendimentos', 5),
                       ('contratos', 6), ('fluxo_caixa', 7), ('campanhas', 8)) as p(planilha, ord)
          left join sync_fontes f on f.planilha = p.planilha
          left join ultimo u on u.planilha = p.planilha
          left join ultimo_ok o on o.planilha = p.planilha),
        'avisos', coalesce((select json_agg(i order by i.planilha, i.linha) from (
            select s.planilha, s.linha, s.coluna, s.tipo, s.mensagem, s.chave from sync_issues s
            join ultimo u on u.id = s.run_id limit 300) i), '[]'::json),
        'pendencias', coalesce((select json_agg(x) from (select * from pendencias order by planilha, tipo, linha limit 300) x), '[]'::json),
        'pendenciasPorTipo', coalesce((select json_object_agg(tipo, n) from (select tipo, count(*)::int n from pendencias group by tipo) t), '{}'::json),
        'vinculos', coalesce((select json_agg(v) from (
            select id, tipo, origem_chave, alvo_chave, usuario, to_char(criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as em
            from vinculos_manuais order by id desc limit 50) v), '[]'::json),
        'execucoes', coalesce((select json_agg(r) from (
            select id, planilha, origem, status, linhas, inseridas, atualizadas, removidas, avisos, erro,
                   to_char(iniciado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as em
            from sync_runs order by id desc limit 40) r), '[]'::json),
        'sincronizarAgora', $1::boolean
      )::text as body`,
      [Boolean(c.env.APPS_SCRIPT_URL)],
    ),
  ),
);

const TIPOS_VINCULO = {
  atendimento_lead: { origem: "select 1 from atendimentos where activity_id = $2", alvo: "select 1 from leads where lead_id = $3" },
  contrato_lead: { origem: "select 1 from contratos where contract_id = $2", alvo: "select 1 from leads where lead_id = $3" },
  lead_imovel: {
    origem: "select 1 from leads where telefone = $2",
    alvo: "select 1 from imoveis where code = $3 union all select 1 from agenciamentos where codigo_imovel = $3",
  },
  contrato_imovel: {
    origem: "select 1 from contratos where contract_id = $2",
    alvo: "select 1 from imoveis where code = $3 union all select 1 from agenciamentos where codigo_imovel = $3",
  },
} as const;

/** Ligação manual (tela Sincronização): gravada e reaplicada em toda sincronização. */
admin.post("/vinculos", requireModule("sincronizacao"), async (c) => {
  let b: { tipo?: string; origem?: string; alvo?: string };
  try {
    b = await c.req.json();
  } catch {
    return c.json({ error: "Envio inválido" }, 400);
  }
  const def = TIPOS_VINCULO[b.tipo as keyof typeof TIPOS_VINCULO];
  const origem = String(b.origem ?? "").slice(0, 80);
  const alvo = String(b.alvo ?? "").slice(0, 80);
  if (!def || !origem || !alvo) return c.json({ error: "Informe tipo, registro e destino" }, 400);
  const db = sql(c.env);
  const user = c.get("user");
  const rows = (await db.query(
    `with ok as (select exists (${def.origem}) as origem_ok, exists (${def.alvo}) as alvo_ok),
     ins as (
       insert into vinculos_manuais (tipo, origem_chave, alvo_chave, usuario)
       select $1, $2, $3, $4 from ok where origem_ok and alvo_ok
       on conflict (tipo, origem_chave) do update set alvo_chave = excluded.alvo_chave, usuario = excluded.usuario, criado_em = now()
       returning id)
     select (select origem_ok from ok) as origem_ok, (select alvo_ok from ok) as alvo_ok, (select id from ins) as id`,
    [b.tipo, origem, alvo, user.email],
  )) as { origem_ok: boolean; alvo_ok: boolean; id: string | null }[];
  const r = rows[0]!;
  if (!r.origem_ok) return c.json({ error: "Registro de origem não encontrado" }, 404);
  if (!r.alvo_ok) return c.json({ error: "Lead ou imóvel de destino não encontrado" }, 404);
  await db.transaction([
    db`select recalcular_vinculos()`,
    db`insert into audit_log (usuario, acao, registro, detalhe) values (${user.email}, 'vinculo_manual', ${origem}, ${`${b.tipo} → ${alvo}`})`,
  ]);
  return c.json({ ok: true, id: Number(r.id) });
});

admin.delete("/vinculos/:id", requireModule("sincronizacao"), async (c) => {
  const id = Number(c.req.param("id"));
  const db = sql(c.env);
  const user = c.get("user");
  const rows = (await db`delete from vinculos_manuais where id = ${id} returning origem_chave, tipo, alvo_chave`) as {
    origem_chave: string;
    tipo: string;
    alvo_chave: string;
  }[];
  if (!rows.length) return c.json({ error: "Vínculo não encontrado" }, 404);
  await db.transaction([
    db`select recalcular_vinculos()`,
    db`insert into audit_log (usuario, acao, registro, detalhe)
       values (${user.email}, 'vinculo_removido', ${rows[0]!.origem_chave}, ${`${rows[0]!.tipo} → ${rows[0]!.alvo_chave}`})`,
  ]);
  return c.json({ ok: true });
});

/** Botão "Sincronizar agora": chama o Web App do Apps Script (doPost), que lê as planilhas e envia. */
admin.post("/sincronizacao/agora", requireModule("sincronizacao"), async (c) => {
  if (!c.env.APPS_SCRIPT_URL || !c.env.SYNC_SECRET) {
    return c.json({ error: "Publique o Apps Script como App da Web e configure APPS_SCRIPT_URL (veja a tela)." }, 501);
  }
  const user = c.get("user");
  await sql(c.env)`insert into audit_log (usuario, acao, detalhe) values (${user.email}, 'sincronizacao_solicitada', 'botão Sincronizar agora')`;
  try {
    const res = await fetch(c.env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segredo: c.env.SYNC_SECRET, forcar: false }),
      redirect: "follow",
    });
    const text = await res.text();
    if (!res.ok || !text.startsWith("{")) return c.json({ error: `Apps Script respondeu HTTP ${res.status}` }, 502);
    return c.body(text, 200, { "content-type": "application/json; charset=utf-8" });
  } catch (err) {
    console.error("sincronizar agora: falha", err);
    return c.json({ error: "Não foi possível falar com o Apps Script" }, 502);
  }
});
