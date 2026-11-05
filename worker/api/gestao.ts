import { Hono } from "hono";
import { periodo } from "../../shared/periodo";
import { requireModule, type AppEnv } from "../auth";
import { escopoCorretor, jsonFromDb, termoBusca } from "./util";

/** Agenciamentos (captação + roleta) e Corretores (desempenho, ranking, cadastro). */
export const gestao = new Hono<AppEnv>();

const META_ROLETA = 3; // captações de venda na semana anterior (REGRAS-DE-NEGOCIO §3)

/** Semana anterior (segunda a domingo) relativa a hoje em São Paulo */
function semanaAnterior(hoje: string) {
  const d = new Date(`${hoje}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  const inicioAtual = new Date(d.getTime() - dow * 86400_000);
  const ini = new Date(inicioAtual.getTime() - 7 * 86400_000);
  const fim = inicioAtual; // exclusivo
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { ini: iso(ini), fim: iso(fim) };
}

// ─────────────────────────── Agenciamentos ───────────────────────────
const POR_PAGINA = 30;

gestao.get("/agenciamentos", requireModule("agenciamentos"), (c) => {
  const q = c.req.query();
  const p = periodo(q.periodo);
  const sem = semanaAnterior(p.hoje);
  const { texto } = termoBusca(q.q);
  const pagina = Math.max(1, Math.min(500, Number(q.pagina) || 1));
  return jsonFromDb(c, (db) =>
    db.query(
      `with base as (
        select * from agenciamentos g
        where ($1::text is null or g.corretor = $1)),
      per as (select * from base where data_cadastro >= $2::date and data_cadastro < $3::date),
      ant as (select count(*)::int n from base where data_cadastro >= $4::date and data_cadastro < $2::date),
      hist as (
        select to_char(m, 'YYYY-MM') as mes,
               count(g.*) filter (where g.modalidade = 'Venda')::int as venda,
               count(g.*) filter (where g.modalidade = 'Locação')::int as locacao
        from generate_series(date_trunc('month', $5::date) - interval '5 months', date_trunc('month', $5::date), interval '1 month') m
        left join base g on date_trunc('month', g.data_cadastro) = m
        group by m order by m),
      roleta as (
        select nome, coalesce(n, 0)::int as n from (
          select c.nome from corretores c where c.ativo and (c.funcao is null or c.funcao ilike 'corretor%')
          union select g.corretor from agenciamentos g
            where g.corretor is not null and g.data_cadastro >= $6::date - 28 and g.data_cadastro < $7::date
        ) nomes
        left join (select corretor, count(*) as n from agenciamentos
                   where modalidade = 'Venda' and data_cadastro >= $6::date and data_cadastro < $7::date group by corretor) x
          on x.corretor = nomes.nome
        order by 2 desc, 1),
      tabela as (
        select * from per g
        where ($8::text is null or g.corretor = $8)
          and ($9::text is null or g.modalidade = $9)
          and ($10::text is null or coalesce(g.imovel_normalizado, '') like '%' || $10 || '%' or lower(coalesce(g.codigo_imovel, '')) like '%' || $10 || '%'
               or lower(g.agenciamento_id) like '%' || $10 || '%'
               or translate(lower(coalesce(g.bairro, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like '%' || $10 || '%')),
      pagina as (
        select agenciamento_id, codigo_imovel, to_char(data_cadastro, 'YYYY-MM-DD') as data, modalidade, corretor, agenciador,
               imovel, bairro, valor_anuncio, status, origem
        from tabela order by data_cadastro desc, agenciamento_id desc limit ${POR_PAGINA} offset $11)
      select json_build_object(
        'periodo', json_build_object('label', $12::text, 'meses', $13::int),
        'kpis', (select json_build_object(
            'total', count(*)::int,
            'venda', count(*) filter (where modalidade = 'Venda')::int,
            'locacao', count(*) filter (where modalidade = 'Locação')::int,
            'disponiveis', count(*) filter (where status = 'Disponível')::int,
            'anterior', (select n from ant)) from per),
        'historico', coalesce((select json_agg(h) from hist h), '[]'::json),
        'roleta', json_build_object('inicio', $6::text, 'fim', ($7::date - 1)::text, 'meta', ${META_ROLETA},
            'corretores', coalesce((select json_agg(r) from roleta r), '[]'::json)),
        'itens', coalesce((select json_agg(x) from pagina x), '[]'::json),
        'total', (select count(*)::int from tabela),
        'pagina', $11 / ${POR_PAGINA} + 1,
        'porPagina', ${POR_PAGINA},
        'corretores', coalesce((select json_agg(distinct corretor order by corretor) from base where corretor is not null), '[]'::json)
      )::text as body`,
      [
        escopoCorretor(c),
        p.inicio,
        p.fim,
        p.anteriorInicio,
        p.hoje,
        sem.ini,
        sem.fim,
        q.corretor || null,
        q.modalidade === "Venda" || q.modalidade === "Locação" ? q.modalidade : null,
        texto,
        (pagina - 1) * POR_PAGINA,
        p.label,
        p.meses,
      ],
    ),
  );
});

// ─────────────────────────── Corretores ───────────────────────────
gestao.get("/corretores", requireModule("corretores"), (c) => {
  const p = periodo(c.req.query("periodo"));
  const verValores = c.get("user").role === "socio"; // VGV e comissão consolidados: só Sócio (§1)
  return jsonFromDb(c, (db) =>
    db.query(
      `with ag as (
        select corretor as nome, count(*)::int as captacoes from agenciamentos
        where corretor is not null and data_cadastro >= $1::date and data_cadastro < $2::date group by corretor),
      ct as (
        select corretor as nome,
               count(*) filter (where tipo = 'Venda')::int as vendas,
               count(*) filter (where tipo = 'Locação')::int as locacoes,
               coalesce(sum(valor) filter (where tipo = 'Venda'), 0) as vgv,
               coalesce(sum(comissao), 0) as comissao
        from contratos where corretor is not null and data_fechamento >= $1::date and data_fechamento < $2::date group by corretor),
      ld as (
        select corretor as nome, count(*)::int as leads from leads
        where corretor is not null and criado_em >= $1::date and criado_em < $2::date group by corretor),
      nomes as (select nome from ag union select nome from ct union select nome from ld),
      total as (select coalesce(sum(vgv), 0) as vgv from ct),
      agentes as (
        select n.nome, cad.funcao, coalesce(ag.captacoes, 0) as captacoes, coalesce(ld.leads, 0) as leads,
               coalesce(ct.vendas, 0) as vendas, coalesce(ct.locacoes, 0) as locacoes,
               case when $3 then coalesce(ct.vgv, 0) end as vgv,
               case when $3 then coalesce(ct.comissao, 0) end as comissao,
               case when (select vgv from total) > 0 then round(coalesce(ct.vgv, 0) / (select vgv from total) * 100, 1) else 0 end as participacao
        from nomes n
        left join ag on ag.nome = n.nome left join ct on ct.nome = n.nome left join ld on ld.nome = n.nome
        left join corretores cad on lower(cad.nome) = lower(n.nome)),
      uso as (
        select nome, string_agg(planilha || ' (' || n || ')', ', ' order by planilha) as aparece, sum(n)::int as registros from (
          select corretor as nome, 'Agenciamentos' as planilha, count(*) as n from agenciamentos where corretor is not null group by 1
          union all select agenciador, 'Agenciamentos (agenciador)', count(*) from agenciamentos where agenciador is not null group by 1
          union all select corretor, 'Contratos', count(*) from contratos where corretor is not null group by 1
          union all select corretor, 'Leads', count(*) from leads where corretor is not null group by 1) u
        group by nome),
      cadastro as (
        select c.nome, c.funcao, c.perfil, c.ativo, (c.email is not null and c.email <> '') as acesso,
               coalesce(u.aparece, '—') as aparece,
               case when not c.ativo then 'Inativo'
                    when u.registros is null then 'Sem registros nas planilhas'
                    else 'Vinculado' end as situacao,
               null::text as sugestao
        from corretores c left join uso u on lower(u.nome) = lower(c.nome)
        union all
        select u.nome, null, null, null, false, u.aparece, 'Não cadastrado',
               (select c.nome from corretores c where similarity(c.nome_normalizado, lower(u.nome)) >= 0.45
                 order by similarity(c.nome_normalizado, lower(u.nome)) desc limit 1)
        from uso u where not exists (select 1 from corretores c where lower(c.nome) = lower(u.nome)))
      select json_build_object(
        'periodo', json_build_object('label', $4::text),
        'verValores', $3,
        'vgvTotal', case when $3 then (select vgv from total) end,
        'agentes', coalesce((select json_agg(a order by a.vgv desc nulls last, a.vendas + a.locacoes desc, a.captacoes desc, a.nome) from agentes a), '[]'::json),
        'cadastro', coalesce((select json_agg(x order by (x.situacao = 'Não cadastrado') desc, x.nome) from cadastro x), '[]'::json),
        'cadastroVazio', not exists (select 1 from corretores)
      )::text as body`,
      [p.inicio, p.fim, verValores, p.label],
    ),
  );
});
