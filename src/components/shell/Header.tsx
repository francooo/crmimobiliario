import { useEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

export const PERIODS = [
  { value: "1", label: "Mês atual" },
  { value: "3", label: "Últimos 3 meses" },
  { value: "6", label: "Últimos 6 meses" },
];

/** Cabeçalho fixo de 68px: busca global (⌘K / Ctrl+K) e seletor de período */
export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Busca em Leads, Funil, Imóveis e Agenciamentos; de outras telas, leva para Leads
  const searchTarget = ["/leads", "/funil", "/imoveis", "/agenciamentos"].some((p) => pathname.startsWith(p)) ? pathname : "/leads";

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q")?.toString().trim() ?? "";
    const next = new URLSearchParams(pathname === searchTarget ? params : undefined);
    if (q) next.set("q", q);
    else next.delete("q");
    navigate(`${searchTarget}${next.size ? `?${next}` : ""}`);
  }

  function onPeriod(value: string) {
    const next = new URLSearchParams(params);
    next.set("periodo", value);
    navigate(`${pathname}?${next}`);
  }

  return (
    <header className="sticky top-0 z-10 flex min-h-[68px] flex-wrap items-center gap-x-[14px] gap-y-[10px] border-b border-border bg-bg px-7 py-[14px]">
      <form
        onSubmit={onSearch}
        className="flex h-10 min-w-0 max-w-[520px] flex-[1_1_220px] items-center gap-[10px] rounded-input border border-[#dcdde0] bg-surface px-[14px]"
      >
        <span aria-hidden className="h-3 w-3 rounded-full border-[1.6px] border-muted-2" />
        <input
          ref={searchRef}
          name="q"
          key={params.get("q") ?? ""}
          defaultValue={params.get("q") ?? ""}
          placeholder="Buscar cliente, imóvel, bairro ou código"
          aria-label="Busca global"
          className="min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none"
        />
        <span className="rounded-[5px] border border-border px-[6px] py-[2px] font-mono text-[11px] text-[#8d9096]">⌘K</span>
      </form>
      <select
        aria-label="Período"
        value={params.get("periodo") ?? "1"}
        onChange={(e) => onPeriod(e.target.value)}
        className="h-10 rounded-input border border-[#dcdde0] bg-surface px-3 text-[14px] text-ink-2"
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </header>
  );
}
