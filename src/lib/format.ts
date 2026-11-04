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
export function dayMonth(iso: string) {
  const [d] = iso.split(" ");
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
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
