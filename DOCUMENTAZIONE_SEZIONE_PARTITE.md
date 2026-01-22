# 📋 Documentazione Sezione Partite - eFootball AI Coach

**Data Aggiornamento**: Gennaio 2025  
**Versione**: 1.0.0  
**Stato**: ✅ **PRODUZIONE**

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Flussi Utente](#flussi-utente)
6. [Sicurezza](#sicurezza)
7. [Internazionalizzazione](#internazionalizzazione)
8. [Performance e Scalabilità](#performance-e-scalabilità)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Panoramica

La **Sezione Partite** permette agli utenti di profilare le proprie partite caricando screenshot e estraendo dati tramite AI. Il sistema supporta 5 sezioni di dati che possono essere caricate in modo incrementale.

### Funzionalità Principali

- ✅ **Wizard Aggiungi Partita**: Processo guidato step-by-step per caricare dati partita
- ✅ **Storico Partite**: Lista ultime partite salvate nella dashboard
- ✅ **Completamento Incrementale**: Possibilità di aggiungere sezioni mancanti a partite esistenti
- ✅ **Estrazione AI**: Identificazione automatica cliente/avversario e risultato partita
- ✅ **Mobile-First**: Design ottimizzato per dispositivi mobili
- ✅ **Bilingue**: Supporto completo IT/EN

### Sezioni Dati Supportate

1. **Pagelle Giocatori** (`player_ratings`): Voti giocatori (solo rating, distingue cliente/avversario)
2. **Statistiche Squadra** (`team_stats`): Possesso, tiri, passaggi, falli, ecc. + risultato
3. **Aree di Attacco** (`attack_areas`): Percentuali per zona (sinistra/centro/destra)
4. **Aree di Recupero Palla** (`ball_recovery_zones`): Coordinate normalizzate punti verdi sul campo
5. **Formazione Avversaria** (`formation_style`): Formazione, stile di gioco, forza squadra + risultato

---

## 🏗️ Architettura

### Pattern Implementato

**Frontend (React/Next.js)**:
- Componenti: `app/match/new/page.jsx` (Wizard), `app/match/[id]/page.jsx` (Dettaglio)
- State Management: React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`)
- Persistenza: `localStorage` per progresso wizard (`match_wizard_progress`)
- Routing: Next.js App Router (`/match/new`, `/match/[id]`)

**Backend (API Routes)**:
- `/api/extract-match-data`: Estrazione dati da screenshot (OpenAI GPT-4 Vision)
- `/api/supabase/save-match`: Salvataggio nuova partita
- `/api/supabase/update-match`: Aggiornamento partita esistente (merge intelligente)

**Database (Supabase)**:
- Tabella `matches` con RLS policies
- Indici per performance (`idx_matches_user_date`, `idx_matches_photos_uploaded`)
- Trigger per `updated_at` automatico

### Flusso Dati

```
Utente carica screenshot
  ↓
Frontend: app/match/new/page.jsx
  ↓
POST /api/extract-match-data
  ↓
OpenAI GPT-4 Vision (estrazione)
  ↓
Normalizzazione dati
  ↓
POST /api/supabase/save-match
  ↓
Supabase (matches table)
  ↓
RLS: Filtra per user_id
  ↓
Dashboard: Query diretta Supabase
```

---

## 🗄️ Database Schema

### Tabella `matches`

**Colonne Principali**:

| Colonna | Tipo | Descrizione |
|---------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `auth.users(id)` |
| `match_date` | TIMESTAMPTZ | Data/ora partita (default: NOW()) |
| `opponent_name` | TEXT | Nome avversario |
| `result` | TEXT | Risultato partita (es. "6-1", "2-0") |
| `is_home` | BOOLEAN | Partita in casa (default: true) |
| `formation_played` | TEXT | Formazione usata (es. "4-2-1-3") |
| `playing_style_played` | TEXT | Stile di gioco (es. "Contrattacco") |
| `team_strength` | INTEGER | Forza complessiva squadra |
| `player_ratings` | JSONB | Pagelle giocatori (struttura cliente/avversario) |
| `team_stats` | JSONB | Statistiche squadra |
| `attack_areas` | JSONB | Aree di attacco |
| `ball_recovery_zones` | JSONB | Zone recupero palla (array) |
| `photos_uploaded` | INTEGER | Numero sezioni caricate (0-5) |
| `missing_photos` | TEXT[] | Array sezioni mancanti |
| `data_completeness` | TEXT | 'complete' o 'partial' |
| `created_at` | TIMESTAMPTZ | Timestamp creazione |
| `updated_at` | TIMESTAMPTZ | Timestamp ultimo aggiornamento |

**Indici**:
- `idx_matches_user_date`: `(user_id, match_date DESC)` - Query efficienti per utente
- `idx_matches_photos_uploaded`: `(photos_uploaded)` - Filtra partite con dati
- `idx_matches_opponent_formation`: `(opponent_formation_id)` - Join con opponent_formations

**RLS Policies**:
- `Users can view own matches`: SELECT usando `auth.uid() = user_id`
- `Users can insert own matches`: INSERT con CHECK `auth.uid() = user_id`
- `Users can update own matches`: UPDATE usando `auth.uid() = user_id`
- `Users can delete own matches`: DELETE usando `auth.uid() = user_id`

**Trigger**:
- `trigger_update_matches_updated_at`: Aggiorna `updated_at` automaticamente

### Strutture JSONB

#### `player_ratings`

```json
{
  "cliente": {
    "Nome Giocatore Cliente": { "rating": 8.5 },
    "Altro Giocatore Cliente": { "rating": 7.0 }
  },
  "avversario": {
    "Nome Giocatore Avversario": { "rating": 6.5 },
    "Altro Giocatore Avversario": { "rating": 5.5 }
  }
}
```

**Note**:
- Solo campo `rating` (voto numerico)
- Distinzione automatica cliente/avversario tramite `user_profiles`
- Fallback: se non identificato, va in struttura generale (compatibilità retroattiva)

#### `team_stats`

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

**Note**:
- `result` viene rimosso da `team_stats` se presente (gestito separatamente in campo `result`)
- Tutti i valori sono numeri (normalizzati da stringhe se necessario)

#### `attack_areas`

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

**Note**:
- `team1` = squadra utente, `team2` = avversario
- Valori in percentuale (0-100)

#### `ball_recovery_zones`

```json
[
  { "x": 0.3, "y": 0.5, "team": "team1" },
  { "x": 0.7, "y": 0.4, "team": "team2" }
]
```

**Note**:
- Coordinate normalizzate: `x` e `y` tra 0 e 1 (0,0 = alto sinistra)
- `team`: "team1" (utente) o "team2" (avversario)

---

## 🔌 API Endpoints

### `POST /api/extract-match-data`

**Descrizione**: Estrae dati da screenshot di partita in base alla sezione specificata.

**Autenticazione**: ✅ Richiesta (Bearer token)

**Request**:
```json
{
  "imageDataUrl": "data:image/png;base64,...",
  "section": "player_ratings" | "team_stats" | "attack_areas" | "ball_recovery_zones" | "formation_style"
}
```

**Response Success (200)**:
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

**Response Error (400/401/500)**:
```json
{
  "error": "Error message"
}
```

**Validazioni**:
- ✅ `imageDataUrl` obbligatorio (stringa)
- ✅ `section` deve essere una delle 5 sezioni supportate
- ✅ Dimensione immagine max 10MB (per base64)
- ✅ Autenticazione Bearer token valido

**Note**:
- Usa OpenAI GPT-4 Vision con prompt specifici per sezione
- Recupera `user_profiles` per identificare squadra cliente
- Estrae risultato partita se visibile (restituito in `result`)
- Normalizza dati (converte numeri, valida formati)
- Gestisce errori OpenAI con retry e timeout

---

### `POST /api/supabase/save-match`

**Descrizione**: Salva nuova partita con dati estratti.

**Autenticazione**: ✅ Richiesta (Bearer token)

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

**Response Success (200)**:
```json
{
  "success": true,
  "match": {
    "id": "uuid",
    "match_date": "2025-01-20T10:30:00Z",
    "result": "6-1",
    "photos_uploaded": 3,
    "missing_photos": ["ball_recovery_zones", "formation_style"],
    "data_completeness": "partial"
  }
}
```

**Calcolo Metadata**:
- `photos_uploaded`: Conta sezioni con dati (0-5)
- `missing_photos`: Array di sezioni mancanti
- `data_completeness`: `'complete'` se ≤1 sezione mancante, `'partial'` altrimenti

**Note**:
- Rimuove `result` da `team_stats` se presente (gestito separatamente)
- Valida `matchData` e applica limiti (MAX_TEXT_LENGTH)
- Usa Supabase Service Role per inserimento
- RLS policies garantiscono che solo l'utente autenticato possa inserire

---

### `POST /api/supabase/update-match`

**Descrizione**: Aggiorna partita esistente con nuove sezioni di dati.

**Autenticazione**: ✅ Richiesta (Bearer token)

**Request**:
```json
{
  "match_id": "uuid",
  "section": "player_ratings" | "team_stats" | "attack_areas" | "ball_recovery_zones" | "formation_style",
  "data": { ... },
  "result": "6-1"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "match": { ... },
  "photos_uploaded": 4,
  "missing_photos": ["formation_style"],
  "data_completeness": "partial"
}
```

**Merge Intelligente**:
- **`player_ratings`**: Merge separato per `cliente`/`avversario`
- **`team_stats`**: Merge diretto (rimuove `result` se presente)
- **`attack_areas`**: Merge diretto
- **`ball_recovery_zones`**: Concatena array (aggiunge nuovi punti)
- **`formation_style`**: Aggiorna singoli campi (`formation_played`, `playing_style_played`, `team_strength`)

**Note**:
- Verifica che match appartenga all'utente autenticato (RLS + check esplicito)
- Ricalcola automaticamente metadata dopo merge
- Estrae `result` da parametro, `data.result`, o `team_stats.result`
- Rimuove `result` da `team_stats` se presente

---

## 🔄 Flussi Utente

### Flusso 1: Aggiungi Nuova Partita (Wizard)

**Percorso**: Dashboard → "Aggiungi Partita" → `/match/new`

**Step 1-5**: Per ogni sezione
1. Visualizza step corrente con istruzioni
2. Utente carica immagine → Preview
3. Click "Estrai Dati" → Loading
4. Dati estratti → Salva in `stepData` (localStorage)
5. Auto-advance allo step successivo

**Opzioni**:
- **Skip**: Salta step corrente (salva `null` in `stepData`)
- **Cambia Immagine**: Sostituisce immagine corrente

**Finalizzazione**:
- All'ultimo step o quando tutti completati → Bottone "Salva Partita"
- Click "Salva Partita" → Chiama `/api/supabase/save-match`
- Success → Redirect a dashboard (2 secondi)
- Progresso salvato in localStorage viene pulito

**Persistenza**:
- Progresso salvato automaticamente in `localStorage` (`match_wizard_progress`)
- Se utente chiude browser, al ritorno riprende dall'ultimo step completato

---

### Flusso 2: Visualizza Ultime Partite (Dashboard)

**Percorso**: Dashboard (`/`)

**Visualizzazione**:
- Card "Ultime Partite" sempre visibile (anche se vuota)
- Lista ultime 5 partite (espandibile a 10)
- Per ogni partita:
  - Avversario (nome o "Avversario sconosciuto")
  - Data/Ora formattata (locale IT)
  - Risultato (o "N/A")
  - Badge completamento: "✓ Completa" o "X/5"
  - Badge "mancanti" se ci sono sezioni incomplete

**Interazioni**:
- Click su partita → Naviga a `/match/[id]`
- Click "Mostra altre X partite..." → Espande lista
- Touch feedback su mobile (`onTouchStart`/`onTouchEnd`)

**Query**:
```javascript
supabase
  .from('matches')
  .select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness')
  .eq('user_id', userId) // Filtro esplicito per sicurezza
  .order('match_date', { ascending: false })
  .limit(10)
```

---

### Flusso 3: Completa Partita Esistente

**Percorso**: Dashboard → Click partita → `/match/[id]`

**Visualizzazione**:
- Info partita: Data/Ora, Avversario, Risultato, Completamento
- Lista 5 sezioni con stato:
  - ✅ Verde: Sezione completa (dati presenti)
  - ⚠️ Arancione: Sezione mancante (badge "Mancante")

**Completamento**:
1. Click su sezione mancante → Upload immagine
2. Preview immagine caricata
3. Click "Estrai e Salva" → Loading
4. Chiama `/api/extract-match-data` → Estrazione
5. Chiama `/api/supabase/update-match` → Aggiornamento
6. Sezione diventa verde (completa)
7. Metadata aggiornati: `photos_uploaded`, `missing_photos`, `data_completeness`

**Merge Intelligente**:
- Nuovi dati vengono combinati con esistenti
- Per `player_ratings`: merge separato cliente/avversario
- Per `ball_recovery_zones`: concatena array (aggiunge punti)

---

## 🔒 Sicurezza

### Autenticazione

**Tutti gli endpoint richiedono Bearer token**:
- `POST /api/extract-match-data`: ✅ Autenticazione richiesta
- `POST /api/supabase/save-match`: ✅ Autenticazione richiesta
- `POST /api/supabase/update-match`: ✅ Autenticazione richiesta

**Validazione Token**:
- Usa `validateToken()` da `lib/authHelper.js`
- Verifica scadenza e validità token
- Estrae `user_id` da token per filtrare dati

### Row Level Security (RLS)

**Policies Attive**:
- ✅ SELECT: Utenti vedono solo i propri match (`auth.uid() = user_id`)
- ✅ INSERT: Utenti possono inserire solo match con proprio `user_id`
- ✅ UPDATE: Utenti possono aggiornare solo i propri match
- ✅ DELETE: Utenti possono eliminare solo i propri match

**Verifica Doppia**:
- RLS a livello database
- Check esplicito `user_id` nelle query API (defense in depth)

### Validazione Input

**Immagine**:
- ✅ Dimensione max 10MB (validazione base64)
- ✅ Tipo file: `image/*` (validazione frontend)
- ✅ Base64 valido (validazione backend)

**Dati**:
- ✅ `section` deve essere una delle 5 sezioni supportate
- ✅ `match_id` deve essere UUID valido
- ✅ `matchData` validato con limiti (MAX_TEXT_LENGTH)

### Rate Limiting

**Status**: ⚠️ **NON IMPLEMENTATO** (da aggiungere in futuro)

**Raccomandazioni**:
- Max 10 estrazioni/minuto per utente
- Max 5 analisi match/ora per utente
- Implementare in `lib/rateLimiter.js`

---

## 🌐 Internazionalizzazione

### Sistema Traduzioni

**Hook**: `useTranslation()` da `lib/i18n.js`

**Chiavi Aggiunte** (50+):
- `addMatch`, `recentMatches`, `noMatchesSaved`
- `result`, `matchComplete`, `missingPhotos`
- `stepPlayerRatings`, `stepTeamStats`, `stepAttackAreas`, `stepBallRecoveryZones`, `stepFormationStyle`
- `extractData`, `saveMatch`, `skip`, `saving`
- `matchNotFound`, `loadMatchError`, `updateMatchError`
- E molte altre...

**Pattern**:
```javascript
const { t } = useTranslation()
const STEPS = React.useMemo(() => [
  { id: 'player_ratings', label: t('stepPlayerRatings'), icon: '⭐' },
  ...
], [t])
```

**Fallback**:
- Se chiave mancante in lingua corrente → Usa EN
- Se chiave mancante anche in EN → Ritorna chiave stessa

---

## ⚡ Performance e Scalabilità

### Ottimizzazioni Implementate

**Frontend**:
- ✅ STEPS memoizzati con `React.useMemo(() => [...], [t])`
- ✅ Progresso wizard salvato in localStorage (evita perdita dati)
- ✅ Query dashboard limitate a 10 partite (performance)
- ✅ Mobile-first: card fuori dal grid per visibilità

**Backend**:
- ✅ Indici database per query efficienti
- ✅ RLS policies ottimizzate (filtro `user_id` esplicito)
- ✅ Normalizzazione dati (evita duplicazioni)

**Database**:
- ✅ Indice `idx_matches_user_date`: Query per utente ordinate per data
- ✅ Indice `idx_matches_photos_uploaded`: Filtra partite con dati
- ✅ Trigger `updated_at`: Aggiornamento automatico timestamp

### Scalabilità Futura

**Quando > 1.000 utenti simultanei**:
- ⚠️ Implementare queue system per estrazioni OpenAI
- ⚠️ Cache risultati estrazione (se stesso screenshot)

**Quando > 10.000 utenti simultanei**:
- ⚠️ Multiple API keys OpenAI (rotazione)
- ⚠️ Architettura distribuita (load balancing)

---

## 🔍 Troubleshooting

### Problema: "Ultime Partite" non visibile su mobile

**Sintomi**: Card non appare o è nascosta

**Soluzione**:
- ✅ Card spostata fuori dal grid layout
- ✅ Stili mobile-first con `flexWrap` e `minWidth`
- ✅ Touch feedback con `onTouchStart`/`onTouchEnd`

**Verifica**: Controllare che card sia fuori dal `div` con `display: grid`

---

### Problema: Risultato partita non estratto

**Sintomi**: Campo `result` rimane `null` anche se visibile nello screenshot

**Soluzione**:
- ✅ Risultato viene estratto da `player_ratings`, `team_stats`, o `formation_style`
- ✅ Prompt OpenAI esplicitamente chiede risultato se visibile
- ✅ Risultato estratto viene salvato in `stepData.result` e passato a `save-match`

**Verifica**: Controllare console per log `[Dashboard] Matches loaded: X`

---

### Problema: `photos_uploaded` non aggiorna dopo upload

**Sintomi**: Badge mostra numero errato dopo aggiunta sezione

**Soluzione**:
- ✅ `update-match` ricalcola metadata dopo merge
- ✅ `updateData` usa `mergedData` direttamente (non fallback a `existingMatch`)
- ✅ Frontend ricarica match dopo aggiornamento

**Verifica**: Controllare che `calculatePhotosUploaded()` usi dati merged

---

### Problema: STEPS duplicati o errori Vercel

**Sintomi**: Errori build Vercel, STEPS non definito

**Soluzione**:
- ✅ STEPS definito con `React.useMemo(() => [...], [t])` dentro componente
- ✅ Dipendenze `useEffect` includono `[STEPS]`
- ✅ Nessuna duplicazione di dichiarazioni

**Verifica**: Controllare che STEPS sia definito una sola volta per componente

---

### Problema: Traduzioni mancanti

**Sintomi**: Testi mostrano chiavi invece di traduzioni

**Soluzione**:
- ✅ Tutte le chiavi aggiunte in `lib/i18n.js` (IT e EN)
- ✅ Fallback a EN se chiave mancante in IT
- ✅ Verificare che `useTranslation()` sia chiamato correttamente

**Verifica**: Controllare console per errori traduzione

---

## 📊 Metriche e Monitoring

### Metriche da Monitorare

**Performance**:
- Tempo medio estrazione per sezione
- Tasso successo estrazione (successi/errori)
- Tempo caricamento dashboard (query matches)

**Utilizzo**:
- Numero partite salvate per utente
- Media sezioni caricate per partita
- Tasso completamento partite (complete vs partial)

**Costi**:
- Costi OpenAI per estrazione match
- Media crediti consumati per partita
- Costi per sezione (quale sezione costa di più)

---

## ✅ Checklist Implementazione

### Funzionalità Core
- [x] ✅ Wizard step-by-step (`/match/new`)
- [x] ✅ Lista ultime partite (dashboard)
- [x] ✅ Dettaglio partita (`/match/[id]`)
- [x] ✅ Completamento incrementale
- [x] ✅ Estrazione AI con identificazione cliente/avversario
- [x] ✅ Estrazione risultato partita

### API Endpoints
- [x] ✅ `POST /api/extract-match-data`
- [x] ✅ `POST /api/supabase/save-match`
- [x] ✅ `POST /api/supabase/update-match`

### Database
- [x] ✅ Tabella `matches` con schema completo
- [x] ✅ RLS policies per sicurezza
- [x] ✅ Indici per performance
- [x] ✅ Trigger per `updated_at`

### Frontend
- [x] ✅ Componenti React con hooks corretti
- [x] ✅ Persistenza progresso wizard
- [x] ✅ Mobile-first design
- [x] ✅ Error handling robusto

### Internazionalizzazione
- [x] ✅ 50+ chiavi traduzione (IT/EN)
- [x] ✅ Tutti i testi hardcoded sostituiti
- [x] ✅ STEPS memoizzati per performance

### Sicurezza
- [x] ✅ Autenticazione Bearer token
- [x] ✅ RLS policies attive
- [x] ✅ Validazione input
- [x] ✅ Filtro `user_id` esplicito

### Testing
- [ ] ⏳ Test unitari endpoint API
- [ ] ⏳ Test integrazione frontend/backend
- [ ] ⏳ Test mobile responsiveness
- [ ] ⏳ Test error handling

---

**Fine Documentazione Sezione Partite**
