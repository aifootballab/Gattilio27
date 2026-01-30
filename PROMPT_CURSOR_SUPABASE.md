# 🗄️ PROMPT PER CURSOR - Configurazione Supabase

**Task:** Creare funzioni PostgreSQL e configurazioni necessarie per risolvere race conditions e problemi di transazione.

---

## 🎯 OBIETTIVO

Implementare atomicità nelle operazioni critiche per evitare race conditions quando due operazioni simultanee modificano gli stessi dati.

---

## 📋 STEP 1: Funzione Transazione Slot Giocatore

Vai nella console Supabase → SQL Editor e esegui:

```sql
-- Funzione per assegnazione atomica slot giocatore
-- Risolve RC-001: Race condition assegnazione slot

CREATE OR REPLACE FUNCTION atomic_slot_assignment(
  p_user_id UUID,
  p_slot_index INTEGER,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_player_id UUID;
  v_result JSONB;
BEGIN
  -- Lock preventivo: usa advisory lock per serializzare operazioni utente
  PERFORM pg_advisory_xact_lock(hashtextext(p_user_id::text || '_' || p_slot_index::text));
  
  -- Trova giocatore esistente nello slot (se c'è)
  SELECT id INTO v_existing_player_id
  FROM players
  WHERE user_id = p_user_id 
    AND slot_index = p_slot_index
    AND id != p_player_id;
  
  -- Se esiste un giocatore nello slot, libera lo slot (torna riserva)
  IF v_existing_player_id IS NOT NULL THEN
    UPDATE players 
    SET slot_index = NULL,
        updated_at = NOW()
    WHERE id = v_existing_player_id;
  END IF;
  
  -- Assegna nuovo giocatore allo slot
  UPDATE players 
  SET slot_index = p_slot_index,
      updated_at = NOW()
  WHERE id = p_player_id 
    AND user_id = p_user_id;
  
  -- Verifica update effettuato
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Giocatore non trovato o non autorizzato';
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'slot_index', p_slot_index,
    'player_id', p_player_id,
    'previous_player_id', v_existing_player_id
  );
  
  RETURN v_result;
END;
$$;

-- Commento documentazione
COMMENT ON FUNCTION atomic_slot_assignment IS 
'Assegna un giocatore a uno slot in modo atomico. 
Se lo slot è occupato, libera prima il vecchio giocatore.
Usa advisory lock per prevenire race conditions.';
```

---

## 📋 STEP 2: Funzione Salvataggio Match Completo

```sql
-- Funzione per salvataggio atomico match con pattern
-- Risolve RM-001: Transazione incompleta save-match

CREATE OR REPLACE FUNCTION save_match_with_patterns(
  p_user_id UUID,
  p_match_data JSONB,
  p_calculate_patterns BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_id UUID;
  v_result JSONB;
BEGIN
  -- Inizia transazione esplicita (già iniziata da Supabase)
  
  -- 1. Salva il match
  INSERT INTO matches (
    user_id,
    match_date,
    opponent_name,
    result,
    is_home,
    player_ratings,
    team_stats,
    attack_areas,
    ball_recovery_zones,
    formation_played,
    playing_style_played,
    photos_uploaded,
    missing_photos,
    data_completeness,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    (p_match_data->>'match_date')::TIMESTAMPTZ,
    p_match_data->>'opponent_name',
    p_match_data->>'result',
    (p_match_data->>'is_home')::BOOLEAN,
    p_match_data->'player_ratings',
    p_match_data->'team_stats',
    p_match_data->'attack_areas',
    p_match_data->'ball_recovery_zones',
    p_match_data->>'formation_played',
    p_match_data->>'playing_style_played',
    (p_match_data->>'photos_uploaded')::INTEGER,
    p_match_data->'missing_photos',
    p_match_data->>'data_completeness',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_match_id;
  
  -- 2. Aggiorna pattern se richiesto
  IF p_calculate_patterns THEN
    -- Chiamata a funzione separata per calcolo pattern
    -- (questa può fallire ma il match è già salvato)
    PERFORM calculate_tactical_patterns_for_user(p_user_id);
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'match_id', v_match_id,
    'patterns_calculated', p_calculate_patterns
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  -- ROLLBACK automatico da PostgreSQL
  RAISE;
END;
$$;

COMMENT ON FUNCTION save_match_with_patterns IS 
'Salva un match e opzionalmente calcola i pattern tattici.
Tutto in un unica transazione atomica.';
```

---

## 📋 STEP 3: Funzione Calcolo Pattern Tattici

```sql
-- Funzione per calcolo/aggiornamento pattern tattici utente

CREATE OR REPLACE FUNCTION calculate_tactical_patterns_for_user(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calcola formazioni più usate
  WITH formation_stats AS (
    SELECT 
      formation_played,
      COUNT(*) as matches,
      SUM(CASE WHEN result LIKE 'W%' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) as win_rate
    FROM matches
    WHERE user_id = p_user_id
      AND formation_played IS NOT NULL
      AND match_date > NOW() - INTERVAL '90 days'
    GROUP BY formation_played
  ),
  style_stats AS (
    SELECT 
      playing_style_played,
      COUNT(*) as matches,
      SUM(CASE WHEN result LIKE 'W%' THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) as win_rate
    FROM matches
    WHERE user_id = p_user_id
      AND playing_style_played IS NOT NULL
      AND match_date > NOW() - INTERVAL '90 days'
    GROUP BY playing_style_played
  )
  INSERT INTO team_tactical_patterns (
    user_id,
    formation_usage,
    playing_style_usage,
    updated_at
  )
  SELECT 
    p_user_id,
    jsonb_object_agg(formation_played, jsonb_build_object('matches', matches, 'win_rate', win_rate)),
    (SELECT jsonb_object_agg(playing_style_played, jsonb_build_object('matches', matches, 'win_rate', win_rate)) FROM style_stats),
    NOW()
  FROM formation_stats
  ON CONFLICT (user_id) 
  DO UPDATE SET
    formation_usage = EXCLUDED.formation_usage,
    playing_style_usage = EXCLUDED.playing_style_usage,
    updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION calculate_tactical_patterns_for_user IS 
'Calcola e aggiorna i pattern tattici per un utente basandosi sulle ultime 90 giorni di partite.';
```

---

## 📋 STEP 4: Indici Performance

```sql
-- Indici per query frequenti e ricerca duplicati

-- Indice per ricerca duplicati (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_players_user_name_lower 
ON players (user_id, LOWER(player_name));

-- Indice per ricerca con età
CREATE INDEX IF NOT EXISTS idx_players_user_name_age 
ON players (user_id, LOWER(player_name), age) 
WHERE slot_index IS NULL;

-- Indice per slot index lookups
CREATE INDEX IF NOT EXISTS idx_players_user_slot 
ON players (user_id, slot_index) 
WHERE slot_index IS NOT NULL;

-- Indice per partite recenti (usato in pattern)
CREATE INDEX IF NOT EXISTS idx_matches_user_date 
ON matches (user_id, match_date DESC);

-- Indice per ricerca avversario
CREATE INDEX IF NOT EXISTS idx_matches_user_opponent 
ON matches (user_id, LOWER(opponent_name));
```

---

## 📋 STEP 5: Verifica Installazione

Dopo aver eseguito gli script, verifica che tutto funzioni:

```sql
-- Test funzione slot
SELECT atomic_slot_assignment(
  'test-user-id'::UUID,  -- sostituisci con user_id reale
  5,                      -- slot index
  'test-player-id'::UUID  -- sostituisci con player_id reale
);

-- Test funzione pattern
SELECT calculate_tactical_patterns_for_user('test-user-id'::UUID);

-- Verifica indici
SELECT indexname FROM pg_indexes WHERE tablename IN ('players', 'matches');
```

---

## 🔧 STEP 6: Modificare API Routes (dopo le funzioni SQL)

Dopo aver creato le funzioni SQL, devi modificare questi file:

### 6.1: Modificare `app/api/supabase/assign-player-to-slot/route.js`

Sostituisci la logica non-atomica (righe 66-115 e 200-223) con chiamata RPC:

```javascript
// Vecchio codice da sostituire:
// const { data: existingPlayerInSlot } = await admin...
// await admin.from('players').update(...) // libera slot
// await admin.from('players').update(...) // assegna nuovo

// Nuovo codice:
const { data: result, error: rpcError } = await admin.rpc(
  'atomic_slot_assignment',
  {
    p_user_id: userId,
    p_slot_index: slot_index,
    p_player_id: player_id
  }
);

if (rpcError) {
  return NextResponse.json(
    { error: rpcError.message },
    { status: 500 }
  );
}
```

### 6.2: Modificare `app/api/supabase/save-match/route.js`

Sostituisci l'inserimento diretto con chiamata RPC:

```javascript
// Invece di INSERT diretto, usa:
const { data: result, error: rpcError } = await admin.rpc(
  'save_match_with_patterns',
  {
    p_user_id: userId,
    p_match_data: matchData,
    p_calculate_patterns: true
  }
);

if (rpcError) {
  return NextResponse.json(
    { error: rpcError.message },
    { status: 500 }
  );
}

const matchId = result.match_id;
```

---

## ✅ CHECKLIST VERIFICA

Dopo aver completato tutto:

- [ ] Funzione `atomic_slot_assignment` creata e testata
- [ ] Funzione `save_match_with_patterns` creata e testata
- [ ] Funzione `calculate_tactical_patterns_for_user` creata
- [ ] Indici creati
- [ ] API route `assign-player-to-slot` modificata per usare RPC
- [ ] API route `save-match` modificata per usare RPC
- [ ] Test manuale: assegna stesso slot da due tab contemporaneamente
- [ ] Test manuale: salva partita e verifica pattern aggiornati

---

## 🆘 IN CASO DI ERRORI

### Errore: "function does not exist"
Verifica che la funzione sia stata creata nello schema `public` e che l'utente abbia i permessi.

### Errore: "permission denied"
Aggiungi permessi:
```sql
GRANT EXECUTE ON FUNCTION atomic_slot_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION save_match_with_patterns TO authenticated;
```

### Errore: "advisory lock not available"
Questo è normale, i lock sono per sessione. La funzione funziona comunque.

---

**Priorità:** Alta (bloccante per go-live)
**Tempo stimato:** 30-45 minuti
**Testing richiesto:** Sì, verificare race condition
