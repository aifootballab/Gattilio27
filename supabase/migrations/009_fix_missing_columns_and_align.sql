-- ============================================
-- MIGRATION: Fix Missing Columns and Align All
-- ============================================
-- Data: 2025-01-14
-- Descrizione: Aggiunge colonne mancanti usate nel codice
--              Allinea database con codice Edge Functions
-- ============================================

-- ============================================
-- 1. FIX: coaching_sessions - Colonne mancanti
-- ============================================
-- Aggiunge colonne usate da voice-coaching-gpt/index.ts

DO $$
BEGIN
  -- Aggiungi context_snapshot se mancante
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coaching_sessions' AND column_name = 'context_snapshot'
  ) THEN
    ALTER TABLE coaching_sessions 
    ADD COLUMN context_snapshot JSONB DEFAULT '{}';
    
    COMMENT ON COLUMN coaching_sessions.context_snapshot IS 'Snapshot del contesto sessione (rosa, profilo, etc.)';
  END IF;
  
  -- Aggiungi conversation_history se mancante
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coaching_sessions' AND column_name = 'conversation_history'
  ) THEN
    ALTER TABLE coaching_sessions 
    ADD COLUMN conversation_history JSONB DEFAULT '[]';
    
    COMMENT ON COLUMN coaching_sessions.conversation_history IS 'Storia conversazione (array di messaggi)';
  END IF;
END $$;

-- ============================================
-- 2. FIX: user_rosa - Colonna is_main
-- ============================================
-- Aggiunge colonna is_main per identificare rosa principale

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_rosa' AND column_name = 'is_main'
  ) THEN
    ALTER TABLE user_rosa 
    ADD COLUMN is_main BOOLEAN DEFAULT false;
    
    CREATE INDEX IF NOT EXISTS idx_user_rosa_is_main ON user_rosa(user_id, is_main) WHERE is_main = true;
    
    COMMENT ON COLUMN user_rosa.is_main IS 'Indica se è la rosa principale dell''utente';
  END IF;
END $$;

-- ============================================
-- 3. FIX: players_base - Colonne per calculate_player_links
-- ============================================
-- Assicura che nationality e club_name esistano

DO $$
BEGIN
  -- nationality
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players_base' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE players_base ADD COLUMN nationality TEXT;
    CREATE INDEX IF NOT EXISTS idx_players_base_nationality ON players_base(nationality);
  END IF;
  
  -- club_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players_base' AND column_name = 'club_name'
  ) THEN
    ALTER TABLE players_base ADD COLUMN club_name TEXT;
    CREATE INDEX IF NOT EXISTS idx_players_base_club_name ON players_base(club_name);
  END IF;
END $$;

-- ============================================
-- 4. FIX: screenshot_processing_log - Colonne mancanti
-- ============================================
-- Verifica che tutte le colonne usate esistano

DO $$
BEGIN
  -- processing_method (già aggiunta in 003, ma verifichiamo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'screenshot_processing_log' AND column_name = 'processing_method'
  ) THEN
    ALTER TABLE screenshot_processing_log 
    ADD COLUMN processing_method TEXT DEFAULT 'google_vision';
    
    CREATE INDEX IF NOT EXISTS idx_screenshot_log_method ON screenshot_processing_log(processing_method);
  END IF;
  
  -- candidate_profile_id (già aggiunta in 003, ma verifichiamo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'screenshot_processing_log' AND column_name = 'candidate_profile_id'
  ) THEN
    ALTER TABLE screenshot_processing_log 
    ADD COLUMN candidate_profile_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_screenshot_log_candidate ON screenshot_processing_log(candidate_profile_id);
  END IF;
END $$;

-- ============================================
-- 5. FIX: user_rosa - Relazione con player_builds
-- ============================================
-- Verifica che la query con JOIN funzioni correttamente

-- Aggiungi commento per chiarezza
COMMENT ON COLUMN user_rosa.player_build_ids IS 'Array di UUID riferiti a player_builds.id';

-- ============================================
-- 6. FIX: Indici mancanti per performance
-- ============================================

-- Indici per coaching_sessions
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_active ON coaching_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_expires ON coaching_sessions(expires_at) WHERE expires_at IS NOT NULL;

-- Indici per user_rosa
CREATE INDEX IF NOT EXISTS idx_user_rosa_user_main ON user_rosa(user_id, is_main) WHERE is_main = true;

-- ============================================
-- 7. FIX: Constraints mancanti
-- ============================================

-- Constraint per is_main (solo una rosa principale per utente)
DO $$
BEGIN
  -- Rimuovi constraint vecchio se esiste
  DROP INDEX IF EXISTS unique_user_main_rosa;
  
  -- Crea unique constraint per is_main = true
  -- Nota: PostgreSQL non supporta unique parziale diretto, usiamo unique index
  CREATE UNIQUE INDEX IF NOT EXISTS unique_user_main_rosa 
  ON user_rosa(user_id) 
  WHERE is_main = true;
END $$;

-- ============================================
-- 8. FIX: Funzione helper per aggiornare context_snapshot
-- ============================================

CREATE OR REPLACE FUNCTION update_coaching_session_context(
  p_session_id TEXT,
  p_context JSONB,
  p_conversation_history JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE coaching_sessions
  SET 
    context_snapshot = p_context,
    conversation_history = COALESCE(p_conversation_history, conversation_history),
    updated_at = NOW()
  WHERE session_id = p_session_id;
END;
$$;

COMMENT ON FUNCTION update_coaching_session_context IS 'Aggiorna context e conversation_history di una sessione coaching';

-- ============================================
-- 9. FIX: Funzione helper per ottenere rosa principale
-- ============================================

CREATE OR REPLACE FUNCTION get_user_main_rosa(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  player_build_ids UUID[],
  squad_analysis JSONB,
  manager_id UUID,
  team_playing_style_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.player_build_ids,
    r.squad_analysis,
    r.manager_id,
    r.team_playing_style_id
  FROM user_rosa r
  WHERE r.user_id = p_user_id
    AND r.is_main = true
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_user_main_rosa IS 'Ottiene la rosa principale di un utente';

-- ============================================
-- 10. FIX: user_profiles - Tabella se usata
-- ============================================
-- Crea tabella user_profiles se referenziata nel codice

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profilo coaching
  coaching_level TEXT DEFAULT 'intermedio', -- 'principiante', 'intermedio', 'avanzato', 'esperto'
  preferred_language TEXT DEFAULT 'it',
  
  -- Preferenze
  preferences JSONB DEFAULT '{}',
  
  -- Statistiche
  total_sessions INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Trigger updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_profiles IS 'Profilo utente con preferenze e statistiche coaching';

-- ============================================
-- 11. VERIFICA FINALE: Report colonne
-- ============================================

DO $$
DECLARE
  v_coaching_sessions_columns TEXT[];
  v_user_rosa_columns TEXT[];
  v_players_base_columns TEXT[];
BEGIN
  -- Verifica colonne coaching_sessions
  SELECT array_agg(column_name ORDER BY column_name) INTO v_coaching_sessions_columns
  FROM information_schema.columns
  WHERE table_name = 'coaching_sessions';
  
  -- Verifica colonne user_rosa
  SELECT array_agg(column_name ORDER BY column_name) INTO v_user_rosa_columns
  FROM information_schema.columns
  WHERE table_name = 'user_rosa';
  
  -- Verifica colonne players_base
  SELECT array_agg(column_name ORDER BY column_name) INTO v_players_base_columns
  FROM information_schema.columns
  WHERE table_name = 'players_base';
  
  -- Log report
  RAISE NOTICE '=== VERIFICA COLONNE ===';
  RAISE NOTICE 'coaching_sessions: %', array_to_string(v_coaching_sessions_columns, ', ');
  RAISE NOTICE 'user_rosa: %', array_to_string(v_user_rosa_columns, ', ');
  RAISE NOTICE 'players_base: %', array_to_string(v_players_base_columns, ', ');
  RAISE NOTICE '=== FINE VERIFICA ===';
END $$;
