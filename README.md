# Progetto eFootball

Plattaforma eFootball con integrazione Vercel, Supabase e GitHub.

## Setup

Progetto in configurazione iniziale con landing page "Benvenuto Gattilio" per test di configurazione.

## Tech Stack

- **React + Vite**: Frontend framework e build tool
- **GitHub**: Version control e CI/CD
- **Vercel**: Hosting e deployment automatico
- **Supabase**: Database e autenticazione (configurato tramite MCP)

## Allineamento GitHub, Vercel e Cursor

### Chi è @mrway80?

**@mrway80** è il tuo account GitHub configurato localmente:
- **Username GitHub**: `mrway80`
- **Email**: `mrway80@gmail.com`
- **Repository**: `aifootballab/Gattilio27`

### Problema di Connessione

Se Vercel mostra il messaggio "Please connect aifootballab on Vercel to the @mrway80 GitHub account", significa che:
- Il progetto Vercel "aifootballab" esiste
- Il repository GitHub `aifootballab/Gattilio27` esiste
- Ma l'account GitHub `@mrway80` non è ancora autorizzato nel Team Vercel

### Soluzione: Allineare i Servizi

**Passo 1: Verifica Account GitHub**
```bash
# Verifica la configurazione Git locale
git config --get user.name    # Dovrebbe essere: mrway80
git config --get user.email   # Dovrebbe essere: mrway80@gmail.com
```

**Passo 2: Verifica Connessione GitHub-Vercel**
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Clicca su **Settings** → **Git**
3. **Se vedi il repository connesso** (`aifootballab/Gattilio27` con "Connected"):
   - ✅ **Tutto è già configurato!** Il repository è connesso
   - Il deploy automatico dovrebbe funzionare
   - Puoi testare facendo un push su GitHub
4. **Se NON vedi il repository connesso** o vedi un messaggio di errore:
   - Clicca su **"Disconnect"** (se presente)
   - Poi clicca su **"Connect Git Repository"** o **"Connect @mrway80"**
   - Autorizza Vercel ad accedere al tuo account GitHub
   - Seleziona il repository `aifootballab/Gattilio27`

**Passo 3: Verifica in Cursor**
- Cursor usa automaticamente la configurazione Git locale
- Assicurati di essere loggato con l'account corretto su GitHub
- I commit verranno fatti con `mrway80` come autore

**Passo 4: Verifica che Tutto Funzioni**

Se il repository è già connesso (vedi "Connected" in Settings → Git), puoi testare il workflow:

```bash
# Fai una modifica e committa
git add .
git commit -m "test: verifica allineamento GitHub-Vercel"
git push origin master

# Vercel dovrebbe automaticamente:
# 1. Rilevare il push (vedi in Vercel Dashboard → Deployments)
# 2. Fare il build
# 3. Deployare su produzione
```

**Come verificare che funzioni:**
1. Dopo il push, vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto **aifootballab**
3. Vai su **Deployments**
4. Dovresti vedere un nuovo deployment in corso o completato
5. Se vedi il deployment, significa che tutto è allineato correttamente!

### Stato Attuale

✅ **Configurato e Allineato**:
- ✅ Repository Git: `aifootballab/Gattilio27`
- ✅ Git user: `mrway80` (mrway80@gmail.com)
- ✅ Git remote: `https://github.com/aifootballab/Gattilio27.git`
- ✅ Vercel config: `vercel.json` presente
- ✅ Cursor: Usa automaticamente la configurazione Git locale

✅ **Repository Connesso**:
- Il repository `aifootballab/Gattilio27` è già connesso a Vercel
- Il deploy automatico dovrebbe essere attivo
- Se vedi "Connected" nella pagina Settings → Git, tutto è configurato correttamente

💡 **Nota**: Se non vedi il pulsante "Connect @mrway80", significa che il repository è già connesso. Il pulsante appare solo quando serve riconnettere o quando c'è un problema di autorizzazione.

### Script di Verifica

Sono disponibili due script PowerShell per gestire l'allineamento:
- **`check-alignment.ps1`**: Verifica lo stato corrente della configurazione
- **`setup-alignment.ps1`**: Configura automaticamente Git per l'allineamento

Per eseguire la verifica:
```powershell
powershell -ExecutionPolicy Bypass -File .\check-alignment.ps1
```

## Configurazione Deploy Automatico su Vercel

✅ **DEPLOY AUTOMATICO ATTIVO**: Ogni push su `master` attiva automaticamente il deploy su Vercel tramite l'integrazione nativa GitHub.

⚠️ **IMPORTANTE**: Se Vercel sta deployando commit vecchi (es. `cd5c308`), verifica su Vercel Dashboard:
1. Settings → Git → Disconnect e riconnetti il repository
2. Cancella i deploy falliti vecchi
3. Vai su Deployments → "Redeploy" del commit più recente (`845a3b5` o successivo)

### Setup Vercel (UNA VOLTA SOLA)

1. **Collega il repository GitHub a Vercel**:
   - Vai su [Vercel Dashboard](https://vercel.com/new)
   - Seleziona "Import Git Repository"
   - Autorizza Vercel ad accedere a `aifootballab/Gattilio27`
   - Vercel rileverà automaticamente Vite e configurerà il progetto

2. **Verifica le impostazioni**:
   - Framework: Vite (auto-rilevato)
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Workflow Automatico

```
Push su GitHub (master) 
  ↓
Vercel rileva il commit automaticamente
  ↓
Build e Deploy automatico su Vercel (produzione)
```

### Verifica Deploy

Dopo ogni push, controlla:
- **Vercel Dashboard**: Vedi i deployment in tempo reale
- I deployment vengono creati automaticamente per ogni push su `master`

## Sviluppo Locale

```bash
npm install
npm run dev
```
