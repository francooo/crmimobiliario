import type { ReactNode } from "react";

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="m-0 text-[16px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  trend,
  hint,
  size = "lg",
}: {
  label: string;
  value: ReactNode;
  trend?: ReactNode;
  hint?: ReactNode;
  size?: "lg" | "md";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-surface p-5">
      <span className="text-[14px] text-muted">{label}</span>
      <span
        className={`tabular font-semibold ${size === "lg" ? "text-[40px] tracking-[-1.4px]" : "text-[32px] tracking-[-1.2px]"} leading-none`}
      >
        {value}
      </span>
      {(trend || hint) && (
        <span className="flex flex-wrap gap-x-2 text-[13px]">
          {trend && <span className="text-trend">{trend}</span>}
          {hint && <span className="text-muted-2">{hint}</span>}
        </span>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[30px] font-semibold tracking-[-0.9px]">{title}</h1>
        {subtitle && <div className="text-[15px] text-muted-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-4 py-8 text-center text-[14px] text-muted-2">{children}</div>;
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-input border border-notice-border bg-notice-bg px-[14px] py-[10px] text-[13px] text-notice-fg">
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.8px] text-subtle">{children}</div>;
}
