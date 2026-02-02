# Piano di azione – RAG, flussi e correzioni

Analisi riga-per-riga di dove il RAG prende le informazioni, simulazione dei flussi e piano per correggere tutto quanto discusso finora.

---

## 1. Da dove il RAG prende le informazioni (riga per riga)

### 1.1 File unico sorgente

| Riga / punto | File | Cosa fa |
|--------------|------|--------|
| **Unica fonte** | **info_rag.md** (root progetto) | Tutto il contenuto RAG viene da questo file. MEMORIA_ATTILA_BRAINSTORM.md **non** viene mai letto dall’API. |

### 1.2 ragHelper.js – caricamento e parsing

| Riga | Codice / logica | Note |
|------|------------------|------|
| 15-21 | `getInfoRagPath()` | Cerca `info_rag.md` in `process.cwd()` poi in `__dirname/../info_rag.md`. Su Vercel usa cwd. |
| 23-25 | `cachedContent`, `cachedSections` | Cache in memoria: primo caricamento legge il file, poi si riusa. |
| 114-127 | `loadInfoRagContent()` | Legge `info_rag.md` con `fs.readFileSync(infoRagPath, 'utf-8')`. |
| 135-164 | `parseSections(content)` | Spezza il file per righe che iniziano con **`## `** (due cancelletti + spazio). Ogni blocco è `{ title: "testo dopo ## ", content: corpo fino al prossimo ## }`. **Solo `##`** sono sezioni; `###` e `####` restano nel corpo. |
| 170-175 | `getSections()` | Restituisce le sezioni parse (con cache). I titoli sono **esattamente** come in info_rag (es. `"2. STILI DI GIOCO DEI GIOCATORI (UFFICIALI - FISSI)"`). |

### 1.3 Selezione sezioni (getRelevantSections)

| Riga | Codice / logica | Note |
|------|------------------|------|
| 267-276 | `getRelevantSections(userMessage, maxChars)` | Riceve il messaggio utente e il limite caratteri (default 18000). |
| 268-269 | `sections = getSections()` | Prende tutte le sezioni da info_rag (cache). |
| 271-276 | `messageNorm` | Messaggio in minuscolo, NFD, senza accenti, apostrofi → spazio, spazi multipli → uno. Usato per il matching. |
| 278-283 | `scored = sections.map(scoreSection)` | Per ogni sezione conta quante **keyword** (da SECTION_KEYWORDS) compaiono in `messageNorm`. |
| 285 | `scored.sort((a,b) => b.score - a.score)` | Ordine per score decrescente (più match = prima). |
| 288-293 | Ciclo `selected` | Aggiunge sezioni fino a maxChars; entra se `score > 0` **oppure** se `selected.length < 2` (almeno 2 sezioni). |
| 296-307 | Fallback | Se `selected.length === 0`, prende le prime 4 sezioni (anche con score 0). |
| 309-318 | NOTE CRITICHE | Se non già presente, aggiunge sempre la sezione **"10. NOTE CRITICHE PER L'IA"** se c’è spazio. |
| 320-326 | `return selected.map(...)` | Per ogni sezione selezionata: **se** `s.title === 'STILI DI GIOCO DEI GIOCATORI'` applica `getStiliContentFilteredByRole`, altrimenti usa il contenuto così com’è. Poi concatena con `---`. |

**Bug 1**: Il titolo reale in info_rag è `"2. STILI DI GIOCO DEI GIOCATORI (UFFICIALI - FISSI)"`, non `'STILI DI GIOCO DEI GIOCATORI'`. Quindi il filtro per ruolo **non viene mai applicato** (condizione sempre falsa).

### 1.4 SECTION_KEYWORDS – quale messaggio attiva quale sezione

Le keyword sono in **ragHelper.js righe 34-109**. La sezione viene inclusa (con score > 0) solo se almeno una keyword è contenuta in `messageNorm`.

**Gap**: Per la sezione **3. MODULI TATTICI** le keyword sono `'moduli tattici', 'formazione', '4-3-3', ...` ma **manca `'modulo'`** (singolo). Domande come **"che modulo uso?"** non matchano nessuna keyword di §3 → score 0 → §3 può non entrare tra le prime (o entrare solo per il fallback “almeno 2 sezioni”).

### 1.5 classifyQuestion e needsPersonalContext (assistant-chat)

| Riga route.js | Flusso | Note |
|----------------|--------|------|
| 654-662 | `if (classifyQuestion(message) === 'efootball')` | Se il messaggio contiene un termine in **EFOOTBALL_TERMS** (ragHelper) → `'efootball'` → si chiama `getRelevantSections(message, 18000)` e il risultato va in `efootballKnowledge`. |
| 664-673 | `if (needsPersonalContext(message))` | Se il messaggio contiene un termine in **PERSONAL_CONTEXT_TERMS** → si chiama `buildPersonalContext(userId)` e il risultato va in `personalContextSummary`. |
| 677-678 | `buildPersonalizedPrompt(..., efootballKnowledge, personalContextSummary, ...)` | Il prompt utente viene costruito con: messaggio, contesto pagina/app, lingua, **efootballKnowledge** (RAG), **personalContextSummary** (rosa/partite/allenatore), history. |

Quindi:
- **RAG** = solo quando `classifyQuestion === 'efootball'`.
- **Contesto personale** = solo quando `needsPersonalContext === true`.
- I due sono indipendenti: si può avere solo RAG, solo contesto personale, entrambi o nessuno.

---

## 2. Simulazione flussi (interna)

### Flusso A – "Che modulo uso?"

| Step | Variabile | Valore |
|------|-----------|--------|
| 1 | `classifyQuestion("che modulo uso?")` | `'efootball'` (EFOOTBALL_TERMS contiene `'modulo'`, `'che modulo'`) |
| 2 | `getRelevantSections("che modulo uso?", 18000)` | `messageNorm` = "che modulo uso". Score §3 MODULI: keyword `'moduli tattici'`, `'formazione'`… **nessuna contiene "modulo"** → score 0. Altre sezioni idem. Con `selected.length < 2` si prendono comunque 2 sezioni (prime per ordine dopo sort); se tutte a 0, l’ordine è indeterminato. **Rischio: §3 Moduli non prioritizzata.** |
| 3 | `needsPersonalContext("che modulo uso?")` | `true` (PERSONAL_CONTEXT_TERMS contiene `'che modulo'`) → si carica contesto personale. |
| 4 | Prompt | Contiene: contesto, **RAG** (sezioni selezionate, possibilmente senza §3 in cima), **contesto personale** (rosa, formazione, partite, allenatore), regole, formato. |

**Problema**: §3 Moduli potrebbe non essere tra le sezioni a score alto perché manca la keyword `'modulo'`.

### Flusso B – "Come carico una partita?"

| Step | Variabile | Valore |
|------|-----------|--------|
| 1 | `classifyQuestion("come carico una partita?")` | `'platform'` (platformTerms contiene `'come carico'`) |
| 2 | RAG | **Non** caricato (`efootballKnowledge = ''`). |
| 3 | `needsPersonalContext(...)` | Probabile `false` (nessun termine personale forte) → nessun contesto personale. |
| 4 | Prompt | Solo contesto pagina/app, messaggio, funzionalità app, tono, formato. Corretto per domanda “operativa” sull’app. |

### Flusso C – "Che abilità per il mio centrocampista?"

| Step | Variabile | Valore |
|------|-----------|--------|
| 1 | `classifyQuestion(...)` | `'efootball'` (es. "abilità", "centrocampista" o termini generici eFootball). |
| 2 | `getRelevantSections(...)` | §8 ABILITÀ ha keyword `'abilità giocatore'`, `'passaggio di prima'`, … → score > 0; §9 COMPETENZE idem. NOTE CRITICHE aggiunte dopo. |
| 3 | `needsPersonalContext(...)` | `true` (es. "i miei", "mia rosa" o "cosa mi consigli" → PERSONAL_CONTEXT_TERMS) → contesto personale caricato. |
| 4 | Prompt | RAG (§8, §9, NOTE CRITICHE, …) + contesto personale (rosa con nomi/abilità) + regole (abilità native/aggiuntive, no Trending). |

### Flusso D – "Ancoraggio a chi lo do?"

| Step | Variabile | Valore |
|------|-----------|--------|
| 1 | `classifyQuestion(...)` | `'efootball'` (EFOOTBALL_TERMS ha `'ancoraggio'`). |
| 2 | `getRelevantSections(...)` | §5 ISTRUZIONI ha `'ancoraggio'`, `'anchoring'` → score > 0; in §5 c’è già la regola “max 2 giocatori”. NOTE CRITICHE incluse. |
| 3 | Prompt | RAG con §5 (Ancoraggio max 2) + NOTE CRITICHE; system con “Ancoraggio (max 2 giocatori)”. Coerente. |

---

## 3. Bug e incoerenze riepilogati

| # | Tipo | Dove | Descrizione |
|---|------|------|-------------|
| 1 | Bug | ragHelper.js ~322 | Confronto `s.title === 'STILI DI GIOCO DEI GIOCATORI'` mai vero perché il titolo reale è `"2. STILI DI GIOCO DEI GIOCATORI (UFFICIALI - FISSI)"`. Filtro per ruolo mai eseguito. |
| 2 | Gap | ragHelper.js SECTION_KEYWORDS §3 | Manca keyword `'modulo'` (e possibilmente `'che modulo'`, `'quale modulo'`) per §3 MODULI TATTICI → domande “che modulo uso?” non danno priorità a §3. |
| 3 | Già corretto | info_rag.md | Tabella FISSO vs MODIFICABILE: “Abilità Giocatore” sostituita con “Abilità native” (FISSO) e “Abilità aggiuntive” (MODIFICABILE). |
| 4 | Già corretto | info_rag.md | Aggiunto §3.4 Limiti di schieramento (A/C/D/PT) allineato a Memoria Attila. |
| 5 | Opzionale | info_rag.md | Forza base / Forza complessiva, Squadra Autentica/Sogni, “tiri mancati”, “rischio infortunio”: assenti; aggiungibili per completezza (vedi COERENZA_MEMORIA_ATTILA_VS_RAG.md). |

---

## 4. Piano di azione per correggere tutto

### 4.1 Obbligatori (bug e coerenza)

1. **ragHelper.js – titolo sezione Stili**  
   - Sostituire il confronto esatto con un controllo che includa il titolo reale della sezione Stili.  
   - Esempio: `s.title.includes('STILI DI GIOCO DEI GIOCATORI')` oppure `s.title === '2. STILI DI GIOCO DEI GIOCATORI (UFFICIALI - FISSI)'`.  
   - Così il filtro per ruolo può essere eseguito quando la sezione Stili è tra le selezionate (eventuali aggiustamenti sul contenuto di info_rag, es. ### vs ####, vanno fatti solo se si vuole davvero filtrare per ruolo).

2. **ragHelper.js – keyword §3 Moduli**  
   - In `SECTION_KEYWORDS` per `'3. MODULI TATTICI (CONFIGURABILI)'` aggiungere: `'modulo'`, `'che modulo'`, `'quale modulo'`.  
   - Così “che modulo uso?” (e simili) danno score > 0 a §3 e la sezione Moduli viene prioritizzata.

3. **Coerenza Memoria Attila / info_rag**  
   - Già fatto: tabella abilità (native/aggiuntive), §3.4 limiti formazione.  
   - Nessuna altra modifica obbligatoria; opzionali come in §4.2.

4. **Prompt e system (route.js)**  
   - Già allineati: Ancoraggio max 2, abilità native/aggiuntive, posizione ideale vs assegnata, limiti.  
   - Nessun cambio necessario.

### 4.2 Opzionali (completezza)

5. **info_rag.md – Forza base e Forza complessiva**  
   - Aggiungere 1–2 righe (es. in §9 o in CONTESTO VIDEOGIOCO):  
     Forza base = somma abilità individuali; Forza complessiva = considera anche alchimia, competenza posizione, stile.

6. **info_rag.md – Squadra Autentica vs Squadra dei Sogni**  
   - Aggiungere 1 riga (es. in §9.1):  
     Squadra Autentica = preimpostata, dati live; Squadra dei Sogni = personalizzata (giocatori, allenatori, eventi).

7. **info_rag.md – Consigli tecnici**  
   - Aggiungere in §7 o in §10 NOTE CRITICHE:  
     - “Tiri mancati”: calciare in dribbling veloce o con orientamento corpo sbagliato.  
     - “Rischio infortunio”: se il giocatore segnala problema, sostituirlo alla prima occasione.

8. **Filtro Stili per ruolo (ragHelper)**  
   - Opzionale: adattare `getStiliContentFilteredByRole` alla struttura reale di info_rag (es. blocchi #### “Attaccanti e Centrocampisti Offensivi” ecc.) se si vuole inviare solo il sotto-blocco rilevante; altrimenti lasciare contenuto Stili sempre completo (comportamento attuale dopo il fix del titolo).

### 4.3 Verifica finale

- Rieseguire i flussi A–D dopo le modifiche:  
  - “Che modulo uso?” → §3 in RAG con priorità alta + contesto personale.  
  - “Come carico una partita?” → nessun RAG, risposta su funzionalità app.  
  - “Che abilità per il mio centrocampista?” → §8/§9 + NOTE CRITICHE + contesto personale.  
  - “Ancoraggio a chi lo do?” → §5 + NOTE CRITICHE, regola max 2 rispettata.  
- Controllare che **solo** info_rag.md sia usato come sorgente RAG e che MEMORIA_ATTILA_BRAINSTORM.md resti solo riferimento umano/Cursor.

---

## 5. Riepilogo ordine interventi

| Ordine | Azione | File |
|--------|--------|------|
| 1 | Correggere check titolo Stili (includes o titolo completo) | lib/ragHelper.js |
| 2 | Aggiungere keyword `modulo`, `che modulo`, `quale modulo` a §3 | lib/ragHelper.js |
| 3 | (Opz.) Forza base/complessiva, Squadra Autentica/Sogni, tiri mancati, rischio infortunio | info_rag.md |
| 4 | (Opz.) Adattare filtro ruolo Stili a struttura info_rag o lasciare contenuto completo | lib/ragHelper.js |

Dopo 1 e 2, i flussi principali (modulo, abilità, ancoraggio, carico partita) e la coerenza con Memoria Attila e con quanto discusso (RAG, prompt, limiti, Ancoraggio max 2, abilità native/aggiuntive) sono coperti. Gli opzionali migliorano completezza e chiarezza per l’utente.
