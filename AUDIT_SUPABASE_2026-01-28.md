# ✅ Audit Supabase (MCP) – 2026-01-28 (aggiornato 30 gen 2026)

**Metodo**: Query dirette via MCP (`execute_sql`, `list_tables`, `list_migrations`) su schema `public`  
**Obiettivo**: trovare incoerenze dati che impattano IA/UX (rosa, coach, impostazioni, task).  
**Ultimo aggiornamento**: 30 gen 2026 – integrazione stato correzioni e audit completo.

---

## 1) Problema critico: `individual_instructions` con `player_id` orfani

**Stato: ✅ CORRETTO (2026-01-28)**

Query originale: `player_id` in `team_tactical_settings.individual_instructions` inesistenti in `players` per lo stesso `user_id`.

Esempio reale (utente `a2aaec95-1e8a-402f-8ff4-19711dfd2390`): 4 istruzioni orfane (attacco_1/2, difesa_1/2).

**Fix applicati:**
- Trigger `trigger_cleanup_individual_instructions` (AFTER DELETE su `players`) → funzione `cleanup_orphan_individual_instructions()`: rimuove automaticamente riferimenti al giocatore eliminato da `individual_instructions`.
- Funzione una tantum `fix_orphan_individual_instructions()` eseguita: 4 orfani rimossi, 0 rimanenti.
- Cleanup esplicito in `app/api/supabase/delete-player/route.js` prima di eliminare il giocatore.

**Riferimenti:** `RISULTATI_MIGRAZIONI_SUPABASE_2026-01-28.md`, `migrations/fix_individual_instructions_cleanup.sql`, `migrations/fix_orphan_individual_instructions.sql`.

---

## 2) Problema dati: `players.position` usato per contenere “stili”

**Stato: ⚠️ PREVENZIONE ATTIVA; 3 GIOCATORI ESISTENTI DA CORREZIONE MANUALE (OPZIONALE)**

Query: giocatori con `players.position` uguale a un nome in `playing_styles.name`.

Risultati trovati (esempi):
- Eden Hazard → `position = "Ala prolifica"` (stile, non posizione)
- A. Pirlo → `position = "Tra le linee"` (stile, non posizione)
- Kylian Mbappé → `position = "Opportunista"` (stile, non posizione)

**Fix applicati:**
- Validazione in `app/api/supabase/save-player/route.js`: `validPositions` (PT, DC, TD, TS, CC, CMF, MED, P, SP, TRQ, AMF, CLD, CLS, EDA, EDE, ESA, CF, LWF, RWF, SS). Se `position` è uno stile riconosciuto o non valida: **warning in log**, salvataggio non bloccato (retrocompatibilità).
- Report per correzione dati esistenti: `migrations/report_players_position_styles.sql` (già eseguito; 3 giocatori identificati).

**Correzione manuale opzionale:** usare `original_positions` o `suggested_position` dal report; spostare stile in `role` o `playing_style_id`.

---

## 3) `team_playing_style` mancante (null) in `team_tactical_settings`

**Stato: ✅ ACCETTATO (gestito in codice)**

Esiste almeno 1 utente con `team_playing_style` null.

**Comportamento:** UI e backend gestiscono null (fallback sicuro); nessun fix dati automatico. CHECK su colonna: valori ammessi `possesso_palla`, `contropiede_veloce`, `contrattacco`, `vie_laterali`, `passaggio_lungo`.

---

## 4) Integrità `playing_style_id`

**Stato: ✅ OK**

Query: `players.playing_style_id` non null ma senza match in `playing_styles`.  
Risultato: nessun caso trovato.

---

## 5) Aggiornamento 30 gen 2026 – Migrazioni e funzioni

**Migrazioni registrate (list_migrations):** 52 migrazioni. Ultima:
- **atomic_slot_assignment** (versione `20260130160300`) – RC-001: assegnazione atomica slot per evitare race condition. Funzione chiamata da `app/api/supabase/assign-player-to-slot/route.js` via `admin.rpc('atomic_slot_assignment', ...)`.

**Trigger su `players` (verificati via MCP):**
- `trigger_cleanup_individual_instructions` → `cleanup_orphan_individual_instructions`
- `update_players_updated_at` → `update_updated_at_column`

**Dati (query 30 gen 2026):**
- **players:** 113 righe; 0 con `slot_index` fuori 0–10; 92 con `original_positions` valorizzato.
- **matches:** 27 | **weekly_goals:** 31 | **formation_layout:** 12 | **team_tactical_settings:** 5

---

## ✅ Conclusione

| Problema | Stato | Note |
|----------|--------|------|
| `individual_instructions` con `player_id` orfani | ✅ Corretto | Trigger + fix una tantum + cleanup in delete-player |
| `players.position` con stili | ⚠️ Prevenzione attiva | Validazione in save-player; 3 giocatori da correzione manuale opzionale |
| `team_playing_style` null | ✅ Accettato | Gestito in UI/backend |
| `playing_style_id` orfani | ✅ Nessun caso | |
| Schema / migrazioni / trigger | ✅ Allineati | atomic_slot_assignment in list_migrations; trigger cleanup attivi |

**Documentazione completa:** `DOCUMENTAZIONE_SUPABASE_PER_KIMI_2026-01-30.md` (audit completo tabelle, trigger, funzioni, migrazioni).
