// GERADO por npm run build:apps-script a partir de worker/sync/schema.ts — não edite à mão.
var ImobiSync = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // worker/sync/apps-script-entry.ts
  var apps_script_entry_exports = {};
  __export(apps_script_entry_exports, {
    PLANILHAS: () => PLANILHAS,
    PLANILHA_NOME: () => PLANILHA_NOME,
    validateSheet: () => validateSheet
  });

  // shared/permissions.ts
  function parseRole(text2) {
    const t = (text2 != null ? text2 : "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    if (!t) return null;
    if (t.startsWith("socio") || t.includes("gestor")) return "socio";
    if (t.includes("locac") || t.startsWith("gerente")) return "locacoes";
    if (t.startsWith("admin")) return "admin";
    if (t.startsWith("corretor") || t.startsWith("agenciador")) return "corretor";
    return null;
  }

  // worker/sync/parse.ts
  function normText(v) {
    return String(v != null ? v : "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  function text(v) {
    if (v === null || v === void 0) return null;
    const s = String(v).replace(/\s+/g, " ").trim();
    return s === "" ? null : s;
  }
  function digits(v) {
    if (v === null || v === void 0 || v === "") return null;
    const s = typeof v === "number" ? Math.round(v).toString() : String(v);
    const d = s.replace(/\D/g, "");
    return d === "" ? null : d;
  }
  function parseNumber(v) {
    if (v === null || v === void 0 || v === "") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    let s = String(v).replace(/[R$\s ]/g, "");
    if (s === "") return null;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;
    return Number(s);
  }
  function validYmd(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  var pad = (n) => String(n).padStart(2, "0");
  function parseDateTime(v, withTime) {
    const s = text(v);
    if (s === null) return null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
    let y, mo, d, hh, mi;
    if (m) {
      [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      [hh, mi] = [m[4], m[5]];
    } else {
      m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
      if (!m) return void 0;
      [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
      [hh, mi] = [m[4], m[5]];
    }
    if (!validYmd(y, mo, d)) return void 0;
    if (hh !== void 0 && (Number(hh) > 23 || Number(mi) > 59)) return void 0;
    const date = `${y}-${pad(mo)}-${pad(d)}`;
    if (!withTime) return date;
    return `${date} ${pad(hh != null ? hh : 0)}:${pad(mi != null ? mi : 0)}`;
  }
  function matchEnum(v, values, aliases = {}) {
    var _a;
    const n = normText(v);
    if (n === "") return null;
    const found = values.find((x) => normText(x) === n);
    if (found) return found;
    return (_a = aliases[n]) != null ? _a : void 0;
  }
  function stripAgenciador(v) {
    const s = text(v);
    if (s === null) return null;
    const out = s.replace(/^agenciador(a)?\s+/i, "").trim();
    return out === "" ? null : out;
  }
  function normOrigem(v) {
    const s = text(v);
    if (s === null) return null;
    const n = normText(s);
    if (n === "portal imobiliario" || n === "portal" || n === "portais imobiliarios") return "Portais";
    return s;
  }
  function parseBool(v, fallback) {
    if (typeof v === "boolean") return v;
    const n = normText(v);
    if (n === "") return fallback;
    if (["sim", "s", "true", "1", "x", "ativo", "yes"].includes(n)) return true;
    if (["nao", "n", "false", "0", "inativo", "no"].includes(n)) return false;
    return void 0;
  }

  // worker/sync/schema.ts
  var PLANILHAS = [
    "corretores",
    "imoveis",
    "agenciamentos",
    "leads",
    "atendimentos",
    "contratos",
    "fluxo_caixa",
    "campanhas"
  ];
  var PLANILHA_NOME = {
    corretores: "Corretores",
    imoveis: "Imóveis",
    agenciamentos: "Agenciamentos",
    leads: "Leads",
    atendimentos: "Atendimentos",
    contratos: "Contratos",
    fluxo_caixa: "Fluxo de caixa",
    campanhas: "Campanhas"
  };
  var ETAPAS = ["Novo lead", "Contato inicial", "Visita", "Proposta", "Fechado", "Perdido"];
  var TIPO_CONTRATO = ["Venda", "Locação"];
  var TIPO_CAIXA = ["Entrada", "Saída"];
  var STATUS_IMOVEL = ["Disponível", "Em negociação", "Vendido", "Locado"];
  var MODALIDADE_ALIASES = { locacao: "Locação", aluguel: "Locação", alugar: "Locação", vender: "Venda" };
  var CAIXA_ALIASES = { saida: "Saída", entradas: "Entrada", saidas: "Saída", receita: "Entrada", despesa: "Saída" };
  var f = (col, headers, kind, required = false) => ({ col, headers, kind, required });
  var DEFS = {
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
        f("observacoes", ["observacoes", "observações", "obs"], "text")
      ]
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
        f("status", ["status", "situacao", "situação"], "status_imovel")
      ]
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
        f("observacoes", ["observacoes", "observações", "obs"], "text")
      ]
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
        f("proximo_contato", ["nextActionDate", "proximo contato", "próximo contato"], "date")
      ]
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
        f("tempo_resposta_min", ["tempoRespostaMin", "tempo de resposta", "tempo resposta (min)"], "int")
      ]
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
        f("comissao", ["comissao", "comissão"], "number")
      ]
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
        f("contract_id", ["contractId", "contrato", "contrato vinculado"], "text")
      ]
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
        f("fim", ["fim", "data fim", "termino", "término"], "date")
      ]
    }
  };
  function convert(kind, raw) {
    const ok = (value) => ({ ok: true, value });
    const bad = (msg) => ({ ok: false, msg });
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
        return d === void 0 ? bad(`data inválida: "${raw}" (use AAAA-MM-DD ou DD/MM/AAAA)`) : ok(d);
      }
      case "etapa": {
        const e = matchEnum(raw, ETAPAS, { novo: "Novo lead", contato: "Contato inicial", fechado: "Fechado", ganho: "Fechado" });
        return e === void 0 ? bad(`etapa desconhecida: "${raw}"`) : ok(e);
      }
      case "tipo_contrato":
      case "modalidade": {
        const t = matchEnum(raw, TIPO_CONTRATO, MODALIDADE_ALIASES);
        return t === void 0 ? bad(`use Venda ou Locação: "${raw}"`) : ok(t);
      }
      case "tipo_caixa": {
        const t = matchEnum(raw, TIPO_CAIXA, CAIXA_ALIASES);
        return t === void 0 ? bad(`use Entrada ou Saída: "${raw}"`) : ok(t);
      }
      case "status_imovel": {
        const s = matchEnum(raw, STATUS_IMOVEL, { negociacao: "Em negociação", disponivel: "Disponível" });
        return s === void 0 ? ok(text(raw)) : ok(s);
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
        return b === void 0 ? bad(`use Sim ou Não: "${raw}"`) : ok(b);
      }
    }
  }
  function validateSheet(planilha, header, rows, firstRow = 2) {
    var _a;
    const def = DEFS[planilha];
    const keys = header.map((h) => normText(h).replace(/[^a-z0-9]/g, ""));
    const index = /* @__PURE__ */ new Map();
    const used = /* @__PURE__ */ new Set();
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
    const missingColumns = def.fields.filter((x) => x.required && !index.has(x.col)).map((x) => x.headers[0]);
    const unknownColumns = header.filter((h, i) => !used.has(i) && text(h) !== null).map((h) => String(h));
    const issues = [];
    if (missingColumns.length) {
      issues.push({
        linha: 1,
        coluna: missingColumns.join(", "),
        tipo: "coluna_ausente",
        mensagem: `Coluna(s) obrigatória(s) ausente(s): ${missingColumns.join(", ")}`,
        chave: null
      });
      return { records: [], issues, missingColumns, unknownColumns };
    }
    const records = [];
    const seen = /* @__PURE__ */ new Map();
    rows.forEach((row, i) => {
      const linha = firstRow + i;
      if (!row || row.every((c) => text(c) === null)) return;
      const rec = {};
      let bad = false;
      for (const fld of def.fields) {
        const pos = index.get(fld.col);
        const raw = pos === void 0 ? null : row[pos];
        const conv = convert(fld.kind, raw);
        if (!conv.ok) {
          issues.push({ linha, coluna: fld.headers[0], tipo: "invalido", mensagem: conv.msg, chave: null });
          if (fld.required) bad = true;
          rec[fld.col] = null;
          continue;
        }
        if (fld.required && (conv.value === null || conv.value === "")) {
          issues.push({ linha, coluna: fld.headers[0], tipo: "invalido", mensagem: "campo obrigatório vazio", chave: null });
          bad = true;
        }
        rec[fld.col] = conv.value;
      }
      const key = rec[def.key];
      if (bad || key === null || key === void 0) return;
      const prev = seen.get(String(key));
      if (prev !== void 0) {
        issues.push({
          linha,
          coluna: def.fields.find((x) => x.col === def.key).headers[0],
          tipo: "duplicado",
          mensagem: `chave repetida (já usada na linha ${prev}); esta linha prevalece`,
          chave: String(key)
        });
        const at = records.findIndex((r) => String(r[def.key]) === String(key));
        if (at >= 0) records.splice(at, 1);
      }
      seen.set(String(key), linha);
      rec.sheet_row = linha;
      records.push(rec);
    });
    if (planilha === "leads") {
      const count = /* @__PURE__ */ new Map();
      for (const r of records) if (r.lead_id_planilha) count.set(String(r.lead_id_planilha), ((_a = count.get(String(r.lead_id_planilha))) != null ? _a : 0) + 1);
      for (const r of records) {
        if (r.lead_id_planilha && count.get(String(r.lead_id_planilha)) > 1) {
          issues.push({
            linha: r.sheet_row,
            coluna: "leadId",
            tipo: "duplicado",
            mensagem: `leadId "${r.lead_id_planilha}" usado em mais de um telefone; ignorado para vínculos`,
            chave: String(r.telefone)
          });
          r.lead_id_planilha = null;
        }
      }
    }
    for (const r of records) {
      if (planilha === "corretores") r.nome_normalizado = normText(r.nome);
      if (planilha === "imoveis") r.nome_normalizado = normText(r.nome);
      if (planilha === "agenciamentos") r.imovel_normalizado = r.imovel ? normText(r.imovel) : null;
      if (planilha === "leads") {
        r.cliente_normalizado = normText(r.cliente);
        r.imovel_normalizado = r.imovel ? normText(r.imovel) : null;
      }
      if (planilha === "atendimentos" || planilha === "contratos") r.cliente_normalizado = r.cliente ? normText(r.cliente) : null;
      if (planilha === "contratos") r.imovel_normalizado = r.imovel ? normText(r.imovel) : null;
      if (planilha === "campanhas" && r.cpl === null && typeof r.custo === "number" && typeof r.leads === "number" && r.leads > 0) {
        r.cpl = Math.round(r.custo / r.leads * 100) / 100;
      }
    }
    return { records, issues, missingColumns, unknownColumns };
  }
  return __toCommonJS(apps_script_entry_exports);
})();
