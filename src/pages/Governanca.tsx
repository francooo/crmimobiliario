import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { downloadCsv } from "@/lib/csv";
import { dayMonthTime } from "@/lib/format";
import { MODULES } from "@/lib/nav";
import { useApi, qs } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { can, canAccess, OPERATION_LABEL, ROLE_NAME, ROLES, type ModuleKey, type Operation } from "../../shared/permissions";

type Evento = { id: number; em: string; usuario: string; acao: string; registro: string | null; detalhe: string | null };
type Resp = { perfis: Record<string, number>; admins: number; corretoresCadastrados: number; verHistorico: boolean; historico: Evento[] | null };

const DESC: Record<string, string> = {
  socio: "Todos os módulos, indicadores consolidados (VGV e caixa) e configuração de acesso.",
  locacoes: "Operação comercial e de locação; sem valores financeiros globais.",
  admin: "Agenciamentos, financeiro (sem VGV), sincronização e governança.",
  corretor: "Os próprios leads, funil, imóveis (com fotos) e agenciamentos.",
};

const ACAO: Record<string, string> = {
  login: "Entrou no sistema",
  login_negado: "Acesso negado",
  sincronizacao: "Sincronização",
  sincronizacao_erro: "Erro na sincronização",
  sincronizacao_bloqueada: "Sincronização bloqueada",
  sincronizacao_solicitada: "Pediu sincronização",
  foto_enviada: "Enviou foto",
  foto_excluida: "Excluiu foto",
  vinculo_manual: "Vinculou registro",
  vinculo_removido: "Removeu vínculo",
  limpeza_espelho: "Limpeza do espelho",
};

export function GovernancaPage() {
  usePageTitle("Governança");
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const { status, data, error } = useApi<Resp>(`/governanca${qs({ q })}`);
  if (!data) return status === "error" ? <LoadError error={error} /> : <Loading />;
  const d = data;
  const modulos = Object.keys(MODULES) as ModuleKey[];

  async function exportar() {
    const all = await api<Resp>(`/governanca${qs({ q, todos: 1 })}`);
    downloadCsv(
      `historico-${new Date().toISOString().slice(0, 10)}.csv`,
      ["data_hora", "usuario", "acao", "registro", "detalhe"],
      (all.historico ?? []).map((h) => [h.em, h.usuario, ACAO[h.acao] ?? h.acao, h.registro, h.detalhe]),
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader title="Administração e governança" subtitle="Perfis de acesso, permissões e histórico de alterações" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px]">
        {ROLES.map((r) => {
          const n = (d.perfis[r] ?? 0) + (r === "socio" ? d.admins : 0);
          return (
            <div key={r} className={`flex flex-col gap-2 rounded-card border bg-surface p-[18px] ${user?.role === r ? "border-primary" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2">
                <b className="text-[15px]">{ROLE_NAME[r]}</b>
                <span className="font-mono text-[11.5px] text-subtle">
                  {n} usuário{n === 1 ? "" : "s"}
                </span>
              </div>
              <span className="text-[13px] text-muted-2">{DESC[r]}</span>
              {user?.role === r && <span className="text-[12px] font-medium text-positive">Seu perfil</span>}
            </div>
          );
        })}
      </div>
      <div className="-mt-2 text-[12.5px] text-muted-2">
        Os perfis vêm da coluna “perfil” da planilha de Corretores ({d.corretoresCadastrados} cadastrados). Para mudar o acesso de alguém, edite a planilha — vale
        em até 1 minuto após a sincronização.
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-[14px]">
        <Card title="Matriz de permissões">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="py-2 pr-2 font-medium">Operação</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-2 py-2 text-center font-medium">
                      {ROLE_NAME[r].split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* "Aprovar dados financeiros" não se aplica: os dados das planilhas entram direto (decisão do projeto) */}
                {(Object.keys(OPERATION_LABEL) as Operation[]).filter((op) => op !== "aprovar_financeiro").map((op) => (
                  <tr key={op} className="border-t border-divider">
                    <td className="py-2 pr-2 text-ink-2">{OPERATION_LABEL[op]}</td>
                    {ROLES.map((r) => (
                      <td key={r} className={`px-2 py-2 text-center ${can(r, op) ? "text-positive" : "text-disabled"}`}>
                        {can(r, op) ? "✓" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Módulos por perfil">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="py-2 pr-2 font-medium">Módulo</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-2 py-2 text-center font-medium">
                      {ROLE_NAME[r].split(" ")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <tr key={m} className="border-t border-divider">
                    <td className="py-2 pr-2 text-ink-2">{MODULES[m].label}</td>
                    {ROLES.map((r) => (
                      <td key={r} className={`px-2 py-2 text-center ${canAccess(r, m) ? "text-positive" : "text-disabled"}`}>
                        {canAccess(r, m) ? "✓" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {d.verHistorico && (
        <section className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-[14px]">
            <h2 className="m-0 text-[16px] font-semibold">Histórico de alterações</h2>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setQ(busca.trim());
              }}
            >
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar por usuário, ação ou registro"
                aria-label="Filtrar histórico"
                className="h-[34px] w-[260px] rounded-[8px] border border-border-strong bg-surface px-3 text-[14px]"
              />
              <Button type="submit" className="h-[34px]">
                Filtrar
              </Button>
              <Button className="h-[34px]" onClick={() => void exportar()}>
                Exportar CSV
              </Button>
            </form>
          </div>
          {!d.historico?.length ? (
            <EmptyState>Nenhum evento encontrado.</EmptyState>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-[14px]">
                <thead className="sticky top-0">
                  <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                    <th className="px-5 py-[10px] font-medium">Data e hora</th>
                    <th className="px-[10px] py-[10px] font-medium">Usuário</th>
                    <th className="px-[10px] py-[10px] font-medium">Ação</th>
                    <th className="px-[10px] py-[10px] font-medium">Registro</th>
                    <th className="px-5 py-[10px] font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {d.historico.map((h) => (
                    <tr key={h.id} className="border-t border-divider">
                      <td className="tabular whitespace-nowrap px-5 py-[10px] text-muted">{dayMonthTime(h.em)}</td>
                      <td className="px-[10px] py-[10px] text-ink-3">{h.usuario}</td>
                      <td className={`whitespace-nowrap px-[10px] py-[10px] ${/erro|negado|bloqueada/.test(h.acao) ? "font-medium text-danger" : ""}`}>
                        {ACAO[h.acao] ?? h.acao}
                      </td>
                      <td className="px-[10px] py-[10px] font-mono text-[12.5px]">{h.registro ?? "—"}</td>
                      <td className="px-5 py-[10px] text-[13px] text-muted">{h.detalhe ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
