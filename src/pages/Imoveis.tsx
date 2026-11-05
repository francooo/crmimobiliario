import { Link, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { useFonte } from "@/lib/fontes";
import { money, rentMoney } from "@/lib/format";
import { fotoUrl } from "@/lib/imagem";
import { useApi, qs } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

export type ImovelCard = {
  code: string;
  nome: string;
  bairro: string | null;
  tipo: string | null;
  modalidade: string | null;
  preco: number | null;
  status: string | null;
  proprietario: string | null;
  corretor: string | null;
  agenciador: string | null;
  captado_em: string | null;
  fonte: "carteira" | "agenciamento";
  leads: number;
  fotos: number;
  capa: { id: number; hash: string } | null;
};

type Resp = { itens: ImovelCard[]; total: number; pagina: number; porPagina: number; porSituacao: Record<string, number> };

const SITUACOES = [
  { v: "ativos", label: "Ativos" },
  { v: "Disponível", label: "Disponível" },
  { v: "Em negociação", label: "Em negociação" },
  { v: "fechados", label: "Vendidos e locados" },
  { v: "todos", label: "Todos" },
];

export function precoImovel(preco: number | null, modalidade: string | null) {
  if (preco === null || preco === undefined) return "Preço não informado";
  return modalidade === "Locação" ? rentMoney(Number(preco)) : money(Number(preco));
}

export function ImoveisPage() {
  usePageTitle("Imóveis");
  const [params, setParams] = useSearchParams();
  const planilha = useFonte("imoveis");
  const situacao = params.get("situacao") ?? "ativos";
  const modalidade = params.get("modalidade") ?? "";
  const q = params.get("q") ?? "";
  const pagina = Number(params.get("pagina") ?? 1);
  const { status, data, error } = useApi<Resp>(`/imoveis${qs({ situacao, modalidade, q, pagina })}`);

  function set(k: string, v: string) {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== "pagina") next.delete("pagina");
    setParams(next);
  }

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Imóveis"
        subtitle={data ? `${data.porSituacao.todos} imóveis · carteira e captações dos agenciamentos${q ? ` · busca “${q}”` : ""}` : "Carregando…"}
        actions={
          <>
            <select
              aria-label="Modalidade"
              value={modalidade}
              onChange={(e) => set("modalidade", e.target.value)}
              className="h-[38px] rounded-[9px] border border-border-strong bg-surface px-3 text-[14px]"
            >
              <option value="">Venda e locação</option>
              <option value="Venda">Venda</option>
              <option value="Locação">Locação</option>
            </select>
            {planilha && (
              <a href={planilha} target="_blank" rel="noreferrer" className={buttonClass("primary", "no-underline hover:text-white")}>
                + Cadastrar na planilha
              </a>
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {SITUACOES.map((s) => {
          const on = situacao === s.v;
          return (
            <button
              key={s.v}
              type="button"
              onClick={() => set("situacao", s.v === "ativos" ? "" : s.v)}
              className={`inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-[8px] px-3 text-[14px] ${
                on ? "border border-primary bg-primary text-white" : "border border-border-strong bg-surface text-ink-2 hover:bg-row-hover"
              }`}
            >
              {s.label}
              <span className={`font-mono text-[11px] ${on ? "opacity-80" : "text-subtle"}`}>{data?.porSituacao[s.v] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {!data ? (
        status === "error" ? <LoadError error={error} /> : <Loading />
      ) : data.itens.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState>{data.porSituacao.todos === 0 ? "Nenhum imóvel nas planilhas ainda." : "Nenhum imóvel encontrado com os filtros atuais."}</EmptyState>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-[14px] ${status === "loading" ? "opacity-60" : ""}`}>
            {data.itens.map((p) => (
              <Link
                key={p.code}
                to={`/imoveis/${encodeURIComponent(p.code)}`}
                className="flex flex-col overflow-hidden rounded-card border border-border bg-surface text-ink no-underline hover:border-disabled hover:text-ink"
              >
                <div className="relative h-[160px]">
                  {p.capa ? (
                    <img src={fotoUrl(p.capa, true)} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="photo-placeholder grid h-full place-items-center font-mono text-[12px] text-subtle">sem foto</div>
                  )}
                  {p.status && (
                    <span className="absolute left-[10px] top-[10px]">
                      <Badge status={p.status} />
                    </span>
                  )}
                  {p.fotos > 1 && (
                    <span className="absolute bottom-[10px] right-[10px] rounded-[6px] bg-[rgba(22,23,25,.6)] px-2 py-[2px] font-mono text-[11px] text-white">
                      {p.fotos} fotos
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-[6px] p-[14px]">
                  <div className="flex items-start justify-between gap-2">
                    <b className="text-[15px] leading-snug">{p.nome}</b>
                    <span className="shrink-0 font-mono text-[11.5px] text-subtle">{p.code}</span>
                  </div>
                  <div className="text-[13px] text-muted-2">
                    {[p.bairro, p.fonte === "carteira" ? p.proprietario : p.corretor && `capt. ${p.corretor}`].filter(Boolean).join(" · ") || "—"}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className="tabular text-[15px] font-semibold">{precoImovel(p.preco, p.modalidade)}</span>
                    <span className="text-[12.5px] text-muted-2">{p.leads ? `${p.leads} lead${p.leads > 1 ? "s" : ""}` : p.modalidade}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between text-[13px] text-muted-2">
            <span>
              Mostrando {(data.pagina - 1) * data.porPagina + 1}–{Math.min(data.pagina * data.porPagina, data.total)} de {data.total}
            </span>
            <div className="flex gap-2">
              <Button className="h-8" disabled={data.pagina <= 1} onClick={() => set("pagina", String(data.pagina - 1))}>
                Anterior
              </Button>
              <Button className="h-8" disabled={data.pagina >= totalPaginas} onClick={() => set("pagina", String(data.pagina + 1))}>
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
