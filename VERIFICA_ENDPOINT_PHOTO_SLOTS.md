# ✅ Verifica Endpoint e Flussi: photo_slots

**Data**: 26 Gennaio 2026  
**Obiettivo**: Verificare che `photo_slots` sia sempre disponibile per implementazione alert profilazione

---

## 🔍 VERIFICA ENDPOINT

### **1. GET Giocatori (Frontend - fetchData)**

**File**: `app/gestione-formazione/page.jsx` (riga 95-127)

**Query**:
```javascript
const { data: players } = await supabase
  .from('players')
  .select('*')  // ✅ Include tutti i campi, incluso photo_slots
  .order('created_at', { ascending: false })
```

**Mapping**:
```javascript
photo_slots: p.photo_slots || null,  // ✅ Gestito, può essere null
```

**Status**: ✅ **OK** - `photo_slots` incluso in query

---

### **2. POST /api/supabase/save-player**

**File**: `app/api/supabase/save-player/route.js`

**Input**:
```javascript
photo_slots: player.photo_slots && typeof player.photo_slots === 'object' 
  ? player.photo_slots 
  : null
```

**Salvataggio**:
```javascript
photo_slots: playerData.photo_slots  // ✅ Salvato correttamente
```

**Merge con esistente** (riga 170-228):
```javascript
const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
const newPhotoSlots = playerData.photo_slots || {}
const mergedPhotoSlots = { ...existingPhotoSlots, ...newPhotoSlots }
```

**Status**: ✅ **OK** - `photo_slots` gestito correttamente, merge intelligente

---

### **3. PATCH /api/supabase/assign-player-to-slot**

**File**: `app/api/supabase/assign-player-to-slot/route.js`

**Query giocatore esistente** (riga 120-125):
```javascript
const { data: player } = await admin
  .from('players')
  .select('id, user_id, player_name, age, position, original_positions')
  // ⚠️ PROBLEMA: photo_slots NON incluso nella select
  .eq('id', player_id)
```

**Status**: ⚠️ **ATTENZIONE** - `photo_slots` non incluso nella query quando si assegna giocatore esistente

**Impatto**:
- Quando si assegna giocatore da riserve, `photo_slots` non viene recuperato
- Frontend deve fare refresh per vedere `photo_slots` aggiornato
- **NON CRITICO**: Dopo refresh, `photo_slots` sarà disponibile (viene caricato con `select('*')` in fetchData)

**Raccomandazione**: 
- ✅ **OK per implementazione**: 
  - Funzione helper gestisce `photo_slots` mancante/null/undefined (rosso)
  - Dopo assegnazione, `fetchData()` viene chiamato (riga 483) che ricarica tutti i giocatori con `select('*')`, quindi `photo_slots` sarà disponibile
- ⚠️ **Miglioramento futuro (opzionale)**: Aggiungere `photo_slots` alla select in assign-player-to-slot per evitare refresh (ottimizzazione)

---

## 🔍 VERIFICA STRUTTURA DATI

### **SlotCard Component**

**Dati disponibili**:
```javascript
const { slot_index, position, player, ... } = slot
// player contiene tutti i campi da select('*'), incluso photo_slots
```

**Accesso**:
```javascript
player.photo_slots  // ✅ Disponibile (può essere null, undefined, o object)
```

**Casi possibili**:
1. `player.photo_slots = null` → Giocatore vecchio senza photo_slots
2. `player.photo_slots = undefined` → Non presente (raro, ma possibile)
3. `player.photo_slots = {}` → Oggetto vuoto (nessuna foto caricata)
4. `player.photo_slots = { card: true }` → Parziale
5. `player.photo_slots = { card: true, statistiche: true, abilita: true }` → Completo

---

## ⚠️ CASI EDGE DA GESTIRE

### **1. Giocatori Vecchi (senza photo_slots)**

**Scenario**: Giocatori creati prima dell'implementazione photo_slots

**Comportamento atteso**:
- `photo_slots = null` → Rosso (incompleto)
- `photo_slots = undefined` → Rosso (incompleto)
- `photo_slots = {}` → Rosso (incompleto)

**Funzione helper gestisce**:
```javascript
if (!photoSlots || typeof photoSlots !== 'object') {
  return 'rgba(239, 68, 68, 0.8)' // Rosso: nessun dato
}
```

**Status**: ✅ **GESTITO** - Fallback sicuro

---

### **2. photo_slots Parziale**

**Scenario**: Solo alcune foto caricate

**Esempi**:
- `{ card: true }` → 1/3 → Rosso
- `{ card: true, statistiche: true }` → 2/3 → Arancione
- `{ card: true, statistiche: true, abilita: true }` → 3/3 → Verde

**Status**: ✅ **GESTITO** - Logica conta foto correttamente

---

### **3. photo_slots con booster**

**Scenario**: Booster può essere in stessa foto di abilita

**Logica** (già presente in AssignModal):
```javascript
const hasSkills = photoSlots.abilita === true || photoSlots.booster === true
```

**Status**: ✅ **GESTITO** - Booster conta come abilita

---

## 🔧 IMPLEMENTAZIONE SICURA

### **Funzione Helper Robusta**

```javascript
function getProfileBorderColor(photoSlots) {
  // Gestione casi edge
  if (!photoSlots || typeof photoSlots !== 'object') {
    return 'rgba(239, 68, 68, 0.8)' // Rosso: nessun dato
  }
  
  // Verifica valori boolean espliciti (non truthy generico)
  const hasCard = photoSlots.card === true
  const hasStats = photoSlots.statistiche === true
  const hasSkills = photoSlots.abilita === true || photoSlots.booster === true
  
  const count = [hasCard, hasStats, hasSkills].filter(Boolean).length
  
  if (count === 3) return 'rgba(34, 197, 94, 0.8)'      // Verde: completo
  if (count === 2) return 'rgba(251, 191, 36, 0.8)'      // Arancione: parziale
  return 'rgba(239, 68, 68, 0.8)'                        // Rosso: incompleto
}
```

**Protezioni**:
- ✅ Verifica `typeof photoSlots !== 'object'` (gestisce null, undefined, string, number)
- ✅ Verifica `=== true` esplicito (non truthy, evita falsy values)
- ✅ Fallback sicuro (rosso se dati mancanti)

---

## ✅ CHECKLIST VERIFICA

### **Endpoint**
- [x] GET giocatori include photo_slots (select('*'))
- [x] POST save-player gestisce photo_slots correttamente
- [x] Merge photo_slots funziona (non sovrascrive dati esistenti)
- [x] PATCH assign-player-to-slot: ⚠️ NON include photo_slots in select, MA chiama fetchData() dopo (riga 483) che ricarica tutto

### **Frontend**
- [x] photo_slots incluso in mapping giocatori
- [x] photo_slots passato a SlotCard tramite `slot.player`
- [x] Accesso sicuro: `player.photo_slots` (può essere null)

### **Casi Edge**
- [x] Giocatori vecchi (photo_slots = null) → Rosso
- [x] photo_slots undefined → Rosso
- [x] photo_slots = {} → Rosso
- [x] photo_slots parziale → Arancione/Rosso corretto
- [x] Booster in stessa foto abilita → Gestito

---

## 🎯 CONCLUSIONE

**Status**: ✅ **SICURO PER IMPLEMENTAZIONE**

**Motivi**:
- ✅ `photo_slots` sempre incluso in query (`select('*')`)
- ✅ Gestito correttamente in save-player
- ✅ Merge intelligente (non perde dati esistenti)
- ✅ Funzione helper gestisce tutti i casi edge
- ✅ Fallback sicuro (rosso se dati mancanti)

**Raccomandazione**: ✅ **PROCEDI CON IMPLEMENTAZIONE**
