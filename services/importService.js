// Service per importare giocatori da Google Drive o JSON

import { supabase } from '@/lib/supabase'

/**
 * Importa giocatori da Google Drive usando Edge Function
 */
export async function importPlayersFromDrive(googleDriveUrl, options = {}) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase.functions.invoke('import-players-from-drive', {
    body: JSON.stringify({
      google_drive_url: googleDriveUrl,
      batch_size: options.batchSize || 50
    }),
  })

  if (error) {
    throw new Error(`Errore import: ${error.message}`)
  }

  return data
}

/**
 * Importa giocatori da JSON diretto (per test o file locale)
 */
export async function importPlayersFromJSON(jsonData, options = {}) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase.functions.invoke('import-players-from-drive', {
    body: JSON.stringify({
      json_data: jsonData,
      batch_size: options.batchSize || 50
    }),
  })

  if (error) {
    throw new Error(`Errore import: ${error.message}`)
  }

  return data
}

/**
 * Ottieni suggerimenti statistici per posizione
 * Calcola stats medie per una posizione specifica
 */
export async function getPositionStats(position) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('players_base')
    .select('base_stats, position')
    .eq('position', position)
    .limit(100)

  if (error || !data || data.length === 0) {
    // Ritorna stats di default se non ci sono dati
    return getDefaultPositionStats(position)
  }

  // Calcola medie
  const stats = {
    attacking: {
      offensiveAwareness: 0, ballControl: 0, dribbling: 0, tightPossession: 0,
      lowPass: 0, loftedPass: 0, finishing: 0, heading: 0, placeKicking: 0, curl: 0
    },
    defending: {
      defensiveAwareness: 0, defensiveEngagement: 0, tackling: 0, aggression: 0,
      goalkeeping: 0, gkCatching: 0, gkParrying: 0, gkReflexes: 0, gkReach: 0
    },
    athleticism: {
      speed: 0, acceleration: 0, kickingPower: 0, jump: 0,
      physicalContact: 0, balance: 0, stamina: 0
    }
  }

  let count = 0
  for (const player of data) {
    const baseStats = player.base_stats || {}
    if (baseStats.attacking) {
      Object.keys(stats.attacking).forEach(key => {
        stats.attacking[key] += baseStats.attacking[key] || 0
      })
      count++
    }
  }

  if (count > 0) {
    Object.keys(stats.attacking).forEach(key => {
      stats.attacking[key] = Math.round(stats.attacking[key] / count)
    })
    Object.keys(stats.defending).forEach(key => {
      stats.defending[key] = Math.round(
        data.reduce((sum, p) => sum + (p.base_stats?.defending?.[key] || 0), 0) / count
      )
    })
    Object.keys(stats.athleticism).forEach(key => {
      stats.athleticism[key] = Math.round(
        data.reduce((sum, p) => sum + (p.base_stats?.athleticism?.[key] || 0), 0) / count
      )
    })
  }

  return stats
}

/**
 * Stats di default per posizione (se non ci sono dati nel database)
 */
function getDefaultPositionStats(position) {
  const defaults = {
    GK: {
      attacking: { offensiveAwareness: 40, ballControl: 45, dribbling: 40, tightPossession: 40, lowPass: 50, loftedPass: 60, finishing: 35, heading: 40, placeKicking: 45, curl: 40 },
      defending: { defensiveAwareness: 50, defensiveEngagement: 45, tackling: 50, aggression: 45, goalkeeping: 85, gkCatching: 85, gkParrying: 85, gkReflexes: 85, gkReach: 85 },
      athleticism: { speed: 45, acceleration: 45, kickingPower: 75, jump: 80, physicalContact: 70, balance: 65, stamina: 70 }
    },
    CB: {
      attacking: { offensiveAwareness: 50, ballControl: 60, dribbling: 50, tightPossession: 55, lowPass: 70, loftedPass: 65, finishing: 40, heading: 75, placeKicking: 45, curl: 45 },
      defending: { defensiveAwareness: 85, defensiveEngagement: 85, tackling: 85, aggression: 80, goalkeeping: 40, gkCatching: 40, gkParrying: 40, gkReflexes: 40, gkReach: 40 },
      athleticism: { speed: 60, acceleration: 60, kickingPower: 75, jump: 80, physicalContact: 85, balance: 70, stamina: 75 }
    },
    AMF: {
      attacking: { offensiveAwareness: 80, ballControl: 85, dribbling: 80, tightPossession: 82, lowPass: 85, loftedPass: 80, finishing: 70, heading: 60, placeKicking: 70, curl: 75 },
      defending: { defensiveAwareness: 55, defensiveEngagement: 50, tackling: 50, aggression: 45, goalkeeping: 40, gkCatching: 40, gkParrying: 40, gkReflexes: 40, gkReach: 40 },
      athleticism: { speed: 70, acceleration: 75, kickingPower: 70, jump: 65, physicalContact: 60, balance: 80, stamina: 75 }
    },
    CF: {
      attacking: { offensiveAwareness: 85, ballControl: 80, dribbling: 75, tightPossession: 75, lowPass: 70, loftedPass: 65, finishing: 85, heading: 80, placeKicking: 75, curl: 80 },
      defending: { defensiveAwareness: 45, defensiveEngagement: 40, tackling: 40, aggression: 50, goalkeeping: 40, gkCatching: 40, gkParrying: 40, gkReflexes: 40, gkReach: 40 },
      athleticism: { speed: 75, acceleration: 80, kickingPower: 85, jump: 75, physicalContact: 75, balance: 75, stamina: 70 }
    }
  }

  return defaults[position] || defaults.AMF
}

/**
 * Ottieni skills comuni per posizione
 */
export async function getCommonSkillsForPosition(position) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('players_base')
    .select('skills')
    .eq('position', position)
    .limit(100)

  if (error || !data || data.length === 0) {
    return []
  }

  // Conta frequenza skills
  const skillCounts = {}
  data.forEach(player => {
    if (Array.isArray(player.skills)) {
      player.skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1
      })
    }
  })

  // Ritorna skills più comuni (appare in >20% dei giocatori)
  const threshold = data.length * 0.2
  return Object.entries(skillCounts)
    .filter(([_, count]) => count >= threshold)
    .sort(([_, a], [__, b]) => b - a)
    .map(([skill, _]) => skill)
}
