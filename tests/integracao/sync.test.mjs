// Sincronização (como o Apps Script envia): carga, edição diária, lotes, trava, coluna ausente,
// segredo, reenvio, estabilidade do código do lead e vínculos manuais. Termina restaurando os exemplos.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { api, B, check, CORRETOR, prepararCorretor, resumo, sqlDev, vars } from "./_util.mjs";

console.log("Sincronização");
const EX = "docs/planilhas/exemplos";
const tmp = mkdtempSync(join(tmpdir(), "imobi-sync-"));
const syncCsv = (alvo, ...extra) => {
  try {
    return { ok: true, out: execFileSync(process.execPath, ["scripts/sync-csv.mjs", alvo, "--url", B, ...extra], { encoding: "utf8" }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
};
const contar = async (t) => (await sqlDev.query(`select count(*)::int n from ${t}`))[0].n;

let r = syncCsv(EX, "--forcar");
check("carga dos exemplos", r.ok, r.out);
const [k] = await sqlDev`select (select sum(valor) from contratos where tipo = 'Venda')::int vgv,
  (select sum(case when tipo = 'Entrada' then valor else -valor end) from fluxo_caixa)::int saldo,
  (select count(*) from agenciamentos where origem = 'Portais')::int portais`;
check("VGV R$ 9.015.000 · saldo R$ 39.500 · origem padronizada", k.vgv === 9015000 && k.saldo === 39500 && k.portais === 245, JSON.stringify(k));
check("2ª rodada sem alterações não regrava", /sem alterações/.test(syncCsv(`${EX}/04_leads.csv`).out));

// Edição diária: altera 1, remove 1 (Ricardo), adiciona 1
const linhas = readFileSync(`${EX}/04_leads.csv`, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
const edit = [linhas[0], linhas[1].replace('"Visita"', '"Proposta"'), linhas[2], linhas[3],
  '"";"Joana Lima";"(51) 98888-7777";"Casa 10";"Igara";"Juliana Costa";"Portal imobiliário";"novo lead";"05/11/2026 08:15";"";"Primeiro contato";"07/11/2026"'];
writeFileSync(join(tmp, "04_leads.csv"), edit.join("\n"));
r = syncCsv(join(tmp, "04_leads.csv"));
check("edição diária: 1 nova, 1 alterada, 1 removida", /1 novas, 1 alteradas, 1 removidas/.test(r.out), r.out);
const [joana] = await sqlDev`select telefone, origem, etapa, criado_em::text c, codigo_imovel from leads where cliente = 'Joana Lima'`;
check("normaliza telefone, origem, etapa, data BR e liga o imóvel", joana?.telefone === "51988887777" && joana.origem === "Portais" && joana.etapa === "Novo lead" && joana.c === "2026-11-05 08:15:00" && joana.codigo_imovel === "IMV-102", JSON.stringify(joana));
const [atd] = await sqlDev`select lead_id from atendimentos where activity_id = 'ATD-103'`;
check("atendimento do lead removido fica sem vínculo", atd.lead_id === null);
syncCsv(`${EX}/04_leads.csv`);
const [ric] = await sqlDev`select l.lead_id, a.lead_id atd from leads l, atendimentos a where l.cliente = 'Ricardo Alves' and a.activity_id = 'ATD-103'`;
check("lead que volta recupera o MESMO código e o vínculo", ric.lead_id === "LEAD-0004" && ric.atd === "LEAD-0004", JSON.stringify(ric));

// Lotes e trava
const ag = readFileSync(`${EX}/03_agenciamentos.csv`, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
const grande = [...ag];
for (const kk of [1, 2, 3]) grande.push(...ag.slice(1, 236).map((l) => l.replace(/^AG-(\d+)/, `AG-${kk}$1`)));
writeFileSync(join(tmp, "03_agenciamentos.csv"), grande.join("\n"));
r = syncCsv(join(tmp, "03_agenciamentos.csv"));
check("950 linhas em 3 partes", r.ok && (await contar("agenciamentos")) === 950, r.out);
r = syncCsv(`${EX}/03_agenciamentos.csv`);
check("trava: remover > 50% é bloqueado", !r.ok && /Bloqueado/.test(r.out) && (await contar("agenciamentos")) === 950, r.out);
r = syncCsv(`${EX}/03_agenciamentos.csv`, "--forcar");
check("forçar libera a remoção", r.ok && (await contar("agenciamentos")) === 245);

// Coluna obrigatória ausente
const cx = readFileSync(`${EX}/07_fluxo_caixa.csv`, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/).map((l) => l.split(";").filter((_, i) => i !== 3).join(";"));
writeFileSync(join(tmp, "07_fluxo_caixa.csv"), cx.join("\n"));
r = syncCsv(join(tmp, "07_fluxo_caixa.csv"));
check("coluna obrigatória ausente → recusada, dados mantidos", !r.ok && /categoria/.test(r.out) && (await contar("fluxo_caixa")) === 54, r.out);

// Segredo e parâmetros
const sec = vars.SYNC_SECRET;
const raw = (qs, auth, body = "{}") => fetch(`${B}/api/sync/${qs}`, { method: "POST", headers: { "content-type": "application/json", ...(auth ? { authorization: `Bearer ${auth}` } : {}) }, body });
check("segredo errado → 401", (await raw("leads?parte=1&total=1&hash=x", "errado")).status === 401);
check("sem segredo → 401", (await raw("leads?parte=1&total=1&hash=x")).status === 401);
check("planilha inexistente → 404", (await raw("usuarios?parte=1&total=1&hash=x", sec)).status === 404);
check("parte > total → 400", (await raw("leads?parte=3&total=2&hash=x", sec)).status === 400);

// Reenvio idempotente da última parte
const hash = `t-${Date.now()}`;
const regs = JSON.stringify({ registros: [{ nome: "Campanha Reenvio", canal: "Site", leads: 1, custo: 1, cpl: 1, fechados: 0, inicio: null, fim: null, sheet_row: 2 }], avisos: [] });
const p1 = await (await raw(`campanhas?parte=1&total=2&hash=${hash}&forcar=1`, sec, regs)).json();
await raw(`campanhas?parte=2&total=2&hash=${hash}&forcar=1&runId=${p1.runId}`, sec, '{"registros":[],"avisos":[]}');
const again = await (await raw(`campanhas?parte=2&total=2&hash=${hash}&forcar=1&runId=${p1.runId}`, sec, '{"registros":[],"avisos":[]}')).json();
check("reenvio da última parte é reconhecido (sem erro)", again.status === "ok" && again.reenvio === true, JSON.stringify(again));
syncCsv(`${EX}/08_campanhas.csv`, "--forcar");

// Vínculo manual sobrevive à sincronização
await prepararCorretor();
const pend = async () => (await (await api("GET", "/api/sincronizacao")).json()).pendenciasPorTipo;
const antes = await pend();
const v = await (await api("POST", "/api/vinculos", { body: { tipo: "contrato_lead", origem: "VEN-0001", alvo: "LEAD-0001" } })).json();
syncCsv(`${EX}/06_contratos.csv`, "--forcar");
check("vínculo manual sobrevive a nova sincronização", (await pend()).sem_lead === antes.sem_lead - 1);
check("corretor não cria vínculo (403)", (await api("POST", "/api/vinculos", { email: CORRETOR, body: { tipo: "contrato_lead", origem: "VEN-0002", alvo: "LEAD-0002" } })).status === 403);
await api("DELETE", `/api/vinculos/${v.id}`);
check("remover vínculo restaura a pendência", JSON.stringify(await pend()) === JSON.stringify(antes));

syncCsv(EX, "--forcar");
await prepararCorretor(); // a recarga dos exemplos apaga o e-mail de teste
resumo("Sincronização");
