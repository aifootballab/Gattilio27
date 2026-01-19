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
│   ├── extract-player/     # Estrazione dati da singolo screenshot
│   └── supabase/          # Operazioni database
│       └── save-player/    # Salvataggio giocatore (logica business)
├── login/                  # Pagina login
├── upload/                 # Upload screenshot e estrazione
└── lista-giocatori/        # Lista giocatori salvati (query dirette Supabase)

lib/
├── authHelper.js          # Helper autenticazione (per API routes)
├── supabaseClient.js      # Client Supabase (query dirette frontend)
└── i18n.js                # Internazionalizzazione
```

**Note Architettura:**
- Frontend usa **query dirette Supabase** con RLS per lettura giocatori (scalabile)
- Backend API routes solo per operazioni con logica business (`save-player`)

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
- Il database Supabase deve avere le tabelle `players` e `playing_styles` con RLS abilitato
- Frontend usa **query dirette Supabase** con RLS per lettura giocatori (scalabile, sicuro)
- Backend API routes solo per operazioni con logica business (`save-player`)
