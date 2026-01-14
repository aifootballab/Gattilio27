# 🔧 Fix Variabili d'Ambiente Vercel
## Progetto Next.js: usa SOLO NEXT_PUBLIC_*

**Data**: 2025-01-12  
**Status**: ✅ **SOLUZIONE IMMEDIATA**

---

## 🚨 PROBLEMA IDENTIFICATO

Il progetto è **Next.js** (vedi `package.json`, `vercel.json`, `tsconfig.json`).
Quindi in Vercel devi usare:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ✅ SOLUZIONE IMMEDIATA

### **Step 1: Aggiungi le Variabili Corrette in Vercel**

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto
3. Vai su **Settings** → **Environment Variables**
4. Clicca **"Add New"**

**Variabile 1**:
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://zliuuorrwdetylollrua.supabase.co`
- **Environment**: Seleziona tutte (Production, Preview, Development)
- Clicca **Save**

**Variabile 2**:
- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr`
- **Environment**: Seleziona tutte (Production, Preview, Development)
- Clicca **Save**

---

### **Step 2: Redeploy**

**IMPORTANTE**: Dopo aver aggiunto le variabili, devi fare un **Redeploy**:

1. Vai su **Deployments**
2. Clicca sui **tre puntini** (⋯) del deployment più recente
3. Seleziona **"Redeploy"**
4. Vercel ricostruirà con le nuove variabili

---

## 📋 VARIABILI FINALI IN VERCEL

Dopo aver aggiunto le variabili, avrai:

### **Frontend (Next.js)**:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://zliuuorrwdetylollrua.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr`

### **Per Edge Functions (Backend)**:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = (già configurato)
- ✅ `GOOGLE_VISION_CREDENTIALS` = (già configurato)
- ✅ `GOOGLE_VISION_PROJECT_ID` = (già configurato)
- ✅ `GOOGLE_VISION_API_ENABLED` = `true` (già configurato)
- ✅ `GOOGLE_VISION_MAX_IMAGE_SIZE_MB` = `10` (già configurato)

---

## 🔍 NOTA

In Next.js le variabili da esporre al browser devono iniziare con `NEXT_PUBLIC_`.

---

## ✅ CHECKLIST

- [ ] Aggiunto `NEXT_PUBLIC_SUPABASE_URL` in Vercel
- [ ] Aggiunto `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- [ ] Variabili configurate per tutti gli ambienti (Production, Preview, Development)
- [ ] Redeploy fatto
- [ ] Errore risolto in console

---

## 🎯 DOPO IL REDEPLOY

Dovresti vedere in console:
```
✅ Supabase configurato correttamente
```

Invece di:
```
❌ Supabase URL o Anon Key non configurati!
```

---

**Status**: 🟢 **SEGUI I PASSI SOPRA PER RISOLVERE**
