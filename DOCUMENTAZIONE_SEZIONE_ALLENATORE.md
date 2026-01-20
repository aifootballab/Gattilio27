# Documentazione Sezione Allenatore

## Indice
1. [Panoramica](#panoramica)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend - Pagina Allenatori](#frontend---pagina-allenatori)
5. [Frontend - Integrazione Gestione Formazione](#frontend---integrazione-gestione-formazione)
6. [Flusso Completo Upload](#flusso-completo-upload)
7. [Traduzioni](#traduzioni)

---

## Panoramica

Il sistema di gestione allenatori permette agli utenti di:
- Caricare screenshot di allenatori/manager da eFootball
- Gestire multiple allenatori per utente
- Impostare un allenatore come "attivo" (titolare)
- Visualizzare informazioni dettagliate su ogni allenatore
- Integrare l'allenatore attivo nella pagina "Gestisci Formazione"

**Caratteristiche chiave:**
- **Multi-foto**: Supporta fino a 2 screenshot (dati principali + collegamento opzionale)
- **Merge intelligente**: Unisce dati da più immagini
- **Allenatore attivo**: Solo un allenatore può essere attivo per utente (constraint DB)
- **Non salvataggio immagini**: Le immagini non vengono salvate, solo i dati estratti
- **Traduzione completa**: IT/EN per tutti i testi UI

---

## Database Schema

### Tabella: `coaches`

**File:** `migrations/create_coaches_table.sql`

#### Struttura

```sql
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati base
  coach_name TEXT NOT NULL,
  age INTEGER,
  nationality TEXT,
  team TEXT,
  category TEXT,
  pack_type TEXT,
  
  -- Competenza Stili di Gioco (5 valori numerici)
  playing_style_competence JSONB DEFAULT '{}'::jsonb,
  -- Formato: { "possesso_palla": 46, "contropiede_veloce": 57, "contrattacco": 89, "vie_laterali": 64, "passaggio_lungo": 89 }
  
  -- Affinità di allenamento
  training_affinity_description TEXT,
  stat_boosters JSONB DEFAULT '[]'::jsonb,
  -- Formato: [{"stat_name": "Finalizzazione", "bonus": 1}, {"stat_name": "Comportamento difensivo", "bonus": 1}]
  
  -- Collegamento (opzionale - tatica speciale)
  connection JSONB,
  -- Formato: { "name": "...", "description": "...", "focal_point": {...}, "key_man": {...} }
  
  -- Tracciamento foto caricate
  photo_slots JSONB DEFAULT '{}'::jsonb,
  -- Formato: { "main": true, "connection": true }
  
  -- Dati raw estratti (backup)
  extracted_data JSONB,
  
  -- Allenatore attivo/titolare (UNIQUE per user_id)
  is_active BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Constraint: Un solo allenatore attivo per utente

```sql
CREATE UNIQUE INDEX coaches_user_id_is_active_unique 
ON coaches(user_id) 
WHERE is_active = true;
```

**Nota:** Questo garantisce che solo un allenatore per utente possa avere `is_active = true`. L'endpoint `set-active-coach` disattiva automaticamente tutti gli altri allenatori prima di attivare quello selezionato.

#### Indici per Performance

```sql
CREATE INDEX idx_coaches_user_id ON coaches(user_id);
CREATE INDEX idx_coaches_is_active ON coaches(user_id, is_active) WHERE is_active = true;
```

#### RLS Policies

Tutte le operazioni (SELECT, INSERT, UPDATE, DELETE) sono permesse solo per gli allenatori dell'utente autenticato:

```sql
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id)
```

---

## API Endpoints

### 1. `/api/extract-coach` (POST)

**File:** `app/api/extract-coach/route.js`

**Descrizione:** Estrae dati allenatore da screenshot usando OpenAI GPT-4 Vision.

**Autenticazione:** Nessuna (endpoint pubblico, ma è consigliato aggiungere rate limiting).

**Request Body:**
```json
{
  "imageDataUrl": "data:image/jpeg;base64,..." // o base64 puro
}
```

**Response Success (200):**
```json
{
  "coach": {
    "coach_name": "Fabio Capello",
    "age": 77,
    "nationality": "Italia",
    "team": "AC Milan",
    "category": "Campionato italiano",
    "pack_type": "Manager Pack Fabio Capello 91-92",
    "playing_style_competence": {
      "possesso_palla": 46,
      "contropiede_veloce": 57,
      "contrattacco": 89,
      "vie_laterali": 64,
      "passaggio_lungo": 89
    },
    "training_affinity_description": "Giocatori veterani+: +200% punti esperienza",
    "stat_boosters": [
      {"stat_name": "Finalizzazione", "bonus": 1},
      {"stat_name": "Comportamento difensivo", "bonus": 1}
    ],
    "connection": {
      "name": "Passaggio sopra la testa A",
      "description": "Descrizione completa",
      "focal_point": {
        "playing_style": "Tra le linee",
        "position": "MED"
      },
      "key_man": {
        "playing_style": "Opportunista",
        "position": "P"
      }
    }
  }
}
```

**Response Error (400/500):**
```json
{
  "error": "OpenAI API error: ..."
}
```

**Normalizzazione:**
- `age`: Convertito a `INTEGER` (troncato)
- `playing_style_competence`: Ogni valore convertito a `INTEGER`
- `stat_boosters`: Limitato a max 10 elementi, `bonus` convertito a `INTEGER`

**Stili di Gioco Supportati:**
1. `possesso_palla` (Possesso palla / Ball Possession)
2. `contropiede_veloce` (Contropiede veloce / Quick Counter)
3. `contrattacco` (Contrattacco / Counter Attack)
4. `vie_laterali` (Vie laterali / Wide)
5. `passaggio_lungo` (Passaggio lungo / Long Ball)

---

### 2. `/api/supabase/save-coach` (POST)

**File:** `app/api/supabase/save-coach/route.js`

**Descrizione:** Salva nuovo allenatore nel database.

**Autenticazione:** Bearer token (header `Authorization: Bearer <token>`).

**Request Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "coach": {
    "coach_name": "Fabio Capello",
    "age": 77,
    "nationality": "Italia",
    "team": "AC Milan",
    "category": "Campionato italiano",
    "pack_type": "Manager Pack Fabio Capello 91-92",
    "playing_style_competence": {...},
    "training_affinity_description": "...",
    "stat_boosters": [...],
    "connection": {...},
    "photo_slots": {"main": true, "connection": true}
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "coach_id": "uuid-here",
  "is_new": true
}
```

**Response Error (400/401/500):**
```json
{
  "error": "Coach data is required" // o altro messaggio
}
```

**Validazione:**
- `coach_name`: Obbligatorio (non può essere null/undefined)
- `user_id`: Estratto dal token JWT
- `is_active`: Default `false` (l'utente può impostare un allenatore come attivo dopo)

**Normalizzazione:**
- Stringhe: `toText()` → `null` se vuoto
- Numeri: `toInt()` → `null` se non valido
- JSONB: Validato e normalizzato

---

### 3. `/api/supabase/set-active-coach` (POST)

**File:** `app/api/supabase/set-active-coach/route.js`

**Descrizione:** Imposta un allenatore come "attivo" (titolare). Disattiva automaticamente tutti gli altri allenatori dell'utente.

**Autenticazione:** Bearer token (header `Authorization: Bearer <token>`).

**Request Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "coach_id": "uuid-here"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "coach_id": "uuid-here"
}
```

**Response Error (400/401/404/500):**
```json
{
  "error": "Coach not found or access denied"
}
```

**Logica:**
1. Verifica che l'allenatore appartenga all'utente (controllo sicurezza)
2. Disattiva tutti gli altri allenatori dell'utente: `UPDATE coaches SET is_active = false WHERE user_id = ? AND id != ?`
3. Attiva l'allenatore selezionato: `UPDATE coaches SET is_active = true WHERE id = ? AND user_id = ?`

**Nota:** L'operazione è atomica (due UPDATE sequenziali), ma il constraint `coaches_user_id_is_active_unique` garantisce l'integrità.

---

## Frontend - Pagina Allenatori

**File:** `app/allenatori/page.jsx`

### Componente Principale

```jsx
export default function AllenatoriPage()
```

### State Management

```jsx
const [coaches, setCoaches] = React.useState([])          // Lista tutti gli allenatori
const [activeCoach, setActiveCoach] = React.useState(null) // Allenatore attivo (derivato)
const [loading, setLoading] = React.useState(true)
const [error, setError] = React.useState(null)
const [showUploadModal, setShowUploadModal] = React.useState(false)
const [uploadImages, setUploadImages] = React.useState([]) // Max 2 foto: [{id, file, dataUrl, type: 'main'|'connection'}, ...]
const [uploading, setUploading] = React.useState(false)
const [selectedCoach, setSelectedCoach] = React.useState(null)
const [showDetailsModal, setShowDetailsModal] = React.useState(false)
```

### Caricamento Allenatori

**Funzione:** `fetchCoaches()` (in `useEffect`)

**Query Supabase:**
```jsx
const { data: coachesData } = await supabase
  .from('coaches')
  .select('*')
  .order('is_active', { ascending: false })  // Attivo prima
  .order('created_at', { ascending: false }) // Più recenti prima
```

**Derivazione Allenatore Attivo:**
```jsx
const active = coachesData.find(c => c.is_active)
setActiveCoach(active || null)
```

### Upload Allenatore

**Funzione:** `handleUploadCoach()`

**Flusso:**
1. Verifica sessione valida
2. Per ogni immagine in `uploadImages` (max 2):
   - Chiama `/api/extract-coach` con `imageDataUrl`
   - Accumula dati estratti
3. **Merge Intelligente:**
   - Prima immagine (`type: 'main'`): Dati base
   - Seconda immagine (`type: 'connection'`): Merge dati, priorità a `connection` dalla seconda foto
   - Competenze: Merge (mantiene valori più alti se duplicati)
   - Booster: Concatenazione array
4. Verifica che almeno `coach_name` sia presente
5. Aggiunge `photo_slots`: `{ main: true, connection: true }` (se presenti)
6. Chiama `/api/supabase/save-coach` con dati finali
7. Ricarica pagina: `window.location.reload()`

**Gestione Errori:**
- OpenAI quota esaurita: Messaggio specifico `t('openAQuotaError')`
- Estrazione fallita: `t('coachExtractError')`
- Salvataggio fallito: `t('coachSaveError')`

### Gestione Immagini

**Funzione:** `handleImageSelect(files)`

**Validazione:**
- Max 2 foto totali
- Solo file immagine (`f.type.startsWith('image/')`)
- Prima foto → `type: 'main'`
- Seconda foto → `type: 'connection'`

**Drag & Drop:**
- `handleDrop(e)`: Gestisce drop file
- `handleDragOver(e)`: Previene comportamento default
- Preview immediata delle immagini caricate

**Rimozione Immagine:**
- `removeImage(id)`: Rimuove singola immagine da `uploadImages`

### Impostare Allenatore Attivo

**Funzione:** `handleSetActive(coachId)`

**Flusso:**
1. Verifica sessione valida
2. Chiama `/api/supabase/set-active-coach` con `coach_id`
3. Ricarica pagina: `window.location.reload()`

### Eliminare Allenatore

**Funzione:** `handleDelete(coachId)`

**Flusso:**
1. Conferma utente: `confirm(t('confirmDeleteCoach'))`
2. Delete diretto via Supabase client:
   ```jsx
   await supabase
     .from('coaches')
     .delete()
     .eq('id', coachId)
   ```
3. Ricarica pagina: `window.location.reload()`

**Nota:** Non usa endpoint API, usa direttamente Supabase client (più semplice per DELETE).

### Visualizzazione Dettagli

**Funzione:** `showCoachDetails(coach)`

**Modal mostra:**
- Informazioni base (nome, età, nazionalità, team, categoria, tipo)
- Competenza Stili di Gioco (tutti i valori)
- Affinità di Allenamento (descrizione)
- Stat Boosters (lista)
- Collegamento (se presente): nome, descrizione, focal_point, key_man
- Bottone "Imposta come Titolare" (se non attivo)

**Traduzione Stili di Gioco:**
```jsx
{t(style) || style.replace(/_/g, ' ')}
```
Usa chiave traduzione se disponibile, altrimenti sostituisce `_` con spazi.

### UI Components

**Lista Allenatori:**
- Grid responsive: `gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'`
- Card per ogni allenatore
- Badge stella (`<Star>`) se `is_active === true`
- Mostra primi 2 stili di gioco nella card
- Bottoni: Dettagli, Imposta Titolare (se non attivo), Elimina

**Card Allenatore Attivo (se presente):**
- Mostrata in fondo alla lista
- Stile evidenziato (bordo blu)
- Info sintetiche allenatore attivo

---

## Frontend - Integrazione Gestione Formazione

**File:** `app/gestione-formazione/page.jsx`

### Caricamento Allenatore Attivo

**In `useEffect` (righe 127-136):**

```jsx
// 4. Carica allenatore attivo
const { data: coachData, error: coachError } = await supabase
  .from('coaches')
  .select('*')
  .eq('is_active', true)
  .maybeSingle()

if (!coachError && coachData) {
  setActiveCoach(coachData)
}
```

**State:**
```jsx
const [activeCoach, setActiveCoach] = React.useState(null)
```

### Visualizzazione Card Allenatore Attivo

**Posizione:** Prima del campo 2D (righe 750-792)

**Struttura:**
```jsx
{activeCoach && (
  <div className="card" style={{...}}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
      <Star size={20} fill="var(--neon-blue)" />
      <div>
        <div style={{ fontSize: '14px', opacity: 0.8 }}>
          {t('coachActiveTitle')}  {/* "Allenatore Titolare" / "Active Coach" */}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>
          {activeCoach.coach_name}
        </div>
        {activeCoach.team && (
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            {activeCoach.team}
          </div>
        )}
      </div>
    </div>
    {/* Primi 3 stili di gioco */}
    {activeCoach.playing_style_competence && (
      <div style={{ fontSize: '12px', opacity: 0.7 }}>
        {Object.entries(activeCoach.playing_style_competence)
          .filter(([_, value]) => value != null)
          .slice(0, 3)
          .map(([style, value]) => (
            <span key={style}>
              {t(style) || style.replace(/_/g, ' ')}: <strong>{value}</strong>
            </span>
          ))}
      </div>
    )}
  </div>
)}
```

**Link a Pagina Allenatori:**
- Bottone "Allenatori" nella card (se presente)
- Naviga a `/allenatori`

---

## Flusso Completo Upload

### 1. Selezione Immagini

Utente seleziona 1-2 screenshot nell'area drag & drop:
- Prima foto → `type: 'main'` (dati principali)
- Seconda foto → `type: 'connection'` (collegamento opzionale)

**Validazione Frontend:**
- Max 2 foto
- Solo immagini
- Preview immediata

### 2. Estrazione Dati (per ogni immagine)

**Frontend → `/api/extract-coach`**

```jsx
for (const img of uploadImages) {
  const extractRes = await fetch('/api/extract-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl: img.dataUrl })
  })
  const extractData = await extractRes.json()
  // ...
}
```

**Backend → OpenAI GPT-4 Vision**

- Prompt dettagliato per estrazione dati
- Model: `gpt-4o`
- `response_format: { type: 'json_object' }`
- Normalizzazione dati (int, string, array)

### 3. Merge Dati (se 2 foto)

**Logica Merge:**

```jsx
if (!coachData) {
  // Prima immagine
  coachData = extractData.coach
  photoSlots.main = true
} else {
  // Seconda immagine - Merge
  coachData = {
    ...coachData,
    ...extractData.coach,
    // Priorità connection dalla seconda foto
    connection: extractData.coach.connection || coachData.connection,
    // Merge competenze (mantiene valori più alti)
    playing_style_competence: {
      ...coachData.playing_style_competence,
      ...extractData.coach.playing_style_competence
    },
    // Merge booster (concatenazione)
    stat_boosters: [
      ...(coachData.stat_boosters || []),
      ...(extractData.coach.stat_boosters || [])
    ]
  }
  photoSlots.connection = true
}
```

### 4. Salvataggio Database

**Frontend → `/api/supabase/save-coach`**

```jsx
const finalCoachData = {
  ...coachData,
  photo_slots: photoSlots  // { main: true, connection: true }
}

const saveRes = await fetch('/api/supabase/save-coach', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ coach: finalCoachData })
})
```

**Backend:**
- Valida token JWT
- Estrae `user_id` dal token
- Normalizza dati (toInt, toText)
- Inserisce in `coaches` con `is_active = false` (default)
- Ritorna `coach_id`

### 5. Aggiornamento UI

- Ricarica pagina: `window.location.reload()`
- Nuovo allenatore appare nella lista
- Se è il primo allenatore, può essere impostato come attivo

---

## Traduzioni

**File:** `lib/i18n.js`

### Chiavi Principali

#### Generali
- `coaches`: "Allenatori" / "Coaches"
- `coachesTitle`: "Allenatori" / "Coaches"
- `coachActiveTitle`: "Allenatore Titolare" / "Active Coach"
- `viewCoachDetails`: "Dettagli Allenatore" / "Coach Details"

#### Upload
- `uploadCoach`: "Carica Allenatore" / "Upload Coach"
- `uploadCoachInstructions`: "Carica 2 screenshot: il primo con dati principali e competenze, il secondo con il collegamento (opzionale)." / "Upload 2 screenshots: first with main data and competences, second with connection (optional)."
- `dragDropPhotos`: "Trascina qui le foto o clicca per selezionare" / "Drag photos here or click to select"
- `maxTwoPhotos`: "Massimo 2 foto consentite" / "Maximum 2 photos allowed"
- `maxTwoPhotosFormat`: "Massimo 2 foto • Formati: JPG, PNG" / "Maximum 2 photos • Formats: JPG, PNG"
- `mainPhoto`: "Foto principale" / "Main photo"
- `connectionPhoto`: "Collegamento" / "Connection"
- `addPhoto`: "Aggiungi foto" / "Add photo"

#### Azioni
- `setAsTitular`: "Imposta come Titolare" / "Set as Titular"
- `deleteCoach`: "Elimina Allenatore" / "Delete Coach"
- `confirmDeleteCoach`: "Sei sicuro di voler eliminare questo allenatore?" / "Are you sure you want to delete this coach?"

#### Informazioni
- `informations`: "Informazioni" / "Information"
- `playingStyleCompetence`: "Competenza Stili di Gioco" / "Playing Style Competence"
- `trainingAffinity`: "Affinità di Allenamento" / "Training Affinity"
- `statBoosters`: "Booster Statistiche" / "Stat Boosters"
- `connection`: "Collegamento" / "Connection"
- `focalPoint`: "Punto focale" / "Focal Point"
- `keyMan`: "Uomo chiave" / "Key Man"

#### Stili di Gioco (chiavi traduzione)
- `possesso_palla`: "Possesso palla" / "Ball Possession"
- `contropiede_veloce`: "Contropiede veloce" / "Quick Counter"
- `contrattacco`: "Contrattacco" / "Counter Attack"
- `vie_laterali`: "Vie laterali" / "Wide"
- `passaggio_lungo`: "Passaggio lungo" / "Long Ball"

**Uso in codice:**
```jsx
{t(style) || style.replace(/_/g, ' ')}
```
Cerca prima la chiave traduzione (es. `t('possesso_palla')`), altrimenti usa il nome chiave con spazi.

#### Errori
- `coachLoadError`: "Errore caricamento allenatori" / "Error loading coaches"
- `coachExtractError`: "Errore: dati allenatore non estratti. Verifica le immagini e riprova." / "Error: coach data not extracted. Check images and try again."
- `coachSaveError`: "Errore salvataggio allenatore" / "Error saving coach"
- `coachSetActiveError`: "Errore impostazione allenatore attivo" / "Error setting active coach"
- `coachDeleteError`: "Errore eliminazione allenatore" / "Error deleting coach"
- `openAQuotaError`: "Quota OpenAI esaurita. Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing" / "OpenAI quota exhausted. Check your plan and billing details at https://platform.openai.com/account/billing"

---

## Note Tecniche

### Photo Slots Tracking

Il campo `photo_slots` (JSONB) traccia quali foto sono state caricate:
```json
{
  "main": true,        // Prima foto (dati principali)
  "connection": true   // Seconda foto (collegamento) - opzionale
}
```

**Uso futuro:** Permette di verificare quali dati sono disponibili e suggerire all'utente di caricare foto mancanti.

### Merge Strategia

Quando vengono caricate 2 foto:
1. **Dati base**: Prima foto ha priorità, seconda sovrascrive se presenti
2. **Connection**: Seconda foto ha priorità (è dove di solito compare)
3. **Competenze**: Merge (valori più alti se duplicati)
4. **Booster**: Concatenazione array

### Performance

- **Indici DB:** Query per `user_id` e `is_active` sono ottimizzate
- **RLS:** Policy efficaci, nessun overhead significativo
- **Frontend:** Caricamento paginato potrebbe essere aggiunto in futuro se necessario

### Sicurezza

- **RLS:** Tutte le operazioni limitate al proprio `user_id`
- **Token Validation:** Tutti gli endpoint protetti validano JWT
- **Input Validation:** Normalizzazione dati lato server
- **Rate Limiting:** Da implementare per `/api/extract-coach` (endpoint pubblico)

---

## Flussi Utente

### Scenario 1: Primo Allenatore

1. Utente va su `/allenatori`
2. Nessun allenatore presente → Messaggio "Nessun allenatore caricato"
3. Clicca "Carica Primo Allenatore"
4. Seleziona 1-2 screenshot
5. Upload → Estrazione → Salvataggio
6. Allenatore salvato con `is_active = false`
7. Utente può cliccare "Imposta come Titolare" per attivarlo

### Scenario 2: Allenatore Attivo già Presente

1. Utente va su `/gestione-formazione`
2. Card "Allenatore Titolare" mostra allenatore attivo
3. Mostra nome, team, primi 3 stili di gioco
4. Link a `/allenatori` per gestire

### Scenario 3: Cambio Allenatore Attivo

1. Utente va su `/allenatori`
2. Vede lista di tutti gli allenatori
3. Clicca "Imposta come Titolare" su un allenatore non attivo
4. Backend disattiva l'allenatore attivo precedente
5. Attiva nuovo allenatore
6. Pagina ricarica, nuovo allenatore ha badge stella
7. In `/gestione-formazione`, card si aggiorna automaticamente

---

## Conclusioni

Il sistema di gestione allenatori è completo, sicuro e scalabile. Supporta:
- ✅ Multi-foto con merge intelligente
- ✅ Gestione multi-allenatore
- ✅ Allenatore attivo unico per utente
- ✅ Integrazione con formazione
- ✅ Traduzione completa IT/EN
- ✅ RLS e validazione token
- ✅ UI responsive e UX intuitiva

**Prossimi miglioramenti possibili:**
- Rate limiting su `/api/extract-coach`
- Validazione formato immagini lato server
- Caching risultati estrazione (per evitare re-analisi stessa foto)
- Paginazione lista allenatori (se > 20)
