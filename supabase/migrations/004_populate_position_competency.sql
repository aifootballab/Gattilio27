-- =====================================================
-- MIGRAZIONE 004: Popolamento Position Competency
-- =====================================================
-- Data: 2025-01-12
-- Descrizione: Popola position_competency per giocatori esistenti
--              Competenza alta (2) per posizione principale
--              Competenza bassa (0) per altre posizioni (non inserite)
-- =====================================================

-- Funzione per popolare position_competency per giocatore esistente
CREATE OR REPLACE FUNCTION populate_position_competency_for_player(
  p_player_base_id UUID
) RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Funzione per popolare position_competency per tutti i giocatori esistenti
CREATE OR REPLACE FUNCTION populate_all_position_competencies()
RETURNS TABLE(processed_count INTEGER, error_count INTEGER) AS $$
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
$$ LANGUAGE plpgsql;

-- Popolamento automatico per tutti i giocatori esistenti
-- (Esegui manualmente se necessario: SELECT * FROM populate_all_position_competencies();)

-- Commenti
COMMENT ON FUNCTION populate_position_competency_for_player IS 'Popola position_competency per un singolo giocatore (competenza alta per posizione principale)';
COMMENT ON FUNCTION populate_all_position_competencies IS 'Popola position_competency per tutti i giocatori esistenti nel database';
