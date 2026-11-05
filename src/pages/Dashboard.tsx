import { Link, useNavigate } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Card, EmptyState, KpiCard, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { dayMonth, dayMonthTime, money, moneyShort, number, variacao } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";
import { usePeriodo } from "@/lib/usePeriodo";
import { useApi } from "@/lib/useApi";

type Dashboard = {
  periodo: { label: string };
  captacoes: { venda: number; locacao: number; total: number };
  captacoesAnterior: number;
  contratos: { vendas: number; locacoes: number; vgv: number; comissao: number };
  contratosAnterior: { contratos: number; vgv: number; comissao: number };
  funil: Record<string, number>;
  origens: { origem: string; n: number }[];
  resposta: { media: number | null; n: number };
  respostaSemanas: { semana: string; media: number }[];
  recentes: { lead_id: string; cliente: string; imovel: string | null; bairro: string | null; corretor: string | null; etapa: string; ultima: string | null }[];
  vgvCorretor: { corretor: string; vgv: number; vendas: number }[];
  vencidos: { lead_id: string; cliente: string; imovel: string | null; corretor: string | null; proximo: string }[];
  vencidosTotal: number;
};

const ETAPAS = ["Novo lead", "Contato inicial", "Visita", "Proposta", "Fechado"];
const FUNIL_CORES = ["#c4c5c9", "#a9abb0", "#8e9095", "#74767b", "#4f6a4a"];
const ORIGEM_CORES = ["#5b5d62", "#808287", "#a2a4a8", "#c0c1c5", "#d9dadd"];

export function DashboardPage() {
  usePageTitle("Dashboard");
  const [periodo] = usePeriodo();
  const { status, data, error } = useApi<Dashboard>(`/dashboard?periodo=${periodo}`);
  const navigate = useNavigate();

  if (!data) return status === "error" ? <LoadError error={error} /> : <Loading />;
  const d = data;
  const contratosTotal = d.contratos.vendas + d.contratos.locacoes;

  // Funil: o lead conta em todas as etapas até a atual (REGRAS-DE-NEGOCIO §2)
  const totalLeads = Object.values(d.funil).reduce((a, b) => a + b, 0);
  const perdidos = d.funil["Perdido"] ?? 0;
  const alcancou = ETAPAS.map((_, i) => ETAPAS.slice(i).reduce((s, e) => s + (d.funil[e] ?? 0), 0));
  const totalOrigens = d.origens.reduce((s, o) => s + o.n, 0);
  const maxResp = Math.max(1, ...d.respostaSemanas.map((s) => s.media));
  const maxVgv = Math.max(1, ...d.vgvCorretor.map((v) => v.vgv));

  return (
    <div className={`flex flex-col gap-5 ${status === "loading" ? "opacity-60" : ""}`}>
      <PageHeader title="Painel gerencial" subtitle={`Dados das planilhas · ${d.periodo.label}`} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
        <KpiCard
          label="Captações"
          value={number(d.captacoes.total)}
          trend={variacao(d.captacoes.total, d.captacoesAnterior)}
          hint={`${d.captacoes.venda} para venda · ${d.captacoes.locacao} para locação`}
        />
        <KpiCard
          label="Contratos fechados"
          value={number(contratosTotal)}
          trend={variacao(contratosTotal, d.contratosAnterior.contratos)}
          hint={`${d.contratos.vendas} vendas · ${d.contratos.locacoes} locações`}
        />
        <KpiCard label="VGV de vendas" value={moneyShort(d.contratos.vgv)} trend={variacao(d.contratos.vgv, d.contratosAnterior.vgv)} hint={d.periodo.label} />
        <KpiCard
          label="Comissões"
          value={moneyShort(d.contratos.comissao)}
          trend={variacao(d.contratos.comissao, d.contratosAnterior.comissao)}
          hint="geradas pelos contratos do período"
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[14px]">
        <Card title="Etapas do atendimento">
          {totalLeads === 0 ? (
            <EmptyState>Nenhum lead entrou no período.</EmptyState>
          ) : (
            <>
              <div className="flex flex-col gap-[10px]">
                {ETAPAS.map((e, i) => {
                  const pct = Math.round((alcancou[i]! / totalLeads) * 100);
                  return (
                    <div key={e} className="grid grid-cols-[110px_minmax(0,1fr)_72px] items-center gap-[10px] text-[13.5px]">
                      <span className="text-ink-3">{e}</span>
                      <div className="h-[22px] overflow-hidden rounded-[5px] bg-track">
                        <div className="h-full rounded-[5px]" style={{ width: `${pct}%`, background: FUNIL_CORES[i] }} />
                      </div>
                      <span className="tabular text-right">
                        <b>{alcancou[i]}</b> <span className="text-[#8d9096]">{pct}%</span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[13px] text-muted-2">
                {totalLeads} leads no período{perdidos ? ` · ${perdidos} perdido(s)` : ""}. O lead conta em todas as etapas até a atual.
              </div>
            </>
          )}
        </Card>

        <Card title="Origem dos contratos fechados">
          {totalOrigens === 0 ? (
            <EmptyState>Nenhum contrato fechado no período.</EmptyState>
          ) : (
            <>
              <div className="flex h-[14px] gap-[2px] overflow-hidden rounded-[7px]">
                {d.origens.map((o, i) => (
                  <div key={o.origem} style={{ width: `${(o.n / totalOrigens) * 100}%`, background: ORIGEM_CORES[Math.min(i, 4)] }} />
                ))}
              </div>
              <div className="flex flex-col gap-[10px]">
                {d.origens.map((o, i) => (
                  <div key={o.origem} className="flex items-center gap-[10px] text-[14px]">
                    <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: ORIGEM_CORES[Math.min(i, 4)] }} />
                    <span className="flex-1 text-ink-2">{o.origem}</span>
                    <span className="tabular text-muted-2">{o.n}</span>
                    <b className="tabular w-10 text-right">{Math.round((o.n / totalOrigens) * 100)}%</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card
          title="Tempo médio de resposta"
          action={
            d.resposta.n > 0 ? (
              <span className="rounded-chip bg-success-bg px-2 py-1 text-[12px] text-positive">{d.resposta.n} atendimentos</span>
            ) : null
          }
        >
          {d.resposta.media === null ? (
            <EmptyState>Nenhum atendimento com tempo de resposta no período.</EmptyState>
          ) : (
            <>
              <div className="flex items-baseline gap-[6px]">
                <span className="tabular text-[44px] font-semibold leading-none tracking-[-1.4px]">
                  {String(d.resposta.media).replace(".", ",")}
                </span>
                <span className="text-[16px] text-muted-2">min</span>
              </div>
              <div className="flex h-[120px] items-end gap-[10px] border-b border-border">
                {d.respostaSemanas.map((s) => (
                  <div key={s.semana} className="flex h-full flex-1 flex-col items-center justify-end gap-[6px]">
                    <span className="tabular text-[12px] text-muted">{String(s.media).replace(".", ",")} min</span>
                    <div className="w-full max-w-[34px] rounded-t-[4px] bg-[#a9abb0]" style={{ height: `${(s.media / maxResp) * 80}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-[10px] font-mono text-[11px] text-subtle">
                {d.respostaSemanas.map((s) => (
                  <span key={s.semana} className="flex-1 text-center">
                    sem. {dayMonth(s.semana)}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)] gap-[14px] max-xl:grid-cols-1">
        <section className="min-w-0 overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between px-5 py-[18px]">
            <h2 className="m-0 text-[16px] font-semibold">Atendimentos recentes</h2>
            <Link to="/leads" className="text-[13px] text-ink-3 no-underline">
              Ver todos →
            </Link>
          </div>
          {d.recentes.length === 0 ? (
            <EmptyState>Nenhum lead cadastrado ainda.</EmptyState>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[600px] border-collapse text-[14px]">
                <thead>
                  <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                    <th className="px-5 py-[10px] font-medium">Cliente</th>
                    <th className="px-[10px] py-[10px] font-medium">Imóvel</th>
                    <th className="px-[10px] py-[10px] font-medium">Corretor</th>
                    <th className="px-[10px] py-[10px] font-medium">Etapa</th>
                    <th className="px-5 py-[10px] font-medium">Última interação</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentes.map((l) => (
                    <tr key={l.lead_id} onClick={() => navigate(`/leads/${l.lead_id}`)} className="cursor-pointer border-t border-divider hover:bg-row-hover">
                      <td className="whitespace-nowrap px-5 py-3 font-medium">{l.cliente}</td>
                      <td className="whitespace-nowrap px-[10px] py-3">
                        {l.imovel ?? "—"}
                        {l.bairro && <div className="text-[12.5px] text-subtle">{l.bairro}</div>}
                      </td>
                      <td className="whitespace-nowrap px-[10px] py-3 text-ink-3">{l.corretor ?? "—"}</td>
                      <td className="px-[10px] py-3">
                        <Badge status={l.etapa} />
                      </td>
                      <td className="tabular whitespace-nowrap px-5 py-3 text-muted">{dayMonthTime(l.ultima)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-[14px]">
          <Card title={`VGV por corretor · ${d.periodo.label}`}>
            {d.vgvCorretor.length === 0 ? (
              <EmptyState>Nenhuma venda no período.</EmptyState>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {d.vgvCorretor.map((v) => (
                  <div key={v.corretor} className="grid grid-cols-[120px_minmax(0,1fr)_80px] items-center gap-[10px] text-[13.5px]">
                    <span className="truncate text-ink-3">{v.corretor}</span>
                    <div className="h-[10px] overflow-hidden rounded-full bg-track">
                      <div className="h-full rounded-full bg-chart-1" style={{ width: `${(v.vgv / maxVgv) * 100}%` }} />
                    </div>
                    <b className="tabular text-right" title={money(v.vgv)}>
                      {moneyShort(v.vgv).replace("R$ ", "")}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Próximo contato vencido"
            action={
              d.vencidosTotal > 0 ? (
                <span className="rounded-chip bg-danger-bg px-2 py-1 text-[12px] text-danger">{d.vencidosTotal}</span>
              ) : null
            }
          >
            {d.vencidos.length === 0 ? (
              <EmptyState>Nenhum contato vencido.</EmptyState>
            ) : (
              <div className="flex flex-col">
                {d.vencidos.map((r) => (
                  <Link
                    key={r.lead_id}
                    to={`/leads/${r.lead_id}`}
                    className="flex items-center justify-between gap-3 border-t border-divider py-[10px] text-ink no-underline first:border-t-0"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium">{r.cliente}</div>
                      <div className="truncate text-[12.5px] text-subtle">
                        {r.imovel ?? "sem imóvel"} · {r.corretor ?? "sem corretor"}
                      </div>
                    </div>
                    <Badge status="Vencido">Vencido {dayMonth(r.proximo)}</Badge>
                  </Link>
                ))}
                {d.vencidosTotal > d.vencidos.length && (
                  <Link to="/leads?vencidos=1" className="pt-2 text-[13px] text-ink-3 no-underline">
                    Ver todos os {d.vencidosTotal} →
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
