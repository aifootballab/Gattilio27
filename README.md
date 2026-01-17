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
3. **Rosa**: Gestione squadra (21 slot)
4. **I Miei Giocatori**: Lista e gestione giocatori salvati
5. **Estrazione Screenshot**: Caricamento screenshot e estrazione dati con AI
6. **Profilo Giocatore**: Visualizzazione e modifica dati giocatore

## Struttura Progetto

```
app/
├── api/                    # API Routes
│   ├── extract-player/     # Estrazione dati da screenshot
│   └── supabase/          # Operazioni database
├── dashboard/              # Dashboard principale
├── login/                  # Pagina login
├── rosa/                   # Gestione rosa
├── my-players/            # Lista giocatori
└── player/[id]/           # Dettaglio giocatore

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
- Il database Supabase deve avere le tabelle: `player_builds`, `players_base`, `user_rosa`, `screenshot_processing_log`
