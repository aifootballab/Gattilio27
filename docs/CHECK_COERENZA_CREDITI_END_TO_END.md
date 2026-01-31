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

- **Backend:** GET /api/credits/usage usa `userId` da token (validateToken) e legge da `user_credit_usage` con `getCurrentUsage(admin, userId)`. Nessun cache lato server nel codice.
- **Risposta:** Se la richiesta fosse sempre “fresca”, l’API restituirebbe 18 per attiliomazzetti@gmail.it.
- **Conclusione:** Il valore 5 è quasi certamente una **risposta in cache** (browser, CDN o altro) da un momento in cui l’utente aveva 5 crediti.

---

## 3. Fix applicati

1. **CreditsBar – cache-busting**  
   La fetch verso GET /api/credits/usage ora usa un query param variabile:  
   `/api/credits/usage?_=${Date.now()}`  
   così ogni richiesta ha URL diverso e non viene riusata una risposta in cache.

2. **API credits/usage – header anti-cache**  
   Aggiunti/rafforzati header sulla risposta:
   - `Cache-Control: no-store, no-cache, private, max-age=0, must-revalidate`
   - `Pragma: no-cache`
   - `Expires: 0`
   - `Vary: Authorization`  
   così intermediari e browser non devono cachare per utenti diversi.

3. **creditService – tipi espliciti**  
   In `getCurrentUsage`, i valori letti da Supabase sono convertiti esplicitamente in numero con `Number()` e `Number.isFinite()`; `period_key` in stringa. Coerenza tra DB (integer) e risposta JSON.

---

## 4. Flusso end-to-end (dopo i fix)

1. **Frontend:** CreditsBar chiama `GET /api/credits/usage?_=<timestamp>` con `Authorization: Bearer <token>`, `cache: 'no-store'`.
2. **API:** Estrae token → validateToken → `userId` → getCurrentUsage(admin, userId) → query Supabase su `user_credit_usage` (user_id + period_key UTC corrente, con fallback mese precedente) → risposta JSON con crediti e header no-cache.
3. **Frontend:** setData(payload) → la barra mostra `credits_used` / `credits_included` dalla risposta.

Con cache-busting e header no-cache, ogni caricamento/refetch dovrebbe mostrare il valore aggiornato da Supabase (es. 18 per attiliomazzetti@gmail.it).

---

## 5. Se l’utente vede ancora 5

- **Hard refresh:** Ctrl+Shift+R (o Cmd+Shift+R).
- **Finestra in incognito** e nuovo login con attiliomazzetti@gmail.it.
- **Verificare account:** controllare in app con quale email è loggato (potrebbe essere un altro account con 5 crediti).

Riferimenti: `docs/SISTEMA_CREDITI_AI.md`, `docs/AUDIT_FLUSSO_CREDITI_E_AGGIORNAMENTO_BARRA.md`.
