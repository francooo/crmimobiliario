import { describe, expect, it } from "vitest";
import { periodo } from "./periodo";

const em = (iso: string) => new Date(iso);

describe("período do filtro global", () => {
  it("mês atual (4/nov/2026)", () => {
    expect(periodo("mes", em("2026-11-04T15:00:00Z"))).toMatchObject({
      inicio: "2026-11-01",
      fim: "2026-12-01",
      anteriorInicio: "2026-10-01",
      anteriorFim: "2026-11-01",
      hoje: "2026-11-04",
      label: "novembro de 2026",
    });
  });
  it("mês anterior", () => {
    expect(periodo("anterior", em("2026-11-04T15:00:00Z"))).toMatchObject({ inicio: "2026-10-01", fim: "2026-11-01", label: "outubro de 2026" });
  });
  it("últimos 6 meses incluem o mês atual", () => {
    expect(periodo("6", em("2026-11-04T15:00:00Z"))).toMatchObject({
      inicio: "2026-06-01",
      fim: "2026-12-01",
      anteriorInicio: "2025-12-01",
      label: "junho a novembro de 2026",
    });
  });
  it("virada de ano", () => {
    expect(periodo("3", em("2027-01-10T15:00:00Z"))).toMatchObject({ inicio: "2026-11-01", fim: "2027-02-01", label: "novembro de 2026 a janeiro de 2027" });
  });
  it("usa o fuso de São Paulo: 1º/dez 01h UTC ainda é 30/nov", () => {
    expect(periodo("mes", em("2026-12-01T01:00:00Z"))).toMatchObject({ hoje: "2026-11-30", inicio: "2026-11-01" });
  });
  it("valor desconhecido ou antigo cai no mês atual", () => {
    expect(periodo("xyz", em("2026-11-04T15:00:00Z")).value).toBe("mes");
    expect(periodo("1", em("2026-11-04T15:00:00Z")).value).toBe("mes");
  });
});
