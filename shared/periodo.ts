// Período do filtro global (cabeçalho). Usado pela API (datas) e pelas telas (rótulo).

export const PERIODOS = [
  { value: "mes", label: "Mês atual" },
  { value: "anterior", label: "Mês anterior" },
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
  { value: "12", label: "Últimos 12 meses" },
] as const;

export type PeriodoValue = (typeof PERIODOS)[number]["value"];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export type Periodo = {
  value: PeriodoValue;
  /** primeiro dia (inclusive), AAAA-MM-DD */
  inicio: string;
  /** primeiro dia após o período (exclusivo) */
  fim: string;
  /** período anterior de mesma duração, para comparação */
  anteriorInicio: string;
  anteriorFim: string;
  /** hoje em São Paulo */
  hoje: string;
  label: string;
  meses: number;
};

const ymd = (y: number, m: number, d = 1) => {
  const dt = new Date(Date.UTC(y, m, d));
  return dt.toISOString().slice(0, 10);
};

/** Hoje no fuso de São Paulo (UTC−3, sem horário de verão desde 2019). */
export function hojeSaoPaulo(now = new Date()): { y: number; m: number; d: number } {
  const sp = new Date(now.getTime() - 3 * 3600_000);
  return { y: sp.getUTCFullYear(), m: sp.getUTCMonth(), d: sp.getUTCDate() };
}

export function parsePeriodo(raw: string | null | undefined): PeriodoValue {
  if (raw === "1") return "mes"; // valor antigo
  return (PERIODOS.find((p) => p.value === raw)?.value ?? "mes") as PeriodoValue;
}

export function periodo(raw: string | null | undefined, now = new Date()): Periodo {
  const value = parsePeriodo(raw);
  const t = hojeSaoPaulo(now);
  const meses = value === "mes" || value === "anterior" ? 1 : Number(value);
  const fimMes = value === "anterior" ? t.m : t.m + 1; // mês (0-based) do 1º dia após o período
  const iniMes = fimMes - meses;
  const nome = (m: number) => {
    const dt = new Date(Date.UTC(t.y, m, 1));
    return { mes: MESES[dt.getUTCMonth()]!, ano: dt.getUTCFullYear() };
  };
  const a = nome(iniMes);
  const b = nome(fimMes - 1);
  const label =
    meses === 1 ? `${a.mes} de ${a.ano}` : a.ano === b.ano ? `${a.mes} a ${b.mes} de ${b.ano}` : `${a.mes} de ${a.ano} a ${b.mes} de ${b.ano}`;
  return {
    value,
    inicio: ymd(t.y, iniMes),
    fim: ymd(t.y, fimMes),
    anteriorInicio: ymd(t.y, iniMes - meses),
    anteriorFim: ymd(t.y, iniMes),
    hoje: ymd(t.y, t.m, t.d),
    label,
    meses,
  };
}
