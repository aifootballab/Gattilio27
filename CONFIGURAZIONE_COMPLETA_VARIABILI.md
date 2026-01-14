# ✅ Configurazione Variabili d'Ambiente - COMPLETA

**Data**: 2025-01-14  
**Status**: 🟢 **CONFIGURAZIONE COMPLETA**

---

## 📋 VERIFICA CONFIGURAZIONE

### **✅ Vercel (Frontend) - COMPLETO**

Tutte le variabili necessarie sono configurate:

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Configurata
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Configurata
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configurata
- ✅ `GOOGLE_VISION_API_ABILITATO` - Configurata
- ✅ `GOOGLE_VISION_MAX_IMAGE_SIZE_MB` - Configurata
- ✅ `NEXT_PUBLIC_OPENAI_API_KEY` - **APPENA AGGIUNTA** ✅

---

### **⚠️ Supabase (Edge Functions) - DA VERIFICARE**

Verifica che queste variabili siano configurate in **Supabase Dashboard**:

1. Vai su: https://supabase.com/dashboard/project/zliuuorrwdetylollrua
2. Menu laterale → **Edge Functions**
3. Clicca su **Settings** (in alto a destra)
4. Tab **Secrets**

**Variabili richieste:**

- ✅ `OPENAI_API_KEY` - **DA VERIFICARE**
  - Name: `OPENAI_API_KEY`
  - Value: `sk-proj-...` (la stessa chiave OpenAI usata in Vercel)
  - Sensitive: Yes

- ✅ `SUPABASE_URL` - Automatica (già presente)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Automatica (già presente)

---

## 🚀 PROSSIMI PASSI

### **1. Redeploy Vercel (OBBLIGATORIO)**

⚠️ **IMPORTANTE**: Le modifiche alle variabili d'ambiente richiedono un nuovo deploy.

**Opzioni:**

**Opzione A: Redeploy automatico**
- Vai su Vercel Dashboard → Deployments
- Trova l'ultimo deployment
- Clicca sui 3 puntini → **Redeploy**

**Opzione B: Push a GitHub**
```bash
git commit --allow-empty -m "Trigger redeploy for env vars"
git push
```

**Opzione C: Redeploy manuale**
- Vercel Dashboard → Deployments → **Redeploy**

---

### **2. Verifica Supabase Secrets**

Assicurati che `OPENAI_API_KEY` sia configurata in Supabase:

1. Supabase Dashboard → Edge Functions → Settings → Secrets
2. Verifica presenza di `OPENAI_API_KEY`
3. Se manca, aggiungila con lo stesso valore di Vercel

---

## 🧪 TEST DOPO REDEPLOY

### **Test 1: Verifica Connessione**
1. Apri l'app in produzione
2. Apri VoiceCoachingPanel
3. **Verifica**: Nessun errore "NEXT_PUBLIC_OPENAI_API_KEY not configured"
4. **Verifica**: WebSocket si connette (vedi console: "✅ Connected to GPT Realtime API")

### **Test 2: Test Messaggio**
1. Scrivi "Ciao coach"
2. **Verifica**: Risposta appare word-by-word
3. **Verifica**: Nessun errore 500

### **Test 3: Test Function Call**
1. Scrivi "Carica la mia rosa"
2. **Verifica**: Function call viene eseguita
3. **Verifica**: Nessun errore "OPENAI_API_KEY not configured"

---

## 📝 CHECKLIST FINALE

- [x] `NEXT_PUBLIC_OPENAI_API_KEY` aggiunta in Vercel
- [ ] Redeploy Vercel eseguito
- [ ] `OPENAI_API_KEY` verificata in Supabase Secrets
- [ ] Test connessione WebSocket
- [ ] Test messaggio testuale
- [ ] Test function calling
- [ ] Test audio input/output
- [ ] Test image upload

---

## 🔍 COME VERIFICARE CHE FUNZIONA

### **Console Browser (F12):**

Dovresti vedere:
```
🔌 Connecting to OpenAI Realtime API...
✅ Connected to GPT Realtime API
📝 Session created: [session_id]
```

**Se vedi errori:**
- `NEXT_PUBLIC_OPENAI_API_KEY not configured` → Redeploy necessario
- `OPENAI_API_KEY not configured` → Verifica Supabase Secrets
- `WebSocket error` → Verifica che la chiave sia valida

---

## ✅ STATO ATTUALE

**Vercel**: 🟢 **COMPLETO** - Tutte le variabili configurate  
**Supabase**: 🟡 **DA VERIFICARE** - Verifica `OPENAI_API_KEY`  
**Redeploy**: 🔴 **NECESSARIO** - Fai redeploy per applicare modifiche

---

**Prossimo step**: **Redeploy Vercel** e verifica `OPENAI_API_KEY` in Supabase!
