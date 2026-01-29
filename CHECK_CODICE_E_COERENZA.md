# Check completo codice e coerenza

**Data**: 2026-01-29  
**Scope**: App Next.js (Dashboard, Gestione formazione, API, lib, componenti).

---

## 1. Struttura e convenzioni

| Elemento | Stato | Note |
|----------|--------|------|
| Pagine app | OK | Tutte le page sotto `app/` hanno `'use client'` (page.jsx, login, gestione-formazione, allenatori, match, giocatore, contromisure-live, impostazioni-profilo, guida, upload, lista-giocatori). |
| Layout | OK | `app/layout.tsx` usa `LanguageProviderWrapper`, `GuideTour`, `AssistantChat`. Nessun `AlertProvider` (uso opzionale, fallback in `useAlert`). |
| Supabase client | OK | `lib/supabaseClient.js` esporta `supabase` (o `null` se env mancanti). Tutte le pagine che usano Supabase lo importano da lì. |
| fetchHelper | OK | `safeJsonResponse` usato dove serve (dashboard delete-match, update-match; gestione-formazione su varie API). |

---

## 2. API: frontend ↔ backend

- **Chiamate frontend** (fetch a `/api/...`) e **route esistenti** (`app/api/.../route.js`) sono allineate.
- Dashboard: `delete-match`, `update-match`, `admin/recalculate-patterns` → route presenti.
- Gestione formazione: `delete-player`, `assign-player-to-slot`, `remove-player-from-slot`, `save-player`, `save-tactical-settings`, `save-formation-layout`, `extract-player` → route presenti.
- Allenatori: `extract-coach`, `save-coach`, `set-active-coach` → presenti.
- Match: `extract-match-data`, `save-match`, `update-match`, `analyze-match` → presenti.
- Contromisure: `extract-formation`, `save-opponent-formation`, `generate-countermeasures` → presenti.
- Altri: `tasks/list`, `ai-knowledge`, `assistant-chat`, `save-profile` → presenti.

**Conclusione**: Nessuna chiamata a route inesistenti.

---

## 3. Rate limiting

- **`lib/rateLimiter.js`**: `RATE_LIMIT_CONFIG` contiene tutti gli endpoint che usano `checkRateLimit` con la config (analyze-match, delete-match, save-match, update-match, generate-countermeasures, save-tactical-settings, extract-*, delete-player, ai-knowledge, tasks/list).
- **`assistant-chat`**: usa fallback `RATE_LIMIT_CONFIG['/api/assistant-chat'] || { maxRequests: 30, windowMs: 60000 }` → nessun crash se la key non c’è.
- Route senza rate limit (save-player, save-coach, save-formation-layout, assign-player-to-slot, remove-player-from-slot, save-opponent-formation, set-active-coach, save-profile, recalculate-patterns): coerente con l’uso attuale.

**Conclusione**: Coerenza rispettata, nessun uso di `rateLimitConfig` senza fallback/config.

---

## 4. Fix “duplicateConfirmModal” (gestione-formazione)

- **Componente** `DuplicatePlayerConfirmModal`: definito in cima a `app/gestione-formazione/page.jsx`, riceve `state` e `t` come props, renderizza `ConfirmModal` solo se `state?.show`.
- **Utilizzo**: nella pagina si usa `<DuplicatePlayerConfirmModal state={duplicateConfirmModal} t={t} />` (un solo riferimento a `duplicateConfirmModal`).
- **Stato e logica**: `duplicateConfirmModal` e `setDuplicateConfirmModal` invariati; tutte le chiamate a `setDuplicateConfirmModal` (apertura/chiusura modal) restano le stesse.

**Conclusione**: Fix coerente, nessun comportamento rotto.

---

## 5. i18n e modal duplicato

- Il modal usa: `t('duplicatePlayerTitle')`, `t('duplicateInFormationMessage', { ... })`, `t('duplicateInFormationDetails')`, `t('replace')`, `t('cancel')`.
- In **`lib/i18n.js`**: esistono `cancel`, `confirm`, `confirmAction`; **non** esistono le chiavi `duplicatePlayerTitle`, `duplicateInFormationMessage`, `duplicateInFormationDetails`, `replace`. Esiste invece `duplicateInFormationAlert` (testo simile ma chiave diversa).
- Il codice usa **fallback** in italiano/inglese direttamente nel componente (es. `'Giocatore Duplicato'`, `'Sostituisci'`, `'Annulla'`), quindi l’UI funziona anche senza quelle chiavi.

**Suggerimento (non bloccante)**: Aggiungere in i18n `duplicatePlayerTitle`, `duplicateInFormationMessage`, `duplicateInFormationDetails`, `replace` e usare `duplicateInFormationAlert` dove appropriato per allineare tutto alle traduzioni.

---

## 6. Lint e errori

- **Linter**: Nessun errore su `app/`, `components/`, `lib/`.

---

## 7. Riepilogo

| Area | Esito |
|------|--------|
| Struttura app e convenzioni | OK |
| Coerenza API frontend/backend | OK |
| Rate limiting | OK |
| Fix duplicateConfirmModal | OK, coerente |
| i18n (modal duplicato) | OK con fallback; migliorabile con chiavi dedicate |
| Lint | OK |

**Conclusione**: Il codice risulta coerente; il fix per `duplicateConfirmModal` è integrato correttamente e non introduce incongruenze. Nessuna modifica obbligatoria; le uniche azioni consigliate sono migliorie i18n (chiavi per il modal duplicato e “Sostituisci”).
