# 📋 Documentazione Riferimento - eFootball AI Coach

**Ultimo aggiornamento**: 3 Febbraio 2026 (doc allineata a codice: taskHelper, gestione-formazione handleDelete)

Documento unico di riferimento rapido: **per il programmatore** (file, funzioni, API) e **per chi legge** (cosa fa ogni schermata in linguaggio semplice). Contesto e glossario.

---

## 1. Per chi legge – Cosa fa ogni schermata

| Pagina | Path | Cosa fa (in breve) |
|--------|------|---------------------|
| **Dashboard** | `/` | Panoramica squadra: titolari/riserve, top 3 giocatori, ultime partite, barra conoscenza IA, link rapidi (Aggiungi Partita, Gestione Formazione, Impostazioni). |
| **Gestione Formazione** | `/gestione-formazione` | Campo 2D con 11 titolari + riserve. Scegli formazione (4-3-3, 4-2-3-1, ecc.), assegna giocatori agli slot, carica card/statistiche/skills da screenshot. |
| **Aggiungi Partita** | `/match/new` | Wizard in 5 step: carichi screenshot (pagelle, statistiche, aree attacco/recupero, formazione avversario) e salvi la partita. |
| **Dettaglio Partita** | `/match/[id]` | Vedi tutti i dati della partita e puoi generare il riassunto AI (analisi bilingue IT/EN). |
| **Dettaglio Giocatore** | `/giocatore/[id]` | Vedi profilo completo del giocatore e puoi completare i dati (stats, skills, booster) con altre foto. |
| **Impostazioni Profilo** | `/impostazioni-profilo` | Nome, team, preferenze AI (nome assistente, “come ricordarti”), ore di gioco, problemi comuni. |
| **Guida** | `/guida` | Guida interattiva: come completare profilo, come usare la chat AI, link a ogni pagina. |
| **Contromisure Live** | `/contromisure-live` | Carichi la formazione avversaria e l’AI ti suggerisce cosa cambiare (formazione, giocatori, istruzioni). |
| **Allenatori** | `/allenatori` | Carichi screenshot allenatore, vedi lista e scegli l’allenatore attivo. |
| **Login** | `/login` | Accesso con email e password (Supabase Auth). |
| **Lista Giocatori** | `/lista-giocatori` | Redirect verso Gestione Formazione. |
| **Upload** | `/upload` | Redirect verso Gestione Formazione. |

---

## 2. Per il programmatore – Pagine (file e dipendenze)

| Path | File | Note |
|------|------|------|
| `/` | `app/page.jsx` | Dashboard: Supabase (formation_layout, players, matches), AIKnowledgeBar, LanguageSwitch. |
| `/gestione-formazione` | `app/gestione-formazione/page.jsx` | Campo 2D: formation_layout, players, playing_styles, coaches; API extract-player, supabase/save-*, assign/remove slot. |
| `/match/new` | `app/match/new/page.jsx` | Wizard: extract-match-data, supabase/save-match. |
| `/match/[id]` | `app/match/[id]/page.jsx` | Dettaglio: matches, analyze-match. |
| `/giocatore/[id]` | `app/giocatore/[id]/page.jsx` | Dettaglio giocatore: players, extract-player, supabase/save-player. |
| `/impostazioni-profilo` | `app/impostazioni-profilo/page.jsx` | Profilo: user_profiles, supabase/save-profile. |
| `/guida` | `app/guida/page.jsx` | Guida: calcolo profileCompletion, link a pagine. |
| `/contromisure-live` | `app/contromisure-live/page.jsx` | Contromisure: opponent_formations, generate-countermeasures. |
| `/allenatori` | `app/allenatori/page.jsx` | Allenatori: coaches, extract-coach, supabase/save-coach, set-active-coach. |
| `/login` | `app/login/page.jsx` | Login: supabase.auth.signInWithPassword. |
| `/lista-giocatori` | `app/lista-giocatori/page.jsx` | Redirect a /gestione-formazione. |
| `/upload` | `app/upload/page.jsx` | Redirect a /gestione-formazione. |

---

## 3. Per il programmatore – API (metodo, path, body, risposta)

| Metodo | Path | Body principale | Risposta principale |
|--------|------|-----------------|---------------------|
| POST | `/api/assistant-chat` | message, currentPage, appState, language, history | response, remaining, resetAt |
| POST | `/api/extract-formation` | image, formation | array 11 giocatori |
| POST | `/api/extract-player` | images, slot_index | oggetto giocatore |
| POST | `/api/extract-match-data` | image, step_type, match_id? | dati step (player_ratings, team_stats, ecc.) |
| POST | `/api/extract-coach` | image | oggetto allenatore |
| POST | `/api/analyze-match` | match_id | analysis, player_performance, tactical_analysis, recommendations |
| POST | `/api/generate-countermeasures` | opponent_formation_id | countermeasures (analysis, formation/tactical/player/instructions) |
| GET | `/api/ai-knowledge` | (Bearer) | score, level, breakdown, last_calculated |
| GET | `/api/tasks/list` | (Bearer) | lista obiettivi settimanali |
| POST | `/api/tasks/generate` | (Bearer) | generazione obiettivi |
| POST | `/api/supabase/save-player` | dati giocatore | success/error |
| POST | `/api/supabase/save-match` | matchData | match_id / error |
| POST | `/api/supabase/update-match` | match_id, opponent_name?, ai_summary?, ecc. | success/error |
| POST | `/api/supabase/delete-match` | match_id | success/error |
| POST | `/api/supabase/save-profile` | profilo | success/error |
| POST | `/api/supabase/save-formation-layout` | formation, slot_positions | success/error |
| PATCH | `/api/supabase/assign-player-to-slot` | player_id, slot_index | success/error |
| PATCH | `/api/supabase/remove-player-from-slot` | player_id | success/error |
| DELETE | `/api/supabase/delete-player` | player_id (body) | success/error |
| POST | `/api/supabase/save-coach` | dati allenatore | success/error |
| POST | `/api/supabase/set-active-coach` | coach_id | success/error |
| POST | `/api/supabase/save-tactical-settings` | team_playing_style, individual_instructions | success/error |
| POST | `/api/supabase/save-opponent-formation` | dati formazione avversaria | success/error |
| POST | `/api/admin/recalculate-patterns` | (admin) | ricalcolo pattern tattici |
| GET/POST | `/api/credits/usage` | (Bearer) body {} | period_key, credits_used, credits_included, overage |

---

## 4. Per il programmatore – Componenti

| Componente | File | Uso / Props |
|------------|------|-------------|
| AssistantChat | `components/AssistantChat.jsx` | Widget chat (bottom-right). Invia message, currentPage, appState, language, history a /api/assistant-chat. Usato in layout globale. |
| ConfirmModal | `components/ConfirmModal.jsx` | Modal conferma (titolo, messaggio, onConfirm, onCancel). |
| GuideTour | `components/GuideTour.jsx` | Tour guida interattiva. |
| LanguageProviderWrapper | `components/LanguageProviderWrapper.jsx` | Context i18n (lang, t, changeLanguage). Wrappa app. |
| LanguageSwitch | `components/LanguageSwitch.jsx` | Toggle IT/EN. |
| MissingDataModal | `components/MissingDataModal.jsx` | Modal dati mancanti. |
| PositionSelectionModal | `components/PositionSelectionModal.jsx` | Scelta posizione/competenza. |
| TacticalSettingsPanel | `components/TacticalSettingsPanel.jsx` | Pannello impostazioni tattiche (stile squadra, istruzioni). |
| TaskWidget | `components/TaskWidget.jsx` | Widget obiettivi settimanali (dashboard). |
| AIKnowledgeBar | (in dashboard o componenti) | Barra conoscenza IA 0–100%, breakdown. |

---

## 5. Per il programmatore – Lib (funzioni e file)

| File | Funzioni / esporti | Scopo |
|------|--------------------|--------|
| `lib/supabaseClient.js` | `supabase` (client) | Client Supabase frontend (RLS). |
| `lib/authHelper.js` | extractBearerToken, validateToken | Auth API: token Bearer, validazione Supabase. |
| `lib/openaiHelper.js` | callOpenAIWithRetry | Chiamate OpenAI con retry. |
| `lib/rateLimiter.js` | checkRateLimit, RATE_LIMIT_CONFIG | Rate limit per endpoint (in-memory). |
| `lib/ragHelper.js` | getRelevantSections, classifyQuestion, needsPersonalContext | RAG eFootball (info_rag.md), classificazione domanda, contesto personale on-demand. |
| `lib/aiKnowledgeHelper.js` | calculateAIKnowledgeScore, getAIKnowledgeLevel, updateAIKnowledgeScore, calculate*Score | Calcolo e aggiornamento AI Knowledge Score. |
| `lib/i18n.js` | useTranslation, t, changeLanguage, translations | i18n IT/EN. |
| `lib/countermeasuresHelper.js` | generateCountermeasuresPrompt, validateCountermeasuresOutput | Prompt e validazione contromisure. |
| `lib/tacticalInstructions.js` | (istruzioni tattiche) | Istruzioni individuali / tattica. |
| `lib/taskHelper.js` | generateWeeklyTasksForUser, updateTasksProgressAfterMatch, getCurrentWeek | Obiettivi settimanali, generazione e aggiornamento. |
| `lib/validateFormationLimits.js` | (validazione limiti formazione) | Limiti reparti/posizioni. |

---

## 6. Contesto e glossario

- **RAG**: Recupero informazioni da documento (es. info_rag.md) in base alla domanda; usato per risposte eFootball.
- **Contesto personale**: Dati utente (formazione, rosa, partite, tattica, allenatore) caricati on-demand quando la domanda li richiede (needsPersonalContext).
- **Stili di gioco**: Ala prolifica, Collante, Box-to-Box, ecc. – **fissi sulla card** in eFootball; non si potenziano/modificano dall’app.
- **Profilazione giocatore**: Card + statistiche + skills/booster caricati (photo_slots); “completa (3/3)” se tutti e tre.
- **Competenza posizione**: original_positions (es. DC Alta, MED Intermedia); migliorabile in-game con Aggiunta Posizione.
- **slot_index**: 0–10 = titolare in campo; NULL = riserva.
- **RLS**: Row Level Security Supabase; tutte le query filtrate per user_id.
- **Barra Conoscenza IA**: Score 0–100% che indica quanto l’IA “conosce” il cliente (profilo, rosa, partite, pattern, allenatore, utilizzo, successi).

---

## 7. Dove trovare cosa (codice ↔ documentazione)

- **Indice e mappatura codice ↔ doc**: `INDICE_DOCUMENTAZIONE.md`, `docs/AUDIT_ENTERPRISE_2026.md`
- **Architettura e flussi completi**: `DOCUMENTAZIONE_MASTER_COMPLETA.md`
- **Setup e overview**: `README.md`
- **Assistant Chat (route, prompt, flusso)**: `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`
- **Contesto personale in chat**: `INTEGRAZIONE_ROSA_CHAT_PERSONALIZZATA.md`
- **RAG eFootball (contenuto)**: `info_rag.md` (usato da `lib/ragHelper.js`)
- **RAG vs prompt, checklist**: `PIANO_INTEGRAZIONE_RAG_E_PROMPT.md`
- **Focus prodotto, bilingue, risposta IA**: `COERENZA_FOCUS_BILINGUE_E_RISPOSTA_IA.md`
- **Solo rosa cliente**: `CHIAREZZA_GIOCATORI_E_DOCUMENTAZIONE.md`
- **Task/obiettivi**: `DOCUMENTAZIONE_TASK_SISTEMA.md`, `GUIDA_SVILUPPATORI_TASK.md`
- **Drag & drop formazione**: `DOCUMENTAZIONE_DRAG_DROP.md`
- **Gestione rosa (per funzione)**: `docs/GESTIONE_ROSA_FUNZIONI.md`
- **Barra conoscenza IA**: `PROGETTAZIONE_BARRA_CONOSCENZA_IA.md`
- **Sicurezza Supabase**: `VERIFICA_ENTERPRISE_SUPABASE.md`
- **Crediti e design**: `docs/SISTEMA_CREDITI_AI.md`, `docs/COSTI_API_E_PRICING_CREDITI.md`, `docs/DESIGN_UNIFICATO_FOTO_GIOCATORE.md`
- **Validazione completa (per programmatore)**: `docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md`
