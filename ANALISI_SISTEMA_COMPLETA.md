# 🔍 ANALISI SISTEMA COMPLETA - Campo 2D Formazione

**Data**: 2024  
**Obiettivo**: Implementare campo 2D interattivo senza perdere coerenza

---

## 📊 STATO ATTUALE

### Cosa Funziona (DA TENERE)

1. ✅ **Estrazione formazione** (`/api/extract-formation`)
   - Estrae 11 giocatori + slot_index + formazione
   - Funziona bene

2. ✅ **Salvataggio giocatori** (`/api/supabase/save-player`)
   - Salva giocatore con slot_index
   - Funziona bene

3. ✅ **Lista giocatori** (`/lista-giocatori`)
   - Mostra titolari/riserve
   - Funziona bene

4. ✅ **Swap formazione** (`/api/supabase/swap-formation`)
   - Scambia slot_index tra giocatori
   - Funziona bene

5. ✅ **Dettaglio giocatore** (`/giocatore/[id]`)
   - Completa profilo con foto aggiuntive
   - Funziona bene

### Cosa Modificare

1. ⚠️ **Upload formazione** (`app/upload/page.jsx`)
   - **PRIMA**: Salva 11 giocatori subito
   - **DOPO**: Salva solo layout formazione (slot vuoti)

2. ⚠️ **Gestione formazione** (`app/gestione-formazione/page.jsx`)
   - **PRIMA**: Lista titolari/riserve con swap
   - **DOPO**: Campo 2D interattivo con card cliccabili

---

## 🗄️ SCHEMA DATABASE

### Tabella `players` (ESISTENTE)

```sql
- id, user_id, player_name, ...
- slot_index INTEGER (0-10 per titolari, NULL per riserve)
- metadata JSONB (può contenere formazione, coordinate, ecc.)
```

**Usabile per**:
- ✅ Giocatori con slot_index assegnato
- ✅ Riserve (slot_index NULL)

**NON adatto per**:
- ❌ Slot vuoti (non possiamo avere record senza giocatore)

### Soluzione: Usare `metadata` per Layout

**Opzione A**: Salvare layout in `metadata` di un record "dummy"
- Creare un record speciale `player_name = "_formation_layout"` 
- Salvare layout in `metadata.formation_layout`

**Opzione B**: Nuova tabella `formation_layout` (MIGLIORE)

```sql
CREATE TABLE formation_layout (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  formation TEXT,  -- "4-2-1-3"
  slot_positions JSONB,  -- { 0: {x: 50, y: 90, position: "PT"}, ... }
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Vantaggi**:
- ✅ Separazione logica
- ✅ Un layout per utente
- ✅ Facile da aggiornare

**Raccomandazione**: **Opzione B** (nuova tabella)

---

## 🔄 NUOVO WORKFLOW

### Step 1: Carica Formazione (Solo Layout)

**File**: `app/upload/page.jsx`

**Comportamento**:
1. Cliente carica screenshot formazione
2. AI estrae:
   - Formazione (es. "4-2-1-3")
   - 11 slot con coordinate (x, y) sul campo
   - [OPZIONALE] Nomi giocatori (preview, non salvati)
3. Salva in `formation_layout`:
   - `formation`: "4-2-1-3"
   - `slot_positions`: `{ 0: {x: 50, y: 90, position: "PT"}, ... }`
4. **NON salva giocatori** (slot rimangono vuoti)

**Risultato**: Layout formazione salvato, slot 0-10 "riservati" per quella formazione

---

### Step 2: Gestione Formazione 2D

**File**: `app/gestione-formazione/page.jsx` (RISCRITTO)

**Comportamento**:
1. Carica layout formazione da `formation_layout`
2. Carica giocatori con `slot_index` 0-10 (titolari)
3. Carica riserve (`slot_index` NULL)
4. Mostra campo 2D:
   - 11 card posizionate secondo `slot_positions`
   - Card vuote (slot senza giocatore) → mostra "Slot X" + "Assegna"
   - Card piene (slot con giocatore) → mostra giocatore

5. Click su card:
   - **Vuota**: Modal "Assegna giocatore"
     - Opzione A: Carica foto → Estrae → Salva con slot_index
     - Opzione B: Seleziona da riserve → UPDATE slot_index
   - **Piena**: Modal "Modifica giocatore"
     - Cambia giocatore
     - Rimuovi (slot_index = NULL)
     - Completa profilo

---

## 🔧 MODIFICHE NECESSARIE

### 1. Nuova Tabella `formation_layout`

**Migrazione**:
```sql
CREATE TABLE formation_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formation TEXT NOT NULL,  -- "4-2-1-3"
  slot_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)  -- Un layout per utente
);

-- RLS
ALTER TABLE formation_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own layout"
ON formation_layout FOR ALL
USING ((select auth.uid()) = user_id);
```

---

### 2. Modificare `extract-formation` API

**Aggiungere estrazione coordinate**:
```javascript
// Prompt modificato per estrarre anche coordinate
const prompt = `... estrai anche coordinate approssimative (x, y) per ogni giocatore sul campo ...`

// Output aggiunto
{
  "formation": "4-2-1-3",
  "slot_positions": {
    "0": { "x": 50, "y": 90, "position": "PT" },
    "1": { "x": 20, "y": 70, "position": "DC" },
    // ... altri slot
  },
  "players": [...] // Opzionale, per preview
}
```

---

### 3. Modificare `upload/page.jsx`

**Nuovo comportamento formazione**:
```javascript
if (uploadType === 'formation') {
  // 1. Estrai formazione + layout
  const extractData = await extractFormation(image)
  
  // 2. Salva layout in formation_layout (UPSERT)
  await saveFormationLayout({
    formation: extractData.formation,
    slot_positions: extractData.slot_positions
  })
  
  // 3. [OPZIONALE] Mostra preview giocatori
  // "Trovati 11 giocatori. Vuoi assegnarli automaticamente?"
  // Se sì → Salva giocatori con slot_index
  // Se no → Lascia slot vuoti
  
  // 4. Redirect a gestione-formazione
}
```

---

### 4. Riscrivere `gestione-formazione/page.jsx`

**Nuova struttura**:
```jsx
<FormationField2D>
  {/* Carica layout */}
  {layout.slot_positions.map((slot, index) => (
    <PlayerSlot
      key={index}
      slotIndex={index}
      position={slot}
      player={players.find(p => p.slot_index === index)}
      onClick={handleSlotClick}
    />
  ))}
</FormationField2D>

<RiservePanel>
  {riserve.map(player => (
    <ReserveCard 
      player={player}
      onAssign={handleAssignToSlot}
    />
  ))}
</RiservePanel>
```

---

### 5. Nuovo Endpoint: `PATCH /api/supabase/assign-player-to-slot`

**Funzionalità**:
- Assegna giocatore esistente a slot
- Oppure crea nuovo giocatore e assegna

**Logica**:
```javascript
// Se giocatore esiste (riserva o altro slot)
if (existingPlayer) {
  // UPDATE slot_index
  await updatePlayer(existingPlayer.id, { slot_index: slotIndex })
} else {
  // INSERT nuovo giocatore
  await insertPlayer({ ...playerData, slot_index: slotIndex })
}
```

---

## ⚠️ GESTIONE SOSTITUZIONI

### Scenario: Nuova Formazione Caricata

**Comportamento**:
1. **Cancella vecchi titolari** (slot_index 0-10)
   - Rimuove giocatori dai titolari
   - Se erano riserve prima → tornano riserve (slot_index = NULL)
   - Se erano nuovi → vengono cancellati

2. **Salva nuovo layout** (UPSERT su `formation_layout`)
   - Aggiorna `formation` e `slot_positions`
   - Slot 0-10 ora "riservati" per nuova formazione

3. **Risultato**:
   - Campo 2D mostra 11 slot vuoti
   - Cliente assegna giocatori quando vuole

---

### Scenario: Assegnazione Giocatore a Slot

**Comportamento**:
1. Cliente clicca su slot vuoto
2. Sceglie: "Carica foto" o "Seleziona da riserve"

3. **Se carica foto**:
   - Estrae giocatore
   - Salva con `slot_index = slotIndex`
   - Card diventa "piena"

4. **Se seleziona da riserve**:
   - UPDATE riserva: `slot_index = slotIndex`
   - Card diventa "piena"

5. **Se slot già occupato**:
   - Vecchio giocatore → `slot_index = NULL` (torna riserva)
   - Nuovo giocatore → `slot_index = slotIndex`

---

## ✅ COSA RIMUOVERE

1. ❌ **Rimuovere**: Salvataggio automatico 11 giocatori in `upload/page.jsx`
   - Mantenere estrazione
   - Rimuovere loop salvataggio

2. ❌ **Rimuovere**: Logica swap attuale (sostituita da campo 2D)
   - Mantenere endpoint `/api/supabase/swap-formation` per compatibilità
   - Ma non usarlo più nella nuova UI

3. ✅ **Mantenere**: Tutto il resto
   - Estrazione formazione
   - Salvataggio giocatori
   - Lista giocatori
   - Dettaglio giocatore
   - Riserve

---

## ✅ COSA TENERE

1. ✅ **Schema database `players`** (nessuna modifica)
2. ✅ **API extract-formation** (modificare solo output)
3. ✅ **API save-player** (funziona già)
4. ✅ **API swap-formation** (mantenere per compatibilità)
5. ✅ **Lista giocatori** (funziona già)
6. ✅ **Dettaglio giocatore** (funziona già)

---

## 🎯 PIANO IMPLEMENTAZIONE

### Fase 1: Database
1. Creare tabella `formation_layout`
2. Aggiungere RLS policies

### Fase 2: API
1. Modificare `extract-formation` per estrarre coordinate
2. Creare endpoint `save-formation-layout`
3. Creare endpoint `assign-player-to-slot`

### Fase 3: Frontend
1. Modificare `upload/page.jsx` (solo layout, no giocatori)
2. Riscrivere `gestione-formazione/page.jsx` (campo 2D)
3. Aggiungere modal assegnazione

### Fase 4: Test
1. Testare caricamento formazione
2. Testare assegnazione giocatori
3. Testare sostituzioni

---

## ⚠️ COMPATIBILITÀ

### Dati Esistenti

**Giocatori con slot_index 0-10**:
- ✅ Compatibili
- ✅ Verranno mostrati nel campo 2D
- ✅ Cliente può modificarli

**Riserve (slot_index NULL)**:
- ✅ Compatibili
- ✅ Rimangono riserve
- ✅ Possono essere assegnate a slot

**Nessun layout salvato**:
- ⚠️ Se cliente non ha mai caricato formazione
- ✅ Mostrare campo 2D "vuoto" con messaggio: "Carica formazione prima"

---

## 📝 CHECKLIST

- [ ] Creare tabella `formation_layout`
- [ ] Modificare `extract-formation` (coordinate)
- [ ] Creare endpoint `save-formation-layout`
- [ ] Creare endpoint `assign-player-to-slot`
- [ ] Modificare `upload/page.jsx` (solo layout)
- [ ] Riscrivere `gestione-formazione/page.jsx` (campo 2D)
- [ ] Aggiungere traduzioni
- [ ] Testare tutto

---

**Stato**: Pronto per implementazione  
**Priorità**: ALTA  
**Stima**: 6-8 ore
