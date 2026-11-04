// Badges de status — tabela "Status" do DESIGN-SYSTEM.md
const STATUS: Record<string, { bg: string; fg: string }> = {
  "Novo lead": { bg: "#eef0f3", fg: "#3f4650" },
  "Contato inicial": { bg: "#efeff1", fg: "#44474c" },
  Visita: { bg: "#e8edf3", fg: "#3a4a5e" },
  Proposta: { bg: "#f5f0e6", fg: "#6b5523" },
  "Em negociação": { bg: "#f5f0e6", fg: "#6b5523" },
  Pendente: { bg: "#f5f0e6", fg: "#6b5523" },
  Fechado: { bg: "#e9efe7", fg: "#4b6446" },
  Disponível: { bg: "#e9efe7", fg: "#4b6446" },
  "Atingiu meta": { bg: "#e9efe7", fg: "#4b6446" },
  Realizado: { bg: "#e9efe7", fg: "#4b6446" },
  Perdido: { bg: "#f6ece9", fg: "#8a3f34" },
  Vencido: { bg: "#f6ece9", fg: "#8a3f34" },
  Vendido: { bg: "#efeff1", fg: "#44474c" },
  Locado: { bg: "#efeff1", fg: "#44474c" },
};

const NEUTRAL = { bg: "#efeff1", fg: "#44474c" };

export function statusColors(status: string) {
  return STATUS[status] ?? NEUTRAL;
}

export function Badge({ status, children }: { status: string; children?: React.ReactNode }) {
  const c = statusColors(status);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-chip px-[9px] py-1 text-[12.5px] leading-none"
      style={{ background: c.bg, color: c.fg }}
    >
      {children ?? status}
    </span>
  );
}
