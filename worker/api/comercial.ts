import { Hono } from "hono";
import { periodo } from "../../shared/periodo";
import { requireModule, type AppEnv } from "../auth";
import { escopoCorretor, jsonFromDb, termoBusca } from "./util";

/**
 * Telas comerciais: Dashboard, Leads, Funil e Detalhe do lead.
 * Cada rota = 1 consulta que devolve o JSON pronto (json_build_object), para caber nos 10 ms de CPU.
 */
export const comercial = new Hono<AppEnv>();

const ETAPAS_ABERTAS = "('Novo lead','Contato inicial','Visita','Proposta')";

// Filtro de texto dos leads (cliente, imóvel, bairro, telefone, código do lead/imóvel)
const BUSCA_LEAD = `(
  $Q::text is null
  or l.cliente_normalizado like '%' || $Q || '%'
  or coalesce(l.imovel_normalizado, '') like '%' || $Q || '%'
  or translate(lower(coalesce(l.bairro, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like '%' || $Q || '%'
  or lower(l.lead_id) = $Q or lower(coalesce(l.codigo_imovel, '')) = $Q
  or ($D::text is not null and l.telefone like '%' || $D || '%')
)`;

// ─────────────────────────── Dashboard ───────────────────────────
comercial.get("/dashboard", requireModule("dashboard"), (c) => {
  const p = periodo(c.req.query("periodo"));
  return jsonFromDb(c, (db) =>
    db.query(
      `with p as (select $1::date ini, $2::date fim, $3::date pini, $4::date pfim, $5::date hoje),
      ag as (
        select count(*) filter (where modalidade = 'Venda')::int as venda,
               count(*) filter (where modalidade = 'Locação')::int as locacao
        from agenciamentos, p where data_cadastro >= p.ini and data_cadastro < p.fim),
      agp as (select count(*)::int as n from agenciamentos, p where data_cadastro >= p.pini and data_cadastro < p.pfim),
      ct as (
        select count(*) filter (where tipo = 'Venda')::int as vendas,
               count(*) filter (where tipo = 'Locação')::int as locacoes,
               coalesce(sum(valor) filter (where tipo = 'Venda'), 0) as vgv,
               coalesce(sum(comissao), 0) as comissao
        from contratos, p where data_fechamento >= p.ini and data_fechamento < p.fim),
      ctp as (
        select count(*)::int as contratos, coalesce(sum(valor) filter (where tipo = 'Venda'), 0) as vgv,
               coalesce(sum(comissao), 0) as comissao
        from contratos, p where data_fechamento >= p.pini and data_fechamento < p.pfim),
      funil as (
        select etapa, count(*)::int as n from leads, p
        where criado_em >= p.ini and criado_em < p.fim group by etapa),
      origens as (
        select coalesce(origem, 'Sem origem') as origem, count(*)::int as n from contratos, p
        where data_fechamento >= p.ini and data_fechamento < p.fim group by 1 order by 2 desc, 1),
      resp as (
        select round(avg(tempo_resposta_min)::numeric, 1) as media, count(tempo_resposta_min)::int as n
        from atendimentos, p where data >= p.ini and data < p.fim),
      resp_sem as (
        select to_char(date_trunc('week', data), 'YYYY-MM-DD') as semana, round(avg(tempo_resposta_min)::numeric, 1) as media
        from atendimentos, p where data >= p.ini and data < p.fim and tempo_resposta_min is not null
        group by 1 order by 1 desc limit 6),
      recentes as (
        select lead_id, cliente, imovel, bairro, corretor, etapa,
               to_char(coalesce(atualizado_em, criado_em), 'YYYY-MM-DD HH24:MI') as ultima
        from leads order by coalesce(atualizado_em, criado_em) desc nulls last limit 6),
      vgv_cor as (
        select coalesce(corretor, 'Sem corretor') as corretor, sum(valor) as vgv, count(*)::int as vendas
        from contratos, p where tipo = 'Venda' and data_fechamento >= p.ini and data_fechamento < p.fim
        group by 1 order by 2 desc limit 5),
      vencidos as (
        select lead_id, cliente, imovel, corretor, to_char(proximo_contato, 'YYYY-MM-DD') as proximo
        from leads, p where proximo_contato < p.hoje and etapa in ${ETAPAS_ABERTAS}
        order by proximo_contato limit 5),
      vencidos_n as (select count(*)::int as n from leads, p where proximo_contato < p.hoje and etapa in ${ETAPAS_ABERTAS})
      select json_build_object(
        'periodo', json_build_object('label', $6::text, 'inicio', $1::text, 'fim', $2::text),
        'captacoes', (select json_build_object('venda', venda, 'locacao', locacao, 'total', venda + locacao) from ag),
        'captacoesAnterior', (select n from agp),
        'contratos', (select row_to_json(ct) from ct),
        'contratosAnterior', (select row_to_json(ctp) from ctp),
        'funil', coalesce((select json_object_agg(etapa, n) from funil), '{}'::json),
        'origens', coalesce((select json_agg(o) from origens o), '[]'::json),
        'resposta', (select row_to_json(resp) from resp),
        'respostaSemanas', coalesce((select json_agg(s order by s.semana) from resp_sem s), '[]'::json),
        'recentes', coalesce((select json_agg(r) from recentes r), '[]'::json),
        'vgvCorretor', coalesce((select json_agg(v) from vgv_cor v), '[]'::json),
        'vencidos', coalesce((select json_agg(v) from vencidos v), '[]'::json),
        'vencidosTotal', (select n from vencidos_n)
      )::text as body`,
      [p.inicio, p.fim, p.anteriorInicio, p.anteriorFim, p.hoje, p.label],
    ),
  );
});

// ─────────────────────────── Leads (lista) ───────────────────────────
const POR_PAGINA = 25;

comercial.get("/leads", requireModule("leads"), (c) => {
  const q = c.req.query();
  const { texto, digitos } = termoBusca(q.q);
  const pagina = Math.max(1, Math.min(1000, Number(q.pagina) || 1));
  const limite = q.todos === "1" ? 2000 : POR_PAGINA; // exportação CSV
  const etapa = q.etapa && q.etapa !== "Todas" ? q.etapa : null;
  const hoje = periodo("mes").hoje;
  const where = `($1::text is null or l.corretor = $1) and ($2::text is null or l.corretor = $2)
                 and ($3::text is null or l.origem = $3) and ${BUSCA_LEAD.replace(/\$Q/g, "$4").replace(/\$D/g, "$5")}
                 and ($9::boolean is not true or (l.proximo_contato < $8::date and l.etapa in ${ETAPAS_ABERTAS}))`;
  return jsonFromDb(c, (db) =>
    db.query(
      `with base as (select l.* from leads l where ${where}),
      filtrados as (select * from base where $6::text is null or etapa = $6),
      pagina as (
        select lead_id, cliente, telefone, imovel, bairro, origem, corretor, etapa,
               to_char(proximo_contato, 'YYYY-MM-DD') as proximo,
               (proximo_contato < $8::date and etapa in ${ETAPAS_ABERTAS}) as vencido,
               to_char(coalesce(atualizado_em, criado_em), 'YYYY-MM-DD HH24:MI') as ultima
        from filtrados order by coalesce(atualizado_em, criado_em) desc nulls last, lead_id
        limit ${limite} offset $7)
      select json_build_object(
        'itens', coalesce((select json_agg(x) from pagina x), '[]'::json),
        'total', (select count(*)::int from filtrados),
        'pagina', $7 / ${POR_PAGINA} + 1,
        'porPagina', ${POR_PAGINA},
        'porEtapa', coalesce((select json_object_agg(etapa, n) from (select etapa, count(*)::int n from base group by etapa) e), '{}'::json),
        'totalBase', (select count(*)::int from base),
        'corretores', coalesce((select json_agg(distinct corretor order by corretor) from leads l
                       where corretor is not null and ($1::text is null or l.corretor = $1)), '[]'::json),
        'origens', coalesce((select json_agg(distinct origem order by origem) from leads where origem is not null), '[]'::json)
      )::text as body`,
      [escopoCorretor(c), q.corretor || null, q.origem || null, texto, digitos, etapa, q.todos === "1" ? 0 : (pagina - 1) * POR_PAGINA, hoje, q.vencidos === "1"],
    ),
  );
});

// ─────────────────────────── Funil (kanban) ───────────────────────────
comercial.get("/funil", requireModule("funil"), (c) => {
  const q = c.req.query();
  const { texto, digitos } = termoBusca(q.q);
  const hoje = periodo("mes").hoje;
  return jsonFromDb(c, (db) =>
    db.query(
      `with base as (
        select l.lead_id, l.cliente, l.imovel, l.bairro, l.corretor, l.etapa,
               to_char(coalesce(l.atualizado_em, l.criado_em), 'YYYY-MM-DD') as ultima,
               (l.proximo_contato < $5::date) as vencido,
               row_number() over (partition by l.etapa order by coalesce(l.atualizado_em, l.criado_em) desc nulls last) as rn,
               count(*) over (partition by l.etapa)::int as total_etapa
        from leads l
        where l.etapa in ${ETAPAS_ABERTAS.replace(")", ",'Fechado')")}
          and ($1::text is null or l.corretor = $1) and ($2::text is null or l.corretor = $2)
          and ${BUSCA_LEAD.replace(/\$Q/g, "$3").replace(/\$D/g, "$4")})
      select json_build_object(
        'colunas', coalesce((select json_object_agg(etapa, json_build_object('total', total, 'cards', cards)) from (
            select etapa, max(total_etapa) as total,
                   json_agg(json_build_object('lead_id', lead_id, 'cliente', cliente, 'imovel', imovel, 'bairro', bairro,
                            'corretor', corretor, 'ultima', ultima, 'vencido', vencido) order by rn) as cards
            from base where rn <= 60 group by etapa) x), '{}'::json),
        'corretores', coalesce((select json_agg(distinct corretor order by corretor) from leads l
                       where corretor is not null and ($1::text is null or l.corretor = $1)), '[]'::json)
      )::text as body`,
      [escopoCorretor(c), q.corretor || null, texto, digitos, hoje],
    ),
  );
});

// ─────────────────────────── Detalhe do lead ───────────────────────────
comercial.get("/leads/:leadId", requireModule("leads"), (c) => {
  const leadId = c.req.param("leadId").slice(0, 40);
  const hoje = periodo("mes").hoje;
  return jsonFromDb(
    c,
    (db) =>
      db.query(
        `with l as (select * from leads where lead_id = $1 and ($2::text is null or corretor = $2)),
        ats as (
          select activity_id, to_char(data, 'YYYY-MM-DD HH24:MI') as data, etapa, descricao, corretor,
                 to_char(proximo_contato, 'YYYY-MM-DD') as proximo, tempo_resposta_min
          from atendimentos where lead_id = (select lead_id from l) order by data desc nulls last),
        im as (
          select i.code, i.nome, i.bairro, i.tipo, i.modalidade, i.preco, i.status, 'imovel' as fonte
            from imoveis i where i.code = (select codigo_imovel from l)
          union all
          select g.codigo_imovel, g.imovel, g.bairro, null, g.modalidade, g.valor_anuncio, g.status, 'agenciamento'
            from agenciamentos g where g.codigo_imovel = (select codigo_imovel from l)
              and not exists (select 1 from imoveis i where i.code = (select codigo_imovel from l))
          limit 1),
        outros as (select count(*)::int as n from leads x where x.codigo_imovel is not null and x.codigo_imovel = (select codigo_imovel from l))
        select case when not exists (select 1 from l) then null else json_build_object(
          'lead', (select json_build_object(
              'lead_id', lead_id, 'cliente', cliente, 'telefone', telefone, 'imovel', imovel, 'codigo_imovel', codigo_imovel,
              'bairro', bairro, 'corretor', corretor, 'origem', origem, 'etapa', etapa, 'observacoes', observacoes,
              'criado_em', to_char(criado_em, 'YYYY-MM-DD HH24:MI'), 'atualizado_em', to_char(atualizado_em, 'YYYY-MM-DD HH24:MI'),
              'proximo', to_char(proximo_contato, 'YYYY-MM-DD'),
              'vencido', (proximo_contato < $3::date and etapa in ${ETAPAS_ABERTAS}),
              'sheet_row', sheet_row) from l),
          'atendimentos', coalesce((select json_agg(a) from ats a), '[]'::json),
          'primeiraResposta', (select tempo_resposta_min from atendimentos where lead_id = (select lead_id from l)
                               and tempo_resposta_min is not null order by data asc limit 1),
          'imovel', (select row_to_json(im) from im),
          'leadsNoImovel', (select n from outros)
        ) end::text as body`,
        [leadId, escopoCorretor(c), hoje],
      ),
    "Lead não encontrado",
  );
});

// ─────────────────────────── Fontes (links "Abrir na planilha") ───────────────────────────
comercial.get("/fontes", (c) =>
  jsonFromDb(c, (db) =>
    db`select coalesce(json_object_agg(planilha, json_build_object('url', url, 'ultimaSync', ultima_sync)), '{}'::json)::text as body
       from sync_fontes where url like 'https://%'`,
  ),
);
