// Service per calcolo Forza Base e Forza Complessiva
// Implementa formula: Forza Complessiva = Base + Alchimia + Competenza + Playing Style + Manager

import { supabase } from '@/lib/supabase'
import { getRosaById } from './rosaService'

/**
 * Calcola Forza Base di una rosa
 * Forza Base = Somma delle abilità individuali dei giocatori
 */
export async function calculateBaseStrength(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Ottieni rosa con giocatori
  const rosa = await getRosaById(rosaId)
  if (!rosa || !rosa.players || rosa.players.length === 0) {
    return { base_strength: 0, breakdown: {} }
  }

  let totalStrength = 0
  const breakdown = {
    players_count: 0,
    total_rating: 0,
    avg_rating: 0
  }

  // Calcola somma overall rating dei giocatori
  for (const player of rosa.players) {
    if (!player) continue

    const overall = player.build?.final_overall_rating || 
                    player.base?.base_stats?.overall_rating || 0
    
    totalStrength += overall
    breakdown.total_rating += overall
    breakdown.players_count++
  }

  breakdown.avg_rating = breakdown.players_count > 0 
    ? Math.round(breakdown.total_rating / breakdown.players_count) 
    : 0

  return {
    base_strength: totalStrength,
    breakdown
  }
}

/**
 * Calcola Forza Complessiva di una rosa
 * Forza Complessiva = Base + Alchimia + Competenza + Playing Style + Manager
 */
export async function calculateOverallStrength(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Ottieni rosa
  const { data: rosa, error: rosaError } = await supabase
    .from('user_rosa')
    .select(`
      *,
      managers (*),
      team_playing_styles (*)
    `)
    .eq('id', rosaId)
    .single()

  if (rosaError || !rosa) {
    throw new Error(`Errore recupero rosa: ${rosaError?.message}`)
  }

  // Calcola Forza Base
  const baseStrength = await calculateBaseStrength(rosaId)
  
  // Calcola Bonus Sinergie (Alchimia)
  const synergyBonus = await calculateSynergyBonus(rosaId)
  
  // Calcola Bonus Competenza Posizione
  const competencyBonus = await calculatePositionCompetencyBonus(rosaId)
  
  // Calcola Bonus Playing Style
  const playingStyleBonus = await calculatePlayingStyleBonus(rosaId)
  
  // Calcola Bonus Manager
  const managerBonus = await calculateManagerBonus(rosaId, rosa.manager_id, rosa.team_playing_style_id)

  // Calcola Forza Complessiva
  const overallStrength = Math.round(
    baseStrength.base_strength +
    synergyBonus +
    competencyBonus +
    playingStyleBonus +
    managerBonus
  )

  // Aggiorna rosa con calcoli
  await supabase
    .from('user_rosa')
    .update({
      base_strength: baseStrength.base_strength,
      overall_strength: overallStrength,
      synergy_bonus: synergyBonus,
      position_competency_bonus: competencyBonus,
      playing_style_bonus: playingStyleBonus,
      manager_bonus: managerBonus,
      updated_at: new Date().toISOString()
    })
    .eq('id', rosaId)

  return {
    base_strength: baseStrength.base_strength,
    overall_strength: overallStrength,
    breakdown: {
      base: baseStrength.base_strength,
      synergy_bonus: synergyBonus,
      position_competency_bonus: competencyBonus,
      playing_style_bonus: playingStyleBonus,
      manager_bonus: managerBonus
    }
  }
}

/**
 * Calcola Bonus Sinergie (Alchimia di squadra)
 * Somma synergy_bonus da player_links
 */
async function calculateSynergyBonus(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Ottieni rosa con player_build_ids
  const { data: rosa, error: rosaError } = await supabase
    .from('user_rosa')
    .select('player_build_ids')
    .eq('id', rosaId)
    .single()

  if (rosaError || !rosa || !rosa.player_build_ids || rosa.player_build_ids.length === 0) {
    return 0
  }

  // Ottieni player_base_ids dai builds
  const validIds = rosa.player_build_ids.filter(id => id !== null)
  if (validIds.length === 0) return 0

  const { data: builds, error: buildsError } = await supabase
    .from('player_builds')
    .select('player_base_id')
    .in('id', validIds)

  if (buildsError || !builds || builds.length === 0) {
    return 0
  }

  const playerBaseIds = builds.map(b => b.player_base_id).filter(Boolean)
  if (playerBaseIds.length < 2) return 0

  // Calcola sinergie tra tutte le coppie di giocatori
  let totalSynergy = 0
  for (let i = 0; i < playerBaseIds.length; i++) {
    for (let j = i + 1; j < playerBaseIds.length; j++) {
      const { data: links, error: linksError } = await supabase
        .from('player_links')
        .select('synergy_bonus')
        .or(`and(player_1_id.eq.${playerBaseIds[i]},player_2_id.eq.${playerBaseIds[j]}),and(player_1_id.eq.${playerBaseIds[j]},player_2_id.eq.${playerBaseIds[i]})`)
        .limit(1)

      if (!linksError && links && links.length > 0) {
        totalSynergy += parseFloat(links[0].synergy_bonus || 0)
      }
    }
  }

  return Math.round(totalSynergy)
}

/**
 * Calcola Bonus Competenza Posizione
 * Media competency_level dei giocatori in posizione
 */
async function calculatePositionCompetencyBonus(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Ottieni rosa con giocatori
  const rosa = await getRosaById(rosaId)
  if (!rosa || !rosa.players || rosa.players.length === 0) {
    return 0
  }

  let totalCompetency = 0
  let count = 0

  for (const player of rosa.players) {
    if (!player || !player.base) continue

    const playerBaseId = player.base.id
    const position = player.base.position

    if (!position) continue

    // Ottieni competenza posizione
    const { data: competency, error: compError } = await supabase
      .from('position_competency')
      .select('competency_level')
      .eq('player_base_id', playerBaseId)
      .eq('position', position)
      .single()

    if (!compError && competency) {
      // Competenza: 0=Basso, 1=Intermedio, 2=Alto
      // Bonus: 0, 5, 10 per livello
      const bonus = competency.competency_level * 5
      totalCompetency += bonus
      count++
    } else {
      // Default: competenza alta (2) per posizione principale
      totalCompetency += 10
      count++
    }
  }

  return count > 0 ? Math.round(totalCompetency / count) : 0
}

/**
 * Calcola Bonus Playing Style
 * Verifica compatibilità playing style con posizione
 */
async function calculatePlayingStyleBonus(rosaId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Ottieni rosa con giocatori
  const rosa = await getRosaById(rosaId)
  if (!rosa || !rosa.players || rosa.players.length === 0) {
    return 0
  }

  let totalBonus = 0
  let count = 0

  for (const player of rosa.players) {
    if (!player || !player.base) continue

    const playingStyleId = player.base.playing_style_id
    const position = player.base.position

    if (!playingStyleId || !position) {
      count++
      continue
    }

    // Verifica compatibilità
    const { data: playingStyle, error: styleError } = await supabase
      .from('playing_styles')
      .select('compatible_positions')
      .eq('id', playingStyleId)
      .single()

    if (!styleError && playingStyle) {
      const isCompatible = playingStyle.compatible_positions?.includes(position)
      totalBonus += isCompatible ? 5 : 0  // Bonus +5 se compatibile
      count++
    } else {
      count++
    }
  }

  return count > 0 ? Math.round(totalBonus) : 0
}

/**
 * Calcola Bonus Manager
 * Competenza manager per stile di gioco squadra
 */
async function calculateManagerBonus(rosaId, managerId, teamPlayingStyleId) {
  if (!supabase || !managerId || !teamPlayingStyleId) {
    return 0
  }

  // Ottieni competenza manager per stile
  const { data: competency, error: compError } = await supabase
    .from('manager_style_competency')
    .select('competency_level')
    .eq('manager_id', managerId)
    .eq('team_playing_style_id', teamPlayingStyleId)
    .single()

  if (compError || !competency) {
    return 0
  }

  // Competenza: 0-100
  // Bonus: 0-20 (20% di competenza)
  const bonus = Math.round(competency.competency_level * 0.2)
  
  return bonus
}

/**
 * Ottieni breakdown dettagliato calcolo forza
 */
export async function getStrengthBreakdown(rosaId) {
  const overall = await calculateOverallStrength(rosaId)
  return overall.breakdown
}
