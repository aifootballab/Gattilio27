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
- ❌ `VITE_SUPABASE_URL` in Vercel (per progetto attuale Vite)
- ❌ `VITE_SUPABASE_ANON_KEY` in Vercel (per progetto attuale Vite)
- ❌ File `.env` locale (per sviluppo locale)

---

## 📋 AZIONI MANUALI RICHIESTE

### **OPZIONE 1: Per Sviluppo Locale (Sviluppo)**

**Cosa fare**:
1. Crea file `.env` nella root del progetto
2. Aggiungi queste righe:

```env
VITE_SUPABASE_URL=https://zliuuorrwdetylollrua.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr
```

**Dove creare**:
- File: `.env` (nella root, stessa cartella di `package.json`)
- Path: `C:\Users\Gaetano\Desktop\Progetto efootball\.env`

**Come creare**:
1. Apri Cursor/VS Code
2. Clicca destro nella root del progetto
3. "New File" → Nome: `.env`
4. Incolla le righe sopra
5. Salva

**Nota**: Il file `.env` è già in `.gitignore`, quindi NON verrà committato (sicuro!)

---

### **OPZIONE 2: Per Vercel (Produzione)**

**Cosa fare**:
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto
3. Vai su **Settings** → **Environment Variables**
4. Clicca **"Add New"**

**Variabile 1**:
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://zliuuorrwdetylollrua.supabase.co`
- **Environment**: Seleziona tutte (Production, Preview, Development)
- Clicca **Save**

**Variabile 2**:
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr`
- **Environment**: Seleziona tutte (Production, Preview, Development)
- Clicca **Save**

**Dopo aver aggiunto**:
- Vai su **Deployments**
- Clicca **"Redeploy"** sul deployment più recente
- Vercel ricostruirà con le nuove variabili

---

## ✅ CHECKLIST COMPLETA

### **Per Sviluppo Locale**:
- [ ] File `.env` creato nella root
- [ ] `VITE_SUPABASE_URL` aggiunto in `.env`
- [ ] `VITE_SUPABASE_ANON_KEY` aggiunto in `.env`
- [ ] Server riavviato (`npm run dev`)

### **Per Vercel (Produzione)**:
- [ ] `VITE_SUPABASE_URL` aggiunto in Vercel
- [ ] `VITE_SUPABASE_ANON_KEY` aggiunto in Vercel
- [ ] Variabili configurate per tutti gli ambienti
- [ ] Redeploy fatto

---

## 🔍 VERIFICA

### **Locale**:
```bash
# Verifica che .env esista
ls .env  # (o dir .env su Windows)

# Verifica contenuto (senza mostrare valori)
cat .env | grep VITE_SUPABASE
```

### **Vercel**:
1. Vai su Vercel Dashboard → Settings → Environment Variables
2. Verifica che ci siano:
   - ✅ `VITE_SUPABASE_URL`
   - ✅ `VITE_SUPABASE_ANON_KEY`

### **Runtime (Browser Console)**:
Apri la console del browser e verifica:
```javascript
// Dovrebbe mostrare i valori (non undefined)
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_ANON_KEY)
```

---

## 🎯 RIEPILOGO VALORI

### **Valori da usare** (già configurati in Vercel):

**Per `.env` locale**:
```env
VITE_SUPABASE_URL=https://zliuuorrwdetylollrua.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr
```

**Per Vercel** (stessi valori):
- `VITE_SUPABASE_URL` = `https://zliuuorrwdetylollrua.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `sb_publishable_8SwNxwen65r_fWoe3joRZw_a_WdX1hr`

---

## ⚠️ IMPORTANTE

### **Perché serve `VITE_*` se hai già `NEXT_PUBLIC_*`?**
- **Vite** usa prefisso `VITE_*` per variabili esposte al frontend
- **Next.js** usa prefisso `NEXT_PUBLIC_*` per variabili esposte al frontend
- **Sono diversi** perché sono framework diversi!

### **Se migri a Next.js**:
- ✅ Le variabili `NEXT_PUBLIC_*` sono già configurate!
- ✅ Non serve aggiungere `VITE_*`
- ✅ Funziona subito

### **Se rimani con Vite**:
- ❌ Serve aggiungere `VITE_*` (sia locale che Vercel)
- ❌ Le `NEXT_PUBLIC_*` non servono (ma non fanno male)

---

## 🚀 DOPO AVER FATTO

### **Test Locale**:
```bash
# 1. Riavvia server
npm run dev

# 2. Verifica console browser
# Dovrebbe vedere: "✅ Supabase configurato correttamente"
# Invece di: "❌ Supabase URL o Anon Key non configurati!"
```

### **Test Produzione**:
1. Fai redeploy su Vercel
2. Apri l'app deployata
3. Verifica console browser (stesso messaggio)

---

## 📝 NOTE

- ✅ **File `.env`**: Già in `.gitignore`, sicuro da committare
- ✅ **Valori**: Stessi di `NEXT_PUBLIC_*` già configurati
- ✅ **Tempo**: 5 minuti per configurare
- ✅ **Rischio**: Zero (solo aggiunta variabili)

---

**Status**: 🟢 **CHECKLIST COMPLETA - SEGUI I PASSI SOPRA**
