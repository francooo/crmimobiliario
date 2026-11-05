// Envia CSVs à API de sincronização exatamente como o Apps Script faz: valida com o mesmo
// scripts/apps-script/Validacao.gs, calcula o hash, envia em lotes. Útil para testes locais
// e como importação manual de emergência.
//
// Uso: node scripts/sync-csv.mjs <pasta-ou-arquivo.csv> [--url http://localhost:3000] [--forcar] [--so leads]
//   O nome do arquivo define a planilha: 01_corretores.csv, imoveis.csv, fluxo_caixa.csv…
//   SYNC_SECRET vem do ambiente ou de .dev.vars.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import vm from "node:vm";

const ORDEM = ["corretores", "imoveis", "agenciamentos", "leads", "atendimentos", "contratos", "fluxo_caixa", "campanhas"];
const LOTE = 400;

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const alvo = args.find((a, i) => !a.startsWith("--") && !["--url", "--so"].includes(args[i - 1]));
const url = opt("--url", "http://localhost:3000");
const forcar = args.includes("--forcar");
const so = opt("--so", null);

let secret = process.env.SYNC_SECRET;
if (!secret && existsSync(".dev.vars")) {
  secret = readFileSync(".dev.vars", "utf8").split(/\r?\n/).find((l) => l.startsWith("SYNC_SECRET="))?.slice(12).trim();
}
if (!alvo || !secret) {
  console.error("Uso: node scripts/sync-csv.mjs <pasta|arquivo.csv> [--url URL] [--forcar] [--so planilha]  (SYNC_SECRET necessário)");
  process.exit(1);
}

// Mesmo código de validação que roda no Apps Script
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("./apps-script/Validacao.gs", import.meta.url), "utf8") + ";this.ImobiSync = ImobiSync;", ctx);
const { validateSheet } = ctx.ImobiSync;

function parseCsv(path) {
  const t = readFileSync(path, "utf8").replace(/^﻿/, "");
  const first = t.split(/\r?\n/)[0];
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ""));
}

function planilhaDoArquivo(file) {
  const n = basename(file, ".csv").toLowerCase().replace(/^\d+_/, "").replace(/^(modelo|exemplo)_(preenchido_)?(importacao_)?/, "");
  if (n.startsWith("vgv") || n.startsWith("contratos")) return "contratos";
  if (n.startsWith("agenciamentos")) return "agenciamentos";
  return ORDEM.find((p) => n === p || n.startsWith(p)) ?? null;
}

async function post(planilha, params, body) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${url}/api/sync/${planilha}?${qs}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { http: res.status, ...json };
}

const files = statSync(alvo).isDirectory() ? readdirSync(alvo).filter((f) => f.endsWith(".csv")).map((f) => join(alvo, f)) : [alvo];
const porPlanilha = new Map();
for (const f of files) {
  const p = planilhaDoArquivo(f);
  if (p) porPlanilha.set(p, f);
}

let falhas = 0;
for (const planilha of ORDEM) {
  const file = porPlanilha.get(planilha);
  if (!file || (so && so !== planilha)) continue;
  const t0 = Date.now();
  const [cabecalho, ...linhas] = parseCsv(file);
  const v = validateSheet(planilha, cabecalho, linhas, 2);
  const fonte = { url: `arquivo:${basename(file)}` };
  const hash = createHash("sha256").update(JSON.stringify(v.records)).digest("hex");
  const base = { hash, origem: "csv", forcar: forcar ? 1 : 0 };

  let r;
  if (v.missingColumns.length) {
    r = await post(planilha, { ...base, parte: 1, total: 1 }, { erro: v.issues[0].mensagem, avisos: v.issues, fonte });
  } else {
    const total = Math.max(1, Math.ceil(v.records.length / LOTE));
    let runId = null;
    for (let parte = 1; parte <= total; parte++) {
      const ini = (parte - 1) * LOTE;
      r = await post(planilha, { ...base, parte, total, runId }, {
        registros: v.records.slice(ini, ini + LOTE),
        avisos: parte === 1 ? v.issues : [],
        fonte,
      });
      if (r.status !== "parcial") break;
      runId = r.runId;
    }
  }
  const ms = Date.now() - t0;
  if (r.status === "ok") {
    console.log(`✔ ${planilha.padEnd(13)} ${String(v.records.length).padStart(4)} registros · ${r.inseridas} novas, ${r.atualizadas} alteradas, ${r.removidas} removidas, ${r.avisos} avisos · ${ms} ms`);
  } else if (r.status === "ignorado") {
    console.log(`· ${planilha.padEnd(13)} sem alterações`);
  } else {
    falhas++;
    console.log(`✘ ${planilha.padEnd(13)} HTTP ${r.http} ${r.erro ?? r.error ?? ""}`);
  }
}
process.exitCode = falhas ? 1 : 0;
