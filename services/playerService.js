// Service per gestire operazioni Giocatori su Supabase
// Endpoint coerenti per players_base e player_builds

import { supabase } from '@/lib/supabase'

/**
 * Cerca giocatore in players_base
 */
export async function searchPlayer(query) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('players_base')
    .select('*')
    .ilike('player_name', `%${query}%`)
    .limit(20)

  if (error) {
    throw new Error(`Errore ricerca giocatore: ${error.message}`)
  }

  return data || []
}

/**
 * Ottieni giocatore base per ID
 */
export async function getPlayerBase(playerBaseId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('players_base')
    .select('*')
    .eq('id', playerBaseId)
    .single()

  if (error) {
    throw new Error(`Errore recupero giocatore: ${error.message}`)
  }

  return data
}

/**
 * Crea o aggiorna player build
 */
export async function upsertPlayerBuild(buildData) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { data, error } = await supabase
    .from('player_builds')
    .upsert({
      user_id: tempUserId, // session.user.id,
      player_base_id: buildData.player_base_id,
      development_points: buildData.development_points || {},
      active_booster_id: buildData.active_booster_id || null,
      active_booster_name: buildData.active_booster_name || null,
      current_level: buildData.current_level || null,
      level_cap: buildData.level_cap || null,
      final_stats: buildData.final_stats || null,
      final_overall_rating: buildData.final_overall_rating || null,
      final_position_ratings: buildData.final_position_ratings || null,
      source: buildData.source || 'manual',
      source_data: buildData.source_data || {}
    }, {
      onConflict: 'user_id,player_base_id'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Errore salvataggio build: ${error.message}`)
  }

  return data
}

/**
 * Ottieni build utente per giocatore
 */
export async function getPlayerBuild(playerBaseId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { data, error } = await supabase
    .from('player_builds')
    .select(`
      *,
      players_base:player_base_id (
        id,
        player_name,
        position,
        base_stats,
        skills,
        com_skills,
        position_ratings
      )
    `)
    .eq('user_id', tempUserId) // session.user.id
    .eq('player_base_id', playerBaseId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw new Error(`Errore recupero build: ${error.message}`)
  }

  return data
}

/**
 * Ottieni tutte le build dell'utente
 */
export async function getUserBuilds() {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { data, error } = await supabase
    .from('player_builds')
    .select(`
      *,
      players_base:player_base_id (
        id,
        player_name,
        position,
        base_stats,
        skills,
        com_skills,
        position_ratings
      )
    `)
    .eq('user_id', tempUserId) // session.user.id
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Errore recupero build: ${error.message}`)
  }

  return data || []
}

/**
 * Elimina build
 */
export async function deletePlayerBuild(buildId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // TEMPORANEO: Login disabilitato per sviluppo
  // const { data: { session } } = await supabase.auth.getSession()
  // if (!session) {
  //   throw new Error('Utente non autenticato')
  // }
  const tempUserId = '00000000-0000-0000-0000-000000000001' // UUID fisso per sviluppo (user_id deve essere UUID)

  const { error } = await supabase
    .from('player_builds')
    .delete()
    .eq('id', buildId)
    .eq('user_id', tempUserId) // session.user.id

  if (error) {
    throw new Error(`Errore eliminazione build: ${error.message}`)
  }

  return true
}
