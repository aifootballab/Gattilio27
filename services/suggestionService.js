// Service per Sistema Suggerimenti Intelligenti
// Identifica debolezze e genera suggerimenti per ottimizzazione rosa

import { supabase } from '@/lib/supabase'
import { getRosaById } from './rosaService'
import { calculateOverallStrength } from './strengthService'

/**
 * Identifica debolezze in una rosa
 */
export async function identifyWeaknesses(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const weaknesses = []
  const rosa = await getRosaById(rosaId)
  
  if (!rosa || !rosa.players || rosa.players.length === 0) {
    return weaknesses
  }

  // 1. Verifica competenza posizione bassa
  for (let i = 0; i < rosa.players.length; i++) {
    const player = rosa.players[i]
    if (!player || !player.base) continue

    const playerBaseId = player.base.id
    const position = player.base.position

    if (!position) continue

    const { data: competency, error: compError } = await supabase
      .from('position_competency')
      .select('competency_level')
      .eq('player_base_id', playerBaseId)
      .eq('position', position)
      .single()

    if (!compError && competency && competency.competency_level < 2) {
      weaknesses.push({
        type: 'low_position_competency',
        severity: competency.competency_level === 0 ? 'high' : 'medium',
        player: player.base.player_name,
        position: position,
        slot: i,
        current_level: competency.competency_level,
        recommended_level: 2,
        message: `Giocatore ${player.base.player_name} ha competenza ${competency.competency_level === 0 ? 'bassa' : 'intermedia'} in posizione ${position}`
      })
    }
  }

  // 2. Verifica playing style incompatibile
  for (let i = 0; i < rosa.players.length; i++) {
    const player = rosa.players[i]
    if (!player || !player.base) continue

    const playingStyleId = player.base.playing_style_id
    const position = player.base.position

    if (!playingStyleId || !position) continue

    const { data: playingStyle, error: styleError } = await supabase
      .from('playing_styles')
      .select('compatible_positions, name')
      .eq('id', playingStyleId)
      .single()

    if (!styleError && playingStyle) {
      const isCompatible = playingStyle.compatible_positions?.includes(position)
      if (!isCompatible) {
        weaknesses.push({
          type: 'incompatible_playing_style',
          severity: 'high',
          player: player.base.player_name,
          position: position,
          slot: i,
          playing_style: playingStyle.name,
          message: `Playing style "${playingStyle.name}" non è compatibile con posizione ${position}`
        })
      }
    }
  }

  // 3. Verifica manager non ottimale
  if (rosa.manager_id && rosa.team_playing_style_id) {
    const { data: competency, error: compError } = await supabase
      .from('manager_style_competency')
      .select('competency_level')
      .eq('manager_id', rosa.manager_id)
      .eq('team_playing_style_id', rosa.team_playing_style_id)
      .single()

    if (!compError && competency && competency.competency_level < 80) {
      weaknesses.push({
        type: 'suboptimal_manager',
        severity: competency.competency_level < 60 ? 'high' : 'medium',
        manager_id: rosa.manager_id,
        style_id: rosa.team_playing_style_id,
        current_competency: competency.competency_level,
        recommended_competency: 80,
        message: `Manager ha competenza ${competency.competency_level}% per questo stile di gioco (consigliato: 80%+)`
      })
    }
  }

  // 4. Verifica mancanza sinergie
  const synergyCount = await countSynergies(rosaId)
  if (synergyCount < 5) {
    weaknesses.push({
      type: 'low_synergies',
      severity: 'medium',
      current_count: synergyCount,
      recommended_count: 5,
      message: `Squadra ha solo ${synergyCount} sinergie attive (consigliato: 5+)`
    })
  }

  return weaknesses
}

/**
 * Conta sinergie attive in rosa
 */
async function countSynergies(rosaId) {
  if (!supabase) {
    return 0
  }

  // Ottieni player_base_ids dalla rosa
  const rosa = await getRosaById(rosaId)
  if (!rosa || !rosa.players || rosa.players.length < 2) {
    return 0
  }

  const playerBaseIds = rosa.players
    .filter(p => p && p.base)
    .map(p => p.base.id)
    .filter(Boolean)

  if (playerBaseIds.length < 2) return 0

  // Conta collegamenti tra giocatori
  let count = 0
  for (let i = 0; i < playerBaseIds.length; i++) {
    for (let j = i + 1; j < playerBaseIds.length; j++) {
      const { data: links, error: linksError } = await supabase
        .from('player_links')
        .select('id')
        .or(`and(player_1_id.eq.${playerBaseIds[i]},player_2_id.eq.${playerBaseIds[j]}),and(player_1_id.eq.${playerBaseIds[j]},player_2_id.eq.${playerBaseIds[i]})`)
        .limit(1)

      if (!linksError && links && links.length > 0) {
        count++
      }
    }
  }

  return count
}

/**
 * Genera suggerimenti per una rosa
 */
export async function generateSuggestions(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const weaknesses = await identifyWeaknesses(rosaId)
  const suggestions = []

  // Genera suggerimenti basati su debolezze
  for (const weakness of weaknesses) {
    switch (weakness.type) {
      case 'low_position_competency':
        suggestions.push({
          type: 'change_position',
          priority: weakness.severity === 'high' ? 3 : 2,
          title: `Sposta ${weakness.player} in posizione con competenza alta`,
          description: weakness.message,
          action: {
            type: 'change_position',
            player_slot: weakness.slot,
            current_position: weakness.position,
            recommended_positions: await getRecommendedPositions(weakness.player)
          }
        })
        break

      case 'incompatible_playing_style':
        suggestions.push({
          type: 'change_playing_style',
          priority: 3,
          title: `Cambia playing style per ${weakness.player}`,
          description: weakness.message,
          action: {
            type: 'change_playing_style',
            player_slot: weakness.slot,
            position: weakness.position,
            current_style: weakness.playing_style,
            recommended_styles: await getRecommendedPlayingStyles(weakness.position)
          }
        })
        break

      case 'suboptimal_manager':
        suggestions.push({
          type: 'change_manager',
          priority: weakness.severity === 'high' ? 3 : 2,
          title: 'Scegli manager con competenza maggiore',
          description: weakness.message,
          action: {
            type: 'change_manager',
            current_manager_id: weakness.manager_id,
            style_id: weakness.style_id,
            recommended_managers: await getRecommendedManagers(weakness.style_id)
          }
        })
        break

      case 'low_synergies':
        suggestions.push({
          type: 'add_synergies',
          priority: 2,
          title: 'Aggiungi giocatori per sinergie',
          description: weakness.message,
          action: {
            type: 'add_synergies',
            recommended_players: await getRecommendedPlayersForSynergy(rosaId)
          }
        })
        break
    }
  }

  // Ordina per priorità
  suggestions.sort((a, b) => b.priority - a.priority)

  return suggestions
}

/**
 * Ottieni posizioni consigliate per un giocatore
 */
async function getRecommendedPositions(playerBaseId) {
  if (!supabase) return []

  const { data: competencies, error } = await supabase
    .from('position_competency')
    .select('position, competency_level')
    .eq('player_base_id', playerBaseId)
    .gte('competency_level', 1)
    .order('competency_level', { ascending: false })
    .limit(3)

  if (error || !competencies) return []

  return competencies.map(c => c.position)
}

/**
 * Ottieni playing styles consigliati per una posizione
 */
async function getRecommendedPlayingStyles(position) {
  if (!supabase) return []

  const { data: styles, error } = await supabase
    .from('playing_styles')
    .select('id, name, description')
    .contains('compatible_positions', [position])
    .limit(5)

  if (error || !styles) return []

  return styles
}

/**
 * Ottieni manager consigliati per uno stile
 */
async function getRecommendedManagers(styleId) {
  if (!supabase) return []

  const { data: competencies, error } = await supabase
    .from('manager_style_competency')
    .select(`
      competency_level,
      managers (
        id,
        name,
        overall_rating,
        preferred_formation
      )
    `)
    .eq('team_playing_style_id', styleId)
    .gte('competency_level', 80)
    .order('competency_level', { ascending: false })
    .limit(5)

  if (error || !competencies) return []

  return competencies.map(c => ({
    ...c.managers,
    competency_level: c.competency_level
  }))
}

/**
 * Ottieni giocatori consigliati per sinergie
 */
async function getRecommendedPlayersForSynergy(rosaId) {
  if (!supabase) return []

  // Logica semplificata: suggerisci giocatori con stessa nazionalità/club
  const rosa = await getRosaById(rosaId)
  if (!rosa || !rosa.players || rosa.players.length === 0) return []

  // Trova nazionalità/club più comuni in rosa
  const nationalities = {}
  const clubs = {}

  for (const player of rosa.players) {
    if (!player || !player.base) continue
    if (player.base.nationality) {
      nationalities[player.base.nationality] = (nationalities[player.base.nationality] || 0) + 1
    }
    if (player.base.club_name) {
      clubs[player.base.club_name] = (clubs[player.base.club_name] || 0) + 1
    }
  }

  // Trova nazionalità/club più comune
  const topNationality = Object.entries(nationalities)
    .sort(([,a], [,b]) => b - a)[0]?.[0]
  const topClub = Object.entries(clubs)
    .sort(([,a], [,b]) => b - a)[0]?.[0]

  if (!topNationality && !topClub) return []

  // Cerca giocatori con stessa nazionalità/club non in rosa
  const existingIds = rosa.players
    .filter(p => p && p.base)
    .map(p => p.base.id)

  let query = supabase
    .from('players_base')
    .select('id, player_name, position, base_stats')
    .not('id', 'in', `(${existingIds.join(',')})`)
    .limit(10)

  if (topNationality) {
    query = query.eq('nationality', topNationality)
  } else if (topClub) {
    query = query.eq('club_name', topClub)
  }

  const { data, error } = await query

  if (error || !data) return []

  return data
}

/**
 * Ranking suggerimenti per impatto
 */
export function rankSuggestions(suggestions) {
  return suggestions.sort((a, b) => {
    // Prima per priorità
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    // Poi per tipo (manager > playing style > position > synergy)
    const typeOrder = {
      'change_manager': 4,
      'change_playing_style': 3,
      'change_position': 2,
      'add_synergies': 1
    }
    return (typeOrder[b.type] || 0) - (typeOrder[a.type] || 0)
  })
}
