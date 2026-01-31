# Audit enterprise crediti – Perché si vede solo 5 (e non 0 o il valore reale)

**Data:** 2026-01-30  
**Problema:** L’utente vede **sempre 5 su 200**; non 0, non il valore reale (es. 18). Audit riga-per-riga per individuare l’unica fonte possibile del 5 e fix applicati.

---

## 1. Dove può nascere il valore "5"

Il numero mostrato in barra è **sempre** `data.credits_used` restituito da **GET/POST /api/credits/usage** e usato in CreditsBar come `used`. Non esiste in codice nessun 5 hardcoded per i crediti (né in CreditsBar, né in creditService, né nella route).

Quindi il 5 può arrivare **solo** da:

1. **Risposta dell’API**  
   L’API restituisce `credits_used: 5` perché:
   - **A)** In Supabase c’è una riga con `credits_used = 5` per l’`user_id` usato (periodo corrente **o** mese precedente se usiamo il fallback), oppure  
   - **B)** La risposta è **in cache** (browser/CDN/proxy) e arriva sempre la stessa risposta storica con 5.

2. **Frontend**  
   CreditsBar fa `setData(payload)` con il payload dell’API; non ci sono default 5 né logiche che forzano 5. Se l’API restituisse 18, la barra mostrerebbe 18.

Conclusione: **o l’API restituisce 5 (A o B), o c’è cache sulla risposta.** Non ci sono altre fonti del 5 nel flusso crediti.

---

## 2. Flusso riga-per-riga (sintesi)

### 2.1 CreditsBar (components/CreditsBar.jsx)

- **Riga 29:** `getSession()` → token della sessione corrente.
- **Riga 35–41:** `fetch('/api/credits/usage', { method: 'POST', ... })` → **POST** (non GET) per evitare cache HTTP su GET.
- **Riga 43:** `safeJsonResponse(res, ...)` → `payload` = corpo JSON della risposta.
- **Riga 44:** `setData(payload)` → stato = quello che ha restituito l’API.
- **Riga 137–138:** `used = Number(data?.credits_used) ?? 0`, `included = Number(data?.credits_included) ?? 200` → il valore mostrato è quello dell’API; nessun 5 fissato in frontend.

### 2.2 API /api/credits/usage (app/api/credits/usage/route.js)

- **handleCreditsUsage:** legge Bearer token → `validateToken(token, ...)` → `userId = userData.user.id`.
- Chiama `getCurrentUsage(admin, userId, { currentPeriodOnly: true })` → **solo periodo corrente** (YYYY-MM UTC), niente fallback al mese precedente.
- Legge da Supabase `user_credit_usage` con `user_id` e `period_key` = mese corrente.
- Se c’è riga → restituisce `credits_used` / `credits_included` di quella riga.
- Se **non** c’è riga → restituisce `credits_used: 0`, `credits_included: 200` (nessun “5” dal mese prima).

Quindi: **il 5 non può più arrivare dal mese precedente**; può arrivare solo da una riga del **mese corrente** con 5 o da **cache** (risposta vecchia).

### 2.3 creditService.getCurrentUsage (lib/creditService.js)

- Con `currentPeriodOnly: true` viene fatto **solo** il select per `period_key` corrente; se non c’è riga si ritorna il fallback `credits_used: 0`.
- Il fallback al mese precedente viene eseguito **solo** se `currentPeriodOnly !== true`; per l’API crediti ora non viene più usato.

Quindi: nessun “5” può essere introdotto da logica di fallback quando si usa `currentPeriodOnly: true`.

### 2.4 validateToken / auth (lib/authHelper.js)

- `getUser(token)` restituisce l’utente del JWT. L’`user_id` usato per la query è quello del token inviato dal client (sessione corrente). Se il client è loggato come utente X, l’API legge i crediti di X.

---

## 3. Cause possibili del “5 fisso” (prima dei fix)

1. **Cache su GET**  
   Una risposta GET con `credits_used: 5` poteva essere cachata (browser/CDN). Richieste successive potevano ricevere sempre quella risposta.

2. **Fallback al mese precedente**  
   Per il mese corrente (es. 2026-01) non c’era riga; esisteva solo una riga per il mese prima (es. 2025-12) con `credits_used = 5`. Con il vecchio comportamento l’API restituiva quel 5 (fallback), e la barra mostrava “5 su 200” per dicembre invece del mese corrente.

3. **Token di un altro utente**  
   Se il token inviato era di un utente che in DB ha 5 (nel mese corrente o, prima dei fix, nel mese precedente), l’API restituiva 5. In quel caso il “5” è corretto per quell’utente, ma non per l’account che l’utente pensa di usare (es. attiliomazzetti@gmail.it).

---

## 4. Fix applicati

1. **POST invece di GET per la barra**  
   CreditsBar chiama **POST /api/credits/usage** (stessa logica di GET, auth Bearer). Le risposte POST non sono cachate come le GET; si elimina la possibilità che una risposta storica con 5 venga riusata.

2. **Solo periodo corrente (currentPeriodOnly: true)**  
   L’API ora chiama `getCurrentUsage(admin, userId, { currentPeriodOnly: true })`.  
   - Si legge **solo** la riga del mese corrente (UTC).  
   - Se non c’è riga → si restituisce **0** (non il valore del mese precedente).  
   Così il “5” non può più arrivare dal mese precedente; la barra mostra solo il mese corrente (valore reale o 0).

3. **Handler unico GET + POST**  
   La logica di lettura crediti è in `handleCreditsUsage(req)`; GET e POST la riusano. Stessi header no-cache; nessuna duplicazione di logica.

---

## 5. Comportamento atteso dopo i fix

- **attiliomazzetti@gmail.it** con riga 2026-01 e `credits_used = 18` → API restituisce 18 → barra **18 su 200**.
- Utente senza riga per 2026-01 → API restituisce 0 → barra **0 su 200** (non più 5 dal mese prima).
- Nessuna risposta GET cachata per la barra → ogni richiesta è POST e legge da DB con periodo corrente.

Se dopo deploy e hard refresh l’utente vede ancora 5, allora o:
- il token è di un utente che nel **mese corrente** ha proprio 5 in `user_credit_usage`, oppure  
- c’è ancora cache (es. altro client/proxy); in quel caso finestra in incognito / altro dispositivo per verificare.

Riferimenti: `docs/SISTEMA_CREDITI_AI.md`, `docs/CHECK_COERENZA_CREDITI_END_TO_END.md`.
