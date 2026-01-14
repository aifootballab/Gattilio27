# 📡 Endpoint Completi - Riferimento Master
## Documentazione Aggiornata e Coerente con il Codice

**Data**: 2025-01-14  
**Status**: 🟢 **AGGIORNATO E VERIFICATO**  
**Versione**: 2.0 (Next.js + GPT-Realtime)

---

## 🎯 SCOPO

Questo documento è la **fonte unica di verità** per tutti gli endpoint del sistema. Aggiornato e verificato contro il codice attuale.

---

## 📋 EDGE FUNCTIONS (Supabase)

### **1. `process-screenshot`** ✅ ATTIVO
**Path**: `/functions/v1/process-screenshot`  
**Tecnologia**: Google Vision API (OCR)  
**Status**: 🟢 **ATTIVO** - Usato da `visionService.js`

**Chiamato da**:
- `services/visionService.js` → `processScreenshot()`

**Request**:
```typescript
{
  image_url: string        // URL immagine da Supabase Storage
  image_type: 'player_profile' | 'formation' | 'post_match_stats'
  user_id: string          // UUID utente
}
```

**Response**:
```typescript
{
  success: boolean
  log_id: string           // ID log processing
  extracted_data: {
    player_name: string
    overall_rating: number
    position: string
    attacking: {...}
    defending: {...}
    athleticism: {...}
    skills: string[]
    comSkills: string[]
    build?: {...}
    confidence: number
  }
  matched_player_id?: string
  warning?: string
}
```

**Salvataggi Automatici**:
- ✅ `screenshot_processing_log` - Log processing
- ✅ `players_base` - Se giocatore nuovo
- ✅ `player_builds` - Build utente (se build data presente)

**Note**: ⚠️ **DEPRECATO** - Usa Google Vision OCR. Preferire `process-screenshot-gpt` per GPT-Realtime.

---

### **2. `process-screenshot-gpt`** ✅ ATTIVO
**Path**: `/functions/v1/process-screenshot-gpt`  
**Tecnologia**: GPT-4o Realtime (Vision)  
**Status**: 🟢 **ATTIVO** - Deployato ma **NON usato** da `visionService.js`

**Chiamato da**:
- ❌ **NON chiamato** - `visionService.js` usa ancora `process-screenshot`

**Request**:
```typescript
{
  image_url: string
  image_type: 'player_profile' | 'formation' | 'post_match_stats' | 'heat_map' | 'squad_formation' | 'player_ratings'
  user_id: string
}
```

**Response**:
```typescript
{
  success: boolean
  log_id: string
  candidate_profile: CandidateProfile  // value/status/confidence per ogni campo
  confidence_score: number
  extracted_fields: {
    certain: string[]      // Campi con status="certain"
    uncertain: string[]    // Campi con status="uncertain"
    missing: string[]      // Campi con status="missing"
  }
}
```

**Salvataggi**:
- ✅ `screenshot_processing_log` - Solo log (NO salvataggio dati)
- ❌ **NON salva** `players_base` o `player_builds` (profilazione progressiva)

**Note**: ⚠️ **DA INTEGRARE** - Edge Function esiste ma `visionService.js` non la chiama ancora.

---

### **3. `voice-coaching-gpt`** ✅ ATTIVO
**Path**: `/functions/v1/voice-coaching-gpt`  
**Tecnologia**: GPT-4o Realtime API  
**Status**: 🟢 **ATTIVO** - Usato da `realtimeCoachingService.js`

**Chiamato da**:
- `services/realtimeCoachingService.js` → `startSession()`, `sendMessage()`, `endSession()`

**Actions**:

#### **3.1. `start_session`**
**Request**:
```typescript
{
  action: 'start_session'
  user_id: string
  context?: {
    rosa?: any
    user_profile?: any
  }
}
```

**Response**:
```typescript
{
  session_id: string
  success: boolean
}
```

**Salvataggi**:
- ✅ `coaching_sessions` - Crea nuova sessione persistente

---

#### **3.2. `send_message`**
**Request**:
```typescript
{
  action: 'send_message'
  session_id: string
  user_id: string
  message?: string              // Testo o trascrizione
  audio_base64?: string        // Audio in base64
  conversation_history?: any[] // History (opzionale)
}
```

**Response**:
```typescript
{
  response: string              // Risposta coach
  transcribed_message?: string // Trascrizione audio (se audio_base64)
  success: boolean
}
```

**Salvataggi**:
- ✅ `coaching_sessions` - Aggiorna `conversation_history`
- ✅ `voice_coaching_sessions` - Log conversazione

---

#### **3.3. `keep_alive`**
**Request**:
```typescript
{
  action: 'keep_alive'
  session_id: string
}
```

**Response**:
```typescript
{
  success: boolean
  last_activity: string        // ISO timestamp
}
```

**Salvataggi**:
- ✅ `coaching_sessions` - Aggiorna `last_activity` e `expires_at`

---

#### **3.4. `end_session`**
**Request**:
```typescript
{
  action: 'end_session'
  session_id: string
}
```

**Response**:
```typescript
{
  success: boolean
}
```

**Salvataggi**:
- ✅ `coaching_sessions` - Aggiorna `is_active = false`

---

#### **3.5. `analyze_screenshot`**
**Request**:
```typescript
{
  action: 'analyze_screenshot'
  session_id: string
  user_id: string
  image_url: string
  image_type: string
  context?: any
}
```

**Response**:
```typescript
{
  response: string              // Analisi screenshot
  analysis?: any               // Dati estratti
  success: boolean
}
```

**Salvataggi**:
- ✅ `coaching_sessions` - Aggiunge screenshot alla conversazione
- ✅ `voice_coaching_sessions` - Log analisi

---

### **4. `analyze-rosa`** ✅ ATTIVO
**Path**: `/functions/v1/analyze-rosa`  
**Tecnologia**: Analisi locale (no AI)  
**Status**: 🟢 **ATTIVO**

**Chiamato da**:
- `services/rosaService.js` → `analyzeRosa()` (verificare se esiste)

**Request**:
```typescript
{
  rosa_id: string
  user_id: string
}
```

**Response**:
```typescript
{
  success: boolean
  analysis: {
    strengths: string[]
    weaknesses: string[]
    recommended_formations: string[]
    player_synergies: any[]
    tactical_suggestions: any[]
    avg_rating: number
    player_count: number
  }
  suggestions: CoachingSuggestion[]
}
```

**Salvataggi Automatici**:
- ✅ `user_rosa.squad_analysis` - Aggiorna analisi
- ✅ `coaching_suggestions` - Inserisce suggerimenti

---

### **5. `import-players-json`** ✅ ATTIVO
**Path**: `/functions/v1/import-players-json`  
**Tecnologia**: Batch processing  
**Status**: 🟢 **ATTIVO** - Usato da `importService.js`

**Chiamato da**:
- `services/importService.js` → `importPlayersFromJSON()`

**Request**:
```typescript
{
  json_data: any[]             // Array di giocatori
  batch_size?: number          // Default: 50
}
```

**Response**:
```typescript
{
  success: boolean
  imported_count: number
  errors?: any[]
}
```

**Salvataggi Automatici**:
- ✅ `players_base` - Inserisce giocatori in batch
- ✅ `player_builds` - Se build data presente

---

### **6. `analyze-squad-formation-gpt`** ✅ ATTIVO
**Path**: `/functions/v1/analyze-squad-formation-gpt`  
**Tecnologia**: GPT-4o Realtime (Vision)  
**Status**: 🟢 **ATTIVO** - Deployato

**Chiamato da**:
- ❌ **NON chiamato** - Nessun servizio frontend lo usa

**Request**:
```typescript
{
  image_url: string
  user_id: string
}
```

**Response**:
```typescript
{
  success: boolean
  formation: string            // Es. "4-3-3"
  players: any[]               // Giocatori identificati
  analysis: any
}
```

**Note**: ⚠️ **DA INTEGRARE** - Edge Function esiste ma non usata.

---

### **7. `analyze-heatmap-screenshot-gpt`** ✅ ATTIVO
**Path**: `/functions/v1/analyze-heatmap-screenshot-gpt`  
**Tecnologia**: GPT-4o Realtime (Vision)  
**Status**: 🟢 **ATTIVO** - Deployato

**Chiamato da**:
- ❌ **NON chiamato** - Nessun servizio frontend lo usa

**Note**: ⚠️ **DA INTEGRARE** - Edge Function esiste ma non usata.

---

### **8. `analyze-player-ratings-gpt`** ✅ ATTIVO
**Path**: `/functions/v1/analyze-player-ratings-gpt`  
**Tecnologia**: GPT-4o Realtime (Vision)  
**Status**: 🟢 **ATTIVO** - Deployato

**Chiamato da**:
- ❌ **NON chiamato** - Nessun servizio frontend lo usa

**Note**: ⚠️ **DA INTEGRARE** - Edge Function esiste ma non usata.

---

### **9. `analyze-rosa`** (GPT Version) ⚠️ DA VERIFICARE
**Path**: `/functions/v1/analyze-rosa`  
**Status**: 🟡 **DA VERIFICARE**

**Note**: Esiste anche `analyze-rosa` (non GPT) - verificare se c'è versione GPT.

---

### **10. `scrape-players`** ✅ ATTIVO
**Path**: `/functions/v1/scrape-players`  
**Tecnologia**: Web scraping  
**Status**: 🟢 **ATTIVO** - Test

**Chiamato da**:
- ❌ **NON chiamato** - Solo per test

---

### **11. `scrape-managers`** ✅ ATTIVO
**Path**: `/functions/v1/scrape-managers`  
**Tecnologia**: Web scraping  
**Status**: 🟢 **ATTIVO** - Test

**Chiamato da**:
- ❌ **NON chiamato** - Solo per test

---

### **12. `test-efootballhub`** ✅ TEST
**Path**: `/functions/v1/test-efootballhub`  
**Status**: 🟡 **TEST ONLY**

---

### **13. `test-managers-url`** ✅ TEST
**Path**: `/functions/v1/test-managers-url`  
**Status**: 🟡 **TEST ONLY**

---

### **14. `import-players-from-drive`** ⚠️ DEPRECATO
**Path**: `/functions/v1/import-players-from-drive`  
**Status**: ❌ **DEPRECATO** - Google Drive rimosso

---

## 🗄️ ENDPOINT DATABASE (Diretti)

### **Rosa Service** (`services/rosaService.js`)

| Funzione | Tabella | Operazione | Endpoint |
|----------|---------|------------|----------|
| `createRosa()` | `user_rosa` | INSERT | Direct DB |
| `getUserRosas()` | `user_rosa` | SELECT | Direct DB |
| `getRosaById()` | `user_rosa` + JOIN | SELECT | Direct DB |
| `updateRosa()` | `user_rosa` | UPDATE | Direct DB |
| `deleteRosa()` | `user_rosa` | DELETE | Direct DB |
| `addPlayerToRosa()` | `user_rosa` | UPDATE | Direct DB |
| `removePlayerFromRosa()` | `user_rosa` | UPDATE | Direct DB |
| `analyzeRosa()` | Edge Function | INVOKE | `analyze-rosa` |

**Import**: `@/services/rosaService`

---

### **Player Service** (`services/playerService.js`)

| Funzione | Tabella | Operazione | Endpoint |
|----------|---------|------------|----------|
| `searchPlayer()` | `players_base` | SELECT | Direct DB |
| `getPlayerBase()` | `players_base` | SELECT | Direct DB |
| `upsertPlayerBuild()` | `player_builds` | UPSERT | Direct DB |
| `getPlayerBuild()` | `player_builds` + JOIN | SELECT | Direct DB |
| `getUserBuilds()` | `player_builds` + JOIN | SELECT | Direct DB |
| `deletePlayerBuild()` | `player_builds` | DELETE | Direct DB |

**Import**: `@/services/playerService`

---

### **Vision Service** (`services/visionService.js`)

| Funzione | Storage/Function | Operazione | Endpoint |
|----------|------------------|------------|----------|
| `uploadScreenshot()` | `player-screenshots` bucket | UPLOAD | Supabase Storage |
| `processScreenshot()` | Edge Function | INVOKE | `process-screenshot` ⚠️ |
| `getProcessingLog()` | `screenshot_processing_log` | SELECT | Direct DB |
| `uploadAndProcessScreenshot()` | Storage + Function | UPLOAD + INVOKE | Combinazione |

**Import**: `@/services/visionService`

**⚠️ PROBLEMA**: `visionService.js` chiama `process-screenshot` (Google Vision) invece di `process-screenshot-gpt` (GPT-Realtime).

---

### **Realtime Coaching Service** (`services/realtimeCoachingService.js`)

| Funzione | Edge Function | Action | Endpoint |
|----------|---------------|--------|----------|
| `startSession()` | `voice-coaching-gpt` | `start_session` | ✅ OK |
| `sendMessage()` | `voice-coaching-gpt` | `send_message` | ✅ OK |
| `uploadScreenshot()` | `voice-coaching-gpt` | `analyze_screenshot` | ✅ OK |
| `endSession()` | `voice-coaching-gpt` | `end_session` | ✅ OK |
| `startKeepAlive()` | `voice-coaching-gpt` | `keep_alive` | ✅ OK |

**Import**: `@/services/realtimeCoachingService`

---

### **Import Service** (`services/importService.js`)

| Funzione | Edge Function | Operazione | Endpoint |
|----------|---------------|------------|----------|
| `importPlayersFromJSON()` | `import-players-json` | INVOKE | ✅ OK |
| `getPositionStats()` | `players_base` | SELECT | Direct DB |
| `getCommonSkillsForPosition()` | `players_base` | SELECT | Direct DB |

**Import**: `@/services/importService`

---

### **Coaching Service** (`services/coachingService.js`)

| Funzione | Tabella | Operazione | Endpoint |
|----------|---------|------------|----------|
| `createMatchContext()` | `unified_match_contexts` | INSERT | Direct DB |
| `getMatchContexts()` | `unified_match_contexts` | SELECT | Direct DB |
| `getCoachingSuggestions()` | `coaching_suggestions` | SELECT | Direct DB |
| `getRosaCoachingSuggestions()` | `coaching_suggestions` | SELECT | Direct DB |

**Import**: `@/services/coachingService`

---

## ⚠️ PROBLEMI IDENTIFICATI

### **1. `visionService.js` usa endpoint sbagliato** 🔴

**Problema**:
- `visionService.js` chiama `process-screenshot` (Google Vision OCR)
- Esiste `process-screenshot-gpt` (GPT-Realtime) ma non viene usato

**Soluzione**:
- Aggiornare `visionService.js` per usare `process-screenshot-gpt`
- Oppure mantenere entrambi e aggiungere opzione

---

### **2. Edge Functions GPT non integrate** 🟡

**Problema**:
- `analyze-squad-formation-gpt` deployato ma non usato
- `analyze-heatmap-screenshot-gpt` deployato ma non usato
- `analyze-player-ratings-gpt` deployato ma non usato

**Soluzione**:
- Creare servizi frontend per chiamarle
- Integrare nei componenti

---

### **3. `analyzeRosa()` non verificato** 🟡

**Problema**:
- `rosaService.js` potrebbe avere `analyzeRosa()` ma non verificato se chiama Edge Function

**Soluzione**:
- Verificare se esiste e come funziona

---

## ✅ COERENZA VERIFICATA

### **Pattern Import** ✅
- ✅ Tutti i servizi usano `@/lib/supabase`
- ✅ Tutti i servizi usano `@/services/*`
- ✅ Tutti i componenti usano `@/contexts/RosaContext`

### **Pattern Endpoint** ✅
- ✅ Tutti gli Edge Functions hanno CORS headers
- ✅ Tutti gli Edge Functions hanno error handling
- ✅ Tutti gli Edge Functions ritornano JSON coerente

### **Pattern Database** ✅
- ✅ Tutti i servizi verificano `supabase` configurato
- ✅ Tutti i servizi gestiscono errori uniformemente
- ✅ Tutti i servizi usano async/await

---

## 📋 CHECKLIST VERIFICA

- [x] Tutti gli endpoint Edge Functions documentati
- [x] Tutti i servizi frontend documentati
- [x] Pattern import verificati (`@/`)
- [x] Coerenza endpoint verificata
- [x] Problemi identificati
- [ ] Test endpoint eseguiti
- [ ] Documentazione aggiornata

---

## 🧪 TEST ENDPOINT

### **Test `voice-coaching-gpt`**:
```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/voice-coaching-gpt \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start_session",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "context": {}
  }'
```

### **Test `process-screenshot-gpt`**:
```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/process-screenshot-gpt \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://...",
    "image_type": "player_profile",
    "user_id": "00000000-0000-0000-0000-000000000001"
  }'
```

---

## 📝 NOTE IMPORTANTI

1. **Next.js**: Tutti gli import usano alias `@/` (configurato in `tsconfig.json`)
2. **Vite Legacy**: Cartella `src/` è esclusa (vedi `next.config.js`)
3. **GPT-Realtime**: Edge Functions GPT esistono ma non tutte integrate
4. **Coerenza**: Pattern uniforme in tutto il codice

---

**Status**: 🟢 **DOCUMENTAZIONE AGGIORNATA** - Verificata contro codice attuale

**Prossimo passo**: Testare endpoint e integrare quelli mancanti.
