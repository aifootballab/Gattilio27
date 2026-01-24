# 🔍 AUDIT COERENZA: Frontend, Backend, Database
**Data**: 24 Gennaio 2026  
**Scope**: Verifica allineamento `original_positions` e logica posizioni dinamiche

---

## ✅ 1. DATABASE (Supabase)

### 1.1 Struttura Colonna `original_positions`
**File**: `migrations/add_original_positions_column.sql`

```sql
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS original_positions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN players.original_positions IS 
'Array di posizioni originali dalla card: [{"position": "AMF", "competence": "Alta"}, ...]';

CREATE INDEX IF NOT EXISTS idx_players_original_positions 
ON players USING GIN (original_positions);
```

**✅ Status**: 
- Tipo: `JSONB` ✅
- Default: `[]` ✅
- Indice GIN: Creato ✅
- Formato: `[{ position: string, competence: "Alta"|"Intermedia"|"Bassa" }]` ✅

---

## ✅ 2. BACKEND API

### 2.1 Estrazione (`/api/extract-player/route.js`)

**Prompt AI** (righe 157-176):
- ✅ Istruisce AI a estrarre `original_positions` dal mini-campo
- ✅ Mappa zone verdi → competenza "Alta/Intermedia/Bassa"
- ✅ Formato JSON: `{ position: "AMF", original_positions: [...] }`

**Normalizzazione** (righe 293-306):
```javascript
// Validazione e normalizzazione original_positions
if (normalizedPlayer.original_positions && !Array.isArray(normalizedPlayer.original_positions)) {
  normalizedPlayer.original_positions = []
}
if (!normalizedPlayer.original_positions || normalizedPlayer.original_positions.length === 0) {
  if (normalizedPlayer.position) {
    normalizedPlayer.original_positions = [{ position: normalizedPlayer.position, competence: "Alta" }]
  } else {
    normalizedPlayer.original_positions = []
  }
}
```

**✅ Status**: 
- Estrae `original_positions` ✅
- Normalizza a array ✅
- Fallback a `position` principale se vuoto ✅

---

### 2.2 Salvataggio (`/api/supabase/save-player/route.js`)

**Nuovo Giocatore** (righe 143-146):
```javascript
original_positions: Array.isArray(player.original_positions) 
  ? player.original_positions 
  : (player.position ? [{ position: player.position, competence: "Alta" }] : [])
```

**Update Giocatore Esistente** (riga 167):
```javascript
// Se giocatore esiste già, NON sovrascrivere original_positions (mantieni originali)
delete playerData.original_positions
```

**✅ Status**: 
- Salva `original_positions` per nuovi giocatori ✅
- NON sovrascrive `original_positions` durante update ✅
- Mantiene integrità dati originali ✅

---

### 2.3 Assegnazione Slot (`/api/supabase/assign-player-to-slot/route.js`)

**Giocatore Esistente** (righe 200-210):
```javascript
const updateData = {
  slot_index: slot_index,
  position: slotPosition || player.position,  // Adatta automaticamente allo slot
  updated_at: new Date().toISOString()
}

// Se original_positions è NULL o vuoto, salvalo (prima volta)
if ((!player.original_positions || player.original_positions.length === 0) && player.position) {
  updateData.original_positions = [{ position: player.position, competence: "Alta" }]
}
```

**Nuovo Giocatore** (righe 250-253):
```javascript
original_positions: Array.isArray(player_data.original_positions) 
  ? player_data.original_positions 
  : (player_data.position ? [{ position: player_data.position, competence: "Alta" }] : [])
```

**✅ Status**: 
- Aggiorna `position` in base a `slotPosition` ✅
- Salva `original_positions` se vuoto (prima volta) ✅
- Mantiene `original_positions` esistenti ✅

---

### 2.4 Rimozione Slot (`/api/supabase/remove-player-from-slot/route.js`)

**Reset Position** (righe 89-99):
```javascript
// Reset a original_position (prima posizione originale o position attuale)
const originalPosition = Array.isArray(player.original_positions) && player.original_positions.length > 0
  ? player.original_positions[0].position
  : player.position

await admin
  .from('players')
  .update({
    slot_index: null,
    position: originalPosition,  // Reset a originale
    updated_at: new Date().toISOString()
  })
```

**✅ Status**: 
- Reset `position` a prima `original_position` ✅
- Fallback a `position` attuale se `original_positions` vuoto ✅

---

## ✅ 3. FRONTEND (`app/gestione-formazione/page.jsx`)

### 3.1 Caricamento Dati (righe 125-126)

```javascript
original_positions: p.original_positions || null  // NUOVO: posizioni originali
```

**✅ Status**: Carica `original_positions` da database ✅

---

### 3.2 Calcolo Posizione Dinamica (righe 207-259)

**Funzione**: `calculatePositionFromCoordinates(x, y, attackSlots)`

**Logica**:
- ✅ Portiere: `y > 80` → `PT`
- ✅ Difesa: `y 60-80` → `TD/TS/DC` (in base a `x`)
- ✅ Centrocampo: `y 40-60` → `EDE/ESA/AMF/MED` (in base a `x`, `y`)
- ✅ Attacco: `y < 40` → `CLD/CLS/P/SP/CF` (in base a `x`, `y`, logica relativa)

**Logica Relativa P vs SP** (righe 236-249):
```javascript
if (attackSlots && attackSlots.length > 1) {
  const sorted = [...attackSlots].sort((a, b) => a.y - b.y)
  const currentIndex = sorted.findIndex(s => Math.abs(s.x - x) < 5 && Math.abs(s.y - y) < 5)
  
  if (currentIndex === 0) return 'P'   // Più avanzato
  else if (currentIndex === 1) return 'SP'  // Secondo
  else return 'SP'  // Altri
}
```

**✅ Status**: 
- Calcola ruolo da coordinate ✅
- Logica relativa P vs SP ✅
- Fallback assoluto se < 2 giocatori in attacco ✅

---

### 3.3 Aggiornamento Posizione Drag (righe 261-296)

**Funzione**: `handlePositionChange(slotIndex, newPosition)`

**Logica**:
1. ✅ Raccoglie tutti gli slot in attacco (y < 40)
2. ✅ Calcola nuovo ruolo con logica relativa
3. ✅ Aggiorna `customPositions[slotIndex]` con `{ x, y, position }`

**✅ Status**: Aggiorna ruolo in tempo reale durante drag ✅

---

### 3.4 Salvataggio Posizioni Personalizzate (righe 1154-1315)

**Funzione**: `handleSaveCustomPositions()`

**Flusso**:
1. ✅ Merge `customPositions` con `slot_positions` esistenti
2. ✅ Raccoglie slot in attacco per logica relativa P vs SP
3. ✅ Calcola `position` per ogni slot modificato
4. ✅ **Verifica `original_positions`** per ogni giocatore spostato
5. ✅ Se ruolo NON originale → alert: "Non mi risulta posso fare questo ruolo, aggiungi competenza?"
6. ✅ Se conferma → aggiunge `{ position: newRole, competence: "Intermedia" }` a `original_positions`
7. ✅ Aggiorna `player.position` in database via `/api/supabase/assign-player-to-slot`
8. ✅ Salva `slot_positions` aggiornati

**Codice Verifica** (righe 1201-1233):
```javascript
const originalPositions = Array.isArray(playerInSlot.original_positions) && playerInSlot.original_positions.length > 0
  ? playerInSlot.original_positions
  : (playerInSlot.position ? [{ position: playerInSlot.position, competence: "Alta" }] : [])

const isOriginalRole = originalPositions.some(
  op => op.position && op.position.toUpperCase() === newRole.toUpperCase()
)

if (!isOriginalRole && originalPositions.length > 0) {
  // Aggiunge a playersOutOfRole e playersToUpdate
}
```

**Codice Aggiornamento** (righe 1251-1288):
```javascript
if (!roleExists) {
  const updatedOriginalPositions = [
    ...currentOriginalPositions,
    { position: newRole, competence: "Intermedia" }
  ]
  await supabase
    .from('players')
    .update({ original_positions: updatedOriginalPositions })
    .eq('id', playerId)
}
```

**✅ Status**: 
- Verifica `original_positions` ✅
- Alert chiaro ✅
- Aggiunge competenza se confermato ✅
- Aggiorna database ✅

---

### 3.5 Assegnazione da Riserve (righe 298-420)

**Funzione**: `handleAssignFromReserve(playerId)`

**Verifica Original Positions** (righe 379-420):
```javascript
const originalPositions = Array.isArray(playerToAssign.original_positions) && playerToAssign.original_positions.length > 0
  ? playerToAssign.original_positions
  : (playerToAssign.position ? [{ position: playerToAssign.position, competence: "Alta" }] : [])

const slotPosition = selectedSlot.position

const isOriginalRole = originalPositions.some(
  op => op.position && op.position.toUpperCase() === slotPosition.toUpperCase()
)

if (!isOriginalRole && originalPositions.length > 0) {
  // Mostra alert di conferma
  const confirmed = window.confirm(confirmMessage)
  if (!confirmed) {
    setAssigning(false)
    return
  }
}
```

**✅ Status**: 
- Verifica `original_positions` prima di assegnare ✅
- Chiede conferma se ruolo non originale ✅
- Rispetta scelta cliente ✅

---

### 3.6 Visualizzazione Sigla Ruolo (righe 2306-2310, 2495-2510)

**Componente**: `SlotCard`

**Props**:
```javascript
customPosition={customPos}  // Passa customPosition per mostrare sigla ruolo
```

**Display** (righe 2495-2510):
```javascript
{/* Sigla ruolo sopra il nome */}
<div style={{ fontSize: 'clamp(8px, 0.9vw, 10px)', ... }}>
  {displayPosition}  // Es: "CF", "SP", "ESA"
</div>
{/* Nome giocatore */}
<div style={{ fontSize: 'clamp(10px, 1.1vw, 13px)', ... }}>
  {getDisplayName(player.player_name)}
</div>
```

**Calcolo `displayPosition`** (righe 2306-2310):
```javascript
const displayPosition = customPosition?.position || position?.position || '?'
```

**✅ Status**: 
- Mostra sigla ruolo sopra nome ✅
- Aggiorna in tempo reale durante drag ✅
- Fallback a `position` slot se `customPosition` non presente ✅

---

## 🔍 4. VERIFICHE CROSS-COMPONENT

### 4.1 Flusso Completo: Drag & Drop → Salvataggio

**Scenario**: Cliente trascina terzino (TD) in attacco (y=20, x=50)

1. **Frontend - Drag**:
   - ✅ `handlePositionChange` calcola `newRole = "P"` (logica relativa)
   - ✅ Aggiorna `customPositions[slotIndex] = { x: 50, y: 20, position: "P" }`
   - ✅ `SlotCard` mostra sigla "P" sopra nome

2. **Frontend - Salvataggio**:
   - ✅ `handleSaveCustomPositions` verifica `original_positions = [{TD}, {TS}]`
   - ✅ `"P"` NON è tra originali → alert
   - ✅ Cliente conferma → aggiunge `{ position: "P", competence: "Intermedia" }`
   - ✅ Aggiorna `original_positions` in database
   - ✅ Chiama `/api/supabase/assign-player-to-slot` per aggiornare `player.position = "P"`

3. **Backend - Assegnazione**:
   - ✅ `/api/supabase/assign-player-to-slot` aggiorna `player.position = "P"`
   - ✅ Mantiene `original_positions` aggiornati (non sovrascrive)

4. **Database**:
   - ✅ `players.position = "P"` ✅
   - ✅ `players.original_positions = [{TD}, {TS}, {P: "Intermedia"}]` ✅
   - ✅ `formation_layout.slot_positions[slotIndex] = {x: 50, y: 20, position: "P"}` ✅

**✅ Status**: Flusso completo coerente ✅

---

### 4.2 Flusso: Assegnazione da Riserve

**Scenario**: Cliente assegna giocatore con `original_positions = [{AMF}, {LWF}]` a slot `position = "CF"`

1. **Frontend**:
   - ✅ `handleAssignFromReserve` verifica `original_positions`
   - ✅ `"CF"` NON è tra originali → alert
   - ✅ Cliente conferma → procede

2. **Backend**:
   - ✅ `/api/supabase/assign-player-to-slot` aggiorna `player.position = "CF"` (da `slotPosition`)
   - ✅ Mantiene `original_positions` esistenti (non aggiunge automaticamente)

**⚠️ Nota**: In questo caso, `original_positions` NON viene aggiornato automaticamente. Solo durante drag & drop in edit mode viene aggiunta competenza.

**✅ Status**: Coerente con logica (solo drag & drop aggiunge competenza) ✅

---

### 4.3 Flusso: Rimozione da Slot

**Scenario**: Cliente rimuove giocatore da slot

1. **Frontend**:
   - ✅ `handleRemoveFromSlot` chiama `/api/supabase/remove-player-from-slot`

2. **Backend**:
   - ✅ Reset `player.position` a prima `original_position`
   - ✅ Reset `slot_index = null`

**✅ Status**: Reset corretto ✅

---

## ⚠️ 5. POTENZIALI INCOERENZE TROVATE

### 5.1 Nessuna Incoerenza Critica ✅

Tutti i componenti sono allineati:
- ✅ Database: Struttura corretta
- ✅ Backend: Logica coerente (estrazione, salvataggio, assegnazione, rimozione)
- ✅ Frontend: Verifica `original_positions`, alert, aggiunta competenza, visualizzazione sigla

---

## 📋 6. RACCOMANDAZIONI

### 6.1 Miglioramenti Opzionali

1. **Consistenza Alert**: 
   - Attualmente: Drag & drop aggiunge competenza automaticamente se confermato
   - Assegnazione da riserve: NON aggiunge competenza (solo chiede conferma)
   - **Raccomandazione**: Considerare di aggiungere competenza anche durante assegnazione da riserve se cliente conferma

2. **Logica P vs SP**:
   - Attualmente: Logica relativa basata su `y` (più avanzato = P)
   - **Raccomandazione**: Funziona correttamente, nessuna modifica necessaria

3. **Visualizzazione Sigla**:
   - Attualmente: Mostra sigla solo durante drag (se `customPosition` presente)
   - **Raccomandazione**: Considerare di mostrare sempre sigla ruolo (anche quando non in edit mode)

---

## ✅ 7. CONCLUSIONE

**Status Generale**: ✅ **COERENTE**

Tutti i componenti (Database, Backend, Frontend) sono allineati e funzionano correttamente:
- ✅ Estrazione `original_positions` da AI
- ✅ Salvataggio e preservazione `original_positions`
- ✅ Verifica e alert per ruoli non originali
- ✅ Aggiunta competenza durante drag & drop
- ✅ Calcolo dinamico ruolo da coordinate
- ✅ Logica relativa P vs SP
- ✅ Visualizzazione sigla ruolo
- ✅ Reset a posizione originale

**Nessuna incoerenza critica rilevata.**

---

**Data Audit**: 24 Gennaio 2026  
**Versione**: 1.0
