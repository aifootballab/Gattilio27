# eFootball AI Coach

Web app per coaching eFootball con estrazione dati da screenshot e gestione rosa giocatori tramite campo 2D interattivo.

## 🎯 Funzionalità Principali

1. **Dashboard**: Panoramica squadra con statistiche e navigazione rapida
2. **Gestione Formazione 2D**: Campo interattivo realistico con card giocatori cliccabili
3. **14 Formazioni Ufficiali eFootball**: Selezione tra tutti i moduli tattici ufficiali
4. **Cambio Formazione Intelligente**: Mantiene giocatori quando si cambia modulo
5. **Upload Formazione**: Estrazione disposizione tattica da screenshot completo (opzione avanzata)
6. **Upload Giocatori**: Estrazione dati da card giocatori (fino a 3 immagini per giocatore) con tracciamento foto
7. **Visualizzazione Dati Estratti**: Modal dettagli mostra statistiche, abilità e booster quando si clicca su una card
8. **Gestione Riserve**: Upload e gestione giocatori riserva
9. **Profilazione Giocatori**: Completamento profilo con foto aggiuntive
10. **Internazionalizzazione**: Supporto IT/EN

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

- `POST /api/extract-formation` - Estrae formazione da screenshot
- `POST /api/extract-player` - Estrae dati giocatore da screenshot
- `POST /api/supabase/save-formation-layout` - Salva layout formazione
- `POST /api/supabase/save-player` - Salva/aggiorna giocatore
- `PATCH /api/supabase/assign-player-to-slot` - Assegna giocatore a slot

**Documentazione Completa**: Vedi `DOCUMENTAZIONE_COMPLETA.md`

**Stato Implementazione**: Vedi `STATO_IMPLEMENTAZIONE_COMPLETO.md` per dettagli su cosa è implementato e cosa è pianificato

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

## 📚 Documentazione

### Documenti Principali

- **`DOCUMENTAZIONE_COMPLETA.md`** - Documentazione principale completa
  - Stack tecnologico dettagliato
  - Schema database completo
  - Endpoint API con esempi
  - Flussi principali e funzioni handler
  - Sicurezza e validazione
  - Configurazione e deploy
  - Troubleshooting

- **`DOCUMENTAZIONE_LIBRERIE.md`** - Documentazione librerie (`lib/`)
  - `authHelper.js` - Validazione token
  - `supabaseClient.js` - Client Supabase
  - `normalize.js` - Normalizzazione dati
  - `i18n.js` - Sistema traduzioni

- **`DOCUMENTAZIONE_COMPONENTI.md`** - Documentazione componenti (`components/`)
  - `LanguageSwitch.jsx` - Selettore lingua
  - `LanguageProviderWrapper.jsx` - Wrapper i18n

### Audit e Verifica

- **`AUDIT_SICUREZZA.md`** - Audit sicurezza completo
  - Vulnerabilità identificate
  - Raccomandazioni prioritarie
  - Checklist implementazione

- **`AUDIT_DOCUMENTAZIONE.md`** - Audit documentazione
  - Gap identificati
  - Allineamento codice/documentazione
  - Checklist aggiornamento

- **`VERIFICA_COMPLETA.md`** - Checklist verifica funzionalità
- **`WORKFLOW_FORMazione_COMPLETO.md`** - Workflow formazioni dettagliato
- **`ANALISI_ENTERPRISE_FORMATION.md`** - Analisi decisioni enterprise

## 🔒 Sicurezza

⚠️ **IMPORTANTE**: Alcuni endpoint sono pubblici (vedi `AUDIT_SICUREZZA.md` per dettagli):
- `POST /api/extract-player` - Nessuna autenticazione
- `POST /api/extract-formation` - Nessuna autenticazione

**Raccomandazioni**:
- Aggiungere autenticazione Bearer token
- Implementare rate limiting
- Validare dimensione immagini

**Per dettagli completi**: Vedi `AUDIT_SICUREZZA.md`

---

## 🏗️ Architettura

**Pattern**: Query Dirette vs API Routes

- **Query Dirette (Frontend)**: Lettura dati con RLS Supabase (gratis, scalabile)
- **API Routes (Backend)**: Operazioni con logica business, chiamate OpenAI (server-only)

## 💰 Costi

- **Gratis**: Refresh pagina, query dirette Supabase
- **Costa**: Chiamate OpenAI Vision (~$0.01-0.05 per foto)

**Setup Iniziale Cliente**: ~$0.46-1.40 (formazione + profilazione)

## 🔒 Sicurezza

- **RLS**: Row Level Security abilitato su tutte le tabelle
- **Auth**: Validazione token Bearer in API routes
- **Service Role Key**: Server-only, non esposto al client

## 📝 Note Importanti

- `slot_index`: 0-10 = titolare, NULL = riserva
- `photo_slots`: Traccia automaticamente quali foto sono state caricate
- Un layout formazione per utente (UNIQUE constraint)
- Cambio formazione intelligente: mantiene giocatori esistenti nei loro slot
- Matching giocatori: nome + squadra + ruolo per validazione
- Responsive design: Mobile-first, touch-friendly
- Campo 2D realistico: pattern erba, linee campo visibili, contrasto ottimizzato

## 🐛 Troubleshooting

Vedi `DOCUMENTAZIONE_COMPLETA.md` per troubleshooting dettagliato.

## 📖 Risorse

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **OpenAI Vision API**: https://platform.openai.com/docs/guides/vision
- **Vercel Deploy**: https://vercel.com/docs
