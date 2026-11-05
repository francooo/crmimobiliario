// Formatação pt-BR — datas DD/MM, valores em R$ com separador de milhar
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num = new Intl.NumberFormat("pt-BR");

export const money = (v: number, cents = false) => (cents ? brlCents : brl).format(v);
export const rentMoney = (v: number) => `${money(v)}/mês`;
export const number = (v: number) => num.format(v);

/** "R$ 9,02 mi" / "R$ 324 mil" para KPIs grandes */
export function moneyShort(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (Math.abs(v) >= 10_000) return `R$ ${Math.round(v / 1000).toLocaleString("pt-BR")} mil`;
  return money(v);
}

/** "2026-10-28" ou "2026-10-28 10:30" → "28/10" */
export function dayMonth(iso: string | null | undefined) {
  if (!iso) return "—";
  const [d] = iso.split(" ");
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

/** "2026-10-28 10:30" → "28/10 10:30" */
export function dayMonthTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const [d, t] = iso.split(" ");
  return t ? `${dayMonth(d!)} ${t.slice(0, 5)}` : dayMonth(d!);
}

/** "2026-10-28" → "28/10/2026" */
export function fullDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Variação percentual com sinal: +12% / −8% (null se não há base) */
export function variacao(atual: number, anterior: number | null | undefined): string | null {
  if (!anterior) return null;
  const v = Math.round((atual / anterior - 1) * 100);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`;
}

/** "51999990001" → "(51) 99999-0001" */
export function phone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
