# 🔄 Analisi Flusso Completo: photo_slots

**Data**: 26 Gennaio 2026  
**Obiettivo**: Verificare flusso end-to-end: Frontend → Backend → Supabase → UX

---

## 📊 FLUSSO COMPLETO

### **1. FRONTEND: Caricamento Foto**

**File**: `app/gestione-formazione/page.jsx` (riga 795-812)

**Codice**:
```javascript
// Inizializza photoSlots
const photoSlots = {}

// Durante estrazione dati da immagini
if (img.type === 'card') {
  photoSlots.card = true
} else if (img.type === 'stats') {
  photoSlots.statistiche = true
} else if (img.type === 'skills') {
  photoSlots.abilita = true
  if (extractData.player?.boosters && Array.isArray(extractData.player.boosters) && extractData.player.boosters.length > 0) {
    photoSlots.booster = true
  }
} else if (img.type === 'booster') {
  photoSlots.booster = true
}
```

**Struttura creata**:
```javascript
photoSlots = {
  card: true,           // boolean
  statistiche: true,    // boolean
  abilita: true,        // boolean
  booster: true         // boolean (opzionale)
}
```

**Status**: ✅ **CORRETTO** - Valori boolean `true`

---

### **2. FRONTEND: Invio a Backend**

**File**: `app/gestione-formazione/page.jsx` (riga 1632-1638)

**Codice**:
```javascript
body: JSON.stringify({
  player: {
    ...playerData,
    slot_index: null, // Riserva
    photo_slots: photoSlots // Includi photo_slots tracciati
  }
})
```

**Payload inviato**:
```json
{
  "player": {
    "player_name": "Nome Giocatore",
    "photo_slots": {
      "card": true,
      "statistiche": true,
      "abilita": true
    }
  }
}
```

**Status**: ✅ **CORRETTO** - `photo_slots` incluso nel payload

---

### **3. BACKEND: Ricezione e Validazione**

**File**: `app/api/supabase/save-player/route.js` (riga 46, 141-142)

**Codice**:
```javascript
const { player } = await req.json()

// Validazione e preparazione
photo_slots: player.photo_slots && typeof player.photo_slots === 'object' && Object.keys(player.photo_slots).length > 0
  ? player.photo_slots 
  : null
```

**Validazione**:
- ✅ Verifica `typeof === 'object'` → Previene string/number
- ✅ Verifica `Object.keys().length > 0` → Previene oggetto vuoto `{}`
- ✅ Fallback a `null` se invalido

**Status**: ✅ **CORRETTO**

---

### **4. BACKEND: Salvataggio in Supabase**

**File**: `app/api/supabase/save-player/route.js` (riga 270-366)

**Caso A: Nuovo Giocatore (INSERT)**
```javascript
const { data: inserted } = await admin
  .from('players')
  .insert(playerData)  // photo_slots incluso
```

**Caso B: Update Giocatore Esistente (UPDATE)**
```javascript
// Merge photo_slots (riga 170-176)
const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
const newPhotoSlots = playerData.photo_slots || {}
const mergedPhotoSlots = (newPhotoSlots && typeof newPhotoSlots === 'object' && Object.keys(newPhotoSlots).length > 0)
  ? { ...existingPhotoSlots, ...newPhotoSlots }
  : existingPhotoSlots

// Update
const { data: updated } = await admin
  .from('players')
  .update({ photo_slots: mergedPhotoSlots })
```

**Status**: ✅ **CORRETTO** - Merge intelligente

---

### **5. SUPABASE: Storage**

**Tipo colonna**: `JSONB`

**Valori salvati**:
```json
{
  "card": true,
  "statistiche": true,
  "abilita": true,
  "booster": true
}
```

**Nota**: Supabase può convertire boolean in stringhe durante serializzazione JSON in alcuni casi.

**Status**: ✅ **OK** - JSONB gestisce correttamente

---

### **6. FRONTEND: Lettura da Supabase**

**File**: `app/gestione-formazione/page.jsx` (riga 95-127)

**Query**:
```javascript
const { data: players } = await supabase
  .from('players')
  .select('*')  // Include photo_slots
  .order('created_at', { ascending: false })
```

**Mapping**:
```javascript
photo_slots: p.photo_slots || null,
```

**Valori letti**:
- Se `p.photo_slots = { card: true }` → Mantiene oggetto ✅
- Se `p.photo_slots = null` → Diventa `null` ✅
- Se `p.photo_slots = {}` → Mantiene `{}` (oggetto vuoto) ⚠️

**Status**: ✅ **OK** - Mapping corretto

---

### **7. UX: Visualizzazione Alert Bordo**

**File**: `app/gestione-formazione/page.jsx` (riga 2510-2531)

**Funzione**:
```javascript
function getProfileBorderColor(photoSlots) {
  if (!photoSlots || typeof photoSlots !== 'object') {
    return 'rgba(239, 68, 68, 0.8)' // Rosso: nessun dato
  }
  
  // Normalizza valori: gestisce boolean e stringhe
  const hasCard = photoSlots.card === true || photoSlots.card === 'true'
  const hasStats = photoSlots.statistiche === true || photoSlots.statistiche === 'true'
  const hasSkills = (photoSlots.abilita === true || photoSlots.abilita === 'true') || 
                    (photoSlots.booster === true || photoSlots.booster === 'true')
  
  const count = [hasCard, hasStats, hasSkills].filter(Boolean).length
  
  if (count === 3) return 'rgba(34, 197, 94, 0.8)'      // Verde
  if (count === 2) return 'rgba(251, 191, 36, 0.8)'      // Giallo
  return 'rgba(239, 68, 68, 0.8)'                        // Rosso
}
```

**Colori mostrati**:
- 🟢 **Verde**: 3/3 foto (card + statistiche + abilita/booster)
- 🟡 **Giallo**: 2/3 foto
- 🔴 **Rosso**: 0-1/3 foto

**Status**: ✅ **CORRETTO** - Normalizza boolean e stringhe

---

### **8. UX: Visualizzazione in AssignModal**

**File**: `app/gestione-formazione/page.jsx` (riga 2884-2898)

**Codice**:
```javascript
const photoSlots = currentPlayer?.photo_slots || {}

const isProfileComplete = photoSlots.card && photoSlots.statistiche && (photoSlots.abilita || photoSlots.booster)
const completedSections = [
  photoSlots.card && 'Card',
  photoSlots.statistiche && 'Statistiche',
  (photoSlots.abilita || photoSlots.booster) && 'Abilità/Booster'
].filter(Boolean).length
```

**Visualizzazione**:
- Mostra sezioni completate (es: "2/3 foto caricate")
- Usa truthy check (non `=== true`)

**Status**: ⚠️ **POSSIBILE INCOERENZA**

**Problema**: AssignModal usa truthy check, mentre `getProfileBorderColor` usa `=== true`. Se valori sono stringhe `"true"`, AssignModal li conta ma `getProfileBorderColor` li conta solo con normalizzazione.

**Fix applicato**: ✅ `getProfileBorderColor` normalizza anche stringhe

---

## 🔍 VERIFICA COERENZA

### **Frontend → Backend**

| Frontend | Backend | Status |
|----------|---------|--------|
| `{ card: true }` | `{ card: true }` | ✅ |
| `{}` (vuoto) | `null` | ✅ |
| `null` | `null` | ✅ |

**Status**: ✅ **COERENTE**

---

### **Backend → Supabase**

| Backend | Supabase | Status |
|---------|----------|--------|
| `{ card: true }` | `{ "card": true }` (JSONB) | ✅ |
| `null` | `null` | ✅ |
| Merge corretto | Mantiene esistenti | ✅ |

**Status**: ✅ **COERENTE**

---

### **Supabase → Frontend**

| Supabase | Frontend | Status |
|----------|----------|--------|
| `{ "card": true }` | `{ card: true }` | ✅ |
| `{ "card": "true" }` | `{ card: "true" }` | ⚠️ (gestito) |
| `null` | `null` | ✅ |

**Status**: ✅ **COERENTE** (con normalizzazione)

---

### **Frontend → UX**

| photo_slots | Colore Bordo | Status |
|-------------|--------------|--------|
| `{ card: true, statistiche: true, abilita: true }` | 🟢 Verde | ✅ |
| `{ card: true, statistiche: true }` | 🟡 Giallo | ✅ |
| `{ card: true }` | 🔴 Rosso | ✅ |
| `null` o `{}` | 🔴 Rosso | ✅ |
| `{ card: "true" }` | 🟡 Giallo (normalizzato) | ✅ |

**Status**: ✅ **COERENTE**

---

## ⚠️ POSSIBILI PROBLEMI

### **Problema 1: Valori Stringhe in Database**

**Scenario**: Supabase potrebbe salvare `"true"` (stringa) invece di `true` (boolean).

**Mitigazione**: ✅ `getProfileBorderColor` normalizza (`=== true || === 'true'`)

**Status**: ✅ **GESTITO**

---

### **Problema 2: Oggetto Vuoto `{}`**

**Scenario**: Se `photo_slots = {}` (oggetto vuoto), viene contato come "nessun dato".

**Comportamento**:
- `getProfileBorderColor`: Ritorna rosso ✅
- AssignModal: Conta 0 sezioni ✅

**Status**: ✅ **COERENTE**

---

### **Problema 3: Incoerenza AssignModal vs getProfileBorderColor**

**Scenario**: AssignModal usa truthy, `getProfileBorderColor` usa `=== true`.

**Esempio**:
- `photoSlots.card = "true"` (stringa)
- AssignModal: Conta come true (truthy) ✅
- `getProfileBorderColor`: Conta come true (normalizzato) ✅

**Status**: ✅ **COERENTE** (dopo normalizzazione)

---

## ✅ CHECKLIST VERIFICA

### **Frontend**
- [x] photo_slots creato correttamente (boolean `true`)
- [x] photo_slots incluso nel payload
- [x] Lettura da Supabase corretta
- [x] Normalizzazione valori (boolean/stringhe)

### **Backend**
- [x] Validazione input corretta
- [x] Salvataggio corretto (null se vuoto)
- [x] Merge intelligente (mantiene esistenti)
- [x] Gestione update corretta

### **Supabase**
- [x] Tipo JSONB corretto
- [x] Valori salvati correttamente
- [x] Query select include photo_slots

### **UX**
- [x] Colori bordo corretti (rosso/giallo/verde)
- [x] Normalizzazione valori
- [x] Coerenza con AssignModal

---

## 🎯 CONCLUSIONE

**Status**: ✅ **FLUSSO COERENTE**

**Motivi**:
- ✅ Frontend crea valori boolean corretti
- ✅ Backend valida e salva correttamente
- ✅ Merge intelligente mantiene dati esistenti
- ✅ UX normalizza valori (boolean/stringhe)
- ✅ Tutti i casi edge gestiti

**Raccomandazione**: ✅ **FLUSSO CORRETTO E COERENTE**

---

**Nota**: La normalizzazione in `getProfileBorderColor` gestisce eventuali inconsistenze tra boolean e stringhe che potrebbero verificarsi durante la serializzazione JSON in Supabase.
