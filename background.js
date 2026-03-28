// background.js — Nocturne
'use strict';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SCRIPTS         = { js: ['content.js'], css: ['reader.css'] };
const GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions';
const TURBO_RULE_ID   = 1;
const TURBO_BLOCK_TYPES = ['image','media','stylesheet','font'];
const AI_ACTIONS      = new Set(['NR_AI_EXPLAIN','NR_AI_DEFINE','NR_AI_TRANSLATE_SEL','NR_AI_TONE','NR_AI_CHAT']);

const CONTEXT_MENUS = [
  { id: 'nr_read_here', title: '▶  Read from here',      contexts: ['page','selection'] },
  { id: 'nr_immersive', title: '📖  Reading mode',        contexts: ['page','selection'] },
  { id: 'nr_ai_mode',   title: '✨  AI mode',             contexts: ['page','selection'] },
  { id: 'nr_chat_here', title: '💬  Chat with this page', contexts: ['page','selection'] },
];
const CONTEXT_MENU_MAP = {
  nr_read_here: { type: 'RTTS_FROM_HERE' },
  nr_immersive: { type: 'RTTS_IMMERSIVE' },
  nr_ai_mode:   { type: 'TOGGLE_AI_OVERLAY' },
  nr_chat_here: { type: 'NR_CHAT_PAGE_QUERY', question: '' },
};

// ── TURBO & SITE RULES ────────────────────────────────────────────────────────
async function updateTurboRules(siteRules) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [TURBO_RULE_ID] });
  } catch (e) {
    console.error('[Nocturne Turbo] Failed to remove old rule:', e); return;
  }
  const domains = Object.entries(siteRules || {})
    .filter(([, r]) => r.turbo && !r.banned)
    .map(([d]) => d.replace(/^www\./, '').trim()).filter(Boolean);
  if (!domains.length) return;
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [],
      addRules: [{ id: TURBO_RULE_ID, priority: 1, action: { type: 'block' },
        condition: { resourceTypes: TURBO_BLOCK_TYPES, initiatorDomains: domains } }],
    });
    console.log('[Nocturne Turbo] Rules active for:', domains);
  } catch (e) {
    console.error('[Nocturne Turbo] Failed to install blocking rule:', e);
  }
}

async function syncSiteRulesScripts(siteRules) {
  const ID = 'nr_site_rules';
  const domains = Object.entries(siteRules || {})
    .filter(([, r]) => !r.banned && (r.immersive || r.ai || r.oust || r.turbo))
    .map(([d]) => d);
  if (!domains.length) {
    try { await chrome.scripting.unregisterContentScripts({ ids: [ID] }); } catch {}
    return;
  }
  const matches = domains.flatMap(d => [`*://${d}/*`, `*://*.${d}/*`]);
  try {
    await chrome.scripting.registerContentScripts([{
      id: ID, matches, js: SCRIPTS.js, css: SCRIPTS.css,
      runAt: 'document_idle', persistAcrossSessions: true,
    }]);
  } catch {
    chrome.scripting.updateContentScripts([{ id: ID, matches }])
      .catch(e => console.warn('[Nocturne bg] syncSiteRules:', e.message));
  }
}

async function applySiteRules(rules) {
  syncSiteRulesScripts(rules);
  updateTurboRules(rules);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
let _siteRulesCache = null;
let _providerCache  = null;

async function isBanned(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (!_siteRulesCache) {
      const { siteRules = {} } = await chrome.storage.local.get('siteRules');
      _siteRulesCache = siteRules;
    }
    return Object.entries(_siteRulesCache).some(([d, r]) => r.banned && (host === d || host.endsWith('.' + d)));
  } catch { return false; }
}

async function injectAndSend(tabId, msg) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (await isBanned(tab.url)) return;
    await Promise.all([
      chrome.scripting.executeScript({ target: { tabId }, files: SCRIPTS.js }),
      chrome.scripting.insertCSS({ target: { tabId }, files: SCRIPTS.css }),
    ]);
    chrome.tabs.sendMessage(tabId, msg).catch(e => console.warn('[Nocturne bg]', e.message));
  } catch (e) { console.warn('[Nocturne bg] inject:', e.message); }
}

// ── GROQ / AI ─────────────────────────────────────────────────────────────────
async function groqFetch(apiKey, messages, { model, max_tokens, temperature }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  let r;
  try {
    r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens, temperature, messages }),
      signal: ctrl.signal,
    });
  } finally { clearTimeout(timer); }
  const data = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${data?.error?.message || 'unknown'}`);
  const text = (data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('empty response');
  return { text, usage: data.usage || {} };
}

async function tryProviders(providers, messages, opts) {
  let lastErr = '';
  for (const p of providers) {
    try { return await groqFetch(p.key, messages, { ...opts, model: p.model }); }
    catch (e) { lastErr = e.message; console.warn(`[Nocturne AI] ${p.name} failed: ${e.message}`); }
  }
  throw new Error(`All providers failed. Last: ${lastErr}`);
}

function toHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
}

function buildProviders(res, model) {
  return ['groqKey','groqKey2','groqKey3','groqKey4']
    .map((k, i) => ({ name: `Groq Key ${i + 1}`, key: (res[k] || '').trim(), model }))
    .filter(p => p.key);
}

async function getProviders() {
  if (_providerCache) return _providerCache;
  const res = await chrome.storage.local.get(['groqKey','groqKey2','groqKey3','groqKey4','nr_ai_model']);
  _providerCache = buildProviders(res, (res.nr_ai_model || 'llama-3.1-8b-instant').trim());
  return _providerCache;
}

function buildMessages(msg) {
  const EXPLAIN_LEVELS = {
    '5yo':        'Explain as if to a curious 5-year-old. Use simple words, short sentences, and a friendly analogy. No jargon.',
    'adult':      'Explain to an intelligent adult with no specialist knowledge. Use plain English, concrete examples, and a logical structure.',
    'expert':     'Explain to a domain expert. Use precise technical terminology, reference underlying mechanisms, do not oversimplify.',
    'allknowing': 'Explain as an all-knowing oracle — weaving surface meaning, deeper implications, historical context, and philosophical significance.',
  };
  const sys = role => ({ role: 'system', content: role });
  const usr = content => ({ role: 'user', content });

  switch (msg.type) {
    case 'NR_AI_EXPLAIN':
      return [
        sys(`You are an expert explainer. ${EXPLAIN_LEVELS[msg.level] || EXPLAIN_LEVELS.adult} Be concise but complete. Output ONLY the explanation — no headers, no preamble.`),
        usr(`Explain:\n\n${(msg.text || '').trim()}`),
      ];
    case 'NR_AI_DEFINE':
      return [
        sys('You are a precise dictionary assistant. Respond with EXACTLY:\n**Definition:** plain-English definition.\n**Synonyms:** exactly 3, comma-separated.\n**Example:** one natural sentence using the word.\nNothing else.'),
        usr(`Define: ${(msg.text || '').trim()}`),
      ];
    case 'NR_AI_TRANSLATE_SEL':
      return [
        sys('You are a translation assistant. If the text is not English, translate to English. If it is English, translate to Spanish. End with "Detected language: <n>". Output ONLY the translation and that line.'),
        usr(`Translate:\n\n${(msg.text || '').trim()}`),
      ];
    case 'NR_AI_TONE':
      return [
        sys('You are an expert media analyst. Return a concise report with four sections:\n**Overall Tone:** dominant emotional tone.\n**Emotional Slant:** emotions triggered in the reader.\n**Potential Biases:** 2–3 bullets on ideological/framing biases.\n**Verdict:** one sentence on reliability and balance.\nBe direct. Output ONLY these four sections.'),
        usr(`Analyze:\n\n${(msg.pageText || msg.text || '').trim().slice(0, 10000)}`),
      ];
    default: { // NR_AI_CHAT
      const history = Array.isArray(msg.history) ? msg.history.map(h => ({ role: h.role, content: h.content })) : [];
      const ctx = (msg.context || '').trim();
      const userMsg = (msg.question || '').trim() + (ctx ? `\n\n--- Context ---\n${ctx.slice(0, 8000)}\n---` : '');
      return [
        sys(msg.forceSystemPrompt || 'You are a helpful, concise reading assistant in a browser extension called Nocturne. Answer clearly. Keep answers under 200 words unless asked for more. Output ONLY the answer — no preamble.'),
        ...history,
        usr(userMsg),
      ];
    }
  }
}

// ── LIFECYCLE ─────────────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(() => {});

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.removeAll(() => CONTEXT_MENUS.forEach(m => chrome.contextMenus.create(m)));
  const { siteRules = {} } = await chrome.storage.local.get('siteRules');
  applySiteRules(siteRules);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.groqKey || changes.groqKey2 || changes.groqKey3 || changes.groqKey4 || changes.nr_ai_model)
    _providerCache = null;
  if (changes.siteRules) {
    _siteRulesCache = null;
    applySiteRules(changes.siteRules.newValue || {});
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id && CONTEXT_MENU_MAP[info.menuItemId]) injectAndSend(tab.id, CONTEXT_MENU_MAP[info.menuItemId]);
});

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'nr_ai_paraphrase') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) injectAndSend(tab.id, { type: 'TOGGLE_AI_OVERLAY' });
});

// ── MESSAGE ROUTER ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
  if (!msg) return false;

  if (msg.action === 'openSettings') {
    chrome.action.openPopup().catch(() =>
      chrome.windows.create({ url: chrome.runtime.getURL('popup.html'), type: 'popup', width: 500, height: 580, focused: true })
    );
    respond({}); return false;
  }

  if (msg.type === 'NR_LIFT_TURBO') {
    (async () => {
      const tabId = _sender?.tab?.id;
      if (!tabId) { respond({}); return; }
      try {
        const allRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existing = allRules.find(r => r.id === TURBO_RULE_ID);
        if (!existing) { respond({}); return; }
        const excluded = new Set(existing.condition.excludedTabIds || []);
        excluded.add(tabId);
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [TURBO_RULE_ID],
          addRules: [{ ...existing, condition: { ...existing.condition, excludedTabIds: [...excluded] } }],
        });
        console.log('[Nocturne Turbo] Lifted for tab', tabId);
      } catch (e) { console.warn('[Nocturne Turbo] lift failed:', e.message); }
      respond({});
    })();
    return true;
  }

  if (msg.type === 'NR_AI_CHUNK') {
    (async () => {
      const ALARM = 'nr_sw_keepalive';
      chrome.alarms.create(ALARM, { periodInMinutes: 1 / 3 });
      try {
        const [providers, { aiContext }] = await Promise.all([getProviders(), chrome.storage.local.get('aiContext')]);
        if (!providers.length) { respond({ ok: false, slot: msg.slot, error: 'No API keys found. Add them in the AI tab.' }); return; }
        const model     = providers[0].model;
        const sysPrompt = (aiContext || '').trim() || 'Rewrite this text to be concise and engaging.';
        const keys      = providers.map(p => p.key);
        const slot      = msg.slot || 0;
        const safeSlot  = slot % keys.length;
        const order     = [safeSlot, ...keys.map((_, i) => i).filter(i => i !== safeSlot)];
        for (const s of order) {
          const t0 = Date.now();
          try {
            const { text, usage } = await groqFetch(keys[s],
              [{ role: 'system', content: sysPrompt }, { role: 'user', content: msg.payload }],
              { model, max_tokens: 4096, temperature: 0.55 }
            );
            const ms = Date.now() - t0;
            console.log(`[Nocturne AI] chunk-${slot + 1} ✓ key${s + 1} ${ms}ms in:${usage.prompt_tokens ?? '?'} out:${usage.completion_tokens ?? '?'}`);
            respond({ ok: true, html: toHtml(text), plain: text, slot });
            return;
          } catch (e) {
            console.warn(`[Nocturne AI] chunk-${slot + 1} key${s + 1} failed (${Date.now() - t0}ms): ${e.message}`);
          }
        }
        respond({ ok: false, slot, error: 'All keys exhausted.' });
      } catch (e) {
        console.warn('[Nocturne AI] chunk error:', e.message);
        respond({ ok: false, slot: msg.slot, error: e.message });
      } finally {
        chrome.alarms.clear(ALARM);
      }
    })();
    return true;
  }

  if (msg.type === 'NR_AI_PARALLEL') {
    (async () => {
      const ALARM = 'nr_sw_keepalive';
      chrome.alarms.create(ALARM, { periodInMinutes: 1 / 3 });
      try {
        const [providers, { aiContext }] = await Promise.all([getProviders(), chrome.storage.local.get('aiContext')]);
        if (!providers.length) { respond({ ok: false, error: 'No API keys found. Add them in the AI tab.' }); return; }
        const model     = providers[0].model;
        const sysPrompt = (aiContext || '').trim() || 'Rewrite this text to be concise and engaging.';
        const keys      = providers.map(p => p.key);

        const fetchChunk = async (payload, slot, label) => {
          if (!payload) return { text: '', stats: null };
          const safeSlot = slot % keys.length;
          const order    = [safeSlot, ...keys.map((_, i) => i).filter(i => i !== safeSlot)];
          const inputChars = payload.length;
          for (const s of order) {
            const t0 = Date.now();
            try {
              const { text, usage } = await groqFetch(keys[s],
                [{ role: 'system', content: sysPrompt }, { role: 'user', content: payload }],
                { model, max_tokens: 4096, temperature: 0.55 }
              );
              const ms = Date.now() - t0;
              console.log(`[Nocturne AI] ${label} ✓ key${s + 1} ${ms}ms in:${usage.prompt_tokens ?? '?'} out:${usage.completion_tokens ?? '?'}`);
              return { text, stats: { label, keySlot: s + 1, inputChars, ms, promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0 } };
            } catch (e) {
              console.warn(`[Nocturne AI] ${label} key${s + 1} failed (${Date.now() - t0}ms): ${e.message}`);
            }
          }
          console.warn(`[Nocturne AI] ${label} — all keys exhausted`);
          return { text: '', stats: { label, keySlot: -1, inputChars, ms: 0, promptTokens: 0, completionTokens: 0 } };
        };

        const t0 = Date.now();
        const results = await Promise.all([
          fetchChunk(msg.payload1, 0, 'chunk-1'),
          fetchChunk(msg.payload2, 1, 'chunk-2'),
          fetchChunk(msg.payload3, 2, 'chunk-3'),
          fetchChunk(msg.payload4, 3, 'chunk-4'),
        ]);
        const totalMs = Date.now() - t0;
        const combinedText = results.map(r => r.text).filter(Boolean).join('\n\n');
        if (!combinedText) { respond({ ok: false, error: 'All API keys failed. Check your keys in the AI tab.' }); return; }

        chrome.storage.local.set({ nr_ai_last_run: { totalMs, model, keysUsed: keys.length, chunks: results.map(r => r.stats).filter(Boolean), ts: Date.now() } });
        respond({ ok: true, html: toHtml(combinedText), plain: combinedText });
      } catch (e) {
        console.warn('[Nocturne AI] parallel error:', e.message);
        respond({ ok: false, error: e.message });
      } finally {
        chrome.alarms.clear('nr_sw_keepalive');
      }
    })();
    return true;
  }

  if (AI_ACTIONS.has(msg.type)) {
    (async () => {
      const providers = await getProviders();
      if (!providers.length) { respond({ ok: false, error: 'No API keys saved. Open the ✨ AI tab in Nocturne settings.' }); return; }
      try {
        const opts = { max_tokens: 1024, temperature: msg.type === 'NR_AI_CHAT' ? 0.65 : 0.55 };
        const { text } = await tryProviders(providers, buildMessages(msg), opts);
        respond({ ok: true, html: toHtml(text), plain: text });
      } catch (e) { respond({ ok: false, error: e.message }); }
    })();
    return true;
  }

  return false;
});
