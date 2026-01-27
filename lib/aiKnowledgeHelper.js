/**
 * Helper per calcolo AI Knowledge Score
 * 
 * Calcola quanto l'IA conosce un utente basandosi su:
 * - Profilo (20%)
 * - Rosa Giocatori (25%)
 * - Storico Partite (30%)
 * - Pattern Tattici (15%)
 * - Allenatore (10%)
 * - Utilizzo Sistema (Bonus 10%)
 * - Successi & Obiettivi (15%)
 * 
 * Totale: 100%
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Determina livello conoscenza da score
 * @param {number} score - Score 0-100
 * @returns {string} - 'beginner' | 'intermediate' | 'advanced' | 'expert'
 */
export function getAIKnowledgeLevel(score) {
  if (typeof score !== 'number' || isNaN(score)) {
    return 'beginner'
  }
  
  if (score >= 81) return 'expert'
  if (score >= 61) return 'advanced'
  if (score >= 31) return 'intermediate'
  return 'beginner'
}

/**
 * Calcola score componente Profilo (max 20%)
 * @param {Object} profile - Profilo utente
 * @returns {number} - Score 0-20
 */
function calculateProfileScore(profile) {
  if (!profile) return 0
  
  let score = 0
  const fields = [
    'first_name',
    'last_name',
    'current_division',
    'favorite_team',
    'team_name',
    'ai_name',
    'how_to_remember',
    'hours_per_week'
  ]
  
  // Conta campi compilati
  let filledFields = 0
  fields.forEach(field => {
    if (profile[field] !== null && profile[field] !== undefined && profile[field] !== '') {
      filledFields++
    }
  })
  
  // common_problems (array)
  if (Array.isArray(profile.common_problems) && profile.common_problems.length > 0) {
    filledFields += 0.5 // Bonus parziale
  }
  
  // Score: ogni campo = 2.5% (8 campi = 20%)
  score = (filledFields / 8) * 20
  
  return Math.min(20, Math.round(score * 10) / 10)
}

/**
 * Calcola score componente Rosa Giocatori (max 25%)
 * @param {Array} players - Array giocatori
 * @param {Object} formation - Formazione salvata
 * @returns {number} - Score 0-25
 */
function calculateRosterScore(players, formation) {
  if (!players || !Array.isArray(players) || players.length === 0) {
    return 0
  }
  
  let score = 0
  
  // Base: 11 titolari = 15%
  const titolari = players.filter(p => p.slot_index !== null && p.slot_index !== undefined)
  const titolariScore = Math.min(15, (titolari.length / 11) * 15)
  score += titolariScore
  
  // Bonus: Riserve = 5%
  const riserve = players.filter(p => p.slot_index === null || p.slot_index === undefined)
  const riserveScore = Math.min(5, (riserve.length / 10) * 5)
  score += riserveScore
  
  // Bonus: Dati completi (overall, posizioni) = 5%
  let completeDataCount = 0
  players.forEach(player => {
    if (player.overall && player.original_positions && Array.isArray(player.original_positions) && player.original_positions.length > 0) {
      completeDataCount++
    }
  })
  const completeDataScore = Math.min(5, (completeDataCount / players.length) * 5)
  score += completeDataScore
  
  return Math.min(25, Math.round(score * 10) / 10)
}

/**
 * Calcola score componente Storico Partite (max 30%)
 * @param {Array} matches - Array partite
 * @returns {number} - Score 0-30
 */
function calculateMatchesScore(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    return 0
  }
  
  const matchCount = matches.length
  
  // 1 partita = 3%, max 30% (10 partite)
  const score = Math.min(30, matchCount * 3)
  
  return Math.round(score * 10) / 10
}

/**
 * Calcola score componente Pattern Tattici (max 15%)
 * @param {Object} tacticalPatterns - Pattern identificati
 * @returns {number} - Score 0-15
 */
function calculatePatternsScore(tacticalPatterns) {
  if (!tacticalPatterns || typeof tacticalPatterns !== 'object') {
    return 0
  }
  
  let score = 0
  
  // Pattern identificati = 10%
  // Verifica se ci sono pattern reali (formation_usage, playing_style_usage, recurring_issues)
  const hasFormationUsage = tacticalPatterns.formation_usage && Object.keys(tacticalPatterns.formation_usage).length > 0
  const hasPlayingStyleUsage = tacticalPatterns.playing_style_usage && Object.keys(tacticalPatterns.playing_style_usage).length > 0
  const hasRecurringIssues = Array.isArray(tacticalPatterns.recurring_issues) && tacticalPatterns.recurring_issues.length > 0
  
  if (hasFormationUsage || hasPlayingStyleUsage || hasRecurringIssues) {
    score = 10
  }
  
  // Bonus: Pattern confermati (5%)
  // Se ci sono almeno 5 match con pattern identificati, bonus
  if (tacticalPatterns.last_50_matches_count >= 5) {
    score += 5
  }
  
  return Math.min(15, score)
}

/**
 * Calcola score componente Allenatore (max 10%)
 * @param {Object} coach - Dati allenatore
 * @returns {number} - Score 0-10
 */
function calculateCoachScore(coach) {
  if (!coach || typeof coach !== 'object') {
    return 0
  }
  
  // Allenatore caricato = 10%
  if (coach.id || coach.name) {
    return 10
  }
  
  return 0
}

/**
 * Calcola score componente Utilizzo Sistema (max 10%)
 * @param {Object} usage - Dati utilizzo
 * @returns {number} - Score 0-10
 */
function calculateUsageBonus(usage) {
  if (!usage) return 0
  
  let score = 0
  
  // Messaggi chat: 100+ = 5%
  const chatMessages = usage.chat_messages || 0
  if (chatMessages >= 100) {
    score += 5
  } else if (chatMessages >= 50) {
    score += 3
  } else if (chatMessages >= 10) {
    score += 1
  }
  
  // Interazioni sistema: 50+ = 5%
  const interactions = usage.interactions || 0
  if (interactions >= 50) {
    score += 5
  } else if (interactions >= 25) {
    score += 3
  } else if (interactions >= 5) {
    score += 1
  }
  
  return Math.min(10, score)
}

/**
 * Calcola score componente Successi & Obiettivi (max 15%)
 * @param {Object} profile - Profilo utente (per initial_division vs current_division)
 * @param {Array} weeklyGoals - Obiettivi settimanali
 * @param {Array} matches - Partite (per metriche performance)
 * @returns {number} - Score 0-15
 */
function calculateSuccessScore(profile, weeklyGoals, matches) {
  let score = 0
  
  // 1. Miglioramento Divisione (5%)
  if (profile?.initial_division && profile?.current_division) {
    const initial = parseInt(profile.initial_division.replace(/\D/g, '')) || 0
    const current = parseInt(profile.current_division.replace(/\D/g, '')) || 0
    
    // Se current < initial (divisione più alta = numero più basso), miglioramento
    if (current > 0 && initial > 0 && current < initial) {
      score += 5
    }
  }
  
  // 2. Obiettivi Settimanali Completati (5%)
  if (weeklyGoals && Array.isArray(weeklyGoals)) {
    const completedGoals = weeklyGoals.filter(g => g.status === 'completed')
    const completedCount = completedGoals.length
    
    // Max 5 obiettivi = 5%
    score += Math.min(5, completedCount)
  }
  
  // 3. Miglioramenti Performance (5%)
  if (matches && Array.isArray(matches) && matches.length >= 10) {
    // Confronta ultime 10 partite vs precedenti 10
    const recentMatches = matches.slice(0, 10)
    const previousMatches = matches.slice(10, 20)
    
    if (previousMatches.length >= 10) {
      // Calcola media gol subiti
      const recentGoalsConceded = recentMatches.reduce((sum, m) => {
        const goals = m.team_stats?.goals_conceded || m.match_data?.team_stats?.goals_conceded || 0
        return sum + (typeof goals === 'number' ? goals : 0)
      }, 0) / 10
      
      const previousGoalsConceded = previousMatches.reduce((sum, m) => {
        const goals = m.team_stats?.goals_conceded || m.match_data?.team_stats?.goals_conceded || 0
        return sum + (typeof goals === 'number' ? goals : 0)
      }, 0) / 10
      
      // Se gol subiti diminuiti, bonus
      if (recentGoalsConceded < previousGoalsConceded && previousGoalsConceded > 0) {
        const improvement = ((previousGoalsConceded - recentGoalsConceded) / previousGoalsConceded) * 100
        if (improvement >= 20) {
          score += 5
        } else if (improvement >= 10) {
          score += 3
        } else if (improvement >= 5) {
          score += 1
        }
      }
    }
  }
  
  return Math.min(15, Math.round(score * 10) / 10)
}

/**
 * Calcola score conoscenza IA completo per utente
 * @param {string} userId - User ID
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} serviceKey - Supabase Service Role Key
 * @returns {Promise<{score: number, level: string, breakdown: object}>}
 */
export async function calculateAIKnowledgeScore(userId, supabaseUrl, serviceKey) {
  if (!userId || !supabaseUrl || !serviceKey) {
    throw new Error('Missing required parameters: userId, supabaseUrl, serviceKey')
  }
  
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  try {
    // 1. Fetch Profilo
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (profileError) {
      console.error('[AIKnowledge] Error fetching profile:', profileError)
    }
    
    // 2. Fetch Giocatori
    const { data: players, error: playersError } = await admin
      .from('players')
      .select('*')
      .eq('user_id', userId)
    
    if (playersError) {
      console.error('[AIKnowledge] Error fetching players:', playersError)
    }
    
    // 3. Fetch Formazione
    const { data: formation, error: formationError } = await admin
      .from('team_tactical_settings')
      .select('slot_positions')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (formationError) {
      console.error('[AIKnowledge] Error fetching formation:', formationError)
    }
    
    // 4. Fetch Partite (ultime 30 per calcolo)
    const { data: matches, error: matchesError } = await admin
      .from('matches')
      .select('id, match_data, team_stats, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    
    if (matchesError) {
      console.error('[AIKnowledge] Error fetching matches:', matchesError)
    }
    
    // 5. Fetch Pattern Tattici
    const { data: tacticalPatterns, error: patternsError } = await admin
      .from('team_tactical_patterns')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (patternsError) {
      console.error('[AIKnowledge] Error fetching tactical patterns:', patternsError)
    }
    
    // Normalizza: se null, usa oggetto vuoto
    const patternsData = tacticalPatterns || {}
    
    // 6. Fetch Allenatore
    const { data: coach, error: coachError } = await admin
      .from('coaches')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (coachError) {
      console.error('[AIKnowledge] Error fetching coach:', coachError)
    }
    
    // 7. Fetch Obiettivi Settimanali
    const { data: weeklyGoals, error: goalsError } = await admin
      .from('weekly_goals')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(20)
    
    if (goalsError) {
      console.error('[AIKnowledge] Error fetching weekly goals:', goalsError)
    }
    
    // 8. Calcolo Utilizzo Sistema (stima basata su partite, giocatori, obiettivi)
    // Stima interazioni: ogni partita salvata = interazione, ogni giocatore aggiunto = interazione
    // Ogni obiettivo completato = interazione aggiuntiva
    const completedGoalsCount = (weeklyGoals || []).filter(g => g.status === 'completed').length
    const totalInteractions = (matches?.length || 0) + (players?.length || 0) + completedGoalsCount
    
    // Stima chat messages: ogni 3 partite = ~1 messaggio chat (stima conservativa)
    const estimatedChatMessages = Math.floor((matches?.length || 0) / 3)
    
    const usage = {
      chat_messages: estimatedChatMessages,
      interactions: totalInteractions
    }
    
    // 9. Calcola score per componente
    const profileScore = calculateProfileScore(profile || {})
    const rosterScore = calculateRosterScore(players || [], formation || {})
    const matchesScore = calculateMatchesScore(matches || [])
    const patternsScore = calculatePatternsScore(patternsData)
    const coachScore = calculateCoachScore(coach || {})
    const usageBonus = calculateUsageBonus(usage)
    const successScore = calculateSuccessScore(profile || {}, weeklyGoals || [], matches || [])
    
    // 10. Score totale
    const totalScore = Math.min(100, Math.round(
      profileScore +
      rosterScore +
      matchesScore +
      patternsScore +
      coachScore +
      usageBonus +
      successScore
    ))
    
    // 11. Livello
    const level = getAIKnowledgeLevel(totalScore)
    
    // 12. Breakdown
    const breakdown = {
      profile: Math.round(profileScore * 10) / 10,
      roster: Math.round(rosterScore * 10) / 10,
      matches: Math.round(matchesScore * 10) / 10,
      patterns: Math.round(patternsScore * 10) / 10,
      coach: Math.round(coachScore * 10) / 10,
      usage: Math.round(usageBonus * 10) / 10,
      success: Math.round(successScore * 10) / 10
    }
    
    return {
      score: totalScore,
      level,
      breakdown
    }
  } catch (error) {
    console.error('[AIKnowledge] Error calculating score:', error)
    throw error
  }
}

/**
 * Aggiorna score conoscenza IA nel database
 * @param {string} userId - User ID
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} serviceKey - Supabase Service Role Key
 * @returns {Promise<{score: number, level: string, breakdown: object}>}
 */
export async function updateAIKnowledgeScore(userId, supabaseUrl, serviceKey) {
  try {
    const result = await calculateAIKnowledgeScore(userId, supabaseUrl, serviceKey)
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Aggiorna profilo
    const { error: updateError } = await admin
      .from('user_profiles')
      .update({
        ai_knowledge_score: result.score,
        ai_knowledge_level: result.level,
        ai_knowledge_breakdown: result.breakdown,
        ai_knowledge_last_calculated: new Date().toISOString()
      })
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('[AIKnowledge] Error updating score:', updateError)
      throw updateError
    }
    
    return result
  } catch (error) {
    console.error('[AIKnowledge] Error updating score:', error)
    throw error
  }
}
