# Controllo Supabase – 28 Gennaio 2026

**Fonte**: MCP user-supabase (`list_tables`, `list_migrations`) + grep su codebase.

---

## 1. Tabelle in Supabase (schema `public`)

| Tabella | RLS | Righe (stima) | Usata dall'app |
|---------|-----|----------------|----------------|
| **playing_styles** | ✅ | 21 | ✅ (gestione-formazione, save-player, giocatore, generate-countermeasures, assistant-chat) |
| **players** | ✅ | 111 | ✅ (tutte le route e pagine rosa/formazione) |
| **formation_layout** | ✅ | 12 | ✅ |
| **coaches** | ✅ | 7 | ✅ |
| **team_tactical_settings** | ✅ | 5 | ✅ |
| **opponent_formations** | ✅ | 67 | ✅ |
| **user_profiles** | ✅ | 8 | ✅ |
| **player_performance_aggregates** | ✅ | 0 | ✅ (lib/playerPerformanceHelper, generate-countermeasures) |
| **team_tactical_patterns** | ✅ | 6 | ✅ (analyze-match, update-match, tasks, aiKnowledgeHelper) |
| **matches** | ✅ | 26 | ✅ |
| **weekly_goals** | ✅ | 31 | ✅ (tasks/list, taskHelper, aiKnowledgeHelper) |
| **ai_tasks** | ✅ | 0 | ⚠️ Non referenziata nel codice (possibile uso futuro) |
| **user_ai_knowledge** | ✅ | 0 | ⚠️ Non referenziata nel codice; l’app usa `user_profiles.ai_knowledge_*` |

---

## 2. Colonne critiche – coerenza con il codice

### matches
- **match_date** (timestamptz): presente in DB. Il codice usa `match_date` (lib/aiKnowledgeHelper, taskHelper, playerPerformanceHelper). ✅ Nessun riferimento a `match_data`.
- **is_home**, **ai_summary**, **players_in_match**, **client_team_name**: presenti in DB. ✅

### players
- **original_positions** (jsonb), **photo_slots** (jsonb), **slot_index** (integer, check 0–10): presenti. ✅
- **playing_style_id** → FK a `playing_styles.id`. ✅

### user_profiles
- **ai_knowledge_score**, **ai_knowledge_level**, **ai_knowledge_breakdown**, **ai_knowledge_last_calculated**: presenti. Usati da aiKnowledgeHelper e ai-knowledge route. ✅

### team_tactical_settings
- **team_playing_style** (check: possesso_palla, contropiede_veloce, contrattacco, vie_laterali, passaggio_lungo): coerente con i valori usati nell’app. ✅

### weekly_goals
- **goal_type** (check con valori incluso custom), **created_by** (system/user/admin): presenti. ✅

---

## 3. Migrazioni

- Ultima migrazione elencata: `20260127165114_fix_weekly_goals_duplicates`.
- Migrazioni locali in `migrations/` (es. add_ai_knowledge_to_user_profiles, create_weekly_goals_table, fix_individual_instructions_cleanup) potrebbero non essere tutte applicate sul progetto MCP; verificare con `list_migrations` sul progetto reale se serve allineamento.

---

## 4. RLS e sicurezza

- Tutte le tabelle elencate hanno **RLS abilitato**.
- L’app usa **service role** (SUPABASE_SERVICE_ROLE_KEY) nelle API server-side per operazioni amministrative e **anon key** + token utente lato client; coerenza con uso tipico Supabase. ✅

---

## 5. Riepilogo

| Controllo | Esito |
|-----------|--------|
| Tabelle usate dall’app presenti in Supabase | ✅ |
| Colonne usate dal codice (match_date, original_positions, ai_knowledge_*, ecc.) presenti e allineate | ✅ |
| RLS abilitato su tutte le tabelle | ✅ |
| FK e check constraints (players, team_tactical_settings, weekly_goals) | ✅ |
| Tabelle non usate dal codice | `ai_tasks`, `user_ai_knowledge` (eventuale uso futuro o legacy) |

**Conclusione**: Schema Supabase allineato al codice; nessuna incoerenza rilevata su tabelle e colonne usate dall’app. Le uniche tabelle senza riferimenti nel codice sono `ai_tasks` e `user_ai_knowledge`.
