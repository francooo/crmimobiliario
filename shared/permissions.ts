// Perfis, módulos e permissões — docs/pacote/REGRAS-DE-NEGOCIO.md §1.
// Usado pelas telas (menu) e pela API (bloqueio no servidor).

export type Role = "socio" | "locacoes" | "admin" | "corretor";

export const ROLES: Role[] = ["socio", "locacoes", "admin", "corretor"];

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

/** null = todos os módulos */
const ROLE_MODULES: Record<Role, ModuleKey[] | null> = {
  socio: null,
  locacoes: ["leads", "funil", "imoveis", "agenciamentos", "corretores", "governanca"],
  admin: ["agenciamentos", "financeiro", "sincronizacao", "governanca"],
  corretor: ["leads", "funil", "imoveis", "agenciamentos", "governanca"],
};

export function canAccess(role: Role, module: ModuleKey): boolean {
  const allowed = ROLE_MODULES[role];
  return allowed === null || allowed.includes(module);
}

/** Primeira tela permitida — destino após o login (o Administrativo não vê o Dashboard). */
export function homeModule(role: Role): ModuleKey {
  const order: ModuleKey[] = ["dashboard", "leads", "agenciamentos", "financeiro", "governanca"];
  return order.find((m) => canAccess(role, m)) ?? "governanca";
}

/** Matriz de operações (tela Governança) */
export type Operation =
  | "registrar_leads"
  | "importar_financeiro"
  | "ver_consolidado"
  | "cadastrar_agenciamentos"
  | "ver_locacao"
  | "aprovar_financeiro"
  | "configurar_perfis"
  | "enviar_fotos";

const OPERATIONS: Record<Operation, Role[]> = {
  registrar_leads: ["socio", "locacoes", "corretor"],
  importar_financeiro: ["socio", "admin"],
  ver_consolidado: ["socio"],
  cadastrar_agenciamentos: ["socio", "locacoes", "admin", "corretor"],
  ver_locacao: ["socio", "locacoes"],
  aprovar_financeiro: ["socio"],
  configurar_perfis: ["socio"],
  enviar_fotos: ["socio", "locacoes", "corretor"],
};

export const OPERATION_LABEL: Record<Operation, string> = {
  registrar_leads: "Registrar leads e atendimentos",
  importar_financeiro: "Lançar contratos e caixa",
  ver_consolidado: "Ver VGV e caixa consolidados",
  cadastrar_agenciamentos: "Cadastrar agenciamentos",
  ver_locacao: "Ver indicadores de locação",
  aprovar_financeiro: "Aprovar dados financeiros",
  configurar_perfis: "Configurar perfis",
  enviar_fotos: "Enviar fotos de imóveis",
};

export function can(role: Role, op: Operation): boolean {
  return OPERATIONS[op].includes(role);
}

/** Converte o texto da coluna "perfil" da planilha Corretores no código do perfil. */
export function parseRole(text: string | null | undefined): Role | null {
  const t = (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (!t) return null;
  if (t.startsWith("socio") || t.includes("gestor")) return "socio";
  if (t.includes("locac") || t.startsWith("gerente")) return "locacoes";
  if (t.startsWith("admin")) return "admin";
  if (t.startsWith("corretor") || t.startsWith("agenciador")) return "corretor";
  return null;
}

/** Usuário autenticado, como a API devolve em GET /api/me */
export type SessionUser = {
  email: string;
  nome: string;
  role: Role;
  foto?: string | null;
};
