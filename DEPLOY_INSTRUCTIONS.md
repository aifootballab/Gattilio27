# 🚀 Istruzioni Deploy su Vercel

## ⚠️ Situazione Attuale

Il repository Git è configurato nella directory home invece che nella directory del progetto. Per deployare correttamente, hai due opzioni:

---

## Opzione 1: Deploy Manuale su Vercel (Raccomandato)

### Step 1: Preparare i File
Tutti i file del progetto sono già pronti nella directory:
```
C:\Users\Gaetano\Desktop\Progetto efootball\
```

### Step 2: Deploy su Vercel
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Clicca su **"Add New..."** → **"Project"**
3. Seleziona il repository `aifootballab/Gattilio27`
4. Vercel rileverà automaticamente:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Clicca **"Deploy"**

### Step 3: Verifica Deploy
- Vercel farà il build automaticamente
- Se ci sono errori, controlla i log nel dashboard
- Una volta completato, avrai l'URL di produzione

---

## Opzione 2: Fix Git e Deploy Automatico

### Step 1: Inizializza Git nella Directory del Progetto

Apri PowerShell nella directory del progetto:
```powershell
cd "C:\Users\Gaetano\Desktop\Progetto efootball"
```

### Step 2: Inizializza Repository (se non esiste)
```powershell
# Rimuovi .git dalla home (se presente)
# Poi nella directory del progetto:
git init
git remote add origin https://github.com/aifootballab/Gattilio27.git
```

### Step 3: Aggiungi Solo i File del Progetto
```powershell
# Aggiungi file specifici
git add package.json package-lock.json
git add src/
git add index.html vite.config.js vercel.json
git add *.md
git add .gitignore
```

### Step 4: Commit e Push
```powershell
git commit -m "feat: struttura frontend completa con Rosa Profiling"
git branch -M master
git push -u origin master
```

### Step 5: Vercel Deploy Automatico
- Vercel rileverà automaticamente il push
- Farà il build e deploy automaticamente

---

## ✅ Verifica Post-Deploy

Dopo il deploy, verifica:

1. **URL Produzione**: Dovresti avere un URL tipo `gattilio27.vercel.app`
2. **Routing**: Naviga tra le pagine:
   - `/` - Home
   - `/dashboard` - Dashboard
   - `/rosa` - Profilazione Rosa
3. **Funzionalità**: Testa la creazione rosa con le 3 modalità

---

## 🔧 Troubleshooting

### Build Fails su Vercel
- Verifica che `package.json` abbia lo script `build`
- Controlla i log di build su Vercel Dashboard
- Assicurati che tutte le dipendenze siano in `package.json`

### Routing Non Funziona
- Verifica che `vercel.json` abbia le rewrite rules per SPA
- Controlla che React Router sia configurato correttamente

### File Non Trovati
- Assicurati che tutti i file siano committati
- Verifica che `.gitignore` non escluda file necessari

---

## 📝 Note Importanti

- **Non committare**: `node_modules/`, `.env`, `dist/`
- **Committa sempre**: `package.json`, `src/`, `vite.config.js`, `vercel.json`
- **Deploy automatico**: Funziona solo se Git è configurato correttamente nella directory del progetto

---

## 🎯 Prossimi Passi Dopo Deploy

1. ✅ Testa l'app online
2. ⏳ Integra Supabase (backend)
3. ⏳ Integra AI APIs (Vision, Speech, LLM)
4. ⏳ Aggiungi autenticazione utente

---

**Status**: Pronto per deploy! 🚀
