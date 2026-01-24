# 🔄 ROLLBACK: Posizioni Multiple Originali

**Data Creazione**: 24 Gennaio 2026  
**Scopo**: Documento per ripristinare stato precedente se implementazione causa problemi

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

#### `app/api/supabase/save-player/route.js`
- Salva solo `position` (singola posizione)
- NON salva `original_positions`

#### `app/api/supabase/assign-player-to-slot/route.js`
- Aggiorna solo `slot_index`
- NON adatta `position` automaticamente allo slot
- NON salva `original_positions`

#### `app/api/supabase/remove-player-from-slot/route.js`
- Resetta solo `slot_index` a NULL
- NON resetta `position` a originale

---

### 3. **File Helper Attuali**

#### `lib/countermeasuresHelper.js`
- NON verifica se posizione è originale
- NON distingue tra posizioni originali e non originali
- Mostra solo `position` nel prompt

---

## 🔧 MODIFICHE DA ROLLBACK

### 1. **Database - Rimuovere Colonna**

**SQL Rollback**:
```sql
-- Rimuovi colonna original_positions
ALTER TABLE players DROP COLUMN IF EXISTS original_positions;

-- Rimuovi indice se esiste
DROP INDEX IF EXISTS idx_players_original_positions;
```

**Come Eseguire**:
1. Apri Supabase Dashboard
2. Vai a SQL Editor
3. Esegui comando sopra
4. Verifica che colonna sia rimossa

---

### 2. **File Route - Ripristinare Versione Precedente**

#### `app/api/extract-player/route.js`

**Rimuovere**:
- Prompt modificato per estrarre `original_positions`
- Logica per parsing `original_positions`

**Ripristinare**:
```javascript
// Prompt originale (solo position singola)
const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai TUTTI questi dati: nome giocatore, posizione, overall rating, team, card_type, base_stats, skills, com_skills, boosters, height, weight, age, nationality, level, form, role, playing_style, ai_playstyles, matches_played, goals, assists, weak_foot_frequency, weak_foot_accuracy, injury_resistance

Formato JSON richiesto:
{
  "player_name": "Nome Completo",
  "position": "CF",  // Solo posizione principale
  "overall_rating": 85,
  // ... resto dati ...
}

Restituisci SOLO JSON valido, senza altro testo.`
```

---

#### `app/api/supabase/save-player/route.js`

**Rimuovere**:
- Campo `original_positions` da `playerData`
- Logica per salvare `original_positions`

**Ripristinare**:
```javascript
const playerData = {
  // ... dati esistenti ...
  position: toText(player.position),  // Solo posizione principale
  // RIMUOVERE: original_positions
  // ...
}
```

---

#### `app/api/supabase/assign-player-to-slot/route.js`

**Rimuovere**:
- Recupero `formationLayout` per calcolare `slotPosition`
- Aggiornamento `position` automatico allo slot
- Salvataggio `original_positions` se vuoto

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

**Ripristinare anche per `player_data`**:
```javascript
const playerData = {
  // ... dati esistenti ...
  position: toText(player_data.position),  // Posizione dalla card, NON adattata
  slot_index: slot_index,
  // RIMUOVERE: original_positions
}
```

---

#### `app/api/supabase/remove-player-from-slot/route.js`

**Rimuovere**:
- Recupero `original_position`
- Reset `position` a `original_position`

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

### 3. **File Helper - Ripristinare Versione Precedente**

#### `lib/countermeasuresHelper.js`

**Rimuovere**:
- Funzione `isPositionOriginal()`
- Logica per verificare se posizione è originale
- Messaggi "Performance ottimale" vs "ATTENZIONE"

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

## ✅ CHECKLIST ROLLBACK

### Database
- [ ] Eseguire SQL per rimuovere colonna `original_positions`
- [ ] Eseguire SQL per rimuovere indice `idx_players_original_positions`
- [ ] Verificare che colonna sia rimossa (query `SELECT * FROM players LIMIT 1`)

### File Route
- [ ] Ripristinare `app/api/extract-player/route.js` (rimuovere `original_positions` dal prompt)
- [ ] Ripristinare `app/api/supabase/save-player/route.js` (rimuovere `original_positions` da `playerData`)
- [ ] Ripristinare `app/api/supabase/assign-player-to-slot/route.js` (rimuovere adattamento `position` automatico)
- [ ] Ripristinare `app/api/supabase/remove-player-from-slot/route.js` (rimuovere reset `position`)

### File Helper
- [ ] Ripristinare `lib/countermeasuresHelper.js` (rimuovere funzione `isPositionOriginal` e logica verifica)

### Test
- [ ] Testare estrazione card (verificare che funzioni senza `original_positions`)
- [ ] Testare assegnazione giocatore a slot (verificare che `position` non cambi)
- [ ] Testare rimozione giocatore da slot (verificare che `position` non cambi)
- [ ] Testare generazione contromisure (verificare che prompt funzioni senza `original_positions`)

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
3. Cerca con grep: `grep -r "original_positions" app/ lib/`
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
3. **Test Completo**: Dopo rollback, testa tutte le funzionalità principali

---

## 🔗 RIFERIMENTI

- **Documento Analisi**: `ANALISI_POSIZIONI_MULTIPLE_ORIGINALI.md`
- **Documento Adattamento**: `ANALISI_ADATTAMENTO_POSIZIONE_AUTOMATICO.md`
- **Documento Competenze**: `ANALISI_COMPETENZE_POSIZIONE_ACQUISITE.md`

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: 📝 **ROLLBACK PRONTO - NON IMPLEMENTATO**
