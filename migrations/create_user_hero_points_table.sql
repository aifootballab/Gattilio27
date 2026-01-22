-- ============================================
-- MIGRAZIONE: Tabella user_hero_points per sistema crediti
-- Data: 2025
-- ============================================

-- 1. CREA TABELLA user_hero_points
-- ============================================
CREATE TABLE IF NOT EXISTS user_hero_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Balance
  hero_points_balance INTEGER DEFAULT 0 CHECK (hero_points_balance >= 0),
  euros_equivalent DECIMAL(10,2) GENERATED ALWAYS AS (hero_points_balance::DECIMAL / 100) STORED, -- 100 HP = 1€
  
  -- Starter Pack (Crediti Iniziali Gratuiti)
  starter_pack_claimed BOOLEAN DEFAULT false, -- Se utente ha già ricevuto starter pack
  starter_pack_amount INTEGER DEFAULT 1000, -- Quantità crediti starter pack (1000 HP = 10€)
  
  -- Metadata (Pagamento - FUTURO)
  last_purchase_at TIMESTAMPTZ,
  total_purchased INTEGER DEFAULT 0, -- Totale hero points acquistati (storico) - FUTURO
  total_spent INTEGER DEFAULT 0, -- Totale hero points spesi (storico)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_hero_points UNIQUE (user_id)
);

-- 2. INDICI per performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_hero_points_user_id ON user_hero_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hero_points_balance ON user_hero_points(hero_points_balance);

-- 3. RLS POLICIES (pattern esistente con (select auth.uid()))
-- ============================================
ALTER TABLE user_hero_points ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own hero points" ON user_hero_points;
CREATE POLICY "Users can view own hero points"
ON user_hero_points FOR SELECT
USING ((select auth.uid()) = user_id);

-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own hero points" ON user_hero_points;
CREATE POLICY "Users can update own hero points"
ON user_hero_points FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- INSERT Policy (per assegnazione starter pack da API)
DROP POLICY IF EXISTS "Users can insert own hero points" ON user_hero_points;
CREATE POLICY "Users can insert own hero points"
ON user_hero_points FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- NOTE IMPORTANTI
-- ============================================
-- 1. Starter Pack:
--    - NON può essere assegnato automaticamente via trigger su auth.users (Supabase non lo permette)
--    - Verrà assegnato manualmente alla prima chiamata a /api/hero-points/balance
--    - L'API controllerà se starter_pack_claimed = false e lo assegnerà
--
-- 2. Race Condition Protection:
--    - Il constraint CHECK (hero_points_balance >= 0) previene balance negativo
--    - Le operazioni di sottrazione devono essere atomiche (usare transazioni BEGIN/COMMIT)
--    - L'API dovrà usare SELECT FOR UPDATE per lockare la riga durante operazioni critiche
--
-- 3. Transazioni Atomiche:
--    - Quando si sottraggono crediti, usare transazione:
--      BEGIN;
--      UPDATE user_hero_points SET hero_points_balance = hero_points_balance - X WHERE user_id = ...;
--      INSERT INTO hero_points_transactions ...;
--      COMMIT;
--    - Se operazione fallisce, fare ROLLBACK per non perdere crediti
--
-- 4. Verifiche Post-Migrazione:
--    - Verificare constraint: tentare UPDATE con balance negativo (dovrebbe fallire)
--    - Verificare RLS: utente A non può vedere/modificare crediti di utente B
--    - Verificare computed column: euros_equivalent = hero_points_balance / 100
