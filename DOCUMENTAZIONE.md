# Documentazione (Production) — Analizzatore Screenshot eFootball → Rosa (in memoria)

## Obiettivo
Una web app minimale che permette:

- Caricare (drag & drop) uno screenshot del profilo giocatore eFootball
- Estrarre i dati con OpenAI Vision
- Visualizzare il JSON estratto
- Inserire il giocatore in una **rosa da 21 slot** (in memoria)

> In questa fase abbiamo **2 modalità**:
> - Rosa in memoria (sempre)
> - **Salvataggio su Supabase** (opzionale) per test end-to-end

---

## Architettura (semplice)

### Frontend
- `app/page.tsx`
  - compressione client-side dell’immagine (riduce errori di payload)
  - chiamata a `POST /api/extract-player`
  - visualizzazione JSON + inserimento nello slot scelto

### Backend (Next.js API Route)
- `app/api/extract-player/route.ts`
  - riceve `imageDataUrl` (base64)
  - chiama OpenAI `POST https://api.openai.com/v1/responses`
  - forza output JSON via `text.format`
  - normalizza e ritorna `{ player }`

### Health/Env check (solo diagnostica)
- `app/api/env-check/route.ts`
  - ritorna `hasOpenaiKey` e `vercelEnv`
  - **non** espone mai la key

---

## Env vars (solo Production)

Su **Vercel → Project → Settings → Environment Variables**:

- **`OPENAI_API_KEY`** (**Production**)  
  - Deve essere presente per far funzionare `POST /api/extract-player`
  - **Non** usare `NEXT_PUBLIC_` (non deve finire nel browser)

Opzionale:
- **`OPENAI_VISION_MODEL`** (Production)  
  - Default: `gpt-4o`
  - Consigliato: lasciare default finché non sei soddisfatto della qualità.

Pulizia sicurezza (consigliata):
- Rimuovere `NEXT_PUBLIC_OPENAI_API_KEY`
- **NON rimuovere** `SUPABASE_SERVICE_ROLE_KEY` se vuoi usare il salvataggio Supabase (serve server-side).

### Env vars Supabase (per salvataggio)

Client (già su Vercel):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only (Vercel, Production):
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Endpoints

### `GET /api/env-check`
Risposta esempio:
```json
{ "ok": true, "hasOpenaiKey": true, "vercelEnv": "production" }
```

### `POST /api/extract-player`
Request:
```json
{ "imageDataUrl": "data:image/jpeg;base64,..." }
```

Response:
```json
{ "player": { ... } }
```

Error response (esempio):
```json
{ "error": "OpenAI error (...)", "openai_status": 400, "openai_body": "{...}" }
```

---

## Salvataggio su Supabase (test)

### Cosa salva
- `players_base`: upsert/insert del profilo base (nome, team, pos, ecc.) + `metadata.extracted`
- `player_builds`: build per utente anonimo + `source_data.extracted`
- `user_rosa`: crea/aggiorna rosa principale e setta lo slot (0–20)

### Endpoint

#### `POST /api/supabase/save-player`
- Auth: `Authorization: Bearer <supabase_access_token>`
- Body: `{ player, slotIndex }`

#### `POST /api/supabase/reset-my-data`
Cancella SOLO i dati del tuo utente anonimo:
- `user_rosa` (per user_id)
- `player_builds` (per user_id)
- `screenshot_processing_log` (per user_id)


## Schema JSON estratto (`player`)

Nota: se un campo non è visibile, viene impostato a `null` (o `[]` per liste).

```json
{
  "player_name": "Ronaldinho Gaúcho",
  "overall_rating": 99,
  "position": "ESA",
  "role": "Ala prolifica",
  "card_type": "Epico",
  "team": "FC Barcelona 05-06",
  "region_or_nationality": null,
  "form": "B",
  "preferred_foot": null,
  "height_cm": 182,
  "weight_kg": 80,
  "age": 26,
  "nationality": "Brasile",
  "club_name": null,
  "level_current": 31,
  "level_cap": 31,
  "progression_points": 0,
  "matches_played": 204,
  "goals": 86,
  "assists": 37,
  "boosters": [
    { "name": "Fantasis­ta", "effect": "+2" },
    { "name": "Gestione del pallone", "effect": "+1" }
  ],
  "skills": []
}
```

---

## Flusso utente (Production)

1) Apri `gattilio27.vercel.app`
2) Drag & drop screenshot
3) Click **“Estrai dati”**
4) Verifica JSON
5) Seleziona slot e click **“Inserisci”**

---

## Troubleshooting rapido

### “OPENAI_API_KEY mancante…”
- La env non è presente nel **deployment Production** oppure manca redeploy.
- Verifica con `GET /api/env-check`:
  - deve essere `hasOpenaiKey: true` e `vercelEnv: production`

### 500 “payload too large”
- Lato UI l’immagine viene compressa; se usi screenshot enormi, rifai lo screenshot o riduci la risoluzione.

### Dati mancanti (booster/skills/statistiche)
- Alcuni campi sono coperti da popup o sono su schermate diverse.
- **Best practice**: per un giocatore usare **3 screenshot**:
  - profilo base (nome/ovr/pos/altezza/peso/età)
  - schermata skills
  - schermata stats

---

## Next step (già pianificato)

Supporto “3 foto per giocatore”:
- UI: 3 upload/dragdrop
- API: invio di 3 immagini in un’unica chiamata e merge dei campi in un unico JSON.

