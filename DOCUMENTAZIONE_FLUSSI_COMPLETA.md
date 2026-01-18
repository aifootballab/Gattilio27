# 📋 Documentazione Completa Flussi e Logiche - eFootball AI Coach

## 🎯 Indice
1. [Architettura Generale](#architettura-generale)
2. [Autenticazione e Autorizzazione](#autenticazione-e-autorizzazione)
3. [Flusso Upload Screenshot](#flusso-upload-screenshot)
4. [Flusso Estrazione Dati](#flusso-estrazione-dati)
5. [Flusso Salvataggio Giocatori](#flusso-salvataggio-giocatori)
6. [Flusso Recupero Giocatori](#flusso-recupero-giocatori)
7. [Flusso Modifica Giocatori](#flusso-modifica-giocatori)
8. [Gestione Rosa (21 Slot)](#gestione-rosa-21-slot)
9. [UX e Interfaccia Utente](#ux-e-interfaccia-utente)
10. [Database e Struttura Dati](#database-e-struttura-dati)

---

## 🏗️ Architettura Generale

### Stack Tecnologico
- **Frontend**: Next.js 14 (App Router), React 18, Client Components
- **Backend**: Next.js API Routes (Server Actions)
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: Supabase Auth (JWT tokens)
- **AI**: OpenAI GPT-4 Vision (gpt-4o) per estrazione dati
- **Deploy**: Vercel

### Struttura File Principali
```
app/
├── page.jsx                    # Homepage (redirect a /dashboard)
├── dashboard/page.jsx          # Dashboard principale
├── rosa/page.jsx               # Upload screenshot e gestione rosa
├── my-players/page.jsx         # Lista giocatori salvati
├── player/[id]/page.jsx        # Dettaglio giocatore
├── player/[id]/EditPlayerDataModal.jsx  # Modal modifica dati
├── api/
│   ├── extract-player/route.js      # Estrazione singolo screenshot
│   ├── extract-batch/route.js       # Estrazione batch (1-6 screenshot)
│   ├── supabase/
│   │   ├── save-player/route.js      # Salvataggio giocatore
│   │   ├── get-my-players/route.js  # Recupero giocatori utente
│   │   ├── update-player-data/route.js  # Aggiornamento dati
│   │   └── reset-my-data/route.js   # Reset dati utente
lib/
├── supabaseClient.js           # Client Supabase (anon key)
└── authHelper.js               # Helper validazione token
```

---

## 🔐 Autenticazione e Autorizzazione

### Flusso Autenticazione

#### 1. **Login Utente** (`/login`)
- Utente inserisce email/password
- Supabase Auth genera JWT token
- Token salvato in sessione browser (cookie/localStorage)
- Redirect a `/dashboard`

#### 2. **Validazione Token (Frontend)**
**File**: `app/rosa/page.jsx`, `app/my-players/page.jsx`, `app/player/[id]/page.jsx`

```javascript
// Pattern comune in tutte le pagine protette
React.useEffect(() => {
  const initAuth = async () => {
    const { data, error } = await supabase.auth.getSession()
    
    if (!data?.session?.access_token || error) {
      router.push('/login')  // Redirect se non autenticato
      return
    }
    
    const token = data.session.access_token
    const userId = data.session.user.id
    // Usa token per chiamate API
  }
  initAuth()
}, [])
```

#### 3. **Validazione Token (Backend)**
**File**: `lib/authHelper.js`

**Funzione `extractBearerToken(req)`**:
- Estrae token da header `Authorization: Bearer <token>`
- Supporta case-insensitive (`authorization` o `Authorization`)
- Cerca in tutti gli headers se non trovato
- Ritorna token pulito (senza "Bearer ")

**Funzione `validateToken(token, supabaseUrl, anonKey)`**:
- Crea client Supabase con anon key
- Chiama `authClient.auth.getUser(token)`
- Verifica che `user.id` esista
- Ritorna `{ userData, error }`

#### 4. **Uso Token nelle API Routes**
**Pattern standard**:
```javascript
// 1. Estrai token
const token = extractBearerToken(req)
if (!token) {
  return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
}

// 2. Valida token
const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
if (authError || !userData?.user?.id) {
  return NextResponse.json({ error: 'Invalid auth' }, { status: 401 })
}

// 3. Usa userId per query database
const userId = userData.user.id
const admin = createClient(supabaseUrl, serviceKey)  // Service role bypassa RLS
```

### Row Level Security (RLS)
- **Tabella `players`**: Utenti possono vedere/modificare solo i propri giocatori
- **Query pattern**: `.eq('user_id', userId)` in tutte le query
- **Backend**: Usa `serviceKey` per bypassare RLS quando necessario

---

## 📤 Flusso Upload Screenshot

### Pagina `/rosa` - Upload e Estrazione

#### 1. **Upload File** (`app/rosa/page.jsx`)

**Drag & Drop o Click**:
```javascript
// Supporta 1-6 screenshot simultanei
const onPickFiles = async (fileList) => {
  const files = Array.from(fileList).slice(0, 6)
  const newImages = []
  
  for (const f of files) {
    // Compressione: max 1200px, quality 0.88
    const dataUrl = await compressImageToDataUrl(f, 1200, 0.88)
    newImages.push({ id: crypto.randomUUID(), dataUrl })
  }
  
  setImages((prev) => [...prev, ...newImages])
}
```

**Compressione Immagine**:
- Legge file come DataURL
- Crea canvas, ridimensiona a max 1200px (mantiene aspect ratio)
- Converte a JPEG quality 0.88
- Ritorna DataURL compresso

#### 2. **Estrazione Batch** (`analyzeBatch()`)

**Chiamata API**:
```javascript
const res = await fetch('/api/extract-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    images: images.map(i => ({ id: i.id, imageDataUrl: i.dataUrl })) 
  })
})
```

**Progress Tracking**:
- `processingProgress.current` / `processingProgress.total`
- Mostra barra progresso durante estrazione

---

## 🤖 Flusso Estrazione Dati

### Estrazione Singola (`/api/extract-player`)

#### 1. **Input**
```json
{
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

#### 2. **Chiamata OpenAI**
**File**: `app/api/extract-player/route.js`

**Prompt Critico**:
- Estrai SOLO ciò che vedi (null se non visibile)
- PRIORITÀ: Usa TABELLA statistiche (non radar chart)
- Estrai: nome, posizione, rating, stats, skills, boosters, ecc.

**API Call**:
```javascript
const openaiRes = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    text: { format: { type: 'json_object' } },
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: prompt },
        { type: 'input_image', image_url: imageDataUrl, detail: 'high' }
      ]
    }],
    temperature: 0,
    max_output_tokens: 2500
  })
})
```

#### 3. **Normalizzazione Dati**
**Funzione `normalizePlayer(p)`**:
- Converte stringhe a numeri (`toNumber()`)
- Limita array: skills (40), com_skills (20), ai_playstyles (10)
- Normalizza `base_stats` (attacking, defending, athleticism)
- Rimuove chiavi null da base_stats

#### 4. **Output**
```json
{
  "player": {
    "player_name": "Ronaldinho Gaúcho",
    "overall_rating": 99,
    "position": "ESA",
    "base_stats": { ... },
    "skills": [...],
    "boosters": [...]
  }
}
```

### Estrazione Batch (`/api/extract-batch`)

#### 1. **Input**
```json
{
  "images": [
    { "id": "uuid1", "imageDataUrl": "data:image/..." },
    { "id": "uuid2", "imageDataUrl": "data:image/..." }
  ]
}
```

#### 2. **Processo Batch**
**File**: `app/api/extract-batch/route.js`

**Step 1 - Estrazione Parallela**:
```javascript
// Estrai dati da ogni screenshot
const extractions = await Promise.all(
  images.map(img => openaiJson(apiKey, [{...}], 500))
)
```

**Step 2 - Raggruppamento Intelligente**:
```javascript
// Normalizza nomi per matching
function normalizePlayerKey(item) {
  const name = normName(item.player_name)  // lowercase, rimuovi punti/spazi
  // Usa: nome completo + cognome + rating-posizione come chiave
  return `${name}|${cognome}|${rating}-${position}`
}

// Raggruppa per chiave normalizzata
const groups = new Map()
for (const player of extractions) {
  const key = normalizePlayerKey(player)
  if (!groups.has(key)) {
    groups.set(key, { group_id: uuid, players: [] })
  }
  groups.get(key).players.push(player)
}
```

**Step 3 - Merge Intelligente**:
```javascript
// Per ogni gruppo, merge dati da più screenshot
for (const [key, group] of groups) {
  let merged = null
  
  for (const player of group.players) {
    merged = {
      ...merged,
      ...player,
      // Merge stats (preferisci valori più alti)
      base_stats: mergeStats(merged?.base_stats, player.base_stats),
      // Merge skills (dedup)
      skills: dedupArray([...(merged?.skills || []), ...(player.skills || [])]),
      // Merge boosters (max 2)
      boosters: mergeBoosters(merged?.boosters, player.boosters)
    }
  }
  
  group.player = merged
  group.completeness = calculateCompleteness(merged)
}
```

**Step 4 - Calcolo Completeness**:
```javascript
function calculateCompleteness(player) {
  const hasIdentity = !!(player.player_name && player.position)
  const hasStats = !!(player.base_stats && Object.keys(...).length > 0)
  const hasSkills = !!(skills.length > 0 || com_skills.length > 0)
  const hasBoosters = !!(boosters.length > 0)
  
  const percentage = (hasIdentity ? 25 : 0) + (hasStats ? 25 : 0) + 
                     (hasSkills ? 25 : 0) + (hasBoosters ? 25 : 0)
  
  const missingSections = []
  if (!hasStats) missingSections.push('stats')
  if (!hasSkills) missingSections.push('skills')
  if (!hasBoosters) missingSections.push('boosters')
  
  return { identity, stats, skills, boosters, percentage, missingSections }
}
```

#### 3. **Output**
```json
{
  "groups": [
    {
      "group_id": "uuid",
      "label": "Ronaldinho Gaúcho (ESA, OVR 99)",
      "player": { ... },
      "completeness": {
        "identity": true,
        "stats": true,
        "skills": false,
        "boosters": true,
        "percentage": 75,
        "missingSections": ["skills"]
      }
    }
  ]
}
```

**Gestione Errori Multi-Player**:
- Se OpenAI rileva più giocatori in uno screenshot → errore `MULTI_PLAYER_DETECTED`
- Frontend mostra warning e suggerisce di rimuovere foto

---

## 💾 Flusso Salvataggio Giocatori

### Frontend (`app/rosa/page.jsx`)

#### 1. **Click "Salva Giocatore"**
```javascript
const saveToSupabase = async (player) => {
  // 1. Ottieni token fresco
  const token = await getFreshToken()
  
  // 2. Chiama API
  const res = await fetch('/api/supabase/save-player', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ player })
  })
}
```

### Backend (`app/api/supabase/save-player/route.js`)

#### 1. **Validazione Auth**
```javascript
const token = extractBearerToken(req)
const { userData } = await validateToken(token, supabaseUrl, anonKey)
const userId = userData.user.id
```

#### 2. **Lookup Playing Style**
```javascript
// Se playing_style è presente, cerca ID in tabella playing_styles
if (player.playing_style) {
  const { data: playingStyle } = await admin
    .from('playing_styles')
    .select('id')
    .ilike('name', player.playing_style.trim())
    .maybeSingle()
  
  playingStyleId = playingStyle?.id || null
}
```

#### 3. **Preparazione Dati**
```javascript
const playerData = {
  user_id: userId,
  player_name: toText(player.player_name),
  position: toText(player.position),
  overall_rating: toInt(player.overall_rating),
  base_stats: player.base_stats || {},
  skills: Array.isArray(player.skills) ? player.skills : [],
  com_skills: Array.isArray(player.com_skills) ? player.com_skills : [],
  available_boosters: Array.isArray(player.boosters) ? player.boosters : [],
  height: toInt(player.height_cm),
  weight: toInt(player.weight_kg),
  age: toInt(player.age),
  nationality: toText(player.nationality),
  playing_style_id: playingStyleId,
  current_level: toInt(player.level_current),
  level_cap: toInt(player.level_cap),
  active_booster_name: player.boosters?.[0]?.name || null,
  extracted_data: player,  // Dati completi estratti
  metadata: {
    source: 'screenshot_extractor',
    saved_at: new Date().toISOString(),
    weak_foot_frequency: player.weak_foot_frequency || null,
    // ... altri metadati
  }
}
```

#### 4. **Gestione Slot Index** (se presente)
```javascript
if (slotIndex !== null && slotIndex >= 0 && slotIndex < 21) {
  // Se slot già occupato, svuota
  const { data: existingPlayerInSlot } = await admin
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .eq('slot_index', slotIndex)
    .maybeSingle()
  
  if (existingPlayerInSlot) {
    await admin
      .from('players')
      .update({ slot_index: null })
      .eq('id', existingPlayerInSlot.id)
  }
  
  playerData.slot_index = slotIndex
}
```

#### 5. **Check Duplicati**
```javascript
// Cerca giocatore esistente per nome (case-insensitive)
const { data: existing } = await admin
  .from('players')
  .select('id, slot_index')
  .eq('user_id', userId)
  .ilike('player_name', playerName)
  .maybeSingle()

if (existing) {
  // AGGIORNA giocatore esistente
  playerData.updated_at = new Date().toISOString()
  const { data: updated } = await admin
    .from('players')
    .update(playerData)
    .eq('id', existing.id)
    .select('id')
    .single()
  
  return { success: true, player_id: updated.id, is_new: false }
} else {
  // CREA nuovo giocatore
  // Verifica limite rosa (21 giocatori con slot_index)
  const { count } = await admin
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('slot_index', 'is', null)
  
  if (count >= 21 && slotIndex !== null) {
    return NextResponse.json({ 
      error: 'Rosa piena',
      rosa_full: true 
    }, { status: 400 })
  }
  
  const { data: inserted } = await admin
    .from('players')
    .insert(playerData)
    .select('id')
    .single()
  
  return { success: true, player_id: inserted.id, is_new: true }
}
```

#### 6. **Response**
```json
{
  "success": true,
  "player_id": "uuid",
  "is_new": true,
  "slot_index": 0
}
```

---

## 📥 Flusso Recupero Giocatori

### Frontend (`app/my-players/page.jsx`)

#### 1. **Fetch al Mount**
```javascript
React.useEffect(() => {
  const fetchPlayers = async () => {
    // 1. Verifica sessione
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session?.access_token) {
      router.push('/login')
      return
    }
    
    // 2. Chiama API
    const token = sessionData.session.access_token
    const res = await fetch('/api/supabase/get-my-players', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'  // No cache
    })
    
    // 3. Filtra e setta
    const data = await res.json()
    const playersArray = Array.isArray(data.players)
      ? data.players.filter(p => p && p.id && p.player_name)
      : []
    
    setPlayers(playersArray)
  }
  
  fetchPlayers()
}, [mounted, router])
```

### Backend (`app/api/supabase/get-my-players/route.js`)

#### 1. **Query Database**
```javascript
// Query diretta: tutti i giocatori dell'utente
const { data: players, error } = await admin
  .from('players')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

#### 2. **Lookup Playing Styles**
```javascript
// Recupera playing_styles per ogni giocatore
const playingStyleIds = [...new Set(players.map(p => p.playing_style_id).filter(id => id))]
const { data: playingStyles } = await admin
  .from('playing_styles')
  .select('id, name')
  .in('id', playingStyleIds)

const playingStylesMap = new Map(playingStyles.map(ps => [ps.id, ps]))
```

#### 3. **Formattazione per Frontend**
```javascript
const formattedPlayers = players.map(player => {
  const playingStyle = player.playing_style_id 
    ? playingStylesMap.get(player.playing_style_id) 
    : null
  
  return {
    id: player.id,
    player_name: player.player_name,
    position: player.position,
    overall_rating: player.overall_rating,
    base_stats: player.base_stats || {},
    skills: player.skills || [],
    // ... altri campi
    playing_style_name: playingStyle?.name || null,
    completeness: calculateCompleteness(player),
    created_at: player.created_at,
    updated_at: player.updated_at
  }
})
```

#### 4. **Calcolo Completeness**
```javascript
function calculateCompleteness(player) {
  const hasStats = !!(player.base_stats && Object.keys(...).length > 0)
  const hasOverallRating = !!player.overall_rating
  
  const fields = {
    base: !!player.player_name && hasOverallRating && !!player.position,
    stats: hasStats,
    physical: !!(player.height && player.weight && player.age),
    skills: Array.isArray(player.skills) && player.skills.length > 0,
    booster: !!player.active_booster_name,
    team: !!player.team,
    nationality: !!player.nationality
  }
  
  const total = Object.keys(fields).length
  const completed = Object.values(fields).filter(Boolean).length
  const percentage = Math.round((completed / total) * 100)
  
  const missing = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key]) => key)
  
  return { percentage, missing, fields }
}
```

#### 5. **Response con Cache Headers**
```javascript
return NextResponse.json(
  { players: formattedPlayers, count: formattedPlayers.length },
  {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
  }
}
)
```

---

## ✏️ Flusso Modifica Giocatori

### Frontend (`app/player/[id]/EditPlayerDataModal.jsx`)

#### 1. **Apertura Modal**
- Utente clicca "Completa Dati" o "Modifica" su scheda giocatore
- Modal si apre con dati correnti precompilati

#### 2. **State Management**
```javascript
// Stats form state
const [stats, setStats] = React.useState({
  attacking: { ...(baseStats.attacking || {}) },
  defending: { ...(baseStats.defending || {}) },
  athleticism: { ...(baseStats.athleticism || {}) }
})

// Physical form state
const [physical, setPhysical] = React.useState({
  height: player.height || '',
  weight: player.weight || '',
  age: player.age || '',
  team: player.team || '',
  nationality: player.nationality || '',
  playing_style: player.playing_style_name || ''
})

// Skills form state
const [skills, setSkills] = React.useState([...(player.skills || [])])
const [comSkills, setComSkills] = React.useState([...(player.com_skills || [])])
const [aiPlaystyles, setAiPlaystyles] = React.useState([...(player.metadata?.ai_playstyles || [])])
const [boosters, setBoosters] = React.useState([...(player.available_boosters || [])])
```

#### 3. **Salvataggio**
```javascript
const handleSave = async () => {
  const payload = {
    player_base_id: player.id,  // ID giocatore
  }
  
  // Base stats
  if (hasStatsData) {
    payload.base_stats = {
      ...(baseStats || {}),
      attacking: { ...stats.attacking },
      defending: { ...stats.defending },
      athleticism: { ...stats.athleticism }
    }
  }
  
  // Physical data
  if (physical.height || physical.weight || ...) {
    payload.height = physical.height || null
    payload.weight = physical.weight || null
    // ...
  }
  
  // Skills (sempre, anche array vuoto)
  payload.skills = skills.filter(s => s.trim())
  payload.com_skills = comSkills.filter(s => s.trim())
  
  // Boosters (max 2)
  if (boosters.length > 0) {
    payload.available_boosters = boosters.slice(0, 2)
  }
  
  // Metadata (characteristics)
  if (hasCharacteristics) {
    payload.metadata = {
      ...(payload.metadata || {}),
      weak_foot_frequency: characteristics.weak_foot_frequency || null,
      // ...
    }
  }
  
  // Chiama API
  const res = await fetch('/api/supabase/update-player-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  })
}
```

### Backend (`app/api/supabase/update-player-data/route.js`)

#### 1. **Validazione e Verifica Ownership**
```javascript
const token = extractBearerToken(req)
const { userData } = await validateToken(token, supabaseUrl, anonKey)
const userId = userData.user.id

const playerId = payload.player_base_id || payload.player_id || payload.id

// Verifica che il giocatore appartenga all'utente
const { data: existingPlayer } = await admin
  .from('players')
  .select('id, user_id')
  .eq('id', playerId)
  .eq('user_id', userId)
  .maybeSingle()

if (!existingPlayer) {
  return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
}
```

#### 2. **Preparazione Updates**
```javascript
const updates = {}

if (payload.base_stats !== undefined) {
  updates.base_stats = payload.base_stats
}

if (payload.height !== undefined) updates.height = toInt(payload.height)
if (payload.weight !== undefined) updates.weight = toInt(payload.weight)
if (payload.team !== undefined) updates.team = toText(payload.team)

if (Array.isArray(payload.skills)) {
  updates.skills = payload.skills
}

if (payload.metadata !== undefined) {
  updates.metadata = payload.metadata
}

// Gestione playing_style (se presente come nome, cerca ID)
if (payload.playing_style) {
  const { data: playingStyle } = await admin
    .from('playing_styles')
    .select('id')
    .ilike('name', payload.playing_style.trim())
    .maybeSingle()
  
  updates.playing_style_id = playingStyle?.id || null
}
```

#### 3. **Update Database**
```javascript
const { data: updated, error } = await admin
  .from('players')
  .update({
    ...updates,
    updated_at: new Date().toISOString()
  })
  .eq('id', playerId)
  .eq('user_id', userId)
  .select('id')
  .single()

return NextResponse.json({ success: true, player_id: updated.id })
```

---

## 🎮 Gestione Rosa (21 Slot)

### Concetto
- **Rosa**: Massimo 21 giocatori con `slot_index` (0-20)
- **Slot Index**: Posizione nella rosa (null = non in rosa, ma salvato)
- **Giocatori senza slot**: Possono esistere infiniti giocatori senza `slot_index` (solo salvati)

### Logica Slot

#### 1. **Assegnazione Slot** (`save-player`)
```javascript
if (slotIndex !== null && slotIndex >= 0 && slotIndex < 21) {
  // Se slot già occupato, svuota
  const { data: existingPlayerInSlot } = await admin
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .eq('slot_index', slotIndex)
    .maybeSingle()
  
  if (existingPlayerInSlot) {
    await admin
      .from('players')
      .update({ slot_index: null })
      .eq('id', existingPlayerInSlot.id)
  }
  
  playerData.slot_index = slotIndex
}
```

#### 2. **Verifica Limite Rosa**
```javascript
// Solo quando si crea un nuovo giocatore con slot_index
if (!existingPlayer && slotIndex !== null) {
  const { count } = await admin
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('slot_index', 'is', null)  // Solo giocatori in rosa
  
  if (count >= 21) {
    return NextResponse.json({ 
      error: 'Rosa piena',
      rosa_full: true 
    }, { status: 400 })
  }
}
```

#### 3. **Visualizzazione Rosa**
- **Pagina `/rosa`**: Mostra giocatori estratti, permette salvataggio con slot
- **Pagina `/my-players`**: Mostra tutti i giocatori (con e senza slot)
- **Pagina `/player/[id]`**: Dettaglio singolo giocatore

---

## 🎨 UX e Interfaccia Utente

### Dashboard (`app/dashboard/page.jsx`)
- **Layout**: 3 colonne (Left, Center, Right)
- **Left Panel**: Roster, Squad Overview, Tactical Goals
- **Center Panel**: User Profile (email, logout/login)
- **Right Panel**: Match Insights, Quick Links, Memory Insights
- **Language Switcher**: IT/EN in alto a destra (fisso)

### Rosa Page (`app/rosa/page.jsx`)
- **Upload Zone**: Drag & drop o click per selezionare 1-6 screenshot
- **Preview**: Grid di thumbnail con possibilità di rimuovere
- **Estrazione**: Bottone "Estrai Dati" → mostra progress bar
- **Risultati**: Card per ogni giocatore raggruppato con:
  - Completeness badge (percentage, missing sections)
  - Dati base (nome, OVR, posizione, team)
  - Bottone "Salva Giocatore" (disabilitato se dati insufficienti)
- **Messaggi**: Success/error per salvataggio

### My Players Page (`app/my-players/page.jsx`)
- **Header**: Titolo, contatore giocatori, link a dashboard/rosa
- **Grid**: Card responsive per ogni giocatore
- **Player Card**:
  - Header: Nome, OVR, posizione
  - Completeness badge
  - Info grid: Team, Card Type, Level, Boosters
  - Actions: "Dettagli" (expand), "Scheda Completa" (link a `/player/[id]`)
  - Expanded: Nazionalità, fisico, età, form, skills (prime 5)

### Player Detail Page (`app/player/[id]/page.jsx`)
- **Header**: Nome, OVR, posizione, link indietro
- **Sections**:
  - Base Info (team, card type, nationality, physical)
  - Stats (attacking, defending, athleticism)
  - Skills (skills, com_skills, ai_playstyles)
  - Boosters
  - Characteristics (weak foot, form, injury resistance)
- **Actions**: Bottone "Completa Dati" → apre `EditPlayerDataModal`

### Edit Player Data Modal (`app/player/[id]/EditPlayerDataModal.jsx`)
- **Layout**: Modal fullscreen con scroll verticale
- **Sections Collassabili**: Solo sezioni con dati mancanti
  - Stats Details
  - Physical Data
  - Player Skills
  - Additional Skills
  - AI Playstyles
  - Additional Positions
  - Boosters
  - Characteristics
- **Form Elements**:
  - Stats: Input numerici (0-99)
  - Physical: Input numerici + dropdown (team, nationality, playing_style)
  - Skills: Dropdown con opzioni predefinite + add/remove
  - Boosters: Form con name, effect, activation_condition (max 2)
- **Actions**: "Chiudi", "Salva" (con loading state)

### Language Support
- **i18n**: `lib/i18n.js` (hook `useTranslation()`)
- **Lingue**: IT, EN
- **Switcher**: Presente in tutte le pagine (fisso in alto a destra)

---

## 🗄️ Database e Struttura Dati

### Tabella `players`

**Campi Principali**:
```sql
id                    UUID PRIMARY KEY
user_id               UUID (FK a auth.users)
player_name           TEXT
position              TEXT (es: "ESA", "CF", "GK")
overall_rating        INTEGER
base_stats            JSONB {
  overall_rating: number,
  attacking: { offensive_awareness, ball_control, dribbling, ... },
  defending: { defensive_awareness, tackling, ... },
  athleticism: { speed, acceleration, ... }
}
skills                TEXT[] (array di stringhe)
com_skills            TEXT[] (array di stringhe)
position_ratings      JSONB (ratings per posizioni aggiuntive)
available_boosters    JSONB [{ name, effect, activation_condition }]
height                INTEGER (cm)
weight                INTEGER (kg)
age                   INTEGER
nationality           TEXT
club_name             TEXT
team                  TEXT
form                  TEXT
role                  TEXT
playing_style_id      UUID (FK a playing_styles)
current_level         INTEGER
level_cap             INTEGER
active_booster_name   TEXT
development_points    JSONB
slot_index            INTEGER (0-20, NULL = non in rosa)
extracted_data        JSONB (dati completi estratti da OpenAI)
metadata              JSONB {
  source: 'screenshot_extractor',
  saved_at: ISO string,
  weak_foot_frequency: string,
  weak_foot_accuracy: string,
  form_detailed: string,
  injury_resistance: string,
  ai_playstyles: string[],
  matches_played: number,
  goals: number,
  assists: number
}
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

**Indici**:
- `user_id` (per query rapide)
- `slot_index` (per gestione rosa)
- `player_name` (per ricerca duplicati)

**RLS Policies**:
```sql
-- Utenti possono vedere solo i propri giocatori
CREATE POLICY "Users can view own players"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

-- Utenti possono inserire solo con il proprio user_id
CREATE POLICY "Users can insert own players"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Utenti possono aggiornare solo i propri giocatori
CREATE POLICY "Users can update own players"
  ON players FOR UPDATE
  USING (auth.uid() = user_id);
```

### Tabella `playing_styles`
```sql
id    UUID PRIMARY KEY
name  TEXT UNIQUE (es: "Ala prolifica", "Incontrista")
```

### Funzioni Helper

**`toInt(v)`**: Converte a integer (null se invalido)
**`toText(v)`**: Converte a stringa trimmed (null se vuoto)
**`toNumber(v)`**: Converte a number (null se invalido)
**`normName(name)`**: Normalizza nome (lowercase, rimuovi punti/spazi multipli)

---

## 🔄 Flussi Completi End-to-End

### Flusso 1: Upload → Estrazione → Salvataggio
1. Utente va su `/rosa`
2. Upload 1-6 screenshot (drag & drop)
3. Click "Estrai Dati"
4. Frontend chiama `/api/extract-batch`
5. Backend estrae dati con OpenAI, raggruppa, merge
6. Frontend mostra gruppi con completeness
7. Utente click "Salva Giocatore" su un gruppo
8. Frontend chiama `/api/supabase/save-player` con token
9. Backend verifica auth, cerca duplicati, salva/aggiorna
10. Frontend mostra messaggio success/error

### Flusso 2: Visualizzazione → Modifica
1. Utente va su `/my-players`
2. Frontend chiama `/api/supabase/get-my-players` con token
3. Backend query database, formatta, calcola completeness
4. Frontend mostra grid di card
5. Utente click "Scheda Completa" su un giocatore
6. Navigazione a `/player/[id]`
7. Frontend fetch giocatore da `/api/supabase/get-my-players`, filtra per ID
8. Mostra dettaglio completo
9. Utente click "Completa Dati"
10. Apre `EditPlayerDataModal` con dati precompilati
11. Utente modifica campi, click "Salva"
12. Frontend chiama `/api/supabase/update-player-data` con token
13. Backend verifica ownership, aggiorna database
14. Frontend chiude modal, refresh dati

### Flusso 3: Reset Dati
1. Utente va su `/rosa`
2. Click "Reset My Data"
3. Frontend chiama `/api/supabase/reset-my-data` con token
4. Backend cancella tutti i giocatori dell'utente (`DELETE FROM players WHERE user_id = ?`)
5. Frontend mostra messaggio success

---

## 🛡️ Sicurezza e Best Practices

### Autenticazione
- ✅ Token sempre validato prima di ogni operazione DB
- ✅ Service role key usata solo in backend (mai esposta)
- ✅ RLS policies attive su Supabase
- ✅ Verifica ownership su ogni update/delete

### Validazione Dati
- ✅ Normalizzazione input (trim, lowercase, type conversion)
- ✅ Limiti array (skills max 40, boosters max 2)
- ✅ Validazione slot_index (0-20)
- ✅ Check duplicati per nome (case-insensitive)

### Error Handling
- ✅ Try-catch in tutte le API routes
- ✅ Messaggi errore user-friendly
- ✅ Logging errori server-side (console.error)
- ✅ Gestione errori OpenAI (timeout, invalid response)

### Performance
- ✅ Compressione immagini prima upload (max 1200px)
- ✅ Cache headers per get-my-players (no-store)
- ✅ Query ottimizzate (indici su user_id, slot_index)
- ✅ Batch extraction parallela (Promise.all)

---

## 📝 Note Finali

### Limitazioni Attuali
- Massimo 6 screenshot per batch extraction
- Rosa limitata a 21 giocatori con slot_index
- Estrazione batch può fallire se screenshot contiene più giocatori

### Future Migliorazioni
- Supporto per più di 6 screenshot
- Gestione rosa con drag & drop
- Export/import dati
- Statistiche avanzate giocatori
- Confronto giocatori

---

**Documentazione aggiornata al**: 2024
**Versione**: 1.0
**Autore**: AI Assistant
