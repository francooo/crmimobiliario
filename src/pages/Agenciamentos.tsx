import { useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card, EmptyState, KpiCard, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { useFonte } from "@/lib/fontes";
import { dayMonth, number, variacao } from "@/lib/format";
import { useApi, qs } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { usePeriodo } from "@/lib/usePeriodo";
import { precoImovel } from "./Imoveis";

type Resp = {
  periodo: { label: string; meses: number };
  kpis: { total: number; venda: number; locacao: number; disponiveis: number; anterior: number };
  historico: { mes: string; venda: number; locacao: number }[];
  roleta: { inicio: string; fim: string; meta: number; corretores: { nome: string; n: number }[] };
  itens: {
    agenciamento_id: string;
    codigo_imovel: string | null;
    data: string;
    modalidade: string;
    corretor: string | null;
    agenciador: string | null;
    imovel: string | null;
    bairro: string | null;
    valor_anuncio: number | null;
    status: string | null;
  }[];
  total: number;
  pagina: number;
  porPagina: number;
  corretores: string[];
};

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function AgenciamentosPage() {
  usePageTitle("Agenciamentos");
  const [periodo] = usePeriodo();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const planilha = useFonte("agenciamentos");
  const f = { corretor: params.get("corretor") ?? "", modalidade: params.get("modalidade") ?? "", q: params.get("q") ?? "" };
  const pagina = Number(params.get("pagina") ?? 1);
  const { status, data, error } = useApi<Resp>(`/agenciamentos${qs({ periodo, ...f, pagina })}`);

  function set(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "pagina") next.delete("pagina");
    setParams(next);
  }

  if (!data) return status === "error" ? <LoadError error={error} /> : <Loading />;
  const d = data;
  const maxMes = Math.max(1, ...d.historico.map((h) => h.venda + h.locacao));
  const totalPaginas = Math.max(1, Math.ceil(d.total / d.porPagina));
  const atingiram = d.roleta.corretores.filter((c) => c.n >= d.roleta.meta).length;

  return (
    <div className={`flex flex-col gap-[18px] ${status === "loading" ? "opacity-60" : ""}`}>
      <PageHeader
        title="Agenciamentos e captação"
        subtitle={`Novos imóveis captados por corretor e agenciador · ${d.periodo.label}`}
        actions={
          planilha && (
            <a href={planilha} target="_blank" rel="noreferrer" className={buttonClass("primary", "no-underline hover:text-white")}>
              + Novo agenciamento na planilha
            </a>
          )
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
        <KpiCard label="Novas captações" value={number(d.kpis.total)} trend={variacao(d.kpis.total, d.kpis.anterior)} hint={`período anterior: ${d.kpis.anterior}`} />
        <KpiCard label="Captações de venda" value={number(d.kpis.venda)} hint="novos imóveis no período" />
        <KpiCard label="Captações de locação" value={number(d.kpis.locacao)} hint="novos imóveis no período" />
        {d.periodo.meses === 1 ? (
          <KpiCard label="Ainda disponíveis" value={number(d.kpis.disponiveis)} hint="das captações do período" />
        ) : (
          <KpiCard label="Média mensal" value={number(Math.round(d.kpis.total / d.periodo.meses))} hint="captações por mês" />
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-[14px]">
        <Card
          title="Captações nos últimos 6 meses"
          action={
            <div className="flex gap-3 text-[12.5px] text-muted-2">
              <span className="flex items-center gap-1">
                <span className="h-[10px] w-[10px] rounded-[3px] bg-chart-1" />
                Venda
              </span>
              <span className="flex items-center gap-1">
                <span className="h-[10px] w-[10px] rounded-[3px] bg-chart-4" />
                Locação
              </span>
            </div>
          }
        >
          <div className="flex flex-col gap-[10px]">
            {d.historico.map((h) => (
              <div key={h.mes} className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-[10px] text-[13.5px]">
                <span className="font-mono text-[12px] text-muted">
                  {MES[Number(h.mes.slice(5)) - 1]}/{h.mes.slice(2, 4)}
                </span>
                <div className="flex h-[18px] overflow-hidden rounded-[5px] bg-track">
                  <div className="h-full bg-chart-1" style={{ width: `${(h.venda / maxMes) * 100}%` }} />
                  <div className="h-full bg-chart-4" style={{ width: `${(h.locacao / maxMes) * 100}%` }} />
                </div>
                <span className="tabular text-right">
                  <b>{h.venda}</b> <span className="text-[#8d9096]">/ {h.locacao}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Meta semanal da roleta de leads"
          action={<span className="rounded-chip bg-success-bg px-2 py-1 text-[12px] text-positive">{atingiram} na roleta</span>}
        >
          <div className="text-[13px] text-muted-2">
            Referência: {d.roleta.meta} captações de venda na semana anterior ({dayMonth(d.roleta.inicio)} a {dayMonth(d.roleta.fim)}) para participar da
            distribuição.
          </div>
          {d.roleta.corretores.length === 0 ? (
            <EmptyState>Nenhum corretor cadastrado ou com captações recentes.</EmptyState>
          ) : (
            <div className="flex flex-col gap-2">
              {d.roleta.corretores.map((c) => {
                const ok = c.n >= d.roleta.meta;
                return (
                  <div key={c.nome} className="grid grid-cols-[minmax(0,1fr)_auto_96px] items-center gap-3 text-[13.5px]">
                    <span className="truncate text-ink-2">{c.nome}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: d.roleta.meta }, (_, i) => (
                        <span key={i} className="h-[10px] w-[10px] rounded-full" style={{ background: i < c.n ? (ok ? "#5f7a5a" : "#a9abb0") : "#efeff1" }} />
                      ))}
                    </div>
                    <span className={`text-right text-[12.5px] font-medium ${ok ? "text-positive" : "text-danger"}`}>
                      {ok ? `Atingiu (${c.n})` : `Faltam ${d.roleta.meta - c.n}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-[14px]">
          <h2 className="m-0 text-[16px] font-semibold">
            Novos imóveis captados <span className="font-mono text-[12px] font-normal text-subtle">{d.total}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {d.corretores.length > 1 && (
              <select aria-label="Corretor" value={f.corretor} onChange={(e) => set("corretor", e.target.value)} className="h-[34px] rounded-[8px] border border-border-strong bg-surface px-2 text-[14px]">
                <option value="">Todos os corretores</option>
                {d.corretores.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <select aria-label="Modalidade" value={f.modalidade} onChange={(e) => set("modalidade", e.target.value)} className="h-[34px] rounded-[8px] border border-border-strong bg-surface px-2 text-[14px]">
              <option value="">Venda e locação</option>
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[14px]">
            <thead>
              <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                <th className="px-5 py-[10px] font-medium">Data</th>
                <th className="px-[10px] py-[10px] font-medium">Código</th>
                <th className="px-[10px] py-[10px] font-medium">Imóvel</th>
                <th className="px-[10px] py-[10px] font-medium">Modalidade</th>
                <th className="px-[10px] py-[10px] font-medium">Corretor</th>
                <th className="px-[10px] py-[10px] font-medium">Agenciador</th>
                <th className="px-[10px] py-[10px] text-right font-medium">Valor</th>
                <th className="px-5 py-[10px] font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {d.itens.map((r) => (
                <tr
                  key={r.agenciamento_id}
                  onClick={() => r.codigo_imovel && navigate(`/imoveis/${encodeURIComponent(r.codigo_imovel)}`)}
                  className={`border-t border-divider hover:bg-row-hover ${r.codigo_imovel ? "cursor-pointer" : ""}`}
                >
                  <td className="tabular whitespace-nowrap px-5 py-3 text-muted">{dayMonth(r.data)}</td>
                  <td className="whitespace-nowrap px-[10px] py-3 font-mono text-[12.5px]">{r.codigo_imovel ?? r.agenciamento_id}</td>
                  <td className="px-[10px] py-3">
                    {r.imovel ?? "—"}
                    {r.bairro && <div className="text-[12.5px] text-subtle">{r.bairro}</div>}
                  </td>
                  <td className="px-[10px] py-3 text-ink-3">{r.modalidade}</td>
                  <td className="whitespace-nowrap px-[10px] py-3 text-ink-3">{r.corretor ?? "—"}</td>
                  <td className="whitespace-nowrap px-[10px] py-3 text-ink-3">{r.agenciador ?? "—"}</td>
                  <td className="tabular whitespace-nowrap px-[10px] py-3 text-right">{precoImovel(r.valor_anuncio, r.modalidade)}</td>
                  <td className="px-5 py-3">{r.status ? <Badge status={r.status} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.itens.length === 0 && <EmptyState>Nenhuma captação no período com os filtros atuais.</EmptyState>}
        {d.total > d.porPagina && (
          <div className="flex items-center justify-between border-t border-divider px-5 py-3 text-[13px] text-muted-2">
            <span>
              Mostrando {(d.pagina - 1) * d.porPagina + 1}–{Math.min(d.pagina * d.porPagina, d.total)} de {d.total}
            </span>
            <div className="flex gap-2">
              <Button className="h-8" disabled={d.pagina <= 1} onClick={() => set("pagina", String(d.pagina - 1))}>
                Anterior
              </Button>
              <Button className="h-8" disabled={d.pagina >= totalPaginas} onClick={() => set("pagina", String(d.pagina + 1))}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
