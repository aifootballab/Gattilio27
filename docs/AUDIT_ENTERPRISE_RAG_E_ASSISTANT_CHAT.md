# Audit Enterprise: RAG, trigger contesto personale e assistant-chat

**Data**: 2026-01-30  
**Scope**: Flusso completo IA (RAG info_rag, trigger personal context, route assistant-chat, Supabase).  
**Obiettivo**: Capire perché l’IA non riconosce i giocatori, sbaglia (es. “cerca giocatori con passaggio filtrante”), non usa le partite per “difficoltà”, e non guida il cliente; allineare RAG e prompt.

---

## 1. Architettura attuale

### 1.1 Flusso assistant-chat (route)

1. Auth (Bearer) → rate limit  
2. Parse body: `message`, `currentPage`, `appState`, `language`, `history`  
3. **classifyQuestion(message)** → `'efootball'` | `'platform'`  
   - Se **efootball** → `getRelevantSections(message, 18000)` da **info_rag.md** → `efootballKnowledge`  
   - Se **platform** → nessun RAG eFootball  
4. **needsPersonalContext(message)** → true | false  
   - Se **true** → `buildPersonalContext(userId)` da Supabase (formation, players, matches, tactical, coach) → `personalContextSummary`  
   - Se **false** → nessun blocco rosa/partite  
5. `buildPersonalizedPrompt(message, context, lang, efootballKnowledge, personalContextSummary, hasHistory)`  
6. System + history + prompt → OpenAI → `response`  
7. Ritorno: `{ response, remaining, resetAt }`

### 1.2 RAG (info_rag.md + ragHelper)

- **File**: `info_rag.md` in project root. Sezioni con `## TITOLO`.  
- **SECTION_KEYWORDS**: ogni sezione ha keyword per lo scoring (es. "1. STATISTICHE GIOCATORI" → "passaggio rasoterra", "passaggio alto"; "8. ABILITÀ GIOCATORI" → "passaggio filtrante", "lancio lungo preciso", ecc.).  
- **getRelevantSections(message, maxChars)**: normalizza messaggio, score per sezione, ordina per score, prende sezioni fino a maxChars. Se nessuna keyword match → fallback prime 4 sezioni.  
- **classifyQuestion(message)**: se in messaggio c’è un termine in **EFOOTBALL_TERMS** → `'efootball'`; altrimenti se c’è termine in **platformTerms** → `'platform'`; **default `'efootball'`**.  
- **needsPersonalContext(message)**: true se il messaggio contiene almeno un termine in **PERSONAL_CONTEXT_TERMS**.

---

## 2. Problemi individuati

### 2.1 “Qual è la mia difficoltà nelle partite” → “Non ho dati, carica partite”

- **Causa**: **PERSONAL_CONTEXT_TERMS** non contiene “difficoltà”, “mia difficoltà”, “nelle partite”, “andamento partite”, “punti deboli”, “dove sbaglio”.  
- Contiene: “partite caricate”, “ultime partite”, “risultati”, “perdo sempre”, “non vinco”, “difficoltà a segnare”, “difesa debole”, “prendo goal”, ecc.  
- La frase “qual è la mia difficoltà nelle partite” non fa match (es. “nelle partite” ≠ “partite caricate”). Quindi **needsPersonalContext** = false → **buildPersonalContext** non viene chiamato → l’IA non riceve il blocco partite e risponde “carica partite”.  
- **Fix**: estendere PERSONAL_CONTEXT_TERMS con: `difficoltà`, `mia difficoltà`, `difficoltà nelle partite`, `nelle partite`, `andamento partite`, `punti deboli`, `dove sbaglio`, `problemi nelle partite`, `analisi partite`, `come sono andate`, (EN) `my difficulty`, `match analysis`, `where do i struggle`.

### 2.2 “Ho partite caricate” → “Vedo che hai partite, ottimo” (passiva)

- **Causa**: Alla seconda frase può scattare un trigger (es. “partite”) o il contesto arriva in history; l’IA però non ha istruzioni forti per **usare** le partite per rispondere alla domanda originale (“difficoltà”) e **guidare** con analisi + 3 alternative.  
- **Fix**:  
  - Trigger (sopra) così alla prima domanda arriva già il blocco partite.  
  - Prompt: se il cliente chiede difficoltà/andamento/risultati, **analizza** il blocco ULTIME PARTITE (risultati, formazione usata, stile) e rispondi con 1–3 punti concreti + “In sintesi: …” + **3 alternative cliccabili** (es. “Analizza una partita”, “Consigli formazione”, “Chi sostituire”).

### 2.3 “Cerca giocatori con statistiche passaggio filtrante”

- **Causa**: Nel RAG, “passaggio filtrante” è un’**abilità** (sezione 8. ABILITÀ GIOCATORI), non una **statistica** (sezione 1: “passaggio rasoterra”, “passaggio alto”). L’IA può confondere e suggerire di “cercare/filtrare per passaggio filtrante”. L’app **non** ha funzionalità di ricerca/filtro per statistica o abilità; la rosa è quella nel CONTESTO PERSONALE.  
- **Fix**:  
  - **Prompt**: regola esplicita: “NON suggerire MAI di cercare, filtrare o selezionare giocatori per statistica o abilità (es. ‘passaggio filtrante’, ‘passaggio rasoterra’). L’app non ha quella funzionalità. Usa SOLO i giocatori elencati nel blocco CONTESTO PERSONALE (titolari + riserve); se il cliente chiede chi ha una certa abilità, citane qualcuno dalla lista se presente, altrimenti dì che non hai quel dettaglio.”  
  - **info_rag / NOTE CRITICHE**: chiarire che “passaggio filtrante” = abilità (through ball), “passaggio rasoterra” = statistica; l’app non permette filtri per stat/abilità.

### 2.4 Non riconosce “i miei giocatori”

- **Causa possibile 1**: PERSONAL_CONTEXT_TERMS ha “i miei giocatori” → dovrebbe fare trigger. Verificare che non ci siano bug (normalizzazione NFD, accenti).  
- **Causa possibile 2**: Contesto caricato ma **troncato** (MAX_PERSONAL_CONTEXT_CHARS = 3500) e i nomi finiscono tagliati.  
- **Causa possibile 3**: L’IA ignora il blocco o risponde in modo generico.  
- **Fix**:  
  - Mantenere “i miei giocatori”, “rosa”, “squadra”, “mia squadra” nei trigger.  
  - Prompt: “Se il cliente chiede dei suoi giocatori o della rosa, cita SEMPRE i nomi dal blocco CONTESTO PERSONALE (titolari e riserve). Non dire mai ‘non vedo i tuoi giocatori’ se il blocco è presente.”  
  - (Opzionale) priorità titolari + prime riserve nel blocco per evitare troncamento nomi.

### 2.5 RAG: tante cose ma scoring e classificazione

- **getRelevantSections**: se il messaggio è vago, molte sezioni hanno score 0 → fallback “prime 4 sezioni” → contenuto generico.  
- **classifyQuestion**: default `'efootball'` se nessun termine match. Domande ibride (es. “i miei giocatori con passaggio filtrante”) → efootball → RAG caricato; **needsPersonalContext** deve essere true per “i miei giocatori” → contesto personale caricato. Coerenza: ok se entrambi i trigger sono soddisfatti.  
- **Rischio**: messaggi brevi (“consigli?”) → efootball per default → RAG caricato, personal context no (nessun termine personale) → l’IA risponde solo da RAG senza rosa.  
- **Fix**: considerare per “consigli?” / “cosa mi consigli” l’inclusione in PERSONAL_CONTEXT_TERMS (già presente “cosa mi consigli”, “consigli sulla”) così si carica anche la rosa.

### 2.6 Tre alternative cliccabili

- Oggi la route restituisce solo `{ response, remaining, resetAt }`.  
- Per avere 3 alternative cliccabili servono:  
  - **Opzione A**: il prompt chiede all’IA di aggiungere in coda al testo 3 righe tipo “1. … 2. … 3. …” e il client le interpreta come pulsanti (parsing semplice).  
  - **Opzione B**: il prompt chiede all’IA di restituire un blocco strutturato (es. JSON) con `response` + `suggestions: [string, string, string]`; la route fa parse e ritorna `{ response, suggestions, remaining, resetAt }`; il client mostra i 3 pulsanti.  
- **Fix**: definire formato (testo fisso vs JSON) e aggiungere al prompt: “Alla fine della risposta, proponi sempre 3 alternative cliccabili per continuare (es. ‘Analizza una partita’, ‘Chi mettere in panchina’, ‘Consigli formazione’). Formato: …”.

---

## 3. Supabase e buildPersonalContext

- **Formation**: `formation_layout` (formation, slot_positions).  
- **Players**: `players` (id, player_name, position, overall_rating, playing_style_id, slot_index, photo_slots, base_stats, original_positions), ordinati per slot_index, limit 50.  
- **Matches**: `matches` (opponent_name, result, formation_played, playing_style_played, match_date), ultime 10.  
- **Tactical**: `team_tactical_settings` (team_playing_style, individual_instructions).  
- **Coach**: `coaches` (coach_name, playing_style_competence), is_active = true.  
- **Limite**: summary troncato a MAX_PERSONAL_CONTEXT_CHARS (3500).  
- **Verifica**: nessun bug evidente nelle query; i dati ci sono. Il problema è **quando** si caricano (trigger) e **come** l’IA li usa (prompt).

---

## 4. Route e trigger (checklist)

| Punto | Stato | Note |
|-------|--------|------|
| Auth + rate limit | OK | Coerente con resto API |
| classifyQuestion → efootball | OK | Default efootball; EFOOTBALL_TERMS ampio |
| getRelevantSections(message, 18000) | OK | Score + fallback; verificare keyword per “passaggio filtrante” (abilità, non filtro app) |
| needsPersonalContext(message) | **Gap** | Manca “difficoltà”, “mia difficoltà”, “nelle partite”, “andamento partite”, “punti deboli” |
| buildPersonalContext(userId) | OK | Dati Supabase corretti; troncamento 3500 |
| buildPersonalizedPrompt(…, efootballKnowledge, personalContextSummary) | **Gap** | Regole: (1) non suggerire “cerca/filtra per stat/abilità”; (2) usare partite per “difficoltà”; (3) guidare + 3 alternative |
| Ritorno JSON | **Gap** | Manca campo `suggestions` per 3 alternative cliccabili |

---

## 5. Riepilogo fix consigliati

1. **ragHelper.js – PERSONAL_CONTEXT_TERMS**: aggiungere termini per difficoltà/andamento partite (vedi §2.1).  
2. **assistant-chat route (prompt)**:  
   - Regola: non suggerire mai “cerca/filtra giocatori per statistica o abilità”; usare solo rosa dal CONTESTO PERSONALE.  
   - Se il cliente chiede difficoltà/andamento/risultati partite: analizzare il blocco ULTIME PARTITE e rispondere con analisi + “In sintesi” + 3 alternative.  
   - Sempre citare i nomi dei giocatori dal blocco quando si parla di rosa/squadra.  
3. **Tre alternative cliccabili**: definire formato (testo in coda o JSON), aggiungere istruzione al prompt e, se JSON, parsing in route + campo `suggestions` nella risposta.  
4. **info_rag / NOTE CRITICHE per l’IA**: una riga che distingue “passaggio filtrante” (abilità) da “passaggio rasoterra” (statistica) e che l’app non ha filtri per stat/abilità.

---

## 6. File coinvolti

- `lib/ragHelper.js`: PERSONAL_CONTEXT_TERMS, (opzionale) SECTION_KEYWORDS / NOTE CRITICHE.  
- `app/api/assistant-chat/route.js`: buildPersonalizedPrompt (regole), eventuale parsing suggestions e ritorno `suggestions`.  
- `info_rag.md`: sezione “10. NOTE CRITICHE PER L'IA” (chiarimento passaggio filtrante vs rasoterra, no filtri app).  
- Client chat: gestione `suggestions` e rendering 3 pulsanti (se si aggiunge il campo).

---

## 7. Verifica terminologia ufficiale (memoria Attila) e divisione RAG – 2026-01-30

**Riferimento**: `memoria_attila_definitiva_unificata.txt`, `DOCUMENTO_PERFETTO_TERMINOLOGIA_EFOOTBALL.md`, `info_rag.md`.

### 7.1 Allineamento memoria Attila vs info_rag

- **Statistiche (memoria §1)**: Passaggio rasoterra, Passaggio alto = statistiche. info_rag §1 e SECTION_KEYWORDS §1 corretti (no "passaggio filtrante" in statistiche).
- **Abilità (memoria §7.3, §8.1)**: Passaggio filtrante, Passaggio di prima = abilità. info_rag §8 e SECTION_KEYWORDS §8 hanno "passaggio filtrante" in ABILITÀ.
- **Competenze e Sviluppo (memoria §4)**: Trending, In evidenza, In risalto, Epico, Leggendario, Standard = tipologie giocatori. info_rag §9.

### 7.2 Errore divisione RAG (corretto)

- **Problema**: "trending" era in SECTION_KEYWORDS sia in §8 ABILITÀ sia in §9 COMPETENZE. In memoria Attila "Trending" è solo tipologia giocatore (Competenze e Sviluppo), non un'abilità.
- **Rischio**: Domande tipo "giocatori trending" potevano far caricare la sezione ABILITÀ invece di COMPETENZE E SVILUPPO.
- **Fix applicato**: Rimosso "trending" dalle keyword di §8 ABILITÀ in `lib/ragHelper.js`. Resta solo in §9.

### 7.3 NOTE CRITICHE e terminologia (fix applicati)

- Aggiunto in info_rag.md §10 NOTE CRITICHE: punto 7 STATISTICHE vs ABILITÀ (passaggio rasoterra/alto = statistiche; passaggio filtrante = abilità; NON suggerire "cerca/filtra"; usare solo rosa CONTESTO PERSONALE); esempio per "Cerca giocatori con passaggio filtrante".
- Aggiunte in ragHelper.js keyword per §10: "statistiche vs abilità", "passaggio filtrante", "passaggio rasoterra", "cerca giocatori", "filtra per" – così NOTE CRITICHE viene caricata quando l'utente chiede di cercare/filtrare o nomina passaggio filtrante/rasoterra.

Fine audit.
