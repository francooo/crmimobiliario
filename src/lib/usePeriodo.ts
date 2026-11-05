import { useSearchParams } from "react-router";
import { parsePeriodo, type PeriodoValue } from "../../shared/periodo";

const KEY = "imobi_periodo";

function lerSalvo(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Período do cabeçalho: vem da URL (?periodo=) ou da última escolha na sessão. */
export function usePeriodo(): [PeriodoValue, (v: PeriodoValue) => void] {
  const [params, setParams] = useSearchParams();
  const valor = parsePeriodo(params.get("periodo") ?? lerSalvo());
  function set(v: PeriodoValue) {
    try {
      sessionStorage.setItem(KEY, v);
    } catch {
      /* navegação privada: segue só pela URL */
    }
    const next = new URLSearchParams(params);
    next.set("periodo", v);
    setParams(next);
  }
  return [valor, set];
}
