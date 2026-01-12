// Export centralizzato di tutti i servizi
// Mantiene coerenza negli endpoint e gestione errori

export * from './visionService'
export * from './rosaService'
export * from './playerService'
export * from './coachingService'

// Re-export supabase client per comodità
export { supabase } from '../lib/supabase'
