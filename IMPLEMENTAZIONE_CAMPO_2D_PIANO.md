# 🎯 PIANO IMPLEMENTAZIONE: Campo 2D Formazione

**Data**: 2024  
**Stato**: Pronto per implementazione

---

## 📋 ANALISI: Cosa Rimuovere vs Tenere

### ✅ DA TENERE (Funziona, non toccare)

1. **Schema `players`** → ✅ Nessuna modifica
2. **API `extract-formation`** → ⚠️ Modificare solo output (aggiungere coordinate)
3. **API `save-player`** → ✅ Funziona, usare per assegnazioni
4. **API `swap-formation`** → ✅ Mantenere per compatibilità
5. **Lista giocatori** → ✅ Funziona
6. **Dettaglio giocatore** → ✅ Funziona
7. **Upload card riserve** → ✅ Funziona

### ❌ DA RIMUOVERE/MODIFICARE

1. **`app/upload/page.jsx` - Formazione**:
   - ❌ **Rimuovere**: Loop salvataggio 11 giocatori
   - ✅ **Mantenere**: Estrazione formazione
   - ✅ **Aggiungere**: Salvataggio layout in `formation_layout`

2. **`app/gestione-formazione/page.jsx`**:
   - ❌ **Rimuovere**: Lista titolari/riserve con swap
   - ✅ **Aggiungere**: Campo 2D interattivo
   - ✅ **Aggiungere**: Card cliccabili sul campo

---

## 🔄 GESTIONE SOSTITUZIONI

### Scenario 1: Carica Nuova Formazione

**Comportamento**:
```
1. Cliente carica formazione screenshot
2. Sistema estrae layout (formazione + slot_positions)
3. Sistema cancella vecchi titolari (slot_index 0-10)
   → Giocatori tornano riserve (slot_index = NULL)
4. Sistema salva nuovo layout in formation_layout (UPSERT)
5. Risultato: Campo 2D con 11 slot vuoti
```

**Codice**:
```javascript
// 1. Cancella vecchi titolari
await supabase
  .from('players')
  .update({ slot_index: null })
  .eq('user_id', userId)
  .in('slot_index', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

// 2. Salva layout
await supabase
  .from('formation_layout')
  .upsert({
    user_id: userId,
    formation: extractData.formation,
    slot_positions: extractData.slot_positions,
    updated_at: new Date().toISOString()
  })
```

---

### Scenario 2: Assegna Giocatore a Slot

**Comportamento**:
```
1. Cliente clicca su slot vuoto (es. slot 5)
2. Sceglie: "Carica foto" o "Seleziona da riserve"

Se "Carica foto":
  3a. Estrae giocatore da foto
  4a. Salva con slot_index = 5
  5a. Card slot 5 diventa "piena"

Se "Seleziona da riserve":
  3b. Cliente seleziona "Ronaldinho" (riserva)
  4b. UPDATE: slot_index = 5
  5b. Card slot 5 diventa "piena"
```

**Codice**:
```javascript
// Se slot già occupato, libera vecchio giocatore
if (existingPlayerInSlot) {
  await supabase
    .from('players')
    .update({ slot_index: null })
    .eq('id', existingPlayerInSlot.id)
}

// Assegna nuovo giocatore
if (isNewPlayer) {
  // INSERT
  await savePlayer({ ...playerData, slot_index: 5 })
} else {
  // UPDATE
  await supabase
    .from('players')
    .update({ slot_index: 5 })
    .eq('id', selectedPlayerId)
}
```

---

### Scenario 3: Rimuovi Giocatore da Slot

**Comportamento**:
```
1. Cliente clicca su card piena (slot 5 con giocatore)
2. Sceglie "Rimuovi"
3. UPDATE: slot_index = NULL
4. Card slot 5 torna "vuota"
5. Giocatore torna riserva
```

**Codice**:
```javascript
await supabase
  .from('players')
  .update({ slot_index: null })
  .eq('id', playerId)
```

---

## 🗄️ DATABASE: Tabella `formation_layout`

**Schema**:
```sql
formation_layout:
  - id UUID
  - user_id UUID (UNIQUE) → Un layout per utente
  - formation TEXT ("4-2-1-3")
  - slot_positions JSONB {
      0: { x: 50, y: 90, position: "PT" },
      1: { x: 20, y: 70, position: "DC" },
      ...
    }
  - created_at, updated_at
```

**RLS**: ✅ Abilitato, policy creata

---

## 📝 IMPLEMENTAZIONE STEP-BY-STEP

### Step 1: Modificare `extract-formation` API

**Aggiungere estrazione coordinate**:
```javascript
// Prompt modificato
const prompt = `... estrai anche coordinate approssimative (x, y) per ogni giocatore sul campo.
Coordinate in percentuale (0-100):
- x: posizione orizzontale (0 = sinistra, 100 = destra)
- y: posizione verticale (0 = alto, 100 = basso)
...`

// Output
{
  "formation": "4-2-1-3",
  "slot_positions": {
    "0": { "x": 50, "y": 90, "position": "PT" },
    "1": { "x": 20, "y": 70, "position": "DC" },
    // ...
  },
  "players": [...] // Opzionale per preview
}
```

---

### Step 2: Creare Endpoint `save-formation-layout`

**File**: `app/api/supabase/save-formation-layout/route.js`

**Funzionalità**:
- UPSERT layout in `formation_layout`
- Cancella vecchi titolari (slot_index 0-10 → NULL)

---

### Step 3: Creare Endpoint `assign-player-to-slot`

**File**: `app/api/supabase/assign-player-to-slot/route.js`

**Funzionalità**:
- Assegna giocatore esistente a slot
- Oppure crea nuovo giocatore e assegna
- Gestisce sostituzioni (libera vecchio slot se occupato)

---

### Step 4: Modificare `upload/page.jsx`

**Nuovo comportamento**:
```javascript
if (uploadType === 'formation') {
  // 1. Estrai layout
  const extractData = await extractFormation(image)
  
  // 2. Salva layout (cancella vecchi titolari)
  await saveFormationLayout(extractData)
  
  // 3. [OPZIONALE] Preview giocatori
  // "Trovati 11 giocatori. Assegnarli automaticamente?"
  
  // 4. Redirect a gestione-formazione
}
```

---

### Step 5: Riscrivere `gestione-formazione/page.jsx`

**Nuova struttura**:
- Campo 2D SVG/Canvas
- 11 card posizionate con coordinate
- Click handler per ogni card
- Modal assegnazione/modifica
- Panel riserve (drag & drop opzionale)

---

## ✅ COERENZA GARANTITA

1. ✅ **Schema database**: Nessuna modifica a `players`
2. ✅ **API esistenti**: Mantenute, solo aggiunte nuove
3. ✅ **Dati esistenti**: Compatibili (giocatori con slot_index funzionano)
4. ✅ **Workflow**: Logico e incrementale
5. ✅ **Sicurezza**: RLS su nuova tabella

---

**Pronto per implementazione**: ✅  
**Rischio rotture**: ⚠️ Basso (solo modifiche incrementali)
