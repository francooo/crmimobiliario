import { describe, expect, it } from "vitest";
import { can, canAccess, homeModule, parseRole } from "./permissions";

describe("parseRole (coluna perfil da planilha Corretores)", () => {
  it.each([
    ["Sócio / Gestor", "socio"],
    ["socio", "socio"],
    ["Gestor", "socio"],
    ["Gerente de locações", "locacoes"],
    ["Locações", "locacoes"],
    ["Administrativo", "admin"],
    ["Corretor", "corretor"],
    ["Agenciador", "corretor"],
  ])("%s → %s", (texto, esperado) => {
    expect(parseRole(texto)).toBe(esperado);
  });

  it("vazio ou desconhecido → null", () => {
    expect(parseRole("")).toBeNull();
    expect(parseRole(undefined)).toBeNull();
    expect(parseRole("Estagiário")).toBeNull();
  });
});

describe("canAccess (REGRAS-DE-NEGOCIO §1)", () => {
  it("Sócio vê todos os módulos", () => {
    for (const m of ["dashboard", "financeiro", "marketing", "sincronizacao", "governanca"] as const) {
      expect(canAccess("socio", m)).toBe(true);
    }
  });
  it("Corretor não vê Financeiro, Marketing, Dashboard nem Sincronização", () => {
    expect(canAccess("corretor", "financeiro")).toBe(false);
    expect(canAccess("corretor", "marketing")).toBe(false);
    expect(canAccess("corretor", "dashboard")).toBe(false);
    expect(canAccess("corretor", "sincronizacao")).toBe(false);
    expect(canAccess("corretor", "leads")).toBe(true);
  });
  it("Administrativo vê Financeiro e Sincronização, mas não Leads", () => {
    expect(canAccess("admin", "financeiro")).toBe(true);
    expect(canAccess("admin", "sincronizacao")).toBe(true);
    expect(canAccess("admin", "leads")).toBe(false);
  });
  it("Gerente de locações vê Corretores, mas não Financeiro", () => {
    expect(canAccess("locacoes", "corretores")).toBe(true);
    expect(canAccess("locacoes", "financeiro")).toBe(false);
  });
});

describe("operações e tela inicial", () => {
  it("só o Sócio vê o consolidado e configura perfis", () => {
    expect(can("socio", "ver_consolidado")).toBe(true);
    expect(can("admin", "ver_consolidado")).toBe(false);
    expect(can("locacoes", "configurar_perfis")).toBe(false);
  });
  it("tela inicial respeita o perfil", () => {
    expect(homeModule("socio")).toBe("dashboard");
    expect(homeModule("corretor")).toBe("leads");
    expect(homeModule("admin")).toBe("agenciamentos");
  });
});
