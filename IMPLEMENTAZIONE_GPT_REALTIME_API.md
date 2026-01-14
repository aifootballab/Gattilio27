# 🚀 Implementazione GPT Realtime API
## Migrazione da chat/completions a Realtime API

**Data**: 2025-01-14  
**Status**: 🔴 **DA IMPLEMENTARE**

---

## 🎯 OBIETTIVO

Implementare la **vera GPT Realtime API** (annunciata da OpenAI 4 ore fa) con:
- ✅ WebSocket (non HTTP)
- ✅ Streaming word-by-word
- ✅ Interrupt (puoi fermarlo)
- ✅ Function calling (esegue azioni)
- ✅ Multimodale (testo + voce + immagini insieme)

---

## ❌ PROBLEMA ATTUALE

**Codice attuale** (`callGPTRealtimeCoaching`):
```typescript
// ❌ SBAGLIATO - Usa chat/completions (HTTP REST)
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [...],
    stream: false // ❌ No streaming
  })
})
```

**Problemi**:
- ❌ Non è Realtime (è HTTP REST)
- ❌ Non streaming (attendi risposta completa)
- ❌ Non interrupt (non puoi fermarlo)
- ❌ No function calling (non esegue azioni)
- ❌ No multimodale fluido

---

## ✅ SOLUZIONE: GPT Realtime API

### **1. WebSocket Connection**

```typescript
// ✅ CORRETTO - WebSocket Realtime API
import { RealtimeClient } from '@openai/realtime-api'

const client = new RealtimeClient({
  apiKey: openaiApiKey,
  model: 'gpt-4o-realtime-preview-2024-12-17'
})

// Connetti
await client.connect()
```

---

### **2. Streaming Word-by-Word**

```typescript
// Event listener per streaming
client.on('response.text.delta', (delta) => {
  // Ricevi ogni parola in tempo reale
  const word = delta.delta
  // Invia al frontend via WebSocket
  sendToFrontend({ type: 'word', content: word })
})
```

---

### **3. Interrupt**

```typescript
// Utente interrompe
client.interrupt()

// Il coach si ferma immediatamente
```

---

### **4. Function Calling**

```typescript
// Definisci funzioni disponibili
const functions = [
  {
    name: 'save_player_to_supabase',
    description: 'Salva un giocatore nel database Supabase',
    parameters: {
      type: 'object',
      properties: {
        player_data: { type: 'object' },
        rosa_id: { type: 'string' }
      },
      required: ['player_data']
    }
  },
  {
    name: 'load_rosa',
    description: 'Carica la rosa dell\'utente da Supabase',
    parameters: {
      type: 'object',
      properties: {
        rosa_id: { type: 'string' }
      }
    }
  },
  {
    name: 'search_player',
    description: 'Cerca un giocatore nel database',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    }
  },
  {
    name: 'update_rosa',
    description: 'Aggiorna la rosa con nuovi giocatori',
    parameters: {
      type: 'object',
      properties: {
        rosa_id: { type: 'string' },
        player_build_ids: { type: 'array' }
      },
      required: ['rosa_id', 'player_build_ids']
    }
  }
]

// Aggiungi funzioni al client
client.updateSession({
  tools: functions.map(f => ({
    type: 'function',
    name: f.name,
    description: f.description,
    parameters: f.parameters
  }))
})

// Handler per function calls
client.on('response.function_call', async (call) => {
  const { name, arguments: args } = call
  
  // Esegui funzione
  let result
  switch (name) {
    case 'save_player_to_supabase':
      result = await savePlayerToSupabase(args.player_data, args.rosa_id)
      break
    case 'load_rosa':
      result = await loadRosa(args.rosa_id)
      break
    case 'search_player':
      result = await searchPlayer(args.query)
      break
    case 'update_rosa':
      result = await updateRosa(args.rosa_id, args.player_build_ids)
      break
  }
  
  // Ritorna risultato a GPT
  client.submitToolOutputs([{
    tool_call_id: call.id,
    output: JSON.stringify(result)
  }])
})
```

---

### **5. Multimodale (Testo + Voce + Immagini)**

```typescript
// Invia messaggio con testo + audio + immagine
client.createResponse({
  input: [
    { type: 'input_text', text: 'Analizza questo screenshot' },
    { type: 'input_audio', audio: audioBase64 },
    { type: 'input_image', image: imageUrl }
  ]
})
```

---

## 📋 IMPLEMENTAZIONE COMPLETA

### **File da Modificare**:

1. **`supabase/functions/voice-coaching-gpt/index.ts`**
   - ❌ Rimuovere `callGPTRealtimeCoaching()` (HTTP)
   - ✅ Implementare WebSocket Realtime API
   - ✅ Aggiungere function calling
   - ✅ Gestire streaming

2. **`services/realtimeCoachingService.js`**
   - ✅ WebSocket client per streaming
   - ✅ Gestione interrupt
   - ✅ Visualizzazione word-by-word

3. **`components/coaching/VoiceCoachingPanel.jsx`**
   - ✅ UI per interrupt (stop button)
   - ✅ Visualizzazione streaming
   - ✅ Mostra quando esegue funzioni

---

## 🔧 FUNZIONI DA IMPLEMENTARE

### **1. `save_player_to_supabase`**
```typescript
async function savePlayerToSupabase(playerData: any, rosaId?: string) {
  // Salva in players_base
  // Crea player_build
  // Aggiungi a rosa se rosaId fornito
  return { success: true, player_id: '...' }
}
```

### **2. `load_rosa`**
```typescript
async function loadRosa(rosaId: string) {
  // Carica rosa completa con giocatori
  return { rosa: {...}, players: [...] }
}
```

### **3. `search_player`**
```typescript
async function searchPlayer(query: string) {
  // Cerca giocatori nel database
  return { players: [...] }
}
```

### **4. `update_rosa`**
```typescript
async function updateRosa(rosaId: string, playerBuildIds: string[]) {
  // Aggiorna rosa con nuovi giocatori
  return { success: true }
}
```

### **5. `analyze_screenshot`**
```typescript
async function analyzeScreenshot(imageUrl: string, imageType: string) {
  // Analizza screenshot con GPT Vision
  return { analysis: {...} }
}
```

---

## 🚀 PROSSIMI STEP

1. **Installare SDK Realtime API**:
   ```bash
   npm install @openai/realtime-api
   ```

2. **Implementare WebSocket connection** in Edge Function

3. **Aggiungere function calling** con funzioni Supabase

4. **Frontend**: WebSocket client per streaming

5. **Test**: Verificare streaming + interrupt + function calling

---

## 📚 DOCUMENTAZIONE

- **OpenAI Realtime API**: https://platform.openai.com/docs/guides/realtime
- **Function Calling**: https://platform.openai.com/docs/guides/function-calling
- **MCP Servers**: https://modelcontextprotocol.io/

---

**Status**: 🔴 **DA IMPLEMENTARE** - Migrare a vera Realtime API
