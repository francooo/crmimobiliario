import Link from "next/link";

export const metadata = { title: "Entrar" };

// Login em duas colunas (painel escuro da marca + formulário). O botão Google é ligado na fase 1.
export default function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-between gap-10 bg-primary px-14 py-12 text-bg">
        <div className="text-[24px] font-bold tracking-[-0.6px]">ImobiInsight</div>
        <div className="flex max-w-[520px] flex-col gap-[18px]">
          <div className="text-[44px] font-semibold leading-[1.05] tracking-[-1.4px]">Gestão comercial e inteligência</div>
          <div className="text-[17px] leading-normal text-login-muted">
            Leads, atendimentos, agenciamentos e resultados financeiros reunidos em um só painel.
          </div>
        </div>
        <div className="h-[15px]" />
      </div>
      <div className="flex items-center justify-center p-10">
        <div className="flex w-full max-w-[380px] flex-col gap-[22px]">
          <div className="flex flex-col gap-[6px]">
            <div className="text-[28px] font-semibold tracking-[-0.8px]">Entrar</div>
            <div className="text-[15px] text-muted-2">Acesse com a conta Google cadastrada pela imobiliária.</div>
          </div>
          <button
            type="button"
            disabled
            className="flex h-12 items-center justify-center gap-3 rounded-input border border-border-strong bg-surface text-[15px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            Entrar com Google
          </button>
          <div className="border-t border-border pt-4 text-[13px] leading-normal text-muted-2">
            O acesso é liberado para os e-mails cadastrados na planilha de Corretores. O perfil (sócio, gerente, administrativo ou
            corretor) define quais módulos aparecem após o login.
          </div>
          <div className="flex gap-4 text-[13px]">
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos de uso</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
