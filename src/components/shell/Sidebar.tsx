import { Link, useLocation, useNavigate } from "react-router";
import { Avatar } from "@/components/ui/Misc";
import { useAuth } from "@/lib/auth";
import { moduleFromPath, navFor, ROLE_NAME, type Role } from "@/lib/nav";

export function Sidebar({
  role,
  userName,
  counts = {},
  aberto = false,
  onFechar,
}: {
  role: Role;
  userName: string;
  counts?: Record<string, string>;
  /** celular: gaveta aberta */
  aberto?: boolean;
  onFechar?: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const active = moduleFromPath(pathname);
  const groups = navFor(role);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[260px] flex-col gap-5 border-r border-border-sidebar bg-sidebar px-3 py-[22px] transition-transform md:sticky md:top-0 md:z-auto md:w-auto md:translate-x-0 ${
        aberto ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-label="Menu principal"
    >
      <div className="flex items-center justify-between px-[10px]">
        <div className="text-[21px] font-bold tracking-[-0.6px]">ImobiInsight</div>
        <button type="button" onClick={onFechar} aria-label="Fechar menu" className="cursor-pointer border-0 bg-transparent text-[24px] leading-none text-muted md:hidden">
          ×
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-[18px] overflow-auto">
        {groups.map((g) => (
          <div key={g.label} className="flex flex-col gap-[2px]">
            <div className="px-[10px] pb-[6px] font-mono text-[11px] uppercase tracking-[0.8px] text-subtle">{g.label}</div>
            {g.items.map((it) => {
              const on = it.key === active;
              return (
                <Link
                  key={it.key}
                  to={it.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center justify-between rounded-[8px] px-[10px] py-[9px] text-[14.5px] no-underline ${
                    on ? "bg-primary font-semibold text-white hover:text-white" : "text-ink-2 hover:bg-[#e2e2e5]"
                  }`}
                >
                  {it.label}
                  {counts[it.key] && <span className="font-mono text-[11px] opacity-70">{counts[it.key]}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-[10px] border-t border-[#dcdde0] p-[10px]">
        <Avatar name={userName} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold">{userName}</span>
          <span className="text-[12px] text-muted-2">{ROLE_NAME[role]}</span>
        </div>
        <button type="button" onClick={onLogout} className="cursor-pointer border-0 bg-transparent text-[12px] text-muted hover:text-ink">
          Sair
        </button>
      </div>
    </aside>
  );
}
