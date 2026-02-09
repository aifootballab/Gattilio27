# Audit classifica mensile (From Zero to Hero)

**Data audit:** 2026-02-09  
**Progetto Supabase verificato:** `zliuuorrwdetylollrua`  
**URL:** https://zliuuorrwdetylollrua.supabase.co

---

## 1) Quale Supabase viene letto

- **Cursor / MCP:** legge il progetto collegato al tuo ambiente (quello con dati corretti = `zliuuorrwdetylollrua`).
- **App in esecuzione:** l’API `/api/leaderboard` usa le variabili d’ambiente **del server** che esegue Next.js:
  - **Locale:** `npm run dev` → legge `.env.local` → `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
  - **Vercel (o altro host):** legge le **Environment Variables** impostate nel progetto (Settings → Environment Variables). Se lì non sono impostate o puntano a un altro progetto, l’API vedrà un DB diverso (spesso vuoto) → classifica vuota.

**Conclusione:** se vedi "Non in classifica" ma in questo audit i dati ci sono, l’app che stai usando (browser) sta chiamando un’istanza dell’API che **non** usa il progetto `zliuuorrwdetylollrua`. Controlla sempre l’ambiente dove gira l’API (locale vs Vercel) e le variabili lì definite.

---

## 2) Coerenza tabelle (progetto zliuuorrwdetylollrua)

| Tabella | Uso per la classifica | Stato verificato |
|--------|------------------------|-------------------|
| **user_profiles** | Consenso (`leaderboard_consent`), nickname, `profile_completion_score` per eleggibilità | Utente Attilio: consent=true, score=100, nickname=Attilio. Coerente. |
| **matches** | Partite nel mese: `match_date` in bounds UTC del mese, `data_completeness = 'complete'` | 1 partita completa in feb 2026 (2026-02-06 UTC). Altre in gen 2026. Coerente. |
| **weekly_goals** | Obiettivi completati nel mese: `status = 'completed'`, `completed_at` in bounds UTC | 3 obiettivi completati in feb 2026. Coerente. |
| **credit_transactions** | Utilizzi IA nel mese: `type = 'usage'`, `created_at` in bounds UTC | Utilizzi presenti per il mese. Coerente. |
| **leaderboard_snapshots** | Snapshot classifica per mese (`month = 'YYYY-MM'`), punti e rank | Feb 2026: 2 righe (Attilio rank 1, 30 pt; altro utente rank 2, 27 pt). Coerente. |

Bounds febbraio 2026 (UTC): da `2026-02-01 00:00:00+00` a `2026-02-28 23:59:59+00`.  
Le query in `lib/leaderboardHelper.js` e nell’API usano questi bounds (ISO UTC). Coerente.

---

## 3) Perché attiliomazzetti@gmail.com non vede niente in classifica – e coerenza ripristinata

**Motivo (condizioni nel codice):**  
L’utente non si vedeva in classifica perché l’eleggibilità richiedeva **anche** almeno 1 task completato nel mese (`MIN_TASKS_ELIGIBILITY = 1`). Con solo partite complete e profilo (e consenso) si veniva comunque esclusi. Le altre condizioni che possono escludere sono: consenso non true, nessuna partita con `data_completeness = 'complete'` nel mese, profilo &lt; 50, mese sbagliato, snapshot filtrato a zero dal consenso.

**Coerenza ripristinata:**  
In `lib/leaderboardHelper.js` è stato impostato **`MIN_TASKS_ELIGIBILITY = 0`**.  
Per entrare in classifica servono ora solo:
- **Almeno 1 partita** nel mese con `data_completeness = 'complete'`
- **Profilo** `profile_completion_score >= 50`
- **Consenso** `leaderboard_consent = true`

Nessun obbligo di task/obiettivi completati nel mese: **partite complete + profilo + consenso = entri in classifica**.

**Condizioni che possono ancora escluderti (riferimento):**

| Condizione | Cosa succede | Dove |
|------------|--------------|------|
| **Filtro consenso** | Se `leaderboard_consent` non è `true` → escluso. | `leaderboardHelper.js` + `route.js` (filtro profili). |
| **Solo partite "complete"** | Contano solo `matches.data_completeness === 'complete'` nel mese. | `leaderboardHelper.js` → `completeInMonth`, `isEligibleForLeaderboard(matchCount, ...)`. |
| **Profilo ≥ 50** | `profile_completion_score < 50` → escluso. | `leaderboardHelper.js` → `isEligibleForLeaderboard(..., profileCompletionScore)`. |
| **Mese** | Il frontend chiede il mese corrente; partite/task devono essere in quel mese (bounds UTC). | `page.jsx`, `classifica/page.jsx` → `month=YYYY-MM`. |
| **Snapshot + consenso** | Se la query profili con consenso restituisce 0, la lista è vuota. | `route.js` → `filtered` da `consentedIds`. |

**Checklist “perché non sono in classifica”:**  
1. `user_profiles.leaderboard_consent = true`?  
2. Almeno 1 `matches` con `data_completeness = 'complete'` e `match_date` nel mese richiesto?  
3. `user_profiles.profile_completion_score >= 50`?  
4. Stai guardando il **mese** in cui hai quella partita? (frontend = mese corrente.)

---

## 4) Flusso API (riepilogo)

1. **Parametro month:** da query string `?month=YYYY-MM` o mese corrente server. Frontend (dashboard e pagina Classifica) invia il mese esplicito (es. `2026-02`).
2. **Snapshot:** lettura `leaderboard_snapshots` per quel `month`. Se la lettura fallisce → 500 e log.
3. **Profili con consenso:** per ogni `user_id` presente negli snapshot, lettura `user_profiles` con `leaderboard_consent = true`. Se la lettura fallisce → 500.
4. **Rankings:** solo utenti ancora con consenso vengono messi in classifica; rank ricalcolato 1, 2, …
5. **currentUser:** se c’è token valido, si cerca l’utente loggato negli snapshot filtrati e si restituisce rank, punti, breakdown.

Se `rankings` è vuoto nonostante snapshot pieni nel DB “giusto”, le cause possibili sono:
- L’API sta usando **un altro progetto Supabase** (env del deploy sbagliate).
- Mese richiesto diverso (es. `month=2026-01` senza snapshot).

---

## 5) Diagnostica quando la classifica è vuota

L’API, quando restituisce `rankings: []`, aggiunge un oggetto **`_debug`** nella risposta JSON:

- **`month`:** mese per cui è stata fatta la richiesta.
- **`snapshotsFound`:** numero di righe lette da `leaderboard_snapshots` per quel mese. Se 0 → DB senza snapshot per quel mese (altro progetto o mese sbagliato).
- **`profilesWithConsent`:** (solo se ci sono snapshot) quanti profili con consenso sono stati trovati per gli user_id degli snapshot. Se 0 con snapshot > 0 → problema su `user_profiles` o consenso.
- **`supabaseProject`:** identificativo del progetto usato dall’API (estratto da `NEXT_PUBLIC_SUPABASE_URL`).
- **`expectedProject`:** `zliuuorrwdetylollrua` (progetto dove i dati sono stati verificati).

**Cosa fare:** apri DevTools → scheda Rete → richiesta `leaderboard` (o `api/leaderboard`) → Response. Se vedi `_debug`:

- `supabaseProject` ≠ `expectedProject` → l’API non sta usando il progetto con i dati. Imposta su Vercel (o sull’host usato) `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` del progetto `zliuuorrwdetylollrua`.
- `snapshotsFound: 0` e `supabaseProject` = `zliuuorrwdetylollrua` → possibile mese sbagliato o snapshot non ancora scritti per quel mese.
- `snapshotsFound > 0` e `profilesWithConsent: 0` → problema su profili/consenso (query o dati).

---

## 6) Riferimenti codice

- **API:** `app/api/leaderboard/route.js` (lettura snapshot, profili, costruzione rankings e currentUser, gestione errori, `_debug`).
- **Helper:** `lib/leaderboardHelper.js` (bounds mese UTC, calcolo punti, eleggibilità, `computeLeaderboardForMonth`, `saveLeaderboardSnapshot`).
- **Frontend:** `app/page.jsx` (fetch classifica con `?month=YYYY-MM`), `app/classifica/page.jsx` (stessa cosa + visualizzazione).

.env.local (locale) deve contenere:
- `NEXT_PUBLIC_SUPABASE_URL=https://zliuuorrwdetylollrua.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<chiave service role dello stesso progetto>`

Sul deploy (es. Vercel) devono essere impostate le stesse variabili per il progetto `zliuuorrwdetylollrua`.

---

## 7) Log: Vercel e Supabase

**Vercel:** non accessibili da qui. Controllarli in **Vercel Dashboard → progetto → Logs** (o Deployments → Functions). Cercare richieste a `api/leaderboard` ed eventuali 500 o eccezioni.

**Supabase (API):** Supabase → Logs → API. Le chiamate alla classifica arrivano dal **server** Next (es. Vercel): si vedono GET a `leaderboard_snapshots` e `user_profiles` dagli IP del server. Se nel progetto `zliuuorrwdetylollrua` non compaiono richieste a `leaderboard_snapshots`, l’API leaderboard che risponde alle tue richieste sta probabilmente usando un **altro** progetto (env diverse sul deploy). ODIT: `docs/ODIT_CODEX.md` sez. 19.10.
