// Service per gestire CandidateProfile e salvataggio dopo conferma utente

import { supabase } from '@/lib/supabase'

/**
 * Conferma CandidateProfile e salva in database
 * Estrae dati deterministici → players_base
 * Estrae dati configurabili → player_builds
 */
export async function confirmCandidateProfile(candidateProfileId, userId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // 1. Recupera CandidateProfile
  const { data: candidateProfile, error: fetchError } = await supabase
    .from('candidate_profiles')
    .select('*')
    .eq('id', candidateProfileId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !candidateProfile) {
    throw new Error(`CandidateProfile non trovato: ${fetchError?.message}`)
  }

  // 2. Estrai dati deterministici per players_base
  const playerBaseData = extractDeterministicData(candidateProfile.candidate_data)

  // 3. Estrai dati configurabili per player_builds
  const playerBuildData = extractConfigurableData(candidateProfile.candidate_data)

  // 4. Crea/aggiorna players_base
  let playerBaseId = null
  if (playerBaseData.player_name) {
    // Cerca giocatore esistente
    const { data: existingPlayer } = await supabase
      .from('players_base')
      .select('id')
      .eq('player_name', playerBaseData.player_name)
      .limit(1)
      .single()

    if (existingPlayer) {
      playerBaseId = existingPlayer.id
      // Aggiorna solo campi mancanti
      await supabase
        .from('players_base')
        .update(playerBaseData)
        .eq('id', playerBaseId)
    } else {
      // Crea nuovo giocatore
      const { data: newPlayer, error: insertError } = await supabase
        .from('players_base')
        .insert(playerBaseData)
        .select()
        .single()

      if (insertError) {
        throw new Error(`Errore creazione players_base: ${insertError.message}`)
      }

      playerBaseId = newPlayer.id
    }
  }

  // 5. Crea player_build (solo se abbiamo playerBaseId)
  let playerBuildId = null
  if (playerBaseId && playerBuildData) {
    const buildData = {
      user_id: userId,
      player_base_id: playerBaseId,
      ...playerBuildData,
      source: 'screenshot_gpt',
      source_data: {
        candidate_profile_id: candidateProfileId,
        screenshot_log_id: candidateProfile.screenshot_log_id
      }
    }

    const { data: newBuild, error: buildError } = await supabase
      .from('player_builds')
      .insert(buildData)
      .select()
      .single()

    if (buildError) {
      throw new Error(`Errore creazione player_build: ${buildError.message}`)
    }

    playerBuildId = newBuild.id
  }

  // 6. Aggiorna candidate_profiles a stato 'confirmed'
  await supabase
    .from('candidate_profiles')
    .update({
      profile_state: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', candidateProfileId)

  // 7. Aggiorna screenshot_processing_log
  if (candidateProfile.screenshot_log_id) {
    await supabase
      .from('screenshot_processing_log')
      .update({
        matched_player_id: playerBaseId,
        candidate_profile_id: candidateProfileId
      })
      .eq('id', candidateProfile.screenshot_log_id)
  }

  return {
    candidate_profile_id: candidateProfileId,
    player_base_id: playerBaseId,
    player_build_id: playerBuildId
  }
}

/**
 * Estrae dati deterministici da CandidateProfile
 * (nome, nazionalità, altezza, età, piede preferito, posizioni base)
 */
function extractDeterministicData(candidateData) {
  const extractValue = (field) => {
    if (!field) return null
    if (typeof field === 'object' && 'value' in field) {
      return field.value
    }
    return field
  }

  return {
    player_name: extractValue(candidateData.player_name),
    nationality: extractValue(candidateData.nationality),
    height: extractValue(candidateData.height),
    weight: extractValue(candidateData.weight),
    age: extractValue(candidateData.age),
    position: extractValue(candidateData.position),
    club_name: extractValue(candidateData.club_name),
    // Base stats (JSONB)
    base_stats: {
      attacking: candidateData.attacking ? 
        Object.fromEntries(
          Object.entries(candidateData.attacking).map(([key, field]) => [key, extractValue(field)])
        ) : {},
      defending: candidateData.defending ? 
        Object.fromEntries(
          Object.entries(candidateData.defending).map(([key, field]) => [key, extractValue(field)])
        ) : {},
      athleticism: candidateData.athleticism ? 
        Object.fromEntries(
          Object.entries(candidateData.athleticism).map(([key, field]) => [key, extractValue(field)])
        ) : {}
    },
    // Skills (array)
    skills: extractValue(candidateData.skills) || [],
    com_skills: extractValue(candidateData.com_skills) || []
  }
}

/**
 * Estrae dati configurabili da CandidateProfile
 * (livello, booster, skill equipaggiate, stile di gioco IA)
 */
function extractConfigurableData(candidateData) {
  const extractValue = (field) => {
    if (!field) return null
    if (typeof field === 'object' && 'value' in field) {
      return field.value
    }
    return field
  }

  return {
    current_level: extractValue(candidateData.current_level),
    level_cap: extractValue(candidateData.level_cap),
    active_booster_name: extractValue(candidateData.active_booster),
    // Development points (JSONB)
    development_points: extractValue(candidateData.development_points) || {},
    // Final stats (calcolate)
    final_stats: {
      attacking: candidateData.attacking ? 
        Object.fromEntries(
          Object.entries(candidateData.attacking).map(([key, field]) => [key, extractValue(field)])
        ) : {},
      defending: candidateData.defending ? 
        Object.fromEntries(
          Object.entries(candidateData.defending).map(([key, field]) => [key, extractValue(field)])
        ) : {},
      athleticism: candidateData.athleticism ? 
        Object.fromEntries(
          Object.entries(candidateData.athleticism).map(([key, field]) => [key, extractValue(field)])
        ) : {}
    },
    final_overall_rating: extractValue(candidateData.overall_rating)
  }
}

/**
 * Salva CandidateProfile in database (prima della conferma)
 */
export async function saveCandidateProfile(candidateProfile, logId, userId, imageType) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Calcola statistiche confidence
  const stats = calculateProfileStats(candidateProfile)

  const { data, error } = await supabase
    .from('candidate_profiles')
    .insert({
      user_id: userId,
      screenshot_log_id: logId,
      profile_type: imageType,
      candidate_data: candidateProfile,
      profile_state: 'suggested',
      overall_confidence: stats.overallConfidence,
      fields_certain: stats.certain,
      fields_uncertain: stats.uncertain,
      fields_missing: stats.missing
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Errore salvataggio CandidateProfile: ${error.message}`)
  }

  return data
}

/**
 * Calcola statistiche CandidateProfile
 */
function calculateProfileStats(profile) {
  const stats = {
    total: 0,
    certain: 0,
    uncertain: 0,
    missing: 0,
    confidences: []
  }

  const countFields = (obj) => {
    if (!obj || typeof obj !== 'object') return
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        if ('status' in value) {
          stats.total++
          if (value.status === 'certain') stats.certain++
          else if (value.status === 'uncertain') stats.uncertain++
          else stats.missing++
          
          if ('confidence' in value && typeof value.confidence === 'number') {
            stats.confidences.push(value.confidence)
          }
        } else {
          countFields(value)
        }
      }
    }
  }

  countFields(profile)

  const overallConfidence = stats.confidences.length > 0
    ? stats.confidences.reduce((sum, conf) => sum + conf, 0) / stats.confidences.length
    : 0.5

  return {
    ...stats,
    overallConfidence: Math.round(overallConfidence * 100) / 100
  }
}