# Allineamento trigger e funzioni con le funzionalità della piattaforma

**Data:** 5 Febbraio 2026

---

## Verifica effettuata

Controllo di tutte le funzioni e i trigger in Supabase rispetto all'uso effettivo nel codice e nelle funzionalità eFootball Coach.

---

## Funzioni rimosse (inutili/orfane)

| Funzione | Motivo |
|----------|--------|
| **add_bonus_credits** | Usava `credit_transactions` e `user_credits`, tabelle eliminate. Non usata dall'app (usa `user_credit_usage`). |
| **fix_orphan_individual_instructions** | Funzione batch one-time per migrazioni. Mai chiamata dalle API. La pulizia attiva è gestita dal trigger `cleanup_orphan_individual_instructions` su `players`. |

---

## Trigger attivi (tutti allineati)

| Trigger | Tabella | Funzione | Uso |
|---------|---------|----------|-----|
| coaches_updated_at_trigger | coaches | update_coaches_updated_at | Aggiorna `updated_at` su modifica |
| trigger_update_matches_updated_at | matches | update_matches_updated_at | Idem |
| trigger_update_opponent_formations_updated_at | opponent_formations | update_opponent_formations_updated_at | Idem |
| trigger_cleanup_individual_instructions | players | cleanup_orphan_individual_instructions | Pulisce `individual_instructions` quando un giocatore viene eliminato |
| update_players_updated_at | players | update_updated_at_column | Aggiorna `updated_at` su modifica |
| update_team_tactical_settings_updated_at | team_tactical_settings | update_team_tactical_settings_updated_at | Aggiorna `updated_at` su modifica |
| trigger_user_credit_usage_updated_at | user_credit_usage | update_user_credit_usage_updated_at | Aggiorna `updated_at` su modifica |
| trigger_calculate_profile_completion | user_profiles | calculate_profile_completion_score | Calcola `profile_completion_score` e `profile_completion_level` |
| trigger_set_initial_division | user_profiles | set_initial_division | Imposta `initial_division` al primo salvataggio (usato da aiKnowledgeHelper per success score) |
| trigger_update_weekly_goals_updated_at | weekly_goals | update_weekly_goals_updated_at | Aggiorna `updated_at` su modifica |

---

## Funzioni attive (tutte usate)

| Funzione | Chiamata da |
|----------|-------------|
| atomic_slot_assignment | `assign-player-to-slot` (RPC) – assegnazione atomica slot giocatore |
| calculate_profile_completion_score | Trigger su `user_profiles` |
| cleanup_orphan_individual_instructions | Trigger su `players` (DELETE) |
| set_initial_division | Trigger su `user_profiles` |
| update_coaches_updated_at | Trigger su `coaches` |
| update_matches_updated_at | Trigger su `matches` |
| update_opponent_formations_updated_at | Trigger su `opponent_formations` |
| update_team_tactical_settings_updated_at | Trigger su `team_tactical_settings` |
| update_updated_at_column | Trigger su `players` |
| update_user_credit_usage_updated_at | Trigger su `user_credit_usage` |
| update_weekly_goals_updated_at | Trigger su `weekly_goals` |

---

## Tabelle senza trigger `updated_at`

| Tabella | Note |
|---------|------|
| formation_layout | `updated_at` impostato dall’API `save-formation-layout` |
| playing_styles | Tabella di lookup/seed, aggiornamenti rari |
| player_performance_aggregates | Vuota, feature non implementata |

Nessuna di queste richiede un trigger `updated_at` in questo momento.

---

## Riepilogo

- **11 trigger** attivi, tutti utilizzati
- **11 funzioni** attive, tutte referenziate
- **2 funzioni** rimosse (add_bonus_credits, fix_orphan_individual_instructions)
