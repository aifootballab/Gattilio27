# Documentazione Enterprise - Gattilio27

**Versione**: 2.0.0  
**Ultimo Aggiornamento**: Gennaio 2025  
**Stato**: Production Ready

---

## 📋 Indice

1. [Panoramica Sistema](#panoramica-sistema)
2. [Architettura](#architettura)
3. [Struttura Database](#struttura-database)
4. [Autenticazione e Sicurezza](#autenticazione-e-sicurezza)
5. [API Endpoints](#api-endpoints)
6. [Flussi Dati](#flussi-dati)
7. [Configurazione e Deployment](#configurazione-e-deployment)
8. [Struttura Progetto](#struttura-progetto)
9. [Best Practices](#best-practices)

---

## Panoramica Sistema

### Obiettivo
**Gattilio27** è un'applicazione web per la gestione della rosa squadra di eFootball, che consente agli utenti di:
- Estrarre dati giocatore da screenshot del gioco utilizzando AI Vision
- Salvare e gestire i propri giocatori in una rosa personalizzata
- Visualizzare statistiche complete e completeness dei dati

### Stack Tecnologico

| Componente | Tecnologia | Versione |
|------------|-----------|----------|
| **Frontend Framework** | Next.js | 14+ (App Router) |
| **Backend** | Next.js API Routes | Server-side |
| **Database** | Supabase (PostgreSQL) | Latest |
| **Autenticazione** | Supabase Email Auth | Senza verifica email |
| **AI Vision** | OpenAI GPT-4o Vision API | Latest |
| **Deployment** | Vercel | Platform |
| **Linguaggio** | JavaScript/JSX | ES6+ |

---

## Architettura

### Pattern Architetturale
- **Frontend**: Client-side rendering con React hooks
- **Backend**: API Routes serverless (Vercel Functions)
- **Database**: PostgreSQL con Row Level Security (RLS)
- **Autenticazione**: Token-based (JWT) con Supabase Auth

### Flusso Principale

```
1. Upload Screenshot → /rosa
   ↓
2. Smart Batch Processing → /api/extract-batch
   ↓
3. Salvataggio → /api/supabase/save-player
   ↓
4. Visualizzazione → /my-players → /player/[id]
```

### Smart Batch Processing

**Caratteristiche**:
- Raggruppamento automatico di 1-6 screenshot per giocatore
- Fingerprint matching (nome, OVR, posizione)
- Processing sequenziale interno (una immagine alla volta)
- Merge progressivo intelligente per sezioni
- Calcolo completeness automatico (0-100%)

**Sezioni Merge**:
- **Identity**: Nome, OVR, posizione, dati fisici
- **Stats**: Statistiche attacking/defending/athleticism
- **Skills**: Array skills, com_skills, ai_playstyles
- **Boosters**: Array boosters disponibili

---

## Struttura Database

### Schema Principale

#### `players_base`
**Scopo**: Dati base giocatore (condivisi tra utenti)

**Campi Chiave**:
- `id` (UUID, PK)
- `player_name` (TEXT, NOT NULL)
- `overall_rating` (INTEGER)
- `position` (TEXT)
- `card_type` (TEXT)
- `team` (TEXT)
- `height`, `weight`, `age`, `nationality` (INTEGER/TEXT)

**Campi JSONB**:
- `base_stats` (JSONB) - Statistiche dettagliate (attacking, defending, athleticism)
- `skills` (TEXT[]) - Abilità giocatore
- `com_skills` (TEXT[]) - Abilità complementari
- `available_boosters` (JSONB[]) - Boosters disponibili
- `metadata` (JSONB) - Dati aggiuntivi (weak_foot, form, injury_resistance, ai_playstyles)
- `position_ratings` (JSONB) - Competenze per posizione

**RLS**: Lettura pubblica, scrittura via service role

---

#### `player_builds`
**Scopo**: Build specifica per utente (livello, booster attivo)

**Campi Chiave**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users.id`)
- `player_base_id` (UUID, FK → `players_base.id`)
- `current_level` (INTEGER)
- `level_cap` (INTEGER)
- `active_booster_id` (UUID, nullable)
- `development_points` (JSONB, NOT NULL, default: `{}`)
- `source` (TEXT, default: `'manual'`)
- `source_data` (JSONB) - Backup dati originali

**RLS**: Accesso solo ai propri build (`auth.uid() = user_id`)

---

#### `user_rosa`
**Scopo**: Rosa squadra utente (21 slot)

**Campi Chiave**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users.id`)
- `name` (TEXT)
- `is_main` (BOOLEAN, default: `false`)
- `player_build_ids` (UUID[21]) - Array 21 slot (0-20)
- `manager_id` (UUID, nullable)
- `team_playing_style_id` (UUID, nullable)
- `base_strength`, `overall_strength` (INTEGER)
- `synergy_bonus`, `position_competency_bonus` (NUMERIC)

**RLS**: Accesso solo alla propria rosa

---

#### `screenshot_processing_log`
**Scopo**: Log elaborazioni screenshot

**Campi Chiave**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users.id`)
- `image_url` (TEXT)
- `processing_status` (TEXT) - `'pending'`, `'processing'`, `'completed'`, `'error'`
- `extracted_data` (JSONB)
- `matched_player_id` (UUID, nullable)
- `error_message` (TEXT, nullable)
- `processing_started_at`, `processing_completed_at` (TIMESTAMPTZ)

---

## Autenticazione e Sicurezza

### Flusso Autenticazione

#### Client-side (Browser)
```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Sessione
const { data } = await supabase.auth.getSession()
const token = data?.session?.access_token
```

#### Server-side (API Route)
```javascript
import { validateToken, extractBearerToken } from '@/lib/authHelper'

const token = extractBearerToken(req)
const { userData, error } = await validateToken(token, supabaseUrl, anonKey)
const userId = userData.user.id
```

### Chiavi Supabase

#### Anon Key (Client-side)
- **Variabile**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Formati Supportati**:
  - Legacy JWT (`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
  - Modern Publishable (`sb_publishable_...`)

#### Service Role Key (Server-side)
- **Variabile**: `SUPABASE_SERVICE_ROLE_KEY`
- **Formato**: Legacy JWT (non `sb_secret_`)
- **Uso**: Bypass RLS per operazioni server-side

### Row Level Security (RLS)

**Strategia**:
- `players_base`: Lettura pubblica, scrittura via service role
- `player_builds`: Accesso solo ai propri build (`auth.uid() = user_id`)
- `user_rosa`: Accesso solo alla propria rosa
- `screenshot_processing_log`: Accesso solo ai propri log

**Performance**: Policies usano `auth.uid()` direttamente (ottimizzare con `(select auth.uid())` se necessario)

---

## API Endpoints

### 1. `POST /api/extract-batch`
**Smart Batch Processing** - Estrazione da 1-6 screenshot

**Request**:
```json
{
  "images": [
    {
      "id": "uuid",
      "imageDataUrl": "data:image/jpeg;base64,..."
    }
  ]
}
```

**Response**:
```json
{
  "groups": [
    {
      "group_id": "uuid",
      "label": "Ronaldinho Gaúcho",
      "player": { ... },
      "completeness": {
        "percentage": 75,
        "missingSections": ["boosters"]
      },
      "image_ids": ["uuid-1", "uuid-2"]
    }
  ]
}
```

---

### 2. `POST /api/supabase/save-player`
**Salvataggio giocatore** in database

**Headers**:
```
Authorization: Bearer <supabase_access_token>
```

**Request**:
```json
{
  "player": {
    "player_name": "Ronaldinho Gaúcho",
    "overall_rating": 99,
    "base_stats": { ... },
    "skills": [...],
    "available_boosters": [...]
  },
  "slotIndex": 0  // Opzionale
}
```

**Response**:
```json
{
  "success": true,
  "player_base_id": "uuid",
  "player_build_id": "uuid",
  "rosa_id": "uuid",
  "slot": 0,
  "is_new_build": true
}
```

**Logica**:
1. Valida token (helper centralizzato)
2. Upsert `players_base` (cerca esistente per nome)
3. Insert/Update `player_builds` (user-specific)
4. Update `user_rosa` (primo slot disponibile o mantiene esistente)
5. Log in `screenshot_processing_log`

---

### 3. `GET /api/supabase/get-my-players`
**Recupero giocatori** salvati dall'utente

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
      "base_stats": { ... },
      "skills": [...],
      "completeness": {
        "percentage": 85,
        "missing": ["height", "weight"]
      }
    }
  ]
}
```

**Logica**:
1. Valida token
2. Query `player_builds` (filtra per `user_id`)
3. Query separata `players_base` (merge in JS, evita RLS JOIN issues)
4. Calcolo completeness
5. Return array ordinato

---

### 4. `POST /api/supabase/reset-my-data`
**Reset completo** dati utente

**Headers**:
```
Authorization: Bearer <supabase_access_token>
```

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

## Flussi Dati

### Estrazione → Database

```
Screenshot Upload (/rosa)
  ↓
Compressione Client-side
  ↓
POST /api/extract-batch (Smart Batch)
  ↓
OpenAI Vision API (fingerprint + full extraction)
  ↓
Raggruppamento + Merge Progressivo
  ↓
Return Array Players (completeness indicator)
  ↓
POST /api/supabase/save-player
  ↓
Validazione Token
  ↓
Upsert players_base
  ↓
Insert/Update player_builds
  ↓
Update user_rosa (slot)
  ↓
Insert screenshot_processing_log
  ↓
Success Response
```

### Recupero → Visualizzazione

```
GET /api/supabase/get-my-players
  ↓
Validazione Token
  ↓
Query player_builds (user_id)
  ↓
Query players_base (separata, merge JS)
  ↓
Calcolo Completeness
  ↓
Return Array Players
  ↓
Render /my-players (lista)
  ↓
Click "Scheda Completa" → /player/[id]
  ↓
Filter by build_id
  ↓
Render PlayerDetailView
```

---

## Configurazione e Deployment

### Environment Variables (Vercel)

| Variabile | Tipo | Scope | Descrizione |
|-----------|------|-------|-------------|
| `OPENAI_API_KEY` | Server-only | Production + Preview | Chiave API OpenAI |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | All | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | All | Anon key (JWT o publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Production + Preview | Service role key (JWT legacy) |

**Nota**: Variabili `NEXT_PUBLIC_*` sono esposte al client.

### Setup Locale

```bash
# 1. Clona repository
git clone <repository-url>
cd Gattilio27-master

# 2. Installa dipendenze
npm install

# 3. Crea .env.local
cat > .env.local << EOF
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
EOF

# 4. Avvia sviluppo
npm run dev

# 5. Apri browser
open http://localhost:3000
```

### Deployment Vercel

1. Collega repository GitHub a Vercel
2. Configura Environment Variables (vedi tabella sopra)
3. Deploy automatico su push a `master`

---

## Struttura Progetto

```
Gattilio27-master/
├── app/
│   ├── api/                          # API Routes (server-side)
│   │   ├── extract-batch/            # Smart Batch Processing
│   │   ├── extract-player/           # Estrazione singola
│   │   └── supabase/
│   │       ├── save-player/          # Salvataggio giocatore
│   │       ├── get-my-players/       # Recupero giocatori
│   │       └── reset-my-data/        # Reset dati utente
│   ├── dashboard/                    # Dashboard principale
│   ├── rosa/                         # Upload screenshot
│   ├── my-players/                   # Lista giocatori
│   ├── player/[id]/                  # Dettaglio giocatore
│   └── login/                        # Autenticazione
├── lib/
│   ├── supabaseClient.js             # Client Supabase (anon)
│   ├── authHelper.js                 # Helper autenticazione centralizzato
│   ├── i18n.js                       # Internazionalizzazione (IT/EN)
│   └── normalize.js                  # Normalizzazione dati
├── public/
│   └── backgrounds/                  # Sfondi personalizzati
├── package.json
├── next.config.js
└── vercel.json
```

### File Chiave

#### `lib/authHelper.js`
Helper centralizzato per validazione token:
- `validateToken(token, supabaseUrl, anonKey)` - Valida token (supporta JWT legacy e publishable)
- `extractBearerToken(req)` - Estrae token da header Authorization

#### `lib/normalize.js`
Normalizzazione dati:
- `normalizeStringArray(input)` - Normalizza array stringhe (gestisce string/array/object/null)

#### `app/rosa/page.jsx`
Pagina upload screenshot:
- Drag & drop 1-6 immagini
- Compressione client-side
- Smart Batch processing
- Visualizzazione completeness
- Salvataggio in Supabase

#### `app/my-players/page.jsx`
Lista giocatori salvati:
- Fetch con autenticazione
- Refresh su visibilitychange
- Link a dettaglio giocatore

#### `app/player/[id]/page.jsx`
Dettaglio giocatore:
- Fetch by build_id
- Visualizzazione completa dati
- Edit modal per dati mancanti

---

## Best Practices

### Sicurezza
- ✅ Service role key mai esposta al client
- ✅ Validazione token sempre server-side
- ✅ RLS policies per isolamento dati utente
- ✅ Environment variables protette (server-only)

### Performance
- ✅ Compressione immagini client-side (reduce payload)
- ✅ Query separate per `player_builds` e `players_base` (evita RLS JOIN issues)
- ✅ Merge dati in JavaScript (bypass RLS)
- ✅ Caching token in sessione client

### Manutenibilità
- ✅ Helper centralizzato per autenticazione (`lib/authHelper.js`)
- ✅ Normalizzazione dati robusta (`lib/normalize.js`)
- ✅ Logging dettagliato per debug
- ✅ Gestione errori con messaggi chiari

### Data Quality
- ✅ Smart Batch processing per merge intelligente
- ✅ Completeness calculation automatica
- ✅ Validazione dati prima del salvataggio
- ✅ Backup dati originali in `source_data`

---

## Troubleshooting Rapido

| Problema | Soluzione |
|----------|-----------|
| **401 Unauthorized** | Verificare token valido, controllare `validateToken()` |
| **Service role key invalid** | Usare JWT legacy (non `sb_secret_`) |
| **RLS blocking operations** | Usare service role key per operazioni server-side |
| **Players not visible** | Verificare query separata `players_base`, controllare `user_id` |
| **Completeness 100% ma dati mancanti** | Verificare logica `calculateCompleteness` (controlla dati reali, non solo esistenza) |

---

## Supporto

- **Documentazione Completa**: `DOCUMENTAZIONE_COMPLETA.md` (dettagli tecnici approfonditi)
- **Documentazione Rapida**: `DOCUMENTAZIONE.md` (guida veloce)
- **README**: `README.md` (quick start)

---

**Versione**: 2.0.0  
**Ultimo Aggiornamento**: Gennaio 2025  
**Stato**: Production Ready ✅