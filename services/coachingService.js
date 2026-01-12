// Service per gestire coaching e analisi
// Endpoint coerenti per unified_match_contexts e coaching_suggestions

import { supabase } from '@/lib/supabase'

/**
 * Crea nuovo contesto partita
 */
export async function createMatchContext(contextData) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Utente non autenticato')
  }

  const { data, error } = await supabase
    .from('unified_match_contexts')
    .insert({
      user_id: session.user.id,
      rosa_id: contextData.rosa_id || null,
      image_id: contextData.image_id || null,
      image_url: contextData.image_url || null,
      image_type: contextData.image_type || null,
      image_extracted_data: contextData.image_extracted_data || null,
      audio_id: contextData.audio_id || null,
      audio_url: contextData.audio_url || null,
      transcription: contextData.transcription || null,
      voice_semantic_analysis: contextData.voice_semantic_analysis || null,
      derived_insights: contextData.derived_insights || null,
      game_state: contextData.game_state || null,
      session_metadata: contextData.session_metadata || null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Errore creazione contesto: ${error.message}`)
  }

  return data
}

/**
 * Ottieni contesti partita dell'utente
 */
export async function getMatchContexts(limit = 10) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Utente non autenticato')
  }

  const { data, error } = await supabase
    .from('unified_match_contexts')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Errore recupero contesti: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni suggerimenti coaching per contesto
 */
export async function getCoachingSuggestions(contextId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('coaching_suggestions')
    .select('*')
    .eq('context_id', contextId)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Errore recupero suggerimenti: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni suggerimenti coaching per rosa
 */
export async function getRosaCoachingSuggestions(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('coaching_suggestions')
    .select('*')
    .eq('rosa_id', rosaId)
    .order('priority', { ascending: false })

  if (error) {
    throw new Error(`Errore recupero suggerimenti: ${error.message}`)
  }

  return data || []
}
