# 📝 Documentazione Modifiche: Posizioni Multiple Originali

**Data**: 24 Gennaio 2026  
**Scopo**: Documentare TUTTE le modifiche al codice e database

---

## 🗄️ MODIFICHE DATABASE

### 1. **Aggiunta Colonna `original_positions`**

**File SQL**: `migrations/add_original_positions_column.sql` (NUOVO)

**SQL da Eseguire**:
```sql
-- ============================================
-- MIGRAZIONE: Aggiungi colonna original_positions
-- Data: 24 Gennaio 2026
-- ============================================

-- 1. Aggiungi colonna original_positions (JSONB array)
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS original_positions JSONB DEFAULT '[]'::jsonb;

-- 2. Commento colonna
COMMENT ON COLUMN players.original_positions IS 'Array di posizioni originali dalla card: [{"position": "AMF", "competence": "Alta"}, ...]';

-- 3. Indice GIN per query efficienti
CREATE INDEX IF NOT EXISTS idx_players_original_positions 
ON players USING GIN (original_positions);

-- 4. Verifica colonna creata
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name = 'original_positions';
-- Deve restituire 1 riga con data_type = 'jsonb'
```

**Come Eseguire**:
1. Apri Supabase Dashboard
2. Vai a SQL Editor
3. Esegui script sopra
4. Verifica che colonna sia creata

**Rollback**:
```sql
ALTER TABLE players DROP COLUMN IF EXISTS original_positions;
DROP INDEX IF EXISTS idx_players_original_positions;
```

---

## 📁 MODIFICHE FILE ROUTE

### 1. **`app/api/supabase/save-player/route.js`**

**Righe Modificate**: 97-143 (`playerData`)

**Modifica**:
```javascript
const playerData = {
  // ... dati esistenti ...
  position: toText(player.position),  // Posizione principale
  original_positions: Array.isArray(player.original_positions) 
    ? player.original_positions 
    : (player.position ? [{ position: player.position, competence: "Alta" }] : []),  // NUOVO
  // ... resto campi esistenti ...
}
```

**Gestione Update** (riga 159-253):
```javascript
// Se giocatore esiste già, NON sovrascrivere original_positions (mantieni originali)
if (existingPlayerInSlot) {
  // Mantieni original_positions esistente (non cambiare)
  delete playerData.original_positions
}
```

**Rollback**: Rimuovere campo `original_positions` da `playerData`

---

### 2. **`app/api/supabase/assign-player-to-slot/route.js`**

**Righe Modificate**: 
- Prima di riga 51: Aggiungere recupero `formationLayout`
- Riga 191-196: Modificare update per adattare `position`
- Riga 213-237: Modificare insert per adattare `position` e salvare `original_positions`

**Modifica 1 - Recupero Formazione Layout** (prima di riga 51):
```javascript
// Recupera formazione layout per calcolare slotPosition
const { data: formationLayout } = await admin
  .from('formation_layout')
  .select('slot_positions')
  .eq('user_id', userId)
  .maybeSingle()

// Calcola posizione richiesta dallo slot
const slotPosition = formationLayout?.slot_positions?.[slot_index]?.position || null
```

**Modifica 2 - Update per `player_id`** (riga 190-204):
```javascript
// Recupera giocatore con original_positions
const { data: player } = await admin
  .from('players')
  .select('position, original_positions')
  .eq('id', player_id)
  .single()

const updateData = {
  slot_index: slot_index,
  position: slotPosition || player.position  // NUOVO: adatta automaticamente allo slot
}

// Se original_positions è NULL o vuoto, salvalo (prima volta)
if ((!player.original_positions || player.original_positions.length === 0) && player.position) {
  updateData.original_positions = [{ position: player.position, competence: "Alta" }]
}

const { error: updateError } = await admin
  .from('players')
  .update(updateData)
  .eq('id', player_id)
  .eq('user_id', userId)
```

**Modifica 3 - Insert per `player_data`** (riga 216-237):
```javascript
const playerData = {
  // ... dati esistenti ...
  position: slotPosition || toText(player_data.position),  // NUOVO: adatta a slot
  original_positions: Array.isArray(player_data.original_positions) 
    ? player_data.original_positions 
    : (player_data.position ? [{ position: player_data.position, competence: "Alta" }] : []),  // NUOVO
  slot_index: slot_index,
  // ... resto dati esistenti ...
}
```

**Rollback**: 
- Rimuovere recupero `formationLayout`
- Ripristinare update solo `slot_index`
- Ripristinare insert senza adattamento `position`

---

### 3. **`app/api/supabase/remove-player-from-slot/route.js`**

**Righe Modificate**: 40-47, 90-95

**Modifica 1 - Recupero `original_positions`** (riga 40-47):
```javascript
// Verifica che il giocatore appartenga all'utente
const { data: player, error: fetchError } = await admin
  .from('players')
  .select('id, user_id, player_name, age, slot_index, original_positions, position')  // NUOVO: aggiungere original_positions, position
  .eq('id', player_id)
  .eq('user_id', userId)
  .single()
```

**Modifica 2 - Reset `position`** (riga 89-95):
```javascript
// Reset a original_position (prima posizione originale o position attuale)
const originalPosition = Array.isArray(player.original_positions) && player.original_positions.length > 0
  ? player.original_positions[0].position
  : player.position

// Rimuovi da slot (reset position a originale)
const { error: updateError } = await admin
  .from('players')
  .update({
    slot_index: null,
    position: originalPosition,  // NUOVO: reset a originale
    updated_at: new Date().toISOString()
  })
  .eq('id', player_id)
  .eq('user_id', userId)
```

**Rollback**: 
- Ripristinare select senza `original_positions`, `position`
- Ripristinare update solo `slot_index`

---

## 📁 MODIFICHE FILE FRONTEND

### 1. **`app/gestione-formazione/page.jsx`**

#### A. **Aggiunta Stati** (dopo riga ~100)

**Nuovi Stati**:
```javascript
const [showPositionSelectionModal, setShowPositionSelectionModal] = useState(false)
const [extractedPlayerData, setExtractedPlayerData] = useState(null)
const [selectedOriginalPositions, setSelectedOriginalPositions] = useState([])
```

**Rollback**: Rimuovere questi 3 stati

---

#### B. **Modifica `handleUploadPlayerToSlot`** (riga 514-713)

**Modifica**: Dopo estrazione dati (riga 613), invece di salvare direttamente, mostrare modal selezione posizioni

**Aggiungere Dopo Riga 613**:
```javascript
// Dopo estrazione dati, mostra modal selezione posizioni
if (playerData && playerData.player_name) {
  // Pre-seleziona posizione principale
  const mainPosition = playerData.position || 'AMF'
  setSelectedOriginalPositions([{
    position: mainPosition,
    competence: 'Alta'
  }])
  
  setExtractedPlayerData({
    ...playerData,
    photo_slots: photoSlots,
    slot_index: selectedSlot.slot_index
  })
  
  setShowPositionSelectionModal(true)
  setUploadingPlayer(false)
  return // Non salvare ancora
}
```

**Modifica Salvataggio** (riga 676-690):
```javascript
// Salva giocatore con original_positions (chiamato da modal conferma)
const handleSavePlayerWithPositions = async (playerDataWithPositions) => {
  // ... codice salvataggio esistente ma con original_positions incluso ...
  body: JSON.stringify({
    player: {
      ...playerDataWithPositions,
      original_positions: selectedOriginalPositions,  // NUOVO
      slot_index: selectedSlot.slot_index,
      photo_slots: photoSlots
    }
  })
}
```

**Rollback**: 
- Rimuovere logica modal selezione
- Ripristinare salvataggio diretto dopo estrazione

---

#### C. **Modifica `handleAssignFromReserve`** (riga 207-319)

**Modifica**: Aggiungere verifica posizioni originali e conferma se NON originale

**Aggiungere Dopo Riga 215**:
```javascript
const playerToAssign = riserve.find(p => p.id === playerId)
if (!playerToAssign) {
  throw new Error('Giocatore non trovato nelle riserve')
}

// Recupera original_positions
const originalPositions = Array.isArray(playerToAssign.original_positions) 
  ? playerToAssign.original_positions 
  : (playerToAssign.position ? [{ position: playerToAssign.position, competence: "Alta" }] : [])

// Calcola posizione richiesta dallo slot
const slotPosition = selectedSlot.position

// Verifica se posizione slot è originale
const isOriginalPosition = originalPositions.some(
  op => op.position && op.position.toUpperCase() === slotPosition.toUpperCase()
)

// Se NON è originale, chiedi conferma con competenza
if (!isOriginalPosition && originalPositions.length > 0) {
  const originalPosList = originalPositions.map(op => op.position).join(', ')
  const stats = playerToAssign.base_stats || {}
  
  // Cerca competenza per posizione slot
  const competenceInfo = originalPositions.find(
    op => op.position && op.position.toUpperCase() === slotPosition.toUpperCase()
  )
  const competence = competenceInfo?.competence || "Nessuna"
  
  // Costruisci messaggio con statistiche rilevanti
  let statsWarning = ''
  if (slotPosition === 'DC' && stats.difesa) {
    statsWarning = `\nStatistiche non ottimali per ${slotPosition}:\n- Difesa: ${stats.difesa} (richiesto: 80+)\n`
  } else if (slotPosition === 'P' && stats.finalizzazione) {
    statsWarning = `\nStatistiche non ottimali per ${slotPosition}:\n- Finalizzazione: ${stats.finalizzazione} (richiesto: 85+)\n`
  }
  
  // Alert con warning e competenza (i18n)
  const confirmMessage = t('confirmPositionChange', {
    playerName: playerToAssign.player_name,
    originalPositions: originalPosList,
    slotPosition: slotPosition,
    competence: competence,
    statsWarning: statsWarning
  })
  
  const confirmed = window.confirm(confirmMessage)
  if (!confirmed) {
    // Annulla, non spostare giocatore
    return
  }
  // Se conferma, cliente si prende responsabilità → procedi
}
```

**Rollback**: Rimuovere verifica posizioni e conferma

---

#### D. **Aggiunta Componente Modal** (dopo riga ~4000)

**Nuovo Componente**:
```javascript
{showPositionSelectionModal && extractedPlayerData && (
  <PositionSelectionModal
    playerName={extractedPlayerData.player_name}
    overallRating={extractedPlayerData.overall_rating}
    mainPosition={extractedPlayerData.position}
    selectedPositions={selectedOriginalPositions}
    onPositionsChange={setSelectedOriginalPositions}
    onConfirm={async () => {
      await handleSavePlayerWithPositions({
        ...extractedPlayerData,
        original_positions: selectedOriginalPositions
      })
      setShowPositionSelectionModal(false)
      setExtractedPlayerData(null)
      setSelectedOriginalPositions([])
    }}
    onCancel={() => {
      setShowPositionSelectionModal(false)
      setExtractedPlayerData(null)
      setSelectedOriginalPositions([])
    }}
  />
)}
```

**Rollback**: Rimuovere componente e import

---

### 2. **`components/PositionSelectionModal.jsx`** (NUOVO FILE)

**File Nuovo**: Creare componente modal per selezione posizioni

**Contenuto**: Vedi `ANALISI_ESTRAZIONE_VS_INPUT_MANUALE.md` per codice completo

**Rollback**: Eliminare file

---

## 📁 MODIFICHE FILE HELPER

### 1. **`lib/countermeasuresHelper.js`**

**Righe Modificate**: 79-84 (sezione titolari)

**Modifica**: Aggiungere funzione helper e modificare prompt (DISCRETO)

**Aggiungere Funzione Helper** (prima di `generateCountermeasuresPrompt`):
```javascript
/**
 * Verifica se una posizione è tra quelle originali del giocatore
 * @param {string} currentPosition - Posizione attuale (es. "LWF")
 * @param {Array} originalPositions - Array di posizioni originali (es. [{"position": "AMF", "competence": "Alta"}, ...])
 * @returns {Object} - { isOriginal: boolean, competence: string | null }
 */
function isPositionOriginal(currentPosition, originalPositions) {
  if (!currentPosition || !Array.isArray(originalPositions) || originalPositions.length === 0) {
    return { isOriginal: false, competence: null }
  }
  
  const found = originalPositions.find(
    op => op.position && op.position.toUpperCase() === currentPosition.toUpperCase()
  )
  
  if (found) {
    return { 
      isOriginal: true, 
      competence: found.competence || "Alta" 
    }
  }
  
  return { isOriginal: false, competence: null }
}
```

**Modifica Prompt** (riga 79-84):
```javascript
titolari.forEach((p, idx) => {
  const currentPosition = p.position // Posizione attuale (adattata allo slot)
  const originalPositions = Array.isArray(p.original_positions) ? p.original_positions : []
  
  // Verifica se posizione attuale è tra quelle originali
  const positionCheck = isPositionOriginal(currentPosition, originalPositions)
  const isOriginalPosition = positionCheck.isOriginal
  
  const slot = p.slot_index != null ? ` slot ${p.slot_index}` : ''
  const sk = (p.skills && Array.isArray(p.skills) ? p.skills.slice(0, 2).join(', ') : '') || (p.com_skills && Array.isArray(p.com_skills) ? p.com_skills.slice(0, 1).join(', ') : '')
  const skillsPart = sk ? ` (${sk})` : ''
  
  // DISCRETO: Mostra solo info base, NON dire esplicitamente "ATTENZIONE" nel prompt
  rosterText += `- [${p.id}] ${p.player_name || 'N/A'} - ${currentPosition || 'N/A'} - Overall ${p.overall_rating || 'N/A'}${skillsPart}${slot}\n`
  
  // Solo se NON è originale, aggiungi info discreta (per analisi IA, NON per cliente)
  if (!isOriginalPosition && originalPositions.length > 0) {
    const originalPosList = originalPositions.map(op => op.position).join(', ')
    // Info discreta per IA (non mostrare esplicitamente "ATTENZIONE")
    rosterText += `  (Posizioni originali: ${originalPosList})\n`
  }
})
```

**Rollback**: 
- Rimuovere funzione `isPositionOriginal`
- Ripristinare prompt originale

---

## 📁 MODIFICHE FILE i18n

### 1. **`lib/i18n.js`**

**Righe Modificate**: Aggiungere nuove chiavi dopo riga ~1565

**Nuove Chiavi IT**:
```javascript
// Position Selection Modal
selectOriginalPositions: 'Seleziona Posizioni Originali',
positionSelectionTitle: 'Seleziona le posizioni in cui questo giocatore può giocare',
positionSelectionDescription: 'Quali posizioni può giocare questo giocatore? (Seleziona tutte quelle evidenziate nella card)',
competenceLevel: 'Livello Competenza',
competenceHigh: 'Alta',
competenceMedium: 'Intermedia',
competenceLow: 'Bassa',
mainPosition: 'Posizione Principale',
selectPositions: 'Seleziona Posizioni',
save: 'Salva',
cancel: 'Annulla',

// Position Confirmation
confirmPositionChange: '${playerName} è ${originalPositions} originale, ma lo stai spostando in slot ${slotPosition}.\n\n${slotPosition} NON è una posizione originale.\nCompetenza in ${slotPosition}: ${competence}\n${statsWarning}Vuoi comunque usarlo come ${slotPosition}? (Performance ridotta)\n\nSe confermi, ti prendi la responsabilità e il sistema accetta la scelta.',
positionNotOriginal: '${slotPosition} NON è una posizione originale',
positionOriginal: 'Posizione originale',
```

**Nuove Chiavi EN**:
```javascript
// Position Selection Modal
selectOriginalPositions: 'Select Original Positions',
positionSelectionTitle: 'Select the positions this player can play',
positionSelectionDescription: 'Which positions can this player play? (Select all those highlighted on the card)',
competenceLevel: 'Competence Level',
competenceHigh: 'High',
competenceMedium: 'Medium',
competenceLow: 'Low',
mainPosition: 'Main Position',
selectPositions: 'Select Positions',
save: 'Save',
cancel: 'Cancel',

// Position Confirmation
confirmPositionChange: '${playerName} is ${originalPositions} original, but you are moving them to slot ${slotPosition}.\n\n${slotPosition} is NOT an original position.\nCompetence in ${slotPosition}: ${competence}\n${statsWarning}Do you still want to use them as ${slotPosition}? (Reduced performance)\n\nIf you confirm, you take responsibility and the system accepts the choice.',
positionNotOriginal: '${slotPosition} is NOT an original position',
positionOriginal: 'Original position',
```

**Rollback**: Rimuovere tutte le chiavi aggiunte

---

## ✅ CHECKLIST MODIFICHE

### Database
- [ ] Creare file `migrations/add_original_positions_column.sql`
- [ ] Eseguire migrazione in Supabase Dashboard
- [ ] Verificare che colonna sia creata
- [ ] Verificare che indice GIN sia creato

### Route
- [ ] Modificare `app/api/supabase/save-player/route.js` (aggiungere `original_positions`)
- [ ] Modificare `app/api/supabase/assign-player-to-slot/route.js` (adattare `position`, salvare `original_positions`)
- [ ] Modificare `app/api/supabase/remove-player-from-slot/route.js` (reset `position`)

### Frontend
- [ ] Aggiungere stati in `app/gestione-formazione/page.jsx`
- [ ] Modificare `handleUploadPlayerToSlot` (mostrare modal selezione)
- [ ] Modificare `handleAssignFromReserve` (verifica posizioni, conferma)
- [ ] Creare componente `components/PositionSelectionModal.jsx`
- [ ] Aggiungere componente modal in `page.jsx`

### Helper
- [ ] Aggiungere funzione `isPositionOriginal` in `lib/countermeasuresHelper.js`
- [ ] Modificare prompt in `lib/countermeasuresHelper.js` (DISCRETO)

### i18n
- [ ] Aggiungere chiavi IT in `lib/i18n.js`
- [ ] Aggiungere chiavi EN in `lib/i18n.js`

### Test
- [ ] Testare estrazione card → modal selezione → salvataggio
- [ ] Testare assegnazione giocatore con posizione originale (nessuna conferma)
- [ ] Testare assegnazione giocatore con posizione NON originale (conferma)
- [ ] Testare rimozione giocatore (reset position)
- [ ] Testare generazione contromisure (verificare discrezione IA)
- [ ] Testare retrocompatibilità (giocatori esistenti senza `original_positions`)

---

## 🚨 ACCORTEZZE

### 1. **Retrocompatibilità**

**Problema**: Giocatori esistenti non hanno `original_positions`.

**Soluzione**:
```javascript
// Sempre usare fallback
const originalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
  ? p.original_positions
  : (p.position ? [{ position: p.position, competence: "Alta" }] : [])
```

---

### 2. **i18n - Sempre 2 Lingue**

**Verifica**:
- Ogni nuova chiave deve avere versione IT e EN
- Usare `t()` per tutte le stringhe mostrate al cliente
- Testare cambio lingua

---

### 3. **Non Rompere Funzionalità Esistenti**

**Verifica**:
- Testare tutte le funzionalità esistenti dopo modifiche
- Verificare che drag & drop funzioni
- Verificare che salvataggio formazione funzioni
- Verificare che generazione contromisure funzioni

---

## 📝 NOTE IMPORTANTI

1. **Tutte le modifiche devono essere retrocompatibili**
2. **Tutte le stringhe devono essere in i18n (IT/EN)**
3. **Non rompere funzionalità esistenti**
4. **Testare tutto prima di commit**

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: 📝 **DOCUMENTAZIONE COMPLETA - Pronta per Implementazione**
