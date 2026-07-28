# 🖖 TRIVIA TREK
### Quiz Game — LCARS Interface

---

## DESCRIZIONE DEL GIOCO
**Trivia Trek** è un gioco a quiz interattivo a tema Star Trek, appositamente personalizzato per la ciurma degli **"Afrodisiaci"** a bordo della mitica *USS Afrodite*.

Il gioco si presenta con una splendida interfaccia in stile **LCARS** (l'iconico sistema operativo dei computer della Flotta Stellare), completa di effetti sonori e una colonna sonora orchestrale in sottofondo. I giocatori si sfidano a turni rispondendo a domande divise in categorie su un tabellone di gioco, accumulando punti o assegnando penalità agli avversari in caso di risposte errate, fino a decretare il vincitore finale.

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
| Risposta errata | Tutti gli **altri** giocatori +50 punti (+250 se categoria Riskio) |

### Categoria Blind (Punti Nascosti)
Le domande di tipo Blind nascondono il proprio valore reale con dei punti interrogativi sul tabellone e sul popup di gioco in base al loro ordine:
- Prima domanda: `?`
- Seconda domanda: `??`
- Terza domanda: `???`

La dinamica dei punteggi per la categoria Blind è la seguente:
- **Se la domanda ha un valore positivo (es. +250 punti)**:
  - **Risposta corretta**: Il giocatore di turno guadagna i punti della domanda (+250).
  - **Risposta errata**: Tutti gli **altri** giocatori guadagnano **+150 punti** fissi.
- **Se la domanda ha un valore negativo (es. -500 punti)**:
  - **Risposta corretta**: Il giocatore di turno perde i punti della domanda (-500).
  - **Risposta errata**: Tutti gli **altri** giocatori perdono **-250 punti** fissi.

### Categoria Riskio!
Le domande appartenenti a una categoria di tipo *Riskio!* (con valore esplicito visibile sul tabellone, come ad esempio 200, 500 o 1000 punti) seguono queste regole:
- **Risposta corretta**: Il giocatore di turno guadagna l'intero valore associato alla domanda (es. +500 punti).
- **Risposta errata**: Il giocatore di turno non perde punti, mentre tutti gli **altri** giocatori guadagnano **+250 punti** fissi ciascuno (a differenza delle categorie normali dove gli altri giocatori ricevono +50 punti).

---

*Stardate 12605.01 — USS Afrodite*
