# eFootball AI Coach

Web app per coaching eFootball con estrazione dati da screenshot e gestione rosa giocatori.

## Stack Tecnologico

- **Frontend**: Next.js 14, React 18
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 Vision (estrazione dati da screenshot)
- **Deploy**: Vercel

## Funzionalità Core

1. **Autenticazione**: Login con Supabase Auth
2. **Dashboard**: Pannello principale
3. **Rosa**: Upload screenshot e estrazione dati (1-6 screenshot per volta)
4. **Estrazione Screenshot**: Caricamento screenshot e estrazione dati con AI
5. **Salvataggio Giocatori**: Salvataggio automatico con associazione a `user_id`

## Struttura Progetto

```
app/
├── api/                    # API Routes
│   ├── extract-batch/      # Estrazione batch da 1-6 screenshot
│   ├── extract-player/     # Estrazione dati da singolo screenshot
│   ├── extract-formation/  # Estrazione formazione avversario
│   └── supabase/          # Operazioni database
│       ├── save-player/    # Salvataggio giocatore
│       ├── reset-my-data/  # Reset dati utente
│       └── save-opponent-formation/ # Salvataggio formazione
├── dashboard/              # Dashboard principale
├── login/                  # Pagina login
├── rosa/                   # Upload screenshot e estrazione
└── opponent-formation/     # Estrazione formazione avversario

lib/
├── authHelper.js          # Helper autenticazione
├── supabaseClient.js      # Client Supabase
├── i18n.js                # Internazionalizzazione
└── normalize.js           # Utility normalizzazione
```

## Environment Variables

### Vercel Production

**OpenAI**:
- `OPENAI_API_KEY` - API key OpenAI (server-only)

**Supabase**:
- `NEXT_PUBLIC_SUPABASE_URL` - URL progetto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key (publishable)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only)

## Setup Locale

```bash
npm install
npm run dev
```

## Deploy

Il progetto è configurato per deploy automatico su Vercel tramite GitHub.

## Note

- Le chiavi API devono essere configurate su Vercel → Settings → Environment Variables
- `SUPABASE_SERVICE_ROLE_KEY` è server-only e non deve essere esposta al client
- Il database Supabase deve avere la tabella `players` (ogni utente ha la sua rosa di giocatori)
