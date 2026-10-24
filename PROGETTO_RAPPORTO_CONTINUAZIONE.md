# Trivia Trek - rapporto di progetto e continuità

Data del rapporto: 22 ottobre 2026
Repository analizzato: `S:\Progetti GitHub\TriviaTrek-main`

## 1. Scopo del documento

Questo documento fotografa lo stato del progetto presente nella cartella al momento dell'analisi e serve come passaggio di consegne per riprendere il lavoro in una nuova chat dello stesso progetto.

La fotografia è basata esclusivamente sui file attualmente presenti. Nella cartella non è stato rilevato un metadato Git utilizzabile (`.git`), quindi non è possibile ricostruire una cronologia affidabile delle modifiche o attribuire le decisioni a una sessione precedente.

## 2. Stato sintetico

Trivia Trek è una web app statica in HTML, CSS e JavaScript, con tema Star Trek/LCARS. Non ci sono `package.json`, dipendenze locali, test automatici o pipeline di build: il progetto viene eseguito direttamente da un server statico.

Lo stato attuale è quello di un prodotto giocabile con editor integrato, ma con alcune incoerenze tra missioni e asset che vanno risolte prima di considerarlo pronto per una nuova distribuzione.

### Funzionalità già presenti

- splash screen con logo, effetti sonori e avvio della partita;
- configurazione da 2 a 6 giocatori;
- selezione della missione da file JSON;
- tabellone di categorie con tre livelli tipici per materia;
- popup domanda con tre risposte, immagini opzionali e indicazione del turno;
- categorie `normal`, `riskio`, `blind` e `personal`;
- punteggi, penalità, bonus agli avversari, classifica finale ed ex-equo;
- bonus di compensazione di 250 punti per turno mancante a fine partita;
- popup del regolamento accessibile durante gioco e schermata finale;
- editor protetto da una password lato client, con importazione, modifica ed esportazione JSON;
- personalizzazione di icone, percorsi immagini e gradienti delle categorie.

## 3. Struttura rilevata

| File o cartella | Ruolo |
|---|---|
| `index.html` | schermate principali, popup, audio e regolamento |
| `script.js` | stato partita, turni, tabellone, domande, punteggi e game over |
| `style.css` | grafica LCARS, layout desktop/mobile e componenti editor |
| `editor.html` | interfaccia di amministrazione delle domande |
| `editor.js` | caricamento, modifica, validazione ed esportazione dei JSON |
| `missions.js` | elenco delle missioni mostrate nel menu iniziale |
| `quiz.json` | missione generica, in parte ancora dimostrativa |
| `giuliano.json` | missione più completa, 16 categorie e 48 domande |
| `afrodite-2.json` | missione USS Afrodite, 12 categorie e 35 domande |
| `topic1.json` | bozza con 3 categorie e 7 domande, non presente nel menu |
| `img/` | logo, logo Fase II (`fase2-logo.svg`), favicon |
| `img_quiz/icone/` | tutte le icone delle materie, condivise tra i quiz |
| `img_quiz/<quiz>/` | solo le immagini delle domande del singolo quiz |
| `sfx/` | audio di intro, tema, risposte, vittoria ed engage |

## 4. Dati e missioni

| Missione | Categorie | Domande | Tipi rilevati | Stato |
|---|---:|---:|---|---|
| `quiz.json` | 9 | 26 | 7 normali, 1 riskio, 1 blind | demo/generica; 23 domande su 26 sono placeholder |
| `giuliano.json` | 16 | 48 | 14 normali, 2 blind | la più completa e strutturata |
| `afrodite-2.json` | 12 | 35 | 8 normali, 4 riskio | missione utilizzabile, con 1 categoria da 2 domande |
| `topic1.json` | 3 | 7 | 2 normali, 1 personal | bozza/dati di prova; non elencata in `missions.js` |

### Incoerenze dati da tenere presenti

1. `missions.js` propone `giuliano2.json`, ma il file non esiste. Se viene scelta la voce `Giuliano 2 - la Vendemmia`, il caricamento fallisce.
2. La voce visualizzata `Afrotite 2` contiene un refuso; il file corretto è `afrodite-2.json`.
3. `quiz.json` non valorizza `title` e `imagePrefix` e contiene testo dimostrativo come `Domanda 1?`, `Risposta A`, eccetera.
4. `afrodite-2.json` e `quiz.json` usano in più punti il formato precedente basato su `isRiskio`; `script.js` lo supporta, mentre i JSON più recenti usano `type`.
5. `topic1.json` punta a immagini e icone nella cartella `img_quiz/topic1/`, ma tali file non sono presenti. Le due icone personali puntano invece a URL esterni del sito `ussafrodite.vercel.app`.
6. I percorsi locali sono misti: alcuni iniziano con `/img_quiz/...`, altri con `img_quiz/...`. Il progetto funziona correttamente se pubblicato alla radice del server, ma può rompersi se viene servito dentro una sottocartella.

## 5. Regole di gioco implementate

- Risposta corretta: il giocatore di turno riceve il valore della domanda, positivo o negativo.
- Risposta errata normale: gli altri giocatori ricevono 50 punti.
- Risposta errata `riskio`: il giocatore di turno perde 150 punti e gli altri ricevono 250 punti.
- Risposta errata `personal`: il giocatore di turno perde 250 punti e gli altri ricevono 500 punti ciascuno, a prescindere dal valore della domanda (regola aggiornata il 23 ottobre 2026; in precedenza gli altri ricevevano metà del valore e chi sbagliava non perdeva punti).
- Categoria `blind`: il tabellone mostra `?`, `??` e `???`; il valore reale viene mostrato dopo la risposta. Se il valore è positivo, l'errore assegna 150 punti agli altri; se è negativo, l'errore sottrae 250 punti agli altri.
- A fine partita viene calcolato il massimo numero di domande affrontate da un giocatore. Chi ne ha affrontate meno riceve 250 punti per ciascun turno mancante.
- In caso di parità al primo posto, vengono mostrati tutti i vincitori.

## 6. Editor domande

L'editor è in `editor.html` e usa la password `1863`, definita direttamente in `editor.js`.

Flusso previsto:

1. avviare il server locale;
2. aprire `editor.html`;
3. inserire la password;
4. caricare un JSON dal pulsante `CARICA JSON` oppure usare il caricamento iniziale di `quiz.json`;
5. modificare titolo, prefisso, categorie, domande, risposte, risposta corretta, icone, immagini e gradienti;
6. esportare il nuovo JSON e copiarlo nella cartella del progetto.

La password è solo una barriera grafica lato client: chiunque possa scaricare la pagina può leggere `editor.js` e recuperarla. È sufficiente per un uso locale o informale, non per proteggere dati in un ambiente pubblico.

## 7. Verifiche eseguite

- tutti i file JSON presenti sono stati parsati senza errori;
- `node --check script.js` ha avuto esito positivo;
- `node --check editor.js` ha avuto esito positivo;
- la struttura delle missioni e i conteggi categorie/domande sono stati ricavati dai JSON;
- sono stati confrontati i riferimenti a icone e immagini con gli asset presenti;
- non sono stati trovati test automatici, `package.json`, configurazioni di build o workflow CI;
- non è stato possibile usare la cronologia Git perché `.git` non è presente nella cartella analizzata.

## 8. Problemi prioritari da risolvere

### Priorità alta

1. **Riferimento a missione inesistente**: rimuovere `giuliano2.json` da `missions.js` oppure aggiungere il file e tutti gli asset necessari.
2. **Doppio aggancio della splash screen**: in `setupSplash()` il click viene registrato sia su `#splash-clickable` sia su `#screen-splash`. Il click sul logo propaga al contenitore e può eseguire due volte `openPlayerSetup()`, registrando più volte il listener di `ENGAGE`. Rendere l'avvio idempotente o usare un solo listener.
3. **Asset di `topic1` mancanti**: completare la cartella `img_quiz/topic1/`, correggere i percorsi oppure rimuovere la bozza dal materiale di distribuzione.

### Priorità media

4. Uniformare i percorsi a una sola convenzione, preferibilmente relativa alla radice applicativa o costruita in modo coerente.
5. Decidere quale formato JSON è quello ufficiale: `type` dovrebbe diventare la fonte unica; `isRiskio` può restare solo per compatibilità temporanea.
6. Completare o sostituire `quiz.json` se deve essere una missione reale, non un esempio.
7. Aggiungere un controllo che impedisca categorie prive di `gradient`, `questions`, `options` o `id`, dato che il rendering del tabellone li usa direttamente.

### Priorità bassa / rifinitura

8. Correggere refusi visibili (`Afrotite`, `doamnda`, `piu` senza accento nei testi HTML) e uniformare i nomi delle missioni.
9. Valutare un'autenticazione reale se l'editor sarà pubblicato online.
10. Aggiungere un test di smoke test manuale o automatizzato per ogni tipo di categoria e per la compensazione di fine partita.

## 9. Piano consigliato per la prossima sessione

1. Leggere questo rapporto e controllare lo stato dei file prima di fare modifiche.
2. Sistemare prima `missions.js` e il doppio listener della splash.
3. Decidere se `topic1.json` è una missione da mantenere; in caso affermativo, creare gli asset mancanti e aggiungerla al menu.
4. Normalizzare i JSON e verificare ogni missione con un server locale.
5. Eseguire una partita completa con 2 giocatori e una con 6 giocatori.
6. Verificare almeno una domanda normale, una `riskio`, una `blind` positiva, una `blind` negativa e una `personal`.
7. Verificare classifica, ex-equo, bonus per turni mancanti, regolamento, audio e schermata nuova partita.
8. Aggiornare README e questo rapporto con gli esiti effettivi dei test.

## 10. Avvio locale

Dalla cartella del progetto:

```text
py -m http.server 8080
```

Aprire poi `http://localhost:8080/`. Il server è necessario perché il gioco e l'editor caricano i JSON tramite `fetch()`.

Per l'editor: aprire `http://localhost:8080/editor.html` e usare `1863`.

## 11. Prompt per una nuova chat

```text
Sto continuando il progetto Trivia Trek nella cartella del progetto corrente. Leggi prima PROGETTO_RAPPORTO_CONTINUAZIONE.md e poi verifica i file effettivamente presenti, senza assumere che la cronologia Git sia disponibile. Riprendi dal piano indicato nel rapporto: prima controlla il riferimento mancante a giuliano2.json e il possibile doppio listener della splash screen, poi sistema gli asset e le incoerenze dei JSON solo dopo aver verificato l'intento dei dati. Mantieni la grafica e le regole esistenti, non sovrascrivere modifiche non correlate, esegui controlli di sintassi e una verifica funzionale proporzionata alle modifiche. Alla fine aggiorna il rapporto con cosa è stato fatto, cosa resta aperto e come riprendere il lavoro.
```

## 12. Nota di continuità

Il punto di partenza più sicuro per la prossima chat è considerare `giuliano.json` la missione di riferimento più completa, `afrodite-2.json` la missione USS Afrodite attiva, `quiz.json` una demo da completare e `topic1.json` una bozza da decidere. Prima di pubblicare o consegnare il gioco, risolvere i tre problemi ad alta priorità elencati sopra.

## 13. Aggiornamento del 24 ottobre 2026

### Fase II — Personal Topic
- Se un quiz contiene categorie `personal`, la partita si divide in due fasi. Il tabellone della Fase I esclude i Personal Topic.
- A fine Fase I viene assegnato il bonus di compensazione (una sola volta, flag `state.bonusApplied`) e compare la schermata `#screen-phase1` con la classifica provvisoria e il pulsante `FASE II >`.
- `#screen-phase2`: flip d'ingresso, logo `img/fase2-logo.svg`, clic ovunque → il logo ruota e compare la card del primo argomento (foto nel cerchio, titolo, nuovo campo `subtitle`). Le card successive entrano con scorrimento laterale.
- Ordine: dall'ultimo al primo della classifica provvisoria (a parità di punti gioca prima chi è stato inserito dopo nel setup). Abbinamento concorrente ↔ card per nome normalizzato (maiuscole, accenti, punteggiatura e prefisso `TOPIC:` ignorati), poi per inclusione, infine le card rimaste vanno ai concorrenti senza card (avviso in console).
- In Fase II il turno non ruota: risponde sempre il titolare della card. Esaurite le card → `showGameOver()` con il podio esistente.
- Senza Personal Topic il gioco resta identico a prima.
- Corretto anche il doppio avvio del setup dalla splash (flag `state.setupOpened`).

### Riorganizzazione icone
- Tutte le icone di categoria sono ora in `img_quiz/icone/` con nomi univoci; eliminate le copie `m1…m12.svg` e i duplicati in `img_quiz/quiz/`, rimossa la cartella vuota `img_quiz/giuliano/`.
- Rinomine: `afrodite2/m10.svg` → `gossip.svg`, `m11.svg` → `top-secret.svg`, `m12.svg` → `hot.svg`, `quiz/riskio.svg` → `riskio.svg`. Dove esistevano due versioni della stessa icona è stata tenuta quella più recente (ex `giuliano/`).
- `quiz.json`: la materia MEDICINA puntava al simbolo di divieto (stesso file della TOP SECRET di Afrodite); ora usa `medicina.svg` (caduceo).
- JSON aggiornati: `quiz.json`, `giuliano.json`, `afrodite-2.json`, `topic1.json` → `"icon": "/img_quiz/icone/<nome>.svg"`.

### Editor
- Percorso icona di default: `/img_quiz/icone/<materia>.svg` (slug senza accenti/apostrofi), indipendente dal prefisso; anteprima icona con evidenza se il file manca.
- Nuovo campo "Sottotitolo card Fase II" visibile per i Personal Topic (salvato come `subtitle`).
- "Resetta tutti i percorsi" mantiene le icone già in `img_quiz/icone/` e le foto dei Personal Topic.

### Ancora aperti
- `missions.js` punta ancora a `giuliano2.json` (inesistente) e mostra il refuso `Afrotite 2`.
- `topic1.json`: solo `TOPIC: FRRUUU` è di tipo `personal` (`TOPIC: RENZI` è `normal`); immagini in `img_quiz/topic1/` mancanti.
- Il progetto non è ancora sotto Git (vedi istruzioni di pubblicazione nel report della sessione).
