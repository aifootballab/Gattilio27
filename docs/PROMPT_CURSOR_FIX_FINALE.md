# PROMPT PER CURSOR - Fix Finale ODIT CODEX

Esegui questi fix automaticamente. Non serve intervento umano.

---

## 🔴 FIX 1: RLS weekly_goals (P1 - Sicurezza Critica)

**File:** `migrations/create_weekly_goals_table.sql`

**Problema:** La policy UPDATE permette all'utente di modificare `current_value` e `status` da client, falsificando i progressi task.

**Soluzione:** Rimuovere la policy UPDATE. Solo il backend (service_role) deve poter aggiornare.

**Codice da modificare:**
Trova e COMMENTA o RIMUOVI queste righe (70-75):
```sql
-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own goals" ON weekly_goals;
CREATE POLICY "Users can update own goals"
ON weekly_goals FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
```

**Sostituisci con:**
```sql
-- UPDATE Policy - RIMOSSA: solo backend (service_role) può aggiornare
-- DROP POLICY IF EXISTS "Users can update own goals" ON weekly_goals;
-- NOTA: Gli update devono avvenire tramite API con service_role
```

---

## 🟡 FIX 2: response_format OpenAI (P2 - Monitoraggio)

**File:** `app/api/assistant-chat/route.js`

**Riga:** ~844

**Problema:** `response_format: { type: 'text' }` non è standard OpenAI. Potrebbe rompersi.

**Soluzione:** Rimuovere il campo response_format (OpenAI default è text).

**Codice attuale:**
```javascript
const requestBody = {
  model: model,
  messages: openAIMessages,
  temperature: 0.7,
  max_tokens: 450,
  response_format: { type: 'text' }  // RIMUOVERE
}
```

**Sostituisci con:**
```javascript
const requestBody = {
  model: model,
  messages: openAIMessages,
  temperature: 0.7,
  max_tokens: 450
  // NOTA: response_format rimosso (usa default OpenAI)
}
```

---

## 🟡 FIX 3: Commento TODO Redis (P2 - Documentazione)

**File:** `lib/rateLimiter.js`

**Riga:** ~5

**Modifica:** Aggiornare il TODO con informazioni più specifiche.

**Codice attuale:**
```javascript
/**
 * Rate Limiter semplice per endpoint API
 * Usa in-memory store (per produzione, usare Redis)
 * 
 * TODO: Per produzione, implementare con Redis o database
 */
```

**Sostituisci con:**
```javascript
/**
 * Rate Limiter semplice per endpoint API
 * Usa in-memory store (Map)
 * 
 * ⚠️ LIMITAZIONE: Su Vercel (multi-istanza) ogni istanza ha il suo Map.
 *    Un utente può bypassare il limite distribuendo richieste su più istanze.
 * 
 * 🚀 SOLUZIONE PROD: Implementare con Redis/Upstash:
 *    - Upstash Redis (serverless, compatibile Vercel)
 *    - Redis Cloud (gestito)
 *    - Supabase non ha Redis integrato, serve servizio esterno
 * 
 * Priorità: Media (il rate limit attuale è un mitigante, non una protezione forte)
 */
```

---

## 🟢 FIX 4: Encoding UTF-8 Check (P3 - Qualità)

**File da verificare:**
- `lib/ragHelper.js` (contiene caratteri �)
- `app/api/assistant-chat/route.js` (contiene caratteri �)
- `docs/COERENZA_SAVE_TACTICAL_SETTINGS.md`

**Azione:** Se trovi caratteri � (mojibake), sostituiscili:
- `�` → `à`
- `�` → `è`
- `�` → `ì`
- `�` → `ò`
- `�` → `ù`
- `�` → `→` (freccia)

**Esempio in ragHelper.js:**
Trova pattern come `abilit�` e sostituisci con `abilità`.

---

## ✅ VERIFICA FINALE

Dopo aver applicato i fix:

1. **Verifica sintassi:**
   - Controlla che `migrations/create_weekly_goals_table.sql` sia valido SQL
   - Controlla che `app/api/assistant-chat/route.js` non abbia errori JavaScript
   - Controlla che `lib/rateLimiter.js` non abbia errori

2. **Verifica logica:**
   - Cerca `response_format` in assistant-chat: deve essere rimosso
   - Cerca policy UPDATE in weekly_goals: deve essere commentata/rimossa

3. **Git:**
   - Fai commit con messaggio: "Fix P1-P3: RLS weekly_goals, response_format, docs Redis, encoding"
   - Fai push

---

## 📝 RIEPILOGO MODIFICHE

| Fix | File | Righe | Tipo |
|-----|------|-------|------|
| RLS UPDATE | `migrations/create_weekly_goals_table.sql` | 70-75 | Sicurezza P1 |
| response_format | `app/api/assistant-chat/route.js` | ~844 | Stabilità P2 |
| TODO Redis | `lib/rateLimiter.js` | ~1-10 | Docs P2 |
| Encoding | `lib/ragHelper.js`, etc. | Vari | Qualità P3 |

**Dopo questi fix, TUTTI i punti ODIT CODEX saranno completati.**

Esegui ora.
