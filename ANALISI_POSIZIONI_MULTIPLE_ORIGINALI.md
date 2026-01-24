# 🎯 Analisi: Gestione Posizioni Multiple Originali

**Problema**: Alcuni giocatori hanno **più posizioni originali** in cui possono giocare mantenendo prestazioni ottimali. Non tutte le posizioni diverse da quella principale sono "errate" per l'IA.

**Data**: 24 Gennaio 2026

---

## 💡 PROBLEMA IDENTIFICATO

### Scenario Reale:

**Giocatore**: Ronaldinho
- **Posizioni Originali dalla Card** (evidenziate in alto a destra):
  - AMF (Alta competenza) ✅
  - LWF (Alta competenza) ✅
  - RWF (Alta competenza) ✅

**Casi d'Uso**:
1. Cliente sposta Ronaldinho in slot **AMF** → ✅ **OK** (posizione originale)
2. Cliente sposta Ronaldinho in slot **LWF** → ✅ **OK** (posizione originale)
3. Cliente sposta Ronaldinho in slot **RWF** → ✅ **OK** (posizione originale)
4. Cliente sposta Ronaldinho in slot **DC** → ❌ **ERRATA** (non è posizione originale)

**Problema Attuale**:
- Sistema salva solo `position: "AMF"` (posizione principale)
- Non salva array di posizioni originali
- L'IA pensa che solo AMF è "corretta"
- Se cliente sposta in LWF, l'IA pensa che è "snaturato" (ERRORE!)

---

## 🔍 ANALISI APPROCCIO ATTUALE

### 1. Estrazione Posizioni dalla Card

**File**: `app/api/extract-player/route.js`

**Prompt Attuale**:
```javascript
"position": "CF",  // Solo posizione principale
```

**Problema**: 
- Estrae solo la posizione principale
- Non estrae le posizioni evidenziate in alto a destra della card
- Non estrae i livelli di competenza (Alta/Intermedia/Bassa)

---

### 2. Salvataggio nel DB

**File**: `app/api/supabase/save-player/route.js`

**Campi Attuali**:
```javascript
position: toText(player.position),  // Solo "AMF"
```

**Problema**:
- Salva solo posizione principale
- Non salva array di posizioni originali
- Non salva competenze per posizione

---

### 3. Valutazione IA

**File**: `lib/countermeasuresHelper.js`

**Logica Attuale**:
```javascript
const hasDiscrepancy = currentPosition !== originalPosition
// Se currentPosition = "LWF" e originalPosition = "AMF"
// → hasDiscrepancy = true (ERRORE! LWF è anche originale!)
```

**Problema**:
- Confronta solo con posizione principale
- Non verifica se posizione attuale è tra quelle originali
- Segnala come "errore" anche posizioni originali valide

---

## 🎯 SOLUZIONE PROPOSTA

### Concetto: Array di Posizioni Originali + Verifica Appartenenza

**Implementazione**:

#### 1. **Estrarre Tutte le Posizioni Originali dalla Card**

**Modifica Prompt**:
```javascript
// app/api/extract-player/route.js

const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai TUTTI questi dati: nome giocatore, posizione, overall rating, team, card_type, base_stats, skills, com_skills, boosters, height, weight, age, nationality, level, form, role, playing_style, ai_playstyles, matches_played, goals, assists, weak_foot_frequency, weak_foot_accuracy, injury_resistance

POSIZIONI ORIGINALI (NUOVO):
- Guarda la sezione in alto a destra della card dove sono evidenziate le posizioni/ruoli
- Estrai TUTTE le posizioni evidenziate con il loro livello di competenza
- Le posizioni possono essere evidenziate con colori diversi (Alta/Intermedia/Bassa competenza)
- Estrai sia la posizione principale che tutte le posizioni secondarie

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

---

#### 2. **Salvare Array di Posizioni Originali nel DB**

**Modifica Schema DB**:
```sql
-- Aggiungi colonna per posizioni originali (array JSONB)
ALTER TABLE players ADD COLUMN original_positions JSONB DEFAULT '[]'::jsonb;

-- Struttura JSONB:
-- [
--   {"position": "AMF", "competence": "Alta"},
--   {"position": "LWF", "competence": "Alta"},
--   {"position": "RWF", "competence": "Alta"}
-- ]

COMMENT ON COLUMN players.position IS 'Posizione attuale giocatore (si adatta allo slot quando in formazione)';
COMMENT ON COLUMN players.original_positions IS 'Array di posizioni originali dalla card con competenze (non cambia mai)';
```

**Modifica `save-player`**:
```javascript
// app/api/supabase/save-player/route.js

const playerData = {
  // ... dati esistenti ...
  position: toText(player.position),  // Posizione principale
  original_positions: Array.isArray(player.original_positions) 
    ? player.original_positions 
    : (player.position ? [{ position: player.position, competence: "Alta" }] : []),  // NUOVO: salva array
  // ...
}

// Se giocatore esiste già, NON sovrascrivere original_positions (mantieni originali)
if (existingPlayer) {
  // Mantieni original_positions esistente (non cambiare)
  delete playerData.original_positions
}
```

---

#### 3. **Adattare Posizione a Slot (Automatico)**

**Modifica `assign-player-to-slot`**:
```javascript
// app/api/supabase/assign-player-to-slot/route.js

export async function PATCH(req) {
  // ... codice esistente ...
  
  const { slot_index, player_id, player_data } = await req.json()
  
  // Recupera formazione layout
  const { data: formationLayout } = await admin
    .from('formation_layout')
    .select('slot_positions')
    .eq('user_id', userId)
    .maybeSingle()
  
  // Calcola posizione richiesta dallo slot
  const slotPosition = formationLayout?.slot_positions?.[slot_index]?.position || null
  
  // Se player_id esiste, aggiorna
  if (player_id) {
    // Recupera giocatore con original_positions
    const { data: player } = await admin
      .from('players')
      .select('position, original_positions')
      .eq('id', player_id)
      .single()
    
    const updateData = {
      slot_index: slot_index,
      position: slotPosition  // Adatta automaticamente allo slot
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
    
    // ... resto codice ...
  }
  
  // Se player_data (nuovo giocatore), salva anche original_positions
  if (player_data) {
    const playerData = {
      // ... dati esistenti ...
      position: slotPosition,  // Adatta a slot
      original_positions: Array.isArray(player_data.original_positions) 
        ? player_data.original_positions 
        : (player_data.position ? [{ position: player_data.position, competence: "Alta" }] : []),  // Salva originali dalla card
      slot_index: slot_index,
    }
    // ... resto codice ...
  }
}
```

---

#### 4. **Verificare se Posizione è Tra Quelle Originali**

**Funzione Helper**:
```javascript
// lib/countermeasuresHelper.js

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

---

#### 5. **Modifica Prompt IA**

**Modifica `countermeasuresHelper.js`**:
```javascript
// lib/countermeasuresHelper.js

titolari.forEach((p, idx) => {
  const currentPosition = p.position // "LWF" (adattato allo slot)
  const originalPositions = Array.isArray(p.original_positions) ? p.original_positions : []
  
  // Verifica se posizione attuale è tra quelle originali
  const positionCheck = isPositionOriginal(currentPosition, originalPositions)
  const isOriginalPosition = positionCheck.isOriginal
  
  const stats = p.base_stats || {}
  
  rosterText += `- [${p.id}] ${p.player_name} - Overall ${p.overall_rating}\n`
  
  // Mostra posizione attuale vs originali
  if (isOriginalPosition) {
    // Posizione attuale è tra quelle originali → OK
    rosterText += `  Posizione: ${currentPosition} (originale, competenza: ${positionCheck.competence})\n`
    rosterText += `  Posizioni Originali Disponibili: ${originalPositions.map(op => `${op.position} (${op.competence})`).join(', ')}\n`
    rosterText += `  ✅ Performance ottimale: Giocatore usato in posizione originale\n`
  } else {
    // Posizione attuale NON è tra quelle originali → ATTENZIONE
    const mainOriginalPosition = originalPositions.length > 0 ? originalPositions[0].position : p.position
    rosterText += `  Posizione Attuale: ${currentPosition} (in slot ${p.slot_index})\n`
    rosterText += `  Posizioni Originali: ${originalPositions.map(op => `${op.position} (${op.competence})`).join(', ') || mainOriginalPosition}\n`
    rosterText += `  ⚠️ ATTENZIONE: Giocatore usato in posizione NON originale!\n`
    rosterText += `  → Posizione attuale: ${currentPosition}\n`
    rosterText += `  → Posizioni originali disponibili: ${originalPositions.map(op => op.position).join(', ') || mainOriginalPosition}\n`
    
    // Valuta statistiche
    const evaluation = evaluateStatsForPosition(stats, currentPosition)
    if (!evaluation.suitable) {
      rosterText += `  ⚠️ Statistiche non ottimali per ruolo ${currentPosition}:\n`
      evaluation.missing.forEach(m => {
        rosterText += `    → ${m.stat}: ${m.actual} (richiesto: ${m.required})\n`
      })
      rosterText += `  → Performance ridotta: -${100 - evaluation.score}% rispetto a giocatore ideale\n`
    }
    
    rosterText += `  → Suggerimento: Usa una posizione originale (${originalPositions.map(op => op.position).join(', ') || mainOriginalPosition}) per performance ottimale\n`
  }
  
  // Statistiche
  if (stats && Object.keys(stats).length > 0) {
    rosterText += `  Stats: Velocità ${stats.velocita || 'N/A'}, Dribbling ${stats.dribbling || 'N/A'}, `
    rosterText += `Passaggio ${stats.passaggio_rasoterra || 'N/A'}, Difesa ${stats.difesa || 'N/A'}\n`
  }
})
```

---

## 📊 ESEMPIO FUNZIONAMENTO COMPLETO

### Scenario: Ronaldinho con Posizioni Multiple

#### 1. **Cliente carica card**:
```javascript
{
  player_name: "Ronaldinho",
  position: "AMF",  // Posizione principale
  original_positions: [  // Array di posizioni originali
    { position: "AMF", competence: "Alta" },
    { position: "LWF", competence: "Alta" },
    { position: "RWF", competence: "Alta" }
  ]
}
```

#### 2. **Cliente sposta a slot LWF**:
```javascript
// assign-player-to-slot
{
  slot_index: 8,
  position: "LWF",  // Adattato automaticamente
  original_positions: [  // Mantiene originali
    { position: "AMF", competence: "Alta" },
    { position: "LWF", competence: "Alta" },
    { position: "RWF", competence: "Alta" }
  ]
}
```

#### 3. **Nel prompt IA**:
```
- [id] Ronaldinho - Overall 99
  Posizione: LWF (originale, competenza: Alta)
  Posizioni Originali Disponibili: AMF (Alta), LWF (Alta), RWF (Alta)
  ✅ Performance ottimale: Giocatore usato in posizione originale
  Stats: Velocità 85, Dribbling 99, Passaggio 95, Difesa 35
```

#### 4. **Cliente sposta a slot DC** (posizione NON originale):
```javascript
// assign-player-to-slot
{
  slot_index: 2,
  position: "DC",  // Adattato automaticamente
  original_positions: [  // Mantiene originali
    { position: "AMF", competence: "Alta" },
    { position: "LWF", competence: "Alta" },
    { position: "RWF", competence: "Alta" }
  ]
}
```

#### 5. **Nel prompt IA**:
```
- [id] Ronaldinho - Overall 99
  Posizione Attuale: DC (in slot 2)
  Posizioni Originali: AMF (Alta), LWF (Alta), RWF (Alta)
  ⚠️ ATTENZIONE: Giocatore usato in posizione NON originale!
  → Posizione attuale: DC
  → Posizioni originali disponibili: AMF, LWF, RWF
  ⚠️ Statistiche non ottimali per ruolo DC:
    → Difesa: 35 (richiesto: 80) ❌
    → Contatto fisico: 65 (richiesto: 85) ❌
  → Performance ridotta: -45% rispetto a giocatore ideale
  → Suggerimento: Usa una posizione originale (AMF, LWF, RWF) per performance ottimale
  Stats: Velocità 85, Dribbling 99, Passaggio 95, Difesa 35
```

---

## 🔧 IMPLEMENTAZIONE DETTAGLIATA

### 1. Modifica Prompt Estrazione

**File**: `app/api/extract-player/route.js`

**Modifica**:
```javascript
// Aggiungi a prompt
"original_positions": [  // NUOVO: Array di posizioni originali dalla card
  {
    "position": "AMF",
    "competence": "Alta"  // Alta, Intermedia, Bassa (basato su colore/evidenziazione)
  },
  {
    "position": "LWF",
    "competence": "Alta"
  }
]
```

---

### 2. Modifica Schema DB

**SQL**:
```sql
-- Aggiungi colonna per posizioni originali (array JSONB)
ALTER TABLE players ADD COLUMN original_positions JSONB DEFAULT '[]'::jsonb;

-- Indice per query efficienti
CREATE INDEX idx_players_original_positions ON players USING GIN (original_positions);

-- Commento
COMMENT ON COLUMN players.original_positions IS 'Array di posizioni originali dalla card con competenze: [{"position": "AMF", "competence": "Alta"}, ...]';
```

---

### 3. Modifica `save-player`

**File**: `app/api/supabase/save-player/route.js`

**Modifica**:
```javascript
// Aggiungi a playerData
original_positions: Array.isArray(player.original_positions) 
  ? player.original_positions 
  : (player.position ? [{ position: player.position, competence: "Alta" }] : []),

// Se giocatore esiste già, NON sovrascrivere original_positions
if (existingPlayer) {
  delete playerData.original_positions
}
```

---

### 4. Modifica `assign-player-to-slot`

**File**: `app/api/supabase/assign-player-to-slot/route.js`

**Modifica**:
```javascript
// Recupera original_positions
const { data: player } = await admin
  .from('players')
  .select('position, original_positions')
  .eq('id', player_id)
  .single()

// Se original_positions è NULL o vuoto, salvalo (prima volta)
if ((!player.original_positions || player.original_positions.length === 0) && player.position) {
  updateData.original_positions = [{ position: player.position, competence: "Alta" }]
}
```

---

### 5. Modifica `countermeasuresHelper.js`

**File**: `lib/countermeasuresHelper.js`

**Aggiungi Funzione**:
```javascript
/**
 * Verifica se una posizione è tra quelle originali del giocatore
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

**Modifica Prompt**:
```javascript
// Usa isPositionOriginal per verificare se posizione attuale è originale
const positionCheck = isPositionOriginal(currentPosition, originalPositions)
const isOriginalPosition = positionCheck.isOriginal

if (isOriginalPosition) {
  // Posizione originale → OK
  rosterText += `  ✅ Performance ottimale: Giocatore usato in posizione originale\n`
} else {
  // Posizione NON originale → ATTENZIONE
  rosterText += `  ⚠️ ATTENZIONE: Giocatore usato in posizione NON originale!\n`
}
```

---

## ✅ VANTAGGI SOLUZIONE

1. **Precisione**:
   - Distingue tra posizioni originali e non originali
   - Non segnala come "errore" posizioni originali valide

2. **Flessibilità**:
   - Supporta giocatori con più posizioni originali
   - Valuta competenza per posizione

3. **IA Più Intelligente**:
   - Sa che LWF è OK per Ronaldinho (è originale)
   - Sa che DC è ERRATO per Ronaldinho (non è originale)

4. **Retrocompatibilità**:
   - Se `original_positions` è vuoto, usa `position` come originale
   - Funziona con giocatori esistenti

---

## ⚠️ ACCORTEZZE

### 1. **Gestione Retrocompatibilità**

**Problema**: Giocatori esistenti non hanno `original_positions`.

**Soluzione**:
```javascript
// Se original_positions è vuoto, usa position come originale
const originalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
  ? p.original_positions
  : (p.position ? [{ position: p.position, competence: "Alta" }] : [])
```

---

### 2. **Estrazione Posizioni dalla Card**

**Problema**: L'IA Vision deve estrarre correttamente tutte le posizioni evidenziate.

**Soluzione**:
- Prompt dettagliato che specifica "sezione in alto a destra"
- Esempi nel prompt di formato JSON
- Validazione che `original_positions` sia array

---

### 3. **Gestione Competenze**

**Problema**: Come determinare competenza (Alta/Intermedia/Bassa) dalla card?

**Soluzione**:
- Prompt chiede di basarsi su colore/evidenziazione
- Default: "Alta" se non determinabile
- L'IA può usare competenza per valutare performance

---

## ✅ CHECKLIST IMPLEMENTAZIONE

- [ ] Modificare prompt `extract-player` per estrarre `original_positions`
- [ ] Aggiungere colonna `original_positions JSONB` a tabella `players`
- [ ] Modificare `save-player` per salvare `original_positions`
- [ ] Modificare `assign-player-to-slot` per salvare `original_positions` se vuoto
- [ ] Aggiungere funzione `isPositionOriginal` in `countermeasuresHelper.js`
- [ ] Modificare prompt IA per verificare se posizione è originale
- [ ] Testare con giocatore con posizioni multiple (es. Ronaldinho)
- [ ] Testare con giocatore spostato in posizione originale (es. AMF → LWF)
- [ ] Testare con giocatore spostato in posizione NON originale (es. AMF → DC)
- [ ] Verificare retrocompatibilità con giocatori esistenti

---

## 🎯 CONCLUSIONE

**Problema**: Sistema attuale tratta tutte le posizioni diverse da quella principale come "errate", anche se sono posizioni originali valide.

**Soluzione**: 
- ✅ Estrarre tutte le posizioni originali dalla card
- ✅ Salvare array di posizioni originali nel DB
- ✅ Verificare se posizione attuale è tra quelle originali
- ✅ Segnalare come "errore" solo posizioni NON originali

**Risultato**: 
- L'IA distingue correttamente tra posizioni originali (OK) e non originali (ERRORE)
- Giocatori con posizioni multiple possono essere usati in qualsiasi posizione originale
- Performance valutata correttamente in base a posizione originale vs non originale

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: 📝 **ANALISI COMPLETA - Pronta per Implementazione**
