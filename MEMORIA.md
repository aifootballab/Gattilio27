# MEMORIA (minima) - Contesto Progetto

## Obiettivo
Far funzionare **GPT Realtime** (voce + testo) e **caricamento Rosa tramite screenshot**, con codice **minimo, coerente e stabile**.

## Flussi da mantenere

### 1) Voice Coach (Realtime)
- UI: `components/coaching/VoiceCoachingPanel.jsx`
- Client: `services/gptRealtimeService.js`
- **Proxy**: `supabase/functions/realtime-proxy` (server-side aggiunge `Authorization` verso OpenAI)
- Tool calls: `supabase/functions/execute-function` → `supabase/functions/functions.ts`

### 2) Screenshot → Rosa
- UI: `components/rosa/ScreenshotUpload.jsx` + `PlayerDestinationSelector.jsx`
- Storage: bucket `player-screenshots`
- Processing: `supabase/functions/process-screenshot-gpt`
- Salvataggio:
  - `playerService.upsertPlayerBuild()`
  - `rosaService.addPlayerToRosaInSlot()`
  - `RosaContext.loadMainRosa()`

## Database (tabelle da mantenere)
- `players_base`, `player_builds`, `user_rosa`, `screenshot_processing_log`
- (altre tabelle presenti ok, ma non sono requisito per i flussi core)

## Note importanti
- **Non mettere OPENAI API key nel frontend**.
- Se vedi errori su `/sinergie`, sono residui di cache/prefetch: deve esserci redirect o nessun link.

