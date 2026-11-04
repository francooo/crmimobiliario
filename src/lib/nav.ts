// Perfis e módulos — docs/pacote/REGRAS-DE-NEGOCIO.md §1
export type Role = "socio" | "locacoes" | "admin" | "corretor";

export const ROLE_NAME: Record<Role, string> = {
  socio: "Sócio / Gestor",
  locacoes: "Gerente de locações",
  admin: "Administrativo",
  corretor: "Corretor",
};

export type ModuleKey =
  | "dashboard"
  | "leads"
  | "funil"
  | "imoveis"
  | "agenciamentos"
  | "corretores"
  | "marketing"
  | "financeiro"
  | "sincronizacao"
  | "governanca";

export const MODULES: Record<ModuleKey, { label: string; href: string }> = {
  dashboard: { label: "Dashboard", href: "/" },
  leads: { label: "Leads", href: "/leads" },
  funil: { label: "Funil", href: "/funil" },
  imoveis: { label: "Imóveis", href: "/imoveis" },
  agenciamentos: { label: "Agenciamentos", href: "/agenciamentos" },
  corretores: { label: "Corretores", href: "/corretores" },
  marketing: { label: "Marketing", href: "/marketing" },
  financeiro: { label: "Financeiro", href: "/financeiro" },
  sincronizacao: { label: "Sincronização", href: "/sincronizacao" },
  governanca: { label: "Governança", href: "/governanca" },
};

export const NAV_GROUPS: { label: string; items: ModuleKey[] }[] = [
  { label: "Comercial", items: ["dashboard", "leads", "funil", "imoveis", "agenciamentos"] },
  { label: "Gestão", items: ["corretores", "marketing", "financeiro"] },
  { label: "Administração", items: ["sincronizacao", "governanca"] },
];

/** null = todos os módulos */
const ROLE_ALLOWED: Record<Role, ModuleKey[] | null> = {
  socio: null,
  locacoes: ["leads", "funil", "imoveis", "agenciamentos", "corretores", "governanca"],
  admin: ["agenciamentos", "financeiro", "sincronizacao", "governanca"],
  corretor: ["leads", "funil", "imoveis", "agenciamentos", "governanca"],
};

export function canAccess(role: Role, module: ModuleKey): boolean {
  const allowed = ROLE_ALLOWED[role];
  return allowed === null || allowed.includes(module);
}

export function navFor(role: Role) {
  return NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter((m) => canAccess(role, m)).map((m) => ({ key: m, ...MODULES[m] })),
  })).filter((g) => g.items.length > 0);
}

/** Módulo ativo a partir do caminho da URL */
export function moduleFromPath(pathname: string): ModuleKey | null {
  if (pathname === "/") return "dashboard";
  const seg = pathname.split("/")[1];
  return (Object.keys(MODULES) as ModuleKey[]).find((k) => MODULES[k].href === `/${seg}`) ?? null;
}
