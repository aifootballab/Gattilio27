-- ============================================
-- MIGRAZIONE: Tabella matches per analisi partite
-- Data: 2025
-- ============================================

-- 1. CREA TABELLA matches (se non esiste)
-- ============================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati base partita
  match_date TIMESTAMPTZ DEFAULT NOW(),
  opponent_name TEXT,
  result TEXT, -- "6-1"
  is_home BOOLEAN DEFAULT true,
  opponent_formation_id UUID, -- REFERENCES opponent_formations(id) ON DELETE SET NULL, -- FK aggiunto in migration separata se necessario
  
  -- FORMAZIONE REALE GIOCATA (da screenshot)
  formation_played TEXT, -- "4-2-1-3"
  playing_style_played TEXT, -- "Contrattacco"
  team_strength INTEGER, -- 3245
  
  -- GIOCATORI IN CAMPO (da screenshot formazione)
  players_in_match JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- DATI ESTRATTI (RAW - per backup)
  extracted_data JSONB DEFAULT '{}'::jsonb,
  
  -- DATI STRUTTURATI per analisi
  player_ratings JSONB DEFAULT '{}'::jsonb,
  team_stats JSONB DEFAULT '{}'::jsonb,
  attack_areas JSONB DEFAULT '{}'::jsonb,
  ball_recovery_zones JSONB DEFAULT '[]'::jsonb,
  goals_events JSONB DEFAULT '[]'::jsonb,
  formation_discrepancies JSONB DEFAULT '[]'::jsonb,
  
  -- OUTPUT AI (riassunto testuale)
  ai_summary TEXT,
  ai_insights JSONB DEFAULT '[]'::jsonb,
  ai_recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  photos_uploaded INTEGER DEFAULT 0 CHECK (photos_uploaded >= 0 AND photos_uploaded <= 20), -- Max 20 foto (supporta più foto per sezione)
  missing_photos JSONB DEFAULT '[]'::jsonb, -- Array di foto mancanti (es. ["formation_image", "ratings_image"])
  data_completeness TEXT DEFAULT 'partial' CHECK (data_completeness IN ('complete', 'partial')),
  credits_used INTEGER DEFAULT 0 CHECK (credits_used >= 0), -- Credits spesi per estrazione dati
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  analysis_error TEXT, -- Se analisi fallisce
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_matches_user_date 
ON matches(user_id, match_date DESC);

CREATE INDEX IF NOT EXISTS idx_matches_analysis_status 
ON matches(user_id, analysis_status) 
WHERE analysis_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_matches_opponent_formation 
ON matches(opponent_formation_id) 
WHERE opponent_formation_id IS NOT NULL;

-- 3. RLS (Row Level Security)
-- ============================================
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti possono vedere solo i propri match
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches"
ON matches FOR SELECT
USING ((select auth.uid()) = user_id);

-- Policy: Utenti possono inserire solo i propri match
DROP POLICY IF EXISTS "Users can insert own matches" ON matches;
CREATE POLICY "Users can insert own matches"
ON matches FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Utenti possono aggiornare solo i propri match
DROP POLICY IF EXISTS "Users can update own matches" ON matches;
CREATE POLICY "Users can update own matches"
ON matches FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Utenti possono eliminare solo i propri match
DROP POLICY IF EXISTS "Users can delete own matches" ON matches;
CREATE POLICY "Users can delete own matches"
ON matches FOR DELETE
USING ((select auth.uid()) = user_id);

-- 4. TRIGGER per updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_matches_updated_at ON matches;
CREATE TRIGGER trigger_update_matches_updated_at
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_matches_updated_at();

-- ============================================
-- NOTE:
-- ============================================
-- 1. opponent_formation_id è un UUID senza FK per ora (opponent_formations può non esistere ancora)
--    Aggiungere FK in migration separata quando opponent_formations sarà creata
-- 2. photos_uploaded supporta fino a 20 foto (per gestire più foto per sezione: "a volte 2 a volte no")
-- 3. missing_photos è un array JSONB per tracciare quali foto mancano (es. ["formation_image", "ratings_image"])
-- 4. data_completeness può essere 'complete' o 'partial' (basato su foto caricate)
-- 5. credits_used traccia i credits spesi per estrazione (pay-per-use: 1 credit per foto fisica)
-- 6. analysis_status traccia lo stato dell'analisi AI (pending -> analyzing -> completed/failed)
-- 7. Tutti i campi JSONB hanno DEFAULT per evitare errori su INSERT
