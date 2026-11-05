import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card, EmptyState, Notice, PageHeader } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { dayMonthTime } from "@/lib/format";
import { useApi, qs } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

type Planilha = {
  planilha: string;
  url: string | null;
  aba: string | null;
  ultimaSync: string | null;
  ultimoOk: string | null;
  status: "ok" | "erro" | "executando" | null;
  erro: string | null;
  avisos: number | null;
  registros: number;
};
type Pendencia = { planilha: string; linha: number | null; chave: string; tipo: string; mensagem: string; sugestao: string | null };
type Resp = {
  planilhas: Planilha[];
  avisos: { planilha: string; linha: number | null; coluna: string | null; tipo: string; mensagem: string; chave: string | null }[];
  pendencias: Pendencia[];
  pendenciasPorTipo: Record<string, number>;
  vinculos: { id: number; tipo: string; origem_chave: string; alvo_chave: string; usuario: string; em: string }[];
  execucoes: { id: number; planilha: string; origem: string; status: string; linhas: number | null; inseridas: number | null; atualizadas: number | null; removidas: number | null; avisos: number | null; erro: string | null; em: string }[];
  sincronizarAgora: boolean;
};

const NOME: Record<string, string> = {
  corretores: "Corretores",
  imoveis: "Imóveis",
  agenciamentos: "Agenciamentos",
  leads: "Leads",
  atendimentos: "Atendimentos",
  contratos: "Contratos",
  fluxo_caixa: "Fluxo de caixa",
  campanhas: "Campanhas",
};
const MODELO: Record<string, string> = {
  corretores: "01_corretores.csv",
  imoveis: "02_imoveis.csv",
  agenciamentos: "03_agenciamentos.csv",
  leads: "04_leads.csv",
  atendimentos: "05_atendimentos.csv",
  contratos: "06_contratos.csv",
  fluxo_caixa: "07_fluxo_caixa.csv",
  campanhas: "08_campanhas.csv",
};
const TIPO_PEND: Record<string, string> = {
  sem_lead: "Sem lead vinculado",
  sem_imovel: "Sem imóvel vinculado",
  corretor_nao_cadastrado: "Nome não cadastrado",
};
const TIPO_VINCULO: Record<string, string> = {
  atendimento_lead: "Atendimento → lead",
  contrato_lead: "Contrato → lead",
  lead_imovel: "Lead → imóvel",
  contrato_imovel: "Contrato → imóvel",
};

export function SincronizacaoPage() {
  usePageTitle("Sincronização");
  const [versao, setVersao] = useState(0);
  const { status, data, error } = useApi<Resp>(`/sincronizacao${qs({ v: versao || null })}`);
  const toast = useToast();
  const [rodando, setRodando] = useState(false);
  const [filtro, setFiltro] = useState<string>("");
  const [ligando, setLigando] = useState<Pendencia | null>(null);

  if (!data) return status === "error" ? <LoadError error={error} /> : <Loading />;
  const d = data;
  const recarregar = () => setVersao((v) => v + 1);

  async function sincronizar() {
    setRodando(true);
    try {
      const r = await api<{ ok: boolean; resultados?: { planilha: string; status: string }[]; erro?: string }>("/sincronizacao/agora", { method: "POST" });
      const mudou = r.resultados?.filter((x) => x.status === "ok").length ?? 0;
      toast(r.ok ? (mudou ? `${mudou} planilha(s) atualizada(s).` : "Nenhuma alteração nas planilhas.") : `Sincronização com erro: ${r.erro ?? "veja a tabela"}`);
      recarregar();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao sincronizar.");
    } finally {
      setRodando(false);
    }
  }

  async function removerVinculo(id: number) {
    if (!confirm("Remover este vínculo manual? O registro volta a ser ligado automaticamente (ou fica pendente).")) return;
    try {
      await api(`/vinculos/${id}`, { method: "DELETE" });
      toast("Vínculo removido.");
      recarregar();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao remover.");
    }
  }

  const pendFiltradas = d.pendencias.filter((p) => !filtro || p.tipo === filtro);
  const totalPend = Object.values(d.pendenciasPorTipo).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Sincronização"
        subtitle="As planilhas Google são a fonte dos dados. O Apps Script envia as alterações a cada 10 minutos."
        actions={
          d.sincronizarAgora ? (
            <Button variant="primary" onClick={() => void sincronizar()} disabled={rodando}>
              {rodando ? "Sincronizando…" : "Sincronizar agora"}
            </Button>
          ) : null
        }
      />
      {!d.sincronizarAgora && (
        <Notice>
          Para sincronizar na hora, abra o projeto “ImobiInsight Sync” em script.google.com e execute <b>sincronizarAgora</b>. (Para ter este botão aqui,
          publique o script como App da Web — veja scripts/apps-script/LEIA-ME.md.)
        </Notice>
      )}

      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[14px]">
            <thead>
              <tr className="whitespace-nowrap bg-surface-muted text-left text-[12.5px] text-muted">
                <th className="px-5 py-[10px] font-medium">Planilha</th>
                <th className="px-[10px] py-[10px] font-medium">Situação</th>
                <th className="px-[10px] py-[10px] text-right font-medium">Registros</th>
                <th className="px-[10px] py-[10px] font-medium">Última sincronização</th>
                <th className="px-[10px] py-[10px] font-medium">Avisos</th>
                <th className="px-5 py-[10px] font-medium">Arquivos</th>
              </tr>
            </thead>
            <tbody>
              {d.planilhas.map((p) => (
                <tr key={p.planilha} className="border-t border-divider align-top">
                  <td className="px-5 py-3">
                    <div className="font-medium">{NOME[p.planilha]}</div>
                    {p.aba && <div className="font-mono text-[11.5px] text-subtle">aba {p.aba}</div>}
                  </td>
                  <td className="px-[10px] py-3">
                    {!p.url && !p.status ? (
                      <Badge status="Contato inicial">Não ligada</Badge>
                    ) : p.status === "erro" ? (
                      <div className="flex flex-col gap-1">
                        <Badge status="Perdido">Erro</Badge>
                        <span className="max-w-[260px] text-[12px] text-danger">{p.erro}</span>
                      </div>
                    ) : p.status === "executando" ? (
                      <Badge status="Proposta">Em andamento</Badge>
                    ) : (
                      <Badge status="Fechado">Em dia</Badge>
                    )}
                  </td>
                  <td className="tabular px-[10px] py-3 text-right">{p.registros}</td>
                  <td className="tabular whitespace-nowrap px-[10px] py-3 text-muted">
                    {p.ultimoOk ? dayMonthTime(p.ultimoOk) : "—"}
                    {p.ultimaSync && p.ultimaSync !== p.ultimoOk && <div className="text-[12px]">tentativa {dayMonthTime(p.ultimaSync)}</div>}
                  </td>
                  <td className="px-[10px] py-3">{p.avisos ? <span className="font-medium text-notice-fg">{p.avisos}</span> : <span className="text-subtle">—</span>}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[13px]">
                    {p.url?.startsWith("https://") && (
                      <a href={p.url} target="_blank" rel="noreferrer" className="mr-3">
                        Abrir planilha
                      </a>
                    )}
                    <a href={`/modelos/${MODELO[p.planilha]}`} download>
                      Baixar modelo
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {d.avisos.length > 0 && (
        <Card title={`Linhas recusadas ou com aviso na última sincronização (${d.avisos.length})`}>
          <div className="text-[13px] text-muted-2">Corrija na planilha: na próxima sincronização o aviso some sozinho.</div>
          <div className="max-h-[280px] overflow-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <tbody>
                {d.avisos.map((a, i) => (
                  <tr key={i} className="border-t border-divider first:border-t-0">
                    <td className="whitespace-nowrap py-2 pr-3 font-medium">{NOME[a.planilha]}</td>
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-[12.5px] text-subtle">{a.linha ? `linha ${a.linha}` : ""}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-3">{a.coluna ?? ""}</td>
                    <td className="py-2 text-muted">{a.mensagem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-[14px]">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[16px] font-semibold">Pendências de vínculo ({totalPend})</h2>
            <div className="text-[13px] text-muted-2">
              Registros que o sistema não conseguiu ligar sozinho. Ligue à mão — o vínculo vale para todas as próximas sincronizações.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["", ...Object.keys(d.pendenciasPorTipo)].map((t) => (
              <button
                key={t || "todas"}
                type="button"
                onClick={() => setFiltro(t)}
                className={`h-[32px] cursor-pointer rounded-[8px] px-3 text-[13px] ${
                  filtro === t ? "border border-primary bg-primary text-white" : "border border-border-strong bg-surface text-ink-2"
                }`}
              >
                {t ? TIPO_PEND[t] ?? t : "Todas"} <span className="font-mono text-[11px] opacity-70">{t ? d.pendenciasPorTipo[t] : totalPend}</span>
              </button>
            ))}
          </div>
        </div>
        {pendFiltradas.length === 0 ? (
          <EmptyState>Nenhuma pendência. Todos os registros estão ligados.</EmptyState>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[760px] border-collapse text-[14px]">
              <tbody>
                {pendFiltradas.map((p) => (
                  <tr key={`${p.planilha}-${p.tipo}-${p.chave}`} className="border-t border-divider first:border-t-0">
                    <td className="whitespace-nowrap px-5 py-[10px] font-medium">{NOME[p.planilha]}</td>
                    <td className="whitespace-nowrap px-[10px] py-[10px] font-mono text-[12.5px] text-subtle">{p.chave}</td>
                    <td className="px-[10px] py-[10px] text-ink-3">
                      {p.mensagem}
                      {p.sugestao && <div className="text-[12.5px] text-notice-fg">Parecido com “{p.sugestao}” — confira a grafia na planilha</div>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-[10px] text-right">
                      {p.tipo === "corretor_nao_cadastrado" ? (
                        <span className="text-[12.5px] text-subtle">Cadastre na planilha Corretores</span>
                      ) : (
                        <Button className="h-8" onClick={() => setLigando(p)}>
                          Ligar…
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPend > d.pendencias.length && <div className="px-5 py-2 text-[12.5px] text-muted-2">Mostrando as primeiras {d.pendencias.length}.</div>}
          </div>
        )}
      </section>

      {ligando && (
        <LigarModal
          pendencia={ligando}
          onClose={() => setLigando(null)}
          onDone={() => {
            setLigando(null);
            toast("Vínculo gravado.");
            recarregar();
          }}
        />
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-[14px]">
        <Card title="Vínculos manuais">
          {d.vinculos.length === 0 ? (
            <EmptyState>Nenhum vínculo manual.</EmptyState>
          ) : (
            <div className="flex flex-col">
              {d.vinculos.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 border-t border-divider py-[10px] text-[13.5px] first:border-t-0">
                  <div className="min-w-0">
                    <div>
                      <span className="font-mono text-[12.5px]">{v.origem_chave}</span> → <span className="font-mono text-[12.5px]">{v.alvo_chave}</span>
                    </div>
                    <div className="text-[12px] text-subtle">
                      {TIPO_VINCULO[v.tipo]} · {v.usuario} · {dayMonthTime(v.em)}
                    </div>
                  </div>
                  <Button className="h-8" onClick={() => void removerVinculo(v.id)}>
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Últimas execuções">
          {d.execucoes.length === 0 ? (
            <EmptyState>Nenhuma sincronização ainda. Instale o Apps Script (scripts/apps-script/LEIA-ME.md).</EmptyState>
          ) : (
            <div className="max-h-[360px] overflow-auto">
              <table className="w-full border-collapse text-[13px]">
                <tbody>
                  {d.execucoes.map((e) => (
                    <tr key={e.id} className="border-t border-divider first:border-t-0">
                      <td className="tabular whitespace-nowrap py-2 pr-3 text-muted">{dayMonthTime(e.em)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 font-medium">{NOME[e.planilha]}</td>
                      <td className="py-2 pr-3">
                        {e.status === "ok" ? (
                          <span className="text-ink-3">
                            +{e.inseridas ?? 0} · ~{e.atualizadas ?? 0} · −{e.removidas ?? 0}
                          </span>
                        ) : (
                          <span className={e.status === "erro" ? "text-danger" : "text-muted"}>{e.erro ?? e.status}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right text-[12px] text-subtle">{e.origem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pt-2 text-[12px] text-subtle">+ novas · ~ alteradas · − removidas</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

type Opcao = { chave: string; titulo: string; sub: string };

function LigarModal({ pendencia, onClose, onDone }: { pendencia: Pendencia; onClose: () => void; onDone: () => void }) {
  const paraLead = pendencia.tipo === "sem_lead";
  const tipo = paraLead
    ? pendencia.planilha === "atendimentos"
      ? "atendimento_lead"
      : "contrato_lead"
    : pendencia.planilha === "leads"
      ? "lead_imovel"
      : "contrato_imovel";
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<Opcao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      if (paraLead) {
        const r = await api<{ itens: { lead_id: string; cliente: string; telefone: string; corretor: string | null }[] }>(`/leads${qs({ q: busca })}`);
        setOpcoes(r.itens.map((l) => ({ chave: l.lead_id, titulo: l.cliente, sub: `${l.lead_id} · ${l.corretor ?? "—"}` })));
      } else {
        const r = await api<{ itens: { code: string; nome: string; bairro: string | null }[] }>(`/imoveis${qs({ q: busca, situacao: "todos" })}`);
        setOpcoes(r.itens.map((i) => ({ chave: i.code, titulo: i.nome, sub: `${i.code} · ${i.bairro ?? "—"}` })));
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na busca");
    }
  }

  async function ligar(alvo: string) {
    setSalvando(true);
    setErro(null);
    try {
      await api("/vinculos", { method: "POST", body: JSON.stringify({ tipo, origem: pendencia.chave, alvo }) });
      onDone();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao gravar");
      setSalvando(false);
    }
  }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-40 grid place-items-center bg-[rgba(22,23,25,.42)] p-4" onClick={onClose}>
      <div className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-modal bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div>
            <div className="text-[20px] font-semibold">{paraLead ? "Ligar a um lead" : "Ligar a um imóvel"}</div>
            <div className="text-[14px] text-muted-2">{pendencia.mensagem}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="cursor-pointer border-0 bg-transparent text-[22px] leading-none text-muted">
            ×
          </button>
        </div>
        <form onSubmit={buscar} className="flex gap-2 px-6">
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={paraLead ? "Nome, telefone ou código do lead" : "Nome, código ou bairro do imóvel"}
            className="h-[42px] flex-1 rounded-[9px] border border-border-strong px-3 text-[14px]"
          />
          <Button type="submit" variant="primary" className="h-[42px]">
            Buscar
          </Button>
        </form>
        <div className="flex max-h-[320px] flex-col overflow-auto px-6 py-3">
          {erro && <div className="rounded-[8px] bg-danger-bg px-3 py-2 text-[13.5px] text-danger">{erro}</div>}
          {opcoes?.length === 0 && <div className="py-4 text-center text-[13.5px] text-muted-2">Nada encontrado.</div>}
          {opcoes?.map((o) => (
            <button
              key={o.chave}
              type="button"
              disabled={salvando}
              onClick={() => void ligar(o.chave)}
              className="flex cursor-pointer items-center justify-between gap-3 border-0 border-t border-divider bg-transparent py-[10px] text-left first:border-t-0 hover:bg-row-hover"
            >
              <span>
                <span className="block text-[14px] font-medium">{o.titulo}</span>
                <span className="block text-[12.5px] text-subtle">{o.sub}</span>
              </span>
              <span className="text-[13px] text-ink-3">Ligar →</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between gap-2 bg-row-hover px-6 py-3">
          <Link to={paraLead ? "/leads" : "/imoveis"} target="_blank" className={buttonClass("ghost", "no-underline")}>
            Abrir {paraLead ? "Leads" : "Imóveis"} em outra aba
          </Link>
          <Button onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
