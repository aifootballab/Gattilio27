# Gattilio27 - Rosa (Production)

> Analizzatore screenshot eFootball → Estrazione dati → Rosa da 21 slot

## Documentazione

### 📘 Documentazione Completa
Vedi [DOCUMENTAZIONE_COMPLETA.md](./DOCUMENTAZIONE_COMPLETA.md) per documentazione completa su:
- **Architettura del Sistema**: Stack tecnologico, struttura progetto, flussi principali
- **Struttura Database**: Tabelle principali (`players_base`, `player_builds`, `user_rosa`, etc.) con schema dettagliato
- **Gestione Autenticazione e Chiavi**: Tipi di chiavi Supabase (anon, service role), flusso autenticazione email, configurazione
- **Row Level Security (RLS) Policies**: Strategia RLS, policies implementate, note performance
- **API Endpoints**: Documentazione completa di tutti gli endpoint con request/response
- **Flusso Dati**: Diagrammi flusso estrazione → database e recupero → visualizzazione
- **Smart Batch Processing**: Processing sequenziale, merge progressivo, completeness calculation
- **Configurazione Ambiente**: Variabili Vercel, configurazione Supabase
- **Troubleshooting**: Problemi comuni e soluzioni

### 🔒 Backup e Sicurezza
Vedi [BACKUP_E_SICUREZZA.md](./BACKUP_E_SICUREZZA.md) per:
- **Strategia Backup**: Database, codice, configurazione
- **Sicurezza Enterprise**: Environment variables, autenticazione, API security
- **Disaster Recovery**: Procedure per scenari critici
- **Monitoraggio e Alerting**: Metriche e setup notifiche

### 📄 Documentazione Rapida
Vedi [DOCUMENTAZIONE.md](./DOCUMENTAZIONE.md) per guida rapida su:
- Architettura base
- Endpoints principali
- Schema JSON estratto
- Troubleshooting rapido

---

## Quick Start

### Requisiti
- **Node.js 18+** (per sviluppo locale)
- **Vercel Account** (per deployment)
- **Supabase Project** (per database)
- **OpenAI API Key** (per estrazione dati)

### Setup Locale

1. **Clona repository**
   ```bash
   git clone <repository-url>
   cd Gattilio27-master
   ```

2. **Installa dipendenze**
```bash
npm install
   ```

3. **Configura variabili ambiente**
   Crea `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

4. **Avvia sviluppo**
   ```bash
   npm run dev
   ```

5. **Apri browser**
   ```
   http://localhost:3000
   ```

### Deployment Vercel

1. **Collega repository a Vercel**
2. **Configura Environment Variables** (vedi [DOCUMENTAZIONE_COMPLETA.md](./DOCUMENTAZIONE_COMPLETA.md#configurazione-ambiente))
3. **Deploy automatico** su push a `master`

---

## Funzionalità

- ✅ **Upload Screenshot**: Drag & drop 1-6 screenshot giocatore
- ✅ **Estrazione Batch**: Raggruppamento automatico per giocatore
- ✅ **Estrazione Dati**: OpenAI Vision API per estrarre tutti i dati
- ✅ **Salvataggio Supabase**: Persistenza dati in database
- ✅ **Rosa 21 Slot**: Gestione squadra con 21 slot
- ✅ **Visualizzazione Giocatori**: Lista e scheda completa con UX screenshot-like
- ✅ **Internazionalizzazione**: Supporto IT/EN
- ✅ **Design System**: Futuristic dark theme con neon colors

---

## Stack Tecnologico

- **Frontend**: Next.js 14+ (App Router)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Autenticazione**: Supabase Email Auth (senza verifica email)
- **AI Vision**: OpenAI GPT-4o Vision API
- **Deployment**: Vercel
- **Linguaggio**: JavaScript/JSX

---

## Struttura Progetto

```
Gattilio27-master/
├── app/
│   ├── api/                    # API Routes (server-side)
│   ├── dashboard/              # Dashboard principale (home)
│   ├── rosa/                   # Gestione rosa (upload screenshot)
│   ├── my-players/             # Lista giocatori salvati
│   └── player/[id]/            # Dettaglio singolo giocatore
├── lib/
│   ├── supabaseClient.js       # Client Supabase (anon)
│   └── i18n.js                 # Sistema internazionalizzazione (IT/EN)
└── public/
    └── backgrounds/            # Sfondi personalizzati
```

---

## Supporto

Per problemi o domande, consulta:
- [DOCUMENTAZIONE_COMPLETA.md](./DOCUMENTAZIONE_COMPLETA.md) - Documentazione completa
- [DOCUMENTAZIONE.md](./DOCUMENTAZIONE.md) - Guida rapida
- [Troubleshooting](./DOCUMENTAZIONE_COMPLETA.md#troubleshooting) - Problemi comuni

---

**Versione**: 1.0.0  
**Ultimo Aggiornamento**: Gennaio 2025
