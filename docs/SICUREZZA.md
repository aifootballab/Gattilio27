# Guida Sicurezza — eFootball AI Coach

**Checklist e Procedure per Sviluppatori**

---

## 1. Principi Fondamentali

### Golden Rules
1. **Mai fidarsi del client** — Validare sempre input lato server
2. **User ID dal token** — Mai dal body, dai parametri, da header custom
3. **Service Role nascosta** — Solo in API routes, mai nel browser
4. **RLS obbligatorio** — Ogni tabella deve averlo
5. **Log senza PII** — In produzione, niente email, nomi, ID utente nei log

---

## 2. Autenticazione

### Pattern Corretto
```javascript
// ✅ CORRETTO
const token = extractBearerToken(req)
const { userData } = await validateToken(token, url, anonKey)
const userId = userData.user.id  // Dal token JWT verificato

// ❌ SBAGLIATO
const { userId } = req.body  // Chiunque può impersonare!
```

### Endpoint Pubblici vs Protetti
| Endpoint | Auth | Esempio |
|----------|------|---------|
| Pubblico | Nessuna | `/api/leaderboard` (solo GET; in risposta: rank, nickname, points; mai user_id né points_breakdown per altri) |
| Protetto | JWT | `/api/assistant-chat`, `/api/supabase/*` — user_id sempre da token |
| Admin | JWT + Check | `/api/admin/recalculate-patterns` |
| Webhook | API Key | `/api/credits/accredit` — body può contenere user_id/email; protetto da `CREDITS_ACCREDIT_API_KEY` |

---

## 3. Row Level Security (RLS)

### Attivazione
```sql
-- Per ogni tabella UTENTE
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
```

### Pattern Policy Standard
```sql
-- SELECT/INSERT/UPDATE/DELETE — Solo propri dati
CREATE POLICY "user_own_data"
  ON table_name
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Eccezioni (Tabelle di Sistema)
```sql
-- Tabelle readonly pubbliche (lookup)
CREATE POLICY "public_read"
  ON playing_styles
  FOR SELECT
  TO PUBLIC
  USING (true);
```

---

## 4. Rate Limiting

### Stato Attuale
```javascript
// lib/rateLimiter.js — VERSIONE ATTUALE (in-memory)
const rateLimitMap = new Map() // NON SCALABILE su Vercel
```

### Soluzione Produzione (TODO)
```javascript
// lib/rateLimiter.js — VERSIONE REDIS (da implementare)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

export async function checkRateLimit(key, endpoint, max, windowMs) {
  const redisKey = `ratelimit:${key}:${endpoint}`
  const current = await redis.incr(redisKey)
  if (current === 1) {
    await redis.expire(redisKey, Math.ceil(windowMs / 1000))
  }
  return {
    allowed: current <= max,
    remaining: Math.max(0, max - current),
    resetAt: new Date(Date.now() + windowMs)
  }
}
```

### Configurazione Corrente
```javascript
// lib/rateLimiter.js — RATE_LIMIT_CONFIG
'/api/assistant-chat': { maxRequests: 30, windowMs: 60000 },        // 30/min
'/api/supabase/save-match': { maxRequests: 20, windowMs: 60000 },   // 20/min
'/api/supabase/save-player': { maxRequests: 30, windowMs: 60000 },  // 30/min
'/api/extract-player': { maxRequests: 15, windowMs: 60000 },        // 15/min
'/api/save-coach-feedback': { maxRequests: 5, windowMs: 60000 }     // 5/min
```

---

## 5. Input Validation

### Whitelist Pattern
```javascript
const WHITELIST = {
  connection_quality: ['good', 'unstable', 'lag'],
  pass_level: ['pa1', 'pa2', 'pa3'],
  smart_assist: ['yes', 'no'],
  platform: ['console', 'pc', 'mobile', 'other']
}

function validateInput(key, value) {
  if (!WHITELIST[key]?.includes(value)) {
    throw new Error(`Invalid value for ${key}`)
  }
  return value
}
```

### Sanitizzazione
```javascript
import { sanitizeForPrompt } from '@/lib/diagnosticBuilder'

// Prima di inserire in DB o prompt AI
const cleanName = sanitizeForPrompt(userInput, 255)
```

---

## 6. Logging Sicuro

### Pattern Produzione
```javascript
// ✅ CORRETTO — No PII
if (process.env.NODE_ENV !== 'production') {
  console.log('[save-match] User saved match:', matchId)
}

// ❌ SBAGLIATO — PII in produzione
console.log('[save-match] User', userId, 'saved match', matchId)  // userId è PII!
```

### Cosa è PII (Personal Identifiable Information)
- Email, nome, cognome
- User ID (UUID)
- Indirizzo IP
- Dati pagamento

### Cosa NON è PII (può essere loggato)
- Match ID, Player ID (generici)
- Timestamp
- Errori di sistema (senza stack trace con dati)
- Conteggi aggregati

---

## 7. Gestione Segreti

### Environment Variables
```bash
# ✅ CORRETTO — .env.local (mai committato)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...

# ❌ SBAGLIATO — Hardcoded nel codice
const apiKey = "sk-abc123..."  // MAI FARE QUESTO!
```

### Verifica Esposizione
```bash
# Cerca possibili leak
grep -r "sk-" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
grep -r "eyJ" --include="*.js" --include="*.jsx"
```

---

## 8. Edge Functions — RIMOZIONE

### Stato: DA RIMUOVERE
Su Supabase Dashboard, eliminare:
1. `voice-coaching-gpt`
2. `realtime-proxy`
3. `process-screenshot`
4. `process-screenshot-gpt`
5. `analyze-rosa`
6. `analyze-heatmap-screenshot-gpt`
7. `analyze-squad-formation-gpt`
8. `analyze-player-ratings-gpt`
9. `import-players-from-drive`
10. `import-players-json`
11. `scrape-players`
12. `test-efootballhub`

**Verifica finale:**
```bash
supabase functions list
# Deve restituire: No edge functions found
```

---

## 9. Audit & Monitoraggio

### Tabelle Audit (TODO)
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR NOT NULL,     -- 'INSERT', 'UPDATE', 'DELETE'
  table_name VARCHAR NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);
```

### Alert (TODO)
- Rate limit superato ripetutamente (possibile attacco)
- Chiamate API sospette (pattern insoliti)
- Errori 500 ripetuti

---

## 10. Checklist Pre-Deploy

- [ ] RLS attivo su tutte le tabelle utente
- [ ] `leaderboard_snapshots`: nessuna policy SELECT per anon/authenticated (migration `restrict_leaderboard_snapshots_rls.sql`)
- [ ] Service Role Key solo server-side
- [ ] No `console.log` con PII nel codice
- [ ] Rate limiting configurato
- [ ] Input validation su tutti gli endpoint
- [ ] Edge Functions obsolete rimosse
- [ ] Environment variables configurate su Vercel
- [ ] HTTPS obbligatorio (HSTS)
- [ ] CORS configurato correttamente
- [ ] Backup automatici attivi (Supabase)

---

## 11. Risposta agli Incidenti

### Se sospetti un breach:
1. **Non entrare in panico**
2. Verifica logs (Vercel Functions)
3. Identifica scope (quanti utenti coinvolti?)
4. Ruota chiavi compromesse (Supabase, OpenAI, Stripe)
5. Notifica utenti coinvolti (GDPR: entro 72h se dati sensibili)
6. Documenta tutto (post-mortem)

---

## Riferimenti

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Vercel Security](https://vercel.com/docs/security)

---

**Ultimo aggiornamento:** 14/02/2026
