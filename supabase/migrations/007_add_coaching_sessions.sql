-- ============================================
-- MIGRATION: Coaching Sessions Table
-- Tabella per gestire sessioni coaching persistenti
-- ============================================

-- ============================================
-- TABLE: coaching_sessions
-- Sessioni coaching persistenti per GPT-Realtime
-- ============================================

CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session ID univoco (usato da OpenAI Realtime API)
  session_id TEXT UNIQUE NOT NULL,
  
  -- Context della sessione (rosa, profilo utente, etc.)
  context JSONB DEFAULT '{}',
  
  -- Stato sessione
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Scadenza sessione (opzionale)
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Indici coaching_sessions
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_session_id ON coaching_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_is_active ON coaching_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_expires_at ON coaching_sessions(expires_at);

-- Trigger per updated_at
CREATE OR REPLACE FUNCTION update_coaching_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coaching_sessions_updated_at
  BEFORE UPDATE ON coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_sessions_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti possono vedere solo le proprie sessioni
CREATE POLICY "Users can view own coaching sessions"
  ON coaching_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Utenti possono creare solo le proprie sessioni
CREATE POLICY "Users can insert own coaching sessions"
  ON coaching_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Utenti possono aggiornare solo le proprie sessioni
CREATE POLICY "Users can update own coaching sessions"
  ON coaching_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Utenti possono eliminare solo le proprie sessioni
CREATE POLICY "Users can delete own coaching sessions"
  ON coaching_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- COMMENTI
-- ============================================

COMMENT ON TABLE coaching_sessions IS 'Sessioni coaching persistenti per GPT-Realtime API';
COMMENT ON COLUMN coaching_sessions.session_id IS 'ID sessione univoco usato da OpenAI Realtime API';
COMMENT ON COLUMN coaching_sessions.context IS 'Contesto sessione (rosa, profilo utente, conversazione, etc.)';
COMMENT ON COLUMN coaching_sessions.is_active IS 'Indica se la sessione è attiva o chiusa';
