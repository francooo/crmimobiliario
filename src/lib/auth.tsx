import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SessionUser } from "../../shared/permissions";
import { api, ApiError } from "./api";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  /** Falha de rede/servidor: NÃO desloga — mostra aviso e permite tentar de novo */
  | { status: "offline"; user: null }
  | { status: "authenticated"; user: SessionUser };

type AuthCtx = AuthState & { logout: () => Promise<void>; refresh: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const refresh = useCallback(async () => {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        const user = await api<SessionUser>("/me");
        setState({ status: "authenticated", user });
        return;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setState({ status: "anonymous", user: null });
          return;
        }
        console.error("auth: falha ao carregar sessão", err);
        await sleep(800 * (tentativa + 1));
      }
    }
    setState({ status: "offline", user: null });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setState({ status: "anonymous", user: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <Ctx.Provider value={{ ...state, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}

/** Endereço que inicia o login com Google e volta para `voltar` depois. */
export function googleLoginUrl(voltar = "/") {
  return `/api/auth/google?voltar=${encodeURIComponent(voltar)}`;
}
