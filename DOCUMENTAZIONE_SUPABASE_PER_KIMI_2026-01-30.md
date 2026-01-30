# Documentazione Supabase per Kimi – Audit completo e lavoro Cursor (30 gen 2026)

**Destinatario:** Kimi  
**Obiettivo:** Handoff del lavoro fatto su Supabase da Cursor + audit completo dello schema e dei dati, per integrare o aggiornare la documentazione esistente.

---

## Parte 1 – Lavoro fatto da Cursor su Supabase (30 gen 2026)

### 1.1 RC-001: Assegnazione atomica slot (transazioni)

**Problema:** Race condition quando due richieste assegnano lo stesso slot contemporaneamente.

**Soluzione applicata:**

1. **Funzione SQL in Supabase** (creata e registrata come migrazione):
   - **Nome:** `atomic_slot_assignment(p_user_id UUID, p_slot_index INTEGER, p_player_id UUID)`
   - **Comportamento:** lock advisory su (user_id, slot_index), libera eventuale giocatore già nello slot (slot_index = NULL), assegna il `player_id` allo slot, tutto in una transazione.
   - **File in repo:** `migrations/atomic_slot_assignment.sql`
   - **Migrazione Supabase:** applicata via MCP `apply_migration`, nome `atomic_slot_assignment`, versione `20260130160300`.

2. **API route aggiornata:** `app/api/supabase/assign-player-to-slot/route.js`
   - Per l’assegnazione di un giocatore esistente (`player_id`): non si fa più “libera vecchio + update” in due step; si chiama `admin.rpc('atomic_slot_assignment', { p_user_id, p_slot_index, p_player_id })` e poi si aggiornano solo `position` e `original_positions` per quel giocatore.
   - La logica di “duplicato in riserve da eliminare” prima dell’assegnazione resta nel route (prima della RPC).

**Verifica:** La migrazione compare in `list_migrations` come ultima voce.

---

## Parte 2 – Audit completo Supabase (MCP, 30 gen 2026)

### 2.1 Migrazioni registrate (list_migrations)

Totale **52 migrazioni**. Ultime in ordine:

| Versione       | Nome                          |
|----------------|-------------------------------|
| 20260127165114 | fix_weekly_goals_duplicates   |
| **20260130160300** | **atomic_slot_assignment** (Cursor 30 gen) |

Le migrazioni per trigger cleanup e fix orphan (`fix_individual_instructions_cleanup`, `fix_orphan_individual_instructions`) **non** compaiono in `list_migrations`: sono state applicate a mano (SQL/execute_sql) in precedenza. Trigger e funzioni sono comunque presenti e attivi.

---

### 2.2 Tabelle schema `public` (list_tables)

Tutte con **RLS abilitato**.

| Tabella                        | Righe | Chiavi / FK principali |
|--------------------------------|-------|-------------------------|
| **playing_styles**             | 21    | PK `id`. FK da `players.playing_style_id` |
| **players**                    | 113   | PK `id`. FK `user_id` → auth.users, `playing_style_id` → playing_styles. CHECK `slot_index` IS NULL OR (0–10). |
| **formation_layout**           | 12    | PK `id`, UNIQUE `user_id`. FK `user_id` → auth.users |
| **coaches**                    | 7     | PK `id`. FK `user_id` → auth.users |
| **team_tactical_settings**     | 5     | PK `id`, UNIQUE `user_id`. FK `user_id` → auth.users. CHECK `team_playing_style` in (possesso_palla, contropiede_veloce, contrattacco, vie_laterali, passaggio_lungo) |
| **opponent_formations**        | 68    | PK `id`. FK `user_id` → auth.users. FK da `matches.opponent_formation_id` |
| **user_profiles**              | 8     | PK `id`, UNIQUE `user_id`. FK `user_id` → auth.users. CHECK ai_knowledge_score 0–100, profile_completion_score 0–100, ecc. |
| **player_performance_aggregates** | 0   | PK `id`. FK `user_id`, `player_id` → players |
| **team_tactical_patterns**     | 6     | PK `id`, UNIQUE `user_id`. FK `user_id` → auth.users |
| **ai_tasks**                   | 0     | PK `id`. FK `user_id`. CHECK task_type, priority, status, effectiveness_status |
| **user_ai_knowledge**          | 0     | PK `id`, UNIQUE `user_id`. FK `user_id` → auth.users. CHECK knowledge_score 0–100, knowledge_level |
| **matches**                    | 27    | PK `id`. FK `user_id`, `opponent_formation_id` → opponent_formations. CHECK photos_uploaded 0–5, data_completeness, credits_used >= 0 |
| **weekly_goals**               | 31    | PK `id`. FK `user_id` → auth.users. CHECK goal_type, difficulty, status, created_by |

---

### 2.3 Colonne critiche (riepilogo)

- **players:** `id`, `user_id`, `player_name`, `position`, `card_type`, `team`, `overall_rating`, `base_stats`, `skills`, `com_skills`, `position_ratings`, `available_boosters`, `height`, `weight`, `age`, `nationality`, `club_name`, `form`, `role`, `playing_style_id`, `current_level`, `level_cap`, `active_booster_name`, `development_points`, **`slot_index`** (integer, CHECK 0–10 o NULL), `metadata`, `extracted_data`, `created_at`, `updated_at`, **`photo_slots`** (jsonb), **`original_positions`** (jsonb, comment: array posizioni dalla card).
- **team_tactical_settings:** `individual_instructions` (jsonb), `team_playing_style` (testo con CHECK).
- **matches:** `match_date`, `player_ratings`, `team_stats`, `attack_areas`, `ball_recovery_zones`, `photos_uploaded`, `data_completeness`, `ai_summary`, **`players_in_match`** (jsonb, comment: disposizione giocatori in campo).
- **user_profiles:** `ai_knowledge_score`, `ai_knowledge_level`, `ai_knowledge_breakdown`, `ai_knowledge_last_calculated`, `profile_completion_score`, `profile_completion_level`, `initial_division`.
- **weekly_goals:** `goal_type`, `target_value`, `current_value`, `status`, `created_by`, `week_start_date`, `week_end_date`.

---

### 2.4 Trigger (public)

| Tabella                 | Trigger                                  | Funzione                               |
|-------------------------|------------------------------------------|----------------------------------------|
| coaches                 | coaches_updated_at_trigger               | update_coaches_updated_at              |
| matches                 | trigger_update_matches_updated_at       | update_matches_updated_at              |
| opponent_formations     | trigger_update_opponent_formations_updated_at | update_opponent_formations_updated_at |
| **players**             | **trigger_cleanup_individual_instructions**   | **cleanup_orphan_individual_instructions** |
| players                 | update_players_updated_at               | update_updated_at_column               |
| team_tactical_settings  | update_team_tactical_settings_updated_at | update_team_tactical_settings_updated_at |
| user_ai_knowledge       | trigger_calculate_knowledge_score       | calculate_ai_knowledge_score           |
| user_profiles           | trigger_calculate_profile_completion    | calculate_profile_completion_score     |
| user_profiles           | trigger_set_initial_division            | set_initial_division                   |
| weekly_goals            | trigger_update_weekly_goals_updated_at  | update_weekly_goals_updated_at         |

---

### 2.5 Funzioni (public)

| Funzione                               | Argomenti                    | Uso |
|----------------------------------------|------------------------------|-----|
| **atomic_slot_assignment**             | p_user_id, p_slot_index, p_player_id | RC-001: assegnazione atomica slot (Cursor 30 gen) |
| calculate_ai_knowledge_score           | (trigger)                    | user_ai_knowledge |
| calculate_profile_completion_score     | (trigger)                    | user_profiles |
| cleanup_orphan_individual_instructions | (trigger)                    | AFTER DELETE players → pulisce individual_instructions |
| fix_orphan_individual_instructions    | (nessuno)                    | Una tantum: rimozione player_id orfani (già eseguita) |
| set_initial_division                   | (trigger)                    | user_profiles |
| update_coaches_updated_at              | (trigger)                    | updated_at |
| update_matches_updated_at              | (trigger)                    | updated_at |
| update_opponent_formations_updated_at  | (trigger)                    | updated_at |
| update_team_tactical_settings_updated_at | (trigger)                  | updated_at |
| update_updated_at_column               | (trigger)                    | players.updated_at |
| update_weekly_goals_updated_at        | (trigger)                    | updated_at |

---

### 2.6 Verifica dati (query 30 gen 2026)

| Tabella                 | Totale | Note |
|-------------------------|--------|------|
| players                 | 113    | invalid_slot (fuori 0–10) = 0; with original_positions = 92 |
| matches                 | 27     | - |
| weekly_goals            | 31     | - |
| formation_layout        | 12     | - |
| team_tactical_settings  | 5      | - |

Integrità: nessun `slot_index` fuori 0–10; alta percentuale di giocatori con `original_positions` valorizzato.

---

### 2.7 Problemi storici (da audit Kimi 28 gen) – stato attuale

1. **individual_instructions con player_id orfani**  
   - **Stato:** Corretto. Trigger `trigger_cleanup_individual_instructions` attivo; fix una tantum eseguito (4 orfani rimossi). Cleanup esplicito anche in `delete-player` route.  
   - **Doc:** RISULTATI_MIGRAZIONI_SUPABASE_2026-01-28.md, CORREZIONI_IMPLEMENTATE_2026-01-28.md.

2. **players.position con valori “stile” (es. Opportunista, Ala prolifica)**  
   - **Stato:** Previsto in salvataggio: validazione in `save-player` (warning, non blocco). Report per 3 giocatori esistenti (Eden Hazard, Pirlo, Mbappé). Correzione manuale opzionale (usare original_positions/suggested_position, spostare stile in role/playing_style_id).  
   - **Doc:** RISULTATI_MIGRAZIONI, report_players_position_styles.sql.

3. **team_playing_style null**  
   - **Stato:** Accettato. UI e backend gestiscono null; nessun fix dati automatico.  
   - **Doc:** AUDIT_SUPABASE_2026-01-28.md.

4. **playing_style_id non referenziabile**  
   - **Stato:** Nessun caso trovato (integrità FK ok).

---

## Parte 3 – Riferimenti a documentazione esistente

Documenti da considerare per integrazione/aggiornamento:

| Documento | Cosa aggiornare / integrare |
|-----------|-----------------------------|
| **ALLINEAMENTO_SUPABASE_E_KIMI_2026-01-30.md** | RC-001 ora implementato; migrazione atomic_slot_assignment in list_migrations. Aggiornare sezione “CURSOR_TASKS vs stato” e “Riepilogo allineamento”. |
| **AUDIT_SUPABASE_2026-01-28.md** | Aggiungere nota: audit 30 gen conferma trigger/funzioni e aggiunge atomic_slot_assignment + migrazione. |
| **AUDIT_COMPLETO_SUPABASE_BACKEND_FRONTEND_2026-01-28.md** | Aggiungere funzione `atomic_slot_assignment` e uso in assign-player-to-slot. |
| **CONTROLLO_SUPABASE_2026-01-28.md** | Allineare conteggi righe (es. players 113, matches 27) e citare ultima migrazione atomic_slot_assignment. |
| **CURSOR_TASKS.md** / **TASK_PROGRESS.md** | Segnare RC-001 come completato (Cursor 30 gen). |
| **PIANO_CORREZIONE_DATI_SUPABASE.md** | Nessun cambio schema; solo stato: fix orphan e trigger già applicati; atomic_slot_assignment aggiunta dopo. |
| **RISULTATI_MIGRAZIONI_SUPABASE_2026-01-28.md** | Resta valido; aggiungere in chiusura: “Il 30 gen 2026 Cursor ha applicato via MCP la migrazione atomic_slot_assignment (RC-001).” |

---

## Parte 4 – Checklist per Kimi

- [ ] Integrare in ALLINEAMENTO_SUPABASE_E_KIMI: RC-001 completato, migrazione in list_migrations.
- [ ] Aggiornare CURSOR_TASKS / TASK_PROGRESS: RC-001 fatto.
- [ ] (Opzionale) Correzione manuale 3 giocatori con position = stile, se richiesto.
- [ ] Usare questo audit come riferimento unico per schema public (tabelle, trigger, funzioni, migrazioni) alla data 30 gen 2026.

---

**Fine documentazione. Audit e lavoro Cursor su Supabase sono documentati in modo completo e coerente con la documentazione esistente.**
