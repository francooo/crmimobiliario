import { Link, Outlet } from "react-router";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-4 py-4">
          <Link to="/login" className="text-[21px] font-bold tracking-[-0.6px] text-ink no-underline">
            ImobiInsight
          </Link>
          <nav className="flex gap-4 text-[14px]">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
          </nav>
        </div>
      </header>
      <article className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 py-10 text-[15px] leading-relaxed text-ink-3 [&_h1]:m-0 [&_h1]:text-[30px] [&_h1]:font-semibold [&_h1]:tracking-[-0.9px] [&_h1]:text-ink [&_h2]:mb-0 [&_h2]:mt-4 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-ink [&_p]:m-0 [&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
        <Outlet />
      </article>
    </div>
  );
}
