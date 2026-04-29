/* ======================================================
   TRIVIATREK — script.js
   Game logic for Star Trek LCARS Quiz
   ====================================================== */

'use strict';

// ── Categories metadata (mirrors quiz.json structure) ──
const CAT_META = [
  { id:'comando',    name:'COMANDO E NAVIGAZIONE', color1:'#B42828', color2:'#E61E1E', points:[100,250,500] },
  { id:'scienza',    name:'SCIENZA E MEDICINA',     color1:'#286E64', color2:'#008080', points:[100,250,500] },
  { id:'tattica',    name:'TATTICA E SICUREZZA',    color1:'#BEBE00', color2:'#FFC800', points:[100,250,500] },
  { id:'ingegneria', name:'INGEGNERIA E OPS',        color1:'#BEBE00', color2:'#FFC800', points:[100,250,500] },
  { id:'riskio',     name:'RISKIO!',                 color1:'#374137', color2:'#647D6E', points:[200,500,1000] },
  { id:'afrodite',   name:'USS AFRODITE',            color1:'#BF6500', color2:'#FF9900', points:[100,250,500] },
  { id:'qonos',      name:"QO'NOS",                  color1:'#803C64', color2:'#B44B82', points:[100,250,500] },
  { id:'romulus',    name:'ROMULUS',                  color1:'#006432', color2:'#009646', points:[100,250,500] },
  { id:'vulcano',    name:'VULCANO',                  color1:'#1E3280', color2:'#324696', points:[100,250,500] },
];

// ── Game State ──
const state = {
  players: [],           // [{name, score}]
  currentPlayerIndex: 0,
  quizData: null,
  usedQuestions: new Set(), // "categoryId-questionIndex"
  totalQuestions: 27,
  answeredCount: 0,
  currentQuestion: null,  // {categoryId, catIndex, questionIndex, points}
  gameActive: false,
  introPlayed: false,
};

// ── DOM refs ──
const dom = {
  screenSplash:     document.getElementById('screen-splash'),
  screenGame:       document.getElementById('screen-game'),
  screenGameover:   document.getElementById('screen-gameover'),
  sidebarSplash:    document.getElementById('sidebar-splash'),
  sidebarPlayers:   document.getElementById('sidebar-players'),
  popupSetup:       document.getElementById('popup-setup'),
  popupQuestion:    document.getElementById('popup-question'),
  turnBanner:       document.getElementById('turn-banner'),
  gridMaterie:      document.getElementById('grid-materie'),
  playerCountRow:   document.getElementById('player-count-row'),
  playerInputs:     document.getElementById('player-inputs'),
  btnEngage:        document.getElementById('btn-engage'),
  popupQHeader:     document.getElementById('popup-qheader'),
  popupCategoryLbl: document.getElementById('popup-category-label'),
  popupPointsBadge: document.getElementById('popup-points-badge'),
  popupQuestionImg: document.getElementById('popup-question-img'),
  questionText:     document.getElementById('question-text'),
  popupOptions:     document.getElementById('popup-options'),
  popupResultBanner:document.getElementById('popup-result-banner'),
  winnerCardCont:   document.getElementById('winner-card-container'),
  runnerUpList:     document.getElementById('runner-up-list'),
  btnRestart:       document.getElementById('btn-restart'),
  sfxIntro:         document.getElementById('sfx-intro'),
  sfxTheme:         document.getElementById('sfx-theme'),
  sfxOk:            document.getElementById('sfx-ok'),
  sfxWrong:         document.getElementById('sfx-wrong'),
  sfxWinner:        document.getElementById('sfx-winner'),
  sfxEngage:        document.getElementById('sfx-engage'),
};

// ── Selected player count (setup popup) ──
let selectedPlayerCount = 2;

/* ======================================================
   INIT
   ====================================================== */
document.addEventListener('DOMContentLoaded', () => {
  loadQuizData();
  bindSetupEvents();
  dom.btnRestart.addEventListener('click', resetToSplash);

  // Splash: click anywhere to start
  dom.screenSplash.addEventListener('click',    openSetupPopup);
  dom.screenSplash.addEventListener('keydown',  e => { if(e.key === 'Enter' || e.key === ' ') openSetupPopup(); });
});

/* ======================================================
   AUDIO HELPERS
   ====================================================== */
function playAudio(el, loop = false) {
  if (!el) return;
  try {
    el.loop = loop;
    el.currentTime = 0;
    el.play().catch(() => {});
  } catch(e) {}
}

function stopAudio(el) {
  if (!el) return;
  try { el.pause(); el.currentTime = 0; } catch(e) {}
}

/* ======================================================
   LOAD QUIZ DATA
   ====================================================== */
async function loadQuizData() {
  try {
    const res = await fetch('quiz.json');
    state.quizData = await res.json();
    // Play intro audio on load
    playAudio(dom.sfxIntro);
  } catch(e) {
    console.warn('quiz.json non trovato, alcune funzioni potrebbero non funzionare.', e);
  }
}

/* ======================================================
   SETUP POPUP
   ====================================================== */
function openSetupPopup() {
  dom.popupSetup.hidden = false;
  renderPlayerCountButtons();
  renderPlayerInputs(selectedPlayerCount);
}

function bindSetupEvents() {
  // Player count selection
  dom.playerCountRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-count');
    if (!btn) return;
    selectedPlayerCount = parseInt(btn.dataset.count);
    renderPlayerCountButtons();
    renderPlayerInputs(selectedPlayerCount);
  });

  // Engage button
  dom.btnEngage.addEventListener('click', engageGame);
}

function renderPlayerCountButtons() {
  dom.playerCountRow.querySelectorAll('.btn-count').forEach(btn => {
    const n = parseInt(btn.dataset.count);
    btn.classList.toggle('selected', n === selectedPlayerCount);
    btn.setAttribute('aria-pressed', String(n === selectedPlayerCount));
  });
}

function renderPlayerInputs(count) {
  dom.playerInputs.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'lcars-input';
    input.placeholder = `UFFICIALE ${i + 1}`;
    input.maxLength = 18;
    input.dataset.playerIndex = i;
    input.setAttribute('aria-label', `Nome giocatore ${i + 1}`);
    // On Enter, move to next or engage
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (i < count - 1) {
          dom.playerInputs.querySelectorAll('.lcars-input')[i + 1].focus();
        } else {
          engageGame();
        }
      }
    });
    dom.playerInputs.appendChild(input);
  }
  // Focus first input
  setTimeout(() => dom.playerInputs.querySelector('.lcars-input')?.focus(), 50);
}

function engageGame() {
  const inputs = dom.playerInputs.querySelectorAll('.lcars-input');
  const players = [];
  inputs.forEach((inp, i) => {
    const name = inp.value.trim().toUpperCase() || `UFFICIALE ${i + 1}`;
    players.push({ name, score: 0 });
  });

  state.players = players;
  state.currentPlayerIndex = Math.floor(Math.random() * players.length);
  state.usedQuestions = new Set();
  state.answeredCount = 0;
  state.gameActive = true;

  // Close popup
  dom.popupSetup.hidden = true;

  // Transition: hide splash → show game
  stopAudio(dom.sfxIntro);
  playAudio(dom.sfxEngage);
  dom.screenSplash.hidden = true;
  dom.sidebarSplash.hidden = true;
  dom.sidebarPlayers.hidden = false;
  dom.screenGame.hidden = false;

  // Play theme
  playAudio(dom.sfxTheme, true);

  renderPlayerCards();
  renderGameBoard();
  updateTurnBanner();
}

/* ======================================================
   PLAYER CARDS (sidebar)
   ====================================================== */
function renderPlayerCards() {
  dom.sidebarPlayers.innerHTML = '';
  const colors = ['color-orange', 'color-lilac'];
  state.players.forEach((player, i) => {
    const card = document.createElement('div');
    card.className = `player-card ${colors[i % 2]}`;
    card.id = `player-card-${i}`;
    card.setAttribute('aria-label', `${player.name}: ${player.score} punti`);
    card.innerHTML = `
      <span class="player-indicator" aria-hidden="true">▶</span>
      <div class="player-name">${escapeHtml(player.name)}</div>
      <div class="player-score" id="player-score-${i}">${player.score}</div>
    `;
    dom.sidebarPlayers.appendChild(card);
  });
  highlightCurrentPlayer();
}

function updatePlayerCards() {
  state.players.forEach((player, i) => {
    const scoreEl = document.getElementById(`player-score-${i}`);
    if (scoreEl) scoreEl.textContent = player.score;
    const card = document.getElementById(`player-card-${i}`);
    if (card) card.setAttribute('aria-label', `${player.name}: ${player.score} punti`);
  });
  highlightCurrentPlayer();
}

function highlightCurrentPlayer() {
  state.players.forEach((_, i) => {
    const card = document.getElementById(`player-card-${i}`);
    if (card) card.classList.toggle('active-player', i === state.currentPlayerIndex);
  });
}

/* ======================================================
   GAME BOARD
   ====================================================== */
function renderGameBoard() {
  dom.gridMaterie.innerHTML = '';
  if (!state.quizData) { dom.gridMaterie.textContent = 'Errore: quiz.json non caricato.'; return; }

  state.quizData.categories.forEach((cat, catIndex) => {
    const meta = CAT_META.find(m => m.id === cat.id) || CAT_META[catIndex];
    const card = document.createElement('div');
    card.className = 'card-materia';
    card.id = `card-${cat.id}`;
    card.style.background = `linear-gradient(135deg, ${meta.color1}, ${meta.color2})`;

    // Header: icon + title
    card.innerHTML = `
      <div class="card-header">
        <img class="card-icon" src="${escapeHtml(cat.icon || 'img/delta.svg')}" alt="" aria-hidden="true"
             onerror="this.src='img/delta.svg'">
        <div class="card-title">${escapeHtml(cat.name)}</div>
      </div>
      <div class="card-buttons" id="buttons-${cat.id}"></div>
    `;

    // Score buttons
    const buttonsContainer = card.querySelector(`#buttons-${cat.id}`);
    cat.questions.forEach((q, qIndex) => {
      const questionKey = `${cat.id}-${qIndex}`;
      const isUsed = state.usedQuestions.has(questionKey);
      const btn = document.createElement('button');
      btn.className = 'btn-score';
      btn.textContent = q.points;
      btn.disabled = isUsed;
      btn.setAttribute('aria-label', `${cat.name} - ${q.points} punti${isUsed ? ' (già risposta)' : ''}`);
      btn.addEventListener('click', () => openQuestion(cat.id, catIndex, qIndex));
      buttonsContainer.appendChild(btn);
    });

    dom.gridMaterie.appendChild(card);
  });
}

function updateScoreButtons() {
  state.usedQuestions.forEach(key => {
    const [catId, qIndexStr] = key.split('-');
    const catData = state.quizData?.categories.find(c => c.id === catId);
    if (!catData) return;
    const qIndex = parseInt(qIndexStr);
    const buttonsContainer = document.getElementById(`buttons-${catId}`);
    if (buttonsContainer) {
      const btns = buttonsContainer.querySelectorAll('.btn-score');
      if (btns[qIndex]) btns[qIndex].disabled = true;
    }
  });
}

function updateTurnBanner() {
  const player = state.players[state.currentPlayerIndex];
  dom.turnBanner.textContent = `TURNO DI: ${player.name}`;
}

/* ======================================================
   QUESTION POPUP
   ====================================================== */
function openQuestion(catId, catIndex, qIndex) {
  if (!state.quizData) return;
  const cat = state.quizData.categories.find(c => c.id === catId);
  if (!cat) return;
  const q = cat.questions[qIndex];
  if (!q) return;
  const questionKey = `${catId}-${qIndex}`;
  if (state.usedQuestions.has(questionKey)) return;

  const meta = CAT_META.find(m => m.id === catId) || CAT_META[catIndex];

  // Store current question
  state.currentQuestion = { catId, catIndex, qIndex, points: q.points, key: questionKey };

  // Style popup header with category color
  dom.popupQHeader.style.background = `linear-gradient(90deg, ${meta.color1}, ${meta.color2})`;
  dom.popupCategoryLbl.textContent = cat.name;
  dom.popupPointsBadge.textContent = `${q.points} PT`;

  // Question text
  dom.questionText.textContent = q.text;
  dom.questionText.id = 'question-text';

  // Optional image
  if (q.image) {
    dom.popupQuestionImg.src = q.image;
    dom.popupQuestionImg.hidden = false;
    dom.popupQuestionImg.onerror = () => { dom.popupQuestionImg.hidden = true; };
  } else {
    dom.popupQuestionImg.hidden = true;
    dom.popupQuestionImg.src = '';
  }

  // Answer options
  dom.popupOptions.innerHTML = '';
  const letters = ['A', 'B', 'C'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.innerHTML = `<span class="opt-letter" aria-hidden="true">${letters[i]}</span>${escapeHtml(opt)}`;
    btn.setAttribute('aria-label', `Opzione ${letters[i]}: ${opt}`);
    btn.addEventListener('click', () => answerQuestion(i, q.correct, q.points));
    dom.popupOptions.appendChild(btn);
  });

  // Hide result banner
  dom.popupResultBanner.hidden = true;
  dom.popupResultBanner.className = '';
  dom.popupResultBanner.textContent = '';

  // Show popup
  dom.popupQuestion.hidden = false;
}

/* ======================================================
   ANSWER HANDLING
   ====================================================== */
function answerQuestion(chosenIndex, correctIndex, points) {
  if (!state.currentQuestion) return;

  const isCorrect = (chosenIndex === correctIndex);
  const optionBtns = dom.popupOptions.querySelectorAll('.btn-option');

  // Disable all buttons
  optionBtns.forEach(btn => btn.disabled = true);

  // Highlight chosen and correct
  optionBtns[chosenIndex].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) {
    optionBtns[correctIndex].classList.add('reveal-correct');
  }

  // Score update
  if (isCorrect) {
    state.players[state.currentPlayerIndex].score += points;
    playAudio(dom.sfxOk);
    showResultBanner(true, points);
  } else {
    // All other players get 250
    state.players.forEach((p, i) => {
      if (i !== state.currentPlayerIndex) p.score += 250;
    });
    playAudio(dom.sfxWrong);
    showResultBanner(false, points);
  }

  // Mark question as used
  state.usedQuestions.add(state.currentQuestion.key);
  state.answeredCount++;

  // Update player card scores immediately
  updatePlayerCards();

  // Auto-close after delay
  setTimeout(() => {
    closeQuestion();
    checkGameOver();
  }, 2200);
}

function showResultBanner(isCorrect, points) {
  const banner = dom.popupResultBanner;
  banner.hidden = false;
  if (isCorrect) {
    const player = state.players[state.currentPlayerIndex];
    banner.className = 'popup-result-banner result-correct';
    banner.textContent = `✓ CORRETTO — +${points} PT → ${player.name}`;
  } else {
    banner.className = 'popup-result-banner result-wrong';
    const otherCount = state.players.length - 1;
    banner.textContent = `✗ SBAGLIATO — +250 PT A ${otherCount === 1 ? 'L\'AVVERSARIO' : `${otherCount} AVVERSARI`}`;
  }
}

function closeQuestion() {
  dom.popupQuestion.hidden = true;
  state.currentQuestion = null;

  // Advance turn
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  updateTurnBanner();
  updateScoreButtons();
}

/* ======================================================
   GAME OVER
   ====================================================== */
function checkGameOver() {
  if (state.answeredCount >= state.totalQuestions) {
    setTimeout(showGameOver, 600);
  }
}

function showGameOver() {
  stopAudio(dom.sfxTheme);
  playAudio(dom.sfxWinner);

  dom.screenGame.hidden = true;

  // Sort players by score descending
  const sorted = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  // Winner card
  dom.winnerCardCont.innerHTML = `
    <div class="winner-card" role="region" aria-label="Vincitore">
      <div class="winner-label">⭐ CAMPIONE DELLA FLOTTA ⭐</div>
      <div class="winner-name">${escapeHtml(winner.name)}</div>
      <div class="winner-score">${winner.score}<span> PT</span></div>
    </div>
  `;

  // Runner-ups
  dom.runnerUpList.innerHTML = '';
  sorted.slice(1).forEach((player, i) => {
    const card = document.createElement('div');
    card.className = 'runner-up-card';
    card.innerHTML = `
      <span class="runner-up-rank">${i + 2}°</span>
      <span class="runner-up-name">${escapeHtml(player.name)}</span>
      <span class="runner-up-score">${player.score} PT</span>
    `;
    dom.runnerUpList.appendChild(card);
  });

  dom.screenGameover.hidden = false;
  state.gameActive = false;
}

/* ======================================================
   RESET / RESTART
   ====================================================== */
function resetToSplash() {
  // Reset state
  state.players = [];
  state.currentPlayerIndex = 0;
  state.usedQuestions = new Set();
  state.answeredCount = 0;
  state.currentQuestion = null;
  state.gameActive = false;

  // Stop audio
  stopAudio(dom.sfxTheme);
  stopAudio(dom.sfxWinner);

  // Reset UI
  dom.screenGameover.hidden = true;
  dom.sidebarPlayers.hidden = true;
  dom.sidebarSplash.hidden = false;
  dom.screenSplash.hidden = false;

  // Restart intro
  playAudio(dom.sfxIntro);

  // Reset selected player count
  selectedPlayerCount = 2;
}

/* ======================================================
   UTILITIES
   ====================================================== */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
