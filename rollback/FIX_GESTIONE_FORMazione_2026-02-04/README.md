# Rollback - Fix Gestione Formazione 2026-02-04

## Modifiche applicate
- **app/gestione-formazione/page.jsx**:
  - Rimosso pulsante "Carica/Modifica Foto" da AssignModal (non funzionava, duplicato di Completa Profilo)
  - Fix slot vuoto: "Carica Foto" chiama solo onUploadPhoto() (senza onClose che azzerava selectedSlot)
  - Fix UploadPlayerModal: bloccare chiusura (X e backdrop) durante uploading
  - Fix typo pAge === pAge → pAge === playerAge in handleAssignFromReserve
  - Chiudere UploadPlayerModal quando si apre PositionSelectionModal (flusso più pulito)
  - Passato uploading={uploadingPlayer} a PositionSelectionModal

- **components/PositionSelectionModal.jsx**:
  - Aggiunto prop uploading (default false)
  - Pulsante Salva disabilitato durante uploading
  - Testo "Salvataggio..." durante salvataggio

## Rollback (in caso di rottura)
```bash
git checkout -- "app/gestione-formazione/page.jsx" "components/PositionSelectionModal.jsx"
```

## Come testare
1. Clic su slot vuoto → "Carica Foto" → modal upload si apre correttamente
2. Durante estrazione: X e click fuori non chiudono il modal
3. PositionSelectionModal: pulsante Salva mostra "Salvataggio..." durante save, non è cliccabile due volte
4. AssignModal: solo "Completa Profilo" per completare le 3 foto (niente "Carica/Modifica Foto")
5. Assegna riserva con duplicato: verifica che la logica nome+età funzioni correttamente
