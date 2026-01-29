# Preparazione: allineamento RAG per analyze-match e countermeasures

**Data:** 2026-01-29  
**Obiettivo:** Sostituire la conoscenza da `memoria_attila` (loadAttilaMemory) con il RAG già in uso (info_rag.md + ragHelper). Output, form e Supabase invariati.

---

## 1. Cosa cambia e cosa resta invariato

| Aspetto | Invariato | Cambia |
|--------|-----------|--------|
| **Output** | Struttura JSON, campi, messaggi utente (analyze-match: summary; countermeasures: analysis + countermeasures) | Niente |
| **Form / UI** | Form attuali, chiamate API, parametri in input | Niente |
| **Supabase** | Schema, tabelle, query esistenti (profiles, players, matches, opponent_formations, coaches, team_tactical_settings, team_tactical_patterns) | Niente |
| **Conoscenza nel prompt** | — | Da `loadAttilaMemory(attilaContext)` → `getRelevantSectionsForContext(type, maxChars)` su info_rag.md |

Solo il **blocco di testo** che si inietta nel prompt come “conoscenza eFootball” passa da memoria_attila a info_rag (stesso RAG della chat). Il resto del prompt e la logica di generazione restano uguali.

---

## 2. Supabase – nessun allineamento necessario

- **analyze-match:** legge da `user_profiles`, `players`, `opponent_formations`, `matches`, `team_tactical_settings`, `coaches`, `team_tactical_patterns`. Nessuna modifica allo schema o alle query.
- **generate-countermeasures (countermeasuresHelper):** legge da `opponent_formations`, `players`, `team_tactical_settings`, `coaches`, `matches`, `team_tactical_patterns`. Nessuna modifica.
- **Form:** nessun cambio; le stesse API e gli stessi payload.

Supabase serve solo per i dati utente/partite/formazioni; la modifica riguarda solo la **fonte della conoscenza** (file → RAG).

---

## 3. Fix separato (già identificato)

- **lib/aiKnowledgeHelper.js:** colonna `match_data` inesistente; in Supabase la colonna è `match_date`.  
  Correzione: nella `.select()` usare `match_date` e allineare le righe 248/253 (solo `team_stats`, niente `match_data`).  
  Questo fix è indipendente dal RAG; può essere fatto prima o insieme.

---

## 4. File coinvolti (solo conoscenza)

| File | Modifica |
|------|----------|
| **lib/ragHelper.js** | Aggiungere `getRelevantSectionsForContext(contextType, maxChars)` che, per `contextType === 'analyze-match'` o `'countermeasures'`, restituisce le sezioni info_rag rilevanti per “strategie serie” (es. COMANDI AVANZATI, MECCANICHE DIFENSIVE, CONSIGLI TECNICI, MODULI TATTICI, ecc.) senza dipendere da una query utente. |
| **app/api/analyze-match/route.js** | Sostituire `loadAttilaMemory(attilaContext)` con `getRelevantSectionsForContext('analyze-match', maxChars)`. Stesso header/stringa nel prompt (es. “MEMORIA ATTILA - eFootball” o “KNOWLEDGE eFootball”) e stessa posizione nel template. Output (summary) invariato. |
| **lib/countermeasuresHelper.js** | Sostituire `loadAttilaMemory(attilaContext)` con `getRelevantSectionsForContext('countermeasures', maxChars)`. Stesso blocco nel prompt; output (countermeasures) invariato. |

Non si toccano: form, componenti UI, altre route, schema Supabase.

---

## 5. Rollback (backup creati il 2026-01-29)

In **rollback/** sono stati copiati gli stati attuali prima delle modifiche:

- `analyze-match-route-backup-20260129.js`
- `countermeasuresHelper-backup-20260129.js`
- `aiKnowledgeHelper-backup-20260129.js`
- `ragHelper-backup-20260129.js`

**Per annullare le modifiche (rollback):**

1. Ripristinare i file dalla cartella rollback alle posizioni originali:
   - `rollback/analyze-match-route-backup-20260129.js` → `app/api/analyze-match/route.js`
   - `rollback/countermeasuresHelper-backup-20260129.js` → `lib/countermeasuresHelper.js`
   - `rollback/aiKnowledgeHelper-backup-20260129.js` → `lib/aiKnowledgeHelper.js` (se modificato)
   - `rollback/ragHelper-backup-20260129.js` → `lib/ragHelper.js`
2. Riavviare / rideployare.

Nessun dato Supabase viene toccato dal rollback; solo codice.

---

## 6. Controllo pre-partenza (checklist)

- [x] Output analyze-match e countermeasures resta invariato (solo fonte conoscenza cambia).
- [x] Form e API contract restano quelli attuali.
- [x] Supabase: nessun cambio schema o uso; allineamento non necessario.
- [x] Backup rollback creati in rollback/ con data 20260129.
- [x] Implementazione: aggiunta `getRelevantSectionsForContext` in ragHelper; sostituito loadAttilaMemory in analyze-match e countermeasuresHelper; fix match_date in aiKnowledgeHelper (completato 2026-01-29).

---

## 7. Riepilogo

- **Cosa si fa:** si alimenta il prompt di analyze-match e countermeasures con le sezioni di info_rag (RAG già usato in chat) invece che con memoria_attila.
- **Cosa non si tocca:** output, form, Supabase.
- **Rollback:** copiare i file da rollback/*-backup-20260129.js alle rispettive destinazioni.
