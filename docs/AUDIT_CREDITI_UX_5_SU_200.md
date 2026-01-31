# Audit crediti: UX mostra "5 su 200" per attiliomazzett@gmail.com

**Data:** 2026-01-30  
**Scenario:** L’utente attiliomazzett@gmail.com vede in UX **5 crediti usati / 200 inclusi** dopo hard refresh. Audit completo del flusso per verificare correttezza dati e individuare eventuali bug.

---

## 1. Cosa significa "5 su 200"

- **5** = valore di `credits_used` restituito da **GET /api/credits/usage** e mostrato dalla **CreditsBar**.
- **200** = valore di `credits_included` (piano base, da `CREDITS_INCLUDED_DEFAULT` in `lib/creditService.js`).

Quindi la barra mostra esattamente ciò che l’API restituisce. Se l’API restituisce 5/200, l’UX è coerente con il backend.

---

## 2. Flusso end-to-end verificato

### 2.1 Lettura (come arriva il 5)

1. **Frontend** (`components/CreditsBar.jsx`):
   - Ottiene la sessione: `supabase.auth.getSession()` → `session.session.access_token`.
   - Chiama `GET /api/credits/usage` con header `Authorization: Bearer <token>`.
   - Fetch con `cache: 'no-store'`.
   - Legge il JSON: `data.credits_used`, `data.credits_included` (fallback 0 e 200).
   - Mostra: `{used} / {included}` (es. "5 / 200").

2. **API** (`app/api/credits/usage/route.js`):
   - Legge il token con `extractBearerToken(req)`.
   - Valida il token con `validateToken(token, ...)` → ottiene `userData.user.id` (stesso utente della sessione).
   - Crea client Supabase con **service role**.
   - Chiama `getCurrentUsage(admin, userId)`.

3. **Servizio** (`lib/creditService.js` – `getCurrentUsage`):
   - Calcola `period_key` del mese **corrente in UTC** (es. `2026-01`).
   - Query su `user_credit_usage` con `user_id` e `period_key`.
   - Se trova una riga: restituisce `credits_used`, `credits_included`, `period_key`, `overage`.
   - Se **non** trova una riga (es. primo giorno del mese nuovo): fa **fallback** al mese **precedente** (es. `2025-12`) e restituisce quei dati.
   - Se non trova né corrente né precedente: restituisce 0/200 per il periodo corrente.

Quindi il **5** può venire da:
- una riga del **periodo corrente** (es. `2026-01`) con `credits_used = 5`, oppure
- una riga del **periodo precedente** (es. `2025-12`) con `credits_used = 5` (fallback).

La **CreditsBar** mostra anche il periodo (es. "Gennaio 2026" o "Dicembre 2025"): se vedi "Gennaio 2026" con 5, i dati sono del mese corrente; se vedi "Dicembre 2025", stai vedendo il fallback al mese precedente.

### 2.2 Scrittura (come si arriva a 5)

Le route che chiamano OpenAI e poi `recordUsage(admin, userId, credits, operationType)` sono tutte in **await**:

| Route                | Peso | File                          |
|----------------------|------|-------------------------------|
| assistant-chat        | 1    | app/api/assistant-chat/route.js |
| extract-player        | 2    | app/api/extract-player/route.js |
| extract-coach         | 2    | app/api/extract-coach/route.js  |
| extract-match-data    | 2    | app/api/extract-match-data/route.js |
| generate-countermeasures | 3 | app/api/generate-countermeasures/route.js |
| extract-formation     | 3    | app/api/extract-formation/route.js  |
| analyze-match         | 4    | app/api/analyze-match/route.js      |

Esempi di combinazioni che danno **5 crediti**: 5× assistant-chat (1+1+1+1+1), oppure 2+2+1, oppure 1+4, ecc.

---

## 3. Checklist audit (stato attuale)

| Punto | Stato | Note |
|-------|--------|------|
| Auth: token = sessione utente | OK | `validateToken` → `userData.user.id` da JWT; stesso utente della sessione frontend. |
| Period key UTC | OK | `getCurrentPeriodKey()` usa `getUTCFullYear()` e `getUTCMonth()`; stessa chiave ovunque. |
| Fallback mese precedente | OK | Se nessuna riga nel mese corrente, si usa il mese precedente (no 0 a sorpresa). |
| Cache API | OK | `Cache-Control: no-store, no-cache, private, max-age=0` e `Pragma: no-cache` sulla risposta GET. |
| Cache fetch frontend | OK | `fetch(..., { cache: 'no-store' })` in CreditsBar. |
| Route dinamica | OK | `export const dynamic = 'force-dynamic'` in route credits/usage. |
| recordUsage await | OK | Tutte le 7 route fanno `await recordUsage(...)` prima di rispondere. |
| Tipi numerici | OK | API risponde con `Number(usage.credits_used)` e `Number(usage.credits_included)` (vedi sotto). |
| RLS / service role | OK | Lettura usage: API usa service role; RLS permette SELECT solo `auth.uid() = user_id` per anon/authenticated. |

---

## 4. Verifica in Supabase (attiliomazzett@gmail.com)

Per confermare che il 5 corrisponde ai dati reali in DB, in **Supabase SQL Editor** esegui:

```sql
-- Trova user_id e righe user_credit_usage per attiliomazzett@gmail.com
SELECT
  u.id AS user_id,
  u.email,
  c.period_key,
  c.credits_used,
  c.credits_included,
  c.updated_at
FROM auth.users u
LEFT JOIN user_credit_usage c ON c.user_id = u.id
WHERE u.email = 'attiliomazzett@gmail.com'
ORDER BY c.period_key DESC NULLS LAST;
```

- Se vedi una riga con `period_key = '2026-01'` e `credits_used = 5` → l’UX è corretta: il backend legge e restituisce 5.
- Se vedi `credits_used` diverso da 5 (es. 0 o 10) → c’è un bug (es. altro utente, altro periodo, o cache intermedia da indagare).
- Se non vedi righe per il mese corrente ma solo per il mese precedente con 5 → l’API sta usando il fallback; la barra mostrerà 5 con il periodo del mese precedente.

---

## 5. Possibili cause se il numero sembra “sbagliato”

1. **Dati corretti**  
   L’utente ha effettivamente consumato 5 crediti nel periodo mostrato (corrente o precedente). Controllare il **periodo** mostrato nella barra (es. "Gennaio 2026").

2. **Fallback periodo precedente**  
   Oggi è 30 gennaio 2026 (UTC): il periodo corrente è `2026-01`. Se in DB c’è solo una riga per `2025-12` con 5, l’API restituisce quella (fallback) e la barra mostra "Dicembre 2025" con 5. Comportamento voluto.

3. **Cache browser/CDN**  
   Già mitigato con no-store e header no-cache. Se sospetti cache: prova in finestra in incognito o da altro dispositivo.

4. **Sessione / utente**  
   Se per errore l’utente è loggato con un altro account, vedrebbe i crediti di quell’account. Verificare in UI con quale email è loggato.

5. **Timing (race)**  
   Le route fanno `await recordUsage(...)` prima di rispondere, quindi il client riceve la risposta dell’operazione solo dopo che i crediti sono stati scritti. Un eventuale refetch immediato (`credits-consumed`) dovrebbe già vedere il valore aggiornato. Polling 45 s e visibility refetch riducono ulteriormente ritardi.

---

## 6. Miglioramento applicato: tipi numerici in risposta API

Per evitare che eventuali valori stringa da DB (o serializzazione) causino display o calcoli strani, l’API **GET /api/credits/usage** ora forza esplicitamente i numeri nella risposta:

- `credits_used`: `Number(usage.credits_used)` (NaN → 0)
- `credits_included`: `Number(usage.credits_included)` (NaN → 200)

Così la CreditsBar riceve sempre numeri e la barra è calcolata in modo coerente.

---

## 7. Riferimenti

- **Sistema crediti:** `docs/SISTEMA_CREDITI_AI.md`
- **Sicurezza e flusso:** `docs/AUDIT_CREDITI_SICUREZZA_E_FLUSSO.md`
- **Costi e pesi:** `docs/COSTI_API_E_PRICING_CREDITI.md`
