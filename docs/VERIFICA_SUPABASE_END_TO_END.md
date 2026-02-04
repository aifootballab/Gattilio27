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

## 5. Coerenza funzioni Supabase e flusso end-to-end

### 5.1 Auth API – coerente

Tutte le route API usano lo stesso schema:
- `extractBearerToken(req)` da `lib/authHelper.js`
- `validateToken(token, supabaseUrl, anonKey)` → `userData.user.id`
- `user_id` usato per filtri `.eq('user_id', userId)`

**Route coinvolte**: extract-coach, extract-formation, extract-match-data, extract-player, generate-countermeasures, analyze-match, ai-knowledge, assistant-chat, credits/usage, tasks/list, tasks/generate; supabase/* (save-match, delete-match, update-match, save-player, delete-player, assign-player-to-slot, remove-player-from-slot, save-formation-layout, save-tactical-settings, save-profile, save-coach, set-active-coach, save-opponent-formation); admin/recalculate-patterns.

### 5.2 Frontend → API – mappatura completa

| Frontend | Endpoint | Metodo | Auth |
|----------|----------|--------|------|
| gestione-formazione | /api/supabase/assign-player-to-slot | POST | Bearer |
| gestione-formazione | /api/supabase/remove-player-from-slot | POST | Bearer |
| gestione-formazione | /api/supabase/delete-player | POST | Bearer |
| gestione-formazione | /api/supabase/save-player | POST | Bearer |
| gestione-formazione | /api/supabase/save-tactical-settings | POST | Bearer |
| gestione-formazione | /api/supabase/save-formation-layout | POST | Bearer |
| gestione-formazione | /api/extract-player | POST | Bearer |
| match/new | /api/extract-match-data | POST | Bearer |
| match/new | /api/supabase/save-match | POST | Bearer |
| match/[id] | /api/extract-match-data | POST | Bearer |
| match/[id] | /api/supabase/update-match | POST | Bearer |
| match/[id] | /api/analyze-match | POST | Bearer |
| page (dashboard) | /api/supabase/delete-match | DELETE | Bearer |
| page (dashboard) | /api/supabase/update-match | POST | Bearer |
| page (dashboard) | /api/admin/recalculate-patterns | POST | Bearer |
| contromisure-live | /api/extract-formation | POST | Bearer |
| contromisure-live | /api/supabase/save-opponent-formation | POST | Bearer |
| contromisure-live | /api/generate-countermeasures | POST | Bearer |
| allenatori | /api/extract-coach | POST | Bearer |
| allenatori | /api/supabase/save-coach | POST | Bearer |
| allenatori | /api/supabase/set-active-coach | POST | Bearer |
| giocatore/[id] | /api/extract-player | POST | Bearer |
| impostazioni-profilo | /api/supabase/save-profile | POST | Bearer |
| AssistantChat | /api/assistant-chat | POST | Bearer |
| TaskWidget | /api/tasks/list | GET | Bearer |
| AIKnowledgeBar | /api/ai-knowledge | GET | Bearer |
| CreditsBar | /api/credits/usage | POST | Bearer |

Tutti i fetch includono `Authorization: Bearer ${token}` dove il token viene da `supabase.auth.getSession()`.

### 5.3 Incoerenze estrazione session (frontend)

| File | Pattern | Funziona |
|------|---------|----------|
| gestione-formazione, contromisure-live, allenatori, match/[id] (riga 197), CreditsBar, AIKnowledgeBar, impostazioni-profilo, giocatore/[id], AssistantChat | `const { data: session } = await getSession()` → `session.session.access_token` | ✅ |
| TaskWidget | `const { data: { session } } = await getSession()` → `session.access_token` | ✅ (più pulito) |
| page.jsx riga 148 | `const session = await getSession()` → `session?.data?.session?.access_token` | ✅ |
| match/[id] riga 121 | `(await getSession()).data?.session?.access_token` (inline) | ✅ |

**Nota**: Tutti i pattern sono corretti ma diversi. Per coerenza, si può usare ovunque:
```js
const { data } = await supabase.auth.getSession()
const token = data?.session?.access_token
```

### 5.4 Client Supabase diretto (RLS)

Lato client si usa `supabase.from(...).select()` in:
- `match/[id]` – ricarica match dopo upload
- `page.jsx` (dashboard) – carica matches, patterns
- `gestione-formazione` – carica layout, titolari, riserve
- Altri componenti

RLS filtra per `auth.uid()`; il client usa la sessione dell’utente autenticato. Coerente.

### 5.5 Riepilogo

| Aspetto | Stato |
|---------|--------|
| Auth API (token + validateToken) | ✅ Coerente |
| user_id nelle query | ✅ Coerente |
| Mappatura frontend → API | ✅ Completa |
| Estrazione session frontend | ⚠️ Pattern diversi ma corretti |
| Tabelle API vs migrations | ⚠️ team_tactical_patterns, opponent_formations senza migrazione esplicita |

---

## 6. Verifica MCP Supabase (schema live)

Verifica effettuata con `list_tables` e `list_migrations` via MCP user-supabase.

### 6.1 Tabelle in Supabase (public schema)

| Tabella | RLS | Rows | Codice la usa |
|---------|-----|------|---------------|
| playing_styles | ✅ | 24 | ✅ |
| players | ✅ | 123 | ✅ |
| formation_layout | ✅ | 13 | ✅ |
| coaches | ✅ | 8 | ✅ |
| team_tactical_settings | ✅ | 5 | ✅ |
| opponent_formations | ✅ | 87 | ✅ |
| user_profiles | ✅ | 8 | ✅ |
| player_performance_aggregates | ✅ | 0 | (TODO in save-match) |
| team_tactical_patterns | ✅ | 6 | ✅ |
| ai_tasks | ✅ | 0 | (task IA match; app usa weekly_goals) |
| user_ai_knowledge | ✅ | 0 | (score in user_profiles) |
| matches | ✅ | 34 | ✅ |
| weekly_goals | ✅ | 45 | ✅ |
| user_credit_usage | ✅ | 9 | ✅ |
| profiles | ✅ | 0 | ⚠️ Legacy? |
| analysis_results | ✅ | 0 | ⚠️ Altro progetto (COD?) |
| user_credits | ✅ | 56 | ⚠️ Diverso da user_credit_usage |
| credit_transactions | ✅ | 56 | ⚠️ Gamification |
| user_avatars | ❌ | 7 | ⚠️ RLS disabilitato |
| user_avatar_selections | ✅ | 0 | Gamification |
| user_achievements | ✅ | 0 | Gamification |

### 6.2 Migrazioni applicate (MCP list_migrations)

`team_tactical_patterns` e `opponent_formations` hanno migrazione:
- `create_team_tactical_patterns_table`
- `create_opponent_formations_table`

`weekly_goals` esiste; migrazione `fix_weekly_goals_duplicates`. `create_weekly_goals` non visibile nel nome ma `weekly_goals` è presente.

### 6.3 Coerenza colonne (API vs Supabase)

- **user_credit_usage**: `user_id`, `period_key`, `credits_used`, `credits_included` – ✅ allineato a creditService
- **weekly_goals**: `goal_type`, `goal_description`, `target_value`, `current_value`, `week_start_date`, `week_end_date`, `status` – ✅ allineato a taskHelper
- **user_profiles**: `ai_knowledge_score`, `ai_knowledge_level`, `ai_knowledge_breakdown` – ✅ allineato a ai-knowledge

### 6.4 Note

- `user_avatars`: RLS disabilitato – tabelle gamification/avatars potrebbero essere legacy o non usate da eFootball Coach.
- `user_credits` / `credit_transactions`: sistema crediti alternativo; l’app usa `user_credit_usage` (periodo mensile).

---

## 7. Riferimenti

- `docs/AUDIT_ENTERPRISE_2026.md` – verifica API ↔ doc
- `docs/TASK_RIFINITURE_PROGRAMMATORE.md` – task rifiniture
- `docs/SISTEMA_CREDITI_AI.md` – crediti e user_credit_usage
- `migrations/` – elenco SQL applicabili
- **MCP user-supabase**: `list_tables`, `list_migrations` per verifica schema live