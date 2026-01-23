# Audit flussi, endpoint e coerenza – 24 gen 2026

**Ultimo aggiornamento**: 24 Gennaio 2026  
**Commit di riferimento**: `652e146` (fix audit flussi/endpoint, update-match, dashboard, wizard, analyze-match)  
**Stato**: ✅ Fix applicati e verificati; doc allineata al codice.

---

## Flussi match (nome avversario, CRUD)

### 1. Wizard "Aggiungi partita" (`/match/new`)

| Step | Trigger | Endpoint | Payload | Note |
|------|---------|----------|---------|------|
| Upload foto + Estrazione | `handleImageSelect` → estrai | `POST /api/extract-match-data` | `{ imageDataUrl, section }` | Auth: Bearer. No rate limit. |
| Salva partita | "Salva" nel modal Summary | `POST /api/supabase/save-match` | `{ matchData }` con `opponent_name`, `result`, sezioni, `extracted_data` | Rate limit 20/min. |

- **Opponent name**: campo opzionale nel modal Summary; `opponentName` in state, persistito in `localStorage` (fix applicato).
- **matchData.opponent_name**: `opponentName.trim() || null` inviato a save-match.

### 2. Dashboard (`/`)

| Azione | Trigger | Endpoint | Payload | Note |
|--------|---------|----------|---------|------|
| Carica partite | `useEffect` | Supabase client `matches` | `select(...).eq('user_id')` | RLS. |
| Modifica nome avversario | Click nome → input → Salva | `POST /api/supabase/update-match` | `{ match_id, opponent_name }` | Rate limit 30/min. Errore via `setError` (fix). |
| Elimina partita | Click cestino → confirm | `DELETE /api/supabase/delete-match?match_id=` | - | Rate limit 5/min. |

### 3. Dettaglio partita (`/match/[id]`)

| Azione | Trigger | Endpoint | Payload | Note |
|--------|---------|----------|---------|------|
| Carica match | `useEffect` | Supabase `matches` | `select('*').eq('id', matchId)` | RLS. |
| Upload + Estrai (completa sezione) | Upload immagine → Estrai | `POST /api/extract-match-data` → `POST /api/supabase/update-match` | extract: `{ imageDataUrl, section }`; update: `{ match_id, section, data, result }` | Flusso concatenato. |
| Genera riassunto AI | "Genera riassunto" | `POST /api/analyze-match` → `POST /api/supabase/update-match` | analyze: `{ matchData }` (include `opponent_name`, `client_team_name`, …); update: `{ match_id, section: 'ai_summary', data: { ai_summary } }` | `opponent_name` ora in matchData e in prompt (fix). |

---

## Endpoint match

| Endpoint | Metodo | Auth | Rate limit | Validazione |
|----------|--------|------|------------|-------------|
| `/api/supabase/save-match` | POST | Bearer | 20/min | `matchData` required; `opponent_name` max 255; almeno una sezione. |
| `/api/supabase/update-match` | POST | Bearer | 30/min | **Path opponent_name**: `match_id` required, UUID; `opponent_name` max 255. **Path section**: `match_id`, `section`, `data` required; UUID. |
| `/api/supabase/delete-match` | DELETE | Bearer | 5/min | `match_id` query, UUID. |
| `/api/extract-match-data` | POST | Bearer | **No** | `imageDataUrl`, `section` ∈ VALID_SECTIONS. |
| `/api/analyze-match` | POST | Bearer | 20/min | `matchData` required; almeno una sezione. |

---

## Fix applicati in questa sessione

1. **update-match**
   - `admin` non definito nel path `opponent_name`: creato subito dopo auth, prima del branch.
   - Uso di `req.body.opponent_name`: sostituito con `opponent_name` da body parsato.
   - Rate limit solo sul path section: spostato in cima e applicato a tutti i POST (incluso `opponent_name`).
   - Validazione `match_id`: required per `opponent_name`; formato UUID per entrambi i path.
2. **Dashboard – save opponent name**
   - Messaggi hardcoded: uso di `t('sessionExpired')`, `t('updateMatchError')`.
   - `alert` su errore: sostituito con `setError` + banner esistente.
   - `setError(null)` all’avvio dell’handler; parsing JSON con `.catch(() => ({}))` in caso di body non JSON.
3. **Wizard**
   - `opponentName` non persistito: aggiunto a `saveProgress` (localStorage) e alle dipendenze di `saveProgress`.
4. **Analyze-match**
   - `matchData` senza `opponent_name`: aggiunto in match [id] e in `sanitizedMatchData`.
   - Prompt senza avversario: aggiunto `opponentNameText` in `generateAnalysisPrompt` e inclusione in `sanitizedMatchData` di `opponent_name` e `client_team_name`.

---

## Coerenza

- **Auth**: tutti i fetch verso API usano `Authorization: Bearer ${token}`; le route usano `extractBearerToken` + `validateToken`.
- **i18n**: dashboard e wizard usano `t(...)` per errori e label (opponent name, session, update, delete).
- **Errori API**: ritornano `{ error: string }`; frontend usa `errorData.error || t('...')` e, dove previsto, `setError`.

---

## Note / possibili miglioramenti

- **extract-match-data**: nessun rate limit (chiamate OpenAI). Per coerenza con analyze/save si potrebbe aggiungere (es. 20/min), valutando l’impatto sul wizard.
- **Match [id] – opponent**: UI usa `t('notSpecified')`; dashboard lista usa `t('unknownOpponent')`. Entrambi validi; si può unificare se si preferisce una sola chiave.

---

## Riferimenti

- **`ROLLBACK_PLAN_INPUT_MANUALE.md`** – Procedura rollback input manuale `opponent_name`.
- **`AUDIT_SICUREZZA_INPUT_MANUALE.md`** – Audit sicurezza input nome avversario.
- **`DOCUMENTAZIONE_MASTER_COMPLETA.md`** – Schema DB, API, flussi generali.
- **`README.md`** – Panoramica progetto e link a tutta la documentazione.
