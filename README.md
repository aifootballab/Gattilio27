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

✅ **DEPLOY AUTOMATICO ATTIVO**: Ogni push su `master` attiva automaticamente il deploy su Vercel.

### Setup Secrets su GitHub (REQUIRED)

Per attivare il deploy automatico, configura questi secrets nel repository GitHub:

1. **Vai su**: `https://github.com/aifootballab/Gattilio27/settings/secrets/actions`
2. **Clicca su "New repository secret"** e aggiungi:

   - **`VERCEL_TOKEN`**: 
     - Vai su [Vercel Dashboard](https://vercel.com/account/tokens)
     - Crea un nuovo token (es: `github-actions-token`)
     - Copia il token e incollalo come secret
   
   - **`VERCEL_ORG_ID`**: 
     - Vai su [Vercel Settings](https://vercel.com/account/settings)
     - Copia il "Organization ID"
   
   - **`VERCEL_PROJECT_ID`**: 
     - Vai sul tuo progetto Vercel → Settings → General
     - Copia il "Project ID"

### Workflow Automatico

```
Push su GitHub (master) 
  ↓
GitHub Actions (trigger automatico)
  ↓
Build e Deploy su Vercel (produzione)
```

Il workflow è configurato in `.github/workflows/deploy-vercel.yml` e si attiva **automaticamente** ad ogni push.

### Verifica Deploy

Dopo ogni push, controlla:
- **GitHub Actions**: `https://github.com/aifootballab/Gattilio27/actions`
- **Vercel Dashboard**: Vedi i deployment in tempo reale

## Sviluppo Locale

```bash
npm install
npm run dev
```
