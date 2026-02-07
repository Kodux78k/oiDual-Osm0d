(function(){
'use strict';

// --- part 3 ---
       
       // Toggles
       if(document.getElementById('assistantActiveCheckbox')) document.getElementById('assistantActiveCheckbox').checked = assistantEnabled;
       if(document.getElementById('trainingActiveCheckbox')) document.getElementById('trainingActiveCheckbox').checked = trainingActive;
       
       // Update Chat Toggle Button Visual
       updateToggleBtnVisual();
    }
    
    function updateToggleBtnVisual() {
        const btn = els.toggleBtn;
        if(assistantEnabled) {
            btn.classList.add('active');
            btn.title = "Assistant ON";
        } else {
            btn.classList.remove('active');
            btn.title = "Assistant OFF";
        }
    }

    // TTS Logic ... (Same as before)
    const speakText = (txt, onend)=> {
      if (!txt) { if (onend) onend(); return; }
      const u = new SpeechSynthesisUtterance(txt);
      u.lang = 'pt-BR'; u.rate = 0.99; u.pitch = 1.1;
      if (window._vozes) u.voice = window._vozes.find(v=>v.lang==='pt-BR') || window._vozes[0];
      if (onend) u.onend = onend;
      speechSynthesis.speak(u);
    };

   /* === PATCH JS: substituir splitBlocks + renderPaginatedResponse + speakPage/changePage/showLoading === */

/* simples parser markdown leve (bold, italic, inline code, links, codeblocks, lists) */
function mdToHtml(md){
  if(!md) return '';
  // code block ``` ``` 
  md = md.replace(/```([^`]*)```/gs, function(_, code){ return '<pre><code>' + escapeHtml(code) + '</code></pre>'; });
  // inline code `code`
  md = md.replace(/`([^`]+)`/g, function(_, c){ return '<code>' + escapeHtml(c) + '</code>'; });
  // links [text](url)
  md = md.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // bold **text**
  md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic *text*
  md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // unordered lists (- or *)
  md = md.replace(/(^|\n)[\-\*]\s+(.+?)(?=\n|$)/g, function(_, pre, item){ return pre + '<li>' + item + '</li>'; });
  md = md.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  // paragraphs: remaining single newlines -> <br>, double newlines -> separate paragraphs
  const paras = md.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return paras.map(p => '<p>' + p.replace(/\n/g,'<br>') + '</p>').join('');
}

/* divide texto em grupos de 3 blocos (fallback para sentenças) */
const splitBlocks = text => {
  if (!text || !text.trim()) return [['Sem conteúdo.','','']];
  let paras = text.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  // se muitos pequenos parágrafos e não múltiplo de 3, quebra por sentenças
  if (paras.length < 3 || paras.length % 3 !== 0) {
    const sens = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    paras = sens.map(s=>s.trim()).filter(Boolean);
  }
  const groups = [];
  for (let i=0;i<paras.length;i+=3) groups.push(paras.slice(i,i+3));
  return groups;
};

const renderPaginatedResponse = text => {
  // cancel TTS ongoing
  try { speechSynthesis.cancel(); } catch(e){}
  autoAdvance = true;
  const respEl = document.getElementById('response');
  // remove previous generated pages but keep the controls and initial page if present
  Array.from(respEl.querySelectorAll('.page')).forEach(p => {
    if (!p.classList.contains('initial')) p.remove();
  });
  pages = [];
  const groups = splitBlocks(text);
  const controls = respEl.querySelector('.response-controls');
  const titles = ['🎁 Recompensa Inicial','👁️ Exploração e Curiosidade','⚡ Antecipação Vibracional'];

  groups.forEach((tris, gi) => {
    const page = createEl('div', gi===0 ? 'page active' : 'page');
    // content container
    tris.forEach((body, j) => {
      const cls = j===0 ? 'intro' : j===1 ? 'middle' : 'ending';
      // convert markdown-lite to html inside block-body
      const htmlBody = mdToHtml(body);
      const b = createEl('div','response-block '+cls, `<h3>${titles[j]}</h3><div class="block-body">${htmlBody}</div>`);
      const meta = createEl('div','meta');
      const crystalBtn = createEl('button','crystal-btn','✶');
      crystalBtn.title = 'Cristalizar';
      crystalBtn.addEventListener('click', (ev)=>{
        ev.stopPropagation();
        cristalizar({ title: titles[j], content: body });
        crystalBtn.innerText = '✓'; setTimeout(()=> crystalBtn.innerText = '✶', 1200);
      });
      meta.appendChild(crystalBtn);
      b.appendChild(meta);

      // state & click behavior (TTS / expand -> trigger AI)
      b.dataset.state = '';
      b.addEventListener('click', (ev) => {
        // prevent inner meta buttons from toggling
        if (ev.target.closest('.meta')) return;
        const alreadySpoken = b.dataset.state === 'spoken';
        if (!alreadySpoken) {
          try { speechSynthesis.cancel(); } catch(e){}
          // speak only visible text (collapse tags removed)
          const textToSpeak = b.querySelector('.block-body') ? b.querySelector('.block-body').innerText : body;
          speakText(textToSpeak);
          b.classList.add('clicked'); b.dataset.state = 'spoken';
        } else {
          // expand and call AI
          b.classList.add('expanded'); b.dataset.state = '';
          if (!assistantEnabled) {
            assistantEnabled = true; localStorage.setItem('di_assistantEnabled','1');
            updateToggleBtnVisual();
            if (training && trainingActive) conversation.unshift({ role:'system', content: training });
          }
          const blockText = `${titles[j]}\n\n${body}`;
          showLoading('Pulso em Expansão...');
          speakText('Pulso em Expansão...');
          conversation.push({ role:'user', content: blockText });
          callAI();
        }
      });

      page.appendChild(b);
    });

    page.appendChild(createEl('p','footer-text',`<em>Do seu jeito. <strong>Sempre</strong> único. <strong>Sempre</strong> seu.</em>`));
    // insert new page before controls (so controls always at bottom)
    if (controls && controls.parentNode) respEl.insertBefore(page, controls);
    else respEl.appendChild(page);
    pages.push(page);
  });

  currentPage = 0;
  const pi = document.getElementById('pageIndicator');
  if (pi) pi.textContent = `1 / ${pages.length}`;
  // start speaking first page
  speakPage(0);
};

const speakPage = i => {
  const page = pages[i]; if (!page) return;
  const body = Array.from(page.querySelectorAll('.block-body')).map(n => n.innerText).join(' ');
  speakText(body, () => {
    if (!autoAdvance) return;
    if (i < pages.length - 1) { changePage(1); speakPage(i+1); } else { speakText('Sempre único, sempre seu.'); }
  });
};

const changePage = offset => {
  const np = currentPage + offset; if (np<0 || np>=pages.length) return;
  if (pages[currentPage]) pages[currentPage].classList.remove('active');
  if (pages[np]) pages[np].classList.add('active');
  currentPage = np;
  const pi = document.getElementById('pageIndicator');
  if (pi) pi.textContent = `${currentPage+1} / ${pages.length}`;
};

const showLoading = msg => {
  const respEl = document.getElementById('response');
  const controls = respEl.querySelector('.response-controls');
  respEl.querySelectorAll('.page').forEach(p => { if(!p.classList.contains('initial')) p.remove(); });
  const page = createEl('div','page active'); page.appendChild(createEl('p','footer-text',msg));
  if (controls && controls.parentNode) respEl.insertBefore(page, controls);
  else respEl.appendChild(page);
  pages = [page];
  currentPage = 0;
  const pi = document.getElementById('pageIndicator');
  if (pi) pi.textContent = '…';
};

    async function callAI() {
      apiKey = localStorage.getItem('di_apiKey') || apiKey;

      if (!apiKey) {
        alert('Nenhuma API Key ativa! Ative uma chave no Card (Cofre) ou no Painel.');
        return;
      }
      const bodyObj = { model: modelName, messages: conversation.slice(), temperature: TEMPERATURE };
      const messagesToSend = [];
      if (assistantEnabled && trainingActive && training) messagesToSend.push({ role:'system', content: training });
      conversation.forEach(m => { if (m.role !== 'system') messagesToSend.push(m); });
      bodyObj.messages = messagesToSend;

      try {
        const resp = await fetch(API_ENDPOINT, {
          method:'POST', headers:{ 'Authorization':`Bearer ${apiKey}`, 'Content-Type':'application/json' },
          body: JSON.stringify(bodyObj)
        });
        if (!resp.ok) throw new Error('Erro API: ' + resp.status);
        const data = await resp.json();
        const answer = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : 'Resposta vazia';
        conversation.push({ role:'assistant', content: answer });
        renderPaginatedResponse(answer);
      } catch (err) {
        console.error(err);
        const errorMsg = 'Falha na conexão. Verifique se a chave está ativa no Card.';
        conversation.push({ role:'assistant', content: errorMsg });
        renderPaginatedResponse(errorMsg);
      }
    }

    async function sendMessage(){
      const respEl = document.getElementById('response');
      const initPage = respEl.querySelector('.page.initial');
      if (initPage) initPage.remove();
      const input = document.getElementById('userInput');
      const raw = input.value.trim(); if (!raw) return;
      input.value = '';
      speechSynthesis.cancel(); speakText('');

      if (raw.toLowerCase().includes('oi dual')) {
        assistantEnabled = true; localStorage.setItem('di_assistantEnabled','1');
        updateToggleBtnVisual();
        showLoading('Conectando Dual Infodose...');
        if (training && trainingActive) conversation.unshift({ role:'system', content: training });
      } else { showLoading('Processando...'); }
      conversation.push({ role:'user', content: raw });
      callAI();
    }
    
    // Quick Toggle Action
    els.toggleBtn.addEventListener('click', () => {
        assistantEnabled = !assistantEnabled;
        localStorage.setItem('di_assistantEnabled', assistantEnabled ? '1' : '0');
        showToaster(assistantEnabled ? 'Assistant ON (Fetch Ativo)' : 'Assistant OFF (Fetch Desativado)', assistantEnabled ? 'success' : 'default');
        updateChatUI();
    });

    function cristalizar({ title, content }) {
      const list = JSON.parse(localStorage.getItem(CRYSTAL_KEY) || '[]');
      list.unshift({ id: Date.now(), title, content, user: userName, infodose: infodoseName, at: new Date().toISOString() });
      localStorage.setItem(CRYSTAL_KEY, JSON.stringify(list)); refreshCrystalList();
    }
    function refreshCrystalList() {
      const list = JSON.parse(localStorage.getItem(CRYSTAL_KEY) || '[]');
      const el = document.getElementById('crystalList'); el.innerHTML = '';
      if (!list.length) { el.innerHTML = '<div class="small">Vazio.</div>'; return; }
      list.forEach(it => {
        const row = createEl('div','crystal-item');
        const left = createEl('div','','<strong>'+it.title+'</strong><div class="small">'+(it.infodose||'')+'</div><div style="margin-top:4px;font-size:0.8em">'+it.content.slice(0,100)+'...</div>');
        const actions = createEl('div','actions');
        const copyBtn = createEl('button','btn btn-sec','Copy'); copyBtn.onclick=()=>navigator.clipboard.writeText(it.content);
        const delBtn = createEl('button','btn btn-sec','Del'); delBtn.onclick=()=>{ 
            const arr=JSON.parse(localStorage.getItem(CRYSTAL_KEY)||'[]'); 
            localStorage.setItem(CRYSTAL_KEY, JSON.stringify(arr.filter(x=>x.id!==it.id))); refreshCrystalList(); 
        };
        actions.append(copyBtn, delBtn); row.append(left, actions); el.appendChild(row);
      });
    }

    // --- SETUP CHAT UI EVENTS ---
    document.addEventListener('DOMContentLoaded', async () => {
      speechSynthesis.onvoiceschanged = () => { window._vozes = speechSynthesis.getVoices(); };

      try {
        particlesJS('particles-js',{ particles:{ number:{value:24},color:{value:['#0ff','#f0f']}, shape:{type:'circle'},opacity:{value:0.4},size:{value:2.4}, move:{enable:true,speed:1.5} }, retina_detect:true });
      } catch(e) { console.warn('particlesJS init failed', e); }

      document.getElementById('sendBtn').addEventListener('click', sendMessage);
      document.getElementById('userInput').addEventListener('keypress', e => { if (e.key==='Enter') sendMessage(); });
      document.querySelector('[data-action="prev"]').addEventListener('click', () => changePage(-1));
      document.querySelector('[data-action="next"]').addEventListener('click', () => changePage(1));

      document.getElementById('saveSystemBtn').addEventListener('click', () => {
         infodoseName = document.getElementById('infodoseNameInput').value.trim();
         assistantEnabled = document.getElementById('assistantActiveCheckbox').checked;
         trainingActive = document.getElementById('trainingActiveCheckbox').checked;
         
         const newKey = document.getElementById('apiKeyInput').value.trim();
         const newModel = document.getElementById('modelInput').value.trim();
         
         if(newKey) {
             apiKey = newKey;
             localStorage.setItem('di_apiKey', apiKey);
             if(typeof STATE !== 'undefined') {
                 const active = STATE.keys.find(k=>k.active);
                 if(active) { active.token = newKey; saveData(); }
             }
         }
         
         modelName = newModel || modelName;
         localStorage.setItem('di_modelName', modelName);

         const zen = document.getElementById('zenModeCheckbox').checked;
         if(zen) { 
             document.body.classList.add('zen-mode');
             document.getElementById('mantra-toggle').classList.add('collapsed');
         } else {
             document.body.classList.remove('zen-mode');
             document.getElementById('mantra-toggle').classList.remove('collapsed');
         }
         saveUIState(); 

         localStorage.setItem('di_infodoseName', infodoseName);
         localStorage.setItem('di_assistantEnabled', assistantEnabled?'1':'0'); localStorage.setItem('di_trainingActive', trainingActive?'1':'0');
         
         updateChatUI();
         toggleSection('systemCard', false);
         showToaster('Configurações Salvas', 'success');
      });

      // Crystal
      document.getElementById('crystalBtn').addEventListener('click', ()=>{ refreshCrystalList(); document.getElementById('crystalModal').classList.add('active'); });
      document.getElementById('closeCrystal').addEventListener('click', ()=>document.getElementById('crystalModal').classList.remove('active'));
      document.getElementById('exportAllCrystal').addEventListener('click', ()=>{
          const list = JSON.parse(localStorage.getItem(CRYSTAL_KEY)||'[]');
          if(!list.length) return alert('Nada.');
          const b = new Blob([JSON.stringify(list,null,2)], {type:'application/json'});
          const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download='crystals.json'; a.click();
      });
      document.getElementById('clearAllCrystal').addEventListener('click', ()=>{ localStorage.removeItem(CRYSTAL_KEY); refreshCrystalList(); });

      updateChatUI();

      // --- ADDED: missing button handlers ---
      function getAllResponseText() {
        const blocks = Array.from(document.querySelectorAll('.response-block p')).map(p=>p.innerText.trim()).filter(Boolean);
        if(blocks.length) return blocks.join('\n\n');
        const resp = document.getElementById('response');
        return resp ? resp.innerText.trim() : '';
      }
      const copyBtn = document.querySelector('.control-btn.copy-button');
      if (copyBtn) copyBtn.addEventListener('click', async () => {
        try {
          const text = getAllResponseText();
          await navigator.clipboard.writeText(text);
          showToaster('Texto copiado', 'success');
        } catch (e) { showToaster('Falha ao copiar', 'error'); console.error(e); }
      });
      const pasteBtn = document.querySelector('.control-btn.paste-button');
      if (pasteBtn) pasteBtn.addEventListener('click', async () => {
        try {
          const txt = await navigator.clipboard.readText();
          const ui = document.getElementById('userInput');
          if (ui) { ui.value = txt; ui.focus(); showToaster('Conteúdo colado no campo', 'success'); }
        } catch (e) { showToaster('Falha ao colar (permissão negada?)', 'error'); console.error(e); }
      });
      const copyAct = document.getElementById('copyActBtn');
      if (copyAct) copyAct.addEventListener('click', async () => {
        try {
          const txt = document.getElementById('actPre').innerText;
          await navigator.clipboard.writeText(txt);
          showToaster('Ativação copiada', 'success');
        } catch(e){ showToaster('Erro ao copiar ativação', 'error'); console.error(e); }
      });
      const downloadAct = document.getElementById('downloadActBtn');
      if (downloadAct) downloadAct.addEventListener('click', async () => {
        try {
          const node = document.getElementById('actPre');
          const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
          canvas.toBlob(blob => {
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ativacao.png'; a.click();
            URL.revokeObjectURL(a.href);
          });
        } catch(e){ showToaster('Erro ao gerar PNG', 'error'); console.error(e); }
      });

      // Training import/export
      const trainingInput = document.getElementById('trainingUpload');
      const exportTrainingBtn = document.getElementById('exportTrainingBtn');
      const trainingNameEl = document.getElementById('trainingFileName');

      if (trainingInput) {
        trainingInput.addEventListener('change', async (ev) => {
          const f = ev.target.files && ev.target.files[0];
          if (!f) return;
          const txt = await f.text();
          training = txt;
          trainingFileName = f.name;
          localStorage.setItem('di_trainingText', training);
          localStorage.setItem('di_trainingFileName', trainingFileName);
          if (trainingNameEl) trainingNameEl.innerText = trainingFileName;
          showToaster('Treinamento importado', 'success');
        });
      }
      if (exportTrainingBtn) {
        exportTrainingBtn.addEventListener('click', () => {
          if (!training) { showToaster('Nenhum treinamento para exportar', 'error'); return; }
          const b = new Blob([training], { type: 'text/plain' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = (trainingFileName||'training.txt'); a.click();
        });
      }

      // Keys export/import
      const exportKeysBtn = document.getElementById('exportKeysBtn');
      const importKeysBtn = document.getElementById('importKeysBtn');
      const importFileInput = document.getElementById('importFileInput');

      if (exportKeysBtn) exportKeysBtn.addEventListener('click', () => {
        const b = new Blob([JSON.stringify(STATE.keys || [], null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'keys.json'; a.click();
      });
      if (importKeysBtn && importFileInput) {
        importKeysBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', async (ev) => {
          const f = ev.target.files && ev.target.files[0];
          if (!f) return;
          try {
            const txt = await f.text();
            const parsed = JSON.parse(txt);
            if (!Array.isArray(parsed)) throw new Error('Formato inválido');
            STATE.keys = parsed;
            saveData(); renderKeysList(); showToaster('Chaves importadas', 'success');
          } catch (e) { showToaster('Erro ao importar chaves', 'error'); console.error(e); }
        });
      }

    });

    // Mantra
    const mantraBtn = document.getElementById('mantra-toggle');
    const mantraText = document.getElementById('mantra-text');
    let mantraCollapsed = false;
    mantraBtn.addEventListener('click', () => {
      mantraCollapsed = !mantraCollapsed;
      if (mantraCollapsed) {
        mantraBtn.classList.add('collapsed'); document.body.classList.add('zen-mode');
        mantraText.classList.add('fade-out'); setTimeout(()=>{ mantraText.innerHTML = 'USE · TRANSFORME · DEVOLVA'; mantraText.classList.remove('fade-out'); },300);
      } else {
        mantraBtn.classList.remove('collapsed'); document.body.classList.remove('zen-mode');
        mantraText.classList.add('fade-out'); setTimeout(()=>{ mantraText.innerHTML = 'Do seu jeito. <strong>Sempre</strong> único. <strong>Sempre</strong> seu.'; mantraText.classList.remove('fade-out'); },300);
      }
    });

})();
