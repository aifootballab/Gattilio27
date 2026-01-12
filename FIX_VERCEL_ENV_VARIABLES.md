# 🔧 Fix Variabili d'Ambiente Vercel
## Problema: NEXT_PUBLIC_* vs VITE_*

**Data**: 2025-01-12  
**Status**: ✅ **SOLUZIONE IMMEDIATA**

---

## 🚨 PROBLEMA IDENTIFICATO

Hai configurato in Vercel:
- ❌ `NEXT_PUBLIC_SUPABASE_URL` (per Next.js)
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (per Next.js)

Ma il progetto usa **Vite**, quindi serve:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

---

## ✅ SOLUZIONE IMMEDIATA

### **Step 1: Aggiungi le Variabili Corrette in Vercel**

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto
3. Vai su **Settings** → **Environment Variables**
4. Clicca **"Add New"**

**Variabile 1**:
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://zliuuorrwdetylollrua.supabase.co` (usa lo stesso valore di `NEXT_PUBLIC_SUPABASE_URL`)
- **Environment**: Seleziona tutte (Production, Preview, Development)
- Clicca **Save**

**Variabile 2**:
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr` (usa lo stesso valore di `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
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

Dopo aver aggiunto le nuove variabili, avrai:

### **Per Vite (Frontend)**:
- ✅ `VITE_SUPABASE_URL` = `https://zliuuorrwdetylollrua.supabase.co`
- ✅ `VITE_SUPABASE_ANON_KEY` = `sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr`

### **Per Edge Functions (Backend)**:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = (già configurato)
- ✅ `GOOGLE_VISION_CREDENTIALS` = (già configurato)
- ✅ `GOOGLE_VISION_PROJECT_ID` = (già configurato)
- ✅ `GOOGLE_VISION_API_ENABLED` = `true` (già configurato)
- ✅ `GOOGLE_VISION_MAX_IMAGE_SIZE_MB` = `10` (già configurato)

### **Opzionali (non necessarie per Vite)**:
- ⚠️ `NEXT_PUBLIC_SUPABASE_URL` (puoi lasciarla o rimuoverla, non fa male)
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (puoi lasciarla o rimuoverla, non fa male)

---

## 🔍 PERCHÉ QUESTA DIFFERENZA?

### **Next.js** usa:
- `NEXT_PUBLIC_*` per variabili esposte al frontend

### **Vite** usa:
- `VITE_*` per variabili esposte al frontend

**Entrambi** servono allo stesso scopo (esporre variabili al frontend), ma hanno prefissi diversi.

---

## ✅ CHECKLIST

- [ ] Aggiunto `VITE_SUPABASE_URL` in Vercel
- [ ] Aggiunto `VITE_SUPABASE_ANON_KEY` in Vercel
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
