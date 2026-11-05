import { Hono } from "hono";
import { can } from "../../shared/permissions";
import { requireModule, type AppEnv } from "../auth";
import { sql } from "../db";
import { jsonFromDb, termoBusca } from "./util";

/**
 * Imóveis (carteira IMV- + captações PORT- dos agenciamentos) e fotos em bytea no Neon.
 * As fotos chegam já reduzidas pelo navegador (WebP) e em base64: o Worker só repassa ao banco.
 */
export const imoveis = new Hono<AppEnv>();

export const FOTO = {
  maxBytes: 300_000, // imagem principal (~1280 px)
  maxMiniBytes: 60_000, // miniatura (~400 px)
  porImovel: 15,
  tetoTotal: 700 * 1024 * 1024, // 700 MB — protege o 1 GB do Neon Free
};

const POR_PAGINA = 24;

// Catálogo: imóveis da carteira + captações do portal que não estão na carteira
const CATALOGO = `
  cat as (
    select i.code, i.nome, i.nome_normalizado, i.bairro, i.tipo,
           coalesce(i.modalidade, case when i.preco < 10000 then 'Locação' else 'Venda' end) as modalidade,
           i.preco, i.status, i.proprietario, null::text as corretor, null::text as agenciador, null::date as captado_em,
           'carteira'::text as fonte
    from imoveis i
    union all
    (select distinct on (g.codigo_imovel) g.codigo_imovel, g.imovel, g.imovel_normalizado, g.bairro, null, g.modalidade,
           g.valor_anuncio, g.status, null, g.corretor, g.agenciador, g.data_cadastro, 'agenciamento'
    from agenciamentos g
    where g.codigo_imovel is not null and not exists (select 1 from imoveis i where i.code = g.codigo_imovel)
    order by g.codigo_imovel, g.data_cadastro desc)
  )`;

// ─────────────────────────── lista ───────────────────────────
imoveis.get("/imoveis", requireModule("imoveis"), (c) => {
  const q = c.req.query();
  const { texto } = termoBusca(q.q);
  const pagina = Math.max(1, Math.min(500, Number(q.pagina) || 1));
  const situacao = ["ativos", "Disponível", "Em negociação", "fechados", "todos"].includes(q.situacao ?? "") ? q.situacao! : "ativos";
  return jsonFromDb(c, (db) =>
    db.query(
      `with ${CATALOGO},
      filtro as (
        select * from cat
        where ($1::text is null or modalidade = $1)
          and ($2::text is null or nome_normalizado like '%' || $2 || '%' or lower(code) like '%' || $2 || '%'
               or translate(lower(coalesce(bairro, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') like '%' || $2 || '%')),
      sit as (
        select * from filtro where case $3
          when 'ativos' then coalesce(status, 'Disponível') in ('Disponível', 'Em negociação')
          when 'fechados' then status in ('Vendido', 'Locado')
          when 'todos' then true
          else status = $3 end),
      pagina as (
        select s.code, s.nome, s.bairro, s.tipo, s.modalidade, s.preco, s.status, s.proprietario, s.corretor, s.agenciador,
               to_char(s.captado_em, 'YYYY-MM-DD') as captado_em, s.fonte,
               (select count(*)::int from leads l where l.codigo_imovel = s.code) as leads,
               (select count(*)::int from imovel_fotos f where f.imovel_code = s.code) as fotos,
               (select json_build_object('id', f.id, 'hash', f.hash) from imovel_fotos f where f.imovel_code = s.code
                  order by f.capa desc, f.ordem, f.id limit 1) as capa
        from sit s
        order by (s.status = 'Disponível') desc nulls last, s.captado_em desc nulls first, s.code
        limit ${POR_PAGINA} offset $4)
      select json_build_object(
        'itens', coalesce((select json_agg(p) from pagina p), '[]'::json),
        'total', (select count(*)::int from sit),
        'pagina', $4 / ${POR_PAGINA} + 1,
        'porPagina', ${POR_PAGINA},
        'porSituacao', json_build_object(
          'ativos', (select count(*)::int from filtro where coalesce(status, 'Disponível') in ('Disponível', 'Em negociação')),
          'Disponível', (select count(*)::int from filtro where coalesce(status, 'Disponível') = 'Disponível'),
          'Em negociação', (select count(*)::int from filtro where status = 'Em negociação'),
          'fechados', (select count(*)::int from filtro where status in ('Vendido', 'Locado')),
          'todos', (select count(*)::int from filtro))
      )::text as body`,
      [q.modalidade === "Venda" || q.modalidade === "Locação" ? q.modalidade : null, texto, situacao, (pagina - 1) * POR_PAGINA],
    ),
  );
});

// ─────────────────────────── detalhe ───────────────────────────
imoveis.get("/imoveis/:code", requireModule("imoveis"), (c) => {
  const code = c.req.param("code").slice(0, 60);
  return jsonFromDb(
    c,
    (db) =>
      db.query(
        `with ${CATALOGO},
        im as (select * from cat where code = $1 limit 1)
        select case when not exists (select 1 from im) then null else json_build_object(
          'imovel', (select json_build_object('code', code, 'nome', nome, 'bairro', bairro, 'tipo', tipo, 'modalidade', modalidade,
                     'preco', preco, 'status', status, 'proprietario', proprietario, 'corretor', corretor, 'agenciador', agenciador,
                     'captado_em', to_char(captado_em, 'YYYY-MM-DD'), 'fonte', fonte) from im),
          'fotos', coalesce((select json_agg(json_build_object('id', id, 'hash', hash, 'capa', capa, 'tamanho', tamanho,
                     'criado_por', criado_por, 'criado_em', to_char(criado_em at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI'))
                     order by capa desc, ordem, id) from imovel_fotos where imovel_code = $1), '[]'::json),
          'leads', coalesce((select json_agg(json_build_object('lead_id', lead_id, 'cliente', cliente, 'etapa', etapa, 'corretor', corretor)
                     order by coalesce(atualizado_em, criado_em) desc) from leads where codigo_imovel = $1
                     and ($2::text is null or corretor = $2)), '[]'::json),
          'contratos', coalesce((select json_agg(json_build_object('contract_id', contract_id, 'tipo', tipo, 'valor', valor,
                     'data', to_char(data_fechamento, 'YYYY-MM-DD'), 'cliente', cliente, 'corretor', corretor) order by data_fechamento desc)
                     from contratos where codigo_imovel = $1 and $3::boolean), '[]'::json),
          'espaco', json_build_object('usado', (select coalesce(sum(tamanho), 0) from imovel_fotos), 'teto', ${FOTO.tetoTotal},
                     'porImovel', ${FOTO.porImovel})
        ) end::text as body`,
        [code, c.get("user").role === "corretor" ? c.get("user").nome : null, c.get("user").role !== "corretor"],
      ),
    "Imóvel não encontrado",
  );
});

// ─────────────────────────── fotos ───────────────────────────
const WEBP_B64 = /^UklGR[A-Za-z0-9+/]{6}XRUJQ/; // "RIFF????WEBP" em base64
const JPEG_B64 = /^\/9j\//; // FF D8 FF — Safari não gera WebP no canvas, então aceitamos JPEG
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const b64Bytes = (s: string) => Math.floor((s.length * 3) / 4) - (s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0);

imoveis.post("/imoveis/:code/fotos", requireModule("imoveis"), async (c) => {
  const user = c.get("user");
  if (!can(user.role, "enviar_fotos")) return c.json({ error: "Seu perfil não pode enviar fotos" }, 403);
  const code = c.req.param("code").slice(0, 60);
  let body: { imagem?: string; miniatura?: string; hash?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Envio inválido" }, 400);
  }
  const { imagem = "", miniatura = "", hash = "" } = body;
  const okFormato = (s: string) => (WEBP_B64.test(s) || JPEG_B64.test(s)) && B64.test(s.slice(-8));
  if (!okFormato(imagem) || !okFormato(miniatura) || !/^[a-f0-9]{16,64}$/.test(hash)) {
    return c.json({ error: "Formato inválido: a foto deve ser convertida (WebP ou JPEG) pelo navegador" }, 400);
  }
  const tamImg = b64Bytes(imagem);
  const tamMini = b64Bytes(miniatura);
  if (tamImg > FOTO.maxBytes || tamMini > FOTO.maxMiniBytes) {
    return c.json({ error: `Foto grande demais (máximo ${Math.round(FOTO.maxBytes / 1000)} KB após a compressão)` }, 413);
  }
  const tamanho = tamImg + tamMini;

  const rows = (await sql(c.env).query(
    `with existe as (
        select 1 from imoveis where code = $1
        union all select 1 from agenciamentos where codigo_imovel = $1 limit 1),
      lim as (
        select (select count(*) from imovel_fotos where imovel_code = $1) as n,
               (select coalesce(sum(tamanho), 0) from imovel_fotos) as usado),
      ins as (
        insert into imovel_fotos (imovel_code, hash, ordem, capa, tamanho, imagem, miniatura, criado_por)
        select $1, $2, (select n from lim), (select n from lim) = 0, $3::int, decode($4, 'base64'), decode($5, 'base64'), $6
        where exists (select 1 from existe) and (select n from lim) < ${FOTO.porImovel}
          and (select usado from lim) + $3::int <= ${FOTO.tetoTotal}
        returning id, hash, capa)
      select json_build_object(
        'foto', (select row_to_json(ins) from ins),
        'existe', exists (select 1 from existe),
        'n', (select n from lim), 'usado', (select usado from lim))::text as body`,
    [code, hash.slice(0, 64), tamanho, imagem, miniatura, user.email],
  )) as { body: string }[];
  const r = JSON.parse(rows[0]!.body) as { foto: { id: number } | null; existe: boolean; n: number; usado: number };
  if (!r.foto) {
    if (!r.existe) return c.json({ error: "Imóvel não encontrado" }, 404);
    if (r.n >= FOTO.porImovel) return c.json({ error: `Limite de ${FOTO.porImovel} fotos por imóvel atingido` }, 409);
    return c.json({ error: "Espaço para fotos esgotado (700 MB). Exclua fotos antigas para liberar." }, 507);
  }
  await sql(c.env)`insert into audit_log (usuario, acao, registro, detalhe)
                   values (${user.email}, 'foto_enviada', ${code}, ${`${Math.round(tamanho / 1000)} KB`})`;
  return c.json(r.foto, 201);
});

/** Serve a foto (ou miniatura). URL com hash → conteúdo nunca muda → cache de 1 ano no navegador. */
imoveis.get("/fotos/:id/:arquivo", async (c) => {
  const id = Number(c.req.param("id"));
  const m = c.req.param("arquivo").match(/^([a-f0-9]{16,64})(-mini)?\.webp$/);
  if (!Number.isInteger(id) || !m) return c.json({ error: "Foto não encontrada" }, 404);
  const mini = Boolean(m[2]);
  const rows = (await sql(c.env).query(
    `select encode(${mini ? "miniatura" : "imagem"}, 'base64') as b64 from imovel_fotos where id = $1 and hash = $2`,
    [id, m[1]],
  )) as { b64: string }[];
  const b64 = rows[0]?.b64;
  if (!b64) return c.json({ error: "Foto não encontrada" }, 404);
  const clean = b64.replace(/\n/g, ""); // encode() quebra linhas a cada 76 caracteres
  const fromBase64 = (Uint8Array as unknown as { fromBase64?: (s: string) => Uint8Array }).fromBase64;
  const bytes = fromBase64 ? fromBase64(clean) : Uint8Array.from(atob(clean), (ch) => ch.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "content-type": bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : "image/webp",
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
});

imoveis.delete("/fotos/:id", async (c) => {
  const user = c.get("user");
  if (!can(user.role, "enviar_fotos")) return c.json({ error: "Seu perfil não pode excluir fotos" }, 403);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Foto não encontrada" }, 404);
  // Corretor só exclui as fotos que ele mesmo enviou; Sócio e Gerente excluem qualquer uma
  const rows = (await sql(c.env).query(
    `with del as (
        delete from imovel_fotos where id = $1 and ($2::text is null or criado_por = $2)
        returning imovel_code, capa),
      nova_capa as (
        update imovel_fotos set capa = true
        where id = (select f.id from imovel_fotos f, del where f.imovel_code = del.imovel_code and del.capa and f.id <> $1
                    order by f.ordem, f.id limit 1)
        returning id)
      select (select imovel_code from del) as code`,
    [id, user.role === "corretor" ? user.email : null],
  )) as { code: string | null }[];
  const code = rows[0]?.code;
  if (!code) return c.json({ error: "Foto não encontrada ou enviada por outra pessoa" }, 404);
  await sql(c.env)`insert into audit_log (usuario, acao, registro, detalhe) values (${user.email}, 'foto_excluida', ${code}, ${`foto ${id}`})`;
  return c.json({ ok: true });
});

imoveis.post("/fotos/:id/capa", async (c) => {
  const user = c.get("user");
  if (!can(user.role, "enviar_fotos")) return c.json({ error: "Seu perfil não pode alterar fotos" }, 403);
  const id = Number(c.req.param("id"));
  const rows = (await sql(c.env).query(
    `update imovel_fotos f set capa = (f.id = $1)
     where f.imovel_code = (select imovel_code from imovel_fotos where id = $1)
     returning f.imovel_code`,
    [id],
  )) as { imovel_code: string }[];
  if (!rows.length) return c.json({ error: "Foto não encontrada" }, 404);
  return c.json({ ok: true });
});
