# Dati a disposizione, domande possibili e come ci prepariamo (dettaglio)

Questo documento elenca: (1) quali dati abbiamo e da dove, (2) quali tipi di domande possono arrivare, (3) per ogni tipo cosa carichiamo e cosa rischiamo di non coprire, (4) come prepararci a tutto.

---

## PARTE 1 – DATI A DISPOSIZIONE (dove sono e quando li usiamo)

### 1.1 Dati che arrivano in OGNI richiesta chat (body + contesto base)

| Fonte | Dati | Dove si usano |
|-------|------|----------------|
| **Body della richiesta** | `message` (testo utente), `currentPage` (es. `/gestione-formazione`, `/match/new`), `appState` (completingMatch, viewingMatch, managingFormation, viewingDashboard), `language` (it/en), `history` (ultimi 10 messaggi) | message → classifyQuestion + needsPersonalContext; currentPage/appState → contesto pagina nel prompt; language → lingua risposta; history → messaggi precedenti per OpenAI |
| **user_profiles** (Supabase) | first_name, team_name, ai_name, how_to_remember, common_problems | Sempre caricati in buildAssistantContext → nel prompt: nome, team, memo, problemi comuni |

Quindi: per ogni messaggio abbiamo sempre **chi è l’utente** (profilo), **dove si trova** (pagina/stato app), **in che lingua** rispondere e **cosa ha scritto** (message).

---

### 1.2 Dati caricati SOLO se la domanda “richiede la rosa” (needsPersonalContext)

La rosa (e partite, tattica, allenatore) si caricano **solo** se nel messaggio compare almeno un termine della lista **PERSONAL_CONTEXT_TERMS** in `lib/ragHelper.js`.

**Tabella Supabase usata e campi:**

| Tabella | Campi usati | Cosa ne facciamo |
|---------|-------------|-------------------|
| **formation_layout** | formation, slot_positions | Formazione attuale (es. 4-3-3), posizioni slot |
| **players** | id, player_name, position, overall_rating, playing_style_id, slot_index, photo_slots, base_stats, original_positions | Fino a 50 giocatori; titolari (slot_index 0-10) + riserve (slot_index null). Per ogni giocatore: nome, ruolo (position), overall, stile (da lookup), profilazione (card/stats/skills da photo_slots), competenze (original_positions) |
| **playing_styles** | id, name | Lookup: da playing_style_id al nome stile (es. Opportunista, Collante) |
| **matches** | opponent_name, result, formation_played, playing_style_played, match_date | Ultime 10 partite: avversario, risultato, formazione usata, stile usato, data |
| **team_tactical_settings** | team_playing_style, individual_instructions | Stile squadra (es. Contropiede veloce), quante istruzioni individuali attive |
| **coaches** | coach_name, playing_style_competence | Solo allenatore attivo (is_active=true): nome e competenze per stile (es. Contrattacco 85) |

**Cosa NON c’è in questo contesto (e quindi l’IA non lo “vede” nel blocco rosa):**

- Singole **statistiche** estratte (Velocità, Finalizzazione, ecc.) per giocatore: non vengono messe nel testo del contesto. Ci sono `base_stats` e `photo_slots` ma nel prompt va solo un riassunto tipo “profilazione: completa (3/3)” e “competenze: CC Alta, MED Intermedia”. Quindi domande tipo “che velocità ha X?” non hanno il numero nel contesto.
- **Abilità** della card (Tiro al volo, Passaggio filtrante, ecc.) per singolo giocatore: non sono nel testo del contesto. L’IA sa dalla RAG quali abilità esistono, ma non “il giocatore X ha Tiro al volo” a meno che non sia da qualche parte in base_stats/photo_slots (da verificare in estrazione).
- **Dettaglio analisi partita** (perché abbiamo perso, cross sbagliati, ecc.): quello lo genera analyze-match e sta nel dettaglio partita (match/[id]), non viene iniettato nella chat. In chat abbiamo solo: data, avversario, risultato, formazione usata, stile usato.

Quindi: **dati rosa** = formazione, elenco giocatori con nome/ruolo/stile/overall/profilazione/competenze, ultime 10 partite (sintesi), stile squadra, numero istruzioni, allenatore e competenze stili. **NON** = statistiche singole per giocatore, abilità singole per giocatore, analisi AI della singola partita.

---

### 1.3 Dati RAG (info_rag.md) – caricati SOLO se la domanda è “eFootball”

Si caricano **solo** se `classifyQuestion(message) === 'efootball'`, cioè se nel messaggio c’è almeno un termine della lista **EFOOTBALL_TERMS** in `lib/ragHelper.js`.

**Sezioni info_rag e cosa contengono:**

| Sezione | Contenuto sintetico |
|---------|---------------------|
| OBIETTIVO | Scopo RAG |
| CONTESTO VIDEOGIOCO | Card digitali, fisso vs modificabile, regola oro |
| 1. STATISTICHE GIOCATORI | Nomi statistiche (Velocità, Resistenza, Finalizzazione, ecc.) |
| 2. STILI DI GIOCO DEI GIOCATORI | Stili senza palla + stili IA, posizioni compatibili (Opportunista, Collante, ecc.) |
| 3. MODULI TATTICI | 4-3-3, 4-2-3-1, limiti schieramento (max 2 P, max 1 CLD/CLS, ecc.) |
| 4. STILI TATTICI DI SQUADRA | Possesso, Contropiede, Contrattacco, Passaggio lungo, Vie laterali, ecc. |
| 5. ISTRUZIONI INDIVIDUALI | Offensivo, Difensivo, Ancoraggio (max 2), Marcatura, Contropiede, Linea bassa |
| 6. CALCI PIAZZATI | Punizioni, corner, difesa (schemi) |
| 7. MECCANICHE DI GIOCO AVANZATE | Testa a testa, contrasto spalla, uno-due, tiro sensazionale, ecc. |
| 8. ABILITÀ GIOCATORI | Native/aggiuntive, Programmi, Trending no, elenco abilità per categoria |
| 9. COMPETENZE E SVILUPPO | Tipologie giocatori, competenza posizione, VG |
| 10. NOTE CRITICHE PER L'IA | Errori da evitare, terminologia, solo rosa, esempi corretti/errati |

Le sezioni vengono scelte con **SECTION_KEYWORDS**: per ogni sezione si contano le keyword presenti nel messaggio; si ordinano per score e si prendono fino a ~18000 caratteri. La **§10 NOTE CRITICHE** viene aggiunta sempre (se c’è spazio) quando si carica almeno una sezione RAG.

**Cosa può andare storto:** se l’utente chiede una cosa eFootball con parole che non sono in EFOOTBALL_TERMS (es. “cos’è il fulcro”, “spiegami l’ancoraggio”), la domanda può essere classificata **platform** e non si carica RAG. Oppure si carica RAG ma le keyword non matchano la sezione giusta (es. domanda su Ancoraggio senza la parola “ancoraggio”) e quella sezione non entra.

---

## PARTE 2 – TIPI DI DOMANDE POSSIBILI (tassonomia)

### 2.1 Domande sulla PIATTAFORMA (app, navigazione, operazioni)

**Esempi:** “Come carico una partita?”, “Dove trovo la formazione?”, “Come aggiungo un giocatore?”, “Dove sono i miei allenatori?”, “Non riesco a caricare lo screenshot”, “How do I add a match?”.

- **ClassifyQuestion:** platform (perché nei messaggi ci sono termini tipo “caricare partita”, “dove trovo”, “how do i add”).
- **Cosa carichiamo:** contesto pagina (currentPage, appState), profilo, **nessun** RAG eFootball, **nessuna** rosa (a meno che il messaggio non contenga anche “rosa”/“squadra”/ecc.).
- **Rischio:** se l’utente chiede “come cambio la mia formazione” potrebbe esserci “formazione” e “mia” → a seconda dell’ordine dei termini potrebbe scattare efootball o personalContext. I PERSONAL_CONTEXT_TERMS includono “la mia formazione”, “formazione che uso” → si carica la rosa. Ok.

---

### 2.2 Domande su eFootball GENERICO (senza riferimenti alla propria rosa)

**Esempi:** “Cos’è un Opportunista?”, “Che modulo è il 4-3-3?”, “Quali istruzioni individuali ci sono?”, “Cos’è l’Ancoraggio?”, “Come si fa il pressing?”, “What is a Poacher?”, “Which instructions can I set?”.

- **ClassifyQuestion:** efootball (termini tipo opportunista, modulo, istruzioni individuali, ancoraggio, pressing).
- **Cosa carichiamo:** RAG (sezioni rilevanti + §10). Di solito **non** needsPersonalContext (a meno che non dica “nella mia rosa”, “per i miei giocatori”).
- **Rischio:** domande con sinonimi o typos (“cacciatore di gol”, “ancoraggio” scritto male) potrebbero non matchare EFOOTBALL_TERMS o SECTION_KEYWORDS e dare RAG incompleto. EFOOTBALL_TERMS ha “cacciatore di gol”, “rapace d area”; SECTION_KEYWORDS per §5 ha “ancoraggio”. Monitorare.

---

### 2.3 Domande sulla PROPRIA ROSA / PARTITE / ALLENATORE (consigli personalizzati)

**Esempi:** “Che ne pensi della mia rosa?”, “Chi metto al posto di [nome]?”, “Quale modulo mi consigli con i miei giocatori?”, “Come sono andato nelle partite?”, “Chi è il mio allenatore?”, “Cosa mi consigli di cambiare?”, “Non segno mai, cosa fare?”, “Who should I play instead of X?”.

- **needsPersonalContext:** true (rosa, partite, allenatore, consigli, formazione, ecc.).
- **ClassifyQuestion:** spesso anche efootball (“modulo”, “consigli”, “formazione”) → carichiamo sia rosa sia RAG.
- **Cosa carichiamo:** buildPersonalContext (formazione, titolari, riserve, partite, tattica, allenatore) + eventuale RAG.
- **Rischio:** 
  - Se l’utente dice solo “sostituisci il mediano” o “chi metto in difesa?” senza “rosa”/“squadra”/“mia”/“consigli” potrebbe non matchare PERSONAL_CONTEXT_TERMS → **non** carichiamo la rosa e l’IA non può dare un nome. Soluzione: ampliare PERSONAL_CONTEXT_TERMS con “sostituisci”, “chi metto”, “in difesa” (alcuni ci sono già: “chi metto”, “sostituire”).
  - “Che abilità ha [nome]?”: nel contesto rosa non abbiamo le abilità per giocatore → l’IA non può rispondere con dati reali, solo generico (“controlla in Gestione Formazione / dettaglio giocatore”). Stesso per “che velocità ha X?” se le stat non sono nel testo.

---

### 2.4 Domande MISTE (eFootball + rosa)

**Esempi:** “Quale modulo è meglio per la mia rosa?”, “Mi consigli le istruzioni per i miei titolari?”, “Ancoraggio a chi lo do nella mia squadra?”.

- Si caricano **entrambi**: RAG (moduli, istruzioni, Ancoraggio) e contesto personale (rosa).
- L’IA può incrociare: stili in rosa, limiti Ancoraggio (max 2), posizioni ideali vs assegnate.

---

### 2.5 Domande su SINGOLA PARTITA o SINGOLO GIOCATORE (dettaglio)

**Esempi:** “Perché ho perso l’ultima partita?”, “Come è andata la partita vs [avversario]?”, “Che statistiche ha [nome]?”, “Che abilità ha [nome]?”.

- **Rosa/partite:** se “ultima partita”, “partite”, “come è andata” → needsPersonalContext true. Abbiamo ultime 10 partite con: avversario, risultato, formazione, stile. **Non** abbiamo: analisi AI (punti deboli, cross, ecc.) nella chat. Quindi l’IA può dire “hai giocato 4-3-3, Contropiede, risultato 1-2” ma non “nella partita hai sbagliato i cross” a meno che non sia deduzione generica da RAG.
- **Giocatore:** abbiamo nome, position, overall, stile, profilazione, competenze. **Non** abbiamo nel testo: singole statistiche (Velocità 85, ecc.) né elenco abilità della card. Quindi “che abilità ha X?” non è rispondibile con dati reali dal contesto chat; l’IA può solo dire di guardare il dettaglio giocatore o la scheda in Gestione Formazione.

---

## PARTE 3 – PER OGNI TIPO, COSA SERVE E COSA MANCA

| Tipo domanda | Dati necessari | Cosa carichiamo oggi | Cosa manca / rischio |
|--------------|----------------|----------------------|----------------------|
| Piattaforma (come, dove) | Pagina, profilo, funzionalità app | Sempre: contesto + profilo. Mai RAG, rosa solo se richiesta | Prompt funzionalità solo in italiano; per EN andrebbe tradotto |
| eFootball generico | RAG (sezioni giuste) | RAG se efootball; §10 sempre | Termini/sinonimi non in EFOOTBALL_TERMS → no RAG; keyword sbagliate → sezione mancante |
| Rosa / consigli (modulo, sostituzioni, allenatore) | Rosa, partite, tattica, coach, RAG (moduli, istruzioni) | Rosa + RAG se i termini matchano | PERSONAL_CONTEXT_TERMS: frasi tipo “sostituisci il mediano” senza “rosa” potrebbero non matchare; abbiamo “sostituire”, “chi metto” |
| Abilità/statistiche singolo giocatore | Dettaglio abilità e stat per giocatore nel contesto | Nome, ruolo, overall, stile, competenze, profilazione | Abilità e statistiche numeriche **non** sono nel testo del contesto → risposta generica o “guarda dettaglio giocatore” |
| Analisi singola partita (perché ho perso) | Dettaglio partita (analisi AI, highlights) | Solo: avversario, risultato, formazione, stile, data | Analisi AI (punti deboli, cosa è andato storto) non è iniettata in chat → l’IA può solo usare RAG generico e dati sintetici partita |
| Calci piazzati, meccaniche, stili | RAG sezioni 2, 6, 7, ecc. | RAG se messaggio contiene keyword | Stesso rischio keyword/sinonimi |
| Istruzioni individuali (quali sono, a chi darle) | RAG §5 + rosa (per “a chi”) | RAG + rosa se “consigli”/“mia rosa”/ecc. | Ok se termini presenti; “a chi do l’ancoraggio” con “ancoraggio” e “chi” → personalContext può scattare |

---

## PARTE 4 – COME PREPARARCI A TUTTO (azioni concrete)

### 4.1 Ampliare i termini che attivano rosa (PERSONAL_CONTEXT_TERMS)

Aggiungere varianti che oggi potrebbero non matchare:
- “sostituisci”, “cambia giocatore”, “chi in difesa”, “chi in attacco”, “ruolo di [nome]”, “mettere [nome]”, “togliere [nome]”
- In inglese: “who should I play”, “replace”, “swap”, “put in defense”, “take off”

Così anche domande brevi tipo “chi metto al posto del mediano?” caricano la rosa.

---

### 4.2 Ampliare i termini eFootball (EFOOTBALL_TERMS) e keyword RAG (SECTION_KEYWORDS)

- Verificare che ogni concetto importante (fulcro, ancoraggio, linea bassa, deep line, ecc.) sia in EFOOTBALL_TERMS così la domanda viene classificata efootball.
- Verificare che per ogni sezione info_rag ci siano keyword che l’utente può usare (anche sinonimi e typos comuni). Es. “fulcro di gioco” in SECTION_KEYWORDS per §2.

Così riduciamo il rischio “domanda eFootball ma RAG non caricato” o “sezione sbagliata”.

---

### 4.3 Cosa fare quando l’IA non ha il dato (abilità/statistiche giocatore, analisi partita)

- **Nel prompt (o in §10 NOTE CRITICHE):** “Se il cliente chiede abilità o statistiche di un singolo giocatore e non hai quel dettaglio nel contesto: indica che può vedere la scheda del giocatore in Gestione Formazione (clic sulla card) o nel Dettaglio Giocatore.”
- **Stesso per analisi partita:** “Se chiede perché ha perso o dettaglio di una partita e non hai l’analisi AI nel contesto: puoi usare formazione/stile/risultato (se presenti) e suggerire di aprire il Dettaglio Partita per l’analisi completa.”

Così l’IA non inventa numeri o abilità e indirizza l’utente dove i dati ci sono davvero.

---

### 4.4 Prompt bilingue (IT/EN) per contesto, esempi e vietati

- Costruire i blocchi fissi del prompt (contesto pagina, funzionalità app, esempi corretti, vietato) in base a `language`: se en, testo in inglese. Così l’IA riceve istruzioni nella stessa lingua della risposta.
- Esempi: evitare nomi reali (Pedri, Bellingham, ecc.); usare placeholder [Nome] o frasi senza nomi.

---

### 4.5 Fallback “carica sempre la rosa” (opzionale)

Oggi la rosa si carica solo se needsPersonalContext è true. Un’alternativa per “prepararsi a tutto” è: **se classifyQuestion === 'efootball' e il messaggio è breve o ambiguo, caricare anche la rosa** (o almeno provare). Pro: nessuna domanda personale senza rosa. Contro: più token e più query Supabase. Si può fare come opzione configurabile o solo dopo aver ampliato PERSONAL_CONTEXT_TERMS.

---

## PARTE 5 – RIEPILOGO FLUSSO (dove si decide cosa)

1. **Arriva il message** → si valuta `classifyQuestion(message)` (EFOOTBALL_TERMS vs platform) e `needsPersonalContext(message)` (PERSONAL_CONTEXT_TERMS).
2. **Se efootball** → `getRelevantSections(message, 18000)` → sezioni info_rag per keyword + §10.
3. **Se needsPersonalContext** → `buildPersonalContext(userId)` → formation_layout, players, matches, team_tactical_settings, coaches (+ playing_styles).
4. **Si costruisce il prompt** con: contesto pagina, profilo, (se presente) rosa + REGOLE ORO, (se presente) RAG + REGOLE MECCANICHE, funzionalità app, tono/esempi/vietato, domanda cliente.
5. **System message** contiene: lingua, bilingue, solo rosa, tono, vietati, istruzioni/abilità.

Per “prepararci a tutto” servono: **termini rosa ed eFootball ampi**, **istruzioni chiare quando un dato non c’è** (abilità/stat/analisi partita), **prompt bilingue**, e opzionale **fallback rosa** per domande eFootball ambigue.

---

Fine documento. File di riferimento: `lib/ragHelper.js` (PERSONAL_CONTEXT_TERMS, EFOOTBALL_TERMS, SECTION_KEYWORDS, classifyQuestion, needsPersonalContext, getRelevantSections), `app/api/assistant-chat/route.js` (buildPersonalContext, buildPersonalizedPrompt, system message), `info_rag.md` (sezioni e §10).
