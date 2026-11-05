/**
 * ImobiInsight — Sincronização das planilhas Google com o sistema.
 *
 * Roda na conta Google dona das planilhas. A cada 10 minutos lê as 8 planilhas
 * e envia ao sistema só as que mudaram. Guia de instalação: scripts/apps-script/LEIA-ME.md
 *
 * 1) Cole abaixo a URL (ou o ID) de cada planilha.
 * 2) Em Configurações do projeto → Propriedades do script, crie SYNC_SECRET (valor fornecido).
 * 3) Execute "instalarGatilho" uma vez e autorize.
 */

// ───────────── CONFIGURAÇÃO ─────────────
// aba: nome da aba com os dados. Vazio = a aba indicada no #gid= da URL (ou a primeira).
// url vazia = planilha ainda não ligada (é ignorada).
var PLANILHAS = {
  corretores:    { url: '', aba: '' },  // ainda não criada: até lá só ADMIN_EMAILS entra no sistema
  imoveis:       { url: 'https://docs.google.com/spreadsheets/d/1eJVxYyAZQq989ga-dzMNHtPZ46pHySGmWQeZkjNP3WE/edit?gid=388642629#gid=388642629', aba: '' },
  agenciamentos: { url: 'https://docs.google.com/spreadsheets/d/16KDim6mDb11RXndXYWkq2RpQI73Cd5Z5kHo1L1ywnTA/edit?gid=1579245381#gid=1579245381', aba: '' },
  leads:         { url: 'https://docs.google.com/spreadsheets/d/1CI50re2CsEMbHmi1RTug2lS8MbcNdBaSFKkeTKDveA0/edit?gid=1016916824#gid=1016916824', aba: '' },
  atendimentos:  { url: 'https://docs.google.com/spreadsheets/d/1CxyEqzt9L5CwYjVaG-MxmKkOB4P9-tEhqz2DXN3tGE0/edit?gid=33362746#gid=33362746', aba: '' },
  contratos:     { url: 'https://docs.google.com/spreadsheets/d/1ztHTlKdK1foKN4W72lk2ISiIFhCwBjUXoLQ-GB0OBwk/edit?gid=466147990#gid=466147990', aba: '' },  // modelo_vgv_contratos (com comissão)
  fluxo_caixa:   { url: 'https://docs.google.com/spreadsheets/d/1lgLMSSmF_t4eonVipmBzSA12_K6FYaYMQomRXL3YqKQ/edit?gid=304387261#gid=304387261', aba: '' },
  campanhas:     { url: 'https://docs.google.com/spreadsheets/d/1C18OL5An1ZrSr5lvPbBgpAdLXmROfEqZp4IN-dmiko4/edit?gid=542233762#gid=542233762', aba: '' },
};

// Linhas de exemplo que vieram nos modelos e não podem ser apagadas (sem permissão de edição).
// Uma linha só é ignorada quando TODOS os campos listados batem (sem diferenciar maiúsculas/acentos),
// para nunca descartar um registro real que por acaso use o mesmo código.
var IGNORAR = {
  imoveis:      [{ code: 'IMV-101', nome: 'Apartamento 203', proprietario: 'Proprietário fictício' }],
  leads:        [{ telefone: '51999990001', cliente: 'Mariana Souza', observacoes: 'Solicitou visita' }],
  atendimentos: [{ activity_id: 'ATD-001', cliente: 'Mariana Souza', descricao: 'Visita agendada' }],
  campanhas:    [{ nome: 'Campanha Apartamento Centro', canal: 'Instagram/Facebook', custo: 1250 }],
};

var API_URL = 'https://crm.imobiinsight.workers.dev';
var INTERVALO_MINUTOS = 10;   // 1, 5, 10, 15 ou 30
// ─────────────────────────────────────────

// Ordem importa: corretores e imóveis antes de quem aponta para eles
var ORDEM = ['corretores', 'imoveis', 'agenciamentos', 'leads', 'atendimentos', 'contratos', 'fluxo_caixa', 'campanhas'];
var LOTE = 400;   // linhas por requisição (a API aceita até 500)

/** Gatilho de tempo */
function sincronizarAgendado() {
  return sincronizarTudo_({ origem: 'gatilho', forcar: false });
}

/** Execute manualmente para enviar agora o que mudou */
function sincronizarAgora() {
  return sincronizarTudo_({ origem: 'manual', forcar: false });
}

/** Reenvia tudo, mesmo sem mudança, e libera a trava de remoção em massa. Use com cuidado. */
function forcarSincronizacao() {
  return sincronizarTudo_({ origem: 'manual-forcado', forcar: true });
}

/** Cria (ou recria) o gatilho periódico. Execute uma vez. */
function instalarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizarAgendado') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sincronizarAgendado').timeBased().everyMinutes(INTERVALO_MINUTOS).create();
  Logger.log('Gatilho instalado: a cada ' + INTERVALO_MINUTOS + ' minutos.');
  testarConfiguracao();
  return sincronizarAgora();
}

/** Remove o gatilho periódico (pausa a sincronização). */
function removerGatilho() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sincronizarAgendado') { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log(n ? 'Gatilho removido.' : 'Não havia gatilho instalado.');
}

/** Confere segredo, conexão com o sistema e acesso a cada planilha, sem enviar dados. */
function testarConfiguracao() {
  var problemas = [];
  if (!segredo_()) problemas.push('Propriedade SYNC_SECRET não configurada.');
  try {
    var r = UrlFetchApp.fetch(API_URL + '/api/health', { muteHttpExceptions: true });
    Logger.log('Sistema: HTTP ' + r.getResponseCode() + ' ' + r.getContentText());
    if (r.getResponseCode() !== 200) problemas.push('Sistema indisponível (HTTP ' + r.getResponseCode() + ').');
  } catch (e) {
    problemas.push('Sem conexão com ' + API_URL + ': ' + e);
  }
  ORDEM.forEach(function (p) {
    var cfg = PLANILHAS[p];
    if (!cfg || !cfg.url) { Logger.log(p + ': não ligada (URL vazia) — ignorada.'); return; }
    try {
      var aba = abrirAba_(p);
      var cab = aba.getRange(1, 1, 1, Math.max(1, aba.getLastColumn())).getValues()[0];
      Logger.log(p + ': "' + aba.getParent().getName() + '" / aba "' + aba.getName() + '" — ' +
        Math.max(0, aba.getLastRow() - 1) + ' linhas — colunas: ' + cab.join(', '));
    } catch (e) {
      problemas.push(p + ': ' + e.message);
    }
  });
  Logger.log(problemas.length ? 'PROBLEMAS:\n- ' + problemas.join('\n- ') : 'Configuração OK.');
  return problemas;
}

/**
 * Web App: permite o botão "Sincronizar agora" na tela Sincronização do sistema.
 * Implante como App da Web (executar como: eu; acesso: qualquer pessoa). O sistema envia o segredo.
 */
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { /* vazio */ }
  if (!segredo_() || body.segredo !== segredo_()) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, erro: 'não autorizado' })).setMimeType(ContentService.MimeType.JSON);
  }
  var resultado = sincronizarTudo_({ origem: 'sistema', forcar: body.forcar === true, somente: body.planilha || null });
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
}

// ───────────── implementação ─────────────

function segredo_() {
  return PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
}

function idDaUrl_(urlOuId) {
  var s = String(urlOuId || '').trim();
  var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : s;
}

function abrirAba_(planilha) {
  var cfg = PLANILHAS[planilha];
  var ss = SpreadsheetApp.openById(idDaUrl_(cfg.url));
  if (cfg.aba) {
    var aba = ss.getSheetByName(cfg.aba);
    if (!aba) throw new Error('aba "' + cfg.aba + '" não encontrada');
    return aba;
  }
  // Aba indicada na URL (#gid=123 ou ?gid=123)
  var gid = String(cfg.url).match(/[#?&]gid=(\d+)/);
  if (gid) {
    var porGid = ss.getSheets().filter(function (s) { return String(s.getSheetId()) === gid[1]; })[0];
    if (porGid) return porGid;
  }
  return ss.getSheets()[0];
}

/** Converte a célula para o formato que a API entende (datas sem fuso, em horário local). */
function celula_(v, tz) {
  if (v instanceof Date) {
    var temHora = v.getHours() !== 0 || v.getMinutes() !== 0;
    return Utilities.formatDate(v, tz, temHora ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  }
  if (typeof v === 'string') return v.trim();
  return v; // número, booleano
}

function hash_(obj) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(obj), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function post_(planilha, params, corpo) {
  var qs = Object.keys(params)
    .filter(function (k) { return params[k] !== null && params[k] !== undefined; })
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])); })
    .join('&');
  var opcoes = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + segredo_() },
    payload: JSON.stringify(corpo),
    muteHttpExceptions: true,
  };
  // Até 3 tentativas: a Cloudflare pode recusar (5xx / erro 1102) quando o servidor ainda está "frio".
  // Reenviar é seguro: o sistema reconhece a parte já gravada (migrations/0005).
  var resp, code;
  for (var tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      resp = UrlFetchApp.fetch(API_URL + '/api/sync/' + planilha + '?' + qs, opcoes);
      code = resp.getResponseCode();
      if (code < 500) break;
    } catch (e) {
      if (tentativa === 3) throw e;
      code = 0;
    }
    Utilities.sleep(2000 * tentativa);
  }
  var json = {};
  try { json = JSON.parse(resp.getContentText()); } catch (e) { json = { erro: resp.getContentText().slice(0, 300) }; }
  json.http = code;
  return json;
}

function enviarPlanilha_(planilha, opcoes) {
  var aba = abrirAba_(planilha);
  var ss = aba.getParent();
  var tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  var valores = aba.getDataRange().getValues();
  if (!valores.length) throw new Error('aba vazia (sem cabeçalho)');

  var cabecalho = valores[0].map(function (v) { return celula_(v, tz); });
  var linhas = valores.slice(1).map(function (row) { return row.map(function (v) { return celula_(v, tz); }); });

  // Validação e normalização aqui no Google (mesmo código do sistema, em Validacao.gs):
  // o servidor só grava, para caber no limite de CPU do plano grátis.
  var v = ImobiSync.validateSheet(planilha, cabecalho, linhas, 2);
  var ignoradas = filtrarExemplos_(planilha, v);
  var hash = hash_(v.records);
  var fonte = { spreadsheetId: ss.getId(), url: ss.getUrl() + '#gid=' + aba.getSheetId(), aba: aba.getName() };
  var base = { hash: hash, origem: opcoes.origem, forcar: opcoes.forcar ? 1 : 0 };

  if (v.missingColumns.length) {
    var falha = post_(planilha, Object.assign({ parte: 1, total: 1 }, base), { erro: v.issues[0].mensagem, avisos: v.issues, fonte: fonte });
    throw new Error(falha.erro || v.issues[0].mensagem);
  }

  var props = PropertiesService.getScriptProperties();
  var chave = 'hash_' + planilha;
  if (!opcoes.forcar && props.getProperty(chave) === hash) return { planilha: planilha, status: 'sem alterações' };

  var total = Math.max(1, Math.ceil(v.records.length / LOTE));
  var runId = null, r = null;
  for (var parte = 1; parte <= total; parte++) {
    var inicio = (parte - 1) * LOTE;
    r = post_(planilha, Object.assign({ parte: parte, total: total, runId: runId }, base), {
      registros: v.records.slice(inicio, inicio + LOTE),
      avisos: parte === 1 ? v.issues : [],
      fonte: fonte,
    });
    if (r.status === 'ignorado') { props.setProperty(chave, hash); return { planilha: planilha, status: 'sem alterações' }; }
    if (r.http >= 300 || r.status === 'erro' || r.status === 'bloqueado') {
      throw new Error(r.erro || r.error || ('HTTP ' + r.http));
    }
    runId = r.runId;
  }
  props.setProperty(chave, hash);
  return { planilha: planilha, status: 'ok', novas: r.inseridas, alteradas: r.atualizadas, removidas: r.removidas, avisos: r.avisos, ignoradas: ignoradas };
}

function semAcento_(v) {
  return String(v === null || v === undefined ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Remove de v.records as linhas de exemplo listadas em IGNORAR. Devolve quantas foram ignoradas. */
function filtrarExemplos_(planilha, v) {
  var regras = IGNORAR[planilha] || [];
  if (!regras.length) return 0;
  var antes = v.records.length;
  v.records = v.records.filter(function (rec) {
    return !regras.some(function (regra) {
      return Object.keys(regra).every(function (campo) {
        var a = rec[campo], b = regra[campo];
        if (typeof b === 'number') return Number(a) === b;
        return semAcento_(a) === semAcento_(b);
      });
    });
  });
  var n = antes - v.records.length;
  if (n) Logger.log(planilha + ': ' + n + ' linha(s) de exemplo ignorada(s).');
  return n;
}

function sincronizarTudo_(opcoes) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, erro: 'outra sincronização em andamento' };
  var resultados = [], erros = [];
  try {
    if (!segredo_()) throw new Error('Propriedade SYNC_SECRET não configurada');
    ORDEM.forEach(function (p) {
      if (opcoes.somente && opcoes.somente !== p) return;
      if (!PLANILHAS[p] || !PLANILHAS[p].url) { resultados.push({ planilha: p, status: 'não configurada' }); return; }
      try {
        var r = enviarPlanilha_(p, opcoes);
        resultados.push(r);
      } catch (e) {
        erros.push(p + ': ' + e.message);
        resultados.push({ planilha: p, status: 'erro', erro: e.message });
      }
    });
  } finally {
    lock.releaseLock();
  }
  Logger.log(resultados.map(function (r) { return r.planilha + ' → ' + r.status + (r.erro ? ' (' + r.erro + ')' : '') +
    (r.status === 'ok' ? ' [' + r.novas + ' novas, ' + r.alteradas + ' alteradas, ' + r.removidas + ' removidas, ' + r.avisos + ' avisos' + (r.ignoradas ? ', ' + r.ignoradas + ' exemplo(s) ignorado(s)' : '') + ']' : ''); }).join('\n'));
  if (erros.length) avisarPorEmail_(erros);
  return { ok: erros.length === 0, resultados: resultados };
}

/** Manda e-mail ao dono do script quando há erro — no máximo 1 a cada 6 horas. */
function avisarPorEmail_(erros) {
  var props = PropertiesService.getScriptProperties();
  var ultimo = Number(props.getProperty('ultimo_email_erro') || 0);
  if (Date.now() - ultimo < 6 * 3600 * 1000) return;
  props.setProperty('ultimo_email_erro', String(Date.now()));
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'ImobiInsight: falha na sincronização das planilhas',
    'A sincronização encontrou problemas:\n\n- ' + erros.join('\n- ') +
    '\n\nConfira as planilhas e a tela Sincronização do sistema: ' + API_URL + '/sincronizacao');
}
