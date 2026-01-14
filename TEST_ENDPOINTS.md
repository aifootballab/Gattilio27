# 🧪 Test Endpoint - Guida Completa
## Come testare tutti gli endpoint del sistema

**Data**: 2025-01-14  
**Status**: 📋 **GUIDA TEST**

---

## 🎯 SCOPO

Verificare che tutti gli endpoint funzionino correttamente e siano coerenti con il codice.

---

## 📋 PREREQUISITI

### **1. Variabili Ambiente**

Crea file `.env.local` (sviluppo locale):
```env
NEXT_PUBLIC_SUPABASE_URL=https://zliuuorrwdetylollrua.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr
```

### **2. Supabase CLI** (Opzionale)

```bash
npm install -g supabase
supabase login
supabase link --project-ref zliuuorrwdetylollrua
```

---

## 🧪 TEST EDGE FUNCTIONS

### **1. Test `voice-coaching-gpt`**

#### **Test start_session**:
```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/voice-coaching-gpt \
  -H "Authorization: Bearer sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start_session",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "context": {
      "rosa": {},
      "user_profile": {
        "coaching_level": "intermedio"
      }
    }
  }'
```

**Response attesa**:
```json
{
  "session_id": "xxx-xxx-xxx",
  "success": true
}
```

#### **Test send_message**:
```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/voice-coaching-gpt \
  -H "Authorization: Bearer sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_message",
    "session_id": "SESSION_ID_FROM_START",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "message": "Come posso migliorare la mia formazione?"
  }'
```

**Response attesa**:
```json
{
  "response": "Per migliorare la tua formazione...",
  "success": true
}
```

---

### **2. Test `process-screenshot-gpt`**

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/process-screenshot-gpt \
  -H "Authorization: Bearer sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://zliuuorrwdetylollrua.supabase.co/storage/v1/object/public/player-screenshots/USER_ID/TIMESTAMP.jpg",
    "image_type": "player_profile",
    "user_id": "00000000-0000-0000-0000-000000000001"
  }'
```

**Response attesa**:
```json
{
  "success": true,
  "log_id": "xxx",
  "candidate_profile": {
    "player_name": {
      "value": "Messi",
      "status": "certain",
      "confidence": 0.95
    },
    ...
  },
  "extracted_fields": {
    "certain": ["player_name", "overall_rating"],
    "uncertain": ["position"],
    "missing": ["height", "weight"]
  }
}
```

---

### **3. Test `analyze-rosa`**

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/analyze-rosa \
  -H "Authorization: Bearer sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr" \
  -H "Content-Type: application/json" \
  -d '{
    "rosa_id": "ROSA_ID",
    "user_id": "00000000-0000-0000-0000-000000000001"
  }'
```

**Response attesa**:
```json
{
  "success": true,
  "analysis": {
    "strengths": [...],
    "weaknesses": [...],
    "recommended_formations": [...],
    "avg_rating": 85,
    "player_count": 11
  },
  "suggestions": [...]
}
```

---

### **4. Test `import-players-json`**

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/import-players-json \
  -H "Authorization: Bearer sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr" \
  -H "Content-Type: application/json" \
  -d '{
    "json_data": [
      {
        "player_name": "Test Player",
        "position": "CF",
        "overall_rating": 90
      }
    ],
    "batch_size": 50
  }'
```

---

## 🧪 TEST FRONTEND

### **1. Test Servizi**

#### **Test `rosaService`**:
```javascript
import * as rosaService from '@/services/rosaService'

// Test createRosa
const rosa = await rosaService.createRosa({
  name: 'Test Rosa',
  player_build_ids: []
})

// Test getRosaById
const fullRosa = await rosaService.getRosaById(rosa.id)

// Test analyzeRosa
const analysis = await rosaService.analyzeRosa(rosa.id, '00000000-0000-0000-0000-000000000001')
```

#### **Test `realtimeCoachingService`**:
```javascript
import realtimeCoachingService from '@/services/realtimeCoachingService'

// Test startSession
const sessionId = await realtimeCoachingService.startSession(
  '00000000-0000-0000-0000-000000000001',
  { rosa: {}, user_profile: { coaching_level: 'intermedio' } }
)

// Test sendMessage
realtimeCoachingService.onMessage((message) => {
  console.log('Message received:', message)
})

await realtimeCoachingService.sendMessage('Ciao, come stai?')

// Test endSession
await realtimeCoachingService.endSession()
```

#### **Test `visionService`**:
```javascript
import { uploadAndProcessScreenshot } from '@/services/visionService'

// Test upload + process
const result = await uploadAndProcessScreenshot(
  file,
  'player_profile',
  '00000000-0000-0000-0000-000000000001'
)

console.log('Extracted data:', result.processing.extracted_data)
```

---

## 🔍 VERIFICA COERENZA

### **Checklist**:

- [ ] Tutti gli endpoint rispondono correttamente
- [ ] Tutti i servizi usano `@/` per import
- [ ] Tutti gli endpoint hanno CORS headers
- [ ] Tutti gli errori sono gestiti
- [ ] Tutti i salvataggi funzionano
- [ ] Tutti i JOIN database funzionano

---

## ⚠️ PROBLEMI NOTI

### **1. `visionService.js` usa endpoint sbagliato**
- **Problema**: Chiama `process-screenshot` invece di `process-screenshot-gpt`
- **Soluzione**: Aggiornare `visionService.js` per usare GPT-Realtime

### **2. Edge Functions GPT non integrate**
- **Problema**: Deployate ma non usate
- **Soluzione**: Creare servizi frontend per integrarle

---

## 📝 RISULTATI TEST

Dopo aver eseguito i test, aggiornare questo documento con:
- ✅ Endpoint funzionanti
- ❌ Endpoint con errori
- ⚠️ Endpoint da verificare

---

**Status**: 📋 **GUIDA TEST** - Eseguire test e aggiornare risultati
