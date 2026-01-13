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
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error(`Errore ricerca giocatore: ${error.message}`)
  }

  return data || []
}

/**
 * Estrae dati base da un player_base per precompilazione
 * Esclude dati specifici della carta (build, booster, level)
 */
export function extractBaseData(playerBase) {
  if (!playerBase) return null

  const baseStats = playerBase.base_stats || {}
  
  return {
    player_name: playerBase.player_name,
    position: playerBase.position || 'CF',
    height: playerBase.height,
    weight: playerBase.weight,
    age: playerBase.age,
    nationality: playerBase.nationality || '',
    club_name: playerBase.club_name || '',
    card_type: playerBase.card_type || 'Standard',
    era: playerBase.era || '',
    team: playerBase.team || '',
    preferredFoot: playerBase.metadata?.preferred_foot || 'right',
    // Stats base (senza modifiche build)
    attacking: baseStats.attacking || {
      offensiveAwareness: 0, ballControl: 0, dribbling: 0, tightPossession: 0,
      lowPass: 0, loftedPass: 0, finishing: 0, heading: 0, placeKicking: 0, curl: 0
    },
    defending: baseStats.defending || {
      defensiveAwareness: 0, defensiveEngagement: 0, tackling: 0, aggression: 0,
      goalkeeping: 0, gkCatching: 0, gkParrying: 0, gkReflexes: 0, gkReach: 0
    },
    athleticism: baseStats.athleticism || {
      speed: 0, acceleration: 0, kickingPower: 0, jump: 0, physicalContact: 0,
      balance: 0, stamina: 0, weakFootUsage: 4, weakFootAccuracy: 4, form: 8, injuryResistance: 2
    },
    // Skills BASE (quelle standard del giocatore, non aggiunte)
    skills: Array.isArray(playerBase.skills) ? [...playerBase.skills] : [],
    comSkills: Array.isArray(playerBase.com_skills) ? [...playerBase.com_skills] : [],
    // Metadata
    metadata: playerBase.metadata || {}
  }
}

/**
 * Ottieni template giocatore più rappresentativo per nome
 * Usa il giocatore più recente o con più build come template
 */
export async function getPlayerBaseTemplate(playerName) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Cerca giocatore più recente con quel nome
  const { data, error } = await supabase
    .from('players_base')
    .select('*')
    .ilike('player_name', `%${playerName}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // Se non trovato, ritorna null (utente inserirà manualmente)
    return null
  }

  return data
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
      onConflict: 'player_builds_user_id_player_base_id_key'
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

/**
 * Crea o aggiorna player_base
 */
export async function upsertPlayerBase(playerBaseData) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Estrai campi separati e base_stats
  const {
    player_name,
    position,
    height,
    weight,
    age,
    nationality,
    club_name,
    card_type,
    era,
    team,
    base_stats,
    skills,
    com_skills,
    position_ratings,
    metadata,
    source
  } = playerBaseData

  // Prepara oggetto per insert/update
  const playerData = {
    player_name,
    position: position || null,
    height: height || null,
    weight: weight || null,
    age: age || null,
    nationality: nationality || null,
    club_name: club_name || null,
    card_type: card_type || null,
    era: era || null,
    team: team || null,
    base_stats: base_stats || {},
    skills: skills || [],
    com_skills: com_skills || [],
    position_ratings: position_ratings || {},
    metadata: metadata || {},
    source: source || 'manual'
  }

  // Cerca se esiste già un player con lo stesso nome
  const { data: existing } = await supabase
    .from('players_base')
    .select('id')
    .ilike('player_name', player_name)
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Aggiorna player esistente
    const { data, error } = await supabase
      .from('players_base')
      .update({
        ...playerData,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Errore aggiornamento player: ${error.message}`)
    }

    return data
  } else {
    // Crea nuovo player
    const { data, error } = await supabase
      .from('players_base')
      .insert(playerData)
      .select()
      .single()

    if (error) {
      throw new Error(`Errore creazione player: ${error.message}`)
    }

    return data
  }
}

/**
 * Crea player_base e build insieme (operazione completa)
 */
export async function createPlayerWithBuild(playerData) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const tempUserId = '00000000-0000-0000-0000-000000000001'

  // 1. Crea o aggiorna player_base
  const playerBase = await upsertPlayerBase({
    player_name: playerData.player_name,
    position: playerData.position,
    height: playerData.height,
    weight: playerData.weight,
    age: playerData.age,
    nationality: playerData.nationality,
    club_name: playerData.club_name,
    card_type: playerData.card_type,
    era: playerData.era,
    team: playerData.team,
    base_stats: playerData.base_stats || {},
    skills: playerData.skills || [],
    com_skills: playerData.com_skills || [],
    position_ratings: playerData.position_ratings || {},
    metadata: playerData.metadata || {},
    source: playerData.source || 'manual'
  })

  // 2. Crea build
  const build = await upsertPlayerBuild({
    player_base_id: playerBase.id,
    development_points: playerData.development_points || {},
    current_level: playerData.current_level,
    level_cap: playerData.level_cap,
    active_booster_id: playerData.active_booster_id,
    active_booster_name: playerData.active_booster_name,
    final_stats: playerData.final_stats || {},
    final_overall_rating: playerData.final_overall_rating,
    source: playerData.source || 'manual',
    source_data: playerData.source_data || {}
  })

  return {
    player_base: playerBase,
    build: build
  }
}
