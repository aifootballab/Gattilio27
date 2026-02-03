# Verifica Supabase End-to-End

**Data**: 3 Febbraio 2026  
**Obiettivo**: Coerenza Frontend → API → Supabase. Ogni tabella usata dall'API deve avere migrazione o setup documentato.

---

## 1. Tabelle usate dalle API

| Tabella | Usata da | Migrazione | Note |
|---------|----------|------------|------|
| `user_profiles` | assistant-chat, ai-knowledge, extract-match-data, update-match, save-match, save-profile | `create_user_profiles_table.sql`, `add_ai_knowledge_to_user_profiles.sql` | ✅ |
| `formation_layout` | assistant-chat, assign-player-to-slot, save-formation-layout, save-tactical-settings | Riferita in create_team_tactical_settings | Setup Supabase/Dashboard |
| `players` | assistant-chat, assign-player-to-slot, delete-player, save-player, save-formation-layout, save-tactical-settings, remove-player-from-slot, generate-countermeasures, analyze-match | `fix_slot_index_and_rls.sql` (alter) | Tabella base in setup iniziale |
| `playing_styles` | assistant-chat, save-player, generate-countermeasures | Riferita in fix_slot_index | Lookup/seed |
| `matches` | assistant-chat, update-match, save-match, delete-match, admin/recalculate-patterns, analyze-match, extract-match-data | `create_matches_table.sql` | ✅ |
| `team_tactical_settings` | assistant-chat, save-tactical-settings, generate-countermeasures, analyze-match | `create_team_tactical_settings.sql` | ✅ |
| `coaches` | assistant-chat, save-coach, set-active-coach, update-match, save-match, generate-countermeasures | `create_coaches_table.sql` | ✅ |
| `team_tactical_patterns` | assistant-chat, admin/recalculate-patterns, update-match, save-match, generate-countermeasures, analyze-match | Non in migrations/ | ⚠️ Creata da setup Supabase o migrazione esterna |
| `opponent_formations` | generate-countermeasures, save-opponent-formation, create_matches (FK) | Riferita in create_matches_table, drop_matches | ⚠️ Deve esistere prima di matches |
| `weekly_goals` | tasks/list | `create_weekly_goals_table.sql` | ✅ |
| `user_credit_usage` | credits/usage (via creditService) | `create_user_credit_usage.sql` | ✅ |

---

## 2. Ordine dipendenze migrazioni

1. `auth.users` (Supabase)
2. `user_profiles` → `create_user_profiles_table.sql`
3. `playing_styles` → seed o setup (riferita da players)
4. `formation_layout`, `players` → setup iniziale (non in migrations/ attuali)
5. `opponent_formations` → prima di matches (FK in create_matches_table)
6. `matches` → `create_matches_table.sql`
7. `coaches` → `create_coaches_table.sql`
8. `team_tactical_settings` → `create_team_tactical_settings.sql`
9. `team_tactical_patterns` → da verificare in Supabase (non in migrations/)
10. `weekly_goals` → `create_weekly_goals_table.sql`
11. `user_credit_usage` → `create_user_credit_usage.sql`
12. `add_ai_knowledge_to_user_profiles` → colonne aggiuntive

---

## 3. Checklist coerenza

- [ ] Tutte le tabelle referenziate dalle API esistono in Supabase
- [ ] `team_tactical_patterns` – verificare esistenza (admin/recalculate-patterns la popola)
- [ ] `opponent_formations` – FK da matches; migrazione da avere prima di matches
- [ ] RLS attivo su tutte le tabelle user-scoped (user_id = auth.uid())
- [ ] API usano `service role` per operazioni admin; `anon + Bearer` per user

---

## 4. Flusso tipico end-to-end

**Esempio: Salva partita**
1. Frontend: `match/new/page.jsx` → `fetch('/api/supabase/save-match', { body: { matchData } })`
2. API: `save-match/route.js` → `validateToken` → `admin.from('matches').insert(...)`
3. Supabase: RLS `Users can insert own matches` con `auth.uid() = user_id`

**Esempio: Crediti**
1. Frontend: `CreditsBar` → `POST /api/credits/usage`
2. API: `credits/usage/route.js` → `getCurrentUsage(admin, userId)` → `user_credit_usage`
3. Supabase: RLS `Users can read own credit usage`

---

## 5. Riferimenti

- `docs/AUDIT_ENTERPRISE_2026.md` – verifica API ↔ doc
- `docs/SISTEMA_CREDITI_AI.md` – crediti e user_credit_usage
- `migrations/` – elenco SQL applicabili
