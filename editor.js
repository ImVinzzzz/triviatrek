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
const resetPathsBtn = document.getElementById("btn-reset-paths");
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
      if (quizPrefixInput) {
        const prefissoGenerato = quizTitleInput.value.toLowerCase().replace(/\s+/g, "-");
        quizPrefixInput.value = prefissoGenerato;
        quizPrefixInput.dispatchEvent(new Event("input"));
      }
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

      // Aggiorna l'icona della materia attiva e la label del percorso consigliato
      const activeCatIconInput = document.getElementById("active-cat-icon");
      const suggestedIconStrong = document.querySelector(".suggested-icon-str");
      if (quizData.categories[activeCatIdx]) {
        const cat = quizData.categories[activeCatIdx];
        const catNameClean = cat.name ? cat.name.trim().toLowerCase().replace(/\s+/g, "-") : "materia";
        const newSuggestedIcon = "/img_quiz/" + folder + "/" + catNameClean + ".svg";

        if (suggestedIconStrong) {
          suggestedIconStrong.textContent = newSuggestedIcon;
        }

        if (cat.isNew && activeCatIconInput) {
          const oldSuggestedIcon = "/img_quiz/" + oldFolder + "/" + catNameClean + ".svg";
          if (activeCatIconInput.value === "" || activeCatIconInput.value === oldSuggestedIcon) {
            activeCatIconInput.value = newSuggestedIcon;
            cat.icon = newSuggestedIcon;
          }
        }
      }

      const cards = questionsEl.querySelectorAll(".q-form-card");
      cards.forEach((card) => {
        const qi = parseInt(card.dataset.qi, 10);
        const imageInput = card.querySelector(".f-image");

        const oldSuggested = "img_quiz/" + oldFolder + "/" + oldFolder + (qi + 1) + ".jpg";
        const newSuggested = "img_quiz/" + folder + "/" + folder + (qi + 1) + ".jpg";

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
      updateExportButtonLabel();
    }
  });
}

/* ── BUILD EDITOR UI ───────────────────────────────────────── */
function updateExportButtonLabel() {
  const prefix = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "quiz";
  if (exportBtn) {
    exportBtn.innerHTML = "<i class=\"fa-solid fa-download\"></i> &nbsp;ESPORTA DATI (" + prefix + ".json)";
  }
}

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

  updateExportButtonLabel();
  buildTabs();
  renderCategory(activeCatIdx);
  updateExportButtonState();
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
      icon: null,
      gradient: ["#008080", "#005f5f"],
      isRiskio: false,
      isNew: true,
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
  updateExportButtonState();
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

  // Calcolo percorso consigliato/attuale per l'icona
  const currentPrefix = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "prefisso";
  const iconNameClean = cat.name ? cat.name.trim().toLowerCase().replace(/\s+/g, "-") : "materia";
  // Per nuove materie usiamo lo slash iniziale, per quelle esistenti lasciamo la compatibilità
  const suggestedIconPath = cat.isNew 
    ? "/img_quiz/" + currentPrefix + "/" + iconNameClean + ".svg"
    : "img_quiz/" + currentPrefix + "/" + iconNameClean + ".svg";
  const iconVal = cat.icon ? cat.icon : suggestedIconPath;

  // Valori del gradiente a due colori
  const grad1 = (cat.gradient && cat.gradient[0]) ? cat.gradient[0] : "#008080";
  const grad2 = (cat.gradient && cat.gradient[1]) ? cat.gradient[1] : "#005f5f";

  settingsCard.innerHTML = 
    "<div class=\"category-settings-row\">" +
      "<div class=\"form-row\">" +
        "<label>Nome Materia / Argomento</label>" +
        "<input type=\"text\" id=\"active-cat-name\" value=\"" + escHtml(cat.name) + "\" style=\"text-transform: uppercase;\">" +
      "</div>" +
      "<div class=\"form-row\">" +
        "<label>Icona Materia / Argomento (percorso)</label>" +
        "<input type=\"text\" id=\"active-cat-icon\" value=\"" + escHtml(iconVal) + "\">" +
        "<div class=\"suggestion-text\">" +
          "<span>Percorso consigliato: <strong class=\"suggested-icon-str\">" + suggestedIconPath + "</strong></span>" +
          "<div>" +
            "<button type=\"button\" class=\"use-suggested-btn reset-icon-btn\">Resetta URL</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>" +
    "<div style=\"margin-top:14px\">" +
      "<div class=\"form-row\">" +
        "<label>Gradiente Colore Materia (Inizio e Fine)</label>" +
        "<div class=\"gradient-pickers\" style=\"display:flex; gap:10px; align-items:center\">" +
          "<input type=\"color\" id=\"active-cat-grad1\" value=\"" + escHtml(grad1) + "\">" +
          "<input type=\"color\" id=\"active-cat-grad2\" value=\"" + escHtml(grad2) + "\">" +
          "<span style=\"font-size:0.72rem; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px\">Scegli i colori del gradiente per le schede del tabellone</span>" +
        "</div>" +
      "</div>" +
    "</div>" +
    "<div class=\"category-settings-bottom\">" +
      "<div class=\"form-row-checkbox\">" +
        "<input type=\"checkbox\" id=\"active-cat-risk\" " + (cat.isRiskio ? "checked" : "") + ">" +
        "<label for=\"active-cat-risk\">Materia 'Rischio!' (punteggi diversi o regole speciali)</label>" +
      "</div>" +
      "<button type=\"button\" class=\"delete-cat-btn\" id=\"delete-cat-btn\">" +
        "<i class=\"fa-solid fa-trash\"></i> &nbsp;Elimina questo argomento" +
      "</button>" +
    "</div>";

  // Cambiamento dinamico del nome della tab e dell'icona mentre si scrive
  const nameInput = settingsCard.querySelector("#active-cat-name");
  const iconInput = settingsCard.querySelector("#active-cat-icon");
  const resetIconBtn = settingsCard.querySelector(".reset-icon-btn");

  nameInput.addEventListener("input", () => {
    nameInput.value = nameInput.value.toUpperCase();
    const oldName = cat.name || "";
    cat.name = nameInput.value.trim();
    const activeTab = catTabsEl.querySelector(".cat-tab[data-idx=\"" + idx + "\"]");
    if (activeTab) activeTab.textContent = cat.name;

    const currentPrefixFolder = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "prefisso";
    const newNameClean = cat.name ? cat.name.trim().toLowerCase().replace(/\s+/g, "-") : "materia";
    const newSuggestedIcon = "/img_quiz/" + currentPrefixFolder + "/" + newNameClean + ".svg";

    // Aggiorna la label del percorso consigliato
    const suggestedIconStrong = settingsCard.querySelector(".suggested-icon-str");
    if (suggestedIconStrong) {
      suggestedIconStrong.textContent = newSuggestedIcon;
    }

    // Aggiornamento dinamico dell'icona solo se la materia è nuova
    if (cat.isNew) {
      iconInput.value = newSuggestedIcon;
      cat.icon = newSuggestedIcon;
    }
  });

  resetIconBtn.addEventListener("click", () => {
    const currentPrefixFolder = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "prefisso";
    const nameClean = cat.name ? cat.name.trim().toLowerCase().replace(/\s+/g, "-") : "materia";
    const path = "/img_quiz/" + currentPrefixFolder + "/" + nameClean + ".svg";
    iconInput.value = path;
    cat.icon = path;
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
  updateExportButtonState();
}

function buildQuestionForm(cat, q, qi, catIdx) {
  const labels = ["A", "B", "C"];
  const card = document.createElement("div");
  card.className = "q-form-card";
  card.dataset.qi = qi;

  const points = q.points !== undefined ? q.points : (cat.isRiskio ? [200, 500, 1000][qi] : [100, 250, 500][qi]);

  // Genera percorso consigliato per l'immagine
  const folder = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "prefisso";
  const suggestedPath = "img_quiz/" + folder + "/" + folder + (qi + 1) + ".jpg";

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
      "<input type=\"number\" class=\"f-points\" value=\"" + points + "\" style=\"width:100px;\">" +
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
    imageInput.value = "img_quiz/" + currentFolder + "/" + currentFolder + (qi + 1) + ".jpg";
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
  const activeCatIcon = document.getElementById("active-cat-icon");
  if (activeCatIcon) {
    cat.icon = activeCatIcon.value.trim() || null;
  }
  const grad1Input = document.getElementById("active-cat-grad1");
  const grad2Input = document.getElementById("active-cat-grad2");
  if (grad1Input && grad2Input) {
    cat.gradient = [grad1Input.value, grad2Input.value];
  }

  cards.forEach((card, qi) => {
    if (!cat.questions[qi]) return;
    cat.questions[qi].points   = parseInt(card.querySelector(".f-points").value, 10) || 0;
    cat.questions[qi].text     = card.querySelector(".f-text").value.trim();
    cat.questions[qi].image    = card.querySelector(".f-image").value.trim() || null;
    cat.questions[qi].options  = Array.from(card.querySelectorAll(".f-option")).map(i => i.value.trim());
    const checkedRadio = card.querySelector(".f-correct:checked");
    cat.questions[qi].correct  = checkedRadio ? checkedRadio.dataset.ans : "A";
  });
}

/* ── VALIDATION HELPERS ────────────────────────────────────── */
function isDefaultText(text) {
  if (!text) return true;
  const t = text.trim().toLowerCase();
  return t === "" || t === "nuova materia" || /^domanda \d+\??$/.test(t) || /^doamnda \d+\??$/.test(t);
}

function isIconDefaultOrInvalid(icon) {
  if (!icon) return true;
  const i = icon.trim().toLowerCase();
  return i.indexOf("prefisso") !== -1 || i.startsWith("img/m") || i.startsWith("img/default");
}

function isImageDefaultOrInvalid(img) {
  if (!img) return false;
  return img.trim().toLowerCase().indexOf("prefisso") !== -1;
}

function validateQuizData() {
  const errors = [];
  if (!quizData || !quizData.categories) return { isValid: false, errors: [] };

  quizData.categories.forEach((cat, catIdx) => {
    if (isDefaultText(cat.name)) {
      errors.push({ catIdx: catIdx, type: "name" });
    }
    if (isIconDefaultOrInvalid(cat.icon)) {
      errors.push({ catIdx: catIdx, type: "icon" });
    }
    if (cat.questions) {
      cat.questions.forEach((q, qIdx) => {
        if (isDefaultText(q.text)) {
          errors.push({ catIdx: catIdx, type: "q-text", qIdx: qIdx });
        }
        if (isImageDefaultOrInvalid(q.image)) {
          errors.push({ catIdx: catIdx, type: "q-image", qIdx: qIdx });
        }
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function updateExportButtonState() {
  if (!exportBtn) return;
  const val = validateQuizData();
  if (val.isValid) {
    exportBtn.classList.remove("disabled-btn");
  } else {
    exportBtn.classList.add("disabled-btn");
  }
}

/* ── EXPORT JSON ────────────────────────────────────────────── */
exportBtn.addEventListener("click", (e) => {
  saveCategoryFromForm(activeCatIdx);
  const val = validateQuizData();

  // Rimuovi errori precedenti
  document.querySelectorAll(".validation-error").forEach((el) => {
    el.classList.remove("validation-error");
  });

  if (!val.isValid) {
    e.preventDefault();
    e.stopPropagation();

    val.errors.forEach((err) => {
      // Evidenzia tab
      const tab = catTabsEl.querySelector(".cat-tab[data-idx=\"" + err.catIdx + "\"]");
      if (tab) {
        tab.classList.add("validation-error");
      }

      if (err.catIdx === activeCatIdx) {
        if (err.type === "name") {
          const nameInput = document.getElementById("active-cat-name");
          if (nameInput) nameInput.classList.add("validation-error");
        }
        if (err.type === "icon") {
          const iconInput = document.getElementById("active-cat-icon");
          if (iconInput) iconInput.classList.add("validation-error");
          const resetIconBtn = document.querySelector(".reset-icon-btn");
          if (resetIconBtn) resetIconBtn.classList.add("validation-error");
        }
        if (err.type === "q-text") {
          const qCard = questionsEl.querySelector(".q-form-card[data-qi=\"" + err.qIdx + "\"]");
          if (qCard) {
            const txt = qCard.querySelector(".f-text");
            if (txt) txt.classList.add("validation-error");
          }
        }
        if (err.type === "q-image") {
          const qCard = questionsEl.querySelector(".q-form-card[data-qi=\"" + err.qIdx + "\"]");
          if (qCard) {
            const imgInput = qCard.querySelector(".f-image");
            if (imgInput) imgInput.classList.add("validation-error");
            const useBtn = qCard.querySelector(".use-suggested-btn");
            if (useBtn) useBtn.classList.add("validation-error");
          }
        }
      }
    });

    alert("Errore: Impossibile esportare. Alcuni campi o percorsi non sono stati personalizzati. Gli elementi errati sono stati evidenziati in rosso.");
    return;
  }

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
    updateExportButtonLabel();
    updateExportButtonState();
  }, 2500);
});

/* ── RESET ALL PATHS ────────────────────────────────────────── */
if (resetPathsBtn) {
  resetPathsBtn.addEventListener("click", () => {
    if (confirm("Sei sicuro di voler resettare tutti i percorsi delle icone delle materie e delle immagini delle domande in base al prefisso delle immagini attuale?")) {
      saveCategoryFromForm(activeCatIdx);
      const folder = (quizPrefixInput ? quizPrefixInput.value.trim() : "") || "prefisso";

      quizData.categories.forEach((cat, catIdx) => {
        const catNameClean = cat.name ? cat.name.trim().toLowerCase().replace(/\s+/g, "-") : "materia";
        cat.icon = "/img_quiz/" + folder + "/" + catNameClean + ".svg";

        if (cat.questions) {
          cat.questions.forEach((q, qIdx) => {
            q.image = "img_quiz/" + folder + "/" + folder + (qIdx + 1) + ".jpg";
          });
        }
      });

      renderCategory(activeCatIdx);
      updateExportButtonState();
      
      document.querySelectorAll(".validation-error").forEach((el) => {
        el.classList.remove("validation-error");
      });

      alert("Tutti i percorsi sono stati resettati ai valori consigliati!");
    }
  });
}

/* ── MONITOR INPUT CHANGE ───────────────────────────────────── */
if (editorApp) {
  editorApp.addEventListener("input", () => {
    saveCategoryFromForm(activeCatIdx);
    updateExportButtonState();
  });
  editorApp.addEventListener("change", () => {
    saveCategoryFromForm(activeCatIdx);
    updateExportButtonState();
  });
}

/* ── UTILS ─────────────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
