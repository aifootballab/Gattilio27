# 🔧 Fix Errori Edge Functions 500
## Diagnosi e Soluzione Errori

**Data**: 2025-01-14  
**Status**: 🔴 **PROBLEMI IDENTIFICATI**

---

## 🚨 ERRORI IDENTIFICATI

### **1. `voice-coaching-gpt` - Error 500**

**Possibili cause**:
1. ❌ **`OPENAI_API_KEY` mancante** nelle variabili d'ambiente Supabase
2. ❌ **Errore in `handleStartSession`** - query fallita
3. ❌ **Errore in `callGPTRealtimeCoaching`** - chiamata API fallita

**Log errori**:
```
POST | 500 | https://zliuuorrwdetylollrua.supabase.co/functions/v1/voice-coaching-gpt
```

---

### **2. `process-screenshot` - Error 500**

**Possibili cause**:
1. ❌ **`GOOGLE_VISION_API_KEY` mancante** o `GOOGLE_VISION_API_ENABLED` non configurato
2. ❌ **Errore download immagine** da Storage
3. ❌ **Errore parsing URL** immagine

**Log errori**:
```
POST | 500 | https://zliuuorrwdetylollrua.supabase.co/functions/v1/process-screenshot
```

---

## ✅ SOLUZIONI

### **1. Verificare Variabili d'Ambiente Supabase**

**Variabili necessarie**:

#### **Per `voice-coaching-gpt`**:
- ✅ `SUPABASE_URL` (automatico)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (automatico)
- ❌ **`OPENAI_API_KEY`** - **DA CONFIGURARE**

#### **Per `process-screenshot`**:
- ✅ `SUPABASE_URL` (automatico)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (automatico)
- ❌ **`GOOGLE_VISION_API_KEY`** - **DA CONFIGURARE** (opzionale)
- ❌ **`GOOGLE_VISION_API_ENABLED`** - **DA CONFIGURARE** (default: `false`)

---

### **2. Come Configurare Variabili d'Ambiente**

#### **Opzione A: Supabase Dashboard** (Consigliato)

1. Vai a **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Sezione **Secrets**
3. Aggiungi:
   - `OPENAI_API_KEY` = `sk-...` (tua chiave OpenAI)
   - `GOOGLE_VISION_API_KEY` = `...` (opzionale, se usi Google Vision)
   - `GOOGLE_VISION_API_ENABLED` = `true` (se vuoi usare Google Vision)

#### **Opzione B: Supabase CLI**

```bash
# Installa Supabase CLI se non ce l'hai
npm install -g supabase

# Login
supabase login

# Link progetto
supabase link --project-ref zliuuorrwdetylollrua

# Aggiungi secrets
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set GOOGLE_VISION_API_KEY=...
supabase secrets set GOOGLE_VISION_API_ENABLED=true
```

---

### **3. Migliorare Error Handling nelle Edge Functions**

**Problema**: Gli errori 500 non mostrano dettagli utili.

**Soluzione**: Aggiungere try-catch più dettagliati e logging.

---

## 🔍 VERIFICA RAPIDA

### **Test 1: Verifica `OPENAI_API_KEY`**

```bash
# Test Edge Function con curl
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/voice-coaching-gpt \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start_session",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "context": {}
  }'
```

**Se errore 500**: `OPENAI_API_KEY` mancante o invalida.

---

### **Test 2: Verifica `process-screenshot`**

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/process-screenshot \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://...",
    "image_type": "player_profile",
    "user_id": "00000000-0000-0000-0000-000000000001"
  }'
```

**Se errore 500**: 
- `GOOGLE_VISION_API_KEY` mancante (se `GOOGLE_VISION_API_ENABLED=true`)
- Errore download immagine
- URL immagine non valido

---

## 📋 CHECKLIST FIX

- [ ] Verificare `OPENAI_API_KEY` configurata in Supabase
- [ ] Verificare `GOOGLE_VISION_API_KEY` configurata (se necessario)
- [ ] Verificare `GOOGLE_VISION_API_ENABLED` configurata
- [ ] Testare `voice-coaching-gpt` con curl
- [ ] Testare `process-screenshot` con curl
- [ ] Verificare log Supabase per dettagli errori
- [ ] Aggiungere error handling migliore nelle Edge Functions

---

## 🛠️ PROSSIMI STEP

1. **Configurare variabili d'ambiente** in Supabase Dashboard
2. **Testare endpoint** con curl
3. **Migliorare error handling** nelle Edge Functions per log più dettagliati
4. **Aggiungere fallback** per `process-screenshot` quando Vision API non disponibile

---

**Status**: 🔴 **AZIONE RICHIESTA** - Configurare variabili d'ambiente in Supabase
