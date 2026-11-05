import { buttonClass } from "@/components/ui/Button";
import { Card, EmptyState, KpiCard, Notice, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { useFonte } from "@/lib/fontes";
import { dayMonth, money, number } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { usePeriodo } from "@/lib/usePeriodo";

type Resp = {
  periodo: { label: string };
  kpis: { investimento: number; leads: number; fechados: number; campanhas: number; semPeriodo: number };
  origens: { origem: string; contratos: number; vgv: number; leads: number }[];
  campanhas: { nome: string; canal: string | null; leads: number | null; custo: number | null; cpl: number | null; fechados: number | null; inicio: string | null; fim: string | null }[];
};

const CORES = ["#5b5d62", "#808287", "#a2a4a8", "#c0c1c5", "#d9dadd"];

export function MarketingPage() {
  usePageTitle("Marketing");
  const [periodo] = usePeriodo();
  const planilha = useFonte("campanhas");
  const { status, data, error } = useApi<Resp>(`/marketing?periodo=${periodo}`);
  if (!data) return status === "error" ? <LoadError error={error} /> : <Loading />;
  const d = data;
  const inv = Number(d.kpis.investimento);
  const totalContratos = d.origens.reduce((s, o) => s + o.contratos, 0);
  const maxContratos = Math.max(1, ...d.origens.map((o) => o.contratos));

  return (
    <div className={`flex flex-col gap-[18px] ${status === "loading" ? "opacity-60" : ""}`}>
      <PageHeader
        title="Marketing"
        subtitle={`Campanhas e origem dos leads e contratos · ${d.periodo.label}`}
        actions={
          planilha && (
            <a href={planilha} target="_blank" rel="noreferrer" className={buttonClass("primary", "no-underline hover:text-white")}>
              + Campanha na planilha
            </a>
          )
        }
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
        <KpiCard size="md" label="Investimento" value={money(inv)} hint={`${d.kpis.campanhas} campanha(s)`} />
        <KpiCard size="md" label="Custo por lead" value={d.kpis.leads ? money(inv / d.kpis.leads, true) : "—"} hint="investimento ÷ leads" />
        <KpiCard size="md" label="Leads de campanha" value={number(d.kpis.leads)} hint="informados na planilha" />
        <KpiCard size="md" label="Custo por fechamento" value={d.kpis.fechados ? money(inv / d.kpis.fechados) : "—"} hint={`${d.kpis.fechados} negócio(s)`} />
      </div>

      <Card title="Leads e contratos por canal de origem">
        {d.origens.length === 0 ? (
          <EmptyState>Nenhum contrato fechado no período.</EmptyState>
        ) : (
          <div className="flex flex-col gap-[10px]">
            <div className="grid grid-cols-[150px_minmax(0,1fr)_70px_60px] gap-3 text-[12.5px] text-subtle">
              <span>Canal</span>
              <span>Contratos</span>
              <span className="text-right">Leads</span>
              <span className="text-right">Part.</span>
            </div>
            {d.origens.map((o, i) => (
              <div key={o.origem} className="grid grid-cols-[150px_minmax(0,1fr)_70px_60px] items-center gap-3 text-[14px]">
                <span className="truncate text-ink-2">{o.origem}</span>
                <div className="flex items-center gap-2">
                  <div className="h-[14px] flex-1 overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full" style={{ width: `${(o.contratos / maxContratos) * 100}%`, background: CORES[Math.min(i, 4)] }} />
                  </div>
                  <span className="tabular w-8 text-right">{o.contratos}</span>
                </div>
                <span className="tabular text-right text-muted">{o.leads}</span>
                <b className="tabular text-right">{Math.round((o.contratos / totalContratos) * 100)}%</b>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="px-5 py-[14px]">
          <h2 className="m-0 text-[16px] font-semibold">Campanhas</h2>
        </div>
        {d.campanhas.length === 0 ? (
          <EmptyState>Nenhuma campanha no período.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[14px]">
              <thead>
                <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                  <th className="px-5 py-[10px] font-medium">Campanha</th>
                  <th className="px-[10px] py-[10px] font-medium">Canal</th>
                  <th className="px-[10px] py-[10px] font-medium">Período</th>
                  <th className="px-[10px] py-[10px] text-right font-medium">Leads</th>
                  <th className="px-[10px] py-[10px] text-right font-medium">Investimento</th>
                  <th className="px-[10px] py-[10px] text-right font-medium">Custo/lead</th>
                  <th className="px-5 py-[10px] text-right font-medium">Fechados</th>
                </tr>
              </thead>
              <tbody>
                {d.campanhas.map((c) => (
                  <tr key={c.nome} className="border-t border-divider">
                    <td className="px-5 py-3 font-medium">{c.nome}</td>
                    <td className="px-[10px] py-3 text-ink-3">{c.canal ?? "—"}</td>
                    <td className="tabular whitespace-nowrap px-[10px] py-3 text-muted">
                      {c.inicio || c.fim ? `${dayMonth(c.inicio)} a ${dayMonth(c.fim)}` : "sem período"}
                    </td>
                    <td className="tabular px-[10px] py-3 text-right">{c.leads ?? "—"}</td>
                    <td className="tabular px-[10px] py-3 text-right">{c.custo != null ? money(Number(c.custo)) : "—"}</td>
                    <td className="tabular px-[10px] py-3 text-right">{c.cpl != null ? money(Number(c.cpl), true) : "—"}</td>
                    <td className="tabular px-5 py-3 text-right">{c.fechados ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {d.kpis.semPeriodo > 0 && (
        <Notice>
          {d.kpis.semPeriodo} campanha(s) sem início e fim na planilha aparecem em qualquer período. Preencha as colunas “inicio” e “fim” para compará-las mês a
          mês.
        </Notice>
      )}
    </div>
  );
}
