// Cópia de segurança do que SÓ existe no sistema (as planilhas Google já guardam o resto):
// fotos dos imóveis, vínculos manuais, códigos de lead e histórico de alterações.
// Uso: npm run db:backup -- --producao      → backups/AAAA-MM-DD_HHMM/ (fora do Git)
//      npm run db:backup                    → banco de desenvolvimento
import { neon } from "@neondatabase/serverless";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { databaseUrl, PRODUCAO } from "./_env.mjs";

const sql = neon(databaseUrl());
const agora = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const dir = join("backups", `${agora}${PRODUCAO ? "" : "_dev"}`);
mkdirSync(join(dir, "fotos"), { recursive: true });

const fotos = await sql`select id, imovel_code, hash, ordem, capa, tamanho, criado_por, criado_em from imovel_fotos order by id`;
let bytes = 0;
for (const f of fotos) {
  const [{ img, mini }] = await sql`select encode(imagem, 'base64') img, encode(miniatura, 'base64') mini from imovel_fotos where id = ${f.id}`;
  const buf = Buffer.from(img.replace(/\n/g, ""), "base64");
  const ext = buf[0] === 0xff && buf[1] === 0xd8 ? "jpg" : "webp";
  const base = `${f.imovel_code.replace(/[^\w-]/g, "_")}__${f.id}`;
  writeFileSync(join(dir, "fotos", `${base}.${ext}`), buf);
  writeFileSync(join(dir, "fotos", `${base}-mini.${ext}`), Buffer.from(mini.replace(/\n/g, ""), "base64"));
  bytes += buf.length;
}
const tabelas = {
  imovel_fotos: fotos,
  vinculos_manuais: await sql`select * from vinculos_manuais order by id`,
  lead_ids: await sql`select * from lead_ids order by lead_id`,
  audit_log: await sql`select * from audit_log order by id`,
};
for (const [nome, linhas] of Object.entries(tabelas)) writeFileSync(join(dir, `${nome}.json`), JSON.stringify(linhas, null, 1));

console.log(`✔ Backup em ${dir}`);
console.log(`  ${fotos.length} fotos (${(bytes / 1024 / 1024).toFixed(1)} MB) · ${tabelas.vinculos_manuais.length} vínculos manuais · ${tabelas.lead_ids.length} códigos de lead · ${tabelas.audit_log.length} eventos`);
