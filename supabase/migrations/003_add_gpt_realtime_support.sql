-- ============================================
-- MIGRATION: GPT-Realtime Support
-- Aggiunge supporto per CandidateProfile e nuovi casi d'uso
-- ============================================

-- ============================================
-- TABLE: candidate_profiles
-- Profili non confermati (in attesa di conferma utente)
-- ============================================

CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reference al log di processing
  screenshot_log_id UUID REFERENCES screenshot_processing_log(id) ON DELETE CASCADE,
  
  -- Tipo profilo
  profile_type TEXT NOT NULL, -- 'player_profile', 'formation', 'heat_map', 'squad_formation', 'player_ratings'
  
  -- CandidateProfile completo (JSONB)
  candidate_data JSONB NOT NULL DEFAULT '{}',
  
  -- State machine: empty → suggested → editing → confirmed → error
  profile_state TEXT DEFAULT 'suggested', -- 'suggested', 'editing', 'confirmed', 'error'
  
  -- Confidence scores
  overall_confidence DECIMAL(3,2) DEFAULT 0.0,
  fields_certain INTEGER DEFAULT 0,
  fields_uncertain INTEGER DEFAULT 0,
  fields_missing INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_profile_state CHECK (profile_state IN ('suggested', 'editing', 'confirmed', 'error'))
);

-- Indici candidate_profiles
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_state ON candidate_profiles(profile_state);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_type ON candidate_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_screenshot_log ON candidate_profiles(screenshot_log_id);

-- RLS per candidate_profiles
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Utenti possono vedere/modificare solo i propri candidate profiles
CREATE POLICY "Users can view own candidate profiles"
  ON candidate_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own candidate profiles"
  ON candidate_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own candidate profiles"
  ON candidate_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own candidate profiles"
  ON candidate_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_candidate_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidate_profiles_updated_at
  BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_profiles_updated_at();

-- ============================================
-- TABLE: heat_maps
-- Heat maps estratte da screenshot
-- ============================================

CREATE TABLE IF NOT EXISTS heat_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES unified_match_contexts(id) ON DELETE SET NULL,
  
  -- Tipo heat map
  heatmap_type TEXT NOT NULL, -- 'player_positions', 'tactical', 'events', 'ball_recovery', 'attack_areas'
  
  -- Heat map data (JSONB)
  heatmap_data JSONB NOT NULL DEFAULT '{}',
  -- Struttura: { team_1: { zones: [...], points: [...] }, team_2: {...} }
  
  -- Source
  screenshot_log_id UUID REFERENCES screenshot_processing_log(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'screenshot_gpt',
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_heatmap_type CHECK (heatmap_type IN ('player_positions', 'tactical', 'events', 'ball_recovery', 'attack_areas'))
);

-- Indici heat_maps
CREATE INDEX IF NOT EXISTS idx_heat_maps_user_id ON heat_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_heat_maps_match_id ON heat_maps(match_id);
CREATE INDEX IF NOT EXISTS idx_heat_maps_type ON heat_maps(heatmap_type);

-- RLS per heat_maps
ALTER TABLE heat_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own heat maps"
  ON heat_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heat maps"
  ON heat_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABLE: chart_data
-- Dati estratti da screenshot grafici/statistiche
-- ============================================

CREATE TABLE IF NOT EXISTS chart_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES unified_match_contexts(id) ON DELETE SET NULL,
  
  -- Tipo grafico
  chart_type TEXT NOT NULL, -- 'bar_chart', 'line_chart', 'radar_chart', 'heat_map', 'table'
  
  -- Dati grafico (JSONB)
  chart_data JSONB NOT NULL DEFAULT '{}',
  
  -- Source
  screenshot_url TEXT,
  screenshot_log_id UUID REFERENCES screenshot_processing_log(id) ON DELETE SET NULL,
  
  -- Metadata
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_chart_type CHECK (chart_type IN ('bar_chart', 'line_chart', 'radar_chart', 'heat_map', 'table'))
);

-- Indici chart_data
CREATE INDEX IF NOT EXISTS idx_chart_data_user_id ON chart_data(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_data_match_id ON chart_data(match_id);
CREATE INDEX IF NOT EXISTS idx_chart_data_type ON chart_data(chart_type);

-- RLS per chart_data
ALTER TABLE chart_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chart data"
  ON chart_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chart data"
  ON chart_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABLE: player_match_ratings
-- Voti post-partita estratti da screenshot
-- ============================================

CREATE TABLE IF NOT EXISTS player_match_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES unified_match_contexts(id) ON DELETE CASCADE,
  
  -- Giocatore
  player_name TEXT,
  player_id UUID REFERENCES players_base(id) ON DELETE SET NULL,
  jersey_number INTEGER,
  
  -- Voto
  rating DECIMAL(3,1) NOT NULL, -- Voto (es. 7.5, 8.0, 8.5)
  rating_type TEXT DEFAULT 'post_match', -- 'post_match', 'overall', 'performance'
  
  -- Voti per categoria (JSONB)
  category_ratings JSONB DEFAULT '{}',
  -- Struttura: { "attacking": 9.0, "defending": 5.0, "overall": 8.5 }
  
  -- Notes
  notes TEXT,
  is_top_performer BOOLEAN DEFAULT false,
  
  -- Source
  screenshot_url TEXT,
  screenshot_log_id UUID REFERENCES screenshot_processing_log(id) ON DELETE SET NULL,
  
  -- Metadata
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_rating_type CHECK (rating_type IN ('post_match', 'overall', 'performance')),
  CONSTRAINT valid_rating_range CHECK (rating >= 0.0 AND rating <= 10.0)
);

-- Indici player_match_ratings
CREATE INDEX IF NOT EXISTS idx_player_ratings_user_id ON player_match_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_match_id ON player_match_ratings(match_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_player_id ON player_match_ratings(player_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_top_performer ON player_match_ratings(is_top_performer) WHERE is_top_performer = true;

-- RLS per player_match_ratings
ALTER TABLE player_match_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own player ratings"
  ON player_match_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own player ratings"
  ON player_match_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TABLE: squad_formations
-- Formazioni squadra estratte da screenshot
-- ============================================

CREATE TABLE IF NOT EXISTS squad_formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Squadra
  team_name TEXT,
  formation TEXT, -- "4-2-1-3", "4-3-3", etc.
  overall_strength INTEGER,
  tactical_style TEXT, -- "Contrattacco", "Possession Game", etc.
  
  -- Giocatori in formazione (JSONB array)
  players JSONB DEFAULT '[]',
  -- Struttura: [{ jersey_number, name, rating, position, field_position, nationality, club }]
  
  -- Dettagli giocatore selezionato (se presente)
  selected_player JSONB,
  
  -- Source
  screenshot_url TEXT,
  screenshot_log_id UUID REFERENCES screenshot_processing_log(id) ON DELETE SET NULL,
  
  -- Metadata
  extracted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici squad_formations
CREATE INDEX IF NOT EXISTS idx_squad_formations_user_id ON squad_formations(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_formations_formation ON squad_formations(formation);

-- RLS per squad_formations
ALTER TABLE squad_formations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own squad formations"
  ON squad_formations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own squad formations"
  ON squad_formations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- UPDATE: screenshot_processing_log
-- Aggiungi campi per GPT-Realtime
-- ============================================

ALTER TABLE screenshot_processing_log 
  ADD COLUMN IF NOT EXISTS processing_method TEXT DEFAULT 'google_vision', -- 'google_vision', 'gpt_realtime'
  ADD COLUMN IF NOT EXISTS candidate_profile_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_screenshot_log_method ON screenshot_processing_log(processing_method);
CREATE INDEX IF NOT EXISTS idx_screenshot_log_candidate ON screenshot_processing_log(candidate_profile_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE candidate_profiles IS 'Profili estratti non ancora confermati - State machine: suggested → editing → confirmed';
COMMENT ON COLUMN candidate_profiles.profile_state IS 'State machine: suggested (default) → editing → confirmed → error';
COMMENT ON COLUMN candidate_profiles.candidate_data IS 'CandidateProfile completo con value/status/confidence per ogni campo';

COMMENT ON TABLE heat_maps IS 'Heat maps estratte da screenshot partita';
COMMENT ON TABLE chart_data IS 'Dati estratti da screenshot grafici/statistiche';
COMMENT ON TABLE player_match_ratings IS 'Voti post-partita estratti da screenshot "Pagelle giocatori"';
COMMENT ON TABLE squad_formations IS 'Formazioni squadra estratte da screenshot';
