// Definição das 8 planilhas: colunas, tipos, obrigatoriedade e chave única.
// Os cabeçalhos são comparados sem acento/maiúsculas/espaços e aceitam apelidos.
import { parseRole } from "../../shared/permissions";
import {
  digits,
  matchEnum,
  normOrigem,
  normText,
  parseBool,
  parseDateTime,
  parseNumber,
  stripAgenciador,
  text,
  type Cell,
} from "./parse";

export const PLANILHAS = [
  "corretores",
  "imoveis",
  "agenciamentos",
  "leads",
  "atendimentos",
  "contratos",
  "fluxo_caixa",
  "campanhas",
] as const;
export type Planilha = (typeof PLANILHAS)[number];

export const PLANILHA_NOME: Record<Planilha, string> = {
  corretores: "Corretores",
  imoveis: "Imóveis",
  agenciamentos: "Agenciamentos",
  leads: "Leads",
  atendimentos: "Atendimentos",
  contratos: "Contratos",
  fluxo_caixa: "Fluxo de caixa",
  campanhas: "Campanhas",
};

export const ETAPAS = ["Novo lead", "Contato inicial", "Visita", "Proposta", "Fechado", "Perdido"] as const;
const TIPO_CONTRATO = ["Venda", "Locação"] as const;
const TIPO_CAIXA = ["Entrada", "Saída"] as const;
const STATUS_IMOVEL = ["Disponível", "Em negociação", "Vendido", "Locado"] as const;

const MODALIDADE_ALIASES = { locacao: "Locação", aluguel: "Locação", alugar: "Locação", vender: "Venda" } as const;
const CAIXA_ALIASES = { saida: "Saída", entradas: "Entrada", saidas: "Saída", receita: "Entrada", despesa: "Saída" } as const;

type Kind =
  | "text" // texto livre
  | "phone"
  | "number"
  | "int"
  | "date"
  | "datetime"
  | "etapa"
  | "tipo_contrato"
  | "tipo_caixa"
  | "modalidade"
  | "status_imovel"
  | "origem"
  | "agenciador"
  | "perfil"
  | "bool";

type Field = {
  /** coluna no banco */
  col: string;
  /** cabeçalhos aceitos (o primeiro é o oficial dos modelos) */
  headers: string[];
  kind: Kind;
  required?: boolean;
};

type Def = { key: string; fields: Field[] };

const f = (col: string, headers: string[], kind: Kind, required = false): Field => ({ col, headers, kind, required });

export const DEFS: Record<Planilha, Def> = {
  corretores: {
    key: "nome",
    fields: [
      f("nome", ["nome", "corretor", "nome completo"], "text", true),
      f("funcao", ["funcao", "função", "cargo"], "text"),
      f("email", ["email", "e-mail", "e-mail de acesso", "email de acesso"], "text"),
      f("perfil", ["perfil", "perfil de acesso"], "perfil"),
      f("creci", ["creci"], "text"),
      f("telefone", ["telefone", "celular", "whatsapp"], "phone"),
      f("ativo", ["ativo", "situacao", "status"], "bool"),
      f("observacoes", ["observacoes", "observações", "obs"], "text"),
    ],
  },
  imoveis: {
    key: "code",
    fields: [
      f("code", ["code", "codigo", "código", "codigo do imovel"], "text", true),
      f("nome", ["name", "nome", "imovel", "imóvel"], "text", true),
      f("bairro", ["bairro"], "text"),
      f("tipo", ["tipo", "tipo do imovel"], "text"),
      f("modalidade", ["modalidade", "finalidade"], "modalidade"),
      f("preco", ["price", "preco", "preço", "valor"], "number"),
      f("proprietario", ["owner", "proprietario", "proprietário"], "text"),
      f("status", ["status", "situacao", "situação"], "status_imovel"),
    ],
  },
  agenciamentos: {
    key: "agenciamento_id",
    fields: [
      f("agenciamento_id", ["agenciamentoId", "id", "codigo do agenciamento"], "text", true),
      f("codigo_imovel", ["codigoImovel", "codigo do imovel", "código do imóvel", "codigo portal"], "text"),
      f("data_cadastro", ["dataCadastro", "data", "data de cadastro"], "date", true),
      f("modalidade", ["modalidade", "finalidade"], "modalidade", true),
      f("corretor", ["corretor"], "text"),
      f("agenciador", ["agenciador"], "agenciador"),
      f("imovel", ["imovel", "imóvel"], "text"),
      f("bairro", ["bairro"], "text"),
      f("valor_anuncio", ["valorAnuncio", "valor anunciado", "valor"], "number"),
      f("status", ["status", "situacao", "situação"], "status_imovel"),
      f("origem", ["origem"], "origem"),
      f("observacoes", ["observacoes", "observações", "obs"], "text"),
    ],
  },
  leads: {
    key: "telefone",
    fields: [
      f("lead_id_planilha", ["leadId", "codigo", "código do lead"], "text"),
      f("cliente", ["cliente", "nome"], "text", true),
      f("telefone", ["telefone", "celular", "whatsapp"], "phone", true),
      f("imovel", ["imovel", "imóvel", "imovel de interesse"], "text"),
      f("codigo_imovel_planilha", ["codigoImovel", "codigo do imovel"], "text"),
      f("bairro", ["bairro"], "text"),
      f("corretor", ["corretor"], "text", true),
      f("origem", ["origem"], "origem", true),
      f("etapa", ["stage", "etapa"], "etapa", true),
      f("criado_em", ["createdAt", "data de entrada", "entrada"], "datetime", true),
      f("atualizado_em", ["updatedAt", "ultima interacao", "última interação"], "datetime"),
      f("observacoes", ["observations", "observacoes", "observações"], "text"),
      f("proximo_contato", ["nextActionDate", "proximo contato", "próximo contato"], "date"),
    ],
  },
  atendimentos: {
    key: "activity_id",
    fields: [
      f("activity_id", ["activityId", "id", "codigo"], "text", true),
      f("lead_id_planilha", ["leadId", "codigo do lead"], "text"),
      f("cliente", ["cliente"], "text"),
      f("imovel", ["imovel", "imóvel"], "text"),
      f("data", ["data", "data e hora"], "datetime", true),
      f("etapa", ["etapa", "stage"], "etapa"),
      f("descricao", ["descricao", "descrição"], "text"),
      f("corretor", ["corretor"], "text"),
      f("proximo_contato", ["proximoContato", "proximo contato", "próximo contato"], "date"),
      f("tempo_resposta_min", ["tempoRespostaMin", "tempo de resposta", "tempo resposta (min)"], "int"),
    ],
  },
  contratos: {
    key: "contract_id",
    fields: [
      f("contract_id", ["contractId", "id", "contrato"], "text", true),
      f("lead_id_planilha", ["leadId", "codigo do lead"], "text"),
      f("cliente", ["cliente"], "text"),
      f("imovel", ["imovel", "imóvel"], "text"),
      f("codigo_imovel_planilha", ["codigoImovel", "codigo do imovel"], "text"),
      f("tipo", ["tipo"], "tipo_contrato", true),
      f("valor", ["valor"], "number", true),
      f("data_fechamento", ["dataFechamento", "data de fechamento", "data"], "date", true),
      f("corretor", ["corretor"], "text"),
      f("origem", ["origem"], "origem"),
      f("comissao", ["comissao", "comissão"], "number"),
    ],
  },
  fluxo_caixa: {
    key: "entry_id",
    fields: [
      f("entry_id", ["entryId", "id", "lancamento", "lançamento"], "text", true),
      f("data", ["data"], "date", true),
      f("tipo", ["tipo"], "tipo_caixa", true),
      f("categoria", ["categoria"], "text", true),
      f("descricao", ["descricao", "descrição"], "text"),
      f("valor", ["valor"], "number", true),
      f("status", ["status", "situacao", "situação"], "text"),
      f("contract_id", ["contractId", "contrato", "contrato vinculado"], "text"),
    ],
  },
  campanhas: {
    key: "nome",
    fields: [
      f("nome", ["nome", "campanha"], "text", true),
      f("canal", ["canal"], "origem"),
      f("leads", ["leads", "leads gerados"], "int"),
      f("custo", ["custo", "investimento"], "number"),
      f("cpl", ["cpl", "custo por lead"], "number"),
      f("fechados", ["fechados", "negocios fechados", "negócios fechados"], "int"),
      f("inicio", ["inicio", "início", "data inicio"], "date"),
      f("fim", ["fim", "data fim", "termino", "término"], "date"),
    ],
  },
};

export type Issue = { linha: number | null; coluna: string | null; tipo: string; mensagem: string; chave: string | null };

type Converted = { ok: true; value: unknown } | { ok: false; msg: string };

function convert(kind: Kind, raw: Cell): Converted {
  const ok = (value: unknown): Converted => ({ ok: true, value });
  const bad = (msg: string): Converted => ({ ok: false, msg });
  switch (kind) {
    case "text":
      return ok(text(raw));
    case "phone":
      return ok(digits(raw));
    case "number": {
      const n = parseNumber(raw);
      return Number.isNaN(n) ? bad(`número inválido: "${raw}"`) : ok(n);
    }
    case "int": {
      const n = parseNumber(raw);
      return Number.isNaN(n) ? bad(`número inválido: "${raw}"`) : ok(n === null ? null : Math.round(n));
    }
    case "date":
    case "datetime": {
      const d = parseDateTime(raw, kind === "datetime");
      return d === undefined ? bad(`data inválida: "${raw}" (use AAAA-MM-DD ou DD/MM/AAAA)`) : ok(d);
    }
    case "etapa": {
      const e = matchEnum(raw, ETAPAS, { novo: "Novo lead", contato: "Contato inicial", fechado: "Fechado", ganho: "Fechado" });
      return e === undefined ? bad(`etapa desconhecida: "${raw}"`) : ok(e);
    }
    case "tipo_contrato":
    case "modalidade": {
      const t = matchEnum(raw, TIPO_CONTRATO, MODALIDADE_ALIASES);
      return t === undefined ? bad(`use Venda ou Locação: "${raw}"`) : ok(t);
    }
    case "tipo_caixa": {
      const t = matchEnum(raw, TIPO_CAIXA, CAIXA_ALIASES);
      return t === undefined ? bad(`use Entrada ou Saída: "${raw}"`) : ok(t);
    }
    case "status_imovel": {
      const s = matchEnum(raw, STATUS_IMOVEL, { negociacao: "Em negociação", disponivel: "Disponível" });
      return s === undefined ? ok(text(raw)) : ok(s); // status desconhecido é aceito como texto
    }
    case "origem":
      return ok(normOrigem(raw));
    case "agenciador":
      return ok(stripAgenciador(raw));
    case "perfil": {
      if (text(raw) === null) return ok(null);
      const r = parseRole(String(raw));
      return r === null ? bad(`perfil desconhecido: "${raw}" (Sócio / Gestor, Gerente de locações, Administrativo ou Corretor)`) : ok(r);
    }
    case "bool": {
      const b = parseBool(raw, true);
      return b === undefined ? bad(`use Sim ou Não: "${raw}"`) : ok(b);
    }
  }
}

export type ValidationResult = {
  records: Record<string, unknown>[];
  issues: Issue[];
  missingColumns: string[];
  unknownColumns: string[];
};

/**
 * Valida e normaliza as linhas de uma planilha.
 * @param header linha de cabeçalho como veio da planilha
 * @param rows   linhas de dados (sem o cabeçalho)
 * @param firstRow número da primeira linha de dados na planilha (para os avisos), normalmente 2
 */
export function validateSheet(planilha: Planilha, header: Cell[], rows: Cell[][], firstRow = 2): ValidationResult {
  const def = DEFS[planilha];
  const keys = header.map((h) => normText(h).replace(/[^a-z0-9]/g, ""));
  const index = new Map<string, number>();
  const used = new Set<number>();
  for (const fld of def.fields) {
    for (const alias of fld.headers) {
      const k = normText(alias).replace(/[^a-z0-9]/g, "");
      const i = keys.findIndex((x, pos) => x === k && !used.has(pos));
      if (i >= 0) {
        index.set(fld.col, i);
        used.add(i);
        break;
      }
    }
  }
  const missingColumns = def.fields.filter((x) => x.required && !index.has(x.col)).map((x) => x.headers[0]!);
  const unknownColumns = header.filter((h, i) => !used.has(i) && text(h) !== null).map((h) => String(h));
  const issues: Issue[] = [];
  if (missingColumns.length) {
    issues.push({
      linha: 1,
      coluna: missingColumns.join(", "),
      tipo: "coluna_ausente",
      mensagem: `Coluna(s) obrigatória(s) ausente(s): ${missingColumns.join(", ")}`,
      chave: null,
    });
    return { records: [], issues, missingColumns, unknownColumns };
  }

  const records: Record<string, unknown>[] = [];
  const seen = new Map<string, number>();
  rows.forEach((row, i) => {
    const linha = firstRow + i;
    if (!row || row.every((c) => text(c as Cell) === null)) return; // linha em branco
    const rec: Record<string, unknown> = {};
    let bad = false;
    for (const fld of def.fields) {
      const pos = index.get(fld.col);
      const raw = pos === undefined ? null : (row[pos] as Cell);
      const conv = convert(fld.kind, raw);
      if (!conv.ok) {
        issues.push({ linha, coluna: fld.headers[0]!, tipo: "invalido", mensagem: conv.msg, chave: null });
        if (fld.required) bad = true;
        rec[fld.col] = null;
        continue;
      }
      if (fld.required && (conv.value === null || conv.value === "")) {
        issues.push({ linha, coluna: fld.headers[0]!, tipo: "invalido", mensagem: "campo obrigatório vazio", chave: null });
        bad = true;
      }
      rec[fld.col] = conv.value;
    }
    const key = rec[def.key] as string | null;
    if (bad || key === null || key === undefined) return;
    const prev = seen.get(String(key));
    if (prev !== undefined) {
      issues.push({
        linha,
        coluna: def.fields.find((x) => x.col === def.key)!.headers[0]!,
        tipo: "duplicado",
        mensagem: `chave repetida (já usada na linha ${prev}); esta linha prevalece`,
        chave: String(key),
      });
      const at = records.findIndex((r) => String(r[def.key]) === String(key));
      if (at >= 0) records.splice(at, 1);
    }
    seen.set(String(key), linha);
    rec.sheet_row = linha;
    records.push(rec);
  });

  // leadId da planilha repetido entre telefones diferentes não serve para vincular
  if (planilha === "leads") {
    const count = new Map<string, number>();
    for (const r of records) if (r.lead_id_planilha) count.set(String(r.lead_id_planilha), (count.get(String(r.lead_id_planilha)) ?? 0) + 1);
    for (const r of records) {
      if (r.lead_id_planilha && count.get(String(r.lead_id_planilha))! > 1) {
        issues.push({
          linha: r.sheet_row as number,
          coluna: "leadId",
          tipo: "duplicado",
          mensagem: `leadId "${r.lead_id_planilha}" usado em mais de um telefone; ignorado para vínculos`,
          chave: String(r.telefone),
        });
        r.lead_id_planilha = null;
      }
    }
  }

  // Campos derivados
  for (const r of records) {
    if (planilha === "corretores") r.nome_normalizado = normText(r.nome as string);
    if (planilha === "imoveis") r.nome_normalizado = normText(r.nome as string);
    if (planilha === "agenciamentos") r.imovel_normalizado = r.imovel ? normText(r.imovel as string) : null;
    if (planilha === "leads") {
      r.cliente_normalizado = normText(r.cliente as string);
      r.imovel_normalizado = r.imovel ? normText(r.imovel as string) : null;
    }
    if (planilha === "atendimentos" || planilha === "contratos") r.cliente_normalizado = r.cliente ? normText(r.cliente as string) : null;
    if (planilha === "contratos") r.imovel_normalizado = r.imovel ? normText(r.imovel as string) : null;
    if (planilha === "campanhas" && r.cpl === null && typeof r.custo === "number" && typeof r.leads === "number" && r.leads > 0) {
      r.cpl = Math.round((r.custo / r.leads) * 100) / 100;
    }
  }
  return { records, issues, missingColumns, unknownColumns };
}
