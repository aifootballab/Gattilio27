-- ============================================
-- MIGRAZIONE: Tabella hero_points_transactions per storico transazioni crediti
-- Data: 2025
-- ============================================

-- 1. CREA TABELLA hero_points_transactions
-- ============================================
CREATE TABLE IF NOT EXISTS hero_points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo Transazione
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'spent', 'refund')),
  
  -- Dettagli
  hero_points_amount INTEGER NOT NULL, -- Positivo per purchase/refund, negativo per spent
  euros_amount DECIMAL(10,2), -- Per purchase: quanto pagato
  
  -- Riferimento Operazione
  operation_type TEXT, -- "extract_player", "analyze_match", "realtime_coach", etc.
  operation_id UUID, -- ID dell'operazione (match_id, session_id, etc.)
  
  -- Balance Dopo Transazione
  balance_after INTEGER NOT NULL,
  
  -- Metadata
  description TEXT, -- Descrizione transazione
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_hero_points_transactions_user_id ON hero_points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_hero_points_transactions_created_at ON hero_points_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hero_points_transactions_type ON hero_points_transactions(transaction_type);

-- Indice composito per query comuni (utente + tipo + data)
CREATE INDEX IF NOT EXISTS idx_hero_points_transactions_user_type_date ON hero_points_transactions(user_id, transaction_type, created_at DESC);

-- 3. RLS POLICIES (pattern esistente con (select auth.uid()))
-- ============================================
ALTER TABLE hero_points_transactions ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own transactions" ON hero_points_transactions;
CREATE POLICY "Users can view own transactions"
ON hero_points_transactions FOR SELECT
USING ((select auth.uid()) = user_id);

-- INSERT Policy (solo sistema può inserire, utente no)
-- NOTA: L'API backend inserirà le transazioni, quindi non serve policy INSERT per utente
-- Se necessario in futuro, si può aggiungere una policy per INSERT con WITH CHECK

-- ============================================
-- NOTE IMPORTANTI
-- ============================================
-- 1. Tipi di Transazione:
--    - 'purchase': Acquisto crediti (hero_points_amount positivo, euros_amount presente)
--    - 'spent': Consumo crediti (hero_points_amount negativo, operation_type/operation_id presenti)
--    - 'refund': Rimborso crediti (hero_points_amount positivo, operation_type/operation_id presenti)
--
-- 2. Balance After:
--    - Deve essere sempre aggiornato al momento della transazione
--    - L'API dovrà calcolarlo: balance_after = balance_prima + hero_points_amount
--
-- 3. Operazioni:
--    - operation_type: tipo operazione che ha consumato crediti (es. "analyze_match", "realtime_coach")
--    - operation_id: ID dell'operazione (es. match_id, session_id)
--    - Utile per tracciare quale operazione ha consumato crediti
--
-- 4. Verifiche Post-Migrazione:
--    - Verificare constraint: tentare INSERT con transaction_type non valido (dovrebbe fallire)
--    - Verificare RLS: utente A non può vedere transazioni di utente B
--    - Verificare indici: query per storico utente dovrebbero essere veloci
