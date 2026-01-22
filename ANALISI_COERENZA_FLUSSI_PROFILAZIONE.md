# 🔍 ANALISI COERENZA FLUSSI PROFILAZIONE

**Data**: Gennaio 2025  
**Obiettivo**: Verificare che un giocatore non possa essere sia titolare che riserva, e che non ci siano duplicati

---

## 📋 REGOLE BUSINESS

1. **Un giocatore NON può essere sia titolare che riserva** (stesso record)
2. **Non possono esserci 2 riserve con stesso giocatore** (nome+età)
3. **Non possono esserci 2 titolari con stesso giocatore** (nome+età)

---

## 🔄 FLUSSI DA VERIFICARE

### **FLUSSO 1: Upload Titolare** (`handleUploadPlayerToSlot`)
**Endpoint**: `/api/supabase/save-player` (POST)

**Frontend**:
- ✅ Verifica duplicati titolari (nome+età)
- ✅ Se trova duplicato, rimuove vecchio → **PROBLEMA**: non verifica se vecchio già in riserve!

**Backend**:
- ✅ Verifica duplicati titolari (nome+età)
- ❌ **PROBLEMA**: Se sostituisce, il vecchio torna riserva ma non verifica duplicati riserve

**Caso Edge**:
- Titolare "Messi" in slot 5
- Upload nuovo "Messi" in slot 0
- Vecchio "Messi" torna riserva
- Se già esiste "Messi" in riserve → **DUPLICATO RISERVA!**

---

### **FLUSSO 2: Upload Riserva** (`handleUploadReserve`)
**Endpoint**: `/api/supabase/save-player` (POST, slot_index=null)

**Frontend**:
- ✅ Verifica duplicati riserve (nome+età)
- ✅ Se trova duplicato, elimina vecchio e sostituisce

**Backend**:
- ✅ Verifica duplicati riserve (nome+età)
- ✅ Ritorna errore se duplicato

**Status**: ✅ **OK**

---

### **FLUSSO 3: Assegna da Riserva a Titolare** (`handleAssignFromReserve`)
**Endpoint**: `/api/supabase/assign-player-to-slot` (PATCH)

**Frontend**:
- ✅ Verifica duplicati titolari (nome+età)
- ✅ Se trova duplicato, rimuove vecchio titolare

**Backend**:
- ✅ Verifica duplicati titolari (nome+età)
- ✅ Assegna slot (giocatore passa da riserva a titolare)

**Caso Edge**:
- Riserva "Messi"
- Titolare "Messi" già in slot 5
- Assegna riserva a slot 0
- Backend blocca (duplicato titolare) ✅
- Frontend rimuove vecchio titolare → torna riserva
- **PROBLEMA**: Ora abbiamo 2 "Messi" in riserve! (vecchio titolare + riserva originale)

**Status**: ⚠️ **PROBLEMA**: Quando rimuove vecchio titolare, non verifica duplicati riserve

---

### **FLUSSO 4: Rimuovi da Titolare** (`handleRemoveFromSlot`)
**Endpoint**: `/api/supabase/remove-player-from-slot` (PATCH)

**Frontend**:
- ❌ **PROBLEMA**: Non verifica se stesso giocatore già in riserve

**Backend**:
- ✅ Rimuove da slot (slot_index = null)
- ❌ **PROBLEMA**: Non verifica duplicati riserve

**Caso Edge**:
- Titolare "Messi" in slot 5
- Riserva "Messi" già presente
- Rimuovo titolare → torna riserva
- **RISULTATO**: 2 "Messi" in riserve! ❌

**Status**: ❌ **PROBLEMA CRITICO**

---

### **FLUSSO 5: Elimina Riserva** (`handleDeleteReserve`)
**Endpoint**: `/api/supabase/delete-player` (DELETE)

**Status**: ✅ **OK** (elimina completamente)

---

### **FLUSSO 6: Elimina Titolare** (`handleDeletePlayer`)
**Endpoint**: `/api/supabase/delete-player` (DELETE)

**Status**: ✅ **OK** (elimina completamente)

---

## ⚠️ PROBLEMI IDENTIFICATI

### **PROBLEMA 1: Rimuovi da Titolare → Duplicato Riserva**
**Scenario**:
1. Titolare "Messi" in slot 5
2. Riserva "Messi" già presente
3. Rimuovo titolare → torna riserva
4. **RISULTATO**: 2 "Messi" in riserve ❌

**Fix Necessario**:
- `handleRemoveFromSlot`: Verifica duplicati riserve prima di rimuovere
- `remove-player-from-slot`: Verifica duplicati riserve backend
- Se trova duplicato: chiedi conferma per eliminare vecchio riserva o bloccare operazione

---

### **PROBLEMA 2: Sostituisci Titolare → Duplicato Riserva**
**Scenario**:
1. Titolare "Messi" in slot 5
2. Riserva "Messi" già presente
3. Upload nuovo "Messi" in slot 0
4. Vecchio titolare torna riserva
5. **RISULTATO**: 2 "Messi" in riserve ❌

**Fix Necessario**:
- `handleUploadPlayerToSlot`: Quando rimuove vecchio titolare, verifica duplicati riserve
- Se trova duplicato: elimina vecchio riserva prima di rimuovere titolare

---

### **PROBLEMA 3: Assegna da Riserva → Duplicato Riserva**
**Scenario**:
1. Riserva "Messi" (id: 123)
2. Titolare "Messi" in slot 5 (id: 456)
3. Assegno riserva 123 a slot 0
4. Frontend rimuove titolare 456 → torna riserva
5. **RISULTATO**: 2 "Messi" in riserve (123 + 456) ❌

**Fix Necessario**:
- `handleAssignFromReserve`: Quando rimuove vecchio titolare, verifica duplicati riserve
- Se trova duplicato: elimina vecchio riserva prima di rimuovere titolare

---

## 🔧 SOLUZIONI PROPOSTE

### **SOLUZIONE 1: Fix `remove-player-from-slot`**

**Backend** (`app/api/supabase/remove-player-from-slot/route.js`):
```javascript
// Prima di rimuovere, verifica duplicati riserve
const playerName = player.player_name?.trim().toLowerCase()
const playerAge = player.age != null ? Number(player.age) : null

if (playerName) {
  // Cerca duplicati riserve
  let duplicateQuery = admin
    .from('players')
    .select('id, player_name, age')
    .eq('user_id', userId)
    .is('slot_index', null)
    .neq('id', player_id) // Escludi questo giocatore
    .ilike('player_name', playerName)
  
  const { data: duplicates, error: dupError } = await duplicateQuery
  
  if (!dupError && duplicates && duplicates.length > 0) {
    const exactDuplicates = playerAge != null
      ? duplicates.filter(p => p.age != null && Number(p.age) === playerAge)
      : duplicates
    
    if (exactDuplicates.length > 0) {
      // Ritorna warning invece di errore
      return NextResponse.json({
        warning: `Player "${player.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} already exists in reserves`,
        duplicate_reserve_id: exactDuplicates[0].id,
        action: 'remove_and_merge' // Frontend deve gestire
      }, { status: 200 }) // 200 invece di 400 per permettere gestione frontend
    }
  }
}

// Se nessun duplicato, procedi normalmente
```

**Frontend** (`handleRemoveFromSlot`):
```javascript
const data = await res.json()
if (data.warning && data.duplicate_reserve_id) {
  const confirmMsg = `Il giocatore "${playerName}"${playerAge ? ` (${playerAge} anni)` : ''} è già presente nelle riserve. Vuoi eliminare il duplicato nelle riserve?`
  if (window.confirm(confirmMsg)) {
    // Elimina duplicato riserva
    await fetch('/api/supabase/delete-player', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ player_id: data.duplicate_reserve_id })
    })
  } else {
    // Blocca operazione
    throw new Error('Operazione annullata: giocatore già presente nelle riserve')
  }
}
```

---

### **SOLUZIONE 2: Fix `handleUploadPlayerToSlot`**

Quando rimuove vecchio titolare, verifica duplicati riserve:
```javascript
// Rimuovi vecchio giocatore (torna riserva)
await supabase
  .from('players')
  .update({ 
    slot_index: null,
    updated_at: new Date().toISOString()
  })
  .eq('id', duplicatePlayer.id)

// VERIFICA DUPLICATI RISERVE
const duplicateReserve = riserve.find(p => {
  const pName = String(p.player_name || '').trim().toLowerCase()
  const pAge = p.age != null ? Number(p.age) : null
  return pName === playerName && 
         (playerAge ? pAge === playerAge : true) &&
         p.id !== duplicatePlayer.id
})

if (duplicateReserve) {
  // Elimina duplicato riserva
  await fetch('/api/supabase/delete-player', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ player_id: duplicateReserve.id })
  })
}
```

---

### **SOLUZIONE 3: Fix `handleAssignFromReserve`**

Quando rimuove vecchio titolare, verifica duplicati riserve:
```javascript
// Rimuovi vecchio giocatore (torna riserva)
await supabase
  .from('players')
  .update({ 
    slot_index: null,
    updated_at: new Date().toISOString()
  })
  .eq('id', duplicatePlayer.id)

// VERIFICA DUPLICATI RISERVE
const duplicateReserve = riserve.find(p => {
  const pName = String(p.player_name || '').trim().toLowerCase()
  const pAge = p.age != null ? Number(p.age) : null
  return pName === playerName && 
         (playerAge ? pAge === playerAge : true) &&
         p.id !== duplicatePlayer.id &&
         p.id !== playerId // Escludi riserva che stiamo assegnando
})

if (duplicateReserve) {
  // Elimina duplicato riserva
  await fetch('/api/supabase/delete-player', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ player_id: duplicateReserve.id })
  })
}
```

---

## ✅ CHECKLIST COERENZA

### **Regola 1: Giocatore NON può essere sia titolare che riserva**
- [x] Upload titolare: giocatore ha slot_index 0-10
- [x] Upload riserva: giocatore ha slot_index null
- [x] Assegna riserva→titolare: slot_index cambia da null a 0-10
- [x] Rimuovi titolare: slot_index cambia da 0-10 a null
- ✅ **OK**: Un record può avere solo un slot_index (null o 0-10)

### **Regola 2: Non possono esserci 2 riserve con stesso giocatore**
- [x] Upload riserva: verifica duplicati riserve ✅
- [ ] Rimuovi titolare: **NON verifica duplicati riserve** ❌
- [ ] Sostituisci titolare: **NON verifica duplicati riserve** ❌
- [ ] Assegna riserva→titolare: **NON verifica duplicati riserve** ❌

### **Regola 3: Non possono esserci 2 titolari con stesso giocatore**
- [x] Upload titolare: verifica duplicati titolari ✅
- [x] Assegna riserva→titolare: verifica duplicati titolari ✅
- ✅ **OK**: Duplicati titolari prevenuti

---

## 🎯 PRIORITÀ FIX

1. **CRITICO**: Fix `remove-player-from-slot` (verifica duplicati riserve)
2. **ALTO**: Fix `handleUploadPlayerToSlot` (verifica duplicati riserve quando rimuove vecchio)
3. **ALTO**: Fix `handleAssignFromReserve` (verifica duplicati riserve quando rimuove vecchio)

---

## 📊 MATRICE COERENZA

| Flusso | Titolare→Titolare | Riserva→Riserva | Titolare→Riserva | Riserva→Titolare |
|--------|-------------------|-----------------|-----------------|------------------|
| Upload Titolare | ✅ Bloccato | ❌ Non verifica | ❌ Non verifica | N/A |
| Upload Riserva | N/A | ✅ Bloccato | N/A | N/A |
| Assegna Riserva→Titolare | ✅ Bloccato | ❌ Non verifica | N/A | ✅ OK |
| Rimuovi Titolare | N/A | ❌ Non verifica | ❌ **PROBLEMA** | N/A |

**Legenda**:
- ✅ = Gestito correttamente
- ❌ = Problema identificato
- N/A = Non applicabile

---

**Prossimo Step**: Implementare fix per tutti i problemi identificati?
