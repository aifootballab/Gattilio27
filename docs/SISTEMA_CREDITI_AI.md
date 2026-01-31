# Sistema crediti AI – Documentazione completa

**Data:** 2026-01-31 (aggiornato 2026-01-30)  
**Stato:** Implementato e funzionante.  
**Riferimenti:** `docs/COSTI_API_E_PRICING_CREDITI.md`, `docs/AUDIT_CREDITI_SICUREZZA_E_FLUSSO.md`, `docs/AUDIT_ENTERPRISE_CREDITI_PERCHÉ_SOLO_5.md`.

---

## 1. Supabase

### 1.1 Tabella `user_credit_usage`

| Colonna           | Tipo        | Note |
|-------------------|-------------|------|
| id                | UUID        | PK, default gen_random_uuid() |
| user_id           | UUID        | NOT NULL, FK → auth.users(id) ON DELETE CASCADE |
| period_key        | TEXT        | NOT NULL. Chiave periodo **YYYY-MM** (UTC). Es. `2026-01`. |
| credits_used      | INTEGER     | NOT NULL DEFAULT 0, CHECK >= 0 |
| credits_included  | INTEGER     | NOT NULL DEFAULT 200, CHECK > 0 |
| created_at        | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at        | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

- **UNIQUE(user_id, period_key)** – una riga per utente per mese.
- **Indice:** `idx_user_credit_usage_user_period` su `(user_id, period_key)`.
- **Migrazione:** `migrations/create_user_credit_usage.sql` (applicata via MCP `create_user_credit_usage`).

### 1.2 RLS

- **RLS:** abilitato.
- **Policy:** `"Users can read own credit usage"` – **SELECT** con `auth.uid() = user_id`.
- **INSERT/UPDATE:** nessuna policy per anon/authenticated → solo backend con **service role** può scrivere.

### 1.3 Trigger

- **trigger_user_credit_usage_updated_at** (BEFORE UPDATE) → funzione `update_user_credit_usage_updated_at()` imposta `updated_at = NOW()`.
- Nessun altro trigger tocca questa tabella.

### 1.4 Period key (UTC)

- **period_key** è calcolato in **UTC** (`getCurrentPeriodKey()` in `lib/creditService.js` usa `getUTCFullYear()`, `getUTCMonth()`).
- Evita mismatch tra server (es. Vercel UTC) e righe scritte in altro fuso: stessa chiave ovunque per lettura e scrittura.

---

## 2. Codice (Node / Next.js)

### 2.1 Servizio: `lib/creditService.js`

- **getCurrentPeriodKey()** – restituisce YYYY-MM del mese corrente in UTC.
- **getPreviousPeriodKey()** – (interno) mese precedente in UTC.
- **recordUsage(admin, userId, credits, operationType)** – dopo ogni chiamata OpenAI riuscita: upsert su `user_credit_usage` (insert se assente, update `credits_used` se esiste). Non lancia (fire-and-forget).
- **getCurrentUsage(admin, userId)** – legge utilizzo per il periodo corrente; se non c’è riga (es. primo giorno mese nuovo UTC), fa **fallback al mese precedente** così la barra non mostra 0 quando ci sono crediti nel mese prima.
- **CREDITS_INCLUDED_DEFAULT** = 200.
- **CREDIT_WEIGHTS** – pesi per operazione (1–4), allineati a `docs/COSTI_API_E_PRICING_CREDITI.md`.

### 2.2 API: GET `/api/credits/usage`

- **Auth:** Bearer obbligatorio; `validateToken` → `userId` da token.
- **Flusso:** `getCurrentUsage(admin, userId)` → risposta JSON: `period_key`, `credits_used`, `credits_included`, `overage`, `percent_used`, `percent_used_raw`.
- **File:** `app/api/credits/usage/route.js`.

### 2.3 Route che chiamano `recordUsage` (dopo successo OpenAI)

| Route                         | Peso |
|-------------------------------|------|
| assistant-chat                | 1    |
| extract-player                | 2    |
| extract-coach                 | 2    |
| extract-match-data (per sezione) | 2 |
| generate-countermeasures     | 3    |
| extract-formation            | 3    |
| analyze-match                | 4    |

### 2.4 Frontend: `components/CreditsBar.jsx`

- Chiama **POST /api/credits/usage** con Bearer (session) e body `{}` per evitare cache HTTP (le risposte POST non vengono cachate come le GET).
- Fetch con **cache: 'no-store'**.
- Mostra: periodo (formattato), crediti usati / inclusi, barra progresso, eventuale overage e hint.
- **Refresh:** (1) al mount, (2) polling ogni **45 secondi**, (3) quando il tab diventa visibile (`visibilitychange`), (4) quando arriva l’evento **`credits-consumed`** (dispatch dopo ogni operazione che consuma crediti).
- **Montaggio:** in `app/layout.tsx` (sempre nel DOM quando c’è sessione); se nessuna sessione ritorna `null` (login).
- i18n: chiavi `creditsTitle`, `creditsSubtitle`, `creditsUsed`, `creditsIncluded`, ecc. in `lib/i18n.js`.

---

## 3. Flusso end-to-end

1. **Scrittura:** utente usa chat/estrazione/analisi → route API valida token → chiama OpenAI → se OK → `recordUsage(admin, userId, weight, op)` → upsert su `user_credit_usage` (period_key UTC corrente).
2. **Lettura:** dashboard carica → CreditsBar → `getSession()` → GET `/api/credits/usage` (Bearer) → API valida token → `getCurrentUsage(admin, userId)` → query periodo corrente (UTC); se nessuna riga, query mese precedente (fallback) → risposta JSON → barra mostra crediti e periodo.

---

## 4. Note operative

- **matches.credits_used** – colonna sulla tabella match: numero di foto caricate per quel match (metadata). **Non** è il sistema crediti mensili; nessun conflitto con `user_credit_usage`.
- **Scrittura:** `recordUsage` fa **sempre la somma** (update `credits_used = existing.credits_used + credits`). **Lettura:** `getCurrentUsage` legge **solo il valore salvato** (nessuna somma in lettura).
- Per dettagli sicurezza e audit: `docs/AUDIT_CREDITI_SICUREZZA_E_FLUSSO.md`.
- Per costi e pesi: `docs/COSTI_API_E_PRICING_CREDITI.md`.
- Per audit “perché si vede solo 5” e fix (POST, currentPeriodOnly): `docs/AUDIT_ENTERPRISE_CREDITI_PERCHÉ_SOLO_5.md`.
quel match (metadata). **Non** è il sistema crediti mensili; nessun conflitto con `user_credit_usage`.
- Per dettagli sicurezza e audit: `docs/AUDIT_CREDITI_SICUREZZA_E_FLUSSO.md`.
- Per costi e pesi: `docs/COSTI_API_E_PRICING_CREDITI.md`.
