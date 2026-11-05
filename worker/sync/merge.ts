import { DEFS, type Planilha } from "./schema";

// Monta o SQL que troca o espelho de uma planilha pelo conteúdo recebido (staging) numa transação.
// Identificadores vêm só das definições fixas em schema.ts — nada do usuário entra no texto do SQL.

const PG_TYPE: Record<string, string> = {
  text: "text",
  phone: "text",
  origem: "text",
  agenciador: "text",
  etapa: "text",
  tipo_contrato: "text",
  tipo_caixa: "text",
  modalidade: "text",
  status_imovel: "text",
  perfil: "text",
  number: "numeric",
  int: "int",
  date: "date",
  datetime: "timestamp",
  bool: "boolean",
};

const DERIVED: Record<Planilha, string[]> = {
  corretores: ["nome_normalizado"],
  imoveis: ["nome_normalizado"],
  agenciamentos: ["imovel_normalizado"],
  leads: ["cliente_normalizado", "imovel_normalizado"],
  atendimentos: ["cliente_normalizado"],
  contratos: ["cliente_normalizado", "imovel_normalizado"],
  fluxo_caixa: [],
  campanhas: [],
};

export function columnsOf(planilha: Planilha): { col: string; type: string }[] {
  const def = DEFS[planilha];
  return [
    ...def.fields.map((f) => ({ col: f.col, type: PG_TYPE[f.kind]! })),
    ...DERIVED[planilha].map((col) => ({ col, type: "text" })),
    { col: "sheet_row", type: "int" },
  ];
}

/**
 * Statements (em ordem, numa transação) para aplicar o run `$1`.
 * O último devolve { inseridas, atualizadas, removidas }.
 */
export function mergeStatements(planilha: Planilha): string[] {
  const def = DEFS[planilha];
  const cols = columnsOf(planilha);
  const recordDef = cols.map((c) => `${c.col} ${c.type}`).join(", ");
  const src = `src as (
    select distinct on (${def.key}) * from jsonb_to_recordset(
      coalesce((select jsonb_agg(e) from sync_staging s cross join lateral jsonb_array_elements(s.dados) e where s.run_id = $1), '[]'::jsonb)
    ) as x(${recordDef})
    order by ${def.key}, sheet_row desc
  )`;

  const out: string[] = [];
  let targetCols = cols.map((c) => c.col);
  let selectExpr = targetCols.map((c) => `src.${c}`);
  let from = "src";

  if (planilha === "leads") {
    // Código fixo por telefone, em ordem de linha da planilha; nunca reaproveitado
    out.push(`with ${src}
      insert into lead_ids (telefone, lead_id)
      select n.telefone, 'LEAD-' || lpad(nextval('lead_id_seq')::text, 4, '0')
      from (select telefone, sheet_row from src where telefone not in (select telefone from lead_ids) order by sheet_row) n`);
    targetCols = [...targetCols, "lead_id"];
    selectExpr = [...selectExpr, "li.lead_id"];
    from = "src join lead_ids li on li.telefone = src.telefone";
  }

  const updatable = targetCols.filter((c) => c !== def.key);
  const setList = [...updatable.map((c) => `${c} = excluded.${c}`), "synced_at = now()"].join(", ");
  // sheet_row fora da comparação: só mudar de linha na planilha não conta como alteração
  const compared = updatable.filter((c) => c !== "sheet_row");
  const changed = `(${compared.map((c) => `t.${c}`).join(", ")}) is distinct from (${compared.map((c) => `excluded.${c}`).join(", ")})`;

  out.push(`with ${src},
    up as (
      insert into ${planilha} as t (${targetCols.join(", ")})
      select ${selectExpr.join(", ")} from ${from}
      on conflict (${def.key}) do update set ${setList}
      where ${changed} or t.sheet_row is distinct from excluded.sheet_row
      returning (xmax = 0) as inserida
    ),
    del as (
      delete from ${planilha} where ${def.key} not in (select ${def.key} from src) returning 1
    )
    select
      (select count(*)::int from up where inserida) as inseridas,
      (select count(*)::int from up where not inserida) as atualizadas,
      (select count(*)::int from del) as removidas`);
  return out;
}
