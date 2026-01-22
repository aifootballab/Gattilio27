# 📋 Task Breakdown - Implementazione Match Analisi

**Data**: Gennaio 2025  
**Versione**: 1.0  
**Obiettivo**: Implementare sistema match analisi in modo strutturato, senza perdere focus

---

## 🎯 PRIORITÀ E FASI

### Fase 1: FONDAMENTA (Database + Sicurezza)
**Priorità**: 🔴 CRITICA  
**Obiettivo**: Database solido, trigger, sicurezza base

### Fase 2: CORE FEATURE (Upload + Estrazione)
**Priorità**: 🟠 ALTA  
**Obiettivo**: Upload foto, estrazione dati, matching giocatori

### Fase 3: AI ANALYSIS (Analisi + Suggerimenti)
**Priorità**: 🟡 MEDIA  
**Obiettivo**: Analisi AI, riassunti, insight, raccomandazioni

### Fase 4: UI/UX (Responsive + Bilingue)
**Priorità**: 🟢 MEDIA  
**Obiettivo**: UI responsive, traduzioni, UX ottimizzata

### Fase 5: ENTERPRISE (Performance + Scalabilità)
**Priorità**: 🔵 BASSA (post-MVP)
**Obiettivo**: Caching, rate limiting, ottimizzazioni

---

## 📊 TASK BREAKDOWN DETTAGLIATO

---

## 🔴 FASE 1: FONDAMENTA (Database + Sicurezza)

### TASK 1.1: Database Schema - Tabella `matches`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: Nessuna

**Cosa fare**:
- Creare migration SQL per tabella `matches`
- Campi: `id`, `user_id`, `match_date`, `formation_played`, `players_in_match`, `player_ratings`, `team_stats`, `attack_areas`, `ball_recovery_zones`, `goals_events`, `ai_summary`, `ai_insights`, `ai_recommendations`, `formation_discrepancies`, `opponent_formation_id`, `data_completeness`, `missing_photos`, `analysis_status`, `extracted_data`, `credits_used`
- Indici: `user_id`, `match_date`, `analysis_status`
- RLS: Utente può vedere solo i propri match

**File da creare/modificare**:
- `migrations/create_matches_table.sql`

**Criteri completamento**:
- ✅ Migration creata
- ✅ RLS configurato
- ✅ Indici creati
- ✅ Testato con Supabase

---

### TASK 1.2: Database Schema - Tabella `opponent_formations`
**Difficoltà**: 🟢 FACILE  
**Tempo stimato**: 1 ora  
**Dipendenze**: Nessuna

**Cosa fare**:
- Creare migration SQL per tabella `opponent_formations`
- Campi: `id`, `user_id`, `formation_image`, `formation_name`, `playing_style`, `extracted_data`, `created_at`
- Indici: `user_id`, `created_at`
- RLS: Utente può vedere solo le proprie formazioni

**File da creare/modificare**:
- `migrations/create_opponent_formations_table.sql`

**Criteri completamento**:
- ✅ Migration creata
- ✅ RLS configurato
- ✅ Testato

---

### TASK 1.3: Database Schema - Tabella `player_performance_aggregates`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: TASK 1.1

**Cosa fare**:
- Creare migration SQL per tabella `player_performance_aggregates`
- Campi: `id`, `user_id`, `player_id`, `average_rating`, `total_goals`, `total_assists`, `total_minutes_played`, `positions_played`, `position_performance`, `attack_areas_avg`, `recovery_zones_avg`, `heatmap_aggregate`, `rating_trend`, `substitution_pattern`, `last_50_matches_count`, `last_updated`
- Indici: `user_id`, `player_id`, `last_updated`
- RLS: Utente può vedere solo i propri aggregati

**File da creare/modificare**:
- `migrations/create_player_performance_aggregates_table.sql`

**Criteri completamento**:
- ✅ Migration creata
- ✅ RLS configurato
- ✅ Testato

---

### TASK 1.4: Database Schema - Tabella `team_tactical_patterns`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: TASK 1.1

**Cosa fare**:
- Creare migration SQL per tabella `team_tactical_patterns`
- Campi: `id`, `user_id`, `total_goals_scored`, `total_goals_conceded`, `avg_possession`, `avg_shots`, `avg_pass_accuracy`, `avg_clean_sheets`, `goals_scored_time_pattern`, `goals_conceded_time_pattern`, `formation_usage`, `playing_style_usage`, `attack_areas_avg`, `recovery_zones_avg`, `recurring_issues`, `last_50_matches_count`, `last_updated`
- Indici: `user_id`, `last_updated`
- RLS: Utente può vedere solo i propri pattern

**File da creare/modificare**:
- `migrations/create_team_tactical_patterns_table.sql`

**Criteri completamento**:
- ✅ Migration creata
- ✅ RLS configurato
- ✅ Testato

---

### TASK 1.5: Database Schema - Tabella `ai_tasks`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: TASK 1.1

**Cosa fare**:
- Creare migration SQL per tabella `ai_tasks`
- Campi: `id`, `user_id`, `match_id`, `task_type`, `priority`, `title`, `description`, `reason`, `suggested_action`, `status`, `player_name`, `formation_name`, `completion_method`, `completed_by_action`, `performance_before`, `performance_after`, `effectiveness_score`, `effectiveness_status`, `effectiveness_analysis`, `created_at`, `updated_at`
- Indici: `user_id`, `match_id`, `status`, `priority`
- RLS: Utente può vedere solo i propri task

**File da creare/modificare**:
- `migrations/create_ai_tasks_table.sql`

**Criteri completamento**:
- ✅ Migration creata
- ✅ RLS configurato
- ✅ Testato

---

### TASK 1.6: Database Schema - Tabella `user_ai_knowledge`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: Nessuna

**Cosa fare**:
- Creare migration SQL per tabella `user_ai_knowledge`
- Campi: `id`, `user_id`, `roster_complete`, `formation_saved`, `coach_active`, `instructions_set`, `matches_analyzed`, `heatmaps_uploaded`, `opponent_formations_analyzed`, `matches_complete_data`, `heatmaps_multiple_per_player`, `pattern_identified`, `knowledge_score`, `knowledge_level`, `last_calculated_at`
- Indici: `user_id`, `knowledge_score`
- RLS: Utente può vedere solo la propria conoscenza

**File da creare/modificare**:
- `migrations/create_user_ai_knowledge_table.sql`

**Criteri completamento**:
- ✅ Migration creata
- ✅ RLS configurato
- ✅ Testato

---

### TASK 1.7: Trigger - Calcolo Automatico `knowledge_score`
**Difficoltà**: 🔴 DIFFICILE  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 1.6

**Cosa fare**:
- Creare funzione PostgreSQL `calculate_ai_knowledge_score()`
- Logica: Calcola score basato su tutti i campi (roster_complete, formation_saved, etc.)
- Trigger: `BEFORE INSERT OR UPDATE` su `user_ai_knowledge`
- Testare con vari scenari

**File da creare/modificare**:
- `migrations/create_knowledge_score_trigger.sql`

**Criteri completamento**:
- ✅ Funzione creata
- ✅ Trigger creato
- ✅ Testato con INSERT e UPDATE
- ✅ Verificato calcolo corretto

---

### TASK 1.8: Trigger - Aggiornamento Aggregati Performance
**Difficoltà**: 🔴 DIFFICILE  
**Tempo stimato**: 4-5 ore  
**Dipendenze**: TASK 1.1, TASK 1.3, TASK 1.4

**Cosa fare**:
- Creare funzione PostgreSQL `update_performance_aggregates()`
- Logica: Dopo INSERT in `matches`, aggiorna `player_performance_aggregates` e `team_tactical_patterns`
- Mantenere solo ultime 50 partite
- Trigger: `AFTER INSERT` su `matches` quando `analysis_status = 'completed'`
- Testare con partite multiple

**File da creare/modificare**:
- `migrations/create_performance_aggregates_trigger.sql`

**Criteri completamento**:
- ✅ Funzione creata
- ✅ Trigger creato
- ✅ Testato con partite multiple
- ✅ Verificato che mantiene solo ultime 50
- ✅ Verificato calcolo aggregati corretto

---

### TASK 1.9: Sicurezza - Endpoint `/api/extract-match-data`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: Nessuna

**Cosa fare**:
- Creare endpoint `/api/extract-match-data/route.js`
- Autenticazione: Bearer token (usare `lib/authHelper.js`)
- Validazione: Image size (max 10MB per foto), JSONB size (max 500KB)
- Sanitizzazione: Input validation
- Error handling: Messaggi standardizzati

**File da creare/modificare**:
- `app/api/extract-match-data/route.js`

**Criteri completamento**:
- ✅ Autenticazione implementata
- ✅ Validazione implementata
- ✅ Error handling corretto
- ✅ Testato con token valido/invalido

---

### TASK 1.10: Sicurezza - Endpoint `/api/supabase/save-match`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: TASK 1.1

**Cosa fare**:
- Creare endpoint `/api/supabase/save-match/route.js`
- Autenticazione: Bearer token
- Validazione: Text length (max 255/50), JSONB size (max 500KB)
- Authorization: Verifica `user_id` corrisponde a token
- Error handling: Messaggi standardizzati

**File da creare/modificare**:
- `app/api/supabase/save-match/route.js`

**Criteri completamento**:
- ✅ Autenticazione implementata
- ✅ Validazione implementata
- ✅ Authorization implementata
- ✅ Testato

---

---

## 🟠 FASE 2: CORE FEATURE (Upload + Estrazione)

### TASK 2.1: Endpoint `/api/extract-match-data` - Estrazione Dati
**Difficoltà**: 🔴 DIFFICILE  
**Tempo stimato**: 6-8 ore  
**Dipendenze**: TASK 1.9

**Cosa fare**:
- Implementare estrazione dati da ogni screenshot:
  - `formation_image`: Formazione, giocatori, posizioni, stile di gioco
  - `ratings_image`: Voti, numero maglia, stella, gol, assist, minuti
  - `team_stats_image`: Possesso, tiri, passaggi, contrasti, etc.
  - `attack_areas_image`: Percentuali sinistra/centro/destra
  - `recovery_zones_image`: Mappa distribuzione spaziale
  - `goals_chart_image`: Minuto gol, marcatore, assist, tipo gol
- Usare GPT-4o Vision API
- Gestire foto mancanti (non bloccare se mancano)
- Salvare in `extracted_data` (raw backup)

**File da creare/modificare**:
- `app/api/extract-match-data/route.js`

**Criteri completamento**:
- ✅ Estrazione da tutte le 6 foto implementata
- ✅ Gestione foto mancanti implementata
- ✅ Testato con foto complete e parziali
- ✅ Output JSON strutturato corretto

---

### TASK 2.2: Matching Giocatori - Nome + Età
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 2.1

**Cosa fare**:
- Implementare logica matching giocatori da `ratings_image` con rosa utente
- Usare `lib/normalize.js` per normalizzazione nomi
- Match per: nome esatto, nome parziale, posizione + rating simile
- Salvare in `players_in_match` con `match_status` ("matched", "not_found")
- Gestire casi edge: nomi con accenti, abbreviazioni

**File da creare/modificare**:
- `app/api/extract-match-data/route.js` (sezione matching)

**Criteri completamento**:
- ✅ Matching implementato
- ✅ Gestione casi edge
- ✅ Testato con nomi vari
- ✅ Output corretto

---

### TASK 2.3: Confronto Formazione - Salvata vs Giocata
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 2.1

**Cosa fare**:
- Implementare logica confronto formazione salvata vs giocata
- Identificare discrepanze: giocatori diversi, posizioni diverse, formazione diversa
- Salvare in `formation_discrepancies` (JSONB)
- Gestire caso: formazione salvata non presente

**File da creare/modificare**:
- `app/api/extract-match-data/route.js` (sezione confronto)

**Criteri completamento**:
- ✅ Confronto implementato
- ✅ Discrepanze identificate correttamente
- ✅ Testato con formazioni diverse
- ✅ Output corretto

---

### TASK 2.4: Calcolo Metriche Derivate
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: TASK 2.1

**Cosa fare**:
- Calcolare metriche derivate da dati estratti:
  - Precisione passaggi = successful_passes / passes * 100
  - Efficacia tiri = goals / shots * 100
  - Altri calcoli necessari
- Salvare in `team_stats` (JSONB)

**File da creare/modificare**:
- `app/api/extract-match-data/route.js` (sezione metriche)

**Criteri completamento**:
- ✅ Metriche calcolate
- ✅ Testato con dati vari
- ✅ Output corretto

---

### TASK 2.5: Salvataggio Match - Endpoint `/api/supabase/save-match`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 1.10, TASK 2.1, TASK 2.2, TASK 2.3

**Cosa fare**:
- Implementare salvataggio match in database
- Salvare tutti i dati estratti in campi JSONB
- Impostare `analysis_status = 'pending'`
- Gestire errori e rollback

**File da creare/modificare**:
- `app/api/supabase/save-match/route.js`

**Criteri completamento**:
- ✅ Salvataggio implementato
- ✅ Tutti i campi salvati correttamente
- ✅ Testato con dati completi e parziali
- ✅ Error handling corretto

---

### TASK 2.6: Upload UI - Pagina Upload Match
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 4-5 ore  
**Dipendenze**: TASK 2.5

**Cosa fare**:
- Creare pagina `/app/upload-match/page.jsx`
- UI per upload 6 foto (formation, ratings, team_stats, attack_areas, recovery_zones, goals_chart)
- Mostrare progresso upload
- Messaggi rassicuranti per foto mancanti
- Mostrare barra conoscenza attuale
- Chiamare `/api/extract-match-data` e `/api/supabase/save-match`

**File da creare/modificare**:
- `app/upload-match/page.jsx`

**Criteri completamento**:
- ✅ UI creata
- ✅ Upload funzionante
- ✅ Messaggi rassicuranti implementati
- ✅ Barra conoscenza visibile
- ✅ Testato su desktop e mobile

---

---

## 🟡 FASE 3: AI ANALYSIS (Analisi + Suggerimenti)

### TASK 3.1: Endpoint `/api/ai/analyze-match` - Analisi AI
**Difficoltà**: 🔴 DIFFICILE  
**Tempo stimato**: 6-8 ore  
**Dipendenze**: TASK 2.5, TASK 1.3, TASK 1.4

**Cosa fare**:
- Creare endpoint `/api/ai/analyze-match/route.js`
- Caricare dati match corrente
- Caricare storico ultime 50 partite (aggregati da `player_performance_aggregates` e `team_tactical_patterns`)
- Caricare conoscenza IA utente
- Costruire prompt GPT-5.2 Thinking/Pro con:
  - Dati match corrente
  - Storico utente
  - Pattern ricorrenti
  - Tono rassicurante obbligatorio
- Chiamare GPT-5.2 e generare: `ai_summary`, `ai_insights`, `ai_recommendations`
- Salvare in `matches` e aggiornare `analysis_status = 'completed'`

**File da creare/modificare**:
- `app/api/ai/analyze-match/route.js`

**Criteri completamento**:
- ✅ Endpoint creato
- ✅ Caricamento storico implementato
- ✅ Prompt costruito correttamente
- ✅ Chiamata GPT-5.2 funzionante
- ✅ Salvataggio risultati implementato
- ✅ Tono rassicurante verificato

---

### TASK 3.2: Generazione Task Automatici
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 4-5 ore  
**Dipendenze**: TASK 3.1, TASK 1.5

**Cosa fare**:
- Implementare logica generazione task automatici dopo analisi
- Criteri: performance threshold, position changes, recurring problems, ineffective tactical patterns
- Creare task in `ai_tasks` con `status = 'pending'`
- Priorità: `high`, `medium`, `low`

**File da creare/modificare**:
- `app/api/ai/analyze-match/route.js` (sezione task)

**Criteri completamento**:
- ✅ Logica generazione implementata
- ✅ Task creati correttamente
- ✅ Priorità assegnate correttamente
- ✅ Testato con vari scenari

---

### TASK 3.3: UI Pagina Match - Riassunto + Insight + Raccomandazioni
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 5-6 ore  
**Dipendenze**: TASK 3.1

**Cosa fare**:
- Creare pagina `/app/match/[id]/page.jsx`
- Mostrare `ai_summary` (riassunto testuale) come prima cosa
- Mostrare `ai_insights` (expandable)
- Mostrare `ai_recommendations` (expandable)
- Mostrare dettagli (collapsable) solo se richiesto
- Tono rassicurante in tutti i messaggi

**File da creare/modificare**:
- `app/match/[id]/page.jsx`

**Criteri completamento**:
- ✅ UI creata
- ✅ Riassunto prioritario
- ✅ Insight e raccomandazioni expandable
- ✅ Dettagli collapsable
- ✅ Testato su desktop e mobile

---

### TASK 3.4: UI Storico Partite - Lista con Anteprima
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 3.1

**Cosa fare**:
- Creare pagina `/app/match-history/page.jsx`
- Mostrare lista partite con:
  - Data partita
  - Anteprima riassunto (prima frase, max 100 chars)
  - Non statistiche raw
- Click su partita → `/app/match/[id]`

**File da creare/modificare**:
- `app/match-history/page.jsx`

**Criteri completamento**:
- ✅ UI creata
- ✅ Lista partite funzionante
- ✅ Anteprima riassunto mostrata
- ✅ Navigazione funzionante
- ✅ Testato su desktop e mobile

---

---

## 🟢 FASE 4: UI/UX (Responsive + Bilingue)

### TASK 4.1: Componente Barra Conoscenza IA
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 1.6, TASK 1.7

**Cosa fare**:
- Creare componente `components/AIKnowledgeBar.jsx`
- Mostrare barra progressiva 0-100%
- Colori: Rosso (0-30%), Arancione (30-60%), Giallo (60-80%), Verde (80-100%)
- Tooltip con dettagli su come aumentare
- Aggiornamento real-time dopo ogni upload
- Posizionare in header/navbar

**File da creare/modificare**:
- `components/AIKnowledgeBar.jsx`
- `app/layout.tsx` (aggiungere barra in header)

**Criteri completamento**:
- ✅ Componente creato
- ✅ Barra funzionante
- ✅ Colori corretti
- ✅ Tooltip implementato
- ✅ Testato su desktop e mobile

---

### TASK 4.2: Traduzioni - Chiavi Match Analisi
**Difficoltà**: 🟢 FACILE  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: Nessuna

**Cosa fare**:
- Aggiungere traduzioni in `lib/i18n.js` per:
  - Upload match: "uploadMatch", "formationImage", "ratingsImage", etc.
  - Analisi: "matchAnalysis", "summary", "insights", "recommendations"
  - Conoscenza IA: "knowledgeBar", "knowledgeLevel", "howToIncrease"
  - Messaggi rassicuranti: "dontWorry", "moreDataBetterHelp", etc.
- Supporto IT/EN

**File da creare/modificare**:
- `lib/i18n.js`

**Criteri completamento**:
- ✅ Tutte le chiavi aggiunte
- ✅ Traduzioni IT/EN complete
- ✅ Testato cambio lingua

---

### TASK 4.3: Responsive Design - Upload Match
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 2.6

**Cosa fare**:
- Ottimizzare `/app/upload-match/page.jsx` per mobile
- Grid layout responsive
- Foto upload ottimizzato per touch
- Messaggi adattati per schermo piccolo
- Test su vari dispositivi

**File da creare/modificare**:
- `app/upload-match/page.jsx`
- `app/globals.css` (media queries se necessario)

**Criteri completamento**:
- ✅ Layout responsive
- ✅ Touch-friendly
- ✅ Testato su mobile (iPhone, Android)
- ✅ Testato su tablet

---

### TASK 4.4: Responsive Design - Pagina Match
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 3.3

**Cosa fare**:
- Ottimizzare `/app/match/[id]/page.jsx` per mobile
- Riassunto prioritario (sempre visibile)
- Insight e raccomandazioni ottimizzati per mobile
- Dettagli collapsable funzionanti su mobile
- Test su vari dispositivi

**File da creare/modificare**:
- `app/match/[id]/page.jsx`
- `app/globals.css` (media queries se necessario)

**Criteri completamento**:
- ✅ Layout responsive
- ✅ Priorità riassunto mantenuta
- ✅ Testato su mobile
- ✅ Testato su tablet

---

### TASK 4.5: Responsive Design - Storico Partite
**Difficoltà**: 🟢 FACILE  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: TASK 3.4

**Cosa fare**:
- Ottimizzare `/app/match-history/page.jsx` per mobile
- Lista partite responsive
- Anteprima riassunto ottimizzata per mobile
- Test su vari dispositivi

**File da creare/modificare**:
- `app/match-history/page.jsx`
- `app/globals.css` (media queries se necessario)

**Criteri completamento**:
- ✅ Layout responsive
- ✅ Testato su mobile
- ✅ Testato su tablet

---

---

## 🔴 FASE 1 (CONTINUA): PROFILO UTENTE E CREDITI

### TASK 1.11: Database Schema - Tabella `user_profiles`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: Nessuna

**⚠️ RISCHI**:
- ❌ **Breaking**: Nessuno (tabella nuova, non tocca codice esistente)
- ⚠️ **Trigger**: Se trigger fallisce, `profile_completion_score` non si aggiorna
- ⚠️ **RLS**: Se RLS non funziona, utente non può salvare profilo

**Problematiche Cliente**:
- Se trigger non funziona: barra profilazione mostra 0% anche se compilata
- Se RLS non funziona: utente non può salvare profilo

**UX**:
- Mostrare loading durante salvataggio
- Mostrare errore chiaro se salvataggio fallisce
- Aggiornare barra profilazione in tempo reale dopo salvataggio

**Cosa fare**:
- Creare migration SQL per tabella `user_profiles`
- Campi: `first_name`, `last_name`, `current_division`, `favorite_team`, `team_name`, `ai_name`, `how_to_remember`, `hours_per_week`, `common_problems`, `profile_completion_score`, `profile_completion_level`
- Trigger automatico per calcolo `profile_completion_score` (0-100%)
- RLS: Utente può vedere/modificare solo il proprio profilo
- Indici: `user_id`, `profile_completion_score`

**File da creare/modificare**:
- Migration creata direttamente in Supabase (MCP)

**Criteri completamento**:
- ✅ Migration creata e testata
- ✅ Trigger funzionante (testato con INSERT/UPDATE manuali)
- ✅ RLS configurato (testato con utente diverso)
- ✅ Testato con INSERT e UPDATE
- ✅ Utente ha testato e approvato

---

### TASK 1.12: Database Schema - Tabella `user_hero_points`
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: Nessuna

**⚠️ RISCHI CRITICI**:
- ❌ **Breaking**: Nessuno (tabella nuova)
- 🔴 **Race Condition**: Se due operazioni simultanee sottraggono crediti, balance può andare negativo
- 🔴 **Transazioni Atomiche**: Se operazione fallisce dopo sottrazione crediti, crediti persi

**Problematiche Cliente**:
- **CRITICO**: Se race condition, cliente può avere balance negativo
- **CRITICO**: Se operazione fallisce dopo sottrazione, cliente perde crediti senza risultato

**UX**:
- Mostrare balance in tempo reale
- Mostrare "Operazione in corso..." durante chiamata API
- Mostrare errore chiaro se crediti insufficienti
- Mostrare transazione in storico

**Cosa fare**:
- Creare migration SQL per tabella `user_hero_points`
- Campi: `hero_points_balance`, `euros_equivalent` (computed), `last_purchase_at`, `total_purchased`, `total_spent`
- RLS: Utente può vedere/modificare solo i propri crediti
- Indici: `user_id`, `hero_points_balance`
- **IMPORTANTE**: Usare `CHECK (hero_points_balance >= 0)` per prevenire balance negativo

**File da creare/modificare**:
- Migration creata direttamente in Supabase (MCP)

**Criteri completamento**:
- ✅ Migration creata e testata
- ✅ RLS configurato
- ✅ Constraint `CHECK` per balance >= 0
- ✅ Testato con operazioni simultanee (simulazione race condition)
- ✅ Utente ha testato e approvato

---

### TASK 1.13: Database Schema - Tabella `hero_points_transactions`
**Difficoltà**: 🟢 FACILE  
**Tempo stimato**: 1-2 ore  
**Dipendenze**: TASK 1.12

**Cosa fare**:
- Creare migration SQL per tabella `hero_points_transactions`
- Campi: `transaction_type`, `hero_points_amount`, `euros_amount`, `operation_type`, `operation_id`, `balance_after`, `description`
- RLS: Utente può vedere solo le proprie transazioni
- Indici: `user_id`, `created_at`, `transaction_type`

**File da creare/modificare**:
- `migrations/create_hero_points_transactions_table.sql` (NUOVO FILE)

**Criteri completamento**:
- ✅ Migration creata e testata
- ✅ RLS configurato
- ✅ Testato

---

### TASK 1.14: Endpoint `/api/hero-points/balance` (GET) + Starter Pack
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 1-2 ore  
**Dipendenze**: TASK 1.12, TASK 1.13

**⚠️ RISCHI**:
- ⚠️ **Idempotenza**: Se chiamata duplicata, starter pack assegnato due volte
- ⚠️ **Performance**: Se chiamato troppo spesso, può sovraccaricare DB

**Problematiche Cliente**:
- Se starter pack non assegnato, cliente non può usare app
- Se balance non si aggiorna, cliente non sa quanti crediti ha

**UX**:
- Mostrare balance in header (sempre visibile)
- Mostrare "Benvenuto! Hai ricevuto 1,000 Hero Points" se starter pack appena assegnato
- Aggiornare balance dopo ogni operazione
- Cache balance in frontend (5 minuti) per evitare chiamate eccessive

**Cosa fare**:
- Creare endpoint `/api/hero-points/balance/route.js`
- Autenticazione: Bearer token
- **IMPORTANTE**: Starter Pack automatico:
  - Se `starter_pack_claimed = false`, assegna automaticamente 1000 HP
  - Marca `starter_pack_claimed = true`
  - Crea transazione `starter_pack`
  - Aggiorna balance
- Ritorna: `{ hero_points_balance, euros_equivalent, starter_pack_claimed, last_purchase_at }`

**File da creare/modificare**:
- `app/api/hero-points/balance/route.js` (NUOVO FILE)

**Criteri completamento**:
- ✅ Autenticazione implementata
- ✅ Starter pack automatico implementato (verifica `starter_pack_claimed`)
- ✅ Transazione atomica (assegna crediti + marca come claimed)
- ✅ Ritorna balance corretto
- ✅ Testato con utente nuovo (starter pack assegnato)
- ✅ Testato con utente esistente (starter pack non riassegnato)
- ✅ Utente ha testato e approvato

---

### TASK 1.15: Endpoint `/api/hero-points/purchase` (POST)
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: TASK 1.12, TASK 1.13

**Cosa fare**:
- Creare endpoint `/api/hero-points/purchase/route.js`
- Autenticazione: Bearer token
- Input: `{ amount_euros: 10 }` → Aggiunge 1000 hero points (1000 points = 10€)
- Crea transazione `purchase`
- Aggiorna balance
- Integrazione: Stripe/PayPal (futuro)

**File da creare/modificare**:
- `app/api/hero-points/purchase/route.js` (NUOVO FILE)

**Criteri completamento**:
- ✅ Autenticazione implementata
- ✅ Calcolo corretto (10€ = 1000 points)
- ✅ Transazione creata
- ✅ Balance aggiornato
- ✅ Testato

---

### TASK 1.16: Endpoint `/api/hero-points/spend` (POST) - Interno
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: TASK 1.12, TASK 1.13

**Cosa fare**:
- Creare endpoint `/api/hero-points/spend/route.js`
- Autenticazione: Bearer token
- Input: `{ amount, operation_type, operation_id, description }`
- Verifica balance sufficiente
- Sottrae crediti
- Crea transazione `spent`
- Ritorna nuovo balance

**File da creare/modificare**:
- `app/api/hero-points/spend/route.js` (NUOVO FILE)

**Criteri completamento**:
- ✅ Verifica balance implementata
- ✅ Sottrazione atomica
- ✅ Transazione creata
- ✅ Testato con balance sufficiente/insufficiente

---

### TASK 1.17: UI Impostazioni Profilo - Pagina
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 4-5 ore  
**Dipendenze**: TASK 1.11

**Cosa fare**:
- Creare pagina `/app/impostazioni-profilo/page.jsx`
- Sezioni: Dati Personali, Dati Gioco, Preferenze IA, Esperienza Gioco
- **Mobile-first**: Scroll verticale, sezioni stack
- **Skip opzionale**: Ogni sezione ha bottone "Salta"
- **Niente obbligatorio**: Tutti i campi opzionali
- **Barra profilazione**: Mostra score 0-100%
- **Salvataggio incrementale**: Salva dopo ogni sezione
- Chiamare `/api/supabase/save-profile`

**File da creare/modificare**:
- `app/impostazioni-profilo/page.jsx` (NUOVO FILE)

**Criteri completamento**:
- ✅ UI creata mobile-first
- ✅ Skip funzionante
- ✅ Barra profilazione visibile
- ✅ Salvataggio incrementale funzionante
- ✅ Testato su mobile e desktop

---

### TASK 1.18: Endpoint `/api/supabase/save-profile` (POST)
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2 ore  
**Dipendenze**: TASK 1.11

**Cosa fare**:
- Creare endpoint `/api/supabase/save-profile/route.js`
- Autenticazione: Bearer token
- Validazione: Text length (max 255)
- Authorization: Verifica `user_id`
- Salva/aggiorna profilo
- Trigger automatico calcola `profile_completion_score`

**File da creare/modificare**:
- `app/api/supabase/save-profile/route.js` (NUOVO FILE)

**Criteri completamento**:
- ✅ Autenticazione implementata
- ✅ Validazione implementata
- ✅ Salvataggio funzionante
- ✅ Trigger calcola score corretto
- ✅ Testato

---

### TASK 1.19: Componente HeroPointsBalance - Countdown Numerico
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: TASK 1.14

**⚠️ RISCHI**:
- ⚠️ **Breaking**: Modifica `app/layout.tsx` - può rompere layout esistente
- ⚠️ **Performance**: Se chiamato troppo spesso, può sovraccaricare API
- ⚠️ **UX**: Se balance non visibile, cliente non sa quanti crediti ha

**Problematiche Cliente**:
- Se balance non si aggiorna, cliente non sa quanti crediti ha
- Se componente non visibile, cliente non sa quanti crediti ha
- Se layout rotto, app non funziona

**UX**:
- Mostrare balance sempre visibile in header
- Aggiornare balance dopo ogni operazione
- Mostrare "Crediti insufficienti" se balance < costo operazione
- Mostrare alert se balance < 50 HP
- Cache balance in frontend (5 minuti) per evitare chiamate eccessive

**Cosa fare**:
- Creare componente `components/HeroPointsBalance.jsx`
- Mostra balance numerico: "1,250 punti (12.50€)"
- Bottone "Compra Crediti"
- Chiama `/api/hero-points/balance` per aggiornare
- Posizionare in header/navbar
- Cache balance in frontend (5 minuti)

**File da creare/modificare**:
- `components/HeroPointsBalance.jsx` (NUOVO FILE)
- `app/layout.tsx` (AGGIUNGERE componente, NON cancellare codice esistente)

**⚠️ NOTA RIPRISTINO**:
```
Se layout.tsx rompe, rimuovere componente HeroPointsBalance e ripristinare versione precedente.
Backup: Salvare versione corrente prima di modificare.
```

**Criteri completamento**:
- ✅ Componente creato
- ✅ Balance mostrato correttamente
- ✅ Aggiornamento ogni 30 secondi (auto-refresh)
- ❌ Cache implementata (5 minuti) - **NON implementato** (attualmente auto-refresh ogni 30s)
- ⚠️ Testato su mobile e desktop - **DA VERIFICARE**
- ⚠️ Testato che layout esistente funziona ancora - **DA VERIFICARE**
- ❌ Utente ha testato e approvato - **IN ATTESA**

**⚠️ STATO ATTUALE**: ⚠️ **PARZIALE**
- ✅ Componente funzionante e integrato in 3 pagine principali
- ❌ **MANCA**: Bottone "Compra Crediti"
- ❌ **MANCA**: Alert se balance < 50 HP
- ❌ **MANCA**: Cache di 5 minuti
- ⚠️ **NOTA**: Integrato nelle singole pagine invece di `app/layout.tsx` (come da documentazione originale)

---

### TASK 1.20: Integrazione Crediti in Endpoint Esistenti
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 3-4 ore  
**Dipendenze**: TASK 1.16

**🔴 RISCHI CRITICI - BREAKING CHANGES**:
- 🔴 **CRITICO**: Modifica endpoint esistenti che funzionano
- 🔴 **Regresso**: Se logica crediti rompe, endpoint non funzionano più
- 🔴 **Race Condition**: Se due chiamate simultanee, balance può andare negativo
- 🔴 **Crediti Persi**: Se operazione fallisce dopo sottrazione, crediti persi

**Problematiche Cliente**:
- **CRITICO**: Se endpoint non funzionano, cliente non può profilare rosa
- **CRITICO**: Se crediti sottratti ma operazione fallisce, cliente perde crediti senza risultato
- **CRITICO**: Se balance negativo, cliente non può usare app

**UX**:
- Mostrare "Verifica crediti..." prima di operazione
- Mostrare "Operazione in corso..." durante chiamata OpenAI
- Mostrare "Crediti insufficienti" se balance < costo
- Mostrare nuovo balance dopo operazione
- Mostrare errore chiaro se operazione fallisce

**Mitigazioni**:
- **BACKUP**: Fare backup endpoint esistenti prima di modificare
- **Test Incrementale**: Testare ogni endpoint dopo modifica
- **Rollback Plan**: Se qualcosa rompe, rollback immediato
- **Transazioni Atomiche**: Verifica balance → Esegui operazione → Sottrai crediti (tutto in transazione)
- **Error Handling**: Se operazione fallisce, NON sottrarre crediti
- **Logging**: Log ogni operazione per debug

**Cosa fare**:
- Modificare endpoint esistenti per consumare crediti (COSTI PROPORZIONATI):
  - `/api/extract-player`: **2 hero points** (1 foto, GPT-4o Vision) - **SOLO quando carica foto**
  - `/api/extract-formation`: **2 hero points** (1 foto, GPT-4o Vision) - **SOLO quando carica foto**
  - `/api/extract-coach`: **2 hero points** (1 foto, GPT-4o Vision) - **SOLO quando carica foto**
  - `/api/extract-match-data`: **12 hero points** (6 foto, proporzionale se parziali) - **SOLO quando carica foto**
- **⚠️ IMPORTANTE**: NON consumare crediti per:
  - Query SELECT da DB (visualizzazione rosa, giocatore, formazione)
  - UPDATE DB (sostituzione giocatore, spostamento)
  - Refresh pagina
- Verifica balance PRIMA di operazione (PRE-CHECK) - **SOLO per endpoint che chiamano OpenAI**
- Se insufficiente: ritorna errore "Crediti insufficienti", NON esegue operazione
- Se sufficiente: esegue operazione (chiama OpenAI)
- **IMPORTANTE**: Sottrae crediti SOLO se operazione completata con successo
- Se operazione fallisce: NON sottrae crediti
- Crea transazione solo se operazione OK

**File da modificare**:
- `app/api/extract-player/route.js` (AGGIUNGERE logica crediti)
- `app/api/extract-formation/route.js` (AGGIUNGERE logica crediti)
- `app/api/extract-coach/route.js` (AGGIUNGERE logica crediti)
- `app/api/extract-match-data/route.js` (AGGIUNGERE logica crediti)

**⚠️ NOTA RIPRISTINO**: 
```
Se endpoint rompono, ripristinare versione precedente senza logica crediti.
Backup: Salvare versione corrente prima di modificare.
Rollback: Se test fallisce, ripristinare backup immediatamente.
```

**Criteri completamento**:
- ✅ Backup endpoint esistenti creato
- ✅ Verifica balance implementata
- ✅ Sottrazione crediti funzionante (transazione atomica)
- ✅ Transazioni create
- ✅ Error handling per balance insufficiente
- ✅ Testato con operazioni simultanee (race condition)
- ✅ Testato con operazioni che falliscono (verifica che crediti non vengano sottratti)
- ✅ Testato che endpoint esistenti funzionano ancora
- ✅ Utente ha testato e approvato

---

### TASK 1.21: Integrazione Profilo in Analisi IA
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: TASK 1.18, TASK 3.1

**Cosa fare**:
- Modificare `/api/ai/analyze-match/route.js`
- Caricare profilo utente
- Aggiungere dati profilo al prompt AI
- Personalizzare tono e consigli basati su profilo

**File da modificare**:
- `app/api/ai/analyze-match/route.js` (AGGIUNGERE logica profilo)

**Criteri completamento**:
- ✅ Profilo caricato
- ✅ Dati aggiunti al prompt
- ✅ Tono personalizzato
- ✅ Testato

---

---

## 🔵 FASE 5: ENTERPRISE (Performance + Scalabilità)

### TASK 5.1: Caching Redis - Aggregati Performance
**Difficoltà**: 🔴 DIFFICILE  
**Tempo stimato**: 4-5 ore  
**Dipendenze**: TASK 1.3, TASK 1.4

**Cosa fare**:
- Implementare caching Redis per aggregati performance
- TTL: 1 ora
- Cache key: `user:${userId}:aggregates`
- Invalidate cache dopo nuovo match

**File da creare/modificare**:
- `lib/redisClient.js` (nuovo)
- `app/api/ai/analyze-match/route.js` (usare cache)

**Criteri completamento**:
- ✅ Redis configurato
- ✅ Caching implementato
- ✅ Invalidation implementata
- ✅ Testato

---

### TASK 5.2: Rate Limiting - Endpoint AI
**Difficoltà**: 🟡 MEDIA  
**Tempo stimato**: 2-3 ore  
**Dipendenze**: TASK 3.1

**Cosa fare**:
- Implementare rate limiting su `/api/ai/analyze-match`
- Limite: 10 richieste/ora per utente
- Messaggio errore: "Troppe richieste, riprova tra X minuti"

**File da creare/modificare**:
- `lib/rateLimiter.js` (nuovo)
- `app/api/ai/analyze-match/route.js` (usare rate limiter)

**Criteri completamento**:
- ✅ Rate limiting implementato
- ✅ Messaggio errore corretto
- ✅ Testato

---

### TASK 5.3: Background Jobs - Calcolo Efficacia Task
**Difficoltà**: 🔴 DIFFICILE  
**Tempo stimato**: 5-6 ore  
**Dipendenze**: TASK 1.5, TASK 3.2

**Cosa fare**:
- Implementare background job per calcolo efficacia task
- Eseguire ogni notte (cron job)
- Calcolare `effectiveness_score` per task completati
- Aggiornare `performance_before` e `performance_after`

**File da creare/modificare**:
- `lib/backgroundJobs.js` (nuovo)
- Configurare cron job (Vercel Cron o servizio esterno)

**Criteri completamento**:
- ✅ Background job implementato
- ✅ Calcolo efficacia funzionante
- ✅ Cron job configurato
- ✅ Testato

---

---

## 📊 RIEPILOGO TASK

### Per Difficoltà:
- 🟢 **FACILE**: 3 task (7-9 ore)
- 🟡 **MEDIA**: 18 task (60-75 ore)
- 🔴 **DIFFICILE**: 6 task (30-40 ore)

### Per Fase:
- 🔴 **FASE 1**: 10 task (22-28 ore)
- 🟠 **FASE 2**: 6 task (20-28 ore)
- 🟡 **FASE 3**: 4 task (18-23 ore)
- 🟢 **FASE 4**: 5 task (13-18 ore)
- 🔵 **FASE 5**: 3 task (11-14 ore)

### **TOTALE**: 27 task, ~84-111 ore (~2-3 settimane full-time)

---

## ⚠️ REGOLE D'ORO

1. **NON modificare codice esistente** se non necessario
2. **Se devi cancellare codice esistente**: 
   - ⚠️ **METTI NOTA DI RIPRISTINO** nel codice con:
     - Codice cancellato (commentato o in nota)
     - Motivo cancellazione
     - Come ripristinare se necessario
   - Esempio:
     ```javascript
     // ⚠️ RIPRISTINO: Codice originale rimosso per [motivo]
     // Codice originale:
     // function oldFunction() { ... }
     // Per ripristinare: decommentare sopra e rimuovere nuova implementazione
     ```
3. **Testare ogni task** prima di passare al successivo
4. **Commit frequenti** con messaggi chiari
5. **Seguire ordine fasi** (non saltare dipendenze)
6. **Mantenere focus** su un task alla volta
7. **Documentare** eventuali deviazioni

---

## 🎯 PROSSIMI PASSI

1. **Iniziare con FASE 1** (Fondamenta)
2. **Completare TASK 1.1** (Database Schema `matches`)
3. **Testare** prima di procedere
4. **Continuare** con TASK 1.2, 1.3, etc.

---

---

## 📝 NOTE DI RIPRISTINO

**Questa sezione contiene codice cancellato per ripristino rapido se necessario.**

### Template Nota Ripristino nel Codice:
```javascript
// ⚠️ RIPRISTINO: [Data] - [Task] - [Motivo]
// Codice originale rimosso:
// [CODICE ORIGINALE QUI]
// Per ripristinare: decommentare sopra e rimuovere nuova implementazione
```

### Esempio Pratico:
```javascript
// ⚠️ RIPRISTINO: 15 Gen 2025 - TASK 2.1 - Sostituito con nuova logica estrazione
// Codice originale rimosso:
// async function extractOldWay(image) {
//   const result = await oldAPI(image);
//   return result;
// }
// Per ripristinare: decommentare sopra e rimuovere nuova funzione extractNewWay()

// Nuova implementazione
async function extractNewWay(image) {
  // ... nuova logica
}
```

### Regole per Note di Ripristino:
1. **Sempre commentare** codice cancellato, non eliminarlo
2. **Aggiungere nota** con data, task, motivo
3. **Istruzioni chiare** su come ripristinare
4. **Mantenere** codice originale commentato per almeno 1 mese

---

## 🔄 CHECKLIST PRIMA DI MODIFICARE CODICE ESISTENTE

Prima di modificare qualsiasi file esistente, verifica:

- [ ] Ho letto tutto il file esistente?
- [ ] Capisco cosa fa il codice esistente?
- [ ] Posso AGGIUNGERE invece di MODIFICARE?
- [ ] Se devo cancellare: ho preparato nota di ripristino?
- [ ] Ho testato che il codice esistente funziona prima di modificare?
- [ ] Ho fatto commit del codice esistente prima di modificare?

**Se risposta a tutte è SÌ → Procedi**  
**Se anche una è NO → Fermati e ragiona**

---

---

## 📋 CONSIDERAZIONI PER IMPLEMENTAZIONE

### **Real-Time Coaching - Chiarito**
- ✅ **Conversazionale**: Cliente parla, AI risponde con consigli (non screenshot-based)
- ✅ **Compatibile**: Con sistema attuale (non richiede screenshot in tempo reale)
- ✅ **Futuro**: Dopo MVP (Fase 2)

### **Pricing**
- ⚠️ **Da decidere in base ai test**:
  - Testare costi reali OpenAI durante beta
  - Monitorare utilizzo utenti
  - Calcolare margine sostenibile
  - Aggiustare Hero Points di conseguenza

### **Scalabilità**
- ✅ **Multiple API keys OpenAI**: Già pianificato (quando > 10.000 utenti)
- ✅ **Queue system**: Quando necessario (> 1.000 utenti simultanei)
- ✅ **Architettura distribuita**: Quando necessario (> 100.000 utenti)

### **Checklist Pre-Lancio**
- Vedere `CHECKLIST_PERFEZIONAMENTO_PRE_LANCIO.md` per dettagli completi
- MUST HAVE: Validazione semantica, error handling, UI/UX, rate limiting, monitoring
- SHOULD HAVE: Queue system, multiple API keys, caching (quando necessario)
- NICE TO HAVE: Real-time coaching, architettura distribuita (futuro)

---

**Documento in evoluzione - Aggiornare man mano che si procede**
