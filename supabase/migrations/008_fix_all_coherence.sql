-- ============================================
-- MIGRATION: Fix All Coherence - Verifica Completa
-- ============================================
-- Data: 2025-01-14
-- Descrizione: Verifica e sistema TUTTO per coerenza completa
--              - Trigger mancanti
--              - RLS policies mancanti
--              - Indici mancanti
--              - Funzioni mancanti
--              - Storage policies
-- ============================================

-- ============================================
-- 1. FIX TRIGGER: coaching_sessions updated_at
-- ============================================
-- Aggiunge SET search_path per sicurezza

CREATE OR REPLACE FUNCTION update_coaching_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. VERIFICA E FIX: Storage Bucket Policies
-- ============================================
-- Aggiunge policy per chat-images (sottocartella)

-- Policy per upload in chat-images (pubblico per getPublicUrl)
DO $$
BEGIN
  -- Rimuovi policy vecchia se esiste
  DROP POLICY IF EXISTS "Users can upload chat images" ON storage.objects;
  
  -- Crea nuova policy per chat-images
  CREATE POLICY "Users can upload chat images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'player-screenshots' AND
    (name LIKE 'chat-images/%' OR (storage.foldername(name))[1] = auth.uid()::text)
  );
  
  -- Policy per lettura chat-images (pubblico)
  DROP POLICY IF EXISTS "Public read chat images" ON storage.objects;
  
  CREATE POLICY "Public read chat images"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'player-screenshots' AND
    name LIKE 'chat-images/%'
  );
END $$;

-- ============================================
-- 3. VERIFICA: Tutte le tabelle hanno RLS
-- ============================================

DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY[
    'players_base',
    'boosters',
    'player_builds',
    'user_rosa',
    'screenshot_processing_log',
    'unified_match_contexts',
    'coaching_suggestions',
    'candidate_profiles',
    'heat_maps',
    'chart_data',
    'player_match_ratings',
    'squad_formations',
    'team_playing_styles',
    'playing_styles',
    'managers',
    'manager_style_competency',
    'player_links',
    'position_competency',
    'coaching_sessions'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    -- Abilita RLS se non già abilitato
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
END $$;

-- ============================================
-- 4. VERIFICA: Tutte le tabelle con updated_at hanno trigger
-- ============================================

DO $$
DECLARE
  v_table TEXT;
  v_tables_with_updated_at TEXT[] := ARRAY[
    'players_base',
    'boosters',
    'player_builds',
    'user_rosa',
    'unified_match_contexts',
    'candidate_profiles',
    'team_playing_styles',
    'playing_styles',
    'managers',
    'manager_style_competency',
    'player_links',
    'position_competency',
    'coaching_sessions'
  ];
  v_trigger_exists BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_tables_with_updated_at
  LOOP
    -- Verifica se trigger esiste
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = format('update_%s_updated_at', v_table)
    ) INTO v_trigger_exists;
    
    -- Crea trigger se non esiste
    IF NOT v_trigger_exists THEN
      EXECUTE format('
        CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      ', v_table, v_table);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 5. VERIFICA: Indici mancanti su colonne critiche
-- ============================================

-- Indici per foreign keys che potrebbero mancare
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_heat_maps_user_id ON heat_maps(user_id);
CREATE INDEX IF NOT EXISTS idx_chart_data_user_id ON chart_data(user_id);
CREATE INDEX IF NOT EXISTS idx_player_ratings_user_id ON player_match_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_formations_user_id ON squad_formations(user_id);

-- Indici per colonne usate in WHERE/JOIN
CREATE INDEX IF NOT EXISTS idx_players_base_source ON players_base(source);
CREATE INDEX IF NOT EXISTS idx_player_builds_source ON player_builds(source);
CREATE INDEX IF NOT EXISTS idx_screenshot_log_status ON screenshot_processing_log(processing_status);

-- ============================================
-- 6. FIX: players_base - Aggiungi colonne mancanti se usate nel codice
-- ============================================

DO $$
BEGIN
  -- Aggiungi colonne se non esistono (usate in calculate_player_links)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players_base' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE players_base ADD COLUMN nationality TEXT;
    CREATE INDEX IF NOT EXISTS idx_players_base_nationality ON players_base(nationality);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players_base' AND column_name = 'club_name'
  ) THEN
    ALTER TABLE players_base ADD COLUMN club_name TEXT;
    CREATE INDEX IF NOT EXISTS idx_players_base_club_name ON players_base(club_name);
  END IF;
END $$;

-- ============================================
-- 7. VERIFICA: Funzioni helper mancanti
-- ============================================

-- Funzione per validare base_stats (se usata)
CREATE OR REPLACE FUNCTION validate_base_stats(stats JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verifica struttura base
  IF stats IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verifica presenza overall_rating
  IF NOT (stats ? 'overall_rating') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- ============================================
-- 8. FIX: Storage Bucket - Verifica esistenza e crea se mancante
-- ============================================

DO $$
BEGIN
  -- Verifica se bucket esiste
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'player-screenshots'
  ) THEN
    -- Crea bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'player-screenshots',
      'player-screenshots',
      false, -- Privato
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    );
  END IF;
END $$;

-- ============================================
-- 9. VERIFICA: Constraints mancanti
-- ============================================

-- Aggiungi constraint per validare JSONB se necessario
DO $$
BEGIN
  -- Constraint per base_stats (se non esiste)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_base_stats_valid'
  ) THEN
    ALTER TABLE players_base 
    ADD CONSTRAINT check_base_stats_valid 
    CHECK (validate_base_stats(base_stats));
  END IF;
END $$;

-- ============================================
-- 10. COMMENTI FINALI
-- ============================================

COMMENT ON FUNCTION update_coaching_sessions_updated_at IS 'Trigger function per coaching_sessions - FIXED: search_path security';
COMMENT ON FUNCTION validate_base_stats IS 'Valida struttura base_stats JSONB';

-- ============================================
-- 11. VERIFICA FINALE: Report
-- ============================================

DO $$
DECLARE
  v_table_count INTEGER;
  v_trigger_count INTEGER;
  v_function_count INTEGER;
  v_index_count INTEGER;
BEGIN
  -- Conta tabelle
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'players_base', 'boosters', 'player_builds', 'user_rosa',
      'screenshot_processing_log', 'unified_match_contexts',
      'coaching_suggestions', 'candidate_profiles', 'heat_maps',
      'chart_data', 'player_match_ratings', 'squad_formations',
      'team_playing_styles', 'playing_styles', 'managers',
      'manager_style_competency', 'player_links', 'position_competency',
      'coaching_sessions'
    );
  
  -- Conta trigger
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname LIKE 'update_%_updated_at';
  
  -- Conta funzioni
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN (
      'update_updated_at_column',
      'update_candidate_profiles_updated_at',
      'update_coaching_sessions_updated_at',
      'get_default_position_competency',
      'is_playing_style_compatible',
      'populate_position_competency_for_player',
      'populate_all_position_competencies',
      'calculate_nationality_links',
      'calculate_club_links',
      'calculate_era_links',
      'calculate_all_player_links',
      'validate_base_stats'
    );
  
  -- Log report
  RAISE NOTICE '=== VERIFICA COMPLETA ===';
  RAISE NOTICE 'Tabelle verificate: %', v_table_count;
  RAISE NOTICE 'Trigger updated_at: %', v_trigger_count;
  RAISE NOTICE 'Funzioni helper: %', v_function_count;
  RAISE NOTICE '=== FINE VERIFICA ===';
END $$;
