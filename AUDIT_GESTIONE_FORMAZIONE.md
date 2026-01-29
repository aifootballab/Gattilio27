# Audit codice – `app/gestione-formazione/page.jsx`

**Data:** 2026-01-29  
**File:** `app/gestione-formazione/page.jsx` (~4676 righe)  
**Scope:** Controllo contesto, bug, sicurezza, manutenibilità.

---

## 1. Bug corretti

### 1.1 `supabase` null in `useEffect` (corretto)
- **Dove:** `useEffect` che registra `onAuthStateChange` (righe ~174-187).
- **Problema:** Se `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` mancano, `supabase` è `null` (`lib/supabaseClient.js`). Chiamare `supabase.auth.onAuthStateChange(...)` senza guard causava crash.
- **Fix:** Aggiunto `if (!supabase) return` prima di usare `supabase.auth`.

---

## 2. Problemi di manutenibilità

### 2.1 File monolitico (~4676 righe)
- **Situazione:** Una sola page che contiene:
  - `GestioneFormazionePage` (componente principale)
  - `SlotCard` (~260 righe)
  - `ReserveCard`
  - `AssignModal`
  - `UploadPlayerModal`
  - `FormationSelectorModal` (con oggetto `formations` inline molto grande)
- **Rischio:** Difficile navigazione, review e test; refactor costosi.
- **Consiglio:** Estrarre i sotto-componenti in file dedicati (es. `components/gestione-formazione/SlotCard.jsx`, `AssignModal.jsx`, ecc.) e, se possibile, spostare l’oggetto `formations` in un modulo dati (es. `lib/formations.js` o `data/formations.js`).

### 2.2 Molti stati nel componente principale
- **Situazione:** Oltre 30 `useState` in `GestioneFormazionePage`.
- **Rischio:** Logica e dipendenze tra stati poco chiare; possibili re-render eccessivi.
- **Consiglio:** Valutare un reducer (`useReducer`) o uno stato contestuale per “blocchi” logici (modali, upload, tattica, formazione).

### 2.3 `FormationSelectorModal`: `useMemo` con dipendenze incomplete
- **Dove:** `groupFormationsByBase = React.useMemo(() => { ... }, [])` (riga ~4345).
- **Problema:** Il memo usa `formations` ma le dipendenze sono `[]`. `formations` è un oggetto definito nel corpo del componente, quindi viene ricreato a ogni render; il memo non si aggiorna se `formations` cambiasse.
- **Impatto:** Attualmente basso perché `formations` è praticamente costante; diventa fragile se in futuro `formations` dipendesse da props/state.
- **Consiglio:** Aggiungere `formations` alle dipendenze del `useMemo`, oppure spostare `formations` fuori dal componente (costante di modulo).

---

## 3. Sicurezza e API

### 3.1 Autenticazione
- **Ok:** Le chiamate che modificano dati usano `supabase.auth.getSession()` e inviano il token alle API (`Authorization: Bearer ...`).
- **Ok:** Gli endpoint usati sono server-side (`/api/supabase/...`), quindi le operazioni passano dal backend con controllo sessione.

### 3.2 Conferme utente
- **Situazione:** Uso di `window.confirm()` per azioni critiche (duplicati, posizione non originale, eliminazione giocatore).
- **Nota:** Funzionale; in futuro si può sostituire con modali dedicate per coerenza UX e i18n.

---

## 4. Pattern e dipendenze React

### 4.1 `fetchData` e `useEffect`
- **Ok:** `fetchData` è in `useCallback` con `[supabase, router]`; l’effect che fa fetch e sottoscrive auth dipende da `[router, fetchData]`. Coerente.

### 4.2 Toast
- **Ok:** `showToast` in `useCallback` con `[]`; effect per auto-dismiss del toast con cleanup del timer.

### 4.3 SlotCard – drag
- **Ok:** Listener `touchmove`/`mousemove` aggiunti al `document` e rimossi in `handlePointerEnd`; uso di `passive: false` dove serve per `preventDefault` su touch.

---

## 5. Dati e Supabase

### 5.1 Letture
- **Tabelle usate:** `formation_layout`, `playing_styles`, `players`, `coaches`, `team_tactical_settings`.
- **Ok:** Uso di `maybeSingle()` dove appropriato; gestione errore `PGRST116` per “no rows”.

### 5.2 Scritture
- **Ok:** Le mutazioni passano da API route (`assign-player-to-slot`, `remove-player-from-slot`, `delete-player`, ecc.) con token in header, non da client Supabase diretto per operazioni sensibili.

---

## 6. Riepilogo azioni suggerite

| Priorità | Azione |
|----------|--------|
| Fatto   | Guard `if (!supabase) return` nell’effect di `onAuthStateChange`. |
| Media   | Estrarre `SlotCard`, `ReserveCard`, `AssignModal`, `UploadPlayerModal`, `FormationSelectorModal` in file separati. |
| Media   | Spostare l’oggetto `formations` in un modulo dati e/o correggere le dipendenze di `groupFormationsByBase`. |
| Bassa   | Valutare `useReducer` o contesto per raggruppare parte degli stati della page. |
| Bassa   | Sostituire `window.confirm` con modali di conferma custom (opzionale, per UX/i18n). |

---

## 7. Contesto per Kimi Code / altri assistenti

- **Stack:** Next.js (App Router), React, Supabase, i18n custom (`@/lib/i18n`), componenti UI (lucide-react, TacticalSettingsPanel, PositionSelectionModal, MissingDataModal, ConfirmModal).
- **Flusso principale:** Caricamento layout formazione + giocatori (titolari/riserve) da Supabase; assegnazione/rimozione giocatori tramite API; upload foto e parsing dati giocatore; selezione formazione tattica; drag delle posizioni in modalità modifica.
- **File correlati:** `lib/supabaseClient.js`, `lib/fetchHelper.js` (`safeJsonResponse`), `lib/i18n`, componenti in `components/` (TacticalSettingsPanel, PositionSelectionModal, MissingDataModal, ConfirmModal).

Questo documento può essere usato come contesto stabile per richieste successive sullo stesso file (refactor, fix, feature) senza rileggere l’intero sorgente.
