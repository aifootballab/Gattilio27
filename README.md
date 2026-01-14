# 🎮 Gattilio27 - Voice Coaching System per eFootball

**Sistema di coaching vocale in tempo reale** con GPT-Realtime API per eFootball.

---

## 🚀 Quick Start

### **Prerequisiti**:
- Node.js 18+
- Supabase account
- OpenAI API key

### **Setup**:
```bash
# Install dependencies
npm install

# Configura variabili ambiente
cp .env.example .env.local
# Aggiungi NEXT_PUBLIC_OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, etc.

# Deploy Edge Functions
supabase functions deploy voice-coaching-gpt

# Esegui migrations
# In Supabase Dashboard → SQL Editor → Esegui migrations/009_fix_missing_columns_and_align.sql
```

---

## 📚 Documentazione

### **Documentazione Principale**:
- **[DOCUMENTAZIONE_COMPLETA_SISTEMA.md](./DOCUMENTAZIONE_COMPLETA_SISTEMA.md)** - Panoramica completa sistema
- **[ANALISI_COMPLETA_CODICE_STRUTTURA_FLUSSI.md](./ANALISI_COMPLETA_CODICE_STRUTTURA_FLUSSI.md)** - Analisi riga per riga codice

### **Documentazione Tecnica**:
- **[ALLINEAMENTO_MIGRATIONS_COMPLETO.md](./ALLINEAMENTO_MIGRATIONS_COMPLETO.md)** - Migrations database
- **[FIX_ERRORE_500_COMPLETATO.md](./FIX_ERRORE_500_COMPLETATO.md)** - Troubleshooting
- **[VERIFICA_COMPLETA_ENDPOINT_STRUTTURA.md](./VERIFICA_COMPLETA_ENDPOINT_STRUTTURA.md)** - Endpoint e coerenza
- **[VERIFICA_SUPABASE_COMPLETA.md](./VERIFICA_SUPABASE_COMPLETA.md)** - Verifica Supabase

### **Feature Specifiche**:
- **[IMPLEMENTAZIONE_REALTIME_COMPLETATA.md](./IMPLEMENTAZIONE_REALTIME_COMPLETATA.md)** - Implementazione Realtime API
- **[INTEGRAZIONE_FRONTEND_REALTIME.md](./INTEGRAZIONE_FRONTEND_REALTIME.md)** - Integrazione frontend
- **[CARICAMENTO_IMMAGINI_CHAT_IMPLEMENTATO.md](./CARICAMENTO_IMMAGINI_CHAT_IMPLEMENTATO.md)** - Feature immagini
- **[AGGIORNAMENTO_EVENTI_TRASCRIZIONE_AUDIO.md](./AGGIORNAMENTO_EVENTI_TRASCRIZIONE_AUDIO.md)** - Feature trascrizione audio
- **[SPIEGAZIONE_GPT_REALTIME_MCP.md](./SPIEGAZIONE_GPT_REALTIME_MCP.md)** - Spiegazione tecnica MCP

---

## 🎯 Funzionalità

- ✅ **Conversazione vocale real-time** - Parla e ricevi risposte immediate
- ✅ **Streaming word-by-word** - Risposte appaiono parola per parola
- ✅ **Interrupt capability** - Puoi interrompere l'AI mentre parla
- ✅ **Multimodale** - Testo + voce + immagini insieme
- ✅ **Function calling** - AI esegue azioni (salva giocatori, carica rosa, etc.)
- ✅ **Trascrizione audio real-time** - Vedi cosa hai detto mentre parli
- ✅ **Analisi screenshot** - Invia screenshot e l'AI li analizza

---

## 🏗️ Architettura

```
Frontend (Next.js)
  ↓ WebSocket
OpenAI Realtime API
  ↓ Function Calls
Supabase Edge Functions
  ↓
Supabase Database/Storage
```

---

## 📊 Status

**Status**: 🟢 **SISTEMA COMPLETO E FUNZIONANTE**

- ✅ Frontend completo
- ✅ Backend completo
- ✅ Database allineato
- ✅ Migrations applicate
- ✅ Tutte le funzionalità operative

---

## 🔧 Tecnologie

- **Frontend**: Next.js 14+, React 18+
- **Backend**: Supabase Edge Functions (Deno)
- **AI**: OpenAI GPT-Realtime API
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage
- **Real-time**: WebSocket

---

## 📝 Note

- ⚠️ API key OpenAI esposta nel client (`NEXT_PUBLIC_OPENAI_API_KEY`)
- ✅ Considerare proxy Edge Function per nascondere API key in futuro
- ✅ RLS policies su tutte le tabelle
- ✅ Storage policies configurate

---

**Ultimo Aggiornamento**: 2025-01-14  
**Versione**: 2.0
