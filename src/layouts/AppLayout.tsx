import { Outlet } from "react-router";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import type { Role } from "@/lib/nav";

// Fase 0: usuário fixo. Na fase 1 vem da sessão (login Google + planilha Corretores).
const DEV_USER = { name: "Andrews Franco", role: "socio" as Role };

export function AppLayout() {
  return (
    <ToastProvider>
      <div className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)]">
        <Sidebar role={DEV_USER.role} userName={DEV_USER.name} />
        <div className="flex min-w-0 flex-col">
          <Header />
          <main className="flex min-w-0 flex-col gap-5 px-7 pb-12 pt-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
