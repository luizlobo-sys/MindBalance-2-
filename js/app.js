/* MindBalance 2.0 — aplicação.
   Sem dependências externas. Todo o conteúdo digitado pelo aluno é escapado antes de ir para a tela. */
(function () {
  'use strict';

  const MB = window.MB, Store = MB.Store, LS = MB.LS;
  const { MOODS, EMOTIONS, FACTORS, PROMPTS, TIPS, BREATH, GUIDED, HELP, isRisk } = MB;

  /* ================= utilidades ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseKey = k => { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const f1 = n => n == null ? '–' : n.toFixed(1).replace('.', ',');
  const S = () => Store.state;
  const moodOf = v => MOODS[v - 1];
  const uid = Store.uid;
  const fmtDateTime = ts => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtMin = m => m < 1 ? Math.round(m * 60) + ' segundos' : (Math.round(m * 10) / 10 + '').replace('.', ',') + ' min';

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
  }

  /* ================= dados derivados ================= */
  function checkinsArray() { return Object.keys(S().checkins).sort().map(k => Object.assign({ day: k }, S().checkins[k])); }
  function streak() {
    const c = S().checkins; let d = new Date(); if (!c[dayKey(d)]) d = addDays(d, -1);
    let n = 0; while (c[dayKey(d)]) { n++; d = addDays(d, -1); } return n;
  }
  function bestStreak() {
    const keys = Object.keys(S().checkins).sort(); let best = 0, cur = 0, prev = null;
    keys.forEach(k => { cur = (prev && dayKey(addDays(parseKey(prev), 1)) === k) ? cur + 1 : 1; if (cur > best) best = cur; prev = k; });
    return best;
  }
  function moodsBetween(a, b) { const x = dayKey(a), y = dayKey(b); return checkinsArray().filter(c => c.day >= x && c.day <= y).map(c => c.mood); }
  function growthPoints() { const s = S(); return Object.keys(s.checkins).length + s.diary.length + s.sessions.length; }
  function minutesSince(d) { return S().sessions.filter(x => x.ts >= d.getTime()).reduce((t, x) => t + x.minutes, 0); }

  /* ================= plantinha (cresce com os cuidados, nunca murcha) ================= */
  const STAGES = ['Semente', 'Broto', 'Brotinho firme', 'Plantinha', 'Com botão', 'Florida'];
  function stageOf(p) { return p >= 60 ? 5 : p >= 30 ? 4 : p >= 15 ? 3 : p >= 5 ? 2 : p >= 1 ? 1 : 0; }
  function plantSVG(points) {
    const st = stageOf(points), base = 138;
    const h = [0, 26, 50, 72, 90, 98][st];
    const leaf = (x, y, rot, flip, sc) =>
      `<path d="M0 0C8-9 22-9 26 0 22 9 8 9 0 0z" transform="translate(${x} ${y}) ${flip ? 'scale(-1 1) ' : ''}rotate(${rot}) scale(${sc})" fill="var(--leaf)"/>`;
    let g = '<ellipse cx="60" cy="146" rx="34" ry="7" fill="#6b4f35"/>';
    if (st === 0) {
      g += '<ellipse cx="60" cy="137" rx="7" ry="4.5" fill="#a98558"/>';
    } else {
      g += `<path d="M60 ${base} C60 ${base - h * .5} 57 ${base - h * .8} 60 ${base - h}" stroke="var(--leaf)" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      const pairs = [0, 1, 2, 3, 3, 3][st];
      for (let i = 0; i < pairs; i++) {
        const y = base - h * (0.38 + 0.24 * i), sc = 0.7 + 0.18 * (pairs - i) / pairs;
        g += leaf(60, y, -28, false, sc) + leaf(60, y, -28, true, sc);
      }
      const top = base - h;
      if (st <= 3) g += leaf(60, top + 2, -62, false, .6) + leaf(60, top + 2, -62, true, .6);
      if (st === 4) g += `<ellipse cx="60" cy="${top - 5}" rx="7" ry="11" fill="#f08fa6"/><path d="M52 ${top + 2} Q60 ${top - 8} 68 ${top + 2}" fill="var(--leaf)"/>`;
      if (st === 5) {
        for (let a = 0; a < 5; a++) g += `<ellipse cx="60" cy="${top - 15}" rx="7" ry="12" fill="#f6b6c6" transform="rotate(${a * 72} 60 ${top - 5})"/>`;
        g += `<circle cx="60" cy="${top - 5}" r="6.5" fill="#f2c94c"/>`;
      }
    }
    return `<svg class="plant" viewBox="0 0 120 150" role="img" aria-label="Sua plantinha: ${STAGES[st]}"><g class="grow" id="plant-g" style="transform:scale(.92)">${g}</g></svg>`;
  }

  /* ================= modal ================= */
  let modalActs = [], lastFocus = null;
  function openModal({ title, html, actions = [], dismiss = true }) {
    closeModal(true);
    lastFocus = document.activeElement;
    $('#modal-root').innerHTML =
      `<div class="backdrop" data-dismiss="${dismiss ? 1 : 0}"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">` +
      `<h2 id="dlg-title">${esc(title)}</h2><div>${html}</div>` +
      `<div class="dialog-actions">${actions.map((a, i) => `<button class="btn ${a.kind || ''}" data-modal-act="${i}">${esc(a.label)}</button>`).join('')}</div></div></div>`;
    modalActs = actions; document.body.classList.add('noscroll');
    const first = $('#modal-root input, #modal-root textarea') || $('#modal-root [data-modal-act]');
    if (first) first.focus();
  }
  function closeModal(silent) {
    $('#modal-root').innerHTML = ''; document.body.classList.remove('noscroll'); modalActs = [];
    if (!silent && lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignora */ } }
  }
  function confirmBox(msg, okLabel, danger) {
    return new Promise(res => openModal({
      title: 'Tem certeza?', html: `<p>${esc(msg)}</p>`, dismiss: false,
      actions: [{ label: 'Cancelar', kind: 'ghost', onClick: () => res(false) }, { label: okLabel || 'Confirmar', kind: danger ? 'danger' : 'primary', onClick: () => res(true) }]
    }));
  }
  function helpHTML() {
    return '<p>Se você está passando por um momento difícil, não precisa enfrentar isso sozinho(a). Estes serviços são gratuitos:</p>' +
      HELP.map(h => `<div class="help-item"><a class="tel" href="tel:${h.tel}">${h.tel}</a><strong>${esc(h.name)}</strong><p class="muted">${esc(h.desc)}</p></div>`).join('') +
      '<p>Você também pode falar agora com alguém de confiança: família, professor(a) ou a coordenação da escola.</p>' +
      '<p class="muted">O MindBalance não substitui acompanhamento profissional.</p>';
  }
  function showHelp() { openModal({ title: 'Preciso de ajuda', html: helpHTML(), actions: [{ label: 'Fechar', kind: 'primary' }] }); }
  function showRisk(after) {
    openModal({
      title: 'Você não está sozinho(a)', dismiss: false,
      html: '<p>Obrigado por escrever o que está sentindo. Se você está pensando em se machucar ou em morrer, existe ajuda agora, e você merece apoio.</p>' +
        '<p><strong>Ligue para o CVV: <a href="tel:188">188</a></strong> (gratuito, 24 horas). Se estiver em perigo imediato, ligue <a href="tel:192">192</a> (SAMU) ou <a href="tel:190">190</a>.</p>' +
        '<p>Se puder, conte para um adulto de confiança agora: família, professor(a) ou coordenação da escola.</p>',
      actions: [
        { label: 'Ligar para o 188', kind: 'primary', onClick: () => { location.href = 'tel:188'; return false; } },
        { label: 'Ver outros contatos', kind: 'soft', onClick: () => { setTimeout(showHelp, 0); } },
        { label: 'Continuar', kind: 'ghost', onClick: () => { if (after) after(); } }
      ]
    });
  }

  /* ================= estado de formulários ================= */
  let current = 'inicio';
  let form = null, ciDay = dayKey(), pendingMood = 0;
  let diaryQ = '', editingId = null, dMood = 0;
  let range = 30, calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let deferredInstall = null;

  const chip = (group, val, on) => `<button type="button" class="chip" data-action="chip" data-group="${group}" data-value="${esc(val)}" aria-pressed="${on}">${esc(val)}</button>`;

  /* ================= INÍCIO ================= */
  const viewHome = {
    title: 'Início',
    render() {
      const s = S(), today = dayKey(), ci = s.checkins[today];
      const h = new Date().getHours();
      const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
      const pts = growthPoints(), st = stageOf(pts);
      const next = [1, 5, 15, 30, 60].find(n => n > pts);
      const st7 = streak(), a7 = avg(moodsBetween(addDays(startOfDay(new Date()), -6), new Date()));
      const mins7 = Math.round(minutesSince(addDays(startOfDay(new Date()), -6)));

      const garden = `<section class="garden" aria-label="Sua plantinha">
        ${plantSVG(pts)}
        <div class="garden-text">
          <h1>${greet}${s.settings.name ? ', ' + esc(s.settings.name) : ''}</h1>
          <p>Sua plantinha está em <strong>${STAGES[st]}</strong>.</p>
          <p class="muted small">${next ? (next - pts === 1 ? 'Falta 1 cuidado' : 'Faltam ' + (next - pts) + ' cuidados') + ' para a próxima fase. ' : 'Ela chegou à última fase. '}Ela cresce com check-ins, diário e práticas, e nunca murcha.</p>
        </div><div class="ground"></div></section>`;

      const todayBlock = ci
        ? `<section class="today"><h2>Hoje você se sentiu: ${moodOf(ci.mood).emoji} ${moodOf(ci.mood).label}</h2>
           <p class="muted">Obrigado por reservar um momento para você.</p><div><a class="btn soft sm" href="#/checkin">Editar check-in de hoje</a></div></section>`
        : `<section class="today"><h2>Como você está hoje?</h2>
           <div class="mood-row" role="group" aria-label="Escolha rápida de humor">${MOODS.map(m => `<button class="mood-quick" data-action="quick-mood" data-mood="${m.v}"><span aria-hidden="true">${m.emoji}</span><small>${m.label}</small></button>`).join('')}</div></section>`;

      const stats = `<section class="stats" aria-label="Resumo da semana">
        <div class="stat"><b>${st7}</b><span>${st7 === 1 ? 'dia seguido' : 'dias seguidos'}</span></div>
        <div class="stat"><b>${f1(a7)}</b><span>humor médio, 7 dias</span></div>
        <div class="stat"><b>${mins7}</b><span>min de prática, 7 dias</span></div></section>`;

      let suggest = '';
      if (ci && ci.mood <= 2) suggest = `<section class="callout"><h3>Um passo pequeno</h3><p>Quando o dia está pesado, ajuda trazer a atenção para o presente. Experimente o exercício 5-4-3-2-1, leva cerca de 3 minutos.</p><button class="btn primary sm" data-action="open-player" data-kind="guided" data-id="grounding">Começar agora</button></section>`;
      else if (ci && ci.mood === 3) suggest = `<section class="callout"><h3>Que tal uma pausa?</h3><p>Uma respiração de 1 minuto pode ajudar a mudar o ritmo do dia.</p><button class="btn primary sm" data-action="open-player" data-kind="breath" data-id="calma">Respirar 1 minuto</button></section>`;
      else if (ci) suggest = `<section class="callout"><h3>Registre o que está bom</h3><p>Escrever o que fez o seu dia bom ajuda a lembrar disso nos dias difíceis.</p><a class="btn primary sm" href="#/diario">Escrever no diário</a></section>`;

      const recent = checkinsArray().slice(-3);
      const lowStretch = recent.length === 3 && recent.every(c => c.mood <= 2) && (new Date() - parseKey(recent[0].day)) / 864e5 <= 7;
      const care = lowStretch ? `<section class="callout care"><h3>Tem sido uns dias pesados</h3><p>Isso acontece, e você não precisa passar por isso sozinho(a). Conversar com alguém de confiança (família, professor(a), coordenação) pode ajudar. O CVV atende pelo 188, a qualquer hora.</p><button class="btn soft sm" data-action="help">Ver contatos de ajuda</button></section>` : '';

      const install = deferredInstall ? `<section class="callout"><h3>Instale o MindBalance</h3><p>Abra o app direto da tela inicial do celular, inclusive sem internet.</p><button class="btn primary sm" data-action="install">Instalar</button></section>` : '';

      const links = `<nav class="links" aria-label="Atalhos">
        <a href="#/respirar"><span class="ic" aria-hidden="true">🌬️</span><span><strong>Respirar</strong><small>Exercícios de 1 a 5 minutos</small></span><span class="chev" aria-hidden="true">›</span></a>
        <button data-action="open-player" data-kind="guided" data-id="estudos"><span class="ic" aria-hidden="true">📚</span><span><strong>Pausa entre os estudos</strong><small>2 minutos para soltar o corpo</small></span><span class="chev" aria-hidden="true">›</span></button>
        <a href="#/diario"><span class="ic" aria-hidden="true">📔</span><span><strong>Diário</strong><small>Escreva sem pressa</small></span><span class="chev" aria-hidden="true">›</span></a>
        <a href="#/painel"><span class="ic" aria-hidden="true">📈</span><span><strong>Meu painel</strong><small>Veja como você tem se sentido</small></span><span class="chev" aria-hidden="true">›</span></a></nav>`;

      const tip = TIPS[Math.floor(Date.now() / 864e5) % TIPS.length];
      return garden + todayBlock + care + suggest + stats + install + links +
        `<section class="tip"><h3>Dica do dia</h3><p>${esc(tip)}</p></section>` +
        '<p class="disclaimer">O MindBalance é uma ferramenta de autoconhecimento. Ele não faz diagnóstico e não substitui psicólogos(as) ou médicos(as).</p>';
    },
    mount() { requestAnimationFrame(() => { const g = $('#plant-g'); if (g) g.style.transform = 'scale(1)'; }); }
  };

  /* ================= CHECK-IN ================= */
  function initForm(day) {
    const ex = S().checkins[day];
    form = { day, mood: ex ? ex.mood : (pendingMood || 0), energy: ex ? ex.energy : 0, sleep: ex ? ex.sleep : 0, emotions: new Set(ex ? ex.emotions : []), factors: new Set(ex ? ex.factors : []), note: ex ? ex.note : '' };
    pendingMood = 0;
  }
  const viewCheckin = {
    title: 'Check-in',
    enter() { ciDay = dayKey(); },
    render() {
      initForm(ciDay);
      const today = dayKey(), yest = dayKey(addDays(new Date(), -1)), isToday = ciDay === today;
      const exists = !!S().checkins[ciDay];
      const sleepOpts = ['<option value="0">Prefiro não informar</option>'].concat([3, 4, 5, 6, 7, 8, 9, 10, 11].map(n => `<option value="${n}"${form.sleep === n ? ' selected' : ''}>${n === 3 ? '3 h ou menos' : n === 11 ? '11 h ou mais' : n + ' h'}</option>`)).join('');
      return `<h1>Check-in</h1>
      <p class="muted">Observe como você está, sem julgamentos. Não existe resposta certa.</p>
      <div class="segmented" role="group" aria-label="Dia do check-in">
        <button data-action="set-day" data-day="${today}" class="${isToday ? 'on' : ''}" aria-pressed="${isToday}">Hoje</button>
        <button data-action="set-day" data-day="${yest}" class="${!isToday ? 'on' : ''}" aria-pressed="${!isToday}">Ontem</button></div>
      <section class="q"><h2 id="q-mood">Como você está se sentindo?</h2>
        <div class="mood-row" role="radiogroup" aria-labelledby="q-mood">${MOODS.map(m => `<button type="button" role="radio" aria-checked="${form.mood === m.v}" class="mood-opt m${m.v}${form.mood === m.v ? ' on' : ''}" data-action="pick-mood" data-v="${m.v}"><span aria-hidden="true">${m.emoji}</span><small>${m.label}</small></button>`).join('')}</div></section>
      <section class="q"><h2 id="q-energy">Como está sua energia?</h2>
        <div class="scale" role="radiogroup" aria-labelledby="q-energy">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="${form.energy === n}" class="scale-opt${form.energy === n ? ' on' : ''}" data-action="pick-energy" data-v="${n}">${n}</button>`).join('')}</div>
        <div class="scale-legend"><span>Sem energia</span><span>Com muita energia</span></div></section>
      <section class="q"><h2><label for="ci-sleep">Quantas horas você dormiu?</label></h2><select id="ci-sleep" class="input short" data-bind="sleep">${sleepOpts}</select></section>
      <section class="q"><h2 id="q-emo">Quais emoções apareceram? <small>(opcional)</small></h2>
        <div class="chips" role="group" aria-labelledby="q-emo">${EMOTIONS.map(e => chip('emotions', e, form.emotions.has(e))).join('')}</div></section>
      <section class="q"><h2 id="q-fac">O que influenciou o seu dia? <small>(opcional)</small></h2>
        <div class="chips" role="group" aria-labelledby="q-fac">${FACTORS.map(e => chip('factors', e, form.factors.has(e))).join('')}</div></section>
      <section class="q"><h2><label for="ci-note">Quer anotar algo?</label> <small>(opcional)</small></h2>
        <textarea id="ci-note" class="input" rows="4" maxlength="2000" placeholder="Só se quiser. Fica salvo apenas neste aparelho.">${esc(form.note)}</textarea></section>
      <button class="btn primary block lg" data-action="save-checkin">${exists ? 'Atualizar check-in' : 'Salvar check-in'}</button>`;
    }
  };

  /* ================= RESPIRAR ================= */
  const viewWellness = {
    title: 'Respirar',
    render() {
      const rec = S().sessions.slice(-4).reverse();
      return `<h1>Respirar e acalmar</h1>
      <p class="muted">Escolha um exercício. Se algo incomodar (tontura, por exemplo), pare e respire normalmente.</p>
      <section><h2>Respiração guiada</h2><div class="list">${BREATH.map(b => `<button data-action="open-player" data-kind="breath" data-id="${b.id}"><span class="ic" aria-hidden="true">${b.emoji}</span><span><strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small></span><span class="dur">1 a 5 min</span></button>`).join('')}</div></section>
      <section><h2>Práticas guiadas</h2><div class="list">${GUIDED.map(g => `<button data-action="open-player" data-kind="guided" data-id="${g.id}"><span class="ic" aria-hidden="true">${g.emoji}</span><span><strong>${esc(g.name)}</strong><small>${esc(g.desc)}</small></span><span class="dur">${g.minutes} min</span></button>`).join('')}</div></section>
      ${rec.length ? `<section><h2>Suas últimas práticas</h2><ul class="plain">${rec.map(r => `<li>${esc(r.name)} <span class="muted">(${fmtMin(r.minutes)}, ${fmtDateTime(r.ts)})</span></li>`).join('')}</ul></section>` : ''}`;
    }
  };

  /* ================= DIÁRIO ================= */
  function diaryFiltered() {
    const q = MB.norm(diaryQ.trim());
    return S().diary.slice().sort((a, b) => b.ts - a.ts).filter(d => !q || MB.norm(d.title + ' ' + d.text).includes(q));
  }
  function diaryList() {
    const list = diaryFiltered();
    if (!list.length) return S().diary.length ? '<p class="muted">Nada encontrado para essa busca.</p>'
      : '<div class="empty"><div class="empty-ic">📔</div><p class="muted">Seu diário ainda está vazio. Escreva a primeira entrada quando quiser.</p></div>';
    return list.map(d => {
      const long = d.text.length > 240;
      return `<article class="entry" data-id="${d.id}"><header><span class="entry-mood" aria-hidden="true">${d.mood ? moodOf(d.mood).emoji : '📝'}</span>
        <div><strong>${esc(d.title || 'Sem título')}</strong><time class="muted" datetime="${new Date(d.ts).toISOString()}">${fmtDateTime(d.ts)}${d.updated ? ' (editado)' : ''}</time></div></header>
        <p class="entry-text${long ? ' clamp' : ''}">${esc(d.text)}</p>
        <div class="row">${long ? '<button class="btn link sm" data-action="toggle-entry">Ler tudo</button>' : ''}<button class="btn link sm" data-action="edit-entry" data-id="${d.id}">Editar</button><button class="btn link sm danger-t" data-action="del-entry" data-id="${d.id}">Excluir</button></div></article>`;
    }).join('');
  }
  const viewDiary = {
    title: 'Diário',
    enter() { editingId = null; dMood = 0; diaryQ = ''; },
    render() {
      const ed = editingId ? S().diary.find(d => d.id === editingId) : null;
      return `<h1>Diário</h1>
      <p class="muted">Um espaço só seu. Escreva do jeito que vier, ninguém além de você lê isto.</p>
      <section class="panel"><h2>${ed ? 'Editar entrada' : 'Nova entrada'}</h2>
        <label class="lbl" for="d-title">Título <small class="muted">(opcional)</small></label>
        <input id="d-title" class="input" maxlength="120" value="${esc(ed ? ed.title : '')}">
        <span class="lbl" id="d-mood-l">Como você está agora? <small class="muted">(opcional)</small></span>
        <div class="mini-row" role="radiogroup" aria-labelledby="d-mood-l">${MOODS.map(m => `<button type="button" role="radio" aria-checked="${dMood === m.v}" aria-label="${m.label}" class="mini${dMood === m.v ? ' on' : ''}" data-action="diary-mood" data-v="${m.v}">${m.emoji}</button>`).join('')}</div>
        <label class="lbl" for="d-text">O que você quer escrever?</label>
        <textarea id="d-text" class="input" rows="7" maxlength="20000">${esc(ed ? ed.text : '')}</textarea>
        <div class="chips small" style="margin-top:10px"><span class="muted" style="align-self:center">Ideias para começar:</span>${PROMPTS.map((p, i) => `<button type="button" class="chip ghost" data-action="prompt" data-i="${i}">${esc(p.label)}</button>`).join('')}</div>
        <div class="row" style="margin-top:16px"><button class="btn primary" data-action="save-diary">${ed ? 'Salvar alterações' : 'Salvar entrada'}</button>${ed ? '<button class="btn ghost" data-action="cancel-edit">Cancelar</button>' : ''}</div></section>
      <section><div class="row between"><h2>Minhas entradas <small class="muted" id="d-count">(${S().diary.length})</small></h2></div>
        <label class="sr" for="d-search">Buscar nas entradas</label>
        <input id="d-search" class="input" type="search" placeholder="Buscar nas entradas" value="${esc(diaryQ)}">
        <div id="d-list">${diaryList()}</div></section>`;
    }
  };

  /* ================= PAINEL ================= */
  function chartHTML(days) {
    const end = startOfDay(new Date()), start = addDays(end, -(days - 1)), c = S().checkins;
    const main = $('#main'), W = Math.round(Math.min(640, Math.max(300, (main && main.clientWidth) || 640))), H = 220, L = 34, R = 10, T = 12, B = 28, iw = W - L - R, ih = H - T - B;
    const x = i => L + (days === 1 ? 0 : i * iw / (days - 1));
    const y = v => T + ih - (v - 1) * ih / 4;
    let g = '', pts = [];
    for (let v = 1; v <= 5; v++) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${moodOf(v).emoji}</text>`;
    for (let i = 0; i < days; i++) { const k = dayKey(addDays(start, i)); if (c[k]) pts.push({ i, v: c[k].mood, k }); }
    let path = '', prev = -9;
    pts.forEach(p => { path += (p.i - prev === 1 ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p.v).toFixed(1) + ' '; prev = p.i; });
    const dots = pts.map(p => `<circle class="dot d${p.v}" cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${days > 45 ? 3.5 : 5.5}"><title>${esc(p.k.split('-').reverse().join('/'))}: ${moodOf(p.v).label}</title></circle>`).join('');
    const lab = [0, Math.floor((days - 1) / 2), days - 1].map(i => { const d = addDays(start, i); return `<text x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === days - 1 ? 'end' : 'middle'}">${d.getDate()}/${d.getMonth() + 1}</text>`; }).join('');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico do humor nos últimos ${days} dias, com ${pts.length} registros.">${g}<path class="line" d="${path}"/>${dots}${lab}</svg>`;
  }
  function calendarHTML() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth(), c = S().checkins, today = dayKey();
    const days = new Date(y, m + 1, 0).getDate(), offset = new Date(y, m, 1).getDay();
    let cells = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<span class="cal-h" aria-hidden="true">${d}</span>`).join('');
    for (let i = 0; i < offset; i++) cells += '<span class="cal-cell empty"></span>';
    for (let d = 1; d <= days; d++) {
      const k = y + '-' + pad(m + 1) + '-' + pad(d), ci = c[k], tc = k === today ? ' today' : '';
      cells += ci ? `<span class="cal-cell m${ci.mood}${tc}" role="img" aria-label="${d}: ${moodOf(ci.mood).label}"><b>${d}</b><i>${moodOf(ci.mood).emoji}</i></span>`
        : `<span class="cal-cell${tc}" aria-label="${d}: sem registro"><b>${d}</b></span>`;
    }
    return `<div class="cal">${cells}</div>`;
  }
  function insights(all) {
    const items = [];
    if (all.length < 7) return { items, need: 7 - all.length };
    const end = startOfDay(new Date());
    const win = (a, b) => all.filter(c => c.day >= dayKey(addDays(end, -a)) && c.day <= dayKey(addDays(end, -b))).map(c => c.mood);
    const l7 = win(6, 0), p7 = win(13, 7);
    if (l7.length >= 3 && p7.length >= 3) {
      const d = avg(l7) - avg(p7);
      items.push(Math.abs(d) < .3 ? `Seu humor ficou parecido com o da semana anterior (${f1(avg(l7))} agora, ${f1(avg(p7))} antes).`
        : d > 0 ? `📈 Seu humor médio subiu nesta semana: ${f1(avg(l7))} (semana anterior: ${f1(avg(p7))}).`
          : `📉 Seu humor médio ficou mais baixo nesta semana: ${f1(avg(l7))} (semana anterior: ${f1(avg(p7))}). Isso acontece. Cuide de você.`);
    }
    const rows = [];
    new Set(all.flatMap(c => c.factors)).forEach(f => {
      const w = all.filter(c => c.factors.includes(f)).map(c => c.mood), o = all.filter(c => !c.factors.includes(f)).map(c => c.mood);
      if (w.length >= 3 && o.length >= 3) rows.push({ f, aw: avg(w), ao: avg(o), d: avg(w) - avg(o) });
    });
    rows.filter(r => Math.abs(r.d) >= .4).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3)
      .forEach(r => items.push(`${r.d > 0 ? '🟢' : '🟠'} Em dias com <strong>${esc(r.f)}</strong>, seu humor médio foi ${f1(r.aw)} (nos outros dias: ${f1(r.ao)}).`));
    const sl = all.filter(c => c.sleep), good = sl.filter(c => c.sleep >= 8).map(c => c.mood), short = sl.filter(c => c.sleep < 7).map(c => c.mood);
    if (good.length >= 3 && short.length >= 3) items.push(`😴 Com 8 h ou mais de sono, seu humor médio foi ${f1(avg(good))}. Com menos de 7 h, ${f1(avg(short))}.`);
    return { items, need: 0 };
  }
  function summaryText(days) {
    const end = startOfDay(new Date()), start = addDays(end, -(days - 1));
    const list = checkinsArray().filter(c => c.day >= dayKey(start) && c.day <= dayKey(end));
    const L = ['Resumo MindBalance, últimos ' + days + ' dias', dayKey(start) + ' a ' + dayKey(end), ''];
    if (!list.length) { L.push('Nenhum check-in no período.'); return L.join('\n'); }
    L.push('Check-ins: ' + list.length + ' de ' + days + ' dias');
    L.push('Humor médio (1 a 5): ' + f1(avg(list.map(c => c.mood))));
    L.push('Distribuição: ' + MOODS.map(m => m.label + ' ' + list.filter(c => c.mood === m.v).length).join(', '));
    const en = list.filter(c => c.energy).map(c => c.energy); if (en.length) L.push('Energia média (1 a 5): ' + f1(avg(en)));
    const sl = list.filter(c => c.sleep).map(c => c.sleep); if (sl.length) L.push('Sono médio: ' + f1(avg(sl)) + ' h');
    const top = key => { const m = {}; list.forEach(c => c[key].forEach(x => { m[x] = (m[x] || 0) + 1; })); return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 5).map(x => x + ' (' + m[x] + ')').join(', '); };
    const te = top('emotions'); if (te) L.push('Emoções mais frequentes: ' + te);
    const tf = top('factors'); if (tf) L.push('Fatores mais citados: ' + tf);
    const ses = S().sessions.filter(x => x.ts >= start.getTime());
    L.push('Práticas de bem-estar: ' + ses.length + ' (' + fmtMin(ses.reduce((t, x) => t + x.minutes, 0)) + ')');
    L.push(''); L.push('Gerado no MindBalance. Não inclui o texto do diário nem das anotações.');
    return L.join('\n');
  }
  const viewDash = {
    title: 'Painel',
    enter() { const n = new Date(); calMonth = new Date(n.getFullYear(), n.getMonth(), 1); },
    render() {
      const all = checkinsArray();
      if (!all.length) return `<h1>Painel</h1><section class="panel empty"><div class="empty-ic">📈</div><h2>Ainda não há dados</h2><p class="muted">Faça seu primeiro check-in e acompanhe aqui como você tem se sentido ao longo do tempo.</p><a class="btn primary" href="#/checkin">Fazer check-in</a></section>`;
      const end = startOfDay(new Date()), start = addDays(end, -(range - 1));
      const inR = all.filter(c => c.day >= dayKey(start) && c.day <= dayKey(end));
      const dist = [1, 2, 3, 4, 5].map(v => inR.filter(c => c.mood === v).length), maxd = Math.max(1, ...dist);
      const count = key => { const m = {}; inR.forEach(c => c[key].forEach(x => { m[x] = (m[x] || 0) + 1; })); return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 6).map(x => `<span class="chip" style="cursor:default">${esc(x)} <small>${m[x]}</small></span>`).join(''); };
      const emo = count('emotions'), fac = count('factors');
      const ins = insights(all);
      const cm0 = calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), cm = cm0.charAt(0).toUpperCase() + cm0.slice(1);
      const nowM = new Date(); const isLast = calMonth.getFullYear() === nowM.getFullYear() && calMonth.getMonth() === nowM.getMonth();
      return `<h1>Painel</h1>
      <section class="stats"><div class="stat"><b>${all.length}</b><span>check-ins no total</span></div>
        <div class="stat"><b>${f1(avg(inR.map(c => c.mood)))}</b><span>humor médio, ${range} dias</span></div>
        <div class="stat"><b>${streak()}</b><span>dias seguidos (melhor: ${bestStreak()})</span></div></section>
      <section><div class="row between"><h2>Seu humor ao longo do tempo</h2>
        <div class="segmented" role="group" aria-label="Período">${[14, 30, 90].map(d => `<button data-action="range" data-d="${d}" class="${range === d ? 'on' : ''}" aria-pressed="${range === d}">${d} dias</button>`).join('')}</div></div>
        ${chartHTML(range)}</section>
      <section><div class="row between"><h2>${esc(cm)}</h2><div class="row">
        <button class="btn soft sm" data-action="cal-prev" aria-label="Mês anterior">‹</button>
        <button class="btn soft sm" data-action="cal-next" aria-label="Próximo mês" ${isLast ? 'disabled' : ''}>›</button></div></div>${calendarHTML()}</section>
      <section><h2>Como foram os dias (${range} dias)</h2>${[5, 4, 3, 2, 1].map(v => `<div class="bar-row"><span>${moodOf(v).emoji} ${moodOf(v).label}</span><span class="bar"><i class="m${v}" style="width:${dist[v - 1] / maxd * 100}%"></i></span><span class="bar-n">${dist[v - 1]}</span></div>`).join('')}</section>
      ${emo || fac ? `<section>${emo ? `<h3>Emoções mais frequentes</h3><div class="chips">${emo}</div>` : ''}${fac ? `<h3 style="margin-top:14px">O que mais influenciou</h3><div class="chips">${fac}</div>` : ''}</section>` : ''}
      <section class="callout"><h2>Padrões que percebi</h2>${ins.need ? `<p>Faltam ${ins.need} check-ins para eu conseguir mostrar padrões. Continue registrando!</p>`
        : ins.items.length ? `<ul class="insights">${ins.items.map(i => `<li>${i}</li>`).join('')}</ul><p class="disclaimer" style="margin-top:10px">São só padrões nos seus registros. Eles não provam que uma coisa causa a outra.</p>` : '<p>Ainda não vi padrões fortes. Continue registrando.</p>'}</section>
      <section><h2>Práticas de bem-estar</h2><p>${S().sessions.length} práticas no total, ${Math.round(minutesSince(start))} min nos últimos ${range} dias.</p></section>
      <section><h2>Levar para uma conversa</h2><p class="muted">Gera um resumo em texto dos últimos 30 dias (sem o conteúdo do diário) para mostrar a um(a) psicólogo(a), à orientação da escola ou à sua família, se você quiser. Só você decide com quem compartilhar.</p>
        <button class="btn soft" data-action="copy-summary">Copiar resumo</button></section>`;
    }
  };

  /* ================= CONFIGURAÇÕES ================= */
  const viewConfig = {
    title: 'Configurações',
    render() {
      const s = S().settings, enc = Store.isEncrypted();
      return `<h1>Configurações</h1>
      <section class="panel"><h2>Perfil e aparência</h2>
        <label class="lbl" for="s-name">Como podemos te chamar?</label><input id="s-name" class="input" maxlength="40" value="${esc(s.name)}" data-setting="name" autocomplete="nickname">
        <span class="lbl" id="th-l">Tema</span><div class="segmented" role="radiogroup" aria-labelledby="th-l">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([v, l]) => `<button role="radio" aria-checked="${s.theme === v}" class="${s.theme === v ? 'on' : ''}" data-action="theme" data-v="${v}">${l}</button>`).join('')}</div>
        <label class="switch" style="margin-top:12px"><input type="checkbox" data-setting="sound" ${s.sound ? 'checked' : ''}><span>Sons suaves nas práticas</span></label></section>
      <section class="panel"><h2>Lembrete diário</h2>
        <p class="muted">O lembrete aparece no horário escolhido se o app estiver aberto ou instalado no celular. Navegadores não permitem avisos com o app totalmente fechado.</p>
        <label class="switch"><input type="checkbox" id="s-rem" ${s.reminderOn ? 'checked' : ''}><span>Lembrar do check-in</span></label>
        <label class="lbl" for="s-time">Horário</label><input id="s-time" type="time" class="input short" value="${esc(s.reminderTime)}" data-setting="reminderTime"></section>
      <section class="panel"><h2>Privacidade</h2>
        <p>Seus registros ficam <strong>somente neste aparelho e neste navegador</strong>. O MindBalance não envia nada para servidores e não usa cookies de rastreamento.</p>
        ${Store.cryptoOK ? (enc ? '<p class="ok">🔒 Proteção por PIN ativada: os dados estão criptografados.</p><button class="btn soft" data-action="pin-off">Desativar PIN</button>'
          : '<p class="muted">Você pode proteger o app com um PIN ou senha. Ele impede que outras pessoas que usam este aparelho abram seus registros. Não substitui a senha do celular.</p><button class="btn soft" data-action="pin-on">Ativar PIN ou senha</button>')
          : '<p class="muted">A proteção por PIN só funciona quando o site é aberto por um endereço seguro (https).</p>'}</section>
      <section class="panel"><h2>Seus dados</h2>
        <p class="muted">Faça backup de vez em quando: se você limpar os dados do navegador ou trocar de aparelho, os registros somem. O arquivo de backup <strong>não é criptografado</strong>, guarde-o em local seguro.</p>
        <div class="row"><button class="btn soft" data-action="export">Baixar backup</button>
          <label class="btn soft" for="s-import" style="cursor:pointer">Restaurar backup</label><input type="file" id="s-import" accept="application/json,.json" class="sr"></div>
        <p style="margin-top:14px"><button class="btn danger" data-action="wipe">Apagar todos os meus dados</button></p></section>
      <section class="panel"><h2>Instalar no celular</h2>
        ${deferredInstall ? '<button class="btn primary" data-action="install">Instalar agora</button>' : ''}
        <p><strong>Android (Chrome):</strong> menu ⋮ e depois "Instalar app" ou "Adicionar à tela inicial".</p>
        <p><strong>iPhone (Safari):</strong> botão Compartilhar e depois "Adicionar à Tela de Início".</p>
        <p class="muted">Depois de instalado, o app abre em tela cheia e funciona sem internet.</p></section>
      <section class="panel"><h2>Ajuda e contatos</h2>${helpHTML()}</section>
      <section class="panel"><h2>Perguntas frequentes</h2>
        <details><summary><strong>O MindBalance substitui terapia?</strong></summary><p>Não. É uma ferramenta de autoconhecimento. Se você está sofrendo, converse com um adulto de confiança ou procure um profissional.</p></details>
        <details><summary><strong>Alguém consegue ver meus textos?</strong></summary><p>Não pela internet: nada sai do aparelho. Quem usar o mesmo aparelho e navegador pode abrir o app, a menos que você ative o PIN.</p></details>
        <details><summary><strong>Perdi meus dados. E agora?</strong></summary><p>Se você tem um arquivo de backup, use "Restaurar backup". Sem backup, não há como recuperar, pois não existe cópia em servidor.</p></details>
        <details><summary><strong>Por que a plantinha nunca murcha?</strong></summary><p>Porque cuidar de si não deve virar cobrança. Ela só cresce.</p></details></section>
      <section class="panel"><h2>Sobre</h2>
        <p>MindBalance versão ${esc(MB.VERSION)}. Projeto LUMINI 2026 da Escola Arte de Crescer, Araguatins (TO).</p>
        <p class="disclaimer">Este app não faz diagnóstico nem tratamento. As observações do painel são apenas padrões dos seus próprios registros.</p></section>`;
    }
  };

  /* ================= PLAYER (respiração e práticas) ================= */
  let actx = null;
  function chime(kind) {
    if (!S() || !S().settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = 'sine'; o.frequency.value = kind === 'done' ? 528 : 392;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + (kind === 'done' ? 1.6 : .7));
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 1.7);
    } catch (e) { /* som é opcional */ }
  }

  const Player = {
    active: false, timer: null, st: null, kind: '', def: null, mins: 3,
    open(kind, id) {
      const def = (kind === 'breath' ? BREATH : GUIDED).find(x => x.id === id); if (!def) return;
      closeModal(true); lastFocus = document.activeElement;
      this.kind = kind; this.def = def; this.active = true; document.body.classList.add('noscroll'); this.intro();
    },
    shell(inner) { $('#modal-root').innerHTML = `<div class="player" role="dialog" aria-modal="true" aria-label="${esc(this.def.name)}"><div class="player-body">${inner}</div></div>`; const b = $('#modal-root .btn.primary') || $('#modal-root button'); if (b) b.focus(); },
    intro() {
      const d = this.def, isB = this.kind === 'breath';
      const dur = isB ? `<p class="muted">Quanto tempo?</p><div class="segmented" role="group" aria-label="Duração">${[1, 3, 5].map(m => `<button data-action="p-dur" data-m="${m}" class="${m === this.mins ? 'on' : ''}" aria-pressed="${m === this.mins}">${m} min</button>`).join('')}</div>` : `<p class="muted">Duração: cerca de ${d.minutes} min</p>`;
      this.shell(`<div class="player-emoji" aria-hidden="true">${d.emoji}</div><h2>${esc(d.name)}</h2><p>${esc(d.desc)}</p>${d.note ? `<p class="muted">${esc(d.note)}</p>` : ''}${dur}
        <p class="row center" style="margin-top:22px"><button class="btn primary lg" data-action="p-start">Começar</button><button class="btn ghost lg" data-action="p-close">Fechar</button></p>`);
    },
    start() { this.kind === 'breath' ? this.runBreath() : this.runGuided(); },

    runBreath() {
      const cycle = this.def.phases.reduce((a, p) => a + p.s, 0), cycles = Math.max(1, Math.round(this.mins * 60 / cycle));
      this.st = { cycles, elapsed: 0, pi: 0, pt: 0, cn: 1, paused: false, last: performance.now() };
      this.shell(`<p class="player-top" id="p-cyc">Ciclo 1 de ${cycles}</p>
        <div class="breath-wrap"><div class="breath-circle" id="p-circle"></div><div class="breath-text"><span id="p-label" aria-live="polite"></span><b id="p-count"></b></div></div>
        <div class="row center"><button class="btn soft" data-action="p-pause" id="p-pausebtn">Pausar</button><button class="btn ghost" data-action="p-stop">Encerrar</button></div>`);
      this.enterPhase(); this.timer = setInterval(() => this.tickBreath(), 100);
    },
    enterPhase() {
      const st = this.st, p = this.def.phases[st.pi], c = $('#p-circle'); if (!c) return;
      $('#p-label').textContent = p.label; $('#p-count').textContent = Math.ceil(p.s);
      void c.offsetWidth;
      c.style.transitionDuration = (p.k === 'hold' ? 0 : p.s) + 's';
      if (p.k === 'in') { c.style.transform = 'scale(1)'; chime('in'); } else if (p.k === 'out') c.style.transform = 'scale(.55)';
    },
    tickBreath() {
      const st = this.st; if (!st) return;
      const now = performance.now(), dt = Math.min((now - st.last) / 1000, .5); st.last = now; if (st.paused) return;
      st.elapsed += dt; st.pt += dt;
      const p = this.def.phases[st.pi];
      if (st.pt >= p.s) {
        st.pt -= p.s; st.pi++;
        if (st.pi >= this.def.phases.length) {
          st.pi = 0; st.cn++;
          if (st.cn > st.cycles) return this.finish();
          const el = $('#p-cyc'); if (el) el.textContent = 'Ciclo ' + st.cn + ' de ' + st.cycles;
        }
        this.enterPhase(); return;
      }
      const cnt = $('#p-count'); if (cnt) cnt.textContent = Math.max(1, Math.ceil(p.s - st.pt));
    },

    runGuided() {
      this.st = { i: 0, t: 0, elapsed: 0, paused: false, last: performance.now() };
      this.drawGuided(); this.timer = setInterval(() => this.tickGuided(), 200);
    },
    drawGuided() {
      const st = this.st, steps = this.def.steps, step = steps[st.i], n = steps.length, manual = !step.s;
      this.shell(`<p class="player-top">Passo ${st.i + 1} de ${n}</p>
        <div class="progress" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(st.i / n * 100)}"><span id="p-bar" style="width:${st.i / n * 100}%"></span></div>
        <p class="step-text" aria-live="polite">${esc(step.text)}</p>${manual ? '' : `<p class="muted" id="p-count">${Math.ceil(step.s - st.t)} s</p>`}
        <div class="row center"><button class="btn primary" data-action="p-next">${st.i === n - 1 ? 'Concluir' : (manual ? 'Pronto, próximo' : 'Pular')}</button>
        <button class="btn soft" data-action="p-pause" id="p-pausebtn">${st.paused ? 'Continuar' : 'Pausar'}</button><button class="btn ghost" data-action="p-stop">Encerrar</button></div>`);
    },
    tickGuided() {
      const st = this.st; if (!st) return;
      const now = performance.now(), dt = Math.min((now - st.last) / 1000, .5); st.last = now; if (st.paused) return;
      st.elapsed += dt;
      const step = this.def.steps[st.i]; if (!step.s) return;
      st.t += dt;
      const cnt = $('#p-count'); if (cnt) cnt.textContent = Math.max(1, Math.ceil(step.s - st.t)) + ' s';
      const bar = $('#p-bar'); if (bar) bar.style.width = ((st.i + Math.min(1, st.t / step.s)) / this.def.steps.length * 100) + '%';
      if (st.t >= step.s) this.next();
    },
    next() { const st = this.st; if (!st) return; st.i++; st.t = 0; if (st.i >= this.def.steps.length) return this.finish(); this.drawGuided(); },

    pause() {
      const st = this.st; if (!st) return;
      st.paused = !st.paused; st.last = performance.now();
      const btn = $('#p-pausebtn'); if (btn) btn.textContent = st.paused ? 'Continuar' : 'Pausar';
      if (this.kind !== 'breath') return;
      const c = $('#p-circle'); if (!c) return;
      if (st.paused) { const m = getComputedStyle(c).transform; c.style.transitionDuration = '0s'; c.style.transform = m; }
      else { const p = this.def.phases[st.pi]; if (p.k !== 'hold') { c.style.transitionDuration = Math.max(.1, p.s - st.pt) + 's'; c.style.transform = p.k === 'in' ? 'scale(1)' : 'scale(.55)'; } }
    },
    finish() {
      clearInterval(this.timer); this.timer = null;
      const st = this.st, minutes = Math.max(.1, Math.round(st.elapsed / 60 * 10) / 10);
      S().sessions.push({ id: uid(), type: this.kind, pid: this.def.id, name: this.def.name, minutes, ts: Date.now() });
      Store.save(); chime('done'); this.st = null;
      this.shell(`<div class="done-ic" aria-hidden="true">🌿</div><h2>Prática concluída</h2><p>Você dedicou ${fmtMin(minutes)} ao seu bem-estar. Como você está se sentindo agora?</p>
        <p class="row center"><a class="btn primary" href="#/checkin" data-action="p-close">Fazer check-in</a><button class="btn ghost" data-action="p-close">Fechar</button></p>`);
    },
    close(silent) {
      if (!this.active) return;
      clearInterval(this.timer); this.timer = null; this.st = null; this.active = false;
      $('#modal-root').innerHTML = ''; document.body.classList.remove('noscroll');
      if (!silent) { if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignora */ } } if (current === 'respirar' || current === 'inicio' || current === 'painel') render(); }
    }
  };

  /* ================= ações (cliques) ================= */
  const actions = {
    'help': showHelp,
    'unlock': () => unlockNow(),
    'forgot-pin': () => openModal({
      title: 'Esqueceu o PIN?', html: '<p>Os dados estão criptografados e <strong>não existe recuperação</strong>: nem nós conseguimos abri-los. Se você tem um arquivo de backup, apague e restaure depois.</p>',
      actions: [{ label: 'Voltar', kind: 'ghost' }, { label: 'Apagar tudo e recomeçar', kind: 'danger', onClick: () => { Store.wipe(); location.reload(); } }]
    }),
    'quick-mood': el => { pendingMood = +el.dataset.mood; go('checkin'); },
    'set-day': el => { ciDay = el.dataset.day; render(); },
    'pick-mood': el => { form.mood = +el.dataset.v; $$('.mood-opt').forEach(b => { const on = +b.dataset.v === form.mood; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); },
    'pick-energy': el => { form.energy = +el.dataset.v; $$('.scale-opt').forEach(b => { const on = +b.dataset.v === form.energy; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); },
    'chip': el => { const set = form[el.dataset.group], v = el.dataset.value; set.has(v) ? set.delete(v) : set.add(v); el.setAttribute('aria-pressed', set.has(v)); },
    'save-checkin': () => {
      if (!form.mood) { toast('Escolha como você está se sentindo.'); return; }
      const note = $('#ci-note').value.trim();
      S().checkins[form.day] = { mood: form.mood, energy: form.energy, sleep: form.sleep, emotions: Array.from(form.emotions), factors: Array.from(form.factors), note, ts: Date.now() };
      Store.save();
      if (isRisk(note)) showRisk(() => go('inicio')); else { toast('Check-in salvo.'); go('inicio'); }
    },
    'diary-mood': el => { const v = +el.dataset.v; dMood = dMood === v ? 0 : v; $$('.mini').forEach(b => { const on = +b.dataset.v === dMood; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); }); },
    'prompt': el => { const ta = $('#d-text'), t = PROMPTS[+el.dataset.i].text; ta.value += (ta.value && !ta.value.endsWith('\n') ? '\n' : '') + t; ta.focus(); },
    'save-diary': () => {
      const title = $('#d-title').value.trim(), text = $('#d-text').value.trim();
      if (!text) { toast('Escreva algo antes de salvar.'); $('#d-text').focus(); return; }
      if (editingId) { const d = S().diary.find(x => x.id === editingId); if (d) { d.title = title; d.text = text; d.mood = dMood || null; d.updated = Date.now(); } }
      else S().diary.push({ id: uid(), title, text, mood: dMood || null, ts: Date.now(), updated: null });
      editingId = null; dMood = 0; Store.save(); render();
      if (isRisk(title + ' ' + text)) showRisk(); else toast('Entrada salva.');
    },
    'edit-entry': el => { const d = S().diary.find(x => x.id === el.dataset.id); if (!d) return; editingId = d.id; dMood = d.mood || 0; render(); window.scrollTo(0, 0); $('#d-text').focus(); },
    'cancel-edit': () => { editingId = null; dMood = 0; render(); },
    'del-entry': async el => { if (await confirmBox('Excluir esta entrada do diário? Não dá para desfazer.', 'Excluir', true)) { S().diary = S().diary.filter(x => x.id !== el.dataset.id); Store.save(); render(); toast('Entrada excluída.'); } },
    'toggle-entry': el => { const a = el.closest('.entry'); a.classList.toggle('open'); el.textContent = a.classList.contains('open') ? 'Mostrar menos' : 'Ler tudo'; },
    'range': el => { range = +el.dataset.d; render(); },
    'cal-prev': () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); render(); },
    'cal-next': () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); render(); },
    'copy-summary': async () => {
      const txt = summaryText(30);
      try { await navigator.clipboard.writeText(txt); toast('Resumo copiado.'); }
      catch (e) { openModal({ title: 'Resumo dos últimos 30 dias', html: `<textarea class="input" rows="12" readonly id="sum-ta">${esc(txt)}</textarea>`, actions: [{ label: 'Fechar', kind: 'primary' }] }); const ta = $('#sum-ta'); if (ta) ta.select(); }
    },
    'open-player': el => Player.open(el.dataset.kind, el.dataset.id),
    'p-dur': el => { Player.mins = +el.dataset.m; $$('[data-action="p-dur"]').forEach(b => { const on = +b.dataset.m === Player.mins; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); },
    'p-start': () => Player.start(),
    'p-pause': () => Player.pause(),
    'p-next': () => Player.next(),
    'p-stop': () => Player.close(),
    'p-close': () => Player.close(),
    'theme': el => { S().settings.theme = el.dataset.v; Store.save(); applyTheme(el.dataset.v); render(); },
    'pin-on': () => openModal({
      title: 'Ativar PIN ou senha',
      html: '<p>Crie um PIN ou senha (mínimo 4 caracteres). Seus dados passam a ser <strong>criptografados</strong> neste aparelho.</p><p class="warn">Se você esquecer, não há como recuperar os dados. Baixe um backup antes.</p>' +
        '<label class="lbl" for="pin1">PIN ou senha</label><input id="pin1" class="input" type="password" autocomplete="new-password"><label class="lbl" for="pin2">Repita</label><input id="pin2" class="input" type="password" autocomplete="new-password"><p id="pin-err" class="error" role="alert" hidden></p>',
      actions: [{ label: 'Cancelar', kind: 'ghost' }, {
        label: 'Ativar', kind: 'primary', onClick: async () => {
          const a = $('#pin1').value, b = $('#pin2').value;
          if (a.length < 4) return pinErr('Use pelo menos 4 caracteres.');
          if (a !== b) return pinErr('Os dois campos precisam ser iguais.');
          await Store.enablePin(a); toast('PIN ativado.'); render();
        }
      }]
    }),
    'pin-off': () => openModal({
      title: 'Desativar PIN', html: '<p>Digite seu PIN atual. Os dados voltarão a ser salvos sem criptografia neste aparelho.</p><label class="lbl" for="pin0">PIN ou senha atual</label><input id="pin0" class="input" type="password" autocomplete="current-password"><p id="pin-err" class="error" role="alert" hidden></p>',
      actions: [{ label: 'Cancelar', kind: 'ghost' }, {
        label: 'Desativar', kind: 'primary', onClick: async () => {
          if (!(await Store.verifyPin($('#pin0').value))) return pinErr('PIN incorreto.');
          await Store.disablePin(); toast('PIN desativado.'); render();
        }
      }]
    }),
    'export': () => {
      const data = JSON.stringify(Object.assign({ app: 'MindBalance', exportedAt: new Date().toISOString() }, S()), null, 2);
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' })), a = document.createElement('a');
      a.href = url; a.download = 'mindbalance-backup-' + dayKey() + '.json'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000); toast('Backup baixado. Guarde em um local seguro.');
    },
    'wipe': async () => { if (await confirmBox('Isso apaga todos os check-ins, textos do diário e práticas deste aparelho. Não dá para desfazer.', 'Apagar tudo', true)) { Store.wipe(); location.hash = ''; location.reload(); } },
    'install': async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (e) { /* ignora */ } deferredInstall = null; render(); }
  };
  function pinErr(msg) { const e = $('#pin-err'); e.textContent = msg; e.hidden = false; return false; }

  /* ================= eventos globais ================= */
  document.addEventListener('click', async e => {
    const mb = e.target.closest('[data-modal-act]');
    if (mb) { const a = modalActs[+mb.dataset.modalAct]; let r; if (a && a.onClick) r = await a.onClick(); if (r !== false) closeModal(); return; }
    if (e.target.classList && e.target.classList.contains('backdrop') && e.target.dataset.dismiss === '1') { closeModal(); return; }
    const el = e.target.closest('[data-action]'); if (!el) return;
    const fn = actions[el.dataset.action]; if (fn) fn(el, e);
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'd-search') { diaryQ = e.target.value; $('#d-list').innerHTML = diaryList(); }
  });
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset && t.dataset.bind) { form[t.dataset.bind] = +t.value; return; }
    if (t.dataset && t.dataset.setting) {
      const k = t.dataset.setting; S().settings[k] = t.type === 'checkbox' ? t.checked : t.value.trim(); Store.save();
      if (k === 'name') toast('Nome salvo.'); return;
    }
    if (t.id === 's-rem') {
      if (t.checked) {
        if (typeof Notification === 'undefined') { toast('Este navegador não oferece notificações.'); t.checked = false; return; }
        let p = Notification.permission; if (p !== 'granted') p = await Notification.requestPermission();
        if (p !== 'granted') { toast('Permissão negada. Ative as notificações nas configurações do navegador.'); t.checked = false; return; }
      }
      S().settings.reminderOn = t.checked; Store.save(); toast(t.checked ? 'Lembrete ativado.' : 'Lembrete desativado.'); return;
    }
    if (t.id === 's-import') {
      const f = t.files && t.files[0]; if (!f) return;
      try {
        const ns = Store.normalize(JSON.parse(await f.text())), nc = Object.keys(ns.checkins).length;
        if (!nc && !ns.diary.length && !ns.sessions.length) { toast('Não encontrei dados neste arquivo.'); t.value = ''; return; }
        if (await confirmBox(`Restaurar ${nc} check-ins, ${ns.diary.length} entradas de diário e ${ns.sessions.length} práticas? Isso substitui os dados atuais.`, 'Restaurar')) {
          ns.settings.onboarded = true; Store.state = ns; await Store.save(); applyTheme(ns.settings.theme); toast('Backup restaurado.'); render();
        }
      } catch (err) { toast('Arquivo inválido. Use um backup baixado pelo MindBalance.'); }
      t.value = '';
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'lock-input') { unlockNow(); return; }
    if (e.key === 'Escape') {
      const bd = $('#modal-root .backdrop');
      if (bd && bd.dataset.dismiss === '1') closeModal(); else if (Player.active) Player.close();
      return;
    }
    if (e.key === 'Tab') {
      const root = $('#modal-root .dialog') || $('#modal-root .player'); if (!root) return;
      const f = $$('a[href],button:not([disabled]),input,select,textarea', root); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
  window.addEventListener('hashchange', () => route());
  let resizeT; window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (current === 'painel' && S() && !Player.active && !$('#modal-root .dialog')) render(); }, 250); });

  /* ================= rotas ================= */
  const routes = { inicio: viewHome, checkin: viewCheckin, respirar: viewWellness, diario: viewDiary, painel: viewDash, config: viewConfig };
  function go(r) { if (location.hash === '#/' + r) route(); else location.hash = '#/' + r; }
  function render() { const v = routes[current]; $('#main').innerHTML = v.render(); if (v.mount) v.mount(); }
  function route() {
    if (Store.locked || !S()) return;
    const name = (location.hash.replace(/^#\/?/, '') || 'inicio').split('?')[0];
    const key = routes[name] ? name : 'inicio';
    Player.close(true);
    current = key; const v = routes[key];
    if (v.enter) v.enter();
    render();
    $$('.nav a').forEach(a => { if (a.dataset.route === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = v.title + ' | MindBalance';
    $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0);
  }

  /* ================= tema, bloqueio, lembrete, boot ================= */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t || 'auto';
    const dark = t === 'dark' || (t !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#0c1816' : '#f2f6f3');
  }
  function showLock() { $('#shell').hidden = true; $('#lock').hidden = false; setTimeout(() => $('#lock-input').focus(), 50); }
  async function unlockNow() {
    const input = $('#lock-input'), err = $('#lock-error'); if (!input.value) return;
    const btn = $('#lock [data-action="unlock"]'); btn.disabled = true; err.hidden = true;
    const ok = await Store.unlock(input.value); btn.disabled = false;
    if (!ok) { err.textContent = 'PIN ou senha incorretos.'; err.hidden = false; input.select(); return; }
    input.value = ''; $('#lock').hidden = true; $('#shell').hidden = false; start();
  }

  function checkReminder() {
    const s = S(); if (!s || !s.settings.reminderOn) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const now = new Date(); if (pad(now.getHours()) + ':' + pad(now.getMinutes()) < s.settings.reminderTime) return;
    const today = dayKey(); if (s.checkins[today] || LS.get('mb2:lr') === today) return;
    LS.set('mb2:lr', today);
    const body = 'Que tal um check-in rápido? Leva menos de 1 minuto.';
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification('MindBalance', { body, icon: 'icons/icon-192.png', tag: 'mb-checkin' }));
      else new Notification('MindBalance', { body });
    } catch (e) { /* notificação é opcional */ }
  }

  function onboarding() {
    openModal({
      title: 'Bem-vindo(a) ao MindBalance', dismiss: false,
      html: '<p>Um espaço para você perceber como está se sentindo, escrever, respirar e se cuidar.</p><ul class="plain">' +
        '<li><strong>Privado.</strong> Tudo fica salvo só neste aparelho. Nada é enviado para a internet.</li>' +
        '<li><strong>Com apoio.</strong> O app não substitui psicólogos(as) nem médicos(as). O botão "Preciso de ajuda" fica sempre no topo.</li>' +
        '<li><strong>Sem cobrança.</strong> Sua plantinha só cresce. Use no seu ritmo.</li></ul>' +
        '<label class="lbl" for="ob-name">Como podemos te chamar? <small class="muted">(opcional)</small></label><input id="ob-name" class="input" maxlength="40" autocomplete="nickname">',
      actions: [{ label: 'Começar', kind: 'primary', onClick: () => { S().settings.name = $('#ob-name').value.trim(); S().settings.onboarded = true; Store.save(); render(); } }]
    });
  }

  let started = false;
  function start() {
    applyTheme(S().settings.theme);
    route();
    if (!S().settings.onboarded) onboarding();
    if (!started) { started = true; setInterval(checkReminder, 30000); }
    checkReminder();
  }

  async function boot() {
    Store.onError = () => toast('Não foi possível salvar neste navegador. Baixe um backup em Configurações.');
    applyTheme('auto');
    const r = await Store.init();
    if (r === 'locked') showLock(); else start();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { /* funciona sem offline */ });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignora */ }
  }
  boot();

  /* expõe só o necessário para testes */
  window.MBApp = { go, route, render, summaryText, insights, streak, bestStreak, growthPoints, Player };
})();
