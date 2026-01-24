# ⚠️ Analisi Rischi - Input Manuale Opponent Name

**Data**: 23 Gennaio 2026  
**Soluzione**: Input manuale nome avversario (Wizard + Edit Dashboard)

---

## 🔍 ANALISI ROUTE E FLUSSI ESISTENTI

### **1. Route API Coinvolte**

#### **A. `/api/supabase/save-match` (POST)**
- **File**: `app/api/supabase/save-match/route.js`
- **Runtime**: `nodejs` (Next.js API Route)
- **Status Attuale**: ✅ **GIÀ GESTISCE `opponent_name`**
  - Riga 179-184: Validazione lunghezza (MAX_TEXT_LENGTH = 255)
  - Riga 224: Salva `opponent_name: toText(matchData.opponent_name)`
  - **Nessuna modifica necessaria** ✅

**Flusso Attuale**:
```javascript
// 1. Validazione (già presente)
if (matchData.opponent_name && toText(matchData.opponent_name).length > MAX_TEXT_LENGTH) {
  return NextResponse.json({ error: 'opponent_name exceeds...' }, { status: 400 })
}

// 2. Salvataggio (già presente)
opponent_name: toText(matchData.opponent_name)
```

**Rischio Modifica**: 🟢 **ZERO** (già supportato)

---

#### **B. `/api/supabase/update-match` (POST)**
- **File**: `app/api/supabase/update-match/route.js`
- **Runtime**: `nodejs` (Next.js API Route)
- **Status Attuale**: ⚠️ **NON GESTISCE `opponent_name` DIRETTAMENTE**
  - Gestisce solo aggiornamenti per sezione (`player_ratings`, `team_stats`, ecc.)
  - Non ha logica per update diretto di `opponent_name`

**Flusso Attuale**:
```javascript
// Richiede: { match_id, section, data }
// NON supporta: { match_id, opponent_name: "..." }
```

**Modifica Necessaria**: 🟡 **MEDIA**
- Aggiungere check per `opponent_name` diretto
- Validazione lunghezza
- Update Supabase

**Rischio Modifica**: 🟡 **BASSO-MEDIO**
- Aggiunta logica, non modifica esistente
- Potenziale conflitto se `section` e `opponent_name` passati insieme

---

### **2. Frontend - Wizard "Aggiungi Partita"**

#### **File**: `app/match/new/page.jsx`
- **Runtime**: Client-side React (`'use client'`)
- **Status Attuale**: ⚠️ **NON PASSA `opponent_name`**

**Flusso Attuale** (riga 259-276):
```javascript
const matchData = {
  result: matchResult,
  // opponent_name: NON PRESENTE ❌
  player_ratings: stepData.player_ratings || null,
  // ...
}
```

**Modifiche Necessarie**:
1. Aggiungere state `opponentName`
2. Aggiungere campo input nel modal Summary
3. Includere `opponent_name` in `matchData`
4. Salvare in localStorage (persistenza)

**Rischio Modifica**: 🟢 **BASSO**
- Aggiunta campo opzionale
- Non modifica logica esistente
- localStorage già usato per `stepData` e `stepImages`

---

### **3. Frontend - Dashboard Lista Partite**

#### **File**: `app/page.jsx`
- **Runtime**: Client-side React (`'use client'`)
- **Status Attuale**: ⚠️ **SOLO LETTURA `opponent_name`**

**Flusso Attuale** (riga 109, 534):
```javascript
// Query (riga 109)
.select('id, match_date, opponent_name, result, ...')

// Display (riga 534)
const displayOpponent = match.opponent_name || t('unknownOpponent')
```

**Modifiche Necessarie**:
1. Aggiungere state per edit (`editingOpponentId`, `editingOpponentName`, `savingOpponentName`)
2. Funzione `handleSaveOpponentName()` con fetch a `/api/supabase/update-match`
3. UI edit inline (input + bottoni ✓/✕)
4. Aggiornamento locale state dopo save

**Rischio Modifica**: 🟡 **MEDIO**
- Modifica UI esistente (card partita)
- Aggiunta logica edit
- Gestione click eventi (stopPropagation)

---

## 🔴 RISCHI DI ROTTURA

### **1. Modifica `update-match` Route**

**Rischio**: 🟡 **MEDIO**

**Problema**:
- Aggiungere logica per `opponent_name` diretto
- Potenziale conflitto se `section` e `opponent_name` passati insieme
- Validazione lunghezza (MAX_TEXT_LENGTH)

**Mitigazione**:
- ✅ Check esplicito: se `opponent_name` presente, ignora `section`
- ✅ Validazione esistente (MAX_TEXT_LENGTH = 255)
- ✅ Logica separata (non modifica merge esistente)

**Codice Proposto**:
```javascript
// All'inizio di POST, dopo validazione match_id
if (req.body.opponent_name !== undefined) {
  // Update diretto opponent_name
  const opponentName = toText(req.body.opponent_name)
  
  if (opponentName && opponentName.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `opponent_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
      { status: 400 }
    )
  }

  const { data: updatedMatch, error: updateError } = await admin
    .from('matches')
    .update({ 
      opponent_name: opponentName || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', match_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'Error updating opponent name' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, match: updatedMatch })
}

// Continua con logica esistente per section...
```

**Test Necessari**:
- Test con solo `opponent_name`
- Test con `opponent_name` + `section` (deve ignorare section)
- Test validazione lunghezza
- Test con `opponent_name` null/empty

---

### **2. Modifica Wizard - localStorage**

**Rischio**: 🟢 **BASSO**

**Problema**:
- Aggiungere `opponentName` a localStorage
- Compatibilità con dati esistenti (senza `opponentName`)

**Mitigazione**:
- ✅ Check `parsed.opponentName` prima di usare
- ✅ Default a stringa vuota se non presente
- ✅ Non rompe parsing esistente

**Codice Proposto**:
```javascript
// In saveProgress()
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  stepData,
  stepImages,
  opponentName, // ⭐ NUOVO (opzionale)
  timestamp: Date.now()
}))

// In useEffect che carica
if (parsed.opponentName) {
  setOpponentName(parsed.opponentName)
}
// Se non presente, opponentName rimane '' (default)
```

**Test Necessari**:
- Test con localStorage esistente (senza `opponentName`)
- Test con localStorage nuovo (con `opponentName`)
- Test persistenza durante wizard

---

### **3. Modifica Dashboard - Edit Inline**

**Rischio**: 🟡 **MEDIO**

**Problema**:
- Modifica UI card partita esistente
- Gestione click eventi (stopPropagation)
- State management (editing, saving)

**Mitigazione**:
- ✅ `stopPropagation()` per evitare click sulla card
- ✅ State separato per edit (non interferisce con lista)
- ✅ Fallback se API fallisce (mostra errore, non rompe UI)

**Codice Proposto**:
```javascript
// State separato
const [editingOpponentId, setEditingOpponentId] = React.useState(null)
const [editingOpponentName, setEditingOpponentName] = React.useState('')
const [savingOpponentName, setSavingOpponentName] = React.useState(false)

// Funzione save con error handling
const handleSaveOpponentName = async (matchId, e) => {
  e.stopPropagation() // ⭐ IMPORTANTE
  
  // ... fetch API ...
  
  // Aggiorna localmente solo se successo
  setRecentMatches(prev => prev.map(m => 
    m.id === matchId 
      ? { ...m, opponent_name: editingOpponentName.trim() }
      : m
  ))
}
```

**Test Necessari**:
- Test click edit (non deve aprire dettaglio partita)
- Test salvataggio (Enter, click ✓)
- Test cancellazione (Escape, click ✕)
- Test errore API (mostra alert, non rompe UI)

---

### **4. Query Dashboard - Campi Aggiuntivi**

**Rischio**: 🟢 **BASSO**

**Problema**:
- Aggiungere `formation_played`, `playing_style_played`, `client_team_name` alla query
- Potenziale rallentamento query

**Mitigazione**:
- ✅ Campi già esistono in database
- ✅ Query Supabase gestisce campi mancanti (non errore)
- ✅ RLS già configurato

**Codice Proposto**:
```javascript
// Query esistente (riga 109)
.select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness, formation_played, playing_style_played, client_team_name')
```

**Test Necessari**:
- Test performance query (dovrebbe essere OK)
- Test con partite senza questi campi (NULL)

---

## 🟡 DIFFICOLTÀ IMPLEMENTAZIONE

### **1. Route `update-match`**

**Difficoltà**: 🟡 **MEDIA**

**Sfide**:
- Aggiungere logica senza rompere esistente
- Gestire conflitto `opponent_name` vs `section`
- Validazione lunghezza

**Soluzione**:
- ✅ Check all'inizio (prima di logica sezione)
- ✅ Return early se `opponent_name` presente
- ✅ Validazione esistente riutilizzata

**Tempo Stimato**: 1-2 ore (codice + test)

---

### **2. Wizard - Campo Input**

**Difficoltà**: 🟢 **BASSA**

**Sfide**:
- Aggiungere campo nel modal Summary
- Persistenza localStorage
- Includere in `matchData`

**Soluzione**:
- ✅ Campo opzionale (non obbligatorio)
- ✅ localStorage già usato
- ✅ Aggiunta semplice a `matchData`

**Tempo Stimato**: 30-45 minuti

---

### **3. Dashboard - Edit Inline**

**Difficoltà**: 🟡 **MEDIA**

**Sfide**:
- UI edit inline
- Gestione click eventi
- State management
- API call

**Soluzione**:
- ✅ Pattern standard (input + bottoni)
- ✅ `stopPropagation()` per evitare conflitti
- ✅ State separato

**Tempo Stimato**: 1-2 ore (codice + test)

---

## ⚠️ EDGE CASES DA GESTIRE

### **1. `opponent_name` + `section` Passati Insieme**

**Scenario**: Frontend passa sia `opponent_name` che `section`  
**Comportamento**: Ignora `section`, usa solo `opponent_name`  
**Rischio**: 🟢 Basso (logica chiara)

---

### **2. `opponent_name` Vuoto/Stringa Vuota**

**Scenario**: Utente cancella nome o lascia vuoto  
**Comportamento**: Salva `null` (non stringa vuota)  
**Rischio**: 🟢 Basso (`toText()` gestisce già)

---

### **3. `opponent_name` > 255 Caratteri**

**Scenario**: Utente inserisce nome troppo lungo  
**Comportamento**: Validazione rifiuta, mostra errore  
**Rischio**: 🟡 Medio (UX: mostrare errore chiaro)

**Mitigazione**:
- Validazione frontend (maxLength={255})
- Validazione backend (già presente)

---

### **4. Edit Durante Caricamento**

**Scenario**: Utente clicca edit mentre lista si ricarica  
**Comportamento**: State edit perso, ma non rompe  
**Rischio**: 🟢 Basso (state locale, non critico)

---

### **5. API `update-match` Fallisce**

**Scenario**: Errore network o Supabase  
**Comportamento**: Mostra alert, non aggiorna state locale  
**Rischio**: 🟢 Basso (error handling presente)

---

### **6. localStorage Corrotto**

**Scenario**: localStorage contiene dati invalidi  
**Comportamento**: `try-catch` gestisce, usa default  
**Rischio**: 🟢 Basso (già gestito nel codice esistente)

---

## 📊 MATRICE RISCHI

| Modifica | Rischio Rottura | Difficoltà | Priorità Test |
|----------|----------------|------------|---------------|
| Route `update-match` | 🟡 Medio | 🟡 Media | 🔴 Alta |
| Wizard localStorage | 🟢 Basso | 🟢 Bassa | 🟡 Media |
| Wizard campo input | 🟢 Basso | 🟢 Bassa | 🟡 Media |
| Dashboard edit inline | 🟡 Medio | 🟡 Media | 🔴 Alta |
| Query campi aggiuntivi | 🟢 Basso | 🟢 Bassa | 🟢 Bassa |

---

## ✅ MITIGAZIONI RACCOMANDATE

### **1. Test Incrementali**

**Approccio**:
1. ✅ Test route `update-match` con `opponent_name` diretto
2. ✅ Test wizard con campo input
3. ✅ Test dashboard edit inline
4. ✅ Test end-to-end (wizard → save → edit)

---

### **2. Validazione Robusta**

**Aggiungere**:
- ✅ Validazione frontend (maxLength={255})
- ✅ Validazione backend (già presente)
- ✅ Sanitizzazione input (trim, già presente in `toText()`)

---

### **3. Error Handling**

**Garantire**:
- ✅ Try-catch in tutte le funzioni async
- ✅ Messaggi errore chiari
- ✅ Fallback UI (non rompe se API fallisce)

---

### **4. Compatibilità Retroattiva**

**Verificare**:
- ✅ localStorage senza `opponentName` (default a '')
- ✅ Query senza nuovi campi (NULL gestito)
- ✅ Partite vecchie (edit funziona)

---

## 🎯 RACCOMANDAZIONI FINALI

### **Implementazione Sicura**:

1. **Fase 1: Route `update-match`** (1-2 ore)
   - Aggiungere logica `opponent_name` diretto
   - Test con vari scenari
   - Verificare non rompe logica esistente

2. **Fase 2: Wizard Campo Input** (30-45 min)
   - Aggiungere state e campo
   - Test localStorage
   - Verificare salvataggio

3. **Fase 3: Dashboard Edit Inline** (1-2 ore)
   - Aggiungere UI edit
   - Test click eventi
   - Verificare API call

4. **Fase 4: Test Completo** (1 ora)
   - Test end-to-end
   - Test edge cases
   - Test retrocompatibilità

**Tempo Totale Stimato**: 4-6 ore

---

### **Rischi Residui**:

1. 🟡 **Conflitto `opponent_name` + `section`** → Mitigato (check esplicito)
2. 🟢 **localStorage corrotto** → Già gestito (try-catch)
3. 🟢 **API fallisce** → Error handling presente
4. 🟢 **Performance query** → Dovrebbe essere OK

---

### **Rollback Plan**:

Se qualcosa va storto:
1. ✅ Rimuovere logica `update-match` (revert commit)
2. ✅ Rimuovere campo wizard (revert commit)
3. ✅ Rimuovere edit dashboard (revert commit)

**Tempo Rollback**: 15-30 minuti

---

## 🔧 STRUTTURA ROUTE

### **Route Esistenti**:

```
/api/supabase/save-match (POST)
├── Runtime: nodejs
├── Auth: Bearer token
├── Rate Limit: ✅ (RATE_LIMIT_CONFIG)
├── Validazione: ✅ (MAX_TEXT_LENGTH)
└── opponent_name: ✅ GIÀ GESTITO

/api/supabase/update-match (POST)
├── Runtime: nodejs
├── Auth: Bearer token
├── Rate Limit: ✅ (RATE_LIMIT_CONFIG)
├── Validazione: ✅ (MAX_TEXT_LENGTH)
└── opponent_name: ❌ DA AGGIUNGERE
```

### **Dipendenze Node.js**:

- ✅ `@supabase/supabase-js` (già presente)
- ✅ `next/server` (già presente)
- ✅ `lib/authHelper` (già presente)
- ✅ `lib/rateLimiter` (già presente)

**Nessuna nuova dipendenza necessaria** ✅

---

## ✅ CONCLUSIONE

**Rischio Complessivo**: 🟡 **MEDIO-BASSO**

**Perché**:
- ✅ Route `save-match` già supporta `opponent_name`
- ✅ Modifiche incrementali e testabili
- ✅ Error handling robusto
- ✅ Retrocompatibilità garantita
- ✅ Rollback semplice

**Raccomandazione**: ✅ **PROCEDERE** con implementazione incrementale e test accurati.

---

**Ultimo Aggiornamento**: 23 Gennaio 2026
