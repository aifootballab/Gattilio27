# 🔍 Check Incoerenze, Sicurezza Endpoint e Bilingue

**Data**: 26 Gennaio 2026  
**Scope**: Analisi completa flussi, sicurezza API, supporto i18n

---

## 📋 SOMMARIO ESECUTIVO

### **Problemi Critici** 🔴
1. **Traduzioni mancanti** nel wizard match (`homeAwayLabel`, `away`, `homeAwayHint`)
2. **Incoerenza traduzione `home`**: IT = "Home" (dovrebbe essere "Casa")
3. **Validazione input mancante** in alcuni endpoint

### **Problemi Medi** 🟡
1. **Rate limiting non uniforme** (alcuni endpoint non hanno rate limit)
2. **Sanitizzazione input** non sempre presente

### **Problemi Minori** 🟢
1. **Messaggi errore hardcoded** in alcuni endpoint
2. **Fallback traduzioni** con testi hardcoded

---

## 🌍 1. ANALISI BILINGUE (i18n)

### **1.1 Traduzioni Mancanti nel Wizard Match**

**File**: `app/match/new/page.jsx`

**Problemi**:
```javascript
// Riga 823
{t('homeAwayLabel') || 'Hai giocato in casa o fuori casa?'}  // ❌ homeAwayLabel non esiste
{t('required') || 'Obbligatorio'}  // ✅ required esiste (ma solo in EN, non in IT)

// Riga 849
🏠 {t('home') || 'Casa'}  // ⚠️ home esiste ma IT = "Home" (dovrebbe essere "Casa")

// Riga 870
✈️ {t('away') || 'Fuori Casa'}  // ❌ away non esiste

// Riga 879
{t('homeAwayHint') || 'Seleziona se hai giocato in casa o fuori casa...'}  // ❌ homeAwayHint non esiste
```

**Traduzioni da aggiungere in `lib/i18n.js`**:

```javascript
it: {
  // ... existing ...
  home: 'Casa',  // ⚠️ CORREGGERE: attualmente è "Home"
  away: 'Fuori Casa',  // ❌ MANCANTE
  homeAwayLabel: 'Hai giocato in casa o fuori casa?',  // ❌ MANCANTE
  homeAwayHint: 'Seleziona se hai giocato in casa o fuori casa per identificare correttamente la tua squadra',  // ❌ MANCANTE
  required: 'Obbligatorio',  // ❌ MANCANTE (esiste solo in EN)
  // ...
},
en: {
  // ... existing ...
  home: 'Home',  // ✅ OK
  away: 'Away',  // ❌ MANCANTE
  homeAwayLabel: 'Did you play at home or away?',  // ❌ MANCANTE
  homeAwayHint: 'Select if you played at home or away to correctly identify your team',  // ❌ MANCANTE
  required: 'Required',  // ✅ OK (già esiste)
  // ...
}
```

---

### **1.2 Altri Testi Hardcoded**

**File**: `app/api/extract-match-data/route.js`

**Problema**: Prompt AI contiene testi hardcoded in italiano:
```javascript
// Riga 224-226
teamHint = `
IDENTIFICAZIONE SQUADRA CLIENTE:
- Il cliente ha giocato ${isHome ? 'IN CASA' : 'FUORI CASA'}
- ${isHome ? 'La PRIMA squadra (team1) nei dati è quella del CLIENTE' : 'La SECONDA squadra (team2) nei dati è quella del CLIENTE'}
```

**Nota**: I prompt AI sono intenzionalmente in italiano (perché l'AI risponde meglio), quindi questo è accettabile.

---

## 🔒 2. ANALISI SICUREZZA ENDPOINT

### **2.1 Autenticazione**

**Status**: ✅ **TUTTI GLI ENDPOINT PROTETTI**

Tutti gli endpoint verificati usano:
```javascript
const token = extractBearerToken(req)
if (!token) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}

const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
if (authError || !userData?.user?.id) {
  return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
}
```

**Endpoints verificati**:
- ✅ `/api/analyze-match`
- ✅ `/api/extract-match-data`
- ✅ `/api/extract-player`
- ✅ `/api/extract-formation`
- ✅ `/api/supabase/save-match`
- ✅ `/api/supabase/update-match`
- ✅ `/api/supabase/delete-match`
- ✅ `/api/generate-countermeasures`
- ✅ `/api/assistant-chat`
- ✅ `/api/supabase/save-player`
- ✅ `/api/supabase/save-formation-layout`
- ✅ `/api/supabase/save-tactical-settings`
- ✅ `/api/supabase/save-opponent-formation`
- ✅ `/api/supabase/save-coach`
- ✅ `/api/supabase/set-active-coach`
- ✅ `/api/supabase/delete-player`
- ✅ `/api/supabase/delete-coach`
- ✅ `/api/supabase/assign-player-to-slot`
- ✅ `/api/supabase/remove-player-from-slot`
- ✅ `/api/supabase/save-profile`
- ✅ `/api/admin/recalculate-patterns`

---

### **2.2 Rate Limiting**

**Status**: 🟡 **PARZIALE**

**Endpoints con Rate Limiting**:
- ✅ `/api/analyze-match` → 20 req/min
- ✅ `/api/supabase/save-match` → 20 req/min
- ✅ `/api/supabase/update-match` → 30 req/min
- ✅ `/api/supabase/delete-match` → 5 req/min
- ✅ `/api/generate-countermeasures` → 5 req/min
- ✅ `/api/assistant-chat` → 30 req/min (fallback)

**Endpoints SENZA Rate Limiting** ⚠️:
- ❌ `/api/extract-match-data` (chiamato frequentemente, usa OpenAI)
- ❌ `/api/extract-player` (chiamato frequentemente, usa OpenAI)
- ❌ `/api/extract-formation` (chiamato frequentemente, usa OpenAI)
- ❌ `/api/extract-coach` (chiamato frequentemente, usa OpenAI)
- ❌ `/api/supabase/save-player`
- ❌ `/api/supabase/save-formation-layout`
- ❌ `/api/supabase/save-tactical-settings`
- ❌ `/api/supabase/save-opponent-formation`
- ❌ `/api/supabase/save-coach`
- ❌ `/api/supabase/set-active-coach`
- ❌ `/api/supabase/delete-player`
- ❌ `/api/supabase/delete-coach`
- ❌ `/api/supabase/assign-player-to-slot`
- ❌ `/api/supabase/remove-player-from-slot`
- ❌ `/api/supabase/save-profile`

**Raccomandazione**: Aggiungere rate limiting a tutti gli endpoint, specialmente quelli che usano OpenAI (extract-*).

---

### **2.3 Validazione Input**

**Status**: 🟡 **PARZIALE**

#### **✅ Validazione Presente**

**`/api/extract-match-data`**:
```javascript
if (!imageDataUrl || typeof imageDataUrl !== 'string') {
  return NextResponse.json({ error: 'imageDataUrl is required' }, { status: 400 })
}

if (!section || !VALID_SECTIONS.includes(section)) {
  return NextResponse.json({ error: `section must be one of: ${VALID_SECTIONS.join(', ')}` }, { status: 400 })
}

// Validazione dimensione immagine (max 10MB)
if (imageDataUrl.startsWith('data:image/')) {
  const base64Image = imageDataUrl.split(',')[1]
  if (base64Image) {
    const imageSizeBytes = (base64Image.length * 3) / 4
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (imageSizeBytes > maxSizeBytes) {
      return NextResponse.json({ error: 'Image size exceeds maximum allowed size (10MB)' }, { status: 400 })
    }
  }
}
```

**`/api/generate-countermeasures`**:
```javascript
if (!opponent_formation_id || typeof opponent_formation_id !== 'string') {
  return NextResponse.json({ error: 'opponent_formation_id is required' }, { status: 400 })
}

// Validazione UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
if (!UUID_REGEX.test(opponent_formation_id)) {
  return NextResponse.json({ error: 'Invalid opponent_formation_id format' }, { status: 400 })
}
```

#### **⚠️ Validazione Mancante o Incompleta**

**`/api/analyze-match`**:
```javascript
// ❌ MANCA: Validazione matchData
const { matchData } = await req.json()
// Dovrebbe validare:
// - matchData è oggetto
// - matchData.id è UUID valido (se presente)
// - matchData.user_id corrisponde a userId (se presente)
```

**`/api/supabase/save-match`**:
```javascript
// ⚠️ Validazione parziale
const { matchData } = await req.json()
if (!matchData) {
  return NextResponse.json({ error: 'matchData is required' }, { status: 400 })
}
// ❌ MANCA: Validazione struttura matchData
// ❌ MANCA: Validazione dimensioni dati (player_ratings, ball_recovery_zones, ecc.)
```

**`/api/assistant-chat`**:
```javascript
const { message, currentPage, appState, language = 'it' } = body

if (!message || typeof message !== 'string' || message.trim().length === 0) {
  return NextResponse.json({ error: 'Message is required' }, { status: 400 })
}
// ⚠️ MANCA: Validazione lunghezza message (max caratteri)
// ⚠️ MANCA: Validazione language (solo 'it' o 'en')
```

---

### **2.4 Sanitizzazione Input**

**Status**: 🟡 **PARZIALE**

**Problemi**:
1. **SQL Injection**: ✅ **PROTETTO** (usa Supabase client con parametrizzazione)
2. **XSS**: ⚠️ **PARZIALE** (dati salvati in DB potrebbero essere non sanitizzati)
3. **NoSQL Injection**: ✅ **N/A** (usa PostgreSQL)

**Raccomandazioni**:
- Sanitizzare input utente prima di salvare in DB (specialmente `opponent_name`, `client_team_name`)
- Validare e sanitizzare JSON prima di salvare in colonne JSONB

---

## 🔄 3. ANALISI INCOERENZE FLUSSI

### **3.1 Flusso Wizard → Extract → Save → Analyze**

#### **✅ Flusso Corretto**

1. **Wizard** (`app/match/new/page.jsx`):
   - ✅ Passa `is_home` a `extract-match-data`
   - ✅ Include `is_home` in `matchData` quando salva

2. **Extract** (`app/api/extract-match-data/route.js`):
   - ✅ Accetta `is_home` opzionale
   - ✅ Usa `is_home` per identificare squadra cliente nel prompt AI
   - ✅ Usa `is_home` in `normalizePlayerRatings()`

3. **Save** (`app/api/supabase/save-match/route.js`):
   - ✅ Salva `is_home` nel database
   - ✅ Default: `true` se non specificato

4. **Analyze** (`app/api/analyze-match/route.js`):
   - ✅ Usa logica timestamp per distinguere match vecchi da nuovi
   - ✅ Usa `is_home` per match nuovi
   - ✅ Usa `client_team_name` per match vecchi (backward compatibility)

#### **⚠️ Potenziali Incoerenze**

**Problema 1: `is_home` non validato nel wizard**
```javascript
// app/match/new/page.jsx
const [isHome, setIsHome] = React.useState(true) // Default: Casa
// ❌ MANCA: Validazione che isHome sia sempre definito prima di salvare
```

**Soluzione**: Aggiungere validazione prima di salvare:
```javascript
if (typeof isHome !== 'boolean') {
  setError('Seleziona se hai giocato in casa o fuori casa')
  return
}
```

**Problema 2: `is_home` potrebbe essere null in extract-match-data**
```javascript
// app/api/extract-match-data/route.js
const isHome = typeof is_home === 'boolean' ? is_home : null
// ✅ OK: Gestisce correttamente null con backward compatibility
```

**Problema 3: Match vecchi con `is_home = true` (default)**
```javascript
// app/api/analyze-match/route.js
const isNewMatch = matchDate >= IS_HOME_IMPLEMENTATION_DATE
// ✅ OK: Usa timestamp per distinguere match vecchi da nuovi
```

---

### **3.2 Flusso Dati Player Ratings**

**Status**: ✅ **COERENTE**

**Flusso**:
1. **Extract** → Normalizza in formato `{ cliente: {...}, avversario: {...} }` o `{ ... }` (flat)
2. **Save** → Salva in formato JSONB (supporta entrambi i formati)
3. **Analyze** → Legge entrambi i formati (backward compatibility)

**✅ OK**: Gestisce correttamente entrambi i formati.

---

### **3.3 Flusso Attack Areas e Ball Recovery Zones**

**Status**: ✅ **COERENTE** (dopo fix is_home)

**Flusso**:
1. **Extract** → Estratto come `{ team1: {...}, team2: {...} }`
2. **Save** → Salvato come JSONB
3. **Analyze** → Usa `is_home` per identificare quale team è cliente

**✅ OK**: Dopo implementazione `is_home`, la logica è corretta.

---

## 📊 4. PRIORITÀ CORREZIONI

### **🔴 Priorità Alta**

1. **Aggiungere traduzioni mancanti** (`home`, `away`, `homeAwayLabel`, `homeAwayHint`, `required` in IT)
2. **Correggere traduzione `home` in IT** (da "Home" a "Casa")
3. **Aggiungere rate limiting** a endpoint `extract-*` (usano OpenAI, costosi)

### **🟡 Priorità Media**

1. **Aggiungere validazione input** in `analyze-match` e `save-match`
2. **Aggiungere rate limiting** a tutti gli endpoint Supabase
3. **Sanitizzare input** prima di salvare in DB

### **🟢 Priorità Bassa**

1. **Rimuovere fallback hardcoded** dopo aver aggiunto traduzioni
2. **Standardizzare messaggi errore** (usare traduzioni invece di hardcoded)

---

## ✅ 5. CHECKLIST CORREZIONI

### **Traduzioni**
- [ ] Aggiungere `home: 'Casa'` in IT (correggere da "Home")
- [ ] Aggiungere `away: 'Fuori Casa'` in IT
- [ ] Aggiungere `away: 'Away'` in EN
- [ ] Aggiungere `homeAwayLabel` in IT e EN
- [ ] Aggiungere `homeAwayHint` in IT e EN
- [ ] Aggiungere `required: 'Obbligatorio'` in IT

### **Sicurezza**
- [ ] Aggiungere rate limiting a `/api/extract-match-data`
- [ ] Aggiungere rate limiting a `/api/extract-player`
- [ ] Aggiungere rate limiting a `/api/extract-formation`
- [ ] Aggiungere rate limiting a `/api/extract-coach`
- [ ] Aggiungere validazione input in `/api/analyze-match`
- [ ] Aggiungere validazione input in `/api/supabase/save-match`
- [ ] Aggiungere sanitizzazione input (opponent_name, client_team_name)

### **Coerenza Flussi**
- [ ] Aggiungere validazione `isHome` nel wizard prima di salvare
- [ ] Verificare che tutti i flussi gestiscano correttamente `is_home`

---

**Fine Documento Analisi**
