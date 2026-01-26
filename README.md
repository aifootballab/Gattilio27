# eFootball AI Coach

Web app per coaching eFootball con estrazione dati da screenshot e gestione rosa giocatori tramite campo 2D interattivo.

## 🎯 Funzionalità Principali

1. **Dashboard**: Panoramica squadra con statistiche e navigazione rapida
2. **Gestione Formazione 2D**: Campo interattivo realistico con card giocatori cliccabili
3. **14 Formazioni Ufficiali eFootball**: Selezione tra tutti i moduli tattici ufficiali
4. **Cambio Formazione Intelligente**: Mantiene giocatori quando si cambia modulo
5. **Upload Giocatori**: Estrazione dati da card giocatori (fino a 3 immagini per giocatore) con tracciamento foto
6. **Visualizzazione Dati Estratti**: Modal dettagli mostra statistiche, abilità e booster quando si clicca su una card
7. **Gestione Riserve**: Upload e gestione giocatori riserva
8. **Profilazione Giocatori**: Completamento profilo con foto aggiuntive
9. **Internazionalizzazione**: Supporto IT/EN

## 🛠️ Stack Tecnologico

- **Frontend**: Next.js 14 (App Router), React 18
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + Auth)
- **AI**: OpenAI GPT-4o (estrazione dati da screenshot)
- **Deploy**: Vercel
- **Icons**: Lucide React

## 📁 Struttura Progetto

```
app/
├── api/                          # API Routes (Backend)
│   ├── extract-formation/       # Estrazione formazione da screenshot
│   ├── extract-player/           # Estrazione dati giocatore
│   └── supabase/                 # Operazioni database
│       ├── assign-player-to-slot/
│       ├── save-formation-layout/
│       └── save-player/
├── gestione-formazione/          # ⭐ Pagina principale (2D field)
├── giocatore/[id]/               # Dettaglio giocatore
├── login/                        # Autenticazione
├── page.jsx                      # Dashboard
├── lista-giocatori/              # Redirect → gestione-formazione
└── upload/                       # Redirect → gestione-formazione

lib/
├── supabaseClient.js            # Client Supabase (frontend)
├── authHelper.js                 # Helper autenticazione (API)
├── i18n.js                       # Internazionalizzazione (IT/EN)
└── normalize.js                  # Normalizzazione dati
```

## 🗄️ Database Schema

### Tabelle Principali

- **`players`**: Giocatori della rosa
  - `slot_index` (0-10 = titolare, NULL = riserva)
  - `photo_slots` (card, stats, skills)
  - RLS abilitato

- **`formation_layout`**: Layout formazione tattica
  - `formation` (es: "4-3-3")
  - `slot_positions` (coordinate x, y per slot 0-10)
  - Un layout per utente (UNIQUE user_id)

- **`playing_styles`**: Catalogo stili di gioco

## 🔌 Endpoint API

**Formazione e giocatori**:
- `POST /api/extract-formation` - Estrae formazione avversaria da screenshot (usato in contromisure-live e match/new)
- `POST /api/extract-player` - Estrae dati giocatore da screenshot
- `POST /api/supabase/save-formation-layout` - Salva layout formazione propria
- `POST /api/supabase/save-player` - Salva/aggiorna giocatore
- `PATCH /api/supabase/assign-player-to-slot` - Assegna giocatore a slot

**Partite (match)**:
- `POST /api/extract-match-data` - Estrae dati partita da screenshot (wizard + dettaglio)
- `POST /api/supabase/save-match` - Salva partita (wizard; include `opponent_name`, sezioni)
- `POST /api/supabase/update-match` - Aggiorna partita (sezioni, `ai_summary`, opp. `opponent_name`)
- `DELETE /api/supabase/delete-match` - Elimina partita
- `POST /api/analyze-match` - Genera riassunto AI bilingue (dettaglio partita)

## 📚 Documentazione

**Documentazione principale**:
- **`DOCUMENTAZIONE_MASTER_COMPLETA.md`** – Documentazione completa e aggiornata (26 Gennaio 2026)
  - Panoramica, architettura, struttura progetto, DB schema, API, pagine, librerie, sicurezza, i18n, flussi

**Documenti specializzati**:
- **`DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`** – Assistant Chat AI: architettura, prompt engineering, flussi
- **`DOCUMENTAZIONE_DRAG_DROP.md`** – Drag & Drop giocatori sul campo 2D: funzionalità e implementazione
- **`DOCUMENTAZIONE_MODIFICHE_POSIZIONI_MULTIPLE.md`** – Gestione posizioni multiple giocatori: modifiche DB e codice

## ⚙️ Environment Variables

### Vercel Production

**OpenAI**:
```env
OPENAI_API_KEY=sk-...
```

**Supabase**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

## 🚀 Setup Locale

```bash
npm install
npm run dev
```

Crea `.env.local` con le variabili d'ambiente (vedi `.env.example`).


## 🔒 Sicurezza

✅ **Tutti gli endpoint richiedono autenticazione Bearer token**:
- `POST /api/extract-player` - ✅ Autenticazione Bearer token richiesta
- `POST /api/extract-formation` - ✅ Autenticazione Bearer token richiesta
- `POST /api/extract-match-data` - ✅ Autenticazione Bearer token richiesta
- Tutti gli altri endpoint API - ✅ Autenticazione Bearer token richiesta

**Protezioni implementate**:
- ✅ Autenticazione Bearer token su tutti gli endpoint
- ✅ Rate limiting su endpoint principali (vedi `lib/rateLimiter.js`)
- ✅ Validazione dimensione immagini (max 10MB)
- ✅ Row Level Security (RLS) su tutte le tabelle Supabase
- ✅ Service Role Key: Server-only, non esposto al client

**Per dettagli completi**: Vedi `DOCUMENTAZIONE_MASTER_COMPLETA.md` sezione Sicurezza

---

## 🏗️ Architettura

**Pattern**: Query Dirette vs API Routes

- **Query Dirette (Frontend)**: Lettura dati con RLS Supabase (gratis, scalabile)
- **API Routes (Backend)**: Operazioni con logica business, chiamate OpenAI (server-only)

## 💰 Costi

- **Gratis**: Refresh pagina, query dirette Supabase
- **Costa**: Chiamate OpenAI Vision (~$0.01-0.05 per foto)

**Setup Iniziale Cliente**: ~$0.46-1.40 (formazione + profilazione)

## 📝 Note Importanti

- `slot_index`: 0-10 = titolare, NULL = riserva
- `photo_slots`: Traccia automaticamente quali foto sono state caricate
- Un layout formazione per utente (UNIQUE constraint)
- Cambio formazione intelligente: mantiene giocatori esistenti nei loro slot
- Matching giocatori: nome + squadra + ruolo per validazione
- Responsive design: Mobile-first, touch-friendly
- Campo 2D realistico: pattern erba, linee campo visibili, contrasto ottimizzato

## 🐛 Troubleshooting

Vedi `DOCUMENTAZIONE_MASTER_COMPLETA.md` per troubleshooting e dettagli tecnici.

## 📖 Risorse

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OpenAI Vision API**: https://platform.openai.com/docs/guides/vision
- **Vercel Deploy**: https://vercel.com/docs
