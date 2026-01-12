-- ============================================
-- INITIAL DATABASE SCHEMA
-- eFootball AI Coach Platform
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: players_base
-- Database giocatori base (da Konami/Google Drive)
-- ============================================

CREATE TABLE players_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificazione
  player_name TEXT NOT NULL,
  konami_id TEXT UNIQUE,
  efootballhub_id TEXT,
  
  -- Dati Base
  position TEXT,
  card_type TEXT,
  team TEXT,
  era TEXT,
  
  -- Statistiche Base (senza build)
  base_stats JSONB NOT NULL DEFAULT '{}',
  
  -- Abilità
  skills TEXT[] DEFAULT '{}',
  com_skills TEXT[] DEFAULT '{}',
  
  -- Position Ratings
  position_ratings JSONB DEFAULT '{}',
  
  -- Booster Disponibili
  available_boosters JSONB DEFAULT '[]',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  source TEXT DEFAULT 'user_upload',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici players_base
CREATE INDEX idx_players_name ON players_base(player_name);
CREATE INDEX idx_players_position ON players_base(position);
CREATE INDEX idx_players_konami_id ON players_base(konami_id);
CREATE INDEX idx_players_efootballhub_id ON players_base(efootballhub_id);

-- ============================================
-- TABLE 2: boosters
-- Database booster disponibili
-- ============================================

CREATE TABLE boosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Info Booster
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Effetti
  effects JSONB NOT NULL DEFAULT '[]',
  
  -- Tipo
  booster_type TEXT,
  rarity TEXT,
  
  -- Disponibilità
  available_for_positions TEXT[],
  available_for_card_types TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 3: player_builds
-- Build giocatori degli utenti
-- ============================================

CREATE TABLE player_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_base_id UUID NOT NULL REFERENCES players_base(id) ON DELETE CASCADE,
  
  -- Build Data
  development_points JSONB NOT NULL DEFAULT '{}',
  active_booster_id UUID REFERENCES boosters(id),
  active_booster_name TEXT,
  
  -- Livello
  current_level INTEGER,
  level_cap INTEGER,
  
  -- Statistiche Finali (calcolate)
  final_stats JSONB,
  final_overall_rating INTEGER,
  final_position_ratings JSONB,
  
  -- Source
  source TEXT DEFAULT 'manual',
  source_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(user_id, player_base_id)
);

-- Indici player_builds
CREATE INDEX idx_builds_user_id ON player_builds(user_id);
CREATE INDEX idx_builds_player_base_id ON player_builds(player_base_id);
CREATE INDEX idx_builds_active_booster_id ON player_builds(active_booster_id);

-- ============================================
-- TABLE 4: user_rosa
-- Rose (squadre) degli utenti
-- ============================================

CREATE TABLE user_rosa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Info Rosa
  name TEXT NOT NULL,
  description TEXT,
  
  -- Giocatori
  player_build_ids UUID[] NOT NULL DEFAULT '{}',
  
  -- Formazione Preferita
  preferred_formation TEXT,
  
  -- Analisi Squadra
  squad_analysis JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(user_id, name)
);

-- Indici user_rosa
CREATE INDEX idx_rosa_user_id ON user_rosa(user_id);

-- ============================================
-- TABLE 5: screenshot_processing_log
-- Log processing screenshot
-- ============================================

CREATE TABLE screenshot_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Immagine
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL,
  
  -- Processing
  processing_status TEXT DEFAULT 'pending',
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Risultati
  raw_ocr_data JSONB,
  extracted_data JSONB,
  confidence_score DECIMAL(3,2),
  
  -- Matching
  matched_player_id UUID REFERENCES players_base(id),
  matching_confidence DECIMAL(3,2),
  
  -- Errori
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici screenshot_processing_log
CREATE INDEX idx_screenshot_user_id ON screenshot_processing_log(user_id);
CREATE INDEX idx_screenshot_status ON screenshot_processing_log(processing_status);
CREATE INDEX idx_screenshot_created_at ON screenshot_processing_log(created_at DESC);
CREATE INDEX idx_screenshot_matched_player_id ON screenshot_processing_log(matched_player_id);

-- ============================================
-- TABLE 6: unified_match_contexts
-- Contesti partita multimodali
-- ============================================

CREATE TABLE unified_match_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Riferimento Rosa
  rosa_id UUID REFERENCES user_rosa(id),
  
  -- Image Context
  image_id TEXT,
  image_url TEXT,
  image_type TEXT,
  image_extracted_data JSONB,
  
  -- Voice Context
  audio_id TEXT,
  audio_url TEXT,
  transcription TEXT,
  voice_semantic_analysis JSONB,
  
  -- Derived Insights
  derived_insights JSONB,
  game_state JSONB,
  
  -- Metadata
  session_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici unified_match_contexts
CREATE INDEX idx_contexts_user_id ON unified_match_contexts(user_id);
CREATE INDEX idx_contexts_rosa_id ON unified_match_contexts(rosa_id);
CREATE INDEX idx_contexts_created_at ON unified_match_contexts(created_at DESC);

-- ============================================
-- TABLE 7: coaching_suggestions
-- Suggerimenti coaching generati
-- ============================================

CREATE TABLE coaching_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_id UUID REFERENCES unified_match_contexts(id) ON DELETE CASCADE,
  rosa_id UUID REFERENCES user_rosa(id) ON DELETE CASCADE,
  
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  priority INTEGER DEFAULT 0,
  
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici coaching_suggestions
CREATE INDEX idx_suggestions_context_id ON coaching_suggestions(context_id);
CREATE INDEX idx_suggestions_rosa_id ON coaching_suggestions(rosa_id);
CREATE INDEX idx_suggestions_type ON coaching_suggestions(suggestion_type);
CREATE INDEX idx_suggestions_priority ON coaching_suggestions(priority DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE players_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rosa ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshot_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_match_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies: players_base (pubblico, tutti possono leggere)
CREATE POLICY "Players base are viewable by everyone"
  ON players_base FOR SELECT
  USING (true);

-- Policies: boosters (pubblico, tutti possono leggere)
CREATE POLICY "Boosters are viewable by everyone"
  ON boosters FOR SELECT
  USING (true);

-- Policies: player_builds (utente vede solo i suoi)
CREATE POLICY "Users can view own builds"
  ON player_builds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own builds"
  ON player_builds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own builds"
  ON player_builds FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own builds"
  ON player_builds FOR DELETE
  USING (auth.uid() = user_id);

-- Policies: user_rosa (utente vede solo le sue)
CREATE POLICY "Users can view own rosa"
  ON user_rosa FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rosa"
  ON user_rosa FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rosa"
  ON user_rosa FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rosa"
  ON user_rosa FOR DELETE
  USING (auth.uid() = user_id);

-- Policies: screenshot_processing_log (utente vede solo i suoi)
CREATE POLICY "Users can view own screenshots"
  ON screenshot_processing_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots"
  ON screenshot_processing_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies: unified_match_contexts (utente vede solo i suoi)
CREATE POLICY "Users can view own contexts"
  ON unified_match_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contexts"
  ON unified_match_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contexts"
  ON unified_match_contexts FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies: coaching_suggestions (utente vede solo i suoi)
CREATE POLICY "Users can view own suggestions"
  ON coaching_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM unified_match_contexts
      WHERE unified_match_contexts.id = coaching_suggestions.context_id
      AND unified_match_contexts.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_rosa
      WHERE user_rosa.id = coaching_suggestions.rosa_id
      AND user_rosa.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Auto-update updated_at
CREATE TRIGGER update_players_base_updated_at
  BEFORE UPDATE ON players_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_builds_updated_at
  BEFORE UPDATE ON player_builds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rosa_updated_at
  BEFORE UPDATE ON user_rosa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_match_contexts_updated_at
  BEFORE UPDATE ON unified_match_contexts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boosters_updated_at
  BEFORE UPDATE ON boosters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
