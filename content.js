// content.js — Nocturne
(function () {
'use strict';
if (window.__NR === true || window.__NR === 'pending') return;
window.__NR = 'pending';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const VOICE_OK = v => {
  const l = (v.lang || '').toLowerCase(), n = (v.name || '').toLowerCase();
  return ((n.includes('multilingual') || /^en-(us|gb|ca)/.test(l)) &&
    !/ana|maisie|alfie|holly|molly|ada|archie|theo|jasper|zira|david|mark|george|susan|linda|richard|hedda|james|guy|hazel/.test(n) &&
    /steffan|davis|eric|tony|brian|ryan|elliot|andrew|jacob|jason|marcus|matthew|liam|michelle|emma|sara|elizabeth|sonia|abbi|ava|claire|diana|emily|grace|isabella|julia|leah|natalie|olivia|rachel/.test(n));
};
const voiceShort = v => (v?.name || '').replace(/Microsoft\s+/i, '').replace(/\([^)]*\)/g, '').replace(/\s*(Online|Natural|Neural|Standard)\s*/gi, ' ').trim().split(/\s+/)[0];

const ACCENTS = {
  blue:'#60a5fa', teal:'#2dd4bf', purple:'#a78bfa', amber:'#fbbf24',
  rose:'#fb7185', sage:'#4ade80', orange:'#fb923c', pink:'#f472b6',
  cyan:'#22d3ee', lime:'#a3e635', indigo:'#818cf8', gold:'#eab308', sky:'#38bdf8', coral:'#f87171',
  nebula:'linear-gradient(135deg,#c084fc 50%,#60a5fa 50%)',
  sunset:'linear-gradient(135deg,#fb7185 50%,#fbbf24 50%)',
  prism:'linear-gradient(135deg,#2dd4bf 50%,#fbbf24 50%)',
  electra:'linear-gradient(135deg,#a3e635 50%,#22d3ee 50%)',
  ember:'linear-gradient(135deg,#fb923c 50%,#fb7185 50%)',
  glacier:'linear-gradient(135deg,#38bdf8 50%,#818cf8 50%)',
};

const RM_DEF = {
  theme:'gemini', accent:'teal', font:'comicsans', fontSize:18, lineHeight:1.75,
  letterSpacing:.01, wordSpacing:.05, paraSpacing:1.2, width:55, bionic:false,
  barPos:'bottom', textAlign:'left', scanSkim:false, superSkim:false,
  scanFirstColor:'#fbbf24', scanLastColor:'#fb7185', nounHighlight:false,
  nounColor:'#a3e635', overlayBg:'', progColor:'#29273a',
  forceFontColor:false, forceFontColorVal:'#d4d0e8', textureDensity:0,
};
const HL_DEF = { wordColor:'#60a5fa', paraColor:'#60a5fa', paraOpacity:0.20 };
const DEFAULT_HOTKEYS = {
  toggleReader: { ctrl:true,  alt:false, shift:false, key:'s' },
  playStop:     { ctrl:false, alt:false, shift:false, key:' ' },
  prevPara:     { ctrl:false, alt:false, shift:false, key:'arrowup' },
  nextPara:     { ctrl:false, alt:false, shift:false, key:'arrowdown' },
  prevChapter:  { ctrl:false, alt:false, shift:false, key:'arrowleft' },
  nextChapter:  { ctrl:false, alt:false, shift:false, key:'arrowright' },
  scrollTop:    { ctrl:false, alt:false, shift:false, key:'home' },
  scrollBottom: { ctrl:false, alt:false, shift:false, key:'end' },
  escape:       { ctrl:false, alt:false, shift:false, key:'escape' },
};

const SVG = {
  reader: `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  play:   `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 4.5L19 12 6 19.5Z"/></svg>`,
  stop:   `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`,
  prev:   `<svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M7 5v14M17 5 7 12l10 7V5z"/></svg>`,
  next:   `<svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M17 5v14M7 5l10 7L7 19V5z"/></svg>`,
  up:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="18 15 12 9 6 15"/></svg>`,
  down:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="6 9 12 15 18 9"/></svg>`,
  flip:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="7 16 12 21 17 16"/><polyline points="7 8 12 3 17 8"/></svg>`,
  gear:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  chPrev: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>`,
  chNext: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>`,
};

// ── STATE ─────────────────────────────────────────────────────────────────────
const RS_CLOSED=0, RS_OPENING=1, RS_OPEN=2, RS_CLOSING=3;
const TS_IDLE=0, TS_PLAYING=1, TS_STOPPING=2;

const S = {
  readerState: RS_CLOSED,
  ttsState:    TS_IDLE,
  tts: {
    epoch:0, index:0, charOffset:0, lastBoundaryChar:0, rate:1.75,
    savedIdx:0, savedChar:0, hasSaved:false, queuedUpTo:-1, lastParaIdx:-1,
    bgKA:null, heartbeat:null, watchdog:null, lastActivityAt:0,
    statsTimer:null, statsInterval:null, rateTimer:null, hlSyncTimer:null,
  },
  voices: { all:[], cache:null, jigsaw:[['brian multilingual'],['ava multilingual'],['andrew multilingual'],['emma multilingual'],['sonia']], slot:0, cur:null },
  ui: { overlay:null, article:null, bar:null, playBtn:null, voiceEl:null, statWC:null, statWPM:null, statREM:null, barShown:false, progEl:null },
  texts:[], standardNodes:[], immersiveNodes:[], paras:[], parasStale:true,
  spa: { el:null, origOverflow:'' },
  RS: {...RM_DEF}, HL: {...HL_DEF}, hotkeys: {...DEFAULT_HOTKEYS},
  siteRules:{},
  autoNextChapter:false, guard:false, forceTTS:false, autoAiNextPage:false,
  rc: { node:null, offset:0 },
  wordCount:0, bionicDone:false, overlayUrl:'',
  aiContentCache:null, saveTimer:null, replaceTimer:null, initDone:false,
  aiOverlayOpen:false, scrollPct:0,
};

// ── SCROLL HEIGHT CACHE ───────────────────────────────────────────────────────
let _cachedPageScrollable = 0, _cachedOvScrollable = 0, _cachedAiScrollable = 0;
let _ovResizeObs = null, _aiResizeObs = null;
new ResizeObserver(() => { _cachedPageScrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }).observe(document.body);

// ── WEB WORKER (chunk builder + para-text filter) ─────────────────────────────
const _chunkCache = new Map();
const _workerSrc = `
'use strict';
function _maxChunk(r){return Math.max(600,Math.min(1400,Math.round(437*(r||1.75))));}
function _buildChunks(text,rate){
  const MC=_maxChunk(rate),segs=text.match(/[^.!?]+[.!?]+|\\s*[^.!?]+$/g)||[text];
  const merged=[];let buf='',bufPos=0,pos=0;
  for(const s of segs){if(buf&&(buf+s).length>MC){merged.push({t:buf,s:bufPos});bufPos=pos;buf=s;}else{if(!buf)bufPos=pos;buf+=s;}pos+=s.length;}
  if(buf)merged.push({t:buf,s:bufPos});
  const out=[];
  for(const c of merged){if(c.t.length<=MC){out.push(c);continue;}for(let i=0;i<c.t.length;i+=MC)out.push({t:c.t.slice(i,i+MC),s:c.s+i});}
  return out;
}
function _filterParaTexts(texts){
  const NAV=/^(prev|next|chapter|subscribe|read more)/i;
  return texts.map((t,i)=>{t=t.trim();if(t.length<10)return null;if(t.length<35&&NAV.test(t))return null;return i;}).filter(i=>i!==null);
}
self.onmessage=e=>{
  const{id,type,payload}=e.data;
  if(type==='chunks'){self.postMessage({id,type:'chunks',results:payload.texts.map((text,i)=>({idx:payload.idxs[i],chunks:_buildChunks(text,payload.rate)}))});}
  else if(type==='filterParas'){self.postMessage({id,type:'filterParas',validIdxs:_filterParaTexts(payload.texts)});}
};`;

let _worker = null;
const _workerCallbacks = new Map();
let _workerMsgId = 0;

function _getWorker() {
  if (_worker) return _worker;
  try {
    _worker = new Worker(URL.createObjectURL(new Blob([_workerSrc], { type: 'text/javascript' })));
    _worker.onmessage = e => { const cb = _workerCallbacks.get(e.data.id); if (!cb) return; _workerCallbacks.delete(e.data.id); cb(e.data.type, e.data.results, e.data.validIdxs); };
    _worker.onerror = () => { _worker = null; };
  } catch { _worker = null; }
  return _worker;
}

function _prefetchChunks(idxs) {
  if (!idxs.length) return;
  const w = _getWorker(); if (!w) return;
  const id = ++_workerMsgId;
  _workerCallbacks.set(id, (type, results) => { if (type === 'chunks') for (const { idx, chunks } of results) _chunkCache.set(idx, chunks); });
  w.postMessage({ id, type: 'chunks', payload: { idxs, texts: idxs.map(i => S.texts[i] || ''), rate: S.tts.rate } });
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
const hexToRgb  = h => { let s=(h||'#000').replace('#',''); if(s.length===3)s=s.split('').map(c=>c+c).join(''); const n=parseInt(s,16); return{r:(n>>16)&255,g:(n>>8)&255,b:n&255}; };
const hexRGB    = h => { try{const{r,g,b}=hexToRgb(h);return`${r},${g},${b}`;}catch{return'148,163,255';} };
const fmtTime   = s => { if(!s||s<=0)return''; if(s<60)return s+'s'; const m=Math.round(s/60); return m<60?m+'m':Math.floor(m/60)+'h'+(m%60?m%60+'m':''); };
const esc       = t => (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const saveLater = () => { clearTimeout(S.saveTimer); S.saveTimer = setTimeout(() => chrome.storage.local.set({ AR_rm: S.RS, AR_hl: S.HL }), 400); };
const yieldMain = () => new Promise(r => setTimeout(r, 0));
const YIELD_EVERY = 50, CHUNK_SIZE = 500;
const matchHK      = (e, hk) => !!(hk?.key) && (e.key||'').toLowerCase() === (hk.key||'').toLowerCase() && !!e.ctrlKey===!!hk.ctrl && !!e.altKey===!!hk.alt && !!e.shiftKey===!!hk.shift;
const nearestBlock = node => { const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node; return el?.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote') ?? null; };
const checkRule    = flag => {
  try {
    const h = location.hostname.replace(/^www\./, '');
    for (const [d, r] of Object.entries(S.siteRules)) if ((h === d || h.endsWith('.' + d)) && r[flag]) return true;
  } catch {}
  return false;
};

function getClickCharOffset(x, y, el) {
  if (!el) return 0;
  const r = document.caretRangeFromPoint
    ? document.caretRangeFromPoint(x, y)
    : (()=>{const p=document.caretPositionFromPoint?.(x,y);return p?{startContainer:p.offsetNode,startOffset:p.offset}:null;})();
  if (!r || r.startContainer?.nodeType !== Node.TEXT_NODE || !el.contains(r.startContainer)) return 0;
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node, cum = 0;
  while ((node = tw.nextNode())) { if (node === r.startContainer) return cum + r.startOffset; cum += node.textContent.length; }
  return 0;
}

// ── VOICES ────────────────────────────────────────────────────────────────────
function loadVoices() {
  const prev = S.voices.all.length;
  S.voices.all = speechSynthesis.getVoices() || [];
  if (S.voices.all.length !== prev) S.voices.cache = null;
}
function voiceList() {
  return S.voices.cache || (S.voices.cache = S.voices.all.filter(VOICE_OK).map(v => ({
    name: v.name, short: voiceShort(v),
    gender: /steffan|davis|eric|tony|brian|ryan|elliot|thomas|andrew|christopher|jacob|jason|marcus|matthew|liam/i.test(v.name) ? 'm' : 'f',
  })));
}
function nextVoice() {
  const vl = voiceList();
  const qualityFallback = vl.length ? (S.voices.all.find(v => v.name === vl[0].name) ?? null) : null;
  const col = S.voices.jigsaw[S.voices.slot++ % Math.max(1, S.voices.jigsaw.length)];
  if (!col?.length) return qualityFallback ?? null;
  const name = col[Math.floor(Math.random() * col.length)];
  const exact = S.voices.all.find(v => v.name.toLowerCase().includes(name));
  if (exact) return exact;
  const firstName = name.split(/\s+/)[0];
  if (firstName) { const partial = S.voices.all.find(v => VOICE_OK(v) && v.name.toLowerCase().includes(firstName)); if (partial) return partial; }
  return qualityFallback ?? null;
}

// ── STATS ─────────────────────────────────────────────────────────────────────
const computeStats = () => {
  const pct = S.scrollPct, wpm = S.ttsState === TS_PLAYING ? Math.max(1, Math.round(200 * S.tts.rate)) : 238, wc = S.wordCount || 0;
  return { wpm, remainSecs: wc ? Math.round(wc * (1 - pct) / Math.max(1, wpm) * 60) : 0, wordCount: wc, pct };
};

// ── HIGHLIGHTS ────────────────────────────────────────────────────────────────
let narHL = null, nounHL = null;
try { if (CSS?.highlights) { narHL = new Highlight(); CSS.highlights.set('nr-word', narHL); nounHL = new Highlight(); CSS.highlights.set('nr-noun', nounHL); } } catch {}

let _whlDiv = null;
function _getWhlDiv() {
  const host = (S.readerState === RS_OPEN && S.ui.overlay) ? S.ui.overlay
    : (S.aiOverlayOpen ? (document.getElementById('nr-ai-overlay') || document.body) : document.body);
  if (_whlDiv) { if (_whlDiv.parentNode !== host) host.appendChild(_whlDiv); return _whlDiv; }
  _whlDiv = document.createElement('div');
  _whlDiv.id = '__nr_whl';
  _whlDiv.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border-radius:3px;mix-blend-mode:screen;will-change:transform,opacity;transform:translateZ(0);background:rgba(96,165,250,0.28);display:none';
  host.appendChild(_whlDiv);
  return _whlDiv;
}

let _hlCache = null, _hlCacheEl = null;
function _buildHlCache(el) {
  if (_hlCacheEl === el && _hlCache) return _hlCache;
  _hlCacheEl = el; _hlCache = [];
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let off = 0, node;
  while ((node = tw.nextNode())) { const len = node.textContent.length; _hlCache.push({ node, start: off, end: off + len }); off += len; }
  return _hlCache;
}
function _hlCacheFind(charIndex) {
  const cache = _hlCache; if (!cache?.length) return -1;
  let lo = 0, hi = cache.length - 1;
  while (lo <= hi) { const mid = (lo + hi) >>> 1; if (cache[mid].end <= charIndex) lo = mid + 1; else if (cache[mid].start > charIndex) hi = mid - 1; else return mid; }
  return -1;
}

function updateHLStyle() {
  let s = document.getElementById('__nr_hl');
  if (!s) { s = document.createElement('style'); s.id = '__nr_hl'; document.documentElement.appendChild(s); }
  const wc = S.HL.wordColor || '#60a5fa', pc = S.HL.paraColor || '#60a5fa', po = Math.max(0.06, S.HL.paraOpacity || 0.20);
  document.documentElement.style.setProperty('--nr-word-col', wc);
  document.documentElement.style.setProperty('--nr-para-bg', `rgba(${hexRGB(pc)},${po})`);
  document.documentElement.style.setProperty('--nr-para-bdr', `rgba(${hexRGB(pc)},${Math.min(1, po * 5)})`);
  if (_whlDiv) _whlDiv.style.background = `rgba(${hexRGB(wc)},0.28)`;
  s.textContent =
    `::highlight(nr-word){color:${wc}!important;font-weight:700!important}` +
    `#readfy-overlay ::highlight(nr-word),#nr-ai-overlay ::highlight(nr-word){color:${wc}!important;font-weight:700!important}` +
    `::highlight(nr-noun){color:var(--nr-noun-col,#a78bfa)!important;font-style:italic}`;
}

function hlWord(el, charIndex, charLen) {
  if (!el) return;
  if (narHL) {
    try {
      _buildHlCache(el);
      const idx = _hlCacheFind(charIndex);
      if (idx < 0) { narHL.clear(); return; }
      const { node, start } = _hlCache[idx], s = charIndex - start;
      const r = document.createRange();
      r.setStart(node, s); r.setEnd(node, Math.min(s + (charLen || 1) + 1, node.textContent.length));
      narHL.clear(); narHL.add(r);
    } catch { narHL?.clear(); }
    return;
  }
  if (!charLen) { const d = _getWhlDiv(); d.style.display = 'none'; return; }
  try {
    _buildHlCache(el);
    const idx = _hlCacheFind(charIndex);
    if (idx < 0) { _getWhlDiv().style.display = 'none'; return; }
    const { node, start } = _hlCache[idx], s = charIndex - start, wLen = Math.min(charLen, node.textContent.length - s);
    if (wLen <= 0) { _getWhlDiv().style.display = 'none'; return; }
    const r = document.createRange();
    r.setStart(node, s); r.setEnd(node, s + wLen);
    const rect = r.getBoundingClientRect();
    if (!rect.width) { _getWhlDiv().style.display = 'none'; return; }
    const d = _getWhlDiv();
    d.style.cssText = d.style.cssText.replace(/transform:[^;]+/, `transform:translate(${rect.left.toFixed(1)}px,${rect.top.toFixed(1)}px) translateZ(0)`);
    d.style.width = rect.width.toFixed(1) + 'px'; d.style.height = rect.height.toFixed(1) + 'px'; d.style.display = 'block';
  } catch { _getWhlDiv().style.display = 'none'; }
}

const clearWordHL = () => { narHL?.clear(); if (_whlDiv) _whlDiv.style.display = 'none'; };
const clearParaHL = () => {
  _hlCache = null; _hlCacheEl = null;
  document.querySelectorAll('.nr-para').forEach(e => { clearWordHL(); if (!S.RS.bionic) try { e.normalize(); } catch {} e.classList.remove('nr-para'); });
};

const _scrollObserverMap = new Map();
function _getScrollObserver(root) {
  const key = root || 'window';
  for (const [k, obs] of _scrollObserverMap) { if (k !== 'window' && k instanceof Element && !k.isConnected) { obs.disconnect(); _scrollObserverMap.delete(k); } }
  if (_scrollObserverMap.has(key)) return _scrollObserverMap.get(key);
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => { obs.unobserve(entry.target); if (!entry.isIntersecting) entry.target.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }, { root: root || null, threshold: 1.0, rootMargin: '-15% 0px -15% 0px' });
  _scrollObserverMap.set(key, obs);
  return obs;
}
function scrollParaIntoView(el) {
  if (!el) return;
  try {
    const root = isAiOverlayActive() ? (document.getElementById('nr-ai-overlay') || null) : (S.readerState === RS_OPEN && S.ui.overlay ? S.ui.overlay : null);
    _getScrollObserver(root).observe(el);
  } catch { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

// ── PARAGRAPHS ────────────────────────────────────────────────────────────────
let _contentRoot = null;
function _findContentRoot() {
  if (_contentRoot?.isConnected) return _contentRoot;
  for (const sel of ['article','[role="main"]','main','.post-content','.entry-content','.article-body','.story-body','#main-content','.main-content']) {
    const el = document.querySelector(sel);
    if (el && (el.textContent || '').trim().length > 300) { _contentRoot = el; return el; }
  }
  _contentRoot = document.body;
  return document.body;
}

function extractParas() {
  if (isAiOverlayActive()) {
    const o = document.getElementById('nr-ai-overlay');
    if (o && o.querySelector('p,h1,h2,h3')) { snapAiParasToTTS(); return S.paras; }
  }
  if (!S.parasStale && S.standardNodes.length) { S.paras = S.readerState === RS_OPEN ? S.immersiveNodes : S.standardNodes; return S.paras; }
  S.parasStale = false;
  const root = _findContentRoot();
  S.standardNodes = Array.from(root.querySelectorAll('p,h1,h2,h3,li')).filter(el => {
    const t = (el.textContent || '').trim();
    if (t.length < 10 || el.closest('#nr-bar,#__nr_vel,#readfy-overlay')) return false;
    if (t.length < 35 && /prev|next|chapter|subscribe|read more/.test(t.toLowerCase())) return false;
    return true;
  });
  if (S.ui.article) indexOverlayNodes(); else S.immersiveNodes = [];
  const rc = document.getElementById('nr-reader-content');
  S.texts = (rc && S.immersiveNodes.length ? S.immersiveNodes : S.standardNodes).map(el => el ? (el.textContent || '').trim() : '');
  S.paras = S.readerState === RS_OPEN ? S.immersiveNodes : S.standardNodes;
  return S.paras;
}

function indexOverlayNodes() {
  if (!S.ui.article) { S.immersiveNodes = []; return; }
  const ovEls = Array.from(S.ui.article.querySelectorAll('p,h1,h2,h3,li')).filter(el => (el.textContent || '').trim().length >= 10);
  const maps = [new Map(), new Map(), new Map()]; // 50, 35, 30
  for (const el of ovEls) {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    [50, 35, 30].forEach((n, i) => { const k = t.slice(0, n); if (k && !maps[i].has(k)) maps[i].set(k, el); });
  }
  S.immersiveNodes = S.standardNodes.map(stdEl => {
    const raw = (stdEl.textContent || '').replace(/\s+/g, ' ').trim();
    for (const [n, map] of [[50, maps[0]], [35, maps[1]], [30, maps[2]]]) { const k = raw.slice(0, n); if (map.has(k)) return map.get(k); }
    return null;
  });
}

function highlightParagraphInDOM(index) {
  clearParaHL();
  const el = S.paras?.[index] ?? null; if (!el) return;
  el.classList.add('nr-para');
  _buildHlCache(el);
  scrollParaIntoView(el);
}

const findFirstContent = ps => { for (let i = 0; i < ps.length; i++) { if (ps[i] && (ps[i].textContent || '').trim().split(/\s+/).filter(Boolean).length > 5) return i; } return 0; };

function resnapTexts() {
  const rc = document.getElementById('nr-reader-content');
  S.texts = (rc && S.immersiveNodes.length ? S.immersiveNodes : S.standardNodes).map(el => el ? (el.textContent || '').trim() : '');
}

function elIdx(el) {
  if (!el) return 0;
  const ps = extractParas();
  for (let i = 0; i < ps.length; i++) { if (ps[i] && (ps[i].contains(el) || ps[i] === el)) return i; }
  return 0;
}

// ── TTS ENGINE ────────────────────────────────────────────────────────────────
const PARA_LOOKAHEAD = 4;
function _maxChunk() { return Math.max(600, Math.min(1400, Math.round(437 * (S.tts.rate || 1.75)))); }
function _buildChunks(text) {
  const MC = _maxChunk();
  const segs = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
  const merged = []; let buf = '', bufPos = 0, pos = 0;
  for (const s of segs) {
    if (buf && (buf + s).length > MC) { merged.push({ t: buf, s: bufPos }); bufPos = pos; buf = s; } else { if (!buf) bufPos = pos; buf += s; }
    pos += s.length;
  }
  if (buf) merged.push({ t: buf, s: bufPos });
  const out = [];
  for (const c of merged) {
    if (c.t.length <= MC) { out.push(c); continue; }
    for (let i = 0; i < c.t.length; i += MC) out.push({ t: c.t.slice(i, i + MC), s: c.s + i });
  }
  return out;
}

const TTS = {
  stop() {
    S.tts.epoch++; S.ttsState = TS_STOPPING;
    speechSynthesis.cancel(); clearWordHL(); this._clearTimers(); _stopBgAudio();
    if (Bar._uiRAF) { cancelAnimationFrame(Bar._uiRAF); Bar._uiRAF = null; }
    S.ttsState = TS_IDLE; S.tts.queuedUpTo = -1; S.voices.cur = null;
    _chunkCache.clear();
    document.body.classList.remove('nr-tts-active');
    Bar.update(); this._sendState();
  },

  start(idx, charOffset = 0) {
    const wasBusy = speechSynthesis.speaking || speechSynthesis.pending;
    S.tts.epoch++; S.ttsState = TS_STOPPING;
    speechSynthesis.cancel(); clearWordHL(); this._clearTimers(); _chunkCache.clear();
    const epoch = S.tts.epoch;
    Object.assign(S.tts, { index: idx, charOffset, lastBoundaryChar: charOffset, savedIdx: idx, savedChar: charOffset, queuedUpTo: idx - 1, lastActivityAt: Date.now() });
    S.voices.slot = idx % Math.max(1, S.voices.jigsaw.length);
    S.ttsState = TS_PLAYING;
    S.tts.lastParaIdx = S.texts.reduce((last, t, i) => t ? i : last, -1);
    if (!S.readerState) document.body.classList.add('nr-tts-active');
    Bar.update(); this._sendState();

    S.tts.watchdog = setInterval(() => {
      if (S.tts.epoch !== epoch || S.ttsState !== TS_PLAYING) return;
      if (speechSynthesis.paused) { speechSynthesis.resume(); S.tts.lastActivityAt = Date.now(); return; }
      if (!speechSynthesis.speaking && !speechSynthesis.pending && Date.now() - S.tts.lastActivityAt > 2000) {
        console.warn('[Nocturne] watchdog: stall detected — restarting');
        TTS.start(S.tts.index, S.tts.lastBoundaryChar || 0);
      }
    }, 400);

    const lookaheadIdxs = [];
    for (let i = idx; i <= idx + PARA_LOOKAHEAD && i < S.texts.length; i++) if (S.texts[i]) lookaheadIdxs.push(i);
    _prefetchChunks(lookaheadIdxs);

    const prime = () => {
      if (S.tts.epoch !== epoch) return;
      S.ttsState = TS_PLAYING;
      for (let i = idx; i <= idx + PARA_LOOKAHEAD && i < S.texts.length; i++) this._queuePara(epoch, i, i === idx ? charOffset : 0);
    };
    if (wasBusy) setTimeout(prime, 160); else prime();
  },

  toggle() {
    if (S.ttsState === TS_PLAYING) { S.tts.savedIdx = S.tts.index; S.tts.savedChar = S.tts.lastBoundaryChar; S.tts.hasSaved = true; this.stop(); }
    else if (S.tts.hasSaved) { extractParas(); this.start(S.tts.savedIdx, S.tts.savedChar); }
    else { extractParas(); if (!S.paras.length) return; S.tts.hasSaved = false; this.start(findFirstContent(S.paras)); }
  },

  prev() { const cur = S.ttsState === TS_PLAYING ? S.tts.index : S.tts.savedIdx, ni = Math.max(0, cur - 1); S.tts.savedIdx = ni; S.tts.hasSaved = true; if (S.ttsState === TS_PLAYING) this.start(ni); },
  next() { const cur = S.ttsState === TS_PLAYING ? S.tts.index : S.tts.savedIdx, ni = Math.min((S.paras.length || 1) - 1, cur + 1); S.tts.savedIdx = ni; S.tts.hasSaved = true; if (S.ttsState === TS_PLAYING) this.start(ni); },

  setRate(r) {
    S.tts.rate = parseFloat(r) || 1.75; _chunkCache.clear(); clearTimeout(S.tts.rateTimer);
    S.tts.rateTimer = setTimeout(() => { if (S.ttsState === TS_PLAYING) this.start(S.tts.index, S.tts.lastBoundaryChar); }, 400);
  },

  _queuePara(epoch, paraIdx, startChar) {
    if (S.tts.epoch !== epoch || S.ttsState !== TS_PLAYING) return;
    if (paraIdx >= S.texts.length || paraIdx <= S.tts.queuedUpTo) return;
    const text = S.texts[paraIdx];
    if (!text) { S.tts.queuedUpTo = paraIdx; this._queuePara(epoch, paraIdx + 1, 0); return; }
    const chunks = _chunkCache.get(paraIdx) || _buildChunks(text);
    _chunkCache.delete(paraIdx);
    const voice = nextVoice();
    let ci = 0;
    if (startChar > 0) { for (let i = chunks.length - 1; i >= 0; i--) { if (chunks[i].s <= startChar) { ci = i; break; } } }
    const cut0 = startChar > 0 ? Math.max(0, startChar - chunks[ci].s) : 0;
    let lastSpeakableIdx = chunks.length - 1;
    while (lastSpeakableIdx >= ci) {
      const { t: raw } = chunks[lastSpeakableIdx], cut = lastSpeakableIdx === ci ? cut0 : 0;
      if ((cut > 0 ? raw.slice(cut) : raw).trim()) break;
      lastSpeakableIdx--;
    }
    if (lastSpeakableIdx < ci) { S.tts.queuedUpTo = paraIdx; this._queuePara(epoch, paraIdx + 1, 0); return; }
    let speakCount = 0;
    for (let i = ci; i < chunks.length; i++) {
      const { t: raw, s: abs } = chunks[i], cut = i === ci ? cut0 : 0, spoken = (cut > 0 ? raw.slice(cut) : raw).trim();
      if (!spoken) continue;
      const isFirst = speakCount === 0, isLast = i === lastSpeakableIdx;
      const capParaIdx = paraIdx, capAbs = abs, capCut = cut, capRaw = raw;
      const u = new SpeechSynthesisUtterance(spoken);
      if (voice) u.voice = voice; u.rate = S.tts.rate; u.lang = 'en-US';
      u.onstart = () => {
        if (S.tts.epoch !== epoch) return;
        S.tts.lastActivityAt = Date.now();
        if (isFirst) {
          S.tts.index = capParaIdx; S.voices.cur = voice;
          highlightParagraphInDOM(capParaIdx);
          if (S.ui.voiceEl && voice) S.ui.voiceEl.textContent = voiceShort(voice);
          Bar.update();
        }
        clearInterval(S.tts.heartbeat);
        S.tts.heartbeat = setInterval(() => { if (speechSynthesis.speaking) { speechSynthesis.pause(); speechSynthesis.resume(); } }, 3500);
      };
      u.onboundary = e => {
        if (S.tts.epoch !== epoch || e.name !== 'word') return;
        S.tts.lastActivityAt = Date.now();
        const a = capAbs + capCut + e.charIndex; S.tts.lastBoundaryChar = a;
        hlWord(S.paras[S.tts.index], a, e.charLength || 1);
      };
      u.onend = () => {
        if (S.tts.epoch !== epoch) return;
        S.tts.lastBoundaryChar = capAbs + capRaw.length;
        if (isLast) {
          clearInterval(S.tts.heartbeat); S.tts.heartbeat = null;
          clearWordHL();
          const nextFetch = S.tts.queuedUpTo + 1;
          const batchIdxs = [];
          for (let b = nextFetch; b <= nextFetch + PARA_LOOKAHEAD && b < S.texts.length; b++) if (S.texts[b] && !_chunkCache.has(b)) batchIdxs.push(b);
          if (batchIdxs.length) _prefetchChunks(batchIdxs);
          TTS._queuePara(epoch, nextFetch, 0);
          if (capParaIdx >= S.tts.lastParaIdx) {
            setTimeout(() => { if (S.tts.epoch === epoch && S.ttsState === TS_PLAYING && !speechSynthesis.speaking && !speechSynthesis.pending) TTS._finish(epoch); }, 300);
          }
        }
      };
      u.onerror = e => {
        clearInterval(S.tts.heartbeat); S.tts.heartbeat = null;
        if (e.error === 'interrupted' || S.tts.epoch !== epoch) return;
        setTimeout(() => { if (S.tts.epoch === epoch && S.ttsState === TS_PLAYING) TTS.start(capParaIdx, S.tts.lastBoundaryChar || capAbs); }, 200);
      };
      speechSynthesis.speak(u); speakCount++;
    }
    S.tts.queuedUpTo = paraIdx;
  },

  _finish(epoch) {
    if (S.tts.epoch !== epoch) return;
    Object.assign(S.tts, { index: 0, charOffset: 0, lastBoundaryChar: 0, queuedUpTo: -1 });
    S.voices.cur = null; S.ttsState = TS_IDLE; clearParaHL(); this._clearTimers(); _stopBgAudio();
    document.body.classList.remove('nr-tts-active');
    Bar.update(); this._sendState(); this._checkAutoNext();
  },

  _clearTimers() {
    const intervals = new Set(['bgKA', 'heartbeat', 'watchdog', 'statsInterval']);
    ['bgKA','heartbeat','watchdog','statsTimer','statsInterval','rateTimer','hlSyncTimer'].forEach(k => {
      if (S.tts[k] == null) return;
      intervals.has(k) ? clearInterval(S.tts[k]) : clearTimeout(S.tts[k]);
      S.tts[k] = null;
    });
  },

  _checkAutoNext() {
    if (!S.autoNextChapter) return;
    const url = findChapter('next'); if (!url) return;
    this.stop();
    if (S.forceTTS) { try { sessionStorage.setItem('nr_chain_play_active', '1'); sessionStorage.setItem('nr_chain_play_immersive', S.readerState === RS_OPEN ? '1' : '0'); } catch {} }
    if (S.autoAiNextPage) { try { sessionStorage.setItem('nr_chain_ai_active', '1'); } catch {} }
    setTimeout(() => { location.href = url; }, 300);
  },

  _sendState() {
    try { chrome.runtime.sendMessage({ from: 'content', state: S.ttsState === TS_PLAYING ? 'playing' : (S.tts.hasSaved ? 'stopped' : 'idle'), rmActive: S.readerState === RS_OPEN, idx: S.tts.index, paras: S.paras.length }); } catch {}
  },
};

// ── BACKGROUND AUDIO KEEPALIVE ────────────────────────────────────────────────
let _bgAudioCtx = null, _bgAudioSrc = null;
function _startBgAudio() {
  if (_bgAudioCtx) return;
  try {
    _bgAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = _bgAudioCtx.createBuffer(1, 1, 22050);
    _bgAudioSrc = _bgAudioCtx.createBufferSource();
    _bgAudioSrc.buffer = buf; _bgAudioSrc.loop = true;
    _bgAudioSrc.connect(_bgAudioCtx.destination); _bgAudioSrc.start(0);
  } catch { _bgAudioCtx = null; _bgAudioSrc = null; }
}
function _stopBgAudio() {
  try { _bgAudioSrc?.stop(); } catch {}
  try { _bgAudioCtx?.close(); } catch {}
  _bgAudioCtx = null; _bgAudioSrc = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (S.ttsState === TS_PLAYING) {
      _startBgAudio();
      S.tts.bgKA = setInterval(() => {
        if (speechSynthesis.paused) speechSynthesis.resume();
        if (S.ttsState === TS_PLAYING && !speechSynthesis.speaking && !speechSynthesis.pending) TTS.start(S.tts.index, S.tts.lastBoundaryChar || 0);
      }, 500);
    }
  } else {
    clearInterval(S.tts.bgKA); S.tts.bgKA = null; _stopBgAudio();
    if (S.ttsState === TS_PLAYING && speechSynthesis.paused) speechSynthesis.resume();
  }
});
window.addEventListener('beforeunload', () => TTS.stop());
window.addEventListener('pagehide', e => { if (!e.persisted) TTS.stop(); });

let _winScrollRAF = null;
window.addEventListener('scroll', () => {
  if (S.readerState === RS_OPEN || S.aiOverlayOpen) return;
  if (_winScrollRAF) return;
  _winScrollRAF = requestAnimationFrame(() => {
    _winScrollRAF = null;
    S.scrollPct = Math.min(1, (window.scrollY || 0) / _cachedPageScrollable);
    if (S.ui.progEl) S.ui.progEl.style.transform = `scaleX(${S.scrollPct})`;
  });
}, { passive: true });

// ── CHAPTER NAVIGATION ────────────────────────────────────────────────────────
const _chapterCache = { url: '', next: undefined, prev: undefined };
function findChapter(dir) {
  if (_chapterCache.url !== location.href) { _chapterCache.url = location.href; _chapterCache.next = undefined; _chapterCache.prev = undefined; }
  if (_chapterCache[dir] !== undefined) return _chapterCache[dir];
  const isNext = dir === 'next';
  const relNode = document.querySelector(`link[rel="${isNext ? 'next' : 'prev'}"],a[rel="${isNext ? 'next' : 'prev'}"]`);
  if (relNode?.href && relNode.href !== location.href) { _chapterCache[dir] = relNode.href; return relNode.href; }
  const regex = isNext ? /(next|forward|>>|›|next\s+chapter|chapter\s+>)/i : /(prev|previous|back|<<|‹|previous\s+chapter|<\s+chapter)/i;
  for (const a of document.querySelectorAll('a')) {
    if ((regex.test(a.textContent) || regex.test(a.className) || regex.test(a.getAttribute('aria-label') || '')) && a.href && !a.href.includes('javascript:') && a.href !== location.href) { _chapterCache[dir] = a.href; return a.href; }
  }
  _chapterCache[dir] = null; return null;
}
function goChapter(dir) {
  TTS.stop(); if (S.readerState === RS_OPEN) readerDeactivate();
  const url = findChapter(dir); if (url) location.href = url; else console.warn('Nocturne: no', dir, 'chapter found.');
}

// ── ARTICLE EXTRACTION ────────────────────────────────────────────────────────
async function extractCleanArticle() {
  let best = null;
  for (const sel of ['article','[role="main"]','main','.post-content','.entry-content','.article-body','.story-body','#main-content','.main-content']) {
    const el = document.querySelector(sel); if (el && (el.textContent || '').trim().length > 300) { best = el; break; }
  }
  if (!best) {
    const scores = new Map();
    document.querySelectorAll('p').forEach(p => { if ((p.textContent || '').trim().length > 20) scores.set(p.parentElement, (scores.get(p.parentElement) || 0) + 1); });
    const top = [...scores.entries()].sort((a, b) => b[1] - a[1]); if (top.length) best = top[0][0];
  }
  if (!best) {
    const score = el => (el.textContent || '').trim().split(/\s+/).length + el.querySelectorAll('p').length * 10 - el.querySelectorAll('a').length * 3;
    const cands = Array.from(document.querySelectorAll('div,section')).map(el => ({ el, s: score(el) })).sort((a, b) => b.s - a.s);
    best = cands.length && cands[0].s > 150 ? cands[0].el : document.body;
  }
  const clean = best.cloneNode(true);
  await yieldMain();
  clean.querySelectorAll('script,style,noscript,iframe,nav,header,footer,aside,form,button,input,select,textarea,dialog,canvas,svg,[class*="sidebar"],[id*="sidebar"],[class*="comment"],[id*="comment"],[class*="menu"],[class*="nav"],[class*="ad-"],[id*="ad-"],[class*="social"],[class*="cookie"],[class*="widget"],[class*="related"],[class*="share"],[class*="popup"],[class*="modal"],[class*="banner"],[class*="subscribe"],[class*="newsletter"]').forEach(el => el.remove());
  await yieldMain();
  const KEEP = new Set(['src','srcset','href','alt','title','poster','width','height','colspan','rowspan']);
  const STRUCT = new Set(['IMG','VIDEO','PICTURE','SOURCE','AUDIO','A','FIGURE','FIGCAPTION','TABLE','THEAD','TBODY','TR','TD','TH','BR','HR']);
  clean.querySelectorAll('*').forEach(el => {
    for (let i = el.attributes.length - 1; i >= 0; i--) { const a = el.attributes[i]; if (!KEEP.has(a.name.toLowerCase())) el.removeAttribute(a.name); }
    if (el.tagName === 'IMG') { el.setAttribute('loading', 'lazy'); el.setAttribute('decoding', 'async'); }
    if (!STRUCT.has(el.tagName) && !(el.innerHTML || '').trim() && !el.querySelector('img,video,audio')) el.remove();
  });
  const NAV_EXACT = /^(next(\s+chapter)?|previous\s+chapter|prev(\s+chapter)?|read\s+again|next\s+page|previous\s+page|table\s+of\s+contents?|back\s+to\s+top|go\s+back|home|index|toc|continue\s+reading|start\s+reading|chapter\s+list|more\s+chapters?|load\s+more|show\s+more|comments?|share|follow|subscribe|sign\s+in|log\s+in|advertisement|sponsored)$/i;
  const NAV_CONT = /\b(next\s+chapter|previous\s+chapter|prev\s+chapter|read\s+again|next\s+page|prev\s+page|table\s+of\s+contents|back\s+to\s+top)\b/i;
  const ARROW = /^[\u2190-\u21FF\u00AB\u00BB\u2039\u203A«»›‹→←⟨⟩<>|]+\s*(\w{0,10})?$/;
  const NUM   = /^[\d\s.,\-–—\/\\|]+$/;
  const isJunk = el => {
    const t = (el.textContent || '').trim(); if (!t) return true;
    const wc = t.split(/\s+/).filter(Boolean).length;
    if (ARROW.test(t) || NUM.test(t) || NAV_EXACT.test(t)) return true;
    if (NAV_CONT.test(t) && wc <= 6) return true;
    if (wc <= 4 && !/\b(the|a|an|is|was|are|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can)\b/i.test(t)) return true;
    return false;
  };
  const walker = document.createTreeWalker(clean, NodeFilter.SHOW_ELEMENT, { acceptNode: n => {
    if (['P','H1','H2','H3','H4','H5','H6','LI','DT','DD','BLOCKQUOTE','FIGCAPTION'].includes(n.tagName)) return NodeFilter.FILTER_ACCEPT;
    if (['DIV','SECTION','SPAN'].includes(n.tagName) && ![...n.children].some(c => ['P','H1','H2','H3','H4','H5','LI','DIV','SECTION'].includes(c.tagName)) && (n.textContent || '').trim().length > 0) return NodeFilter.FILTER_ACCEPT;
    return NodeFilter.FILTER_SKIP;
  }});
  const blocks = []; let node; while ((node = walker.nextNode())) blocks.push(node);
  const depth = Math.min(12, Math.floor(blocks.length * 0.12)); let removed = 0;
  for (let i = 0; i < blocks.length && removed < depth; i++) { if (isJunk(blocks[i])) { blocks[i].remove(); removed++; } else break; }
  removed = 0;
  for (let i = blocks.length - 1; i >= 0 && removed < depth; i--) { if (!blocks[i].isConnected) continue; if (isJunk(blocks[i])) { blocks[i].remove(); removed++; } else break; }
  return clean;
}

// ── TEXT PROCESSING ───────────────────────────────────────────────────────────
async function applyBionic(el) {
  if (!el || el.querySelector('.rfb') || el._nrBionicInProgress) return;
  el._nrBionicInProgress = true;
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => /\S/.test(n.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
  const nodes = []; let nd; while ((nd = tw.nextNode())) nodes.push(nd);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]; if (['SCRIPT','STYLE','CODE','PRE'].includes(node.parentElement?.tagName)) continue;
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(chunk => {
      if (/^\s*$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
      const cut = Math.max(1, Math.ceil(chunk.length * 0.5));
      const b = document.createElement('b'); b.className = 'rfb'; b.textContent = chunk.slice(0, cut);
      frag.appendChild(b); frag.appendChild(document.createTextNode(chunk.slice(cut)));
    });
    node.parentNode.replaceChild(frag, node); if ((i + 1) % YIELD_EVERY === 0) await yieldMain();
  }
  el._nrBionicInProgress = false;
}
function removeBionic(el) { if (!el) return; el.querySelectorAll('.rfb').forEach(b => b.parentNode?.replaceChild(document.createTextNode(b.textContent), b)); el.normalize(); }
function toggleBionic() {
  const t = S.readerState === RS_OPEN ? S.ui.article : getScanTarget(); if (!t) return;
  if (S.RS.bionic && !S.bionicDone) { applyBionic(t); t.classList.add('rf-bionic'); S.bionicDone = true; }
  else if (!S.RS.bionic && S.bionicDone) { removeBionic(t); t.classList.remove('rf-bionic'); S.bionicDone = false; }
}

function getScanTarget() {
  if (S.readerState === RS_OPEN && S.ui.article) return S.ui.article;
  for (const s of ['article','[role="main"]','main','.post-content','.entry-content']) { const el = document.querySelector(s); if (el && (el.textContent || '').length > 200) return el; }
  return document.body;
}
function updateScanStyles() {
  document.documentElement.style.setProperty('--ss-fc', S.RS.scanFirstColor || '#fbbf24');
  document.documentElement.style.setProperty('--ss-lc', S.RS.scanLastColor || '#fb7185');
}
function applyScanSkim() {
  updateScanStyles(); const t = getScanTarget(); if (!t) return;
  t.querySelectorAll('[data-ss-orig]').forEach(el => { el.innerHTML = el.getAttribute('data-ss-orig'); el.removeAttribute('data-ss-orig'); });
  if (!S.RS.scanSkim) return;
  Array.from(t.querySelectorAll('p')).forEach(p => {
    const text = (p.textContent || '').trim(); if (text.length < 40 || p.closest('#nr-bar,#readfy-overlay #rf-prog')) return;
    const sents = (text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || []).filter(Boolean); if (sents.length < 2) return;
    p.setAttribute('data-ss-orig', p.innerHTML);
    if (S.RS.superSkim && sents.length >= 3) p.innerHTML = `<span class="ss-first">${esc(sents[0])}</span> <span class="ss-last">${esc(sents[sents.length - 1])}</span>`;
    else p.innerHTML = `<span class="ss-first">${esc(sents[0])}</span> ${esc(sents.slice(1, -1).join(' '))} <span class="ss-last">${esc(sents[sents.length - 1])}</span>`;
  });
}

const NOUN_RE_SUFFIX  = /(?<=[.!?\s]|^)([A-Za-z]+(?:tion|ment|ness|ity|ance|ence|dom|ship|hood|age|ism|ery))\b/gi;
const NOUN_RE_CAPITAL = /(?<=\s)([A-Z][a-z]{2,})(?=\s)/g;
function applyNounHighlight() {
  const t = getScanTarget(); if (!t) return;
  document.documentElement.style.setProperty('--nr-noun-col', S.RS.nounColor || '#a78bfa');
  if (nounHL) {
    nounHL.clear(); const tw = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); let node;
    while ((node = tw.nextNode())) {
      const el = node.parentElement; if (!el || ['SCRIPT','STYLE','CODE','PRE'].includes(el.tagName) || el.closest('#nr-bar,#readfy-overlay #rf-prog')) continue;
      for (const re of [NOUN_RE_SUFFIX, NOUN_RE_CAPITAL]) { re.lastIndex = 0; let m; while ((m = re.exec(node.textContent)) !== null) { try { const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length); nounHL.add(r); } catch {} } }
    }
    return;
  }
  Array.from(t.querySelectorAll('p')).forEach(p => {
    if (p.hasAttribute('data-nr-noun-orig') || p.querySelector('.nr-noun') || p.closest('#nr-bar')) return;
    p.setAttribute('data-nr-noun-orig', p.innerHTML);
    const tw = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); const tns = []; let n; while ((n = tw.nextNode())) tns.push(n);
    tns.forEach(tn => {
      if (['SCRIPT','STYLE','CODE','PRE'].includes(tn.parentElement?.tagName)) return;
      const html = tn.textContent
        .replace(/(?<=[.!?]\s|^|\s(?:the|a|an|this|that|these|those|my|your|his|her|its|our|their)\s)([A-Za-z]+(?:tion|ment|ness|ity|ance|ence|dom|ship|hood|age|ism|ery))\b/gi, '<span class="nr-noun">$1</span>')
        .replace(/(?<!\.\s*)(?<=\s)([A-Z][a-z]{2,})(?=\s)/g, '<span class="nr-noun">$1</span>');
      if (html !== tn.textContent) { const w = document.createElement('span'); w.innerHTML = html; tn.parentNode.replaceChild(w, tn); }
    });
  });
}
function removeNounHighlight() {
  nounHL?.clear();
  const t = getScanTarget(); if (!t) return;
  t.querySelectorAll('[data-nr-noun-orig]').forEach(p => { p.innerHTML = p.getAttribute('data-nr-noun-orig'); p.removeAttribute('data-nr-noun-orig'); });
  t.querySelectorAll('.nr-noun').forEach(el => el.parentNode?.replaceChild(document.createTextNode(el.textContent), el));
}
const toggleNounHL = () => S.RS.nounHighlight ? applyNounHighlight() : removeNounHighlight();

// ── WORD REPLACE ──────────────────────────────────────────────────────────────
const smartCase = (orig, rep) => { if (!orig || !rep) return rep; if (orig === orig.toUpperCase()) return rep.toUpperCase(); if (orig[0] === orig[0].toUpperCase()) return rep[0].toUpperCase() + rep.slice(1); return rep.toLowerCase(); };
async function applyPairs(pairs, root) {
  if (!root || !pairs.length) return;
  const groups = new Map();
  pairs.forEach(pair => {
    if (!pair.find) return;
    const mc = !!pair.matchCase, ww = !!pair.wholeWord, key = `${mc}|${ww}`;
    if (!groups.has(key)) groups.set(key, { mc, ww, dict: Object.create(null), parts: [] });
    const g = groups.get(key), nf = pair.find.trim().replace(/\s+/g, ' ');
    g.parts.push(nf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
    g.dict[mc ? nf : nf.toLowerCase()] = { rep: pair.replace ?? '', pc: !!pair.preserveCase };
  });
  for (const { mc, ww, dict, parts } of groups.values()) {
    if (!parts.length) continue;
    const flags = mc ? 'g' : 'gi', wbs = ww ? '(?<!\\w)' : '', wbe = ww ? '(?!\\w)' : '';
    const rxs = []; for (let s = 0; s < parts.length; s += CHUNK_SIZE) rxs.push(new RegExp(wbs + '(' + parts.slice(s, s + CHUNK_SIZE).join('|') + ')' + wbe, flags));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false); let node, n = 0;
    while ((node = walker.nextNode())) {
      const val = node.nodeValue; if (!val.trim()) continue;
      let cur = val, changed = false;
      for (const rx of rxs) { rx.lastIndex = 0; if (!rx.test(cur)) continue; rx.lastIndex = 0; cur = cur.replace(rx, m => { const nm = m.replace(/\s+/g, ' '), e = dict[mc ? nm : nm.toLowerCase()]; return e ? (e.pc ? smartCase(m, e.rep) : e.rep) : m; }); changed = true; }
      if (changed) node.nodeValue = cur;
      if (++n % YIELD_EVERY === 0) await yieldMain();
    }
  }
}
function fireReplace(onBody) {
  chrome.storage.local.get(['AR_replace'], res => {
    const pairs = ((res.AR_replace?.lists) || []).flatMap(l => l.enabled === false ? [] : (l.pairs || []).filter(p => p?.find));
    if (!pairs.length) { if (onBody) _liftTurboAndHydrate(); return; }
    applyPairs(pairs, onBody ? document.body : document.getElementById('readfy-overlay')).then(() => {
      if (S.standardNodes.length) resnapTexts();
      if (onBody) _liftTurboAndHydrate();
    });
  });
}
function _getReplacePairs(res) {
  return ((res.AR_replace?.lists) || []).flatMap(l => l.enabled === false ? [] : (l.pairs || []).filter(p => p?.find));
}

// ── TURBO LIFT ────────────────────────────────────────────────────────────────
let _turboLifted = false;
function hydrateBackgroundPage() {
  const ts = Date.now();
  const stampUrl = href => { try { const u = new URL(href, location.href); u.searchParams.set('_nrt', ts); return u.toString(); } catch { return href; } };

  // Images — timestamp forces a new network request even if the blocked
  // response left a stale cache entry
  document.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
    img.src = stampUrl(img.src);
  });

  // <source> elements inside <picture> and <video>
  document.querySelectorAll('source[src]').forEach(s => {
    const src = s.getAttribute('src');
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
    s.src = stampUrl(s.src);
  });
  document.querySelectorAll('source[srcset],img[srcset]').forEach(el => {
    const ss = el.getAttribute('srcset'); if (!ss) return;
    el.setAttribute('srcset', ss.replace(/(\S+)/g, part => part.includes(',') ? part : stampUrl(part)));
  });

  // Stylesheets — reload with timestamp so @font-face and all rules re-apply
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
    link.href = stampUrl(link.getAttribute('href'));
  });

  // Font preloads
  document.querySelectorAll('link[rel="preload"][as="font"][href]').forEach(link => {
    link.href = stampUrl(link.getAttribute('href'));
  });

  // Videos blocked at the media level
  document.querySelectorAll('video[src]').forEach(v => {
    const src = v.getAttribute('src'); if (!src) return;
    v.src = stampUrl(v.src); v.load();
  });
  document.querySelectorAll('video:not([src])').forEach(v => v.load());
}
function _liftTurboAndHydrate() {
  if (_turboLifted) return;
  _turboLifted = true;
  try { chrome.runtime.sendMessage({ type: 'NR_LIFT_TURBO' }); } catch {}
  setTimeout(hydrateBackgroundPage, 500);
}

// ── AI OVERLAY ────────────────────────────────────────────────────────────────
const isAiOverlayActive = () => S.aiOverlayOpen;

function snapAiParasToTTS() {
  const o = document.getElementById('nr-ai-overlay'); if (!o) return;
  const nodes = Array.from(o.querySelectorAll('p,h1,h2,h3')).filter(el => (el.textContent || '').trim().length > 5);
  S.paras = nodes; S.texts = nodes.map(el => (el.textContent || '').trim());
  S.wordCount = S.texts.join(' ').split(/\s+/).filter(Boolean).length;
}

function _closeAiOverlay(overlay) {
  overlay.classList.remove('ai-active');
  S.aiOverlayOpen = false; S.scrollPct = 0;
  TTS.stop();
  if (S.ui.progEl) S.ui.progEl.style.transform = 'scaleX(0)';
  setTimeout(() => { overlay.style.display = 'none'; }, 500);
  document.documentElement.classList.remove('nr-ai-open');
  _updateAiBarBtn(false);
  S.parasStale = true; S.paras = S.standardNodes; extractParas();
  _liftTurboAndHydrate();
}

async function toggleAiOverlay() {
  let overlay = document.getElementById('nr-ai-overlay');
  if (overlay && overlay.classList.contains('ai-active')) { _closeAiOverlay(overlay); return; }

  if (!overlay) {
    overlay = document.createElement('div'); overlay.id = 'nr-ai-overlay';
    overlay.innerHTML = `<div class="nr-ai-container" id="nr-ai-content"></div><div class="nr-ai-footer"><button class="nr-ai-close-btn" id="nr-ai-regen" title="Regenerate">↺</button><button class="nr-ai-close-btn" id="nr-ai-close" title="Close AI">✕</button></div>`;
    document.body.appendChild(overlay);
    document.getElementById('nr-ai-close').addEventListener('click', () => _closeAiOverlay(overlay));
    document.getElementById('nr-ai-regen').addEventListener('click', () => { S.aiContentCache = null; _closeAiOverlay(overlay); setTimeout(() => toggleAiOverlay(), 550); });
    let _aiScrollRAF = null;
    overlay.addEventListener('scroll', () => {
      if (_aiScrollRAF) return;
      _aiScrollRAF = requestAnimationFrame(() => {
        _aiScrollRAF = null;
        const pct = Math.min(1, overlay.scrollTop / Math.max(1, _cachedAiScrollable));
        S.scrollPct = pct;
        if (S.ui.progEl) S.ui.progEl.style.transform = `scaleX(${pct})`;
        Bar.updateInfo();
      });
    }, { passive: true });
    if (_aiResizeObs) _aiResizeObs.disconnect();
    _aiResizeObs = new ResizeObserver(() => { _cachedAiScrollable = Math.max(1, overlay.scrollHeight - overlay.clientHeight); });
    _aiResizeObs.observe(overlay);
  }

  _applyOverlayStyle(overlay);
  document.documentElement.style.setProperty('--nr-sb-width', Math.max(0, window.innerWidth - document.documentElement.clientWidth) + 'px');
  document.documentElement.classList.add('nr-ai-open');
  S.aiOverlayOpen = true; S.scrollPct = 0;
  overlay.style.display = 'block';
  applyTextureDensity(S.RS.textureDensity || 0);
  const barEl = S.ui.bar; if (barEl?.parentNode) barEl.parentNode.appendChild(barEl);
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('ai-active')));
  _updateAiBarBtn(true); Bar.update();

  const content = document.getElementById('nr-ai-content');
  if (S.aiContentCache) { content.innerHTML = S.aiContentCache; snapAiParasToTTS(); return; }
  content.innerHTML = '<p class="nr-ai-status" style="opacity:.55;font-size:12px;text-align:center;padding:20px">⏳ Rewriting — 4 parts in parallel…</p>';

  let fullText = [];
  if (S.immersiveNodes.some(Boolean)) fullText = S.immersiveNodes.filter(Boolean).map(el => (el.textContent || '').trim()).filter(t => t.length > 20);
  if (!fullText.length) { if (!S.standardNodes.length) { S.parasStale = true; extractParas(); } fullText = S.standardNodes.filter(Boolean).map(el => (el.textContent || '').trim()).filter(t => t.length > 20); }
  if (!fullText.length) {
    try { const cleanNode = await extractCleanArticle(); fullText = Array.from(cleanNode.querySelectorAll('p,h1,h2,h3,li')).map(el => (el.textContent || '').trim()).filter(t => t.length > 20); } catch (e) { console.warn('[Nocturne AI] extractCleanArticle failed:', e); }
  }
  if (!fullText.length) fullText = Array.from(document.querySelectorAll('p,h1,h2,h3,li')).filter(el => !el.closest('#nr-bar,#readfy-overlay,#nr-ai-overlay')).map(el => (el.textContent || '').trim()).filter(t => t.length > 20);
  if (!fullText.length) { content.innerHTML = '<p style="color:#fb7185;" class="nr-ai-status">No readable text found on this page.</p>'; return; }

  const totalChars = fullText.reduce((s, t) => s + t.length, 0), targetChars = Math.ceil(totalChars / 4);
  const parts = [[], [], [], []]; let chunkIdx = 0, cumChars = 0;
  for (const t of fullText) { if (chunkIdx < 3 && cumChars >= targetChars * (chunkIdx + 1)) chunkIdx++; parts[chunkIdx].push(t); cumChars += t.length; }
  const joinPart = arr => arr.join('\n\n');

  const payloads = parts.map(p => p.length ? joinPart(p) : '');

  // Pre-insert one slot div per chunk so results render in reading order
  // regardless of which key returns first
  content.innerHTML = '';
  const slots = payloads.map((_, i) => {
    const d = document.createElement('div'); d.id = `nr-ai-slot-${i}`; content.appendChild(d); return d;
  });

  const sendChunk = (payload, slot) => new Promise(resolve => {
    if (!payload) { resolve({ ok: false, slot }); return; }
    try {
      chrome.runtime.sendMessage({ type: 'NR_AI_CHUNK', payload, slot }, r => {
        if (chrome.runtime.lastError) { resolve({ ok: false, slot }); return; }
        resolve(r || { ok: false, slot });
      });
    } catch { resolve({ ok: false, slot }); }
  });

  await Promise.allSettled(payloads.map((payload, slot) =>
    sendChunk(payload, slot).then(res => {
      const slotEl = slots[slot];
      if (res?.ok && res.html) {
        slotEl.innerHTML = res.html.replace(/^```(?:html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      } else if (payload) {
        slotEl.innerHTML = parts[slot].map(t => `<p>${t}</p>`).join('\n');
      }
      if (slot === 0) snapAiParasToTTS();
    })
  ));
  slots.forEach(d => { if (!d.innerHTML.trim()) d.remove(); });
  if (!content.innerHTML.trim()) content.innerHTML = fullText.map(t => `<p>${t}</p>`).join('\n');

  S.aiContentCache = content.innerHTML || null;
  chrome.storage.local.get(['AR_replace'], res => {
    const pairs = _getReplacePairs(res);
    if (pairs.length) applyPairs(pairs, overlay).then(() => { if (isAiOverlayActive()) { snapAiParasToTTS(); S.aiContentCache = content.innerHTML; } });
  });
  snapAiParasToTTS();
  if (S.forceTTS && S.ttsState !== TS_PLAYING) setTimeout(() => { loadVoices(); TTS.start(findFirstContent(S.paras)); }, 400);
}

// ── FLOATING AI WINDOW ────────────────────────────────────────────────────────
function _nrPageText(maxChars) {
  const MAX = maxChars || 12000;
  const src = document.getElementById('nr-reader-content') || document.body;
  let text = Array.from(src.querySelectorAll('p,h1,h2,h3,li,blockquote'))
    .filter(el => !el.closest('#nr-bar,#readfy-overlay,#nr-ai-overlay,#nr-ai-floating,#nr-sel-tooltip'))
    .map(el => (el.textContent || '').trim()).filter(t => t.length > 20).join('\n\n');
  if (text.length > MAX) text = text.slice(0, MAX) + '\n\n[… article continues …]';
  return text;
}

const NrFloat = (() => {
  let el = null;
  const ctx = { text: '', history: [] };

  function build() {
    if (el) return;
    el = document.createElement('div'); el.id = 'nr-ai-floating';
    el.innerHTML = `
      <div class="nr-float-header" id="nr-float-hdr">
        <span><span class="nr-float-title" id="nr-float-title">✨ Nocturne AI</span><span class="nr-float-label" id="nr-float-label"></span></span>
        <button class="nr-float-close" id="nr-float-close" title="Close">✕</button>
      </div>
      <div class="nr-float-body" id="nr-float-body"><span class="nr-float-status">Ready.</span></div>
      <div class="nr-float-footer">
        <div class="nr-float-actions">
          <button class="nr-float-action-btn" id="nr-float-deeper">💡 Go deeper</button>
          <button class="nr-float-action-btn" id="nr-float-simpler">🐣 Simpler</button>
          <button class="nr-float-action-btn" id="nr-float-bullet">📋 Bullet points</button>
        </div>
        <div class="nr-float-input-row">
          <input class="nr-float-inp" id="nr-float-inp" placeholder="Ask a follow-up question…" autocomplete="off">
          <button class="nr-float-send" id="nr-float-send" title="Send">↑</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#nr-float-close').addEventListener('click', close);
    const submit = () => { const inp = el.querySelector('#nr-float-inp'), q = (inp?.value || '').trim(); if (!q) return; inp.value = ''; ask(q); };
    el.querySelector('#nr-float-send').addEventListener('click', submit);
    el.querySelector('#nr-float-inp').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    el.querySelector('#nr-float-deeper').addEventListener('click', () => ask('Elaborate further on these key ideas. Provide more detail, nuance, and real-world examples.'));
    el.querySelector('#nr-float-simpler').addEventListener('click', () => ask('Re-explain the previous answer using even simpler language and shorter sentences, as if for a complete beginner.'));
    el.querySelector('#nr-float-bullet').addEventListener('click', () => ask('Condense the previous answer into 5 concise bullet points.'));
    _makeDraggable(el, el.querySelector('#nr-float-hdr'));
  }

  function _makeDraggable(win, handle) {
    let ox = 0, oy = 0, dragging = false, winW = 0, winH = 0, elW = 0, elH = 0;
    handle.addEventListener('mousedown', e => { if (e.button !== 0) return; dragging = true; const r = win.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top; elW = r.width; elH = r.height; winW = window.innerWidth; winH = window.innerHeight; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); e.preventDefault(); });
    const onMove = e => { if (!dragging) return; win.style.right = 'auto'; win.style.bottom = 'auto'; win.style.left = Math.max(0, Math.min(winW - elW, e.clientX - ox)) + 'px'; win.style.top = Math.max(0, Math.min(winH - elH, e.clientY - oy)) + 'px'; };
    const onUp = () => { dragging = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }

  const _body      = () => el && el.querySelector('#nr-float-body');
  const _setLoad   = msg => { const b = _body(); if (b) b.innerHTML = `<span class="nr-float-status nr-float-loading">${msg || '⏳ Thinking…'}</span>`; };
  const _setContent = html => { const b = _body(); if (b) { b.innerHTML = html; b.scrollTop = 0; } };
  const _setTitle  = (title, label) => { const t = el?.querySelector('#nr-float-title'), l = el?.querySelector('#nr-float-label'); if (t) t.textContent = '✨ ' + (title || 'Nocturne AI'); if (l) l.textContent = label ? '— ' + label : ''; };

  async function _safeSend(msg) {
    try {
      if (!chrome?.runtime?.id) throw new Error('context invalidated');
      return await chrome.runtime.sendMessage(msg);
    } catch (e) {
      if (/context invalidated|extension context|receiving end/i.test(e.message)) return { ok: false, __contextLost: true, error: 'Extension was reloaded — please refresh the page to reconnect.' };
      throw e;
    }
  }

  function openWith(selectedText, title, label) {
    build(); ctx.text = selectedText || ''; ctx.history = [];
    _setTitle(title, label); el.classList.add('nr-float-open');
    if (!el.style.left) { el.style.right = '24px'; el.style.bottom = '24px'; }
    _setLoad('Generating…');
  }

  function close() { if (el) el.classList.remove('nr-float-open'); }

  async function ask(question) {
    if (!el) return;
    _setLoad('⏳ Thinking…'); ctx.history.push({ role: 'user', content: question });
    try {
      const res = await _safeSend({ type: 'NR_AI_CHAT', question, context: ctx.text, history: ctx.history.slice(-6) });
      if (res?.__contextLost) { _setContent(`<span class="nr-float-status">⚠️ ${res.error}</span>`); return; }
      if (res?.ok) { _setContent(res.html); ctx.history.push({ role: 'assistant', content: res.plain || '' }); }
      else _setContent(`<span class="nr-float-status">⚠️ ${res?.error || 'Unknown error'}</span>`);
    } catch (e) { _setContent(`<span class="nr-float-status">⚠️ ${e.message}</span>`); }
  }

  async function runAction(type, payload, titleLabel, titleSub) {
    build(); openWith(payload.text || payload.pageText || '', titleLabel, titleSub);
    try {
      const res = await _safeSend({ type, ...payload });
      if (res?.__contextLost) { _setContent(`<span class="nr-float-status">⚠️ ${res.error}</span>`); return res; }
      if (res?.ok) { _setContent(res.html); ctx.text = payload.text || payload.pageText || ''; }
      else _setContent(`<span class="nr-float-status">⚠️ ${res?.error || 'Unknown error'}</span>`);
      return res;
    } catch (e) { _setContent(`<span class="nr-float-status">⚠️ ${e.message}</span>`); return { ok: false, error: e.message }; }
  }

  return { build, openWith, close, ask, runAction };
})();

// ── SELECTION TOOLTIP ─────────────────────────────────────────────────────────
const NrTooltip = (() => {
  let el = null, talkPanel = null;
  const LEVEL_LABELS = { '5yo': '5-Year-Old', adult: 'Adult', expert: 'Expert', allknowing: 'All-Knowing Oracle' };
  const TALK_CHIPS = ['Summarize this', 'Is this accurate?', 'Give me more context', "What's the key argument?"];

  function build() {
    if (el) return;
    el = document.createElement('div'); el.id = 'nr-sel-tooltip';
    const subBtns = Object.entries(LEVEL_LABELS).map(([lv, lbl]) => `<button class="nr-tt-sub-btn" data-level="${lv}">${lbl}</button>`).join('');
    el.innerHTML = `
      <button class="nr-tt-btn" id="nr-tt-explain"><span class="nr-tt-btn-ico">🧠</span>Explain<span class="nr-tt-submenu">${subBtns}</span></button>
      <div class="nr-tt-sep"></div>
      <button class="nr-tt-btn" id="nr-tt-talk"><span class="nr-tt-btn-ico">💬</span>Talk</button>
      <div class="nr-tt-sep"></div>
      <button class="nr-tt-btn" id="nr-tt-translate"><span class="nr-tt-btn-ico">🌐</span>Translate</button>
      <div class="nr-tt-sep"></div>
      <button class="nr-tt-btn" id="nr-tt-define"><span class="nr-tt-btn-ico">📖</span>Define</button>
      <div id="nr-tt-talk-panel">
        <div class="nr-tt-chips" id="nr-tt-chip-row"></div>
        <div class="nr-tt-talk-row">
          <input class="nr-tt-talk-inp" id="nr-tt-talk-inp" placeholder="Ask about this text…" autocomplete="off">
          <button class="nr-tt-talk-go" id="nr-tt-talk-go">→</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    talkPanel = el.querySelector('#nr-tt-talk-panel');
    const chipRow = el.querySelector('#nr-tt-chip-row');
    TALK_CHIPS.forEach(chip => {
      const b = document.createElement('button'); b.className = 'nr-tt-chip'; b.textContent = chip;
      b.addEventListener('click', e => { e.stopPropagation(); const text = _getSel(); hide(); NrFloat.runAction('NR_AI_CHAT', { text, question: chip + '\n\nSelected text: ' + text }, 'Talk'); });
      chipRow.appendChild(b);
    });
    el.querySelector('.nr-tt-submenu').addEventListener('click', e => { const btn = e.target.closest('.nr-tt-sub-btn'); if (!btn) return; e.stopPropagation(); const level = btn.dataset.level, text = _getSel(); hide(); NrFloat.runAction('NR_AI_EXPLAIN', { text, level }, 'Explain', LEVEL_LABELS[level]); });
    el.querySelector('#nr-tt-talk').addEventListener('click', e => { e.stopPropagation(); talkPanel.classList.toggle('nr-tt-talk-open'); if (talkPanel.classList.contains('nr-tt-talk-open')) el.querySelector('#nr-tt-talk-inp')?.focus(); });
    const submitTalk = e => { if (e) e.stopPropagation(); const inp = el.querySelector('#nr-tt-talk-inp'), q = (inp?.value || '').trim(); if (!q) return; inp.value = ''; const text = _getSel(); hide(); NrFloat.openWith(text, 'Talk'); NrFloat.ask('Selected text: ' + text + '\n\nQuestion: ' + q); };
    el.querySelector('#nr-tt-talk-go').addEventListener('click', submitTalk);
    el.querySelector('#nr-tt-talk-inp').addEventListener('keydown', e => { if (e.key === 'Enter') submitTalk(e); });
    el.querySelector('#nr-tt-translate').addEventListener('click', e => { e.stopPropagation(); const text = _getSel(); hide(); NrFloat.runAction('NR_AI_TRANSLATE_SEL', { text }, 'Translate'); });
    el.querySelector('#nr-tt-define').addEventListener('click', e => { e.stopPropagation(); const text = _getSel(); hide(); NrFloat.runAction('NR_AI_DEFINE', { text }, 'Define', text.slice(0, 40)); });
    document.addEventListener('mousedown', e => { if (el && !el.contains(e.target)) hide(); }, true);
  }

  const _getSel = () => (window.getSelection()?.toString() || '').trim();

  function show(x, y) {
    build(); talkPanel?.classList.remove('nr-tt-talk-open');
    const inp = el.querySelector('#nr-tt-talk-inp'); if (inp) inp.value = '';
    const activeOv = (S.readerState === RS_OPEN && S.ui.overlay) ? S.ui.overlay : (S.aiOverlayOpen ? (document.getElementById('nr-ai-overlay') || null) : null);
    const host = activeOv || document.body;
    if (el.parentNode !== host) host.appendChild(el);
    el.classList.remove('nr-tt-open');
    el.style.left = x + 'px'; el.style.top = (y - 12) + 'px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add('nr-tt-open');
      const r = el.getBoundingClientRect(), PAD = 10;
      let tx = x, ty = y - r.height - 12;
      if (tx + r.width > window.innerWidth - PAD) tx = window.innerWidth - r.width - PAD;
      if (tx < PAD) tx = PAD;
      if (ty < PAD) ty = y + 28;
      el.style.left = tx + 'px'; el.style.top = ty + 'px';
    }));
  }

  function hide() { if (!el) return; el.classList.remove('nr-tt-open'); talkPanel?.classList.remove('nr-tt-talk-open'); }
  return { build, show, hide };
})();

document.addEventListener('mouseup', e => {
  if (e.target.closest && e.target.closest('#nr-sel-tooltip,#nr-ai-floating,#nr-bar')) return;
  setTimeout(() => { try { const sel = window.getSelection(), text = (sel?.toString() || '').trim(); if (!text || sel?.isCollapsed) { NrTooltip.hide(); return; } NrTooltip.show(e.clientX, e.clientY); } catch {} }, 12);
});
document.addEventListener('selectionchange', () => {
  try { const sel = window.getSelection(); if (!sel || sel.isCollapsed) setTimeout(() => { if (!(window.getSelection()?.toString() || '').trim()) NrTooltip.hide(); }, 250); } catch {}
});

// ── VELOCITY SCROLL ───────────────────────────────────────────────────────────
const VEL = {
  active: false, raf: null, anchorY: 0, anchorX: 0, curY: 0, _onMove: null, _onDown: null,
  start(y, x) { this.active = true; this.anchorY = y; this.anchorX = x; this.curY = y; this._onMove = e => { this.curY = e.clientY; if (!this.raf) this.raf = requestAnimationFrame(() => this._step()); }; this._onDown = () => this.stop(); document.addEventListener('mousemove', this._onMove, { passive: true }); document.addEventListener('mousedown', this._onDown, true); this._showCursor(true); if (!this.raf) this.raf = requestAnimationFrame(() => this._step()); },
  stop() { if (!this.active) return; this.active = false; if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; } if (this._onMove) document.removeEventListener('mousemove', this._onMove); if (this._onDown) document.removeEventListener('mousedown', this._onDown, true); this._onMove = this._onDown = null; this._showCursor(false); },
  _step() { if (!this.active) { this.raf = null; return; } const d = this.curY - this.anchorY; if (Math.abs(d) > 18) { const spd = (Math.abs(d) - 18) * 0.07 * (d > 0 ? 1 : -1), ov = S.readerState === RS_OPEN && S.ui.overlay; ov ? ov.scrollBy(0, spd) : window.scrollBy(0, spd); this.raf = requestAnimationFrame(() => this._step()); } else this.raf = null; },
  _showCursor(on) { let el = document.getElementById('__nr_vel'); if (!on) { el?.remove(); return; } if (!el) { el = document.createElement('div'); el.id = '__nr_vel'; document.body.appendChild(el); } el.style.left = this.anchorX + 'px'; el.style.top = this.anchorY + 'px'; },
};

// ── SCROLL LOCK ───────────────────────────────────────────────────────────────
function findSPAScrollEl() {
  const html = document.documentElement, body = document.body, st = getComputedStyle(html);
  if (html.scrollHeight > html.clientHeight + 50 && st.overflowY !== 'hidden' && st.overflowY !== 'clip') return null;
  let best = null, bestH = 0;
  document.querySelectorAll('body > *, body > * > *').forEach(el => {
    if (!el || el === html || el === body || el.id === 'readfy-overlay' || el.closest('#readfy-overlay')) return;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 50 && el.scrollHeight > bestH) { bestH = el.scrollHeight; best = el; }
  });
  return best;
}
function lockScroll() {
  document.documentElement.style.setProperty('--nr-sb-width', Math.max(0, window.innerWidth - document.documentElement.clientWidth) + 'px');
  document.documentElement.classList.add('nr-open');
  S.spa.el = findSPAScrollEl(); if (S.spa.el) { S.spa.origOverflow = S.spa.el.style.overflowY || ''; S.spa.el.classList.add('nr-spa-lock'); }
}
function unlockScroll() {
  document.documentElement.classList.remove('nr-open'); document.documentElement.style.removeProperty('--nr-sb-width');
  if (S.spa.el) { S.spa.el.classList.remove('nr-spa-lock'); S.spa.el.style.overflowY = S.spa.origOverflow; S.spa.el = null; S.spa.origOverflow = ''; }
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function _applyOverlayStyle(el) {
  el.setAttribute('data-theme', S.RS.theme || 'gemini');
  el.setAttribute('data-accent', S.RS.accent || 'teal');
  el.setAttribute('data-font',   S.RS.font || 'system');
  const acc = ACCENTS[S.RS.accent] || null;
  const vars = {
    '--rf-col-width': S.RS.width + '%',
    '--rf-font-size': Math.max(12, S.RS.fontSize) + 'px',
    '--rf-lh':        S.RS.lineHeight,
    '--rf-ls':        S.RS.letterSpacing + 'em',
    '--rf-ws':        S.RS.wordSpacing + 'em',
    '--rf-para-sp':   S.RS.paraSpacing + 'em',
    '--rf-align':     S.RS.textAlign || 'left',
    '--rf-pad-top':   S.RS.barPos === 'top' ? '52px' : '20px',
    '--rf-pad-bot':   '58px',
  };
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  if (acc) el.style.setProperty('--rf-acc', acc); else el.style.removeProperty('--rf-acc');
}

function applyStyles() {
  const acc = ACCENTS[S.RS.accent] || null;
  if (acc) document.documentElement.style.setProperty('--nr-acc', acc); else document.documentElement.style.removeProperty('--nr-acc');
  _barThemeInvalidate(); Bar.setTheme(); updateHLStyle(); updateScanStyles();
  if (S.aiOverlayOpen) { const aiOv = document.getElementById('nr-ai-overlay'); if (aiOv) _applyOverlayStyle(aiOv); }
  const ov = S.ui.overlay;
  if (ov) {
    _applyOverlayStyle(ov);
    if (S.RS.overlayBg) ov.style.background = S.RS.overlayBg; else ov.style.removeProperty('background');
  }
  applyTextureDensity(S.RS.textureDensity || 0);
}

function applyPageStyles() {
  let s = document.getElementById('__nr_pg'); if (!s) { s = document.createElement('style'); s.id = '__nr_pg'; document.documentElement.appendChild(s); }
  const RS = S.RS;
  const typo = `font-size:${Math.max(10, RS.fontSize)}px!important;line-height:${RS.lineHeight}!important;letter-spacing:${RS.letterSpacing}em!important;word-spacing:${RS.wordSpacing}em!important;text-align:${RS.textAlign || 'left'}!important`;
  s.textContent =
    `#readfy-overlay #nr-reader-content,#readfy-overlay #nr-reader-content p,#readfy-overlay #nr-reader-content li,#readfy-overlay #nr-reader-content blockquote{${typo}}` +
    `#nr-ai-overlay .nr-ai-container,#nr-ai-overlay .nr-ai-container p,#nr-ai-overlay .nr-ai-container h1,#nr-ai-overlay .nr-ai-container h2,#nr-ai-overlay .nr-ai-container h3,#nr-ai-overlay .nr-ai-container li{${typo}}` +
    `#readfy-overlay .nr-para,#nr-ai-overlay .nr-para{background:var(--nr-para-bg,rgba(96,165,250,.18))!important;box-shadow:0 0 0 2px var(--nr-para-bdr,rgba(96,165,250,.6))!important;border-radius:3px!important;transition:background .2s,box-shadow .2s!important}` +
    (RS.forceFontColor ? `#readfy-overlay,#readfy-overlay #nr-reader-content,#readfy-overlay #nr-reader-content *{color:${RS.forceFontColorVal || '#d4d0e8'}!important}` : '') +
    `.nr-noun{color:var(--nr-noun-col,#a78bfa)!important;font-style:italic}` +
    `body.nr-tts-active p:hover,body.nr-tts-active h1:hover,body.nr-tts-active h2:hover,body.nr-tts-active h3:hover,body.nr-tts-active li:hover{cursor:text!important;outline:1px dashed rgba(96,165,250,0.35)!important;border-radius:2px!important}`;
}

function applyTextureDensity(val) {
  const targets = [];
  if (S.ui.overlay) targets.push(S.ui.overlay);
  const aiOv = document.getElementById('nr-ai-overlay'); if (aiOv && S.aiOverlayOpen) targets.push(aiOv);
  if (!targets.length) return;
  if (!val || val <= 0) { targets.forEach(el => { el.style.backgroundImage = 'none'; }); return; }
  const t = val / 100, opacity = (0.02 + t * 0.13).toFixed(3), freq = (0.50 + t * 1.00).toFixed(3);
  const svg = `<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='noise'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#noise)' opacity='${opacity}'/></svg>`;
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  targets.forEach(el => { el.style.backgroundImage = url; });
}

// ── IMMERSIVE OVERLAY ─────────────────────────────────────────────────────────
async function buildOverlay() {
  S.parasStale = true; S.overlayUrl = location.href;
  const overlay = document.createElement('div'); overlay.id = 'readfy-overlay';
  const wrap = document.createElement('div'); wrap.id = 'rf-content-wrap';
  const article = document.createElement('div'); article.id = 'nr-reader-content';
  const cleanNode = await extractCleanArticle(); cleanNode.className = 'nocturne-clean-article';
  article.appendChild(cleanNode);
  S.wordCount = (article.textContent || '').trim().split(/\s+/).filter(Boolean).length;
  const chNav = document.createElement('div');
  chNav.style.cssText = 'display:flex;gap:14px;justify-content:center;padding:24px 0 10px;margin-top:22px;border-top:1px solid rgba(128,128,128,0.12)';
  const mkCh = (txt, dir) => {
    const b = document.createElement('button'); b.textContent = txt;
    b.style.cssText = 'padding:9px 22px;background:rgba(128,128,128,0.07);border:1px solid rgba(128,128,128,0.15);border-radius:8px;color:var(--rf-acc,#60a5fa);cursor:pointer;font-size:14px;font-family:inherit;transition:opacity .15s';
    b.addEventListener('mouseenter', () => b.style.opacity = '.7'); b.addEventListener('mouseleave', () => b.style.opacity = '1');
    b.dataset.cmd = dir === 'next' ? 'NEXT_CHAP' : 'PREV_CHAP'; return b;
  };
  chNav.append(mkCh('← Prev Chapter', 'prev'), mkCh('Next Chapter →', 'next'));
  wrap.append(article, chNav); overlay.appendChild(wrap);
  document.body.appendChild(overlay); S.ui.overlay = overlay; S.ui.article = article;
  let scrollRAF = null;
  overlay.addEventListener('scroll', () => {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(() => {
      scrollRAF = null;
      const pct = Math.min(1, overlay.scrollTop / Math.max(1, _cachedOvScrollable));
      let veil = document.getElementById('__nr_veil');
      if (!veil) { veil = document.createElement('div'); veil.id = '__nr_veil'; veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483641;background:#000;opacity:0;transition:opacity 0.6s ease;will-change:opacity'; overlay.appendChild(veil); }
      veil.style.opacity = (pct * 0.40).toFixed(3); S.scrollPct = pct;
      if (S.ui.progEl) S.ui.progEl.style.transform = `scaleX(${pct})`;
    });
  }, { passive: true });
  if (_ovResizeObs) _ovResizeObs.disconnect();
  _ovResizeObs = new ResizeObserver(() => { _cachedOvScrollable = Math.max(1, overlay.scrollHeight - overlay.clientHeight); });
  _ovResizeObs.observe(wrap);
}

// SPA navigation auto-close
(() => {
  let _spaRAF = null;
  const inv = () => {
    if (!S.overlayUrl || location.href === S.overlayUrl) return;
    S.overlayUrl = ''; _contentRoot = null; _barThemeInvalidate();
    if (S.readerState === RS_OPEN || S.readerState === RS_OPENING) readerDeactivate();
  };
  const invThrottled = () => { if (_spaRAF) return; _spaRAF = requestAnimationFrame(() => { _spaRAF = null; inv(); }); };
  window.addEventListener('popstate', inv);
  const te = document.querySelector('title'); if (te) new MutationObserver(invThrottled).observe(te, { subtree: true, childList: true, characterData: true });
})();

// ── READER LIFECYCLE ──────────────────────────────────────────────────────────
function _syncHLAfterToggle() {
  clearParaHL(); clearTimeout(S.tts.hlSyncTimer);
  S.tts.hlSyncTimer = setTimeout(() => {
    if (S.ttsState !== TS_PLAYING) return;
    highlightParagraphInDOM(S.tts.index);
    const cur = S.paras[S.tts.index]; if (cur && S.tts.lastBoundaryChar > 0) hlWord(cur, S.tts.lastBoundaryChar, 1);
  }, 500);
}

function _notifyState(rmActive) {
  try { chrome.runtime.sendMessage({ type: 'SYNC_STATE', from: 'content', rmActive, state: S.ttsState === TS_PLAYING ? 'playing' : (S.tts.hasSaved ? 'stopped' : 'idle') }); } catch {}
}

function readerDeactivate() {
  if (S.readerState !== RS_OPEN && S.readerState !== RS_OPENING) return;
  S.readerState = RS_CLOSING;
  if (S.ui.overlay) S.ui.overlay.classList.remove('rf-active', 'rf-instant');
  _barThemeInvalidate(); Bar.setTheme(); unlockScroll();
  if (S.RS.scanSkim) { const t = S.RS.scanSkim; S.RS.scanSkim = false; applyScanSkim(); S.RS.scanSkim = t; }
  S.readerState = RS_CLOSED; S.paras = S.standardNodes;
  _syncHLAfterToggle(); Bar.update(); TTS._sendState(); saveLater(); _notifyState(false);
  _liftTurboAndHydrate();
}

async function readerActivate(settings, instant, force) {
  if (S.readerState !== RS_CLOSED) return;
  if (!force) {
    const wc = S.wordCount > 0 ? S.wordCount : (() => { let n = 0; document.querySelectorAll('p,article,section,h1,h2,h3,li').forEach(el => n += (el.textContent || '').split(/\s+/).length); return n; })();
    if (wc < 50) return;
  }
  S.readerState = RS_OPENING; if (settings) Object.assign(S.RS, settings);
  if (!S.standardNodes.length) { S.parasStale = true; extractParas(); }
  const cacheHit = S.ui.overlay?.isConnected && S.overlayUrl === location.href;
  if (!cacheHit) {
    S.ui.overlay?.remove(); S.ui.overlay = null; S.ui.article = null; S.bionicDone = false;
    await buildOverlay(); S.parasStale = true; extractParas(); indexOverlayNodes();
  }
  const ov = S.ui.overlay;
  ov.classList.remove('rf-active', 'rf-instant');
  lockScroll(); applyStyles(); applyPageStyles();
  if (!cacheHit) { toggleBionic(); if (S.RS.scanSkim) applyScanSkim(); if (S.RS.nounHighlight) applyNounHighlight(); }
  S.readerState = RS_OPEN; S.paras = S.immersiveNodes; S.scrollPct = 0;
  if (S.ui.progEl) S.ui.progEl.style.transform = 'scaleX(0)';
  requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add(instant ? 'rf-instant' : 'rf-active')));
  _syncHLAfterToggle();
  const bar = S.ui.bar; if (bar?.parentNode) bar.parentNode.appendChild(bar);
  Bar.update(); TTS._sendState(); saveLater(); _notifyState(true);
  if (!cacheHit && S.ttsState !== TS_PLAYING) {
    if (S.forceTTS) setTimeout(() => { loadVoices(); if (S.paras.length && S.ttsState !== TS_PLAYING) TTS.start(findFirstContent(S.paras)); }, 650);
    clearTimeout(S.replaceTimer);
    setTimeout(() => {
      chrome.storage.local.get(['AR_replace'], res => {
        const pairs = _getReplacePairs(res); if (!pairs.length) return;
        const ov2 = document.getElementById('readfy-overlay');
        Promise.all([applyPairs(pairs, ov2), applyPairs(pairs, document.body)]).then(() => { if (S.standardNodes.length) resnapTexts(); });
      });
    }, 900);
    S.replaceTimer = setTimeout(fireReplace, 10000);
  }
}

// ── COMMAND ROUTER ────────────────────────────────────────────────────────────
function cmd(command, payload = {}) {
  switch (command) {
    case 'TOGGLE_READER': if (S.readerState === RS_OPEN) readerDeactivate(); else readerActivate(payload.settings ?? null, false, true); break;
    case 'PLAY_PAUSE':    loadVoices(); extractParas(); TTS.toggle(); break;
    case 'PREV_PARA':     TTS.prev(); break;
    case 'NEXT_PARA':     TTS.next(); break;
    case 'STOP':          TTS.stop(); break;
    case 'START_FROM':    loadVoices(); extractParas(); TTS.start(payload.idx ?? findFirstContent(S.paras), payload.char ?? 0); break;
    case 'PREV_CHAP':
    case 'NEXT_CHAP': {
      const nx = command === 'NEXT_CHAP', step = nx ? 1 : -1;
      if (S.readerState === RS_OPEN) { goChapter(nx ? 'next' : 'prev'); break; }
      let found = -1;
      for (let i = (S.tts.index || 0) + step; i >= 0 && i < S.standardNodes.length; i += step) { if (S.standardNodes[i] && /^H[1-6]$/.test(S.standardNodes[i].tagName)) { found = i; break; } }
      if (found >= 0) { S.tts.savedIdx = found; S.tts.hasSaved = true; if (S.ttsState === TS_PLAYING) TTS.start(found); }
      else goChapter(nx ? 'next' : 'prev');
      break;
    }
  }
}

// ── BAR ───────────────────────────────────────────────────────────────────────
function mkBtn(svg, title, style = {}) {
  const b = document.createElement('button'); b.innerHTML = svg; b.title = title;
  Object.assign(b.style, { background: 'none', border: '1px solid transparent', borderRadius: '6px', cursor: 'pointer', color: 'var(--nr-ac,#60a5fa)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color .15s', flexShrink: '0', ...style });
  b.addEventListener('mouseenter', () => b.style.borderColor = 'rgba(255,255,255,.2)');
  b.addEventListener('mouseleave', () => b.style.borderColor = 'transparent');
  return b;
}
function mkStat(id, label) {
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;align-items:center;line-height:1.1;flex-shrink:0;padding:0 4px;border-right:1px solid rgba(255,255,255,.07)';
  const v = document.createElement('span'); v.id = id; v.style.cssText = 'font-size:11px;font-weight:700;color:var(--nr-ac,#60a5fa)'; v.textContent = '—';
  const l = document.createElement('span'); l.style.cssText = 'font-size:8px;opacity:.45'; l.textContent = label;
  w.append(v, l); return w;
}
const mkSep = () => { const s = document.createElement('div'); s.style.cssText = 'width:1px;height:14px;background:rgba(255,255,255,.10);flex-shrink:0;margin:0 0px'; return s; };

function _updateAiBarBtn(isOpen) {
  const btn = document.getElementById('nr-ai-btn'); if (!btn) return;
  btn.style.opacity = isOpen ? '1' : '0.65';
  btn.style.borderColor = isOpen ? 'rgba(96,165,250,.5)' : 'transparent';
  btn.title = isOpen ? 'Close AI Overlay' : 'Open AI Overlay';
  if (!isOpen) Bar.setTheme();
}

let _barThemeCache = null;
const _barThemeInvalidate = () => { _barThemeCache = null; };

const Bar = {
  _uiRAF: null,
  setTheme() {
    const bar = S.ui.bar; if (!bar) return;
    const acc = ACCENTS[S.RS.accent] || '#60a5fa';
    if (!_barThemeCache) {
      const cs = S.ui.overlay ? getComputedStyle(S.ui.overlay) : null;
      _barThemeCache = {
        panel: (cs ? cs.getPropertyValue('--nr-panel').trim() : '') || 'rgba(19,19,20,.97)',
        bdr:   (cs ? cs.getPropertyValue('--nr-bdr').trim()   : '') || 'rgba(168,199,250,.12)',
      };
    }
    const { panel, bdr } = _barThemeCache;
    bar.style.background = panel; bar.style.borderColor = bdr;
    bar.style.setProperty('--nr-bar-bg', panel);
    bar.style.setProperty('--nr-bar-bdr', bdr);
    bar.style.setProperty('--nr-ac', acc);
    if (S.ui.progEl) {
      const { r, g, b } = hexToRgb(S.RS.progColor || '#29273a');
      S.ui.progEl.style.background = `linear-gradient(to right,transparent 0%,rgba(${r},${g},${b},0.08) 25%,rgba(${r},${g},${b},0.45) 70%,rgba(${r},${g},${b},0.80) 100%)`;
    }
  },
  update() {
    const bar = S.ui.bar; if (!bar) return;
    if (!S.ui.barShown) { bar.style.display = 'block'; S.ui.barShown = true; }
    const playing = S.ttsState === TS_PLAYING;
    if (playing && !S.tts.statsInterval) S.tts.statsInterval = setInterval(() => Bar.updateInfo(), 5000);
    else if (!playing && S.tts.statsInterval) { clearInterval(S.tts.statsInterval); S.tts.statsInterval = null; }
    if (S.ui.playBtn && S.ui.playBtn._nrPlaying !== playing) { S.ui.playBtn.innerHTML = playing ? SVG.stop : SVG.play; S.ui.playBtn._nrPlaying = playing; }
    if (S.ui.voiceEl && S.voices.cur) S.ui.voiceEl.textContent = voiceShort(S.voices.cur);
    this.updateInfo();
  },
  updateInfo() {
    if (this._uiRAF) return;
    this._uiRAF = requestAnimationFrame(() => {
      this._uiRAF = null;
      const st = computeStats();
      if (S.ui.statWC)  S.ui.statWC.textContent  = st.wordCount > 0 ? st.wordCount.toLocaleString() : '—';
      if (S.ui.statWPM) S.ui.statWPM.textContent = (S.ttsState === TS_PLAYING && st.wpm > 0) ? st.wpm + '' : '—';
      if (S.ui.statREM) S.ui.statREM.textContent = st.remainSecs > 0 ? fmtTime(st.remainSecs) : '—';
      if (S.ttsState === TS_PLAYING && !S.tts.statsTimer) {
        S.tts.statsTimer = setTimeout(() => {
          S.tts.statsTimer = null;
          try { chrome.runtime.sendMessage({ from: 'content', state: 'playing', rmActive: S.readerState === RS_OPEN, stats: st, idx: S.tts.index, paras: S.paras.length }); } catch {}
        }, 1000);
      }
    });
  },
  build() {
    if (S.ui.bar) return;
    if (!document.getElementById('__nrmin')) { const s = document.createElement('style'); s.id = '__nrmin'; s.textContent = '#nr-bar{--nr-ac:#60a5fa}#nr-bar *{box-sizing:border-box}'; document.documentElement.appendChild(s); }
    const bar = document.createElement('div'); bar.id = 'nr-bar';
    Object.assign(bar.style, { position: 'fixed', left: '0', bottom: '0', zIndex: '2147483647', display: 'block', height: '41px', background: 'var(--rf-bg,#131314)', backdropFilter: 'none', WebkitBackdropFilter: 'none', borderTop: '1px solid rgba(255,255,255,0.09)', boxSizing: 'border-box', width: '100vw', maxWidth: '100vw', overflow: 'hidden' });
    const progEl = document.createElement('div');
    progEl.style.cssText = 'position:absolute;inset:0;z-index:0;transform:scaleX(0);transform-origin:left;will-change:transform;pointer-events:none';
    bar.appendChild(progEl); S.ui.progEl = progEl; S.ui.bar = bar; S.ui.barShown = false;

    const grid = document.createElement('div');
    Object.assign(grid.style, { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', height: '100%', padding: '0 12px', width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: '1' });

    const left = document.createElement('div'); Object.assign(left.style, { display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-start', minWidth: '0', overflow: 'hidden' });
    const togBtn = mkBtn(SVG.reader, 'Open immersive reader', { width: '96px', height: '32px' }); togBtn.id = 'nr-tog-btn';
    const voiceEl = document.createElement('span'); voiceEl.title = 'Current voice'; voiceEl.textContent = '—';
    Object.assign(voiceEl.style, { fontSize: '11px', fontWeight: '700', color: 'var(--nr-ac,#60a5fa)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '48px', flexShrink: '0', paddingLeft: '4px' });
    S.ui.voiceEl = voiceEl;
    const statsRow = document.createElement('div'); statsRow.id = 'nr-bar-stats-row'; Object.assign(statsRow.style, { display: 'flex', alignItems: 'center', gap: '0', flexShrink: '0' });
    const wcEl = mkStat('nr-wc', 'words'), wpmEl = mkStat('nr-wpm', 'wpm'), remEl = mkStat('nr-rem', 'left');
    S.ui.statWC = wcEl.querySelector('span'); S.ui.statWPM = wpmEl.querySelector('span'); S.ui.statREM = remEl.querySelector('span');
    statsRow.append(wcEl, wpmEl, remEl, voiceEl); left.append(togBtn, mkSep(), statsRow);

    const ctr = document.createElement('div'); Object.assign(ctr.style, { display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' });
    const prevBtn = mkBtn(SVG.prev, 'Prev Paragraph', { width: '30px', height: '30px' }); prevBtn.id = 'nr-prev-btn';
    const playBtn = mkBtn(SVG.play, 'Play / Stop', { width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(96,165,250,.35)' }); playBtn.id = 'nr-play-btn'; S.ui.playBtn = playBtn;
    const nextBtn = mkBtn(SVG.next, 'Next Paragraph', { width: '30px', height: '30px' }); nextBtn.id = 'nr-next-btn';
    ctr.append(prevBtn, playBtn, nextBtn);

    const gearBtn  = mkBtn(SVG.gear,  'Settings');                                                              gearBtn.id  = 'nr-gear-btn';
    const chPrev   = mkBtn(SVG.chPrev,'Prev Chapter', { width: '36px', height: '32px', padding: '0 6px' });    chPrev.id   = 'nr-ch-prev'; chPrev.className = 'nr-ch-btn nr-ch-prev'; chPrev.dataset.cmd = 'PREV_CHAP';
    const chNext   = mkBtn(SVG.chNext,'Next Chapter', { width: '36px', height: '32px', padding: '0 6px' });    chNext.id   = 'nr-ch-next'; chNext.className = 'nr-ch-btn nr-ch-next'; chNext.dataset.cmd = 'NEXT_CHAP';
    const aiBtn    = mkBtn('✨',       'Open AI Overlay', { width: '96px', height: '32px', fontSize: '13px', fontWeight: '700', opacity: '0.65' }); aiBtn.id = 'nr-ai-btn';
    const scrollTopBtn = mkBtn(SVG.up,   'Scroll to top');    scrollTopBtn.id = 'nr-scroll-top';
    const scrollBotBtn = mkBtn(SVG.down, 'Scroll to bottom'); scrollBotBtn.id = 'nr-scroll-bot';
    const flipBtn  = mkBtn(SVG.flip,  'Toggle bar position'); flipBtn.id = 'nr-bar-flip';
    try { if (sessionStorage.getItem('nr_bar_top') === '1') { bar.style.bottom = ''; bar.style.top = '0'; } } catch {}
    const chPair = document.createElement('div'); chPair.className = 'nr-ch-pair'; chPair.style.zIndex = '1';
    chPair.append(aiBtn, scrollTopBtn, scrollBotBtn, flipBtn, gearBtn, chPrev, chNext);

    const right = document.createElement('div'); Object.assign(right.style, { display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' });
    grid.append(left, ctr, right); bar.appendChild(grid); bar.appendChild(chPair);
    document.body.appendChild(bar); this.setTheme();

    bar.addEventListener('click', e => {
      const btn = e.target.closest('button[id]'); if (!btn || !btn.closest('#nr-bar')) return;
      e.preventDefault(); e.stopPropagation();
      const id = btn.id;
      if (id === 'nr-tog-btn')    { cmd('TOGGLE_READER'); return; }
      if (id === 'nr-ai-btn')     { toggleAiOverlay().catch(() => {}); return; }
      if (id === 'nr-play-btn')   { cmd('PLAY_PAUSE'); return; }
      if (id === 'nr-prev-btn')   { cmd('PREV_PARA'); return; }
      if (id === 'nr-next-btn')   { cmd('NEXT_PARA'); return; }
      if (id === 'nr-gear-btn')   { try { chrome.runtime.sendMessage({ action: 'openSettings' }); } catch {} return; }
      if (id === 'nr-scroll-top') { const ov = S.ui.overlay; (S.readerState === RS_OPEN && ov) ? ov.scrollTo({ top: 0, behavior: 'smooth' }) : window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      if (id === 'nr-scroll-bot') { const ov = S.ui.overlay; (S.readerState === RS_OPEN && ov) ? ov.scrollTo({ top: ov.scrollHeight, behavior: 'smooth' }) : window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return; }
      if (id === 'nr-bar-flip')   { const t = bar.style.top === '0px' || bar.style.top === '0'; if (t) { bar.style.top = ''; bar.style.bottom = '0'; try { sessionStorage.setItem('nr_bar_top', '0'); } catch {} } else { bar.style.bottom = ''; bar.style.top = '0'; try { sessionStorage.setItem('nr_bar_top', '1'); } catch {} } return; }
    }, true);
  },
};

// ── EVENTS ────────────────────────────────────────────────────────────────────
function setupEvents() {
  document.addEventListener('click', e => {
    const dc = e.target.closest('[data-cmd]');
    if (dc) { const command = dc.getAttribute('data-cmd'); if (command === 'NEXT_CHAP' || command === 'PREV_CHAP') { e.preventDefault(); e.stopPropagation(); cmd(command); return; } }
    if (e.ctrlKey && !VEL.active) { VEL.start(e.clientY, e.clientX); return; }
    if (S.ttsState === TS_PLAYING) {
      const el = nearestBlock(e.target);
      if (el && !el.closest('#nr-bar,#__nr_vel')) { const ps = extractParas(), idx = ps.indexOf(el); if (idx >= 0) { e.preventDefault(); TTS.start(idx, getClickCharOffset(e.clientX, e.clientY, el)); return; } }
    }
  }, true);

  document.addEventListener('keydown', e => {
    const tg = document.activeElement?.tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tg) || document.activeElement?.isContentEditable) return;
    const hk = S.hotkeys;
    if (matchHK(e, hk.toggleReader))  { e.preventDefault(); cmd('TOGGLE_READER'); return; }
    if (matchHK(e, hk.playStop) || e.key === ' ') { e.preventDefault(); cmd('PLAY_PAUSE'); return; }
    if (matchHK(e, hk.prevPara))      { e.preventDefault(); cmd('PREV_PARA'); return; }
    if (matchHK(e, hk.nextPara))      { e.preventDefault(); cmd('NEXT_PARA'); return; }
    if (matchHK(e, hk.prevChapter))   { e.preventDefault(); cmd('PREV_CHAP'); return; }
    if (matchHK(e, hk.nextChapter))   { e.preventDefault(); cmd('NEXT_CHAP'); return; }
    if (matchHK(e, hk.scrollTop))     { e.preventDefault(); const ov = S.ui.overlay; (S.readerState === RS_OPEN && ov) ? ov.scrollTo({ top: 0, behavior: 'smooth' }) : window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (matchHK(e, hk.scrollBottom))  { e.preventDefault(); const ov = S.ui.overlay; (S.readerState === RS_OPEN && ov) ? ov.scrollTo({ top: ov.scrollHeight, behavior: 'smooth' }) : window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); return; }
    if (e.key === 'Escape' || matchHK(e, hk.escape)) {
      if (VEL.active) { VEL.stop(); return; }
      if (S.readerState !== RS_CLOSED) { e.preventDefault(); TTS.stop(); readerDeactivate(); return; }
      if (S.ttsState === TS_PLAYING || S.tts.hasSaved) { S.tts.savedIdx = S.tts.index; S.tts.hasSaved = true; TTS.stop(); }
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const k = e.key.toLowerCase(), sel = window.getSelection(), text = (sel?.toString() || '').trim();
      if (k === 'e') { if (text) { e.preventDefault(); NrTooltip.hide(); NrFloat.runAction('NR_AI_EXPLAIN', { text, level: 'adult' }, 'Explain', 'Adult'); } return; }
      if (k === 'd') { if (text) { e.preventDefault(); NrTooltip.hide(); NrFloat.runAction('NR_AI_DEFINE', { text }, 'Define', text.slice(0, 40)); } return; }
      if (k === 't') { if (text) { e.preventDefault(); NrTooltip.hide(); NrFloat.runAction('NR_AI_TRANSLATE_SEL', { text }, 'Translate'); } return; }
      if (k === 'c') { if (text) { e.preventDefault(); NrTooltip.hide(); NrFloat.runAction('NR_AI_CHAT', { text, question: 'Summarize this:\n\n' + text }, 'Chat'); } return; }
      if (k === 'i') { e.preventDefault(); cmd('TOGGLE_READER'); return; }
      if (k === 'a') { e.preventDefault(); toggleAiOverlay().catch(() => {}); return; }
      if (k === 'x') { e.preventDefault(); if (S.readerState === RS_OPEN) readerDeactivate(); else if (S.aiOverlayOpen) toggleAiOverlay().catch(() => {}); return; }
    }
  }, true);

  document.addEventListener('contextmenu', e => {
    window.__nr_lastEl = e.target; S.rc.node = null; S.rc.offset = 0;
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(e.clientX, e.clientY); if (r) { S.rc.node = r.startContainer; S.rc.offset = r.startOffset; } }
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { S.rc.node = p.offsetNode; S.rc.offset = p.offset; } }
    else { S.rc.node = e.target; S.rc.offset = 0; }
  }, { passive: true });
}

// ── STORAGE SYNC ──────────────────────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.AR_prefs?.newValue)         S.tts.rate = parseFloat(changes.AR_prefs.newValue.rate || 1.75);
  if (changes.AR_jigsaw?.newValue?.length) { S.voices.jigsaw = changes.AR_jigsaw.newValue; S.voices.cache = null; }
  if (changes.AR_hl?.newValue)             { Object.assign(S.HL, changes.AR_hl.newValue); updateHLStyle(); }
  if (changes.AR_rm?.newValue) {
    const prev = { bionic: S.RS.bionic, scanSkim: S.RS.scanSkim, superSkim: S.RS.superSkim, nounHighlight: S.RS.nounHighlight };
    Object.assign(S.RS, changes.AR_rm.newValue);
    applyStyles(); applyPageStyles();
    if (S.RS.bionic !== prev.bionic) toggleBionic();
    if (S.RS.scanSkim !== prev.scanSkim || S.RS.superSkim !== prev.superSkim) applyScanSkim();
    if (S.RS.nounHighlight !== prev.nounHighlight) toggleNounHL();
  }
  if (changes.siteRules?.newValue)         S.siteRules = changes.siteRules.newValue;
  if (changes.AR_guard != null)            S.guard = !!changes.AR_guard.newValue;
  if (changes.AR_force_tts != null)        S.forceTTS = !!changes.AR_force_tts.newValue;
  if (changes.AR_auto_next_enabled)        S.autoNextChapter = !!changes.AR_auto_next_enabled.newValue;
  if (changes.AR_hotkeys?.newValue)        Object.assign(S.hotkeys, DEFAULT_HOTKEYS, changes.AR_hotkeys.newValue);
});

// ── MESSAGE DISPATCH ──────────────────────────────────────────────────────────
const ASYNC = true, SYNC = 1;
const getFullState = () => ({
  state: S.ttsState === TS_PLAYING ? 'playing' : (S.tts.hasSaved ? 'stopped' : 'idle'),
  rmActive: S.readerState === RS_OPEN, rs: S.RS, hl: S.HL,
  stats: computeStats(), voices: voiceList(), paras: S.paras.length,
  idx: S.tts.index, hasSaved: S.tts.hasSaved, autoNextChapter: S.autoNextChapter,
  ttsRate: S.tts.rate, hotkeys: S.hotkeys,
});

const _applySettings = msg => {
  const prev = { bionic: S.RS.bionic, scanSkim: S.RS.scanSkim, superSkim: S.RS.superSkim, nounHighlight: S.RS.nounHighlight };
  Object.assign(S.RS, msg.settings);
  applyStyles(); applyPageStyles();
  if (S.RS.bionic !== prev.bionic) toggleBionic();
  if (S.RS.scanSkim !== prev.scanSkim || S.RS.superSkim !== prev.superSkim) applyScanSkim();
  if (S.RS.nounHighlight !== prev.nounHighlight) toggleNounHL();
};

const _playStop = msg => { loadVoices(); if (msg.cfg) S.tts.rate = parseFloat(msg.cfg.rate || 1.75); if (msg.jigsaw) S.voices.jigsaw = msg.jigsaw; cmd('PLAY_PAUSE'); };

const MSG = {
  'AR_GET_STATE':  (_, res) => { res(getFullState()); return SYNC; },
  'getState':      (_, res) => { res(getFullState()); return SYNC; },
  'AR_ACTIVATE':   msg => { if (S.readerState !== RS_OPEN) readerActivate(null, false, !!msg.force); },
  'AR_TOGGLE':     msg => cmd('TOGGLE_READER', { settings: msg.settings }),
  'AR_SETTINGS':   msg => { _applySettings(msg); saveLater(); },
  'AR_TEXTURE':    msg => { S.RS.textureDensity = Math.max(0, Math.min(100, msg.value || 0)); applyTextureDensity(S.RS.textureDensity); saveLater(); },
  'AR_HL':         msg => { if (msg.hl) Object.assign(S.HL, msg.hl); updateHLStyle(); saveLater(); },
  'AR_GUARD':      msg => { S.guard = !!msg.value; },
  'AR_FORCE_TTS':  msg => { S.forceTTS = !!msg.value; },
  'AR_AUTO_NEXT':  msg => { S.autoNextChapter = !!msg.value; chrome.storage.local.set({ AR_auto_next_enabled: msg.value }); },
  'AR_AUTO_AI_NEXT': msg => { S.autoAiNextPage = !!msg.value; chrome.storage.local.set({ AR_auto_ai_next: msg.value }); },
  'AR_HOTKEYS':    msg => { if (msg.hotkeys) { Object.assign(S.hotkeys, msg.hotkeys); chrome.storage.local.set({ AR_hotkeys: S.hotkeys }); } },
  'AR_VEL_TOGGLE': () => { VEL.active ? VEL.stop() : VEL.start(window.innerHeight / 2, window.innerWidth / 2); },
  'AR_CHAPTER':    msg => cmd(msg.dir === 'next' ? 'NEXT_CHAP' : 'PREV_CHAP'),
  'RTTS_PLAYSTOP':    _playStop,
  'RTTS_PLAY_PAUSE':  _playStop,
  'RTTS_TOGGLE':   (msg, sendResponse) => { sendResponse({ status: 'received' }); setTimeout(() => cmd('TOGGLE_READER', { settings: msg.settings }), 10); return SYNC; },
  'RTTS_STOP':     () => cmd('STOP'),
  'RTTS_PREV':     () => cmd('PREV_PARA'),
  'RTTS_NEXT':     () => cmd('NEXT_PARA'),
  'RTTS_RATE':     msg => TTS.setRate(msg.value),
  'RTTS_JIGSAW':   msg => { if (msg.jigsaw) { S.voices.jigsaw = msg.jigsaw; S.voices.cache = null; } },
  'RTTS_FROM_HERE': msg => {
    loadVoices(); extractParas();
    let fi = 0, charOff = 0;
    if (S.rc.node) {
      let anc = S.rc.node.nodeType === Node.TEXT_NODE ? S.rc.node.parentElement : S.rc.node;
      while (anc && anc !== document.body) {
        const idx = S.paras.indexOf(anc);
        if (idx >= 0) { fi = idx; if (S.rc.node.nodeType === Node.TEXT_NODE && anc.contains(S.rc.node)) { const tw = document.createTreeWalker(anc, NodeFilter.SHOW_TEXT); let n, cum = 0; while ((n = tw.nextNode())) { if (n === S.rc.node) { charOff = cum + S.rc.offset; break; } cum += n.textContent.length; } } break; }
        anc = anc.parentElement;
      }
    } else { fi = elIdx(window.__nr_lastEl); }
    S.tts.savedIdx = fi; S.tts.hasSaved = false; TTS.start(fi, charOff);
  },
  'RTTS_IMMERSIVE': () => { if (S.readerState !== RS_OPEN) cmd('TOGGLE_READER'); setTimeout(() => { if (S.readerState === RS_OPEN) cmd('START_FROM', { idx: findFirstContent(S.paras) }); }, 600); },
  'NR_REPLACE_APPLY': (msg, res) => { const pairs = msg.payload?.pairs || [], root = msg.payload?.overlayOnly ? document.getElementById('readfy-overlay') : document.body; applyPairs(pairs, root).then(() => res({ ok: true })).catch(() => res({ ok: false })); return ASYNC; },
  'NR_AI_PARAPHRASE':  (_, sendResponse) => { sendResponse({ status: 'received' }); toggleAiOverlay().catch(() => {}); return SYNC; },
  'TOGGLE_AI_OVERLAY': (_, sendResponse) => { sendResponse({ status: 'ai_toggled' }); toggleAiOverlay().catch(() => {}); return SYNC; },
  'NR_CHAT_PAGE_QUERY': (msg, sendResponse) => { const pageText = _nrPageText(), question = msg.question || ''; NrFloat.openWith(pageText, 'Chat', document.title.slice(0, 36)); NrFloat.ask('Page context:\n' + pageText + '\n\nQuestion: ' + question).then(() => { try { sendResponse({ ok: true }); } catch {} }); return ASYNC; },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) { sendResponse({}); return false; }
  const type = msg.type || msg.action, handler = MSG[type];
  if (!handler) { sendResponse({}); return false; }
  let result;
  try { result = handler(msg, sendResponse); }
  catch (err) { console.warn('[Nocturne] handler error [' + type + ']:', err); try { sendResponse({ error: String(err) }); } catch {} return false; }
  if (result === ASYNC) return true;
  if (result !== SYNC) sendResponse({});
  return false;
});

// ── INIT ──────────────────────────────────────────────────────────────────────

function init() {
  if (S.initDone) return; S.initDone = true; loadVoices();
  chrome.storage.local.get(['AR_prefs','AR_rm','AR_jigsaw','AR_hl','siteRules','AR_auto_next_enabled','AR_guard','AR_force_tts','AR_hotkeys','AR_auto_ai_next'], res => {
    S.tts.rate = parseFloat((res.AR_prefs || {}).rate || 1.75);
    if (res.AR_jigsaw?.length)     S.voices.jigsaw = res.AR_jigsaw;
    if (res.AR_rm)                 S.RS = Object.assign({}, RM_DEF, res.AR_rm);
    if (res.AR_hl)                 Object.assign(S.HL, res.AR_hl);
    if (res.siteRules)             S.siteRules = res.siteRules;
    if (res.AR_auto_next_enabled)  S.autoNextChapter = true;
    if (res.AR_guard)              S.guard = true;
    if (res.AR_force_tts)          S.forceTTS = true;
    if (res.AR_auto_ai_next)       S.autoAiNextPage = true;
    if (res.AR_hotkeys)            Object.assign(S.hotkeys, DEFAULT_HOTKEYS, res.AR_hotkeys);
    updateHLStyle(); applyPageStyles(); Bar.build(); setupEvents();
    if (document.body) { NrFloat.build(); NrTooltip.build(); }

    let chainFlag = false, prevImmersive = false, chainAiFlag = false;
    try { chainFlag    = sessionStorage.getItem('nr_chain_play_active') === '1'; } catch {}
    try { prevImmersive = sessionStorage.getItem('nr_chain_play_immersive') === '1'; } catch {}
    try { chainAiFlag  = sessionStorage.getItem('nr_chain_ai_active') === '1'; } catch {}

    const waitReady = (cb, deadline = Date.now() + 3000) => {
      if (S.readerState === RS_OPEN && S.paras.length > 0) { cb(); return; }
      if (Date.now() > deadline) return;
      requestAnimationFrame(() => waitReady(cb, deadline));
    };

    if (chainFlag) {
      try { sessionStorage.removeItem('nr_chain_play_active'); sessionStorage.removeItem('nr_chain_play_immersive'); } catch {}
      if ((prevImmersive || checkRule('immersive')) && S.readerState !== RS_OPEN) readerActivate(null, true, false);
      else extractParas();
      waitReady(() => { if (S.ttsState !== TS_PLAYING) { loadVoices(); TTS.start(findFirstContent(S.paras)); } });
      return;
    }
    if (chainAiFlag) {
      try { sessionStorage.removeItem('nr_chain_ai_active'); } catch {}
      toggleAiOverlay().catch(() => {});
      return;
    }

    if (!checkRule('banned')) {
      if (S.readerState !== RS_CLOSED) return;
      const wantImmersive = checkRule('immersive');
      const wantAi   = !wantImmersive && checkRule('ai') && !isAiOverlayActive();
      const wantOust = checkRule('oust');
      if (wantImmersive) { readerActivate(null, false, false); if (wantOust) setTimeout(() => fireReplace(true), 1100); return; }
      if (wantAi) { toggleAiOverlay().catch(() => {}).finally(() => { if (wantOust) setTimeout(() => fireReplace(true), 200); }); return; }
      if (wantOust) fireReplace(true);
    }
  });
}

chrome.storage.local.get(['siteRules'], res => {
  const host = location.hostname.replace(/^www\./, '');
  const rules = res.siteRules || {};
  const banned = Object.entries(rules).some(([d, r]) => r.banned && (host === d || host.endsWith('.' + d)));
  if (banned) { window.__NR = false; return; }
  window.__NR = true;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = () => { loadVoices(); if (!S.initDone) init(); };
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init, { once: true });
});

})();
