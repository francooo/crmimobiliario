import { useApi } from "./useApi";

type Fontes = Record<string, { url: string; ultimaSync: string }>;

/** URL da planilha Google de origem (para os botões "Abrir na planilha"). */
export function useFonte(planilha: string): string | null {
  const { data } = useApi<Fontes>("/fontes");
  return data?.[planilha]?.url ?? null;
}
