import { createBrowserRouter, Outlet } from "react-router";
import { AppLayout } from "@/layouts/AppLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AuthProvider } from "@/lib/auth";
import { DashboardPage } from "@/pages/Dashboard";
import { AgenciamentosPage } from "@/pages/Agenciamentos";
import { CorretoresPage } from "@/pages/Corretores";
import { FinanceiroPage } from "@/pages/Financeiro";
import { FunilPage } from "@/pages/Funil";
import { GovernancaPage } from "@/pages/Governanca";
import { MarketingPage } from "@/pages/Marketing";
import { SincronizacaoPage } from "@/pages/Sincronizacao";
import { ImoveisPage } from "@/pages/Imoveis";
import { ImovelDetalhePage } from "@/pages/ImovelDetalhe";
import { LeadDetalhePage } from "@/pages/LeadDetalhe";
import { LeadsPage } from "@/pages/Leads";
import { LoginPage } from "@/pages/Login";
import { ModulePlaceholder } from "@/pages/ModulePlaceholder";
import { NotFoundPage } from "@/pages/NotFound";
import { PrivacidadePage } from "@/pages/Privacidade";
import { TermosPage } from "@/pages/Termos";

function Root() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        element: <PublicLayout />,
        children: [
          { path: "/privacidade", element: <PrivacidadePage /> },
          { path: "/termos", element: <TermosPage /> },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/leads", element: <LeadsPage /> },
          { path: "/leads/:leadId", element: <LeadDetalhePage /> },
          { path: "/funil", element: <FunilPage /> },
          { path: "/imoveis", element: <ImoveisPage /> },
          { path: "/imoveis/:code", element: <ImovelDetalhePage /> },
          { path: "/agenciamentos", element: <AgenciamentosPage /> },
          { path: "/corretores", element: <CorretoresPage /> },
          { path: "/marketing", element: <MarketingPage /> },
          { path: "/financeiro", element: <FinanceiroPage /> },
          { path: "/sincronizacao", element: <SincronizacaoPage /> },
          { path: "/governanca", element: <GovernancaPage /> },
          { path: "/:modulo", element: <ModulePlaceholder /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
