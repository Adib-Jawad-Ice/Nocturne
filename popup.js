// popup.js — Nocturne 3.0
'use strict';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const VOICE_OK = v => {
  const l = (v.lang || '').toLowerCase(), n = (v.name || '').toLowerCase();
  return (n.includes('multilingual') || /^en-(us|gb|ca)/.test(l)) &&
    !/ana|maisie|alfie|holly|molly|ada|archie|theo|jasper|zira|david|mark|george|susan|linda|richard|hedda|james|guy|hazel/.test(n) &&
    /steffan|davis|eric|tony|brian|ryan|elliot|andrew|jacob|jason|marcus|matthew|liam|michelle|emma|sara|elizabeth|sonia|abbi|ava|claire|diana|emily|grace|isabella|julia|leah|natalie|olivia|rachel/.test(n);
};
const voiceShort = v => (v?.name || '').replace(/Microsoft\s+/i, '').replace(/\([^)]*\)/g, '')
  .replace(/\s*(Online|Natural|Neural|Standard)\s*/gi, ' ').trim().split(/\s+/)[0];

const RM_DEF = {
  theme:'gemini', accent:'electra', font:'comicsans', fontSize:18, lineHeight:1.75,
  letterSpacing:.01, wordSpacing:.05, paraSpacing:1.2, width:55, bionic:false,
  barPos:'bottom', textAlign:'left', scanSkim:false, superSkim:false,
  scanFirstColor:'#fbbf24', scanLastColor:'#fb7185', nounHighlight:false,
  nounColor:'#a3e635', overlayBg:'', progColor:'#29273a',
  forceFontColor:false, forceFontColorVal:'#d4d0e8', textureDensity:0,
};
const HL_DEF = { wordColor:'#2dd4bf', paraColor:'#2dd4bf', paraOpacity:0.10 };
const HK_DEF = {
  toggleReader: {ctrl:true,  alt:false, shift:false, key:'s'},
  playStop:     {ctrl:false, alt:false, shift:false, key:' '},
  prevPara:     {ctrl:false, alt:false, shift:false, key:'arrowup'},
  nextPara:     {ctrl:false, alt:false, shift:false, key:'arrowdown'},
  prevChapter:  {ctrl:false, alt:false, shift:false, key:'arrowleft'},
  nextChapter:  {ctrl:false, alt:false, shift:false, key:'arrowright'},
  scrollTop:    {ctrl:false, alt:false, shift:false, key:'home'},
  scrollBottom: {ctrl:false, alt:false, shift:false, key:'end'},
  escape:       {ctrl:false, alt:false, shift:false, key:'escape'},
};
const HK_LABELS = {
  toggleReader:'Reader',   playStop:'Play/Stop',
  prevPara:'← Para',       nextPara:'Para →',
  prevChapter:'← Chapter', nextChapter:'Chapter →',
  scrollTop:'Top',         scrollBottom:'Bottom',
  escape:'Esc/Stop',
};

// ── STATE ─────────────────────────────────────────────────────────────────────
const P = {
  RS: {...RM_DEF}, HL: {...HL_DEF}, TTS: {rate:1},
  REP: { enabled:true, lists:[{id:'list-default',name:'List of life',enabled:true,color:'#60a5fa',pairs:[]}], defaults:{matchCase:false,wholeWord:true,preserveCase:true} },
  hotkeys: {...HK_DEF},
  voiceJigsaw:[['brian multilingual'],['ava multilingual'],['andrew multilingual'],['emma multilingual'],['sonia']],
  allVoices:[], genderFilter:'m',
  siteRules:{},
  autoNextChapter:false, guard:false, forceTTS:false, autoAiNextPage:false,
  ttsState:'idle', curVoiceName:'—',
  rendered:new Set(), voicesReady:false, dragSrcCol:-1, recordingKey:null, saveTimer:null,
};

// ── UTILS ─────────────────────────────────────────────────────────────────────
const $    = id => document.getElementById(id);
const $$   = s  => document.querySelectorAll(s);
const esc  = s  => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const mkId = () => 'list-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

function toast(msg, isOk = true) {
  const c = $('toast-container'); if (!c) return;
  const t = document.createElement('div');
  t.style.cssText = `background:${isOk ? 'rgba(74,222,128,.15)' : 'rgba(251,113,133,.15)'};border:1px solid ${isOk ? 'rgba(74,222,128,.3)' : 'rgba(251,113,133,.3)'};border-radius:6px;padding:6px 12px;font-size:11px;color:${isOk ? '#4ade80' : '#fb7185'};margin-top:4px`;
  t.textContent = msg; c.appendChild(t); setTimeout(() => t.remove(), 2500);
}

// ── TAB COMMS ─────────────────────────────────────────────────────────────────
const _injected = new Set();
let _tab = null;

async function _ensureInjected(tabId) {
  if (_injected.has(tabId)) return;
  try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch {}
  try { await chrome.scripting.insertCSS({ target: { tabId }, files: ['reader.css'] }); } catch {}
  _injected.add(tabId);
}

async function primeTab() {
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!t?.id) return;
    _tab = t;
    const host = t.url ? new URL(t.url).hostname.replace(/^www\./, '') : '';
    const { AR_banSites = [] } = await chrome.storage.local.get('AR_banSites');
    if (!AR_banSites.some(s => host === s || host.endsWith('.' + s))) await _ensureInjected(t.id);
  } catch {}
}

async function fireMsg(msg) {
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    const id = t?.id ?? _tab?.id;
    if (id) chrome.tabs.sendMessage(id, msg).catch(() => {});
  } catch {}
}

async function send(msg) {
  if (!_tab) { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); if (t) _tab = t; }
  if (!_tab?.id) return null;
  await _ensureInjected(_tab.id);
  try { return await chrome.tabs.sendMessage(_tab.id, msg); } catch { return null; }
}

// ── SAVE ──────────────────────────────────────────────────────────────────────
function save() {
  clearTimeout(P.saveTimer);
  P.saveTimer = setTimeout(() => {
    chrome.storage.local.set({ AR_rm: P.RS, AR_hl: P.HL, AR_prefs: { rate: P.TTS.rate }, AR_jigsaw: P.voiceJigsaw });
    try { localStorage.setItem('nr_theme', P.RS.theme || 'dark'); localStorage.setItem('nr_accent', P.RS.accent || 'electra'); } catch {}
  }, 400);
}

let _saveJTimer = null;
const saveJ = () => {
  clearTimeout(_saveJTimer);
  _saveJTimer = setTimeout(() => { chrome.storage.local.set({ AR_jigsaw: P.voiceJigsaw }); send({ type: 'RTTS_JIGSAW', jigsaw: P.voiceJigsaw }); }, 150);
};

const saveRep = () => {
  P.REP.enabled = true; chrome.storage.local.set({ AR_replace: P.REP });
  const pairs = getAllPairs(); if (pairs.length) send({ action: 'NR_REPLACE_APPLY', payload: { pairs, overlayOnly: true } });
};

// ── THEME & SLIDERS ───────────────────────────────────────────────────────────
function applyTheme() {
  document.documentElement.dataset.theme  = P.RS.theme  || 'dark';
  document.documentElement.dataset.accent = P.RS.accent || 'teal';
  try { localStorage.setItem('nr_theme', P.RS.theme || 'dark'); localStorage.setItem('nr_accent', P.RS.accent || 'electra'); } catch {}
}

function setFSL(id, val, min, max, fmt) {
  const el = $(id); if (!el) return;
  const fill = el.querySelector('.fsl-fill'), lbl = el.querySelector('.fsl-lbl'), inp = el.querySelector('input');
  if (fill) fill.style.width = Math.max(0, Math.min(100, (val - min) / (max - min) * 100)) + '%';
  if (lbl)  lbl.textContent = fmt(val);
  if (inp)  inp.value = val;
}

function setSpdBar(r) {
  const pct = Math.max(0, Math.min(100, (r - .5) / (3 - .5) * 100));
  const f = $('spd-fill'), v = $('spd-val'), i = $('spd-r');
  if (f) f.style.width = pct + '%'; if (v) v.textContent = parseFloat(r).toFixed(2).replace(/\.?0+$/, '') + '×'; if (i) i.value = r;
}

const updateMeta = name => { if (name !== undefined) P.curVoiceName = name || '—'; const m = $('meta-voice'); if (m) m.textContent = P.curVoiceName; };

const INPUT_MAP = {
  's-size':  [10,  32,  'fs-size',  v => 'Font Size ' + v + 'px',                        v => pushRM({ fontSize: v }),       () => P.RS.fontSize],
  's-lh':    [1.1, 2.5, 'fs-lh',   v => 'Line Height ' + (+v).toFixed(2),               v => pushRM({ lineHeight: v }),     () => P.RS.lineHeight],
  's-para':  [.5,  3,   'fs-para',  v => 'Para Gap ' + (+v).toFixed(1) + 'em',           v => pushRM({ paraSpacing: v }),    () => P.RS.paraSpacing],
  's-ls':    [0,   .12, 'fs-ls',   v => 'Letter Spacing ' + (+v).toFixed(3) + 'em',     v => pushRM({ letterSpacing: v }),  () => P.RS.letterSpacing],
  's-ws':    [0,   .25, 'fs-ws',   v => 'Word Spacing ' + (+v).toFixed(2) + 'em',       v => pushRM({ wordSpacing: v }),    () => P.RS.wordSpacing],
  's-width': [25,  95,  'fs-width', v => 'Column Width ' + v + '%',                       v => pushRM({ width: v }),          () => P.RS.width],
  's-pop':   [.05, .6,  'fs-pop',  v => 'Para Opacity ' + Math.round(v * 100) + '%',    v => pushHL({ paraOpacity: v }),    () => P.HL.paraOpacity],
};

// ── PUSH HELPERS ──────────────────────────────────────────────────────────────
const pushRM = patch => { Object.assign(P.RS, patch); for (const [k, v] of Object.entries(patch)) _updateRMControl(k, v); save(); send({ type: 'AR_SETTINGS', settings: { ...P.RS } }); };
const pushHL = patch => {
  Object.assign(P.HL, patch);
  if ('wordColor'   in patch) { const e = $('hl-wc'); if (e) e.value = patch.wordColor; }
  if ('paraColor'   in patch) { const e = $('hl-pc'); if (e) e.value = patch.paraColor; }
  if ('paraOpacity' in patch) { const [min, max, fsId, fmt] = INPUT_MAP['s-pop']; setFSL(fsId, patch.paraOpacity, min, max, fmt); }
  save(); send({ type: 'AR_HL', hl: { ...P.HL } });
};

function _updateRMControl(key, val) {
  const sliderMap = { fontSize:'s-size', lineHeight:'s-lh', paraSpacing:'s-para', letterSpacing:'s-ls', wordSpacing:'s-ws', width:'s-width' };
  if (sliderMap[key]) { const [min, max, fsId, fmt] = INPUT_MAP[sliderMap[key]]; setFSL(fsId, val, min, max, fmt); return; }
  if (key === 'font')      { const e = $('sel-font');  if (e) e.value = val; return; }
  if (key === 'theme')     { applyTheme(); const e = $('sel-theme'); if (e) e.value = val; return; }
  if (key === 'accent')    { applyTheme(); $$('.sw').forEach(s => s.classList.toggle('on', s.dataset.acc === val)); return; }
  if (key === 'textAlign') { $$('#align-chips .chip').forEach(c => c.classList.toggle('on', c.dataset.align === val)); return; }
  const toggleMap = {
    bionic: ['tog-bionic', 'tile-bionic-btn'], scanSkim: ['tog-scan'], superSkim: ['tog-super'],
    nounHighlight: ['tog-noun', 'tile-noun-btn'], forceFontColor: ['ffc-btn'],
  };
  if (toggleMap[key]) {
    toggleMap[key].forEach(id => { const e = $(id); if (!e) return; e.tagName === 'INPUT' ? e.checked = !!val : e.classList.toggle('on', !!val); });
    if (key === 'scanSkim')      { const ss = $('super-scan-row'), ts = $('tog-super'); if (ss) ss.style.opacity = val ? '1' : '0.4'; if (ts) ts.disabled = !val; }
    if (key === 'forceFontColor') { const fc = $('ffc-color'); if (fc) fc.style.display = val ? 'block' : 'none'; }
    return;
  }
  const colorMap = { scanFirstColor:'scan-fc', scanLastColor:'scan-lc', progColor:'prog-color', nounColor:'noun-color', forceFontColorVal:'ffc-color' };
  if (colorMap[key]) { const e = $(colorMap[key]); if (e) e.value = val; }
}

// ── RENDER ────────────────────────────────────────────────────────────────────
function renderTTS() {
  const playing = P.ttsState === 'playing';
  const ic = $('ab-play-ic');
  if (ic) ic.innerHTML = playing ? '<rect x="6" y="6" width="12" height="12" rx="1"/>' : '<path d="M8 5v14l11-7z"/>';
  const btn = $('btn-play');
  if (btn) {
    btn.style.borderColor = playing ? 'rgba(74,222,128,.5)' : 'rgba(96,165,250,.45)';
    btn.style.color = playing ? '#4ade80' : 'var(--ac)';
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.setAttribute('aria-label', playing ? 'Stop' : 'Play');
  }
  updateMeta();
}

function renderAll() {
  applyTheme();
  Object.entries(INPUT_MAP).forEach(([, [min, max, fsId, fmt, , get]]) => setFSL(fsId, get(), min, max, fmt));
  setSpdBar(P.TTS.rate);
  const sf = $('sel-font'), st = $('sel-theme');
  if (sf) sf.value = P.RS.font; if (st) st.value = P.RS.theme;
  $$('#align-chips .chip').forEach(c => c.classList.toggle('on', c.dataset.align === P.RS.textAlign));
  $$('.sw').forEach(s => s.classList.toggle('on', s.dataset.acc === P.RS.accent));
  const hlwc = $('hl-wc'), hlpc = $('hl-pc');
  if (hlwc) hlwc.value = P.HL.wordColor; if (hlpc) hlpc.value = P.HL.paraColor;
  [
    ['tog-scan',P.RS.scanSkim], ['tog-super',P.RS.superSkim], ['tog-bionic',P.RS.bionic],
    ['tile-bionic-btn',P.RS.bionic], ['tog-noun',P.RS.nounHighlight], ['tile-noun-btn',P.RS.nounHighlight],
    ['tog-autonext',P.autoNextChapter], ['tog-guard',P.guard], ['tog-forcetts',P.forceTTS],
    ['ffc-btn',P.RS.forceFontColor], ['tog-auto-ai-next',P.autoAiNextPage],
  ].forEach(([id, val]) => { const el = $(id); if (!el) return; el.tagName === 'INPUT' ? el.checked = !!val : el.classList.toggle('on', !!val); });
  const ss = $('super-scan-row'), ts = $('tog-super');
  if (ss) ss.style.opacity = P.RS.scanSkim ? '1' : '0.4';
  if (ts) ts.disabled = !P.RS.scanSkim;
  [
    ['scan-fc', P.RS.scanFirstColor || '#fbbf24'], ['scan-lc', P.RS.scanLastColor || '#fb7185'],
    ['prog-color', P.RS.progColor || '#29273a'],   ['noun-color', P.RS.nounColor || '#a78bfa'],
    ['ffc-color', P.RS.forceFontColorVal || '#d4d0e8'],
  ].forEach(([id, val]) => { const el = $(id); if (el) el.value = val; });
  const fc = $('ffc-color'); if (fc) fc.style.display = P.RS.forceFontColor ? 'block' : 'none';
  const txs = $('textureSlider');
  if (txs) { txs.value = P.RS.textureDensity || 0; const tf = $('texture-fill'), tv = $('texture-val'); if (tf) tf.style.width = (P.RS.textureDensity || 0) + '%'; if (tv) tv.textContent = P.RS.textureDensity || 0; }
  renderDefaults();
}

// ── VOICES & JIGSAW ───────────────────────────────────────────────────────────
const avail    = () => P.allVoices.filter(VOICE_OK).map(v => ({ v, name: v.name, key: voiceShort(v).toLowerCase(), short: voiceShort(v), gender: /steffan|davis|eric|tony|brian|ryan|elliot|andrew|jacob|jason|marcus|matthew|liam/i.test(v.name) ? 'm' : 'f' }));
const flatPool = () => [...new Set(P.voiceJigsaw.flat())];

function renderVoices() {
  const wrap = $('vlist'); if (!wrap) return;
  if (!P.allVoices.length) { wrap.innerHTML = '<div style="padding:8px;color:var(--tx2);font-size:11px;text-align:center">Open a page — voices load from browser</div>'; return; }
  const av = avail().filter(v => v.gender === P.genderFilter), pool = flatPool();
  const frag = document.createDocumentFragment();
  av.forEach(({ v, key, short }) => {
    const inPool = pool.includes(key);
    const card = document.createElement('div');
    card.className = 'vcard' + (inPool ? ' vcard-in' : ''); card.dataset.key = key; card.draggable = true; card.title = v.name;
    card.innerHTML = `<span class="vcard-name">${esc(short)}</span><span class="vcard-lang">${(v.lang || '').split('-')[0].toUpperCase()}</span>`;
    card.addEventListener('click', () => {
      if (inPool) { P.voiceJigsaw = P.voiceJigsaw.map(c => c.filter(k => k !== key)).filter(c => c.length); if (!P.voiceJigsaw.length) P.voiceJigsaw = [[]]; }
      else { if (!P.voiceJigsaw.length) P.voiceJigsaw = [[]]; P.voiceJigsaw[0] = [...new Set([...P.voiceJigsaw[0], key])]; }
      saveJ(); renderVoices(); renderJigsaw();
    });
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', key); e.dataTransfer.effectAllowed = 'all'; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    frag.appendChild(card);
  });
  wrap.innerHTML = ''; wrap.appendChild(frag);
  const gm = $('g-m'), gf = $('g-f');
  if (gm) gm.classList.toggle('on', P.genderFilter === 'm');
  if (gf) gf.classList.toggle('on', P.genderFilter === 'f');
}

function makeDZ(el, onDrop, onOver, onLeave) {
  el.addEventListener('dragover',  e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; onOver?.(); });
  el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) onLeave?.(); });
  el.addEventListener('drop',      e => { e.preventDefault(); onLeave?.(); onDrop(e); });
}

function renderJigsaw() {
  const area = $('jig-area'); if (!area) return;
  const frag = document.createDocumentFragment();
  P.voiceJigsaw.forEach((col, ci) => {
    const colEl = document.createElement('div'); colEl.className = 'jig-col'; colEl.dataset.col = ci;
    colEl.addEventListener('click', () => {
      if (area.classList.contains('delete-mode-active')) {
        P.voiceJigsaw.splice(ci, 1); if (!P.voiceJigsaw.length) P.voiceJigsaw = [[]];
        saveJ(); renderJigsaw(); renderVoices();
      }
    });
    makeDZ(colEl, e => {
      const key = e.dataTransfer.getData('text/plain'); if (!key) return;
      const src = parseInt(e.dataTransfer.getData('src-col'));
      if (!isNaN(src) && src !== ci) P.voiceJigsaw[src] = P.voiceJigsaw[src].filter(k => k !== key);
      P.voiceJigsaw[ci] = [...new Set([...P.voiceJigsaw[ci], key])];
      saveJ(); renderJigsaw(); renderVoices();
    }, () => colEl.classList.add('drag-over'), () => colEl.classList.remove('drag-over'));
    col.forEach(key => {
      const chip = document.createElement('div'); chip.className = 'jig-chip'; chip.dataset.key = key; chip.dataset.col = ci; chip.draggable = true;
      chip.innerHTML = `<span>${esc(key)}</span>`;
      chip.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', key); e.dataTransfer.setData('src-col', String(ci)); e.dataTransfer.effectAllowed = 'all'; P.dragSrcCol = ci; });
      colEl.appendChild(chip);
    });
    frag.appendChild(colEl);
  });
  const ghost = document.createElement('div'); ghost.className = 'jig-col jig-col-ghost'; ghost.title = 'Drop a voice here to add a new parallel slot'; ghost.innerHTML = '<span class="jig-ghost-lbl">＋</span>';
  makeDZ(ghost, e => {
    const key = e.dataTransfer.getData('text/plain'); if (!key) return;
    const src = parseInt(e.dataTransfer.getData('src-col'));
    if (!isNaN(src) && P.voiceJigsaw[src]) { P.voiceJigsaw[src] = P.voiceJigsaw[src].filter(k => k !== key); if (!P.voiceJigsaw[src].length) P.voiceJigsaw.splice(src, 1); }
    P.voiceJigsaw.push([key]); saveJ(); renderJigsaw(); renderVoices();
  }, () => ghost.classList.add('drag-over'), () => ghost.classList.remove('drag-over'));
  frag.appendChild(ghost);
  area.innerHTML = ''; area.appendChild(frag);
}

function wirePreviewZone() {
  const zone = $('vpreview-zone'); if (!zone) return;
  makeDZ(zone, e => {
    zone.style.borderColor = '';
    const key = e.dataTransfer.getData('text/plain'); if (!key) return;
    const v = P.allVoices.find(v => v.name.toLowerCase().includes(key)); if (!v) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('Hello, I am ' + voiceShort(v) + '. This is a preview.'); u.voice = v; u.rate = P.TTS.rate;
    speechSynthesis.speak(u);
    zone.textContent = '🎧 ' + voiceShort(v); setTimeout(() => { zone.innerHTML = '🎧 Drop'; }, 4000);
  }, () => zone.style.borderColor = 'var(--ac)', () => zone.style.borderColor = '');
}

// ── REPLACE ───────────────────────────────────────────────────────────────────
const getAllPairs = () => (P.REP.lists || []).flatMap(l => l.enabled !== false ? (l.pairs || []).filter(p => p?.find) : []);

function renderDefaults() {
  const mc = $('def-mc'), ww = $('def-ww'), pc = $('def-pc');
  if (mc) mc.checked = !!P.REP.defaults?.matchCase;
  if (ww) ww.checked = !!P.REP.defaults?.wholeWord;
  if (pc) pc.checked = !!P.REP.defaults?.preserveCase;
}

function mkPairRow(pair, list, onDelete) {
  const row = document.createElement('div'); row.className = 'rp-row';
  const cb  = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'rp-cb'; cb.title = 'Select';
  const fi  = document.createElement('span'); fi.className = 'rp-word'; fi.style.color = list.color || '#60a5fa'; fi.textContent = pair.find; fi.contentEditable = 'true'; fi.spellcheck = false;
  fi.addEventListener('blur', () => { pair.find = fi.textContent.trim(); saveRep(); });
  const arr = document.createElement('span'); arr.textContent = '→'; arr.style.cssText = 'color:var(--tx3);font-size:10px;flex-shrink:0';
  const ri  = document.createElement('span'); ri.className = 'rp-rep'; ri.textContent = pair.replace || ''; ri.contentEditable = 'true'; ri.spellcheck = false;
  ri.addEventListener('blur', () => { pair.replace = ri.textContent; saveRep(); });
  const del = document.createElement('button'); del.className = 'rl-del'; del.textContent = '×'; del.title = 'Delete pair'; del.addEventListener('click', onDelete);
  row.append(cb, fi, arr, ri, del); return row;
}

function renderListDropdown() {
  const sel = $('rp-list-sel'); if (!sel) return;
  const cur = sel.value; sel.innerHTML = '';
  (P.REP.lists || []).forEach(l => { const o = document.createElement('option'); o.value = l.id; o.textContent = l.name; sel.appendChild(o); });
  if (cur && sel.querySelector('option[value="' + cur + '"]')) sel.value = cur;
  else if (P.REP.lists?.length) sel.value = P.REP.lists[0].id;
}

function renderReplaceWords() {
  const con = $('rp-plist'); if (!con) return;
  const lists = P.REP.lists || [], sel = $('rp-list-sel');
  if (!lists.length) { con.innerHTML = '<div style="padding:14px;text-align:center;font-size:12px;color:var(--tx3)">No lists yet</div>'; return; }
  const curId = sel?.value || lists[0]?.id, list = lists.find(l => l.id === curId) || lists[0];
  if (!list) { con.innerHTML = ''; return; }
  const cnt = $('rp-list-count'); if (cnt) cnt.textContent = list.pairs?.length || 0;
  if (!(list.pairs || []).length) { con.innerHTML = '<div style="padding:14px;text-align:center;font-size:12px;color:var(--tx3)">No words in this list yet</div>'; return; }
  const frag = document.createDocumentFragment();
  list.pairs.forEach((pair, pi) => frag.appendChild(mkPairRow(pair, list, () => { list.pairs.splice(pi, 1); saveRep(); renderReplaceWords(); })));
  con.innerHTML = ''; con.appendChild(frag);
}

function mkListCard(list, li) {
  const el = document.createElement('div'); el.className = 'rl-card' + (list.enabled ? ' rl-enabled' : ''); el.style.cursor = 'pointer';
  const hd = document.createElement('div'); hd.className = 'rl-card-hd';
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'rl-check'; cb.checked = !!list.enabled;
  cb.addEventListener('change', e => { e.stopPropagation(); list.enabled = cb.checked; el.classList.toggle('rl-enabled', list.enabled); saveRep(); });
  const nameLbl = document.createElement('span'); nameLbl.className = 'rl-name'; nameLbl.textContent = list.name; nameLbl.style.color = list.color || '#60a5fa';
  const cnt = document.createElement('span'); cnt.className = 'rl-count'; cnt.textContent = (list.pairs || []).length + ' pairs';
  const col = document.createElement('input'); col.type = 'color'; col.className = 'rl-color'; col.value = list.color || '#60a5fa';
  col.addEventListener('input', e => { e.stopPropagation(); list.color = col.value; nameLbl.style.color = col.value; saveRep(); renderReplaceWords(); });
  col.addEventListener('click', e => e.stopPropagation());
  const arr = document.createElement('span'); arr.textContent = '▸'; arr.style.cssText = 'font-size:10px;color:var(--tx3);flex-shrink:0;transition:transform .15s';
  const del = document.createElement('button'); del.className = 'rl-del'; del.textContent = '🗑';
  del.addEventListener('click', e => { e.stopPropagation(); P.REP.lists.splice(li, 1); if (!P.REP.lists.length) P.REP.lists = [{ id: mkId(), name: 'List of life', enabled: true, color: '#60a5fa', pairs: [] }]; saveRep(); renderReplaceLists(); renderReplaceWords(); });
  hd.append(cb, nameLbl, cnt, col, arr, del); el.appendChild(hd);
  const body = document.createElement('div'); body.style.cssText = 'display:none;flex-direction:column;gap:2px;margin-top:5px;padding-top:5px;border-top:1px solid var(--bd)';
  let built = false;
  el.addEventListener('click', e => {
    if (['INPUT','BUTTON'].includes(e.target.tagName)) return;
    const open = body.style.display !== 'none';
    if (!open && !built) {
      built = true;
      if (!(list.pairs || []).length) { const em = document.createElement('div'); em.style.cssText = 'font-size:10px;color:var(--tx3);text-align:center;padding:4px'; em.textContent = 'No pairs in this list'; body.appendChild(em); }
      else list.pairs.forEach((pair, pi) => body.appendChild(mkPairRow(pair, list, () => { list.pairs.splice(pi, 1); saveRep(); renderReplaceLists(); renderReplaceWords(); })));
    }
    if (!open) { const sel = $('rp-list-sel'); if (sel && sel.value !== list.id) { sel.value = list.id; renderReplaceWords(); } }
    body.style.display = open ? 'none' : 'flex'; arr.style.transform = open ? '' : 'rotate(90deg)'; arr.textContent = open ? '▸' : '▾';
  });
  el.appendChild(body); return el;
}

function renderReplaceLists() {
  const wrap = $('rl-list'); if (!wrap) return;
  const frag = document.createDocumentFragment();
  (P.REP.lists || []).forEach((list, li) => frag.appendChild(mkListCard(list, li)));
  wrap.innerHTML = ''; wrap.appendChild(frag);
  renderListDropdown();
}

// ── HOTKEYS ───────────────────────────────────────────────────────────────────
const fmtHK = hk => {
  if (!hk?.key) return '—';
  const raw = hk.key.replace(/^arrow/i, '');
  const k = hk.key === ' ' ? 'Space' : hk.key === 'escape' ? 'Esc' : raw.charAt(0).toUpperCase() + raw.slice(1);
  const m = []; if (hk.ctrl) m.push('Ctrl'); if (hk.alt) m.push('Alt'); if (hk.shift) m.push('Shift');
  return m.length ? m.join('+') + '+' + k : k;
};

function renderHKTable() {
  const t = $('hotkey-table'); if (!t) return;
  const frag = document.createDocumentFragment();
  Object.keys(HK_LABELS).forEach(name => {
    const hk = P.hotkeys[name] || HK_DEF[name];
    const kEl = document.createElement('kbd'); kEl.textContent = fmtHK(hk); kEl.dataset.hk = name; kEl.title = 'Click to rebind';
    if (JSON.stringify(P.hotkeys[name]) !== JSON.stringify(HK_DEF[name])) kEl.classList.add('bound');
    if (P.recordingKey === name) kEl.classList.add('recording');
    kEl.addEventListener('click', () => { P.recordingKey = P.recordingKey === name ? null : name; renderHKTable(); });
    const lbl = document.createElement('span'); lbl.className = 'k-desc'; lbl.textContent = HK_LABELS[name];
    frag.appendChild(kEl); frag.appendChild(lbl);
  });
  t.innerHTML = ''; t.appendChild(frag);
}

// ── SITE RULES ────────────────────────────────────────────────────────────────
const RULE_FLAGS = ['banned','oust','immersive','ai','turbo'];
const RULE_META = {
  banned:    { tooltip:'Ban — block all extension features on this site', svg:`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>` },
  immersive: { tooltip:'Immersive — auto-open reader overlay on page load', svg:`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>` },
  ai:        { tooltip:'AI — auto-enable AI rewrite overlay on page load', svg:`<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l1.8 5.4L19.2 9l-5.4 1.8L12 16.2l-1.8-5.4L4.8 9l5.4-1.8zm5 11.5.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>` },
  oust:      { tooltip:'Always active — Oust and hotkeys always active (recommended)', svg:`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m7 12 3.5 3.5L17 9"/></svg>` },
  turbo:     { tooltip:'Turbo — block images/styles for fastest possible load', svg:`<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M13 2 4.09 12.96A1 1 0 0 0 5 14.5h5.5l-1 7.5 9.5-11.5H13.5L14.8 2.4A.5.5 0 0 0 13 2z"/></svg>` },
};

const saveSiteRules = () => chrome.storage.local.set({ siteRules: P.siteRules });
const applyRuleDeps = rule => { if (rule.banned) rule.immersive = rule.ai = rule.turbo = false; };

function renderSiteRules() {
  const wrap = $('site-rules-list'); if (!wrap) return;
  const entries = Object.entries(P.siteRules);
  if (!entries.length) { wrap.innerHTML = '<div style="padding:8px 4px;font-size:10px;color:var(--tx3);text-align:center">No sites added</div>'; return; }
  const frag = document.createDocumentFragment();
  entries.forEach(([domain, rule]) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:3px;padding:3px 0;border-bottom:1px solid var(--bd)';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'flex:1;font-size:10px;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0';
    lbl.textContent = domain; lbl.title = domain;
    const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:2px;flex-shrink:0;align-items:center';
    RULE_FLAGS.forEach(flag => {
      const btn = document.createElement('button'); btn.className = 'sr-flag-btn';
      const meta = RULE_META[flag]; btn.innerHTML = meta.svg; btn.title = meta.tooltip;
      const isOn = !!rule[flag], disabled = flag !== 'banned' && flag !== 'oust' && !!rule.banned;
      btn.style.cssText =
        `border:1px solid ${isOn ? 'var(--ac)' : 'var(--bd2)'};` +
        `background:${isOn ? 'var(--acd)' : 'transparent'};color:${isOn ? 'var(--ac)' : 'var(--tx3)'};` +
        `opacity:${disabled ? '0.3' : '1'};cursor:${disabled ? 'not-allowed' : 'pointer'};` +
        `width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;border-radius:5px;flex-shrink:0;transition:all .12s`;
      if (disabled) btn.setAttribute('disabled', '');
      else btn.addEventListener('click', () => { rule[flag] = !rule[flag]; applyRuleDeps(rule); saveSiteRules(); renderSiteRules(); });
      btns.appendChild(btn);
    });
    const del = document.createElement('button'); del.className = 'site-del'; del.textContent = '×'; del.title = 'Remove site rule';
    del.addEventListener('click', () => { delete P.siteRules[domain]; saveSiteRules(); renderSiteRules(); });
    row.append(lbl, btns, del); frag.appendChild(row);
  });
  wrap.innerHTML = ''; wrap.appendChild(frag);
}

function addSiteRule(domain) {
  if (!domain) return;
  domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*/, '').toLowerCase().trim();
  if (!domain) return;
  if (!P.siteRules[domain]) P.siteRules[domain] = { banned: false, immersive: false, ai: false, oust: true, turbo: false };
  saveSiteRules(); renderSiteRules();
}

function lazyRender(id, deadline) {
  if (P.rendered.has(id)) return;
  if (deadline && deadline.timeRemaining() < 5) return;
  P.rendered.add(id);
  if (id === 'sec-audio')   { if (!P.voicesReady) { renderVoices(); renderJigsaw(); } }
  if (id === 'sec-replace') { renderReplaceWords(); renderReplaceLists(); }
  if (id === 'sec-access')  { renderSiteRules(); }
  if (id === 'sec-about')   { renderHKTable(); }
}

// ── CRITICAL BUTTONS ──────────────────────────────────────────────────────────
function wireCriticalButtons() {
  const logoBtn = $('logo-btn');
  if (logoBtn) logoBtn.addEventListener('click', e => { e.stopImmediatePropagation(); logoBtn.classList.toggle('active'); fireMsg({ type: 'RTTS_TOGGLE' }); });

  const playBtn = $('btn-play');
  if (playBtn) playBtn.addEventListener('click', e => { e.stopImmediatePropagation(); P.ttsState = P.ttsState === 'playing' ? 'idle' : 'playing'; renderTTS(); fireMsg({ type: 'RTTS_PLAYSTOP', cfg: { rate: P.TTS.rate }, jigsaw: P.voiceJigsaw }); });

  const aiPopBtn = $('btn-ai');
  if (aiPopBtn) aiPopBtn.addEventListener('click', e => { e.stopImmediatePropagation(); fireMsg({ type: 'TOGGLE_AI_OVERLAY' }); });
}

// ── EVENTS ────────────────────────────────────────────────────────────────────
const TOGGLE_HANDLERS = {
  'tog-bionic':       v => pushRM({ bionic: v }),
  'tog-scan':         v => { pushRM({ scanSkim: v }); const ss = $('super-scan-row'), ts = $('tog-super'); if (ss) ss.style.opacity = v ? '1' : '0.4'; if (ts) ts.disabled = !v; },
  'tog-super':        v => pushRM({ superSkim: v }),
  'tog-noun':         v => pushRM({ nounHighlight: v }),
  'tog-autonext':     v => { P.autoNextChapter = v; chrome.storage.local.set({ AR_auto_next_enabled: v }); send({ type: 'AR_AUTO_NEXT', value: v }); },
  'tog-guard':        v => { P.guard = v;       chrome.storage.local.set({ AR_guard: v });       send({ type: 'AR_GUARD',     value: v }); },
  'tog-forcetts':     v => { P.forceTTS = v;    chrome.storage.local.set({ AR_force_tts: v });   send({ type: 'AR_FORCE_TTS', value: v }); },
  'tog-auto-ai-next': v => { P.autoAiNextPage = v; chrome.storage.local.set({ AR_auto_ai_next: v }); send({ type: 'AR_AUTO_AI_NEXT', value: v }); },
};

const INPUT_COLOR_MAP = {
  'hl-wc':      v => pushHL({ wordColor: v }),
  'hl-pc':      v => pushHL({ paraColor: v }),
  'scan-fc':    v => pushRM({ scanFirstColor: v }),
  'scan-lc':    v => pushRM({ scanLastColor: v }),
  'prog-color': v => pushRM({ progColor: v }),
  'noun-color': v => pushRM({ nounColor: v }),
  'ffc-color':  v => pushRM({ forceFontColorVal: v }),
};

function setupEvents() {
  // Click cop
  document.addEventListener('click', async e => {
    const t = e.target, id = t.id;

    const navBtn = t.closest('.nav-item[data-target]');
    if (navBtn) {
      const target = navBtn.dataset.target;
      $$('.nav-item').forEach(b => { b.classList.toggle('active', b.dataset.target === target); b.setAttribute('aria-selected', b.dataset.target === target); });
      $$('.bento-section').forEach(s => s.classList.toggle('active', s.id === target));
      lazyRender(target); return;
    }

    const labsBtn = t.closest('.labs-subtab');
    if (labsBtn) {
      const panel = labsBtn.dataset.labsTarget; if (!panel) return;
      $$('.labs-subtab').forEach(b => b.classList.toggle('active', b.dataset.labsTarget === panel));
      $$('.labs-panel').forEach(p => p.classList.toggle('active', p.id === panel));
      if (panel === 'labs-panel-auto'   && !P.rendered.has('immersive')) { P.rendered.add('immersive'); renderImmersiveSiteList(); }
      if (panel === 'labs-panel-access' && !P.rendered.has('access'))   { P.rendered.add('access');    renderSiteList(); renderBanList(); }
      return;
    }

    if (id === 'btn-prev')    { send({ type: 'RTTS_PREV' }); return; }
    if (id === 'btn-next')    { send({ type: 'RTTS_NEXT' }); return; }
    if (id === 'btn-prev-ch') { send({ type: 'AR_CHAPTER', dir: 'prev' }); return; }
    if (id === 'btn-next-ch') { send({ type: 'AR_CHAPTER', dir: 'next' }); return; }

    if (id === 'g-m') { P.genderFilter = 'm'; renderVoices(); return; }
    if (id === 'g-f') { P.genderFilter = 'f'; renderVoices(); return; }

    if (id === 'jig-shuffle') {
      for (let i = P.voiceJigsaw.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [P.voiceJigsaw[i], P.voiceJigsaw[j]] = [P.voiceJigsaw[j], P.voiceJigsaw[i]]; }
      saveJ(); renderJigsaw(); return;
    }
    if (id === 'jig-del-mode') { const area = $('jig-area'); if (area) { area.classList.toggle('delete-mode-active'); t.classList.toggle('on', area.classList.contains('delete-mode-active')); } return; }

    if (t.dataset.align) { pushRM({ textAlign: t.dataset.align }); $$('#align-chips .chip').forEach(c => c.classList.toggle('on', c.dataset.align === t.dataset.align)); return; }
    if (t.dataset.acc)   { P.RS.accent = t.dataset.acc; $$('.sw').forEach(s => s.classList.toggle('on', s.dataset.acc === t.dataset.acc)); pushRM({ accent: t.dataset.acc }); return; }

    if (id === 'tile-bionic-btn') { P.RS.bionic = !P.RS.bionic; t.classList.toggle('on', P.RS.bionic); pushRM({ bionic: P.RS.bionic }); return; }
    if (id === 'tile-noun-btn')   { P.RS.nounHighlight = !P.RS.nounHighlight; t.classList.toggle('on', P.RS.nounHighlight); pushRM({ nounHighlight: P.RS.nounHighlight }); return; }
    if (id === 'ffc-btn')         { P.RS.forceFontColor = !P.RS.forceFontColor; t.classList.toggle('on', P.RS.forceFontColor); const fc = $('ffc-color'); if (fc) fc.style.display = P.RS.forceFontColor ? 'block' : 'none'; pushRM({ forceFontColor: P.RS.forceFontColor }); return; }

    if (id === 'rp-add-pair') {
      const fi = $('rp-find-inp'), ri = $('rp-replace-inp');
      if (!fi?.value.trim()) { toast('Enter a word to find', false); return; }
      const sel = $('rp-list-sel'), curId = sel?.value || (P.REP.lists || [])[0]?.id;
      const list = (P.REP.lists || []).find(l => l.id === curId) || (P.REP.lists || [])[0]; if (!list) return;
      const d = P.REP.defaults || {};
      (list.pairs = list.pairs || []).push({ find: fi.value.trim(), replace: ri?.value || '', matchCase: d.matchCase, wholeWord: d.wholeWord, preserveCase: d.preserveCase });
      fi.value = ''; if (ri) ri.value = ''; saveRep(); renderReplaceWords(); return;
    }

    if (id === 'new-list-ok') {
      const inp = $('new-list-name-inp'), name = (inp?.value || '').trim(); if (!name) return;
      P.REP.lists.push({ id: mkId(), name, enabled: true, color: '#60a5fa', pairs: [] });
      if (inp) inp.value = ''; const wf = $('new-list-form'); if (wf) wf.style.display = 'none';
      saveRep(); renderReplaceLists(); renderReplaceWords(); return;
    }
    if (id === 'new-list-cancel') { const w = $('new-list-form'); if (w) w.style.display = 'none'; return; }
    if (id === 'rl-new-btn')      { const w = $('new-list-form'); if (w) w.style.display = w.style.display === 'none' ? 'flex' : 'none'; return; }

    if (id === 'def-mc' || id === 'def-ww' || id === 'def-pc') {
      P.REP.defaults = P.REP.defaults || {};
      P.REP.defaults.matchCase    = !!$('def-mc')?.checked;
      P.REP.defaults.wholeWord    = !!$('def-ww')?.checked;
      P.REP.defaults.preserveCase = !!$('def-pc')?.checked;
      chrome.storage.local.set({ AR_replace: P.REP }); return;
    }

    if (id === 'sr-add') { const inp = $('sr-inp'), val = (inp?.value || '').trim(); if (!val) return; addSiteRule(val); if (inp) inp.value = ''; toast('Site added'); return; }
    if (id === 'sr-cur') { try { const tab = await getActiveTab(); if (!tab?.url) return; const host = new URL(tab.url).hostname.replace(/^www\./, '').toLowerCase(); if (!host) return; addSiteRule(host); toast('Added: ' + host); } catch {} return; }

    if (id === 'rl-merge-btn') {
      const allPairs = getAllPairs(); if (!allPairs.length) { toast('No pairs to merge', false); return; }
      P.REP.lists = [{ id: mkId(), name: 'Merged ' + new Date().toLocaleDateString(), enabled: true, color: '#60a5fa', pairs: allPairs }];
      saveRep(); renderReplaceLists(); renderReplaceWords(); toast('Lists merged'); return;
    }

    if (t.type === 'checkbox') { const h = TOGGLE_HANDLERS[id]; if (h) { h(t.checked); return; } }
  });

  // Input cop
  document.addEventListener('input', e => {
    const t = e.target, id = t.id, val = parseFloat(t.value);
    if (id === 'spd-r') { P.TTS.rate = val; setSpdBar(val); save(); send({ type: 'RTTS_RATE', value: val }); return; }
    if (id === 'textureSlider') {
      const v = Math.max(0, Math.min(100, parseInt(t.value) || 0)); P.RS.textureDensity = v;
      const tf = $('texture-fill'), tv = $('texture-val'); if (tf) tf.style.width = v + '%'; if (tv) tv.textContent = v;
      save(); fireMsg({ type: 'AR_TEXTURE', value: v }); return;
    }
    if (id === 'sel-font')  { pushRM({ font: t.value }); return; }
    if (id === 'sel-theme') { pushRM({ theme: t.value }); return; }
    const colorHandler = INPUT_COLOR_MAP[id]; if (colorHandler) { colorHandler(t.value); return; }
    const entry = INPUT_MAP[id]; if (!entry) return;
    const [min, max, fsId, fmt, push] = entry;
    const c = Math.max(min, Math.min(max, val)); setFSL(fsId, c, min, max, fmt); push(c);
  });

  // Keydown — hotkey recorder
  document.addEventListener('keydown', e => {
    if (P.recordingKey) {
      e.preventDefault(); e.stopPropagation();
      const k = e.key.toLowerCase();
      if (['shift','control','alt','meta'].includes(k)) return;
      P.hotkeys[P.recordingKey] = { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, key: k };
      P.recordingKey = null;
      chrome.storage.local.set({ AR_hotkeys: P.hotkeys }); send({ type: 'AR_HOTKEYS', hotkeys: P.hotkeys });
      renderHKTable(); return;
    }
    if (e.key === 'Enter') {
      const id = e.target?.id;
      if (id === 'rp-find-inp' || id === 'rp-replace-inp') { $('rp-add-pair')?.click(); return; }
      if (id === 'sr-inp')            { $('sr-add')?.click(); return; }
      if (id === 'new-list-name-inp') { $('new-list-ok')?.click(); return; }
    }
    if (e.key === 'Escape' && e.target?.id === 'new-list-name-inp') $('new-list-cancel')?.click();
  }, true);

  // AI settings
  const gKey = $('groq-key'), gKey2 = $('groq-key2'), gKey3 = $('groq-key3'), gKey4 = $('groq-key4');
  const aiModelSel = $('ai-model-sel'), aiSave = $('save-ai');
  const ctxModal = $('ai-ctx-modal'), ctxOpen = $('ai-ctx-open'), ctxCancel = $('ai-ctx-cancel'), ctxSubmit = $('ai-ctx-submit'), ctxArea = $('ai-context');

  if (gKey) {
    chrome.storage.local.get(['groqKey','groqKey2','groqKey3','groqKey4','aiContext','nr_ai_model'], res => {
      if (res.groqKey)  gKey.value  = res.groqKey;
      if (res.groqKey2) gKey2.value = res.groqKey2;
      if (res.groqKey3 && gKey3) gKey3.value = res.groqKey3;
      if (res.groqKey4 && gKey4) gKey4.value = res.groqKey4;
      if (res.aiContext && ctxArea) ctxArea.value = res.aiContext;
      if (res.nr_ai_model && aiModelSel) aiModelSel.value = res.nr_ai_model;
    });
  }

  if (ctxOpen && ctxModal) {
    ctxOpen.addEventListener('click', () => { ctxModal.style.display = 'flex'; ctxArea?.focus(); });
    ctxCancel?.addEventListener('click', () => { ctxModal.style.display = 'none'; });
    ctxModal.addEventListener('click', e => { if (e.target === ctxModal) ctxModal.style.display = 'none'; });
    ctxSubmit?.addEventListener('click', () => { chrome.storage.local.set({ aiContext: (ctxArea?.value || '').trim() }, () => { ctxModal.style.display = 'none'; toast('Behavior & Context saved!', true); }); });
  }

  if (aiSave) {
    aiSave.addEventListener('click', () => {
      chrome.storage.local.set({
        groqKey:     gKey?.value.trim()  || '',
        groqKey2:    gKey2?.value.trim() || '',
        groqKey3:    gKey3?.value.trim() || '',
        groqKey4:    gKey4?.value.trim() || '',
        nr_ai_model: aiModelSel?.value   || 'llama-3.1-8b-instant',
      }, () => toast('AI Settings Saved!', true));
    });
  }

  // Last Run Stats Panel
  const statsPanel  = $('ai-stats-panel');
  const statsBody   = $('ai-stats-body');
  const statsFooter = $('ai-stats-footer');

  function renderStats(s) {
    if (!s || !statsPanel || !statsBody) return;
    statsPanel.style.display = 'block';
    const statusColor = slot => slot === -1 ? 'var(--rose,#fb7185)' : 'var(--ac)';
    statsBody.innerHTML = s.chunks.map(c => `
      <div style="background:var(--sf2);border:1px solid var(--bd2);border-radius:6px;padding:5px 7px;font-size:9px;line-height:1.6">
        <div style="font-weight:700;color:${statusColor(c.keySlot)}">${c.label} ${c.keySlot === -1 ? '✗' : '✓ key ' + c.keySlot}</div>
        <div style="color:var(--tx2)">${c.inputChars.toLocaleString()} chars in</div>
        <div style="color:var(--tx2)">${c.promptTokens} → ${c.completionTokens} tok</div>
        <div style="color:var(--tx3)">${c.ms}ms</div>
      </div>`).join('');
    const totalIn  = s.chunks.reduce((a, c) => a + c.promptTokens, 0);
    const totalOut = s.chunks.reduce((a, c) => a + c.completionTokens, 0);
    const ago = Math.round((Date.now() - s.ts) / 1000);
    if (statsFooter) statsFooter.textContent = `${s.model} · ${s.keysUsed} key${s.keysUsed !== 1 ? 's' : ''} · ${totalIn}→${totalOut} tokens · ${s.totalMs}ms total · ${ago}s ago`;
  }

  chrome.storage.local.get('nr_ai_last_run', r => renderStats(r.nr_ai_last_run));
  const _statsListener = (changes, area) => { if (area === 'local' && changes.nr_ai_last_run) renderStats(changes.nr_ai_last_run.newValue); };
  chrome.storage.onChanged.addListener(_statsListener);
  window.addEventListener('unload', () => chrome.storage.onChanged.removeListener(_statsListener), { once: true });
}

// ── INCOMING MESSAGES ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(msg => {
  if (!msg) return;
  if (msg.type === 'SYNC_STATE') {
    if (msg.rmActive !== undefined) { const b = $('logo-btn'); if (b) b.classList.toggle('active', !!msg.rmActive); }
    if (msg.state   !== undefined) { P.ttsState = msg.state; renderTTS(); }
    return;
  }
  if (msg?.from !== 'content') return;
  if (msg.state     !== undefined) { P.ttsState = msg.state; renderTTS(); }
  if (msg.rmActive  !== undefined) { const b = $('logo-btn'); if (b) b.classList.toggle('active', !!msg.rmActive); }
  if (msg.voiceName !== undefined) updateMeta(msg.voiceName);
  if (msg.rateChange)    { P.TTS.rate = msg.rateChange; setSpdBar(P.TTS.rate); }
  if (msg.settingsChange) { Object.assign(P.RS, msg.settingsChange); for (const [k, v] of Object.entries(msg.settingsChange)) _updateRMControl(k, v); }
});

const getActiveTab = () => _tab ? Promise.resolve(_tab) : chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => t);

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await primeTab();

  const stored = await chrome.storage.local.get([
    'AR_rm','AR_hl','AR_prefs','AR_jigsaw',
    'AR_auto_next_enabled','AR_guard','AR_force_tts',
    'AR_hotkeys','AR_replace','AR_auto_ai_next','siteRules',
  ]);
  if (stored.AR_rm)              Object.assign(P.RS, RM_DEF, stored.AR_rm);
  if (stored.AR_hl)              Object.assign(P.HL, HL_DEF, stored.AR_hl);
  if (stored.AR_prefs)           P.TTS.rate = parseFloat(stored.AR_prefs.rate || 1);
  if (stored.AR_jigsaw?.length)  P.voiceJigsaw = stored.AR_jigsaw;
  if (stored.AR_auto_next_enabled) P.autoNextChapter = true;
  if (stored.AR_guard)             P.guard = true;
  if (stored.AR_force_tts)         P.forceTTS = true;
  if (stored.AR_auto_ai_next)      P.autoAiNextPage = true;
  if (stored.AR_hotkeys)           Object.assign(P.hotkeys, HK_DEF, stored.AR_hotkeys);
  if (stored.siteRules)            P.siteRules = stored.siteRules;
  if (stored.AR_replace) {
    Object.assign(P.REP, stored.AR_replace);
    if (!P.REP.lists?.length) P.REP.lists = [{ id: mkId(), name: 'List of life', enabled: true, color: '#60a5fa', pairs: [] }];
    P.REP.defaults ??= { matchCase: false, wholeWord: true, preserveCase: true };
  }

  let live = null;
  try { live = await send({ action: 'getState' }); }
  catch (e) { console.info('[Nocturne popup] getState skipped:', e?.message || e); }
  if (live) {
    if (live.rs)                            Object.assign(P.RS, live.rs);
    if (live.hl)                            Object.assign(P.HL, live.hl);
    if (live.state)                         P.ttsState = live.state;
    if (live.ttsRate)                       P.TTS.rate = live.ttsRate;
    if (live.autoNextChapter !== undefined) P.autoNextChapter = live.autoNextChapter;
    if (live.hotkeys)                       Object.assign(P.hotkeys, live.hotkeys);
    if (live.currentVoice)                  P.curVoiceName = live.currentVoice;
    if (live.rmActive !== undefined)        { const b = $('logo-btn'); if (b) b.classList.toggle('active', !!live.rmActive); }
  }

  if (_tab?.url) { try { const h = new URL(_tab.url).hostname.replace(/^www\./, ''); const cl = $('cur-site-lbl'); if (cl) cl.textContent = h || '—'; } catch {} }

  wireCriticalButtons(); setupEvents(); wirePreviewZone();
  const listSel = $('rp-list-sel'); if (listSel) listSel.addEventListener('change', () => renderReplaceWords());

  renderAll(); renderTTS(); updateMeta();

  requestAnimationFrame(() => requestAnimationFrame(() => {
    setTimeout(() => document.documentElement.classList.remove('no-trans'), 150);
    const raw = speechSynthesis.getVoices() || [];
    if (raw.length) { P.allVoices = raw; P.voicesReady = true; renderVoices(); renderJigsaw(); }
    else speechSynthesis.onvoiceschanged = () => { P.allVoices = speechSynthesis.getVoices() || []; P.voicesReady = true; renderVoices(); renderJigsaw(); };
    P.rendered.add('sec-audio'); P.rendered.add('sec-about');
    renderHKTable(); renderReplaceLists();
    P.rendered.add('sec-replace');
  }));

  const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : fn => setTimeout(fn, 16);
  idle(deadline => {
    lazyRender('sec-audio', deadline); lazyRender('sec-replace', deadline);
    lazyRender('sec-access', deadline); lazyRender('sec-about', deadline);
    renderDefaults();
  });
});
