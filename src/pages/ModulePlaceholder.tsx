import { useParams } from "react-router";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { MODULES, type ModuleKey } from "@/lib/nav";
import { usePageTitle } from "@/lib/usePageTitle";
import { NotFoundContent } from "./NotFound";

const PHASE: Partial<Record<ModuleKey, string>> = {
  leads: "fase 3",
  funil: "fase 3",
  imoveis: "fase 4",
  agenciamentos: "fase 4",
  corretores: "fase 4",
  marketing: "fase 5",
  financeiro: "fase 5",
  sincronizacao: "fase 2",
  governanca: "fase 5",
};

// Telas ainda não construídas — cada uma ganha sua própria rota na fase indicada.
export function ModulePlaceholder() {
  const { modulo = "" } = useParams();
  const key = modulo as ModuleKey;
  const known = key in MODULES && key !== "dashboard";
  usePageTitle(known ? MODULES[key].label : "Página não encontrada");
  if (!known) return <NotFoundContent />;
  return (
    <>
      <PageHeader title={MODULES[key].label} />
      <div className="rounded-card border border-border bg-surface">
        <EmptyState>Tela em construção — prevista para a {PHASE[key]}.</EmptyState>
      </div>
    </>
  );
}
