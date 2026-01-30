# Piano intervento enterprise: flusso inserimento giocatore in formazione

**Data**: 28 Gennaio 2026  
**Fonte analisi**: Kimi (3 bug segnalati)  
**Verifica codice**: Conferma parziale – 2 bug reali, 1 falso positivo.

---

## 1. Verifica effettuata (solo lettura)

### Flusso attuale

1. **Upload screenshot** → estrazione dati (extract-player o simile).
2. **Dati estratti** → `setExtractedPlayerData`, `setShowPositionSelectionModal(true)`, `setUploadingPlayer(false)`, **`return`** (riga 917).
3. **Codice righe 919-1001** (validazione duplicati + `DuplicatePlayerConfirmModal`) **non viene mai eseguito** perché c’è `return` alla riga 917.
4. **Utente conferma nel PositionSelectionModal** → viene chiamato `onConfirm` = **`handleSavePlayerWithPositions`** (riga 2553).
5. **`handleSavePlayerWithPositions`** (righe 1012-1184):
   - Esegue il controllo duplicati (1025-1143).
   - Se duplicato → mostra `DuplicatePlayerConfirmModal`; in `onConfirm` del modal rimuove riserva/titolare e chiama save-player + `fetchData()`.
   - Se non duplicato → chiama `/api/supabase/save-player` (1156-1162), poi `fetchData()`, toast, reset state.

**Conclusione flusso**: Il salvataggio **dopo** selezione posizioni **c’è** ed è gestito da `handleSavePlayerWithPositions`. Il problema è solo **codice morto** nel primo blocco (919-1001).

---

## 2. Stato dei 3 bug (verifica codice)

| Bug | Descrizione Kimi | Verifica | Esito |
|-----|-------------------|----------|--------|
| **BUG 1** | Codice morto dopo return (916-999) | Riga 917: `return` dopo apertura modal. Righe 919-1001 mai eseguite. | **CONFERMATO** – Codice morto da rimuovere. |
| **BUG 2** | Manca callback salvataggio dopo selezione posizioni | `PositionSelectionModal` ha `onConfirm={handleSavePlayerWithPositions}` (riga 2553). Il modal chiama `onConfirm` al click (PositionSelectionModal.jsx riga 242). `handleSavePlayerWithPositions` salva e gestisce duplicati. | **FALSO POSITIVO** – Callback presente e collegata. Nessun intervento obbligatorio. |
| **BUG 3** | Posizioni modal non allineate al backend | Modal (PositionSelectionModal.jsx): PT, DC, TS, TD, CC, **CMF**, MED, ESA, **EDE**, **AMF**, TRQ, **LWF**, **RWF**, CLS, CLD, CF, P, SP, **SS**. save-player (route.js r.97): PT, DC, TD, TS, CC, MED, P, SP, TRQ, CLD, CLS, **EDA**, ESA, CF. Manca: CMF, AMF, LWF, RWF, SS; backend ha EDA, modal ha EDE. | **CONFERMATO** – Aggiungere in save-player le posizioni mancanti (e allineare EDA/EDE se necessario). |

---

## 3. Piano di intervento (enterprise)

### Regole (invarianti)

- **NON** modificare `extract-formation` (non ancora in UX).
- **NON** rimuovere logica di duplicati: è già in `handleSavePlayerWithPositions`; va solo eliminato il blocco duplicato (codice morto).
- Flusso atteso: Upload → Estrazione → Dati mancanti? → Modal posizioni → Conferma → Controllo duplicati (in `handleSavePlayerWithPositions`) → Salva → Refresh.
- Test: upload screenshot → modal posizioni → conferma → toast successo; stesso giocatore di nuovo → alert/modal duplicato.

### Intervento 1 – BUG 1: Rimozione codice morto (PRIORITÀ ALTA)

**File**: `app/gestione-formazione/page.jsx`

**Azioni**:
- Eliminare le righe **919-1001** (blocco da “// Validazione duplicati” fino a “// NOTA: Salvataggio spostato in handleSavePlayerWithPositions” incluso).
- **Non** toccare: `setShowPositionSelectionModal(true)`, `setUploadingPlayer(false)`, `return` (riga 917).
- **Non** introdurre nuove funzioni: la logica duplicati corretta è già in `handleSavePlayerWithPositions`.

**Rischio**: Basso. Si rimuove solo codice inaccessibile.

**Rollback**: Ripristinare il blocco 919-1001 da backup/version control.

---

### Intervento 2 – BUG 2: Nessuna modifica

**Esito**: Callback `onConfirm={handleSavePlayerWithPositions}` già presente e usata. Nessun intervento.

---

### Intervento 3 – BUG 3: Allineamento posizioni backend (PRIORITÀ MEDIA)

**File**: `app/api/supabase/save-player/route.js`

**Azioni**:
- Allineare `validPositions` (riga 97) alle posizioni esposte nel modal.
- **Modal**: PT, DC, TS, TD, CC, CMF, MED, ESA, EDE, AMF, TRQ, LWF, RWF, CLS, CLD, CF, P, SP, SS.
- **Attuale backend**: PT, DC, TD, TS, CC, MED, P, SP, TRQ, CLD, CLS, EDA, ESA, CF.
- **Proposta**:  
  `validPositions = ['PT', 'DC', 'TD', 'TS', 'CC', 'CMF', 'MED', 'P', 'SP', 'TRQ', 'AMF', 'CLD', 'CLS', 'EDA', 'EDE', 'ESA', 'CF', 'LWF', 'RWF', 'SS']`  
  (aggiungere CMF, AMF, EDE, LWF, RWF, SS; mantenere EDA e ESA per retrocompatibilità).

**Rischio**: Basso. Si amplia solo la whitelist; il backend oggi non blocca, solo logga warning.

**Rollback**: Ripristinare l’array `validPositions` precedente.

---

## 4. File da modificare (riepilogo)

| File | Modifica | Priorità |
|------|----------|----------|
| `app/gestione-formazione/page.jsx` | Rimuovere righe 919-1001 (codice morto). | Alta |
| `app/api/supabase/save-player/route.js` | Estendere `validPositions` con CMF, AMF, EDE, LWF, RWF, SS. | Media |

**Nessuna modifica**: `components/PositionSelectionModal.jsx`, `extract-formation`, altri endpoint.

---

## 5. Test di accettazione

1. **Flusso completo**: Carica screenshot giocatore → estrazione → si apre modal selezione posizioni → seleziona posizioni e conferma → toast successo → dati aggiornati (fetchData).
2. **Duplicato**: Carica di nuovo lo stesso giocatore (stesso nome/età) → deve apparire il modal/alert duplicato (DuplicatePlayerConfirmModal) con opzione sostituire/annulla.
3. **Posizioni**: Selezionare una posizione “problematica” (es. AMF, LWF, SS) e confermare → salvataggio OK, nessun errore 400 dovuto a posizione non valida.

---

## 6. Ordine di esecuzione consigliato

1. Backup o branch: `git checkout -b fix/flusso-inserimento-giocatore` (o equivalente).
2. Intervento 1: rimuovere codice morto in `page.jsx`.
3. Intervento 3: allineare `validPositions` in `save-player/route.js`.
4. Lint e test manuali (flusso + duplicato + posizioni).
5. Commit e push.

---

**Nota**: Il presente documento è solo analisi e piano; non sono state applicate modifiche al codice.
