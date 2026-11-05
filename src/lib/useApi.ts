import { useEffect, useState } from "react";
import { api, ApiError } from "./api";

export type ApiState<T> =
  | { status: "loading"; data: T | null; error: null }
  | { status: "ok"; data: T; error: null }
  | { status: "error"; data: T | null; error: ApiError | Error };

/** Busca `path` e refaz quando ele muda. Mantém o dado anterior enquanto carrega (sem piscar a tela). */
export function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: "loading", data: null, error: null });

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setState((s) => ({ status: "loading", data: s.data, error: null }));
    api<T>(path)
      .then((data) => alive && setState({ status: "ok", data, error: null }))
      .catch((error: Error) => alive && setState((s) => ({ status: "error", data: s.data, error })));
    return () => {
      alive = false;
    };
  }, [path]);

  return state;
}

/** Monta "?a=1&b=2" ignorando vazios */
export function qs(params: Record<string, string | number | null | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
