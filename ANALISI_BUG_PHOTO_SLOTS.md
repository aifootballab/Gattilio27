# 🐛 Analisi Bug: photo_slots Non Contati Correttamente

**Data**: 26 Gennaio 2026  
**Problema**: UX mostra 2 foto caricate ma sistema dice rosso (0 caricate)

---

## 🔍 ANALISI PROBLEMA

### **Sintomo**
- UX mostra che ci sono 2 foto caricate
- Sistema mostra bordo **rosso** (0-1 foto)
- Dovrebbe mostrare **giallo** (2 foto)

---

## 🔎 VERIFICA LOGICA CONTEggio

### **Funzione `getProfileBorderColor`** (riga 2510-2528)

**Codice attuale**:
```javascript
function getProfileBorderColor(photoSlots) {
  if (!photoSlots || typeof photoSlots !== 'object') {
    return 'rgba(239, 68, 68, 0.8)' // Rosso: nessun dato
  }
  
  const hasCard = photoSlots.card === true
  const hasStats = photoSlots.statistiche === true
  const hasSkills = photoSlots.abilita === true || photoSlots.booster === true
  
  const count = [hasCard, hasStats, hasSkills].filter(Boolean).length
  
  if (count === 3) {
    return 'rgba(34, 197, 94, 0.8)'      // Verde: completo (3/3)
  }
  if (count === 2) {
    return 'rgba(251, 191, 36, 0.8)'      // Giallo: parziale (2/3)
  }
  return 'rgba(239, 68, 68, 0.8)'        // Rosso: incompleto (0-1/3)
}
```

**Logica**: ✅ **CORRETTA**
- Verifica `card === true`
- Verifica `statistiche === true`
- Verifica `abilita === true || booster === true`
- Conta correttamente

---

## 🔍 POSSIBILI CAUSE

### **Causa 1: photo_slots Non Salvato Correttamente**

**Scenario**: Frontend imposta `photoSlots.card = true`, ma backend non salva correttamente.

**Verifica**:
- `app/api/supabase/save-player/route.js` (riga 140-142):
  ```javascript
  photo_slots: player.photo_slots && typeof player.photo_slots === 'object' 
    ? player.photo_slots 
    : null
  ```
  - ⚠️ **PROBLEMA**: Se `player.photo_slots` è `{}` (oggetto vuoto), viene salvato come `null`?
  - ⚠️ **PROBLEMA**: Se `player.photo_slots` non è presente, viene salvato come `null`

**Status**: ⚠️ **POSSIBILE PROBLEMA**

---

### **Causa 2: Merge photo_slots Sovrascrive Dati**

**Scenario**: Quando si aggiorna un giocatore esistente, il merge potrebbe perdere dati.

**Verifica**:
- `app/api/supabase/save-player/route.js` (riga 170-172):
  ```javascript
  const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
  const newPhotoSlots = playerData.photo_slots || {}
  const mergedPhotoSlots = { ...existingPhotoSlots, ...newPhotoSlots }
  ```
  - ✅ **OK**: Merge corretto (spread operator)
  - ⚠️ **PROBLEMA**: Se `newPhotoSlots` è `{}` o `null`, potrebbe sovrascrivere `existingPhotoSlots`

**Status**: ⚠️ **POSSIBILE PROBLEMA**

---

### **Causa 3: photo_slots Non Passato al Salvataggio**

**Scenario**: Frontend non passa `photo_slots` quando salva giocatore.

**Verifica**:
- `app/gestione-formazione/page.jsx` (riga 1636, 1671):
  ```javascript
  photo_slots: photoSlots // Includi photo_slots tracciati
  ```
  - ✅ **OK**: `photo_slots` viene passato

**Status**: ✅ **OK**

---

### **Causa 4: photo_slots Letto Come Null/Undefined**

**Scenario**: Quando si legge dal database, `photo_slots` potrebbe essere `null` o `undefined`.

**Verifica**:
- `app/gestione-formazione/page.jsx` (riga 127):
  ```javascript
  photo_slots: p.photo_slots || null,
  ```
  - ⚠️ **PROBLEMA**: Se `p.photo_slots` è `{}` (oggetto vuoto), `|| null` lo converte in `null`?
  - ❌ **NO**: `{}` è truthy, quindi non viene convertito in `null`
  - ✅ **OK**: Solo se `p.photo_slots` è `null`, `undefined`, `0`, `''`, `false` → diventa `null`

**Status**: ✅ **OK** (ma da verificare)

---

### **Causa 5: Valori Boolean Non Esatti**

**Scenario**: `photo_slots.card` potrebbe essere `"true"` (stringa) invece di `true` (boolean).

**Verifica**:
- Funzione `getProfileBorderColor` verifica `=== true` (riga 2515-2517)
  - ✅ **OK**: Verifica esplicita `=== true`
  - ⚠️ **PROBLEMA**: Se valore è `"true"` (stringa), non viene contato

**Status**: ⚠️ **POSSIBILE PROBLEMA**

---

## 🔧 DIAGNOSTICA

### **Test 1: Verificare Valori in Database**

**Query Supabase**:
```sql
SELECT 
  id, 
  player_name, 
  photo_slots,
  photo_slots->>'card' as card,
  photo_slots->>'statistiche' as statistiche,
  photo_slots->>'abilita' as abilita,
  photo_slots->>'booster' as booster
FROM players
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

**Cosa verificare**:
- `photo_slots` è `null` o oggetto?
- Valori sono boolean (`true`/`false`) o stringhe (`"true"`/`"false"`)?
- Tutti i valori sono presenti?

---

### **Test 2: Log Frontend**

**Aggiungere log temporaneo**:
```javascript
// In getProfileBorderColor, prima del return
console.log('[DEBUG] photoSlots:', photoSlots)
console.log('[DEBUG] hasCard:', hasCard, 'type:', typeof photoSlots?.card)
console.log('[DEBUG] hasStats:', hasStats, 'type:', typeof photoSlots?.statistiche)
console.log('[DEBUG] hasSkills:', hasSkills, 'type:', typeof photoSlots?.abilita, photoSlots?.booster)
console.log('[DEBUG] count:', count)
```

---

### **Test 3: Verificare Salvataggio**

**Aggiungere log in save-player**:
```javascript
// In save-player/route.js, prima del salvataggio
console.log('[DEBUG] player.photo_slots:', JSON.stringify(player.photo_slots))
console.log('[DEBUG] playerData.photo_slots:', JSON.stringify(playerData.photo_slots))
```

---

## 🎯 SOLUZIONI PROPOSTE

### **Soluzione 1: Normalizzare Valori Boolean**

**Problema**: Valori potrebbero essere stringhe invece di boolean.

**Fix**:
```javascript
function getProfileBorderColor(photoSlots) {
  if (!photoSlots || typeof photoSlots !== 'object') {
    return 'rgba(239, 68, 68, 0.8)' // Rosso: nessun dato
  }
  
  // Normalizza valori (gestisce boolean e stringhe)
  const hasCard = photoSlots.card === true || photoSlots.card === 'true'
  const hasStats = photoSlots.statistiche === true || photoSlots.statistiche === 'true'
  const hasSkills = (photoSlots.abilita === true || photoSlots.abilita === 'true') || 
                    (photoSlots.booster === true || photoSlots.booster === 'true')
  
  const count = [hasCard, hasStats, hasSkills].filter(Boolean).length
  
  if (count === 3) {
    return 'rgba(34, 197, 94, 0.8)'      // Verde: completo (3/3)
  }
  if (count === 2) {
    return 'rgba(251, 191, 36, 0.8)'      // Giallo: parziale (2/3)
  }
  return 'rgba(239, 68, 68, 0.8)'        // Rosso: incompleto (0-1/3)
}
```

---

### **Soluzione 2: Verificare Merge photo_slots**

**Problema**: Merge potrebbe perdere dati se `newPhotoSlots` è vuoto.

**Fix**:
```javascript
// In save-player/route.js
const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
const newPhotoSlots = playerData.photo_slots || {}

// Merge intelligente: solo se newPhotoSlots ha valori, altrimenti mantieni existing
const mergedPhotoSlots = Object.keys(newPhotoSlots).length > 0
  ? { ...existingPhotoSlots, ...newPhotoSlots }
  : existingPhotoSlots
```

---

### **Soluzione 3: Verificare Salvataggio photo_slots**

**Problema**: `photo_slots` potrebbe non essere salvato se è oggetto vuoto.

**Fix**:
```javascript
// In save-player/route.js
photo_slots: player.photo_slots && typeof player.photo_slots === 'object' && Object.keys(player.photo_slots).length > 0
  ? player.photo_slots 
  : (existingPlayerInSlot?.photo_slots || null)
```

---

## 📋 CHECKLIST DEBUG

### **Da Verificare**
- [ ] Valori `photo_slots` in database (boolean vs stringhe)
- [ ] Merge `photo_slots` durante salvataggio
- [ ] Passaggio `photo_slots` da frontend a backend
- [ ] Lettura `photo_slots` da database
- [ ] Normalizzazione valori boolean

### **Test da Fare**
- [ ] Caricare 2 foto → Verificare database
- [ ] Verificare log console durante caricamento
- [ ] Verificare log backend durante salvataggio
- [ ] Test con valori boolean e stringhe

---

## 🎯 PROSSIMI PASSI

1. **Verificare database Supabase** per utente "attilio mazzetti.it"
2. **Aggiungere log temporanei** per debug
3. **Testare con valori diversi** (boolean, stringhe)
4. **Applicare fix** in base ai risultati

---

**Status**: 🔍 **IN ANALISI**

**Priorità**: 🔴 **ALTA** (bug UX critico)
