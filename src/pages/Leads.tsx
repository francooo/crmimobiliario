import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { useFonte } from "@/lib/fontes";
import { dayMonth, dayMonthTime, phone } from "@/lib/format";
import { useApi, qs } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

export type LeadItem = {
  lead_id: string;
  cliente: string;
  telefone: string;
  imovel: string | null;
  bairro: string | null;
  origem: string | null;
  corretor: string | null;
  etapa: string;
  proximo: string | null;
  vencido: boolean | null;
  ultima: string | null;
};

type LeadsResp = {
  itens: LeadItem[];
  total: number;
  pagina: number;
  porPagina: number;
  porEtapa: Record<string, number>;
  totalBase: number;
  corretores: string[];
  origens: string[];
};

const ETAPAS = ["Novo lead", "Contato inicial", "Visita", "Proposta", "Fechado", "Perdido"];

export function LeadsPage() {
  usePageTitle("Leads");
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const planilha = useFonte("leads");
  const [exportando, setExportando] = useState(false);

  const filtros = {
    etapa: params.get("etapa") ?? "",
    corretor: params.get("corretor") ?? "",
    origem: params.get("origem") ?? "",
    q: params.get("q") ?? "",
    vencidos: params.get("vencidos") ?? "",
  };
  const pagina = Number(params.get("pagina") ?? 1);
  const { status, data, error } = useApi<LeadsResp>(`/leads${qs({ ...filtros, pagina })}`);

  function setFiltro(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete("pagina");
    setParams(next);
  }
  function limpar() {
    const next = new URLSearchParams();
    const periodo = params.get("periodo");
    if (periodo) next.set("periodo", periodo);
    setParams(next);
  }
  function irPagina(p: number) {
    const next = new URLSearchParams(params);
    next.set("pagina", String(p));
    setParams(next);
  }

  async function exportar() {
    setExportando(true);
    try {
      const all = await api<LeadsResp>(`/leads${qs({ ...filtros, todos: 1 })}`);
      downloadCsv(
        `leads-${new Date().toISOString().slice(0, 10)}.csv`,
        ["codigo", "cliente", "telefone", "imovel", "bairro", "origem", "corretor", "etapa", "proximo_contato", "ultima_interacao"],
        all.itens.map((l) => [l.lead_id, l.cliente, l.telefone, l.imovel, l.bairro, l.origem, l.corretor, l.etapa, l.proximo, l.ultima]),
      );
    } finally {
      setExportando(false);
    }
  }

  const temFiltros = Object.values(filtros).some(Boolean);
  const d = data;
  const totalPaginas = d ? Math.max(1, Math.ceil(d.total / d.porPagina)) : 1;

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Leads"
        subtitle={d ? `${d.totalBase} leads${filtros.q ? ` para “${filtros.q}”` : ""} · dados da planilha de Leads` : "Carregando…"}
        actions={
          <>
            <Button onClick={exportar} disabled={!d || d.total === 0 || exportando}>
              {exportando ? "Exportando…" : "Exportar CSV"}
            </Button>
            {planilha && (
              <a href={planilha} target="_blank" rel="noreferrer" className={buttonClass("primary", "no-underline hover:text-white")}>
                + Novo lead na planilha
              </a>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {["", ...ETAPAS].map((e) => {
          const on = filtros.etapa === e;
          const n = e === "" ? d?.totalBase : d?.porEtapa[e];
          return (
            <button
              key={e || "todas"}
              type="button"
              onClick={() => setFiltro("etapa", e)}
              className={`inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[8px] px-3 text-[14px] ${
                on ? "border border-primary bg-primary text-white" : "border border-border-strong bg-surface text-ink-2 hover:bg-row-hover"
              }`}
            >
              {e || "Todas"}
              <span className={`font-mono text-[11px] ${on ? "opacity-80" : "text-subtle"}`}>{n ?? 0}</span>
            </button>
          );
        })}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(d?.corretores.length ?? 0) > 1 && (
          <select
            aria-label="Corretor"
            value={filtros.corretor}
            onChange={(e) => setFiltro("corretor", e.target.value)}
            className="h-[34px] rounded-[8px] border border-border-strong bg-surface px-2 text-[14px]"
          >
            <option value="">Todos os corretores</option>
            {d?.corretores.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>)}
          <select
            aria-label="Origem"
            value={filtros.origem}
            onChange={(e) => setFiltro("origem", e.target.value)}
            className="h-[34px] rounded-[8px] border border-border-strong bg-surface px-2 text-[14px]"
          >
            <option value="">Todas as origens</option>
            {d?.origens.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <label className="flex h-[34px] cursor-pointer items-center gap-2 rounded-[8px] border border-border-strong bg-surface px-3 text-[14px]">
            <input type="checkbox" checked={filtros.vencidos === "1"} onChange={(e) => setFiltro("vencidos", e.target.checked ? "1" : "")} />
            Contato vencido
          </label>
          {temFiltros && (
            <Button variant="ghost" onClick={limpar} className="h-[34px]">
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {!d ? (
        status === "error" ? <LoadError error={error} /> : <Loading />
      ) : (
        <div className={`overflow-hidden rounded-card border border-border bg-surface ${status === "loading" ? "opacity-60" : ""}`}>
          {/* Celular: cartões (mais fáceis de ler e tocar que a tabela) */}
          <div className="flex flex-col md:hidden">
            {d.itens.map((l) => (
              <button
                key={l.lead_id}
                type="button"
                onClick={() => navigate(`/leads/${l.lead_id}`)}
                className="flex cursor-pointer flex-col gap-[6px] border-0 border-t border-divider bg-transparent px-4 py-3 text-left first:border-t-0 hover:bg-row-hover"
              >
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[15px]">{l.cliente}</b>
                  <Badge status={l.etapa} />
                </div>
                <div className="text-[13px] text-muted-2">
                  {[l.imovel, l.bairro, l.corretor].filter(Boolean).join(" · ") || "—"}
                </div>
                <div className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="font-mono text-subtle">{phone(l.telefone)}</span>
                  <span className={l.vencido ? "font-medium text-danger" : "text-muted"}>
                    {l.proximo ? `próx. ${dayMonth(l.proximo)}${l.vencido ? " · vencido" : ""}` : dayMonthTime(l.ultima)}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="bg-surface-muted text-left text-[12.5px] text-muted">
                  <th className="px-5 py-[10px] font-medium">Cliente</th>
                  <th className="px-[10px] py-[10px] font-medium">Imóvel</th>
                  <th className="px-[10px] py-[10px] font-medium">Origem</th>
                  <th className="px-[10px] py-[10px] font-medium">Corretor</th>
                  <th className="px-[10px] py-[10px] font-medium">Etapa</th>
                  <th className="px-[10px] py-[10px] font-medium">Próximo contato</th>
                  <th className="px-5 py-[10px] font-medium">Última interação</th>
                </tr>
              </thead>
              <tbody>
                {d.itens.map((l) => (
                  <tr key={l.lead_id} onClick={() => navigate(`/leads/${l.lead_id}`)} className="cursor-pointer border-t border-divider hover:bg-row-hover">
                    <td className="px-5 py-3">
                      <div className="font-medium">{l.cliente}</div>
                      <div className="font-mono text-[12px] text-subtle">{phone(l.telefone)}</div>
                    </td>
                    <td className="px-[10px] py-3">
                      {l.imovel ?? "—"}
                      {l.bairro && <div className="text-[12.5px] text-subtle">{l.bairro}</div>}
                    </td>
                    <td className="px-[10px] py-3 text-ink-3">{l.origem ?? "—"}</td>
                    <td className="px-[10px] py-3 text-ink-3">{l.corretor ?? "—"}</td>
                    <td className="px-[10px] py-3">
                      <Badge status={l.etapa} />
                    </td>
                    <td className={`tabular whitespace-nowrap px-[10px] py-3 ${l.vencido ? "font-medium text-danger" : "text-muted"}`}>
                      {l.proximo ? `${dayMonth(l.proximo)}${l.vencido ? " · vencido" : ""}` : "—"}
                    </td>
                    <td className="tabular whitespace-nowrap px-5 py-3 text-muted">{dayMonthTime(l.ultima)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.itens.length === 0 && (
            <EmptyState>{d.totalBase === 0 && !temFiltros ? "Nenhum lead na planilha ainda." : "Nenhum lead encontrado com os filtros atuais."}</EmptyState>
          )}
          {d.total > 0 && (
            <div className="flex items-center justify-between border-t border-divider px-5 py-3 text-[13px] text-muted-2">
              <span>
                Mostrando {(d.pagina - 1) * d.porPagina + 1}–{Math.min(d.pagina * d.porPagina, d.total)} de {d.total}
              </span>
              <div className="flex gap-2">
                <Button className="h-8" disabled={d.pagina <= 1} onClick={() => irPagina(d.pagina - 1)}>
                  Anterior
                </Button>
                <Button className="h-8" disabled={d.pagina >= totalPaginas} onClick={() => irPagina(d.pagina + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
