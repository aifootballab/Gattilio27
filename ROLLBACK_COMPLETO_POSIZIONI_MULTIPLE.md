# 🔄 ROLLBACK COMPLETO: Posizioni Multiple Originali (Input Manuale)

**Data Creazione**: 24 Gennaio 2026  
**Scopo**: Documento completo per ripristinare stato precedente se implementazione causa problemi

---

## 📋 STATO ATTUALE (PRIMA DELLE MODIFICHE)

### 1. **Schema Database**

**Tabella `players`**:
- ✅ `position` (TEXT) - Posizione principale giocatore
- ❌ `original_positions` (NON ESISTE) - Array posizioni originali
- ✅ `slot_index` (INTEGER) - Slot formazione (0-10 o NULL)
- ✅ Altri campi esistenti (base_stats, skills, etc.)

**Nessuna colonna `original_positions` esiste attualmente!**

---

### 2. **File Route Attuali**

#### `app/api/extract-player/route.js`
- Estrae solo `position` (singola posizione)
- NON estrae `original_positions` array
- Prompt attuale: riga 143-191

#### `app/api/supabase/save-player/route.js`
- Salva solo `position` (singola posizione)
- NON salva `original_positions`
- `playerData` attuale: riga 97-143

#### `app/api/supabase/assign-player-to-slot/route.js`
- Aggiorna solo `slot_index` (riga 191-196)
- NON adatta `position` automaticamente allo slot
- NON recupera `formationLayout`
- NON salva `original_positions`

#### `app/api/supabase/remove-player-from-slot/route.js`
- Resetta solo `slot_index` a NULL (riga 90-95)
- NON resetta `position` a originale

---

### 3. **File Frontend Attuali**

#### `app/gestione-formazione/page.jsx`
- `handleUploadPlayerToSlot`: riga 514-713
  - Estrae dati da immagini
  - Salva giocatore con `save-player` API
  - NON mostra modal selezione posizioni
  - NON gestisce `original_positions`

- `handleAssignFromReserve`: riga 207-319
  - Assegna giocatore esistente a slot
  - NON verifica posizioni originali
  - NON mostra conferma posizione

- **Stati attuali**:
  - `showUploadPlayerModal` - Modal upload foto
  - `uploadImages` - Array immagini caricate
  - `selectedSlot` - Slot selezionato
  - ❌ NON esiste: `showPositionSelectionModal`
  - ❌ NON esiste: `selectedOriginalPositions`

---

### 4. **File Helper Attuali**

#### `lib/countermeasuresHelper.js`
- `generateCountermeasuresPrompt`: riga 31-554
- NON verifica se posizione è originale
- NON distingue tra posizioni originali e non originali
- Mostra solo `position` nel prompt (riga 79-84)

---

### 5. **File i18n Attuali**

#### `lib/i18n.js`
- Chiavi esistenti per gestione formazione
- ❌ NON esiste: `selectOriginalPositions`
- ❌ NON esiste: `positionSelectionTitle`
- ❌ NON esiste: `positionSelectionDescription`
- ❌ NON esiste: `competenceLevel`
- ❌ NON esiste: `confirmPositionChange`
- ❌ NON esiste: `positionNotOriginal`

---

## 🔧 MODIFICHE DA ROLLBACK

### 1. **Database - Rimuovere Colonna**

**SQL Rollback**:
```sql
-- Rimuovi colonna original_positions
ALTER TABLE players DROP COLUMN IF EXISTS original_positions;

-- Rimuovi indice se esiste
DROP INDEX IF EXISTS idx_players_original_positions;

-- Verifica che colonna sia rimossa
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name = 'original_positions';
-- Deve restituire 0 righe
```

**Come Eseguire**:
1. Apri Supabase Dashboard
2. Vai a SQL Editor
3. Esegui comando sopra
4. Verifica che colonna sia rimossa

---

### 2. **File Route - Ripristinare Versione Precedente**

#### `app/api/extract-player/route.js`

**Righe da Ripristinare**: 143-191

**Rimuovere**:
- Nessuna modifica (prompt rimane invariato)

**Verifica**:
```javascript
// Prompt deve essere quello originale (solo position singola)
const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- PRIORITÀ: Usa la TABELLA statistiche se presente (non il radar chart)
- Estrai TUTTI questi dati: nome giocatore, posizione, overall rating, team, card_type, base_stats, skills, com_skills, boosters, height, weight, age, nationality, level, form, role, playing_style, ai_playstyles, matches_played, goals, assists, weak_foot_frequency, weak_foot_accuracy, injury_resistance
...
```

---

#### `app/api/supabase/save-player/route.js`

**Righe da Ripristinare**: 97-143

**Rimuovere**:
- Campo `original_positions` da `playerData` (se aggiunto)

**Ripristinare**:
```javascript
const playerData = {
  user_id: userId,
  player_name: toText(player.player_name),
  position: toText(player.position),  // Solo posizione principale
  card_type: toText(player.card_type),
  team: toText(player.team),
  overall_rating: typeof player.overall_rating === 'number' ? player.overall_rating : toInt(player.overall_rating),
  base_stats: player.base_stats && typeof player.base_stats === 'object' ? player.base_stats : {},
  skills: Array.isArray(player.skills) ? player.skills : [],
  com_skills: Array.isArray(player.com_skills) ? player.com_skills : [],
  position_ratings: player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {},
  available_boosters: Array.isArray(player.boosters) ? player.boosters : [],
  // ... resto campi esistenti ...
  // RIMUOVERE: original_positions
}
```

---

#### `app/api/supabase/assign-player-to-slot/route.js`

**Righe da Ripristinare**: 18-273

**Rimuovere**:
- Recupero `formationLayout` (se aggiunto prima di riga 51)
- Calcolo `slotPosition` (se aggiunto)
- Aggiornamento `position` automatico (riga 191-196 deve rimanere invariata)
- Salvataggio `original_positions` se vuoto (se aggiunto)

**Ripristinare**:
```javascript
// UPDATE: Assegna slot (SOLO slot_index, NON position)
const { error: updateError } = await admin
  .from('players')
  .update({
    slot_index: slot_index,
    updated_at: new Date().toISOString()
  })
  .eq('id', player_id)
```

**Ripristinare anche per `player_data`** (riga 213-237):
```javascript
const playerData = {
  user_id: userId,
  player_name: toText(player_data.player_name),
  position: toText(player_data.position),  // Posizione dalla card, NON adattata
  card_type: toText(player_data.card_type),
  team: toText(player_data.team),
  overall_rating: typeof player_data.overall_rating === 'number' 
    ? player_data.overall_rating 
    : toInt(player_data.overall_rating),
  base_stats: player_data.base_stats && typeof player_data.base_stats === 'object' 
    ? player_data.base_stats 
    : {},
  skills: Array.isArray(player_data.skills) ? player_data.skills : [],
  com_skills: Array.isArray(player_data.com_skills) ? player_data.com_skills : [],
  slot_index: slot_index,
  metadata: {
    source: 'formation_assignment',
    saved_at: new Date().toISOString(),
    player_face_description: player_data.player_face_description || null
  },
  extracted_data: player_data
  // RIMUOVERE: original_positions
}
```

---

#### `app/api/supabase/remove-player-from-slot/route.js`

**Righe da Ripristinare**: 8-120

**Rimuovere**:
- Recupero `original_positions` (se aggiunto prima di riga 90)
- Reset `position` a `original_position` (se aggiunto)

**Ripristinare**:
```javascript
// Rimuovi da slot (SOLO slot_index, NON position)
const { error: updateError } = await admin
  .from('players')
  .update({
    slot_index: null,
    updated_at: new Date().toISOString()
  })
  .eq('id', player_id)
  .eq('user_id', userId)
```

---

### 3. **File Frontend - Ripristinare Versione Precedente**

#### `app/gestione-formazione/page.jsx`

**Righe da Ripristinare**: 514-713 (`handleUploadPlayerToSlot`)

**Rimuovere**:
- Stato `showPositionSelectionModal` (se aggiunto)
- Stato `selectedOriginalPositions` (se aggiunto)
- Stato `extractedPlayerData` (se aggiunto)
- Logica per mostrare modal selezione posizioni (se aggiunta dopo riga 613)
- Componente `PositionSelectionModal` (se aggiunto)

**Ripristinare**:
```javascript
const handleUploadPlayerToSlot = async () => {
  if (!selectedSlot || uploadImages.length === 0) return

  setUploadingPlayer(true)
  setError(null)

  try {
    // ... estrazione dati esistente (riga 520-613) ...
    
    // DOPO estrazione, salva direttamente (NON mostrare modal)
    // Salva giocatore e assegna allo slot
    const saveRes = await fetch('/api/supabase/save-player', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        player: {
          ...playerData,
          slot_index: selectedSlot.slot_index,
          photo_slots: photoSlots
        }
      })
    })
    
    // ... resto codice esistente ...
  }
}
```

**Righe da Ripristinare**: 207-319 (`handleAssignFromReserve`)

**Rimuovere**:
- Verifica posizioni originali (se aggiunta)
- Conferma posizione (se aggiunta)
- Logica per mostrare alert/confirm (se aggiunta)

**Ripristinare**:
```javascript
const handleAssignFromReserve = async (playerId) => {
  if (!selectedSlot || !supabase) return

  setAssigning(true)
  setError(null)

  try {
    // ... controlli duplicati esistenti (riga 214-286) ...
    
    // Assegna direttamente (NON verificare posizioni)
    const res = await fetch('/api/supabase/assign-player-to-slot', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        slot_index: selectedSlot.slot_index,
        player_id: playerId
      })
    })
    
    // ... resto codice esistente ...
  }
}
```

**Rimuovere Componenti**:
- Se esiste `components/PositionSelectionModal.jsx` → Eliminare file
- Se esiste import in `page.jsx` → Rimuovere import

---

### 4. **File Helper - Ripristinare Versione Precedente**

#### `lib/countermeasuresHelper.js`

**Righe da Ripristinare**: 79-84 (sezione titolari)

**Rimuovere**:
- Funzione `isPositionOriginal()` (se aggiunta)
- Logica per verificare se posizione è originale (se aggiunta)
- Messaggi "Performance ottimale" vs "ATTENZIONE" (se aggiunti)

**Ripristinare**:
```javascript
titolari.forEach((p, idx) => {
  const slot = p.slot_index != null ? ` slot ${p.slot_index}` : ''
  const sk = (p.skills && Array.isArray(p.skills) ? p.skills.slice(0, 2).join(', ') : '') || (p.com_skills && Array.isArray(p.com_skills) ? p.com_skills.slice(0, 1).join(', ') : '')
  const skillsPart = sk ? ` (${sk})` : ''
  rosterText += `- [${p.id}] ${p.player_name || 'N/A'} - ${p.position || 'N/A'} - Overall ${p.overall_rating || 'N/A'}${skillsPart}${slot}\n`
})
```

---

### 5. **File i18n - Rimuovere Chiavi Aggiunte**

#### `lib/i18n.js`

**Rimuovere Chiavi** (se aggiunte):
```javascript
// RIMUOVERE queste chiavi se aggiunte:
selectOriginalPositions: '...',
positionSelectionTitle: '...',
positionSelectionDescription: '...',
competenceLevel: '...',
competenceHigh: '...',
competenceMedium: '...',
competenceLow: '...',
confirmPositionChange: '...',
positionNotOriginal: '...',
positionOriginal: '...',
// etc.
```

**Verifica**:
- Cercare tutte le chiavi che contengono "position", "original", "competence"
- Rimuovere solo quelle aggiunte per questa feature

---

## ✅ CHECKLIST ROLLBACK DETTAGLIATA

### Database
- [ ] Eseguire SQL per rimuovere colonna `original_positions`
- [ ] Eseguire SQL per rimuovere indice `idx_players_original_positions`
- [ ] Verificare che colonna sia rimossa (query `SELECT * FROM players LIMIT 1`)
- [ ] Verificare che non ci siano errori in query esistenti

### File Route
- [ ] Verificare `app/api/extract-player/route.js` (prompt invariato)
- [ ] Ripristinare `app/api/supabase/save-player/route.js` (rimuovere `original_positions` da `playerData`)
- [ ] Ripristinare `app/api/supabase/assign-player-to-slot/route.js` (rimuovere adattamento `position` automatico)
- [ ] Ripristinare `app/api/supabase/remove-player-from-slot/route.js` (rimuovere reset `position`)

### File Frontend
- [ ] Ripristinare `app/gestione-formazione/page.jsx`:
  - [ ] Rimuovere stati `showPositionSelectionModal`, `selectedOriginalPositions`, `extractedPlayerData`
  - [ ] Ripristinare `handleUploadPlayerToSlot` (rimuovere modal selezione)
  - [ ] Ripristinare `handleAssignFromReserve` (rimuovere verifica posizioni)
  - [ ] Rimuovere componente `PositionSelectionModal` (se esiste)
  - [ ] Rimuovere import `PositionSelectionModal` (se esiste)

### File Helper
- [ ] Ripristinare `lib/countermeasuresHelper.js` (rimuovere funzione `isPositionOriginal` e logica verifica)

### File i18n
- [ ] Rimuovere chiavi aggiunte da `lib/i18n.js` (cercare "position", "original", "competence")

### File Componenti
- [ ] Eliminare `components/PositionSelectionModal.jsx` (se creato)

### Test
- [ ] Testare estrazione card (verificare che funzioni senza `original_positions`)
- [ ] Testare salvataggio giocatore (verificare che funzioni senza modal selezione)
- [ ] Testare assegnazione giocatore a slot (verificare che `position` non cambi)
- [ ] Testare rimozione giocatore da slot (verificare che `position` non cambi)
- [ ] Testare generazione contromisure (verificare che prompt funzioni senza `original_positions`)
- [ ] Testare drag & drop (verificare che funzioni)

---

## 🚨 SE ROLLBACK FALLISCE

### Problema: Dati Giocatori con `original_positions` NULL

**Soluzione**: I dati NULL non causano problemi, ma se vuoi pulire:
```sql
-- Non serve, colonna sarà rimossa
-- Ma se vuoi pulire prima:
UPDATE players SET original_positions = NULL WHERE original_positions IS NOT NULL;
```

---

### Problema: Errori in Route dopo Rollback

**Soluzione**:
1. Controlla log errori in console
2. Verifica che tutti i riferimenti a `original_positions` siano rimossi
3. Cerca con grep: `grep -r "original_positions" app/ lib/ components/`
4. Rimuovi tutti i riferimenti trovati

---

### Problema: Errori Frontend dopo Rollback

**Soluzione**:
1. Controlla console browser per errori JavaScript
2. Verifica che stati rimossi non siano più referenziati
3. Cerca con grep: `grep -r "showPositionSelectionModal\|selectedOriginalPositions\|PositionSelectionModal" app/`
4. Rimuovi tutti i riferimenti trovati

---

### Problema: Prompt IA non funziona

**Soluzione**:
1. Verifica che `countermeasuresHelper.js` non usi `isPositionOriginal`
2. Verifica che prompt non menzioni "posizioni originali"
3. Testa generazione contromisure

---

## 📝 NOTE IMPORTANTI

1. **Backup Database**: Prima di rollback, esegui backup database Supabase
2. **Git Commit**: Se hai fatto commit, usa `git revert` per annullare commit
3. **Test Completo**: Dopo rollback, testa tutte le funzionalità principali:
   - Caricamento card
   - Salvataggio giocatore
   - Assegnazione a slot
   - Rimozione da slot
   - Drag & drop
   - Generazione contromisure

---

## 🔗 RIFERIMENTI

- **Documento Analisi**: `ANALISI_POSIZIONI_MULTIPLE_ORIGINALI.md`
- **Documento Adattamento**: `ANALISI_ADATTAMENTO_POSIZIONE_AUTOMATICO.md`
- **Documento Competenze**: `ANALISI_COMPETENZE_POSIZIONE_ACQUISITE.md`
- **Documento Estrazione vs Input**: `ANALISI_ESTRAZIONE_VS_INPUT_MANUALE.md`
- **Specifica Finale**: `SPECIFICA_FINALE_POSIZIONI_MULTIPLE.md`

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: 📝 **ROLLBACK COMPLETO PRONTO - NON IMPLEMENTATO**
