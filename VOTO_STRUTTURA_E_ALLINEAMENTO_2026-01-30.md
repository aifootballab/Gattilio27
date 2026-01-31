# Voto alla struttura e verifica allineamento Supabase (MCP) – 30 gen 2026

---

## 1. Voto all’intera struttura (1–10)

| Aspetto | Voto | Note |
|--------|------|------|
| **Chat IA (assistant-chat)** | **8/10** | Flusso chiaro: auth → contesto profilo → classificazione messaggio → RAG (se eFootball) + contesto personale (se rosa/partite) → prompt → OpenAI. Paletti e checklist riducono invenzioni. Manca solo `/api/assistant-chat` in RATE_LIMIT_CONFIG (fallback 30/min presente). |
| **RAG (info_rag.md)** | **8/10** | Keyword + sezioni, filtro stili per ruolo, usato da assistant-chat (se eFootball), analyze-match e countermeasures. Coerente. Dipendenza da path `info_rag.md` in deploy. |
| **Contesto personale (buildPersonalContext)** | **8.5/10** | On-demand (needsPersonalContext), 6 tabelle Supabase, troncamento 3500 caratteri. Allineato a schema (photo_slots, original_positions, slot_index). |
| **AI Knowledge (score)** | **8/10** | Separato dalla chat: score 0–100 in user_profiles, barra dashboard, aggiornato da save-profile/save-match/update-match/taskHelper. Coerente con aiKnowledgeHelper e colonne DB. |
| **Route API e Supabase** | **8.5/10** | Auth, rate limit, validazioni, error helper integrato dove serve. atomic_slot_assignment, delete-player cleanup, save-player validPositions. Coerenza route ↔ tabelle verificata. |
| **Allineamento Supabase (schema, trigger, migrazioni)** | **9/10** | MCP: 52 migrazioni, atomic_slot_assignment presente. Tabelle (players, formation_layout, team_tactical_settings, matches, user_profiles, ecc.) e colonne (slot_index check 0–10, original_positions, photo_slots, individual_instructions, ai_knowledge_*) coerenti con codice e documenti Kimi. Trigger cleanup e update_players_updated_at verificati in doc. |
| **Documentazione e allineamento doc/codice** | **8.5/10** | ALLINEAMENTO_SUPABASE_E_KIMI, AUDIT_SUPABASE, DOCUMENTAZIONE_SUPABASE_PER_KIMI aggiornati. RC-001, RC-005, RM-003 completati; RC-002 parziale. |

**Voto complessivo struttura: 8.3/10**

Punti di forza: separazione netta tra RAG (eFootball), contesto personale (rosa/partite) e AI Knowledge (score); paletti e checklist nella chat; schema Supabase e migrazioni allineati; documentazione utile per manutenzione.

Miglioramenti possibili: aggiungere `/api/assistant-chat` in RATE_LIMIT_CONFIG; verificare presenza `info_rag.md` in root in produzione; completare RC-002 (sostituire eventuali `window.confirm` residui); correzione manuale opzionale 3 giocatori con position = stile.

---

## 2. Verifica MCP – Allineamento Supabase (30 gen 2026)

### Migrazioni (list_migrations)
- **Totale:** 52 migrazioni.
- **Ultima:** `atomic_slot_assignment` (versione `20260130160300`) ✅
- Trigger/fix orphan non in list_migrations (applicati a mano); presenti e funzionanti come da ALLINEAMENTO_SUPABASE_E_KIMI.

### Tabelle (list_tables) – schema pubblico
- **players:** RLS ✅, colonne `slot_index` (check 0–10), `original_positions`, `photo_slots`, `playing_style_id` FK → playing_styles ✅
- **formation_layout:** user_id unique, formation, slot_positions ✅
- **team_tactical_settings:** team_playing_style (check valori ammessi), individual_instructions (JSONB) ✅
- **matches:** user_id, opponent_formation_id FK, player_ratings, team_stats, attack_areas, ball_recovery_zones, data_completeness, photos_uploaded (0–5) ✅
- **user_profiles:** ai_knowledge_score, ai_knowledge_level, ai_knowledge_breakdown, ai_knowledge_last_calculated ✅
- **coaches, opponent_formations, playing_styles, weekly_goals, team_tactical_patterns, ai_tasks, user_ai_knowledge, player_performance_aggregates** ✅ presenti e coerenti con codice.

### Allineamento con documenti
- **ALLINEAMENTO_SUPABASE_E_KIMI_2026-01-30.md:** stato descritto (trigger, atomic_slot_assignment, tabelle, fix dati) **confermato** da MCP (list_migrations, list_tables).
- **AUDIT_SUPABASE_2026-01-28.md:** problemi individual_instructions orfani (fix applicato), position = stile (3 giocatori, correzione manuale opzionale), team_playing_style null (gestito in codice) **coerenti** con stato attuale.

**Conclusione MCP:** Allineamento Supabase/codice/documenti **confermato**. Nessuna incoerenza rilevata tra schema MCP, route API e documentazione di allineamento.
