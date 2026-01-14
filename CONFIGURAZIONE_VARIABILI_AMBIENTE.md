# ⚙️ Configurazione Variabili d'Ambiente Supabase
## Guida Completa per Fix Errori 500

**Data**: 2025-01-14  
**Status**: 🔴 **AZIONE RICHIESTA**

---

## 🚨 PROBLEMA

Le Edge Functions restituiscono errori **500** perché mancano variabili d'ambiente necessarie.

---

## ✅ SOLUZIONE: Configurare Secrets in Supabase

### **Metodo 1: Supabase Dashboard** (Consigliato)

1. Vai a **Supabase Dashboard**: https://supabase.com/dashboard
2. Seleziona il progetto: **zliuuorrwdetylollrua**
3. Vai a **Project Settings** → **Edge Functions**
4. Sezione **Secrets**
5. Aggiungi le seguenti variabili:

#### **Per `voice-coaching-gpt`**:
```
OPENAI_API_KEY = sk-... (tua chiave OpenAI)
```

#### **Per `process-screenshot`** (Opzionale - usa mock se non configurato):
```
GOOGLE_VISION_API_KEY = ... (chiave Google Vision API)
GOOGLE_VISION_API_ENABLED = true
```

---

### **Metodo 2: Supabase CLI**

```bash
# Installa Supabase CLI
npm install -g supabase

# Login
supabase login

# Link progetto
supabase link --project-ref zliuuorrwdetylollrua

# Aggiungi secrets
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase secrets set GOOGLE_VISION_API_KEY=...
supabase secrets set GOOGLE_VISION_API_ENABLED=true

# Verifica secrets
supabase secrets list
```

---

## 🔑 COME OTTENERE LE CHIAVI

### **1. OpenAI API Key**

1. Vai a https://platform.openai.com/api-keys
2. Crea nuova chiave API
3. Copia la chiave (inizia con `sk-` o `sk-proj-`)
4. **⚠️ IMPORTANTE**: Salvala subito, non la vedrai più!

**Costo**: ~$0.01-0.03 per 1000 token (molto economico per test)

---

### **2. Google Vision API Key** (Opzionale)

1. Vai a https://console.cloud.google.com/
2. Crea nuovo progetto o seleziona esistente
3. Abilita **Cloud Vision API**
4. Vai a **Credentials** → **Create Credentials** → **API Key**
5. Copia la chiave

**Costo**: Primi 1000 richieste/mese gratuite, poi ~$1.50 per 1000 richieste

**⚠️ NOTA**: Se non configuri Google Vision, `process-screenshot` userà dati mock per sviluppo.

---

## 🧪 VERIFICA CONFIGURAZIONE

### **Test 1: Verifica `voice-coaching-gpt`**

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/voice-coaching-gpt \
  -H "Authorization: Bearer sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start_session",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "context": {}
  }'
```

**Risposta attesa** (successo):
```json
{
  "session_id": "xxx-xxx-xxx",
  "success": true
}
```

**Risposta errore** (se `OPENAI_API_KEY` mancante):
```json
{
  "error": "OPENAI_API_KEY not configured. Please set it in Supabase Edge Functions secrets.",
  "code": "MISSING_API_KEY"
}
```

---

### **Test 2: Verifica `process-screenshot`**

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/process-screenshot \
  -H "Authorization: Bearer sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://zliuuorrwdetylollrua.supabase.co/storage/v1/object/public/player-screenshots/test.jpg",
    "image_type": "player_profile",
    "user_id": "00000000-0000-0000-0000-000000000001"
  }'
```

**Risposta attesa** (con mock data se Vision API non configurata):
```json
{
  "success": true,
  "log_id": "xxx",
  "extracted_data": {...},
  "warning": "Using mock data - configure GOOGLE_VISION_API_KEY for real OCR"
}
```

---

## 📋 CHECKLIST

- [ ] Aggiunto `OPENAI_API_KEY` in Supabase Secrets
- [ ] (Opzionale) Aggiunto `GOOGLE_VISION_API_KEY` in Supabase Secrets
- [ ] (Opzionale) Aggiunto `GOOGLE_VISION_API_ENABLED=true` in Supabase Secrets
- [ ] Testato `voice-coaching-gpt` con curl
- [ ] Testato `process-screenshot` con curl
- [ ] Verificato che errori 500 siano risolti

---

## 🔍 DEBUGGING

### **Se ancora errori 500**:

1. **Verifica log Supabase**:
   - Dashboard → **Edge Functions** → **Logs**
   - Cerca errori recenti con dettagli

2. **Verifica secrets**:
   ```bash
   supabase secrets list
   ```

3. **Test locale** (se hai Supabase CLI):
   ```bash
   supabase functions serve voice-coaching-gpt
   ```

---

## ⚠️ NOTE IMPORTANTI

1. **Secrets sono per progetto**: Ogni progetto Supabase ha i suoi secrets
2. **Secrets sono sicuri**: Non vengono esposti nel codice frontend
3. **Rideploy dopo secrets**: Le Edge Functions caricano secrets al runtime, non serve rideploy
4. **Costi**: Monitora l'uso di API keys per evitare costi inattesi

---

## 🚀 DOPO LA CONFIGURAZIONE

Una volta configurate le variabili:

1. ✅ Gli errori 500 dovrebbero sparire
2. ✅ `voice-coaching-gpt` funzionerà con GPT-4o
3. ✅ `process-screenshot` userà Google Vision (se configurato) o mock data

---

**Status**: 🔴 **AZIONE RICHIESTA** - Configurare `OPENAI_API_KEY` in Supabase Dashboard
