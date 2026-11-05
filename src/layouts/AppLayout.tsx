import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { ToastProvider } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { canAccess, MODULES, moduleFromPath } from "@/lib/nav";
import { homeModule } from "../../shared/permissions";

export function AppLayout() {
  const auth = useAuth();
  const location = useLocation();
  // Celular: o menu lateral vira gaveta e fecha sozinho ao trocar de tela
  const [menuAberto, setMenuAberto] = useState(false);
  useEffect(() => setMenuAberto(false), [location.pathname]);

  if (auth.status === "loading") {
    return <div className="grid min-h-screen place-items-center text-[14px] text-muted-2">Carregando…</div>;
  }
  if (auth.status === "offline") {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div role="alert" className="flex max-w-[380px] flex-col items-center gap-3 text-center">
          <div className="text-[18px] font-semibold">Sem conexão com o sistema</div>
          <div className="text-[14px] text-muted-2">Verifique a internet. Seus dados e sua sessão continuam salvos.</div>
          <button
            type="button"
            onClick={() => void auth.refresh()}
            className="h-[38px] cursor-pointer rounded-[9px] border-0 bg-primary px-4 text-[14px] font-medium text-white hover:bg-primary-hover"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  if (auth.status === "anonymous") {
    const voltar = location.pathname + location.search;
    return <Navigate to={voltar === "/" ? "/login" : `/login?voltar=${encodeURIComponent(voltar)}`} replace />;
  }

  const { user } = auth;
  const module = moduleFromPath(location.pathname);
  // O Administrativo não tem Dashboard: manda para a primeira tela permitida
  if (location.pathname === "/" && !canAccess(user.role, "dashboard")) {
    return <Navigate to={MODULES[homeModule(user.role)].href} replace />;
  }
  const blocked = module !== null && !canAccess(user.role, module);

  return (
    <ToastProvider>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[232px_minmax(0,1fr)]">
        {menuAberto && (
          <div aria-hidden className="fixed inset-0 z-30 bg-[rgba(22,23,25,.42)] md:hidden" onClick={() => setMenuAberto(false)} />
        )}
        <Sidebar role={user.role} userName={user.nome} aberto={menuAberto} onFechar={() => setMenuAberto(false)} />
        <div className="flex min-w-0 flex-col">
          <Header onMenu={() => setMenuAberto(true)} />
          <main className="flex min-w-0 flex-col gap-5 px-4 pb-12 pt-5 md:px-7 md:pt-6">
            {blocked ? (
              <>
                <PageHeader title={MODULES[module].label} />
                <div className="rounded-card border border-border bg-surface">
                  <EmptyState>Seu perfil não tem acesso a este módulo.</EmptyState>
                </div>
              </>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
