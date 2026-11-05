// Lógica do sistema ImobiInsight Web (estado, dados, filtros, regras e ações dos modais)
// Extraído de sistema/ImobiInsight Web.dc.html

class Component extends DCLogic {
  state = {
    page: localStorage.getItem('imobi_web_page') || (this.props.startScreen === 'Login' ? 'login' : 'dashboard'),
    leadId: 1, role: 'socio', stage: 'Todas', importKind: 'leads', finMonth: '10', approved: [],
    modal: null, q: '', period: '1', fCor: '', fOrig: '', fMod: '', cxTipo: 'Entrada', toast: '', loginErr: '', resetSent: false,
    newLeads: [], newAts: [], stageOv: {}, nextOv: {}, newProps: [], newAgs: [], newCamps: [], newPending: [], newRoster: []
  };
  go(p) { localStorage.setItem('imobi_web_page', p); this.setState({ page: p }); window.scrollTo(0, 0); }
  flash(msg, extra) { this.setState({ ...extra, modal: null, toast: msg }); clearTimeout(this._t); this._t = setTimeout(() => this.setState({ toast: '' }), 2800); }
  now() { const d = new Date(); return '2026-11-03 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  money(n) { return 'R$ ' + Math.round(+n || 0).toLocaleString('pt-BR'); }
  form(e) { e.preventDefault(); return Object.fromEntries(new FormData(e.target)); }
  componentWillUnmount() { clearTimeout(this._t); }

  renderVals() {
    const S = this.state;
    const brl = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');
    const mi = n => 'R$ ' + (n / 1e6).toFixed(2).replace('.', ',') + ' mi';
    const dm = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '—';
    const dmh = s => dm(s) + ' ' + s.slice(11, 16);
    const tel = t => { const d = String(t).replace(/\D/g, ''); return d.length >= 10 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4) : t; };
    const TODAY = '2026-11-03';
    const MN = { '05': 'mai', '06': 'jun', '07': 'jul', '08': 'ago', '09': 'set', '10': 'out' };
    const MFULL = { '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro' };

    // ---- dados dos CSVs ----
    const leadsCsv = [
      ['Mariana Souza','51999990001','Apartamento 203','Centro','Carlos Lima','Instagram/Facebook','Visita','2026-10-25 09:00','2026-10-28 10:30','Cliente pediu visita','2026-11-02'],
      ['Pedro Pereira','51999990002','Casa 10','Igara','Juliana Costa','Portais','Contato inicial','2026-10-26 10:00','2026-10-29 13:00','Enviar opções','2026-11-03'],
      ['Ana Beatriz','51999990003','Sala 5','Centro','Paulo Mendes','Indicação','Novo lead','2026-10-28 11:00','2026-10-28 11:00','Aguardando retorno','2026-11-01'],
      ['Ricardo Alves','51999990004','Apartamento 203','Centro','Carlos Lima','Instagram/Facebook','Proposta','2026-10-20 08:30','2026-10-30 09:00','Proposta em análise','2026-11-02']
    ];
    const atend = [
      ['ATD-101','Mariana Souza','Apartamento 203','2026-10-28 10:30','Visita','Visita agendada','Carlos Lima','2026-11-02',18],
      ['ATD-102','Pedro Pereira','Casa 10','2026-10-29 13:00','Contato inicial','Primeiro contato','Juliana Costa','2026-11-03',22],
      ['ATD-103','Ricardo Alves','Apartamento 203','2026-10-30 09:00','Proposta','Proposta enviada','Carlos Lima','2026-11-02',15]
    ];
    const imoveis = [
      ['IMV-101','Apartamento 203','Centro','Apartamento',285000,'Proprietário Fictício A','Disponível'],
      ['IMV-102','Casa 10','Igara','Casa',379000,'Proprietário Fictício B','Disponível'],
      ['IMV-103','Sala 5','Centro','Sala Comercial',2500,'Proprietário Fictício C','Em negociação']
    ];
    const campanhasCsv = [['Campanha Apartamento Centro','Instagram/Facebook',35,1250,35.71,2],['Campanha Casa Igara','Portais',21,900,42.86,1]];
    const agMonths = [['mai',24,15],['jun',27,16],['jul',21,18],['ago',29,15],['set',26,17],['out',23,14]];
    const agOct = { total: 37, s: 23, l: 14, disp: 24, prev: 43, all: 245 };
    const agWeeklyRaw = [['Paulo Mendes',3],['Juliana Costa',2],['Bianca Silva',2],['Carlos Lima',0],['Felipe Rocha',0],['Aline Martins',0],['Renato Silva',0],['Marina Duarte',0]];
    const agRecent = [
      ['2026-10-27','PORT-0228','Casa residencial 228','Rio Branco','Venda','Juliana Costa','Diego Lopes',399000,'Vendido'],
      ['2026-10-26','PORT-0211','Apartamento 2 dormitórios 211','Marechal Rondon','Venda','Carlos Lima','—',219000,'Disponível'],
      ['2026-10-26','PORT-0234','Apartamento para locação 234','Marechal Rondon','Locação','Marina Duarte','—',1250,'Disponível'],
      ['2026-10-25','PORT-0220','Casa residencial 220','Igara','Venda','Juliana Costa','—',310000,'Disponível'],
      ['2026-10-25','PORT-0243','Casa para locação 243','Igara','Locação','Felipe Rocha','—',2200,'Disponível'],
      ['2026-10-24','PORT-0229','Sobrado 229','Centro','Venda','Paulo Mendes','—',219000,'Disponível'],
      ['2026-10-23','PORT-0212','Casa residencial 212','Nossa Senhora das Graças','Venda','Juliana Costa','Luiza Ramos',245000,'Em negociação'],
      ['2026-10-23','PORT-0235','Casa para locação 235','Nossa Senhora das Graças','Locação','Felipe Rocha','Luiza Ramos',1600,'Em negociação']
    ];
    const agByCor = { 'Juliana Costa': 36, 'Paulo Mendes': 38, 'Bianca Silva': 38, 'Carlos Lima': 38, 'Felipe Rocha': 24, 'Aline Martins': 24, 'Renato Silva': 24, 'Marina Duarte': 23 };
    const vgvCor = [['Juliana Costa',16,0,2560518,92179],['Bianca Silva',14,0,2379873,85675],['Carlos Lima',14,0,2150160,77406],['Paulo Mendes',13,0,1924449,69280],['Camila Torres',0,14,0,16030],['Rafael Mendes',0,13,0,15691],['Aline Oliveira',0,14,0,15416],['Bruno Ferreira',0,13,0,15364]];
    const vgvMonth = { '05': [1435000,10,16000,8,59660], '06': [1510000,9,23000,9,65860], '07': [1580000,10,19000,10,66380], '08': [1460000,9,30000,8,67560], '09': [1540000,10,17000,9,63940], '10': [1490000,9,20000,10,63640] };
    const vgvOrig = [['Instagram/Facebook',32],['Portais',31],['Indicação',24],['WhatsApp',12],['Site',12]];
    const cxBase = { '05': [51000,29000,16000,8000,16000,7680,4800,3520], '06': [54000,30000,23000,11500,17000,8160,5100,3740], '07': [56000,30500,19000,9500,16750,8040,5025,3685], '08': [59000,31000,30000,15000,17500,8400,5250,3850], '09': [53000,29000,17000,8500,16500,7920,4950,3630], '10': [57000,30000,20000,10000,17500,8400,5250,3850] };
    const cx = m => { const [com, adm, pri, rep, pes, est, mkt, tec] = cxBase[m]; const ent = com + adm + pri; const sai = com + rep + pes + est + mkt + tec; return { com, dist: com, adm, pri, rep, pes, est, mkt, tec, ent, sai, saldo: ent - sai }; };

    const qq = S.q.trim().toLowerCase(); const match = s => !qq || String(s).toLowerCase().includes(qq);
    const agAll = [...S.newAgs, ...agRecent]; const camAll = [...campanhasCsv, ...S.newCamps]; const imoveisAll = [...S.newProps, ...imoveis];
    // ---- leads ----
    const stageStyle = { 'Novo lead': ['#eef0f3','#3f4650'], 'Contato inicial': ['#efeff1','#44474c'], 'Visita': ['#e8edf3','#3a4a5e'], 'Proposta': ['#f5f0e6','#6b5523'], 'Fechado': ['#e9efe7','#4b6446'], 'Perdido': ['#f6ece9','#8a3f34'] };
    const atendAll = [...atend, ...S.newAts];
    const leads = [...leadsCsv, ...S.newLeads].map((r, i) => {
      const [cliente, t, imovel, bairro, corretor, origem, etapa0, created, updated, obs, next0] = r;
      const id = i + 1, etapa = S.stageOv[id] || etapa0, next = S.nextOv[id] || next0, st = stageStyle[etapa] || stageStyle['Novo lead'], late = !!next && next < TODAY;
      const ats = atendAll.filter(a => a[1] === cliente);
      const prop = imoveisAll.find(p => p[1] === imovel);
      return { id, cliente, tel: tel(t), imovel, bairro, corretor, origem, etapa, obs, late,
        ultima: dmh(updated), proximo: dm(next), created: dm(created) + '/2026', sBg: st[0], sFg: st[1],
        nextFg: late ? '#8a3f34' : '#44474c', status: late ? 'Vencido em ' + dm(next) : dm(next),
        firstResp: ats.length ? ats[0][8] + ' min' : 'Sem registro',
        propLine: prop ? prop[0] + ' · ' + (prop[4] < 10000 ? brl(prop[4]) + '/mês' : brl(prop[4])) + ' · ' + prop[6] : 'Imóvel não encontrado no cadastro',
        ats, createdRaw: created,
        ini: cliente.split(' ').map(w => w[0]).slice(0, 2).join(''),
        open: () => { this.setState({ leadId: id }); this.go('lead'); } };
    });
    const pages = ['login','dashboard','leads','funil','lead','imoveis','agenciamentos','corretores','marketing','financeiro','importacoes','governanca'];
    const is = {}; pages.forEach(p => is[p] = S.page === p); is.app = S.page !== 'login';
    const nav = {}; pages.forEach(p => nav[p] = () => this.go(p));
    const activeNav = S.page === 'lead' ? 'leads' : S.page;
    const roleName = { socio: 'Sócio / Gestor', locacoes: 'Gerente de locações', admin: 'Administrativo', corretor: 'Corretor' }[S.role];
    const roleAllowed = { socio: null, locacoes: ['leads','funil','imoveis','agenciamentos','corretores','governanca'], admin: ['agenciamentos','financeiro','importacoes','governanca'], corretor: ['leads','funil','imoveis','agenciamentos','governanca'] }[S.role];

    const pendingAll = [...S.newPending, ['CTR-101','Venda · Ricardo Alves · Apartamento 203','R$ 285.000','Importado de contratos, 31/10'],['IMP-0042','Fluxo de caixa · out/2026 · 9 lançamentos','R$ 107.000','Importação CSV, 25/10'],['IMP-0043','Contratos com comissão · 111 registros','R$ 9,05 mi','Importação CSV, 21/10']];
    const pending = pendingAll.filter(p => !S.approved.includes(p[0])).map(([id, label, value, by]) => ({ id, label, value, by,
      approve: () => this.setState(s => ({ approved: [...s.approved, id] })), reject: () => this.setState(s => ({ approved: [...s.approved, id] })) }));

    const mk = (key, label, count) => ({ key, label, count: count || '', go: () => this.go(key),
      bg: activeNav === key ? '#2c2d30' : 'transparent', fg: activeNav === key ? '#fff' : '#2e3135', fw: activeNav === key ? 600 : 400 });
    const navGroups = [
      { label: 'Comercial', items: [mk('dashboard','Dashboard'), mk('leads','Leads', String(leads.length)), mk('funil','Funil'), mk('imoveis','Imóveis'), mk('agenciamentos','Agenciamentos','245')] },
      { label: 'Gestão', items: [mk('corretores','Corretores'), mk('marketing','Marketing'), mk('financeiro','Financeiro')] },
      { label: 'Administração', items: [mk('importacoes','Importações'), mk('governanca','Governança', pending.length ? String(pending.length) : '')] }
    ].map(g => ({ ...g, items: roleAllowed ? g.items.filter(i => roleAllowed.includes(i.key)) : g.items })).filter(g => g.items.length);

    // ---- dashboard ----
    const PM = { '1': ['10'], '3': ['08','09','10'], '6': ['05','06','07','08','09','10'] }[S.period];
    const periodLabel = { '1': 'outubro de 2026', '3': 'agosto a outubro de 2026', '6': 'maio a outubro de 2026' }[S.period];
    const sumV = k => PM.reduce((acc, m) => acc + vgvMonth[m][k], 0);
    const agSel = agMonths.filter(x => PM.map(m => MN[m]).includes(x[0]));
    const agS = agSel.reduce((acc, x) => acc + x[1], 0), agL = agSel.reduce((acc, x) => acc + x[2], 0), agT = agS + agL;
    const kpis = [
      { label: 'Captações', value: String(agT), trend: S.period === '1' ? Math.round((agOct.total / agOct.prev - 1) * 100) + '%' : '', sub: agS + ' para venda · ' + agL + ' para locação' },
      { label: 'Contratos fechados', value: String(sumV(1) + sumV(3)), trend: '', sub: sumV(1) + ' vendas · ' + sumV(3) + ' locações' },
      { label: 'VGV de vendas', value: mi(sumV(0)), trend: '', sub: periodLabel },
      { label: 'Comissões', value: brl(sumV(4)), trend: '', sub: 'geradas pelos contratos do período' }
    ];
    const order = ['Novo lead','Contato inicial','Visita','Proposta','Fechado'];
    const fc = ['#c4c5c9','#a9abb0','#8e9095','#74767b','#4f6a4a'];
    const reached = order.map((s, i) => leads.filter(l => order.indexOf(l.etapa) >= i).length);
    const funnel = order.map((label, i) => ({ label, n: reached[i], pct: Math.round(reached[i] / leads.length * 100) + '%', color: fc[i] }));
    const totOrig = vgvOrig.reduce((a, o) => a + o[1], 0);
    const oc = ['#5b5d62','#808287','#a2a4a8','#c0c1c5','#d9dadd'];
    const origins = vgvOrig.map(([name, n], i) => ({ name, n, pctS: Math.round(n / totOrig * 100) + '%', pctW: Math.round(n / vgvOrig[0][1] * 100) + '%', color: oc[i] }));
    const respVals = atend.map(a => a[8]);
    const responseWeeks = atend.map(a => ({ v: a[8] + ' min', h: Math.round(a[8] / 26 * 100) + '%', d: a[0] }));
    const agentBars = vgvCor.slice(0, 4).map(a => ({ name: a[0], val: mi(a[3]).replace(' mi', 'mi'), pct: Math.round(a[3] / vgvCor[0][3] * 100) + '%' }));
    const noReturn = leads.filter(l => l.late).map(l => ({ ...l, dias: 'Vencido ' + l.proximo }));

    // ---- funil / filtros / detalhe ----
    const leadsBase = leads.filter(l => (!S.fCor || l.corretor === S.fCor) && (!S.fOrig || l.origem === S.fOrig) && match(l.cliente + ' ' + l.imovel + ' ' + l.bairro + ' ' + l.tel));
    const laneDot = ['#c4c5c9','#a9abb0','#6b7c93','#b08a3e','#5f7a5a'];
    const lanes = order.map((name, i) => { const cards = leadsBase.filter(l => l.etapa === name); return { name, dot: laneDot[i], cards, total: cards.length, empty: cards.length === 0 }; });
    const stageFilters = ['Todas', ...order].map(s => { const on = S.stage === s;
      return { label: s, n: s === 'Todas' ? leadsBase.length : leadsBase.filter(l => l.etapa === s).length, pick: () => this.setState({ stage: s }),
        bg: on ? '#2c2d30' : '#fff', fg: on ? '#fff' : '#2e3135', bd: on ? '#2c2d30' : '#d6d7da' }; });
    const leadsFiltered = S.stage === 'Todas' ? leadsBase : leadsBase.filter(l => l.etapa === S.stage);
    const lead = leads.find(l => l.id === S.leadId) || leads[0];
    const cur = order.indexOf(lead.etapa);
    lead.steps = order.map((label, i) => ({ label, bg: i === cur ? '#2c2d30' : i < cur ? '#efeff1' : 'transparent', fg: i === cur ? '#fff' : i < cur ? '#44474c' : '#9a9ca1', fw: i === cur ? 600 : 400 }));
    const timeline = [
      ...[...lead.ats].reverse().map(a => ({ title: a[5], when: dmh(a[3]), who: a[6], text: (a[9] ? a[9] + ' · ' : '') + 'Etapa: ' + a[4] + ' · resposta em ' + a[8] + ' min · próximo contato ' + dm(a[7]) + ' (' + a[0] + ')', dot: '#2c2d30' })),
      { title: 'Lead recebido', when: dmh(lead.createdRaw), who: 'Importação de leads', text: 'Origem ' + lead.origem + '. Observação: ' + lead.obs + '.', dot: '#c4c5c9' }
    ];

    // ---- imóveis ----
    const pStatus = { 'Disponível': ['#e9efe7','#4b6446'], 'Em negociação': ['#f5f0e6','#6b5523'], 'Vendido': ['#efeff1','#44474c'], 'Locado': ['#efeff1','#44474c'] };
    const propertiesAll = [
      ...imoveisAll.map(([code, name, bairro, tipo, price, owner, status, mod0]) => ({ code, name, bairro, owner, status, mod: mod0 || (price < 10000 ? 'Locação' : 'Venda'), price: (mod0 ? mod0 === 'Locação' : price < 10000) ? brl(price) + '/mês' : brl(price), meta: leads.filter(l => l.imovel === name).length + ' leads' })),
      ...agAll.filter(a => a[8] === 'Disponível').slice(0, 3).map(a => ({ code: a[1], name: a[2], bairro: a[3], owner: 'Agenciamento · ' + a[5], status: a[8], mod: a[4], price: a[4] === 'Locação' ? brl(a[7]) + '/mês' : brl(a[7]), meta: 'captado ' + dm(a[0]) }))
    ].map(p => ({ ...p, sBg: pStatus[p.status][0], sFg: pStatus[p.status][1] }));
    const properties = propertiesAll.filter(p => (!S.fMod || p.mod === S.fMod) && match(p.name + ' ' + p.bairro + ' ' + p.code + ' ' + p.owner));

    // ---- agenciamentos ----
    const agKpis = [
      { label: 'Novas captações', value: String(agT), sub: S.period === '1' ? Math.round((agOct.total / agOct.prev - 1) * 100) + '% vs. setembro (' + agOct.prev + ')' : PM.length + ' meses' },
      { label: 'Captações de venda', value: String(agS), sub: 'novos imóveis no período' },
      { label: 'Captações de locação', value: String(agL), sub: 'novos imóveis no período' },
      S.period === '1' ? { label: 'Ainda disponíveis', value: String(agOct.disp), sub: 'das captações do mês' } : { label: 'Média mensal', value: String(Math.round(agT / PM.length)), sub: 'captações por mês' }
    ];
    const agHist = agMonths.map(([m, s, l]) => ({ m, s, l, sw: (s / 47 * 100) + '%', lw: (l / 47 * 100) + '%' }));
    const agWeekly = agWeeklyRaw.map(([name, n]) => ({ name, dots: [0,1,2].map(i => ({ c: i < n ? (n >= 3 ? '#5f7a5a' : '#a9abb0') : '#efeff1' })),
      label: n >= 3 ? 'Atingiu (' + n + ')' : 'Faltam ' + (3 - n), fg: n >= 3 ? '#4b6446' : '#8a3f34' }));
    const agRows = agAll.filter(r => match(r.join(' ')) && (!S.fCor || r[5] === S.fCor)).map(([d, code, imovel, bairro, mod, corretor, agenciador, v, status]) => ({ data: dm(d), code, imovel, bairro, mod, corretor, agenciador,
      valor: mod === 'Locação' ? brl(v) + '/mês' : brl(v), status, sBg: pStatus[status][0], sFg: pStatus[status][1] }));

    // ---- corretores ----
    const vgvTotal = vgvCor.reduce((a, c) => a + c[3], 0);
    const names = [...new Set([...Object.keys(agByCor), ...vgvCor.map(c => c[0])])];
    const agents = names.map(name => { const c = vgvCor.find(x => x[0] === name) || [name, 0, 0, 0, 0];
      const share = vgvTotal ? c[3] / vgvTotal * 100 : 0;
      return { name, role: c[1] ? 'Vendas' : c[2] ? 'Locações' : 'Captação', leads: agByCor[name] || 0, visits: c[1], closed: c[2],
        resp: c[4] ? 'R$ ' + (c[4] / 1000).toFixed(1).replace('.', ',') + ' mil' : '—',
        ini: name.split(' ').map(w => w[0]).join(''), conv: share.toFixed(1).replace('.', ',') + '%', convW: Math.round(share / 30 * 100) + '%' }; });
    const vgvRank = vgvCor.map(([name, v, l, vgv, com], i) => ({ pos: String(i + 1).padStart(2, '0'), name, v, l, vgv: vgv ? brl(vgv) : '—', com: brl(com) }));
    const st = { ok: ['#e9efe7','#4b6446'], ag: ['#eef0f3','#3f4650'], ct: ['#eef0f3','#3f4650'], chk: ['#f5f0e6','#6b5523'] };
    const roster = [
      ...names.map(n => { const inAg = !!agByCor[n], inCt = !!vgvCor.find(c => c[0] === n);
        const k = n === 'Aline Martins' || n === 'Aline Oliveira' ? 'chk' : inAg && inCt ? 'ok' : inAg ? 'ag' : 'ct';
        return { name: n, role: 'Corretor', files: [inAg ? 'Agenciamentos' : '', inCt ? 'Contratos com comissão' : ''].filter(Boolean).join(', '),
          status: { ok: 'Vinculado', ag: 'Só em agenciamentos', ct: 'Só em contratos', chk: 'Verificar nome parecido' }[k], sBg: st[k][0], sFg: st[k][1] }; }),
      { name: 'Luiza Ramos', role: 'Agenciadora', files: 'Agenciamentos (84)', status: 'Prefixo "Agenciador" removido', sBg: '#eef0f3', sFg: '#3f4650' },
      { name: 'Diego Lopes', role: 'Agenciador', files: 'Agenciamentos (83)', status: 'Prefixo "Agenciador" removido', sBg: '#eef0f3', sFg: '#3f4650' },
      ...S.newRoster.map(([name, role]) => ({ name, role, files: 'Cadastro manual', status: 'Vinculado', sBg: '#e9efe7', sFg: '#4b6446' }))
    ];

    // ---- marketing ----
    const camInv = camAll.reduce((a, c) => a + c[3], 0), camLeads = camAll.reduce((a, c) => a + c[2], 0), camF = camAll.reduce((a, c) => a + c[5], 0);
    const mktKpis = [
      { label: 'Investimento', value: brl(camInv), sub: camAll.length + ' campanhas importadas' },
      { label: 'Custo por lead', value: brl(camInv / camLeads), sub: 'média ponderada' },
      { label: 'Leads de campanha', value: String(camLeads), sub: 'informados no CSV' },
      { label: 'Custo por fechamento', value: brl(camInv / camF), sub: camF + ' negócios' }
    ];
    const campaigns = camAll.map(([nome, canal, leads, custo, cpl, fechados]) => ({ nome, canal, leads, custo: brl(custo), cpl: 'R$ ' + cpl.toFixed(2).replace('.', ','), fechados }));

    // ---- financeiro ----
    const fm = S.finMonth, c = cx(fm), v = vgvMonth[fm];
    const finKpis = [
      { label: 'Entradas realizadas', value: brl(c.ent), sub: 'comissões + locações' },
      { label: 'Saídas realizadas', value: brl(c.sai), sub: 'distribuição, repasses e despesas' },
      { label: 'Saldo de caixa', value: brl(c.saldo), sub: 'entradas menos saídas' },
      { label: 'VGV de vendas', value: mi(v[0]), sub: v[1] + ' vendas fechadas' }
    ];
    const finAreas = [
      { title: 'Vendas', rows: [
        { label: 'VGV de vendas', note: v[1] + ' contratos de venda', value: brl(v[0]) },
        { label: 'Comissões recebidas', note: 'entrada de caixa', value: brl(c.com) },
        { label: 'Distribuição aos sócios', note: 'saída de caixa', value: brl(c.dist) } ] },
      { title: 'Locações', rows: [
        { label: 'Novos aluguéis contratados', note: v[3] + ' locações · não soma ao VGV', value: brl(v[2]) },
        { label: 'Administração recorrente', note: 'entrada de caixa', value: brl(c.adm) },
        { label: 'Primeiros aluguéis', note: 'entrada de caixa', value: brl(c.pri) },
        { label: 'Repasse da intermediação', note: 'saída de caixa', value: brl(c.rep) } ] },
      { title: 'Despesas', rows: [
        { label: 'Pessoal', note: 'saída de caixa', value: brl(c.pes) },
        { label: 'Estrutura', note: 'saída de caixa', value: brl(c.est) },
        { label: 'Marketing', note: 'saída de caixa', value: brl(c.mkt) },
        { label: 'Tecnologia e outras', note: 'saída de caixa', value: brl(c.tec) } ] }
    ];
    const finMonths = ['05','06','07','08','09','10'].map(m => { const x = cx(m), y = vgvMonth[m];
      return { m: m + '/2026', vgv: brl(y[0]), alug: brl(y[2]), ent: brl(x.ent), sai: brl(x.sai), saldo: brl(x.saldo) }; });

    // ---- importações ----
    const O = 'Obrigatório', P = 'Opcional', A = 'Calculado se vazio';
    const kindDefs = [
      { k: 'leads', title: 'Leads', sub: 'campanhas, portais, WhatsApp', file: 'modelo_leads.csv', rows: 4,
        cols: [['cliente','Cliente','Mariana Souza',O],['telefone','Telefone','51999990001',O],['imovel','Imóvel de interesse (nome)','Apartamento 203',P],['bairro','Bairro','Centro',P],['corretor','Corretor responsável','Carlos Lima',O],['origem','Origem','Instagram/Facebook',O],['stage','Etapa do funil','Visita',O],['createdAt','Data de entrada','2026-10-25 09:00',O],['updatedAt','Última interação','2026-10-28 10:30',P],['observations','Observações / próxima ação','Cliente pediu visita',P],['nextActionDate','Próximo contato','2026-11-02',P]],
        warn: ['O arquivo não tem coluna de código do lead. Na reimportação, o sistema usa o telefone para identificar o mesmo lead.','O imóvel é informado pelo nome ("Apartamento 203"), não pelo código IMV.'], dedupe: 'Leads com o mesmo telefone são atualizados, não duplicados.' },
      { k: 'activities', title: 'Atendimentos', sub: 'contatos, visitas, propostas', file: 'modelo_atendimentos.csv', rows: 3,
        cols: [['activityId','Código do atendimento','ATD-101',O],['leadId','Lead vinculado','(vazio)',P],['cliente','Cliente','Mariana Souza',O],['imovel','Imóvel','Apartamento 203',P],['data','Data e hora','2026-10-28 10:30',O],['etapa','Etapa após o contato','Visita',O],['descricao','Descrição','Visita agendada',P],['corretor','Corretor','Carlos Lima',O],['proximoContato','Próximo contato','2026-11-02',P],['tempoRespostaMin','Tempo de resposta (min)','18',P]],
        warn: ['A coluna leadId está vazia nos 3 registros. O vínculo com o lead será feito pelo nome do cliente.'], dedupe: 'Atendimentos com o mesmo activityId são atualizados, não duplicados.' },
      { k: 'properties', title: 'Imóveis', sub: 'cadastro do CRM', file: 'modelo_imoveis.csv', rows: 3,
        cols: [['code','Código','IMV-101',O],['name','Nome do imóvel','Apartamento 203',O],['bairro','Bairro','Centro',O],['tipo','Tipo','Apartamento',O],['price','Valor (venda ou aluguel mensal)','285000',O],['owner','Proprietário','Proprietário Fictício A',P],['status','Situação','Disponível',O]],
        warn: ['Os códigos IMV deste arquivo são diferentes dos códigos PORT dos agenciamentos. Um mesmo imóvel pode aparecer duas vezes.'], dedupe: 'Imóveis com o mesmo código são atualizados, não duplicados.' },
      { k: 'agenciamentos', title: 'Agenciamentos', sub: 'exportação semanal do portal', file: 'modelo_importacao_agenciamentos.csv', rows: 245,
        cols: [['agenciamentoId','Código do agenciamento','AG-0001',O],['codigoImovel','Código do imóvel','PORT-0001',O],['dataCadastro','Data de captação','2026-05-17',O],['modalidade','Modalidade','Venda',O],['corretor','Corretor','Juliana Costa',O],['agenciador','Agenciador','Luiza Ramos',P],['imovel','Imóvel','Casa residencial 001',O],['bairro','Bairro','São José',O],['valorAnuncio','Valor anunciado','399000',O],['status','Situação','Disponível',O],['origem','Origem','Portal imobiliário',P],['observacoes','Observações','—',P]],
        warn: ['O prefixo "Agenciador " é removido do nome (167 registros).','A origem "Portal imobiliário" é padronizada como "Portais".','78 registros não têm agenciador.'], dedupe: 'Agenciamentos com o mesmo agenciamentoId são atualizados, não duplicados.' },
      { k: 'deals', title: 'Contratos', sub: 'vendas e locações sem comissão', file: 'modelo_contratos.csv', rows: 1,
        cols: [['contractId','Código do contrato','CTR-101',O],['leadId','Lead vinculado','(vazio)',P],['cliente','Cliente','Ricardo Alves',O],['imovel','Imóvel','Apartamento 203',O],['tipo','Tipo','Venda',O],['valor','Valor do contrato','285000',O],['dataFechamento','Data de fechamento','2026-10-31',O],['corretor','Corretor','Carlos Lima',O],['origem','Origem','Instagram/Facebook',P]],
        warn: ['Este arquivo tem as mesmas colunas de "Contratos com comissão", sem a comissão. Sugestão: usar só o modelo com comissão.'], dedupe: 'Contratos com o mesmo contractId são atualizados e entram na fila de conferência.' },
      { k: 'vgv', title: 'Contratos com comissão', sub: 'VGV e comissões', file: 'modelo_vgv_contratos.csv', rows: 111,
        cols: [['contractId','Código do contrato','VEN-0001',O],['leadId','Lead vinculado','(vazio)',P],['cliente','Cliente','Comprador Simulado 001',O],['imovel','Imóvel','Apartamento Centro',O],['tipo','Tipo','Venda / Locação',O],['valor','Valor (venda ou aluguel mensal)','98184',O],['dataFechamento','Data de fechamento','2026-05-02',O],['corretor','Corretor','Carlos Lima',O],['origem','Origem','Instagram/Facebook',P],['comissao','Comissão','3534.62',O]],
        warn: ['4 corretores deste arquivo (Aline Oliveira, Rafael Mendes, Camila Torres e Bruno Ferreira) não aparecem nos agenciamentos.','Em locações, o valor é o aluguel mensal e não entra no VGV.'], dedupe: 'Contratos com o mesmo contractId são atualizados e entram na fila de conferência.' },
      { k: 'cash', title: 'Fluxo de caixa', sub: 'entradas e saídas', file: 'modelo_fluxo_caixa.csv', rows: 54,
        cols: [['entryId','Código do lançamento','CX-0001',O],['data','Data','2026-05-04',O],['tipo','Entrada ou Saída','Entrada',O],['categoria','Categoria','Vendas - comissões recebidas',O],['descricao','Descrição','Comissões de vendas recebidas',P],['valor','Valor','51000',O],['status','Situação','Realizado',O],['contractId','Contrato vinculado','(vazio)',P]],
        warn: ['Nenhum lançamento tem contrato vinculado. As comissões entram como valor mensal consolidado.','Categorias aceitas: 3 de entrada (comissões, administração, primeiro aluguel) e 6 de saída (distribuição, repasse, pessoal, estrutura, marketing, tecnologia).'], dedupe: 'Lançamentos com o mesmo entryId são atualizados e entram na fila de conferência.' },
      { k: 'campaigns', title: 'Campanhas', sub: 'marketing', file: 'modelo_campanhas.csv', rows: 2,
        cols: [['nome','Nome da campanha','Campanha Casa Igara',O],['canal','Canal','Portais',O],['leads','Leads gerados','21',O],['custo','Investimento','900',O],['cpl','Custo por lead','42.86',A],['fechados','Negócios fechados','1',O]],
        warn: ['O arquivo não tem período (início e fim), então as campanhas não acompanham o filtro de datas.'], dedupe: 'Campanhas com o mesmo nome são atualizadas, não duplicadas.' }
    ];
    const kd = kindDefs.find(x => x.k === S.importKind) || kindDefs[0];
    const kind = { title: kd.title, file: kd.file, dedupe: kd.dedupe, hasWarn: kd.warn.length > 0, warn: kd.warn.map(t => ({ t })),
      cols: kd.cols.map(([col, field, ex, req]) => ({ col, field, ex, req, reqFg: req === O ? '#2e3135' : '#80838a' })) };
    const importKinds = kindDefs.map(x => ({ title: x.title, sub: x.sub, pick: () => this.setState({ importKind: x.k }),
      bd: S.importKind === x.k ? '#2c2d30' : '#e3e3e6', bg: S.importKind === x.k ? '#f4f4f5' : '#fff' }));
    const importOrder = ['Imóveis','Agenciamentos','Leads','Atendimentos','Contratos com comissão','Fluxo de caixa','Campanhas'].map((t, i) => ({ n: i + 1, t }));
    const importLog = [['03/11 10:12','Agenciamentos','exemplo_agenciamentos_6_meses.csv',245,0,0],['03/11 10:10','Contratos com comissão','exemplo_preenchido_vgv_contratos.csv',111,0,0],['03/11 10:08','Fluxo de caixa','exemplo_preenchido_fluxo_caixa.csv',54,0,0],['03/11 10:06','Leads','exemplo_preenchido_leads.csv',4,0,0],['03/11 10:05','Atendimentos','exemplo_preenchido_atendimentos.csv',3,0,0],['03/11 10:04','Imóveis','exemplo_preenchido_imoveis.csv',3,0,0],['03/11 10:03','Contratos','exemplo_preenchido_contratos.csv',1,0,0],['03/11 10:02','Campanhas','exemplo_preenchido_campanhas.csv',2,0,0]]
      .map(([d, k, f, a, u, s]) => ({ d, k, f, a, u, s }));

    // ---- governança ----
    const roleDefs = [['socio','Sócio / Gestor','2 usuários','Indicadores consolidados e aprovação dos registros financeiros.'],['locacoes','Gerente de locações','1 usuário','Operação comercial; valores financeiros globais restritos.'],['admin','Administrativo','1 usuário','Registra e importa contratos e caixa, sem ver o consolidado.'],['corretor','Corretor','12 usuários','Registra atendimentos e vê a própria carteira.']];
    const roles = roleDefs.map(([k, name, users, desc]) => ({ name, users, desc, pick: () => this.setState({ role: k }), bd: S.role === k ? '#2c2d30' : '#e3e3e6', bg: S.role === k ? '#f7f7f8' : '#fff' }));
    const Y = { v: '✓', fg: '#4b6446' }, N = { v: '—', fg: '#b4b6ba' };
    const matrix = [['Registrar leads e atendimentos',[Y,Y,N,Y]],['Importar contratos e caixa',[Y,N,Y,N]],['Ver VGV e caixa consolidados',[Y,N,N,N]],['Cadastrar agenciamentos',[Y,Y,Y,Y]],['Ver indicadores de locação',[Y,Y,N,N]],['Aprovar dados financeiros',[Y,N,N,N]],['Configurar perfis',[Y,N,N,N]]].map(([op, cells]) => ({ op, cells }));
    const audit = [['03/11 10:12','Administrativo','Importação CSV','agenciamentos','245 incluídos'],['03/11 10:10','Administrativo','Importação CSV','vgv_contratos','111 incluídos, pendente de conferência'],['03/11 10:08','Administrativo','Importação CSV','fluxo_caixa','54 incluídos, pendente de conferência'],['03/11 10:06','Gerente de locações','Importação CSV','leads','4 incluídos'],['30/10 09:00','Corretor','Atualização de lead','Ricardo Alves','Etapa alterada para Proposta']]
      .map(([at, who, action, id, detail]) => ({ at, who, action, id, detail }));

    return {
      is, nav, roleName, role: S.role, navGroups, showNotice: this.props.showNotice ?? true,
      setRole: e => this.setState({ role: e.target.value }),
      kpis, funnel, funnelNote: reached[3] + ' de ' + leads.length + ' leads chegaram à proposta. Nenhum fechamento registrado no arquivo de leads.',
      origins, responseWeeks, respAvg: String(Math.round(respVals.reduce((a, b) => a + b, 0) / respVals.length)), respBadge: atend.length + ' atendimentos',
      recentLeads: leads, agentBars, noReturn, lateCount: noReturn.length + ' leads',
      stageFilters, leadsFiltered, leadsCount: leadsFiltered.length, leadsTotal: leads.length,
      leadsSub: leads.length + ' registros importados · ' + noReturn.length + ' com próximo contato vencido',
      lanes, lead, timeline, properties, propSub: imoveis.length + ' imóveis cadastrados + captações recentes disponíveis',
      agKpis, agHist, agWeekly, agRows, agents, vgvRank, roster, mktKpis, campaigns,
      finKpis, finAreas, finMonths, finMonth: fm, finSub: MFULL[fm] + ' 2026', setFinMonth: e => this.setState({ finMonth: e.target.value }),
      importKinds, importOrder, importLog, kind,
      period: S.period, periodLabel, setPeriod: e => this.setState({ period: e.target.value }),
      q: S.q, setQ: e => { const v = e.target.value; this.setState({ q: v }); if (v && !['leads','funil','imoveis','agenciamentos'].includes(S.page)) this.go('leads'); },
      fCor: S.fCor, fOrig: S.fOrig, fMod: S.fMod,
      setFCor: e => this.setState({ fCor: e.target.value }), setFOrig: e => this.setState({ fOrig: e.target.value }), setFMod: e => this.setState({ fMod: e.target.value }),
      hasFilters: !!(S.fCor || S.fOrig || S.q || S.stage !== 'Todas'), clearFilters: () => this.setState({ fCor: '', fOrig: '', q: '', stage: 'Todas' }),
      leadsEmpty: leadsFiltered.length === 0, propsEmpty: properties.length === 0,
      corretorOpts: [...names, ...S.newRoster.filter(r => r[1] === 'Corretor').map(r => r[0])].map(v => ({ v })),
      origemOpts: ['Instagram/Facebook','Portais','WhatsApp','Indicação','Site'].map(v => ({ v })),
      imovelOpts: imoveisAll.map(p => ({ v: p[1] })),
      contratoOpts: ['CTR-101', ...S.newPending.filter(p => p[0].startsWith('CTR')).map(p => p[0])].map(v => ({ v })),
      cxTipo: S.cxTipo, setCxTipo: e => this.setState({ cxTipo: e.target.value }),
      catOpts: (S.cxTipo === 'Entrada' ? ['Vendas - comissões recebidas','Locações - administração recorrente','Locações - primeiro aluguel','Outras entradas'] : ['Vendas - distribuição aos sócios','Locações - repasse da intermediação','Despesas - pessoal','Despesas - estrutura','Despesas - marketing','Despesas - tecnologia e outras']).map(v => ({ v })),
      modalOpen: !!S.modal, m: Object.fromEntries(['lead','interacao','imovel','agenciamento','caixa','contrato','campanha','corretor','senha'].map(k => [k, S.modal === k])),
      openM: Object.fromEntries(['lead','interacao','imovel','agenciamento','caixa','contrato','campanha','corretor','senha'].map(k => [k, () => this.setState({ modal: k, resetSent: false })])),
      closeModal: () => this.setState({ modal: null }), stop: e => e.stopPropagation(),
      hasToast: !!S.toast, toast: S.toast, resetSent: S.resetSent,
      hasLoginErr: !!S.loginErr, loginErr: S.loginErr,
      doLogin: () => { const em = (document.querySelector('input[name="loginEmail"]') || {}).value || '', pw = (document.querySelector('input[name="loginPass"]') || {}).value || '';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return this.setState({ loginErr: 'Informe um e-mail válido.' });
        if (pw.length < 6) return this.setState({ loginErr: 'A senha precisa ter pelo menos 6 caracteres.' });
        this.setState({ loginErr: '' }); this.go('dashboard'); },
      submit: {
        lead: e => { const d = this.form(e), n = this.now(); this.flash('Lead ' + d.cliente + ' cadastrado', { stage: 'Todas', fCor: '', fOrig: '', q: '', newLeads: [...S.newLeads, [d.cliente, d.telefone, d.imovel || '—', d.bairro || '—', d.corretor, d.origem, d.etapa, n, n, d.obs || 'Sem observações', d.proximo || '']] }); },
        interacao: e => { const d = this.form(e), id = lead.id, dt = d.data ? d.data.replace('T', ' ') : this.now();
          this.flash('Interação registrada para ' + lead.cliente, { newAts: [...S.newAts, ['ATD-' + (104 + S.newAts.length), lead.cliente, lead.imovel, dt, d.etapa, d.tipo, lead.corretor, d.proximo || '', +d.tempo || 0, [d.descricao, d.acao && 'próxima ação: ' + d.acao].filter(Boolean).join(' · ')]],
            stageOv: { ...S.stageOv, [id]: d.etapa }, nextOv: d.proximo ? { ...S.nextOv, [id]: d.proximo } : S.nextOv }); },
        imovel: e => { const d = this.form(e); this.flash('Imóvel ' + d.name + ' cadastrado', { fMod: '', q: '', newProps: [[d.code || 'IMV-' + (104 + S.newProps.length), d.name, d.bairro, d.tipo, +d.valor || 0, d.owner || '—', d.status, d.mod], ...S.newProps] }); },
        agenciamento: e => { const d = this.form(e); this.flash('Agenciamento salvo', { q: '', newAgs: [[d.data || '2026-11-03', d.code || 'PORT-' + String(246 + S.newAgs.length).padStart(4, '0'), d.imovel, d.bairro, d.mod, d.corretor, d.agenciador || '—', +d.valor || 0, d.status], ...S.newAgs] }); },
        caixa: e => { const d = this.form(e); this.flash('Lançamento enviado para conferência', { newPending: [['CX-' + (2300 + S.newPending.length), d.tipo + ' · ' + d.categoria + (d.descricao ? ' · ' + d.descricao : ''), this.money(d.valor), 'Cadastro manual, ' + dm(d.data)], ...S.newPending] }); },
        contrato: e => { const d = this.form(e); this.flash('Contrato enviado para conferência', { newPending: [['CTR-' + (102 + S.newPending.length), d.tipo + ' · ' + d.cliente + ' · ' + d.imovel, this.money(d.valor), 'Cadastro manual, ' + dm(d.data)], ...S.newPending] }); },
        campanha: e => { const d = this.form(e), l = +d.leads || 0, c = +d.custo || 0; this.flash('Campanha cadastrada', { newCamps: [...S.newCamps, [d.nome, d.canal, l, c, l ? c / l : 0, +d.fechados || 0]] }); },
        corretor: e => { const d = this.form(e); this.flash(d.nome + ' cadastrado', { newRoster: [...S.newRoster, [d.nome, d.funcao]] }); },
        senha: e => { e.preventDefault(); this.setState({ resetSent: true }); }
      },
      roles, matrix, pending, pendingCount: pending.length, noPending: pending.length === 0, audit
    };
  }
}
