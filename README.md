# Progetto eFootball

Plattaforma eFootball con integrazione Vercel, Supabase e GitHub.

## Setup

Progetto in configurazione iniziale con landing page "Benvenuto Gattilio" per test di configurazione.

## Tech Stack

- **React + Vite**: Frontend framework e build tool
- **GitHub**: Version control e CI/CD
- **Vercel**: Hosting e deployment automatico
- **Supabase**: Database e autenticazione (configurato tramite MCP)

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
