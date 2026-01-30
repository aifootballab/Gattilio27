# Rischi e piano sicuro: modifica inserimento giocatore

**Data**: 28 Gennaio 2026  
**Obiettivo**: Modificare il flusso di inserimento giocatore (rimozione codice morto + allineamento posizioni) **senza rompere nulla**.

---

## 1. Rischi di modificare l’inserimento

### 1.1 Rischio: rimozione codice morto (page.jsx righe 919-1001)

| Rischio | Livello | Descrizione | Mitigazione |
|--------|---------|-------------|-------------|
| **Rimuovere per sbaglio codice attivo** | Medio | Se si cancellano anche righe 916-918 o si tocca il `return`, il flusso “apri modal e aspetta conferma” si rompe. | Rimuovere **solo** il blocco 919-1001 (da “// Validazione duplicati” incluso fino a “// NOTA: Salvataggio…” incluso). Non toccare `setShowPositionSelectionModal(true)`, `setUploadingPlayer(false)`, `return`. |
| **Variabili o riferimenti usati altrove** | Basso | Il blocco morto usa solo `playerData`, `selectedSlot`, `titolari`, `riserve`, `token`, `t`, `setDuplicateConfirmModal`, `setUploadingPlayer`, `supabase`. Sono tutte di scope esterno; nessuna è definita solo lì. | Nessuna azione aggiuntiva: rimuovere il blocco non rompe riferimenti. |
| **Duplicati non più gestiti** | Nullo | La gestione duplicati **attiva** è in `handleSavePlayerWithPositions` (1025-1154). Il blocco 919-1001 non è mai eseguito. | Nessun impatto: il comportamento reale resta quello di `handleSavePlayerWithPositions`. |

**Conclusione**: Rischio **basso** se si rimuove solo il blocco 919-1001 e non si tocca il resto.

---

### 1.2 Rischio: estendere `validPositions` in save-player

| Rischio | Livello | Descrizione | Mitigazione |
|--------|---------|-------------|-------------|
| **Posizione errata o typo** | Basso | Aggiungere una stringa sbagliata (es. `"AMFF"`) non blocca il backend (oggi solo warning), ma può confondere log o futuri controlli. | Copiare l’elenco esatto dal modal: CMF, AMF, EDE, LWF, RWF, SS. Verificare dopo la modifica. |
| **Conflitto con stili di gioco** | Basso | `playingStylesNotPositions` in save-player evita di trattare stili come posizioni. Le nuove voci (CMF, AMF, LWF, RWF, SS, EDE) sono posizioni eFootball, non stili. | Nessun conflitto atteso. |
| **Retrocompatibilità** | Nullo | Si **aggiungono** solo valori a `validPositions`. I valori già validi restano validi. | Nessun impatto su dati esistenti. |

**Conclusione**: Rischio **basso**; l’unica attenzione è usare l’elenco corretto delle posizioni.

---

### 1.3 Rischio: toccare per sbaglio il flusso attivo

| Rischio | Livello | Descrizione | Mitigazione |
|--------|---------|-------------|-------------|
| **Modificare `handleSavePlayerWithPositions`** | Alto | È l’unico punto che: controlla duplicati, chiama save-player, gestisce DuplicatePlayerConfirmModal e refresh. Qualsiasi modifica può rompere salvataggio o duplicati. | **Non modificare** `handleSavePlayerWithPositions` (righe 1012-1184). |
| **Modificare il wiring del modal** | Alto | `onConfirm={handleSavePlayerWithPositions}` (riga 2553) e `showPositionSelectionModal && extractedPlayerData` (2546) devono restare così. | **Non modificare** le props di `PositionSelectionModal` né la condizione di render. |
| **Modificare altri percorsi verso il modal** | Medio | `handleManualInput` e `handleSaveAnyway` impostano `setShowPositionSelectionModal(true)` e poi l’utente conferma → stesso `handleSavePlayerWithPositions`. Se si cambia lo state o il flusso prima del modal, questi percorsi possono rompersi. | **Non toccare** `handleManualInput`, `handleSaveAnyway` né il blocco che fa `setExtractedPlayerData` + `setShowPositionSelectionModal(true)` + `return` (righe 903-917). |

**Conclusione**: Il rischio più alto è intervenire sul flusso attivo o sul modal. **Regola**: modificare solo il blocco morto e solo `validPositions`.

---

## 2. Cosa non deve cambiare (invarianti)

- **Flusso utente**: Upload screenshot → estrazione → (dati mancanti? → modal dati / salva comunque) → **modal posizioni** → Conferma → (eventuale modal duplicato) → Salvataggio → toast + refresh.
- **Funzioni da non modificare**: `handleSavePlayerWithPositions`, `handleManualInput`, `handleSaveAnyway`, logica dentro `DuplicatePlayerConfirmModal` e il componente `DuplicatePlayerConfirmModal` stesso.
- **Righe da non modificare**: 903-917 (set state + apertura modal + return), 1012-1184 (`handleSavePlayerWithPositions`), 2546-2562 (render di `PositionSelectionModal` e props), 2588 (render di `DuplicatePlayerConfirmModal`).
- **File da non toccare**: `components/PositionSelectionModal.jsx`, `extract-formation`, altre API oltre a `save-player` per questo intervento.

---

## 3. Piano di intervento sicuro (step-by-step)

### Fase 0 – Backup e branch (obbligatorio)

1. **Branch**:  
   `git checkout -b fix/inserimento-giocatore-codice-morto-posizioni`
2. **Backup file**:  
   Copiare in una cartella `rollback/` (o annotare il commit):
   - `app/gestione-formazione/page.jsx`
   - `app/api/supabase/save-player/route.js`
3. **Commit stato attuale** (opzionale):  
   `git add -A && git status` per vedere che non ci siano modifiche non volute, poi procedere.

**Criterio di successo**: Puoi tornare allo stato attuale con `git checkout app/gestione-formazione/page.jsx app/api/supabase/save-player/route.js` o ripristinando i file da rollback.

---

### Fase 1 – Solo rimozione codice morto (page.jsx)

1. **Apri** `app/gestione-formazione/page.jsx`.
2. **Elimina solo** le righe da **919 a 1001** (incluse):
   - Prima riga da eliminare: `      // Validazione duplicati: verifica se stesso giocatore…`
   - Ultima riga da eliminare: `      // NOTA: Salvataggio spostato in handleSavePlayerWithPositions (chiamato da modal)`
3. **Non eliminare**:
   - la riga con `return // Non salvare ancora...` (917),
   - le righe prima (set state, setShowPositionSelectionModal, setUploadingPlayer),
   - la riga `    } catch (err)` e tutto il blocco catch successivo.
4. **Verifica**: Subito dopo il `return` (ora 917) deve seguire una riga vuota e poi `    } catch (err)` (che diventerà circa 919). Nessuna “Validazione duplicati” o “DuplicatePlayerConfirmModal” tra return e catch.
5. **Salva**, **lint** (`ReadLints` su `page.jsx`), **build** se possibile.

**Criterio di successo**: Nessun errore di sintassi; il flusso “upload → modal posizioni → conferma → salvataggio” e “stesso giocatore → modal duplicato” funzionano come prima (test manuale in Fase 3).

**Rollback**:  
`git checkout app/gestione-formazione/page.jsx` (oppure ripristino da rollback).

---

### Fase 2 – Solo allineamento posizioni (save-player)

1. **Apri** `app/api/supabase/save-player/route.js`.
2. **Trova** la riga con `const validPositions = ['PT', 'DC', ...]` (circa riga 97).
3. **Sostituisci** l’array con l’elenco completo (modal + retrocompatibilità):
   ```js
   const validPositions = ['PT', 'DC', 'TD', 'TS', 'CC', 'CMF', 'MED', 'P', 'SP', 'TRQ', 'AMF', 'CLD', 'CLS', 'EDA', 'EDE', 'ESA', 'CF', 'LWF', 'RWF', 'SS']
   ```
4. **Non modificare** `playingStylesNotPositions` né la logica sotto (warning / procedi).
5. **Salva**, **lint** su `save-player/route.js`.

**Criterio di successo**: Salvataggio con posizione AMF, LWF, RWF, SS, CMF, EDE non genera errori e, se previsto, non warning “position not recognized”.

**Rollback**:  
`git checkout app/api/supabase/save-player/route.js` (o ripristino da rollback).

---

### Fase 3 – Test obbligatori (nessuna modifica = nessun deploy)

Eseguire **in ordine** e verificare che tutto passi:

| # | Test | Passo | Risultato atteso |
|---|------|--------|-------------------|
| 1 | Flusso completo | Upload screenshot giocatore → estrazione → si apre modal posizioni → seleziona almeno una posizione → Conferma | Toast successo; lista/rosa aggiornata (fetchData). |
| 2 | Duplicato | Senza cambiare slot, carica di nuovo lo **stesso** giocatore (stesso nome/età) e conferma nel modal posizioni | Si apre **DuplicatePlayerConfirmModal** (sostituisci/annulla). Sostituisci → vecchio tolto, nuovo salvato, toast successo. |
| 3 | Posizioni “nuove” | Nel modal scegli una posizione tra AMF, LWF, SS (o CMF, EDE) e conferma | Salvataggio OK; nessun errore 400; eventuale warning in console accettabile solo se già presente prima. |
| 4 | Percorso “dati mancanti” | Usa un flusso che apre il modal dati mancanti → compila / Salva comunque → si apre modal posizioni → Conferma | Come test 1: toast successo e dati aggiornati. |
| 5 | Annulla modal posizioni | Apri modal posizioni → clic Annulla (senza confermare) | Modal si chiude; nessun salvataggio; nessun errore. |

Se **anche uno solo** fallisce: **non fare commit**; analizzare e, se necessario, rollback (Fase 0) e ripartire.

---

### Fase 4 – Commit e merge

1. **Commit**:  
   `git add app/gestione-formazione/page.jsx app/api/supabase/save-player/route.js`  
   `git commit -m "fix(inserimento): rimozione codice morto 919-1001, allineamento validPositions save-player"`
2. **Push** del branch (opzionale):  
   `git push -u origin fix/inserimento-giocatore-codice-morto-posizioni`
3. **Merge** in `master` (o main) dopo review, se prevista.

---

## 4. Riepilogo rischi e mitigazioni

| Intervento | Rischio | Mitigazione |
|------------|--------|-------------|
| Rimuovere righe 919-1001 in page.jsx | Basso (errore sul blocco da tagliare) | Rimuovere solo quel blocco; non toccare return né handleSavePlayerWithPositions; backup + test. |
| Estendere validPositions in save-player | Basso (typo nell’elenco) | Copiare elenco dal piano; lint e test posizioni. |
| Toccare flusso attivo o modal | Alto | **Non toccare** handleSavePlayerWithPositions, wiring del modal, handleManualInput, handleSaveAnyway. |

---

## 5. Checklist pre-commit

- [ ] Backup / branch creato (Fase 0).
- [ ] Rimosso solo il blocco 919-1001 in page.jsx (Fase 1).
- [ ] Aggiornato solo `validPositions` in save-player (Fase 2).
- [ ] Test 1–5 eseguiti e passati (Fase 3).
- [ ] Lint senza errori su file modificati.
- [ ] Nessuna modifica a handleSavePlayerWithPositions, PositionSelectionModal, DuplicatePlayerConfirmModal, handleManualInput, handleSaveAnyway.

Se tutti i punti sono ok, il rischio di “rompere niente” è contenuto e l’intervento è pronto per commit e deploy.
