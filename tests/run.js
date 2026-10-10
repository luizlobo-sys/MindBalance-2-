const { JSDOM, VirtualConsole } = require('jsdom');
const { webcrypto } = require('node:crypto');
const util = require('node:util');

let pass = 0, fail = 0; const errors = [];
function ok(cond, msg) { if (cond) { pass++; console.log('  ✔', msg); } else { fail++; console.log('  ✘ FALHOU:', msg); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented: (Window's scrollTo|window\.scrollTo|HTMLCanvasElement)/.test(e.message)) errors.push('jsdomError: ' + e.message); });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const dom = await JSDOM.fromURL(process.env.MB_URL || 'http://localhost:8765/index.html', {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: webcrypto, configurable: true });
      w.TextEncoder = util.TextEncoder; w.TextDecoder = util.TextDecoder;
      w.addEventListener('error', e => errors.push('window.onerror: ' + e.message));
    }
  });
  const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => Array.from(d.querySelectorAll(s));
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const clickAct = (a, extra = '') => { const el = $(`[data-action="${a}"]${extra}`); if (!el) throw new Error('não achei ação ' + a + extra); click(el); };
  await sleep(1200);
  const MB = w.MB, Store = MB.Store, App = w.MBApp;

  console.log('\n[1] Carregamento e boas-vindas');
  ok(Store.state && !Store.locked, 'estado carregado');
  ok($('#main').innerHTML.length > 200, 'tela inicial renderizada');
  ok(!!$('#modal-root .dialog'), 'modal de boas-vindas aparece na primeira vez');
  $('#ob-name').value = 'Ana';
  click($('[data-modal-act="0"]')); await sleep(100);
  ok(Store.state.settings.onboarded === true && Store.state.settings.name === 'Ana', 'nome e onboarding salvos');
  ok(!$('#modal-root .dialog'), 'modal fechou');
  ok(/Ana/.test($('#main h1').textContent), 'saudação usa o nome');
  ok(!!$('.plant'), 'plantinha renderizada');

  console.log('\n[2] Check-in');
  clickAct('quick-mood', '[data-mood="4"]'); await sleep(150);
  ok(w.location.hash === '#/checkin', 'atalho de humor leva ao check-in');
  ok($('.mood-opt.on') && $('.mood-opt.on').dataset.v === '4', 'humor 4 pré-selecionado');
  clickAct('pick-energy', '[data-v="3"]');
  const sel = $('#ci-sleep'); sel.value = '8'; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  clickAct('chip', '[data-value="Calmo(a)"]'); clickAct('chip', '[data-value="Exercício"]');
  $('#ci-note').value = 'Dia tranquilo, fui caminhar.';
  clickAct('save-checkin'); await sleep(150);
  const today = (() => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })();
  const ci = Store.state.checkins[today];
  ok(ci && ci.mood === 4 && ci.energy === 3 && ci.sleep === 8, 'check-in salvo com humor, energia e sono');
  ok(ci.emotions.includes('Calmo(a)') && ci.factors.includes('Exercício'), 'emoções e fatores salvos');
  ok(w.location.hash === '#/inicio' && /Hoje você se sentiu/.test($('#main').textContent), 'volta ao início mostrando o humor de hoje');
  ok(App.streak() === 1, 'sequência = 1');
  ok(App.growthPoints() === 1, 'plantinha ganhou 1 ponto');

  console.log('\n[3] Check-in sem humor e risco');
  App.go('checkin'); await sleep(100);
  clickAct('set-day', `[data-day="${(() => { const x = new Date(); x.setDate(x.getDate() - 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); })()}"]`);
  clickAct('save-checkin'); await sleep(50);
  ok(Object.keys(Store.state.checkins).length === 1, 'não salva sem escolher humor');
  clickAct('pick-mood', '[data-v="1"]');
  $('#ci-note').value = 'hoje eu só queria me matar';
  clickAct('save-checkin'); await sleep(100);
  ok(!!$('#modal-root .dialog') && /188/.test($('#modal-root').textContent), 'texto de risco abre mensagem de acolhimento com 188');
  ok(Object.keys(Store.state.checkins).length === 2, 'check-in de ontem salvo mesmo assim');
  click($('[data-modal-act="2"]')); await sleep(150);
  ok(!$('#modal-root .dialog') && w.location.hash === '#/inicio', '"Continuar" fecha e volta ao início');
  ok(/Tem sido uns dias|Um passo pequeno|Que tal|Registre/.test($('#main').textContent), 'início mostra sugestão');

  console.log('\n[4] Diário');
  App.go('diario'); await sleep(100);
  $('#d-title').value = '<img src=x onerror=window.__xss=1>';
  $('#d-text').value = 'Texto <script>window.__xss=2</script> com acentuação: coração.';
  clickAct('diary-mood', '[data-v="5"]');
  clickAct('save-diary'); await sleep(100);
  ok(Store.state.diary.length === 1 && Store.state.diary[0].mood === 5, 'entrada salva com humor');
  ok(!w.__xss && !$('#d-list img') && /&lt;img/.test($('#d-list').innerHTML), 'HTML digitado é escapado (sem XSS)');
  $('#d-search').value = 'coracao'; $('#d-search').dispatchEvent(new w.Event('input', { bubbles: true }));
  ok($$('#d-list .entry').length === 1, 'busca ignora acentos');
  $('#d-search').value = 'zzz'; $('#d-search').dispatchEvent(new w.Event('input', { bubbles: true }));
  ok($$('#d-list .entry').length === 0, 'busca sem resultado');
  $('#d-search').value = ''; $('#d-search').dispatchEvent(new w.Event('input', { bubbles: true }));
  clickAct('edit-entry'); await sleep(50);
  $('#d-text').value = 'Texto editado.'; clickAct('save-diary'); await sleep(50);
  ok(Store.state.diary[0].text === 'Texto editado.' && Store.state.diary[0].updated, 'edição salva');
  $('#d-title').value = ''; $('#d-text').value = 'não quero mais viver assim'; clickAct('save-diary'); await sleep(80);
  ok(!!$('#modal-root .dialog') && Store.state.diary.length === 2, 'risco no diário também acolhe');
  click($('[data-modal-act="2"]')); await sleep(50);
  clickAct('del-entry'); await sleep(50);
  click($('[data-modal-act="1"]')); await sleep(80);
  ok(Store.state.diary.length === 1, 'exclusão com confirmação');

  console.log('\n[5] Painel com 40 dias de dados');
  const keyOf = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  for (let n = 2; n < 40; n++) {
    if (n % 5 === 0) continue;
    const ex = n % 3 === 0;
    Store.state.checkins[keyOf(n)] = { mood: ex ? 5 : 2 + (n % 2), energy: 3, sleep: ex ? 8 : 6, emotions: ex ? ['Calmo(a)'] : ['Cansado(a)'], factors: ex ? ['Exercício'] : ['Estudos'], note: '', ts: Date.now() };
  }
  App.go('painel'); await sleep(100);
  ok(!!$('svg.chart') && $$('svg.chart circle.dot').length >= 10, 'gráfico com pontos');
  ok($$('.cal-cell').length >= 28, 'calendário do mês renderizado');
  const ins = App.insights(Object.keys(Store.state.checkins).sort().map(k => Object.assign({ day: k }, Store.state.checkins[k])));
  ok(ins.items.some(i => /Exercício/.test(i)), 'insight de fator (Exercício) gerado: ' + (ins.items[0] || '').replace(/<[^>]+>/g, ''));
  ok(ins.items.some(i => /sono/.test(i)), 'insight de sono gerado');
  clickAct('range', '[data-d="90"]'); await sleep(50); ok(/90 dias/.test($('#main').textContent), 'alterna período 90 dias');
  clickAct('cal-prev'); await sleep(50); ok(!$('[data-action="cal-next"]').disabled, 'mês anterior habilita "próximo"');
  ok(/Resumo MindBalance/.test(App.summaryText(30)) && !/Texto editado/.test(App.summaryText(30)), 'resumo não vaza texto do diário');
  ok(App.bestStreak() >= 2, 'melhor sequência calculada: ' + App.bestStreak());

  console.log('\n[6] Respiração e práticas guiadas');
  App.go('respirar'); await sleep(100);
  ok($$('.list button').length === 9, '4 respirações + 5 práticas listadas');
  clickAct('open-player', '[data-id="calma"]'); await sleep(50);
  ok(App.Player.active && /Respiração calma/.test($('#modal-root').textContent), 'player abre com introdução');
  clickAct('p-dur', '[data-m="1"]'); clickAct('p-start'); await sleep(350);
  ok($('#p-label').textContent === 'Inspire' && $('#p-circle').style.transform === 'scale(1)', 'fase "Inspire" expande o círculo');
  clickAct('p-pause'); ok(App.Player.st.paused, 'pausa funciona'); clickAct('p-pause');
  const before = Store.state.sessions.length;
  App.Player.st.cn = App.Player.st.cycles; App.Player.st.pi = 1; App.Player.st.pt = 999; await sleep(400);
  ok(Store.state.sessions.length === before + 1 && /Prática concluída/.test($('#modal-root').textContent), 'conclusão registra a prática');
  click($('button[data-action="p-close"]')); await sleep(50);
  ok(!App.Player.active && !$('.player'), 'fecha o player');
  clickAct('open-player', '[data-id="grounding"]'); clickAct('p-start'); await sleep(100);
  const nSteps = MB.GUIDED.find(g => g.id === 'grounding').steps.length;
  for (let i = 0; i < nSteps; i++) { clickAct('p-next'); await sleep(20); }
  ok(Store.state.sessions.length === before + 2 && Store.state.sessions[before + 1].pid === 'grounding', 'prática 5-4-3-2-1 concluída passo a passo');
  click($('button[data-action="p-close"]')); await sleep(30);
  clickAct('open-player', '[data-id="presente"]'); clickAct('p-start'); await sleep(250);
  clickAct('p-stop'); await sleep(30);
  ok(Store.state.sessions.length === before + 2, 'encerrar antes do fim não conta como prática concluída');
  App.go('inicio'); await sleep(50);
  App.go('respirar'); await sleep(80); clickAct('open-player', '[data-id="calma"]'); ok(App.Player.active, 'player aberto antes de trocar de tela'); App.go('inicio'); await sleep(100);
  ok(!App.Player.active, 'trocar de tela fecha o player');

  console.log('\n[7] Configurações, PIN e criptografia real');
  App.go('config'); await sleep(100);
  ok(/Ativar PIN/.test($('#main').textContent), 'tela de configurações renderiza');
  clickAct('theme', '[data-v="dark"]'); await sleep(30);
  ok(d.documentElement.dataset.theme === 'dark' && Store.state.settings.theme === 'dark', 'tema escuro aplicado');
  clickAct('theme', '[data-v="auto"]');
  clickAct('pin-on'); await sleep(30);
  $('#pin1').value = '123'; $('#pin2').value = '123'; click($('[data-modal-act="1"]')); await sleep(50);
  ok(!$('#pin-err').hidden && !!$('#modal-root .dialog'), 'PIN curto é recusado');
  $('#pin1').value = 'segredo42'; $('#pin2').value = 'segredo42'; click($('[data-modal-act="1"]')); await sleep(900);
  ok(Store.isEncrypted() && w.localStorage.getItem('mb2:data') === null, 'dados migrados para armazenamento criptografado');
  const raw = w.localStorage.getItem('mb2:enc');
  ok(!/Texto editado|Ana|Calmo/.test(raw), 'texto cifrado não contém dados legíveis');
  Store.state.diary[0].text = 'Segundo texto salvo já criptografado.'; await Store.save();
  const nDiary = Store.state.diary.length;
  Store.state = null; Store.key = null; Store.locked = false;
  ok((await Store.init()) === 'locked', 'ao recarregar, o app pede o PIN');
  ok((await Store.unlock('errada')) === false, 'PIN errado não abre');
  ok((await Store.unlock('segredo42')) === true && Store.state.diary.length === nDiary && /Segundo texto/.test(Store.state.diary[0].text), 'PIN certo restaura os dados (incluindo a alteração feita após criptografar)');
  App.go('config'); await sleep(50);
  clickAct('pin-off'); await sleep(30);
  $('#pin0').value = 'x'; click($('[data-modal-act="1"]')); await sleep(900);
  ok(!$('#pin-err').hidden, 'desativar com PIN errado é recusado');
  $('#pin0').value = 'segredo42'; click($('[data-modal-act="1"]')); await sleep(900);
  ok(!Store.isEncrypted() && !!w.localStorage.getItem('mb2:data'), 'PIN desativado volta ao armazenamento simples');

  console.log('\n[8] Backup e migração da versão 1');
  const v1 = { moodEntries: [{ mood: '4', timestamp: '2026-09-01T12:00:00Z', trigger: 'prova', activities: 'estudo' }, { mood: '2', timestamp: '2026-09-02T12:00:00Z' }],
    diaryEntries: [{ title: 'Oi', content: 'texto antigo', mood: '🙂', timestamp: '2026-09-01T13:00:00Z' }], meditationSessions: [{ type: 'mindfulness', duration: 5, timestamp: '2026-09-01T14:00:00Z' }] };
  const n1 = Store.normalize(v1);
  ok(Object.keys(n1.checkins).length === 2 && n1.diary[0].mood === 4 && n1.sessions[0].minutes === 5, 'backup do formato antigo é convertido');
  const hostile = Store.normalize({ checkins: { '2026-01-01': { mood: 99 }, 'x': { mood: 3 }, '2026-01-02': { mood: 3, emotions: [1, 'ok'], note: 'a'.repeat(5000) } }, diary: [{ text: 5 }, 'x', null], settings: { theme: 'neon' } });
  ok(Object.keys(hostile.checkins).length === 1 && hostile.checkins['2026-01-02'].note.length === 2000 && hostile.settings.theme === 'auto' && hostile.diary.length === 0, 'arquivo malformado é saneado');
  const rt = Store.normalize(JSON.parse(JSON.stringify(Store.state)));
  ok(Object.keys(rt.checkins).length === Object.keys(Store.state.checkins).length, 'exportar e importar preserva os check-ins');

  console.log('\n[9] Lembrete e rotas');
  w.location.hash = '#/rota-inexistente'; await sleep(80);
  ok(!!$('.garden'), 'rota desconhecida cai no início');
  ok($$('.nav a[aria-current="page"]').length === 1, 'navegação marca a página atual');

  console.log('\n[10] Erros de execução');
  ok(errors.length === 0, 'nenhum erro JavaScript durante todo o roteiro' + (errors.length ? '\n     ' + errors.join('\n     ') : ''));

  console.log(`\nResultado: ${pass} passaram, ${fail} falharam`);
  dom.window.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERRO NO TESTE:', e); process.exit(2); });
