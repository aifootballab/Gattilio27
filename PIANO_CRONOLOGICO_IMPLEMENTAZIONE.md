# 📅 Piano Cronologico Implementazione - Match Analisi

**Data**: Gennaio 2025  
**Versione**: 1.1 (Con Analisi Rischi)  
**Obiettivo**: Elenco cronologico preciso da dove partire, con riferimenti a documenti

**⚠️ METODOLOGIA - REGOLE D'ORO**:
- **SEMPRE** leggere `ARCHITETTURA_MATCH_ANALISI.md` per contesto completo prima di iniziare
- **SEMPRE** leggere `ANALISI_RISCHI_TASK_UX.md` PRIMA di ogni task per analisi rischi
- **SEMPRE** leggere `TASK_BREAKDOWN_IMPLEMENTAZIONE.md` per dettagli del task specifico
- Ogni task viene testato dall'utente e marcato "✅ COMPLETATO" solo dopo feedback positivo
- Test incrementale: testare ogni task dopo implementazione
- Rollback plan: se qualcosa rompe, rollback immediato
- **MAI** modificare codice esistente senza leggere prima i documenti

---

## 🎯 PREREQUISITI

Prima di iniziare, verifica:
- [ ] Letto `ARCHITETTURA_MATCH_ANALISI.md` completamente
- [ ] Letto `TASK_BREAKDOWN_IMPLEMENTAZIONE.md` completamente
- [ ] Letto `ANALISI_PROBLEMATICHE_ENTERPRISE.md` (questo documento)
- [ ] Accesso a Supabase configurato
- [ ] API keys OpenAI configurate
- [ ] Ambiente sviluppo funzionante

---

## 📋 ELENCO CRONOLOGICO - DA DOVE PARTIRE

### 🔴 FASE 1: FONDAMENTA (Database + Sicurezza)

**Riferimenti**:
- ARCHITETTURA_MATCH_ANALISI.md: Sezione "Database Schema" (righe 200-400)
- TASK_BREAKDOWN_IMPLEMENTAZIONE.md: FASE 1 (righe 11-247)
- ANALISI_PROBLEMATICHE_ENTERPRISE.md: Problema 1, 3, 5, 6

#### STEP 1.1: Database Schema - Tabella `matches`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.1 (righe 40-60)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Database Schema - Tabella `matches`" (righe 200-250)
2. Creare file `migrations/create_matches_table.sql`
3. Implementare schema completo con tutti i campi
4. Aggiungere RLS (Row Level Security) per `user_id`
5. Creare indici: `user_id`, `match_date`, `analysis_status`
6. Testare migration in Supabase

**File da creare**:
- `migrations/create_matches_table.sql` (NUOVO)

**Nota Supabase**: ✅ **FATTO IN AUTONOMIA** - Uso MCP Supabase per creare tabelle, trigger, RLS direttamente

**Criteri completamento**:
- ✅ Migration creata e testata
- ✅ RLS configurato
- ✅ Indici creati
- ✅ Testato con query di esempio

---

#### STEP 1.2: Database Schema - Tabella `opponent_formations`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.2 (righe 62-82)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Database Schema - Tabella `opponent_formations`" (righe 350-400)
2. Creare file `migrations/create_opponent_formations_table.sql`
3. Implementare schema
4. Aggiungere RLS
5. Testare migration

**File da creare**:
- `migrations/create_opponent_formations_table.sql` (NUOVO)

---

#### STEP 1.3: Database Schema - Tabella `player_performance_aggregates`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.3 (righe 84-104)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Database Schema - Tabella `player_performance_aggregates`" (righe 500-600)
2. Creare file `migrations/create_player_performance_aggregates_table.sql`
3. Implementare schema completo
4. Aggiungere RLS
5. Creare indici: `user_id`, `player_id`, `last_updated`
6. Testare migration

**File da creare**:
- `migrations/create_player_performance_aggregates_table.sql` (NUOVO)

**Nota**: Questa tabella risolve ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 1 (Performance DB)

---

#### STEP 1.4: Database Schema - Tabella `team_tactical_patterns`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.4 (righe 106-126)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Database Schema - Tabella `team_tactical_patterns`" (righe 600-700)
2. Creare file `migrations/create_team_tactical_patterns_table.sql`
3. Implementare schema completo
4. Aggiungere RLS
5. Testare migration

**File da creare**:
- `migrations/create_team_tactical_patterns_table.sql` (NUOVO)

---

#### STEP 1.5: Database Schema - Tabella `ai_tasks`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.5 (righe 128-148)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Database Schema - Tabella `ai_tasks`" (righe 800-900)
2. Creare file `migrations/create_ai_tasks_table.sql`
3. Implementare schema completo con tutti i campi per tracking efficacia
4. Aggiungere RLS
5. Testare migration

**File da creare**:
- `migrations/create_ai_tasks_table.sql` (NUOVO)

---

#### STEP 1.6: Database Schema - Tabella `user_ai_knowledge`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.6 (righe 150-170)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Sistema Conoscenza IA - Schema Database" (righe 2600-2700)
2. Creare file `migrations/create_user_ai_knowledge_table.sql`
3. Implementare schema completo
4. Aggiungere RLS
5. Testare migration

**File da creare**:
- `migrations/create_user_ai_knowledge_table.sql` (NUOVO)

---

#### STEP 1.7: Trigger - Calcolo Automatico `knowledge_score`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.7 (righe 172-192)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Trigger per calcolo automatico knowledge_score" (righe 2650-2700)
2. Creare file `migrations/create_knowledge_score_trigger.sql`
3. Implementare funzione PostgreSQL `calculate_ai_knowledge_score()`
4. Creare trigger `BEFORE INSERT OR UPDATE`
5. Testare con INSERT e UPDATE

**File da creare**:
- `migrations/create_knowledge_score_trigger.sql` (NUOVO)

**Nota Supabase**: Quando scrivi la funzione, usa "tu" (es. "tu calcoli lo score", non "Supabase calcola")

---

#### STEP 1.8: Trigger - Aggiornamento Aggregati Performance
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.8 (righe 194-214)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "SQL Functions and Triggers" (righe 1500-1600)
2. Leggere ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 5 (Trigger Performance)
3. Creare file `migrations/create_performance_aggregates_trigger.sql`
4. Implementare funzione `update_performance_aggregates()`
5. **IMPORTANTE**: Mantenere solo ultime 50 partite (vedi ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 3)
6. Creare trigger `AFTER INSERT` su `matches` quando `analysis_status = 'completed'`
7. Testare con partite multiple

**File da creare**:
- `migrations/create_performance_aggregates_trigger.sql` (NUOVO)

**⚠️ ATTENZIONE**: Questo trigger risolve ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 1 (Performance DB), ma può causare Problema 5 (Trigger Performance). Considera background job (TASK 5.3) se troppo lento.

---

#### STEP 1.9: Sicurezza - Endpoint `/api/extract-match-data`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.9 (righe 216-236)

**Cosa fare**:
1. Leggere AUDIT_SICUREZZA_AGGIORNATO.md - Sezione endpoint extract
2. Leggere ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 7 (Rate Limiting)
3. Creare file `app/api/extract-match-data/route.js` (NUOVO)
4. Implementare autenticazione Bearer token (usare `lib/authHelper.js`)
5. Implementare validazione: Image size (max 10MB), JSONB size (max 500KB)
6. Implementare error handling standardizzato

**File da creare**:
- `app/api/extract-match-data/route.js` (NUOVO)

**Nota**: Non modificare endpoint esistenti (`extract-player`, `extract-formation`, `extract-coach`)

---

#### STEP 1.10: Sicurezza - Endpoint `/api/supabase/save-match`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 1.10 (righe 238-258)

**Cosa fare**:
1. Leggere AUDIT_SICUREZZA_AGGIORNATO.md - Sezione endpoint save
2. Creare file `app/api/supabase/save-match/route.js` (NUOVO)
3. Implementare autenticazione Bearer token
4. Implementare validazione: Text length, JSONB size
5. Implementare authorization: verifica `user_id`
6. Testare con dati validi e invalidi

**File da creare**:
- `app/api/supabase/save-match/route.js` (NUOVO)

---

### 🟠 FASE 2: CORE FEATURE (Upload + Estrazione)

**Riferimenti**:
- ARCHITETTURA_MATCH_ANALISI.md: Sezione "Fase 1: Upload Dati Partita" (righe 370-450)
- TASK_BREAKDOWN_IMPLEMENTAZIONE.md: FASE 2 (righe 279-450)
- ANALISI_PROBLEMATICHE_ENTERPRISE.md: Problema 4 (Storage immagini)

#### STEP 2.1: Endpoint `/api/extract-match-data` - Estrazione Dati
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 2.1 (righe 302-322)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Processo Estrazione" (righe 397-420)
2. Modificare `app/api/extract-match-data/route.js` (già creato in STEP 1.9)
3. Implementare estrazione da 6 screenshot usando GPT-4o Vision API
4. Gestire foto mancanti (non bloccare)
5. Salvare in `extracted_data` (raw backup)

**File da modificare**:
- `app/api/extract-match-data/route.js` (AGGIUNGERE logica estrazione)

**Nota**: Usare endpoint esistenti (`extract-player`, `extract-formation`) come riferimento, ma NON modificarli

---

#### STEP 2.2: Matching Giocatori - Nome + Età
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 2.2 (righe 324-344)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Matching Logic" (righe 450-480)
2. Modificare `app/api/extract-match-data/route.js`
3. Implementare matching usando `lib/normalize.js` (NON modificare se funziona)
4. Match per: nome esatto, nome parziale, posizione + rating
5. Salvare in `players_in_match` con `match_status`

**File da modificare**:
- `app/api/extract-match-data/route.js` (AGGIUNGERE logica matching)

---

#### STEP 2.3: Confronto Formazione - Salvata vs Giocata
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 2.3 (righe 346-366)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Discrepancy Management" (righe 476-500)
2. Modificare `app/api/extract-match-data/route.js`
3. Implementare confronto formazione salvata vs giocata
4. Identificare discrepanze
5. Salvare in `formation_discrepancies`

**File da modificare**:
- `app/api/extract-match-data/route.js` (AGGIUNGERE logica confronto)

---

#### STEP 2.4: Calcolo Metriche Derivate
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 2.4 (righe 368-388)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Calcola metriche derivate" (riga 417)
2. Modificare `app/api/extract-match-data/route.js`
3. Calcolare metriche: precisione passaggi, efficacia tiri, etc.
4. Salvare in `team_stats` (JSONB)

**File da modificare**:
- `app/api/extract-match-data/route.js` (AGGIUNGERE logica metriche)

---

#### STEP 2.5: Salvataggio Match - Endpoint `/api/supabase/save-match`
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 2.5 (righe 390-410)

**Cosa fare**:
1. Modificare `app/api/supabase/save-match/route.js` (già creato in STEP 1.10)
2. Implementare salvataggio match in database
3. Salvare tutti i dati estratti
4. Impostare `analysis_status = 'pending'`
5. Gestire errori e rollback

**File da modificare**:
- `app/api/supabase/save-match/route.js` (AGGIUNGERE logica salvataggio)

---

#### STEP 2.6: Upload UI - Pagina Upload Match
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 2.6 (righe 412-432)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Messaggi rassicuranti" (righe 400-410)
2. Creare file `app/upload-match/page.jsx` (NUOVO)
3. Implementare UI per upload 6 foto
4. Mostrare messaggi rassicuranti per foto mancanti
5. Mostrare barra conoscenza attuale
6. Chiamare `/api/extract-match-data` e `/api/supabase/save-match`

**File da creare**:
- `app/upload-match/page.jsx` (NUOVO)

**Nota**: NON modificare `/app/upload/page.jsx` esistente (se esiste)

---

### 🟡 FASE 3: AI ANALYSIS (Analisi + Suggerimenti)

**Riferimenti**:
- ARCHITETTURA_MATCH_ANALISI.md: Sezione "Fase 2: Analisi AI" (righe 500-600)
- TASK_BREAKDOWN_IMPLEMENTAZIONE.md: FASE 3 (righe 406-500)
- ANALISI_PROBLEMATICHE_ENTERPRISE.md: Problema 2 (Costi AI)

#### STEP 3.1: Endpoint `/api/ai/analyze-match` - Analisi AI
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 3.1 (righe 408-428)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Prompt AI" (righe 544-595)
2. Leggere ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 1 (Performance DB)
3. Creare file `app/api/ai/analyze-match/route.js` (NUOVO)
4. Caricare dati match corrente
5. **IMPORTANTE**: Caricare solo aggregati (non query raw su 50 partite) - vedi ANALISI_PROBLEMATICHE_ENTERPRISE.md
6. Caricare conoscenza IA utente
7. Costruire prompt GPT-5.2 con tono rassicurante
8. Chiamare GPT-5.2 e generare: `ai_summary`, `ai_insights`, `ai_recommendations`
9. Salvare in `matches` e aggiornare `analysis_status = 'completed'`

**File da creare**:
- `app/api/ai/analyze-match/route.js` (NUOVO)

**⚠️ ATTENZIONE**: Usare solo aggregati da `player_performance_aggregates` e `team_tactical_patterns`, NON query raw su 50 partite (vedi ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 1)

---

#### STEP 3.2: Generazione Task Automatici
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 3.2 (righe 430-450)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Automatic Task Generation" (righe 1200-1300)
2. Modificare `app/api/ai/analyze-match/route.js`
3. Implementare logica generazione task
4. Creare task in `ai_tasks` con `status = 'pending'`
5. Assegnare priorità: `high`, `medium`, `low`

**File da modificare**:
- `app/api/ai/analyze-match/route.js` (AGGIUNGERE logica task)

---

#### STEP 3.3: UI Pagina Match - Riassunto + Insight + Raccomandazioni
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 3.3 (righe 452-472)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "UI Proposal" (righe 1800-1900)
2. Creare file `app/match/[id]/page.jsx` (NUOVO)
3. Mostrare `ai_summary` come prima cosa (priorità)
4. Mostrare `ai_insights` (expandable)
5. Mostrare `ai_recommendations` (expandable)
6. Mostrare dettagli (collapsable) solo se richiesto

**File da creare**:
- `app/match/[id]/page.jsx` (NUOVO)

---

#### STEP 3.4: UI Storico Partite - Lista con Anteprima
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 3.4 (righe 474-494)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "Match History UI" (righe 1900-2000)
2. Creare file `app/match-history/page.jsx` (NUOVO)
3. Mostrare lista partite con anteprima riassunto (prima frase, max 100 chars)
4. Click su partita → `/app/match/[id]`

**File da creare**:
- `app/match-history/page.jsx` (NUOVO)

---

### 🟢 FASE 4: UI/UX (Responsive + Bilingue)

**Riferimenti**:
- TASK_BREAKDOWN_IMPLEMENTAZIONE.md: FASE 4 (righe 513-650)
- ARCHITETTURA_MATCH_ANALISI.md: Sezione "Sistema Conoscenza IA" (righe 2600-2800)

#### STEP 4.1: Componente Barra Conoscenza IA
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 4.1 (righe 515-535)

**Cosa fare**:
1. Leggere ARCHITETTURA_MATCH_ANALISI.md - Sezione "UI Barra Conoscenza" (righe 2700-2800)
2. Creare file `components/AIKnowledgeBar.jsx` (NUOVO)
3. Implementare barra progressiva 0-100%
4. Colori: Rosso (0-30%), Arancione (30-60%), Giallo (60-80%), Verde (80-100%)
5. Tooltip con dettagli
6. Modificare `app/layout.tsx` per AGGIUNGERE barra in header (NON cancellare codice esistente)

**File da creare**:
- `components/AIKnowledgeBar.jsx` (NUOVO)

**File da modificare**:
- `app/layout.tsx` (AGGIUNGERE barra, non cancellare)

---

#### STEP 4.2: Traduzioni - Chiavi Match Analisi
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 4.2 (righe 537-557)

**Cosa fare**:
1. Leggere `lib/i18n.js` esistente
2. AGGIUNGERE traduzioni (NON cancellare esistenti):
   - Upload match: "uploadMatch", "formationImage", etc.
   - Analisi: "matchAnalysis", "summary", "insights", "recommendations"
   - Conoscenza IA: "knowledgeBar", "knowledgeLevel", etc.
   - Messaggi rassicuranti: "dontWorry", "moreDataBetterHelp", etc.
3. Supporto IT/EN

**File da modificare**:
- `lib/i18n.js` (AGGIUNGERE traduzioni, non cancellare)

---

#### STEP 4.3-4.5: Responsive Design
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 4.3, 4.4, 4.5 (righe 559-630)

**Cosa fare**:
1. Ottimizzare pagine per mobile:
   - `/app/upload-match/page.jsx`
   - `/app/match/[id]/page.jsx`
   - `/app/match-history/page.jsx`
2. AGGIUNGERE media queries in `app/globals.css` (NON cancellare CSS esistente)
3. Testare su mobile e tablet

**File da modificare**:
- `app/upload-match/page.jsx` (responsive)
- `app/match/[id]/page.jsx` (responsive)
- `app/match-history/page.jsx` (responsive)
- `app/globals.css` (AGGIUNGERE media queries)

---

### 🔵 FASE 5: ENTERPRISE (Performance + Scalabilità)

**Riferimenti**:
- TASK_BREAKDOWN_IMPLEMENTAZIONE.md: FASE 5 (righe 632-700)
- ANALISI_PROBLEMATICHE_ENTERPRISE.md: Tutte le problematiche

#### STEP 5.1: Caching Redis - Aggregati Performance
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 5.1 (righe 632-652)

**Cosa fare**:
1. Leggere ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 1 (Performance DB)
2. Creare file `lib/redisClient.js` (NUOVO)
3. Implementare caching Redis per aggregati
4. TTL: 1 ora
5. Invalidate cache dopo nuovo match
6. Modificare `app/api/ai/analyze-match/route.js` per usare cache

**File da creare**:
- `lib/redisClient.js` (NUOVO)

**File da modificare**:
- `app/api/ai/analyze-match/route.js` (usare cache)

---

#### STEP 5.2: Rate Limiting - Endpoint AI
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 5.2 (righe 654-674)

**Cosa fare**:
1. Leggere ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 2, 7 (Costi AI, Rate Limiting)
2. Creare file `lib/rateLimiter.js` (NUOVO)
3. Implementare rate limiting su `/api/ai/analyze-match`
4. Limite: 10 richieste/ora per utente
5. Modificare endpoint per usare rate limiter

**File da creare**:
- `lib/rateLimiter.js` (NUOVO)

**File da modificare**:
- `app/api/ai/analyze-match/route.js` (usare rate limiter)

---

#### STEP 5.3: Background Jobs - Calcolo Efficacia Task
**Riferimento**: TASK_BREAKDOWN_IMPLEMENTAZIONE.md - TASK 5.3 (righe 676-696)

**Cosa fare**:
1. Leggere ANALISI_PROBLEMATICHE_ENTERPRISE.md - Problema 5 (Trigger Performance)
2. Creare file `lib/backgroundJobs.js` (NUOVO)
3. Implementare background job per calcolo efficacia task
4. Eseguire ogni notte (cron job)
5. Configurare Vercel Cron

**File da creare**:
- `lib/backgroundJobs.js` (NUOVO)
- `vercel.json` (AGGIUNGERE cron job, non cancellare)

---

## 📊 RIEPILOGO CRONOLOGICO

### Ordine di Esecuzione:
1. **STEP 1.1-1.6**: Database Schema (6 tabelle)
2. **STEP 1.7-1.8**: Trigger (2 trigger)
3. **STEP 1.9-1.10**: Sicurezza Endpoint (2 endpoint)
4. **STEP 2.1-2.5**: Core Feature (estrazione + salvataggio)
5. **STEP 2.6**: Upload UI
6. **STEP 3.1-3.4**: AI Analysis + UI
7. **STEP 4.1-4.5**: UI/UX (responsive + bilingue)
8. **STEP 5.1-5.3**: Enterprise (caching + rate limiting + background jobs)

### Tempo Totale Stimato:
- **FASE 1**: 38-50 ore (aggiunti Profilo + Crediti: +16-22 ore)
- **FASE 2**: 20-28 ore
- **FASE 3**: 18-23 ore
- **FASE 4**: 13-18 ore
- **FASE 5**: 11-14 ore
- **TOTALE**: ~100-134 ore (~2.5-3.5 settimane full-time)

---

## ⚠️ NOTE IMPORTANTI

### Per Supabase:
- Quando scrivi migration o funzioni, usa sempre "tu" invece di "Supabase"
- Esempio: "tu crei la tabella" non "Supabase crea la tabella"

### Per Codice Esistente:
- **NON modificare** codice esistente se non necessario
- **AGGIUNGERE** invece di MODIFICARE quando possibile
- Se devi cancellare: aggiungi nota di ripristino (vedi TASK_BREAKDOWN_IMPLEMENTAZIONE.md - Sezione "Note di Ripristino")

### Per Test:
- Testare ogni STEP prima di procedere al successivo
- Verificare che codice esistente funzioni ancora

---

## 🎯 PROSSIMO STEP

**✅ STEP 1.1 COMPLETATO**: Database Schema - Tabella `matches` creata in Supabase (verificato: esiste, 0 righe, RLS abilitato)
**✅ STEP 1.2 COMPLETATO**: Database Schema - Tabella `opponent_formations` creata in Supabase (verificato: esiste, 0 righe, RLS abilitato)
**✅ STEP 1.11 COMPLETATO**: Database Schema - Tabella `user_profiles` creata in Supabase (verificato: esiste, 0 righe, RLS abilitato, trigger attivo)
**✅ STEP 1.12 COMPLETATO**: Database Schema - Tabella `user_hero_points` creata in Supabase (verificato: esiste, 0 righe, RLS abilitato, constraint CHECK attivo)
**✅ STEP 1.13 COMPLETATO**: Database Schema - Tabella `hero_points_transactions` creata in Supabase (verificato: esiste, 0 righe, RLS abilitato, constraint CHECK attivo)

**🎉 FASE 1 COMPLETATA**: Tutte le tabelle fondamentali per Profilo Utente e Sistema Crediti sono state create!

**✅ STEP 1.14 COMPLETATO**: Endpoint `/api/hero-points/balance` creato (starter pack automatico implementato)
**✅ STEP 1.15 COMPLETATO**: Endpoint `/api/hero-points/purchase` creato (acquisto crediti implementato)
**✅ STEP 1.16 COMPLETATO**: Endpoint `/api/hero-points/spend` creato (consumo crediti con verifica balance implementato)

**🎉 FASE 2 API CREDITI COMPLETATA**: Tutti gli endpoint per gestione crediti sono stati creati!

**✅ STEP 1.18 COMPLETATO**: Endpoint `/api/supabase/save-profile` creato (salvataggio profilo con validazione implementato)
**✅ STEP 1.17 COMPLETATO**: UI Impostazioni Profilo - Pagina `/app/impostazioni-profilo/page.jsx` creata (mobile-first, salvataggio incrementale, barra profilazione)

**🎉 FASE 3 UI PROFILO COMPLETATA**: Pagina profilo utente completa e funzionante!

**✅ STEP 1.19 COMPLETATO**: Componente HeroPointsBalance - Countdown Numerico
- ✅ Componente creato e funzionante
- ✅ Integrato in 3 pagine principali (dashboard, gestione-formazione, impostazioni-profilo)
- ✅ Bottone "Compra Crediti" con modal di acquisto
- ✅ Alert visibile se balance < 50 HP (badge rosso con icona)
- ✅ Cache di 5 minuti implementata (invece di auto-refresh ogni 30s)
- ✅ Modal acquisto con input importo e calcolo automatico HP
- ⚠️ **NOTA**: Integrato nelle singole pagine invece di `app/layout.tsx` (funziona correttamente)

**🎉 FASE 3 UI CREDITI COMPLETATA**: Componente Hero Points completo e funzionante!

**⚠️ PROSSIMO STEP PRIORITARIO**: 
- Verifica test utente su STEP 1.19
- Poi procedere con prossimi task da `TASK_BREAKDOWN_IMPLEMENTAZIONE.md`

**Riferimenti**:
- `ARCHITETTURA_PROFILO_UTENTE_CREDITI.md`: Sezione "Database Schema" (righe 28-200)
- `TASK_BREAKDOWN_IMPLEMENTAZIONE.md`: TASK 1.11, 1.12, 1.13

**Riferimenti**:
- ARCHITETTURA_MATCH_ANALISI.md: Sezione "Database Schema - Tabella `opponent_formations`" (righe 350-400)
- TASK_BREAKDOWN_IMPLEMENTAZIONE.md: TASK 1.2 (righe 62-82)

---

## ⚠️ NOTE IMPORTANTI

### GPT-4o Realtime - Servizio d'Élite (Versione Migliore):
- **Versione migliore**: Usiamo GPT-4o Realtime (top tecnologia), anche se costosa
- **Qualità prima di tutto**: Esperienza premium, nessun compromesso
- **Pricing premium**: Costo più alto giustificato da valore unico e qualità
- **UX end-to-end**: Esperienza fluida senza interruzioni
- **Responsive mobile-first**: Ottimizzato per uso su telefono durante partita
- **Monitoraggio costi**: Dashboard real-time per gestione e ottimizzazione continua
- **Filosofia**: Vogliamo la versione migliore, i costi verranno monitorati e gestiti

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

---

**Documento in evoluzione - Aggiornare man mano che si procede**
