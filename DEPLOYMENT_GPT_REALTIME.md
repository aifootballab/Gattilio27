# 🚀 Deployment Guide: GPT-Realtime Edge Functions

**Data**: 2025-01-12  
**Status**: 📋 Guida Deployment  
**Focus**: Deploy sicuro e verificato per produzione enterprise

---

## 📋 PRE-REQUISITI

### **1. OpenAI API Key**
- Ottieni una chiave API OpenAI (GPT-4o supporta vision)
- URL: https://platform.openai.com/api-keys

### **2. Supabase CLI** (opzionale, può usare Dashboard)
```bash
# Installa Supabase CLI (se non già installato)
npm install -g supabase

# Login
supabase login

# Link al progetto
supabase link --project-ref YOUR_PROJECT_REF
```

---

## 🔧 CONFIGURAZIONE SECRETS

### **Supabase Dashboard** (CONSIGLIATO per produzione):

1. Vai su **Supabase Dashboard** → **Edge Functions** → **Settings**
2. Aggiungi Secret: `OPENAI_API_KEY`
   - Value: La tua chiave API OpenAI
   - Sensitive: ✅ Sì

3. Verifica Secrets esistenti:
   - `SUPABASE_URL` (già presente)
   - `SUPABASE_SERVICE_ROLE_KEY` (già presente)

### **Supabase CLI** (alternativa):

```bash
# Aggiungi secret
supabase secrets set OPENAI_API_KEY=sk-...

# Verifica secrets
supabase secrets list
```

---

## 📊 DATABASE MIGRATION

### **Eseguire Migration 003**:

1. **Supabase Dashboard**:
   - Vai su **SQL Editor**
   - Copia contenuto di `supabase/migrations/003_add_gpt_realtime_support.sql`
   - Esegui la query

2. **Supabase CLI** (alternativa):
   ```bash
   supabase db push
   ```

### **Verifica Tabelle Create**:
```sql
-- Verifica tabelle create
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'candidate_profiles',
    'heat_maps',
    'chart_data',
    'player_match_ratings',
    'squad_formations'
  );
```

---

## 🚀 DEPLOY EDGE FUNCTIONS

### **Opzione 1: Supabase Dashboard** (CONSIGLIATO) 🎯

1. **Vai su Supabase Dashboard** → **Edge Functions** → **Functions**

2. **Per ogni Edge Function**:

   #### **process-screenshot-gpt**:
   - Clicca **"New function"** o **"Create a new function"**
   - Nome: `process-screenshot-gpt`
   - Copia contenuto di `supabase/functions/process-screenshot-gpt/index.ts`
   - Clicca **"Deploy"**

   #### **analyze-heatmap-screenshot-gpt**:
   - Nome: `analyze-heatmap-screenshot-gpt`
   - Copia contenuto di `supabase/functions/analyze-heatmap-screenshot-gpt/index.ts`
   - Clicca **"Deploy"**

   #### **analyze-squad-formation-gpt**:
   - Nome: `analyze-squad-formation-gpt`
   - Copia contenuto di `supabase/functions/analyze-squad-formation-gpt/index.ts`
   - Clicca **"Deploy"**

   #### **analyze-player-ratings-gpt**:
   - Nome: `analyze-player-ratings-gpt`
   - Copia contenuto di `supabase/functions/analyze-player-ratings-gpt/index.ts`
   - Clicca **"Deploy"**

### **Opzione 2: Supabase CLI** (avanzato) 🔧

```bash
# Assicurati di essere nella directory del progetto
cd "C:\Users\attil\Desktop\Gattilio27-master\Gattilio27-master"

# Deploy tutte le funzioni GPT-Realtime
supabase functions deploy process-screenshot-gpt
supabase functions deploy analyze-heatmap-screenshot-gpt
supabase functions deploy analyze-squad-formation-gpt
supabase functions deploy analyze-player-ratings-gpt

# Verifica deploy
supabase functions list
```

---

## ✅ VERIFICA DEPLOYMENT

### **1. Verifica Edge Functions Attive**:

**Supabase Dashboard** → **Edge Functions** → **Functions**:
- ✅ `process-screenshot-gpt` - Status: ACTIVE
- ✅ `analyze-heatmap-screenshot-gpt` - Status: ACTIVE
- ✅ `analyze-squad-formation-gpt` - Status: ACTIVE
- ✅ `analyze-player-ratings-gpt` - Status: ACTIVE

### **2. Test Endpoint** (opzionale):

```bash
# Test process-screenshot-gpt
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-screenshot-gpt \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/test.jpg",
    "image_type": "player_profile",
    "user_id": "test-user-id"
  }'
```

### **3. Verifica Logs**:

**Supabase Dashboard** → **Edge Functions** → **Logs**:
- Controlla logs per errori
- Verifica che `OPENAI_API_KEY` sia configurata

---

## 🔒 SECURITY CHECKLIST

### **Pre-Produzione**:
- [x] `OPENAI_API_KEY` configurata come secret (non hardcoded)
- [x] CORS headers configurati
- [x] Error messages non espongono internals (produzione)
- [x] RLS abilitato su tutte le tabelle
- [x] Input validation implementata
- [ ] Rate limiting configurato (da fare)
- [ ] Monitoring alerts configurati (da fare)

---

## 📊 MONITORING

### **Supabase Dashboard**:
- **Edge Functions** → **Logs**: Monitora errori e performance
- **Database** → **Logs**: Verifica query performance
- **Storage** → **Logs**: Verifica upload/download

### **Metrics da Monitorare**:
- Tempo di esecuzione Edge Functions (<5s target)
- Tasso di errore (<1% target)
- Costo OpenAI API (monitora usage)

---

## ⚠️ TROUBLESHOOTING

### **Errore: "OPENAI_API_KEY not configured"**
- **Soluzione**: Verifica che `OPENAI_API_KEY` sia configurata come secret in Supabase Dashboard

### **Errore: "Failed to download image"**
- **Soluzione**: Verifica che il bucket `player-screenshots` esista e che l'utente abbia permessi

### **Errore: "GPT API error: 429"**
- **Soluzione**: Rate limit OpenAI - implementa retry logic o aumenta quota

### **Errore: "Invalid JSON response"**
- **Soluzione**: Verifica che il prompt GPT generi JSON valido (già implementato `response_format: { type: 'json_object' }`)

---

## 🎯 PROSSIMI PASSI

Dopo deployment backend:
1. ✅ Testare Edge Functions con screenshot reali
2. ⏳ Implementare componenti frontend per CandidateProfile UI
3. ⏳ Implementare flow conferma utente
4. ⏳ Integrare con frontend esistente

---

**Status**: 🟢 **GUIDE COMPLETA** - Pronto per deployment
