# ✅ Opzione Semplice: Senza Installare Nulla

**Non ti preoccupare!** Non serve installare Node.js o CLI. Posso aiutarti in modo più semplice.

---

## 🎯 SOLUZIONE SEMPLICE: Script SQL Manuali

**Cosa faccio io**:
- ✅ Preparo tutti gli script SQL pronti
- ✅ Ti dico esattamente dove copiarli
- ✅ Ti guido passo-passo

**Cosa fai tu**:
- 📋 Copi e incolli nel Supabase Dashboard
- 🖱️ Clicchi "Run"
- ✅ Fatto!

---

## 📋 STEP 1: Esegui Migration 003

### **Cosa fare**:

1. **Apri Supabase Dashboard**
   - Vai su: https://supabase.com/dashboard
   - Seleziona il tuo progetto

2. **Vai su SQL Editor**
   - Menu laterale: **SQL Editor**
   - Clicca **"New query"**

3. **Copia lo script**
   - Apri il file: `supabase/migrations/003_add_gpt_realtime_support.sql`
   - Seleziona tutto (`Ctrl+A`) e copia (`Ctrl+C`)

4. **Incolla e esegui**
   - Incolla nel SQL Editor (`Ctrl+V`)
   - Clicca **"Run"** o premi `Ctrl+Enter`
   - Attendi il completamento

5. **Verifica**
   - Dovresti vedere: "Success. No rows returned"
   - Se vedi errori, dimmeli e li risolvo

---

## 🚀 STEP 2: Deploy Edge Functions

### **Per ogni Edge Function** (4 funzioni):

#### **2.1: process-screenshot-gpt**

1. **Vai su Edge Functions**
   - Menu: **Edge Functions** → **Functions**
   - Clicca **"New function"**

2. **Crea funzione**
   - **Nome**: `process-screenshot-gpt`
   - **Copia contenuto** di: `supabase/functions/process-screenshot-gpt/index.ts`
   - **Incolla** nel code editor
   - **Clicca "Deploy"**

3. **Ripeti per le altre 3**:
   - `analyze-heatmap-screenshot-gpt`
   - `analyze-squad-formation-gpt`
   - `analyze-player-ratings-gpt`

**Tempo totale**: ~10-15 minuti

---

## 🔐 STEP 3: Configura OPENAI_API_KEY

1. **Vai su Edge Functions** → **Settings** → **Secrets**
2. **Clicca "Add new secret"**
3. **Aggiungi**:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: La tua chiave OpenAI (es. `sk-...`)
   - ✅ **Sensitive**: Spunta
4. **Clicca "Save"**

---

## ✅ VERIFICA FINALE

### **Checklist**:
- [ ] Migration 003 eseguita (5 tabelle create)
- [ ] 4 Edge Functions deployate e ACTIVE
- [ ] `OPENAI_API_KEY` configurata come secret

---

## 🆘 SE HAI PROBLEMI

**Dimmi cosa vedi** e ti aiuto:
- ❌ Errori SQL? → Ti preparo fix
- ❌ Errori deploy? → Ti guido passo-passo
- ❌ Non trovi i file? → Ti do i percorsi esatti

---

## 💡 VANTAGGI DI QUESTA OPZIONE

- ✅ **Nessuna installazione** richiesta
- ✅ **Semplice**: copia e incolla
- ✅ **Sicuro**: vedi tutto quello che fai
- ✅ **Veloce**: 15 minuti totali

---

**Status**: 🟢 **PRONTO** - Segui gli step e dimmi se serve aiuto!
