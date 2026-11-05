import { ApiError } from "@/lib/api";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div role="status" className="rounded-card border border-border bg-surface px-4 py-10 text-center text-[14px] text-muted-2">
      {label}
    </div>
  );
}

export function LoadError({ error }: { error: Error | null }) {
  const notFound = error instanceof ApiError && error.status === 404;
  return (
    <div role="alert" className="rounded-card border border-border bg-surface px-4 py-10 text-center text-[14px]">
      <div className="font-medium text-danger">{notFound ? "Registro não encontrado." : "Não foi possível carregar os dados."}</div>
      {!notFound && <div className="mt-1 text-muted-2">{error?.message ?? "Tente novamente em instantes."}</div>}
    </div>
  );
}
