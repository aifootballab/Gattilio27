# Check coerenza crediti end-to-end

**Data:** 2026-01-30  
**Problema:** attiliomazzetti@gmail.it vede 5 su 200 in UX; in Supabase lo stesso utente ha **18** crediti usati (period_key 2026-01).

---

## 1. Verifica Supabase (MCP)

Query eseguita:

```sql
SELECT u.id, u.email, c.period_key, c.credits_used, c.credits_included, c.updated_at
FROM auth.users u
LEFT JOIN user_credit_usage c ON c.user_id = u.id
WHERE u.email = 'attiliomazzetti@gmail.it';
```

Risultato: **credits_used = 18**, period_key = 2026-01. Quindi il DB è corretto; il valore 5 in UX non viene da Supabase.

---

## 2. Causa individuata: cache HTTP

- **Backend:** GET e POST /api/credits/usage usano `userId` da token (validateToken) e leggono da `user_credit_usage` con `getCurrentUsage(admin, userId, { currentPeriodOnly: true })`. Nessun cache lato server nel codice.
- **Risposta:** Se la richiesta fosse sempre “fresca”, l’API restituirebbe 18 per attiliomazzetti@gmail.it.
- **Conclusione:** Il valore 5 è quasi certamente una **risposta in cache** (browser, CDN o altro) da un momento in cui l’utente aveva 5 crediti.

---

## 3. Fix applicati

1. **CreditsBar – POST invece di GET**  
   La fetch verso /api/credits/usage ora usa **POST** (body `{}`), così le risposte non vengono cachate (le GET sono cachabili, le POST no). Nessun riuso di risposta in cache.

2. **API credits/usage – solo periodo corrente**  
   L’API chiama `getCurrentUsage(admin, userId, { currentPeriodOnly: true })`: legge **solo** il mese corrente (UTC); se nessuna riga restituisce 0 (nessun fallback al mese precedente). La barra non mostra più valori “vecchi” (es. 5 del mese prima).

3. **API credits/usage – header anti-cache**  
   Header sulla risposta: `Cache-Control: no-store`, `Pragma: no-cache`, `Expires: 0`, `Vary: Authorization`.

4. **creditService – tipi espliciti**  
   In `getCurrentUsage`, i valori letti da Supabase sono convertiti con `Number()` e `Number.isFinite()`; `period_key` in stringa.

---

## 4. Flusso end-to-end (dopo i fix)

1. **Frontend:** CreditsBar chiama **POST** /api/credits/usage con `Authorization: Bearer <token>`, body `{}`, `cache: 'no-store'`.
2. **API:** Estrae token → validateToken → `userId` → getCurrentUsage(admin, userId, **{ currentPeriodOnly: true }**) → query Supabase **solo** periodo corrente (user_id + period_key UTC); se nessuna riga restituisce 0 → risposta JSON con crediti e header no-cache.
3. **Frontend:** setData(payload) → la barra mostra `credits_used` / `credits_included` dalla risposta.

Con POST (no cache GET) e solo periodo corrente, la barra mostra il valore aggiornato del mese corrente (es. 18 per attiliomazzetti@gmail.it).

---

## 5. Se l’utente vede ancora 5

- **Hard refresh:** Ctrl+Shift+R (o Cmd+Shift+R).
- **Finestra in incognito** e nuovo login con attiliomazzetti@gmail.it.
- **Verificare account:** controllare in app con quale email è loggato (potrebbe essere un altro account con 5 crediti).

Riferimenti: `docs/SISTEMA_CREDITI_AI.md`, `docs/AUDIT_FLUSSO_CREDITI_E_AGGIORNAMENTO_BARRA.md`.
