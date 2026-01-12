# ✅ Setup Supabase Completo
## Tutto quello che serve per far funzionare il sistema

---

## 📋 CHECKLIST SETUP

### **1. Database Migrations**

Esegui in ordine:

1. **`001_initial_schema.sql`**
   - Crea tutte le tabelle
   - Configura RLS
   - Crea triggers

2. **`002_create_storage_bucket.sql`**
   - Crea bucket `player-screenshots`
   - Configura policies Storage

**Come eseguire**:
- Supabase Dashboard → SQL Editor
- Copia e incolla ogni migration
- Esegui

---

### **2. Storage Bucket**

**Nome**: `player-screenshots`

**Configurazione**:
- Access: **Privato**
- Max file size: **10MB**
- Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

**Policies** (già create in migration):
- ✅ Utenti autenticati possono uploadare
- ✅ Utenti possono leggere solo i propri file
- ✅ Utenti possono eliminare solo i propri file

---

### **3. Edge Functions**

**Functions da deployare**:

1. **`process-screenshot`**
   ```bash
   supabase functions deploy process-screenshot
   ```

2. **`analyze-rosa`**
   ```bash
   supabase functions deploy analyze-rosa
   ```

**Secrets da configurare** (in Supabase Dashboard → Edge Functions → Settings):
- `GOOGLE_VISION_API_KEY` (o `GOOGLE_VISION_CREDENTIALS`)
- `GOOGLE_VISION_API_ENABLED=true`
- `GOOGLE_VISION_MAX_IMAGE_SIZE_MB=10`

---

### **4. Variabili Frontend**

**File**: `.env` (locale) o Vercel Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🔗 ENDPOINT COMPLETI

### **Database Direct (via Supabase Client)**

| Servizio | Funzione | Endpoint | Metodo |
|----------|----------|----------|--------|
| `rosaService` | `createRosa()` | `user_rosa` | INSERT |
| `rosaService` | `getUserRosas()` | `user_rosa` | SELECT |
| `rosaService` | `getRosaById()` | `user_rosa` + JOIN | SELECT |
| `rosaService` | `updateRosa()` | `user_rosa` | UPDATE |
| `rosaService` | `deleteRosa()` | `user_rosa` | DELETE |
| `playerService` | `searchPlayer()` | `players_base` | SELECT |
| `playerService` | `upsertPlayerBuild()` | `player_builds` | UPSERT |
| `playerService` | `getPlayerBuild()` | `player_builds` + JOIN | SELECT |
| `visionService` | `uploadScreenshot()` | Storage `player-screenshots` | UPLOAD |
| `coachingService` | `createMatchContext()` | `unified_match_contexts` | INSERT |

### **Edge Functions**

| Function | Endpoint | Metodo | Input | Output |
|----------|----------|--------|-------|--------|
| `process-screenshot` | `/functions/v1/process-screenshot` | POST | `{image_url, image_type, user_id}` | `{success, log_id, extracted_data}` |
| `analyze-rosa` | `/functions/v1/analyze-rosa` | POST | `{rosa_id, user_id}` | `{success, analysis, suggestions}` |

---

## 🔄 FLUSSO COMPLETO CON SALVATAGGI

### **Upload Screenshot → Salvataggio Rosa**

```
1. ScreenshotUpload.uploadAndProcessScreenshot()
   ↓
2. visionService.uploadScreenshot()
   → Storage: player-screenshots/{user_id}/{file}
   → Return: {path, url, fileName}
   ↓
3. visionService.processScreenshot()
   → Edge Function: process-screenshot
   ↓
4. Edge Function:
   → INSERT screenshot_processing_log
   → Google Vision API
   → INSERT/UPDATE players_base
   → UPSERT player_builds
   → UPDATE screenshot_processing_log
   ↓
5. ScreenshotUpload.handleConfirm()
   → playerService.upsertPlayerBuild() (se necessario)
   → rosaService.addPlayerToRosa()
   → UPDATE user_rosa.player_build_ids[]
   ↓
6. RosaContext.addPlayer()
   → rosaService.getRosaById() (ricarica completa)
   → setRosa() (aggiorna stato)
```

---

## ✅ COERENZA GARANTITA

### **Pattern Uniformi**:

1. **Error Handling**:
   ```javascript
   try {
     const result = await service.function()
     return result
   } catch (error) {
     throw new Error(`Errore operazione: ${error.message}`)
   }
   ```

2. **Autenticazione**:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession()
   if (!session) throw new Error('Utente non autenticato')
   ```

3. **Response Structure**:
   ```typescript
   {
     success: boolean
     data?: any
     error?: string
   }
   ```

4. **Salvataggi**:
   - Sempre con `user_id` dal session
   - Sempre con `updated_at` automatico (trigger)
   - Sempre con validazione RLS

---

## 🧪 TESTING ENDPOINT

### **Test Rosa Service**:
```javascript
import * as rosaService from './services/rosaService'

// Crea rosa
const rosa = await rosaService.createRosa({ name: 'Test Squad' })

// Aggiungi giocatore
await rosaService.addPlayerToRosa(rosa.id, buildId)

// Analizza
const analysis = await analyzeRosa(rosa.id)
```

### **Test Player Service**:
```javascript
import * as playerService from './services/playerService'

// Cerca giocatore
const players = await playerService.searchPlayer('Mbappé')

// Crea build
const build = await playerService.upsertPlayerBuild({
  player_base_id: playerId,
  development_points: {...}
})
```

### **Test Vision Service**:
```javascript
import * as visionService from './services/visionService'

// Upload e processa
const result = await visionService.uploadAndProcessScreenshot(
  file,
  'player_profile',
  userId
)
```

---

## 📊 STATO IMPLEMENTAZIONE

- [x] Database schema completo
- [x] Storage bucket configurato
- [x] Edge Functions create
- [x] Servizi frontend completi
- [x] RosaContext integrato con Supabase
- [x] ScreenshotUpload integrato
- [x] Coerenza endpoint garantita
- [x] Salvataggi coerenti
- [x] Error handling uniforme
- [x] Autenticazione verificata

---

**Status**: 🟢 **SISTEMA COMPLETO E COERENTE**
