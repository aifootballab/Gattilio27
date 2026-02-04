# Task rifiniture per programmatore

**Data**: 3 Febbraio 2026  
**Obiettivo**: Preparare il codice per handoff – rimuovere codice inutile, duplicati, commenti ridondanti, errori di logica.  
Ogni task include: descrizione errore, soluzione, prima/dopo lato cliente.

---

## 1. Codice morto / feature flag non usato

### TASK-001: `USE_CONFIRM_MODAL` e `showConfirmSafe` (gestione-formazione)

| Campo | Valore |
|-------|--------|
| **File** | `app/gestione-formazione/page.jsx` |
| **Righe** | 17-57 |
| **Errore** | Feature flag `USE_CONFIRM_MODAL = false` → il ramo con `ConfirmModal` non viene mai eseguito. Codice morto ~30 righe + commenti. |
| **Soluzione** | Opzione A: rimuovere flag e `showConfirmSafe`, usare sempre `ConfirmModal` (testare su Vercel). Opzione B: rimuovere il ramo morto (if USE_CONFIRM_MODAL) e semplificare a sola `window.confirm` con commento che spiega perché. |
| **Prima (cliente)** | Nessun cambiamento visibile. |
| **Dopo (cliente)** | Nessun cambiamento visibile. Codice più pulito. |

---

## 2. Variable shadowing

### TASK-002: `t` shadowing in useEffect (login)

| Campo | Valore |
|-------|--------|
| **File** | `app/login/page.jsx` |
| **Righe** | 26 |
| **Errore** | `const t = setInterval(...)` shadowa la funzione `t` da `useTranslation()`. Rischio confusione e bug futuri. |
| **Soluzione** | Rinominare in `const intervalId = setInterval(...)` e usare `intervalId` nel callback e cleanup. |
| **Prima (cliente)** | Nessun effetto visibile. |
| **Dopo (cliente)** | Nessun effetto visibile. Codice più leggibile. |

---

## 3. console.log in produzione

### TASK-003: Log con dati sensibili / verbosi (produzione)

| Campo | Valore |
|-------|--------|
| **File** | Vari (vedi elenco sotto) |
| **Errore** | Molti `console.log` espongono `userId`, conteggi, dettagli operativi. In produzione affollano i log e possono esporre dati. |
| **Soluzione** | Avvolgere i `console.log` informativi in `if (process.env.NODE_ENV !== 'production')`. Mantenere `console.error` per errori reali (senza dati sensibili). Rimuovere o ridurre log in `lib/taskHelper.js`, `app/api/tasks/list`, `components/AIKnowledgeBar`, `components/TaskWidget`, `app/page.jsx`. |
| **Prima (cliente)** | Nessun effetto visibile. |
| **Dopo (cliente)** | Nessun effetto visibile. Log produzione più puliti. |

**File da intervenire**:
- `lib/taskHelper.js` – ~25 console.log/warn
- `app/api/tasks/list/route.js` – log già parzialmente protetti, verificare coerenza
- `components/AIKnowledgeBar.jsx` – 5 console.log
- `components/TaskWidget.jsx` – 1 console.log
- `app/page.jsx` – console.log con userId (riga 125)

---

## 4. Commenti obsoleti / ridondanti

### TASK-004: Blocco commenti feature flag (gestione-formazione)

| Campo | Valore |
|-------|--------|
| **File** | `app/gestione-formazione/page.jsx` |
| **Righe** | 17-24 |
| **Errore** | Commenti lunghi per flag non usato. Ridondanti se si rimuove il flag (TASK-001). |
| **Soluzione** | Se si risolve TASK-001 rimuovendo il ramo morto, eliminare anche questi commenti. |
| **Prima (cliente)** | Nessun effetto. |
| **Dopo (cliente)** | Nessun effetto. |

---

## 5. TODO non risolti

### TASK-005: TODO sparsi nel codice

| Campo | Valore |
|-------|--------|
| **File** | `lib/taskHelper.js`, `lib/rateLimiter.js`, `app/api/assistant-chat`, `app/api/supabase/save-match`, `app/api/supabase/update-match` |
| **Errore** | TODO lasciati che descrivono funzionalità non implementate. Creano confusione. |
| **Soluzione** | Per ciascuno: implementare, documentare in un backlog, o rimuovere se irrilevante. |
| **Prima (cliente)** | Nessun effetto. |
| **Dopo (cliente)** | Nessun effetto. |

**Dettaglio TODO**:
- `lib/taskHelper.js:687` – "Implementare tracking quando disponibile"
- `lib/rateLimiter.js:5` – "Per produzione, implementare con Redis"
- `app/api/assistant-chat/route.js:851` – "Quando GPT-5 sarà disponibile..."
- `app/api/supabase/save-match/route.js:450` – "Implementare playerPerformanceHelper quando necessario"
- `app/api/supabase/update-match/route.js:551` – stesso

---

## 6. Logica / possibili errori

### TASK-006: `DuplicatePlayerConfirmModal` – uso di `t()` con oggetto

| Campo | Valore |
|-------|--------|
| **File** | `app/gestione-formazione/page.jsx` |
| **Righe** | 66-71 |
| **Errore** | `t('duplicateInFormationMessage', { playerName, playerAge, slotIndex })` – l’i18n del progetto accetta solo (key) e ignora il secondo argomento; il messaggio mostra letteralmente i placeholder. Verificare che la chiave esista e che i placeholder siano corretti. |
| **Soluzione** | Usare `.replace()` come altrove: `(t('duplicateInFormationMessage') || '...').replace('${playerName}', state.playerName || '').replace('${playerAge}', ...).replace('${slotIndex}', ...)`. |
| **Prima (cliente)** | Modal duplicato mostra "Il giocatore "${playerName}"${playerAge} è già in formazione nello slot ${slotIndex}." |
| **Dopo (cliente)** | Modal mostra correttamente "Il giocatore "Messi" (25 anni) è già in formazione nello slot 3." |

---

### TASK-007: Login – reset cooldown al cambio modalità

| Campo | Valore |
|-------|--------|
| **File** | `app/login/page.jsx` |
| **Righe** | 333-337 |
| **Errore** | Il bottone "Passa a Registrati" / "Hai già account?" non resetta `cooldownUntil`. Se l’utente fallisce login e passa a signup, il bottone signup resta disabilitato per 3 secondi. |
| **Soluzione** | Nel click che cambia mode: `setCooldownUntil(0)` per permettere subito un tentativo nella nuova modalità. |
| **Prima (cliente)** | Dopo errore login, passando a signup il bottone resta disabilitato 3 s. |
| **Dopo (cliente)** | Passando a signup/login il bottone è subito cliccabile. |

---

## 7. Codice duplicato / ripetitivo

### TASK-008: Pattern ripetuto `supabase.auth.getSession()` + Bearer

| Campo | Valore |
|-------|--------|
| **File** | `app/gestione-formazione/page.jsx`, `app/allenatori/page.jsx`, `app/contromisure-live/page.jsx`, ecc. |
| **Errore** | Stesso blocco ripetuto ovunque: `getSession()` → `session?.session?.access_token` → `Authorization: Bearer ${token}`. |
| **Soluzione** | Creare helper `lib/authHelper.js`: `getAuthHeaders()` che ritorna `{ Authorization: 'Bearer ...' }` o null. Usarlo nelle fetch. |
| **Prima (cliente)** | Nessun effetto visibile. |
| **Dopo (cliente)** | Nessun effetto visibile. Codice più DRY. |

---

## 8. Componente gigante

### TASK-009: `gestione-formazione/page.jsx` ~4900 righe

| Campo | Valore |
|-------|--------|
| **File** | `app/gestione-formazione/page.jsx` |
| **Errore** | File enorme con 5+ componenti inline (`SlotCard`, `ReserveCard`, `AssignModal`, `UploadPlayerModal`, `FormationSelectorModal`). Difficile da mantenere e testare. |
| **Soluzione** | Estrarre componenti in `components/gestione-formazione/`: `SlotCard.jsx`, `ReserveCard.jsx`, `AssignModal.jsx`, `UploadPlayerModal.jsx`, `FormationSelectorModal.jsx`. Passare props necessarie. |
| **Prima (cliente)** | Nessun effetto visibile. |
| **Dopo (cliente)** | Nessun effetto visibile. Manutenzione più semplice. |

---

## 9. Stili inline ripetuti

### TASK-010: Stili duplicati (gestione-formazione, dashboard, ecc.)

| Campo | Valore |
|-------|--------|
| **File** | `app/gestione-formazione/page.jsx`, `app/page.jsx`, altri |
| **Errore** | Stessi oggetti style ripetuti (colori, bordi, ombre). Duplicazione e rischio incoerenza. |
| **Soluzione** | Definire costanti in `lib/theme.js` o usare classi CSS in `globals.css` per pattern comuni (card, bottoni, modal). |
| **Prima (cliente)** | Nessun effetto visibile. |
| **Dopo (cliente)** | Nessun effetto visibile. Stili più coerenti. |

---

## 10. Riepilogo priorità

| Priorità | Task | Rischio |
|----------|------|---------|
| Alta | TASK-006 (modal duplicato – BUG interpolazione) | Basso |
| Alta | TASK-002 (shadowing), TASK-007 (cooldown login) | Basso |
| Media | TASK-003 (console.log), TASK-005 (TODO) | Basso |
| Media | TASK-001 (USE_CONFIRM_MODAL) | Medio – testare ConfirmModal |
| Bassa | TASK-008 (helper auth), TASK-009 (estrazione componenti) | Medio |
| Bassa | TASK-010 (stili) | Basso |

---

## Convenzioni

- **Rollback**: prima di ogni modifica, creare `rollback/FIX_<NOME>_<DATA>/README.md` con istruzioni `git checkout`.
- **Test**: dopo ogni fix, verificare `npm run build` e i flussi principali (login, gestione formazione, upload, chat).
- **Commit**: un commit per task o gruppo coerente di task.
