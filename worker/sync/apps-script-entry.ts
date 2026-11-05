// Ponto de entrada empacotado para o Apps Script (npm run build:apps-script → scripts/apps-script/Validacao.gs).
// A validação roda no Google (até 6 min por execução, grátis) para o Worker não gastar CPU:
// é exatamente o mesmo código testado em schema.test.ts.
export { PLANILHAS, PLANILHA_NOME, validateSheet } from "./schema";
