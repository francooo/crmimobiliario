// Conversões tolerantes para os valores vindos das planilhas (Apps Script envia texto,
// número ou data já formatada). Funções puras — cobertas por parse.test.ts.

export type Cell = string | number | boolean | null | undefined;

/** "  Aline   Martins " → "aline martins" (sem acento, minúsculo, espaços únicos) */
export function normText(v: Cell): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Texto limpo; vazio vira null */
export function text(v: Cell): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}

/** Só dígitos (telefone). 51999990001 (número) também funciona. */
export function digits(v: Cell): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = typeof v === "number" ? Math.round(v).toString() : String(v);
  const d = s.replace(/\D/g, "");
  return d === "" ? null : d;
}

/**
 * Número em formato brasileiro ou internacional:
 *   1250 · "1250" · "1250.5" · "8000.0" · "1.250,50" · "R$ 1.250" · "1.250.000" · "-35,7"
 * Regra: com vírgula → vírgula é decimal; sem vírgula e no padrão 1.234.567 → pontos são milhar.
 */
export function parseNumber(v: Cell): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[R$\s ]/g, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return Number(s);
}

function validYmd(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const pad = (n: number | string) => String(n).padStart(2, "0");

/**
 * Data/hora → "AAAA-MM-DD" ou "AAAA-MM-DD HH:MM" (horário local, sem fuso).
 * Aceita AAAA-MM-DD[ HH:MM[:SS]], AAAA-MM-DDTHH:MM, DD/MM/AAAA[ HH:MM].
 * Retorna NaN-string "" (inválida) como undefined e vazio como null.
 */
export function parseDateTime(v: Cell, withTime: boolean): string | null | undefined {
  const s = text(v);
  if (s === null) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/);
  let y: number, mo: number, d: number, hh: string | undefined, mi: string | undefined;
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    [hh, mi] = [m[4], m[5]];
  } else {
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
    if (!m) return undefined;
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    [hh, mi] = [m[4], m[5]];
  }
  if (!validYmd(y, mo, d)) return undefined;
  if (hh !== undefined && (Number(hh) > 23 || Number(mi) > 59)) return undefined;
  const date = `${y}-${pad(mo)}-${pad(d)}`;
  if (!withTime) return date;
  return `${date} ${pad(hh ?? 0)}:${pad(mi ?? 0)}`;
}

/** Procura o valor canônico de um domínio comparando sem acento/maiúsculas. */
export function matchEnum<T extends string>(v: Cell, values: readonly T[], aliases: Record<string, T> = {}): T | null | undefined {
  const n = normText(v);
  if (n === "") return null;
  const found = values.find((x) => normText(x) === n);
  if (found) return found;
  return aliases[n] ?? undefined;
}

/** "Agenciador Luiza Ramos" → "Luiza Ramos" */
export function stripAgenciador(v: Cell): string | null {
  const s = text(v);
  if (s === null) return null;
  const out = s.replace(/^agenciador(a)?\s+/i, "").trim();
  return out === "" ? null : out;
}

/** Padroniza origem: "Portal imobiliário" → "Portais" */
export function normOrigem(v: Cell): string | null {
  const s = text(v);
  if (s === null) return null;
  const n = normText(s);
  if (n === "portal imobiliario" || n === "portal" || n === "portais imobiliarios") return "Portais";
  return s;
}

/** Sim/Não/true/1/x → boolean (vazio = padrão) */
export function parseBool(v: Cell, fallback: boolean): boolean | undefined {
  if (typeof v === "boolean") return v;
  const n = normText(v);
  if (n === "") return fallback;
  if (["sim", "s", "true", "1", "x", "ativo", "yes"].includes(n)) return true;
  if (["nao", "n", "false", "0", "inativo", "no"].includes(n)) return false;
  return undefined;
}

/** Cabeçalho normalizado para casar colunas: "Código do Imóvel" → "codigodoimovel" */
export function headerKey(v: Cell): string {
  return normText(v).replace(/[^a-z0-9]/g, "");
}
