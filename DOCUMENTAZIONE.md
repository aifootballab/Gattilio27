# Documentazione (Production) — Analizzatore Screenshot eFootball → Rosa

## Obiettivo
Una web app che permette:

- Caricare (drag & drop) screenshot del profilo giocatore eFootball
- Estrarre i dati con OpenAI Vision
- Salvare il giocatore nella rosa personale dell'utente (Supabase)
- Visualizzare i giocatori salvati

---

## Architettura

### Frontend
- `app/page.tsx` - Homepage con upload screenshot
- `app/rosa/page.jsx` - Gestione rosa (21 slot)
- `app/my-players/page.jsx` - Lista giocatori salvati
- `app/player/[id]/page.jsx` - Dettaglio giocatore

### Backend (Next.js API Routes)
- `app/api/extract-player/route.js` - Estrazione dati da screenshot con OpenAI
- `app/api/supabase/save-player/route.js` - Salvataggio giocatore in `players`
- `app/api/supabase/get-my-players/route.js` - Recupero giocatori utente
- `app/api/supabase/update-player/route.js` - Aggiornamento giocatore
- `app/api/supabase/delete-player/route.js` - Eliminazione giocatore
- `app/api/supabase/reset-my-data/route.js` - Reset dati utente

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
- Utenti possono vedere/solo i propri giocatori (`WHERE user_id = auth.uid()`)

### Tabelle di supporto

- `playing_styles` - Stili di gioco (riferimento per `playing_style_id` in `players`)
- `screenshot_processing_log` - Log screenshot (opzionale, per tracking/debug)

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

#### `POST /api/supabase/save-player`
Salva/aggiorna un giocatore nella rosa dell'utente.

**Auth**: `Authorization: Bearer <supabase_access_token>`

**Request**:
```json
{
  "player": { ... },  // Dati giocatore estratti
  "slotIndex": 0      // Slot rosa (0-20, opzionale)
}
```

**Response**:
```json
{
  "success": true,
  "player_id": "uuid",
  "is_new": true,
  "slot_index": 0
}
```

#### `GET /api/supabase/get-my-players`
Recupera tutti i giocatori dell'utente.

**Auth**: `Authorization: Bearer <supabase_access_token>`

**Response**:
```json
{
  "players": [...],
  "count": 5
}
```

#### `PATCH /api/supabase/update-player`
Aggiorna un giocatore esistente.

**Auth**: `Authorization: Bearer <supabase_access_token>`

**Request**:
```json
{
  "playerId": "uuid",
  "updates": {
    "overall_rating": 100,
    ...
  }
}
```

#### `DELETE /api/supabase/delete-player`
Elimina un giocatore.

**Auth**: `Authorization: Bearer <supabase_access_token>`

**Query**: `?id=uuid`

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
