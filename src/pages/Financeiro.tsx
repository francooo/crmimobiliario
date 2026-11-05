import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card, EmptyState, KpiCard, Notice, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { downloadCsv } from "@/lib/csv";
import { useFonte } from "@/lib/fontes";
import { dayMonth, money, moneyShort } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { usePeriodo } from "@/lib/usePeriodo";

type Resp = {
  periodo: { label: string };
  verVgv: boolean;
  caixa: { entradas: number; saidas: number; lancamentos: number };
  contratos: { vgv: number | null; vendas: number; alugueis: number; locacoes: number; comissoes: number };
  categorias: { categoria: string; tipo: "Entrada" | "Saída"; total: number; n: number }[];
  evolucao: { mes: string; vgv: number | null; alugueis: number; entradas: number; saidas: number }[];
  lancamentos: { entry_id: string; data: string; tipo: string; categoria: string; descricao: string | null; valor: number; status: string | null; contract_id: string | null }[];
};

const BLOCOS = [
  { titulo: "Vendas", prefixo: "vendas" },
  { titulo: "Locações", prefixo: "locacoes" },
  { titulo: "Despesas", prefixo: "despesas" },
];
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const bloco = (categoria: string) => BLOCOS.find((b) => semAcento(categoria).startsWith(b.prefixo))?.titulo ?? "Outros";
const rotulo = (categoria: string) => {
  const r = categoria.replace(/^[^-]+-\s*/, "");
  return r.charAt(0).toUpperCase() + r.slice(1);
};

export function FinanceiroPage() {
  usePageTitle("Financeiro");
  const [periodo] = usePeriodo();
  const planilhaCaixa = useFonte("fluxo_caixa");
  const planilhaContratos = useFonte("contratos");
  const { status, data, error } = useApi<Resp>(`/financeiro?periodo=${periodo}`);
  if (!data) return status === "error" ? <LoadError error={error} /> : <Loading />;
  const d = data;
  const ent = Number(d.caixa.entradas);
  const sai = Number(d.caixa.saidas);
  const grupos = ["Vendas", "Locações", "Despesas", "Outros"]
    .map((t) => ({ titulo: t, itens: d.categorias.filter((c) => bloco(c.categoria) === t) }))
    .filter((g) => g.itens.length || g.titulo !== "Outros");

  function exportar() {
    downloadCsv(
      `fluxo-de-caixa-${new Date().toISOString().slice(0, 10)}.csv`,
      ["codigo", "data", "tipo", "categoria", "descricao", "valor", "situacao", "contrato"],
      d.lancamentos.map((l) => [l.entry_id, l.data, l.tipo, l.categoria, l.descricao, String(l.valor).replace(".", ","), l.status, l.contract_id]),
    );
  }

  return (
    <div className={`flex flex-col gap-[18px] ${status === "loading" ? "opacity-60" : ""}`}>
      <PageHeader
        title="Gestão financeira"
        subtitle={`Vendas, locações e caixa em visões separadas · ${d.periodo.label}`}
        actions={
          <>
            {planilhaContratos && (
              <a href={planilhaContratos} target="_blank" rel="noreferrer" className={buttonClass("secondary", "no-underline")}>
                + Venda / locação
              </a>
            )}
            {planilhaCaixa && (
              <a href={planilhaCaixa} target="_blank" rel="noreferrer" className={buttonClass("primary", "no-underline hover:text-white")}>
                + Entrada / saída
              </a>
            )}
          </>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
        <KpiCard size="md" label="Entradas realizadas" value={moneyShort(ent)} hint="comissões + locações" />
        <KpiCard size="md" label="Saídas realizadas" value={moneyShort(sai)} hint="distribuição, repasses e despesas" />
        <KpiCard size="md" label="Saldo de caixa" value={moneyShort(ent - sai)} hint="entradas menos saídas" />
        {d.verVgv ? (
          <KpiCard size="md" label="VGV de vendas" value={moneyShort(Number(d.contratos.vgv ?? 0))} hint={`${d.contratos.vendas} vendas fechadas`} />
        ) : (
          <KpiCard size="md" label="Contratos fechados" value={String(d.contratos.vendas + d.contratos.locacoes)} hint={`${d.contratos.vendas} vendas · ${d.contratos.locacoes} locações`} />
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[14px]">
        {grupos.map((g) => (
          <Card key={g.titulo} title={g.titulo}>
            <div className="flex flex-col">
              {g.titulo === "Vendas" && d.verVgv && (
                <Linha label="VGV de vendas" nota={`${d.contratos.vendas} contratos de venda`} valor={money(Number(d.contratos.vgv ?? 0))} />
              )}
              {g.titulo === "Locações" && (
                <Linha label="Novos aluguéis contratados" nota={`${d.contratos.locacoes} locações · não soma ao VGV`} valor={money(Number(d.contratos.alugueis))} />
              )}
              {g.itens.map((c) => (
                <Linha
                  key={c.categoria + c.tipo}
                  label={rotulo(c.categoria)}
                  nota={`${c.tipo === "Entrada" ? "entrada" : "saída"} de caixa · ${c.n} lançamento(s)`}
                  valor={money(Number(c.total))}
                  saida={c.tipo === "Saída"}
                />
              ))}
              {g.itens.length === 0 && <div className="py-2 text-[13px] text-muted-2">Nenhum lançamento no período.</div>}
            </div>
          </Card>
        ))}
      </div>

      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="px-5 py-[14px]">
          <h2 className="m-0 text-[16px] font-semibold">Evolução mensal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-[14px]">
            <thead>
              <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                <th className="px-5 py-[10px] font-medium">Mês</th>
                {d.verVgv && <th className="px-[10px] py-[10px] text-right font-medium">VGV vendas</th>}
                <th className="px-[10px] py-[10px] text-right font-medium">Novos aluguéis</th>
                <th className="px-[10px] py-[10px] text-right font-medium">Entradas</th>
                <th className="px-[10px] py-[10px] text-right font-medium">Saídas</th>
                <th className="px-5 py-[10px] text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {d.evolucao.map((m) => {
                const saldo = Number(m.entradas) - Number(m.saidas);
                return (
                  <tr key={m.mes} className="border-t border-divider">
                    <td className="px-5 py-3 font-mono text-[13px]">
                      {m.mes.slice(5)}/{m.mes.slice(0, 4)}
                    </td>
                    {d.verVgv && <td className="tabular px-[10px] py-3 text-right">{money(Number(m.vgv ?? 0))}</td>}
                    <td className="tabular px-[10px] py-3 text-right">{money(Number(m.alugueis))}</td>
                    <td className="tabular px-[10px] py-3 text-right">{money(Number(m.entradas))}</td>
                    <td className="tabular px-[10px] py-3 text-right">{money(Number(m.saidas))}</td>
                    <td className={`tabular px-5 py-3 text-right font-semibold ${saldo < 0 ? "text-danger" : ""}`}>{money(saldo)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 px-5 py-[14px]">
          <h2 className="m-0 text-[16px] font-semibold">
            Lançamentos do período <span className="font-mono text-[12px] font-normal text-subtle">{d.caixa.lancamentos}</span>
          </h2>
          <Button onClick={exportar} disabled={d.lancamentos.length === 0}>
            Exportar CSV
          </Button>
        </div>
        {d.lancamentos.length === 0 ? (
          <EmptyState>Nenhum lançamento no período.</EmptyState>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-[14px]">
              <thead className="sticky top-0">
                <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                  <th className="px-5 py-[10px] font-medium">Data</th>
                  <th className="px-[10px] py-[10px] font-medium">Código</th>
                  <th className="px-[10px] py-[10px] font-medium">Categoria</th>
                  <th className="px-[10px] py-[10px] font-medium">Descrição</th>
                  <th className="px-[10px] py-[10px] text-right font-medium">Valor</th>
                  <th className="px-5 py-[10px] font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {d.lancamentos.map((l) => (
                  <tr key={l.entry_id} className="border-t border-divider">
                    <td className="tabular px-5 py-3 text-muted">{dayMonth(l.data)}</td>
                    <td className="px-[10px] py-3 font-mono text-[12.5px]">{l.entry_id}</td>
                    <td className="px-[10px] py-3 text-ink-3">{l.categoria}</td>
                    <td className="px-[10px] py-3 text-[13px] text-muted">{l.descricao ?? "—"}</td>
                    <td className={`tabular whitespace-nowrap px-[10px] py-3 text-right ${l.tipo === "Saída" ? "text-danger" : "text-positive"}`}>
                      {l.tipo === "Saída" ? "− " : "+ "}
                      {money(Number(l.valor))}
                    </td>
                    <td className="px-5 py-3">{l.status ? <Badge status={l.status} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Notice>Os valores vêm das planilhas de Contratos e Fluxo de caixa. Não há apuração contábil de lucro ou impostos.</Notice>
    </div>
  );
}

function Linha({ label, nota, valor, saida }: { label: string; nota: string; valor: string; saida?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-divider py-[10px] first:border-t-0">
      <div className="flex min-w-0 flex-col">
        <span className="text-[14px] text-ink-2">{label}</span>
        <span className="text-[12.5px] text-subtle">{nota}</span>
      </div>
      <b className={`tabular whitespace-nowrap ${saida ? "text-ink-3" : ""}`}>{valor}</b>
    </div>
  );
}
