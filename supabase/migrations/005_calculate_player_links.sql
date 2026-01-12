-- =====================================================
-- MIGRAZIONE 005: Calcolo Player Links (Sinergie)
-- =====================================================
-- Data: 2025-01-12
-- Descrizione: Funzioni per calcolo automatico collegamenti giocatori
--              (nazionalità, club, era)
-- =====================================================

-- Funzione per calcolare player links per nazionalità
CREATE OR REPLACE FUNCTION calculate_nationality_links()
RETURNS TABLE(inserted_count INTEGER, updated_count INTEGER) AS $$
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
$$ LANGUAGE plpgsql;

-- Funzione per calcolare player links per club
CREATE OR REPLACE FUNCTION calculate_club_links()
RETURNS TABLE(inserted_count INTEGER, updated_count INTEGER) AS $$
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
$$ LANGUAGE plpgsql;

-- Funzione per calcolare player links per era
CREATE OR REPLACE FUNCTION calculate_era_links()
RETURNS TABLE(inserted_count INTEGER, updated_count INTEGER) AS $$
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
$$ LANGUAGE plpgsql;

-- Funzione principale per calcolare tutti i player links
CREATE OR REPLACE FUNCTION calculate_all_player_links()
RETURNS TABLE(
  nationality_inserted INTEGER,
  nationality_updated INTEGER,
  club_inserted INTEGER,
  club_updated INTEGER,
  era_inserted INTEGER,
  era_updated INTEGER
) AS $$
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
$$ LANGUAGE plpgsql;

-- Commenti
COMMENT ON FUNCTION calculate_nationality_links IS 'Calcola player links per nazionalità';
COMMENT ON FUNCTION calculate_club_links IS 'Calcola player links per club';
COMMENT ON FUNCTION calculate_era_links IS 'Calcola player links per era';
COMMENT ON FUNCTION calculate_all_player_links IS 'Calcola tutti i player links (nazionalità, club, era)';
