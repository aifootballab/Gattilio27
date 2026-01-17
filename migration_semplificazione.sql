-- ============================================
-- MIGRAZIONE SEMPLIFICAZIONE DATABASE
-- ============================================
-- Questo script cancella le tabelle complesse e crea una struttura semplice
-- ATTENZIONE: Cancella tutti i dati esistenti!

-- ============================================
-- STEP 1: CANCELLA TABELLE VECCHIE
-- ============================================

-- Rimuovi foreign key constraints prima
ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_player_base_id_fkey;
ALTER TABLE IF EXISTS player_builds DROP CONSTRAINT IF EXISTS player_builds_user_id_fkey;
ALTER TABLE IF EXISTS players_base DROP CONSTRAINT IF EXISTS players_base_playing_style_id_fkey;
ALTER TABLE IF EXISTS screenshot_processing_log DROP CONSTRAINT IF EXISTS screenshot_processing_log_user_id_fkey;
ALTER TABLE IF EXISTS user_rosa DROP CONSTRAINT IF EXISTS user_rosa_user_id_fkey;

-- Cancella tabelle vecchie
DROP TABLE IF EXISTS player_builds CASCADE;
DROP TABLE IF EXISTS players_base CASCADE;
DROP TABLE IF EXISTS user_rosa CASCADE;
DROP TABLE IF EXISTS screenshot_processing_log CASCADE;

-- Mantieni playing_styles (opzionale, può essere utile)
-- DROP TABLE IF EXISTS playing_styles CASCADE;

-- ============================================
-- STEP 2: CREA NUOVA TABELLA SEMPLIFICATA
-- ============================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati base giocatore
  player_name TEXT NOT NULL,
  position TEXT,
  card_type TEXT,
  team TEXT,
  overall_rating INTEGER,
  
  -- Caratteristiche giocatore (tutto in JSONB per flessibilità)
  base_stats JSONB DEFAULT '{}', -- { attacking: {...}, defending: {...}, athleticism: {...} }
  skills TEXT[] DEFAULT '{}',
  com_skills TEXT[] DEFAULT '{}',
  position_ratings JSONB DEFAULT '{}', -- { "CMF": { competency_level: 1, is_learned: true } }
  available_boosters JSONB DEFAULT '[]', -- Array di booster disponibili
  
  -- Dati fisici
  height INTEGER,
  weight INTEGER,
  age INTEGER,
  nationality TEXT,
  club_name TEXT,
  form TEXT,
  role TEXT,
  playing_style_id UUID REFERENCES playing_styles(id),
  
  -- Build specifici (livello, booster attivo, ecc.)
  current_level INTEGER,
  level_cap INTEGER,
  active_booster_name TEXT,
  development_points JSONB DEFAULT '{}',
  
  -- Slot rosa (0-20, null = non in rosa)
  slot_index INTEGER CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index < 21)),
  
  -- Metadata completo (tutto quello che viene estratto)
  metadata JSONB DEFAULT '{}',
  extracted_data JSONB, -- Dati raw estratti da screenshot
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, slot_index) WHERE slot_index IS NOT NULL, -- Un solo giocatore per slot per utente
  CONSTRAINT valid_slot CHECK (slot_index IS NULL OR (slot_index >= 0 AND slot_index < 21))
);

-- ============================================
-- STEP 3: INDEX PER PERFORMANCE
-- ============================================

CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_slot_index ON players(user_id, slot_index) WHERE slot_index IS NOT NULL;
CREATE INDEX idx_players_created_at ON players(user_id, created_at DESC);

-- ============================================
-- STEP 4: RLS (Row Level Security)
-- ============================================

-- Abilita RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti possono vedere solo i propri giocatori
CREATE POLICY "Users can view own players"
  ON players FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Utenti possono inserire solo per se stessi
CREATE POLICY "Users can insert own players"
  ON players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Utenti possono aggiornare solo i propri giocatori
CREATE POLICY "Users can update own players"
  ON players FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Utenti possono cancellare solo i propri giocatori
CREATE POLICY "Users can delete own players"
  ON players FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 5: TRIGGER PER updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FINE MIGRAZIONE
-- ============================================
