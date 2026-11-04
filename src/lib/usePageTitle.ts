import { useEffect } from "react";

/** Define o título da aba: "Leads · ImobiInsight" */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ImobiInsight` : "ImobiInsight";
  }, [title]);
}
