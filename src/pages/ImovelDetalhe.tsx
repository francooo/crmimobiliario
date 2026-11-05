import { useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Loading, LoadError } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dayMonth, fullDate, money } from "@/lib/format";
import { fotoUrl, prepararFoto } from "@/lib/imagem";
import { useApi, qs } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";
import { can } from "../../shared/permissions";
import { precoImovel } from "./Imoveis";

type Foto = { id: number; hash: string; capa: boolean; tamanho: number; criado_por: string; criado_em: string };
type Resp = {
  imovel: {
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
  };
  fotos: Foto[];
  leads: { lead_id: string; cliente: string; etapa: string; corretor: string | null }[];
  contratos: { contract_id: string; tipo: string; valor: number; data: string; cliente: string | null; corretor: string | null }[];
  espaco: { usado: number; teto: number; porImovel: number };
};

const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;

export function ImovelDetalhePage() {
  const { code = "" } = useParams();
  const [versao, setVersao] = useState(0);
  const { status, data, error } = useApi<Resp>(`/imoveis/${encodeURIComponent(code)}${qs({ v: versao || null })}`);
  const { user } = useAuth();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [envio, setEnvio] = useState<string | null>(null);
  usePageTitle(data?.imovel.nome ?? "Imóvel");

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/imoveis" className="w-fit text-[14px] no-underline">
          ← Imóveis
        </Link>
        {status === "error" ? <LoadError error={error} /> : <Loading />}
      </div>
    );
  }

  const { imovel, fotos, espaco } = data;
  const podeEditar = !!user && can(user.role, "enviar_fotos");
  const podeExcluir = (f: Foto) => podeEditar && (user!.role !== "corretor" || f.criado_por === user!.email);
  const principal = fotos.find((f) => f.id === selecionada) ?? fotos[0] ?? null;
  const vagas = espaco.porImovel - fotos.length;
  const pctEspaco = Math.min(100, (espaco.usado / espaco.teto) * 100);

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    const lista = [...files].slice(0, Math.max(0, vagas));
    if (files.length > lista.length) toast(`Só cabem mais ${vagas} foto(s) neste imóvel.`);
    let ok = 0;
    for (const [i, file] of lista.entries()) {
      setEnvio(`Preparando ${i + 1} de ${lista.length}…`);
      try {
        const foto = await prepararFoto(file);
        setEnvio(`Enviando ${i + 1} de ${lista.length}…`);
        await api(`/imoveis/${encodeURIComponent(code)}/fotos`, {
          method: "POST",
          body: JSON.stringify({ imagem: foto.imagem, miniatura: foto.miniatura, hash: foto.hash }),
        });
        URL.revokeObjectURL(foto.previewUrl);
        ok++;
      } catch (err) {
        toast(err instanceof Error ? err.message : "Falha ao enviar a foto.");
      }
    }
    setEnvio(null);
    if (input.current) input.current.value = "";
    if (ok) toast(ok === 1 ? "Foto enviada." : `${ok} fotos enviadas.`);
    setVersao((v) => v + 1);
  }

  async function acao(path: string, method: string, msg: string) {
    try {
      await api(path, { method });
      toast(msg);
      setSelecionada(null);
      setVersao((v) => v + 1);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Não foi possível concluir.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Link to="/imoveis" className="w-fit text-[14px] no-underline">
        ← Imóveis
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[30px] font-semibold tracking-[-0.9px]">{imovel.nome}</h1>
            {imovel.status && <Badge status={imovel.status} />}
          </div>
          <div className="text-[14px] text-muted-2">
            <span className="font-mono">{imovel.code}</span> · {imovel.bairro ?? "bairro não informado"} · {imovel.modalidade ?? "—"} ·{" "}
            {imovel.fonte === "carteira" ? "planilha de Imóveis" : `captado em ${fullDate(imovel.captado_em)} (Agenciamentos)`}
          </div>
        </div>
        <div className="tabular text-[28px] font-semibold tracking-[-0.8px]">{precoImovel(imovel.preco, imovel.modalidade)}</div>
      </div>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] gap-[14px] max-lg:grid-cols-1">
        <Card
          title={`Fotos (${fotos.length}/${espaco.porImovel})`}
          action={
            podeEditar && (
              <>
                <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void enviar(e.target.files)} />
                <Button variant="primary" disabled={!!envio || vagas <= 0} onClick={() => input.current?.click()}>
                  {envio ?? "+ Enviar fotos"}
                </Button>
              </>
            )
          }
        >
          {principal ? (
            <>
              <div className="overflow-hidden rounded-[10px] bg-track">
                <img src={fotoUrl(principal)} alt={imovel.nome} className="mx-auto block max-h-[460px] w-full object-contain" />
              </div>
              <div className="flex flex-wrap gap-2">
                {fotos.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelecionada(f.id)}
                    className={`relative h-[64px] w-[88px] cursor-pointer overflow-hidden rounded-[8px] border-2 p-0 ${
                      f.id === principal.id ? "border-primary" : "border-transparent"
                    }`}
                    aria-label={`Foto ${f.id}${f.capa ? " (capa)" : ""}`}
                  >
                    <img src={fotoUrl(f, true)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {f.capa && <span className="absolute left-1 top-1 rounded-[4px] bg-primary px-1 font-mono text-[10px] text-white">capa</span>}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-muted-2">
                <span>
                  Enviada por {principal.criado_por} em {dayMonth(principal.criado_em)} · {Math.round(principal.tamanho / 1000)} KB
                </span>
                {podeEditar && (
                  <div className="flex gap-2">
                    {!principal.capa && (
                      <Button className="h-8" onClick={() => void acao(`/fotos/${principal.id}/capa`, "POST", "Capa atualizada.")}>
                        Usar como capa
                      </Button>
                    )}
                    {podeExcluir(principal) && (
                      <Button
                        className="h-8 text-danger"
                        onClick={() => {
                          if (confirm("Excluir esta foto? Não é possível desfazer.")) void acao(`/fotos/${principal.id}`, "DELETE", "Foto excluída.");
                        }}
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="photo-placeholder grid h-[220px] place-items-center rounded-[10px] font-mono text-[12px] text-subtle">
              {podeEditar ? "nenhuma foto — clique em “Enviar fotos”" : "nenhuma foto"}
            </div>
          )}
          {podeEditar && (
            <div className="flex flex-col gap-[6px] border-t border-divider pt-3">
              <div className="flex justify-between text-[12.5px] text-muted-2">
                <span>Espaço de fotos do sistema</span>
                <span className="tabular">
                  {mb(espaco.usado)} de {mb(espaco.teto)}
                </span>
              </div>
              <div className="h-[6px] overflow-hidden rounded-full bg-track">
                <div className={`h-full rounded-full ${pctEspaco >= 80 ? "bg-danger" : "bg-chart-2"}`} style={{ width: `${pctEspaco}%` }} />
              </div>
              <span className="text-[12px] text-subtle">As fotos são reduzidas no seu navegador antes do envio (até ~300 KB cada).</span>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-[14px]">
          <Card title="Dados do imóvel">
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
              <Dado label="Tipo" valor={imovel.tipo ?? "—"} />
              <Dado label="Modalidade" valor={imovel.modalidade ?? "—"} />
              <Dado label="Bairro" valor={imovel.bairro ?? "—"} />
              <Dado label="Situação" valor={imovel.status ?? "—"} />
              {imovel.fonte === "carteira" ? (
                <Dado label="Proprietário" valor={imovel.proprietario ?? "—"} />
              ) : (
                <>
                  <Dado label="Corretor" valor={imovel.corretor ?? "—"} />
                  <Dado label="Agenciador" valor={imovel.agenciador ?? "—"} />
                </>
              )}
            </dl>
          </Card>

          <Card title={`Leads interessados (${data.leads.length})`}>
            {data.leads.length === 0 ? (
              <EmptyState>Nenhum lead ligado a este imóvel.</EmptyState>
            ) : (
              <div className="flex flex-col">
                {data.leads.map((l) => (
                  <Link
                    key={l.lead_id}
                    to={`/leads/${l.lead_id}`}
                    className="flex items-center justify-between gap-3 border-t border-divider py-[10px] text-ink no-underline first:border-t-0"
                  >
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium">{l.cliente}</div>
                      <div className="text-[12.5px] text-subtle">{l.corretor ?? "—"}</div>
                    </div>
                    <Badge status={l.etapa} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {data.contratos.length > 0 && (
            <Card title="Contratos">
              {data.contratos.map((ct) => (
                <div key={ct.contract_id} className="flex justify-between gap-3 text-[13.5px]">
                  <span>
                    <span className="font-mono text-[12px] text-subtle">{ct.contract_id}</span> · {ct.tipo} · {fullDate(ct.data)}
                  </span>
                  <b className="tabular">{money(Number(ct.valor))}</b>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Dado({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <dt className="text-[12.5px] text-subtle">{label}</dt>
      <dd className="m-0 font-semibold">{valor}</dd>
    </div>
  );
}
