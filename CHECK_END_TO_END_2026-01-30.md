# Check end-to-end + Supabase (MCP) – 30 gen 2026

## 1. Flusso end-to-end (gestione formazione → salvataggio)

| Step | Dove | Cosa |
|------|------|------|
| 1 | `gestione-formazione/page.jsx` | Upload foto → estrazione dati (API extract) |
| 2 | idem | Se dati obbligatori mancanti → `MissingDataModal` → inserimento manuale o ricarica |
| 3 | idem | Dati ok → `setShowPositionSelectionModal(true)` + `return` (nessun save in `handleUploadPlayer`) |
| 4 | idem | Utente conferma nel modal → `handleSavePlayerWithPositions()` |
| 5 | idem | Controllo duplicati in `titolari` (nome+età). Se duplicato → `DuplicatePlayerConfirmModal` |
| 6 | idem | onConfirm duplicato: rimuove vecchio da slot (update `slot_index = null`), poi `POST /api/supabase/save-player` |
| 7 | idem | Nessun duplicato: `POST /api/supabase/save-player` con `extractedPlayerData`, `original_positions`, `slot_index`, `photo_slots` |
| 8 | `app/api/supabase/save-player/route.js` | Validazione token, campi, posizioni; lookup `playing_styles`; build `playerData` |
| 9 | idem | Se esiste già giocatore nello stesso `slot_index` → UPDATE (merge); altrimenti controlli duplicati campo/riserve → INSERT |

**Coerenza:** Il salvataggio avviene solo da `handleSavePlayerWithPositions`. Duplicati gestiti in frontend (modal) e in backend (risposta 400 con `duplicate_slot` / `duplicate_player_id`).

---

## 2. Verifica Supabase (MCP `user-supabase`)

### 2.1 Tabella `players` (list_tables + execute_sql)

- **Schema:** Tutte le colonne usate dall’API sono presenti.
- **Colonne rilevanti:**  
  `id`, `user_id`, `player_name`, `position`, `card_type`, `team`, `overall_rating`, `base_stats`, `skills`, `com_skills`, `position_ratings`, `available_boosters`, `height`, `weight`, `age`, `nationality`, `club_name`, `form`, `role`, `playing_style_id`, `current_level`, `level_cap`, `active_booster_name`, `development_points`, `slot_index`, `metadata`, `extracted_data`, `created_at`, `updated_at`, `photo_slots`, `original_positions`.
- **Constraint `slot_index`:**  
  `slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10)` → ok.
- **Colonna `original_positions`:**  
  JSONB, default `'[]'::jsonb`, commento: array posizioni dalla card → allineata a migrazione e API.
- **RLS:** Abilitato su `players`.
- **FK:** `user_id` → `auth.users`, `playing_style_id` → `playing_styles.id`.

### 2.2 Query di verifica dati

```sql
SELECT COUNT(*) AS total,
       COUNT(CASE WHEN slot_index IS NOT NULL AND (slot_index < 0 OR slot_index > 10) THEN 1 END) AS invalid_slot,
       COUNT(CASE WHEN original_positions IS NOT NULL AND original_positions != '[]'::jsonb THEN 1 END) AS with_original_positions
FROM players;
```

**Risultato:**  
`total=111`, `invalid_slot=0`, `with_original_positions=90` → nessun `slot_index` fuori 0–10, molti giocatori con `original_positions` valorizzato.

---

## 3. Allineamento API ↔ DB

- L’API costruisce `playerData` con le stesse chiavi delle colonne della tabella `players` (inclusi `slot_index`, `photo_slots`, `original_positions`).
- `playing_styles`: lookup per nome → `playing_style_id` (UUID) coerente con FK.
- Insert: tutti i campi inviati esistono in tabella; `id`, `created_at`, `updated_at` gestiti da DB/default.
- Update (stesso slot): merge di campi e `updated_at` impostato dall’API; nessuna colonna mancante.

---

## 4. Riepilogo

| Controllo | Esito |
|-----------|--------|
| Flusso upload → modal posizioni → save unico da `handleSavePlayerWithPositions` | OK |
| Gestione duplicati (modal + replace) e chiamata save dopo conferma | OK |
| Schema Supabase `players` (colonne, constraint, RLS, FK) | OK |
| Dati: nessun `slot_index` fuori 0–10, `original_positions` presente | OK |
| Allineamento campi API ↔ colonne DB | OK |

**Conclusione:** Flusso end-to-end e stato Supabase (verificato via MCP) sono coerenti e funzionanti.
