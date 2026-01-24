# 📋 Piano Implementazione Finale: Posizioni Multiple Originali

**Data**: 24 Gennaio 2026  
**Stato**: ✅ **PRONTO PER IMPLEMENTAZIONE**

---

## 🎯 OBIETTIVO

Implementare sistema per gestire giocatori con **posizioni multiple originali** con:
- ✅ Input manuale cliente (modal selezione posizioni)
- ✅ Adattamento automatico `position` allo slot
- ✅ Conferma solo se posizione NON originale
- ✅ i18n completo (IT/EN)
- ✅ Retrocompatibilità totale
- ✅ Nessuna rottura funzionalità esistenti

---

## ✅ VERIFICHE PRE-IMPLEMENTAZIONE

### 1. **Database**
- [x] Verificato: colonna `original_positions` NON esiste
- [x] Verificato: nessun riferimento a `original_positions` nel codice
- [x] Pronto: migrazione SQL preparata

### 2. **Route/Endpoint**
- [x] Verificato: `save-player` non usa `original_positions`
- [x] Verificato: `assign-player-to-slot` non adatta `position`
- [x] Verificato: `remove-player-from-slot` non resetta `position`
- [x] Verificato: `extract-player` non estrae `original_positions`

### 3. **Frontend**
- [x] Verificato: `handleUploadPlayerToSlot` salva direttamente
- [x] Verificato: `handleAssignFromReserve` non verifica posizioni
- [x] Verificato: nessun componente `PositionSelectionModal`

### 4. **i18n**
- [x] Verificato: chiavi esistenti per gestione formazione
- [x] Pronto: nuove chiavi da aggiungere documentate

### 5. **Rollback**
- [x] Documentato: `ROLLBACK_COMPLETO_POSIZIONI_MULTIPLE.md`
- [x] Documentato: `DOCUMENTAZIONE_MODIFICHE_POSIZIONI_MULTIPLE.md`

---

## 🔧 IMPLEMENTAZIONE STEP-BY-STEP

### STEP 1: Database ⭐⭐⭐

**File**: `migrations/add_original_positions_column.sql` (NUOVO)

**Azione**:
1. Creare file migrazione
2. Eseguire in Supabase Dashboard
3. Verificare che colonna sia creata

**Rollback**: SQL documentato in `ROLLBACK_COMPLETO_POSIZIONI_MULTIPLE.md`

---

### STEP 2: i18n ⭐⭐⭐

**File**: `lib/i18n.js`

**Azione**: Aggiungere nuove chiavi IT/EN dopo riga ~1565

**Chiavi da Aggiungere**:
```javascript
// IT
selectOriginalPositions: 'Seleziona Posizioni Originali',
positionSelectionTitle: 'Seleziona le posizioni in cui questo giocatore può giocare',
positionSelectionDescription: 'Quali posizioni può giocare questo giocatore? (Seleziona tutte quelle evidenziate nella card)',
competenceLevel: 'Livello Competenza',
competenceHigh: 'Alta',
competenceMedium: 'Intermedia',
competenceLow: 'Bassa',
mainPosition: 'Posizione Principale',
selectPositions: 'Seleziona Posizioni',
confirmPositionChange: '${playerName} è ${originalPositions} originale, ma lo stai spostando in slot ${slotPosition}.\n\n${slotPosition} NON è una posizione originale.\nCompetenza in ${slotPosition}: ${competence}\n${statsWarning}Vuoi comunque usarlo come ${slotPosition}? (Performance ridotta)\n\nSe confermi, ti prendi la responsabilità e il sistema accetta la scelta.',
positionNotOriginal: '${slotPosition} NON è una posizione originale',
positionOriginal: 'Posizione originale',
mustSelectAtLeastOne: 'Devi selezionare almeno una posizione',

// EN
selectOriginalPositions: 'Select Original Positions',
positionSelectionTitle: 'Select the positions this player can play',
positionSelectionDescription: 'Which positions can this player play? (Select all those highlighted on the card)',
competenceLevel: 'Competence Level',
competenceHigh: 'High',
competenceMedium: 'Medium',
competenceLow: 'Low',
mainPosition: 'Main Position',
selectPositions: 'Select Positions',
confirmPositionChange: '${playerName} is ${originalPositions} original, but you are moving them to slot ${slotPosition}.\n\n${slotPosition} is NOT an original position.\nCompetence in ${slotPosition}: ${competence}\n${statsWarning}Do you still want to use them as ${slotPosition}? (Reduced performance)\n\nIf you confirm, you take responsibility and the system accepts the choice.',
positionNotOriginal: '${slotPosition} is NOT an original position',
positionOriginal: 'Original position',
mustSelectAtLeastOne: 'You must select at least one position',
```

**Rollback**: Rimuovere tutte le chiavi aggiunte

---

### STEP 3: Componente Modal ⭐⭐⭐

**File**: `components/PositionSelectionModal.jsx` (NUOVO)

**Azione**: Creare componente modal per selezione posizioni

**Caratteristiche**:
- Lista checkbox per tutte le posizioni
- Dropdown competenza per ogni posizione selezionata
- Pre-selezione posizione principale
- Validazione: almeno una posizione selezionata
- i18n completo (IT/EN)

**Rollback**: Eliminare file

---

### STEP 4: Frontend - Stati e Modal ⭐⭐⭐

**File**: `app/gestione-formazione/page.jsx`

**Azione 1 - Aggiungere Stati** (dopo riga ~100):
```javascript
const [showPositionSelectionModal, setShowPositionSelectionModal] = useState(false)
const [extractedPlayerData, setExtractedPlayerData] = useState(null)
const [selectedOriginalPositions, setSelectedOriginalPositions] = useState([])
```

**Azione 2 - Modificare `handleUploadPlayerToSlot`** (riga 514-713):
- Dopo estrazione dati (riga 613), mostrare modal selezione
- Non salvare direttamente
- Salvare solo dopo conferma modal

**Azione 3 - Modificare `handleAssignFromReserve`** (riga 207-319):
- Aggiungere verifica posizioni originali
- Mostrare conferma se posizione NON originale
- Usare i18n per messaggi

**Azione 4 - Aggiungere Componente Modal** (dopo riga ~4000):
- Import `PositionSelectionModal`
- Render condizionale modal

**Rollback**: 
- Rimuovere stati
- Ripristinare funzioni originali
- Rimuovere componente

---

### STEP 5: Backend - Salvataggio ⭐⭐⭐

**File**: `app/api/supabase/save-player/route.js`

**Azione**: Aggiungere campo `original_positions` a `playerData` (riga 97-143)

**Modifica**:
```javascript
original_positions: Array.isArray(player.original_positions) 
  ? player.original_positions 
  : (player.position ? [{ position: player.position, competence: "Alta" }] : []),
```

**Gestione Update** (riga 159-253):
```javascript
// Se giocatore esiste già, NON sovrascrivere original_positions
if (existingPlayerInSlot) {
  delete playerData.original_positions
}
```

**Rollback**: Rimuovere campo `original_positions`

---

### STEP 6: Backend - Adattamento Posizione ⭐⭐

**File**: `app/api/supabase/assign-player-to-slot/route.js`

**Azione 1 - Recupero Formazione Layout** (prima di riga 51):
```javascript
// Recupera formazione layout per calcolare slotPosition
const { data: formationLayout } = await admin
  .from('formation_layout')
  .select('slot_positions')
  .eq('user_id', userId)
  .maybeSingle()

const slotPosition = formationLayout?.slot_positions?.[slot_index]?.position || null
```

**Azione 2 - Modificare Update** (riga 190-204):
- Adattare `position` automaticamente allo slot
- Salvare `original_positions` se vuoto

**Azione 3 - Modificare Insert** (riga 216-237):
- Adattare `position` automaticamente allo slot
- Salvare `original_positions` da `player_data`

**Rollback**: 
- Rimuovere recupero `formationLayout`
- Ripristinare update solo `slot_index`

---

### STEP 7: Backend - Reset Posizione ⭐⭐

**File**: `app/api/supabase/remove-player-from-slot/route.js`

**Azione 1 - Recupero `original_positions`** (riga 40-47):
```javascript
.select('id, user_id, player_name, age, slot_index, original_positions, position')
```

**Azione 2 - Reset `position`** (riga 89-95):
```javascript
const originalPosition = Array.isArray(player.original_positions) && player.original_positions.length > 0
  ? player.original_positions[0].position
  : player.position

.update({
  slot_index: null,
  position: originalPosition,
  updated_at: new Date().toISOString()
})
```

**Rollback**: 
- Ripristinare select senza `original_positions`, `position`
- Ripristinare update solo `slot_index`

---

### STEP 8: Helper - Prompt IA (DISCRETO) ⭐

**File**: `lib/countermeasuresHelper.js`

**Azione 1 - Aggiungere Funzione Helper** (prima di `generateCountermeasuresPrompt`):
```javascript
function isPositionOriginal(currentPosition, originalPositions) {
  // ... vedi DOCUMENTAZIONE_MODIFICHE_POSIZIONI_MULTIPLE.md
}
```

**Azione 2 - Modificare Prompt** (riga 79-84):
- Verificare se posizione è originale
- Mostrare info discreta (NON "ATTENZIONE")
- Solo se NON originale, aggiungere `(Posizioni originali: ...)`

**Rollback**: 
- Rimuovere funzione `isPositionOriginal`
- Ripristinare prompt originale

---

## ✅ CHECKLIST IMPLEMENTAZIONE FINALE

### Pre-Implementazione
- [x] Analisi completa route/endpoint
- [x] Verifica i18n esistente
- [x] Documentazione rollback completa
- [x] Documentazione modifiche completa
- [x] Verifica retrocompatibilità

### Database
- [ ] Creare file `migrations/add_original_positions_column.sql`
- [ ] Eseguire migrazione in Supabase Dashboard
- [ ] Verificare che colonna sia creata
- [ ] Verificare che indice GIN sia creato

### i18n
- [ ] Aggiungere chiavi IT in `lib/i18n.js`
- [ ] Aggiungere chiavi EN in `lib/i18n.js`
- [ ] Verificare che tutte le chiavi siano presenti

### Componente
- [ ] Creare `components/PositionSelectionModal.jsx`
- [ ] Implementare lista posizioni con checkbox
- [ ] Implementare dropdown competenza
- [ ] Implementare validazione
- [ ] Implementare i18n

### Frontend
- [ ] Aggiungere stati in `app/gestione-formazione/page.jsx`
- [ ] Modificare `handleUploadPlayerToSlot` (modal selezione)
- [ ] Modificare `handleAssignFromReserve` (verifica posizioni)
- [ ] Aggiungere componente modal in `page.jsx`
- [ ] Import `PositionSelectionModal`

### Backend
- [ ] Modificare `save-player` (salvare `original_positions`)
- [ ] Modificare `assign-player-to-slot` (adattare `position`)
- [ ] Modificare `remove-player-from-slot` (reset `position`)

### Helper
- [ ] Aggiungere funzione `isPositionOriginal` in `countermeasuresHelper.js`
- [ ] Modificare prompt (DISCRETO)

### Test
- [ ] Testare estrazione card → modal selezione → salvataggio
- [ ] Testare assegnazione con posizione originale (nessuna conferma)
- [ ] Testare assegnazione con posizione NON originale (conferma)
- [ ] Testare rimozione giocatore (reset position)
- [ ] Testare generazione contromisure (verificare discrezione IA)
- [ ] Testare retrocompatibilità (giocatori esistenti)
- [ ] Testare i18n (cambio lingua IT/EN)
- [ ] Testare drag & drop (verificare che funzioni)
- [ ] Testare tutte le funzionalità esistenti (verificare che nulla si rompa)

---

## 🚨 ACCORTEZZE CRITICHE

### 1. **Retrocompatibilità**

**SEMPRE usare fallback**:
```javascript
const originalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
  ? p.original_positions
  : (p.position ? [{ position: p.position, competence: "Alta" }] : [])
```

---

### 2. **i18n - Sempre 2 Lingue**

**Verifica**:
- Ogni nuova chiave deve avere versione IT e EN
- Usare `t()` per tutte le stringhe
- Testare cambio lingua

---

### 3. **Non Rompere Funzionalità Esistenti**

**Testare**:
- Drag & drop
- Salvataggio formazione
- Generazione contromisure
- Caricamento card
- Assegnazione giocatore
- Rimozione giocatore

---

### 4. **Discrezione IA**

**IMPORTANTE**:
- IA NON deve dire "ATTENZIONE" o "ERRORE"
- Mostrare solo info discreta: `(Posizioni originali: ...)`
- Cliente ha già confermato, IA accetta scelta

---

## 📝 NOTE FINALI

1. **Tutte le modifiche devono essere retrocompatibili**
2. **Tutte le stringhe devono essere in i18n (IT/EN)**
3. **Non rompere funzionalità esistenti**
4. **Testare tutto prima di commit**
5. **Rollback sempre disponibile**

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: ✅ **PRONTO PER IMPLEMENTAZIONE**
