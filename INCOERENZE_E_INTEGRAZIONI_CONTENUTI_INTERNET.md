# Contenuti Internet – Coerenza vs Memoria Attila e info_rag

Ho letto tutto il file **CONTENUTI_INTERNET_DA_INTEGRARE.md** (~3640 righe) e l’ho confrontato con Memoria Attila (ripulita) e info_rag.md. Sintesi sotto.

---

## 1. Cosa è già allineato (nessuna correzione)

- **Competenze posizione**: max 2 slot, livelli Basso/Intermedio/Alto, Programmi Aggiunta Posizione, Trending no, portieri/campo non interscambiabili → uguale a info_rag e Memoria Attila.
- **Forza base vs Forza complessiva**: definizioni (alchimia, competenza posizione, stile) → uguali a Memoria Attila (e ora presenti anche nel doc internet).
- **Limitazioni modifica posizione**: A 1–5, C 1–6, D 2–5, PT non modificabile → stessa sostanza; solo sigle leggermente diverse (es. ED/AE/SA vs EDA/ESA).
- **Stili di gioco squadra**: 5 stili (Possesso, Contropiede, Contrattacco, Passaggio lungo, Vie laterali), influenza allenatore → coerente.
- **Istruzioni individuali**: 4 slot (2 offensive, 2 difensive), calci piazzati (Primo/Secondo/Terzo attaccante) → coerente.
- **Ancoraggio / Collante**: Ancoraggio = istruzione (max 2); Collante = stile MED → coerente con info_rag.
- **Consigli tecnici**: Tiri mancati (cause: dribbling veloce, orientamento corpo), Rigori portiere, Uno-due, Pressing (quando sì/no) → coerenti con Memoria Attila e colmano gap di info_rag.
- **Abilità speciali**: Leader, Passaggio di prima, Doppio tocco speciale, Terzino offensivo, Giocatore chiave → stessi concetti di info_rag/Memoria (nomi da tenere in italiano in RAG/prompt).

---

## 2. Incoerenze (da non portare così com’è in RAG/prompt)

### 2.1 Terminologia inglese vs italiana

- **Doc internet**: molti termini in inglese (Poacher, First-Time Shot, Through Passing, Interception, Man Marking, Track Back, Stamina, Build, Captaincy, Acrobatic Finishing, Pinpoint Crossing, ecc.).
- **info_rag e prompt**: tutto in **italiano** (Opportunista, Passaggio di prima, Passaggio filtrante, Intercettazione, Marcatura, Resistenza, Leader, Tiro al volo, Cross preciso, ecc.).
- **Regola**: in RAG e prompt usare **solo** i nomi italiani di info_rag (sezione 8 e NOTE CRITICHE). Se integri contenuti dal doc internet, tradurre/adeguare i nomi abilità e stili all’italiano (es. Poacher → Opportunista, Stamina → Resistenza).

### 2.2 “Stamina” vs “Resistenza”

- **Doc internet**: usa “Stamina”, “sistema stamina”, “stamina runs out”.
- **info_rag**: usa **Resistenza** (statistica fissa, non “stamina” in senso recuperabile).
- **Regola**: in prompt e NOTE CRITICHE restare su **Resistenza**; non introdurre “Stamina” per non confondere con recupero energetico. Eventuale frase: “Resistenza è la statistica che determina la durata della prestazione; non si recupera nel tempo.”

### 2.3 “Build” e “Training” / “Progression points”

- **Doc internet**: parla di “build giocatori”, “priorità training per ruolo”, “progression points”, “build ottimale”, “errori nella scelta build”.
- **info_rag / Memoria Attila**: statistiche **fisse**, niente “allenamento” o “miglioramento” statistiche; si possono solo scegliere giocatori, formazione, istruzioni, abilità aggiuntive (Programmi).
- **Regola**: **non** integrare in RAG/prompt frasi che suggeriscano di “fare build”, “allenare” o “potenziare” statistiche. Se si integra qualcosa, va riformulato in “scelta giocatori con statistiche adatte al ruolo” (es. “per il META servono difensori con Velocità 85+”), senza “training” o “progression” sulle stat.

### 2.4 Nomi giocatori reali

- **Doc internet**: elenca giocatori reali (es. Ronaldo, Rummenigge, Eto’o, Maldini, Bellingham, Gullit, Platini, Cruijff, Kakà, Pelé, Puskas, Zaghi, Xabi Alonso, Thuram, Saliba, Nedved, Mason, Bruno Fernandes, ecc.).
- **Regola RAG/prompt**: l’IA deve usare **solo** i nomi della rosa dell’utente (CONTESTO PERSONALE). Non aggiungere in info_rag liste di “top 3 opportunisti” con nomi reali; al massimo “esempi di caratteristiche per ruoli” senza nomi, o lasciare fuori dal RAG le sezioni con nomi.

### 2.5 Sigle limiti formazione (centrocampo)

- **Doc internet**: “Massimo 1 tra Centrale Libero/Difensore Centrale Libero/Stopper (CL/DC/LS)”.
- **info_rag / Memoria Attila**: “max 1 CLD/CLS” (centrale sinistro/destro).
- **Regola**: tenere **info_rag** come riferimento (CLD/CLS). Se si aggiunge testo preso da internet, uniformare a “max 1 CLD/CLS” come in info_rag §3.4.

### 2.6 “Captaincy” vs “Leader”

- **Doc internet**: “Captaincy”, “+2-3 overall squadra quando capitano”.
- **info_rag**: **Leader** (ispira squadra, riduce impatto fatica).
- **Regola**: in RAG e risposte usare solo **Leader** (italiano) e la descrizione già presente in info_rag; non introdurre “Captaincy” o “+2-3 overall”.

---

## 3. Cosa ha senso integrare in info_rag (per blindare l’IA)

Tutto da riscrivere in **italiano** e senza “build/training” statistiche, senza nomi giocatori reali.

- **Forza base e Forza complessiva** (mancavano in info_rag): 2–3 righe in §9 o in CONTESTO VIDEOGIOCO, come nel doc internet (Forza base = valutazione pura statistiche; Forza complessiva = + alchimia, competenza posizione, stile).
- **Tiri mancati – cause**: 2–3 righe in §7 o §10 (calciare in dribbling veloce, orientamento corpo errato, piede debole, pressione difensore) → così l’IA non inventa.
- **Rischio infortunio**: 1 riga in §10 o §1 (se il giocatore segnala problema a una gamba, sostituirlo alla prima occasione).
- **Squadra Autentica vs Squadra dei Sogni**: 1 riga in §9 (Autentica = preimpostata/dati live; dei Sogni = personalizzata).
- **Pressing – quando sì/no**: già parzialmente in info_rag §7; si può aggiungere in §10 una riga tipo “Pressing: solo quando vicini e in sicurezza; da lontano lascia spazi. Momento ottimale: avversario con poche opzioni di passaggio.”
- **Uno-due in avanti**: già in §7; ok.
- **Rigori portiere**: “Equilibrio fondamentale, non lasciare troppo spazio” → 1 riga in §10 se vuoi.

Non integrare: liste “top 3 opportunisti” con nomi reali, “build ottimale” come “training”, “progression points”, “Captaincy” (solo Leader), termini inglesi per abilità/stili.

---

## 4. Regole da mettere in prompt o in NOTE CRITICHE (per blindare l’IA)

- Usare **solo** i nomi delle **abilità in italiano** della sezione 8 (Tiro al volo, Passaggio filtrante, Intercettazione, Marcatura, Resistenza superiore, Leader, ecc.); non usare i nomi inglesi del doc internet (First-Time Shot, Through Passing, Interception, Man Marking, Track Back, Stamina, Captaincy, ecc.).
- **Resistenza**: usare sempre “Resistenza” (statistica fissa); non “Stamina”.
- **Stili**: usare sempre i nomi italiani (Opportunista, Collante, Classico n° 10, Rapace d’area, ecc.); non “Poacher”, “Anchor Man”, “Box-to-Box” come sostituti in risposta.
- **Nomi giocatori**: citare solo giocatori dalla rosa dell’utente (CONTESTO PERSONALE); non suggerire “Ronaldo”, “Maldini”, ecc. come soluzione.
- **Statistiche**: non suggerire mai “build”, “training” o “progression” per migliorare statistiche; solo “scegliere giocatori con statistiche adatte”, formazione, istruzioni, abilità aggiuntive (Programmi).

---

## 5. Riepilogo

- **Allineato**: competenze posizione, Forza base/complessiva, limiti formazione (A/C/D/PT), stili squadra, istruzioni 4 slot, Ancoraggio/Collante, consigli tecnici (tiri mancati, pressing, uno-due, rigori), abilità speciali (Leader, Passaggio di prima, Doppio tocco, Terzino offensivo, Giocatore chiave).
- **Incoerenze da evitare**: terminologia EN (usare solo IT); “Stamina” → Resistenza; “Build”/“Training” statistiche → non integrare; nomi giocatori reali → non in RAG; sigle C → CLD/CLS come in info_rag; “Captaincy” → solo “Leader”.
- **Integrazioni utili in info_rag**: Forza base/complessiva, cause tiri mancati, rischio infortunio, Squadra Autentica/Sogni, (opzionale) 1 riga su pressing; tutto in italiano e senza “build/training” stat.
- **Regole per prompt/NOTE CRITICHE**: abilità e stili solo in italiano; Resistenza non Stamina; nessun nome giocatore fuori dalla rosa; nessun suggerimento di “build” o “training” per le statistiche.

Se vuoi, il passo successivo è applicare le integrazioni consigliate in info_rag e aggiungere le righe in §10 NOTE CRITICHE (e nel prompt) per blindare l’IA come sopra.
