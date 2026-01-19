# Documentazione Completa - eFootball AI Coach

**Data Aggiornamento**: Gennaio 2025  
**Versione**: 1.0.0

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Stack Tecnologico](#stack-tecnologico)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Pagine e Flussi](#pagine-e-flussi)
7. [Problemi Risolti](#problemi-risolti)
8. [Configurazione](#configurazione)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Panoramica

**eFootball AI Coach** è una web app per la gestione di formazioni e giocatori di eFootball. Utilizza AI (OpenAI GPT-4 Vision) per estrarre dati da screenshot e gestisce la rosa tramite un campo 2D interattivo.

### Funzionalità Principali

- ✅ **Dashboard**: Panoramica squadra con statistiche
- ✅ **Gestione Formazione 2D**: Campo interattivo con slot cliccabili
- ✅ **14 Formazioni Ufficiali eFootball**: Selezione tra tutti i moduli tattici ufficiali
- ✅ **Cambio Formazione Intelligente**: Mantiene giocatori quando si cambia modulo
- ✅ **Upload Formazione**: Estrazione disposizione tattica da screenshot (opzione avanzata)
- ✅ **Upload Giocatori**: Estrazione dati da card (fino a 3 immagini)
- ✅ **Gestione Riserve**: Upload e gestione giocatori riserva
- ✅ **Profilazione Giocatori**: Completamento profilo con foto aggiuntive
- ✅ **Internazionalizzazione**: Supporto IT/EN

---

## 🏗️ Architettura

### Pattern: Query Dirette vs API Routes

**Query Dirette (Frontend)**:
- Lettura dati con Supabase Client
- RLS (Row Level Security) gestisce l'accesso
- Gratis, scalabile, veloce
- Esempio: `supabase.from('players').select('*')`

**API Routes (Backend)**:
- Operazioni con logica business
- Chiamate OpenAI (server-only)
- Validazione token Bearer
- Esempio: `/api/extract-formation`, `/api/supabase/save-player`

### Flusso Dati

```
Frontend (React)
  ↓
Supabase Client (Query Dirette) → Lettura dati
  ↓
API Routes (Next.js) → Operazioni scrittura/estrazione
  ↓
Supabase Admin (Service Role) → Scrittura database
```

---

## 🛠️ Stack Tecnologico

- **Frontend**: Next.js 14 (App Router), React 18
- **Backend**: Next.js API Routes (Node.js)
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: OpenAI GPT-4 Vision (estrazione dati)
- **Deploy**: Vercel
- **Icons**: Lucide React
- **Styling**: CSS-in-JS (inline styles)

---

## 🗄️ Database Schema

### Tabella `players`

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  position TEXT,
  overall_rating INTEGER,
  slot_index INTEGER CHECK (slot_index >= 0 AND slot_index <= 10),
  team TEXT,
  base_stats JSONB,
  skills TEXT[],
  com_skills TEXT[],
  available_boosters JSONB[],
  photo_slots JSONB DEFAULT '{}',
  metadata JSONB,
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own players"
  ON players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own players"
  ON players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own players"
  ON players FOR UPDATE USING (auth.uid() = user_id);
```

**Note Importanti**:
- `slot_index`: 0-10 = titolare, NULL = riserva
- `photo_slots`: `{ card: true, statistiche: true, abilita: true, booster: true }`
- `metadata`: Dati aggiuntivi (source, saved_at, player_face_description, ecc.)

### Tabella `formation_layout`

```sql
CREATE TABLE formation_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  formation TEXT NOT NULL,
  slot_positions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE formation_layout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own layout"
  ON formation_layout FOR SELECT USING (auth.uid() = user_id);
```

**Struttura `slot_positions`**:
```json
{
  "0": { "x": 50, "y": 90, "position": "PT" },
  "1": { "x": 20, "y": 70, "position": "DC" },
  ...
  "10": { "x": 75, "y": 25, "position": "SP" }
}
```

---

## 🔌 API Endpoints

### `POST /api/extract-formation`

**Descrizione**: Estrae formazione e posizioni slot da screenshot completo.

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
    "0": { "x": 50, "y": 90, "position": "PT" },
    ...
  },
  "players": [] // Opzionale, per preview
}
```

**Note**: Usa OpenAI GPT-4 Vision. Estrae solo layout, non salva giocatori.

---

### `POST /api/extract-player`

**Descrizione**: Estrae dati giocatore da screenshot card.

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
    "player_name": "Nome Completo",
    "position": "CF",
    "overall_rating": 85,
    "team": "Team Name",
    "base_stats": { ... },
    "skills": [...],
    "com_skills": [...],
    "boosters": [...],
    ...
  }
}
```

**Note**: Normalizza dati (converte numeri, limita array).

---

### `POST /api/supabase/save-formation-layout`

**Descrizione**: Salva layout formazione.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "formation": "4-3-3",
  "slot_positions": { ... },
  "preserve_slots": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Opzionale: slot da preservare
}
```

**Response**:
```json
{
  "success": true,
  "layout": {
    "id": "...",
    "formation": "4-3-3",
    "slot_positions": { ... }
  }
}
```

**Note**: 
- UPSERT (aggiorna se esiste)
- Se `preserve_slots` è fornito: libera solo giocatori da slot non presenti nell'array
- Se `preserve_slots` non è fornito: libera tutti i titolari (slot_index → NULL)
- Permette cambio formazione intelligente mantenendo giocatori esistenti

---

### `POST /api/supabase/save-player`

**Descrizione**: Salva nuovo giocatore.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "player": {
    "player_name": "Nome",
    "position": "CF",
    "overall_rating": 85,
    "slot_index": 0, // 0-10 o null
    ...
  }
}
```

**Response**:
```json
{
  "success": true,
  "player_id": "...",
  "is_new": true
}
```

---

### `PATCH /api/supabase/assign-player-to-slot`

**Descrizione**: Assegna giocatore a slot.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "slot_index": 5,
  "player_id": "..." // o "player_data": { ... }
}
```

**Response**:
```json
{
  "success": true,
  "player_id": "...",
  "slot_index": 5,
  "action": "assigned_existing" // o "created_new"
}
```

**Note**: Libera vecchio giocatore nello slot se presente.

---

**Nota**: L'endpoint `PATCH /api/supabase/swap-formation` è stato rimosso perché mai utilizzato nel codice.

---

## 📄 Pagine e Flussi

### `/` - Dashboard

**Funzionalità**:
- Panoramica squadra (titolari/riserve/totale)
- Top 3 giocatori per rating
- Navigazione rapida

**Query**: Query dirette Supabase (gratis).

---

### `/gestione-formazione` - Gestione Formazione 2D

**Funzionalità**:
- Campo 2D interattivo con slot posizionati
- Click slot → Modal assegnazione
- **14 Formazioni Ufficiali eFootball**: Selezione manuale tra tutti i moduli tattici
- **Cambio Formazione**: Bottone nell'header per modificare formazione anche con rosa completa
- Upload formazione (screenshot completo - opzione avanzata)
- Upload riserve (screenshot card)
- Upload giocatore per slot (fino a 3 immagini)

**Formazioni Disponibili**:
- **4 Difensori**: 4-3-3, 4-2-3-1, 4-4-2, 4-1-2-3, 4-5-1, 4-4-1-1, 4-2-2-2
- **3 Difensori**: 3-5-2, 3-4-3, 3-1-4-2, 3-4-1-2
- **5 Difensori**: 5-3-2, 5-4-1, 5-2-3

**Flusso Crea/Modifica Formazione**:
1. Click "Crea Formazione" o "Cambia Formazione" → Modal selezione
2. Scegli formazione tattica → Preview posizioni
3. Click "Conferma Formazione" → Salvataggio layout
4. I giocatori esistenti vengono mantenuti nei loro slot_index (0-10)
5. Cambiano solo le coordinate visuali (x, y) e i ruoli sul campo

**Flusso Upload Formazione (Avanzato)**:
1. Click "Importa da Screenshot" → Modal upload
2. Seleziona screenshot → Preview
3. Click "Carica" → Estrazione OpenAI
4. Salvataggio layout → Ricarica pagina

**Flusso Assegna Giocatore**:
1. Click slot vuoto → Modal assegnazione
2. Opzioni:
   - Upload foto (fino a 3 immagini)
   - Seleziona da riserve
3. Conferma → Assegnazione slot

**Note**: 
- Slot 0-10 = titolari (posizionati sul campo)
- Slot NULL = riserve (lista sotto campo)
- **Cambio Formazione Intelligente**: I giocatori mantengono le loro posizioni numeriche (0-10), cambiano solo le coordinate visuali sul campo

---

### `/giocatore/[id]` - Dettaglio Giocatore

**Funzionalità**:
- Visualizza dati giocatore
- Upload foto aggiuntive:
  - Statistiche
  - Abilità
  - Booster
- Validazione matching (nome/squadra/ruolo)

**Flusso Upload Foto**:
1. Seleziona tipo (stats/skills/booster)
2. Carica immagine → Preview
3. Click "Salva e Aggiorna" → Estrazione OpenAI
4. Modal conferma (mostra mismatch se presenti)
5. Conferma → Aggiornamento database

**Note**: 
- `photo_slots` traccia foto caricate
- Validazione previene errori di matching

---

### `/login` - Autenticazione

**Funzionalità**:
- Login con email/password
- Registrazione
- Redirect a dashboard dopo login

---

### `/lista-giocatori` e `/upload`

**Funzionalità**: Redirect automatico a `/gestione-formazione`.

---

## 🐛 Problemi Risolti

### ✅ Problema 1: `setShowFormationSelector` non definito

**Errore**: Riga 412 in `gestione-formazione/page.jsx` chiamava `setShowFormationSelector(false)` ma lo stato non esisteva.

**Fix**: Rimosso riferimento inutilizzato (funzione `handleSelectManualFormation` non usata).

---

### ✅ Problema 2: `performUpdate` non definita

**Errore**: In `giocatore/[id]/page.jsx`, la funzione `performUpdate` veniva chiamata ma non era definita.

**Fix**: Creata funzione `performUpdate` che contiene la logica di aggiornamento giocatore.

---

### ✅ Problema 3: Tasto "Carica Formazione" non funzionava

**Verifica**: 
- ✅ Stato `showUploadFormationModal` definito
- ✅ Handler `handleUploadFormation` implementato
- ✅ Modal `UploadModal` renderizzato correttamente
- ✅ API `/api/extract-formation` funzionante

**Status**: ✅ **RISOLTO** - Il tasto funziona correttamente.

---

### ✅ Problema 4: Pagine che non si aprono

**Verifica**:
- ✅ `/lista-giocatori` → Redirect a `/gestione-formazione`
- ✅ `/upload` → Redirect a `/gestione-formazione`
- ✅ `/giocatore/[id]` → Funziona correttamente
- ✅ `/login` → Funziona correttamente
- ✅ `/` (Dashboard) → Funziona correttamente

**Status**: ✅ **TUTTE LE PAGINE FUNZIONANO**

---

## ⚙️ Configurazione

### Environment Variables

**`.env.local` (Locale)**:
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Vercel Production**: Configurare in Vercel Dashboard → Settings → Environment Variables.

---

### Setup Locale

```bash
# Installazione
npm install

# Sviluppo
npm run dev

# Build
npm run build

# Production
npm start
```

---

## 🔍 Troubleshooting

### Errore: "Sessione scaduta"

**Causa**: Token Supabase scaduto.

**Fix**: 
- Ricarica pagina
- Re-login se necessario

---

### Errore: "OPENAI_API_KEY not configured"

**Causa**: Variabile d'ambiente mancante.

**Fix**: 
- Verifica `.env.local` (locale)
- Verifica Vercel Environment Variables (production)

---

### Errore: "Failed to extract formation"

**Causa**: 
- Screenshot non valido
- OpenAI API error
- Formato immagine non supportato

**Fix**:
- Usa screenshot completo (11 giocatori visibili)
- Verifica formato (JPG/PNG)
- Controlla console per errori OpenAI

---

### Errore: "Player not found or unauthorized"

**Causa**: 
- Giocatore non esiste
- RLS blocca accesso

**Fix**:
- Verifica `user_id` corrisponde
- Controlla RLS policies

---

### Modal non si apre

**Causa**: Stato React non aggiornato.

**Fix**:
- Verifica `useState` inizializzato
- Controlla handler `onClick`
- Verifica console per errori JavaScript

---

## 📊 Costi

### Gratis
- Refresh pagina
- Query dirette Supabase
- Navigazione pagine

### A Pagamento
- Chiamate OpenAI Vision:
  - Formazione: ~$0.01-0.05
  - Giocatore: ~$0.01-0.05 per immagine

**Setup Iniziale Cliente**: ~$0.46-1.40
- Formazione: $0.01-0.05
- 11 giocatori titolari (3 foto ciascuno): ~$0.33-1.65
- 5-10 riserve: ~$0.05-0.50

---

## 🔒 Sicurezza

- ✅ **RLS**: Row Level Security su tutte le tabelle
- ✅ **Auth**: Validazione token Bearer in API routes
- ✅ **Service Role Key**: Server-only, non esposto al client
- ✅ **Input Validation**: Normalizzazione e validazione dati

---

## 📝 Note Finali

- `slot_index`: 0-10 = titolare, NULL = riserva
- Un layout formazione per utente (UNIQUE constraint)
- Matching giocatori: nome + squadra + ruolo per validazione
- Responsive design: Mobile-first, touch-friendly
- Codice pulito: Nessun codice morto, funzioni ben definite

---

## 📖 Risorse

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OpenAI Vision API**: https://platform.openai.com/docs/guides/vision
- **Vercel Deploy**: https://vercel.com/docs

---

---

## 🆕 Changelog

### Versione 1.1.0 (Gennaio 2025)

**Nuove Funzionalità**:
- ✅ **14 Formazioni Ufficiali eFootball**: Aggiunte tutte le formazioni tattiche ufficiali del gioco
- ✅ **Cambio Formazione Intelligente**: Possibilità di cambiare formazione mantenendo i giocatori già assegnati
- ✅ **Bottone "Cambia Formazione"**: Accesso rapido nell'header per modificare la formazione anche con rosa completa
- ✅ **API `preserve_slots`**: Supporto per preservare giocatori esistenti durante il cambio formazione

**Miglioramenti UX**:
- Selezione manuale formazione come opzione principale
- Upload da screenshot come opzione avanzata
- Messaggi informativi chiari nel modal di selezione

**Note Tecniche**:
- I giocatori mantengono i loro `slot_index` (0-10) quando si cambia formazione
- Cambiano solo le coordinate visuali (x, y) e i ruoli (position) nel layout
- Tutte le formazioni usano sempre gli stessi 11 slot (0-10), solo cambiano le posizioni sul campo

---

**Documentazione aggiornata al**: Gennaio 2025  
**Versione App**: 1.1.0
