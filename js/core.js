(function(){
'use strict';

// --- part 1 ---
(() => {
  'use strict';
  if (window.__UNIFIED_TEXT_LIST_BEAUTY__) return;
  window.__UNIFIED_TEXT_LIST_BEAUTY__ = true;

  /* ----------------- small utils ----------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s = '') => String(s).replace(/[&<>'"]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  /* ----------------- TEXT BEAUTY V3 logic ----------------- */
  const processInline = (root = document) => {
    const targets = $$('p, li, h1, h2, h3, h4, h5, h6', root).filter(n => !n.closest('pre, code, .no-beauty'));
    const rxKV = /(^|\s)([A-Za-zÀ-ÿ0-9_]+):(?=\s|$)/g;
    const rxParen = /\(([^\n)]+)\)/g;
    const rxChip  = /\[\[([^\[\]]+)\]\]|\[([^\[\]]+)\]/g;

    for (const el of targets) {
      if (el.dataset.inlineProcessed === '1') continue;
      el.dataset.inlineProcessed = '1';
      const html = el.innerHTML;
      if (/<pre|<code|contenteditable/i.test(html)) continue;
      let out = html;
      out = out.replace(rxKV, (m, sp, key) => `${sp}<strong class="kv-key">${key}:</strong>`);
      out = out.replace(rxParen, (m, inside) => `<span class="span-paren">(${inside})</span>`);
      out = out.replace(rxChip, (m, dbl, sgl) => {
        const label = (dbl || sgl || '').trim();
        return `<span class="${dbl ? 'chip-btn' : 'chip'}" data-chip="${esc(label)}">${esc(label)}</span>`;
      });
      el.innerHTML = out;
    }
  };

  const processQuestions = (root = document) => {
    const paras = $$('p', root).filter(n => !n.closest('.q-card, pre, code, .no-beauty'));
    for (const p of paras) {
      try {
        const txt = (p.innerText || '').trim();
        if (txt.endsWith('?') && !p.dataset.qProcessed) {
          p.dataset.qProcessed = '1';
          const wrap = document.createElement('div'); wrap.className = 'q-card';
          wrap.innerHTML = `<div class="q-ico">?</div><div class="q-body">${esc(txt)}</div>`;
          p.replaceWith(wrap);
        }
      } catch (err) { /* silent */ }
    }
  };

  const beautifyFlow = (root = document) => {
    const container = root.querySelector('.flow-text') || root;
    $$('p', container).forEach(p => {
      try {
        const t = (p.innerText || '').trim();
        if (/^[^:\n]{3,}:\s*$/.test(t)) p.classList.add('kv-head');
        if (t.length > 600 && t.includes('. ')) {
          const mark = t.indexOf('. ', Math.floor(t.length / 2));
          if (mark > 0) {
            const a = t.slice(0, mark + 1), b = t.slice(mark + 1);
            const p2 = p.cloneNode(); p2.textContent = b.trim();
            p.textContent = a.trim();
            p.insertAdjacentElement('afterend', p2);
          }
        }
      } catch (err) { /* silent */ }
    });
  };

  const enableCopyLists = (root = document) => {
    const lists = $$('.list-card', root);
    for (const card of lists) {
      if (card.dataset.copyAttached === '1') continue;
      card.dataset.copyAttached = '1';
      const badge = document.createElement('div');
      badge.className = 'copy-badge'; badge.textContent = 'copiar';
      card.appendChild(badge);
      card.addEventListener('click', e => {
        if (e.target.closest('a,button,.chip,.chip-btn')) return;
        const txt = Array.from(card.querySelectorAll('li')).map(li => li.innerText.trim()).filter(Boolean).join('\n');
        if (!txt) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(() => {
            badge.textContent = 'copiado!';
            setTimeout(() => badge.textContent = 'copiar', 1200);
          }).catch(() => {
            badge.textContent = 'erro'; setTimeout(() => badge.textContent = 'copiar', 1200);
          });
        } else {
          // fallback
          const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); badge.textContent = 'copiado!'; } catch (err) { badge.textContent = 'erro'; }
          ta.remove(); setTimeout(() => badge.textContent = 'copiar', 1200);
        }
      }, { passive: true });
    }
  };

  const renderRawHTML = (root = document) => {
    // code fence transform
    $$('pre code', root).forEach(code => {
      const cls = (code.className || '').toLowerCase();
      if (cls.includes('language-html-raw') || cls.includes('lang-html-raw')) {
        const raw = code.textContent || '';
        const box = document.createElement('div'); box.className = 'raw-html-card';
        box.innerHTML = `<div class="raw-note">HTML/SVG renderizado a partir de bloco <code>html-raw</code></div>`;
        const slot = document.createElement('div'); slot.className = 'raw-slot';
        slot.innerHTML = raw; box.appendChild(slot);
        const pre = code.closest('pre'); if (pre) pre.replaceWith(box);
      }
    });

    $$('div[data-raw-html]', root).forEach(div => {
      try {
        const raw = div.textContent || '';
        const box = document.createElement('div'); box.className = 'raw-html-card';
        const slot = document.createElement('div'); slot.className = 'raw-slot';
        slot.innerHTML = raw; box.appendChild(slot); div.replaceWith(box);
      } catch (err) { /* silent */ }
    });
  };

  /* ----------------- LIST/ASCII V2 logic ----------------- */
  const wrapLists = (root = document) => {
    const lists = $$('ul,ol', root).filter(el => {
      if (el.closest('nav,menu,.no-beauty,.editor,.toolbar')) return false;
      if (el.classList.contains('ul-neo') || el.classList.contains('ol-neo')) return false;
      return true;
    });
    for (const el of lists) {
      const isOL = el.tagName === 'OL';
      el.classList.add(isOL ? 'ol-neo' : 'ul-neo');
      if (!el.parentElement.classList.contains('list-card')) {
        const wrap = document.createElement('div'); wrap.className = 'list-card';
        el.replaceWith(wrap); wrap.appendChild(el);
      }
    }
  };

  const asciiScore = (t = '') => {
    const box = /[─│┌┐└┘╭╮╰╯═╬╠╣╦╩]+/g, grid = /[-_=+*#\\/|]{3,}/g;
    const L = String(t).split('\n'); let h = 0;
    for (const ln of L) { if (box.test(ln) || grid.test(ln) || ln.trim().startsWith('> ')) h++; }
    return h >= Math.max(2, Math.ceil(L.length * 0.2));
  };

  const enhanceASCII = (root = document) => {
    const cand = new Set([...$$('pre', root), ...$$('code.language-text, code[class*="language-plaintext"]', root)]);
    $$('p', root).forEach(p => { const x = p.innerText || ''; if (x.includes('\n') && asciiScore(x)) cand.add(p); });
    for (const el of cand) {
      if (el.closest('.ascii-card,.no-beauty')) continue;
      const txt = (el.innerText || '').trim(); if (!asciiScore(txt)) continue;
      const fig = document.createElement('figure'); fig.className = 'ascii-card';
      const pre = document.createElement('pre'); pre.textContent = txt; fig.appendChild(pre);
      if (!el.closest('pre')) { const fc = document.createElement('figcaption'); fc.className = 'ascii-cap'; fc.textContent = 'ASCII • renderizado em bloco'; fig.appendChild(fc); }
      el.replaceWith(fig);
    }
  };

  const applyDashCapsuleByAttr = (root = document) => {
    // maintainer hook — we purposely do not force style changes
    // leaves ul.ul-neo as-is unless author adds classes/attrs
  };

  /* ----------------- central run orchestration ----------------- */
  const runAll = (ctx = document) => {
    try {
      // list & ascii may wrap nodes that later require inline processing -> run lists first
      wrapLists(ctx);
      processInline(ctx);
      processQuestions(ctx);
      beautifyFlow(ctx);
      enableCopyLists(ctx);
      renderRawHTML(ctx);
      enhanceASCII(ctx);
      applyDashCapsuleByAttr(ctx);
    } catch (err) {
      // fail-safe: log minimal info to console without breaking host
      if (window.DEBUG_UNIFIED_BEAUTY) console.warn('unified-beauty error', err);
    }
  };

  /* ----------------- single MutationObserver server ----------------- */
  const observeOptions = { childList: true, subtree: true };
  const observer = new MutationObserver(mutations => {
    // collect nodes to process (dedupe roots)
    const roots = new Set();
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1) roots.add(n);
        }
      }
      // if attributes changed in large apps, re-run whole doc cautiously
      if (m.type === 'attributes') roots.add(document);
    }
    // process each root (small heuristic)
    for (const root of roots) {
      try { runAll(root); } catch (e) { /* swallow */ }
    }
  });

  const startObserver = () => {
    observer.observe(document.body, observeOptions);
    // heuristics: also re-run on window focus (useful for SPA navigations)
    window.addEventListener('focus', () => runAll(document), { passive: true });
  };

  /* ----------------- chip delegation + quick edit toggle ----------------- */
  let EDIT_ON = false;
  const toggleEdit = () => {
    EDIT_ON = !EDIT_ON;
    document.body.toggleAttribute('data-edit', EDIT_ON);
    const host = document.getElementById('CONTENT') || document.querySelector('main, article, .render, .reader, body');
    if (host) host.contentEditable = EDIT_ON ? 'plaintext-only' : 'false';
  };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); toggleEdit(); }
  });

  document.addEventListener('click', e => {
    const chip = e.target.closest('.chip, .chip-btn');
    if (chip) {
      const label = chip.dataset.chip || chip.textContent.trim();
      const ev = new CustomEvent('chip:click', { detail: { label, source: 'unified-beauty' } });
      document.dispatchEvent(ev);
    }
  }, { passive: true });

  /* ----------------- boot sequence ----------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { runAll(document); startObserver(); });
  } else {
    runAll(document); startObserver();
  }

  // for external tooling: expose a safe API
  window.UNIFIED_BEAUTY = {
    run: runAll,
    observe: startObserver,
    disconnect: () => observer.disconnect()
  };
})();

lucide.createIcons();

    const els = {
      card: document.getElementById('mainCard'),
      header: document.getElementById('cardHeader'),
      avatarTgt: document.getElementById('avatarTarget'),
      input: document.getElementById('inputUser'),
      lblHello: document.getElementById('lblHello'),
      lblName: document.getElementById('lblName'),
      clock: document.getElementById('clockTime'),
      smallPreview: document.getElementById('smallPreview'),
      smallMiniAvatar: document.getElementById('smallMiniAvatar'),
      smallText: document.getElementById('smallText'),
      smallIdent: document.getElementById('smallIdent'),
      actCard: document.getElementById('activationCard'),
      actPre: document.getElementById('actPre'),
      actName: document.getElementById('actName'),
      actMiniAvatar: document.getElementById('actMiniAvatar'),
      actBadge: document.getElementById('actBadge'),
      securityStatus: document.getElementById('securityStatus'),
      // Buttons
      btnModeCard: document.getElementById('btnModeCard'),
      btnModeOrb: document.getElementById('btnModeOrb'),
      btnModeHud: document.getElementById('btnModeHud'),
      orbMenuTrigger: document.getElementById('orbMenuTrigger'),
      hudMenuBtn: document.getElementById('hudMenuBtn'),
      snapZone: document.getElementById('snap-zone'),
      // Keys UI
      keysModal: document.getElementById('keysModal'),
      keyList: document.getElementById('keyList'),
      keyName: document.getElementById('keyNameInput'),
      keyToken: document.getElementById('keyTokenInput'),
      keyWebhook: document.getElementById('keyWebhookInput'),
      addKeyBtn: document.getElementById('addKeyBtn'),
      closeKeysBtn: document.getElementById('closeKeysBtn'),
      testWebhookBtn: document.getElementById('testWebhookBtn'),
      exportKeysBtn: document.getElementById('exportKeysBtn'),
      importKeysBtn: document.getElementById('importKeysBtn'),
      importFileInput: document.getElementById('importFileInput'),
      lockVaultBtn: document.getElementById('lockVaultBtn'),
      vaultStatusText: document.getElementById('vaultStatusText'),
      // Vault UI
      vaultModal: document.getElementById('vaultModal'),
      vaultPass: document.getElementById('vaultPassInput'),
      vaultUnlock: document.getElementById('vaultUnlockBtn'),
      vaultCancel: document.getElementById('vaultCancelBtn'),
      // New System UI
      systemCard: document.getElementById('systemCard'),
      toggleBtn: document.getElementById('toggleBtn')
    };

    // --- CRYPTO UTILS ---
    const CRYPTO = {
      algo: { name: 'AES-GCM', length: 256 },
      pbkdf2: { name: 'PBKDF2', hash: 'SHA-256', iterations: 100000 },
      salt: window.crypto.getRandomValues(new Uint8Array(16)), 
      async getKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
        return window.crypto.subtle.deriveKey({ ...this.pbkdf2, salt: salt }, keyMaterial, this.algo, false, ["encrypt", "decrypt"]);
      },
      async encrypt(data, password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await this.getKey(password, salt);
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encoded);
        const bundle = { s: Array.from(salt), iv: Array.from(iv), d: Array.from(new Uint8Array(encrypted)) };
        return JSON.stringify(bundle);
      },
      async decrypt(bundleStr, password) {
        try {
          const bundle = JSON.parse(bundleStr);
          const salt = new Uint8Array(bundle.s);
          const iv = new Uint8Array(bundle.iv);
          const data = new Uint8Array(bundle.d);
          const key = await this.getKey(password, salt);
          const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
          return JSON.parse(new TextDecoder().decode(decrypted));
        } catch(e) { throw new Error("Senha incorreta ou dados corrompidos"); }
      }
    };

    // --- STATE & PERSISTENCE ---
    const STORAGE_KEY = 'fusion_os_data_v2';
    const UI_STATE_KEY = 'fusion_os_ui_state';
    
    let STATE = {
      keys: [], 
      user: 'Convidado',
      isEncrypted: false,
      encryptedData: null
    };
    let SESSION_PASSWORD = null;

    function saveUIState() {
        const mode = state.isOrb ? 'orb' : (state.isHud ? 'hud' : 'card');
        const uiState = {
            mode: mode,
            left: els.card.style.left,
            top: els.card.style.top,
            zen: document.body.classList.contains('zen-mode')
        };
        localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState));
    }
    
    function loadUIState() {
        const raw = localStorage.getItem(UI_STATE_KEY);
        if(!raw) return;
        try {
            const ui = JSON.parse(raw);
            if(ui.zen) {
                document.body.classList.add('zen-mode');
                document.getElementById('mantra-toggle').classList.add('collapsed');
                if(document.getElementById('zenModeCheckbox')) document.getElementById('zenModeCheckbox').checked = true;
            }
            if (ui.mode === 'orb' || ui.mode === 'hud') {
                els.card.style.transition = 'none'; 
                if (ui.mode === 'orb') {
                    if(ui.left) els.card.style.left = ui.left;
                    if(ui.top) els.card.style.top = ui.top;
                    window.setMode('orb', true);
                } else {
                    window.setMode('hud', true);
                }
                setTimeout(() => els.card.style.transition = '', 200);
            }
        } catch(e) { console.error("UI Load Error", e); }
    }

    function saveData() {
      const payload = { keys: STATE.keys, user: STATE.user };
      if (SESSION_PASSWORD) {
        CRYPTO.encrypt(payload, SESSION_PASSWORD).then(enc => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ isEncrypted: true, data: enc }));
          STATE.isEncrypted = true;
          STATE.encryptedData = enc;
          updateSecurityUI();
        });
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ isEncrypted: false, data: payload }));
      }
    }

    async function loadData() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.isEncrypted) {
        STATE.isEncrypted = true;
        STATE.encryptedData = parsed.data;
        updateSecurityUI();
      } else {
        STATE.keys = parsed.data.keys || [];
        STATE.user = parsed.data.user || 'Convidado';
        
        const active = STATE.keys.find(k=>k.active);
        if(active && active.token) {
           localStorage.setItem('di_apiKey', active.token);
           if(typeof apiKey !== 'undefined') apiKey = active.token;
        }
        
        if(STATE.user !== 'Convidado') {
           localStorage.setItem('di_userName', STATE.user);
           if(typeof userName !== 'undefined') userName = STATE.user;
           if(document.getElementById('userNameInput')) document.getElementById('userNameInput').value = STATE.user;
           if(document.getElementById('inputUser')) document.getElementById('inputUser').value = STATE.user;
        }

        updateInterface(STATE.user);
        renderKeysList();
      }
    }

    const hashStr = s => { let h=0xdeadbeef; for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),2654435761);} return (h^h>>>16)>>>0; };
    const createSvg = (id,sz) => `<svg viewBox="0 0 100 100" width="${sz}" height="${sz}"><defs><linearGradient id="g${id}"><stop offset="0%" stop-color="#00f2ff"/><stop offset="100%" stop-color="#bd00ff"/></linearGradient></defs><circle cx="50" cy="50" r="48" fill="#080b12" stroke="rgba(255,255,255,0.1)"/><circle cx="50" cy="50" r="20" fill="url(#g${id})" opacity="0.9"/></svg>`;
    const createMiniSvg = (name,sz=30) => {
      const s = hashStr(name||'D'); const h1=s%360; const h2=(s*37)%360;
      const grad = `<linearGradient id="gm${s}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1},90%,50%)"/><stop offset="1" stop-color="hsl(${h2},90%,50%)"/></linearGradient>`;
      return `<svg width="${sz}" height="${sz}" viewBox="0 0 32 32"><defs>${grad}</defs><rect width="32" height="32" rx="8" fill="#0a1016"/><circle cx="16" cy="16" r="6" fill="url(#gm${s})"/></svg>`;
    };

    function updateInterface(name){
      const safe = name || 'Convidado';
      els.lblName.innerText = safe;

})();
