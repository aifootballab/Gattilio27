# 📸 Analisi Gestione Foto in Supabase

**Data**: 26 Gennaio 2026  
**Scopo**: Documentare come Supabase gestisce l'acquisizione delle foto, calcoli, cast, costanti e variabili

---

## 🎯 PANORAMICA

Le foto NON vengono salvate direttamente in Supabase Storage. Il sistema usa un approccio **"metadati-only"**:
- Le foto vengono convertite in **Base64** nel frontend
- Vengono inviate all'API come `imageDataUrl` (stringa base64)
- L'AI estrae i dati dalla foto
- Solo i **metadati** (dati estratti) vengono salvati in Supabase
- Il campo `photo_slots` (JSONB) traccia quali foto sono state caricate

---

## 📊 COSTANTI E VARIABILI

### **1. Costanti Dimensione Immagine**

**File**: `app/api/extract-player/route.js` (riga 124-140)  
**File**: `app/api/extract-formation/route.js` (riga 47-63)  
**File**: `app/api/extract-coach/route.js` (riga 92-108)  
**File**: `app/api/extract-match-data/route.js` (riga 397-411)

```javascript
// Costante: Dimensione massima immagine
const maxSizeBytes = 10 * 1024 * 1024  // 10MB = 10,485,760 bytes

// Calcolo dimensione base64
const base64Image = imageDataUrl.split(',')[1]  // Estrae parte base64 (dopo "data:image/...;base64,")
const imageSizeBytes = (base64Image.length * 3) / 4  // Base64 è ~33% più grande del binario
```

**Formula**:
- Base64 encoding aumenta dimensione di ~33%
- Formula inversa: `(base64Length * 3) / 4` = dimensione binaria approssimativa
- Validazione: `imageSizeBytes > maxSizeBytes` → errore 400

---

### **2. Costanti Validazione Testo**

**File**: `app/api/supabase/save-player/route.js` (riga 68)

```javascript
const MAX_TEXT_LENGTH = 255  // Caratteri massimi per campi testo
```

**Campi Validati**:
- `player_name` (max 255 caratteri)
- `team` (max 255 caratteri)
- `nationality` (max 255 caratteri)
- `club_name` (max 255 caratteri)

---

### **3. Costanti Validazione JSONB**

**File**: `app/api/supabase/save-formation-layout/route.js` (riga 49-55)

```javascript
const MAX_JSONB_SIZE = 500 * 1024  // 500KB = 512,000 bytes
```

**Validazione**:
- `slot_positions` (JSONB) non può superare 500KB
- Calcolo: `JSON.stringify(slot_positions).length > MAX_JSONB_SIZE`

---

### **4. Costanti Slot Index**

**File**: `app/api/supabase/save-player/route.js` (riga 136-138)

```javascript
// slot_index: 0-10 = titolare, null = riserva
slot_index: player.slot_index !== undefined && player.slot_index !== null 
  ? Math.max(0, Math.min(10, Number(player.slot_index)))  // Clamp tra 0 e 10
  : null
```

**Validazione**:
- `Math.max(0, ...)` → minimo 0
- `Math.min(10, ...)` → massimo 10
- `Number(...)` → cast a numero

---

### **5. Costanti Overall Rating**

**File**: `app/api/extract-formation/route.js` (riga 195-197)

```javascript
// Validazione overall_rating: 40-110 (supporta boosters)
const rating = Number(player.overall_rating)
if (isNaN(rating) || rating < 40 || rating > 110) {
  player.overall_rating = null  // Rimuovi rating non valido
}
```

**Range Valido**: 40-110 (inclusi)

---

### **6. Costanti Array Limiti**

**File**: `app/api/extract-player/route.js` (riga 62-80)

```javascript
// Limiti array
skills: normalized.skills.slice(0, 40)           // Max 40 skills
com_skills: normalized.com_skills.slice(0, 20)    // Max 20 com_skills
ai_playstyles: normalized.ai_playstyles.slice(0, 10)  // Max 10 ai_playstyles
boosters: normalized.boosters.slice(0, 10)       // Max 10 boosters
```

---

### **7. Costanti OpenAI**

**File**: `app/api/extract-player/route.js` (riga 241-243)

```javascript
response_format: { type: 'json_object' },
temperature: 0,        // Deterministico (estrazione dati)
max_tokens: 2500       // Max token per risposta
```

**File**: `app/api/extract-formation/route.js` (riga 120)

```javascript
max_tokens: 4000  // Più token per 11 giocatori
```

---

## 🔄 CAST E CONVERSIONI

### **1. Funzione `toInt(v)`**

**File**: `app/api/supabase/save-player/route.js` (riga 8-12)  
**File**: `app/api/extract-player/route.js` (riga 8-12)  
**File**: `app/api/supabase/save-match/route.js` (riga 8-12)  
**File**: `app/api/supabase/update-match/route.js` (riga 8-12)

```javascript
function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)  // Cast a Number
  return Number.isFinite(n) ? Math.trunc(n) : null  // Rimuove decimali
}
```

**Uso**:
- `overall_rating`: `typeof === 'number' ? value : toInt(value)`
- `age`, `height`, `weight`: `toInt(value)`
- `slot_index`: `Number(value)` con clamp `Math.max(0, Math.min(10, ...))`

---

### **2. Funzione `toText(v)`**

**File**: `app/api/supabase/save-player/route.js` (riga 14-16)

```javascript
function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}
```

**Uso**:
- `player_name`, `team`, `nationality`, `club_name`: `toText(value)`
- Rimuove spazi iniziali/finali
- Restituisce `null` se vuoto o non stringa

---

### **3. Cast Base64**

**File**: `app/api/extract-player/route.js` (riga 126-128)

```javascript
if (imageDataUrl.startsWith('data:image/')) {
  const base64Image = imageDataUrl.split(',')[1]  // Estrae parte base64
  // ...
}
```

**Formato**: `data:image/[type];base64,[base64String]`  
**Estrae**: Solo la parte dopo la virgola (base64 puro)

---

### **4. Cast Array**

**File**: `app/api/supabase/save-player/route.js` (riga 105-108)

```javascript
skills: Array.isArray(player.skills) ? player.skills : [],
com_skills: Array.isArray(player.com_skills) ? player.com_skills : [],
available_boosters: Array.isArray(player.boosters) ? player.boosters : [],
```

**Validazione**: Verifica `Array.isArray()` prima di usare

---

### **5. Cast Oggetto**

**File**: `app/api/supabase/save-player/route.js` (riga 104)

```javascript
base_stats: player.base_stats && typeof player.base_stats === 'object' 
  ? player.base_stats 
  : {},
```

**Validazione**: Verifica `typeof === 'object'` prima di usare

---

## 🧮 CALCOLI

### **1. Calcolo Dimensione Immagine Base64**

**File**: `app/api/extract-player/route.js` (riga 129-131)

```javascript
// Base64 è ~33% più grande del binario
const imageSizeBytes = (base64Image.length * 3) / 4
const maxSizeBytes = 10 * 1024 * 1024  // 10MB

if (imageSizeBytes > maxSizeBytes) {
  // Errore: immagine troppo grande
}
```

**Formula**:
- Base64 encoding: ogni 3 byte binari → 4 caratteri base64
- Formula inversa: `(base64Length * 3) / 4` = dimensione binaria
- Esempio: 10MB binario ≈ 13.3MB base64

---

### **2. Calcolo Overall Rating (Math.max)**

**File**: `app/gestione-formazione/page.jsx` (riga 779-786)

```javascript
// Usa il valore più alto tra tutte le foto caricate
const allRatings = Object.values(allExtractedData)
  .map(p => p?.overall_rating)
  .filter(r => r != null && r > 0)
if (allRatings.length > 0) {
  playerData.overall_rating = Math.max(...allRatings)
}
```

**File**: `app/api/supabase/save-player/route.js` (riga 203-207)

```javascript
// Preferisce sempre il valore più alto (evita downgrade)
const existingOverall = existingPlayerInSlot.overall_rating != null 
  ? Number(existingPlayerInSlot.overall_rating) 
  : null
const newOverall = playerData.overall_rating != null 
  ? Number(playerData.overall_rating) 
  : null
const finalOverall = (existingOverall != null && newOverall != null) 
  ? Math.max(existingOverall, newOverall) 
  : (newOverall != null ? newOverall : existingOverall)
```

**Logica**:
- Se entrambi presenti → `Math.max(existing, new)`
- Se solo nuovo → usa nuovo
- Se solo esistente → mantiene esistente

---

### **3. Calcolo Merge Photo Slots**

**File**: `app/api/supabase/save-player/route.js` (riga 169-172)

```javascript
const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
const newPhotoSlots = playerData.photo_slots || {}
const mergedPhotoSlots = { ...existingPhotoSlots, ...newPhotoSlots }
```

**Logica**:
- Merge oggetti: `{ ...existing, ...new }`
- Nuovi valori sovrascrivono esistenti
- Mantiene tutti i valori esistenti non sovrascritti

---

### **4. Calcolo Merge Skills (Rimuovi Duplicati)**

**File**: `app/api/supabase/save-player/route.js` (riga 179-186)

```javascript
const existingSkills = Array.isArray(existingPlayerInSlot.skills) 
  ? existingPlayerInSlot.skills 
  : []
const newSkills = Array.isArray(playerData.skills) 
  ? playerData.skills 
  : []
const mergedSkills = [...existingSkills, ...newSkills]
  .filter((v, i, a) => a.indexOf(v) === i)  // Rimuovi duplicati
```

**Logica**:
- Concatena array: `[...existing, ...new]`
- Filtra duplicati: `filter((v, i, a) => a.indexOf(v) === i)`
- Mantiene solo prima occorrenza

---

### **5. Calcolo Slot Index (Clamp)**

**File**: `app/api/supabase/save-player/route.js` (riga 136-138)

```javascript
slot_index: player.slot_index !== undefined && player.slot_index !== null 
  ? Math.max(0, Math.min(10, Number(player.slot_index))) 
  : null
```

**Logica**:
- `Math.max(0, ...)` → minimo 0
- `Math.min(10, ...)` → massimo 10
- `Number(...)` → cast a numero
- Se `undefined` o `null` → `null` (riserva)

---

## 📸 GESTIONE PHOTO_SLOTS

### **Struttura `photo_slots` (JSONB)**

**Tipo**: `JSONB` (PostgreSQL)  
**Formato**: Oggetto JavaScript

```javascript
{
  card: true,           // Foto card caricata
  statistiche: true,   // Foto statistiche caricata
  abilita: true,       // Foto abilità caricata
  booster: true        // Foto booster caricata (può essere nella stessa foto abilità)
}
```

---

### **Tracciamento Foto nel Frontend**

**File**: `app/gestione-formazione/page.jsx` (riga 748-761)

```javascript
const photoSlots = {}  // Inizializza oggetto vuoto

// Traccia foto caricate basandosi sul tipo
if (img.type === 'card') {
  photoSlots.card = true
} else if (img.type === 'stats') {
  photoSlots.statistiche = true
} else if (img.type === 'skills') {
  photoSlots.abilita = true
  // Se ci sono booster estratti dalla stessa foto, traccia anche booster
  if (extractData.player?.boosters && Array.isArray(extractData.player.boosters) && extractData.player.boosters.length > 0) {
    photoSlots.booster = true
  }
} else if (img.type === 'booster') {
  photoSlots.booster = true
}
```

**Tipi Foto**:
- `card`: Foto card giocatore (statistiche base)
- `stats`: Foto statistiche dettagliate
- `skills`: Foto abilità (può contenere anche booster)
- `booster`: Foto booster dedicata

---

### **Salvataggio `photo_slots` in Supabase**

**File**: `app/api/supabase/save-player/route.js` (riga 139-142)

```javascript
// photo_slots: traccia quali foto sono state caricate
photo_slots: player.photo_slots && typeof player.photo_slots === 'object' 
  ? player.photo_slots 
  : {},
```

**Validazione**:
- Verifica `typeof === 'object'`
- Fallback a `{}` se non valido

---

### **Merge `photo_slots` in UPDATE**

**File**: `app/api/supabase/save-player/route.js` (riga 169-172)

```javascript
const existingPhotoSlots = existingPlayerInSlot.photo_slots || {}
const newPhotoSlots = playerData.photo_slots || {}
const mergedPhotoSlots = { ...existingPhotoSlots, ...newPhotoSlots }
```

**Logica**:
- Merge oggetti: nuovi valori sovrascrivono esistenti
- Mantiene tutti i valori esistenti non sovrascritti
- Esempio: `{ card: true }` + `{ stats: true }` = `{ card: true, stats: true }`

---

## 🔄 FLUSSO COMPLETO ACQUISIZIONE FOTO

### **1. Frontend - Upload File**

**File**: `app/gestione-formazione/page.jsx` (riga 3362-3384)

```javascript
const handleFileSelect = (e, type) => {
  const file = e.target.files?.[0]
  if (!file || !file.type.startsWith('image/')) {
    return  // Validazione tipo file
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target.result  // Base64: "data:image/png;base64,..."
    // ...
  }
  reader.readAsDataURL(file)  // Converte file a base64
}
```

**Conversione**:
- `FileReader.readAsDataURL()` → converte file binario a stringa base64
- Formato: `data:image/[type];base64,[base64String]`

---

### **2. Frontend - Invio a API**

**File**: `app/gestione-formazione/page.jsx` (riga 697-704)

```javascript
const extractRes = await fetch('/api/extract-player', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ imageDataUrl: img.dataUrl })  // Invia base64
})
```

**Payload**:
```json
{
  "imageDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

---

### **3. Backend - Validazione Dimensione**

**File**: `app/api/extract-player/route.js` (riga 124-140)

```javascript
// Validazione dimensione immagine (max 10MB)
if (imageDataUrl.startsWith('data:image/')) {
  const base64Image = imageDataUrl.split(',')[1]  // Estrae base64
  if (base64Image) {
    // Calcola dimensione approssimativa
    const imageSizeBytes = (base64Image.length * 3) / 4
    const maxSizeBytes = 10 * 1024 * 1024  // 10MB
    
    if (imageSizeBytes > maxSizeBytes) {
      return NextResponse.json(
        { error: 'Image size exceeds maximum allowed size (10MB)' },
        { status: 400 }
      )
    }
  }
}
```

**Calcolo**:
- Estrae base64: `split(',')[1]`
- Calcola dimensione: `(base64Length * 3) / 4`
- Valida: `> 10MB` → errore 400

---

### **4. Backend - Estrazione AI**

**File**: `app/api/extract-player/route.js` (riga 222-247)

```javascript
const requestBody = {
  model: 'gpt-4o',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      {
        type: 'image_url',
        image_url: {
          url: imageDataUrl,  // Base64 completo (con "data:image/...")
          detail: 'high'
        }
      }
    ]
  }],
  response_format: { type: 'json_object' },
  temperature: 0,
  max_tokens: 2500
}
```

**Invio a OpenAI**:
- `imageDataUrl` completo (con prefisso `data:image/...`)
- OpenAI accetta base64 con prefisso

---

### **5. Backend - Normalizzazione Dati**

**File**: `app/api/extract-player/route.js` (riga 14-83)

```javascript
function normalizePlayer(player) {
  // Converte overall_rating a number
  normalized.overall_rating = toInt(normalized.overall_rating)
  
  // Normalizza base_stats (tutti i valori a int)
  Object.entries(stats.attacking).forEach(([key, value]) => {
    normalizedStats.attacking[key] = toInt(value)
  })
  
  // Limita array
  normalized.skills = normalized.skills.slice(0, 40)
  normalized.com_skills = normalized.com_skills.slice(0, 20)
  // ...
}
```

**Normalizzazione**:
- `overall_rating` → `toInt()`
- `base_stats` → tutti i valori a `toInt()`
- Array → `slice(0, max)` per limitare dimensione

---

### **6. Frontend - Tracciamento Photo Slots**

**File**: `app/gestione-formazione/page.jsx` (riga 748-761)

```javascript
const photoSlots = {}  // Inizializza

// Traccia foto caricate
if (img.type === 'card') {
  photoSlots.card = true
} else if (img.type === 'stats') {
  photoSlots.statistiche = true
} else if (img.type === 'skills') {
  photoSlots.abilita = true
  if (extractData.player?.boosters?.length > 0) {
    photoSlots.booster = true
  }
} else if (img.type === 'booster') {
  photoSlots.booster = true
}
```

---

### **7. Backend - Salvataggio in Supabase**

**File**: `app/api/supabase/save-player/route.js` (riga 139-142)

```javascript
photo_slots: player.photo_slots && typeof player.photo_slots === 'object' 
  ? player.photo_slots 
  : {},
```

**Salvataggio**:
- `photo_slots` salvato come JSONB in Supabase
- Struttura: `{ card: true, statistiche: true, abilita: true, booster: true }`

---

## 📊 VARIABILI DI STATO

### **Frontend - Gestione Formazione**

**File**: `app/gestione-formazione/page.jsx`

```javascript
const [uploadImages, setUploadImages] = useState([])  // Array di immagini caricate
const [uploadReserveImages, setUploadReserveImages] = useState([])  // Immagini riserve
const [uploadingPlayer, setUploadingPlayer] = useState(false)  // Loading state
```

**Struttura `uploadImages`**:
```javascript
[
  {
    file: File,           // File object originale
    dataUrl: string,      // Base64: "data:image/png;base64,..."
    type: string,         // 'card' | 'stats' | 'skills' | 'booster'
    name: string          // Nome file originale
  },
  // ...
]
```

---

## 🔍 VALIDAZIONI

### **1. Validazione Tipo File**

**File**: `app/gestione-formazione/page.jsx` (riga 3364)

```javascript
if (!file || !file.type.startsWith('image/')) {
  return  // Non è un'immagine
}
```

**Controllo**: `file.type.startsWith('image/')`

---

### **2. Validazione Dimensione Immagine**

**File**: `app/api/extract-player/route.js` (riga 124-140)

```javascript
if (imageDataUrl.startsWith('data:image/')) {
  const base64Image = imageDataUrl.split(',')[1]
  const imageSizeBytes = (base64Image.length * 3) / 4
  const maxSizeBytes = 10 * 1024 * 1024  // 10MB
  
  if (imageSizeBytes > maxSizeBytes) {
    return NextResponse.json({ error: '...' }, { status: 400 })
  }
}
```

**Controllo**: `imageSizeBytes > 10MB` → errore 400

---

### **3. Validazione Nome Giocatore**

**File**: `app/api/extract-player/route.js` (riga 306-311)

```javascript
if (!normalizedPlayer.player_name || 
    typeof normalizedPlayer.player_name !== 'string' || 
    normalizedPlayer.player_name.trim().length === 0) {
  return NextResponse.json(
    { error: 'Player name is required' },
    { status: 400 }
  )
}
```

**Controllo**: Nome obbligatorio, non vuoto

---

### **4. Validazione Overall Rating**

**File**: `app/api/extract-formation/route.js` (riga 195-197)

```javascript
const rating = Number(player.overall_rating)
if (isNaN(rating) || rating < 40 || rating > 110) {
  player.overall_rating = null  // Rimuovi rating non valido
}
```

**Range**: 40-110 (inclusi)

---

## 📝 NOTE IMPORTANTI

### **1. Foto NON Salvate in Storage**

- Le foto vengono convertite a base64 nel frontend
- Vengono inviate all'API per estrazione dati
- Solo i **metadati estratti** vengono salvati in Supabase
- Le foto originali vengono scartate dopo estrazione

---

### **2. Photo Slots = Tracciamento**

- `photo_slots` NON contiene le foto
- `photo_slots` traccia solo **quali foto sono state caricate**
- Usato per mostrare completezza profilo giocatore
- Formato: `{ card: true, statistiche: true, abilita: true, booster: true }`

---

### **3. Base64 Encoding**

- Base64 aumenta dimensione di ~33%
- Formula: `(base64Length * 3) / 4` = dimensione binaria
- Validazione: max 10MB binario ≈ 13.3MB base64

---

### **4. Merge Strategia**

- **Photo Slots**: Merge oggetti (`{ ...existing, ...new }`)
- **Skills**: Concatena e rimuovi duplicati
- **Overall Rating**: `Math.max(existing, new)` (evita downgrade)
- **Base Stats**: Merge oggetti (preferisci nuovi se presenti)

---

## ✅ RIEPILOGO COSTANTI

| Costante | Valore | File | Uso |
|----------|--------|------|-----|
| `maxSizeBytes` | `10 * 1024 * 1024` (10MB) | `extract-player/route.js` | Dimensione max immagine |
| `MAX_TEXT_LENGTH` | `255` | `save-player/route.js` | Lunghezza max campi testo |
| `MAX_JSONB_SIZE` | `500 * 1024` (500KB) | `save-formation-layout/route.js` | Dimensione max JSONB |
| `slot_index` range | `0-10` | `save-player/route.js` | Slot titolari |
| `overall_rating` range | `40-110` | `extract-formation/route.js` | Range rating valido |
| `max_tokens` (player) | `2500` | `extract-player/route.js` | Max token OpenAI |
| `max_tokens` (formation) | `4000` | `extract-formation/route.js` | Max token OpenAI |
| `temperature` | `0` | `extract-player/route.js` | Deterministico |
| `skills` max | `40` | `extract-player/route.js` | Max skills |
| `com_skills` max | `20` | `extract-player/route.js` | Max com_skills |
| `ai_playstyles` max | `10` | `extract-player/route.js` | Max ai_playstyles |
| `boosters` max | `10` | `extract-player/route.js` | Max boosters |

---

## 🔄 RIEPILOGO CAST

| Cast | Funzione | File | Uso |
|------|----------|------|-----|
| `toInt(v)` | `Number(v)` + `Math.trunc()` | `save-player/route.js` | Numeri interi |
| `toText(v)` | `String(v).trim()` | `save-player/route.js` | Testo pulito |
| `Number(v)` | Cast diretto | Vari | Numeri generici |
| `Array.isArray(v)` | Validazione array | Vari | Array |
| `typeof v === 'object'` | Validazione oggetto | Vari | Oggetti |
| `String(v).trim().toLowerCase()` | Normalizzazione nome | Vari | Confronti |

---

## 🧮 RIEPILOGO CALCOLI

| Calcolo | Formula | File | Uso |
|---------|---------|------|-----|
| Dimensione base64 | `(base64Length * 3) / 4` | `extract-player/route.js` | Calcolo dimensione binaria |
| Overall rating max | `Math.max(...allRatings)` | `gestione-formazione/page.jsx` | Valore più alto |
| Overall rating merge | `Math.max(existing, new)` | `save-player/route.js` | Evita downgrade |
| Slot index clamp | `Math.max(0, Math.min(10, n))` | `save-player/route.js` | Limita 0-10 |
| Merge photo slots | `{ ...existing, ...new }` | `save-player/route.js` | Merge oggetti |
| Rimuovi duplicati | `filter((v, i, a) => a.indexOf(v) === i)` | `save-player/route.js` | Array unici |

---

**Ultimo Aggiornamento**: 26 Gennaio 2026  
**Status**: ✅ **ANALISI COMPLETA**
