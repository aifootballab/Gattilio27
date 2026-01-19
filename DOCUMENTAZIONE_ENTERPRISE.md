# 📘 DOCUMENTAZIONE ENTERPRISE - eFootball AI Coach

**Versione**: 1.0.0  
**Data**: 2024  
**Stack**: Next.js 14 | React 18 | Supabase | OpenAI GPT-4o  
**Deploy**: Vercel

---

## 📋 INDICE

1. [Panoramica del Progetto](#panoramica-del-progetto)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Struttura del Progetto](#struttura-del-progetto)
4. [Componenti e Funzionalità](#componenti-e-funzionalità)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Flussi di Dati](#flussi-di-dati)
8. [Sicurezza](#sicurezza)
9. [Internazionalizzazione](#internazionalizzazione)
10. [Deployment e Configurazione](#deployment-e-configurazione)
11. [Costi Operativi](#costi-operativi)

---

## 🎯 PANORAMICA DEL PROGETTO

### Descrizione
**eFootball AI Coach** è un'applicazione web enterprise per la gestione e analisi di formazioni e giocatori di eFootball. Utilizza l'AI (OpenAI GPT-4o) per estrarre automaticamente dati da screenshot di giocatori e formazioni, permettendo agli utenti di:

- Caricare screenshot di formazioni complete (11 giocatori)
- Caricare screenshot di singole card giocatori (riserve)
- Gestire formazioni con scambio tra titolari e riserve
- Visualizzare rosa completa con separazione titolari/riserve
- Supporto bilingue (IT/EN)

### Tecnologie Principali
- **Frontend**: Next.js 14 (App Router), React 18, CSS-in-JS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase (PostgreSQL) con Row Level Security (RLS)
- **AI**: OpenAI GPT-4o Vision API
- **Autenticazione**: Supabase Auth
- **Deploy**: Vercel
- **UI**: Lucide React Icons, Design System custom (Neon Theme)

---

## 🏗️ ARCHITETTURA DEL SISTEMA

### Pattern Architetturale

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Login      │  │   Upload     │  │ Lista/Rosa   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│         ┌─────────────────▼──────────────────┐             │
│         │    Supabase Client (anonKey)        │             │
│         │    - Query dirette (READ)           │             │
│         │    - RLS filtra per user_id         │             │
│         └─────────────────┬──────────────────┘             │
└───────────────────────────┼───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│                    NEXT.JS SERVER                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │           API Routes (Serverless)                 │    │
│  │  ┌──────────────┐  ┌──────────────┐            │    │
│  │  │ Extract AI   │  │  Save/Swap   │            │    │
│  │  │ (OpenAI)     │  │  (Supabase)  │            │    │
│  │  └──────┬───────┘  └──────┬───────┘            │    │
│  └─────────┼─────────────────┼──────────────────────┘    │
│            │                 │                            │
│  ┌─────────▼─────────┐  ┌───▼──────────────────┐        │
│  │  OpenAI GPT-4o    │  │  Supabase Admin      │        │
│  │  Vision API       │  │  (serviceKey)        │        │
│  └───────────────────┘  └─────────────────────┘        │
└───────────────────────────────────────────────────────────┘
                             │
┌─────────────────────────────▼─────────────────────────────┐
│                    SUPABASE DATABASE                      │
│  ┌──────────────────────────────────────────────────┐    │
│  │  PostgreSQL + RLS                                │    │
│  │  - players (user_id, slot_index, ...)           │    │
│  │  - auth.users                                    │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

### Principi Architetturali

1. **Separazione Lettura/Scrittura**:
   - **READ**: Query dirette frontend → Supabase (anonKey + RLS)
   - **WRITE**: API Routes → Supabase Admin (serviceKey)

2. **Sicurezza**:
   - RLS (Row Level Security) su tutte le tabelle
   - Token JWT per autenticazione API
   - Service Key solo server-side

3. **Scalabilità**:
   - Serverless functions (Vercel)
   - Query ottimizzate con indici
   - Caching lato client

---

## 📁 STRUTTURA DEL PROGETTO

```
Gattilio27-master/
│
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── extract-formation/    # Estrazione formazione (11 giocatori)
│   │   │   └── route.js
│   │   ├── extract-player/       # Estrazione singolo giocatore
│   │   │   └── route.js
│   │   └── supabase/            # Operazioni database
│   │       ├── save-player/     # Salvataggio giocatore
│   │       │   └── route.js
│   │       └── swap-formation/  # Scambio slot_index
│   │           └── route.js
│   │
│   ├── login/                    # Pagina autenticazione
│   │   └── page.jsx
│   ├── upload/                   # Upload screenshot
│   │   └── page.jsx
│   ├── lista-giocatori/         # Lista rosa (titolari + riserve)
│   │   └── page.jsx
│   ├── gestione-formazione/     # Gestione scambi formazione
│   │   └── page.jsx
│   ├── page.jsx                  # Home (redirect a /login)
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Stili globali
│   └── not-found.tsx             # 404 page
│
├── lib/                          # Utilities e Helpers
│   ├── supabaseClient.js        # Client Supabase (frontend)
│   ├── authHelper.js            # Helper autenticazione (API)
│   ├── i18n.js                  # Internazionalizzazione (IT/EN)
│   └── normalize.js             # Normalizzazione dati
│
├── public/                       # Asset statici
│   └── backgrounds/             # Immagini di sfondo
│
├── package.json                 # Dependencies
├── next.config.js               # Next.js config
├── tsconfig.json                # TypeScript config
├── vercel.json                  # Vercel deploy config
└── README.md                     # Documentazione base
```

---

## 🧩 COMPONENTI E FUNZIONALITÀ

### 1. **Autenticazione** (`app/login/page.jsx`)

**Funzionalità**:
- Login con email/password
- Registrazione nuovi utenti
- Switch lingua (IT/EN)
- Gestione sessioni con Supabase Auth
- Redirect automatico a `/upload` dopo login

**Flusso**:
1. Utente inserisce email/password
2. Chiamata `supabase.auth.signInWithPassword()` o `signUp()`
3. Supabase gestisce JWT e refresh token
4. Redirect a `/upload`

**Sicurezza**:
- Validazione email/password lato client
- Token JWT gestiti da Supabase
- Auto-refresh token abilitato

---

### 2. **Upload Screenshot** (`app/upload/page.jsx`)

**Funzionalità**:
- **Tipo 1: Formazione** (1 immagine)
  - Carica screenshot formazione completa
  - Estrae 11 giocatori con `slot_index` (0-10)
  - Salva tutti come titolari
  
- **Tipo 2: Card Giocatori** (1-3 immagini)
  - Carica screenshot di singole card
  - Estrae dati per ogni giocatore
  - Salva come riserve (`slot_index: null`)

**Flusso Formazione**:
```
1. Utente seleziona "Upload Formazione"
2. Carica 1 screenshot
3. Frontend → POST /api/extract-formation
4. API → OpenAI GPT-4o Vision
5. OpenAI → JSON con 11 giocatori + slot_index
6. Per ogni giocatore → POST /api/supabase/save-player
7. Success → Redirect a /lista-giocatori
```

**Flusso Card**:
```
1. Utente seleziona "Upload Card"
2. Carica 1-3 screenshot
3. Per ogni immagine:
   - Frontend → POST /api/extract-player
   - API → OpenAI GPT-4o Vision
   - OpenAI → JSON con dati giocatore
   - Frontend → POST /api/supabase/save-player (slot_index: null)
4. Success → Mostra messaggio
```

**Validazioni**:
- Formazione: max 1 immagine
- Card: max 3 immagini
- Formati supportati: JPG, PNG
- Verifica sessione prima di ogni operazione

---

### 3. **Lista Giocatori** (`app/lista-giocatori/page.jsx`)

**Funzionalità**:
- Visualizza rosa completa
- Separazione **Titolari** (slot_index 0-10) e **Riserve** (slot_index null)
- Ordinamento:
  - Titolari: per `slot_index` (0-10)
  - Riserve: alfabetico per nome
- Navigazione a gestione formazione
- Logout

**Query Database**:
```javascript
// Query diretta con RLS
const { data } = await supabase
  .from('players')
  .select('*')
  .order('created_at', { ascending: false })

// Filtraggio lato client
const titolari = players.filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
const riserve = players.filter(p => p.slot_index === null)
```

**Componenti**:
- `PlayerCard`: Card giocatore (responsive, mobile-friendly)
- Header con contatori (totale, titolari, riserve)
- Pulsante "Gestisci Formazione"

---

### 4. **Gestione Formazione** (`app/gestione-formazione/page.jsx`)

**Funzionalità**:
- Visualizza titolari e riserve in sezioni separate
- **Scambio giocatori**: Click su un giocatore, poi click su un altro per scambiare `slot_index`
- Feedback visivo per selezione
- Refresh automatico dopo swap

**Flusso Scambio**:
```
1. Utente clicca su giocatore A (titolare o riserva)
2. Giocatore A viene evidenziato (selectedPlayer = A.id)
3. Utente clicca su giocatore B
4. Frontend → PATCH /api/supabase/swap-formation
   Body: { playerId1: A.id, playerId2: B.id }
5. API verifica ownership e scambia slot_index
6. Success → Refresh lista
```

**Sicurezza**:
- Verifica che entrambi i giocatori appartengano all'utente
- Swap atomico (Promise.all)
- Validazione `slot_index` (0-10 o null)

---

## 🔌 API ENDPOINTS

### 1. **POST `/api/extract-formation`**

**Scopo**: Estrae 11 giocatori da screenshot formazione completa

**Input**:
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

**Output**:
```json
{
  "formation": "4-2-1-3",
  "players": [
    {
      "player_name": "Nome Giocatore",
      "slot_index": 0,
      "position": "PT",
      "overall_rating": 85,
      "team": "Team Name",
      "nationality": "Country",
      "player_face_description": "Descrizione visiva faccia"
    },
    // ... altri 10 giocatori
  ]
}
```

**Processo**:
1. Valida `imageDataUrl`
2. Chiama OpenAI GPT-4o Vision con prompt specializzato
3. Parse JSON response
4. Normalizza `slot_index` (0-10)
5. Restituisce array giocatori

**Costi**: ~$0.01-0.03 per chiamata (GPT-4o Vision)

---

### 2. **POST `/api/extract-player`**

**Scopo**: Estrae dati da screenshot singola card giocatore

**Input**:
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

**Output**:
```json
{
  "player": {
    "player_name": "Nome",
    "position": "CF",
    "overall_rating": 85,
    "base_stats": {
      "attacking": { "offensive_awareness": 85, ... },
      "defending": { ... },
      "athleticism": { ... }
    },
    "skills": ["Skill 1", "Skill 2"],
    "com_skills": ["Com Skill 1"],
    "boosters": [{ "name": "...", "effect": "..." }],
    // ... altri campi
  }
}
```

**Processo**:
1. Valida `imageDataUrl`
2. Chiama OpenAI GPT-4o Vision
3. Normalizza dati (toInt, array limits)
4. Restituisce oggetto giocatore

**Costi**: ~$0.01-0.02 per chiamata

---

### 3. **POST `/api/supabase/save-player`**

**Scopo**: Salva giocatore nel database

**Autenticazione**: Bearer Token (JWT)

**Input**:
```json
{
  "player": {
    "player_name": "Nome",
    "position": "CF",
    "overall_rating": 85,
    "slot_index": 0,  // 0-10 per titolari, null per riserve
    // ... altri campi
  }
}
```

**Processo**:
1. Estrae Bearer token da header
2. Valida token con `authHelper.validateToken()`
3. Estrae `user_id` da token
4. Normalizza dati (toInt, toText, array limits)
5. Inserisce in `players` con `user_id` e `slot_index`
6. Restituisce ID giocatore salvato

**Sicurezza**:
- Token JWT obbligatorio
- `user_id` estratto da token (non da body)
- Service Key per operazioni admin

---

### 4. **PATCH `/api/supabase/swap-formation`**

**Scopo**: Scambia `slot_index` tra due giocatori

**Autenticazione**: Bearer Token (JWT)

**Input**:
```json
{
  "playerId1": "uuid-1",
  "playerId2": "uuid-2"
}
```

**Processo**:
1. Valida token e estrae `user_id`
2. Verifica che entrambi i giocatori appartengano all'utente
3. Legge `slot_index` attuali
4. Scambia valori (atomico con Promise.all)
5. Restituisce success

**Sicurezza**:
- Verifica ownership prima dello swap
- Swap atomico (no race conditions)

---

## 🗄️ DATABASE SCHEMA

### Tabella `players`

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati base
  player_name TEXT NOT NULL,
  position TEXT,
  overall_rating INTEGER,
  team TEXT,
  card_type TEXT,
  nationality TEXT,
  
  -- Statistiche (JSONB)
  base_stats JSONB,  -- { attacking: {...}, defending: {...}, athleticism: {...} }
  
  -- Array
  skills TEXT[],           -- Max 40
  com_skills TEXT[],       -- Max 20
  ai_playstyles TEXT[],    -- Max 10
  boosters JSONB,          -- Array di oggetti
  
  -- Formazione
  slot_index INTEGER,     -- 0-10 per titolari, NULL per riserve
  
  -- Metadata (JSONB)
  metadata JSONB,         -- { player_face_description, ... }
  photo_slots JSONB,      -- Array di URL foto
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_slot_index ON players(user_id, slot_index) WHERE slot_index IS NOT NULL;
CREATE INDEX idx_players_created_at ON players(user_id, created_at DESC);
```

### Row Level Security (RLS)

```sql
-- Policy: Utenti possono leggere solo i propri giocatori
CREATE POLICY "Users can read own players"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Utenti possono inserire solo con il proprio user_id
CREATE POLICY "Users can insert own players"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Utenti possono aggiornare solo i propri giocatori
CREATE POLICY "Users can update own players"
  ON players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Utenti possono eliminare solo i propri giocatori
CREATE POLICY "Users can delete own players"
  ON players FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 🔄 FLUSSI DI DATI

### Flusso 1: Upload Formazione

```
[Utente] → [Upload Page]
    ↓
[Seleziona "Formazione"] → [Carica 1 screenshot]
    ↓
[POST /api/extract-formation]
    ↓
[OpenAI GPT-4o Vision] → [JSON: 11 giocatori + slot_index]
    ↓
[Per ogni giocatore: POST /api/supabase/save-player]
    ↓
[Supabase Admin] → [INSERT players (user_id, slot_index 0-10)]
    ↓
[Success] → [Redirect /lista-giocatori]
```

### Flusso 2: Upload Card Riserve

```
[Utente] → [Upload Page]
    ↓
[Seleziona "Card"] → [Carica 1-3 screenshot]
    ↓
[Per ogni immagine: POST /api/extract-player]
    ↓
[OpenAI GPT-4o Vision] → [JSON: dati giocatore]
    ↓
[POST /api/supabase/save-player (slot_index: null)]
    ↓
[Supabase Admin] → [INSERT players (user_id, slot_index: null)]
    ↓
[Success] → [Messaggio conferma]
```

### Flusso 3: Visualizzazione Rosa

```
[Utente] → [Lista Giocatori Page]
    ↓
[GET Supabase Client] → [SELECT * FROM players WHERE user_id = auth.uid()]
    ↓
[RLS filtra automaticamente] → [Array giocatori]
    ↓
[Frontend separa: titolari (slot_index 0-10) / riserve (null)]
    ↓
[Render: 2 sezioni separate]
```

### Flusso 4: Scambio Formazione

```
[Utente] → [Gestione Formazione Page]
    ↓
[Click giocatore A] → [selectedPlayer = A.id]
    ↓
[Click giocatore B] → [PATCH /api/supabase/swap-formation]
    ↓
[API verifica ownership] → [Swap slot_index atomico]
    ↓
[Success] → [Refresh lista]
```

---

## 🔒 SICUREZZA

### 1. **Autenticazione**

- **Frontend**: Supabase Auth con JWT
- **API Routes**: Bearer Token validation
- **Refresh Token**: Gestito automaticamente da Supabase

### 2. **Autorizzazione**

- **RLS (Row Level Security)**: Filtraggio automatico per `user_id`
- **API Routes**: Verifica token prima di ogni operazione
- **Service Key**: Solo server-side, mai esposta al client

### 3. **Validazione Dati**

- **Input Validation**: Lato client e server
- **Normalizzazione**: Funzioni `toInt()`, `toText()`, `normalizeStringArray()`
- **SQL Injection**: Prevenuto con query parametrizzate (Supabase)

### 4. **Environment Variables**

```bash
# Client-side (NEXT_PUBLIC_*)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (publishable)

# Server-side (non esposte al client)
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (admin)
```

---

## 🌍 INTERNAZIONALIZZAZIONE

### Sistema i18n (`lib/i18n.js`)

**Lingue supportate**: Italiano (IT) | English (EN)

**Implementazione**:
- Hook `useTranslation()` per componenti React
- Traduzioni in oggetto `translations` (IT/EN)
- Persistenza lingua in `localStorage`
- Fallback a EN se chiave mancante

**Chiavi principali**:
- `login`, `signup`, `uploadScreenshots`
- `titolari`, `riserve`, `swapFormation`
- `extractingFormation`, `savingPlayer`
- `instructions`, `uploadInstructions`
- ... (100+ chiavi)

**Uso**:
```javascript
const { t, lang, changeLanguage } = useTranslation()
return <h1>{t('myPlayers')}</h1>
```

---

## 🚀 DEPLOYMENT E CONFIGURAZIONE

### Vercel Deployment

**Configurazione** (`vercel.json`):
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

**Environment Variables** (Vercel Dashboard):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

**Build**:
```bash
npm run build  # Next.js production build
```

### Setup Locale

```bash
# Install dependencies
npm install

# Setup .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...

# Run dev server
npm run dev
```

### Database Setup (Supabase)

1. Crea tabella `players` (vedi schema sopra)
2. Abilita RLS
3. Crea policies (vedi RLS sopra)
4. Crea indici per performance

---

## 💰 COSTI OPERATIVI

### OpenAI API

- **GPT-4o Vision**:
  - Input: ~$0.005 per 1K tokens
  - Output: ~$0.015 per 1K tokens
  - **Formazione** (1 chiamata, ~2000 tokens): ~$0.01-0.03
  - **Card singola** (1 chiamata, ~1500 tokens): ~$0.01-0.02

**Stima mensile** (100 utenti, 10 formazioni + 50 card ciascuno):
- Formazioni: 1000 × $0.02 = **$20**
- Card: 5000 × $0.015 = **$75**
- **Totale OpenAI**: ~**$95/mese**

### Supabase

- **Free Tier**: 500MB database, 2GB bandwidth
- **Pro Tier** ($25/mese): 8GB database, 50GB bandwidth
- **Stima**: ~**$0-25/mese** (dipende da utilizzo)

### Vercel

- **Hobby** (Free): 100GB bandwidth, serverless functions
- **Pro** ($20/mese): 1TB bandwidth, analytics
- **Stima**: ~**$0-20/mese**

### **Totale Stima**: ~**$95-140/mese** (100 utenti attivi)

---

## 📊 METRICHE E MONITORAGGIO

### Logging

- **Frontend**: `console.log/warn/error` con prefisso `[ComponentName]`
- **API Routes**: Log su Vercel Functions
- **Supabase**: Log dashboard Supabase

### Error Handling

- **Frontend**: Try/catch con messaggi user-friendly
- **API**: NextResponse con status codes appropriati
- **Fallback**: Redirect a `/login` su errori auth

---

## 🔧 MANUTENZIONE

### Aggiornamenti Dipendenze

```bash
npm outdated
npm update
```

### Backup Database

- Supabase automatico (giornaliero)
- Export manuale disponibile da dashboard

### Troubleshooting

1. **Errori Auth**: Verifica token refresh, controlla RLS policies
2. **Errori OpenAI**: Verifica API key, controlla rate limits
3. **Errori Database**: Verifica indici, controlla query performance

---

## 📝 NOTE FINALI

### Best Practices Implementate

✅ Separazione READ/WRITE (query dirette vs API routes)  
✅ RLS per sicurezza dati  
✅ Normalizzazione dati input  
✅ Error handling robusto  
✅ Responsive design (mobile-first)  
✅ Internazionalizzazione completa  
✅ Type safety (TypeScript config)  

### Future Miglioramenti

- [ ] Cache Redis per query frequenti
- [ ] WebSocket per aggiornamenti real-time
- [ ] Export PDF formazioni
- [ ] Analytics dashboard
- [ ] Notifiche push

---

**Documento generato**: 2024  
**Versione**: 1.0.0  
**Mantenuto da**: Team Development
