// Service per gestire operazioni Manager (Allenatori) su Supabase
// Endpoint coerenti per managers e manager_style_competency

import { supabase } from '@/lib/supabase'

/**
 * Cerca allenatore per nome
 */
export async function searchManager(query) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('managers')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('overall_rating', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Errore ricerca allenatore: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni allenatore completo con competenze stile
 */
export async function getManager(managerId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Ottieni manager
  const { data: manager, error: managerError } = await supabase
    .from('managers')
    .select('*')
    .eq('id', managerId)
    .single()

  if (managerError || !manager) {
    throw new Error(`Errore recupero allenatore: ${managerError?.message}`)
  }

  // Ottieni competenze stile
  const { data: competencies, error: compError } = await supabase
    .from('manager_style_competency')
    .select(`
      *,
      team_playing_styles (
        id,
        name,
        category,
        description
      )
    `)
    .eq('manager_id', managerId)
    .order('competency_level', { ascending: false })

  if (compError) {
    console.warn('Errore recupero competenze:', compError)
  }

  return {
    ...manager,
    style_competencies: competencies || []
  }
}

/**
 * Ottieni competenze stile di un allenatore
 */
export async function getManagerStyles(managerId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('manager_style_competency')
    .select(`
      *,
      team_playing_styles (
        id,
        name,
        category,
        description
      )
    `)
    .eq('manager_id', managerId)
    .order('competency_level', { ascending: false })

  if (error) {
    throw new Error(`Errore recupero competenze: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni allenatori per stile di gioco
 */
export async function getManagersByStyle(styleId, minCompetency = 70) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('manager_style_competency')
    .select(`
      *,
      managers (
        id,
        name,
        overall_rating,
        preferred_formation
      ),
      team_playing_styles (
        id,
        name,
        category
      )
    `)
    .eq('team_playing_style_id', styleId)
    .gte('competency_level', minCompetency)
    .order('competency_level', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Errore recupero allenatori per stile: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni tutti gli stili di gioco squadra disponibili
 */
export async function getTeamPlayingStyles(category = null) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  let query = supabase
    .from('team_playing_styles')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Errore recupero stili squadra: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni tutti i playing styles disponibili
 */
export async function getPlayingStyles(category = null) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  let query = supabase
    .from('playing_styles')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Errore recupero playing styles: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni playing styles compatibili con una posizione
 */
export async function getPlayingStylesForPosition(position) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('playing_styles')
    .select('*')
    .contains('compatible_positions', [position])
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Errore recupero playing styles per posizione: ${error.message}`)
  }

  return data || []
}
