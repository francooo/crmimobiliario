import { buttonClass } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Notice, PageHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Misc";
import { Loading, LoadError } from "@/components/ui/States";
import { useFonte } from "@/lib/fontes";
import { money, moneyShort } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { usePeriodo } from "@/lib/usePeriodo";
import { ROLE_NAME, type Role } from "../../shared/permissions";

type Agente = {
  nome: string;
  funcao: string | null;
  captacoes: number;
  leads: number;
  vendas: number;
  locacoes: number;
  vgv: number | null;
  comissao: number | null;
  participacao: number;
};
type Cad = {
  nome: string;
  funcao: string | null;
  perfil: Role | null;
  ativo: boolean | null;
  acesso: boolean;
  aparece: string;
  situacao: string;
  sugestao: string | null;
};
type Resp = { periodo: { label: string }; verValores: boolean; vgvTotal: number | null; agentes: Agente[]; cadastro: Cad[]; cadastroVazio: boolean };

const SITUACAO_COR: Record<string, string> = {
  Vinculado: "Fechado",
  "Não cadastrado": "Perdido",
  "Sem registros nas planilhas": "Contato inicial",
  Inativo: "Vendido",
};

export function CorretoresPage() {
  usePageTitle("Corretores");
  const [periodo] = usePeriodo();
  const planilha = useFonte("corretores");
  const { status, data, error } = useApi<Resp>(`/corretores?periodo=${periodo}`);

  if (!data) return status === "error" ? <LoadError error={error} /> : <Loading />;
  const d = data;
  const ranking = d.agentes.filter((a) => a.vendas + a.locacoes > 0);

  return (
    <div className={`flex flex-col gap-[18px] ${status === "loading" ? "opacity-60" : ""}`}>
      <PageHeader
        title="Corretores"
        subtitle={`Captações, leads e contratos fechados · ${d.periodo.label}`}
        actions={
          planilha && (
            <a href={planilha} target="_blank" rel="noreferrer" className={buttonClass("primary", "no-underline hover:text-white")}>
              + Cadastrar na planilha
            </a>
          )
        }
      />

      {d.agentes.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState>Nenhuma captação, lead ou contrato no período.</EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-[14px]">
          {d.agentes.map((a) => (
            <div key={a.nome} className="flex flex-col gap-[14px] rounded-card border border-border bg-surface p-[18px]">
              <div className="flex items-center gap-3">
                <Avatar name={a.nome} size={40} />
                <div className="flex min-w-0 flex-col">
                  <b className="truncate text-[15px]">{a.nome}</b>
                  <span className="text-[12.5px] text-muted-2">{a.funcao ?? (a.vendas ? "Vendas" : a.locacoes ? "Locações" : "Captação")}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                <Num label="Captações" v={a.captacoes} />
                <Num label="Leads" v={a.leads} />
                <Num label="Vendas" v={a.vendas} />
                <Num label="Locações" v={a.locacoes} />
              </div>
              {d.verValores && (
                <div className="flex flex-col gap-[6px] border-t border-divider pt-3">
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-muted-2">Participação no VGV</span>
                    <span className="tabular font-medium">{String(a.participacao).replace(".", ",")}%</span>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.min(100, a.participacao)}%` }} />
                  </div>
                  <div className="flex justify-between text-[12.5px] text-muted-2">
                    <span>VGV {moneyShort(a.vgv ?? 0)}</span>
                    <span>Comissão {moneyShort(a.comissao ?? 0)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {d.verValores && (
        <section className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="px-5 py-[14px]">
            <h2 className="m-0 text-[16px] font-semibold">Ranking por VGV · {d.periodo.label}</h2>
          </div>
          {ranking.length === 0 ? (
            <EmptyState>Nenhum contrato fechado no período.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[14px]">
                <thead>
                  <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                    <th className="px-5 py-[10px] font-medium">#</th>
                    <th className="px-[10px] py-[10px] font-medium">Corretor</th>
                    <th className="px-[10px] py-[10px] text-right font-medium">Vendas</th>
                    <th className="px-[10px] py-[10px] text-right font-medium">Locações</th>
                    <th className="px-[10px] py-[10px] text-right font-medium">VGV vendido</th>
                    <th className="px-5 py-[10px] text-right font-medium">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((a, i) => (
                    <tr key={a.nome} className="border-t border-divider hover:bg-row-hover">
                      <td className="px-5 py-3 font-mono text-[12.5px] text-subtle">{String(i + 1).padStart(2, "0")}</td>
                      <td className="px-[10px] py-3 font-medium">{a.nome}</td>
                      <td className="tabular px-[10px] py-3 text-right">{a.vendas}</td>
                      <td className="tabular px-[10px] py-3 text-right">{a.locacoes}</td>
                      <td className="tabular px-[10px] py-3 text-right">{a.vgv ? money(Number(a.vgv)) : "—"}</td>
                      <td className="tabular px-5 py-3 text-right">{money(Number(a.comissao ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex flex-col gap-1 px-5 py-[14px]">
          <h2 className="m-0 text-[16px] font-semibold">Cadastro de corretores e agenciadores</h2>
          <div className="text-[13px] text-muted-2">
            Nomes da planilha Corretores e os que aparecem nas outras planilhas. Os registros só se ligam ao corretor quando o nome está cadastrado.
          </div>
        </div>
        {d.cadastroVazio && (
          <div className="px-5 pb-3">
            <Notice>
              A planilha de Corretores ainda não foi ligada ao sistema. Até lá, só os e-mails administradores entram e os nomes abaixo não podem ser
              conferidos.
            </Notice>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[14px]">
            <thead>
              <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                <th className="px-5 py-[10px] font-medium">Nome</th>
                <th className="px-[10px] py-[10px] font-medium">Função · perfil</th>
                <th className="px-[10px] py-[10px] font-medium">Acesso</th>
                <th className="px-[10px] py-[10px] font-medium">Aparece em</th>
                <th className="px-5 py-[10px] font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {d.cadastro.map((p) => (
                <tr key={`${p.nome}-${p.situacao}`} className="border-t border-divider">
                  <td className="whitespace-nowrap px-5 py-3 font-medium">{p.nome}</td>
                  <td className="px-[10px] py-3 text-ink-3">{[p.funcao, p.perfil && ROLE_NAME[p.perfil]].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-[10px] py-3 text-ink-3">{p.acesso ? "Login liberado" : "—"}</td>
                  <td className="px-[10px] py-3 text-[13px] text-muted">{p.aparece}</td>
                  <td className="px-5 py-3">
                    <Badge status={SITUACAO_COR[p.situacao] ?? "Contato inicial"}>{p.situacao}</Badge>
                    {p.sugestao && <div className="mt-1 text-[12px] text-notice-fg">Parecido com “{p.sugestao}”</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.cadastro.length === 0 && <EmptyState>Nenhum corretor encontrado nas planilhas.</EmptyState>}
      </section>
    </div>
  );
}

function Num({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[12px] text-subtle">{label}</span>
      <b className="tabular text-[17px]">{v}</b>
    </div>
  );
}
