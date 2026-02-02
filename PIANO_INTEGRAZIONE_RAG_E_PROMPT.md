# Piano integrazione: cosa integrare, dove (RAG vs prompt) e come gestire il prompt

**Riferimento focus e bilingue**: vedi **COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md** (cosa vendiamo, bilingue IT/EN, come deve rispondere l’IA, cosa non deve dire, come tenerla in contesto).

**Ragionamento inverso**: dal prodotto finale → cosa deve sapere/fare l’IA → dove metterlo (quale sezione RAG, quale blocco prompt).

---

## 1. Prodotto finale (obiettivo)

- L’IA risponde come **coach** nella **lingua del cliente** (IT o EN): solo giocatori della **rosa caricata dal cliente**, **terminologia di gioco nella lingua della risposta** (IT: Resistenza, Opportunista, … | EN: Stamina, Poacher, …), solo **istruzioni/abilità ufficiali** (sezioni 5 e 8), **niente** “build”/“training”/nomi reali da guide.
- Se la domanda è su eFootball (moduli, abilità, istruzioni, meccaniche…) → l’IA ha **RAG** (sezioni rilevanti di info_rag + §10 NOTE CRITICHE).
- Se la domanda è su rosa/partite/allenatore → l’IA ha **CONTESTO PERSONALE** (titolari, riserve, partite, tattica, allenatore).
- **Prompt**: system sempre uguale (tono + vincoli); user = contesto pagina + (se serve) rosa + (se serve) blocco RAG + funzionalità app + regole risposta.

Da qui derivano: **cosa** integrare e **in quale punto** (RAG §X o prompt).

---

## 2. Cosa integrare e dove (punti precisi)

Tutto ciò che si integra da CONTENUTI_INTERNET / INCOERENZE va in **italiano**, **senza** build/training, **senza** nomi giocatori reali.

### 2.1 In **info_rag.md** (RAG)

| # | Cosa integrare | Dove (sezione esatta) | Testo / azione |
|---|----------------|------------------------|-----------------|
| 1 | **Forza base vs Forza complessiva** | **§9 COMPETENZE E SVILUPPO** – nuova sottosezione 9.4 | Aggiungere dopo 9.3 Valore Giocatore: "### 9.4 Forza base e Forza complessiva - **Forza base**: valutazione pura delle statistiche del giocatore. - **Forza complessiva**: tiene conto di forza base, alchimia di squadra, competenza nella posizione, stile di gioco (compatibilità con allenatore). È il parametro più rappresentativo della prestazione effettiva." |
| 2 | **Tiri mancati – cause** | **§10 NOTE CRITICHE** – sotto "ERRORI COMUNI" | Aggiungere punto: "**Tiri mancati** – cause possibili: calciare durante dribbling veloce, orientamento corpo errato rispetto alla porta, piede debole, pressione del difensore. Non inventare altre cause." |
| 3 | **Rischio infortunio** | **§10 NOTE CRITICHE** | Una riga: "Se in partita il giocatore segnala problema a una gamba (indicazione di gioco), sostituirlo alla prima occasione utile." |
| 4 | **Squadra Autentica vs Squadra dei Sogni** | **§9** – in 9.1 o nuova riga dopo tipologie | "**Squadra Autentica**: formazione preimpostata, aggiornata con dati live. **Squadra dei Sogni**: personalizzata (giocatori, allenatori, tattiche, eventi online)." |
| 5 | **Pressing – quando sì/no** | **§10 NOTE CRITICHE** | "**Pressing**: usarlo solo quando vicini al portatore e in sicurezza. Da lontano lascia spazi. Momento migliore: avversario con poche opzioni di passaggio (es. vicino alla linea laterale)." |
| 6 | **Rigori – portiere** | **§10 NOTE CRITICHE** | "**Rigori (portiere)**: equilibrio fondamentale; non lasciare troppo spazio scoperto. Evitare di uscire troppo presto." |
| 7 | **Giocatori: solo rosa** (rinforzo) | **§10 NOTE CRITICHE** – punto già presente, si può esplicitare | Verificare che ci sia una riga esplicita: "**Giocatori**: usa SOLO i nomi elencati nel CONTESTO PERSONALE (rosa fornita). Non suggerire mai nomi di giocatori non presenti nella rosa (es. da guide o liste esterne)." Se manca, aggiungerla. |

**Non** integrare in RAG: liste "top 3" con nomi reali, build/training/progression, Captaincy (solo Leader), Stamina (solo Resistenza), sigle CL/DC/LS per centrocampo (restare su max 1 CLD/CLS).

---

### 2.2 In **route.js** – prompt (system + user)

| # | Cosa | Dove (blocco esatto) | Azione |
|---|-----|----------------------|--------|
| 1 | **Resistenza / Stamina** | **systemContent** | Aggiungere una riga: "Resistenza: usa sempre 'Resistenza' (statistica fissa). Non dire 'Stamina'." |
| 2 | **Solo nomi dalla rosa** | **systemContent** (e già in user quando c’è contesto personale) | Aggiungere: "Giocatori: cita solo nomi presenti nella rosa fornita nel messaggio. Non inventare né suggerire nomi esterni." |
| 3 | **Rinforzo quando c’è RAG** | **User prompt** – blocco "REGOLE MECCANICHE" (dentro `efootballKnowledge`) | Quel blocco viene da getRelevantSections che include §10 NOTE CRITICHE. Nessuna modifica al codice: basta che §10 contenga le integrazioni sopra. |
| 4 | **Rinforzo quando c’è solo contesto personale (senza RAG)** | **User prompt** – "REGOLE ORO" (dentro `personalContextSummary`) | Già presente "Usa SOLO nomi dalla lista. NON inventare mai." e "Inventare nomi giocatori non nella rosa" in VIETATO. Opzionale: in REGOLE ORO aggiungere "Terminologia: Resistenza (non Stamina); stili e abilità solo in italiano (Opportunista, Collante, Tiro al volo, ecc.)." |

Quindi:
- **System**: aggiungere 2 righe (Resistenza/Stamina; solo nomi rosa).
- **User**: le regole dettagliate restano in RAG §10 quando si carica RAG; quando c’è solo contesto personale, REGOLE ORO e VIETATO restano come oggi (eventualmente 1 riga su terminologia).

---

## 3. Come gestire il prompt (schema preciso)

### 3.1 System message (sempre uguale)

- Ruolo, lingua, tono (diretto, max 3 frasi + "In sintesi").
- Vietati: potenziare, migliorare, allenare, inventare nomi.
- Posizioni: non suggerire ruoli incoerenti con position/competenze.
- Istruzioni: solo quelle sezione 5; Ancoraggio max 2.
- Abilità: native = card; aggiuntive = Programmi (non Trending); solo sezione 8.
- **Aggiungere**: Resistenza (non Stamina); giocatori = solo nomi dalla rosa fornita.
- Suggerimenti: 2 stesso tema + 1 altro.

### 3.2 User prompt – blocchi (ordine logico)

| Blocco | Quando è presente | Cosa ci va |
|--------|-------------------|------------|
| CONTESTO (pagina, domanda) | Sempre | Pagina corrente, domanda breve. |
| Profilo (nome, team, memo, problemi) | Sempre | Dati utente. |
| **ROSA E DATI** (CONTESTO PERSONALE) | Solo se `needsPersonalContext(message)` | Titolari, riserve, partite, tattica, allenatore. Istruzione: "USA QUESTI DATI - NON INVENTARE GIOCATORI". |
| **REGOLE ORO** (posizione ideale vs assegnata, sinergia, solo nomi lista) | Solo se c’è contesto personale | Come oggi; opzionale riga terminologia (Resistenza, italiano). |
| **MECCANICHE eFootball** (RAG) | Solo se `classifyQuestion(message) === 'efootball'` | Output di getRelevantSections (include §10 NOTE CRITICHE). |
| **REGOLE MECCANICHE** | Solo se c’è RAG | Breve riepilogo (stili fissi, istruzioni solo sez. 5, abilità solo sez. 8, Ancoraggio max 2). |
| FUNZIONALITÀ APP | Sempre | Dashboard, Gestione Formazione, Aggiungi Partita, ecc. |
| CONTESTO VIDEOGIOCO | Sempre | Card digitali, statistiche fisse. |
| TONO, ESEMPI, ERRORI DA EVITARE, VIETATO ASSOLUTO | Sempre | Come oggi. |
| FORMATO RISPOSTA, SUGGERIMENTI | Sempre | Max 3 frasi, "In sintesi", 3 domande. |

**Gestione pratica**:
- Le **regole lunghe** (errori comuni, esempi corretti, terminologia, solo rosa) stanno in **§10 NOTE CRITICHE** (RAG). Quando la domanda è eFootball, l’IA le riceve nel blocco MECCANICHE.
- Quando la domanda **non** è eFootball ma è sulla rosa, l’IA ha REGOLE ORO + VIETATO ASSOLUTO nel user (senza RAG). Per questo in **system** mettiamo le 2 righe invariate (Resistenza, solo rosa) così l’IA le ha sempre.
- Non duplicare tutto §10 nel prompt: sarebbe troppo lungo. §10 serve quando c’è RAG; system + VIETATO coprono i casi senza RAG.

---

## 4. Riepilogo azioni (checklist)

### info_rag.md

- [ ] **§9**: Aggiungere sottosezione 9.4 Forza base e Forza complessiva.
- [ ] **§9**: Aggiungere riga Squadra Autentica vs Squadra dei Sogni (in 9.1 o dopo).
- [ ] **§10**: Aggiungere punto "Tiri mancati – cause possibili".
- [ ] **§10**: Aggiungere riga "Rischio infortunio".
- [ ] **§10**: Aggiungere riga "Pressing – quando sì/no".
- [ ] **§10**: Aggiungere riga "Rigori – portiere".
- [ ] **§10**: Verificare/aggiungere riga esplicita "Giocatori: solo rosa".

### route.js

- [ ] **systemContent**: Aggiungere "Resistenza: usa sempre 'Resistenza'. Non 'Stamina'."
- [ ] **systemContent**: Aggiungere "Giocatori: cita solo nomi dalla rosa fornita. Non inventare né suggerire nomi esterni."
- [ ] (Opzionale) **REGOLE ORO** (user): Aggiungere una riga su terminologia (Resistenza, italiano) se si vuole rinforzo quando non c’è RAG.

---

## 5. Flusso dati (per chi implementa)

1. **classifyQuestion(message) === 'efootball'** → `getRelevantSections(message, 18000)` → blocchi di info_rag (inclusa §10) in `efootballKnowledge` → iniettati in user come "MECCANICHE eFootball" + "REGOLE MECCANICHE".
2. **needsPersonalContext(message)** → `buildPersonalContext(userId)` → rosa, partite, tattica, allenatore in `personalContextSummary` → iniettati in user come "ROSA E DATI" + "REGOLE ORO".
3. **systemContent** → sempre uguale; dopo le modifiche conterrà Resistenza e "solo rosa".
4. Risultato: l’IA ha sempre vincoli base (system); se parla di eFootball ha dettaglio RAG + §10; se parla della rosa ha CONTESTO PERSONALE + REGOLE ORO.

Fine del piano. Implementando in questo ordine (prima info_rag, poi route.js) il prodotto finale resta coerente con COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md: bilingue IT/EN, solo rosa cliente, terminologia nella lingua di risposta, solo contenuti ufficiali, niente build/training/nomi esterni.
