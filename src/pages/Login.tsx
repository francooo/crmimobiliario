import { Link, Navigate, useSearchParams } from "react-router";
import { googleLoginUrl, useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/usePageTitle";

const ERRORS: Record<string, string> = {
  "nao-autorizado": "Este e-mail não está cadastrado na planilha de Corretores. Peça a liberação a um sócio.",
  inativo: "Seu acesso está desativado na planilha de Corretores.",
  cancelado: "O login com Google foi cancelado.",
  "sessao-expirada": "A tentativa de login expirou. Tente novamente.",
  "email-nao-verificado": "O e-mail desta conta Google não está verificado.",
  google: "Não foi possível concluir o login com o Google. Tente novamente.",
};

/** Aceita só caminhos internos, para não virar redirecionamento aberto */
function safePath(p: string | null) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

// Login em duas colunas (painel escuro da marca + formulário)
export function LoginPage() {
  usePageTitle("Entrar");
  const [params] = useSearchParams();
  const auth = useAuth();
  const voltar = safePath(params.get("voltar"));
  const erro = params.get("erro");

  if (auth.status === "authenticated") return <Navigate to={voltar} replace />;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-bg md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col justify-between gap-6 bg-primary px-6 py-8 text-bg md:gap-10 md:px-14 md:py-12">
        <div className="text-[24px] font-bold tracking-[-0.6px]">ImobiInsight</div>
        <div className="flex max-w-[520px] flex-col gap-[18px]">
          <div className="text-[32px] font-semibold leading-[1.05] tracking-[-1.2px] md:text-[44px] md:tracking-[-1.4px]">Gestão comercial e inteligência</div>
          <div className="text-[17px] leading-normal text-login-muted">
            Leads, atendimentos, agenciamentos e resultados financeiros reunidos em um só painel.
          </div>
        </div>
        <div className="h-[15px]" />
      </div>
      <div className="flex items-center justify-center px-6 py-10 md:p-10">
        <div className="flex w-full max-w-[380px] flex-col gap-[22px]">
          <div className="flex flex-col gap-[6px]">
            <div className="text-[28px] font-semibold tracking-[-0.8px]">Entrar</div>
            <div className="text-[15px] text-muted-2">Acesse com a conta Google cadastrada pela imobiliária.</div>
          </div>
          {erro && (
            <div role="alert" className="rounded-[8px] bg-danger-bg px-3 py-[9px] text-[13.5px] text-danger">
              {ERRORS[erro] ?? ERRORS.google}
            </div>
          )}
          {/* Navegação completa (não SPA): o Worker redireciona para o Google */}
          <a
            href={googleLoginUrl(voltar)}
            className="flex h-12 items-center justify-center gap-3 rounded-input border border-border-strong bg-surface text-[15px] font-semibold text-ink no-underline hover:bg-row-hover hover:text-ink"
          >
            <GoogleIcon />
            Entrar com Google
          </a>
          <div className="border-t border-border pt-4 text-[13px] leading-normal text-muted-2">
            O acesso é liberado para os e-mails cadastrados na planilha de Corretores. O perfil (sócio, gerente, administrativo ou
            corretor) define quais módulos aparecem após o login.
          </div>
          <div className="flex gap-4 text-[13px]">
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos de uso</Link>
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
