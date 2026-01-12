# 🔧 Configurazione Variabili d'Ambiente
## Fix errore "Supabase non configurato"

**Data**: 2025-01-12  
**Status**: ✅ **GUIDA COMPLETA**

---

## 🚨 ERRORE ATTUALE

```
Supabase URL o Anon Key non configurati nelle variabili d'ambiente
Errore caricamento rosa: Error: Supabase non configurato
```

**Causa**: Le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` non sono configurate.

---

## ✅ SOLUZIONE

### **Opzione 1: Configurazione Locale (Sviluppo)**

**Step 1: Crea file `.env` nella root del progetto**

```bash
# Nella root del progetto
touch .env
```

**Step 2: Aggiungi le variabili**

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 3: Ottieni i valori da Supabase**

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Settings** → **API**
4. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY` (⚠️ NON usare service_role!)

**Step 4: Riavvia il server di sviluppo**

```bash
# Ferma il server (Ctrl+C)
# Riavvia
npm run dev
```

---

### **Opzione 2: Configurazione Vercel (Produzione)**

**Step 1: Vai su Vercel Dashboard**

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto **aifootballab** (o il tuo progetto)

**Step 2: Aggiungi Environment Variables**

1. Vai su **Settings** → **Environment Variables**
2. Clicca **Add New**
3. Aggiungi:

   **Variabile 1**:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://your-project-id.supabase.co`
   - **Environment**: Seleziona tutte (Production, Preview, Development)
   - Clicca **Save**

   **Variabile 2**:
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `your-anon-key-here`
   - **Environment**: Seleziona tutte (Production, Preview, Development)
   - Clicca **Save**

**Step 3: Redeploy**

1. Vai su **Deployments**
2. Clicca sui **tre puntini** (⋯) del deployment più recente
3. Seleziona **Redeploy**
4. Vercel ricostruirà con le nuove variabili

---

## 📋 VARIABILI NECESSARIE

### **Frontend (Vite)**:

| Variabile | Descrizione | Dove trovarla |
|-----------|-------------|---------------|
| `VITE_SUPABASE_URL` | URL progetto Supabase | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Chiave pubblica anon | Supabase Dashboard → Settings → API → anon/public key |

**⚠️ IMPORTANTE**:
- Usa la chiave **anon** o **public** (non service_role!)
- Le variabili `VITE_*` sono esposte al frontend (pubbliche)
- Non sono segrete, ma necessarie per il funzionamento

---

### **Backend (Edge Functions)**:

Queste sono configurate automaticamente da Supabase quando deployi le Edge Functions.

| Variabile | Descrizione | Configurazione |
|-----------|-------------|----------------|
| `SUPABASE_URL` | URL progetto | Auto-configurato da Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chiave service role | Auto-configurato da Supabase |
| `GOOGLE_VISION_API_KEY` | Chiave Google Vision API | Da configurare manualmente in Vercel |

**Per Edge Functions**:
- Vai su Supabase Dashboard → **Edge Functions** → **Settings**
- Le variabili `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono già configurate
- Per `GOOGLE_VISION_API_KEY`: configura in Vercel (se usi Vercel per deploy Edge Functions)

---

## 🔍 VERIFICA CONFIGURAZIONE

### **Locale**:

```bash
# Verifica che .env esista
ls -la .env

# Verifica contenuto (senza mostrare valori)
cat .env | grep VITE_SUPABASE
```

### **Vercel**:

1. Vai su Vercel Dashboard → **Settings** → **Environment Variables**
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

## 🛠️ TROUBLESHOOTING

### **Problema 1: Variabili non caricate dopo creazione .env**

**Soluzione**:
```bash
# Riavvia il server di sviluppo
# Vite carica .env solo all'avvio
npm run dev
```

### **Problema 2: Variabili non funzionano in Vercel**

**Soluzione**:
1. Verifica che le variabili siano configurate in Vercel
2. **Redeploy** il progetto (le variabili vengono caricate al build time)
3. Verifica che i nomi siano esatti: `VITE_SUPABASE_URL` (con VITE_ prefix!)

### **Problema 3: Errore "Invalid API key"**

**Soluzione**:
- Verifica di usare la chiave **anon/public**, non service_role
- Verifica che l'URL sia corretto (formato: `https://xxx.supabase.co`)

### **Problema 4: Variabili funzionano localmente ma non su Vercel**

**Soluzione**:
1. Vai su Vercel Dashboard → **Settings** → **Environment Variables**
2. Verifica che le variabili siano configurate per **tutti gli ambienti** (Production, Preview, Development)
3. Fai **Redeploy** dopo aver aggiunto le variabili

---

## 📝 FILE .env.example

Ho creato `.env.example` come template:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Uso**:
1. Copia `.env.example` come `.env`
2. Sostituisci i valori placeholder con i tuoi valori reali
3. `.env` è già in `.gitignore` (non viene committato)

---

## ✅ CHECKLIST

- [ ] File `.env` creato nella root
- [ ] `VITE_SUPABASE_URL` configurato
- [ ] `VITE_SUPABASE_ANON_KEY` configurato
- [ ] Server di sviluppo riavviato
- [ ] Variabili configurate in Vercel (per produzione)
- [ ] Redeploy fatto su Vercel (se necessario)
- [ ] Errore risolto in console

---

## 🎯 PROSSIMI STEP

Dopo aver configurato le variabili:

1. **Test Locale**:
   ```bash
   npm run dev
   # Verifica che non ci siano più errori in console
   ```

2. **Test Produzione**:
   - Fai push su GitHub
   - Vercel deployerà automaticamente
   - Verifica che funzioni su Vercel

3. **Test Funzionalità**:
   - Prova a caricare uno screenshot
   - Verifica che la rosa si carichi
   - Verifica che i dati vengano salvati

---

**Status**: 🟢 **GUIDA COMPLETA - SEGUI I PASSI SOPRA**
