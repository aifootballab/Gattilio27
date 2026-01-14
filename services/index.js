// Export centralizzato di tutti i servizi essenziali
// Mantiene coerenza negli endpoint e gestione errori

export * from './visionService'
export * from './rosaService'
export * from './playerService'
export * from './gptRealtimeService'

// Re-export supabase client per comodità
export { supabase } from '@/lib/supabase'
