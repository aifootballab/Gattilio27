# 🔗 Coerenza Endpoint Supabase
## Documentazione Completa Endpoint e Salvataggi

---

## 📋 ENDPOINT EDGE FUNCTIONS

### **1. `process-screenshot`**
**Path**: `/functions/v1/process-screenshot`

**Method**: `POST`

**Request Body**:
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
  extracted_data: {         // Dati estratti
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

---

### **2. `analyze-rosa`**
**Path**: `/functions/v1/analyze-rosa`

**Method**: `POST`

**Request Body**:
```typescript
{
  rosa_id: string          // UUID rosa
  user_id: string          // UUID utente
}
```

**Response**:
```typescript
{
  success: boolean
  analysis: {               // Analisi squadra
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

## 🗄️ ENDPOINT DATABASE (Diretti)

### **Rosa Service** (`rosaService.js`)

| Funzione | Tabella | Operazione | Note |
|----------|---------|------------|------|
| `createRosa()` | `user_rosa` | INSERT | Crea nuova rosa |
| `getUserRosas()` | `user_rosa` | SELECT | Lista tutte le rose utente |
| `getRosaById()` | `user_rosa` + `player_builds` + `players_base` | SELECT JOIN | Rosa completa con giocatori |
| `updateRosa()` | `user_rosa` | UPDATE | Aggiorna rosa |
| `deleteRosa()` | `user_rosa` | DELETE | Elimina rosa |
| `addPlayerToRosa()` | `user_rosa` | UPDATE | Aggiunge `player_build_id` all'array |
| `removePlayerFromRosa()` | `user_rosa` | UPDATE | Rimuove `player_build_id` dall'array |

---

### **Player Service** (`playerService.js`)

| Funzione | Tabella | Operazione | Note |
|----------|---------|------------|------|
| `searchPlayer()` | `players_base` | SELECT | Ricerca per nome |
| `getPlayerBase()` | `players_base` | SELECT | Giocatore base per ID |
| `upsertPlayerBuild()` | `player_builds` | UPSERT | Crea/aggiorna build (UNIQUE: user_id, player_base_id) |
| `getPlayerBuild()` | `player_builds` + `players_base` | SELECT JOIN | Build completa con dati base |
| `getUserBuilds()` | `player_builds` + `players_base` | SELECT JOIN | Tutte le build utente |
| `deletePlayerBuild()` | `player_builds` | DELETE | Elimina build |

---

### **Vision Service** (`visionService.js`)

| Funzione | Storage/Function | Operazione | Note |
|----------|------------------|------------|------|
| `uploadScreenshot()` | `player-screenshots` bucket | UPLOAD | Upload file a Storage |
| `processScreenshot()` | Edge Function `process-screenshot` | INVOKE | Chiama processing OCR |
| `getProcessingLog()` | `screenshot_processing_log` | SELECT | Recupera log processing |
| `uploadAndProcessScreenshot()` | Storage + Function | UPLOAD + INVOKE | Combinazione upload + process |

---

### **Coaching Service** (`coachingService.js`)

| Funzione | Tabella | Operazione | Note |
|----------|---------|------------|------|
| `createMatchContext()` | `unified_match_contexts` | INSERT | Crea contesto partita |
| `getMatchContexts()` | `unified_match_contexts` | SELECT | Lista contesti utente |
| `getCoachingSuggestions()` | `coaching_suggestions` | SELECT | Suggerimenti per contesto |
| `getRosaCoachingSuggestions()` | `coaching_suggestions` | SELECT | Suggerimenti per rosa |

---

## 🔄 FLUSSO SALVATAGGI COERENTE

### **Scenario 1: Upload Screenshot Giocatore**

```
1. Frontend: uploadScreenshot()
   → Supabase Storage: player-screenshots/{user_id}/{timestamp}_{random}.{ext}
   ↓
2. Frontend: processScreenshot()
   → Edge Function: process-screenshot
   ↓
3. Edge Function:
   a) INSERT screenshot_processing_log (status: processing)
   b) Google Vision API (OCR)
   c) Parsing dati
   d) SELECT players_base (matching)
   e) INSERT players_base (se nuovo)
   f) UPSERT player_builds (build utente)
   g) UPDATE screenshot_processing_log (status: completed)
   ↓
4. Frontend: handleConfirm()
   → playerService.upsertPlayerBuild() (se necessario)
   → rosaService.addPlayerToRosa() (aggiunge a rosa)
   ↓
5. RosaContext: addPlayer()
   → Salva in stato locale
   → Sincronizza con database
```

---

### **Scenario 2: Creazione Rosa**

```
1. Frontend: createRosa()
   → rosaService.createRosa()
   ↓
2. Database: INSERT user_rosa
   - user_id
   - name
   - player_build_ids: [] (vuoto inizialmente)
   - squad_analysis: {}
   ↓
3. RosaContext: setRosa()
   → Aggiorna stato locale
```

---

### **Scenario 3: Aggiunta Giocatore a Rosa**

```
1. Frontend: addPlayer(player)
   → RosaContext.addPlayer()
   ↓
2. Se player ha build_id:
   → rosaService.addPlayerToRosa(rosa_id, build_id)
   → UPDATE user_rosa.player_build_ids (aggiunge ID)
   ↓
3. Se player ha solo player_base_id:
   → playerService.upsertPlayerBuild() (crea build)
   → rosaService.addPlayerToRosa(rosa_id, nuovo_build_id)
   ↓
4. RosaContext: Ricarica rosa completa
   → rosaService.getRosaById(rosa_id)
   → Aggiorna stato con giocatori completi
```

---

### **Scenario 4: Analisi Rosa**

```
1. Frontend: analyzeRosa()
   → Edge Function: analyze-rosa
   ↓
2. Edge Function:
   a) SELECT user_rosa + player_builds + players_base (JOIN)
   b) Analizza squadra (funzione analyzeSquad)
   c) Genera suggerimenti (funzione generateCoachingSuggestions)
   d) UPDATE user_rosa.squad_analysis
   e) INSERT coaching_suggestions (array)
   ↓
3. Frontend: Riceve analysis + suggestions
   → RosaContext: Aggiorna squad_analysis
```

---

## ✅ COERENZA GARANTITA

### **1. Naming Convention**
- ✅ Tutti i servizi usano camelCase
- ✅ Tutte le funzioni sono async
- ✅ Tutti gli errori sono gestiti uniformemente
- ✅ Tutti i response hanno struttura coerente

### **2. Autenticazione**
- ✅ Tutti i servizi verificano `supabase.auth.getSession()`
- ✅ Tutti i query usano `user_id` dal session
- ✅ RLS garantisce accesso solo ai propri dati

### **3. Error Handling**
- ✅ Tutti i servizi lanciano Error con messaggio descrittivo
- ✅ Frontend cattura e mostra errori all'utente
- ✅ Edge Functions ritornano errori strutturati

### **4. Salvataggi**
- ✅ Tutti i salvataggi usano transazioni implicite Supabase
- ✅ Timestamps aggiornati automaticamente (triggers)
- ✅ Upsert invece di insert quando appropriato
- ✅ Validazione dati prima del salvataggio

### **5. Relazioni Database**
- ✅ `player_builds.user_id` + `player_builds.player_base_id` = UNIQUE
- ✅ `user_rosa.player_build_ids[]` → array di `player_builds.id`
- ✅ JOIN coerenti per recuperare dati completi

---

## 🔍 CHECKLIST COERENZA

- [x] Tutti gli endpoint usano stesso pattern
- [x] Tutti i servizi gestiscono autenticazione
- [x] Tutti i salvataggi sono transazionali
- [x] Tutti gli errori sono gestiti
- [x] Tutte le relazioni sono coerenti
- [x] Tutti i timestamp sono aggiornati
- [x] Tutti i JOIN sono ottimizzati
- [x] Tutti i RLS sono configurati

---

**Status**: 🟢 Coerenza garantita in tutto il sistema
