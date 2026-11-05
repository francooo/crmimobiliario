// Resumo do que está no banco: totais de referência, vínculos e pendências. Uso: npm run db:resumo
import { neon } from "@neondatabase/serverless";
import { databaseUrl } from "./_env.mjs";

const url = databaseUrl();
const sql = neon(url);
const brl = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const [k] = await sql`
  select
    (select coalesce(sum(valor), 0) from contratos where tipo = 'Venda') as vgv,
    (select count(*)::int from contratos where tipo = 'Venda') as vendas,
    (select coalesce(sum(comissao), 0) from contratos where tipo = 'Venda') as comissao,
    (select coalesce(sum(case when tipo = 'Entrada' then valor else -valor end), 0) from fluxo_caixa) as saldo,
    (select count(*)::int from agenciamentos) as captacoes,
    (select count(*)::int from agenciamentos where origem = 'Portais') as portais,
    (select count(*)::int from agenciamentos where agenciador like 'Agenciador%') as prefixo,
    (select round(avg(tempo_resposta_min), 1) from atendimentos) as resposta`;
console.log("── Totais");
console.log(`VGV ${brl(k.vgv)} (${k.vendas} vendas) · comissões ${brl(k.comissao)} · saldo de caixa ${brl(k.saldo)}`);
console.log(`Captações ${k.captacoes} (origem Portais: ${k.portais}; com prefixo "Agenciador": ${k.prefixo}) · resposta média ${k.resposta} min`);

console.log("\n── Leads e vínculos");
console.table(await sql`select lead_id, cliente, telefone, codigo_imovel, etapa from leads order by lead_id`);
console.table(await sql`select activity_id, cliente, lead_id from atendimentos order by activity_id`);
const [v] = await sql`select count(*) filter (where lead_id is not null)::int as com_lead,
                             count(*) filter (where codigo_imovel is not null)::int as com_imovel, count(*)::int as total from contratos`;
console.log(`Contratos: ${v.com_lead}/${v.total} com lead · ${v.com_imovel}/${v.total} com imóvel`);

console.log("\n── Pendências (tela Sincronização)");
console.table(await sql`select planilha, tipo, count(*)::int as qtd, min(mensagem) as exemplo, max(sugestao) as sugestao
                        from pendencias group by 1, 2 order by 1, 2`);

console.log("── Últimas sincronizações");
console.table(await sql`select planilha, origem, status, linhas, inseridas, atualizadas, removidas, avisos,
                               to_char(iniciado_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI:SS') as quando
                        from sync_runs order by id desc limit 10`);
