# Guida validazione programmatore – eFootball AI Coach

**Data**: 3 Febbraio 2026  
**Obiettivo**: Documentazione completa per validare la piattaforma. Ogni cartella, ogni file, cosa fa, da dove prende i dati, dove scrive.

---

## 1. Architettura sintetica

```
Frontend (React/Next.js)          Backend (API Routes)           Servizi esterni
├── app/                          ├── app/api/                   ├── Supabase (DB + Auth)
│   ├── page.jsx (Dashboard)      │   ├── assistant-chat/        ├── OpenAI (GPT-4o)
│   ├── gestione-formazione/      │   ├── extract-*              └── Vercel (deploy)
│   ├── match/                    │   ├── analyze-match/
│   ├── giocatore/                │   ├── generate-countermeasures/
│   ├── contromisure-live/        │   ├── credits/
│   ├── allenatori/               │   └── supabase/
│   └── ...                       └── ...
├── components/                   lib/
└── layout.tsx                    ├── ragHelper (info_rag.md)
                                  ├── authHelper, creditService
                                  └── ...
```

**Fonte dati IA**: `info_rag.md` (RAG) + Supabase (rosa, partite, tattica, allenatore).  
**Nessun dato da**: aiRules.js, memoria_attila_definitiva_unificata.txt, player_performance_aggregates.

---

## 2. Cartella `/app` – Pagine (App Router)

| Path | File | Scopo | Dipendenze |
|------|------|-------|------------|
| `/` | `app/page.jsx` | Dashboard: rosa, top 3, ultime partite, barra conoscenza IA, TaskWidget | Supabase (formation_layout, players, matches), AIKnowledgeBar, CreditsBar, LanguageSwitch |
| `/gestione-formazione` | `app/gestione-formazione/page.jsx` | Campo 2D, 14 formazioni, upload giocatori da screenshot, drag&drop | extract-player, supabase/save-*, assign/remove slot, playerPhotoTypes, validateFormationLimits |
| `/match/new` | `app/match/new/page.jsx` | Wizard 5 step caricamento partita | extract-match-data, supabase/save-match, errorHelper |
| `/match/[id]` | `app/match/[id]/page.jsx` | Dettaglio partita, analisi AI bilingue | matches, analyze-match, errorHelper |
| `/giocatore/[id]` | `app/giocatore/[id]/page.jsx` | Scheda giocatore, completamento dati | players, extract-player, supabase/save-player, playerPhotoTypes |
| `/impostazioni-profilo` | `app/impostazioni-profilo/page.jsx` | Profilo utente, preferenze AI | user_profiles, supabase/save-profile |
| `/guida` | `app/guida/page.jsx` | Guida interattiva, CTA completamento profilo | profileCompletion |
| `/contromisure-live` | `app/contromisure-live/page.jsx` | Suggerimenti tattici vs formazione avversaria | extract-formation, opponent_formations, generate-countermeasures |
| `/allenatori` | `app/allenatori/page.jsx` | Upload coach, lista, allenatore attivo | coaches, extract-coach, supabase/save-coach, set-active-coach |
| `/login` | `app/login/page.jsx` | Login email/password | supabase.auth |
| `/lista-giocatori` | `app/lista-giocatori/page.jsx` | Redirect → /gestione-formazione | - |
| `/upload` | `app/upload/page.jsx` | Redirect → /gestione-formazione | - |

---

## 3. Cartella `/app/api` – Endpoint API

### 3.1 AI / OpenAI

| Path | File | Scopo | Input | Output | Chiama |
|------|------|-------|-------|--------|--------|
| `/api/assistant-chat` | `route.js` | Chat coach IA | message, currentPage, appState, language, history | response, suggestions | ragHelper (info_rag), buildPersonalContext (Supabase), OpenAI GPT-4o |
| `/api/analyze-match` | `route.js` | Analisi partita bilingue | match_id | analysis, player_performance, tactical_analysis | ragHelper (analyze-match), OpenAI |
| `/api/generate-countermeasures` | `route.js` | Contromisure vs avversario | opponent_formation_id | countermeasures | countermeasuresHelper, OpenAI |
| `/api/extract-player` | `route.js` | Estrazione dati giocatore da screenshot | images, slot_index | oggetto giocatore | OpenAI Vision |
| `/api/extract-formation` | `route.js` | Estrazione formazione da screenshot | image, formation | array 11 giocatori | OpenAI Vision |
| `/api/extract-match-data` | `route.js` | Estrazione step wizard partita | image, step_type, match_id? | dati step | OpenAI Vision |
| `/api/extract-coach` | `route.js` | Estrazione allenatore da screenshot | image | oggetto coach | OpenAI Vision |

### 3.2 Supabase (CRUD)

| Path | Scopo | Tabella principale |
|------|-------|---------------------|
| `/api/supabase/save-player` | Salva/aggiorna giocatore | players |
| `/api/supabase/save-formation-layout` | Salva layout formazione | formation_layout |
| `/api/supabase/assign-player-to-slot` | Assegna giocatore a slot | players (slot_index) |
| `/api/supabase/remove-player-from-slot` | Rimuove da slot (riserva) | players |
| `/api/supabase/delete-player` | Elimina giocatore | players |
| `/api/supabase/save-match` | Salva partita (wizard) | matches |
| `/api/supabase/update-match` | Aggiorna partita | matches |
| `/api/supabase/delete-match` | Elimina partita | matches |
| `/api/supabase/save-profile` | Salva profilo utente | user_profiles |
| `/api/supabase/save-coach` | Salva allenatore | coaches |
| `/api/supabase/set-active-coach` | Imposta allenatore attivo | coaches |
| `/api/supabase/save-tactical-settings` | Salva tattica (stile + istruzioni) | team_tactical_settings |
| `/api/supabase/save-opponent-formation` | Salva formazione avversario | opponent_formations |

### 3.3 Altri

| Path | Scopo |
|------|-------|
| `/api/ai-knowledge` | Score conoscenza IA 0–100%, breakdown |
| `/api/tasks/list` | Lista obiettivi settimanali |
| `/api/tasks/generate` | Genera obiettivi (test/manuale) |
| `/api/credits/usage` | Crediti usati/inclusi per utente |
| `/api/admin/recalculate-patterns` | Ricalcolo pattern tattici (admin) |

---

## 4. Cartella `/components`

| File | Scopo | Usato in |
|------|-------|----------|
| `AssistantChat.jsx` | Widget chat AI (bottom-right) | layout.tsx (globale) |
| `CreditsBar.jsx` | Barra crediti mensili | layout.tsx |
| `AIKnowledgeBar.jsx` | Barra conoscenza IA 0–100% | page.jsx (dashboard) |
| `LanguageSwitch.jsx` | Toggle IT/EN | Dashboard, layout |
| `LanguageProviderWrapper.jsx` | Context i18n | layout.tsx (wrap app) |
| `GuideTour.jsx` | Tour guida interattiva | layout.tsx |
| `ConfirmModal.jsx` | Modal conferma | gestione-formazione, match, ecc. |
| `MissingDataModal.jsx` | Modal dati mancanti | gestione-formazione |
| `PositionSelectionModal.jsx` | Scelta posizione/competenza | gestione-formazione |
| `TacticalSettingsPanel.jsx` | Pannello stile squadra + istruzioni | gestione-formazione |
| `TaskWidget.jsx` | Widget obiettivi settimanali | page.jsx (dashboard) |

---

## 5. Cartella `/lib`

| File | Export principali | Scopo |
|------|-------------------|-------|
| `supabaseClient.js` | supabase | Client Supabase frontend (RLS) |
| `authHelper.js` | validateToken, extractBearerToken | Auth API Bearer |
| `openaiHelper.js` | callOpenAIWithRetry, parseOpenAIResponse | Chiamate OpenAI |
| `ragHelper.js` | getRelevantSections, classifyQuestion, needsPersonalContext, getRelevantSectionsForContext | RAG info_rag.md |
| `creditService.js` | recordUsage, getCurrentUsage, CREDIT_WEIGHTS | Tracciamento crediti |
| `aiKnowledgeHelper.js` | calculateAIKnowledgeScore, updateAIKnowledgeScore | Barra conoscenza IA |
| `countermeasuresHelper.js` | generateCountermeasuresPrompt, validateCountermeasuresOutput | Prompt contromisure |
| `taskHelper.js` | generateWeeklyTasksForUser, updateTasksProgressAfterMatch | Obiettivi settimanali |
| `i18n.js` | useTranslation, t, translations | i18n IT/EN |
| `errorHelper.js` | mapErrorToUserMessage | Messaggi errore user-friendly |
| `fetchHelper.js` | safeJsonResponse | Fetch con gestione errori |
| `guideTours.js` | getTourSteps | Step tour guida |
| `playerPhotoTypes.js` | PHOTO_TYPE_KEYS, getPhotoTypeConfig | Config foto giocatore |
| `tacticalInstructions.js` | INDIVIDUAL_INSTRUCTIONS_CONFIG, validateIndividualInstruction | Istruzioni individuali |
| `validateFormationLimits.js` | validateFormationLimits | Limiti formazione |

---

## 6. Cartella `/scripts`

| File | Scopo |
|------|-------|
| `run-migration.js` | Esegue migrazioni SQL su Supabase |

---

## 7. File root

| File | Scopo |
|------|-------|
| `app/layout.tsx` | Layout globale: LanguageProviderWrapper, CreditsBar, AssistantChat, GuideTour |
| `app/globals.css` | Stili globali |
| `app/favicon.ico/route.ts` | Favicon SVG dinamico |
| `info_rag.md` | Knowledge base RAG eFootball (usato da ragHelper) |
| `.env.example` | Template variabili ambiente |
| `vercel.json` | Config deploy Vercel |
| `next.config.js` | Config Next.js |

---

## 8. Flusso dati IA (dove punta)

| Contesto | Fonte dati |
|----------|------------|
| **Chat** | `info_rag.md` (getRelevantSections) + Supabase (buildPersonalContext: formation_layout, players, matches, team_tactical_settings, coaches, team_tactical_patterns) |
| **Contromisure** | `info_rag.md` (getRelevantSectionsForContext 'countermeasures') + Supabase (opponent_formations, players, matches, coaches, ecc.) |
| **Analyze-match** | `info_rag.md` (getRelevantSectionsForContext 'analyze-match') + dati partita |

---

## 9. Tabelle Supabase principali

| Tabella | Scopo |
|---------|-------|
| `players` | Giocatori rosa (slot_index, photo_slots, skills, com_skills, playing_style_id) |
| `formation_layout` | Layout formazione (formation, slot_positions) |
| `matches` | Partite (player_ratings, team_stats, opponent_formation_id, ai_summary) |
| `user_profiles` | Profilo (first_name, team_name, ai_knowledge_* ) |
| `coaches` | Allenatori |
| `team_tactical_settings` | Stile squadra, istruzioni individuali |
| `team_tactical_patterns` | Pattern (formation_usage, problemi ricorrenti) |
| `opponent_formations` | Formazioni avversarie salvate |
| `playing_styles` | Catalogo stili (Opportunista, Collante, ecc.) |
| `user_credit_usage` | Crediti usati per utente/periodo |
| `weekly_goals` | Obiettivi settimanali |

---

## 10. Checklist validazione

- [ ] Tutti gli endpoint API richiedono Bearer token (eccetto login)
- [ ] Rate limit attivo su endpoint critici (vedi rateLimiter.js)
- [ ] RLS su tutte le tabelle Supabase
- [ ] info_rag.md è l'unica fonte RAG (nessun aiRules, memoria_attila a runtime)
- [ ] Crediti tracciati dopo ogni chiamata OpenAI (recordUsage)
- [ ] Errori mappati con errorHelper (mapErrorToUserMessage)
- [ ] i18n: IT/EN coerente (lib/i18n.js)

---

## 11. Documentazione di dettaglio

- **Architettura completa**: `DOCUMENTAZIONE_MASTER_COMPLETA.md`
- **Riferimento rapido**: `DOCUMENTAZIONE_RIFERIMENTO.md`
- **Indice doc**: `INDICE_DOCUMENTAZIONE.md`
- **Assistant Chat**: `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`
- **RAG**: `info_rag.md`, `PIANO_INTEGRAZIONE_RAG_E_PROMPT.md`
- **Crediti**: `docs/SISTEMA_CREDITI_AI.md`, `docs/COSTI_API_E_PRICING_CREDITI.md`
