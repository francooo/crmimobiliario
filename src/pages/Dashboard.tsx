import { Badge } from "@/components/ui/Badge";
import { Card, KpiCard, Notice, PageHeader } from "@/components/ui/Card";
import { BarH } from "@/components/ui/Misc";
import { money, moneyShort } from "@/lib/format";

import { usePageTitle } from "@/lib/usePageTitle";

// Fase 0: tela de demonstração do design system. Os números são os de referência
// dos CSVs de exemplo (docs/ANALISE-PLANILHAS.md); na fase 3 vêm do Neon.
export function DashboardPage() {
  usePageTitle("Dashboard");
  const origens = [
    { label: "Instagram/Facebook", v: 32 },
    { label: "Portais", v: 31 },
    { label: "Indicação", v: 24 },
    { label: "WhatsApp", v: 12 },
    { label: "Site", v: 12 },
  ];
  return (
    <>
      <Notice>Fase 0 — estrutura e visual do sistema. Os dados reais chegam com a sincronização das planilhas (fase 2).</Notice>
      <PageHeader title="Painel gerencial" subtitle="Dados de exemplo · maio a outubro de 2026" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[14px]">
        <KpiCard label="VGV vendido" value={moneyShort(9_015_000)} hint="57 vendas" />
        <KpiCard label="Comissões de venda" value={moneyShort(324_540)} hint="3,6% do VGV" />
        <KpiCard label="Saldo de caixa" value={moneyShort(39_500)} hint={`Entradas ${money(634_500)}`} />
        <KpiCard label="Captações" value="245" hint="150 venda · 95 locação" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[14px]">
        <Card title="Origem dos contratos fechados">
          <div className="flex flex-col gap-3">
            {origens.map((o, i) => (
              <BarH key={o.label} label={o.label} value={o.v} max={32} tone={Math.min(i, 4) as 0 | 1 | 2 | 3 | 4} />
            ))}
          </div>
        </Card>
        <Card title="Etapas do funil">
          <div className="flex flex-wrap gap-2">
            {["Novo lead", "Contato inicial", "Visita", "Proposta", "Fechado", "Perdido"].map((s) => (
              <Badge key={s} status={s} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
