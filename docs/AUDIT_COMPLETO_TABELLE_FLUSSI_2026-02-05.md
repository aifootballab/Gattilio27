# Audit completo – Tabelle, funzioni, migrazioni e flussi

**Data:** 5 Febbraio 2026  
**Obiettivo:** Documento dettagliato no-code che spiega ogni tabella, ogni funzione, ogni migrazione e dove va ogni dato nel flusso dell'applicazione eFootball Coach.

> **Aggiornamento 5 Feb 2026:** Le tabelle gamification/legacy (profiles, user_credits, credit_transactions, user_avatars, user_avatar_selections, user_achievements, user_ai_knowledge, ai_tasks) sono state rimosse con la migrazione `cleanup_non_efootball_tables`. Vedi `docs/PULIZIA_NON_EFOOTBALL_2026-02-05.md`.

---

## Indice

1. [Panoramica flussi principali](#1-panoramica-flussi-principali)
2. [Tabelle – una per una](#2-tabelle--una-per-una)
3. [Trigger e funzioni automatiche](#3-trigger-e-funzioni-automatiche)
4. [Migrazioni applicate](#4-migrazioni-applicate)
5. [API e tabelle che toccano](#5-api-e-tabelle-che-toccano)
6. [Flussi end-to-end in linguaggio semplice](#6-flussi-end-to-end-in-linguaggio-semplice)

---

## 1. Panoramica flussi principali

L'applicazione eFootball Coach ha questi flussi principali:

| Flusso | Cosa fa l'utente | Dati che partono | Dove finiscono |
|--------|------------------|------------------|----------------|
| **Registrazione** | Si registra con email/password | email, password | auth.users |
| **Profilo** | Compila nome, squadra, preferenze | first_name, team_name, ecc. | user_profiles |
| **Rosa** | Carica giocatori, forma squadra | player_name, position, stats, ecc. | players, formation_layout |
| **Allenatore** | Carica e sceglie allenatore | coach_name, playing_style_competence | coaches |
| **Partita** | Carica screenshot partita, salva | player_ratings, team_stats, result | matches |
| **Contromisure** | Carica formazione avversaria | formation_name, playing_style | opponent_formations |
| **Obiettivi** | Visualizza obiettivi settimanali | — | weekly_goals (lettura) |
| **Crediti** | Usa funzioni IA (chat, analisi, estrazione) | — | user_credit_usage (tracciamento) |
| **AI Coach** | Chatta con l'assistente | messaggio | Nessuna tabella (risposta in tempo reale) |

---

## 2. Tabelle – una per una

### 2.1 auth.users (Supabase Auth)

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | Email, password (hash), id univoco, data registrazione |
| **Chi scrive** | Supabase Auth (registrazione, login) |
| **Chi legge** | Ogni API che valida il token e ottiene user_id |
| **Flusso** | Utente si registra → Supabase crea riga in auth.users |

---

### 2.2 user_profiles

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | Nome, cognome, divisione, squadra preferita, team_name, nome IA, ore/settimana, score completamento, ai_knowledge_score, ai_knowledge_level, ai_knowledge_breakdown |
| **Chi scrive** | save-profile (utente salva da Impostazioni profilo); ai-knowledge e aiKnowledgeHelper (aggiornano ai_knowledge_*); trigger calcolano profile_completion_score |
| **Chi legge** | assistant-chat, ai-knowledge, extract-match-data, analyze-match, save-match, update-match, taskHelper |
| **Flusso** | Utente compila profilo → save-profile upsert → trigger calcola percentuale completamento; AI Knowledge Score calcolato on-demand e salvato qui |

---

### 2.3 user_credit_usage

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | user_id, period_key (YYYY-MM), credits_used, credits_included – utilizzo mensile |
| **Chi scrive** | creditService.recordUsage() chiamato da: assistant-chat, extract-player, extract-coach, extract-match-data, extract-formation, generate-countermeasures, analyze-match |
| **Chi legge** | credits/usage API (CreditsBar nel frontend) |
| **Flusso** | Utente usa una funzione IA → API chiama recordUsage → upsert su user_credit_usage incrementando credits_used |

---

### 2.4 playing_styles

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | name, compatible_positions, description, category – stili di gioco (Possesso palla, Contrattacco, ecc.) |
| **Chi scrive** | Seed/dati iniziali (migrazione o setup manuale) |
| **Chi legge** | assistant-chat, save-player, generate-countermeasures |
| **Flusso** | Tabella di riferimento: ogni giocatore e allenatore può avere un playing_style_id che punta qui |

---

### 2.5 players

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | Nome, posizione, overall_rating, base_stats, skills, com_skills, slot_index, photo_slots, original_positions, playing_style_id |
| **Chi scrive** | save-player, assign-player-to-slot, remove-player-from-slot, save-formation-layout, save-tactical-settings, delete-player |
| **Chi legge** | assistant-chat, assign-player-to-slot, save-tactical-settings, generate-countermeasures, analyze-match |
| **Flusso** | Utente carica card giocatore → extract-player estrae dati → save-player salva; assign-player-to-slot assegna a uno slot; slot_index 0–10 = titolari, NULL = riserva |
| **Trigger** | cleanup_orphan_individual_instructions (pulisce istruzioni individuali orfane); update_players_updated_at |

---

### 2.6 formation_layout

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | formation (es. "4-3-3"), slot_positions (posizioni x,y per ogni slot 0–10) |
| **Chi scrive** | save-formation-layout, save-tactical-settings (legge per validazione) |
| **Chi legge** | assistant-chat, assign-player-to-slot, save-tactical-settings |
| **Flusso** | Utente sceglie formazione e sposta slot → save-formation-layout salva; slot_positions dice dove è ogni posizione sul campo |

---

### 2.7 coaches

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | coach_name, team, playing_style_competence, is_active, photo_slots |
| **Chi scrive** | save-coach, set-active-coach |
| **Chi legge** | assistant-chat, save-match, update-match, generate-countermeasures, analyze-match |
| **Flusso** | Utente carica screenshot allenatore → extract-coach → save-coach; set-active-coach imposta is_active=true per uno e false per gli altri |

---

### 2.11 team_tactical_settings

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | team_playing_style, individual_instructions (istruzioni per giocatore/posizione) |
| **Chi scrive** | save-tactical-settings |
| **Chi legge** | assistant-chat, generate-countermeasures, analyze-match |
| **Flusso** | Utente imposta stile squadra e istruzioni individuali dalla Gestione formazione → save-tactical-settings |

---

### 2.12 opponent_formations

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | formation_name, formation_image, playing_style, tactical_style, players, overall_strength |
| **Chi scrive** | save-opponent-formation |
| **Chi legge** | generate-countermeasures; matches.opponent_formation_id FK |
| **Flusso** | Utente carica formazione avversaria da Contromisure live → extract-formation → save-opponent-formation |

---

### 2.10 matches

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | match_date, opponent_name, result, formation_played, playing_style_played, player_ratings, team_stats, attack_areas, ball_recovery_zones, ai_summary, players_in_match |
| **Chi scrive** | save-match (nuova partita), update-match (aggiornamento, incluso ai_summary) |
| **Chi legge** | assistant-chat, analyze-match, save-match (per pattern), update-match, delete-match, admin/recalculate-patterns, taskHelper |
| **Flusso** | Wizard partita → extract-match-data per ogni step → save-match inserisce; pagina dettaglio → analyze-match genera analisi → update-match salva ai_summary |
| **Trigger** | update_matches_updated_at |

---

### 2.14 team_tactical_patterns

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | formation_usage, playing_style_usage, recurring_issues – statistiche su ultime 50 partite |
| **Chi scrive** | save-match (calcola dopo insert), update-match (idem), admin/recalculate-patterns |
| **Chi legge** | assistant-chat, generate-countermeasures, analyze-match, taskHelper |
| **Flusso** | Dopo ogni salvataggio partita, l'API calcola formation_usage e playing_style_usage dalle ultime 50 partite e fa upsert |

---

### 2.15 weekly_goals

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | goal_type, goal_description, target_value, current_value, week_start_date, week_end_date, status |
| **Chi scrive** | tasks/generate (crea nuovi obiettivi), taskHelper.updateTasksProgressAfterMatch (aggiorna current_value e status dopo partita) |
| **Chi legge** | tasks/list (TaskWidget), taskHelper, aiKnowledgeHelper |
| **Flusso** | TaskWidget chiede obiettivi → tasks/list legge; tasks/generate crea obiettivi settimanali; save-match → updateTasksProgressAfterMatch aggiorna i progressi |

---

### 2.13 player_performance_aggregates

| Aspetto | Dettaglio |
|---------|-----------|
| **Cosa contiene** | average_rating, total_goals, total_assists, position_performance, rating_trend per giocatore |
| **Chi scrive** | Nessuno (trigger su matches rimosso; TODO in save-match) |
| **Chi legge** | Nessuno |
| **Flusso** | Previsto: aggregati calcolati dopo ogni partita. Non implementato. |
| **Stato** | Tabella vuota, feature non completata |

---

## 3. Trigger e funzioni automatiche

| Trigger | Tabella | Funzione | Cosa fa |
|---------|---------|----------|---------|
| trigger_calculate_profile_completion | user_profiles | calculate_profile_completion_score | Prima di insert/update calcola profile_completion_score e profile_completion_level |
| trigger_set_initial_division | user_profiles | set_initial_division | Imposta initial_division al primo salvataggio |
| coaches_updated_at_trigger | coaches | update_coaches_updated_at | Aggiorna updated_at su modifica |
| update_players_updated_at | players | update_updated_at_column | Aggiorna updated_at su modifica |
| trigger_cleanup_individual_instructions | players | cleanup_orphan_individual_instructions | Rimuove da team_tactical_settings.individual_instructions i riferimenti a giocatori eliminati |
| trigger_update_matches_updated_at | matches | update_matches_updated_at | Aggiorna updated_at su modifica |
| trigger_update_opponent_formations_updated_at | opponent_formations | update_opponent_formations_updated_at | Aggiorna updated_at su modifica |
| update_team_tactical_settings_updated_at | team_tactical_settings | update_team_tactical_settings_updated_at | Aggiorna updated_at su modifica |
| trigger_update_weekly_goals_updated_at | weekly_goals | update_weekly_goals_updated_at | Aggiorna updated_at su modifica |
| trigger_user_credit_usage_updated_at | user_credit_usage | update_user_credit_usage_updated_at | Aggiorna updated_at su modifica |

---

## 4. Migrazioni applicate

Le migrazioni sono applicate in ordine. Ecco le principali raggruppate per scopo:

### Schema iniziale e pulizia
- 001_initial_schema, 002_create_storage_bucket, 003_add_player_physical_attributes, 004_update_base_stats_structure
- add_dev_rls_policies, add_dev_storage_policies, improve_dev_storage_policies, create_dev_user
- cleanup_unused_tables, cleanup_unused_functions, cleanup_remaining_functions

### Tabelle core
- create_players_table, remove_unused_player_tables, remove_user_rosa_table
- create_formation_layout_table
- create_coaches_table
- create_team_tactical_settings
- create_opponent_formations_table
- create_matches_table_fixed, drop_matches_table, create_matches_table
- add_client_team_name_to_matches, add_ai_summary_to_matches, add_players_in_match_to_matches
- add_original_positions_column

### Utenti e profili
- create_user_profiles_table
- add_ai_knowledge_to_user_profiles
- fix_profiles_trigger_schema_reference, fix_initialize_user_credits_schema_reference

### Crediti e task
- create_user_hero_points_table, create_hero_points_transactions_table, drop_hero_points_tables
- create_user_credit_usage
- create_weekly_goals_table, fix_weekly_goals_duplicates, fix_weekly_goals_created_by

### Pattern e aggregati
- create_player_performance_aggregates_table
- create_team_tactical_patterns_table
- create_performance_aggregates_trigger_fixed (poi rimosso da drop_matches)

### Altre tabelle
- create_ai_tasks_table
- create_user_ai_knowledge_table, create_knowledge_score_trigger

### Fix e manutenzione
- fix_slot_index_constraint_and_rls_optimization, add_photo_slots_column
- fix_matches_table_schema
- add_tactical_style_to_opponent_formations
- atomic_slot_assignment
- fix_orphan_individual_instructions, fix_individual_instructions_cleanup
- drop_analysis_results_cod_table

---

## 5. API e tabelle che toccano

| API | Legge | Scrive |
|-----|-------|--------|
| save-profile | — | user_profiles |
| save-player | playing_styles | players |
| assign-player-to-slot | formation_layout, players | players |
| remove-player-from-slot | players | players |
| delete-player | players, team_tactical_settings | players, team_tactical_settings |
| save-formation-layout | players | formation_layout, players |
| save-tactical-settings | players, formation_layout | team_tactical_settings |
| save-coach | — | coaches |
| set-active-coach | coaches | coaches |
| save-opponent-formation | — | opponent_formations |
| save-match | user_profiles, coaches, matches | matches, team_tactical_patterns; chiama aiKnowledgeHelper, taskHelper |
| update-match | matches, user_profiles, coaches, team_tactical_patterns | matches, team_tactical_patterns |
| delete-match | matches | matches |
| extract-match-data | user_profiles | — (solo estrazione) |
| extract-player | — | — |
| extract-coach | — | — |
| extract-formation | — | — |
| analyze-match | user_profiles, players, opponent_formations, matches, team_tactical_settings, coaches, team_tactical_patterns | user_credit_usage (recordUsage) |
| generate-countermeasures | opponent_formations, players, playing_styles, formation_layout, team_tactical_settings, coaches, matches | user_credit_usage |
| assistant-chat | user_profiles, formation_layout, players, playing_styles, matches, team_tactical_settings, coaches, team_tactical_patterns | user_credit_usage |
| ai-knowledge | user_profiles | user_profiles (ai_knowledge_*) |
| tasks/list | weekly_goals | — |
| tasks/generate | user_profiles, matches, team_tactical_patterns | weekly_goals |
| credits/usage | user_credit_usage | — |
| admin/recalculate-patterns | matches | team_tactical_patterns |

---

## 6. Flussi end-to-end in linguaggio semplice

### Flusso 1: Nuovo utente si registra

1. L'utente inserisce email e password nella pagina di registrazione.
2. Supabase Auth crea una riga in auth.users.
3. L'utente non ha ancora una riga in user_profiles: verrà creata quando salverà il profilo da Impostazioni. user_credit_usage verrà creata al primo utilizzo di una funzione IA.

---

### Flusso 2: Utente compila il profilo

1. L'utente va in Impostazioni profilo e inserisce nome, cognome, squadra, ecc.
2. Il frontend chiama save-profile con i dati.
3. L'API fa upsert su user_profiles (crea o aggiorna).
4. Il trigger calculate_profile_completion_score calcola la percentuale di completamento e il livello.
5. I dati restano in user_profiles e vengono usati da AI Coach, analisi partite e obiettivi.

---

### Flusso 3: Utente aggiunge un giocatore alla rosa

1. L'utente carica uno screenshot della card in Gestione formazione.
2. Il frontend chiama extract-player: l'immagine va a OpenAI Vision, che restituisce nome, statistiche, skills.
3. L'API registra l'uso in user_credit_usage.
4. L'utente conferma e il frontend chiama save-player con i dati estratti.
5. save-player inserisce una riga in players (slot_index NULL = riserva).
6. Se l'utente assegna il giocatore a uno slot, il frontend chiama assign-player-to-slot.
7. assign-player-to-slot legge formation_layout per le posizioni e aggiorna players (position, slot_index).

---

### Flusso 4: Utente salva una partita

1. L'utente entra nel wizard Nuova partita e carica screenshot (pagelle, statistiche, aree attacco, recuperi, formazione).
2. Per ogni step il frontend chiama extract-match-data: OpenAI estrae i dati, l'API registra i crediti.
3. Alla fine il frontend chiama save-match con tutti i dati.
4. save-match inserisce una riga in matches.
5. save-match calcola formation_usage e playing_style_usage dalle ultime 50 partite e fa upsert su team_tactical_patterns.
6. save-match chiama aiKnowledgeHelper che ricalcola lo score e aggiorna user_profiles.ai_knowledge_*.
7. save-match chiama taskHelper.updateTasksProgressAfterMatch che aggiorna current_value e status in weekly_goals.

---

### Flusso 5: Utente analizza una partita

1. L'utente apre il dettaglio di una partita e clicca "Analizza".
2. Il frontend chiama analyze-match con match_id.
3. L'API legge match, players, user_profiles, coaches, team_tactical_settings, team_tactical_patterns, opponent_formations.
4. Costruisce un prompt per OpenAI con tutti i contesti e riceve analisi (overview, performance giocatori, tattica, raccomandazioni).
5. L'API registra 4 crediti in user_credit_usage.
6. L'API restituisce l'analisi al frontend senza salvarla in database.
7. Se l'utente clicca "Salva analisi", il frontend chiama update-match con ai_summary e l'analisi viene salvata nella colonna ai_summary di matches.

---

### Flusso 6: Utente chatta con l'AI Coach

1. L'utente scrive un messaggio nella chat.
2. Il frontend chiama assistant-chat.
3. L'API legge user_profiles, formation_layout, players, playing_styles, matches, team_tactical_settings, coaches, team_tactical_patterns.
4. Costruisce un prompt personalizzato con rosa, partite, allenatore, pattern.
5. Invia a OpenAI e restituisce la risposta.
6. Registra 1 credito in user_credit_usage.

---

### Flusso 7: Visualizzazione obiettivi settimanali

1. Il TaskWidget carica gli obiettivi chiamando tasks/list.
2. L'API legge da weekly_goals gli obiettivi attivi per la settimana corrente.
3. Se non ce ne sono, può chiamare tasks/generate che crea nuovi obiettivi in base a profilo, partite e pattern.
4. Dopo ogni partita salvata, save-match chiama updateTasksProgressAfterMatch che aggiorna current_value e status in weekly_goals.

---

### Flusso 8: Contromisure contro una formazione avversaria

1. L'utente carica uno screenshot della formazione avversaria in Contromisure live.
2. extract-formation estrae formazione e stile con OpenAI.
3. save-opponent-formation inserisce una riga in opponent_formations.
4. L'utente chiede le contromisure: generate-countermeasures legge opponent_formations, players, formation_layout, coaches, matches, team_tactical_patterns.
5. OpenAI genera suggerimenti tattici.
6. L'API registra 3 crediti in user_credit_usage.

---

## Riepilogo tabelle per stato

| Stato | Tabelle |
|-------|---------|
| **Usate attivamente** | user_profiles, players, formation_layout, coaches, team_tactical_settings, opponent_formations, matches, team_tactical_patterns, weekly_goals, user_credit_usage, playing_styles |
| **Vuote / TODO** | player_performance_aggregates (feature non implementata) |

**Rimosse (5 Feb 2026):** profiles, user_credits, credit_transactions, user_avatars, user_avatar_selections, user_achievements, user_ai_knowledge, ai_tasks – vedi `PULIZIA_NON_EFOOTBALL_2026-02-05.md`
