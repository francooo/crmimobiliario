import { Link, useSearchParams } from "react-router";
import { PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { dayMonth } from "@/lib/format";
import { useApi, qs } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

type Card = { lead_id: string; cliente: string; imovel: string | null; bairro: string | null; corretor: string | null; ultima: string | null; vencido: boolean | null };
type FunilResp = { colunas: Record<string, { total: number; cards: Card[] }>; corretores: string[] };

const LANES = [
  { nome: "Novo lead", dot: "#c4c5c9" },
  { nome: "Contato inicial", dot: "#a9abb0" },
  { nome: "Visita", dot: "#6b7c93" },
  { nome: "Proposta", dot: "#b08a3e" },
  { nome: "Fechado", dot: "#5f7a5a" },
];

export function FunilPage() {
  usePageTitle("Funil");
  const [params, setParams] = useSearchParams();
  const corretor = params.get("corretor") ?? "";
  const q = params.get("q") ?? "";
  const { status, data, error } = useApi<FunilResp>(`/funil${qs({ corretor, q })}`);

  function setCorretor(v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set("corretor", v);
    else next.delete("corretor");
    setParams(next);
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Funil de atendimento"
        subtitle={q ? `Busca: “${q}” · para mudar a etapa, edite a planilha de Leads` : "Para mudar a etapa de um lead, edite a planilha de Leads."}
        actions={
          (data?.corretores.length ?? 0) > 1 && (
          <select
            aria-label="Corretor"
            value={corretor}
            onChange={(e) => setCorretor(e.target.value)}
            className="h-[38px] rounded-[9px] border border-border-strong bg-surface px-3 text-[14px]"
          >
            <option value="">Todos os corretores</option>
            {data?.corretores.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>)
        }
      />
      {!data ? (
        status === "error" ? <LoadError error={error} /> : <Loading />
      ) : (
        <div className={`grid snap-x snap-mandatory grid-cols-[repeat(5,minmax(240px,1fr))] gap-3 overflow-x-auto pb-2 ${status === "loading" ? "opacity-60" : ""}`}>
          {LANES.map((lane) => {
            const col = data.colunas[lane.nome];
            const cards = col?.cards ?? [];
            return (
              <section key={lane.nome} className="flex min-w-0 snap-start flex-col gap-[10px] rounded-[12px] bg-sidebar p-[10px]">
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="flex items-center gap-2 text-[14px] font-semibold">
                    <span className="h-2 w-2 rounded-full" style={{ background: lane.dot }} />
                    {lane.nome}
                  </div>
                  <span className="font-mono text-[12px] text-muted-2">{col?.total ?? 0}</span>
                </div>
                {cards.map((c) => (
                  <Link
                    key={c.lead_id}
                    to={`/leads/${c.lead_id}`}
                    className="flex flex-col gap-[6px] rounded-[10px] border border-border bg-surface p-3 text-ink no-underline hover:border-disabled hover:text-ink"
                  >
                    <div className="text-[14px] font-medium">{c.cliente}</div>
                    <div className="text-[12.5px] text-muted-2">
                      {c.imovel ?? "sem imóvel"}
                      {c.bairro ? ` · ${c.bairro}` : ""}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate text-muted">{c.corretor ?? "—"}</span>
                      <span className={`font-mono ${c.vencido && lane.nome !== "Fechado" ? "text-danger" : "text-subtle"}`}>{dayMonth(c.ultima)}</span>
                    </div>
                  </Link>
                ))}
                {cards.length === 0 && <div className="px-2 py-4 text-center text-[13px] text-muted-2">Nenhum lead nesta etapa</div>}
                {col && col.total > cards.length && (
                  <Link to={`/leads${qs({ etapa: lane.nome, corretor })}`} className="px-2 text-[12.5px] text-ink-3 no-underline">
                    + {col.total - cards.length} na lista →
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
