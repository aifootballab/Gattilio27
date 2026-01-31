# Allineamento Supabase – trigger, costanti, funzioni (crediti)

**Data:** 2026-01-30  
**Riferimenti:** `migrations/create_user_credit_usage.sql`, `lib/creditService.js`, `docs/SISTEMA_CREDITI_AI.md`.

---

## 1. Tabella `user_credit_usage` (Supabase)

| Colonna          | Tipo        | Default / vincoli | Uso nel codice |
|------------------|-------------|-------------------|----------------|
| id               | UUID        | gen_random_uuid() | Non usato da creditService (PK per update) |
| user_id          | UUID        | NOT NULL, FK auth.users(id) ON DELETE CASCADE | `recordUsage(admin, userId, ...)`, `getCurrentUsage(admin, userId)` |
| period_key       | TEXT        | NOT NULL         | `getCurrentPeriodKey()` → YYYY-MM (UTC) |
| credits_used      | INTEGER     | NOT NULL DEFAULT 0, CHECK >= 0 | Select/update in recordUsage, select in getCurrentUsage |
| credits_included | INTEGER     | NOT NULL DEFAULT 200, CHECK > 0 | Insert 200 da `CREDITS_INCLUDED_DEFAULT`, select in getCurrentUsage |
| created_at       | TIMESTAMPTZ | NOW()             | Non usato da creditService |
| updated_at       | TIMESTAMPTZ | NOW()             | Update in recordUsage; trigger lo sovrascrive a NOW() |

- **UNIQUE(user_id, period_key)** – una riga per utente per mese.
- **Indice:** `idx_user_credit_usage_user_period` su `(user_id, period_key)`.

---

## 2. Trigger

| Trigger                          | Tabella            | Evento        | Funzione SQL                          | Allineamento codice |
|----------------------------------|--------------------|---------------|----------------------------------------|---------------------|
| trigger_user_credit_usage_updated_at | user_credit_usage | BEFORE UPDATE | update_user_credit_usage_updated_at() | OK: imposta `updated_at = NOW()`. Il codice fa anche `updated_at: new Date().toISOString()` nell’update; il trigger ha l’ultima parola. |

- **Funzione:** `update_user_credit_usage_updated_at()` → `NEW.updated_at := NOW(); RETURN NEW;`
- **Sintassi migration:** `EXECUTE FUNCTION update_user_credit_usage_updated_at();` (PostgreSQL 11+). Se il progetto usa PostgreSQL &lt; 11, usare `EXECUTE PROCEDURE` al posto di `EXECUTE FUNCTION`.

---

## 3. Costanti (lib/creditService.js)

| Costante                 | Valore | Allineamento Supabase |
|--------------------------|--------|------------------------|
| CREDITS_INCLUDED_DEFAULT | 200    | Coerente con DEFAULT 200 e CHECK(credits_included > 0) nella tabella. |
| CREDIT_WEIGHTS           | assistant-chat: 1, extract-player: 2, extract-coach: 2, extract-match-data: 2, generate-countermeasures: 3, extract-formation: 3, analyze-match: 4 | Solo codice; usati da recordUsage nelle route. |

---

## 4. Funzioni (lib/creditService.js)

| Funzione                 | Output / uso | Allineamento Supabase |
|--------------------------|--------------|------------------------|
| getCurrentPeriodKey()    | YYYY-MM (UTC), es. `2026-01` | Coerente con period_key TEXT e commenti migration (YYYY-MM). |
| getPreviousPeriodKey()   | YYYY-MM mese precedente (UTC) | Usato per fallback lettura; stesso formato period_key. |
| recordUsage(admin, userId, credits, op) | Upsert su user_credit_usage: select by user_id + period_key; insert (user_id, period_key, credits_used, credits_included) o update (credits_used, updated_at) | Nomi colonne e tipi allineati alla tabella. |
| getCurrentUsage(admin, userId, opts) | { period_key, credits_used, credits_included, overage } | Select credits_used, credits_included, period_key; con **opts.currentPeriodOnly: true** (usato dall’API) solo periodo corrente (0 se nessuna riga); senza opzione fallback al mese precedente. Valori convertiti con Number()/String(). |

---

## 5. RLS

- **SELECT:** policy `"Users can read own credit usage"` con `auth.uid() = user_id`. L’API GET /api/credits/usage usa **service role** (bypassa RLS) e filtra per userId da token.
- **INSERT/UPDATE:** nessuna policy per anon/authenticated; solo backend con service role scrive (recordUsage).

---

## 6. Checklist coerenza

| Punto | Stato |
|-------|--------|
| Nome tabella | `user_credit_usage` – uguale in migration e in creditService. |
| Colonne select/insert/update | user_id, period_key, credits_used, credits_included, updated_at – nomi uguali. |
| DEFAULT 200 vs CREDITS_INCLUDED_DEFAULT | Allineati (200). |
| period_key formato YYYY-MM UTC | getCurrentPeriodKey() e getPreviousPeriodKey() usano getUTC*. |
| Trigger updated_at | BEFORE UPDATE; codice può inviare updated_at, il trigger imposta NOW(). |
| Tipi in uscita getCurrentUsage | Number() e Number.isFinite() per used/included; String per period_key; overage calcolato. |

Riferimenti: `docs/SISTEMA_CREDITI_AI.md`, `docs/AUDIT_CREDITI_SICUREZZA_E_FLUSSO.md`.
