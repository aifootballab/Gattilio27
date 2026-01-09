# Progetto eFootball

Plattaforma eFootball con integrazione Vercel, Supabase e GitHub.

## Setup

Progetto in configurazione iniziale.

## Tech Stack

- **GitHub**: Version control e CI/CD
- **Vercel**: Hosting e deployment automatico
- **Supabase**: Database e autenticazione

## Configurazione Deploy Automatico su Vercel

Il progetto è configurato per fare deploy automatico su Vercel ogni volta che fai push su GitHub.

### Setup Secrets su GitHub

Per attivare il deploy automatico, devi configurare i seguenti secrets nel repository GitHub:

1. Vai su: `https://github.com/aifootballab/Gattilio27/settings/secrets/actions`
2. Aggiungi i seguenti secrets:
   - `VERCEL_TOKEN`: Token di accesso Vercel (puoi trovarlo in Vercel Dashboard → Settings → Tokens)
   - `VERCEL_ORG_ID`: Organization ID di Vercel (nelle impostazioni del progetto)
   - `VERCEL_PROJECT_ID`: Project ID di Vercel (nelle impostazioni del progetto)

### Workflow

```
Push su GitHub → GitHub Actions → Deploy su Vercel (automatico)
```

Il workflow è configurato in `.github/workflows/deploy-vercel.yml`

## Sviluppo Locale

```bash
npm install
npm run dev
```
