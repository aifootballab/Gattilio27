# Audit: Sicurezza endpoint crediti, flusso e coerenza trigger

**Data:** 2026-01-31  
**Scope:** Endpoint crediti, creditService, RLS, flusso recordUsage, trigger.

---

## 1. Sicurezza endpoint

### GET /api/credits/usage
- **Auth:** Bearer obbligatorio; `extractBearerToken` + `validateToken` (Supabase `auth.getUser(token)`).
- **401** se token assente o invalido.
- **userId:** Sempre da `userData.user.id` (token), mai da body/query.
- **Lettura:** Backend usa service role; legge solo la riga `user_credit_usage` per quel `userId` e `period_key` corrente.
- **Esito:** Nessun endpoint espone lettura/scrittura crediti di altri utenti.

### Scrittura crediti (recordUsage)
- Chiamata solo da route server (assistant-chat, analyze-match) dopo risposta OpenAI OK.
- **userId** sempre da token validato (stesso flusso di sopra).
- **admin** sempre client con `SUPABASE_SERVICE_ROLE_KEY`; nessun client può chiamare recordUsage.
- **creditService.recordUsage:** non lancia; in caso di errore logga e ritorna (non blocca la risposta API).

---

## 2. RLS e policy (Supabase)

- **Tabella:** `user_credit_usage`.
- **RLS:** Abilitato.
- **Policy:** Una sola – `"Users can read own credit usage"`  
  - **cmd:** SELECT  
  - **qual:** `auth.uid() = user_id`  
  - **ruoli:** public (quindi authenticated vede solo i propri record).
- **INSERT/UPDATE:** Nessuna policy per anon/authenticated → solo il backend con service role può scrivere. Coerente con il flusso attuale.

---

## 3. Flusso e coerenza

- **assistant-chat:** `userId` da token → dopo risposta OpenAI → `recordUsage(admin, userId, 1, 'assistant-chat')`.
- **analyze-match:** `userId` da token → dopo risposta OpenAI → `recordUsage(admin, userId, 4, 'analyze-match')`.
- **credits/usage:** `userId` da token → `getCurrentUsage(admin, userId)` → risposta con solo dati di quell’utente.
- **Coerenza:** Nessun uso di `userId` da body; nessun endpoint che accetta `user_id` per leggere/scrivere crediti altrui.

Le route OpenAI `extract-player`, `extract-coach`, `extract-match-data`, `generate-countermeasures`, `extract-formation` chiamano tutte `recordUsage` dopo successo (pesi: 2, 2, 2 per sezione, 3, 3).

---

## 4. Trigger

- **user_credit_usage:** Solo trigger `trigger_user_credit_usage_updated_at` (BEFORE UPDATE) che imposta `updated_at`.
- Nessun trigger su altre tabelle (es. `matches`) che scrive su `user_credit_usage`.
- Nessun doppio conteggio: la scrittura avviene solo nelle API che chiamano `recordUsage`.

**Nota:** La colonna `matches.credits_used` è metadata per foto caricate (numero foto per quel match), non il sistema crediti mensili; nessun conflitto con `user_credit_usage`.

---

## 5. Riepilogo

| Aspetto              | Esito |
|----------------------|--------|
| Auth endpoint crediti| OK – Bearer + validateToken, userId da token |
| RLS SELECT           | OK – solo propri record |
| RLS INSERT/UPDATE    | OK – solo service role (backend) |
| Flusso recordUsage   | OK – dopo successo OpenAI, userId da token |
| Trigger              | OK – solo updated_at su user_credit_usage, nessuna interferenza |
| Coerenza             | OK – tutte le 7 route OpenAI instrumentate con recordUsage |

**Route e pesi:** assistant-chat 1, extract-player 2, extract-coach 2, extract-match-data 2 (per sezione), generate-countermeasures 3, extract-formation 3, analyze-match 4.
