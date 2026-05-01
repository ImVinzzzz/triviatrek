/* ============================================================
   TRIVIA TREK — script.js
   Game Logic
   ============================================================ */

'use strict';

/* ── STATE ─────────────────────────────────────────────────── */
const state = {
  players:         [],    // [{name, score}, ...]
  currentIndex:    0,     // whose turn
  quizData:        null,  // parsed quiz.json
  answered:        {},    // { "catId_points": true }
  currentQ:        null,  // active question object
  currentCatId:    null,
  currentPoints:   0,
  currentGradient: [],
  catName:         '',
  introPlayed:     false
};

/* ── DOM REFS ──────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const screens = {
  splash:   $('screen-splash'),
  game:     $('screen-game'),
  gameover: $('screen-gameover')
};
const popups = {
  players:  $('popup-players'),
  question: $('popup-question')
};

/* ── AUDIO ─────────────────────────────────────────────────── */
const sfx = {
  intro:  $('sfx-intro'),
  theme:  $('sfx-theme'),
  ok:     $('sfx-ok'),
  wrong:  $('sfx-wrong'),
  winner: $('sfx-winner'),
  engage: $('sfx-engage')
};

function playAudio(name) {
  const a = sfx[name];
  if (!a) return;
  a.currentTime = 0;
  a.play().catch(() => {});
}

function stopAudio(name) {
  const a = sfx[name];
  if (!a) return;
  a.pause();
  a.currentTime = 0;
}

/* ── INIT ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuizData();
  setupSplash();
});

async function loadQuizData() {
  try {
    const res = await fetch('quiz.json');
    state.quizData = await res.json();
  } catch (e) {
    console.error('Impossibile caricare quiz.json — assicurati di usare un server locale.', e);
    alert('Errore: impossibile caricare quiz.json.\nAvvia il progetto da un server locale (es: npx serve .)');
  }
}

/* ── SPLASH ────────────────────────────────────────────────── */
function setupSplash() {
  // Play intro audio on first user interaction (autoplay policy)
  const splash = $('splash-clickable');
  splash.addEventListener('click', onSplashClick, { once: true });

  // Also catch clicks anywhere on the splash screen
  screens.splash.addEventListener('click', onSplashClick, { once: true });
}

function onSplashClick() {
  if (!state.introPlayed) {
    playAudio('intro');
    state.introPlayed = true;
  }
  // Stop intro when it ends, then play theme (handled in startGame)
  openPlayerSetup();
}

/* ── PLAYER SETUP POPUP ────────────────────────────────────── */
let selectedCount = 2;

function openPlayerSetup() {
  popups.players.classList.remove('hidden');
  buildNameInputs(selectedCount);

  // Count buttons
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCount = parseInt(btn.dataset.count);
      buildNameInputs(selectedCount);
    });
  });

  $('btn-engage').addEventListener('click', startGame);
}

function buildNameInputs(count) {
  const container = $('name-inputs-container');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'player-name-row';
    const badge = document.createElement('div');
    badge.className = `player-num-badge ${i % 2 === 0 ? 'odd' : 'even'}`;
    badge.textContent = i + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'player-name-input';
    input.placeholder = `MEMBRO EQUIPAGGIO ${i + 1}`;
    input.maxLength = 14;
    input.style.textTransform = 'uppercase';
    input.dataset.index = i;
    row.appendChild(badge);
    row.appendChild(input);
    container.appendChild(row);
  }
  // Focus first input
  setTimeout(() => container.querySelector('input')?.focus(), 50);
}

function startGame() {
  const inputs = document.querySelectorAll('.player-name-input');
  const players = [];
  inputs.forEach((input, i) => {
    const name = input.value.trim().toUpperCase() || `GIOCATORE ${i + 1}`;
    players.push({ name, score: 0 });
  });

  state.players = players;
  // Random first player
  state.currentIndex = Math.floor(Math.random() * players.length);

  popups.players.classList.add('hidden');

  // Riproduce il suono di ENGAGE alla conferma giocatori
  playAudio('engage');

  // Audio handoff: stop intro, play theme
  stopAudio('intro');
  playAudio('theme');

  showScreen('game');
  buildGameBoard();
  updatePlayerDisplays();
  updateTurnBanner();
}

/* ── SCREENS ───────────────────────────────────────────────── */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

/* ── GAME BOARD ────────────────────────────────────────────── */
function buildGameBoard() {
  buildPlayersColumn();
  buildCategoriesGrid();
}

function buildPlayersColumn() {
  const sidebar = $('players-sidebar');
  const mobileBar = $('players-mobile-bar');
  sidebar.innerHTML = '';
  mobileBar.innerHTML = '';

  state.players.forEach((p, i) => {
    // Desktop card
    const card = document.createElement('div');
    card.className = 'player-card';
    card.id = `player-card-${i}`;
    card.innerHTML = `
      <div class="p-name">${escHtml(p.name)}</div>
      <div class="p-score" id="score-${i}">0</div>
    `;
    sidebar.appendChild(card);

    // Mobile card
    const mCard = document.createElement('div');
    mCard.className = 'p-card-mobile';
    mCard.id = `player-mobile-${i}`;
    mCard.innerHTML = `
      <span class="pm-name">${escHtml(p.name)}</span>
      <span class="pm-score" id="mscore-${i}">0</span>
    `;
    mobileBar.appendChild(mCard);
  });
}

function buildCategoriesGrid() {
  const grid = $('categories-grid');
  grid.innerHTML = '';

  state.quizData.categories.forEach(cat => {
    const card = buildCategoryCard(cat);
    grid.appendChild(card);
  });
}

function buildCategoryCard(cat) {
  const card = document.createElement('div');
  card.className = 'cat-card';
  card.style.background = `linear-gradient(135deg, ${cat.gradient[0]}, ${cat.gradient[1]})`;

  // Header with icon + name
  const header = document.createElement('div');
  header.className = 'cat-card-header';

  // Icon (try img, fallback to FA delta)
  const img = document.createElement('img');
  img.className = 'cat-icon';
  img.src = cat.icon;
  img.alt = '';
  img.onerror = function() {
    this.style.display = 'none';
    const fb = document.createElement('div');
    fb.className = 'cat-icon-fallback';
    fb.innerHTML = '<i class="fa-solid fa-star"></i>';
    header.insertBefore(fb, header.firstChild);
  };

  const nameEl = document.createElement('div');
  nameEl.className = 'cat-name';
  nameEl.textContent = cat.name;

  header.appendChild(img);
  header.appendChild(nameEl);

  // Points row
  const pointsRow = document.createElement('div');
  pointsRow.className = 'cat-points-row';

  cat.questions.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'point-btn';
    btn.textContent = q.points;
    btn.dataset.catId   = cat.id;
    btn.dataset.points  = q.points;
    btn.id = `btn-${cat.id}-${q.points}`;
    btn.addEventListener('click', () => openQuestion(cat, q));
    pointsRow.appendChild(btn);
  });

  card.appendChild(header);
  card.appendChild(pointsRow);
  return card;
}

/* ── QUESTION POPUP ────────────────────────────────────────── */
function openQuestion(cat, q) {
  state.currentQ        = q;
  state.currentCatId    = cat.id;
  state.currentPoints   = q.points;
  state.currentGradient = cat.gradient;
  state.catName         = cat.name;

  // Header color
  const header = $('q-popup-header');
  header.style.background = `linear-gradient(90deg, ${cat.gradient[0]}, ${cat.gradient[1]})`;
  header.style.color = '#f8f8ff';

  $('q-category-label').textContent = cat.name;
  $('q-points-label').textContent = q.points + ' PT';

  // Turn
  const currentPlayer = state.players[state.currentIndex];
  $('q-turn-indicator').innerHTML =
    `<i class="fa-solid fa-user-astronaut"></i> &nbsp;TURNO DI: <strong>${escHtml(currentPlayer.name)}</strong>`;

  // Image
  const img = $('q-image');
  if (q.image) {
    img.src = q.image;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
    img.src = '';
  }

  // Question text
  $('q-text').textContent = q.text;

  // Options
  $('q-ans-a').textContent = q.options[0];
  $('q-ans-b').textContent = q.options[1];
  $('q-ans-c').textContent = q.options[2];

  // Reset buttons
  const answerBtns = document.querySelectorAll('.q-answer-btn');
  answerBtns.forEach(btn => {
    btn.classList.remove('correct', 'wrong');
    btn.disabled = false;
  });

  // Hide result message
  const resultMsg = $('q-result-msg');
  resultMsg.style.display = 'none';
  $('q-points-awarded').style.display = 'none';

  // Attach answer handlers (fresh clone to remove old listeners)
  answerBtns.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => handleAnswer(newBtn.dataset.ans));
  });

  // Restore option texts after clone
  $('q-ans-a').textContent = q.options[0];
  $('q-ans-b').textContent = q.options[1];
  $('q-ans-c').textContent = q.options[2];

  popups.question.classList.remove('hidden');
}

function handleAnswer(chosen) {
  const q = state.currentQ;
  const correct = q.correct;
  const isCorrect = (chosen === correct);

  // Disable all buttons
  document.querySelectorAll('.q-answer-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.ans === correct) btn.classList.add('correct');
    else if (btn.dataset.ans === chosen && !isCorrect) btn.classList.add('wrong');
  });

  // Update scores
  let resultText, awardsText;
  if (isCorrect) {
    state.players[state.currentIndex].score += state.currentPoints;
    playAudio('ok');
    resultText = '✓ RIGHT!';
    awardsText = `+${state.currentPoints} PUNTI → ${escHtml(state.players[state.currentIndex].name)}`;
  } else {
    const pts = 250;
    const winners = [];
    state.players.forEach((p, i) => {
      if (i !== state.currentIndex) {
        p.score += pts;
        winners.push(p.name);
      }
    });
    playAudio('wrong');
    resultText = '✗ WRONG!';
    awardsText = `+${pts} PUNTI → ${winners.map(escHtml).join(', ')}`;
  }

  // Show result
  const rm = $('q-result-msg');
  rm.textContent = resultText;
  rm.className = `q-result-msg ${isCorrect ? 'correct-msg' : 'wrong-msg'}`;
  rm.style.display = 'block';
  $('q-points-awarded').textContent = awardsText;
  $('q-points-awarded').style.display = 'block';

  // Mark question as answered
  state.answered[`${state.currentCatId}_${state.currentPoints}`] = true;

  // Update UI
  updatePlayerDisplays();

  // Disable the played button on the board
  const boardBtn = $(`btn-${state.currentCatId}-${state.currentPoints}`);
  if (boardBtn) boardBtn.disabled = true;

  // Advance turn
  state.currentIndex = (state.currentIndex + 1) % state.players.length;

  // Close popup after delay
  setTimeout(() => {
    popups.question.classList.add('hidden');
    updateTurnBanner();
    updatePlayerDisplays();

    if (checkGameOver()) {
      setTimeout(showGameOver, 1200);
    }
  }, 2500);
}

/* ── PLAYER DISPLAY ────────────────────────────────────────── */
function updatePlayerDisplays() {
  state.players.forEach((p, i) => {
    // Desktop
    const card = $(`player-card-${i}`);
    const scoreEl = $(`score-${i}`);
    if (card) {
      card.classList.toggle('active-turn', i === state.currentIndex);
    }
    if (scoreEl) scoreEl.textContent = p.score.toLocaleString('it-IT');

    // Mobile
    const mCard = $(`player-mobile-${i}`);
    const mScore = $(`mscore-${i}`);
    if (mCard) mCard.classList.toggle('active-turn', i === state.currentIndex);
    if (mScore) mScore.textContent = p.score.toLocaleString('it-IT');
  });
}

function updateTurnBanner() {
  const banner = $('turn-banner');
  if (!banner || state.players.length === 0) return;
  const name = state.players[state.currentIndex].name;
  banner.textContent = `★ È IL TURNO DI: ${name} ★`;
}

/* ── GAME OVER ─────────────────────────────────────────────── */
function checkGameOver() {
  const total = state.quizData.categories.reduce((sum, cat) => sum + cat.questions.length, 0);
  return Object.keys(state.answered).length >= total;
}

function showGameOver() {
  stopAudio('theme');
  playAudio('winner');

  showScreen('gameover');

  // Stardate: simple fake
  const sd = (2401 + Math.random()).toFixed(4);
  $('go-stardate-val').textContent = sd;

  // Sort players
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  // Winner
  $('go-winner-name').textContent = sorted[0].name;
  $('go-winner-score').textContent = sorted[0].score.toLocaleString('it-IT') + ' PT';

  // Ranking list
  const list = $('go-ranking-list');
  list.innerHTML = '';
  sorted.slice(1).forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'go-rank-item';
    item.innerHTML = `
      <span class="go-rank-pos">#${i + 2}</span>
      <span class="go-rank-name">${escHtml(p.name)}</span>
      <span class="go-rank-score">${p.score.toLocaleString('it-IT')} PT</span>
    `;
    list.appendChild(item);
  });
}

/* ── UTILS ─────────────────────────────────────────────────── */
function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
