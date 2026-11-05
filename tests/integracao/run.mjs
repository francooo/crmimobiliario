// Roda todos os testes de integração em sequência contra a API local.
// Pré-requisitos: `npm run preview` (ou `npm run dev`) na porta 3000 e .dev.vars apontando para o banco neondb_dev.
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE ?? "http://localhost:3000";
try {
  const r = await fetch(`${BASE}/api/health`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
} catch (e) {
  console.error(`✘ API local indisponível em ${BASE} (${e.message}). Rode "npm run preview" antes.`);
  process.exit(2);
}

let falhou = false;
for (const t of ["sync", "auth", "fotos"]) {
  try {
    execFileSync(process.execPath, [`tests/integracao/${t}.test.mjs`], { stdio: "inherit", env: { ...process.env, BASE } });
  } catch (e) {
    if (e.status === 2) process.exit(2);
    falhou = true;
  }
}
console.log(falhou ? "✘ Há falhas nos testes de integração." : "✔ Todos os testes de integração passaram.");
process.exitCode = falhou ? 1 : 0;
