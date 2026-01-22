-- ============================================
-- RESET COMPLETO HERO POINTS
-- ATTENZIONE: Questo script cancella TUTTI i dati hero points
-- Usare SOLO per debug/test
-- ============================================

-- 1. Cancella TUTTE le transazioni
DELETE FROM hero_points_transactions;

-- 2. Cancella TUTTI i record user_hero_points
DELETE FROM user_hero_points;

-- Verifica che siano vuote
SELECT 
  (SELECT COUNT(*) FROM hero_points_transactions) as transactions_count,
  (SELECT COUNT(*) FROM user_hero_points) as balance_records_count;

-- Dovrebbe restituire: transactions_count = 0, balance_records_count = 0
