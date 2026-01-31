# Audit flusso crediti e aggiornamento immediato barra

**Data:** 2026-01-30  
**Obiettivo:** Allineare route backend, Supabase e UX: ogni chiamata API che consuma crediti deve far aumentare subito la barra.

---

## 1. Dove era l’errore

- **CreditsBar era montata solo nella dashboard** (`app/page.jsx`).
- Su **match/[id], giocatore/[id], contromisure-live, allenatori, gestione-formazione, match/new** la barra **non era nel DOM**.
- Dopo una chiamata API che consuma crediti, il frontend faceva `dispatchEvent('credits-consumed')`, ma **nessun listener** era attivo su quelle pagine.
- Risultato: la barra si aggiornava solo quando l’utente tornava in dashboard (refetch al mount).

**Fix:** CreditsBar è stata spostata in **`app/layout.tsx`** così è sempre montata (tranne quando non c’è sessione). L’evento `credits-consumed` viene ascoltato su ogni pagina e la barra si aggiorna subito dopo ogni API.

---

## 2. Allineamento route → recordUsage → Supabase

| Route | Peso | recordUsage | Ordine (prima risposta o prima recordUsage?) |
|-------|------|-------------|-----------------------------------------------|
| assistant-chat | 1 | `await recordUsage(admin, userId, 1, 'assistant-chat')` | Dopo OpenAI, prima di `return NextResponse.json` ✓ |
| extract-player | 2 | `await recordUsage(admin, userId, 2, 'extract-player')` | Dopo validazione, prima di `return` ✓ |
| extract-coach | 2 | `await recordUsage(admin, userId, 2, 'extract-coach')` | Dopo OpenAI, prima di `return` ✓ |
| extract-match-data | 2 | `await recordUsage(supabaseClient, userId, 2, 'extract-match-data')` | Dopo normalizzazione, prima di `return` ✓ |
| generate-countermeasures | 3 | `await recordUsage(admin, userId, 3, 'generate-countermeasures')` | Dopo OpenAI, prima di `return` ✓ |
| extract-formation | 3 | `await recordUsage(admin, userId, 3, 'extract-formation')` | Dopo OpenAI, prima di `return` ✓ |
| analyze-match | 4 | `await recordUsage(admin, userId, 4, 'analyze-match')` | Dopo OpenAI, prima di `return` ✓ |

In tutte le route la risposta viene inviata **dopo** `await recordUsage(...)`, quindi il DB è aggiornato prima che il client riceva 200. Il refetch **POST** /api/credits/usage dopo `credits-consumed` vede il valore aggiornato (POST evita cache HTTP).

---

## 3. Allineamento frontend: dispatch `credits-consumed` dopo successo

| Pagina / componente | API chiamata | Dispatch dopo successo |
|----------------------|--------------|-------------------------|
| AssistantChat.jsx | /api/assistant-chat | ✓ dopo `data.response` |
| match/[id]/page.jsx | /api/extract-match-data | ✓ dopo `extractRes.ok` e `extractData` |
| match/[id]/page.jsx | /api/analyze-match | ✓ dopo `analyzeRes.ok` e `summary` |
| match/new/page.jsx | /api/extract-match-data | ✓ dopo `extractRes.ok` |
| giocatore/[id]/page.jsx | /api/extract-player | ✓ dopo `extractRes.ok` e `extractData.player` |
| gestione-formazione/page.jsx | /api/extract-player (upload titolari) | ✓ dopo `extractRes.ok` (nel loop) |
| gestione-formazione/page.jsx | /api/extract-player (upload riserve) | ✓ dopo `extractRes.ok` (nel loop) |
| allenatori/page.jsx | /api/extract-coach | ✓ dopo `extractRes.ok` (nel loop) |
| contromisure-live/page.jsx | /api/extract-formation | ✓ dopo `extractRes.ok` e `extractData` |
| contromisure-live/page.jsx | /api/generate-countermeasures | ✓ dopo `generateData.success && generateData.countermeasures` |

Tutte le chiamate che consumano crediti fanno `window.dispatchEvent(new CustomEvent('credits-consumed'))` solo a risposta OK e dati validi.

---

## 4. CreditsBar: ascolto e refetch

- **Dove è montata:** `app/layout.tsx` (prima di `{children}`), così è nel DOM su tutte le pagine quando c’è sessione.
- **Nessuna sessione (login):** ritorna `null` (`noSession`), niente barra né errore.
- **Auth:** `onAuthStateChange('SIGNED_IN')` → `setNoSession(false)` e `fetchUsage()` per mostrare la barra dopo il login.
- **Refetch:**  
  - al mount  
  - ogni 45 s (polling)  
  - su `visibilitychange` (tab visibile)  
  - su evento **`credits-consumed`** → aggiornamento immediato dopo ogni API.

---

## 5. Flusso end-to-end (corretto)

1. Utente su una qualunque pagina (match, giocatore, contromisure, dashboard, …) chiama un’API che consuma crediti.
2. Backend: OpenAI + `await recordUsage(...)` → scrittura su `user_credit_usage` (Supabase) → `return NextResponse.json(...)`.
3. Frontend: riceve 200 → fa `window.dispatchEvent(new CustomEvent('credits-consumed'))`.
4. CreditsBar (in layout) riceve l’evento → `fetchUsage()` → **POST** /api/credits/usage → `setData(payload)` → la barra mostra il nuovo valore.

**Lettura crediti:** l’API chiama `getCurrentUsage(admin, userId, { currentPeriodOnly: true })` → solo mese corrente (0 se nessuna riga). Nessun fallback al mese precedente, così la barra non mostra valori “vecchi”.

Riferimenti: `docs/SISTEMA_CREDITI_AI.md`, `docs/AUDIT_ENTERPRISE_CREDITI_PERCHÉ_SOLO_5.md`.
