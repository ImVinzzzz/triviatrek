/* ============================================================
   TRIVIA TREK v.2.6 — script.js
   Logica di Gioco
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
  introPlayed:     false,
  setupOpened:     false, // evita il doppio avvio del setup dalla splash
  phase:           1,     // 1 = tabellone principale, 2 = Personal Topic
  bonusApplied:    false, // compensazione turni già assegnata
  topicOwners:     {},    // { indiceGiocatore: categoria Personal Topic con il suo nome }
  phase2Queue:     [],    // [{ cat, playerIndex }] in ordine di classifica provvisoria
  phase2Pos:       -1,    // card Fase II attiva
  phase2Revealed:  false  // logo Fase II già girato
};

/* ── DOM REFS ──────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const screens = {
  splash:   $('screen-splash'),
  game:     $('screen-game'),
  phase1:   $('screen-phase1'),
  phase2:   $('screen-phase2'),
  gameover: $('screen-gameover')
};
const popups = {
  players:  $('popup-players'),
  question: $('popup-question'),
  rules:    $('popup-rules')
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
document.addEventListener('DOMContentLoaded', () => {
  if (sfx.theme) {
    sfx.theme.volume = 0.15;
  }
  setupSplash();
  setupRulesPopup();
  setupPhase2Controls();
});

/* ── REGOLAMENTO POPUP ─────────────────────────────────────── */
function setupRulesPopup() {
  const btnHeaderRules = $('header-rules-btn');
  const btnCloseTop = $('btn-close-rules-top');
  const btnCloseBottom = $('btn-close-rules-bottom');
  const rulesOverlay = popups.rules;

  if (btnHeaderRules) {
    btnHeaderRules.addEventListener('click', openRulesPopup);
  }

  if (btnCloseTop) {
    btnCloseTop.addEventListener('click', closeRulesPopup);
  }

  if (btnCloseBottom) {
    btnCloseBottom.addEventListener('click', closeRulesPopup);
  }

  if (rulesOverlay) {
    rulesOverlay.addEventListener('click', (e) => {
      if (e.target === rulesOverlay) {
        closeRulesPopup();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rulesOverlay && !rulesOverlay.classList.contains('hidden')) {
      closeRulesPopup();
    }
  });
}

function openRulesPopup() {
  if (popups.rules) {
    popups.rules.classList.remove('hidden');
  }
}

function closeRulesPopup() {
  if (popups.rules) {
    popups.rules.classList.add('hidden');
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
  // Il click sul logo risale anche al contenitore: apriamo il setup una sola volta
  if (state.setupOpened) return;
  state.setupOpened = true;
  if (!state.introPlayed) {
    playAudio('intro');
    state.introPlayed = true;
  }
  // Stop intro when it ends, then play theme (handled in startGame)
  openPlayerSetup();
}

/* ── PLAYER SETUP POPUP ────────────────────────────────────── */
let selectedCount = 2;

function populateMissionSelect() {
  const select = $('mission-select');
  if (!select || typeof MISSIONS === 'undefined') return;
  select.innerHTML = '';
  MISSIONS.forEach(mission => {
    const opt = document.createElement('option');
    opt.value = mission.file;
    opt.textContent = mission.name;
    select.appendChild(opt);
  });
}

function openPlayerSetup() {
  popups.players.classList.remove('hidden');
  buildNameInputs(selectedCount);
  populateMissionSelect();

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
    badge.className = `player-num-badge p${i}`;
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

async function startGame() {
  const missionSelect = $('mission-select');
  const selectedJson = missionSelect ? missionSelect.value : 'quiz.json';

  try {
    const res = await fetch(selectedJson);
    state.quizData = await res.json();
  } catch (e) {
    console.error('Impossibile caricare il file JSON della missione:', e);
    alert('Errore: impossibile caricare il file JSON della missione.');
    return;
  }

  const inputs = document.querySelectorAll('.player-name-input');
  const players = [];
  inputs.forEach((input, i) => {
    const name = input.value.trim().toUpperCase() || ("GIOCATORE " + (i + 1));
    players.push({ name: name, score: 0, questionsCount: 0 });
  });

  state.players = players;
  // Fase II solo se almeno un argomento Personal Topic ha il nome di un concorrente
  state.topicOwners = matchTopicOwners();
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

  const btnHeaderRules = $('header-rules-btn');
  if (btnHeaderRules) {
    if (name === 'game' || name === 'gameover' || name === 'phase1' || name === 'phase2') {
      btnHeaderRules.classList.remove('hidden');
    } else {
      btnHeaderRules.classList.add('hidden');
    }
  }
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

  getBoardCategories().forEach(cat => {
    const card = buildCategoryCard(cat);
    grid.appendChild(card);
  });
}

/* Categorie Personal Topic: se presenti, vengono giocate nella Fase II */
function getPersonalCategories() {
  if (!state.quizData || !state.quizData.categories) return [];
  return state.quizData.categories.filter(cat => getCategoryType(cat) === 'personal');
}

/* La Fase II esiste solo se almeno un concorrente ha un Personal Topic col proprio nome.
   Altrimenti si gioca in un'unica fase con tutte le categorie sul tabellone. */
function hasPhase2() {
  return Object.keys(state.topicOwners || {}).length > 0;
}

/* Categorie mostrate sul tabellone principale (Fase I) */
function getBoardCategories() {
  if (!state.quizData || !state.quizData.categories) return [];
  if (!hasPhase2()) return state.quizData.categories;
  return state.quizData.categories.filter(cat => getCategoryType(cat) !== 'personal');
}

/* Normalizza il tipo per mantenere compatibilità con i vecchi JSON che
   usavano ancora il flag booleano isRiskio. */
function getCategoryType(cat) {
  if (!cat) return 'normal';
  if (cat.type === 'blind') return 'blind';
  if (cat.type === 'personal' || cat.type === 'personal-topic' || cat.type === 'personalTopic') {
    return 'personal';
  }
  if (cat.type === 'riskio' || cat.isRiskio) return 'riskio';
  return 'normal';
}

function buildCategoryCard(cat) {
  const card = document.createElement('div');
  card.className = 'cat-card';
  const categoryType = getCategoryType(cat);
  const isPersonalTopic = categoryType === 'personal';
  if (isPersonalTopic) card.classList.add('personal-topic-card');
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

  const isBlind = categoryType === 'blind';

  cat.questions.forEach((q, idx) => {
    const btn = document.createElement("button");
    btn.className = "point-btn";
    btn.textContent = isBlind ? "?".repeat(idx + 1) : q.points;
    btn.dataset.catId   = cat.id;
    btn.dataset.points  = q.points;
    btn.id = "btn-" + cat.id + "-" + q.points;
    btn.addEventListener("click", () => openQuestion(cat, q));
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

  // Ripristina stili del popup che potrebbero essere stati alterati da Blind
  const popupEl = header.parentElement;
  popupEl.classList.remove('blind-correct-popup', 'blind-wrong-popup');

  $('q-category-label').textContent = cat.name;
  
  const categoryType = getCategoryType(cat);
  const isBlind = categoryType === "blind";
  const isPersonalTopic = categoryType === "personal";
  const idx = cat.questions.indexOf(q);
  $("q-points-label").textContent = isBlind ? "?".repeat(idx + 1) : q.points + " PT";

  const iconImg = $('q-category-icon');
  if (iconImg) {
    iconImg.classList.toggle('personal-topic-icon', isPersonalTopic);
    if (cat.icon) {
      iconImg.src = cat.icon;
      iconImg.style.display = 'block';
    } else {
      iconImg.style.display = 'none';
      iconImg.src = '';
    }
  }

  // Turn
  const currentPlayer = state.players[state.currentIndex];
  $('q-turn-indicator').innerHTML =
    `<i class="fa-solid fa-circle-chevron-right"></i> &nbsp;TOCCA A <strong>${escHtml(currentPlayer.name)}</strong>`;

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

  const cat = state.quizData.categories.find(c => c.id === state.currentCatId);
  const categoryType = getCategoryType(cat);
  const isBlind = categoryType === 'blind';
  const isPersonalTopic = categoryType === 'personal';

  // Mostra il punteggio reale anche se era Blind
  $('q-points-label').textContent = q.points + ' PT';

  // Cambia il colore dell'intero popup se è Blind
  const popupEl = $('q-popup-header').parentElement;
  if (isBlind) {
    if (isCorrect) {
      popupEl.classList.add('blind-correct-popup');
    } else {
      popupEl.classList.add('blind-wrong-popup');
    }
  }

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
    playAudio("ok");
    resultText = "<i class=\"fa-solid fa-circle-check\"></i> RIGHT!";
    if (state.currentPoints >= 0) {
      awardsText = "+" + state.currentPoints + " PUNTI <i class=\"fa-solid fa-angle-right\"></i> " + escHtml(state.players[state.currentIndex].name);
    } else {
      awardsText = "Il giocatore " + escHtml(state.players[state.currentIndex].name) + " perde " + Math.abs(state.currentPoints) + " punti";
    }
  } else {
    const isRiskio = categoryType === "riskio";
    if (isRiskio && !isBlind) {
      state.players[state.currentIndex].score -= 150;
    } else if (isPersonalTopic) {
      // Personal Topic: chi sbaglia perde 250 punti fissi
      state.players[state.currentIndex].score -= 250;
    }
    // Personal Topic: gli avversari guadagnano 500 punti fissi, indipendentemente dal valore della domanda
    const pts = isBlind
      ? (state.currentPoints >= 0 ? 150 : -250)
      : (isPersonalTopic ? 500 : (isRiskio ? 250 : 50));
    const winners = [];
    state.players.forEach((p, i) => {
      if (i !== state.currentIndex) {
        p.score += pts;
        winners.push(p.name);
      }
    });
    playAudio("wrong");
    resultText = "<i class=\"fa-solid fa-circle-xmark\"></i> WRONG!";
    if (pts >= 0) {
      if (isRiskio && !isBlind) {
        awardsText = "Il giocatore " + escHtml(state.players[state.currentIndex].name) + " perde 150 punti | +" + pts + " PUNTI <i class=\"fa-solid fa-angle-right\"></i> " + winners.map(escHtml).join(", ");
      } else if (isPersonalTopic) {
        awardsText = "Il giocatore " + escHtml(state.players[state.currentIndex].name) + " perde 250 punti | +" + pts + " PUNTI <i class=\"fa-solid fa-angle-right\"></i> " + winners.map(escHtml).join(", ");
      } else {
        awardsText = "+" + pts + " PUNTI <i class=\"fa-solid fa-angle-right\"></i> " + winners.map(escHtml).join(", ");
      }
    } else {
      const labelGiocatori = winners.length === 1 ? "Il giocatore " : "I giocatori ";
      const labelPerde = winners.length === 1 ? " perde " : " perdono ";
      awardsText = labelGiocatori + winners.map(escHtml).join(", ") + labelPerde + Math.abs(pts) + " punti";
    }
  }

  // Show result
  const rm = $('q-result-msg');
  rm.innerHTML = resultText;
  rm.className = `q-result-msg ${isCorrect ? 'correct-msg' : 'wrong-msg'}`;
  rm.style.display = 'block';
  $('q-points-awarded').innerHTML = awardsText;
  $('q-points-awarded').style.display = 'block';

  // Incrementa il conteggio delle domande affrontate dal giocatore di turno
  state.players[state.currentIndex].questionsCount = (state.players[state.currentIndex].questionsCount || 0) + 1;

  // Mark question as answered
  state.answered[`${state.currentCatId}_${state.currentPoints}`] = true;

  // Update UI
  updatePlayerDisplays();

  // Disable the played button on the board
  const boardBtn = $(`btn-${state.currentCatId}-${state.currentPoints}`);
  if (boardBtn) boardBtn.disabled = true;

  // Advance turn (nella Fase II il turno resta al titolare della card)
  if (state.phase === 1) {
    state.currentIndex = (state.currentIndex + 1) % state.players.length;
  }

  // Close popup after delay
  setTimeout(() => {
    popups.question.classList.add('hidden');
    // Ripristina stili del popup
    popupEl.classList.remove('blind-correct-popup', 'blind-wrong-popup');
    updateTurnBanner();
    updatePlayerDisplays();

    if (state.phase === 2) {
      onPhase2AnswerDone();
    } else if (checkGameOver()) {
      setTimeout(hasPhase2() ? showPhase1Summary : showGameOver, 1200);
    }
  }, isBlind ? 4000 : 2500); // Più tempo se è Blind per far leggere ed apprezzare l'evidenziazione
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

    // Fase II
    const p2Card = $(`p2-player-${i}`);
    const p2Score = $(`p2-score-${i}`);
    if (p2Card) p2Card.classList.toggle('active-turn', state.phase === 2 && i === state.currentIndex);
    if (p2Score) p2Score.textContent = p.score.toLocaleString('it-IT');
  });
}

function updateTurnBanner() {
  const banner = $('turn-banner');
  if (!banner || state.players.length === 0) return;
  const name = state.players[state.currentIndex].name;
  banner.textContent = `★ È IL TURNO DI: ${name} ★`;
}

/* ── GAME OVER ─────────────────────────────────────────────── */
/* Fine della Fase I: tutte le domande del tabellone principale affrontate */
function checkGameOver() {
  const boardCats = getBoardCategories();
  const total = boardCats.reduce((sum, cat) => sum + cat.questions.length, 0);
  const answeredOnBoard = boardCats.reduce((sum, cat) =>
    sum + cat.questions.filter(q => state.answered[`${cat.id}_${q.points}`]).length, 0);
  return answeredOnBoard >= total;
}

/* Bonus di compensazione: +250 punti per ogni turno mancante rispetto al massimo.
   Viene calcolato una sola volta, al termine della Fase I (o della partita se non c'è Fase II). */
function applyCompensationBonus() {
  if (state.bonusApplied) return;
  state.bonusApplied = true;
  const maxQuestions = Math.max(...state.players.map(p => p.questionsCount || 0));
  state.players.forEach(p => {
    const missed = maxQuestions - (p.questionsCount || 0);
    if (missed > 0) {
      p.score += missed * 250;
      p.bonusMissed = missed * 250;
    }
  });
}

/* Classifica con gestione dei pari merito */
function getRankedPlayers() {
  const sorted = state.players
    .map((p, index) => ({ ...p, index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let currentRank = 1;
  return sorted.map((p, idx) => {
    if (idx > 0 && p.score < sorted[idx - 1].score) currentRank = idx + 1;
    return { ...p, rank: currentRank };
  });
}

/* ── FASE I: CLASSIFICA PROVVISORIA ────────────────────────── */
function showPhase1Summary() {
  applyCompensationBonus();
  updatePlayerDisplays();

  const list = $('p1-ranking-list');
  list.innerHTML = '';
  getRankedPlayers().forEach(p => {
    const item = document.createElement('div');
    item.className = 'go-rank-item' + (p.rank === 1 ? ' p1-leader' : '');
    const bonus = p.bonusMissed
      ? `<span class="p1-bonus" title="Compensazione turni mancanti">+${p.bonusMissed.toLocaleString('it-IT')} BONUS</span>`
      : '';
    item.innerHTML = `
      <span class="go-rank-pos">#${p.rank}</span>
      <span class="go-rank-name">${escHtml(p.name)}</span>
      ${bonus}
      <span class="go-rank-score">${p.score.toLocaleString('it-IT')} PT</span>
    `;
    list.appendChild(item);
  });

  const container = screens.phase1.querySelector('.phase1-container');
  if (container) container.classList.remove('flip-out');
  showScreen('phase1');
}

/* ── FASE II: PERSONAL TOPIC ───────────────────────────────── */
function setupPhase2Controls() {
  const btn = $('btn-phase2');
  if (btn) btn.addEventListener('click', startPhase2);

  const stage = $('screen-phase2');
  if (stage) {
    stage.addEventListener('click', e => {
      if (state.phase !== 2 || state.phase2Revealed) return;
      if (e.target.closest('#header-rules-btn')) return;
      revealPhase2();
    });
  }
}

/* Normalizza un nome per confrontare concorrente e titolo dell'argomento */
function normalizeTopicName(str) {
  return String(str || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^\s*(PERSONAL\s+)?TOPIC\s*[:\-–—]?\s*/, '')
    .replace(/[^A-Z0-9]/g, '');
}

/* Abbinamento concorrente -> Personal Topic: il titolo dell'argomento deve coincidere
   con il nome del concorrente (ignorando maiuscole, accenti, punteggiatura e un
   eventuale prefisso "TOPIC:"). L'ordine delle categorie nel JSON non conta.
   Gli argomenti senza concorrente corrispondente non vengono giocati. */
function matchTopicOwners() {
  const owners = {};
  const cats = getPersonalCategories();
  state.players.forEach((p, i) => {
    const pName = normalizeTopicName(p.name);
    if (!pName) return;
    const cat = cats.find(c => normalizeTopicName(c.name) === pName &&
      !Object.values(owners).includes(c));
    if (cat) owners[i] = cat;
  });
  const unused = cats.filter(c => !Object.values(owners).includes(c));
  if (Object.keys(owners).length && unused.length) {
    console.warn('Fase II: argomenti senza concorrente corrispondente, non giocati:', unused.map(c => c.name));
  }
  return owners;
}

/* Coda della Fase II: dall'ultimo al primo della classifica provvisoria,
   solo per i concorrenti che hanno un Personal Topic */
function buildPhase2Queue() {
  return state.players
    .map((p, index) => ({ index, score: p.score }))
    .sort((a, b) => a.score - b.score || b.index - a.index)
    .filter(p => state.topicOwners[p.index])
    .map(p => ({ cat: state.topicOwners[p.index], playerIndex: p.index }));
}

function buildPhase2PlayersBar() {
  const bar = $('phase2-players');
  if (!bar) return;
  bar.innerHTML = '';
  state.players.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'p2-player';
    el.id = `p2-player-${i}`;
    el.innerHTML = `
      <span class="p2-player-name">${escHtml(p.name)}</span>
      <span class="p2-player-score" id="p2-score-${i}">${p.score.toLocaleString('it-IT')}</span>
    `;
    bar.appendChild(el);
  });
}

function startPhase2() {
  state.phase = 2;
  state.phase2Queue = buildPhase2Queue();
  state.phase2Pos = -1;
  state.phase2Revealed = false;

  if (state.phase2Queue.length === 0) {
    showGameOver();
    return;
  }

  // Reset del flipper (logo fronte, card retro)
  const flipper = $('phase2-flipper');
  flipper.classList.remove('flipped');
  $('phase2-card-viewport').innerHTML = '';
  $('phase2-hint').classList.remove('hidden');
  buildPhase2PlayersBar();
  $('phase2-players').classList.add('hidden');

  // Effetto flip: la classifica provvisoria ruota via, il nuovo tabellone entra ruotando
  const container = screens.phase1.querySelector('.phase1-container');
  if (container) container.classList.add('flip-out');
  setTimeout(() => {
    showScreen('phase2');
    const stage = $('phase2-stage');
    stage.classList.remove('flip-in');
    void stage.offsetWidth; // riavvia l'animazione
    stage.classList.add('flip-in');
  }, 550);
}

function revealPhase2() {
  state.phase2Revealed = true;
  $('phase2-hint').classList.add('hidden');
  state.phase2Pos = 0;
  renderPhase2Card(false);
  $('phase2-flipper').classList.add('flipped');
  setTimeout(() => $('phase2-players').classList.remove('hidden'), 500);
}

function renderPhase2Card(animate) {
  const entry = state.phase2Queue[state.phase2Pos];
  if (!entry) return;
  const { cat, playerIndex } = entry;
  const player = state.players[playerIndex];

  state.currentIndex = playerIndex;
  updatePlayerDisplays();
  updateTurnBanner();

  const card = document.createElement('div');
  card.className = 'topic-card';
  const g = cat.gradient || ['#8a6d00', '#3d3000'];
  card.style.background = `linear-gradient(135deg, ${g[0]}, ${g[1]})`;

  const subtitle = cat.subtitle ? `<div class="topic-card-subtitle">${escHtml(cat.subtitle)}</div>` : '';
  card.innerHTML = `
    <div class="topic-card-top">
      <div class="topic-card-photo"></div>
      <div class="topic-card-heading">
        <div class="topic-card-kicker">PERSONAL TOPIC &bull; ${state.phase2Pos + 1}/${state.phase2Queue.length}</div>
        <div class="topic-card-title">${escHtml(cat.name)}</div>
        ${subtitle}
      </div>
    </div>
    <div class="topic-card-turn"><i class="fa-solid fa-circle-chevron-right"></i> &nbsp;RISPONDE <strong>${escHtml(player.name)}</strong></div>
    <div class="topic-card-points"></div>
  `;

  // Foto / icona nel cerchio, con fallback
  const photo = card.querySelector('.topic-card-photo');
  if (cat.icon) {
    const img = document.createElement('img');
    img.src = cat.icon;
    img.alt = '';
    img.onerror = () => { photo.innerHTML = '<i class="fa-solid fa-user-astronaut"></i>'; };
    photo.appendChild(img);
  } else {
    photo.innerHTML = '<i class="fa-solid fa-user-astronaut"></i>';
  }

  const row = card.querySelector('.topic-card-points');
  cat.questions.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'point-btn topic-point-btn';
    btn.textContent = q.points;
    btn.id = 'btn-' + cat.id + '-' + q.points;
    btn.disabled = !!state.answered[`${cat.id}_${q.points}`];
    btn.addEventListener('click', () => {
      state.currentIndex = playerIndex;
      openQuestion(cat, q);
    });
    row.appendChild(btn);
  });

  const viewport = $('phase2-card-viewport');
  const old = viewport.querySelector('.topic-card:not(.slide-out)');
  if (animate && old) {
    old.classList.add('slide-out');
    card.classList.add('slide-in');
    setTimeout(() => old.remove(), 700);
  } else {
    viewport.innerHTML = '';
  }
  viewport.appendChild(card);
}

function onPhase2AnswerDone() {
  const entry = state.phase2Queue[state.phase2Pos];
  if (!entry) return;
  state.currentIndex = entry.playerIndex;
  updatePlayerDisplays();
  updateTurnBanner();

  const done = entry.cat.questions.every(q => state.answered[`${entry.cat.id}_${q.points}`]);
  if (!done) return;

  if (state.phase2Pos < state.phase2Queue.length - 1) {
    setTimeout(() => {
      state.phase2Pos++;
      renderPhase2Card(true);
    }, 900);
  } else {
    setTimeout(showGameOver, 1200);
  }
}

function showGameOver() {
  stopAudio('theme');
  playAudio('winner');

  // Bonus di compensazione (se non già assegnato a fine Fase I)
  applyCompensationBonus();
  state.phase = 3;

  updatePlayerDisplays();

  showScreen('gameover');

  // Data stellare: "1" + anno (2 cifre) + mese (2 cifre) + "." + giorno (2 cifre)
  // es. 24 ottobre 2026 -> 12610.24
  const stardateEl = $('go-stardate-val');
  if (stardateEl) {
    stardateEl.textContent = getStardate(new Date());
  }

  // Classifica con parimerito
  const rankedPlayers = getRankedPlayers();

  // Vincitori (tutti quelli con rank 1)
  const winners = rankedPlayers.filter(p => p.rank === 1);
  const winnerLabel = $('go-winner-box').querySelector('.go-winner-label');
  if (winnerLabel) {
    winnerLabel.textContent = winners.length > 1 ? '★ WINNERS ★' : '★ WINNER ★';
  }
  $('go-winner-name').innerHTML = winners.map(w => escHtml(w.name)).join(' &amp; ');
  $('go-winner-score').textContent = winners[0].score.toLocaleString('it-IT') + ' PT';

  // Altri in classifica (tutti tranne i vincitori principali)
  const list = $('go-ranking-list');
  list.innerHTML = '';
  rankedPlayers.forEach(p => {
    if (p.rank === 1) return; // Saltiamo i primi classificati perché sono già nel box dei vincitori
    const item = document.createElement('div');
    item.className = 'go-rank-item';
    item.innerHTML = `
      <span class="go-rank-pos">#${p.rank}</span>
      <span class="go-rank-name">${escHtml(p.name)}</span>
      <span class="go-rank-score">${p.score.toLocaleString('it-IT')} PT</span>
    `;
    list.appendChild(item);
  });
}

/* ── UTILS ─────────────────────────────────────────────────── */
function getStardate(date) {
  const pad = n => String(n).padStart(2, '0');
  const yy = pad(date.getFullYear() % 100);
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return '1' + yy + mm + '.' + dd;
}

function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
