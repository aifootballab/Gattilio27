# 📋 TODO: Gestione Caricamento Formazione Multipla

**Priorità**: ALTA  
**Stato**: Da implementare

---

## 🎯 PROBLEMA

Quando il cliente carica una nuova formazione:

1. **Titolari esistenti** → Devono essere sostituiti (slot_index 0-10)
2. **Riserve esistenti** → Possono diventare titolari nella nuova formazione
3. **Conflitti possibili**:
   - Giocatore A è riserva (slot_index NULL)
   - Nuova formazione: Giocatore A diventa titolare (slot_index 5)
   - **Rischio**: Duplicato o conflitto

---

## ✅ SOLUZIONE PROPOSTA

### Comportamento Corretto

1. **Prima di salvare nuova formazione**:
   - Cancella vecchi titolari (slot_index 0-10)
   - **NON cancellare riserve** (slot_index NULL)

2. **Per ogni giocatore della nuova formazione**:
   - Verifica se esiste già (per `player_name` o `metadata.player_face_description`)
   - Se esiste come **riserva** (slot_index NULL):
     - **UPDATE**: Cambia `slot_index` da NULL a 0-10
     - Aggiorna altri dati se presenti (stats, skills, ecc.)
   - Se esiste come **titolare** (slot_index 0-10):
     - **UPDATE**: Aggiorna `slot_index` e dati
   - Se **non esiste**:
     - **INSERT**: Crea nuovo giocatore con slot_index 0-10

3. **Risultato**:
   - ✅ Vecchi titolari sostituiti
   - ✅ Riserve che diventano titolari → aggiornate (non duplicate)
   - ✅ Nuovi giocatori → creati
   - ✅ Riserve non toccate → rimangono

---

## 🔧 IMPLEMENTAZIONE

### Step 1: API Route per UPSERT Giocatore

**Nuovo endpoint**: `PATCH /api/supabase/upsert-player-formation`

**Logica**:
```javascript
// 1. Cerca giocatore esistente (per nome o face_description)
const existing = await findPlayerByNameOrFace(playerName, faceDescription, userId)

if (existing) {
  // 2a. Se esiste → UPDATE
  await updatePlayer(existing.id, {
    slot_index: newSlotIndex,
    ...otherData
  })
} else {
  // 2b. Se non esiste → INSERT
  await insertPlayer({
    slot_index: newSlotIndex,
    ...playerData
  })
}
```

### Step 2: Modifica Upload Page

**In `app/upload/page.jsx`**:

```javascript
if (uploadType === 'formation') {
  // 1. Cancella vecchi titolari
  await deleteOldStarters(userId)
  
  // 2. Per ogni giocatore estratto
  for (let player of players) {
    // 3. UPSERT (UPDATE se esiste, INSERT se nuovo)
    await upsertPlayerForFormation(player, slotIndex, userId)
  }
}
```

### Step 3: Funzione di Ricerca Giocatore

**Criteri di matching**:
1. **Primario**: `player_name` (esatto o simile)
2. **Secondario**: `metadata.player_face_description` (se disponibile)

**Query**:
```sql
SELECT * FROM players
WHERE user_id = $1
  AND (
    player_name ILIKE $2
    OR metadata->>'player_face_description' = $3
  )
LIMIT 1
```

---

## ⚠️ CASI EDGE

### Caso 1: Giocatore Riserva → Titolare
```
Prima: Giocatore A (slot_index: NULL, riserva)
Nuova formazione: Giocatore A (slot_index: 5, titolare)
Azione: UPDATE slot_index = 5
Risultato: ✅ Giocatore A diventa titolare
```

### Caso 2: Giocatore Titolare → Stesso Slot
```
Prima: Giocatore B (slot_index: 3)
Nuova formazione: Giocatore B (slot_index: 3)
Azione: UPDATE dati (mantiene slot_index 3)
Risultato: ✅ Giocatore B aggiornato
```

### Caso 3: Giocatore Titolare → Cambio Slot
```
Prima: Giocatore C (slot_index: 2)
Nuova formazione: Giocatore C (slot_index: 7)
Azione: UPDATE slot_index = 7
Risultato: ✅ Giocatore C spostato a slot 7
```

### Caso 4: Giocatore Nuovo
```
Prima: Non esiste
Nuova formazione: Giocatore D (slot_index: 1)
Azione: INSERT nuovo giocatore
Risultato: ✅ Giocatore D creato
```

### Caso 5: Giocatore Titolare → Rimosso
```
Prima: Giocatore E (slot_index: 4)
Nuova formazione: Giocatore E non presente
Azione: Giocatore E rimane (non viene cancellato automaticamente)
Risultato: ⚠️ Giocatore E rimane come titolare (slot 4)
```

**Nota**: Per il caso 5, se vogliamo rimuovere giocatori non presenti nella nuova formazione, dobbiamo:
- Cancellare tutti i titolari prima
- Poi salvare solo quelli della nuova formazione

---

## 🎯 RACCOMANDAZIONE FINALE

### Opzione A: **Cancellazione + UPSERT** (CONSIGLIATA)

**Comportamento**:
1. Cancella TUTTI i titolari esistenti (slot_index 0-10)
2. Per ogni giocatore nuova formazione:
   - Se esiste come riserva → UPDATE (slot_index + dati)
   - Se non esiste → INSERT nuovo

**Vantaggi**:
- ✅ Nessun conflitto
- ✅ Riserve che diventano titolari → gestite correttamente
- ✅ Giocatori rimossi dalla formazione → cancellati automaticamente
- ✅ Logica semplice

**Svantaggi**:
- ⚠️ Se giocatore era titolare e non è nella nuova formazione → viene cancellato
- ⚠️ Dati giocatore (stats, skills) vengono persi se cancellato

---

### Opzione B: **UPSERT Intelligente** (ALTERNATIVA)

**Comportamento**:
1. NON cancellare nulla
2. Per ogni giocatore nuova formazione:
   - Cerca esistente (nome o face)
   - Se esiste → UPDATE slot_index
   - Se non esiste → INSERT
3. Dopo salvataggio, cancella titolari "orfani" (non nella nuova formazione)

**Vantaggi**:
- ✅ Mantiene dati giocatori
- ✅ Più flessibile

**Svantaggi**:
- ⚠️ Più complesso
- ⚠️ Richiede logica aggiuntiva per "orfani"

---

## 📝 IMPLEMENTAZIONE DETTAGLIATA

### 1. Nuovo Endpoint: `PATCH /api/supabase/upsert-player-formation`

```javascript
// Cerca giocatore esistente
const existing = await findPlayerByNameOrFace(playerName, faceDescription, userId)

if (existing) {
  // UPDATE
  await admin
    .from('players')
    .update({
      slot_index: slotIndex,
      ...updatedData
    })
    .eq('id', existing.id)
} else {
  // INSERT
  await admin
    .from('players')
    .insert({
      user_id: userId,
      slot_index: slotIndex,
      ...playerData
    })
}
```

### 2. Modifica `app/upload/page.jsx`

```javascript
if (uploadType === 'formation') {
  // 1. Cancella vecchi titolari
  const { error: deleteError } = await supabase
    .from('players')
    .delete()
    .eq('user_id', userId)
    .in('slot_index', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  
  if (deleteError) {
    throw new Error('Errore cancellazione vecchi titolari')
  }
  
  // 2. UPSERT ogni giocatore
  for (let player of players) {
    await fetch('/api/supabase/upsert-player-formation', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        player,
        slot_index: slotIndex
      })
    })
  }
}
```

---

## ✅ CHECKLIST IMPLEMENTAZIONE

- [ ] Creare endpoint `PATCH /api/supabase/upsert-player-formation`
- [ ] Implementare ricerca giocatore (nome + face_description)
- [ ] Implementare logica UPDATE vs INSERT
- [ ] Modificare `app/upload/page.jsx` per cancellare vecchi titolari
- [ ] Modificare `app/upload/page.jsx` per usare UPSERT invece di INSERT
- [ ] Aggiungere traduzioni (IT/EN) per messaggi
- [ ] Testare scenari:
  - [ ] Riserva → Titolare
  - [ ] Titolare → Stesso slot
  - [ ] Titolare → Cambio slot
  - [ ] Nuovo giocatore
  - [ ] Giocatore rimosso dalla formazione
- [ ] Gestione errori robusta
- [ ] Messaggi informativi al cliente

---

## 📝 NOTE

- **Matching giocatori**: Usare `player_name` come primario, `player_face_description` come fallback
- **Case sensitivity**: Usare `ILIKE` per matching nome (case-insensitive)
- **Fuzzy matching**: Considerare nomi simili (es. "Ronaldinho" vs "Ronaldinho Gaúcho")
- **Performance**: Indice su `player_name` per ricerca veloce

---

**Priorità**: ALTA  
**Stima**: 2-3 ore  
**Dipendenze**: Nessuna
