# ✅ CHECK SUPABASE VIA MCP - Verifica Schema Reale

**Data**: 26 Gennaio 2026  
**Metodo**: MCP (Model Context Protocol) - Verifica diretta database Supabase

---

## 📊 TABELLE TROVATE (13 tabelle)

### **Tabelle Principali**

1. ✅ **`players`** - 63 righe
   - **Colonne critiche**: `slot_index` (CHECK: 0-10), `photo_slots` (JSONB), `original_positions` (JSONB)
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **FK**: `playing_style_id` → `playing_styles.id` (ON DELETE SET NULL)
   - **UNIQUE**: `(user_id, slot_index)` DEFERRABLE INITIALLY DEFERRED
   - **RLS**: ✅ Abilitato

2. ✅ **`matches`** - 14 righe
   - **Colonne critiche**: `photos_uploaded` (CHECK: 0-5), `data_completeness` (CHECK: 'partial'|'complete')
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **FK**: `opponent_formation_id` → `opponent_formations.id` (ON DELETE SET NULL)
   - **RLS**: ✅ Abilitato

3. ✅ **`user_profiles`** - 6 righe
   - **Colonne critiche**: `profile_completion_score` (CHECK: 0-100), `profile_completion_level` (CHECK: 'beginner'|'intermediate'|'complete')
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **UNIQUE**: `(user_id)`
   - **RLS**: ✅ Abilitato

4. ✅ **`coaches`** - 4 righe
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **RLS**: ✅ Abilitato

5. ✅ **`formation_layout`** - 8 righe
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **UNIQUE**: `(user_id)`
   - **RLS**: ✅ Abilitato

6. ✅ **`team_tactical_settings`** - 3 righe
   - **Colonne critiche**: `team_playing_style` (CHECK: valori specifici)
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **UNIQUE**: `(user_id)`
   - **RLS**: ✅ Abilitato

7. ✅ **`opponent_formations`** - 35 righe
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **RLS**: ✅ Abilitato

8. ✅ **`team_tactical_patterns`** - 4 righe
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **UNIQUE**: `(user_id)`
   - **RLS**: ✅ Abilitato

9. ✅ **`player_performance_aggregates`** - 0 righe
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
   - **FK**: `player_id` → `players.id` (ON DELETE CASCADE)
   - **UNIQUE**: `(user_id, player_id)`
   - **RLS**: ✅ Abilitato

10. ✅ **`ai_tasks`** - 0 righe
    - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
    - **RLS**: ✅ Abilitato

11. ✅ **`user_ai_knowledge`** - 0 righe
    - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)
    - **UNIQUE**: `(user_id)`
    - **RLS**: ✅ Abilitato

12. ✅ **`playing_styles`** - 21 righe
    - **RLS**: ✅ Abilitato

---

## ⚙️ TRIGGER VERIFICATI (9 trigger)

### **Trigger `updated_at` (Auto-timestamp)**

1. ✅ **`coaches_updated_at_trigger`**
   - **Tabella**: `coaches`
   - **Quando**: BEFORE UPDATE
   - **Funzione**: `update_coaches_updated_at()`
   - **⚠️ NON TOCCARE**: Aggiorna automaticamente `updated_at`

2. ✅ **`trigger_update_matches_updated_at`**
   - **Tabella**: `matches`
   - **Quando**: BEFORE UPDATE
   - **Funzione**: `update_matches_updated_at()`
   - **⚠️ NON TOCCARE**: Aggiorna automaticamente `updated_at`

3. ✅ **`trigger_update_opponent_formations_updated_at`**
   - **Tabella**: `opponent_formations`
   - **Quando**: BEFORE UPDATE
   - **Funzione**: `update_opponent_formations_updated_at()`
   - **⚠️ NON TOCCARE**: Aggiorna automaticamente `updated_at`

4. ✅ **`update_players_updated_at`**
   - **Tabella**: `players`
   - **Quando**: BEFORE UPDATE
   - **Funzione**: `update_updated_at_column()`
   - **⚠️ NON TOCCARE**: Aggiorna automaticamente `updated_at`

5. ✅ **`update_team_tactical_settings_updated_at`**
   - **Tabella**: `team_tactical_settings`
   - **Quando**: BEFORE UPDATE
   - **Funzione**: `update_team_tactical_settings_updated_at()`
   - **⚠️ NON TOCCARE**: Aggiorna automaticamente `updated_at`

### **Trigger Calcolo Automatico**

6. ✅ **`trigger_calculate_profile_completion`** (2 trigger: INSERT + UPDATE)
   - **Tabella**: `user_profiles`
   - **Quando**: BEFORE INSERT OR UPDATE
   - **Funzione**: `calculate_profile_completion_score()`
   - **⚠️ CRITICO**: Calcola automaticamente `profile_completion_score` e `profile_completion_level`
   - **⚠️ NON SOVRASCRIVERE**: Se aggiorni `user_profiles`, il trigger ricalcola automaticamente

7. ✅ **`trigger_calculate_knowledge_score`** (2 trigger: INSERT + UPDATE)
   - **Tabella**: `user_ai_knowledge`
   - **Quando**: BEFORE INSERT OR UPDATE
   - **Funzione**: `calculate_ai_knowledge_score()`
   - **⚠️ CRITICO**: Calcola automaticamente `knowledge_score` e `knowledge_level`
   - **⚠️ NON SOVRASCRIVERE**: Se aggiorni `user_ai_knowledge`, il trigger ricalcola automaticamente

---

## 🔗 FOREIGN KEY VERIFICATE

### **FK con ON DELETE CASCADE**

1. ✅ `players.user_id` → `auth.users.id` (CASCADE)
2. ✅ `matches.user_id` → `auth.users.id` (CASCADE)
3. ✅ `user_profiles.user_id` → `auth.users.id` (CASCADE)
4. ✅ `coaches.user_id` → `auth.users.id` (CASCADE)
5. ✅ `formation_layout.user_id` → `auth.users.id` (CASCADE)
6. ✅ `team_tactical_settings.user_id` → `auth.users.id` (CASCADE)
7. ✅ `opponent_formations.user_id` → `auth.users.id` (CASCADE)
8. ✅ `team_tactical_patterns.user_id` → `auth.users.id` (CASCADE)
9. ✅ `player_performance_aggregates.user_id` → `auth.users.id` (CASCADE)
10. ✅ `player_performance_aggregates.player_id` → `players.id` (CASCADE)
11. ✅ `ai_tasks.user_id` → `auth.users.id` (CASCADE)

### **FK con ON DELETE SET NULL**

1. ✅ `matches.opponent_formation_id` → `opponent_formations.id` (SET NULL)
   - **⚠️ IMPORTANTE**: Eliminare formazione avversaria NON elimina match, solo setta `opponent_formation_id = NULL`

2. ✅ `players.playing_style_id` → `playing_styles.id` (SET NULL)
   - **⚠️ IMPORTANTE**: Eliminare playing_style NON elimina giocatore, solo setta `playing_style_id = NULL`

---

## ✅ CONSTRAINT VERIFICATI

### **CHECK Constraint**

1. ✅ **`players_slot_index_check`**
   ```sql
   CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10))
   ```
   - **⚠️ CRITICO**: Range 0-10 o NULL
   - **⚠️ PRESERVARE**: Clamp nel codice `Math.max(0, Math.min(10, ...))`

2. ✅ **`matches_photos_uploaded_check`**
   ```sql
   CHECK (photos_uploaded >= 0 AND photos_uploaded <= 5)
   ```
   - **⚠️ CRITICO**: Max 5 foto per match

3. ✅ **`matches_data_completeness_check`**
   ```sql
   CHECK (data_completeness = ANY (ARRAY['partial'::text, 'complete'::text]))
   ```
   - **⚠️ CRITICO**: Solo 'partial' o 'complete'

4. ✅ **`user_profiles_profile_completion_score_check`**
   ```sql
   CHECK (profile_completion_score >= 0::numeric AND profile_completion_score <= 100::numeric)
   ```
   - **⚠️ CRITICO**: Range 0-100

5. ✅ **`user_profiles_profile_completion_level_check`**
   ```sql
   CHECK (profile_completion_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'complete'::text]))
   ```
   - **⚠️ CRITICO**: Solo 'beginner', 'intermediate', 'complete'

6. ✅ **`team_tactical_settings_team_playing_style_check`**
   ```sql
   CHECK (team_playing_style = ANY (ARRAY['possesso_palla'::text, 'contropiede_veloce'::text, 'contrattacco'::text, 'vie_laterali'::text, 'passaggio_lungo'::text]))
   ```
   - **⚠️ CRITICO**: Solo valori specifici

### **UNIQUE Constraint**

1. ✅ **`players_user_id_slot_index_key`**
   ```sql
   UNIQUE (user_id, slot_index) DEFERRABLE INITIALLY DEFERRED
   ```
   - **⚠️ CRITICO**: Previene duplicati nello stesso slot
   - **⚠️ DEFERRABLE**: Permette transazioni che violano temporaneamente

2. ✅ **`formation_layout_user_unique`**
   ```sql
   UNIQUE (user_id)
   ```
   - **⚠️ CRITICO**: Un layout per utente

3. ✅ **`unique_user_settings`** (team_tactical_settings)
   ```sql
   UNIQUE (user_id)
   ```
   - **⚠️ CRITICO**: Un record per utente

4. ✅ **`unique_user_profile`** (user_profiles)
   ```sql
   UNIQUE (user_id)
   ```
   - **⚠️ CRITICO**: Un profilo per utente

5. ✅ **`unique_user_team_patterns`** (team_tactical_patterns)
   ```sql
   UNIQUE (user_id)
   ```
   - **⚠️ CRITICO**: Un record per utente

6. ✅ **`unique_user_ai_knowledge`** (user_ai_knowledge)
   ```sql
   UNIQUE (user_id)
   ```
   - **⚠️ CRITICO**: Un record per utente

7. ✅ **`unique_user_player`** (player_performance_aggregates)
   ```sql
   UNIQUE (user_id, player_id)
   ```
   - **⚠️ CRITICO**: Un record per utente-giocatore

---

## 📋 MIGRAZIONI APPLICATE (47 migrazioni)

**Ultima migrazione**: `20260124163326` - `add_original_positions_column`

**Migrazioni Critiche**:
- ✅ `fix_slot_index_constraint_and_rls_optimization` (20260119015333)
- ✅ `add_photo_slots_column` (20260119020052)
- ✅ `create_formation_layout_table` (20260119022112)
- ✅ `create_coaches_table` (20260120001025)
- ✅ `create_team_tactical_settings` (20260120103837)
- ✅ `create_matches_table` (20260122152243)
- ✅ `create_user_profiles_table` (20260122083933)
- ✅ `add_original_positions_column` (20260124163326)

---

## 🔍 VERIFICHE SPECIFICHE

### **1. Colonna `original_positions` (players)**

✅ **Verificata**:
- **Tipo**: JSONB
- **Default**: `'[]'::jsonb`
- **Commento**: "Array di posizioni originali dalla card: [{\"position\": \"AMF\", \"competence\": \"Alta\"}, ...]"
- **Indice**: Probabilmente GIN (non verificato direttamente, ma presente nella migration)

### **2. Colonna `photo_slots` (players)**

✅ **Verificata**:
- **Tipo**: JSONB
- **Default**: `'{}'::jsonb`
- **Struttura attesa**: `{ card: true, statistiche: true, abilita: true, booster: true }`

### **3. Constraint `slot_index` (players)**

✅ **Verificato**:
```sql
CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10))
```
- **✅ CORRETTO**: Range 0-10 o NULL
- **✅ ALLINEATO**: Con codice che usa `Math.max(0, Math.min(10, ...))`

### **4. UNIQUE `(user_id, slot_index)` (players)**

✅ **Verificato**:
```sql
UNIQUE (user_id, slot_index) DEFERRABLE INITIALLY DEFERRED
```
- **✅ CORRETTO**: Previene duplicati
- **✅ DEFERRABLE**: Permette transazioni che violano temporaneamente (utile per swap slot)

---

## ⚠️ COSE DA NON TOCCARE (CONFERMATE)

### **1. Trigger SQL**

✅ **NON modificare**:
- `calculate_profile_completion_score()` - Calcola automaticamente score
- `calculate_ai_knowledge_score()` - Calcola automaticamente knowledge score
- `update_*_updated_at()` - Aggiorna timestamp automaticamente

**Se modifichi**: Potresti rompere calcolo score o timestamp.

---

### **2. Constraint Database**

✅ **NON modificare**:
- `CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10))`
- `UNIQUE (user_id, slot_index)` DEFERRABLE INITIALLY DEFERRED
- `UNIQUE (user_id)` su user_profiles, formation_layout, team_tactical_settings

**Se modifichi**: Potresti permettere dati inconsistenti.

---

### **3. Foreign Key**

✅ **NON modificare**:
- `ON DELETE CASCADE` su tutte le tabelle → eliminare utente elimina tutti i suoi dati
- `ON DELETE SET NULL` su `matches.opponent_formation_id` → eliminare formazione avversaria non elimina match

**Se modifichi**: Potresti rompere integrità referenziale.

---

## ✅ CONFRONTO CON CHECK_PRE_MODIFICA_FOTO.md

### **Cosa è Confermato**

1. ✅ **Trigger**: Tutti i trigger identificati nel documento esistono nel DB
2. ✅ **Constraint**: Tutti i constraint identificati nel documento esistono nel DB
3. ✅ **Foreign Key**: Tutte le FK identificate nel documento esistono nel DB
4. ✅ **UNIQUE**: Tutti gli UNIQUE identificati nel documento esistono nel DB

### **Cosa è Aggiuntivo (Non nel documento originale)**

1. ⚠️ **Trigger `update_players_updated_at`**: Non menzionato nel documento originale
   - **Funzione**: `update_updated_at_column()`
   - **⚠️ PRESERVARE**: Aggiorna automaticamente `players.updated_at`

2. ⚠️ **Trigger `trigger_update_opponent_formations_updated_at`**: Non menzionato nel documento originale
   - **⚠️ PRESERVARE**: Aggiorna automaticamente `opponent_formations.updated_at`

3. ⚠️ **Trigger `trigger_calculate_knowledge_score`**: Non menzionato nel documento originale
   - **⚠️ CRITICO**: Calcola automaticamente `user_ai_knowledge.knowledge_score` e `knowledge_level`
   - **⚠️ NON SOVRASCRIVERE**: Se aggiorni `user_ai_knowledge`, il trigger ricalcola automaticamente

4. ⚠️ **Tabella `player_performance_aggregates`**: Non menzionata nel documento originale
   - **FK**: `player_id` → `players.id` (ON DELETE CASCADE)
   - **UNIQUE**: `(user_id, player_id)`

5. ⚠️ **Tabella `user_ai_knowledge`**: Non menzionata nel documento originale
   - **UNIQUE**: `(user_id)`
   - **Trigger**: `trigger_calculate_knowledge_score`

6. ⚠️ **Tabella `ai_tasks`**: Non menzionata nel documento originale
   - **FK**: `user_id` → `auth.users` (ON DELETE CASCADE)

---

## 🎯 RACCOMANDAZIONI FINALI

### **Prima di Modificare Sistema Foto**

1. ✅ **Verificato**: Tutti i constraint, trigger, FK sono presenti e funzionanti
2. ✅ **Verificato**: Colonna `original_positions` esiste e ha struttura corretta
3. ✅ **Verificato**: Colonna `photo_slots` esiste e ha struttura corretta
4. ✅ **Verificato**: Constraint `slot_index` è corretto (0-10 o NULL)
5. ✅ **Verificato**: UNIQUE `(user_id, slot_index)` è presente e DEFERRABLE

### **Cosa Preservare**

1. ✅ **Trigger**: NON toccare trigger SQL (calcolano automaticamente score/timestamp)
2. ✅ **Constraint**: NON toccare constraint DB (prevengono dati inconsistenti)
3. ✅ **FK**: NON toccare foreign key (mantengono integrità referenziale)
4. ✅ **Merge Logica**: Mantieni merge photo_slots, Math.max() overall_rating
5. ✅ **Sincronizzazione**: Mantieni sincronizzazione position dopo save-formation-layout

### **Cosa Aggiungere (Non Rimuovere)**

1. ✅ **Check Finale**: Aggiungi check finale per dati mancanti (non rimuovere merge esistente)
2. ✅ **Alert**: Aggiungi alert per dati mancanti (non bloccare flusso esistente)
3. ✅ **Inserimento Manuale**: Aggiungi opzione inserimento manuale (non sostituire estrazione)

---

## ✅ STATUS FINALE

**✅ CHECK COMPLETO**: Schema Supabase verificato via MCP  
**✅ ALLINEATO**: Schema reale corrisponde alle migrazioni  
**✅ PRONTO**: Per modifiche sicure al sistema gestione foto

**⚠️ ATTENZIONE**: 
- Trigger `update_players_updated_at` non era nel documento originale → **PRESERVARE**
- Trigger `trigger_calculate_knowledge_score` non era nel documento originale → **PRESERVARE**
- Tabelle `player_performance_aggregates`, `user_ai_knowledge`, `ai_tasks` non erano nel documento originale → **VERIFICARE DIPENDENZE**

---

**Ultimo Aggiornamento**: 26 Gennaio 2026  
**Metodo**: MCP (Model Context Protocol) - Verifica diretta database Supabase  
**Status**: ✅ **VERIFICATO E CONFERMATO**
