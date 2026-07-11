/* ============================================================
   TRIVIA TREK — editor.js
   Admin Panel Logic
   ============================================================ */

"use strict";

/* ── CONFIG ────────────────────────────────────────────────── */
const EDITOR_PASSWORD = "1863";

/* ── DOM REFS ──────────────────────────────────────────────── */
const lockScreen   = document.getElementById("editor-lock-screen");
const editorApp    = document.getElementById("editor-app");
const lockInput    = document.getElementById("lock-password");
const lockBtn      = document.getElementById("lock-btn");
const lockDenied   = document.getElementById("lock-denied-msg");
const loadInput    = document.getElementById("load-json-input");
const catTabsEl    = document.getElementById("cat-tabs");
const questionsEl  = document.getElementById("questions-editor");
const exportBtn    = document.getElementById("btn-export");
const sfxOk        = document.getElementById("sfx-ok");
const sfxWrong     = document.getElementById("sfx-wrong");

const quizTitleInput  = document.getElementById("quiz-title");
const quizPrefixInput = document.getElementById("quiz-prefix");

/* ── STATE ─────────────────────────────────────────────────── */
let quizData     = null;   // parsed quiz.json
let activeCatIdx = 0;
let prevPrefix   = "";

/* ── AUDIO HELPERS ─────────────────────────────────────────── */
function playOk()    { sfxOk.currentTime = 0;    sfxOk.play().catch(() => {}); }
function playWrong() { sfxWrong.currentTime = 0; sfxWrong.play().catch(() => {}); }

/* ── LOCK SCREEN ───────────────────────────────────────────── */
function tryUnlock() {
  const val = lockInput.value.trim();
  if (val === EDITOR_PASSWORD) {
    playOk();
    lockDenied.style.visibility = "hidden";

    // Fade out lock screen
    lockScreen.classList.add("fade-out");
    setTimeout(() => {
      lockScreen.style.display = "none";
      editorApp.classList.add("visible");
    }, 500);

    // Load default quiz data
    loadDefaultQuizData();
  } else {
    playWrong();
    lockDenied.style.visibility = "visible";
    lockInput.value = "";
    lockInput.focus();
    // Shake animation
    lockInput.style.animation = "none";
    lockInput.offsetHeight; // reflow
    lockInput.style.animation = "shake 0.3s ease";
  }
}

lockBtn.addEventListener("click", tryUnlock);
lockInput.addEventListener("keydown", e => {
  if (e.key === "Enter") tryUnlock();
});

/* simple shake via inline style */
const shakeStyle = document.createElement("style");
shakeStyle.textContent = 
  "@keyframes shake {" +
  "  0%,100%{transform:translateX(0)}" +
  "  20%{transform:translateX(-6px)}" +
  "  40%{transform:translateX(6px)}" +
  "  60%{transform:translateX(-4px)}" +
  "  80%{transform:translateX(4px)}" +
  "}";
document.head.appendChild(shakeStyle);

/* ── LOAD JSON ─────────────────────────────────────────────── */
async function loadDefaultQuizData() {
  try {
    const res = await fetch("quiz.json");
    quizData = await res.json();
    buildEditor();
  } catch (e) {
    // If fetch fails (e.g. opening file directly), start with empty structure
    quizData = { categories: [] };
    buildEditor();
  }
}

loadInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      quizData = JSON.parse(ev.target.result);
      buildEditor();
    } catch (err) {
      alert("Errore: file JSON non valido.");
    }
  };
  reader.readAsText(file);
  // Reset input so same file can be re-loaded
  loadInput.value = "";
});

if (quizTitleInput) {
  quizTitleInput.addEventListener("input", () => {
    if (quizData) {
      quizData.title = quizTitleInput.value.trim();
    }
  });
}

if (quizPrefixInput) {
  quizPrefixInput.addEventListener("input", () => {
    if (quizData) {
      const currentFolder = quizPrefixInput.value.trim();
      quizData.imagePrefix = currentFolder;

      const folder = currentFolder || "prefisso";
      const oldFolder = prevPrefix || "prefisso";

      const cards = questionsEl.querySelectorAll(".q-form-card");
      cards.forEach((card) => {
        const qi = parseInt(card.dataset.qi, 10);
        const catLetter = String.fromCharCode(97 + (activeCatIdx % 26));
        const imageInput = card.querySelector(".f-image");

        const oldSuggested = "img_quiz/" + oldFolder + "/" + catLetter + (qi + 1) + ".jpg";
        const newSuggested = "img_quiz/" + folder + "/" + catLetter + (qi + 1) + ".jpg";

        // Se l'input corrisponde al vecchio suggerimento o è vuoto, lo aggiorna dinamicamente
        if (imageInput.value === "" || imageInput.value === oldSuggested) {
          imageInput.value = newSuggested;
        }

        // Aggiorna anche il testo del percorso consigliato
        const suggestedStrong = card.querySelector(".suggested-path-str");
        if (suggestedStrong) {
          suggestedStrong.textContent = newSuggested;
        }
      });

      prevPrefix = currentFolder;
    }
  });
}

/* ── BUILD EDITOR UI ───────────────────────────────────────── */
function buildEditor() {
  if (!quizData) {
    quizData = { categories: [] };
  }

  if (quizTitleInput) {
    quizTitleInput.value = quizData.title || "";
  }
  if (quizPrefixInput) {
    quizPrefixInput.value = quizData.imagePrefix || "";
    prevPrefix = quizPrefixInput.value.trim();
  }

  buildTabs();
  renderCategory(activeCatIdx);
}

function buildTabs() {
  catTabsEl.innerHTML = "";
  if (quizData && quizData.categories) {
    quizData.categories.forEach((cat, idx) => {
      const tab = document.createElement("button");
      tab.className = "cat-tab" + (idx === activeCatIdx ? " active" : "");
      tab.textContent = cat.name;
      tab.dataset.idx = idx;
      tab.addEventListener("click", () => {
        // Save current before switching
        saveCategoryFromForm(activeCatIdx);
        activeCatIdx = idx;
        buildTabs();
        renderCategory(idx);
      });
      catTabsEl.appendChild(tab);
    });
  }

  // Pulsante aggiungi materia
  const addTab = document.createElement("button");
  addTab.className = "cat-tab add-tab-btn";
  addTab.innerHTML = "<i class=\"fa-solid fa-plus\"></i> Aggiungi Materia";
  addTab.addEventListener("click", () => {
    if (!quizData) {
      quizData = { categories: [] };
    }
    saveCategoryFromForm(activeCatIdx);
    const newCat = {
      id: "materia_" + Date.now(),
      name: "NUOVA MATERIA",
      icon: "img/m1.svg",
      gradient: ["#008080", "#005f5f"],
      isRiskio: false,
      questions: [
        { points: 100, isRiskio: false, text: "Domanda 1", options: ["Opzione A", "Opzione B", "Opzione C"], correct: "A", image: null },
        { points: 250, isRiskio: false, text: "Domanda 2", options: ["Opzione A", "Opzione B", "Opzione C"], correct: "A", image: null },
        { points: 500, isRiskio: false, text: "Domanda 3", options: ["Opzione A", "Opzione B", "Opzione C"], correct: "A", image: null }
      ]
    };
    quizData.categories.push(newCat);
    activeCatIdx = quizData.categories.length - 1;
    buildTabs();
    renderCategory(activeCatIdx);
  });
  catTabsEl.appendChild(addTab);
}

function renderCategory(idx) {
  questionsEl.innerHTML = "";
  if (!quizData || !quizData.categories || !quizData.categories[idx]) {
    questionsEl.innerHTML = "<p style=\"color:var(--text-dim);letter-spacing:2px\">Nessuna materia attiva. Aggiungine una o carica un JSON.</p>";
    return;
  }

  const cat = quizData.categories[idx];

  // Box impostazioni materia attiva
  const settingsCard = document.createElement("div");
  settingsCard.className = "category-settings-card";
  settingsCard.innerHTML = 
    "<div class=\"form-row\">" +
      "<label>Nome Materia / Argomento</label>" +
      "<input type=\"text\" id=\"active-cat-name\" value=\"" + escHtml(cat.name) + "\">" +
    "</div>" +
    "<div class=\"form-row-checkbox\">" +
      "<input type=\"checkbox\" id=\"active-cat-risk\" " + (cat.isRiskio ? "checked" : "") + ">" +
      "<label for=\"active-cat-risk\">Materia a Rischio (punteggi diversi o regole speciali)</label>" +
    "</div>" +
    "<button type=\"button\" class=\"delete-cat-btn\" id=\"delete-cat-btn\">" +
      "<i class=\"fa-solid fa-trash\"></i> &nbsp;Elimina questo argomento" +
    "</button>";

  // Cambiamento dinamico del nome della tab mentre si scrive
  const nameInput = settingsCard.querySelector("#active-cat-name");
  nameInput.addEventListener("input", () => {
    cat.name = nameInput.value.trim();
    const activeTab = catTabsEl.querySelector(".cat-tab[data-idx=\"" + idx + "\"]");
    if (activeTab) activeTab.textContent = cat.name;
  });

  const riskCheck = settingsCard.querySelector("#active-cat-risk");
  riskCheck.addEventListener("change", () => {
    cat.isRiskio = riskCheck.checked;
  });

  const deleteBtn = settingsCard.querySelector("#delete-cat-btn");
  deleteBtn.addEventListener("click", () => {
    if (confirm("Sei sicuro di voler eliminare la materia \"" + cat.name + "\"? Tutte le sue domande andranno perse.")) {
      quizData.categories.splice(idx, 1);
      activeCatIdx = 0;
      buildTabs();
      renderCategory(activeCatIdx);
    }
  });

  questionsEl.appendChild(settingsCard);

  cat.questions.forEach((q, qi) => {
    const card = buildQuestionForm(cat, q, qi, idx);
    questionsEl.appendChild(card);
  });
}

function buildQuestionForm(cat, q, qi, catIdx) {
  const labels = ["A", "B", "C"];
  const card = document.createElement("div");
  card.className = "q-form-card";
  card.dataset.qi = qi;

  const points = q.points !== undefined ? q.points : (cat.isRiskio ? [200, 500, 1000][qi] : [100, 250, 500][qi]);

  // Genera percorso consigliato per l'immagine
  const catLetter = String.fromCharCode(97 + (catIdx % 26)); // 'a', 'b', 'c', ecc.
  const folder = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "prefisso";
  const suggestedPath = "img_quiz/" + folder + "/" + catLetter + (qi + 1) + ".jpg";

  // Pre-popola se q.image non è presente
  const imageVal = q.image ? q.image : suggestedPath;

  let optionsHtml = "";
  labels.forEach((lbl, li) => {
    optionsHtml += 
      "<div class=\"option-row\">" +
        "<div class=\"option-label-badge\">" + lbl + "</div>" +
        "<input type=\"text\" class=\"f-option\" data-li=\"" + li + "\" value=\"" + (q.options[li] ? escHtml(q.options[li]) : "") + "\">" +
        "<input type=\"radio\" name=\"correct-" + qi + "\" class=\"f-correct\" data-ans=\"" + lbl + "\" " +
          (q.correct === lbl ? "checked" : "") + " title=\"Risposta corretta\">" +
      "</div>";
  });

  card.innerHTML = 
    "<h4>" +
      "<i class=\"fa-solid fa-circle-question\"></i>" +
      " &nbsp;DOMANDA " + (qi + 1) +
    "</h4>" +
    "<div class=\"form-row\">" +
      "<label>PUNTEGGIO DOMANDA</label>" +
      "<div style=\"display:flex;align-items:center;gap:20px;\">" +
        "<input type=\"number\" class=\"f-points\" value=\"" + points + "\" style=\"width:100px;\">" +
        "<div class=\"q-risk-container\">" +
          "<span>Domanda Riskio?</span>" +
          "<label><input type=\"radio\" name=\"q-risk-" + qi + "\" class=\"f-q-risk-yes\" value=\"true\" " + (q.isRiskio ? "checked" : "") + "> Sì</label>" +
          "<label><input type=\"radio\" name=\"q-risk-" + qi + "\" class=\"f-q-risk-no\" value=\"false\" " + (!q.isRiskio ? "checked" : "") + "> No</label>" +
        "</div>" +
      "</div>" +
    "</div>" +
    "<div class=\"form-row\">" +
      "<label>TESTO DELLA DOMANDA</label>" +
      "<textarea class=\"f-text\" rows=\"3\">" + escHtml(q.text) + "</textarea>" +
    "</div>" +
    "<div class=\"form-row\">" +
      "<label>IMMAGINE (percorso opzionale)</label>" +
      "<input type=\"text\" class=\"f-image\" value=\"" + escHtml(imageVal) + "\">" +
      "<div class=\"suggestion-text\">" +
        "<span>Percorso consigliato: <strong class=\"suggested-path-str\">" + suggestedPath + "</strong></span>" +
        "<div>" +
          "<button type=\"button\" class=\"use-suggested-btn\">Usa consigliato</button>" +
          "<button type=\"button\" class=\"delete-image-btn\">Elimina immagine</button>" +
        "</div>" +
      "</div>" +
    "</div>" +
    "<div class=\"correct-radio-hint\">" +
      "<i class=\"fa-solid fa-circle-check\" style=\"color:var(--correct)\"></i>" +
      " &nbsp;Seleziona la risposta corretta <i class=\"fa-solid fa-arrow-right\"></i>" +
    "</div>" +
    "<div class=\"options-grid\">" +
      optionsHtml +
    "</div>";

  const useBtn = card.querySelector(".use-suggested-btn");
  const delImgBtn = card.querySelector(".delete-image-btn");
  const imageInput = card.querySelector(".f-image");

  useBtn.addEventListener("click", () => {
    const currentFolder = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "prefisso";
    imageInput.value = "img_quiz/" + currentFolder + "/" + catLetter + (qi + 1) + ".jpg";
  });

  delImgBtn.addEventListener("click", () => {
    imageInput.value = "";
  });

  return card;
}

/* ── SAVE CATEGORY (read form into quizData) ────────────────── */
function saveCategoryFromForm(idx) {
  if (!quizData || !quizData.categories || !quizData.categories[idx]) return;
  const cat = quizData.categories[idx];
  const cards = questionsEl.querySelectorAll(".q-form-card");

  const activeCatName = document.getElementById("active-cat-name");
  if (activeCatName) {
    cat.name = activeCatName.value.trim();
  }
  const activeCatRisk = document.getElementById("active-cat-risk");
  if (activeCatRisk) {
    cat.isRiskio = activeCatRisk.checked;
  }

  cards.forEach((card, qi) => {
    if (!cat.questions[qi]) return;
    cat.questions[qi].points   = parseInt(card.querySelector(".f-points").value, 10) || 0;
    cat.questions[qi].isRiskio = card.querySelector(".f-q-risk-yes").checked;
    cat.questions[qi].text     = card.querySelector(".f-text").value.trim();
    cat.questions[qi].image    = card.querySelector(".f-image").value.trim() || null;
    cat.questions[qi].options  = Array.from(card.querySelectorAll(".f-option")).map(i => i.value.trim());
    const checkedRadio = card.querySelector(".f-correct:checked");
    cat.questions[qi].correct  = checkedRadio ? checkedRadio.dataset.ans : "A";
  });
}

/* ── EXPORT JSON ────────────────────────────────────────────── */
exportBtn.addEventListener("click", () => {
  // Save current tab first
  saveCategoryFromForm(activeCatIdx);

  // Assicurati che i valori globali siano salvati
  if (quizData) {
    if (quizTitleInput) quizData.title = quizTitleInput.value.trim();
    if (quizPrefixInput) quizData.imagePrefix = quizPrefixInput.value.trim();
  }

  const json = JSON.stringify(quizData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  
  const prefix = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "quiz";
  const filename = prefix + ".json";

  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Brief visual feedback
  exportBtn.textContent = "✓ FILE SCARICATO!";
  setTimeout(() => {
    exportBtn.innerHTML = "<i class=\"fa-solid fa-download\"></i> &nbsp;ESPORTA DATI (" + filename + ")";
  }, 2500);
});

/* ── UTILS ─────────────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
