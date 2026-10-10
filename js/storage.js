/* MindBalance — armazenamento local.
   - Os dados ficam no localStorage deste navegador. Nada é enviado a servidores.
   - Opcional: PIN/senha. Com PIN, os dados são criptografados (AES-GCM, chave derivada por PBKDF2).
     O PIN protege contra olhares curiosos no mesmo aparelho; não substitui a senha do celular. */
(function () {
  'use strict';
  var KEY_PLAIN = 'mb2:data';
  var KEY_ENC = 'mb2:enc';
  var te = new TextEncoder();
  var td = new TextDecoder();

  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } }
  };

  function toB64(buf) {
    var a = new Uint8Array(buf), s = '', C = 0x8000;
    for (var i = 0; i < a.length; i += C) s += String.fromCharCode.apply(null, a.subarray(i, i + C));
    return btoa(s);
  }
  function fromB64(s) {
    var bin = atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  async function deriveKey(pin, salt) {
    var base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptJSON(key, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, te.encode(JSON.stringify(obj)));
    return { iv: toB64(iv), ct: toB64(ct) };
  }
  async function decryptJSON(key, p) {
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(p.iv) }, key, fromB64(p.ct));
    return JSON.parse(td.decode(pt));
  }

  /* ---------- validação / migração ---------- */
  function clampInt(v, a, b) { v = parseInt(v, 10); return (v >= a && v <= b) ? v : 0; }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
  function strArr(v) { return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }).map(function (x) { return x.slice(0, 40); }).slice(0, 30) : []; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  var EMOJI_MOOD = { '😢': 1, '😞': 2, '😕': 2, '😐': 3, '🙂': 4, '😄': 5 };

  function defaultState() {
    return {
      version: 2,
      checkins: {},
      diary: [],
      sessions: [],
      settings: { name: '', theme: 'auto', sound: false, reminderOn: false, reminderTime: '20:00', onboarded: false }
    };
  }

  function normalize(o) {
    var s = defaultState();
    if (!o || typeof o !== 'object') return s;

    if (o.checkins && typeof o.checkins === 'object') {
      Object.keys(o.checkins).forEach(function (k) {
        var v = o.checkins[k];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v) return;
        var mood = clampInt(v.mood, 1, 5);
        if (!mood) return;
        var sleep = parseFloat(v.sleep);
        s.checkins[k] = {
          mood: mood,
          energy: clampInt(v.energy, 1, 5) || 0,
          sleep: (sleep > 0 && sleep <= 24) ? sleep : 0,
          emotions: strArr(v.emotions),
          factors: strArr(v.factors),
          note: str(v.note, 2000),
          ts: +v.ts || Date.now()
        };
      });
    }
    if (Array.isArray(o.diary)) {
      o.diary.forEach(function (v) {
        if (!v || typeof v !== 'object' || !str(v.text, 1)) return;
        s.diary.push({
          id: /^[a-z0-9]{6,30}$/i.test(v.id || '') ? v.id : uid(),
          title: str(v.title, 120), text: str(v.text, 20000),
          mood: clampInt(v.mood, 1, 5) || null,
          ts: +v.ts || Date.now(), updated: +v.updated || null
        });
      });
    }
    if (Array.isArray(o.sessions)) {
      o.sessions.forEach(function (v) {
        if (!v || typeof v !== 'object') return;
        var m = parseFloat(v.minutes);
        s.sessions.push({
          id: /^[a-z0-9]{6,30}$/i.test(v.id || '') ? v.id : uid(),
          type: v.type === 'breath' ? 'breath' : 'guided',
          pid: str(v.pid, 30), name: str(v.name, 80) || 'Prática',
          minutes: (m > 0 && m < 240) ? m : 1, ts: +v.ts || Date.now()
        });
      });
    }
    if (o.settings && typeof o.settings === 'object') {
      var t = o.settings;
      if (['auto', 'light', 'dark'].indexOf(t.theme) >= 0) s.settings.theme = t.theme;
      s.settings.name = str(t.name, 40);
      s.settings.sound = !!t.sound;
      s.settings.reminderOn = !!t.reminderOn;
      if (/^\d{2}:\d{2}$/.test(t.reminderTime || '')) s.settings.reminderTime = t.reminderTime;
      s.settings.onboarded = !!t.onboarded;
    }

    /* Formato da versão 1 (moodEntries, diaryEntries, meditationSessions) */
    if (Array.isArray(o.moodEntries)) {
      o.moodEntries.forEach(function (e) {
        var d = new Date(e && e.timestamp), mood = clampInt(e && e.mood, 1, 5);
        if (isNaN(d) || !mood) return;
        var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        s.checkins[k] = {
          mood: mood, energy: 0, sleep: 0, emotions: [], factors: [],
          note: str([e.trigger, e.activities].filter(Boolean).join(' | '), 2000), ts: d.getTime()
        };
      });
    }
    if (Array.isArray(o.diaryEntries)) {
      o.diaryEntries.forEach(function (e) {
        if (!e || !str(e.content, 1)) return;
        s.diary.push({ id: uid(), title: str(e.title, 120), text: str(e.content, 20000), mood: EMOJI_MOOD[e.mood] || null, ts: Date.parse(e.timestamp) || Date.now(), updated: null });
      });
    }
    if (Array.isArray(o.meditationSessions)) {
      o.meditationSessions.forEach(function (e) {
        if (!e) return;
        s.sessions.push({ id: uid(), type: 'guided', pid: '', name: str(e.type, 40) || 'Meditação', minutes: parseFloat(e.duration) || 5, ts: Date.parse(e.timestamp) || Date.now() });
      });
    }
    return s;
  }

  /* ---------- Store ---------- */
  var queue = Promise.resolve();

  var Store = {
    state: null,
    key: null,
    salt: null,
    locked: false,
    cryptoOK: !!(window.crypto && crypto.subtle),
    onError: null,
    normalize: normalize,
    uid: uid,

    isEncrypted: function () { return !!LS.get(KEY_ENC); },

    async init() {
      if (this.isEncrypted()) { this.locked = true; return 'locked'; }
      var raw = LS.get(KEY_PLAIN), parsed = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
      this.state = normalize(parsed);
      return 'ready';
    },

    async unlock(pin) {
      try {
        var p = JSON.parse(LS.get(KEY_ENC));
        var salt = fromB64(p.salt);
        var key = await deriveKey(pin, salt);
        this.state = normalize(await decryptJSON(key, p));
        this.key = key; this.salt = salt; this.locked = false;
        return true;
      } catch (e) { return false; }
    },

    async verifyPin(pin) {
      try {
        var p = JSON.parse(LS.get(KEY_ENC));
        await decryptJSON(await deriveKey(pin, fromB64(p.salt)), p);
        return true;
      } catch (e) { return false; }
    },

    save: function () {
      var self = this;
      queue = queue.then(function () { return self._persist(); }).catch(function (e) { console.error(e); });
      return queue;
    },

    async _persist() {
      if (!this.state) return;
      var ok;
      if (this.key) {
        var payload = await encryptJSON(this.key, this.state);
        payload.v = 2; payload.salt = toB64(this.salt);
        ok = LS.set(KEY_ENC, JSON.stringify(payload));
      } else {
        ok = LS.set(KEY_PLAIN, JSON.stringify(this.state));
      }
      if (!ok && this.onError) this.onError();
    },

    async enablePin(pin) {
      this.salt = crypto.getRandomValues(new Uint8Array(16));
      this.key = await deriveKey(pin, this.salt);
      await this._persist();
      LS.del(KEY_PLAIN);
    },

    async disablePin() {
      this.key = null; this.salt = null;
      await this._persist();
      LS.del(KEY_ENC);
    },

    wipe: function () {
      LS.del(KEY_PLAIN); LS.del(KEY_ENC); LS.del('mb2:lr');
      this.state = null; this.key = null;
    }
  };

  window.MB = window.MB || {};
  window.MB.Store = Store;
  window.MB.LS = LS;
})();
