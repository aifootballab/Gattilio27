# Allineamento Supabase + Ultimi documenti e modifiche Kimi – 30 gen 2026

**Obiettivo:** Verificare che tutto ciò che Kimi ha documentato e applicato (trigger, cleanup, validazioni, audit) sia allineato tra repo, codice e Supabase.

---

## 1. Documenti Kimi rilevanti (2026-01-28)

| Documento | Contenuto |
|-----------|-----------|
| **CURSOR_TASKS.md** | Handoff a Cursor: RC-001/002/003/005, transazioni slot, window.confirm, recovery sessione, error helper |
| **TASK_PROGRESS.md** | Stato task: Kimi ha fatto audit + helper; Cursor deve fare fix critici |
| **RISULTATI_MIGRAZIONI_SUPABASE_2026-01-28.md** | Trigger cleanup ✅, fix orphan eseguito (4 rimossi), report position/stili (3 giocatori) |
| **CORREZIONI_IMPLEMENTATE_2026-01-28.md** | Trigger + delete-player cleanup + save-player validazione position |
| **PIANO_CORREZIONE_DATI_SUPABASE.md** | Piano: individual_instructions orfani, position con stili, team_playing_style null |
| **CONTROLLO_SUPABASE_2026-01-28.md** | Tabelle/colonne allineate al codice, RLS, FK |
| **AUDIT_COMPLETO_SUPABASE_BACKEND_FRONTEND_2026-01-28.md** | Audit 13 tabelle, trigger e funzioni verificate |
| **CHANGELOG_2026-01-28.md** | Fix task completamento, race condition save-match/update-match, dashboard/TaskWidget refresh |

---

## 2. Verifica Supabase (MCP 2026-01-30)

### Trigger su `players`
- **trigger_cleanup_individual_instructions** ✅ presente (AFTER DELETE)
- **update_players_updated_at** ✅ presente

### Migrazioni tracciate in Supabase
- **atomic_slot_assignment** (RC-001, Cursor 30 gen): presente in `list_migrations` come versione `20260130160300`.
- `fix_individual_instructions_cleanup` e `fix_orphan_individual_instructions` non compaiono in `list_migrations`: applicate a mano in precedenza; trigger e funzioni sono presenti e funzionanti.

### Tabelle e colonne
- **players**: `original_positions`, `photo_slots`, `slot_index` (check 0–10), FK `playing_style_id` ✅
- **team_tactical_settings**: `individual_instructions` (JSONB), `team_playing_style` (check) ✅
- **matches**, **user_profiles**, **weekly_goals**, ecc. coerenti con i doc Kimi e con il codice.

### Dati (audit 30 gen)
- 113 giocatori, 0 `slot_index` fuori 0–10, 92 con `original_positions` valorizzato ✅
- Orfan `individual_instructions`: fix eseguito (4 rimossi), 0 rimanenti secondo RISULTATI_MIGRAZIONI

---

## 3. Codice vs documenti Kimi

| Modifica descritta da Kimi | File | Stato |
|----------------------------|------|--------|
| Trigger cleanup `individual_instructions` | `migrations/fix_individual_instructions_cleanup.sql` | ✅ SQL in repo; trigger presente in Supabase |
| Cleanup in delete-player | `app/api/supabase/delete-player/route.js` | ✅ Implementato (pulizia prima di DELETE) |
| Validazione `position` in save-player | `app/api/supabase/save-player/route.js` | ✅ Implementata; `validPositions` estese (CMF, AMF, LWF, RWF, SS, EDE, ecc.) |
| Funzione fix orphan (una tantum) | `migrations/fix_orphan_individual_instructions.sql` | ✅ In repo; esecuzione documentata in RISULTATI (4 orfani rimossi) |
| Report position/stili | `migrations/report_players_position_styles.sql` | ✅ In repo; report generato, 3 giocatori identificati |

---

## 4. Azioni manuali ancora aperte (da doc Kimi)

- **3 giocatori con `position` = stile** (Eden Hazard “Ala prolifica”, A. Pirlo “Tra le linee”, Mbappé “Opportunista”):  
  RISULTATI_MIGRAZIONI indica **correzione manuale** (usare `original_positions` o `suggested_position`, spostare stile in `role`/`playing_style_id`).  
  Non è un disallineamento schema/codice: è un fix dati da completare a mano se si vogliono correggere.

---

## 5. CURSOR_TASKS vs stato attuale (aggiornato 30 gen)

- **RC-001** (transazioni atomiche slot): ✅ **implementato** (Cursor 30 gen): funzione `atomic_slot_assignment` in Supabase, migrazione applicata via MCP; route assign-player-to-slot usa `admin.rpc('atomic_slot_assignment', ...)`.
- **RC-002** (window.confirm): parziale (ConfirmModal per duplicato, elimina giocatore/riserva, formazione, dati opzionali); restano alcuni `window.confirm` in gestione-formazione (assegnazione duplicati, upload riserva).
- **RC-003** (recovery sessione): non implementato (richiesto dall’utente di non procedere).
- **RC-005** (error helper): ✅ **integrato** in gestione-formazione, match/new, AssistantChat (mapErrorToUserMessage).
- **RM-003** (mutazione stato): ✅ **corretto** in match/new (teamStatsForPayload, niente mutazione di stepData).

---

## 6. Riepilogo allineamento

| Aspetto | Esito |
|---------|--------|
| Trigger e funzione cleanup in Supabase | ✅ Allineati ai doc e al repo |
| Cleanup delete-player nel codice | ✅ Allineato |
| Validazione position in save-player | ✅ Allineata (con liste posizioni estese) |
| Schema tabelle/colonne Supabase | ✅ Allineato al codice e ai doc |
| Migrazioni “ufficiali” Supabase | ✅ atomic_slot_assignment in list_migrations; trigger/fix orphan applicati a mano |
| Fix dati 3 giocatori (position = stile) | ⏳ Azione manuale richiesta da Kimi, opzionale (doc Kimi) |
| Task Cursor RC-001, RC-005, RM-003 | ✅ Completati; RC-002 parziale; RC-003 non richiesto |

**Conclusione:** Allineamento Supabase/codice/documenti Kimi è **coerente**. Completati da Cursor (30 gen): RC-001 (atomic_slot_assignment), RC-005 (error helper), RM-003 (mutazione stato), RC-002 parziale. Resta opzionale: correzione manuale 3 giocatori con position=stile. **Documentazione completa per Kimi:** `DOCUMENTAZIONE_SUPABASE_PER_KIMI_2026-01-30.md`.
