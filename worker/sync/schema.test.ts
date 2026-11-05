import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateSheet, type Planilha } from "./schema";

/** CSV ; com aspas — formato dos exemplos do pacote */
function csv(path: string): string[][] {
  const t = readFileSync(path, "utf8").replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ";") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ""));
}

const EX = "docs/planilhas/exemplos";
const load = (file: string, planilha: Planilha) => {
  const [header, ...rows] = csv(`${EX}/${file}`);
  return validateSheet(planilha, header!, rows);
};

describe("exemplos do pacote passam na validação", () => {
  it("agenciamentos: 245, origem padronizada e prefixo removido", () => {
    const r = load("03_agenciamentos.csv", "agenciamentos");
    expect(r.issues).toEqual([]);
    expect(r.records).toHaveLength(245);
    expect(new Set(r.records.map((x) => x.origem))).toEqual(new Set(["Portais"]));
    expect(r.records.some((x) => String(x.agenciador ?? "").startsWith("Agenciador"))).toBe(false);
    expect(r.records.filter((x) => x.modalidade === "Venda")).toHaveLength(150);
  });

  it("contratos: VGV de vendas = R$ 9.015.000 e comissão = R$ 324.540,01", () => {
    const r = load("06_contratos.csv", "contratos");
    expect(r.issues).toEqual([]);
    expect(r.records).toHaveLength(111);
    const vendas = r.records.filter((x) => x.tipo === "Venda");
    expect(vendas.reduce((s, x) => s + (x.valor as number), 0)).toBe(9_015_000);
    expect(Math.round(vendas.reduce((s, x) => s + (x.comissao as number), 0) * 100) / 100).toBe(324_540.01);
  });

  it("fluxo de caixa: saldo R$ 39.500", () => {
    const r = load("07_fluxo_caixa.csv", "fluxo_caixa");
    expect(r.issues).toEqual([]);
    const saldo = r.records.reduce((s, x) => s + (x.tipo === "Entrada" ? 1 : -1) * (x.valor as number), 0);
    expect(saldo).toBe(39_500);
  });

  it("leads, atendimentos, imóveis, campanhas e corretores", () => {
    expect(load("04_leads.csv", "leads").records).toHaveLength(4);
    expect(load("05_atendimentos.csv", "atendimentos").records).toHaveLength(3);
    expect(load("02_imoveis.csv", "imoveis").records).toHaveLength(3);
    const camp = load("08_campanhas.csv", "campanhas");
    expect(camp.records.map((x) => x.cpl)).toEqual([35.71, 42.86]);
    const cor = load("01_corretores.csv", "corretores");
    expect(cor.issues).toEqual([]);
    expect(cor.records.find((x) => x.email === "andrewsfranco93@gmail.com")?.perfil).toBe("socio");
  });

  it("modelos vazios (só cabeçalho) também são aceitos", () => {
    for (const [file, p] of [["06_contratos.csv", "contratos"], ["07_fluxo_caixa.csv", "fluxo_caixa"]] as const) {
      const [header] = csv(`docs/planilhas/modelos/${file}`);
      const r = validateSheet(p, header!, []);
      expect(r.missingColumns).toEqual([]);
      expect(r.records).toEqual([]);
    }
  });
});

describe("planilhas reais com variações", () => {
  it("cabeçalhos em português, com acento e maiúsculas", () => {
    const r = validateSheet(
      "contratos",
      ["Contrato", "Cliente", "Imóvel", "Tipo", "Valor", "Data de fechamento", "Corretor", "Origem", "Comissão"],
      [["VEN-1", "Ana", "Casa 10", "locacao", "2.500,00", "05/11/2026", "Carlos Lima", "Portal imobiliário", "1.250,00"]],
    );
    expect(r.missingColumns).toEqual([]);
    expect(r.records[0]).toMatchObject({ contract_id: "VEN-1", tipo: "Locação", valor: 2500, data_fechamento: "2026-11-05", origem: "Portais", comissao: 1250 });
  });

  it("coluna obrigatória ausente bloqueia a planilha", () => {
    const r = validateSheet("fluxo_caixa", ["entryId", "data", "tipo", "descricao", "valor"], [["CX-1", "2026-11-01", "Entrada", "x", "10"]]);
    expect(r.missingColumns).toEqual(["categoria"]);
    expect(r.records).toEqual([]);
  });

  it("linha inválida vira aviso e não entra; as outras entram", () => {
    const r = validateSheet(
      "fluxo_caixa",
      ["entryId", "data", "tipo", "categoria", "valor"],
      [
        ["CX-1", "2026-11-01", "Entrada", "Vendas - comissões recebidas", "1000"],
        ["CX-2", "31/02/2026", "Entrada", "Vendas - comissões recebidas", "1000"],
        ["CX-3", "2026-11-02", "Transferência", "Despesas - estrutura", "50"],
        ["", "", "", "", ""],
      ],
    );
    expect(r.records.map((x) => x.entry_id)).toEqual(["CX-1"]);
    expect(r.issues.map((i) => [i.linha, i.tipo])).toEqual([
      [3, "invalido"],
      [4, "invalido"],
    ]);
  });

  it("chave repetida: a última linha prevalece e gera aviso", () => {
    const r = validateSheet("imoveis", ["code", "name"], [["IMV-1", "A"], ["IMV-1", "B"]]);
    expect(r.records).toHaveLength(1);
    expect(r.records[0]!.nome).toBe("B");
    expect(r.issues[0]!.tipo).toBe("duplicado");
  });

  it("leadId repetido entre telefones é ignorado para vínculo", () => {
    const r = validateSheet(
      "leads",
      ["leadId", "cliente", "telefone", "corretor", "origem", "stage", "createdAt"],
      [
        ["L1", "Ana", "51 99999-0001", "Carlos", "Site", "Visita", "2026-11-01 10:00"],
        ["L1", "Bia", "51999990002", "Carlos", "Site", "Novo lead", "2026-11-01"],
      ],
    );
    expect(r.records.map((x) => [x.telefone, x.lead_id_planilha])).toEqual([
      ["51999990001", null],
      ["51999990002", null],
    ]);
  });
});
