# 🚀 Deploy Edge Functions GPT-Realtime in Supabase

**Data**: 2025-01-12  
**Status**: 📋 Guida Deploy Completa  
**Istruzioni**: Deploy tramite Supabase Dashboard

---

## 📋 PRE-REQUISITI

1. ✅ Migration 003 eseguita (vedi `ESEGUI_MIGRATION_003_SUPABASE.md`)
2. ✅ OpenAI API Key pronta (https://platform.openai.com/api-keys)

---

## 🔧 STEP 1: Configura OPENAI_API_KEY Secret

### **Supabase Dashboard**:

1. **Vai su Supabase Dashboard** → **Edge Functions** → **Settings**
2. **Sezione "Secrets"**
3. **Clicca "Add new secret"**
4. **Aggiungi**:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: La tua chiave API OpenAI (es. `sk-...`)
   - **Sensitive**: ✅ Sì (spunta la checkbox)
5. **Clicca "Save"**

---

## 🚀 STEP 2: Deploy Edge Functions

### **Per ogni Edge Function**:

#### **2.1: process-screenshot-gpt**

1. **Vai su Supabase Dashboard** → **Edge Functions** → **Functions**
2. **Clicca "New function"** o **"Create a new function"**
3. **Nome funzione**: `process-screenshot-gpt`
4. **Copia il contenuto completo** di:
   ```
   supabase/functions/process-screenshot-gpt/index.ts
   ```
5. **Incolla nel code editor**
6. **Clicca "Deploy"** o **"Save"**
7. **Attendi completamento deploy** (status: ACTIVE)

---

#### **2.2: analyze-heatmap-screenshot-gpt**

1. **Clicca "New function"**
2. **Nome funzione**: `analyze-heatmap-screenshot-gpt`
3. **Copia il contenuto completo** di:
   ```
   supabase/functions/analyze-heatmap-screenshot-gpt/index.ts
   ```
4. **Incolla nel code editor**
5. **Clicca "Deploy"**
6. **Attendi completamento deploy**

---

#### **2.3: analyze-squad-formation-gpt**

1. **Clicca "New function"**
2. **Nome funzione**: `analyze-squad-formation-gpt`
3. **Copia il contenuto completo** di:
   ```
   supabase/functions/analyze-squad-formation-gpt/index.ts
   ```
4. **Incolla nel code editor**
5. **Clicca "Deploy"**
6. **Attendi completamento deploy**

---

#### **2.4: analyze-player-ratings-gpt**

1. **Clicca "New function"**
2. **Nome funzione**: `analyze-player-ratings-gpt`
3. **Copia il contenuto completo** di:
   ```
   supabase/functions/analyze-player-ratings-gpt/index.ts
   ```
4. **Incolla nel code editor**
5. **Clicca "Deploy"**
6. **Attendi completamento deploy**

---

## ✅ STEP 3: Verifica Deployment

### **Checklist**:

1. **Vai su Edge Functions** → **Functions**
2. **Verifica che tutte le funzioni siano ACTIVE**:
   - ✅ `process-screenshot-gpt` - Status: ACTIVE
   - ✅ `analyze-heatmap-screenshot-gpt` - Status: ACTIVE
   - ✅ `analyze-squad-formation-gpt` - Status: ACTIVE
   - ✅ `analyze-player-ratings-gpt` - Status: ACTIVE

3. **Verifica Secrets**:
   - ✅ `OPENAI_API_KEY` presente in Settings → Secrets

---

## 🧪 STEP 4: Test Endpoint (Opzionale)

### **Test process-screenshot-gpt**:

```bash
# Sostituisci YOUR_PROJECT_REF e YOUR_ANON_KEY
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-screenshot-gpt \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/test.jpg",
    "image_type": "player_profile",
    "user_id": "test-user-id"
  }'
```

**Risultato atteso**: JSON con `success: true` e `candidate_profile`

---

## 📊 STEP 5: Verifica Logs

1. **Vai su Edge Functions** → **Logs**
2. **Filtra per funzione** (es. `process-screenshot-gpt`)
3. **Verifica**:
   - Nessun errore critico
   - Logs di processing normali

---

## ⚠️ TROUBLESHOOTING

### **Errore: "OPENAI_API_KEY not configured"**
- **Causa**: Secret non configurato
- **Soluzione**: Vai su Edge Functions → Settings → Secrets e aggiungi `OPENAI_API_KEY`

### **Errore: "Function deployment failed"**
- **Causa**: Errore di sintassi o import
- **Soluzione**: Controlla logs di deploy, verifica che il codice sia completo

### **Errore: "Failed to download image"**
- **Causa**: Bucket Storage non configurato o permessi mancanti
- **Soluzione**: Verifica che il bucket `player-screenshots` esista e che l'utente abbia permessi

---

## 📋 CHECKLIST COMPLETA

- [ ] Migration 003 eseguita
- [ ] `OPENAI_API_KEY` configurata come secret
- [ ] `process-screenshot-gpt` deployata e ACTIVE
- [ ] `analyze-heatmap-screenshot-gpt` deployata e ACTIVE
- [ ] `analyze-squad-formation-gpt` deployata e ACTIVE
- [ ] `analyze-player-ratings-gpt` deployata e ACTIVE
- [ ] Logs verificati (nessun errore critico)
- [ ] Test endpoint eseguito (opzionale)

---

**Status**: 🟢 **GUIDA COMPLETA** - Segui gli step per deploy completo
