import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/layouts/AppLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { LoginPage } from "@/pages/Login";
import { ModulePlaceholder } from "@/pages/ModulePlaceholder";
import { NotFoundPage } from "@/pages/NotFound";
import { PrivacidadePage } from "@/pages/Privacidade";
import { TermosPage } from "@/pages/Termos";

export const router = createBrowserRouter([
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
      { path: "/:modulo", element: <ModulePlaceholder /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
