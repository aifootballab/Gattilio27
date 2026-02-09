/**
 * Helper classifica mensile (From Zero to Hero)
 * Calcolo Punti Coach: partite, task, utilizzo IA, profilo, miglioramento.
 * Uso: solo server-side (API con service role). Breakdown non esposto in classifica pubblica.
 */

const CAP_MATCHES = 15
const PTS_PER_MATCH = 2
const PTS_PER_MATCH_QUALITY = 1
const CAP_TASKS = 5
const PTS_PER_TASK = 4
const GROWTH_GOAL_TYPES = ['reduce_goals_conceded', 'increase_wins', 'improve_possession', 'improve_defense']
const CAP_GROWTH_BONUS = 4
const PTS_PER_GROWTH_TASK = 3
const CAP_IA_ACTIONS = 20
const PTS_PER_IA_ACTION = 0.5
const BONUS_IA_VARIETY = 5
const IA_VARIETY_MIN_TYPES = 3
const PROFILE_PTS = 5
const PROFILE_THRESHOLD = 80
/** Eleggibilità: almeno 1 partita complete nel mese + profilo ≥ 50 + consenso. Nessun obbligo di task nel mese (coerenza: partite + profilo = entri). */
const MIN_MATCHES_ELIGIBILITY = 1
const MIN_TASKS_ELIGIBILITY = 0
const MIN_PROFILE_ELIGIBILITY = 50

/**
 * Restituisce inizio e fine mese in ISO (UTC)
 * @param {string} month - "YYYY-MM"
 */
export function getMonthBounds(month) {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Calcola Punti Coach per un singolo utente (dati già caricati)
 * @param {Object} params
 * @param {Array} params.matches - Partite del mese (complete)
 * @param {Array} params.tasksCompleted - Task completati nel mese ({ goal_type })
 * @param {Array} params.usageTransactions - credit_transactions type=usage nel mese (description)
 * @param {number} params.profileCompletionScore
 * @returns {{ points: number, breakdown: object }}
 */
export function calculateUserCoachPoints({ matches = [], tasksCompleted = [], usageTransactions = [], profileCompletionScore = 0 }) {
  const breakdown = { matches: 0, tasks: 0, usage_ia: 0, profile: 0, improvement: 0 }

  const completeInMonth = matches.filter(m => m.data_completeness === 'complete')
  const countMatches = Math.min(CAP_MATCHES, completeInMonth.length)
  let pMatches = countMatches * PTS_PER_MATCH
  for (let i = 0; i < countMatches; i++) {
    const m = completeInMonth[i]
    const hasQuality = (m.photos_uploaded && m.photos_uploaded >= 1) || (m.team_stats && typeof m.team_stats === 'object' && Object.keys(m.team_stats).length > 0)
    if (hasQuality) pMatches += PTS_PER_MATCH_QUALITY
  }
  breakdown.matches = Math.round(pMatches * 10) / 10

  const countTasks = Math.min(CAP_TASKS, tasksCompleted.length)
  const pTasks = countTasks * PTS_PER_TASK
  breakdown.tasks = pTasks

  const growthTasks = tasksCompleted.filter(t => GROWTH_GOAL_TYPES.includes(t.goal_type))
  const countGrowth = Math.min(CAP_GROWTH_BONUS, growthTasks.length)
  const pImprovement = countGrowth * PTS_PER_GROWTH_TASK
  breakdown.improvement = pImprovement

  const usageCount = Math.min(CAP_IA_ACTIONS, usageTransactions.length)
  const distinctTypes = new Set(usageTransactions.slice(0, CAP_IA_ACTIONS).map(t => t.description).filter(Boolean)).size
  let pUsage = usageCount * PTS_PER_IA_ACTION
  if (distinctTypes >= IA_VARIETY_MIN_TYPES) pUsage += BONUS_IA_VARIETY
  breakdown.usage_ia = Math.round(pUsage * 10) / 10

  const pProfile = (profileCompletionScore >= PROFILE_THRESHOLD) ? PROFILE_PTS : 0
  breakdown.profile = pProfile

  const points = Math.round((breakdown.matches + breakdown.tasks + breakdown.usage_ia + breakdown.profile + breakdown.improvement) * 10) / 10
  return { points, breakdown }
}

/**
 * Verifica se l'utente è eleggibile per la classifica (soglie minime)
 */
export function isEligibleForLeaderboard({ matchCount, tasksCompletedCount, profileCompletionScore }) {
  const score = Number(profileCompletionScore) || 0
  return matchCount >= MIN_MATCHES_ELIGIBILITY &&
    tasksCompletedCount >= MIN_TASKS_ELIGIBILITY &&
    score >= MIN_PROFILE_ELIGIBILITY
}

/**
 * Calcola classifica per un mese (tutti gli utenti con consenso che rispettano soglie)
 * Usa solo admin (service role). Restituisce array ordinato con rank; breakdown solo per uso interno.
 * @param {string} month - "YYYY-MM"
 * @param {object} admin - Supabase client con service role
 * @returns {Promise<Array<{ user_id: string, nickname: string|null, points: number, rank: number, points_breakdown: object }>>}
 */
export async function computeLeaderboardForMonth(month, admin) {
  const bounds = getMonthBounds(month)
  if (!bounds) return []

  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, nickname, profile_completion_score, leaderboard_consent')
    .eq('leaderboard_consent', true)

  if (!profiles?.length) return []

  const userIds = profiles.map(p => p.user_id)
  const profileScoreByUser = {}
  profiles.forEach(p => {
    profileScoreByUser[p.user_id] = Number(p.profile_completion_score) || 0
  })

  const [matchesRes, goalsRes, txRes] = await Promise.all([
    admin.from('matches').select('user_id, data_completeness, photos_uploaded, team_stats').gte('match_date', bounds.start).lte('match_date', bounds.end),
    admin.from('weekly_goals').select('user_id, goal_type, status, completed_at').eq('status', 'completed').gte('completed_at', bounds.start).lte('completed_at', bounds.end),
    admin.from('credit_transactions').select('user_id, description').eq('type', 'usage').gte('created_at', bounds.start).lte('created_at', bounds.end)
  ])

  const matchesByUser = {}
  ;(matchesRes?.data || []).forEach(m => {
    if (!matchesByUser[m.user_id]) matchesByUser[m.user_id] = []
    matchesByUser[m.user_id].push(m)
  })
  const tasksByUser = {}
  ;(goalsRes?.data || []).forEach(g => {
    if (!tasksByUser[g.user_id]) tasksByUser[g.user_id] = []
    tasksByUser[g.user_id].push({ goal_type: g.goal_type })
  })
  const usageByUser = {}
  ;(txRes?.data || []).forEach(t => {
    if (!usageByUser[t.user_id]) usageByUser[t.user_id] = []
    usageByUser[t.user_id].push({ description: t.description })
  })

  const results = []
  for (const uid of userIds) {
    const matches = matchesByUser[uid] || []
    const tasksCompleted = tasksByUser[uid] || []
    const usageTransactions = usageByUser[uid] || []
    const profileCompletionScore = profileScoreByUser[uid] || 0

    const completeInMonth = matches.filter(m => m.data_completeness === 'complete')
    if (!isEligibleForLeaderboard({
      matchCount: completeInMonth.length,
      tasksCompletedCount: tasksCompleted.length,
      profileCompletionScore
    })) continue

    const { points, breakdown } = calculateUserCoachPoints({
      matches,
      tasksCompleted,
      usageTransactions,
      profileCompletionScore
    })

    const nickname = profiles.find(p => p.user_id === uid)?.nickname || null
    results.push({
      user_id: uid,
      nickname,
      points,
      points_breakdown: breakdown
    })
  }

  results.sort((a, b) => b.points - a.points)
  results.forEach((r, i) => { r.rank = i + 1 })
  return results
}

/**
 * Sostituisce lo snapshot classifica per il mese (solo server).
 * Elimina le righe esistenti per il mese e inserisce la lista computed, così la classifica
 * è sempre coerente (retroattiva: chi ha consenso e ≥1 partita entra; chi revoca esce).
 */
export async function saveLeaderboardSnapshot(month, rankings, admin) {
  await admin.from('leaderboard_snapshots').delete().eq('month', month)
  if (!rankings?.length) return
  const rows = rankings.map(r => ({
    month,
    user_id: r.user_id,
    points: Math.round(Number(r.points)) || 0,
    rank: r.rank,
    points_breakdown: r.points_breakdown || {}
  }))
  await admin.from('leaderboard_snapshots').insert(rows)
}
