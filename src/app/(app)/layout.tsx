import { Suspense } from "react";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { ToastProvider } from "@/components/ui/Toast";
import type { Role } from "@/lib/nav";

// Fase 0: usuário fixo. Na fase 1 vem da sessão (login Google + planilha Corretores).
const DEV_USER = { name: "Andrews Franco", role: "socio" as Role };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="grid min-h-screen grid-cols-[232px_minmax(0,1fr)]">
        <Sidebar role={DEV_USER.role} userName={DEV_USER.name} />
        <div className="flex min-w-0 flex-col">
          <Suspense fallback={<div className="min-h-[68px] border-b border-border" />}>
            <Header />
          </Suspense>
          <main className="flex min-w-0 flex-col gap-5 px-7 pb-12 pt-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
