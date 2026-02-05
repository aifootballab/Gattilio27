# Enterprise – Rollback, correzioni e allineamento Supabase
**Data:** 4 Febbraio 2026  
**Scope:** Gestione rosa, USE_CONFIRM_MODAL, i18n statistiche, allineamento codice/DB

---

## Modifiche applicate (implementate)

| Intervento | File | Dettaglio |
|------------|------|-----------|
| i18n statistiche | `gestione-formazione/page.jsx` | "DIFESA" → `t('defending')`; chiavi stat con `t(key) \|\| key.replace(/_/g, ' ')` (attacking, defending, athleticism) |
| i18n statistiche | `giocatore/[id]/page.jsx` | "Forza" → `t('athleticism')`; chiavi stat con `t(key) \|\| ...` (attacking, defending, athleticism) |
| USE_CONFIRM_MODAL | `gestione-formazione/page.jsx` | `USE_CONFIRM_MODAL = true` (conferme via ConfirmModal invece di window.confirm) |
| Codice morto | `gestione-formazione/page.jsx` | Rimosso stato `manualDataInput` e relative `setManualDataInput` |
| Ordine salvataggio | `gestione-formazione/page.jsx` | In `handleSaveCustomPositions`: prima `handleSelectManualFormation` (salva layout), poi loop `assign-player-to-slot` |

**Rollback:** `USE_CONFIRM_MODAL` → impostare `false` alla riga 22 in caso di problemi. Per annullare tutto: `git checkout -- app/gestione-formazione/page.jsx app/giocatore/[id]/page.jsx`.

---

## 1. Rollback di sicurezza

### 1.1 Rollback rapido (singolo commit)
```bash
# Annulla ultimo commit mantenendo modifiche in working tree
git reset --soft HEAD~1

# Annulla completamente (perdita modifiche)
git reset --hard HEAD~1
```

### 1.2 Rollback per fix specifici
| Fix | File coinvolti | Comando rollback |
|-----|----------------|------------------|
| Photo_slots + i18n | `app/gestione-formazione/page.jsx`, `app/giocatore/[id]/page.jsx`, `lib/i18n.js` | `git checkout -- app/gestione-formazione/page.jsx app/giocatore/[id]/page.jsx lib/i18n.js` |
| USE_CONFIRM_MODAL | `app/gestione-formazione/page.jsx` | Cambiare riga 22: `USE_CONFIRM_MODAL = false` |
| Statistiche i18n | `app/gestione-formazione/page.jsx`, `app/giocatore/[id]/page.jsx` | Vedi sezione 3.2 |

### 1.3 Cartelle rollback esistenti
- `rollback/FIX_PHOTO_SLOTS_2026-02-04/` – fix photo_slots e completezza profilo
- `rollback/FIX_GESTIONE_FORMazione_2026-02-03/` – i18n formationCustom, attacking, defending

---

## 2. USE_CONFIRM_MODAL – Rimuovere window.confirm, tenere ConfirmModal

### 2.1 Situazione attuale
- `USE_CONFIRM_MODAL = false` → sempre `window.confirm()`
- `ConfirmModal` esiste e funziona, ma non viene usato
- 10 punti di conferma usano `showConfirmSafe()` con fallback `window.confirm`

### 2.2 Valutazione
**Pro ConfirmModal:**
- UI coerente con il resto dell’app
- Supporto i18n (title, message, labels)
- Migliore UX su mobile
- Accessibilità (focus, escape, click esterno)

**Pro window.confirm:**
- Comportamento nativo del browser
- Nessun rischio di bug di rendering
- Meno codice da mantenere

### 2.3 Procedura di attivazione (senza rompere il flusso)

1. **Impostare il flag**
   - In `app/gestione-formazione/page.jsx` riga 22:
   - Cambiare `const USE_CONFIRM_MODAL = false` in `const USE_CONFIRM_MODAL = true`

2. **Verificare che `ConfirmModal` gestisca tutti i casi**
   - `showConfirmSafe` passa `modalConfig` con `onConfirm` e `onCancel`
   - `ConfirmModal` ha `disabled`; non usato da `showConfirmSafe` – va bene
   - Messaggi lunghi: `ConfirmModal` usa `<p>` per message – adatto

3. **Punti da testare manualmente**
   - Duplicato giocatore (assign da riserve) → conferma "Elimina e Procedi"
   - Cambio posizione non originale → conferma
   - Rimozione con duplicato riserva → conferma
   - Eliminazione giocatore
   - Giocatori fuori ruolo (custom positions)
   - Validazione formazione (save anyway)
   - Riserva duplicata (sostituisci)
   - Dati opzionali mancanti (continua / inserisci manuale)

4. **Rischio**
   - Basso: `showConfirmSafe` usa Promise; `onConfirm`/`onCancel` sono già collegati correttamente
   - Possibile problema: chiusura con click su backdrop – `ConfirmModal` chiama `onCancel` se click su overlay

5. **Rollback immediato**
   - Impostare `USE_CONFIRM_MODAL = false` alla riga 22

### 2.4 Cosa NON fare
- Non rimuovere `showConfirmSafe` né il fallback: servono per rollback rapido
- Non toccare `DuplicatePlayerConfirmModal`: è un componente separato e funziona
- Non modificare `ConfirmModal.jsx`: è già adatto

---

## 3. Statistiche / sezioni in inglese nella scheda giocatore

### 3.1 Causa
- **gestione-formazione** (AssignModal, riga ~3380): header "DIFESA" hardcoded invece di `t('defending')`
- **gestione-formazione** e **giocatore/[id]**: le chiavi delle statistiche (es. `offensive_awareness`, `finishing`) sono mostrate con `key.replace(/_/g, ' ')` invece di `t(key)`
- Le traduzioni esistono già in `lib/i18n.js` (es. `offensive_awareness`, `finishing`, `defensive_awareness`, `ball_control`, `speed`, `stamina`)

### 3.2 Correzione

**File: `app/gestione-formazione/page.jsx`**
- Circa riga 3380: sostituire `>DIFESA</div>` con `>{t('defending')}</div>`
- Per ogni `Object.entries(baseStats.attacking/defending/athleticism)`:  
  sostituire `{key.replace(/_/g, ' ')}` con `{t(key) || key.replace(/_/g, ' ')}`  
  (fallback se manca traduzione per una chiave nuova)

**File: `app/giocatore/[id]/page.jsx`**
- Stesso schema: usare `t(key)` al posto di `key.replace(/_/g, ' ')` per le statistiche nelle sezioni Attacco, Difesa, Fisico

### 3.3 Chiavi i18n già presenti
`offensive_awareness`, `ball_control`, `dribbling`, `tight_possession`, `low_pass`, `lofted_pass`, `finishing`, `heading`, `place_kicking`, `curl`, `defensive_awareness`, `defensive_engagement`, `tackling`, `aggression`, `goalkeeping`, `gk_catching`, `gk_parrying`, `gk_reflexes`, `gk_reach`, `speed`, `acceleration`, `kicking_power`, `jump`, `physical_contact`, `balance`, `stamina`

Se l’API restituisce chiavi non mappate (es. `kicking_power`), `t(key)` restituirà la chiave; in quel caso il fallback `key.replace(/_/g, ' ')` le renderà leggibili.

---

## 4. Correzioni gestione rosa (senza rompere il flusso)

### 4.1 handleSaveCustomPositions – Ordine operazioni (CRITICO)
**Problema:** `assign-player-to-slot` viene chiamato prima del salvataggio del layout. L’API legge `formation_layout` dal DB (layout vecchio) e aggiorna i giocatori con posizioni obsolete.

**Correzione:**
1. Salvare prima il layout: chiamare `handleSelectManualFormation(layout.formation, updatedSlotPositions)` (o la logica di salvataggio layout)
2. Solo dopo il salvataggio, chiamare `assign-player-to-slot` per gli slot modificati

**Attenzione:** `handleSelectManualFormation` esegue `fetchData` alla fine. Verificare che dopo il salvataggio layout il DB abbia già le nuove `slot_positions` prima di chiamare assign. L’API `assign-player-to-slot` legge `formation_layout` – deve quindi essere eseguita dopo che `save-formation-layout` è completato.

**Implementazione suggerita:**
- In `handleSaveCustomPositions`, spostare il blocco che chiama `assign-player-to-slot` dopo la chiamata a `handleSelectManualFormation` e il suo `await`
- `handleSelectManualFormation` salva il layout e fa `fetchData`; non aggiorna i `position` dei giocatori
- L’API `assign-player-to-slot` aggiorna `position` leggendo `slot_positions` dal DB
- Ordine: salva layout → aspetta completamento → chiama assign per ogni slot modificato

### 4.2 Codice morto – manualDataInput
- **Stato:** `manualDataInput` in `app/gestione-formazione/page.jsx` non è mai letto
- **Uso:** Solo `setManualDataInput({})` in `handleRetryUpload` e `onCancel` di `MissingDataModal`
- **Azione:** Rimuovere lo stato `manualDataInput` e le relative `setManualDataInput`
- **Effetto:** Nessuno; `MissingDataModal` usa il proprio stato `manualInput` interno

### 4.3 Duplicazione handleUploadPlayerToSlot / handleUploadReserve
- **Problema:** ~180 righe duplicate (estrazione, merge, photo_slots, validazione)
- **Soluzione:** Estrarre in `extractAndMergePlayerData(images, t)` che restituisce `{ playerData, photoSlots, errors }`
- **Rischio:** Medio – refactor di logica critica; va testato upload titolari e riserve
- **Priorità:** Bassa (ottimizzazione, non bug)

---

## 5. Allineamento Supabase

### 5.1 Schema `players` (MCP list_tables)
| Colonna | Tipo | Uso nel codice |
|---------|------|----------------|
| `base_stats` | jsonb | `{ attacking: {}, defending: {}, athleticism: {} }` – OK |
| `photo_slots` | jsonb | `{ card, statistiche, abilita, booster }` – OK |
| `available_boosters` | jsonb | array – OK; API usa `player.boosters` → mappato in `available_boosters` |
| `original_positions` | jsonb | `[{ position, competence }]` – OK |
| `slot_index` | int (0–10 o NULL) | OK |

### 5.2 Mappatura API ↔ DB
- **extract-player:** Restituisce `boosters` (array)
- **save-player:** `player.boosters` → `available_boosters` (riga 139)
- **Client (gestione-formazione, giocatore):** Legge `player.available_boosters`

Allineamento corretto.

### 5.3 formation_layout
- `slot_positions`: jsonb `{ 0: { x, y, position }, 1: {...}, ... }`
- `assign-player-to-slot` legge `formation_layout.slot_positions[slot_index].position` per aggiornare `players.position`

### 5.4 RLS e sicurezza
- Tutte le tabelle hanno RLS abilitato
- Le API usano `SUPABASE_SERVICE_ROLE_KEY` per bypassare RLS con `user_id` validato dal token
- Nessuna modifica allo schema richiesta per le correzioni previste

---

## 6. Dipendenze e altri file

### 6.1 Componenti che usano ConfirmModal / showConfirmSafe
- Solo `app/gestione-formazione/page.jsx`
- `app/allenatori/page.jsx` ha un commento su "modal conferma" ma non usa `showConfirmSafe`

### 6.2 Link a /lista-giocatori e /upload
- Dashboard, guida, README puntano a `/gestione-formazione` o `/lista-giocatori`/`/upload`
- `lista-giocatori` e `upload` sono redirect a `/gestione-formazione` – nessun impatto sui fix

### 6.3 playerPhotoTypes.js
- `PHOTO_TYPE_KEYS`: `['card','stats','skills']`
- Usato da gestione-formazione e giocatore – non modificare

---

## 7. Checklist pre-deploy

- [ ] `USE_CONFIRM_MODAL = true` → testare tutti i 10 flussi di conferma
- [ ] Sostituire "DIFESA" con `t('defending')` in gestione-formazione
- [ ] Usare `t(key)` per le statistiche in gestione-formazione e giocatore
- [ ] Se si implementa fix handleSaveCustomPositions: salvare layout prima di assign
- [ ] Rimuovere `manualDataInput` (opzionale, nessun impatto funzionale)
- [ ] Verificare che lingua IT sia selezionata e che le statistiche si vedano in italiano

---

## 8. Riferimenti

- `lib/i18n.js` – chiavi statistiche (righe 207–234 it, 1188–1215 en)
- `components/ConfirmModal.jsx` – modal di conferma
- `app/api/supabase/save-player/route.js` – mappatura boosters → available_boosters
- `app/api/supabase/assign-player-to-slot/route.js` – lettura slot_positions da formation_layout
