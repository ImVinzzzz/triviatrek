/* ============================================================
   TRIVIA TREK — editor.js
   Admin Panel Logic
   ============================================================ */

'use strict';

/* ── CONFIG ────────────────────────────────────────────────── */
const EDITOR_PASSWORD = '1863';

/* ── DOM REFS ──────────────────────────────────────────────── */
const lockScreen   = document.getElementById('editor-lock-screen');
const editorApp    = document.getElementById('editor-app');
const lockInput    = document.getElementById('lock-password');
const lockBtn      = document.getElementById('lock-btn');
const lockDenied   = document.getElementById('lock-denied-msg');
const loadInput    = document.getElementById('load-json-input');
const catTabsEl    = document.getElementById('cat-tabs');
const questionsEl  = document.getElementById('questions-editor');
const exportBtn    = document.getElementById('btn-export');
const sfxOk        = document.getElementById('sfx-ok');
const sfxWrong     = document.getElementById('sfx-wrong');

/* ── STATE ─────────────────────────────────────────────────── */
let quizData     = null;   // parsed quiz.json
let activeCatIdx = 0;

/* ── AUDIO HELPERS ─────────────────────────────────────────── */
function playOk()    { sfxOk.currentTime = 0;    sfxOk.play().catch(() => {}); }
function playWrong() { sfxWrong.currentTime = 0; sfxWrong.play().catch(() => {}); }

/* ── LOCK SCREEN ───────────────────────────────────────────── */
function tryUnlock() {
  const val = lockInput.value.trim();
  if (val === EDITOR_PASSWORD) {
    playOk();
    lockDenied.style.visibility = 'hidden';

    // Fade out lock screen
    lockScreen.classList.add('fade-out');
    setTimeout(() => {
      lockScreen.style.display = 'none';
      editorApp.classList.add('visible');
    }, 500);

    // Load default quiz data
    loadDefaultQuizData();
  } else {
    playWrong();
    lockDenied.style.visibility = 'visible';
    lockInput.value = '';
    lockInput.focus();
    // Shake animation
    lockInput.style.animation = 'none';
    lockInput.offsetHeight; // reflow
    lockInput.style.animation = 'shake 0.3s ease';
  }
}

lockBtn.addEventListener('click', tryUnlock);
lockInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') tryUnlock();
});

/* simple shake via inline style */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)}
  60%{transform:translateX(-4px)}
  80%{transform:translateX(4px)}
}`;
document.head.appendChild(shakeStyle);

/* ── LOAD JSON ─────────────────────────────────────────────── */
async function loadDefaultQuizData() {
  try {
    const res = await fetch('quiz.json');
    quizData = await res.json();
    buildEditor();
  } catch (e) {
    // If fetch fails (e.g. opening file directly), start with empty structure
    quizData = { categories: [] };
    buildEditor();
  }
}

loadInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      quizData = JSON.parse(ev.target.result);
      buildEditor();
    } catch {
      alert('Errore: file JSON non valido.');
    }
  };
  reader.readAsText(file);
  // Reset input so same file can be re-loaded
  loadInput.value = '';
});

/* ── BUILD EDITOR UI ───────────────────────────────────────── */
function buildEditor() {
  if (!quizData || !quizData.categories || !quizData.categories.length) {
    questionsEl.innerHTML = '<p style="color:var(--text-dim);letter-spacing:2px">Nessuna categoria trovata nel JSON.</p>';
    return;
  }

  buildTabs();
  renderCategory(activeCatIdx);
}

function buildTabs() {
  catTabsEl.innerHTML = '';
  quizData.categories.forEach((cat, idx) => {
    const tab = document.createElement('button');
    tab.className = `cat-tab${idx === activeCatIdx ? ' active' : ''}`;
    tab.textContent = cat.name;
    tab.dataset.idx = idx;
    tab.addEventListener('click', () => {
      // Save current before switching
      saveCategoryFromForm(activeCatIdx);
      activeCatIdx = idx;
      document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderCategory(idx);
    });
    catTabsEl.appendChild(tab);
  });
}

function renderCategory(idx) {
  const cat = quizData.categories[idx];
  questionsEl.innerHTML = '';

  cat.questions.forEach((q, qi) => {
    const card = buildQuestionForm(cat, q, qi);
    questionsEl.appendChild(card);
  });
}

function buildQuestionForm(cat, q, qi) {
  const labels = ['A', 'B', 'C'];
  const card = document.createElement('div');
  card.className = 'q-form-card';
  card.dataset.qi = qi;

  const pointsLabel = cat.isRiskio
    ? [200, 500, 1000][qi]
    : [100, 250, 500][qi];

  card.innerHTML = `
    <h4>
      <i class="fa-solid fa-circle-question"></i>
      &nbsp;DOMANDA ${qi + 1} — ${pointsLabel} PUNTI
    </h4>

    <div class="form-row">
      <label>TESTO DELLA DOMANDA</label>
      <textarea class="f-text" rows="3">${escHtml(q.text)}</textarea>
    </div>

    <div class="form-row">
      <label>IMMAGINE (percorso opzionale, es: img_quiz/foto.jpg)</label>
      <input type="text" class="f-image" value="${q.image ? escHtml(q.image) : ''}">
    </div>

    <div class="correct-radio-hint">
      <i class="fa-solid fa-circle-check" style="color:var(--correct)"></i>
      &nbsp;Seleziona la risposta corretta →
    </div>

    <div class="options-grid">
      ${labels.map((lbl, li) => `
        <div class="option-row">
          <div class="option-label-badge">${lbl}</div>
          <input type="text" class="f-option" data-li="${li}" value="${q.options[li] ? escHtml(q.options[li]) : ''}">
          <input type="radio" name="correct-${qi}" class="f-correct" data-ans="${lbl}"
            ${q.correct === lbl ? 'checked' : ''} title="Risposta corretta">
        </div>
      `).join('')}
    </div>
  `;

  return card;
}

/* ── SAVE CATEGORY (read form into quizData) ────────────────── */
function saveCategoryFromForm(idx) {
  if (!quizData || !quizData.categories[idx]) return;
  const cat = quizData.categories[idx];
  const cards = questionsEl.querySelectorAll('.q-form-card');

  cards.forEach((card, qi) => {
    if (!cat.questions[qi]) return;
    cat.questions[qi].text    = card.querySelector('.f-text').value.trim();
    cat.questions[qi].image   = card.querySelector('.f-image').value.trim() || null;
    cat.questions[qi].options = Array.from(card.querySelectorAll('.f-option')).map(i => i.value.trim());
    const checkedRadio = card.querySelector('.f-correct:checked');
    cat.questions[qi].correct = checkedRadio ? checkedRadio.dataset.ans : 'A';
  });
}

/* ── EXPORT JSON ────────────────────────────────────────────── */
exportBtn.addEventListener('click', () => {
  // Save current tab first
  saveCategoryFromForm(activeCatIdx);

  const json = JSON.stringify(quizData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'quiz.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Brief visual feedback
  exportBtn.textContent = '✓ FILE SCARICATO!';
  setTimeout(() => {
    exportBtn.innerHTML = '<i class="fa-solid fa-download"></i> &nbsp;ESPORTA DATI (quiz.json)';
  }, 2500);
});

/* ── UTILS ─────────────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
