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
├── missions.js         ← Elenco missioni del menu iniziale
├── quiz.json, giuliano.json, afrodite-2.json, …  ← Missioni (esportabili dall'editor)
│
├── img/
│   ├── logo.svg            ← Logo principale (usato nell'header E nella splash)
│   ├── fase2-logo.svg      ← Logo mostrato all'avvio della Fase II
│   ├── favicon.png         ← Favicon 32×32
│   ├── favicon.svg         ← Favicon SVG
│   └── apple-touch-icon.png← Favicon Apple 180×180
│
├── img_quiz/
│   ├── icone/              ← TUTTE le icone delle materie (una sola copia, condivisa)
│   │   ├── comando.svg, scienza.svg, tattica.svg, afrodite.svg, …
│   └── <nome-quiz>/        ← Solo le immagini delle domande di quel quiz (es. afrodite2/)
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
Salva le immagini nella sottocartella del quiz, `img_quiz/<prefisso>/`, e inserisci il percorso nel campo "IMMAGINE" dell'editor
(es: `img_quiz/afrodite2/picard.jpg`). Il campo è opzionale. Il prefisso si imposta nell'editor ("Prefisso Cartella Immagini Domande").

### Icone delle materie
Tutte le icone di categoria stanno in **`img_quiz/icone/`**, con un nome parlante e univoco (`comando.svg`, `tattica.svg`, `afrodite.svg`, …). Più quiz possono usare la stessa icona: nel JSON il percorso è sempre

```json
"icon": "/img_quiz/icone/comando.svg"
```

Nell'editor il percorso di default di una nuova materia è `/img_quiz/icone/<nome-materia>.svg` (es. "Cultura Generale" → `cultura-generale.svg`, "Qo'Nos" → `qo-nos.svg`); accanto al campo c'è l'anteprima, con bordo rosso tratteggiato se il file non esiste. Per usare un'icona esistente con un nome diverso dalla materia basta scrivere il percorso a mano (es. la materia "COMANDO E NAVIGAZIONE" usa `comando.svg`).
Consigliato: SVG monocromatici su sfondo trasparente (vengono resi in bianco sul tabellone).

Icone disponibili: `afrodite`, `armi`, `comando`, `cultura-generale`, `ferenginar`, `gossip`, `hot`, `il-dominio`, `ingegneria`, `medicina`, `mirror-mirror`, `navispaziali`, `qcontinuum`, `qo-nos`, `riskio`, `romulus`, `scienza`, `tattica`, `top-secret`, `trappolone-1`, `trappolone-2`, `vulcano`.

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
| Risposta errata — Normale | Tutti gli **altri** giocatori +50 punti |
| Risposta errata — Riskio! | Il giocatore di turno -150 punti; tutti gli **altri** +250 punti |
| Risposta errata — Personal Topic | Il giocatore di turno -250 punti; tutti gli **altri** +500 punti (indipendentemente dal valore della domanda) |

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
- **Risposta errata**: Il giocatore di turno perde **150 punti**, mentre tutti gli **altri** giocatori guadagnano **+250 punti** fissi ciascuno (a differenza delle categorie normali dove gli altri giocatori ricevono +50 punti).

### Categoria Personal Topic e FASE II
Le categorie di tipo `personal` sono argomenti dedicati a un singolo concorrente: **il titolo dell'argomento deve coincidere con il nome del concorrente** (come verrà digitato nel setup; maiuscole, accenti, punteggiatura e un eventuale prefisso `TOPIC:` vengono ignorati nel confronto). L'immagine (foto o icona) si imposta nel campo **Icona Materia / Argomento** e viene mostrata in un cerchio bordato; il campo **Sottotitolo card Fase II** compare nell'editor quando si sceglie la tipologia Personal Topic.

Se un quiz contiene almeno un Personal Topic la partita si svolge in due fasi:

1. **Fase I** — il tabellone mostra tutte le categorie tranne i Personal Topic.
2. Dopo l'ultima domanda (e l'eventuale bonus di compensazione) appare la **classifica provvisoria** con il pulsante **FASE II >**.
3. Il pulsante apre, con effetto flip, uno schermo nero con il logo `img/fase2-logo.svg`; un clic in qualunque punto fa girare il logo e compare la **card** del primo argomento: foto in alto a sinistra, titolo in alto a destra e sottotitolo sotto.
4. Le card si susseguono con uno scorrimento laterale **dall'ultimo al primo della classifica provvisoria**: chi era in testa risponde per ultimo. Ogni concorrente risponde solo alle domande della propria card.
5. Esaurite tutte le card si passa alla classifica definitiva con il podio.

L'abbinamento è solo per nome: l'ordine degli argomenti nel JSON non conta. Gli argomenti che non corrispondono a nessun concorrente non vengono giocati (prima della partita conviene eliminare quelli dei concorrenti assenti). Se **nessun** titolo coincide con i nomi dei concorrenti (es. nomi lasciati vuoti), la Fase II non c'è e la partita si gioca in un'unica fase con tutte le categorie sul tabellone, Personal Topic compresi. Lo stesso vale per un quiz senza Personal Topic.

- **Risposta corretta**: il giocatore di turno guadagna l'intero valore della domanda.
- **Risposta errata**: il giocatore di turno perde **250 punti**, mentre tutti gli altri giocatori guadagnano **+500 punti** fissi ciascuno, a prescindere dal valore della domanda (per esempio, su una domanda da 100 o da 1000 punti gli avversari ricevono sempre +500 punti e chi ha sbagliato -250).

Nel JSON esportato dall'editor il tipo della categoria è indicato così:

```json
{
  "name": "FRRUUU",
  "type": "personal",
  "icon": "img_quiz/afrodite2/frruuu.jpg",
  "subtitle": "Ufficiale scientifico della USS Afrodite"
}
```

L'editor supporta quindi quattro tipologie di categoria: `normal`, `riskio`, `blind` e `personal`.

### Compensazione Turni a Fine Partita
Nel caso in cui il numero totale di domande sul tabellone non sia perfettamente divisibile per il numero di giocatori (ad esempio 24 domande e 5 partecipanti), uno o più concorrenti potrebbero rispondere a una domanda in meno rispetto agli altri.
Per garantire la massima equità:
- A fine partita (oppure, se il quiz prevede la Fase II, al termine della Fase I, prima della classifica provvisoria), a ogni concorrente che ha risposto a una domanda in meno rispetto al massimo viene assegnato un **bonus automatico di +250 punti** per ciascun turno mancante. Il bonus viene calcolato una sola volta e mostrato nella classifica provvisoria.

---

*Stardate 12605.01 — USS Afrodite*
