# 🖖 TRIVIA TREK
### Quiz Game — LCARS Interface

---

## STRUTTURA DEL PROGETTO

```
triviatrek/
├── index.html          ← Gioco principale
├── editor.html         ← Pannello admin (protetto da password)
├── style.css           ← Stile LCARS condiviso
├── script.js           ← Logica di gioco
├── editor.js           ← Logica editor domande
├── quiz.json           ← Database domande (esportabile)
│
├── img/
│   ├── logo.svg            ← Logo principale (usato nell'header E nella splash)
│   ├── favicon.png         ← Favicon 32×32
│   ├── favicon.svg         ← Favicon SVG
│   ├── apple-touch-icon.png← Favicon Apple 180×180
│   ├── m1.svg … m9.svg     ← Icone materie (sostituibili)
│
├── img_quiz/
│   └── *.jpg               ← Immagini opzionali per le domande
│
└── sfx/
    ├── intro.mp3           ← Audio schermata iniziale
    ├── theme.mp3           ← Musica di gioco (loop)
    ├── ok.mp3              ← Risposta corretta
    ├── wrong.mp3           ← Risposta errata
    └── winner.mp3          ← Schermata finale
```

---

## AVVIO (IMPORTANTE)

⚠️ **Il progetto richiede un server locale** per caricare `quiz.json` via `fetch()`.

```bash
# Opzione 1 — Node.js
npx serve .

# Opzione 2 — Python
python3 -m http.server 8080

# Poi apri: http://localhost:8080
```

---

## EDITOR DOMANDE

- Apri `editor.html`
- Password di accesso: **1863**
- Carica il `quiz.json` attuale con "CARICA JSON"
- Modifica le domande nelle schede per materia
- Clicca **ESPORTA DATI** per scaricare il `quiz.json` aggiornato
- Sostituisci il file nella cartella del progetto

---

## PERSONALIZZAZIONE

### Aggiungere immagini alle domande
Salva le immagini in `img_quiz/` e inserisci il percorso nel campo "IMMAGINE" dell'editor
(es: `img_quiz/picard_borg.jpg`). Il campo è opzionale.

### Cambiare le icone delle materie
Sostituisci i file `img/m1.svg` … `img/m9.svg` con le tue icone SVG.
Consigliato: icone su sfondo trasparente, bianche, 100×100px.

### Cambiare il logo
Sostituisci `img/logo.svg` con il tuo logo. Viene usato sia nell'header fisso
che nella schermata splash ingrandito.

### Aggiungere audio
Inserisci i file MP3 nella cartella `sfx/` con i nomi indicati sopra.
Senza i file audio il gioco funziona ugualmente (gli errori vengono soppressi).

---

## REGOLE DI PUNTEGGIO

| Evento | Effetto |
|---|---|
| Risposta corretta | Giocatore di turno +N punti (N = valore domanda) |
| Risposta errata | Tutti gli **altri** giocatori +250 punti fissi |
| RISKIO! (valori domanda) | 200, 500, 1000 punti |
| Penalità errore RISKIO! | Uguale alle altre: +250 agli avversari |

---

*Stardate 2401 — USS Afrodite*
