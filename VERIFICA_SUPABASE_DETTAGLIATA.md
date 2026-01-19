# 🔍 VERIFICA SUPABASE DETTAGLIATA

**Data**: 2024  
**Stato**: ⚠️ **PROBLEMI TROVATI**

---

## 📊 STATO ATTUALE

### Tabelle

✅ **`players`** (19 righe)
- RLS: ✅ Abilitato
- Foreign Keys: ✅ `user_id` → `auth.users`, `playing_style_id` → `playing_styles`

✅ **`playing_styles`** (21 righe)
- RLS: ✅ Abilitato

---

## ⚠️ PROBLEMI TROVATI

### 1. **CRITICO: Constraint `slot_index` errato**

**Problema**:
```sql
slot_index IS NULL OR slot_index >= 0 AND slot_index < 21
```

**Dovrebbe essere**:
```sql
slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10)
```

**Impatto**: 
- Il database permette `slot_index` da 0 a 20
- Il codice normalizza a 0-10
- **Inconsistenza**: valori 11-20 possono essere inseriti direttamente nel DB

**Fix necessario**:
```sql
ALTER TABLE players 
DROP CONSTRAINT IF EXISTS players_slot_index_check;

ALTER TABLE players 
ADD CONSTRAINT players_slot_index_check 
CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10));
```

---

### 2. **PERFORMANCE: Foreign key senza indice**

**Problema**: `playing_style_id` foreign key senza indice

**Impatto**: Query con JOIN su `playing_styles` possono essere lente

**Fix consigliato**:
```sql
CREATE INDEX IF NOT EXISTS idx_players_playing_style_id 
ON players(playing_style_id) 
WHERE playing_style_id IS NOT NULL;
```

---

### 3. **PERFORMANCE: RLS policies inefficienti**

**Problema**: Le RLS policies ri-valutano `auth.uid()` per ogni riga

**Policies attuali** (presumibilmente):
```sql
-- Inefficiente
CREATE POLICY "Users can view own players"
ON players FOR SELECT
USING (auth.uid() = user_id);
```

**Dovrebbe essere**:
```sql
-- Efficiente
CREATE POLICY "Users can view own players"
ON players FOR SELECT
USING ((select auth.uid()) = user_id);
```

**Impatto**: Performance degradata con molti record

**Fix necessario**: Aggiornare tutte le 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

### 4. **SECURITY: Leaked Password Protection disabilitato**

**Problema**: Protezione password compromesse disabilitata

**Impatto**: Utenti possono usare password già compromesse

**Fix**: Abilitare in Supabase Dashboard → Authentication → Password

---

### 5. **INFO: Indici non usati**

**Problema**: Indici su `playing_styles` non utilizzati
- `idx_playing_styles_positions`
- `idx_playing_styles_category`

**Azione**: Valutare se rimuoverli o se servono per query future

---

## ✅ VERIFICHE POSITIVE

### Schema Allineato

✅ **Campi `players`**:
- `slot_index` INTEGER (nullable) ✅
- `metadata` JSONB ✅
- `extracted_data` JSONB ✅
- `user_id` UUID (FK a auth.users) ✅
- Tutti i campi necessari presenti ✅

### RLS Abilitato

✅ RLS abilitato su `players` e `playing_styles`

### Foreign Keys

✅ `user_id` → `auth.users.id` (ON DELETE CASCADE)
✅ `playing_style_id` → `playing_styles.id`

---

## 🔧 MIGRAZIONE RACCOMANDATA

```sql
-- 1. Fix constraint slot_index
ALTER TABLE players 
DROP CONSTRAINT IF EXISTS players_slot_index_check;

ALTER TABLE players 
ADD CONSTRAINT players_slot_index_check 
CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index <= 10));

-- 2. Aggiungi indice foreign key
CREATE INDEX IF NOT EXISTS idx_players_playing_style_id 
ON players(playing_style_id) 
WHERE playing_style_id IS NOT NULL;

-- 3. Aggiungi indice per query comuni
CREATE INDEX IF NOT EXISTS idx_players_user_slot 
ON players(user_id, slot_index) 
WHERE slot_index IS NOT NULL;

-- 4. Fix RLS policies (esempio per SELECT)
DROP POLICY IF EXISTS "Users can view own players" ON players;
CREATE POLICY "Users can view own players"
ON players FOR SELECT
USING ((select auth.uid()) = user_id);

-- 5. Fix altre policies (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Users can insert own players" ON players;
CREATE POLICY "Users can insert own players"
ON players FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own players" ON players;
CREATE POLICY "Users can update own players"
ON players FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own players" ON players;
CREATE POLICY "Users can delete own players"
ON players FOR DELETE
USING ((select auth.uid()) = user_id);
```

---

## 📋 CHECKLIST POST-FIX

- [ ] Constraint `slot_index` corretto (0-10)
- [ ] Indice su `playing_style_id` creato
- [ ] Indice su `(user_id, slot_index)` creato
- [ ] RLS policies ottimizzate (con `select auth.uid()`)
- [ ] Leaked Password Protection abilitato
- [ ] Test query performance
- [ ] Verifica RLS funzionante

---

## 🎯 PRIORITÀ

1. **CRITICO**: Fix constraint `slot_index` (0-10)
2. **ALTA**: Ottimizzazione RLS policies
3. **MEDIA**: Indici per performance
4. **BASSA**: Leaked Password Protection
5. **INFO**: Rimozione indici non usati

---

**Verifica completata**: 2024  
**Prossimi passi**: Applicare migrazione
