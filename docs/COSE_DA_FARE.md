# Cose da fare (backlog)

Da analisi esterna su sicurezza e robustezza del codice. Aggiornato: 2025-02.

---

## Alta priorità

- [ ] **Rate limiting su `/api/extract-player`**  
  L’endpoint non chiama `checkRateLimit`; è autenticato e consuma crediti ma può essere abusato per molte chiamate OpenAI.  
  *File:* `app/api/extract-player/route.js`  
  *Azione:* importare e usare `checkRateLimit` + `RATE_LIMIT_CONFIG['/api/extract-player']` come in `extract-coach` / `extract-formation`.

---

## Media priorità

- [ ] **PII nei log**  
  Evitare di loggare in chiaro `user_id`, `player_name`, `coach_name` in produzione (log e aggregatori).  
  *File:* `save-player/route.js` (linee ~294, 367, 382), `save-coach/route.js` (~97, 112), `set-active-coach/route.js` (~82), `extract-formation/route.js` (~274).  
  *Azione:* log solo id/ruolo o messaggi generici; eventuale log strutturato solo in dev o con flag.

- [ ] **`response_format: { type: 'text' }` in assistant-chat**  
  Se OpenAI depreca o cambia il supporto, l’endpoint può fallire per tutti.  
  *File:* `app/api/assistant-chat/route.js` (linea ~832).  
  *Azione:* monitorare doc OpenAI; in caso di errore API prevedere fallback (es. chiamata senza `response_format` o messaggio utente chiaro).

- [ ] **Rate limiter in-memory su serverless**  
  Su Vercel (più istanze) il `Map()` in `lib/rateLimiter.js` è per istanza: limiti non globali, aggirabili.  
  *Azione:* implementare backend condiviso (Redis, Upstash, ecc.) come da TODO in `rateLimiter.js`. Fino ad allora considerare il rate limit un mitigante, non una protezione forte.

---

## Bassa priorità

- [ ] **Uso di `rateLimitConfig` senza fallback**  
  In alcuni route si usano `rateLimitConfig.maxRequests` / `rateLimitConfig.windowMs` senza `?.`; se la chiave viene rimossa da `RATE_LIMIT_CONFIG` si va in crash.  
  *File:* es. `save-tactical-settings/route.js`, `save-match/route.js`, altri che non usano `??` default.  
  *Azione:* usare ovunque `rateLimitConfig?.maxRequests ?? N` e `rateLimitConfig?.windowMs ?? 60000` (o default centralizzato).

---

## Note / assunzioni

- Produzione su Vercel con più istanze → rate limiter in-memory è debole.
- Log con user_id/nomi in chiaro non sono desiderabili in prod se non strettamente necessari.
