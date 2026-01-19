# Documentazione (Production) — Analizzatore Screenshot eFootball → Rosa

## Obiettivo
Una web app che permette:

- Caricare (drag & drop) 1-6 screenshot del profilo giocatore eFootball
- Estrarre i dati con OpenAI Vision (raggruppa screenshot stesso giocatore)
- Salvare il giocatore nella rosa personale dell'utente (Supabase)
- Salvataggio sempre come nuovo record (permetti doppi, nessun limite)

---

## Architettura

### Frontend
- `app/page.jsx` - Homepage (redirect a `/login`)
- `app/login/page.jsx` - Autenticazione Supabase
- `app/upload/page.jsx` - Upload screenshot e estrazione dati (1-3 screenshot)
- `app/lista-giocatori/page.jsx` - Lista giocatori salvati (query dirette Supabase con RLS)

### Backend (Next.js API Routes)
- `app/api/extract-player/route.js` - Estrazione dati da singolo screenshot con OpenAI
- `app/api/supabase/save-player/route.js` - Salvataggio giocatore (logica business: lookup playing_style)

**Note Architettura:**
- Frontend usa **query dirette Supabase** con RLS per lettura giocatori (scalabile, sicuro)
- Backend API routes solo per operazioni con logica business (`save-player` ha lookup playing_style)

---

## Database Supabase

### Tabella `players` (principale)

Ogni utente ha la sua rosa personale salvata in Supabase.

**Campi principali**:
- `id` - UUID primario
- `user_id` - FK a `auth.users` (proprietario)
- `player_name`, `position`, `team`, `overall_rating` - Dati base
- `base_stats` (JSONB) - Statistiche complete
- `skills`, `com_skills` (TEXT[]) - Skills giocatore
- `height`, `weight`, `age`, `nationality` - Dati fisici
- `current_level`, `level_cap`, `active_booster_name` - Build
- `slot_index` (INTEGER, 0-20) - Posizione nella rosa (null = non in rosa)
- `metadata`, `extracted_data` (JSONB) - Dati completi estratti
- `created_at`, `updated_at` - Timestamps

**RLS (Row Level Security)**:
- Policy: "Users can view own players" (`WHERE user_id = auth.uid()`)
- Frontend usa query dirette Supabase: RLS filtra automaticamente per utente autenticato
- Sicuro: anon key esposta ma RLS protegge i dati

### Tabelle di supporto

- `playing_styles` - Stili di gioco (riferimento per `playing_style_id` in `players`)

---

## Endpoints API

### Estrazione Dati

#### `POST /api/extract-player`
Estrae dati da screenshot con OpenAI Vision.

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
    "team": "FC Barcelona 05-06",
    "base_stats": { ... },
    "skills": [...],
    ...
  }
}
```

---

### Operazioni Database

#### Lettura Giocatori (Query Dirette Frontend)

**Frontend** (`app/lista-giocatori/page.jsx`):
```javascript
// Query diretta Supabase - RLS filtra automaticamente per auth.uid()
const { data: players, error } = await supabase
  .from('players')
  .select('*')
  .order('created_at', { ascending: false })
// RLS policy garantisce che l'utente vede solo i propri giocatori
```

**Vantaggi:**
- ✅ Scalabile: PostgreSQL filtra nel DB (indice su `user_id`)
- ✅ Sicuro: RLS protegge i dati automaticamente
- ✅ Performante: query filtrata nel database (non carica tutti i record)

#### `POST /api/supabase/save-player`
Salva sempre come nuovo record (permetti doppi, nessun limite).

**Auth**: `Authorization: Bearer <supabase_access_token>`

**Request**:
```json
{
  "player": { ... }  // Dati giocatore estratti (solo player, nessun slotIndex)
}
```

**Response**:
```json
{
  "success": true,
  "player_id": "uuid",
  "is_new": true
}
```

**Nota**: `slot_index` è sempre `null` (non gestiamo rosa con slot).

#### `POST /api/supabase/reset-my-data`
Cancella tutti i giocatori dell'utente.

**Auth**: `Authorization: Bearer <supabase_access_token>`

**Response**:
```json
{
  "success": true,
  "deleted_count": 5
}
```

---

## Environment Variables

### Vercel Production

**OpenAI**:
- `OPENAI_API_KEY` - API key OpenAI (server-only)

**Supabase**:
- `NEXT_PUBLIC_SUPABASE_URL` - URL progetto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key (publishable)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only)

---

## Flusso Utente

1. **Login** → Autenticazione con Supabase Auth
2. **Carica Screenshot** → `/rosa` → Drag & drop immagine
3. **Estrazione** → Chiamata a `POST /api/extract-player` → Visualizzazione JSON
4. **Salvataggio** → Selezione slot (0-20) → `POST /api/supabase/save-player` → Salva in `players`
5. **Visualizzazione** → `/my-players` → `GET /api/supabase/get-my-players` → Mostra rosa

---

## Schema JSON Estratto

Esempio completo di dati estratti da screenshot:

```json
{
  "player_name": "Ronaldinho Gaúcho",
  "overall_rating": 99,
  "position": "ESA",
  "role": "Ala prolifica",
  "card_type": "Epico",
  "team": "FC Barcelona 05-06",
  "nationality": "Brasile",
  "height_cm": 182,
  "weight_kg": 80,
  "age": 26,
  "form": "B",
  "level_current": 31,
  "level_cap": 31,
  "base_stats": {
    "attacking": { ... },
    "defending": { ... },
    "athleticism": { ... }
  },
  "skills": [...],
  "com_skills": [...],
  "boosters": [
    { "name": "Fantasista", "effect": "+2" }
  ]
}
```

---

## Troubleshooting

### "OPENAI_API_KEY mancante..."
- Verifica env vars su Vercel → Settings → Environment Variables
- Redeploy dopo aver aggiunto le variabili

### "500 payload too large"
- L'immagine viene compressa lato client
- Se persiste, riduci risoluzione screenshot

### Dati mancanti (booster/skills/stats)
- Alcuni campi sono su schermate diverse in eFootball
- **Best practice**: usa più screenshot per giocatore completo

---

**App pronta per produzione!** 🚀
