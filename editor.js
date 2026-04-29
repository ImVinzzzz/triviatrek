/* ======================================================
   TRIVIATREK — editor.js
   Admin panel logic: lock screen + question editor
   ====================================================== */

'use strict';

// ── Hardcoded access password ──
const ACCESS_CODE = '1863';

// ── Category metadata (mirrors main script) ──
const CAT_META = [
  { id:'comando',    name:'COMANDO E NAVIGAZIONE', color:'#E61E1E',  points:[100,250,500]  },
  { id:'scienza',    name:'SCIENZA E MEDICINA',     color:'#008080',  points:[100,250,500]  },
  { id:'tattica',    name:'TATTICA E SICUREZZA',    color:'#FFC800',  points:[100,250,500]  },
  { id:'ingegneria', name:'INGEGNERIA E OPS',        color:'#FFC800',  points:[100,250,500]  },
  { id:'riskio',     name:'RISKIO!',                 color:'#647D6E',  points:[200,500,1000] },
  { id:'afrodite',   name:'USS AFRODITE',            color:'#FF9900',  points:[100,250,500]  },
  { id:'qonos',      name:"QO'NOS",                  color:'#B44B82',  points:[100,250,500]  },
  { id:'romulus',    name:'ROMULUS',                  color:'#009646',  points:[100,250,500]  },
  { id:'vulcano',    name:'VULCANO',                  color:'#324696',  points:[100,250,500]  },
];

// ── Working copy of quiz data ──
let quizData = null;

// ── DOM refs ──
const dom = {
  lockScreen:       document.getElementById('editor-lock'),
  lockPassword:     document.getElementById('lock-password'),
  btnAuthorize:     document.getElementById('btn-authorize'),
  lockDenied:       document.getElementById('lock-denied'),
  editorInterface:  document.getElementById('editor-interface'),
  editorTabs:       document.getElementById('editor-tabs'),
  editorContent:    document.getElementById('editor-content'),
  fileLoadJson:     document.getElementById('file-load-json'),
  btnExport:        document.getElementById('btn-export'),
  sfxOk:            document.getElementById('sfx-ok'),
  sfxWrong:         document.getElementById('sfx-wrong'),
};

/* ======================================================
   INIT
   ====================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Lock screen events
  dom.btnAuthorize.addEventListener('click', tryAuthorize);
  dom.lockPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryAuthorize();
  });

  // File loader
  dom.fileLoadJson.addEventListener('change', handleFileLoad);

  // Export
  dom.btnExport.addEventListener('click', exportJson);

  // Auto-load quiz.json if possible (fetch from same directory)
  autoLoadQuiz();
});

/* ======================================================
   LOCK SCREEN — AUTHORIZATION
   ====================================================== */
function tryAuthorize() {
  const entered = dom.lockPassword.value.trim();

  if (entered === ACCESS_CODE) {
    // Correct — unlock
    playAudio(dom.sfxOk);
    dom.lockDenied.classList.remove('visible');
    dom.lockScreen.classList.add('hidden');
    dom.lockScreen.setAttribute('aria-hidden', 'true');
    dom.editorInterface.classList.add('visible');
    dom.editorInterface.setAttribute('aria-hidden', 'false');

    // Build editor UI
    buildEditorUI();

  } else {
    // Wrong — deny
    playAudio(dom.sfxWrong);
    dom.lockDenied.classList.add('visible');
    dom.lockPassword.value = '';
    dom.lockPassword.classList.add('shake');
    setTimeout(() => dom.lockPassword.classList.remove('shake'), 500);
    dom.lockPassword.focus();
  }
}

/* ======================================================
   AUTO-LOAD QUIZ.JSON (fetch)
   ====================================================== */
async function autoLoadQuiz() {
  try {
    const res = await fetch('quiz.json');
    if (res.ok) {
      quizData = await res.json();
    }
  } catch(e) {
    // Silently fail — user can load manually
  }
}

/* ======================================================
   FILE LOADER
   ====================================================== */
function handleFileLoad(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      quizData = JSON.parse(ev.target.result);
      buildEditorUI();
      showToast('✓ quiz.json caricato correttamente');
    } catch(err) {
      showToast('✗ Errore parsing JSON — file non valido');
    }
  };
  reader.readAsText(file);
  // Reset input so same file can be reloaded
  e.target.value = '';
}

/* ======================================================
   BUILD EDITOR UI
   ====================================================== */
function buildEditorUI() {
  if (!quizData || !quizData.categories) {
    dom.editorContent.innerHTML = `
      <div style="padding:32px;font-family:var(--font-display);font-size:13px;color:var(--lcars-teal);letter-spacing:3px;">
        NESSUN DATO — CARICA IL FILE quiz.json
      </div>`;
    dom.editorTabs.innerHTML = '';
    return;
  }

  buildTabs();
  buildPanels();
  activateTab(0);
}

function buildTabs() {
  dom.editorTabs.innerHTML = '';
  quizData.categories.forEach((cat, i) => {
    const meta = CAT_META.find(m => m.id === cat.id) || CAT_META[i];
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = cat.name;
    btn.dataset.tabIndex = i;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('aria-controls', `tab-panel-${i}`);
    btn.style.setProperty('--tab-color', meta.color);
    btn.addEventListener('click', () => activateTab(i));
    dom.editorTabs.appendChild(btn);
  });
}

function buildPanels() {
  dom.editorContent.innerHTML = '';
  quizData.categories.forEach((cat, catIndex) => {
    const meta = CAT_META.find(m => m.id === cat.id) || CAT_META[catIndex];
    const panel = document.createElement('div');
    panel.className = 'editor-tab-panel';
    panel.id = `tab-panel-${catIndex}`;
    panel.setAttribute('role', 'tabpanel');

    cat.questions.forEach((q, qIndex) => {
      const pts = meta.points[qIndex] ?? q.points;
      const block = buildQuestionForm(cat.id, catIndex, qIndex, q, pts);
      panel.appendChild(block);
    });

    dom.editorContent.appendChild(panel);
  });
}

function buildQuestionForm(catId, catIndex, qIndex, q, pts) {
  const block = document.createElement('div');
  block.className = 'question-form-block';
  block.id = `form-${catId}-${qIndex}`;

  const letters = ['A', 'B', 'C'];

  // Build answer options HTML
  const optionsHtml = q.options.map((opt, i) => `
    <div class="answer-row">
      <span class="answer-letter" aria-hidden="true">${letters[i]}</span>
      <input
        type="text"
        class="lcars-input-sm"
        id="opt-${catId}-${qIndex}-${i}"
        value="${escapeHtml(opt)}"
        placeholder="Opzione ${letters[i]}"
        aria-label="Opzione ${letters[i]} per domanda ${qIndex + 1}"
      >
      <input
        type="radio"
        name="correct-${catId}-${qIndex}"
        value="${i}"
        id="radio-${catId}-${qIndex}-${i}"
        ${q.correct === i ? 'checked' : ''}
        aria-label="Risposta corretta: opzione ${letters[i]}"
      >
    </div>
  `).join('');

  block.innerHTML = `
    <div class="form-block-title">▸ DOMANDA DA ${pts} PUNTI</div>

    <div class="form-row">
      <label class="form-label" for="text-${catId}-${qIndex}">Testo della domanda</label>
      <textarea
        class="form-textarea"
        id="text-${catId}-${qIndex}"
        rows="3"
        placeholder="Inserisci il testo della domanda..."
        aria-label="Testo domanda ${qIndex + 1}"
      >${escapeHtml(q.text)}</textarea>
    </div>

    <div class="form-row">
      <label class="form-label" for="img-${catId}-${qIndex}">Immagine (facoltativa)</label>
      <input
        type="text"
        class="lcars-input-sm"
        id="img-${catId}-${qIndex}"
        value="${escapeHtml(q.image || '')}"
        placeholder="img_quiz/nome_immagine.jpg"
        aria-label="Percorso immagine per domanda ${qIndex + 1}"
      >
    </div>

    <div class="form-row">
      <div class="form-label">Opzioni di risposta — seleziona la corretta ▶</div>
      ${optionsHtml}
    </div>
  `;

  return block;
}

/* ======================================================
   TAB ACTIVATION
   ====================================================== */
function activateTab(index) {
  // Tabs
  dom.editorTabs.querySelectorAll('.tab-btn').forEach((btn, i) => {
    const isActive = i === index;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  // Panels
  dom.editorContent.querySelectorAll('.editor-tab-panel').forEach((panel, i) => {
    panel.classList.toggle('active', i === index);
  });
}

/* ======================================================
   EXPORT JSON
   ====================================================== */
function exportJson() {
  if (!quizData) {
    showToast('✗ Nessun dato da esportare — carica prima il JSON');
    return;
  }

  // Collect form data back into quizData
  quizData.categories.forEach((cat, catIndex) => {
    cat.questions.forEach((q, qIndex) => {
      // Question text
      const textEl = document.getElementById(`text-${cat.id}-${qIndex}`);
      if (textEl) q.text = textEl.value.trim();

      // Image
      const imgEl = document.getElementById(`img-${cat.id}-${qIndex}`);
      if (imgEl) q.image = imgEl.value.trim() || null;

      // Options
      q.options = q.options.map((_, i) => {
        const optEl = document.getElementById(`opt-${cat.id}-${qIndex}-${i}`);
        return optEl ? optEl.value.trim() : _;
      });

      // Correct answer
      const checkedRadio = document.querySelector(
        `input[name="correct-${cat.id}-${qIndex}"]:checked`
      );
      if (checkedRadio) q.correct = parseInt(checkedRadio.value);
    });
  });

  // Serialize and download
  const jsonStr = JSON.stringify(quizData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiz.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('✓ quiz.json esportato correttamente');
  playAudio(dom.sfxOk);
}

/* ======================================================
   TOAST NOTIFICATION
   ====================================================== */
let toastTimer = null;
function showToast(message) {
  let toast = document.getElementById('editor-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'editor-toast';
    toast.style.cssText = `
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
      background: #111; border: 2px solid var(--lcars-teal);
      border-radius: 50px; padding: 10px 28px;
      font-family: var(--font-display); font-size: 11px; font-weight: 700;
      letter-spacing: 2px; color: var(--lcars-ghost); z-index: 9999;
      opacity: 0; transition: opacity 0.3s ease; white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

/* ======================================================
   UTILITIES
   ====================================================== */
function playAudio(el) {
  if (!el) return;
  try { el.currentTime = 0; el.play().catch(() => {}); } catch(e) {}
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
