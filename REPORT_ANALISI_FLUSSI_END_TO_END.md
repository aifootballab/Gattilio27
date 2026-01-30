# Report Analisi Flussi End-to-End - Gattilio27

**Data:** 2026-01-30  
**Scope:** Analisi coerenza flussi principali della piattaforma

---

## RIEPILOGO ESECUTIVO

| Flusso | Stato | Problemi Critici | Problemi Minor |
|--------|-------|------------------|----------------|
| Upload Giocatore | ⚠️ PARZIALE | 2 | 4 |
| Caricamento Partita | ⚠️ PARZIALE | 1 | 3 |
| Assegnazione Slot | ⚠️ PARZIALE | 2 | 2 |
| Chat Assistente | ✅ STABILE | 0 | 1 |

---

## 1. FLUSSO UPLOAD GIOCATORE

### Percorso del Flusso
```
handleUploadPlayerToSlot (gestione-formazione/page.jsx:748)
  ↓
/api/extract-player (POST)
  ↓
PositionSelectionModal (componente)
  ↓
handleSavePlayerWithPositions (gestione-formazione/page.jsx:929)
  ↓
/api/supabase/save-player (POST)
```

### Problemi di Coerenza Trovati

#### 🔴 CRITICO #1: Perdita Dati `photo_slots` nei Merge
**File:** `app/api/supabase/save-player/route.js` (righe 201-207)

```javascript
// Merge photo_slots (solo se newPhotoSlots ha valori, altrimenti mantieni existing)
const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
const newPhotoSlots = playerData.photo_slots || {}
const mergedPhotoSlots = (newPhotoSlots && typeof newPhotoSlots === 'object' && Object.keys(newPhotoSlots).length > 0)
  ? { ...existingPhotoSlots, ...newPhotoSlots }
  : existingPhotoSlots
```

**Problema:** Se `newPhotoSlots` è `{}` (oggetto vuoto) ma valido, viene sovrascritto `existingPhotoSlots`. La logica corretta dovrebbe essere:
```javascript
const mergedPhotoSlots = Object.keys(newPhotoSlots || {}).length > 0 
  ? { ...existingPhotoSlots, ...newPhotoSlots }
  : existingPhotoSlots
```

**Impatto:** Dati di tracciamento foto persi durante aggiornamento giocatore.

---

#### 🔴 CRITICO #2: Race Condition in Duplicato Titolare
**File:** `app/gestione-formazione/page.jsx` (righe 979-1058)

Quando si conferma la sostituzione di un giocatore duplicato:
1. Prima elimina duplicati riserve (righe 995-1006)
2. Poi aggiorna il vecchio titolare con Supabase diretto (righe 1010-1016) 
3. Infine salva il nuovo giocatore (righe 1019-1033)

**Problema:** Lo step 2 usa `supabase.from('players').update()` diretto, mentre lo step 3 chiama l'API `/api/supabase/save-player`. Se l'API fallisce, il vecchio giocatore è già stato rimosso dallo slot ma il nuovo non è stato salvato.

**Suggerimento:** Usare una transazione o almeno sequenza atomica.

---

#### 🟡 MINORE #3: Gestione Errori Inconsistente tra Upload Titolare e Riserva
**File:** `app/gestione-formazione/page.jsx`

- Upload titolare (riga 924): usa `showToast(err.message || t('errorUploadingPhoto'), 'error')`
- Upload riserva (riga 1718): usa solo `setError(err.message || 'Errore caricamento riserva')` senza toast

**Incoerenza:** L'utente riceve feedback diverso per operazioni simili.

---

#### 🟡 MINORE #4: Validazione `original_positions` Duplicata
**File:** 
- `app/api/extract-player/route.js` (righe 299-311)
- `app/api/supabase/save-player/route.js` (righe 176-178)
- `app/api/supabase/assign-player-to-slot/route.js` (righe 251-253)

La stessa logica di fallback per `original_positions` è replicata in 3 file diversi.

---

#### 🟡 MINORE #5: Mancata Validazione `overall_rating` in Range
**File:** `app/api/supabase/save-player/route.js`

Non c'è validazione che l'`overall_rating` sia nel range valido (1-110). Valori estremi potrebbero causare problemi di display.

---

## 2. FLUSSO CARICAMENTO PARTITA

### Percorso del Flusso
```
match/new/page.jsx (Wizard 5 step)
  ↓
Step 1: /api/extract-match-data (section: player_ratings)
Step 2: /api/extract-match-data (section: team_stats)
Step 3: /api/extract-match-data (section: attack_areas)
Step 4: /api/extract-match-data (section: ball_recovery_zones)
Step 5: /api/extract-match-data (section: formation_style)
  ↓
/api/supabase/save-match (POST)
```

### Problemi di Coerenza Trovati

#### 🔴 CRITICO #1: Perdita Dati `result` nei Passaggi
**File:** `app/match/new/page.jsx` (righe 263-272, 340-349)

```javascript
// Estrazione risultato da stepData
let matchResult = stepData.result || null
if (!matchResult && stepData.team_stats && stepData.team_stats.result) {
  matchResult = stepData.team_stats.result
}

// Rimozione result da team_stats
if (stepData.team_stats && stepData.team_stats.result) {
  const { result, ...statsWithoutResult } = stepData.team_stats
  stepData.team_stats = statsWithoutResult  // ⚠️ Modifica oggetto originale!
}
```

**Problema:** Lo step modifica direttamente `stepData.team_stats`, alterando lo stato React senza usarne la funzione setter. Questo può causare inconsistenze di rendering.

---

#### 🟡 MINORE #2: Inconsistenza Tra `isHome` e `is_home`
**File:** `app/match/new/page.jsx`

- State: `const [isHome, setIsHome] = React.useState(true)` (riga 36)
- Salvataggio: `is_home: isHome` (riga 278)
- API riceve: `is_home` nel body (riga 452)

**Problema:** Nella API `extract-match-data`, il campo è `is_home` (snake_case) mentre nel frontend lo state è `isHome` (camelCase). Questo è corretto nel passaggio, ma c'è un problema logico:

```javascript
// In extract-match-data/route.js (riga 455)
const isHome = typeof is_home === 'boolean' ? is_home : null
```

Se `is_home` è `undefined`, diventa `null`, perdendo il default `true`.

---

#### 🟡 MINORE #3: Gestione `stepData` Non Immutabile
**File:** `app/match/new/page.jsx` (righe 269-272)

```javascript
if (stepData.team_stats && stepData.team_stats.result) {
  const { result, ...statsWithoutResult } = stepData.team_stats
  stepData.team_stats = statsWithoutResult  // Mutazione diretta!
}
```

**Problema:** Modifica diretta dello stato invece di usarne la versione immutabile.

---

#### 🟡 MINORE #4: Inconsistenza Nel Calcolo `photosUploaded`
**File:** 
- Frontend: `app/match/new/page.jsx` (righe 217-219)
- Backend: `app/api/supabase/save-match/route.js` (righe 63-79)

```javascript
// Frontend
const photosUploaded = React.useMemo(() => {
  return STEPS.filter(step => stepData[step.id] && stepData[step.id] !== null).length
}, [stepData, STEPS])

// Backend
function calculatePhotosUploaded(matchData) {
  let count = 0
  // Logica simile ma con controlli diversi
  if (hasPlayerRatings) count++
  // ...
}
```

**Rischio:** Se le logiche divergono, i crediti calcolati frontend/backend potrebbero non coincidere.

---

## 3. FLUSSO ASSEGNAZIONE SLOT

### Percorso del Flusso
```
handleAssignFromReserve (gestione-formazione/page.jsx:344)
  ↓
/api/supabase/assign-player-to-slot (PATCH)
  ↓
(oppure)
handleRemoveFromSlot (gestione-formazione/page.jsx:519)
  ↓
/api/supabase/remove-player-from-slot (PATCH)
```

### Problemi di Coerenza Trovati

#### 🔴 CRITICO #1: Duplicazione Logica di Controllo Duplicati
**File:** 
- `app/gestione-formazione/page.jsx` (righe 351-427)
- `app/api/supabase/assign-player-to-slot/route.js` (righe 134-197)

La stessa logica di controllo duplicati è implementata sia nel frontend che nel backend:
- Frontend: Controlla duplicati prima di chiamare l'API
- Backend: Controlla di nuovo duplicati nell'API

**Problema:** Se le logiche divergono, si possono avere comportamenti inconsistenti. Inoltre, il frontend fa un controllo preventivo con `window.confirm()` che non blocca necessariamente la chiamata API.

---

#### 🔴 CRITICO #2: Race Condition Potenziale in Rimozione Slot
**File:** `app/api/supabase/assign-player-to-slot/route.js` (righe 66-115)

```javascript
// 1. Verifica slot occupato
const { data: existingPlayerInSlot } = await admin
  .from('players')
  .select('id, player_name, age')
  .eq('user_id', userId)
  .eq('slot_index', slot_index)
  .maybeSingle()

// 2. Elimina duplicati riserve (se esistono)
if (existingPlayerInSlot) {
  // ... logica duplicati ...
  await admin.from('players').delete().eq('id', exactDuplicates[0].id)
}

// 3. Libera slot
await admin.from('players').update({ slot_index: null }).eq('id', existingPlayerInSlot.id)

// 4. Assegna nuovo giocatore
await admin.from('players').update({ slot_index: slot_index }).eq('id', player_id)
```

**Problema:** Non c'è transazione/lock tra i passi 3 e 4. Se due richieste simultanee arrivano per lo stesso slot:
1. Richiesta A legge slot occupato
2. Richiesta B legge slot occupato
3. Richiesta A libera slot
4. Richiesta B libera slot (stesso giocatore o diverso)
5. Richiesta A assegna nuovo giocatore
6. Richiesta B sovrascrive con altro giocatore

**Suggerimento:** Usare una transazione Supabase o un lock applicativo.

---

#### 🟡 MINORE #3: Inconsistenza di Ritorno Dati
**File:** `app/gestione-formazione/page.jsx`

- `handleAssignFromReserve` (riga 500): mostra toast successo ma non ritorna dati
- `handleRemoveFromSlot` (riga 589): mostra toast successo ma non ritorna dati
- API `assign-player-to-slot` (riga 225-230): ritorna `{ success, player_id, slot_index, action }`

**Incoerenza:** I dati di ritorno dell'API non sono utilizzati nel frontend.

---

#### 🟡 MINORE #4: Gestione Errori API Inconsistente
**File:** `app/gestione-formazione/page.jsx` (righe 497, 541-547)

```javascript
// Assegnazione
data = await safeJsonResponse(res, 'Errore assegnazione')  // Usa helper

// Rimozione
data = await res.json()  // Usa JSON diretto
```

**Incoerenza:** Uno usa `safeJsonResponse`, l'altro no.

---

## 4. FLUSSO CHAT ASSISTENTE

### Percorso del Flusso
```
components/AssistantChat.jsx
  ↓
/api/assistant-chat (POST)
```

### Problemi Trovati

#### 🟡 MINORE #1: Storia Conversazione Limitata ma Non Persistente
**File:** `components/AssistantChat.jsx` (righe 106-108)

```javascript
const history = messages
  .slice(-10)
  .map(({ role, content }) => ({ role, content }))
```

**Problema:** La storia è mantenuta solo in memoria (React state). Se l'utente ricarica la pagina, la storia si perde. Non c'è persistenza in localStorage o database.

**Nota:** Questo è un comportamento voluto per privacy, ma va documentato.

---

## RACCOMANDAZIONI

### Priorità Alta

1. **Implementare Transazioni per Assegnazione Slot**
   - Usare Supabase RPC o almeno un lock applicativo
   - Prevenire race condition nello swap giocatori

2. **Fix Perdita Dati `photo_slots`**
   - Correggere la logica di merge in `save-player`
   - Verificare presenza chiavi vs. verità dell'oggetto

3. **Rendere Immutabile la Gestione `stepData` in Match Wizard**
   - Usare spread operator invece di mutazione diretta
   - Evitare modifiche a `stepData.team_stats`

### Priorità Media

4. **Unificare Logica Controllo Duplicati**
   - Creare funzione condivisa `checkDuplicatePlayer`
   - Usarla sia in frontend che backend

5. **Standardizzare Gestione Errori**
   - Usare sempre `safeJsonResponse` helper
   - Uniformare messaggi toast/errori

6. **Aggiungere Validazione Range `overall_rating`**
   - 1-110 range valido
   - Warning se fuori range

### Priorità Bassa

7. **Documentare Limitazioni Chat**
   - Storia conversazione non persistente
   - Max 10 messaggi di history

8. **Refactoring DRY per `original_positions`**
   - Estrarre funzione utility condivisa

---

## APPENDICE: File Coinvolti

| File | Righe | Flussi |
|------|-------|--------|
| `app/gestione-formazione/page.jsx` | ~2000 | Upload, Assegnazione |
| `app/match/new/page.jsx` | ~1000 | Caricamento Partita |
| `components/AssistantChat.jsx` | ~442 | Chat |
| `app/api/extract-player/route.js` | ~335 | Upload |
| `app/api/supabase/save-player/route.js` | ~396 | Upload |
| `app/api/extract-match-data/route.js` | ~599 | Partita |
| `app/api/supabase/save-match/route.js` | ~468 | Partita |
| `app/api/supabase/assign-player-to-slot/route.js` | ~296 | Assegnazione |
| `app/api/supabase/remove-player-from-slot/route.js` | ~126 | Assegnazione |
| `app/api/assistant-chat/route.js` | ~648 | Chat |

---

*Report generato automaticamente dall'analisi del codice sorgente.*
