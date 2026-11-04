import { Link, useLocation } from "react-router";
import { Avatar } from "@/components/ui/Misc";
import { moduleFromPath, navFor, ROLE_NAME, type Role } from "@/lib/nav";

export function Sidebar({ role, userName, counts = {} }: { role: Role; userName: string; counts?: Record<string, string> }) {
  const { pathname } = useLocation();
  const active = moduleFromPath(pathname);
  const groups = navFor(role);

  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-5 border-r border-border-sidebar bg-sidebar px-3 py-[22px]">
      <div className="px-[10px] text-[21px] font-bold tracking-[-0.6px]">ImobiInsight</div>
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
        <Link to="/login" className="text-[12px] text-muted no-underline">
          Sair
        </Link>
      </div>
    </aside>
  );
}
