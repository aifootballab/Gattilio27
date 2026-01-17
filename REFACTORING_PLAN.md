# Piano Refactoring - Allineamento Progetto

## File da RIMUOVERE (documentazione debug/problem solving)

### Documentazione Debug (26 file → 0)
- ANALISI_PROBLEMA_DATABASE.md
- ANALISI_PROBLEMA_PLAYERS.md
- ARCHITETTURA_PLAYERDRAFT.md
- AUDIT_COMPLETO_POST_FIX.md
- AUDIT_COMPLETO_SUPABASE_ERRORI.md
- AUDIT_REPORT.md
- BACKGROUND_SETUP.md
- BACKUP_E_SICUREZZA.md
- COME_INSERIRE_SFONDO.md
- CONFRONTO_CODICE_16_GENNAIO.md
- DEBUG_FRONTEND_BACKEND.md
- DEBUG_USER_ID_VERIFICA.md
- DOCUMENTAZIONE_COMPLETA.md
- DOCUMENTAZIONE_ENTERPRISE.md
- FIX_CACHE_RONALDINHO_DEJONG.md
- FIX_COERENZA_FLUSSO.md
- FIX_RONALDINHO.md
- PIANO_RICOSTRUZIONE.md
- RIEPILOGO_PROBLEMA.md
- SOLUZIONE_ENTERPRISE.md
- STRUTTURA_FORMazione_AVVERSARIA.md
- VERIFICA_DATABASE_FINALE.md

### File Duplicati/Temporanei
- lib/normalize.ts (duplicato di normalize.js)
- temp_old.jsx
- app/design-system.md (spostare in docs se serve)

### Script PowerShell (non necessari in repo)
- check-alignment.ps1
- setup-alignment.ps1
- SCRIPT_AUTOMATICO_INSTALLAZIONE.ps1

## File da MANTENERE

### Core Application
- app/page.jsx
- app/layout.tsx
- app/globals.css
- app/not-found.tsx
- app/login/page.jsx
- app/dashboard/page.jsx
- app/rosa/page.jsx
- app/my-players/page.jsx
- app/player/[id]/page.jsx
- app/player/[id]/EditPlayerDataModal.jsx
- app/opponent-formation/page.jsx (verificare se necessario)

### API Routes (Core)
- app/api/extract-player/route.js ✅
- app/api/supabase/save-player/route.js ✅
- app/api/supabase/get-my-players/route.js ✅
- app/api/supabase/reset-my-data/route.js (utile per debug, mantenere)
- app/api/supabase/update-player-data/route.js ✅
- app/api/supabase/get-opponent-formations/route.js (verificare)
- app/api/supabase/save-opponent-formation/route.js (verificare)
- app/api/extract-batch/route.js (verificare se usato)
- app/api/extract-formation/route.js (verificare se usato)
- app/api/env-check/route.js ✅

### Lib
- lib/authHelper.js ✅
- lib/supabaseClient.js ✅
- lib/i18n.js ✅
- lib/normalize.js ✅ (rimuovere normalize.ts)

### Config
- package.json ✅
- next.config.js ✅
- tsconfig.json ✅
- vercel.json ✅
- README.md ✅ (aggiornare)

### Public
- public/backgrounds/ ✅

## Struttura Finale

```
Gattilio27-master/
├── app/
│   ├── api/
│   │   ├── env-check/
│   │   ├── extract-player/
│   │   └── supabase/
│   │       ├── get-my-players/
│   │       ├── save-player/
│   │       ├── update-player-data/
│   │       └── reset-my-data/
│   ├── dashboard/
│   ├── login/
│   ├── my-players/
│   ├── opponent-formation/
│   ├── player/[id]/
│   ├── rosa/
│   ├── layout.tsx
│   ├── page.jsx
│   ├── globals.css
│   └── not-found.tsx
├── lib/
│   ├── authHelper.js
│   ├── supabaseClient.js
│   ├── i18n.js
│   └── normalize.js
├── public/
│   └── backgrounds/
├── package.json
├── next.config.js
├── tsconfig.json
├── vercel.json
└── README.md
```
