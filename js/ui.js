(function(){
'use strict';

// --- part 2 ---
      els.input.value = safe;
      const activeKey = STATE.keys.find(k=>k.active);
      els.smallIdent.innerText = activeKey ? activeKey.name : '--';
      els.actBadge.innerText = activeKey ? `key:${activeKey.name}` : 'v:--';
      els.smallMiniAvatar.innerHTML = createMiniSvg(safe);
      els.actMiniAvatar.innerHTML = createMiniSvg(safe,36);
      els.actName.innerText = safe;
      els.avatarTgt.innerHTML = createSvg('Main',64);
      const phrases = ["Foco estável.","Ritmo criativo.","Percepção sutil."];
      els.smallText.innerText = activeKey ? `${activeKey.name} [ATIVO]` : (safe==='Convidado'?'Aguardando...':`${safe} · ${phrases[safe.length%phrases.length]}`);
      const line = `+${'-'.repeat(safe.length+4)}+`;
      els.actPre.innerText = `${line}\n| ${safe.toUpperCase()} |\n${line}\nID: ${hashStr(safe).toString(16)}`;

      const tiUser = document.getElementById('displayUser');
      if(tiUser) tiUser.innerText = 'User: ' + safe;
    }

    function updateSecurityUI() {
      if (SESSION_PASSWORD) {
        els.securityStatus.innerText = "COFRE DESTRANCADO"; els.securityStatus.style.color = "var(--neon-success)";
        els.vaultStatusText.innerText = "Cofre Protegido (Destrancado)"; els.lockVaultBtn.innerText = "TRANCAR";
      } else if (STATE.isEncrypted) {
        els.securityStatus.innerText = "CRIPTOGRAFADO"; els.securityStatus.style.color = "var(--neon-gold)";
        els.vaultStatusText.innerText = "Cofre Trancado"; els.lockVaultBtn.innerText = "REDEFINIR";
      } else {
        els.securityStatus.innerText = "SEM PROTEÇÃO"; els.securityStatus.style.color = "rgba(255,255,255,0.5)";
        els.vaultStatusText.innerText = "Cofre Aberto (Sem senha)"; els.lockVaultBtn.innerText = "CRIAR SENHA";
      }
    }

    function renderKeysList(){
      els.keyList.innerHTML = '';
      if(STATE.keys.length===0){ els.keyList.innerHTML = '<div style="color:rgba(255,255,255,0.3);text-align:center;padding:20px">Nenhuma chave armazenada.</div>'; return; }
      STATE.keys.forEach(k=>{
        const div = document.createElement('div');
        div.className = `key-item ${k.active?'active-item':''}`;
        const typeInfo = k.webhook ? '<span style="color:var(--neon-purple)">WEBHOOK</span>' : 'API KEY';
        div.innerHTML = `
          <div class="meta"><div style="font-weight:700;font-size:0.9rem">${escapeHtml(k.name)}</div><div style="font-size:0.75rem;color:rgba(255,255,255,0.5)">${typeInfo}</div></div>
          <div class="actions">
            ${!k.active ? `<button class="small-btn" onclick="setActiveKey('${k.id}')">ATIVAR</button>` : `<span style="font-size:0.7rem;font-weight:700;color:var(--neon-cyan);margin-right:10px">ATIVA</span>`}
            <button class="small-btn danger" onclick="removeKey('${k.id}')"><i data-lucide="trash-2" style="width:14px"></i></button>
          </div>`;
        els.keyList.appendChild(div);
      });
      lucide.createIcons();
    }

    function addKey() {
      const name = els.keyName.value.trim();
      const token = els.keyToken.value.trim();
      const webhook = els.keyWebhook.value.trim();
      if(!name){ showToaster('Nome obrigatório','error'); return; }
      const newKey = { id: Date.now().toString(36), name, token, webhook, active: STATE.keys.length===0 };
      STATE.keys.push(newKey);
      if(newKey.active && newKey.token) {
        localStorage.setItem('di_apiKey', newKey.token);
        if(typeof apiKey !== 'undefined') apiKey = newKey.token;
      }
      saveData(); renderKeysList(); updateInterface(STATE.user);
      els.keyName.value=''; els.keyToken.value=''; els.keyWebhook.value='';
      showToaster('Chave adicionada!', 'success');
    }

    window.removeKey = (id) => {
      if(confirm('Remover chave permanentemente?')){
        STATE.keys = STATE.keys.filter(k=>k.id!==id);
        saveData(); renderKeysList(); updateInterface(STATE.user);
      }
    };

    window.setActiveKey = (id) => {
      let activatedToken = null;
      STATE.keys.forEach(k=> {
        k.active = (k.id===id);
        if(k.active) activatedToken = k.token;
      });
      if(activatedToken) {
        localStorage.setItem('di_apiKey', activatedToken);
        if(typeof apiKey !== 'undefined') apiKey = activatedToken;
        if(document.getElementById('apiKeyInput')) document.getElementById('apiKeyInput').value = activatedToken;
        showToaster('Chave sincronizada com o Chat.', 'success');
      }
      saveData(); renderKeysList(); updateInterface(STATE.user);
    };

    // --- VAULT EVENTS ---
    els.testWebhookBtn.addEventListener('click', async () => { showToaster('Ping enviado (simulado)','success'); });
    function openManager() {
      if (STATE.isEncrypted && !SESSION_PASSWORD) { els.vaultModal.style.display='flex'; els.vaultPass.focus(); } 
      else { els.keysModal.style.display='flex'; }
    }
    els.vaultUnlock.addEventListener('click', async () => {
      const pass = els.vaultPass.value;
      try {
        const decrypted = await CRYPTO.decrypt(STATE.encryptedData, pass);
        SESSION_PASSWORD = pass; STATE.keys = decrypted.keys; STATE.user = decrypted.user;
        const active = STATE.keys.find(k=>k.active);
        if(active && active.token) { localStorage.setItem('di_apiKey', active.token); if(typeof apiKey !== 'undefined') apiKey = active.token; }
        if(STATE.user) { localStorage.setItem('di_userName', STATE.user); if(typeof userName !== 'undefined') userName = STATE.user; }
        els.vaultModal.style.display='none'; els.keysModal.style.display='flex'; els.vaultPass.value='';
        renderKeysList(); updateSecurityUI(); showToaster('Cofre destrancado.', 'success');
      } catch(e) { showToaster('Senha incorreta.', 'error'); }
    });
    els.lockVaultBtn.addEventListener('click', () => {
       if (!SESSION_PASSWORD && !STATE.isEncrypted) {
         const newPass = prompt("Defina uma senha para o Cofre:");
         if(newPass) { SESSION_PASSWORD=newPass; saveData(); showToaster("Cofre trancado.", 'success'); }
       } else if (SESSION_PASSWORD) {
         SESSION_PASSWORD=null; els.keysModal.style.display='none'; showToaster("Sessão do cofre encerrada.", 'success');
       } else {
         showToaster("Cofre já criptografado. Desbloqueie para redefinir.", 'error');
       }
       updateSecurityUI();
    });
    els.vaultCancel.addEventListener('click', ()=> els.vaultModal.style.display='none');
    els.closeKeysBtn.addEventListener('click', ()=> els.keysModal.style.display='none');
    els.addKeyBtn.addEventListener('click', addKey);

    // --- CINEMATIC GESTURES & MODES (REFINED V7) ---

    let state = {
        isOrb: false,
        isHud: false,
        isDragging: false,
        timer: null,
        startX: 0,
        startY: 0,
        dragOffsetX: 0,
        dragOffsetY: 0,
        pointerId: null
    };

    const HUD_SNAP_THRESHOLD = 60; // Distância do topo para snapar
    const SWIPE_DOWN_THRESHOLD = 80; // Distância para puxar HUD
    const LONG_PRESS_MS = 350; // Tempo para virar Orb via long press

    // Passive: false para permitir preventDefault() se necessário
    els.card.addEventListener('pointerdown', handleStart, { passive: false });
    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd, { passive: false });

    // Opening Configs
    els.avatarTgt.addEventListener('click', (e)=>{ if(!state.isOrb && !state.isHud) openManager(); });
    els.orbMenuTrigger.addEventListener('click', (e)=>{ e.stopPropagation(); window.setMode('card'); toggleSection('systemCard', true); });
    els.hudMenuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); window.setMode('card'); toggleSection('systemCard', true); });
    
    // Open Config from Header click in HUD Mode
    els.header.addEventListener('click', (e) => {
        if(state.isHud && !state.isDragging && !e.target.closest('.hud-menu-btn')) {
             window.setMode('card');
             toggleSection('systemCard', true);
        }
    });

    els.card.addEventListener('contextmenu', (e)=>{
        if(state.isOrb || state.isHud) { e.preventDefault(); window.setMode('card'); }
    });

    function handleStart(e) {
      // Ignorar interações internas (inputs, textareas)
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'BUTTON' && !e.target.closest('.orb-menu-trigger'))) return;
      
      // No modo Card, só permitir arrastar pelo Header
      if(!state.isOrb && !state.isHud && !els.header.contains(e.target)) return;

      state.startX = e.clientX;
      state.startY = e.clientY;
      state.pointerId = e.pointerId;

      // Se já for Orb/Hud -> Iniciar arraste imediato
      if(state.isOrb || state.isHud) {
          state.isDragging = true;
          try { els.card.setPointerCapture(e.pointerId); } catch(err){}
          
          const rect = els.card.getBoundingClientRect();
          state.dragOffsetX = e.clientX - rect.left;
          state.dragOffsetY = e.clientY - rect.top;
          els.card.style.transition = 'none';
          return;
      }

      // Se for Card: Iniciar timer de Long Press, mas monitorar movimento para "swipe up"
      state.timer = setTimeout(() => {
          transmuteToOrb(e);
          saveUIState();
      }, LONG_PRESS_MS);
    }
    
    function handleMove(e) {
      // Detecção de Swipe Up / Side Drag no modo Card antes do timer acabar
      if(!state.isOrb && !state.isHud && state.timer) {
          const dx = e.clientX - state.startX;
          const dy = e.clientY - state.startY;
          const dist = Math.hypot(dx, dy);
          
          // Se moveu o suficiente (swipe), cancelar timer e virar Orb imediatamente
          // Lógica: Se arrastar pra cima (dy < -10) ou muito pros lados (dx > 18)
          if (dist > 12 && (dy < -10 || Math.abs(dx) > 18)) { 
              clearTimeout(state.timer); state.timer = null;
              
              // Transmutar e continuar arrastando
              transmuteToOrb(e); 
              
              // Recalcular offset para o drag não "pular"
              const rect = els.card.getBoundingClientRect();
              state.dragOffsetX = e.clientX - rect.left;
              state.dragOffsetY = e.clientY - rect.top;
              try { els.card.setPointerCapture(e.pointerId); } catch(err){}
              els.card.style.transition = 'none';
          }
          
          // Se foi um movimento pequeno (jitter), talvez cancelar se for scroll? 
          // Deixamos o browser decidir o scroll se não for drag.
      }
    
      if(!state.isDragging) return;

      e.preventDefault(); // Prevenir scroll da página enquanto arrasta o Orb/HUD

      if(state.isOrb) {
          const x = e.clientX - state.dragOffsetX;
          const y = e.clientY - state.dragOffsetY;
          els.card.style.left = `${x}px`;
          els.card.style.top = `${y}px`;
          
          if(y < HUD_SNAP_THRESHOLD) els.snapZone.classList.add('active');
          else els.snapZone.classList.remove('active');

      } else if (state.isHud) {
          const deltaY = e.clientY - state.startY;
          if(deltaY > 0) {
             els.card.style.transform = `translateX(-50%) translateY(${deltaY * 0.4}px)`;
             if(deltaY > SWIPE_DOWN_THRESHOLD) els.snapZone.classList.add('active');
             else els.snapZone.classList.remove('active');
          }
      }
    }
    
    function handleEnd(e) {
      if(state.timer){ clearTimeout(state.timer); state.timer=null; }
      
      if(state.isDragging) {
          state.isDragging = false;
          try { els.card.releasePointerCapture && els.card.releasePointerCapture(state.pointerId); } catch(err){}
          els.card.style.transition = ''; 
          els.snapZone.classList.remove('active');

          if(state.isOrb) {
              const rect = els.card.getBoundingClientRect();
              if(rect.top < HUD_SNAP_THRESHOLD) {
                  setMode('hud');
              } else {
                  saveUIState();
              }
          } else if (state.isHud) {
              const deltaY = e.clientY - state.startY;
              if (deltaY > SWIPE_DOWN_THRESHOLD) {
                  const x = e.clientX - 34; 
                  const y = e.clientY - 10;
                  els.card.style.left = `${x}px`;
                  els.card.style.top = `${y}px`;
                  setMode('orb');
              } else {
                  els.card.style.transform = `translateX(-50%) translateY(0)`;
              }
          }
      } else {
          // Clique simples no header do Card (Toggle)
          if(!state.isOrb && !state.isHud && els.header.contains(e.target)) {
               toggleCardState();
          }
      }
      state.pointerId = null;
    }
    
    function transmuteToOrb(eOrX) {
      // Aceita evento ou coordenadas, mas preferimos evento para capturar pointer
      let x, y, ev;
      if(eOrX && eOrX.clientX !== undefined) { ev = eOrX; x = ev.clientX; y = ev.clientY; }
      else { return; } // Precisa de evento para fluidez total

      if(navigator.vibrate) navigator.vibrate(40);
      els.card.classList.add('orb','closed'); 
      els.card.classList.remove('content-visible');
      
      // Centralizar visualmente (será sobrescrito pelo drag move imediato)
      els.card.style.left = (x - 34) + 'px'; 
      els.card.style.top = (y - 34) + 'px';
      
      state.isOrb=true; state.isHud=false;
      
      // Iniciar drag imediatamente
      state.isDragging = true;
      if(ev && ev.pointerId) {
          state.pointerId = ev.pointerId;
          try { els.card.setPointerCapture(ev.pointerId); } catch(e){}
          const rect = els.card.getBoundingClientRect();
          state.dragOffsetX = x - rect.left;
          state.dragOffsetY = y - rect.top;
      }

      updateModeButtons('orb');
    }

    function revertToCard() {
      state.isOrb=false; state.isHud=false;
      els.card.style.transition='all 0.5s var(--ease-smooth)'; 
      els.card.style.left=''; els.card.style.top=''; 
      els.card.style.width=''; els.card.style.height=''; 
      els.card.style.transform='';
      els.card.classList.remove('orb','hud','closed'); 
      setTimeout(()=>els.card.classList.add('content-visible'),300);
    }
    
    window.setMode = (mode, isInitialLoad = false) => {
        updateModeButtons(mode);

        if(mode === 'card') {
            revertToCard();
        } else if (mode === 'orb') {
            state.isOrb = true; state.isHud = false;
            els.card.classList.add('orb', 'closed');
            els.card.classList.remove('hud', 'content-visible');
            els.card.style.transform = 'none';
        } else if (mode === 'hud') {
            state.isHud = true; state.isOrb = false;
            els.card.classList.add('hud', 'closed'); 
            els.card.classList.remove('orb', 'content-visible');
            els.card.style.top = ''; 
            els.card.style.left = ''; 
            els.card.style.transform = '';
        }
        
        if(!isInitialLoad) saveUIState();
    };

    function updateModeButtons(mode) {
        [els.btnModeCard, els.btnModeOrb, els.btnModeHud].forEach(b=>b.classList.remove('active-mode'));
        if(mode==='card') els.btnModeCard.classList.add('active-mode');
        if(mode==='orb') els.btnModeOrb.classList.add('active-mode');
        if(mode==='hud') els.btnModeHud.classList.add('active-mode');
    }

    function toggleCardState() {
      if(els.card.classList.contains('animating')) return;
      const isClosed=els.card.classList.contains('closed'); els.card.classList.add('animating');
      if(isClosed) { els.card.classList.remove('closed'); els.card.animate([{transform:'scale(0.95)',opacity:0.8},{transform:'scale(1)',opacity:1}],{duration:400}).onfinish=()=>{els.card.classList.remove('animating');els.card.classList.add('content-visible');} }
      else { els.card.classList.remove('content-visible'); els.card.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(10px)',opacity:1}],{duration:200}).onfinish=()=>{els.card.classList.add('closed');els.card.classList.remove('animating');} }
    }
    
    // Helpers
    function escapeHtml(s){ return s ? s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : ''; }
    function showToaster(txt,type='default'){ const t=document.createElement('div'); t.className=`toaster ${type}`; t.innerText=txt; document.getElementById('toasterWrap').appendChild(t); setTimeout(()=>t.classList.add('show'),10); setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300)},2500); }
    function toggleSection(id, forceOpen = false){ 
        const el = document.getElementById(id);
        const h = el.classList.contains('activation-hidden'); 
        if(forceOpen && !h) return; // Already open
        el.classList.toggle('activation-hidden', !forceOpen && !h); 
        el.classList.toggle('activation-open', forceOpen || h); 
    }
    window.toggleActivation = () => toggleSection('activationCard');

    // Logic Init
    els.input.addEventListener('input', (e)=>{ 
       STATE.user=e.target.value; 
       localStorage.setItem('di_userName', STATE.user); 
       if(typeof userName !== 'undefined') userName=STATE.user;
       updateInterface(e.target.value); saveData(); 
    });
    
    // INITIAL LOAD
    setTimeout(()=>{ 
        els.card.classList.add('active'); 
        els.avatarTgt.classList.add('shown'); 
        loadData(); 
        loadUIState(); 
        updateChatUI();
    }, 100);
    setInterval(()=>{ els.clock.innerText = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); },1000);

const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
    const TEMPERATURE = 0.2;

    let training = localStorage.getItem('di_trainingText') || '';
    let trainingFileName = localStorage.getItem('di_trainingFileName') || '';
    let assistantEnabled = (localStorage.getItem('di_assistantEnabled') === '1');
    let trainingActive = (localStorage.getItem('di_trainingActive') !== '0'); 
    let conversation = [];
    let pages = [], currentPage = 0, autoAdvance = true;

    // Configs
    let apiKey = localStorage.getItem('di_apiKey') || '';
    let modelName = localStorage.getItem('di_modelName') || 'nvidia/nemotron-3-nano-30b-a3b:free';
    let userName = localStorage.getItem('di_userName') || '';
    let infodoseName = localStorage.getItem('di_infodoseName') || '';
    const CRYSTAL_KEY = 'di_cristalizados';

// === Model Selector ===
const modelSelect = document.getElementById('modelSelect');

// carregar modelo salvo
const savedModel = localStorage.getItem('di_modelName');
if (savedModel) {
  modelName = savedModel;
  if (modelSelect) modelSelect.value = savedModel;
}

// escutar mudança
modelSelect?.addEventListener('change', e => {
  modelName = e.target.value;
  localStorage.setItem('di_modelName', modelName);
  showToaster?.(`Modelo ativo: ${modelName}`, 'default');
});

    const createEl = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };

    function updateChatUI() {
       const uEl = document.getElementById('displayUser');
       const iEl = document.getElementById('displayInfodose');
       if(uEl) uEl.innerText = 'User: ' + (userName || '—');
       if(iEl) iEl.innerText = 'Infodose: ' + (infodoseName || '—');
       
       // Settings Inputs
       if(document.getElementById('apiKeyInput')) document.getElementById('apiKeyInput').value = apiKey;
       if(document.getElementById('modelInput')) document.getElementById('modelInput').value = modelName;
       if(document.getElementById('infodoseNameInput')) document.getElementById('infodoseNameInput').value = infodoseName;

})();
