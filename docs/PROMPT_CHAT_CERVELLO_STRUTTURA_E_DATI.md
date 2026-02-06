# Prompt chat Cervello AI – Struttura e fonti dati

**Scopo:** descrivere com’è fatto il prompt e da dove prende i dati per ragionare.

---

## 1. Flusso generale

```
POST /api/assistant-chat
  body: { message, currentPage, appState, language, history }
       ↓
  validateToken(userId)
       ↓
  classifyQuestion(message)  →  'efootball' | 'platform'
       ↓
  Sempre  →  buildPersonalContext(userId, lang)  →  personalContextSummary (rosa, partite, tattica, allenatore)
  Sempre  →  buildAssistantContext(userId, currentPage, appState)  →  context (profilo + pagina + appState)
  Se efootball  →  getRelevantSections(message, 18000)  →  efootballKnowledge (RAG)
       ↓
  buildPersonalizedPrompt(message, context, lang, efootballKnowledge, personalContextSummary, hasHistory)
       ↓
  systemContent (string fisso + regole)
  messages = [ system, ...history, user: prompt ]
       ↓
  OpenAI (gpt-4o)  →  response
       ↓
  parseSuggestionsFromContent(response)  →  cleanContent + suggestions[]
  return { response: cleanContent, suggestions }
```

---

## 2. Struttura del prompt (cosa vede il modello)

### 2.1 System message (fisso)

- **Ruolo:** Coach AI per eFootball, risposta in IT o EN.
- **Scope:** SOLO consulenza tattica; mai istruzioni su uso app (redirect a Guida/tour).
- **Fonti dati:** nomi/rosa/partite/allenatore solo da blocco "ROSA E DATI"; regole eFootball solo da "MECCANICHE eFootball".
- **Paletti:** terminologia ufficiale, stili allenatore (>= 70), niente inventare, tono operativo, formato risposta (max 3 frasi + "In sintesi:" + blocco SUGGERIMENTI 1. 2. 3.).
- **Vietato:** istruzioni uso app, inventare nomi/dati, “potenziare” stili, consigli durante la partita, ecc.

### 2.2 User message (prompt costruito da `buildPersonalizedPrompt`)

Il prompt utente è un **unico blocco di testo** che contiene, in ordine:

| Blocco | Contenuto | Da dove arriva |
|--------|-----------|----------------|
| **CONTESTO** | Pagina corrente + domanda breve (prime 80 caratteri) | `currentPage` (body) + `userMessage` |
| **NOTA** (se hasHistory) | "Continua la conversazione, NON salutare" | `history.length > 0` |
| **👤 Profilo** | Nome, team, memo (how_to_remember), problemi comuni | `context.profile` da `user_profiles` |
| **Contesto pagina/stato** | pageContext, stateContext (es. "Sta caricando una partita") | `currentPage`, `appState` (body) |
| **📊 ROSA E DATI** | Formazione, titolari, riserve, partite, tattica, allenatore, pattern, skills | Sempre: `buildPersonalContext(userId, lang)` (Supabase) |
| **🔍 COME CERCARE E RAGIONARE** | Dove cercare (ROSA vs MECCANICHE), ordine ragionamento, paletti, MODO COACH, personalizzazione, REGOLE ORO, DA DOVE PRENDI I DATI, ORDINE RAGIONAMENTO | Testo fisso nel prompt (con varianti se c’è/ non c’è rosa) |
| **📚 MECCANICHE eFootball** | Sezioni RAG rilevanti (stili, moduli, istruzioni, abilità, ecc.) | **Solo se** `classifyQuestion(message) === 'efootball'` → `getRelevantSections(message, 18000)` da `lib/ragHelper` (info_rag) |
| **Tabella paletti RAG** | Per domanda su X → cerca sezione Y, paletto Z | Testo fisso (solo se c’è efootballKnowledge) |
| **📱 FUNZIONALITÀ APP** | Elenco 1–9 (Dashboard, Gestione Formazione, Aggiungi Partita, …) | Testo fisso |
| **🎮 CONTESTO VIDEOGIOCO** | Card digitali, statistiche fisse | Testo fisso |
| **🎯 TONO / ESEMPI / VIETATO / FORMATO** | Regole risposta, esempi corretti/sbagliati, formato SUGGERIMENTI | Testo fisso |
| **DOMANDA CLIENTE** | `"${userMessage}"` + lingua | Body |

La **storia** (`history`) non è “dentro” questo prompt: è inviata come messaggi separati prima del prompt utente (`...history.map(...)`), così il modello ha la conversazione precedente (ultimi 10 messaggi, contenuto troncato a 2000 caratteri ciascuno).

---

## 3. Da dove prende i dati (fonti)

### 3.1 Request body (frontend)

| Campo | Uso |
|------|-----|
| `message` | Domanda utente; usata per classify (RAG) e come DOMANDA CLIENTE nel prompt |
| `currentPage` | pageContext (es. "wizard 6 step", "dettaglio partita", "gestione formazione") e FUNZIONALITÀ APP (solo descrittivo) |
| `appState` | stateContext: completingMatch, viewingMatch, managingFormation, viewingDashboard, uploadingPlayer |
| `language` | Lingua risposta (IT/EN) e label in CONTEXT_LABELS |
| `history` | Ultimi 10 messaggi (role + content) inviati a OpenAI prima del prompt utente |

### 3.2 Supabase – contesto “assistente” (sempre)

- **Tabella:** `user_profiles`
- **Campi:** `first_name`, `team_name`, `ai_name`, `how_to_remember`, `common_problems`
- **Funzione:** `buildAssistantContext(userId, currentPage, appState)`
- **Usato in:** blocco 👤 (nome, team, memo, problemi) e in `buildPersonalizedPrompt` per pageContext/stateContext

### 3.3 Supabase – contesto personale “rosa e dati” (on-demand)

Caricato **sempre**: la chat è solo consulenza tattica sul cliente, quindi rosa/partite/allenatore vengono sempre inclusi nel prompt.

- **formation_layout** (user_id): `formation`, `slot_positions` → formazione attuale.
- **players** (user_id): titolari (slot_index 0–10) + riserve; per ognuno: nome, position, overall_rating, playing_style_id, slot_index, photo_slots, base_stats, original_positions, card_type, skills, com_skills; ordinati per slot_index; max 50.
- **playing_styles**: lookup id → nome stile (per ogni giocatore).
- **matches** (user_id): ultime 10; opponent_name, result, formation_played, playing_style_played, match_date.
- **team_tactical_settings** (user_id): team_playing_style, individual_instructions.
- **coaches** (user_id, is_active = true): coach_name, playing_style_competence (per competenze stili >= 70 / < 70).
- **team_tactical_patterns** (user_id): formation_usage, playing_style_usage, recurring_issues.

Il risultato è un unico testo **personalContextSummary** (max 3500 caratteri) con:
- formazione attuale, nota su position/competenze;
- TITOLARI IN CAMPO (slot 0–10) con nome, position, stile, overall, profilazione, competenze;
- Riserve (stesso formato, max 15 + "…altri N");
- ULTIME PARTITE (data, avversario, risultato, formazione, stile);
- Stile squadra e istruzioni individuali (numero attive);
- Allenatore attivo e competenze stili (consigliabili >= 70, non consigliabili < 70);
- Pattern (formation_usage, problemi ricorrenti) se presenti;
- Skills titolari (max 5 per giocatore) se presenti.

Questo testo viene iniettato nel prompt nel blocco **📊 ROSA E DATI**.

### 3.4 RAG eFootball (on-demand)

Caricato **solo se** `classifyQuestion(message) === 'efootball'` (messaggio contiene termini come modulo, stile, Opportunista, istruzioni, abilità, ecc. – vedi `EFOOTBALL_TERMS` in `lib/ragHelper.js`).

- **Fonte:** sezioni RAG in `lib/ragHelper.js` (getSections / contenuti da info_rag o simile).
- **Funzione:** `getRelevantSections(message, 18000)` → seleziona e concatena le sezioni più rilevanti per la domanda (score su titolo vs messaggio normalizzato), fino a ~18k caratteri.
- **Sezioni tipiche:** 1 Statistiche, 2 Stili giocatore, 3 Moduli (+ 3.4 Limiti), 4 Stili tattici, 5 Istruzioni individuali, 8 Abilità, 10 Note critiche, ecc.
- **Usato in:** blocco **📚 MECCANICHE eFootball** e tabella “Cerca in sezione / Paletto” nel prompt.

Se la domanda è classificata **platform** (uso app, wizard, dove trovo, ecc.), il RAG eFootball **non** viene caricato; il modello risponde con il solo redirect a Guida/tour (regole nel system + nel prompt).

---

## 4. Riassunto “dove prende i dati per ragionare”

- **Profilo (nome, team, preferenze):** sempre da `user_profiles` via `buildAssistantContext`.
- **Pagina e stato app:** da body (`currentPage`, `appState`).
- **Rosa, partite, tattica, allenatore, pattern:** da Supabase (formation_layout, players, matches, team_tactical_settings, coaches, team_tactical_patterns), **sempre**.
- **Regole eFootball (stili, moduli, istruzioni, abilità):** da RAG (getRelevantSections) **solo se** `classifyQuestion(message) === 'efootball'`.
- **Storia:** ultimi 10 messaggi dal body, passati come messaggi separati a OpenAI.

Il modello è istruito a:
- usare **solo** il blocco "ROSA E DATI" per nomi/partite/formazione/allenatore;
- usare **solo** il blocco "MECCANICHE eFootball" per regole di gioco;
- non inventare dati; per uso app rimandare a Guida/tour.

File principali:
- **Prompt e flusso:** `app/api/assistant-chat/route.js` (buildAssistantContext, buildPersonalContext, buildPersonalizedPrompt, systemContent, POST).
- **Classificazione e RAG:** `lib/ragHelper.js` (classifyQuestion, getRelevantSections, EFOOTBALL_TERMS).
