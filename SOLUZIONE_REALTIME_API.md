# 🔧 Soluzione per OpenAI Realtime API Authentication

## ❌ Problema Identificato

L'errore `Missing bearer or basic authentication in header` indica che:
1. **I WebSocket nel browser NON possono impostare header personalizzati** (limitazione browser)
2. **L'API Realtime di OpenAI RICHIEDE** `Authorization: Bearer <token>` nell'header
3. **Il formato `api_key` come query parameter NON funziona** (come confermato dall'errore)

## ✅ Soluzioni Possibili

### Opzione 1: Proxy WebSocket Edge Function (Complesso)
- **Pro**: Mantiene WebSocket Realtime vero
- **Contro**: Deno potrebbe non supportare WebSocket upgrade facilmente
- **Status**: ⚠️ Da verificare se Deno supporta `Deno.upgradeWebSocket`

### Opzione 2: Usare HTTP Streaming tramite Edge Function (Più Semplice) ✅
- **Pro**: Funziona sicuramente, usa Edge Function esistente
- **Pro**: API key sicura lato server
- **Contro**: Non è WebSocket vero, ma streaming HTTP (SSE o polling)
- **Status**: ✅ **RACCOMANDATO** - Funziona subito

### Opzione 3: Cloudflare Workers Proxy (Esterno)
- **Pro**: Supporta WebSocket upgrade
- **Contro**: Richiede servizio esterno, complessità aggiuntiva
- **Status**: ⚠️ Opzione avanzata

## 🎯 Soluzione Implementata: HTTP Streaming

Modifichiamo l'approccio per usare l'Edge Function esistente `voice-coaching-gpt` con streaming HTTP invece di WebSocket diretto.

### Vantaggi:
1. ✅ **Funziona subito** - Nessun problema di autenticazione
2. ✅ **Sicuro** - API key lato server, non esposta al client
3. ✅ **Usa codice esistente** - Edge Function già funzionante
4. ✅ **Streaming reale** - Server-Sent Events (SSE) per risposte in tempo reale

### Implementazione:
1. Modificare `realtimeCoachingServiceV2.js` per usare SSE invece di WebSocket
2. Modificare Edge Function per supportare streaming (`stream: true`)
3. Gestire risposte streaming lato client

## 📝 Prossimi Passi

1. ✅ Modificare client per usare SSE invece di WebSocket
2. ✅ Modificare Edge Function per supportare streaming
3. ✅ Testare e verificare funzionamento
