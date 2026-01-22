# Documentazione Completa - eFootball AI Coach

**Data Aggiornamento**: Gennaio 2025  
**Versione**: 1.3.0

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Stack Tecnologico](#stack-tecnologico)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Pagine e Flussi](#pagine-e-flussi)
7. [Sicurezza](#sicurezza)
8. [Problemi Risolti](#problemi-risolti)
9. [Configurazione](#configurazione)
10. [Troubleshooting](#troubleshooting)

**Documenti Correlati**:
- `DOCUMENTAZIONE_LIBRERIE.md` - Documentazione librerie (`lib/`)
- `DOCUMENTAZIONE_COMPONENTI.md` - Documentazione componenti (`components/`)
- `DOCUMENTAZIONE_SEZIONE_PARTITE.md` - Documentazione completa sezione partite (match management)
- `DOCUMENTAZIONE_SEZIONE_ALLENATORE.md` - Documentazione sezione allenatori
- `AUDIT_SICUREZZA.md` - Audit sicurezza completo
- `AUDIT_DOCUMENTAZIONE.md` - Audit documentazione

---

## 🎯 Panoramica

**eFootball AI Coach** è una web app per la gestione di formazioni e giocatori di eFootball. Utilizza AI (OpenAI GPT-4 Vision) per estrarre dati da screenshot e gestisce la rosa tramite un campo 2D interattivo.

### Funzionalità Principali

- ✅ **Dashboard**: Panoramica squadra con statistiche
- ✅ **Gestione Formazione 2D**: Campo interattivo con slot cliccabili
- ✅ **14 Formazioni Ufficiali eFootball**: Selezione tra tutti i moduli tattici ufficiali
- ✅ **Cambio Formazione Intelligente**: Mantiene giocatori quando si cambia modulo
- ✅ **Upload Formazione**: Estrazione disposizione tattica da screenshot (opzione avanzata)
- ✅ **Upload Giocatori**: Estrazione dati da card (fino a 3 immagini) con tracciamento foto
- ✅ **Gestione Riserve**: Upload e gestione giocatori riserva
- ✅ **Profilazione Giocatori**: Completamento profilo con foto aggiuntive
- ✅ **Visualizzazione Dati Estratti**: Modal con statistiche, abilità e booster quando si clicca su una card
- ✅ **Campo 2D Migliorato**: Design realistico con pattern erba, linee campo visibili, contrasto ottimizzato
- ✅ **Gestione Partite**: Wizard step-by-step per caricare dati partita (pagelle, statistiche, aree attacco, recuperi palla, formazione avversaria)
- ✅ **Storico Partite**: Lista ultime partite salvate con possibilità di completare dati mancanti
- ✅ **Internazionalizzazione**: Supporto IT/EN completo

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
- `slot_index`: 0-10 = titolare, NULL = riserva (constraint CHECK)
- `photo_slots`: Traccia quali foto sono state caricate (vedi struttura sotto)
- `metadata`: Dati aggiuntivi (source, saved_at, player_face_description, ecc.)

**Struttura `photo_slots` (JSONB)**:
```json
{
  "card": true,           // Foto card principale caricata
  "statistiche": true,    // Foto statistiche dettagliate caricata
  "abilita": true,        // Foto abilità caricata
  "booster": true         // Foto booster caricata (può essere nella stessa foto di abilità)
}
```
- Tracciamento automatico durante upload
- Usato per determinare completezza profilo giocatore
- Profilo completo = card + statistiche + (abilita O booster)

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

### Tabella `matches`

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati Partita Base
  match_date TIMESTAMPTZ DEFAULT NOW(),
  opponent_name TEXT,
  result TEXT, -- "6-1", "2-0", ecc.
  is_home BOOLEAN DEFAULT true,
  
  -- Formazione e Stile
  formation_played TEXT, -- "4-2-1-3", "4-3-3", ecc.
  playing_style_played TEXT, -- "Contrattacco", "Possesso palla", ecc.
  team_strength INTEGER, -- Forza complessiva squadra (es. 3245)
  opponent_formation_id UUID REFERENCES opponent_formations(id) ON DELETE SET NULL,
  
  -- Dati Estratti (JSONB per flessibilità)
  player_ratings JSONB DEFAULT '{}'::jsonb,
  team_stats JSONB DEFAULT '{}'::jsonb,
  attack_areas JSONB DEFAULT '{}'::jsonb,
  ball_recovery_zones JSONB DEFAULT '[]'::jsonb,
  goals_events JSONB DEFAULT '[]'::jsonb,
  formation_discrepancies JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata Estrazione
  extracted_data JSONB DEFAULT '{}'::jsonb,
  photos_uploaded INTEGER DEFAULT 0 CHECK (photos_uploaded >= 0 AND photos_uploaded <= 5),
  missing_photos TEXT[] DEFAULT '{}'::text[],
  data_completeness TEXT DEFAULT 'partial' CHECK (data_completeness IN ('partial', 'complete')),
  
  -- Tracking
  credits_used INTEGER DEFAULT 0 CHECK (credits_used >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note Importanti**:
- `player_ratings`: Struttura `{ cliente: {...}, avversario: {...} }` per distinguere giocatori cliente/avversario
- `photos_uploaded`: Conta quante sezioni (0-5) sono state caricate
- `missing_photos`: Array di sezioni mancanti: `["player_ratings", "team_stats", ...]`
- `data_completeness`: `'complete'` se ≤1 sezione mancante, `'partial'` altrimenti
- `result`: Estratto automaticamente da qualsiasi screenshot (formato "X-Y")

**Struttura `player_ratings` (JSONB)**:
```json
{
  "cliente": {
    "Nome Giocatore Cliente": { "rating": 8.5 },
    ...
  },
  "avversario": {
    "Nome Giocatore Avversario": { "rating": 6.5 },
    ...
  }
}
```

**Struttura `team_stats` (JSONB)**:
```json
{
  "possession": 49,
  "shots": 16,
  "shots_on_target": 10,
  "fouls": 0,
  "offsides": 0,
  "corner_kicks": 2,
  "free_kicks": 0,
  "passes": 110,
  "successful_passes": 81,
  "crosses": 0,
  "interceptions": 29,
  "tackles": 4,
  "saves": 4,
  "goals_scored": 6,
  "goals_conceded": 1
}
```

**Struttura `attack_areas` (JSONB)**:
```json
{
  "team1": {
    "left": 46,
    "center": 45,
    "right": 9
  },
  "team2": {
    "left": 19,
    "center": 64,
    "right": 17
  }
}
```

**Struttura `ball_recovery_zones` (JSONB Array)**:
```json
[
  { "x": 0.3, "y": 0.5, "team": "team1" },
  { "x": 0.7, "y": 0.4, "team": "team2" }
]
```

**Indici**:
- `idx_matches_user_date`: Per query efficienti per utente ordinate per data
- `idx_matches_opponent_formation`: Per join con opponent_formations
- `idx_matches_photos_uploaded`: Per filtrare partite con dati caricati

**RLS Policies**:
- Utenti possono vedere solo i propri match (`auth.uid() = user_id`)
- Utenti possono inserire/aggiornare/eliminare solo i propri match

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

**Note**: 
- Usa OpenAI GPT-4 Vision. Estrae solo layout, non salva giocatori.
- ⚠️ **SICUREZZA**: Endpoint pubblico, nessuna autenticazione richiesta (vedi sezione Sicurezza)
- ⚠️ **RATE LIMITING**: Non implementato (rischio abuso quota OpenAI)

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

**Note**: 
- Normalizza dati (converte numeri, limita array).
- Limiti array: skills max 40, com_skills max 20, ai_playstyles max 10, boosters max 10
- ⚠️ **SICUREZZA**: Endpoint pubblico, nessuna autenticazione richiesta (vedi sezione Sicurezza)
- ⚠️ **RATE LIMITING**: Non implementato (rischio abuso quota OpenAI)
- ⚠️ **VALIDAZIONE**: Non valida dimensione immagine (rischio DoS)

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
- **Completamento Slot Mancanti**: Se `slot_positions` non contiene tutti gli 11 slot (0-10), vengono completati con posizioni default
- **Posizioni Default**: Portiere (0: x=50, y=90), Difensori (1-4), Centrocampisti (5-7), Attaccanti (8-10)

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
    "slot_index": 0,
    "photo_slots": {
      "card": true,
      "statistiche": true,
      "abilita": true,
      "booster": true
    },
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

**Note**: 
- Libera vecchio giocatore nello slot se presente (slot_index → NULL)
- Verifica che giocatore appartenga all'utente autenticato (sicurezza)
- Supporta due modalità: assegnazione giocatore esistente (`player_id`) o creazione nuovo (`player_data`)

---

**Nota**: L'endpoint `PATCH /api/supabase/swap-formation` è stato rimosso perché mai utilizzato nel codice.

---

### `POST /api/extract-match-data`

**Descrizione**: Estrae dati da screenshot di partita in base alla sezione specificata.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "imageDataUrl": "data:image/png;base64,...",
  "section": "player_ratings" | "team_stats" | "attack_areas" | "ball_recovery_zones" | "formation_style"
}
```

**Response**:
```json
{
  "section": "player_ratings",
  "data": {
    "cliente": {
      "Nome Giocatore": { "rating": 8.5 }
    },
    "avversario": {
      "Nome Giocatore": { "rating": 6.5 }
    }
  },
  "result": "6-1",
  "raw": { ... }
}
```

**Sezioni Supportate**:
- `player_ratings`: Pagelle giocatori (solo rating, distingue cliente/avversario)
- `team_stats`: Statistiche squadra (possesso, tiri, passaggi, ecc.) + risultato
- `attack_areas`: Aree di attacco (percentuali per zona sinistra/centro/destra)
- `ball_recovery_zones`: Zone di recupero palla (coordinate normalizzate x:0-1, y:0-1)
- `formation_style`: Formazione avversaria, stile di gioco, forza squadra + risultato

**Note**:
- Usa OpenAI GPT-4 Vision con prompt specifici per sezione
- Identifica automaticamente squadra cliente vs avversario usando `user_profiles`
- Estrae risultato partita se visibile in qualsiasi screenshot
- Normalizza dati (converte numeri, valida formati)
- ⚠️ **SICUREZZA**: Richiede autenticazione Bearer token
- ⚠️ **VALIDAZIONE**: Valida dimensione immagine (max 10MB)

---

### `POST /api/supabase/save-match`

**Descrizione**: Salva nuova partita con dati estratti.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "matchData": {
    "result": "6-1",
    "player_ratings": { "cliente": {...}, "avversario": {...} },
    "team_stats": { "possession": 49, "shots": 16, ... },
    "attack_areas": { "team1": {...}, "team2": {...} },
    "ball_recovery_zones": [...],
    "formation_played": "4-2-1-3",
    "playing_style_played": "Contrattacco",
    "team_strength": 3245,
    "extracted_data": { ... }
  }
}
```

**Response**:
```json
{
  "success": true,
  "match": {
    "id": "...",
    "match_date": "2025-01-20T10:30:00Z",
    "result": "6-1",
    "photos_uploaded": 3,
    "missing_photos": ["ball_recovery_zones", "formation_style"],
    "data_completeness": "partial"
  }
}
```

**Note**:
- Calcola automaticamente `photos_uploaded`, `missing_photos`, `data_completeness`
- Rimuove `result` da `team_stats` se presente (gestito separatamente)
- Valida `matchData` e applica limiti (MAX_TEXT_LENGTH)
- Usa Supabase Service Role per inserimento

---

### `POST /api/supabase/update-match`

**Descrizione**: Aggiorna partita esistente con nuove sezioni di dati.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "match_id": "uuid",
  "section": "player_ratings" | "team_stats" | "attack_areas" | "ball_recovery_zones" | "formation_style",
  "data": { ... },
  "result": "6-1"
}
```

**Response**:
```json
{
  "success": true,
  "match": { ... },
  "photos_uploaded": 4,
  "missing_photos": ["formation_style"],
  "data_completeness": "partial"
}
```

**Note**:
- Merge intelligente: combina dati esistenti con nuovi
- Per `player_ratings`: merge separato per `cliente`/`avversario`
- Per `team_stats`/`attack_areas`: merge diretto (rimuove `result` se presente)
- Per `ball_recovery_zones`: concatena array
- Per `formation_style`: aggiorna singoli campi (`formation_played`, `playing_style_played`, `team_strength`)
- Ricalcola automaticamente metadata (`photos_uploaded`, `missing_photos`, `data_completeness`)
- Estrae `result` da parametro, `data.result`, o `team_stats.result`

---

## 📄 Pagine e Flussi

### `/` - Dashboard

**Funzionalità**:
- Panoramica squadra (titolari/riserve/totale)
- Top 3 giocatori per rating
- **Ultime Partite**: Lista ultime 5 partite (espandibile a 10) con:
  - Avversario, data/ora, risultato
  - Stato completamento (✓ Completa o X/5 foto caricate)
  - Badge "mancanti" se ci sono sezioni incomplete
  - Click su partita → Dettaglio partita (`/match/[id]`)
- Navigazione rapida (Aggiungi Partita, Gestisci Formazione, ecc.)

**Query**: Query dirette Supabase (gratis) con filtro `user_id` esplicito per sicurezza.

**Componenti**:
- Card "Ultime Partite" sempre visibile (anche se vuota, mostra messaggio informativo)
- Lista collassabile: mostra prime 5, espandibile a 10
- Mobile-first: card posizionata fuori dal grid per visibilità ottimale
- Touch feedback: `onTouchStart`/`onTouchEnd` per feedback visivo su mobile

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
   - Upload foto (fino a 3 immagini: card, stats, skills)
   - Seleziona da riserve
3. Conferma → Assegnazione slot
4. `photo_slots` viene tracciato automaticamente in base alle immagini caricate

**Flusso Click Card Giocatore**:
1. Click su card giocatore assegnato → Modal dettagli
2. Visualizzazione dati estratti:
   - **Statistiche**: base_stats organizzati per categoria (Attacco/Difesa/Forza)
   - **Abilità**: skills e com_skills come badge colorati
   - **Booster**: available_boosters con nome/effetto/condizione
3. Sezioni espandibili/collassabili per migliore UX
4. Azioni disponibili:

**Funzioni Handler Principali** (`app/gestione-formazione/page.jsx`):

- **`handleUploadPlayerToSlot()`**: 
  - Carica fino a 3 immagini (card, stats, skills)
  - Estrae dati da ogni immagine con `/api/extract-player`
  - Merge dati da tutte le immagini
  - Traccia `photo_slots` automaticamente
  - Salva giocatore e assegna a slot con `/api/supabase/save-player`
  - Gestisce errori OpenAI (quota esaurita, ecc.)

- **`handleUploadReserve()`**:
  - Carica 1 immagine card giocatore
  - Estrae dati con `/api/extract-player`
  - Salva come riserva (slot_index = null) con `/api/supabase/save-player`
  - Traccia `photo_slots.card = true`

- **`handleUploadFormation()`**:
  - Carica screenshot formazione completa
  - Estrae formazione e slot_positions con `/api/extract-formation`
  - Salva layout con `/api/supabase/save-formation-layout`
  - Libera tutti i titolari (slot_index → NULL)

- **`handleSelectManualFormation()`**:
  - Selezione formazione da modal (14 formazioni ufficiali)
  - Usa posizioni predefinite per formazione scelta
  - Salva layout con `preserve_slots` per mantenere giocatori esistenti

- **`handleAssignFromReserve()`**:
  - Assegna giocatore esistente da riserve a slot
  - Usa `/api/supabase/assign-player-to-slot`
  - Libera vecchio giocatore nello slot se presente

- **`handleRemoveFromSlot()`**:
  - Rimuove giocatore da slot (torna riserva)
  - Aggiorna `slot_index = null` direttamente con Supabase client
  - **NON elimina** giocatore dal database

- **`handleDeleteReserve()`**:
  - Elimina definitivamente giocatore dalle riserve
  - Richiede conferma utente
  - Usa `.delete()` Supabase (eliminazione permanente)

- **`handleSlotClick()`**:
  - Gestisce click su slot campo 2D
  - Apre modal assegnazione (`AssignModal`)
  - Passa slot selezionato e riserve disponibili
   - Completa Profilo (redirect a `/giocatore/[id]`)
   - Cambia Giocatore (upload nuove foto)
   - Rimuovi da Slot

**Note**: 
- Slot 0-10 = titolari (posizionati sul campo)
- Slot NULL = riserve (lista sotto campo)
- **Cambio Formazione Intelligente**: I giocatori mantengono le loro posizioni numeriche (0-10), cambiano solo le coordinate visuali sul campo
- **Tracciamento Foto**: `photo_slots` viene aggiornato automaticamente durante l'upload

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
- `photo_slots` traccia foto caricate: `{ card: true, statistiche: true, abilita: true, booster: true }`
- Validazione previene errori di matching (nome/squadra/ruolo/età)
- Badge "Profilo Completo" quando tutte le foto sono caricate
- Sezioni espandibili per statistiche, abilità e booster
- Pulsante "Aggiorna" sempre visibile anche se sezione completa (permette sovrascrittura)

---

### `/match/new` - Aggiungi Partita (Wizard)

**Funzionalità**: Wizard step-by-step per caricare dati partita da screenshot.

**Steps (5 sezioni)**:
1. **Pagelle Giocatori** (`player_ratings`): Screenshot con voti giocatori
2. **Statistiche Squadra** (`team_stats`): Screenshot con statistiche (possesso, tiri, passaggi, ecc.)
3. **Aree di Attacco** (`attack_areas`): Screenshot con percentuali per zona
4. **Aree di Recupero Palla** (`ball_recovery_zones`): Screenshot con punti verdi sul campo
5. **Formazione Avversaria** (`formation_style`): Screenshot con formazione, stile di gioco, forza squadra

**Flusso Wizard**:
1. Seleziona step → Carica immagine → Preview
2. Click "Estrai Dati" → Chiama `/api/extract-match-data`
3. Dati estratti salvati in `stepData` (localStorage per persistenza)
4. Avanza automaticamente allo step successivo
5. Opzione "Skip" per saltare step opzionali
6. All'ultimo step o quando tutti completati → Bottone "Salva Partita"
7. Click "Salva Partita" → Chiama `/api/supabase/save-match`
8. Redirect a dashboard dopo salvataggio

**Funzionalità Avanzate**:
- **Persistenza Progresso**: Salva progresso in `localStorage` (`match_wizard_progress`)
- **Progress Bar**: Barra progresso visuale (0-100%) basata su step corrente
- **Step Indicators**: Badge per ogni step (completato/saltato/attivo)
- **Auto-advance**: Avanza automaticamente dopo estrazione riuscita
- **Result Extraction**: Estrae risultato partita da qualsiasi screenshot (se visibile)
- **Mobile-first**: Design responsive ottimizzato per mobile

**Funzioni Handler Principali** (`app/match/new/page.jsx`):
- **`handleImageSelect(section)`**: Carica immagine, valida dimensione (max 10MB), salva in `stepImages`
- **`handleExtract(section)`**: Estrae dati da immagine corrente, salva in `stepData`, avanza step
- **`handleSkip(section)`**: Salta step corrente, salva `null` in `stepData`, avanza step
- **`handleSave()`**: Valida almeno una sezione, prepara `matchData`, salva con `/api/supabase/save-match`

**Note**:
- Tutti i testi sono tradotti (IT/EN) usando `useTranslation()`
- STEPS memoizzati con `React.useMemo(() => [...], [t])` per performance
- Validazione: almeno una sezione deve avere dati prima di salvare

---

### `/match/[id]` - Dettaglio Partita

**Funzionalità**: Visualizza partita salvata e completa sezioni mancanti.

**Visualizzazione**:
- Info partita: Data/Ora, Avversario, Risultato, Completamento
- Lista sezioni con stato:
  - ✅ Verde: Sezione completa (dati presenti)
  - ⚠️ Arancione: Sezione mancante (badge "Mancante")

**Flusso Completamento**:
1. Click su sezione mancante → Upload immagine
2. Preview immagine caricata
3. Click "Estrai e Salva" → Chiama `/api/extract-match-data` + `/api/supabase/update-match`
4. Aggiornamento automatico: `photos_uploaded`, `missing_photos`, `data_completeness`
5. Sezione diventa verde (completa)

**Funzioni Handler Principali** (`app/match/[id]/page.jsx`):
- **`handleImageSelect(section)`**: Carica immagine per sezione specifica
- **`handleExtractAndUpdate()`**: Estrae dati e aggiorna match esistente
- **`hasSection(section)`**: Verifica se sezione ha dati (per visualizzazione stato)

**Note**:
- Merge intelligente: nuovi dati vengono combinati con esistenti
- Result può essere estratto da qualsiasi sezione e aggiornato
- Tutti i testi sono tradotti (IT/EN)

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

### Autenticazione

- ✅ **RLS**: Row Level Security su tutte le tabelle (`players`, `formation_layout`)
- ✅ **Auth API Routes**: Validazione token Bearer in tutte le API routes Supabase
- ✅ **Service Role Key**: Server-only, non esposto al client
- ✅ **Input Validation**: Normalizzazione e validazione dati

### Endpoint Pubblici

⚠️ **IMPORTANTE**: I seguenti endpoint sono pubblici (nessuna autenticazione):
- `POST /api/extract-player` - Estrazione dati giocatore
- `POST /api/extract-formation` - Estrazione formazione

**Rischi**:
- Possibile abuso quota OpenAI
- Nessun rate limiting implementato
- Nessuna validazione dimensione immagine

**Raccomandazioni** (vedi `AUDIT_SICUREZZA.md`):
- Aggiungere autenticazione Bearer token
- Implementare rate limiting
- Validare dimensione max immagine (es. 10MB)

### Validazione Input

- ✅ **Normalizzazione**: `toInt()`, `toText()` per sanitizzazione
- ✅ **Limiti Array**: skills max 40, com_skills max 20, ai_playstyles max 10, boosters max 10
- ✅ **Validazione Slot**: slot_index sempre 0-10 (constraint database)
- ⚠️ **Lunghezza Campi**: Non validata (rischio DoS con campi molto lunghi)

### Database Security

- ✅ **RLS Policies**: Tutte le tabelle protette
- ✅ **User Isolation**: Ogni utente vede solo i propri dati
- ✅ **Foreign Keys**: Relazioni con `auth.users` e `playing_styles`

**Policies Verificate**:
- `players`: SELECT, INSERT, UPDATE, DELETE (solo user_id = auth.uid())
- `formation_layout`: ALL (solo user_id = auth.uid())
- `playing_styles`: SELECT (pubblico, catalogo)

### Logging e Privacy

- ⚠️ **User ID nei Log**: Alcuni log contengono user_id (GDPR compliance)
- ✅ **Error Messages**: Sanitizzati (non espongono dettagli sistema)

**Per dettagli completi**: Vedi `AUDIT_SICUREZZA.md`

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

### Versione 1.2.0 (Gennaio 2025)

**Nuove Funzionalità**:
- ✅ **Tracciamento `photo_slots` Completo**: Tracciamento automatico delle foto caricate in tutti i flussi (upload slot, upload riserve)
- ✅ **Visualizzazione Dati Estratti**: Modal dettagli giocatore mostra statistiche, abilità e booster quando si clicca su una card
- ✅ **Sezioni Espandibili**: Statistiche, abilità e booster con sezioni collassabili per migliore UX

**Miglioramenti UX**:
- ✅ **Campo 2D Realistico**: Pattern erba, linee campo visibili (centrocampo, cerchio, aree di rigore)
- ✅ **SlotCard Migliorate**: Contrasto e visibilità ottimizzati (background più opaco, bordi più visibili, ombre più forti)
- ✅ **Rating Giocatori**: Badge dorato con glow effect
- ✅ **Hover Effects**: Animazioni fluide e feedback visivo migliorato

**Miglioramenti Tecnici**:
- ✅ **Endpoint `save-player`**: Supporto completo per `photo_slots`
- ✅ **Coerenza Flussi**: Tutti i flussi di upload tracciano correttamente le foto caricate
- ✅ **Validazione**: Verificata coerenza tra frontend e backend

---

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
**Versione App**: 1.2.0
