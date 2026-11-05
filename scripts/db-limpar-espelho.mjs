// Apaga os dados espelhados das planilhas (e o histórico de sincronização), preservando fotos,
// vínculos manuais e o histórico de login. Use antes da 1ª sincronização real ou para recomeçar.
// Uso: node scripts/db-limpar-espelho.mjs --sim     (sem --sim só mostra o que seria apagado)
import { neon } from "@neondatabase/serverless";
import { databaseUrl } from "./_env.mjs";

const url = databaseUrl();
const sql = neon(url);
const TABELAS = ["corretores", "imoveis", "agenciamentos", "leads", "atendimentos", "contratos", "fluxo_caixa", "campanhas", "lead_ids", "sync_issues", "sync_staging", "sync_fontes", "sync_runs"];

const antes = [];
for (const t of TABELAS) {
  const [{ n }] = await sql.query(`select count(*)::int as n from ${t}`);
  antes.push({ tabela: t, linhas: n });
}
console.table(antes);

if (!process.argv.includes("--sim")) {
  console.log("Nada foi apagado. Rode com --sim para confirmar.");
} else {
  await sql.transaction([
    sql.query(`truncate ${TABELAS.join(", ")} restart identity`),
    sql`alter sequence lead_id_seq restart with 1`,
    sql`delete from audit_log where usuario = 'apps-script'`,
    sql`insert into audit_log (usuario, acao, detalhe) values ('sistema', 'limpeza_espelho', 'dados das planilhas apagados para nova carga')`,
  ]);
  console.log("✔ Espelho das planilhas apagado. A próxima sincronização carrega tudo do zero.");
}
