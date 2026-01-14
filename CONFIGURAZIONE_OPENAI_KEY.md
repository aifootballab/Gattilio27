# 🔑 Configurazione OpenAI API Key

**Data**: 2025-01-14  
**Status**: ✅ **GUIDA COMPLETA**  
**Dove**: **SUPABASE** (non Vercel)

---

## 🎯 DOVE METTERE LA CHIAVE?

### ✅ **SUPABASE** (CORRETTO)

La chiave OpenAI va configurata in **Supabase**, non in Vercel.

**Motivo**:
- Le Edge Functions GPT-Realtime sono deployate su **Supabase**
- Le Edge Functions leggono i secrets da **Supabase Edge Functions Secrets**
- Il frontend (Vercel) chiama le Edge Functions di Supabase, non OpenAI direttamente

---

## 📋 COME CONFIGURARE

### **Step 1: Vai su Supabase Dashboard**

1. Apri: https://supabase.com/dashboard/project/zliuuorrwdetylollrua
2. Vai su **Edge Functions** (menu laterale sinistro)
3. Clicca su **Settings** (in alto a destra)
4. Vai alla tab **Secrets**

### **Step 2: Aggiungi Secret**

1. Clicca **"Add new secret"** o **"New secret"**
2. Compila:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-...` (la tua chiave OpenAI)
   - **Sensitive**: ✅ Sì (spunta questa opzione)
3. Clicca **"Save"** o **"Add"**

### **Step 3: Verifica**

Dovresti vedere nella lista:
- ✅ `OPENAI_API_KEY` - (hidden) - Sensitive: Yes

---

## 🔍 ARCHITETTURA

```
┌─────────────────┐
│   Frontend      │
│   (Vercel)      │
│   Next.js       │
└────────┬─────────┘
         │
         │ Chiama Edge Function
         │ (non OpenAI direttamente)
         ▼
┌─────────────────┐
│  Supabase       │
│  Edge Functions │
│                 │
│  process-       │
│  screenshot-gpt │
└────────┬─────────┘
         │
         │ Legge OPENAI_API_KEY
         │ da Supabase Secrets
         ▼
┌─────────────────┐
│  OpenAI API     │
│  (GPT-4o)       │
└─────────────────┘
```

**Flusso**:
1. Frontend (Vercel) → Chiama `supabase.functions.invoke('process-screenshot-gpt')`
2. Edge Function (Supabase) → Legge `OPENAI_API_KEY` da Supabase Secrets
3. Edge Function → Chiama OpenAI API con la chiave

---

## ⚠️ IMPORTANTE

### **NON mettere la chiave in**:
- ❌ Vercel Environment Variables (non serve)
- ❌ File `.env.local` nel frontend (non serve e non funzionerebbe)
- ❌ Codice sorgente (mai!)

### **SÌ mettere la chiave in**:
- ✅ Supabase Edge Functions Secrets (corretto!)

---

## 🧪 VERIFICA CONFIGURAZIONE

### **Test 1: Verifica Secret Esistente**

Nel Dashboard Supabase:
- Edge Functions → Settings → Secrets
- Verifica che `OPENAI_API_KEY` sia presente

### **Test 2: Test Edge Function**

Dopo deploy Edge Function, testa:

```bash
curl -X POST https://zliuuorrwdetylollrua.supabase.co/functions/v1/process-screenshot-gpt \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/test.jpg",
    "image_type": "player_profile",
    "user_id": "test-user-id"
  }'
```

**Se la chiave NON è configurata**, vedrai errore:
```json
{
  "error": "OPENAI_API_KEY not configured. Please set in Supabase Edge Functions secrets."
}
```

**Se la chiave È configurata**, vedrai:
```json
{
  "success": true,
  "candidate_profile": { ... }
}
```

---

## 📝 ALTRI SECRETS NECESSARI

Supabase Edge Functions hanno già configurati automaticamente:
- ✅ `SUPABASE_URL` - URL del progetto
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key

**Tu devi aggiungere solo**:
- ✅ `OPENAI_API_KEY` - La tua chiave OpenAI

---

## 🔒 SICUREZZA

### **Best Practices**:
- ✅ Usa sempre **Sensitive: Yes** per secrets
- ✅ Non committare mai chiavi nel codice
- ✅ Ruota chiavi periodicamente
- ✅ Usa chiavi diverse per sviluppo/produzione (se necessario)

### **Come Ottenere Chiave OpenAI**:
1. Vai su: https://platform.openai.com/api-keys
2. Clicca **"Create new secret key"**
3. Copia la chiave (inizia con `sk-`)
4. **⚠️ IMPORTANTE**: Salvala subito, non la vedrai più!

---

## ✅ CHECKLIST

- [ ] Chiave OpenAI ottenuta da platform.openai.com
- [ ] Vai su Supabase Dashboard → Edge Functions → Settings → Secrets
- [ ] Aggiunto secret `OPENAI_API_KEY` con valore `sk-...`
- [ ] Impostato **Sensitive: Yes**
- [ ] Verificato che secret sia presente nella lista
- [ ] Testato Edge Function (opzionale)

---

**Status**: 🟢 **GUIDA COMPLETA** - Configura la chiave in Supabase!