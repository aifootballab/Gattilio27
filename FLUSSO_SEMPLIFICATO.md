# Flusso Semplificato - eFootball AI Coach

## Obiettivo
**Solo**: Carica screenshot → Estrai dati → Salva giocatore associato al cliente

## Architettura Finale

### 1. Upload Screenshot
**File**: `app/rosa/page.jsx`

- Utente carica 1-6 screenshot (drag & drop o file picker)
- Screenshot convertiti in `dataUrl` (base64) - **IN MEMORIA SOLO, NON salvati**
- Massimo 6 screenshot contemporaneamente
- Compressione automatica (max 1200px, qualità 0.88)

### 2. Estrazione Dati
**API**: `POST /api/extract-batch`

**File**: `app/api/extract-batch/route.js`

- Riceve array di immagini (`imageDataUrl`) - fino a 6 screenshot anche di giocatori diversi
- **Fase 1 - Classificazione**: Per ogni screenshot capisce QUALE giocatore è (nome, OVR, posizione)
- **Fase 2 - Raggruppamento**: Raggruppa screenshot dello STESSO giocatore insieme
  - Esempio: 3 screenshot di Messi + 2 di Ronaldo → 2 gruppi (Messi con 3 immagini, Ronaldo con 2)
- **Fase 3 - Estrazione**: Per ogni gruppo, estrae dati da TUTTI gli screenshot del gruppo
  - Esempio: Messi → estrae nome/posizione da screenshot 1, skills da screenshot 2, stats da screenshot 3
- **Fase 4 - Merge**: Unisce tutti i dati estratti in UN SOLO giocatore completo
- Restituisce array di `groups` (ogni gruppo = un giocatore con dati combinati)

### 3. Salvataggio Giocatore
**API**: `POST /api/supabase/save-player`

**File**: `app/api/supabase/save-player/route.js`

- Riceve `player` object (dati estratti)
- Valida token JWT (Bearer)
- Estrae `user_id` dal token
- **Salva SEMPRE come nuovo record** (permetti doppi)
- Insert in tabella `players` con:
  - `user_id` (FK a `auth.users`)
  - `player_name`, `position`, `overall_rating`, etc.
  - `base_stats` (JSONB)
  - `skills`, `com_skills` (TEXT[])
  - `slot_index` = `null` sempre (non gestiamo posizionamento nella rosa)
  - `extracted_data` (JSONB completo)

## Database Supabase

### Tabelle Essenziali

#### `players`
- `id` (UUID, PK)
- `user_id` (UUID, FK → `auth.users`)
- `player_name`, `position`, `team`, `overall_rating`
- `base_stats` (JSONB)
- `skills`, `com_skills` (TEXT[])
- `slot_index` (INTEGER, sempre `null`)
- `extracted_data` (JSONB)
- `metadata` (JSONB)
- `created_at`, `updated_at`

**RLS**: Utenti vedono solo i propri giocatori (`WHERE user_id = auth.uid()`)

#### `playing_styles`
- Tabella di riferimento per `playing_style_id` in `players`
- 21 righe (stili predefiniti)
- Non modificata dal flusso principale

### Trigger e Funzioni

#### `update_players_updated_at`
- **Trigger**: `UPDATE` su tabella `players`
- **Funzione**: `update_updated_at_column()`
- **Scopo**: Aggiorna automaticamente `updated_at` quando un record viene modificato
- **Stato**: ✅ OK - funzionalità base utile

### Tabelle Rimosse

- ❌ `screenshot_processing_log` - **ELIMINATA** (non usata)

## Flusso Completo

```
1. Utente → /rosa
   ↓
2. Upload 1-6 screenshot (memoria temporanea, dataUrl)
   ↓
3. Click "Analizza" → POST /api/extract-batch
   ↓
4. extract-batch → chiama extract-player per ogni immagine
   ↓
5. extract-player → OpenAI Vision API → JSON dati
   ↓
6. extract-batch → raggruppa + merge dati → groups[]
   ↓
7. Frontend mostra groups (anteprima)
   ↓
8. Utente click "Salva" su un gruppo
   ↓
9. POST /api/supabase/save-player (player object + Bearer token)
   ↓
10. save-player → valida token → estrae user_id → INSERT in players
   ↓
11. ✅ Giocatore salvato con user_id associato
```

## Endpoint API

### `POST /api/extract-batch`
- **Input**: `{ images: [{ id, imageDataUrl }] }`
- **Output**: `{ groups: [{ group_id, label, player, completeness }] }`
- **Funzione**: Estrae e raggruppa dati da screenshot

### `POST /api/extract-player`
- **Input**: `{ imageDataUrl }`
- **Output**: `{ player: {...} }`
- **Funzione**: Estrae dati da un singolo screenshot con OpenAI Vision

### `POST /api/supabase/save-player`
- **Input**: `{ player: {...} }` + Header `Authorization: Bearer <token>`
- **Output**: `{ success: true, player_id: <uuid> }`
- **Funzione**: Salva giocatore in `players` con `user_id` dal token

## Note Importanti

### Screenshot
- **NON salvati** su storage (S3, Supabase Storage, etc.)
- **Solo in memoria** durante elaborazione (dataUrl base64)
- Eliminati dopo salvataggio/refresh

### Raggruppamento Screenshot

**Cosa significa "raggruppa screenshot dello stesso giocatore"?**

Esempio pratico:
- Carichi 6 screenshot: 3 di Messi (profilo, skills, stats) + 2 di Ronaldo (profilo, stats) + 1 di Mbappé
- Il sistema analizza ogni screenshot e capisce:
  - Screenshot 1, 2, 3 = Messi
  - Screenshot 4, 5 = Ronaldo  
  - Screenshot 6 = Mbappé
- Raggruppa insieme gli screenshot dello stesso giocatore
- Poi per ogni gruppo estrae dati da TUTTI gli screenshot del gruppo e li unisce:
  - **Messi**: nome/posizione da screenshot 1, skills da screenshot 2, stats da screenshot 3 → giocatore Messi completo
  - **Ronaldo**: nome da screenshot 4, stats da screenshot 5 → giocatore Ronaldo completo
  - **Mbappé**: tutti i dati da screenshot 6 → giocatore Mbappé completo
- Risultato: 3 gruppi → 3 giocatori (ogni giocatore ha dati combinati da più screenshot)

**Vantaggio**: Puoi caricare screenshot di parti diverse dello stesso giocatore (profilo, skills, stats, boosters) e il sistema li unisce automaticamente in un giocatore completo.

### Slot Index e Rosa

**Cosa significa "non gestiamo rosa con slot"?**

In eFootball puoi avere una "rosa" con massimo 21 giocatori (slot 0, 1, 2... fino a 20).

**Prima (sistema complesso)**:
- Puoi scegliere "salva questo giocatore nello slot 5 della rosa"
- Se lo slot 5 era occupato, il sistema svuotava lo slot prima
- C'era limite di 21 giocatori nella rosa

**Ora (sistema semplificato)**:
- `slot_index` è SEMPRE `null` (nessun posizionamento)
- Puoi salvare INFINITI giocatori (nessun limite di 21)
- Ogni giocatore è salvato come record separato, senza "posizione nella rosa"
- Non c'è gestione di "questo slot è occupato", "svuota questo slot"

**Esempio**: Salvi Messi 10 volte → hai 10 record Messi diversi nel database, tutti con `slot_index = null`

### Duplicati
- **Permessi**: Stesso nome giocatore può essere salvato più volte
- Ogni salvataggio crea nuovo record con `id` unico
- Nessun limite: puoi salvare infiniti giocatori (anche 100 Messi)

### Associazione Cliente
- Ogni giocatore ha `user_id` (FK a `auth.users`)
- RLS garantisce isolamento dati per utente
- Token JWT valida identità utente

## Stato Database

```
players: 0 righe (vuoto, pronto per nuovi giocatori)
playing_styles: 21 righe (riferimento, immutabile)
screenshot_processing_log: ELIMINATA
```

## Trigger/Funzioni Attivi

- ✅ `update_players_updated_at` (aggiorna `updated_at` automaticamente)
