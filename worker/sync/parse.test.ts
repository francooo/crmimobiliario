import { describe, expect, it } from "vitest";
import { digits, headerKey, matchEnum, normOrigem, normText, parseBool, parseDateTime, parseNumber, stripAgenciador } from "./parse";

describe("parseNumber", () => {
  it.each([
    [285000, 285000],
    ["285000", 285000],
    ["35.71", 35.71],
    ["8000.0", 8000],
    ["1.250,50", 1250.5],
    ["R$ 1.250,50", 1250.5],
    ["1.250", 1250],
    ["1.250.000", 1250000],
    ["-35,7", -35.7],
    ["3,6", 3.6],
  ])("%s → %s", (v, n) => expect(parseNumber(v)).toBe(n));
  it("vazio → null; texto → NaN", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber("abc")).toBeNaN();
  });
});

describe("parseDateTime", () => {
  it.each([
    ["2026-10-28", false, "2026-10-28"],
    ["2026-10-28 10:30", true, "2026-10-28 10:30"],
    ["2026-10-28 10:30", false, "2026-10-28"],
    ["2026-10-28", true, "2026-10-28 00:00"],
    ["28/10/2026", false, "2026-10-28"],
    ["28/10/2026 09:05", true, "2026-10-28 09:05"],
    ["2026-10-28T10:30:00.000Z", true, "2026-10-28 10:30"],
    ["1/5/2026", false, "2026-05-01"],
  ])("%s (hora=%s) → %s", (v, t, out) => expect(parseDateTime(v, t)).toBe(out));
  it("inválidas → undefined; vazio → null", () => {
    expect(parseDateTime("31/02/2026", false)).toBeUndefined();
    expect(parseDateTime("2026-13-01", false)).toBeUndefined();
    expect(parseDateTime("ontem", false)).toBeUndefined();
    expect(parseDateTime("", false)).toBeNull();
  });
});

describe("normalizações do pacote", () => {
  it("origem Portal imobiliário → Portais", () => {
    expect(normOrigem("Portal imobiliário")).toBe("Portais");
    expect(normOrigem("PORTAL IMOBILIARIO")).toBe("Portais");
    expect(normOrigem("Instagram/Facebook")).toBe("Instagram/Facebook");
  });
  it("remove prefixo Agenciador", () => {
    expect(stripAgenciador("Agenciador Luiza Ramos")).toBe("Luiza Ramos");
    expect(stripAgenciador("agenciadora Ana")).toBe("Ana");
    expect(stripAgenciador("")).toBeNull();
  });
  it("telefone vira só dígitos, inclusive vindo como número", () => {
    expect(digits("(51) 99999-0001")).toBe("51999990001");
    expect(digits(51999990001)).toBe("51999990001");
  });
  it("texto normalizado ignora acento, caixa e espaços", () => {
    expect(normText("  Aline   MARTÍNS ")).toBe("aline martins");
    expect(headerKey("Código do Imóvel")).toBe("codigodoimovel");
  });
  it("enum com acento opcional e apelidos", () => {
    expect(matchEnum("locacao", ["Venda", "Locação"] as const)).toBe("Locação");
    expect(matchEnum("aluguel", ["Venda", "Locação"] as const, { aluguel: "Locação" })).toBe("Locação");
    expect(matchEnum("permuta", ["Venda", "Locação"] as const)).toBeUndefined();
  });
  it("booleanos", () => {
    expect(parseBool("Sim", false)).toBe(true);
    expect(parseBool("não", true)).toBe(false);
    expect(parseBool("", true)).toBe(true);
    expect(parseBool("talvez", true)).toBeUndefined();
  });
});
