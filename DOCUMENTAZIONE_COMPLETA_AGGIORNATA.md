# 📚 DOCUMENTAZIONE COMPLETA - eFootball AI Coach

**Versione**: 2.0  
**Data Aggiornamento**: 2026-01-19  
**Status**: ✅ Production Ready

---

## 🎯 PANORAMICA PROGETTO

**eFootball AI Coach** è un'applicazione web per il coaching di eFootball che utilizza l'AI per estrarre dati da screenshot e gestire la rosa giocatori in modo interattivo.

### Funzionalità Principali

1. **Dashboard**: Panoramica generale della squadra con statistiche e navigazione rapida
2. **Gestione Formazione 2D**: Campo interattivo con card giocatori cliccabili
3. **Upload Formazione**: Estrazione disposizione tattica da screenshot completo
4. **Upload Giocatori**: Estrazione dati da card giocatori (fino a 3 immagini per giocatore)
5. **Gestione Riserve**: Upload e gestione giocatori riserva
6. **Profilazione Giocatori**: Completamento profilo con foto aggiuntive
7. **Internazionalizzazione**: Supporto IT/EN

---

## 🛠️ STACK TECNOLOGICO

### Frontend
- **Next.js**: `^14.0.4` (App Router)
- **React**: `^18.2.0`
- **React DOM**: `^18.2.0`
- **Lucide React**: `^0.344.0` (Icone)

### Backend
- **Next.js API Routes**: Server-side endpoints
- **Node.js**: `>=18.0.0`

### Database & Auth
- **Supabase**: PostgreSQL + Auth
  - `@supabase/supabase-js`: `^2.47.10`
  - Row Level Security (RLS) abilitato
  - Query dirette frontend per READ operations
  - Service Role Key per API routes (WRITE operations)

### AI
- **OpenAI GPT-4 Vision**: Estrazione dati da screenshot
  - Formazione completa (11 giocatori)
  - Card giocatori singoli
  - Statistiche e abilità

### Deploy
- **Vercel**: Deploy automatico via GitHub
- **TypeScript**: `^5.3.3` (configurazione)

---

## 📁 STRUTTURA PROGETTO

```
Gattilio27-master/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── extract-formation/    # Estrazione formazione da screenshot
│   │   │   └── route.js
│   │   ├── extract-player/       # Estrazione dati giocatore da screenshot
│   │   │   └── route.js
│   │   └── supabase/             # Operazioni database
│   │       ├── assign-player-to-slot/  # Assegna giocatore a slot
│   │       │   └── route.js
│   │       ├── save-formation-layout/  # Salva layout formazione
│   │       │   └── route.js
│   │       ├── save-player/            # Salva/aggiorna giocatore
│   │       │   └── route.js
│   │       └── swap-formation/          # Swap formazione (futuro)
│   │           └── route.js
│   │
│   ├── gestione-formazione/      # ⭐ Pagina principale (2D field)
│   │   └── page.jsx              # Campo interattivo + modals
│   │
│   ├── giocatore/                # Dettaglio giocatore
│   │   └── [id]/
│   │       └── page.jsx          # Profilazione completa
│   │
│   ├── login/                    # Autenticazione
│   │   └── page.jsx
│   │
│   ├── page.jsx                  # Dashboard principale
│   │
│   ├── lista-giocatori/          # Redirect → gestione-formazione
│   │   └── page.jsx
│   │
│   ├── upload/                   # Redirect → gestione-formazione
│   │   └── page.jsx
│   │
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Stili globali
│   └── not-found.tsx             # 404 page
│
├── lib/                          # Utilities
│   ├── supabaseClient.js        # Client Supabase (frontend)
│   ├── authHelper.js             # Helper autenticazione (API)
│   ├── i18n.js                   # Internazionalizzazione (IT/EN)
│   └── normalize.js               # Normalizzazione dati
│
├── migrations/                   # SQL migrations
│   └── fix_slot_index_and_rls.sql
│
├── public/                       # Assets statici
│   └── backgrounds/
│       └── sfondo.png
│
├── package.json                  # Dependencies
├── next.config.js                # Next.js config
├── tsconfig.json                 # TypeScript config
├── vercel.json                   # Vercel config
└── .env.local                    # Environment variables (locale)
```

---

## 🗄️ SCHEMA DATABASE (Supabase)

### Tabella: `players`

**Descrizione**: Giocatori della rosa utente

**Colonne Principali**:
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `player_name` (text)
- `position` (text, nullable)
- `overall_rating` (integer, nullable)
- `base_stats` (jsonb, default: `{}`)
- `skills` (text[], default: `[]`)
- `com_skills` (text[], default: `[]`)
- `boosters` (jsonb, nullable)
- `slot_index` (integer, nullable, CHECK: `0-10` o `NULL`)
  - `0-10`: Titolare (slot sul campo)
  - `NULL`: Riserva
- `photo_slots` (jsonb, default: `{}`)
  - `{ card: "...", stats: "...", skills: "..." }`
- `metadata` (jsonb, default: `{}`)
  - `{ player_face_description: "...", ... }`
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**RLS**: ✅ Abilitato (utente vede solo i propri giocatori)

**Indici**:
- `user_id` (FK)
- `slot_index` (per query titolari/riserve)

---

### Tabella: `formation_layout`

**Descrizione**: Layout formazione tattica (uno per utente)

**Colonne**:
- `id` (uuid, PK)
- `user_id` (uuid, UNIQUE, FK → auth.users)
- `formation` (text) - Es: "4-3-3", "4-4-2"
- `slot_positions` (jsonb, default: `{}`)
  - `{ "0": { x: 10, y: 90 }, "1": { x: 20, y: 80 }, ... }`
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**RLS**: ✅ Abilitato

**Note**: Un utente può avere solo un layout formazione (UNIQUE constraint)

---

### Tabella: `playing_styles`

**Descrizione**: Stili di gioco disponibili (catalogo)

**Colonne**:
- `id` (uuid, PK)
- `name` (text, UNIQUE)
- `compatible_positions` (text[])
- `description` (text, nullable)
- `category` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**RLS**: ✅ Abilitato (lettura pubblica)

**Relazione**: `players.playing_style_id` → `playing_styles.id` (FK)

---

## 🔌 ENDPOINT API

### 1. `POST /api/extract-formation`

**Descrizione**: Estrae disposizione tattica e posizioni da screenshot formazione completa

**Request**:
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

**Response**:
```json
{
  "formation": "4-3-3",
  "slot_positions": {
    "0": { "x": 10, "y": 90 },
    "1": { "x": 20, "y": 80 },
    ...
  }
}
```

**Costo**: ~$0.01-0.05 (OpenAI Vision)

**Chiamato da**: `handleUploadFormation()` in `gestione-formazione/page.jsx`

---

### 2. `POST /api/extract-player`

**Descrizione**: Estrae dati giocatore da screenshot card

**Request**:
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

**Response**:
```json
{
  "player": {
    "player_name": "Ronaldinho",
    "position": "AMF",
    "overall_rating": 95,
    "base_stats": { ... },
    "skills": [...],
    "com_skills": [...],
    "boosters": { ... },
    "metadata": {
      "player_face_description": "..."
    }
  }
}
```

**Costo**: ~$0.01-0.03 (OpenAI Vision)

**Chiamato da**:
- `handleUploadReserve()` - Upload riserva
- `handleUploadPlayerToSlot()` - Upload giocatore con 3 immagini (loop)
- `handleUploadAndUpdate()` in `giocatore/[id]/page.jsx` - Completamento profilo

---

### 3. `POST /api/supabase/save-formation-layout`

**Descrizione**: Salva layout formazione (disposizione tattica)

**Auth**: ✅ Bearer token (required)

**Request**:
```json
{
  "formation": "4-3-3",
  "slot_positions": {
    "0": { "x": 10, "y": 90 },
    ...
  }
}
```

**Response**:
```json
{
  "success": true,
  "layout": { ... }
}
```

**Logica**:
- Se layout esiste → UPDATE
- Se layout non esiste → INSERT
- Se slot_index cambia → Imposta `slot_index = NULL` per giocatori rimossi

**Chiamato da**: `handleUploadFormation()` in `gestione-formazione/page.jsx`

---

### 4. `POST /api/supabase/save-player`

**Descrizione**: Salva/aggiorna giocatore

**Auth**: ✅ Bearer token (required)

**Request**:
```json
{
  "player": {
    "player_name": "Ronaldinho",
    "position": "AMF",
    "overall_rating": 95,
    "slot_index": 5,  // Opzionale: 0-10 per titolare, null per riserva
    "base_stats": { ... },
    "skills": [...],
    "photo_slots": {
      "card": "data:image/...",
      "stats": "data:image/...",
      "skills": "data:image/..."
    },
    ...
  }
}
```

**Response**:
```json
{
  "success": true,
  "player": { ... }
}
```

**Logica**:
- Normalizza dati (integers, text, jsonb)
- Se `slot_index` fornito → Assegna giocatore a slot
- Se giocatore esiste (match: nome + squadra + ruolo) → UPDATE
- Altrimenti → INSERT

**Chiamato da**:
- `handleUploadReserve()` - Salva riserva
- `handleUploadPlayerToSlot()` - Salva titolare con 3 immagini
- `performUpdate()` in `giocatore/[id]/page.jsx` - Aggiorna profilo

---

### 5. `PATCH /api/supabase/assign-player-to-slot`

**Descrizione**: Assegna giocatore esistente a slot

**Auth**: ✅ Bearer token (required)

**Request**:
```json
{
  "slot_index": 5,
  "player_id": "uuid-here"
}
```

**Response**:
```json
{
  "success": true,
  "player": { ... }
}
```

**Logica**:
- Se slot già occupato → Rimuove giocatore precedente (`slot_index = NULL`)
- Assegna nuovo giocatore a slot
- Aggiorna `updated_at`

**Chiamato da**: `handleAssignFromReserve()` in `gestione-formazione/page.jsx`

---

## 🔄 FLUSSI PRINCIPALI

### Flusso 1: Carica Formazione

```
1. Cliente clicca "Carica Formazione"
   → setShowUploadFormationModal(true)

2. Seleziona screenshot formazione
   → handleUploadFormation(imageDataUrl)

3. POST /api/extract-formation
   → OpenAI analizza screenshot
   → Estrae: formation, slot_positions (x, y per slot 0-10)

4. POST /api/supabase/save-formation-layout
   → Salva layout in DB
   → Se slot_index cambia → Imposta NULL per giocatori rimossi

5. Ricarica pagina
   → Mostra campo 2D con slot posizionati
```

**Costo**: ~$0.01-0.05 (OpenAI)

---

### Flusso 2: Upload Giocatore a Slot Vuoto

```
1. Cliente clicca slot vuoto sul campo 2D
   → handleSlotClick(slotIndex)
   → setSelectedSlot({ slot_index, ...position })
   → setShowAssignModal(true)

2. Cliente clicca "Carica Foto Giocatore"
   → handleUploadPhoto()
   → setShowAssignModal(false)
   → setShowUploadPlayerModal(true)

3. Cliente carica 3 immagini (card, stats, skills)
   → uploadImages aggiornato

4. Cliente clicca "Carica Giocatore"
   → handleUploadPlayerToSlot()

5. Loop su uploadImages:
   → POST /api/extract-player (per ogni immagine)
   → Merge dati estratti

6. POST /api/supabase/save-player
   → Salva giocatore con slot_index assegnato

7. Ricarica pagina
   → Mostra giocatore sul campo
```

**Costo**: ~$0.03-0.09 (3 chiamate OpenAI)

---

### Flusso 3: Assegna Riserva a Slot

```
1. Cliente clicca slot vuoto
   → setShowAssignModal(true)

2. Cliente clicca riserva dalla lista
   → handleAssignFromReserve(playerId)

3. PATCH /api/supabase/assign-player-to-slot
   → Se slot occupato → Rimuove giocatore precedente
   → Assegna riserva a slot

4. Ricarica dati
   → Mostra giocatore sul campo
```

**Costo**: $0 (no OpenAI)

---

### Flusso 4: Carica Riserva

```
1. Cliente clicca "+ Carica Riserva"
   → setShowUploadReserveModal(true)

2. Seleziona screenshot card giocatore
   → handleUploadReserve(imageDataUrl)

3. POST /api/extract-player
   → OpenAI analizza screenshot
   → Estrae dati giocatore

4. POST /api/supabase/save-player
   → Salva giocatore con slot_index = NULL (riserva)

5. Ricarica pagina
   → Mostra riserva nella lista
```

**Costo**: ~$0.01-0.03 (OpenAI)

---

### Flusso 5: Completamento Profilo Giocatore

```
1. Cliente clicca card giocatore sul campo
   → setShowAssignModal(true)

2. Cliente clicca "Completa Profilo"
   → router.push(`/giocatore/${playerId}`)

3. Cliente carica foto aggiuntive (stats, skills)
   → handleUploadAndUpdate(imageDataUrl, type)

4. POST /api/extract-player
   → OpenAI analizza screenshot
   → Estrae dati aggiuntivi

5. Validazione matching (nome + squadra + ruolo)
   → Se match → UPDATE
   → Se no match → Modal conferma

6. POST /api/supabase/save-player
   → Aggiorna giocatore con dati aggiuntivi

7. Ricarica pagina
   → Mostra profilo aggiornato
```

**Costo**: ~$0.01-0.03 per foto aggiuntiva (OpenAI)

---

## ⚙️ CONFIGURAZIONE

### Environment Variables

#### Vercel Production

**OpenAI**:
```env
OPENAI_API_KEY=sk-...
```
- Server-only (non esposto al client)
- Usato da `/api/extract-formation` e `/api/extract-player`

**Supabase**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

- `NEXT_PUBLIC_*`: Pubblico (frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only (API routes)

#### Locale (.env.local)

Copia da Vercel o crea nuovo progetto Supabase.

---

### Next.js Config

```javascript
// next.config.js
const nextConfig = {
  reactStrictMode: true,
}
```

---

### Supabase Client

**Frontend** (`lib/supabaseClient.js`):
```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
)
```

**Backend** (API Routes):
- Usa `SUPABASE_SERVICE_ROLE_KEY` per operazioni privilegiate
- Valida token utente con `authHelper.js`

---

## 🏗️ ARCHITETTURA

### Pattern: Query Dirette vs API Routes

**Query Dirette (Frontend)**:
- ✅ Lettura dati (`SELECT`)
- ✅ Usa RLS Supabase (sicuro)
- ✅ Scalabile (no server bottleneck)
- ✅ Gratis (bandwidth Supabase)

**Esempio**:
```javascript
const { data: titolari } = await supabase
  .from('players')
  .select('*')
  .gte('slot_index', 0)
  .lte('slot_index', 10)
```

**API Routes (Backend)**:
- ✅ Operazioni con logica business
- ✅ Chiamate OpenAI (server-only)
- ✅ Validazione e normalizzazione
- ✅ Service Role Key (bypass RLS quando necessario)

**Esempio**:
```javascript
// POST /api/supabase/save-player
// - Valida token
// - Normalizza dati
// - Salva/aggiorna giocatore
```

---

### Gestione Stato (React)

**Stati Principali**:
- `layout` - Layout formazione
- `titolari` - Giocatori titolari (slot_index 0-10)
- `riserve` - Giocatori riserve (slot_index null)
- `selectedSlot` - Slot selezionato sul campo
- `showAssignModal` - Modal assegnazione
- `showUploadPlayerModal` - Modal upload giocatore
- `uploadImages` - Array immagini caricate

**Caricamento Dati**:
- `useEffect` al mount
- Query dirette Supabase
- Ricarica dopo operazioni (WRITE)

---

### Internazionalizzazione (i18n)

**Sistema**: Custom hook `useTranslation()`

**File**: `lib/i18n.js`

**Supporto**: IT (default) / EN

**Uso**:
```javascript
const { t } = useTranslation()
<h1>{t('dashboard')}</h1>
```

**Chiavi Principali**:
- `dashboard.*` - Dashboard
- `formation.*` - Formazione
- `player.*` - Giocatori
- `upload.*` - Upload
- `errors.*` - Errori

---

## 💰 COSTI

### Gratis (Query Dirette Supabase)

- ✅ Refresh pagina
- ✅ Lista giocatori
- ✅ Salvataggio giocatori (bandwidth Supabase)
- ✅ Swap formazione

**Costo**: $0 (incluso Free Plan Supabase)

---

### Costa (OpenAI Vision)

- ⚠️ Carica foto formazione: ~$0.01-0.05
- ⚠️ Carica foto card: ~$0.01-0.03 per foto
- ⚠️ Upload giocatore (3 immagini): ~$0.03-0.09

**Costo**: ~$0.01-0.05 per chiamata OpenAI

---

### Setup Iniziale Cliente

- Foto formazione (1x): ~$0.01-0.05
- Profilazione titolari (11 × 3 foto): ~$0.33-0.99
- Profilazione riserve (12 × 1 foto): ~$0.12-0.36
- **TOTALE**: ~$0.46-1.40

---

## 🚀 DEPLOY

### Vercel

1. **Push su GitHub**: Deploy automatico
2. **Environment Variables**: Configura su Vercel Dashboard
3. **Build**: `npm run build` (automatico)
4. **Domain**: Configura custom domain (opzionale)

### Build Commands

```bash
npm run build  # Build production
npm run start  # Start production server
npm run dev    # Development server
```

---

## 🔒 SICUREZZA

### Row Level Security (RLS)

**Tabelle con RLS**:
- ✅ `players` - Utente vede solo i propri giocatori
- ✅ `formation_layout` - Utente vede solo il proprio layout

**Policy**:
```sql
-- players
CREATE POLICY "Users can view own players"
ON players FOR SELECT
USING (auth.uid() = user_id);

-- formation_layout
CREATE POLICY "Users can view own formation"
ON formation_layout FOR SELECT
USING (auth.uid() = user_id);
```

---

### Autenticazione API Routes

**Validazione Token**:
- `authHelper.js` valida Bearer token
- Verifica sessione Supabase
- Estrae `user_id` per operazioni

**Service Role Key**:
- Server-only (non esposto al client)
- Usato solo in API routes
- Bypass RLS quando necessario (con validazione)

---

## 📝 NOTE IMPORTANTI

### Slot Index

- **0-10**: Titolari (slot sul campo 2D)
- **NULL**: Riserve
- **CHECK constraint**: `slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10)`

### Formazione Layout

- **Un layout per utente**: `user_id` UNIQUE
- **Slot positions**: Coordinate `x, y` in percentuale (0-100)
- **Aggiornamento**: Se layout cambia, giocatori rimossi → `slot_index = NULL`

### Matching Giocatori

**Validazione** (quando si aggiungono dati a giocatore esistente):
- Nome + Squadra + Ruolo devono essere identici
- Se no match → Modal conferma con discrepanze evidenziate

### Responsive Design

- ✅ Mobile-first
- ✅ Campo 2D responsive
- ✅ Modals adattivi
- ✅ Touch-friendly

---

## 🐛 TROUBLESHOOTING

### Errore: "showUpload is not defined"

**Causa**: Stati mancanti per `UploadPlayerModal`

**Fix**: Aggiungere stati:
```javascript
const [showUploadPlayerModal, setShowUploadPlayerModal] = React.useState(false)
const [uploadImages, setUploadImages] = React.useState([])
const [uploadingPlayer, setUploadingPlayer] = React.useState(false)
```

---

### Errore: "Formazione incompleta"

**Causa**: Layout deve avere 11 slot (0-10)

**Fix**: Verificare che `slot_positions` contenga tutti gli slot 0-10

---

### Errore: "Invalid auth"

**Causa**: Token scaduto o mancante

**Fix**: Re-login o refresh sessione

---

## 📚 RISORSE

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OpenAI Vision API**: https://platform.openai.com/docs/guides/vision
- **Vercel Deploy**: https://vercel.com/docs

---

**Status**: ✅ **DOCUMENTAZIONE COMPLETA E AGGIORNATA**
