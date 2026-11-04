import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";

/** Chip de filtro — 34px, raio 8; ativo = fundo primário */
export function Chip({ href, active, children }: { href: string; active?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex h-[34px] items-center rounded-[8px] px-3 text-[14px] no-underline ${
        active ? "bg-primary text-white hover:text-white" : "border border-border-strong bg-surface text-ink-2"
      }`}
    >
      {children}
    </Link>
  );
}

/** Barra horizontal: trilho #f1f1f3 + preenchimento da escala de cinzas */
export function BarH({
  label,
  value,
  max,
  display,
  tone = 0,
  height = 14,
}: {
  label: ReactNode;
  value: number;
  max: number;
  display?: ReactNode;
  tone?: 0 | 1 | 2 | 3 | 4;
  height?: number;
}) {
  const colors = ["#5b5d62", "#808287", "#a2a4a8", "#c0c1c5", "#d9dadd"];
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex justify-between gap-3 text-[13.5px]">
        <span className="text-ink-3">{label}</span>
        <span className="tabular text-ink-2">{display ?? value}</span>
      </div>
      <div className="overflow-hidden rounded-full bg-track" style={{ height }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[tone] }} />
      </div>
    </div>
  );
}

/** Timeline: ponto de 10px + linha de 1px */
export function Timeline({ items }: { items: { key: string; title: ReactNode; meta?: ReactNode; body?: ReactNode }[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((it, i) => (
        <li key={it.key} className="grid grid-cols-[18px_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-[6px] h-[10px] w-[10px] rounded-full bg-chart-1" />
            {i < items.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="flex flex-col gap-1 pb-4">
            <div className="text-[14px] font-medium">{it.title}</div>
            {it.meta && <div className="font-mono text-[12px] text-subtle">{it.meta}</div>}
            {it.body && <div className="text-[13.5px] text-muted">{it.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const ini = initials(name);
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[#8e9095] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {ini}
    </span>
  );
}
