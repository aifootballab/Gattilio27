-- =====================================================
-- MIGRAZIONE 006: Fix Security Warnings
-- =====================================================
-- Data: 2025-01-14
-- Descrizione: Risolve avvisi di sicurezza Supabase
--              1. Aggiunge SET search_path a tutte le funzioni PostgreSQL
--              2. Nota: RLS policy "Dev: Allow all access" è intenzionale per sviluppo
--              3. Nota: Auth leaked password protection va abilitata manualmente nel Dashboard
-- =====================================================

-- =====================================================
-- FIX 1: Function Search Path Mutable
-- =====================================================
-- Aggiunge SET search_path = public, pg_temp a tutte le funzioni
-- per prevenire SQL injection tramite search_path manipulation

-- Fix: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
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

-- Fix: update_candidate_profiles_updated_at
CREATE OR REPLACE FUNCTION update_candidate_profiles_updated_at()
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

-- Fix: get_default_position_competency
CREATE OR REPLACE FUNCTION get_default_position_competency(
  p_player_base_id UUID,
  p_position TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_primary_position TEXT;
BEGIN
  -- Ottieni posizione principale del giocatore
  SELECT position INTO v_primary_position
  FROM players_base
  WHERE id = p_player_base_id;
  
  -- Se è la posizione principale, competenza alta (2)
  IF v_primary_position = p_position THEN
    RETURN 2;
  END IF;
  
  -- Altrimenti, competenza bassa (0)
  RETURN 0;
END;
$$;

-- Fix: is_playing_style_compatible
CREATE OR REPLACE FUNCTION is_playing_style_compatible(
  p_playing_style_id UUID,
  p_position TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_compatible_positions TEXT[];
BEGIN
  SELECT compatible_positions INTO v_compatible_positions
  FROM playing_styles
  WHERE id = p_playing_style_id;
  
  -- Verifica se la posizione è nell'array compatibile
  RETURN p_position = ANY(v_compatible_positions);
END;
$$;

-- Fix: populate_position_competency_for_player
CREATE OR REPLACE FUNCTION populate_position_competency_for_player(
  p_player_base_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_primary_position TEXT;
BEGIN
  -- Ottieni posizione principale del giocatore
  SELECT position INTO v_primary_position
  FROM players_base
  WHERE id = p_player_base_id;
  
  IF v_primary_position IS NULL THEN
    RETURN;
  END IF;
  
  -- Inserisci competenza alta (2) per posizione principale
  INSERT INTO position_competency (
    player_base_id,
    position,
    competency_level,
    is_primary,
    is_learned
  )
  VALUES (
    p_player_base_id,
    v_primary_position,
    2,  -- Alta
    true,  -- È la posizione principale
    false  -- Non è stata appresa (è naturale)
  )
  ON CONFLICT (player_base_id, position) DO UPDATE
  SET competency_level = 2,
      is_primary = true,
      updated_at = now();
END;
$$;

-- Fix: populate_all_position_competencies
CREATE OR REPLACE FUNCTION populate_all_position_competencies()
RETURNS TABLE(processed_count INTEGER, error_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player RECORD;
  v_processed INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- Popola per tutti i giocatori che hanno una posizione
  FOR v_player IN 
    SELECT id, position 
    FROM players_base 
    WHERE position IS NOT NULL
  LOOP
    BEGIN
      PERFORM populate_position_competency_for_player(v_player.id);
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- Log errore (in produzione si potrebbe inserire in log table)
      RAISE WARNING 'Errore popolamento position_competency per giocatore %: %', v_player.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_errors;
END;
$$;

-- Fix: calculate_nationality_links
CREATE OR REPLACE FUNCTION calculate_nationality_links()
RETURNS TABLE(inserted_count INTEGER, updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pair RECORD;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_synergy_bonus NUMERIC;
BEGIN
  -- Per ogni coppia di giocatori con stessa nazionalità
  FOR v_pair IN
    SELECT DISTINCT
      p1.id AS player_1_id,
      p2.id AS player_2_id,
      p1.nationality AS nationality
    FROM players_base p1
    INNER JOIN players_base p2 ON p1.nationality = p2.nationality
    WHERE p1.id < p2.id  -- Evita duplicati
      AND p1.nationality IS NOT NULL
      AND p1.nationality != ''
  LOOP
    -- Calcola synergy bonus basato su quante coppie ci sono per nazionalità
    -- Se 3+ giocatori stessa nazionalità: bonus +2
    -- Altrimenti: bonus +1
    SELECT COUNT(*) INTO v_synergy_bonus
    FROM players_base
    WHERE nationality = v_pair.nationality;
    
    IF v_synergy_bonus >= 3 THEN
      v_synergy_bonus := 2;
    ELSE
      v_synergy_bonus := 1;
    END IF;
    
    -- Inserisci o aggiorna link
    INSERT INTO player_links (
      player_1_id,
      player_2_id,
      link_type,
      link_value,
      synergy_bonus,
      description
    )
    VALUES (
      v_pair.player_1_id,
      v_pair.player_2_id,
      'nationality',
      v_pair.nationality,
      v_synergy_bonus,
      'Stessa nazionalità: ' || v_pair.nationality
    )
    ON CONFLICT (player_1_id, player_2_id, link_type) DO UPDATE
    SET synergy_bonus = v_synergy_bonus,
        updated_at = now();
    
    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_inserted, v_updated;
END;
$$;

-- Fix: calculate_club_links
CREATE OR REPLACE FUNCTION calculate_club_links()
RETURNS TABLE(inserted_count INTEGER, updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pair RECORD;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_synergy_bonus NUMERIC;
BEGIN
  -- Per ogni coppia di giocatori stesso club
  FOR v_pair IN
    SELECT DISTINCT
      p1.id AS player_1_id,
      p2.id AS player_2_id,
      p1.club_name AS club_name
    FROM players_base p1
    INNER JOIN players_base p2 ON p1.club_name = p2.club_name
    WHERE p1.id < p2.id  -- Evita duplicati
      AND p1.club_name IS NOT NULL
      AND p1.club_name != ''
  LOOP
    -- Calcola synergy bonus basato su quante coppie ci sono per club
    -- Se 3+ giocatori stesso club: bonus +2
    -- Altrimenti: bonus +1
    SELECT COUNT(*) INTO v_synergy_bonus
    FROM players_base
    WHERE club_name = v_pair.club_name;
    
    IF v_synergy_bonus >= 3 THEN
      v_synergy_bonus := 2;
    ELSE
      v_synergy_bonus := 1;
    END IF;
    
    -- Inserisci o aggiorna link
    INSERT INTO player_links (
      player_1_id,
      player_2_id,
      link_type,
      link_value,
      synergy_bonus,
      description
    )
    VALUES (
      v_pair.player_1_id,
      v_pair.player_2_id,
      'club',
      v_pair.club_name,
      v_synergy_bonus,
      'Stesso club: ' || v_pair.club_name
    )
    ON CONFLICT (player_1_id, player_2_id, link_type) DO UPDATE
    SET synergy_bonus = v_synergy_bonus,
        updated_at = now();
    
    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_inserted, v_updated;
END;
$$;

-- Fix: calculate_era_links
CREATE OR REPLACE FUNCTION calculate_era_links()
RETURNS TABLE(inserted_count INTEGER, updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pair RECORD;
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_synergy_bonus NUMERIC := 1;  -- Bonus fisso +1 per era
BEGIN
  -- Per ogni coppia di giocatori stessa era
  FOR v_pair IN
    SELECT DISTINCT
      p1.id AS player_1_id,
      p2.id AS player_2_id,
      p1.era AS era
    FROM players_base p1
    INNER JOIN players_base p2 ON p1.era = p2.era
    WHERE p1.id < p2.id  -- Evita duplicati
      AND p1.era IS NOT NULL
      AND p1.era != ''
  LOOP
    -- Inserisci o aggiorna link
    INSERT INTO player_links (
      player_1_id,
      player_2_id,
      link_type,
      link_value,
      synergy_bonus,
      description
    )
    VALUES (
      v_pair.player_1_id,
      v_pair.player_2_id,
      'era',
      v_pair.era,
      v_synergy_bonus,
      'Stessa era: ' || v_pair.era
    )
    ON CONFLICT (player_1_id, player_2_id, link_type) DO UPDATE
    SET synergy_bonus = v_synergy_bonus,
        updated_at = now();
    
    IF FOUND THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_inserted, v_updated;
END;
$$;

-- Fix: calculate_all_player_links
CREATE OR REPLACE FUNCTION calculate_all_player_links()
RETURNS TABLE(
  nationality_inserted INTEGER,
  nationality_updated INTEGER,
  club_inserted INTEGER,
  club_updated INTEGER,
  era_inserted INTEGER,
  era_updated INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nat_inserted INTEGER;
  v_nat_updated INTEGER;
  v_club_inserted INTEGER;
  v_club_updated INTEGER;
  v_era_inserted INTEGER;
  v_era_updated INTEGER;
  v_result RECORD;
BEGIN
  -- Calcola nazionalità
  SELECT * INTO v_result FROM calculate_nationality_links();
  v_nat_inserted := v_result.inserted_count;
  v_nat_updated := v_result.updated_count;
  
  -- Calcola club
  SELECT * INTO v_result FROM calculate_club_links();
  v_club_inserted := v_result.inserted_count;
  v_club_updated := v_result.updated_count;
  
  -- Calcola era
  SELECT * INTO v_result FROM calculate_era_links();
  v_era_inserted := v_result.inserted_count;
  v_era_updated := v_result.updated_count;
  
  RETURN QUERY SELECT 
    v_nat_inserted,
    v_nat_updated,
    v_club_inserted,
    v_club_updated,
    v_era_inserted,
    v_era_updated;
END;
$$;

-- Fix: validate_base_stats (se esiste)
-- Nota: Questa funzione potrebbe non esistere, ma la includiamo per sicurezza
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'validate_base_stats' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    -- Ricrea con search_path se esiste
    -- Nota: Non conosciamo la definizione esatta, quindi lasciamo un commento
    RAISE NOTICE 'Funzione validate_base_stats trovata - aggiorna manualmente con SET search_path';
  END IF;
END $$;

-- =====================================================
-- COMMENTI
-- =====================================================

COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function per aggiornare updated_at - FIXED: search_path security';
COMMENT ON FUNCTION update_candidate_profiles_updated_at IS 'Trigger function per aggiornare updated_at su candidate_profiles - FIXED: search_path security';
COMMENT ON FUNCTION get_default_position_competency IS 'Calcola competenza posizione di default - FIXED: search_path security';
COMMENT ON FUNCTION is_playing_style_compatible IS 'Verifica compatibilità playing style con posizione - FIXED: search_path security';
COMMENT ON FUNCTION populate_position_competency_for_player IS 'Popola position_competency per un giocatore - FIXED: search_path security';
COMMENT ON FUNCTION populate_all_position_competencies IS 'Popola position_competency per tutti i giocatori - FIXED: search_path security';
COMMENT ON FUNCTION calculate_nationality_links IS 'Calcola player links per nazionalità - FIXED: search_path security';
COMMENT ON FUNCTION calculate_club_links IS 'Calcola player links per club - FIXED: search_path security';
COMMENT ON FUNCTION calculate_era_links IS 'Calcola player links per era - FIXED: search_path security';
COMMENT ON FUNCTION calculate_all_player_links IS 'Calcola tutti i player links - FIXED: search_path security';

-- =====================================================
-- NOTE SU ALTRI WARNING
-- =====================================================

-- WARNING 2: RLS Policy "Dev: Allow all access"
-- Questa policy è INTENZIONALE per sviluppo locale
-- In produzione, rimuovi questa policy e usa policies specifiche per utente
-- Esempio per rimuovere:
-- DROP POLICY IF EXISTS "Dev: Allow all access" ON players_base;

-- WARNING 3: Auth Leaked Password Protection
-- Abilita manualmente nel Supabase Dashboard:
-- Settings → Authentication → Password → Enable "Leaked password protection"