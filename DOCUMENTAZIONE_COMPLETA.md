# Documentazione Completa - Gattilio27

## Indice

1. [Architettura del Sistema](#architettura-del-sistema)
2. [Struttura Database](#struttura-database)
3. [Gestione Autenticazione e Chiavi](#gestione-autenticazione-e-chiavi)
4. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
5. [API Endpoints](#api-endpoints)
6. [Flusso Dati](#flusso-dati)
7. [Configurazione Ambiente](#configurazione-ambiente)
8. [Troubleshooting](#troubleshooting)

---

## Architettura del Sistema

### Stack Tecnologico

- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: Supabase Anonymous Auth
- **AI Vision**: OpenAI GPT-4o Vision API
- **Deployment**: Vercel
- **Linguaggio**: JavaScript/JSX (no TypeScript)

### Struttura Progetto

```
Gattilio27-master/
├── app/
│   ├── api/                    # API Routes (server-side)
│   │   ├── env-check/          # Diagnostica ambiente
│   │   ├── extract-player/     # Estrazione singolo giocatore
│   │   ├── extract-batch/      # Estrazione batch multipli giocatori
│   │   └── supabase/
│   │       ├── save-player/     # Salvataggio giocatore in DB
│   │       ├── get-my-players/ # Recupero giocatori utente
│   │       └── reset-my-data/  # Reset dati utente
│   ├── dashboard/              # Dashboard principale (home)
│   ├── rosa/                   # Gestione rosa (upload screenshot)
│   ├── my-players/             # Lista giocatori salvati
│   └── player/[id]/            # Dettaglio singolo giocatore
├── lib/
│   ├── supabaseClient.js       # Client Supabase (anon)
│   └── i18n.js                 # Sistema internazionalizzazione (IT/EN)
├── public/
│   └── backgrounds/            # Sfondi personalizzati
└── package.json
```

### Flusso Principale

1. **Upload Screenshot** → `/rosa`
   - Drag & drop immagini (1-6 screenshot)
   - Compressione client-side
   - Invio a `/api/extract-batch`

2. **Estrazione Dati** → `/api/extract-batch`
   - Fingerprint extraction (nome, OVR, posizione)
   - Raggruppamento automatico per giocatore
   - Full extraction con merge dati multipli screenshot
   - Ritorno array giocatori estratti

3. **Salvataggio** → `/api/supabase/save-player`
   - Autenticazione anonima Supabase
   - Inserimento in `players_base`, `player_builds`, `user_rosa`
   - Logging in `screenshot_processing_log`

4. **Visualizzazione** → `/my-players` → `/player/[id]`
   - Lista giocatori con completeness indicator
   - Scheda completa con UX screenshot-like

---

## Struttura Database

### Tabelle Principali

#### 1. `players_base`
**Scopo**: Dati base del giocatore (condivisi tra tutti gli utenti)

**Campi Chiave**:
- `id` (UUID, PK)
- `player_name` (TEXT, NOT NULL)
- `position` (TEXT) - Posizione principale
- `card_type` (TEXT) - Tipo carta (Epico, Leggendario, etc.)
- `team` (TEXT) - Squadra
- `overall_rating` (INTEGER) - Rating complessivo
- `height` (INTEGER) - Altezza in cm
- `weight` (INTEGER) - Peso in kg
- `age` (INTEGER)
- `nationality` (TEXT)
- `form` (TEXT) - Condizione (A, B, C, D, E)
- `role` (TEXT) - Ruolo specifico (es: "ESA Ala prolifica")

**Campi JSONB**:
- `base_stats` (JSONB) - Statistiche dettagliate
  ```json
  {
    "overall_rating": 98,
    "attacking": {
      "offensive_awareness": 84,
      "ball_control": 89,
      "dribbling": 90,
      "tight_possession": 86,
      "low_pass": 72,
      "lofted_pass": 72,
      "finishing": 85,
      "heading": 56,
      "place_kicking": 65,
      "curl": 84
    },
    "defending": {
      "defensive_awareness": 49,
      "defensive_engagement": 68,
      "tackling": 50,
      "aggression": 58,
      "goalkeeping": 40,
      "gk_catching": 40,
      "gk_parrying": 40,
      "gk_reflexes": 40,
      "gk_reach": 40
    },
    "athleticism": {
      "speed": 91,
      "acceleration": 92,
      "kicking_power": 82,
      "jump": 65,
      "physical_contact": 65,
      "balance": 89,
      "stamina": 86
    }
  }
  ```
- `skills` (TEXT[]) - Array abilità giocatore
- `com_skills` (TEXT[]) - Array abilità aggiuntive/complementari
- `position_ratings` (JSONB) - Competenze per posizione
  ```json
  {
    "CF": 99,
    "SS": 95,
    "LWF": 90
  }
  ```
- `available_boosters` (JSONB) - Boosters disponibili
  ```json
  [
    {
      "name": "Fantasista",
      "effect": "+2",
      "activation_condition": "..."
    }
  ]
  ```
- `metadata` (JSONB) - Dati aggiuntivi
  ```json
  {
    "weak_foot_frequency": "3",
    "weak_foot_accuracy": "3",
    "form_detailed": "B",
    "injury_resistance": "2",
    "ai_playstyles": ["Creative Playmaker", "False 9"]
  }
  ```
- `source` (TEXT) - Origine dati (`'screenshot_extractor'` o `'user_upload'`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Indici**:
- Primary key su `id`
- Unique su `konami_id` (se presente)
- Index su `player_name` (per ricerca)

---

#### 2. `player_builds`
**Scopo**: Build specifica del giocatore per utente (livello, booster attivo, etc.)

**Campi Chiave**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users.id`)
- `player_base_id` (UUID, FK → `players_base.id`)
- `current_level` (INTEGER)
- `level_cap` (INTEGER)
- `active_booster_id` (UUID, FK → `boosters.id`, nullable)
- `active_booster_name` (TEXT, nullable)
- `final_stats` (JSONB) - Statistiche finali con booster applicati
- `final_overall_rating` (INTEGER)
- `final_position_ratings` (JSONB)
- `development_points` (JSONB, NOT NULL, default: `{}`) - Punti sviluppo allocati
- `source` (TEXT, default: `'manual'`) - `'screenshot_extractor'` per dati estratti
- `source_data` (JSONB) - Dati originali estratti (backup)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Relazioni**:
- `player_builds.user_id` → `auth.users.id`
- `player_builds.player_base_id` → `players_base.id`
- `player_builds.active_booster_id` → `boosters.id`

**Indici**:
- Index su `user_id` (per query utente)
- Index su `player_base_id` (per join con players_base)

---

#### 3. `user_rosa`
**Scopo**: Rosa squadra dell'utente (21 slot)

**Campi Chiave**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users.id`)
- `name` (TEXT) - Nome rosa
- `is_main` (BOOLEAN, default: `false`) - Rosa principale
- `player_build_ids` (UUID[], default: `[]`) - Array 21 slot (UUID di `player_builds.id`)
- `manager_id` (UUID, FK → `managers.id`, nullable)
- `team_playing_style_id` (UUID, FK → `team_playing_styles.id`, nullable)
- `base_strength` (INTEGER, default: 0)
- `overall_strength` (INTEGER, default: 0)
- `synergy_bonus` (NUMERIC, default: 0)
- `position_competency_bonus` (NUMERIC, default: 0)
- `playing_style_bonus` (NUMERIC, default: 0)
- `manager_bonus` (NUMERIC, default: 0)
- `squad_analysis` (JSONB) - Analisi squadra
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Nota**: `player_build_ids` è un array di 21 elementi (indici 0-20), dove ogni elemento è un UUID di `player_builds.id` o `null` se lo slot è vuoto.

**Indici**:
- Index su `user_id`
- Index su `is_main` (per trovare rosa principale)

---

#### 4. `screenshot_processing_log`
**Scopo**: Log di tutte le elaborazioni screenshot

**Campi Chiave**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users.id`)
- `image_url` (TEXT) - URL immagine (o data URL)
- `image_type` (TEXT) - Tipo immagine
- `processing_status` (TEXT, default: `'pending'`) - `'pending'`, `'processing'`, `'completed'`, `'error'`
- `processing_method` (TEXT, default: `'google_vision'`) - `'openai_vision'` per estrazione attuale
- `raw_ocr_data` (JSONB) - Dati OCR grezzi
- `extracted_data` (JSONB) - Dati estratti finali
- `confidence_score` (NUMERIC) - Score confidenza
- `matched_player_id` (UUID, FK → `players_base.id`, nullable)
- `matching_confidence` (NUMERIC)
- `error_message` (TEXT, nullable)
- `error_details` (JSONB, nullable)
- `processing_started_at`, `processing_completed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

**Indici**:
- Index su `user_id`
- Index su `processing_status`
- Index su `matched_player_id`

---

### Tabelle Supporto

#### `boosters`
- Catalogo boosters disponibili
- Relazione con `player_builds.active_booster_id`

#### `playing_styles`
- Stili di gioco giocatore (es: "Creative Playmaker")
- Relazione con `players_base.playing_style_id`

#### `team_playing_styles`
- Stili di gioco squadra
- Relazione con `user_rosa.team_playing_style_id`

#### `managers`
- Manager disponibili
- Relazione con `user_rosa.manager_id`

#### `position_competency`
- Competenze posizione per giocatore
- Relazione con `players_base.id`

---

## Gestione Autenticazione e Chiavi

### Tipi di Chiavi Supabase

#### 1. **Anon Key (Client-side)**
**Variabile**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Tipi Supportati**:
- **Legacy JWT** (formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
  - Formato: JWT token con 3 parti separate da `.`
  - Usato per: Autenticazione client-side, validazione token anonimi
  - Compatibilità: Piena con `@supabase/supabase-js`

- **Modern Publishable** (formato: `sb_publishable_...`)
  - Formato: Stringa che inizia con `sb_publishable_`
  - Usato per: Autenticazione client-side (nuovo sistema)
  - Compatibilità: Piena con `@supabase/supabase-js` v2.47.10+
  - **Nota**: I token JWT anonimi generati con publishable key richiedono ancora una legacy JWT key per la validazione server-side

**Uso**:
```javascript
// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Autenticazione Anonima**:
```javascript
// Client-side
const { data, error } = await supabase.auth.signInAnonymously()
const token = data.session.access_token

// Server-side (API route)
const authHeader = req.headers.get('authorization')
const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
```

---

#### 2. **Service Role Key (Server-side)**
**Variabile**: `SUPABASE_SERVICE_ROLE_KEY`

**Tipi Supportati**:
- **Legacy JWT** (formato: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
  - Formato: JWT token con 3 parti separate da `.`
  - Usato per: Operazioni server-side con bypass RLS
  - Compatibilità: Piena con `@supabase/supabase-js`
  - **Dove trovarla**: Supabase Dashboard → Settings → API → `service_role` key (sezione "Project API keys")

- **Modern Secret** (formato: `sb_secret_...`)
  - Formato: Stringa che inizia con `sb_secret_`
  - Usato per: Operazioni server-side (nuovo sistema)
  - Compatibilità: **NON supportata** da `@supabase/supabase-js` (usa `fetch` diretto)
  - **Nota**: Attualmente il progetto usa legacy JWT per compatibilità

**Uso Legacy JWT**:
```javascript
// app/api/supabase/save-player/route.js
import { createClient } from '@supabase/supabase-js'

const admin = createClient(supabaseUrl, serviceKey) // serviceKey = legacy JWT
// Bypassa RLS automaticamente
const { data, error } = await admin.from('players_base').insert(...)
```

**Uso Modern Secret** (non implementato, ma possibile):
```javascript
// Per sb_secret_, usare fetch diretto
const response = await fetch(`${supabaseUrl}/rest/v1/players_base`, {
  method: 'POST',
  headers: {
    'apikey': serviceKey, // sb_secret_...
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(payload)
})
```

**IMPORTANTE**: 
- **NON usare** `sb_publishable_...` come service role key (non ha permessi admin)
- **Usare** legacy JWT `service_role` key per massima compatibilità

---

### Flusso Autenticazione

#### Client-side (Browser)
1. Inizializzazione: `supabase.auth.getSession()`
2. Se non c'è sessione: `supabase.auth.signInAnonymously()`
3. Recupero token: `session.access_token`
4. Invio token in header: `Authorization: Bearer <token>`

#### Server-side (API Route)
1. Ricezione token: `req.headers.get('authorization')`
2. Validazione token:
   ```javascript
   // Prova con legacy JWT key (più affidabile per token anonimi)
   const legacyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Hardcoded legacy
   const legacyAuthClient = createClient(supabaseUrl, legacyAnonKey)
   const { data, error } = await legacyAuthClient.auth.getUser(token)
   
   // Se fallisce e anonKey è JWT, prova con anonKey configurato
   if (error && anonKey?.includes('.')) {
     const authClient = createClient(supabaseUrl, anonKey)
     const result = await authClient.auth.getUser(token)
   }
   ```
3. Estrazione `user_id`: `data.user.id`
4. Operazioni DB con service role key (bypass RLS):
   ```javascript
   const admin = createClient(supabaseUrl, serviceKey)
   await admin.from('players_base').insert({ ...data, metadata: { user_id } })
   ```

---

### Configurazione Vercel

**Variabili Ambiente Richieste**:

| Variabile | Tipo | Scope | Descrizione |
|-----------|------|-------|-------------|
| `OPENAI_API_KEY` | Server-only | Production + Preview | Chiave API OpenAI per Vision |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | All | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | All | Anon key (JWT legacy o publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Production + Preview | Service role key (JWT legacy) |

**Nota**: 
- Le variabili `NEXT_PUBLIC_*` sono esposte al client (browser)
- Le variabili senza `NEXT_PUBLIC_` sono server-only (sicure)

---

## Row Level Security (RLS) Policies

### Strategia RLS

**Principio**: Ogni utente può vedere/modificare solo i propri dati, tranne:
- `players_base`: Lettura pubblica (tutti possono vedere i giocatori)
- Tabelle catalogo (`boosters`, `playing_styles`, etc.): Lettura pubblica

### Policies Implementate

#### 1. `players_base`
**RLS**: Enabled

**Policies**:
- **"Players base are viewable by everyone"** (SELECT, permissive)
  ```sql
  USING (true)
  ```
  - Tutti possono leggere (anon + authenticated)

- **"Dev: Allow all access"** (ALL, permissive) ⚠️
  ```sql
  USING (true)
  WITH CHECK (true)
  ```
  - **ATTENZIONE**: Policy permissiva per sviluppo (bypass completo)
  - **Raccomandazione**: Rimuovere in produzione o limitare a specifici user_id

**Uso**: 
- Lettura: Tutti gli utenti
- Scrittura: Solo via service role key (server-side)

---

#### 2. `player_builds`
**RLS**: Enabled

**Policies**:
- **"Users can view own builds"** (SELECT, permissive)
  ```sql
  USING (auth.uid() = user_id)
  ```
  - Utente vede solo i propri build

- **"Users can insert own builds"** (INSERT, permissive)
  ```sql
  WITH CHECK (auth.uid() = user_id)
  ```
  - Utente può inserire solo con il proprio `user_id`

- **"Users can update own builds"** (UPDATE, permissive)
  ```sql
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id)
  ```
  - Utente può aggiornare solo i propri build

- **"Users can delete own builds"** (DELETE, permissive)
  ```sql
  USING (auth.uid() = user_id)
  ```
  - Utente può eliminare solo i propri build

- **"Dev: Allow access for dev UUID"** (ALL, permissive) ⚠️
  ```sql
  USING (auth.uid() = 'DEV_UUID_HERE')
  ```
  - Policy di sviluppo per specifico user_id

**Uso**: 
- Client-side: Operazioni limitate ai propri dati
- Server-side: Service role key bypassa RLS

---

#### 3. `user_rosa`
**RLS**: Enabled

**Policies**:
- **"Users can view own rosa"** (SELECT, permissive)
  ```sql
  USING (auth.uid() = user_id)
  ```
- **"Users can insert own rosa"** (INSERT, permissive)
  ```sql
  WITH CHECK (auth.uid() = user_id)
  ```
- **"Users can update own rosa"** (UPDATE, permissive)
  ```sql
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id)
  ```
- **"Users can delete own rosa"** (DELETE, permissive)
  ```sql
  USING (auth.uid() = user_id)
  ```
- **"Dev: Allow access for dev UUID"** (ALL, permissive) ⚠️

**Uso**: Ogni utente gestisce solo la propria rosa.

---

#### 4. `screenshot_processing_log`
**RLS**: Enabled

**Policies**:
- **"Users can view own screenshots"** (SELECT, permissive)
  ```sql
  USING (auth.uid() = user_id)
  ```
- **"Users can insert own screenshots"** (INSERT, permissive)
  ```sql
  WITH CHECK (auth.uid() = user_id)
  ```
- **"Dev: Allow access for dev UUID"** (ALL, permissive) ⚠️

**Uso**: Log separati per utente.

---

### Note RLS Performance

**Problema Rilevato**: Alcune policies usano `auth.uid()` direttamente, causando re-evaluazione per ogni riga.

**Soluzione Consigliata**:
```sql
-- ❌ Lento (re-evaluato per riga)
USING (auth.uid() = user_id)

-- ✅ Veloce (evaluato una volta)
USING ((select auth.uid()) = user_id)
```

**Tabelle con Performance Warning**:
- `player_builds` (tutte le policies)
- `user_rosa` (tutte le policies)
- `screenshot_processing_log` (SELECT, INSERT)
- `unified_match_contexts` (tutte le policies)
- E altre...

**Raccomandazione**: Aggiornare policies con `(select auth.uid())` per migliorare performance su grandi dataset.

---

## API Endpoints

### 1. `GET /api/env-check`
**Scopo**: Diagnostica ambiente (non espone chiavi)

**Response**:
```json
{
  "ok": true,
  "hasOpenaiKey": true,
  "hasSupabaseUrl": true,
  "hasSupabaseAnonKey": true,
  "hasSupabaseServiceRoleKey": true,
  "vercelEnv": "production",
  "supabaseAnonKeyKind": "publishable",
  "supabaseServiceRoleKeyKind": "jwt"
}
```

---

### 2. `POST /api/extract-player`
**Scopo**: Estrazione dati da singolo screenshot

**Request**:
```json
{
  "imageDataUrl": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "player": {
    "player_name": "Ronaldinho Gaúcho",
    "overall_rating": 99,
    "position": "ESA",
    "base_stats": { ... },
    "skills": [...],
    "com_skills": [...],
    "available_boosters": [...],
    "metadata": { ... }
  }
}
```

**Error Response**:
```json
{
  "error": "OpenAI error: ...",
  "openai_status": 400,
  "openai_body": { ... }
}
```

---

### 3. `POST /api/extract-batch`
**Scopo**: Estrazione batch da 1-6 screenshot con raggruppamento automatico

**Request**:
```json
{
  "images": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,..."
  ]
}
```

**Response**:
```json
{
  "players": [
    {
      "player_name": "Ronaldinho Gaúcho",
      "overall_rating": 99,
      "missing_screens": ["stats", "skills"],
      "notes": "Mancano screenshot stats e skills"
    }
  ]
}
```

**Logica**:
1. **Fingerprint extraction**: Per ogni immagine, estrae nome, OVR, posizione, tipo schermata
2. **Raggruppamento**: Raggruppa immagini per `player_name` (con fallback per nomi non riconosciuti)
3. **Full extraction**: Per ogni gruppo, estrae dati completi e merge informazioni da più screenshot
4. **Validazione**: Identifica screenshot mancanti e aggiunge note

---

### 4. `POST /api/supabase/save-player`
**Scopo**: Salvataggio giocatore estratto in Supabase

**Headers**:
```
Authorization: Bearer <supabase_access_token>
```

**Request**:
```json
{
  "hasPlayer": true,
  "playerName": "Ronaldinho Gaúcho",
  "slotIndex": 0
}
```

**Logica**:
1. **Validazione token**: Verifica token anonimo con legacy JWT key
2. **Estrazione user_id**: `data.user.id`
3. **Upsert `players_base`**:
   - Cerca esistente per `player_name` + `source = 'screenshot_extractor'`
   - Se non esiste, inserisce nuovo
   - Tag con `source: 'screenshot_extractor'` e `metadata.user_id`
4. **Insert `player_builds`**:
   - Crea build per `user_id` + `player_base_id`
   - Salva dati estratti in `source_data`
   - Imposta `development_points: {}` (NOT NULL constraint)
5. **Update `user_rosa`**:
   - Trova o crea rosa principale (`is_main = true`)
   - Aggiorna `player_build_ids[slotIndex]` con nuovo `build_id`
   - Se slot occupato, sposta giocatore esistente in riserva
6. **Logging**: Inserisce log in `screenshot_processing_log`

**Response**:
```json
{
  "success": true,
  "player_base_id": "uuid",
  "build_id": "uuid",
  "rosa_id": "uuid"
}
```

**Error Response**:
```json
{
  "error": "Invalid auth",
  "details": "..."
}
```

---

### 5. `GET /api/supabase/get-my-players`
**Scopo**: Recupero tutti i giocatori salvati dall'utente

**Headers**:
```
Authorization: Bearer <supabase_access_token>
```

**Response**:
```json
{
  "players": [
    {
      "build_id": "uuid",
      "player_base_id": "uuid",
      "player_name": "Ronaldinho Gaúcho",
      "overall_rating": 99,
      "position": "ESA",
      "base_stats": { ... },
      "skills": [...],
      "com_skills": [...],
      "available_boosters": [...],
      "metadata": { ... },
      "completeness": {
        "percentage": 85,
        "missing": ["height", "weight"]
      }
    }
  ]
}
```

**Logica**:
1. **Validazione token**: Stesso sistema di `save-player`
2. **Query `player_builds`**: Filtra per `user_id`
3. **Join `players_base`**: Recupera dati base
4. **Calcolo completeness**: Verifica campi obbligatori/importanti
5. **Ritorno array**: Ordina per `created_at` DESC

---

### 6. `POST /api/supabase/reset-my-data`
**Scopo**: Reset completo dati utente

**Headers**:
```
Authorization: Bearer <supabase_access_token>
```

**Logica**:
1. **Validazione token**: Stesso sistema di `save-player`
2. **Delete `user_rosa`**: Elimina tutte le rose dell'utente
3. **Delete `player_builds`**: Elimina tutti i build dell'utente
4. **Delete `screenshot_processing_log`**: Elimina tutti i log dell'utente
5. **Delete `players_base`**: Elimina solo quelli con `source = 'screenshot_extractor'` e `metadata.user_id = user_id`

**Response**:
```json
{
  "success": true,
  "deleted": {
    "user_rosa": 1,
    "player_builds": 10,
    "screenshot_processing_log": 20,
    "players_base": 5
  }
}
```

---

## Flusso Dati

### Estrazione Screenshot → Database

```
1. Screenshot Upload (Client)
   ↓
2. Compressione Client-side (reduce payload)
   ↓
3. POST /api/extract-batch
   ↓
4. OpenAI Vision API (fingerprint + full extraction)
   ↓
5. Normalizzazione Dati (normalizePlayer)
   ↓
6. Return Array Players (Client)
   ↓
7. User seleziona slot e clicca "Salva"
   ↓
8. POST /api/supabase/save-player
   ↓
9. Validazione Token (legacy JWT)
   ↓
10. Upsert players_base
    ↓
11. Insert player_builds
    ↓
12. Update user_rosa (player_build_ids[slot])
    ↓
13. Insert screenshot_processing_log
    ↓
14. Success Response
```

### Recupero Dati → Visualizzazione

```
1. GET /api/supabase/get-my-players
   ↓
2. Validazione Token
   ↓
3. Query player_builds (user_id)
   ↓
4. Join players_base
   ↓
5. Calcolo Completeness
   ↓
6. Return Array Players
   ↓
7. Render /my-players (lista)
   ↓
8. Click "Scheda Completa"
   ↓
9. Navigate /player/[id]
   ↓
10. Filter by build_id
    ↓
11. Render PlayerDetailView (UX screenshot-like)
```

---

## Configurazione Ambiente

### Vercel Environment Variables

**Production + Preview**:
```
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_... (o JWT legacy)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (JWT legacy)
```

**Verifica**:
- Endpoint `/api/env-check` mostra stato variabili
- Log Vercel mostrano errori se mancanti

---

### Supabase Configuration

**Dashboard → Settings → API**:
- **Project URL**: `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key**: `SUPABASE_SERVICE_ROLE_KEY` (sezione "Project API keys")

**RLS Policies**:
- Abilitate su tutte le tabelle user-specific
- `players_base`: Lettura pubblica, scrittura via service role

**Auth Settings**:
- **Anonymous Sign-ins**: Abilitato (per autenticazione anonima)

---

## Troubleshooting

### 1. "Invalid auth" / "401 Unauthorized"

**Causa**: Token non valido o scaduto

**Soluzione**:
- Verificare che client faccia `signInAnonymously()` se sessione mancante
- Verificare che server usi legacy JWT key per validazione token
- Controllare log Vercel per dettagli errore

**Debug**:
```javascript
// Client-side
const { data } = await supabase.auth.getSession()
console.log('Token:', data?.session?.access_token?.substring(0, 20))

// Server-side (log)
console.log('[save-player] Token validated:', userId)
```

---

### 2. "Invalid API key" (Service Role)

**Causa**: Service role key non valida o tipo errato

**Soluzione**:
- Verificare che `SUPABASE_SERVICE_ROLE_KEY` sia JWT legacy (non `sb_secret_` o `sb_publishable_`)
- Recuperare key da Supabase Dashboard → Settings → API → "Project API keys" → `service_role`
- Aggiornare variabile in Vercel e redeploy

**Verifica Tipo**:
```javascript
const serviceKeyKind = serviceKey?.startsWith('sb_secret_') ? 'sb_secret' : 
                      serviceKey?.startsWith('sb_publishable_') ? 'sb_publishable' : 
                      serviceKey?.includes('.') && serviceKey.split('.').length >= 3 ? 'jwt' : 'unknown'
console.log('Service key kind:', serviceKeyKind)
```

---

### 3. "OPENAI_API_KEY mancante"

**Causa**: Variabile non configurata in Vercel

**Soluzione**:
- Aggiungere `OPENAI_API_KEY` in Vercel → Project → Settings → Environment Variables
- Selezionare "Production" e "Preview"
- Redeploy

**Verifica**:
```bash
curl https://your-app.vercel.app/api/env-check
# Dovrebbe mostrare: "hasOpenaiKey": true
```

---

### 4. Dati Mancanti nell'Estrazione

**Causa**: Screenshot non contiene tutte le informazioni

**Soluzione**:
- Caricare 3 screenshot per giocatore (profilo, stats, skills)
- Verificare che screenshot siano chiari e leggibili
- Controllare `missing_screens` nella response di `extract-batch`

**Best Practice**:
- Screenshot 1: Profilo base (nome, OVR, posizione, altezza, peso, età)
- Screenshot 2: Statistiche (attacking, defending, athleticism)
- Screenshot 3: Skills e boosters

---

### 5. "player_builds.development_points is NOT NULL"

**Causa**: Campo `development_points` è NOT NULL ma non viene fornito

**Soluzione**:
- Assicurarsi che `save-player` inserisca sempre `development_points: {}`
- Verificare codice:
  ```javascript
  const buildPayload = {
    ...,
    development_points: {}, // Sempre presente
  }
  ```

---

### 6. RLS Blocking Operations

**Causa**: Policy RLS troppo restrittive o token non valido

**Soluzione**:
- Verificare che operazioni server-side usino service role key (bypass RLS)
- Verificare che operazioni client-side abbiano token valido
- Controllare policies in Supabase Dashboard → Authentication → Policies

**Debug**:
```sql
-- Verificare policies attive
SELECT * FROM pg_policies WHERE tablename = 'player_builds';
```

---

## Note Finali

### Best Practices

1. **Sicurezza**:
   - Non esporre mai service role key al client
   - Usare sempre validazione token server-side
   - Limitare policies RLS permissive in produzione

2. **Performance**:
   - Aggiornare policies RLS con `(select auth.uid())`
   - Aggiungere indici su foreign keys se necessario
   - Usare compressione immagini client-side

3. **Manutenibilità**:
   - Logging dettagliato in `screenshot_processing_log`
   - Error handling con messaggi chiari
   - Documentazione aggiornata

### Prossimi Passi

1. **Ottimizzazione RLS**: Aggiornare policies con `(select auth.uid())`
2. **Supporto Modern Keys**: Implementare supporto `sb_secret_` con fetch diretto
3. **Miglioramento Estrazione**: Aggiungere validazione dati estratti
4. **UI Enhancement**: Completare editing dati mancanti in scheda giocatore

---

**Ultimo Aggiornamento**: Gennaio 2025
**Versione**: 1.0.0
