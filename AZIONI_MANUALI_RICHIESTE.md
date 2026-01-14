# ✅ Checklist Azioni Manuali Richieste
## Cosa devi fare TU manualmente

**Data**: 2025-01-12  
**Status**: 📋 **CHECKLIST COMPLETA**

---

## 🎯 SITUAZIONE ATTUALE

### **✅ Già Configurato (OK)**:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` in Vercel
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- ✅ `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- ✅ `GOOGLE_VISION_CREDENTIALS` in Vercel
- ✅ `GOOGLE_VISION_PROJECT_ID` in Vercel
- ✅ `GOOGLE_VISION_API_ENABLED` in Vercel
- ✅ `GOOGLE_VISION_MAX_IMAGE_SIZE_MB` in Vercel

### **❌ Mancante (DA FARE)**:
- (Niente setup locale: usi solo deploy Vercel)

---

## 📋 AZIONI MANUALI RICHIESTE (SOLO VERCEL)

**Cosa fare**:
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

**Dopo aver aggiunto**:
- Vai su **Deployments**
- Clicca **"Redeploy"** sul deployment più recente
- Vercel ricostruirà con le nuove variabili

---

## ✅ CHECKLIST COMPLETA

### **Per Vercel (Produzione)**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` aggiunto in Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` aggiunto in Vercel
- [ ] Variabili configurate per tutti gli ambienti
- [ ] Redeploy fatto

---

## 🔍 VERIFICA

### **Vercel**:
1. Vai su Vercel Dashboard → Settings → Environment Variables
2. Verifica che ci siano:
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`
   - ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🎯 RIEPILOGO VALORI

### **Valori da usare** (già configurati in Vercel):

**Per Vercel** (stessi valori):
- `NEXT_PUBLIC_SUPABASE_URL` = `https://zliuuorrwdetylollrua.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr`

---

## ⚠️ IMPORTANTE

### **Nota su Next.js**
- Le variabili esposte al browser devono iniziare con `NEXT_PUBLIC_`.

---

## 🚀 DOPO AVER FATTO

### **Test Produzione**:
1. Fai redeploy su Vercel
2. Apri l'app deployata
3. Verifica console browser (stesso messaggio)

---

## 📝 NOTE

- ✅ **Valori**: Stessi di `NEXT_PUBLIC_*` già configurati
- ✅ **Tempo**: 5 minuti per configurare
- ✅ **Rischio**: Zero (solo aggiunta variabili)

---

**Status**: 🟢 **CHECKLIST COMPLETA - SEGUI I PASSI SOPRA**
