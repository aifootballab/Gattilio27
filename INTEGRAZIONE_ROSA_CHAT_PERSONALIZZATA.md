# Integrazione contesto personale completo in chat – la chat “controlla tutto e dice tutto”

**Data:** 29 Gennaio 2026  
**Obiettivo:** La chat diventa il **punto unico** dove il cliente chiede **tutto**: non solo info generiche e RAG eFootball, ma **tutti i dati personali** (rosa, formazione, partite caricate, impostazioni tattiche, allenatore). La chat “controlla tutto” (ha visibilità sui dati) e “dice tutto” (risponde a qualsiasi domanda personale). Integrazione **incrementale**, nessun breaking change.

---

## 1. Cosa si vuole

- **Oggi:** La chat risponde su (1) uso piattaforma e (2) eFootball (RAG da info_rag). Non ha accesso a rosa, partite, tattica, allenatore → non può rispondere a domande personali (“quali giocatori corretti per la mia rosa?”, “quante partite ho caricato?”, “com’è andata l’ultima?”, “che stile squadra ho?”, “chi è il mio allenatore?”).
- **Dopo:** La chat riceve un **contesto personale completo** (un unico blocco nel prompt) con: **formazione**, **rosa** (con profilazione e competenze), **ultime partite caricate** (risultati, avversari, date), **impostazioni tattiche** (stile squadra, sintesi istruzioni individuali), **allenatore attivo**. Così può rispondere a **qualsiasi** domanda personale sui dati del cliente, senza inventare.

**Regola:** Integrare **solo** in `app/api/assistant-chat/route.js` (e eventualmente `lib/ragHelper.js` per `needsPersonalContext(message)`). Nessuna modifica al frontend, alle altre API o al DB.

---

## 2. Dati necessari (Supabase)

Stesso modello usato da `generate-countermeasures` e gestione formazione. Tutte le query con **`.eq('user_id', userId)`** (userId da token auth).

| Tabella                   | Campi da leggere                                                                                                                                                                                                 | Uso |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----|
| `formation_layout`       | `formation`, `slot_positions`                                                                                                                                                                                     | Formazione + ruoli per slot |
| `players`                | `id`, `player_name`, `position`, `overall_rating`, `playing_style_id`, `slot_index`, `photo_slots`, `base_stats`, `original_positions`                                                                             | Rosa + **profilazione** (vedi 2.1) |
| `playing_styles`         | `id`, `name`                                                                                                                                                                                                      | Lookup nome stile da id |
| **`matches`**            | `id`, `opponent_name`, `result`, `formation_played`, `playing_style_played`, `match_date`                                                                                                                                 | **Partite caricate** – ultime N (es. 10) |
| **`team_tactical_settings`** | `team_playing_style`, `individual_instructions`                                                                                                                                                               | **Impostazioni tattiche** – stile squadra + sintesi istruzioni |
| **`coaches`**            | `coach_name`, `is_active` (e opz. `playing_style_competence` per sintesi)                                                                                                                                          | **Allenatore attivo** |

- **Titolari / Riserve / Stile:** come già descritto (players + playing_styles).
- **Partite caricate:** da `matches` con `.eq('user_id', userId).order('match_date', { ascending: false }).limit(10)` → nel riassunto: "Ultime partite: data, avversario, risultato (es. 3-0), formazione usata". Così la chat può rispondere a "quante partite ho caricato?", "com'è andata l'ultima?", "ultimi risultati?".
- **Impostazioni tattiche:** da `team_tactical_settings` → "Stile squadra: Possesso (o altro); Istruzioni individuali: N istruzioni attive" (sintesi senza elenco completo per risparmiare token). Così la chat può rispondere a "che stile squadra ho?", "istruzioni individuali?".
- **Allenatore:** da `coaches` con `.eq('is_active', true).maybeSingle()` → "Allenatore attivo: Nome". Così la chat può rispondere a "chi è il mio allenatore?".

### 2.1 Profilazione giocatore (come capire “come è profilato”)

In app un giocatore è **profilato** quando ha dati estratti/caricati. La chat deve poter capire **esattamente** quanto è profilato ogni giocatore, così può rispondere a “chi è ben profilato?”, “secondo il profilo (statistiche) chi mi consigli?”, “quali hanno competenza in quella posizione?”.

- **`photo_slots`** (JSONB): traccia quali foto sono state caricate. Stessa logica di gestione-formazione (SlotCard):
  - `card === true` (o `'true'`) = card caricata
  - `statistiche === true` (o `'true'`) = stats caricata
  - `abilita === true` o `booster === true` = skills/booster caricata  
  **Derivato da usare nel riassunto:** conteggio 0–3 → testo **"profilazione: completa (3/3)"** | **"parziale (2/3)"** | **"incompleta (0-1/3)"** per ogni giocatore. Così l’AI sa chi ha tutti i dati e chi no.

- **`base_stats`** (JSONB): statistiche base (es. finalizzazione, difesa, velocità, passaggio, ecc.). Per non esplodere i token, nel riassunto includere **solo 3–5 stat chiave** in forma compatta (es. "fin 85 dif 82 vel 80") oppure solo un flag "statistiche: sì/no" se base_stats è valorizzato. Così l’AI può ragionare su “secondo le sue statistiche…”.

- **`original_positions`** (JSONB): array di `{ position, competence }` (es. `[{ position: "DC", competence: "Alta" }, { position: "MED", competence: "Intermedia" }]`). Nel riassunto: stringa compatta tipo **"competenze: DC Alta, MED Intermedia"** (o "non impostate" se vuoto). Così l’AI sa quali posizioni il giocatore può coprire e con quale competenza.

**Risultato:** Con questi campi nel riassunto rosa, l’AI può capire **esattamente** come è profilato ogni giocatore (completo/parziale/incompleto, statistiche presenti, competenze posizione) e rispondere in modo personalizzato senza inventare.

Nessuna nuova tabella, nessuna migrazione. Solo lettura con `user_id` come già fatto altrove.

---

## 3. Dove integrare (solo backend)

**File unico da modificare per la logica:** `app/api/assistant-chat/route.js`.

**Eventuale helper (opzionale):** `lib/ragHelper.js` – una funzione `needsRosterContext(message)` che restituisce `true` se il messaggio suggerisce domanda su rosa/giocatori/sinergia (per caricare la rosa solo quando serve).

---

## 4. Passi operativi (precisi)

### 4.1 Nuova funzione: `buildRosterContext(userId)`

**Posizione:** In `route.js`, dopo `buildAssistantContext`, prima di `buildPersonalizedPrompt`.

**Firma:**
```js
/**
 * Costruisce riassunto rosa cliente (titolari + riserve) per domande personalizzate.
 * Non blocca: in caso di errore restituisce ''.
 * @param {string} userId - user_id da token
 * @returns {Promise<string>} Testo compatto (max MAX_ROSTER_SUMMARY_CHARS) o ''
 */
async function buildRosterContext(userId) { ... }
```

**Logica (in ordine):**

1. Leggere `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Se mancano, `return ''`.
2. Creare client admin: `createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })`.
3. **Formation layout:**  
   `admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle()`  
   Se errore o null, usare formation = '' e slot_positions = {}.
4. **Players:**  
   `admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, slot_index, photo_slots, base_stats, original_positions').eq('user_id', userId).order('slot_index', { ascending: true, nullsFirst: false }).limit(50)`  
   Se errore, `return ''`. Lista `roster = data || []`.
5. **Playing styles:**  
   `admin.from('playing_styles').select('id, name')`  
   Costruire `stylesLookup = { [id]: name }`.
6. **Helper profilazione (stesso criterio di gestione-formazione):**  
   Per ogni `p`, da `photo_slots`: `hasCard = p.photo_slots?.card === true || p.photo_slots?.card === 'true'`, idem `hasStats` (statistiche), `hasSkills` (abilita o booster). Conteggio `count = [hasCard, hasStats, hasSkills].filter(Boolean).length`. Testo: `profilazione: ${count === 3 ? 'completa (3/3)' : count === 2 ? 'parziale (2/3)' : 'incompleta (0-1/3)'}`.
7. **Helper competenze:** da `original_positions` (array) costruire stringa `"DC Alta, MED Intermedia"` o `"non impostate"` se vuoto.
8. **Helper stats (opzionale):** da `base_stats` estrarre al massimo 3–5 chiavi (es. finalizzazione, difesa, velocità) in forma compatta; se assente, "stats: no".
9. Titolari: `roster.filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10).sort((a,b) => (a.slot_index||0) - (b.slot_index||0))`.
10. Riserve: `roster.filter(p => p.slot_index == null)`.
11. Costruire stringa:
   - Riga formazione: `Formazione: ${formation || 'non impostata'}.`
   - Titolari: per ogni `p`: `Nome (posizione, stile, rating, profilazione: completa/parziale/incompleta, competenze: ... o non impostate)`; opzionale aggiungere stats compatte. Stessa logica per Riserve.
   - Esempio riga: `Rossi (MED, Collante, 85, profilazione: completa (3/3), competenze: MED Alta, CC Intermedia).`
12. Troncare a **MAX_ROSTER_SUMMARY_CHARS** (es. 2500–3000 per spazio profilazione). Se troncato, aggiungere "... (elenco troncato)".
13. `return` stringa. In qualsiasi `catch` loggare `[assistant-chat] buildRosterContext error:`, poi `return ''`.

**Costante:**  
`const MAX_ROSTER_SUMMARY_CHARS = 2800` (in cima al file, vicino a MAX_HISTORY_*; 2800 per includere profilazione e competenze senza esplodere token).

---

### 4.2 Quando chiamare `buildRosterContext`

**Opzione A – Sempre (semplice):**  
Dopo aver costruito `context` (buildAssistantContext), chiamare `rosterSummary = await buildRosterContext(userId)` e passare `rosterSummary` a `buildPersonalizedPrompt`. Pro: ogni domanda può usare la rosa. Contro: una query in più e più token a ogni messaggio.

**Opzione B – Solo se pertinente (consigliata):**  
Chiamare `buildRosterContext` solo se `needsRosterContext(message)` è true. Definire in `lib/ragHelper.js`:

```js
/**
 * Restituisce true se il messaggio suggerisce domanda su rosa/giocatori/sinergia/stili per la mia rosa.
 * @param {string} message
 * @returns {boolean}
 */
export function needsRosterContext(message) {
  const m = (message || '').toLowerCase().trim()
  const terms = [
    'rosa', 'roster', 'i miei giocatori', 'la mia rosa', 'i miei titolari', 'le mie riserve',
    'sinergia', 'sinergie', 'giocatori corretti', 'secondo gli stili', 'per la mia rosa',
    'chi ho', 'quali giocatori', 'consigliami i giocatori', 'formazione mia', 'la mia formazione'
  ]
  return terms.some(t => m.includes(t))
}
```

In `route.js`:  
`const rosterSummary = needsRosterContext(message) ? await buildRosterContext(userId) : ''`

**Regola:** Se `buildRosterContext` fallisce o restituisce `''`, il flusso continua **come oggi** (nessun blocco rosa nel prompt). Non lanciare errori verso il cliente.

---

### 4.3 Modifica a `buildPersonalizedPrompt`

**Firma attuale:**  
`function buildPersonalizedPrompt(userMessage, context, language = 'it', efootballKnowledge = '')`

**Nuova firma:**  
`function buildPersonalizedPrompt(userMessage, context, language = 'it', efootballKnowledge = '', rosterSummary = '')`

**Dove iniettare:** Dopo il blocco "CONTESTO CLIENTE" (dopo `${stateContext ? ...}`), **prima** di "FUNZIONALITÀ DISPONIBILI".

**Testo da aggiungere (solo se `rosterSummary` non vuoto):**

```
${rosterSummary ? `
📋 ROSA CLIENTE (usa SOLO per domande su "i miei giocatori", "la mia rosa", "sinergia", "giocatori corretti secondo stili per la mia rosa" - NON inventare nomi):
---
${rosterSummary}
---
- Per domande personali su rosa/giocatori/sinergia: rispondi basandoti SOLO sui dati sopra. Non inventare nomi o rating non presenti.
- Se il cliente chiede consigli per la sua rosa, incrocia questi dati con il knowledge eFootball (stili adatti ai ruoli) e rispondi con i nomi reali della rosa.` : ''}
```

**Regola:** Se `rosterSummary === ''`, non aggiungere nulla (comportamento identico a oggi).

---

### 4.4 Modifica alla chiamata di `buildPersonalizedPrompt`

**Oggi:**  
`prompt = buildPersonalizedPrompt(message, context, lang, efootballKnowledge)`

**Dopo:**  
`prompt = buildPersonalizedPrompt(message, context, lang, efootballKnowledge, rosterSummary)`

dove `rosterSummary` è definito come in 4.2 (A o B).

---

### 4.5 System prompt (regola rosa)

Nel `systemContent` in `route.js`, **dopo** le regole eFootball, aggiungere:

```
- Rosa: Se nel prompt è presente un blocco "ROSA CLIENTE", usa SOLO quel blocco (e il knowledge eFootball se presente) per rispondere a domande su "i miei giocatori", "la mia rosa", "sinergia", "giocatori corretti secondo stili per la mia rosa", "come sono profilati", "chi è ben profilato". Non inventare nomi; usa solo i dati elencati nella rosa. Il blocco include per ogni giocatore: nome, posizione, stile, rating, **profilazione** (completa/parziale/incompleta da photo_slots) e **competenze posizione** (original_positions), così puoi rispondere con precisione su “come è profilato” ogni giocatore.
```

Così il modello sa quando usare il blocco rosa e che non deve inventare.

---

## 5. Sicurezza e privacy

- **user_id:** Sempre da token validato (come oggi). Nessun `userId` da body.
- **Query:** Tutte con `.eq('user_id', userId)`. Nessun dato di altri utenti.
- **Output:** Il riassunto rosa va solo nel prompt verso OpenAI; non viene restituito nella risposta JSON al client (la risposta è solo il testo dell’assistente).
- **Limite:** `MAX_ROSTER_SUMMARY_CHARS` evita prompt eccessivamente lunghi; `.limit(50)` su players evita carichi inutili.

Nessun nuovo endpoint, nessun dato rosa esposto all’esterno oltre al suo uso nel prompt.

---

## 6. Cosa non toccare (zero breaking change)

- **Frontend:** `components/AssistantChat.jsx` – nessuna modifica. Non inviare rosa dal client; tutto lato server.
- **Altre API:** Nessun cambiamento a `save-player`, `assign-player`, `generate-countermeasures`, ecc.
- **DB:** Nessuna migrazione, nessuna nuova tabella.
- **buildAssistantContext:** Resta uguale (solo profilo, currentPage, appState). La rosa è un blocco aggiuntivo, non sostituisce il contesto esistente.
- **RAG eFootball:** Invariato. Se la domanda è eFootball, si carica come oggi `getRelevantSections`; il blocco rosa si aggiunge quando `rosterSummary` non è vuoto.
- **Storia conversazione:** Invariata. `normalizeHistory`, `openAIMessages`, rate limit, auth: nessun cambiamento.

Se `buildRosterContext` fallisce o `needsRosterContext` è false, il flusso è **identico** a oggi (stesso prompt senza rosa, stessa risposta generica).

---

## 7. Ordine di implementazione suggerito

1. Aggiungere `MAX_ROSTER_SUMMARY_CHARS` e `buildRosterContext(userId)` in `route.js`.
2. Aggiungere `needsRosterContext(message)` in `lib/ragHelper.js` (e import in `route.js`) se si sceglie Opzione B.
3. In POST, dopo `context = await buildAssistantContext(...)`, calcolare `rosterSummary` (Opzione A o B).
4. Aggiungere parametro `rosterSummary` a `buildPersonalizedPrompt` e il blocco "ROSA CLIENTE" nel template (solo se `rosterSummary` non vuoto).
5. Aggiornare la chiamata `buildPersonalizedPrompt(..., rosterSummary)`.
6. Aggiungere la riga su "Rosa" nel `systemContent`.
7. Test: (a) domanda generica senza rosa → risposta come oggi; (b) domanda "quali giocatori corretti secondo gli stili per la mia rosa?" con rosa popolata → risposta con nomi reali e stili.

---

## 8. Riepilogo

| Elemento            | Dove              | Azione                                                    |
|---------------------|-------------------|-----------------------------------------------------------|
| buildRosterContext  | route.js          | Nuova funzione async; query formation_layout + players + playing_styles; ritorna stringa compatta (max 2000 char) o '' |
| needsRosterContext  | lib/ragHelper.js  | Nuova funzione (se Opzione B); ritorna boolean           |
| rosterSummary       | route.js POST     | Calcolato dopo context; passato a buildPersonalizedPrompt |
| buildPersonalizedPrompt | route.js      | Nuovo parametro `rosterSummary`; blocco "ROSA CLIENTE" se non vuoto |
| systemContent       | route.js          | Aggiunta regola "Rosa: usa SOLO blocco ROSA CLIENTE..."  |

**Risultato:** Il cliente può chiedere sia info generiche (e RAG eFootball) sia domande personali sulla propria rosa; la risposta usa i dati reali (nomi, posizioni, stili) senza inventare. Nessun breaking change su frontend, altre API o DB.
