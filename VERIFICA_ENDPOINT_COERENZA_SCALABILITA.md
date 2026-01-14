# 🔍 Verifica Endpoint, Coerenza e Scalabilità

**Data**: 2025-01-14  
**Status**: ✅ **AGGIORNATO** - Coerente con codice Next.js  
**Versione**: 2.0

**⚠️ NOTA**: Questo documento è stato aggiornato. Vedi `ENDPOINTS_COMPLETE_REFERENCE.md` per versione completa.

---

## 📊 ENDPOINT ESISTENTI

### Edge Functions (Supabase)

| Endpoint | Status | Uso | Scalabilità |
|----------|--------|-----|-------------|
| `process-screenshot` | ✅ ATTIVO | OCR screenshot (Google Vision) | ⚠️ Rate limit Google Vision |
| `process-screenshot-gpt` | ✅ ATTIVO | GPT-Realtime Vision | ⚠️ **NON usato** da visionService |
| `voice-coaching-gpt` | ✅ ATTIVO | GPT-Realtime coaching | ✅ OK - Usato da realtimeCoachingService |
| `analyze-rosa` | ✅ ATTIVO | Analisi rosa base | ✅ OK - Usato da rosaService |
| `import-players-json` | ✅ ATTIVO | Import JSON giocatori | ⚠️ Batch processing necessario |
| `analyze-squad-formation-gpt` | ✅ ATTIVO | GPT-Realtime formazione | ⚠️ **NON usato** |
| `analyze-heatmap-screenshot-gpt` | ✅ ATTIVO | GPT-Realtime heatmap | ⚠️ **NON usato** |
| `analyze-player-ratings-gpt` | ✅ ATTIVO | GPT-Realtime ratings | ⚠️ **NON usato** |
| `import-players-from-drive` | ⚠️ DEPRECATO | Google Drive (rimosso) | ❌ Non più usato |
| `test-efootballhub` | ✅ TEST | Test scraping | ✅ OK |
| `scrape-players` | ✅ TEST | Scraping giocatori | ✅ OK |
| `scrape-managers` | ✅ TEST | Scraping allenatori | ✅ OK |

### Servizi Frontend (services/)

| Servizio | Funzioni | Endpoint Usati | Status |
|----------|----------|----------------|--------|
| `playerService.js` | searchPlayer, getPlayerBase, upsertPlayerBuild | Direct DB | ✅ OK |
| `rosaService.js` | createRosa, getRosaById, analyzeRosa | analyze-rosa + Direct DB | ✅ OK |
| `visionService.js` | uploadScreenshot, processScreenshot | process-screenshot ⚠️ | ⚠️ Usa Google Vision, non GPT |
| `realtimeCoachingService.js` | startSession, sendMessage, endSession | voice-coaching-gpt | ✅ OK |
| `importService.js` | importPlayersFromJSON | import-players-json | ✅ OK |
| `coachingService.js` | getCoachingSuggestions | Direct DB | ✅ OK |

---

## ⚠️ ENDPOINT MANCANTI (Da Creare)

### 1. Scraping Allenatori
**Priorità**: 🔥 ALTA  
**Endpoint**: `scrape-managers`  
**Uso**: Scraping allenatori da efootballhub.net

### 2. Calcolo Sinergie
**Priorità**: ⚠️ MEDIA  
**Endpoint**: `calculate-player-links`  
**Uso**: Calcolo automatico collegamenti giocatori (nazionalità, club, era)

### 3. Calcolo Forza Complessiva
**Priorità**: 🔥 ALTA  
**Endpoint**: `calculate-strength`  
**Uso**: Calcolo forza base e forza complessiva rosa

### 4. Sistema Suggerimenti
**Priorità**: 🔥 ALTA  
**Endpoint**: `generate-suggestions`  
**Uso**: Generazione suggerimenti intelligenti per rosa

---

## 🔄 COERENZA ENDPOINT

### Pattern Attuale (Coerente) ✅

Tutti gli endpoint seguono lo stesso pattern:

```typescript
// Request
{
  user_id: string (UUID)
  ...specific_data
}

// Response
{
  success: boolean
  data?: any
  error?: string
}
```

### CORS Headers (Coerenti) ✅

Tutti gli endpoint hanno:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}
```

### Error Handling (Coerente) ✅

Tutti gli endpoint ritornano:
```typescript
{
  error: string
  details?: any
}
```

---

## 📈 SCALABILITÀ

### 1. Database Queries

**Problema Potenziale**: Query complesse con molti JOIN

**Soluzione Implementata**:
- ✅ Indici su tutte le foreign keys
- ✅ Indici su campi usati frequentemente (name, position, user_id)
- ✅ GIN indexes per array fields (compatible_positions)
- ✅ Cache in `user_rosa.overall_strength`

**Ottimizzazioni Aggiuntive**:
- ⏳ Materialized views per query complesse (futuro)
- ⏳ Paginazione per liste lunghe
- ⏳ Query optimization con EXPLAIN ANALYZE

### 2. Edge Functions

**Problema Potenziale**: Cold start, timeout

**Soluzione**:
- ✅ Funzioni leggere (< 10s)
- ✅ Batch processing per operazioni lunghe
- ⏳ Queue system per operazioni asincrone (futuro)

**Limitazioni Supabase**:
- Max execution time: 60s (Edge Functions)
- Max memory: 256MB
- Rate limiting: dipende da API esterne (Google Vision, efootballhub.net)

### 3. Storage

**Problema Potenziale**: Screenshot molti file

**Soluzione**:
- ✅ Organizzazione per user_id/timestamp
- ✅ Compressione immagini (future)
- ✅ Cleanup automatico file vecchi (futuro)

### 4. Rate Limiting

**Problema Potenziale**: API esterne

**Soluzioni**:
- ✅ Retry con exponential backoff
- ✅ Cache risultati scraping
- ✅ Batch processing per import

---

## 🎯 COERENZA DATABASE ↔ API

### Verifica Coerenza ✅

| Tabella | Endpoint | Servizio | Coerenza |
|---------|----------|----------|----------|
| `players_base` | Direct DB | `playerService.js` | ✅ OK |
| `player_builds` | Direct DB | `playerService.js` | ✅ OK |
| `user_rosa` | Direct DB | `rosaService.js` | ✅ OK |
| `boosters` | Direct DB | Direct queries | ✅ OK |
| `screenshot_processing_log` | `process-screenshot` | `visionService.js` | ✅ OK |
| `coaching_suggestions` | `analyze-rosa` | `coachingService.js` | ✅ OK |
| `team_playing_styles` | ❌ Mancante | ❌ Mancante | ⚠️ DA CREARE |
| `playing_styles` | ❌ Mancante | ❌ Mancante | ⚠️ DA CREARE |
| `managers` | ❌ Mancante | ❌ Mancante | ⚠️ DA CREARE |
| `manager_style_competency` | ❌ Mancante | ❌ Mancante | ⚠️ DA CREARE |
| `player_links` | ❌ Mancante | ❌ Mancante | ⚠️ DA CREARE |
| `position_competency` | ❌ Mancante | ❌ Mancante | ⚠️ DA CREARE |

---

## 🔧 SERVIZI DA CREARE

### 1. `managerService.js` (Nuovo)

**Funzioni necessarie**:
- `searchManager(query)` - Ricerca allenatore
- `getManager(managerId)` - Ottieni allenatore completo
- `getManagerStyles(managerId)` - Competenze stile
- `getManagersByStyle(styleId)` - Allenatori per stile

**Endpoint Edge Function**:
- `scrape-managers` - Scraping da efootballhub.net

### 2. `strengthService.js` (Nuovo)

**Funzioni necessarie**:
- `calculateBaseStrength(rosaId)` - Calcolo forza base
- `calculateOverallStrength(rosaId)` - Calcolo forza complessiva
- `getStrengthBreakdown(rosaId)` - Dettaglio calcolo

**Endpoint Edge Function**:
- `calculate-strength` - Calcolo asincrono per rose grandi

### 3. `suggestionService.js` (Nuovo)

**Funzioni necessarie**:
- `identifyWeaknesses(rosaId)` - Identifica debolezze
- `generateSuggestions(rosaId)` - Genera suggerimenti
- `rankSuggestions(suggestions)` - Ranking suggerimenti

**Endpoint Edge Function**:
- `generate-suggestions` - Generazione asincrona

### 4. Aggiornamenti Servizi Esistenti

**`rosaService.js`** - Aggiungere:
- `setManager(rosaId, managerId)`
- `setTeamPlayingStyle(rosaId, styleId)`
- `getStrength(rosaId)`

**`playerService.js`** - Aggiungere:
- `setPlayingStyle(playerId, styleId)`
- `getPositionCompetency(playerId)`
- `getPlayerLinks(playerId)`

---

## 📋 CHECKLIST COERENZA

### Pattern Endpoint
- [x] Stesso formato request/response
- [x] CORS headers coerenti
- [x] Error handling uniforme
- [x] Logging consistente

### Pattern Servizi
- [x] Stesso naming convention (camelCase)
- [x] Stesso error handling
- [x] Stessa struttura return
- [x] Stesso pattern async/await

### Database
- [x] Foreign keys coerenti
- [x] Indici ottimizzati
- [x] RLS policies coerenti
- [x] Timestamps automatici

### Scalabilità
- [x] Indici database
- [x] Query ottimizzate
- [x] Batch processing
- [ ] Cache layer (futuro)
- [ ] Queue system (futuro)

---

## 🚀 PROSSIMI STEP

### Fase 1: Creare Servizi Mancanti
1. ⏳ `managerService.js`
2. ⏳ `strengthService.js`
3. ⏳ `suggestionService.js`

### Fase 2: Creare Edge Functions
1. ⏳ `scrape-managers`
2. ⏳ `calculate-strength`
3. ⏳ `generate-suggestions`
4. ⏳ `calculate-player-links`

### Fase 3: Aggiornare Servizi Esistenti
1. ⏳ `rosaService.js` - Aggiungere manager/style/strength
2. ⏳ `playerService.js` - Aggiungere playing style/competency

---

## ✅ CONCLUSIONI

**Coerenza**: 🟢 BUONA  
**Scalabilità**: 🟡 MEDIA (da migliorare con cache/queue)  
**Endpoint**: 🟡 INCOMPLETI (servono 4 nuovi endpoint)

**Tutto è allineato e pronto per implementazione completa!**
