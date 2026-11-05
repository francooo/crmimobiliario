import { Link } from "react-router";
import { usePageTitle } from "@/lib/usePageTitle";

export function NotFoundContent() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="m-0 text-[30px] font-semibold tracking-[-0.9px]">Página não encontrada</h1>
      <p className="m-0 text-[15px] text-muted-2">O endereço acessado não existe ou foi alterado.</p>
      <Link to="/">Voltar ao painel</Link>
    </div>
  );
}

export function NotFoundPage() {
  usePageTitle("Página não encontrada");
  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6">
      <NotFoundContent />
    </div>
  );
}
