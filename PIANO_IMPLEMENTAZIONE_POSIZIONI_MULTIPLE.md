# 📋 Piano Implementazione: Posizioni Multiple Originali

**Data**: 24 Gennaio 2026  
**Stato**: ⏸️ **IN ATTESA APPROVAZIONE UTENTE**

---

## 🎯 OBIETTIVO

Implementare sistema per gestire giocatori con **posizioni multiple originali**, distinguendo tra:
- ✅ Posizioni originali (OK, performance ottimale)
- ❌ Posizioni non originali (ATTENZIONE, performance ridotta)

**IMPORTANTE**: L'IA deve essere **discreta** - meno dice meglio è, solo quando necessario.

---

## 📊 APPROCCIO IMPLEMENTAZIONE

### Fase 1: Database ⭐⭐⭐
1. Creare migrazione SQL per colonna `original_positions`
2. Testare migrazione
3. Verificare che colonna sia creata

### Fase 2: Estrazione ⭐⭐⭐
1. Modificare prompt `extract-player` per estrarre array posizioni
2. Testare estrazione con card reale
3. Validare array

### Fase 3: Salvataggio ⭐⭐⭐
1. Modificare `save-player` per salvare `original_positions`
2. Testare salvataggio
3. Verificare retrocompatibilità

### Fase 4: Adattamento ⭐⭐
1. Modificare `assign-player-to-slot` per adattare `position`
2. Testare adattamento
3. Verificare drag & drop

### Fase 5: Reset ⭐⭐
1. Modificare `remove-player-from-slot` per resettare `position`
2. Testare reset

### Fase 6: Prompt IA (DISCRETO) ⭐
1. Modificare `countermeasuresHelper.js` per verificare posizioni
2. **IMPORTANTE**: L'IA deve essere discreta - solo quando necessario
3. Testare generazione contromisure

---

## 🔧 IMPLEMENTAZIONE DETTAGLIATA

### 1. Database - Migrazione SQL

**File**: `migrations/add_original_positions_column.sql`

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
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'original_positions';
```

**Come Eseguire**:
1. Apri Supabase Dashboard
2. Vai a SQL Editor
3. Esegui script sopra
4. Verifica che colonna sia creata

---

### 2. Estrazione - Modifica Prompt

**File**: `app/api/extract-player/route.js`

**Modifica Prompt**:
```javascript
const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai TUTTI questi dati: nome giocatore, posizione, overall rating, team, card_type, base_stats, skills, com_skills, boosters, height, weight, age, nationality, level, form, role, playing_style, ai_playstyles, matches_played, goals, assists, weak_foot_frequency, weak_foot_accuracy, injury_resistance

POSIZIONI ORIGINALI (NUOVO):
- Guarda la sezione in alto a destra della card dove sono evidenziate le posizioni/ruoli
- Estrai TUTTE le posizioni evidenziate con il loro livello di competenza
- Le posizioni possono essere evidenziate con colori diversi:
  * Verde brillante = Alta competenza
  * Verde sfumato = Intermedia competenza
  * Grigio = Bassa competenza
- Estrai sia la posizione principale (quella più grande/centrale) che tutte le posizioni secondarie

Formato JSON richiesto:
{
  "player_name": "Nome Completo",
  "position": "AMF",  // Posizione principale (quella più grande/centrale)
  "original_positions": [  // NUOVO: Array di posizioni originali dalla card
    {
      "position": "AMF",
      "competence": "Alta"  // Alta, Intermedia, Bassa (basato su colore/evidenziazione)
    },
    {
      "position": "LWF",
      "competence": "Alta"
    },
    {
      "position": "RWF",
      "competence": "Alta"
    }
  ],
  "overall_rating": 85,
  // ... resto dati ...
}

Restituisci SOLO JSON valido, senza altro testo.`
```

**Validazione**:
```javascript
// Dopo estrazione, valida original_positions
if (playerData.original_positions && !Array.isArray(playerData.original_positions)) {
  // Se non è array, converti o ignora
  playerData.original_positions = []
}

// Se array vuoto, usa position come originale
if (!playerData.original_positions || playerData.original_positions.length === 0) {
  playerData.original_positions = playerData.position 
    ? [{ position: playerData.position, competence: "Alta" }]
    : []
}
```

---

### 3. Salvataggio - Modifica `save-player`

**File**: `app/api/supabase/save-player/route.js`

**Modifica `playerData`**:
```javascript
const playerData = {
  // ... dati esistenti ...
  position: toText(player.position),  // Posizione principale
  original_positions: Array.isArray(player.original_positions) 
    ? player.original_positions 
    : (player.position ? [{ position: player.position, competence: "Alta" }] : []),  // NUOVO: salva array
  // ...
}
```

**Gestione Update**:
```javascript
// Se giocatore esiste già, NON sovrascrivere original_positions (mantieni originali)
if (existingPlayerInSlot) {
  // Mantieni original_positions esistente (non cambiare)
  delete playerData.original_positions
}
```

---

### 4. Adattamento - Modifica `assign-player-to-slot`

**File**: `app/api/supabase/assign-player-to-slot/route.js`

**Aggiungi Recupero Formazione Layout**:
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

**Modifica Update per `player_id`**:
```javascript
// Recupera giocatore con original_positions
const { data: player } = await admin
  .from('players')
  .select('position, original_positions')
  .eq('id', player_id)
  .single()

const updateData = {
  slot_index: slot_index,
  position: slotPosition || player.position  // Adatta automaticamente allo slot (se disponibile)
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

**Modifica Insert per `player_data`**:
```javascript
const playerData = {
  // ... dati esistenti ...
  position: slotPosition || toText(player_data.position),  // Adatta a slot (se disponibile)
  original_positions: Array.isArray(player_data.original_positions) 
    ? player_data.original_positions 
    : (player_data.position ? [{ position: player_data.position, competence: "Alta" }] : []),  // Salva originali dalla card
  slot_index: slot_index,
}
```

---

### 5. Reset - Modifica `remove-player-from-slot`

**File**: `app/api/supabase/remove-player-from-slot/route.js`

**Modifica Update**:
```javascript
// Recupera original_positions
const { data: player } = await admin
  .from('players')
  .select('original_positions, position')
  .eq('id', player_id)
  .single()

// Reset a original_position (prima posizione originale o position attuale)
const originalPosition = Array.isArray(player.original_positions) && player.original_positions.length > 0
  ? player.original_positions[0].position
  : player.position

// Reset a original_position
const { error: updateError } = await admin
  .from('players')
  .update({
    slot_index: null,
    position: originalPosition,  // Reset a originale
    updated_at: new Date().toISOString()
  })
  .eq('id', player_id)
  .eq('user_id', userId)
```

---

### 6. Prompt IA - Modifica `countermeasuresHelper.js` (DISCRETO)

**File**: `lib/countermeasuresHelper.js`

**Aggiungi Funzione Helper**:
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

**Modifica Prompt (DISCRETO)**:
```javascript
titolari.forEach((p, idx) => {
  const currentPosition = p.position // "LWF" (adattato allo slot)
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

**IMPORTANTE**: 
- L'IA usa info per analisi, ma NON dice esplicitamente "ATTENZIONE" nel prompt
- Alert frontend (se necessario) viene mostrato separatamente
- Suggerimenti IA solo quando necessario (es. sostituzioni perché stesso ruolo)

---

## ✅ CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Creare file `migrations/add_original_positions_column.sql`
- [ ] Eseguire migrazione in Supabase Dashboard
- [ ] Verificare che colonna sia creata
- [ ] Verificare che indice GIN sia creato

### Estrazione
- [ ] Modificare prompt `extract-player/route.js`
- [ ] Aggiungere validazione `original_positions`
- [ ] Testare estrazione con card reale (Ronaldinho con AMF/LWF/RWF)
- [ ] Verificare che array sia corretto

### Salvataggio
- [ ] Modificare `save-player/route.js` per salvare `original_positions`
- [ ] Gestire update (non sovrascrivere `original_positions`)
- [ ] Testare salvataggio nuovo giocatore
- [ ] Testare update giocatore esistente

### Adattamento
- [ ] Modificare `assign-player-to-slot/route.js` per recuperare `formationLayout`
- [ ] Adattare `position` automaticamente allo slot
- [ ] Salvare `original_positions` se vuoto
- [ ] Testare assegnazione giocatore esistente
- [ ] Testare creazione nuovo giocatore
- [ ] Testare drag & drop

### Reset
- [ ] Modificare `remove-player-from-slot/route.js` per resettare `position`
- [ ] Testare rimozione giocatore da slot
- [ ] Verificare che `position` torni a originale

### Prompt IA
- [ ] Aggiungere funzione `isPositionOriginal` in `countermeasuresHelper.js`
- [ ] Modificare prompt per verificare posizioni (DISCRETO)
- [ ] Testare generazione contromisure
- [ ] Verificare che IA sia discreta (non dice tutto)

### Test Completo
- [ ] Testare flusso completo: estrazione → salvataggio → assegnazione → rimozione
- [ ] Testare retrocompatibilità (giocatori esistenti senza `original_positions`)
- [ ] Testare generazione contromisure con posizioni multiple
- [ ] Verificare che alert frontend funzioni (se implementato)

---

## 🚨 ROLLBACK

Se qualcosa va storto, seguire `ROLLBACK_POSIZIONI_MULTIPLE_ORIGINALI.md`:
1. Eseguire SQL per rimuovere colonna
2. Ripristinare file route
3. Ripristinare file helper
4. Testare che tutto funzioni

---

## 📝 NOTE IMPORTANTI

1. **Discrezione IA**: L'IA deve essere discreta - meno dice meglio è, solo quando necessario
2. **Alert Frontend**: Mostrare alert solo quando posizione NON è originale (se implementato)
3. **Suggerimenti**: Solo quando necessario (es. sostituzioni perché stesso ruolo)
4. **Retrocompatibilità**: Gestire giocatori esistenti senza `original_positions`

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: ⏸️ **IN ATTESA APPROVAZIONE UTENTE - NON IMPLEMENTATO**
