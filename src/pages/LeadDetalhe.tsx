import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar, Timeline } from "@/components/ui/Misc";
import { Loading, LoadError } from "@/components/ui/States";
import { useFonte } from "@/lib/fontes";
import { dayMonth, dayMonthTime, fullDate, money, phone, rentMoney } from "@/lib/format";
import { useApi } from "@/lib/useApi";
import { usePageTitle } from "@/lib/usePageTitle";

type LeadResp = {
  lead: {
    lead_id: string;
    cliente: string;
    telefone: string;
    imovel: string | null;
    codigo_imovel: string | null;
    bairro: string | null;
    corretor: string | null;
    origem: string | null;
    etapa: string;
    observacoes: string | null;
    criado_em: string | null;
    atualizado_em: string | null;
    proximo: string | null;
    vencido: boolean | null;
    sheet_row: number | null;
  };
  atendimentos: {
    activity_id: string;
    data: string | null;
    etapa: string | null;
    descricao: string | null;
    corretor: string | null;
    proximo: string | null;
    tempo_resposta_min: number | null;
  }[];
  primeiraResposta: number | null;
  imovel: { code: string; nome: string; bairro: string | null; tipo: string | null; modalidade: string | null; preco: number | null; status: string | null; fonte: string } | null;
  leadsNoImovel: number | null;
};

const ETAPAS = ["Novo lead", "Contato inicial", "Visita", "Proposta", "Fechado"];

export function LeadDetalhePage() {
  const { leadId = "" } = useParams();
  const { status, data, error } = useApi<LeadResp>(`/leads/${encodeURIComponent(leadId)}`);
  const planilhaAtendimentos = useFonte("atendimentos");
  const planilhaLeads = useFonte("leads");
  usePageTitle(data?.lead.cliente ?? "Lead");

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/leads" className="text-[14px] no-underline">
          ← Leads
        </Link>
        {status === "error" ? <LoadError error={error} /> : <Loading />}
      </div>
    );
  }

  const { lead, atendimentos, imovel } = data;
  const atual = ETAPAS.indexOf(lead.etapa);
  const tel = lead.telefone.replace(/\D/g, "");
  const whats = `https://wa.me/${tel.length <= 11 ? `55${tel}` : tel}`;

  const timeline = [
    ...atendimentos.map((a) => ({
      key: a.activity_id,
      title: a.descricao ?? a.etapa ?? "Atendimento",
      meta: `${dayMonthTime(a.data)} · ${a.corretor ?? "—"} · ${a.activity_id}`,
      body: [
        a.etapa && `Etapa: ${a.etapa}`,
        a.tempo_resposta_min !== null && `resposta em ${a.tempo_resposta_min} min`,
        a.proximo && `próximo contato ${dayMonth(a.proximo)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    {
      key: "entrada",
      title: "Lead recebido",
      meta: `${dayMonthTime(lead.criado_em)} · planilha de Leads${lead.sheet_row ? `, linha ${lead.sheet_row}` : ""}`,
      body: `Origem ${lead.origem ?? "não informada"}.${lead.observacoes ? ` Observação: ${lead.observacoes}` : ""}`,
    },
  ];

  const precoImovel =
    imovel?.preco != null ? (imovel.modalidade === "Locação" ? rentMoney(Number(imovel.preco)) : money(Number(imovel.preco))) : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <Link to="/leads" className="w-fit text-[14px] no-underline">
        ← Leads
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={lead.cliente} size={52} />
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[30px] font-semibold tracking-[-0.9px]">{lead.cliente}</h1>
            <div className="text-[14px] text-muted-2">
              <span className="font-mono">{phone(lead.telefone)}</span> · Origem: {lead.origem ?? "—"} · Responsável: {lead.corretor ?? "—"} ·{" "}
              <span className="font-mono">{lead.lead_id}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:+55${tel}`} className={buttonClass("secondary", "no-underline")}>
            Ligar
          </a>
          <a href={whats} target="_blank" rel="noreferrer" className={buttonClass("secondary", "no-underline")}>
            WhatsApp
          </a>
          {planilhaAtendimentos && (
            <a href={planilhaAtendimentos} target="_blank" rel="noreferrer" className={buttonClass("primary", "no-underline hover:text-white")}>
              Registrar interação na planilha
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 rounded-[12px] border border-border bg-surface p-1">
        {lead.etapa === "Perdido" ? (
          <div className="col-span-5 rounded-[9px] bg-danger-bg px-3 py-[9px] text-center text-[14px] font-semibold text-danger">Lead perdido</div>
        ) : (
          ETAPAS.map((e, i) => (
            <div
              key={e}
              className={`rounded-[9px] px-1 py-[9px] text-center text-[11.5px] leading-tight sm:px-2 sm:text-[13.5px] ${
                i === atual ? "bg-primary font-semibold text-white" : i < atual ? "bg-divider text-ink-3" : "text-[#9a9ca1]"
              }`}
            >
              {e}
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] gap-[14px] max-lg:grid-cols-1">
        <Card title="Histórico de interações">
          <Timeline items={timeline} />
          {atendimentos.length === 0 && <div className="text-[13px] text-muted-2">Nenhum atendimento registrado na planilha de Atendimentos para este lead.</div>}
        </Card>

        <div className="flex flex-col gap-[14px]">
          <Card title="Próxima ação">
            <div className="flex flex-col gap-1">
              <b className="text-[15px]">{lead.observacoes ?? "Sem observação"}</b>
              <span className={`text-[13px] ${lead.vencido ? "font-medium text-danger" : "text-muted-2"}`}>
                {lead.proximo ? `${lead.vencido ? "Vencido desde" : "Previsto para"} ${fullDate(lead.proximo)}` : "Sem data de próximo contato"} ·{" "}
                {lead.corretor ?? "—"}
              </span>
            </div>
            {planilhaLeads && (
              <a href={planilhaLeads} target="_blank" rel="noreferrer" className={buttonClass("secondary", "no-underline")}>
                Reagendar na planilha
              </a>
            )}
          </Card>

          <Card title="Imóvel de interesse">
            <div className="photo-placeholder grid h-[140px] place-items-center rounded-[10px] font-mono text-[12px] text-subtle">foto do imóvel</div>
            {imovel ? (
              <div className="flex flex-col gap-1">
                <b className="text-[15px]">
                  {imovel.nome}
                  {imovel.bairro ? ` · ${imovel.bairro}` : ""}
                </b>
                <span className="text-[13px] text-muted-2">
                  <span className="font-mono">{imovel.code}</span>
                  {imovel.modalidade ? ` · ${imovel.modalidade}` : ""}
                  {precoImovel ? ` · ${precoImovel}` : ""}
                  {data.leadsNoImovel && data.leadsNoImovel > 1 ? ` · ${data.leadsNoImovel} leads interessados` : ""}
                </span>
                {imovel.status && (
                  <span>
                    <Badge status={imovel.status} />
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-muted-2">
                {lead.imovel ? `“${lead.imovel}” não foi encontrado nas planilhas de Imóveis e Agenciamentos.` : "Nenhum imóvel informado."}
              </div>
            )}
          </Card>

          <Card>
            <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
              <Dado label="Entrada" valor={dayMonthTime(lead.criado_em)} />
              <Dado label="1ª resposta" valor={data.primeiraResposta !== null ? `${data.primeiraResposta} min` : "—"} />
              <Dado label="Origem" valor={lead.origem ?? "—"} />
              <Dado label="Próximo contato" valor={lead.proximo ? fullDate(lead.proximo) : "—"} alerta={!!lead.vencido} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Dado({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <dt className="text-[12.5px] text-subtle">{label}</dt>
      <dd className={`m-0 font-semibold ${alerta ? "text-danger" : ""}`}>{valor}</dd>
    </div>
  );
}
