/**
 * Helper per gestione Task (Obiettivi Settimanali)
 * 
 * Funzionalità:
 * - Generazione automatica task settimanali
 * - Aggiornamento progresso dopo ogni partita
 * - Validazione completamento
 * - Calcolo score pesato per leaderboard
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Genera obiettivi settimanali per un utente
 * @param {string} userId - User ID
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} serviceKey - Supabase Service Role Key
 * @param {Object} week - { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 * @returns {Promise<Array>} - Array di task generati
 */
export async function generateWeeklyTasksForUser(userId, supabaseUrl, serviceKey, week) {
  if (!userId || !supabaseUrl || !serviceKey || !week) {
    throw new Error('Missing required parameters: userId, supabaseUrl, serviceKey, week')
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // 1. Recupera dati utente necessari
    console.log(`[TaskHelper] Fetching profile for user ${userId}`)
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('[TaskHelper] Error fetching profile:', profileError)
      console.error('[TaskHelper] Profile error details:', JSON.stringify(profileError, null, 2))
      // Non bloccare, continua senza profilo (genererà task generici)
    } else {
      console.log(`[TaskHelper] Profile found: ${profile ? 'yes' : 'no'}`)
    }

    // 2. Recupera ultime 10 partite per analisi
    console.log(`[TaskHelper] Fetching matches for user ${userId}`)
    const { data: matches, error: matchesError } = await admin
      .from('matches')
      .select('*')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(10)

    if (matchesError) {
      console.error('[TaskHelper] Error fetching matches:', matchesError)
      console.error('[TaskHelper] Matches error details:', JSON.stringify(matchesError, null, 2))
      // Non bloccare, continua con dati parziali
    } else {
      console.log(`[TaskHelper] Matches found: ${matches?.length || 0}`)
    }

    // 3. Recupera pattern tattici
    console.log(`[TaskHelper] Fetching patterns for user ${userId}`)
    const { data: patterns, error: patternsError } = await admin
      .from('team_tactical_patterns')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (patternsError) {
      console.error('[TaskHelper] Error fetching patterns:', patternsError)
      // Non bloccare
    } else {
      console.log(`[TaskHelper] Patterns found: ${patterns ? 'yes' : 'no'}`)
    }

    // 4. Validazione week
    if (!week.start || !week.end) {
      throw new Error('Invalid week: start and end dates required')
    }

    // Validazione formato date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(week.start) || !dateRegex.test(week.end)) {
      throw new Error('Invalid date format in week object')
    }

    // 5. Genera task basati su dati disponibili
    const tasks = await generateTasksBasedOnData(profile, matches || [], patterns)
    
    console.log(`[TaskHelper] Generated ${tasks.length} tasks from data analysis`)

    // 6. Verifica se ci sono già task per questa settimana
    console.log(`[TaskHelper] Checking for existing tasks for user ${userId}, week ${week.start}`)
    const { data: existingTasks, error: checkError } = await admin
      .from('weekly_goals')
      .select('id, goal_type')
      .eq('user_id', userId)
      .eq('week_start_date', week.start)

    if (checkError) {
      console.error('[TaskHelper] Error checking existing tasks:', checkError)
      console.error('[TaskHelper] Check error details:', JSON.stringify(checkError, null, 2))
      // Continua comunque, potrebbe essere un errore temporaneo
    }

    console.log(`[TaskHelper] Existing tasks check result: ${existingTasks?.length || 0} tasks found`)

    if (existingTasks && existingTasks.length > 0) {
      console.log(`[TaskHelper] Tasks already exist for week ${week.start} (found ${existingTasks.length}), skipping generation`)
      // Restituisci i task esistenti invece di array vuoto
      const { data: existingTasksFull, error: fetchError } = await admin
        .from('weekly_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', week.start)
        .order('created_at', { ascending: true })
      
      if (!fetchError && existingTasksFull) {
        console.log(`[TaskHelper] Returning ${existingTasksFull.length} existing tasks`)
        return existingTasksFull
      }
      return []
    }
    
    console.log(`[TaskHelper] No existing tasks found for week ${week.start}, proceeding with generation`)

    // 7. Salva task nel database
    if (tasks.length > 0) {
      const tasksToInsert = tasks
        .filter(task => {
          // Validazione: target_value deve essere > 0
          if (!task.target_value || task.target_value <= 0) {
            console.warn(`[TaskHelper] Skipping task with invalid target_value: ${task.target_value}`)
            return false
          }
          return true
        })
        .map(task => ({
          user_id: userId,
          goal_type: task.goal_type,
          goal_description: task.goal_description,
          target_value: task.target_value,
          current_value: 0,
          difficulty: task.difficulty || 'medium',
          week_start_date: week.start,
          week_end_date: week.end,
          status: 'active',
          created_by: 'system'
        }))

      console.log(`[TaskHelper] Inserting ${tasksToInsert.length} tasks into database for user ${userId}, week ${week.start}`)

      // Usa INSERT ... ON CONFLICT per gestire eventuali duplicati (race condition)
      // Il constraint UNIQUE previene duplicati, ma gestiamo gracefully
      const { data: insertedTasks, error: insertError } = await admin
        .from('weekly_goals')
        .insert(tasksToInsert)
        .select()
        // Nota: Supabase non supporta ON CONFLICT direttamente, ma il constraint UNIQUE lo gestirà

      if (insertError) {
        console.error('[TaskHelper] Error inserting tasks:', insertError)
        console.error('[TaskHelper] Insert error details:', JSON.stringify(insertError, null, 2))
        
        // Se è un errore di constraint UNIQUE (duplicato), non è critico
        if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('duplicate')) {
          console.warn('[TaskHelper] Duplicate task detected (constraint violation), this is expected in race conditions')
          // Recupera i task esistenti invece di fallire
          const { data: existingTasksAfterError, error: fetchAfterError } = await admin
            .from('weekly_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('week_start_date', week.start)
            .order('created_at', { ascending: true })
          
          if (!fetchAfterError && existingTasksAfterError && existingTasksAfterError.length > 0) {
            console.log(`[TaskHelper] Recovered ${existingTasksAfterError.length} existing tasks after duplicate error`)
            return existingTasksAfterError
          }
        }
        
        throw new Error(`Failed to save tasks: ${insertError.message || insertError}`)
      }

      if (!insertedTasks || insertedTasks.length === 0) {
        console.error('[TaskHelper] No tasks were inserted despite no error')
        return []
      }

      console.log(`[TaskHelper] Successfully generated and saved ${insertedTasks.length} tasks for user ${userId}, week ${week.start}`)
      console.log(`[TaskHelper] Task IDs: ${insertedTasks.map(t => t.id).join(', ')}`)
      return insertedTasks
    }

    console.warn(`[TaskHelper] No tasks to insert (tasks array was empty or all filtered out)`)
    return []
  } catch (error) {
    console.error('[TaskHelper] Error generating tasks:', error)
    throw error
  }
}

/**
 * Genera task basati su dati utente
 * @param {Object} profile - Profilo utente
 * @param {Array} matches - Ultime partite
 * @param {Object} patterns - Pattern tattici
 * @returns {Promise<Array>} - Array di task
 */
async function generateTasksBasedOnData(profile, matches, patterns) {
  const tasks = []
  
  console.log(`[TaskHelper] generateTasksBasedOnData called with: matches=${matches?.length || 0}, profile=${!!profile}, patterns=${!!patterns}`)

  // Se non ci sono abbastanza dati, genera task generici (sempre almeno 3 task)
  if (!matches || matches.length < 3) {
    console.log(`[TaskHelper] User has ${matches?.length || 0} matches (< 3), generating generic tasks`)
    
    // Task 1: Completa partite
    tasks.push({
      goal_type: 'complete_matches',
      goal_description: 'Completa almeno 3 partite questa settimana',
      target_value: 3,
      difficulty: 'easy'
    })
    
    // Task 2: Carica formazione
    tasks.push({
      goal_type: 'upload_formation',
      goal_description: 'Carica la tua formazione preferita',
      target_value: 1,
      difficulty: 'easy'
    })
    
    // Task 3: Usa consigli IA
    tasks.push({
      goal_type: 'use_ai_recommendations',
      goal_description: "Applica almeno 2 consigli dell'IA questa settimana",
      target_value: 2,
      difficulty: 'easy'
    })
    
    console.log(`[TaskHelper] Generated ${tasks.length} generic tasks`)
    return tasks // Restituisci sempre almeno 3 task generici
  }
  
  console.log(`[TaskHelper] User has ${matches.length} matches (>= 3), generating personalized tasks`)

  // Analizza performance
  const avgGoalsConceded = calculateAvgGoalsConceded(matches)
  const avgPossession = calculateAvgPossession(matches)
  const winRate = calculateWinRate(matches)

  // Task 1: Riduci gol subiti (se media > 2.0)
  if (avgGoalsConceded > 2.0) {
    const target = Math.max(0.1, avgGoalsConceded * 0.8) // Riduzione 20%, min 0.1
    if (target > 0 && target < avgGoalsConceded) {
      tasks.push({
        goal_type: 'reduce_goals_conceded',
        goal_description: `Riduci gol subiti del 20% (da ${avgGoalsConceded.toFixed(1)} a ${target.toFixed(1)} per partita)`,
        target_value: Math.round(target * 100) / 100, // Arrotonda a 2 decimali
        difficulty: 'medium'
      })
    }
  }

  // Task 2: Migliora possesso (se < 50%)
  if (avgPossession < 50 && avgPossession >= 0) {
    const target = Math.min(100, avgPossession + 10) // +10%, max 100%
    if (target > avgPossession && target <= 100) {
      tasks.push({
        goal_type: 'improve_possession',
        goal_description: `Migliora possesso palla del 10% (da ${avgPossession.toFixed(0)}% a ${target.toFixed(0)}%)`,
        target_value: Math.round(target * 100) / 100,
        difficulty: 'medium'
      })
    }
  }

  // Task 3: Aumenta vittorie (se win rate < 50%)
  if (winRate < 50 && winRate >= 0) {
    tasks.push({
      goal_type: 'increase_wins',
      goal_description: 'Vinci almeno 3 partite questa settimana',
      target_value: 3,
      difficulty: 'hard'
    })
  }

  // Task 4: Basato su problemi comuni
  if (profile?.common_problems && Array.isArray(profile.common_problems)) {
    if (profile.common_problems.includes('difesa')) {
      tasks.push({
        goal_type: 'improve_defense',
        goal_description: 'Usa formazione più difensiva in almeno 2 partite',
        target_value: 2,
        difficulty: 'easy'
      })
    }
  }

  // Task 5: Usa consigli IA (sempre presente)
  tasks.push({
    goal_type: 'use_ai_recommendations',
    goal_description: "Applica almeno 2 consigli dell'IA questa settimana",
    target_value: 2,
    difficulty: 'easy'
  })

  // Limita a 5 task max
  return tasks.slice(0, 5)
}

/**
 * Aggiorna progresso task dopo salvataggio partita
 * @param {string} userId - User ID
 * @param {string} supabaseUrl - Supabase URL
 * @param {string} serviceKey - Supabase Service Role Key
 * @param {Object} matchData - Dati partita appena salvata
 * @returns {Promise<Array>} - Array di task aggiornati/completati
 */
export async function updateTasksProgressAfterMatch(userId, supabaseUrl, serviceKey, matchData) {
  if (!userId || !supabaseUrl || !serviceKey || !matchData) {
    console.warn('[TaskHelper] Missing parameters for updateTasksProgressAfterMatch')
    return []
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // 1. Validazione matchData
    if (!matchData || !matchData.id) {
      console.warn('[TaskHelper] Invalid matchData in updateTasksProgressAfterMatch')
      return []
    }

    // 2. Recupera task attivi per settimana corrente E settimane passate (ultime 2 settimane)
    // (per supportare aggiornamento partite caricate in ritardo)
    const currentWeek = getCurrentWeek()
    const twoWeeksAgo = new Date(currentWeek.start)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    
    const { data: activeTasks, error: tasksError } = await admin
      .from('weekly_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('week_start_date', twoWeeksAgo.toISOString().split('T')[0])
      .lte('week_start_date', currentWeek.start)

    if (tasksError) {
      console.error('[TaskHelper] Error fetching active tasks:', tasksError)
      return []
    }

    if (!activeTasks || activeTasks.length === 0) {
      return []
    }

    // 3. Recupera ultime partite per calcolo metriche (max 20 per avere abbastanza dati)
    const { data: recentMatches, error: matchesError } = await admin
      .from('matches')
      .select('id, match_date, result, team_stats, data_completeness')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(20) // Aumentato a 20 per avere più dati per calcolo media

    if (matchesError) {
      console.error('[TaskHelper] Error fetching recent matches:', matchesError)
    }

    const allMatches = (recentMatches || []).filter(m => {
      // Filtra match validi: deve avere id e match_date
      return m && m.id && m.match_date
    })

    // 4. Aggiorna ogni task attivo
    const updatedTasks = []
    const completedTasks = []

    for (const task of activeTasks) {
      try {
        // Validazione task
        if (!task.id || !task.goal_type || !task.target_value || task.target_value <= 0) {
          console.warn(`[TaskHelper] Skipping invalid task: ${task.id}`)
          continue
        }

        const newProgress = await calculateTaskProgress(task, allMatches, matchData)
        
        // Validazione newProgress
        if (!newProgress || typeof newProgress.current_value !== 'number' || newProgress.current_value < 0) {
          console.warn(`[TaskHelper] Invalid progress calculated for task ${task.id}`)
          continue
        }
        
        // Aggiorna solo se progresso è cambiato (con tolleranza per float)
        const progressChanged = Math.abs(newProgress.current_value - (task.current_value || 0)) > 0.01
        
        if (progressChanged) {
          const updateData = {
            current_value: Math.round(newProgress.current_value * 100) / 100, // Arrotonda a 2 decimali
            updated_at: new Date().toISOString()
          }

          // Se target raggiunto E task è ancora active, completa task
          // Validazione: target_value deve essere valido
          if (task.target_value > 0 && newProgress.current_value >= task.target_value && task.status === 'active') {
            updateData.status = 'completed'
            updateData.completed_at = new Date().toISOString()
            completedTasks.push(task)
          }

          const { data: updatedTask, error: updateError } = await admin
            .from('weekly_goals')
            .update(updateData)
            .eq('id', task.id)
            .eq('user_id', userId) // Doppia sicurezza: verifica anche user_id
            .select()
            .single()

          if (updateError) {
            console.error(`[TaskHelper] Error updating task ${task.id}:`, updateError)
          } else if (updatedTask) {
            updatedTasks.push(updatedTask)
          }
        }
      } catch (taskError) {
        // Gestisci errore per singolo task senza bloccare gli altri
        console.error(`[TaskHelper] Error processing task ${task.id}:`, taskError)
        continue
      }
    }

    // 5. Se task completati, aggiorna AI Knowledge Score (async)
    if (completedTasks.length > 0) {
      import('./aiKnowledgeHelper').then(({ updateAIKnowledgeScore }) => {
        updateAIKnowledgeScore(userId, supabaseUrl, serviceKey).catch(err => {
          console.error('[TaskHelper] Failed to update AI knowledge score (non-blocking):', err)
        })
      }).catch(err => {
        console.error('[TaskHelper] Failed to import aiKnowledgeHelper (non-blocking):', err)
      })
    }

    return updatedTasks
  } catch (error) {
    console.error('[TaskHelper] Error updating tasks progress:', error)
    return []
  }
}

/**
 * Calcola nuovo progresso per un task
 * @param {Object} task - Task da aggiornare
 * @param {Array} recentMatches - Ultime partite
 * @param {Object} newMatch - Nuova partita appena salvata
 * @returns {Promise<Object>} - { current_value: number }
 */
async function calculateTaskProgress(task, recentMatches, newMatch) {
  // Validazione input
  if (!task || !task.goal_type || !task.target_value) {
    console.warn('[TaskHelper] Invalid task in calculateTaskProgress')
    return { current_value: 0 }
  }

  // Validazione: target_value deve essere > 0
  if (task.target_value <= 0) {
    console.warn(`[TaskHelper] Invalid target_value for task ${task.id}: ${task.target_value}`)
    return { current_value: 0 }
  }

  let currentValue = 0

  // Usa settimana del task, non settimana corrente (per supportare task passati)
  const taskWeekStart = new Date(task.week_start_date)
  const taskWeekEnd = new Date(task.week_end_date)
  taskWeekEnd.setHours(23, 59, 59, 999)

  switch (task.goal_type) {
    case 'reduce_goals_conceded':
      // Media gol subiti ultimi 5 match nella settimana del task (incluso nuovo se nella settimana)
      const matchesForAvg = recentMatches.filter(m => {
        if (!m.match_date) return false
        const matchDate = new Date(m.match_date)
        return matchDate >= taskWeekStart && matchDate <= taskWeekEnd
      })
      
      // Aggiungi nuovo match se nella settimana del task
      if (newMatch && newMatch.match_date) {
        const newMatchDate = new Date(newMatch.match_date)
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          matchesForAvg.push(newMatch)
        }
      }
      
      // Prendi ultimi 5 match della settimana
      const recent5 = matchesForAvg.slice(0, 5)
      currentValue = calculateAvgGoalsConceded(recent5)
      break

    case 'increase_wins':
      // Conta vittorie nella settimana del task
      const winsInTaskWeek = recentMatches
        .filter(m => {
          if (!m.match_date || !m.result) return false
          const matchDate = new Date(m.match_date)
          return matchDate >= taskWeekStart && matchDate <= taskWeekEnd && isWin(m.result)
        }).length
      
      // Aggiungi nuova partita se è vittoria e nella settimana del task
      if (newMatch && newMatch.match_date && newMatch.result) {
        const newMatchDate = new Date(newMatch.match_date)
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd && isWin(newMatch.result)) {
          currentValue = winsInTaskWeek + 1
        } else {
          currentValue = winsInTaskWeek
        }
      } else {
        currentValue = winsInTaskWeek
      }
      break

    case 'improve_possession':
      // Media possesso ultimi 5 match nella settimana del task
      const matchesForPoss = recentMatches.filter(m => {
        if (!m.match_date) return false
        const matchDate = new Date(m.match_date)
        return matchDate >= taskWeekStart && matchDate <= taskWeekEnd
      })
      
      // Aggiungi nuovo match se nella settimana del task
      if (newMatch && newMatch.match_date) {
        const newMatchDate = new Date(newMatch.match_date)
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          matchesForPoss.push(newMatch)
        }
      }
      
      const recent5Poss = matchesForPoss.slice(0, 5)
      currentValue = calculateAvgPossession(recent5Poss)
      break

    case 'complete_matches':
      // Conta partite complete nella settimana del task
      const completeInTaskWeek = recentMatches
        .filter(m => {
          if (!m.match_date) return false
          const matchDate = new Date(m.match_date)
          return matchDate >= taskWeekStart && matchDate <= taskWeekEnd && m.data_completeness === 'complete'
        }).length
      
      // Aggiungi nuova partita se completa e nella settimana del task
      if (newMatch && newMatch.match_date && newMatch.data_completeness === 'complete') {
        const newMatchDate = new Date(newMatch.match_date)
        if (newMatchDate >= taskWeekStart && newMatchDate <= taskWeekEnd) {
          currentValue = completeInTaskWeek + 1
        } else {
          currentValue = completeInTaskWeek
        }
      } else {
        currentValue = completeInTaskWeek
      }
      break

    case 'improve_defense':
    case 'use_recommended_formation':
    case 'use_ai_recommendations':
      // Questi task richiedono tracking aggiuntivo (per ora: mantieni valore attuale)
      // TODO: Implementare tracking quando disponibile
      currentValue = task.current_value || 0
      break

    default:
      currentValue = task.current_value || 0
  }

  // Validazione: current_value non può essere negativo
  currentValue = Math.max(0, currentValue)

  // Se current_value > target_value ma task non è ancora completato, 
  // significa che target è stato superato (OK, verrà completato)
  // Non limitiamo current_value perché potrebbe essere intenzionale (superare target)

  return { current_value: currentValue }
}

/**
 * Calcola score pesato per task completati (per leaderboard)
 * @param {Array} completedTasks - Task completati
 * @returns {number} - Score pesato (0-200)
 */
export function calculateWeightedTasksScore(completedTasks) {
  if (!completedTasks || completedTasks.length === 0) {
    return 0
  }

  let totalScore = 0
  const now = new Date()

  completedTasks.forEach(task => {
    let taskScore = 10 // Base

    // 1. Peso per difficoltà
    const difficultyMultiplier = {
      'easy': 1.0,
      'medium': 1.5,
      'hard': 2.0
    }
    taskScore *= (difficultyMultiplier[task.difficulty] || 1.0)

    // 2. Peso per tipo
    const goalTypeMultiplier = {
      'reduce_goals_conceded': 1.2,
      'improve_defense': 1.2,
      'increase_wins': 1.3,
      'improve_possession': 1.1,
      'use_ai_recommendations': 1.1,
      'use_recommended_formation': 1.0,
      'complete_matches': 0.8,
      'custom': 1.0
    }
    taskScore *= (goalTypeMultiplier[task.goal_type] || 1.0)

    // 3. Peso per recency
    const completedAt = new Date(task.completed_at || task.week_start_date)
    const weeksAgo = (now - completedAt) / (1000 * 60 * 60 * 24 * 7)

    let recencyMultiplier = 1.0
    if (weeksAgo <= 1) {
      recencyMultiplier = 1.5
    } else if (weeksAgo <= 2) {
      recencyMultiplier = 1.3
    } else if (weeksAgo <= 4) {
      recencyMultiplier = 1.1
    } else if (weeksAgo <= 8) {
      recencyMultiplier = 1.0
    } else {
      recencyMultiplier = 0.5
    }
    taskScore *= recencyMultiplier

    totalScore += taskScore
  })

  return Math.min(200, Math.round(totalScore))
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Calcola media gol subiti
 */
function calculateAvgGoalsConceded(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return 0

  let totalGoals = 0
  let count = 0

  matches.forEach(match => {
    if (!match) return

    // Estrai gol subiti da team_stats o result
    const goalsConceded = match.team_stats?.goals_conceded
    if (typeof goalsConceded === 'number' && goalsConceded >= 0) {
      totalGoals += goalsConceded
      count++
    } else if (match.result && typeof match.result === 'string') {
      // Parse result: "6-1" → 1 gol subito (se siamo team1, primo numero)
      const parts = match.result.trim().split('-')
      if (parts.length === 2) {
        const team1Goals = parseInt(parts[0], 10)
        const team2Goals = parseInt(parts[1], 10)
        // Validazione: numeri validi
        if (!isNaN(team1Goals) && !isNaN(team2Goals) && team1Goals >= 0 && team2Goals >= 0) {
          // Assumiamo che siamo sempre team1 (primo numero)
          // Gol subiti = team2Goals (secondo numero)
          totalGoals += team2Goals
          count++
        }
      }
    }
  })

  return count > 0 ? Math.round((totalGoals / count) * 100) / 100 : 0
}

/**
 * Calcola media possesso
 */
function calculateAvgPossession(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return 0

  let totalPossession = 0
  let count = 0

  matches.forEach(match => {
    if (!match) return

    const possession = match.team_stats?.possession
    // Validazione: possesso deve essere tra 0 e 100
    if (typeof possession === 'number' && possession >= 0 && possession <= 100) {
      totalPossession += possession
      count++
    }
  })

  return count > 0 ? Math.round((totalPossession / count) * 100) / 100 : 0
}

/**
 * Calcola win rate
 */
function calculateWinRate(matches) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) return 0

  let wins = 0
  let validMatches = 0

  matches.forEach(match => {
    if (!match || !match.result) return
    validMatches++
    if (isWin(match.result)) wins++
  })

  return validMatches > 0 ? Math.round((wins / validMatches) * 100 * 100) / 100 : 0
}

/**
 * Verifica se risultato è vittoria
 */
function isWin(result) {
  if (!result || typeof result !== 'string') return false
  const upper = result.toUpperCase()
  return upper.includes('W') || upper.includes('VITTORIA') || upper.includes('WIN') ||
    (/^\d+-\d+$/.test(result) && parseInt(result.split('-')[0]) > parseInt(result.split('-')[1]))
}

/**
 * Verifica se risultato è sconfitta
 */
function isLoss(result) {
  if (!result || typeof result !== 'string') return false
  const upper = result.toUpperCase()
  return upper.includes('L') || upper.includes('SCONFITTA') || upper.includes('LOSS') ||
    (/^\d+-\d+$/.test(result) && parseInt(result.split('-')[0]) < parseInt(result.split('-')[1]))
}

/**
 * Ottieni settimana corrente (Lunedì - Domenica)
 */
export function getCurrentWeek() {
  const now = new Date()
  // Crea copia per non modificare originale
  const monday = new Date(now)
  const dayOfWeek = monday.getDay()
  const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Lunedì
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  }
}
