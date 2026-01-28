import { createClient } from '@supabase/supabase-js'

/**
 * Aggiorna aggregati performance per-giocatore in background.
 *
 * NOTE:
 * - Usa solo dati già presenti in `matches.players_in_match`
 * - Non blocca mai il flusso principale (da usare in fire-and-forget)
 * - Progettato per essere resiliente: in caso di errore logga e ritorna []
 *
 * Schema rilevante (player_performance_aggregates):
 * - user_id (uuid)
 * - player_id (uuid)
 * - average_rating (numeric)
 * - total_goals (int)
 * - total_assists (int)
 * - total_minutes_played (int)
 * - positions_played (text[])
 * - rating_trend (jsonb)
 * - last_50_matches_count (int)
 * - last_updated (timestamptz)
 */
export async function updatePlayerPerformanceAggregates(userId, supabaseUrl, serviceKey) {
  if (!userId || !supabaseUrl || !serviceKey) {
    console.warn('[PlayerPerformance] Missing parameters for updatePlayerPerformanceAggregates')
    return []
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // Recupera ultime 50 partite con disposizione reale giocatori (players_in_match)
    const { data: matches, error: matchesError } = await admin
      .from('matches')
      .select('id, match_date, players_in_match')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(50)

    if (matchesError) {
      console.error('[PlayerPerformance] Error fetching matches for aggregates:', matchesError)
      return []
    }

    if (!matches || matches.length === 0) {
      return []
    }

    // Costruisci aggregati per player_id
    // Chiave: player_id, Valore: aggregati
    const aggregates = new Map()

    // Itera partite da più vecchia a più recente per avere ratingTrend in ordine cronologico
    const orderedMatches = [...matches].reverse()

    for (const match of orderedMatches) {
      if (!match || !Array.isArray(match.players_in_match)) {
        continue
      }

      for (const p of match.players_in_match) {
        if (!p || typeof p !== 'object') continue

        // Usiamo matched_player_id se presente (link sicuro a players.id)
        const playerId = p.matched_player_id || p.player_id || null
        if (!playerId) continue

        // Rating: usiamo rating se presente, altrimenti fallback su overall_rating
        const rawRating = p.rating ?? p.overall_rating ?? p.match_rating
        const ratingNumber = typeof rawRating === 'number'
          ? rawRating
          : rawRating !== undefined && rawRating !== null
          ? Number(rawRating)
          : null

        const position = p.position || p.slot_position || null

        let agg = aggregates.get(playerId)
        if (!agg) {
          agg = {
            playerId,
            totalRating: 0,
            ratingCount: 0,
            ratingTrend: [],
            positions: new Set(),
            matchesCount: 0
          }
          aggregates.set(playerId, agg)
        }

        agg.matchesCount += 1

        if (ratingNumber !== null && !Number.isNaN(ratingNumber)) {
          agg.totalRating += ratingNumber
          agg.ratingCount += 1
          agg.ratingTrend.push(ratingNumber)
        }

        if (position) {
          agg.positions.add(String(position))
        }
      }
    }

    if (aggregates.size === 0) {
      // Nessun giocatore con dati sufficienti, non fare upsert
      return []
    }

    const nowIso = new Date().toISOString()
    const upserts = []

    for (const agg of aggregates.values()) {
      const averageRating = agg.ratingCount > 0
        ? Math.round((agg.totalRating / agg.ratingCount) * 100) / 100
        : null

      upserts.push({
        user_id: userId,
        player_id: agg.playerId,
        average_rating: averageRating,
        total_goals: 0, // Non abbiamo ancora una sorgente affidabile per gol per partita
        total_assists: 0, // Idem assist
        total_minutes_played: 0, // Potrà essere popolato in futuro se i dati saranno disponibili
        positions_played: Array.from(agg.positions),
        rating_trend: agg.ratingTrend.slice(-10), // ultimi 10 voti
        last_50_matches_count: agg.matchesCount,
        last_updated: nowIso
      })
    }

    const { data: result, error: upsertError } = await admin
      .from('player_performance_aggregates')
      .upsert(upserts, {
        onConflict: 'user_id,player_id'
      })
      .select('user_id, player_id, average_rating, last_50_matches_count')

    if (upsertError) {
      console.error('[PlayerPerformance] Error upserting aggregates:', upsertError)
      return []
    }

    console.log(`[PlayerPerformance] Updated aggregates for ${result?.length || 0} players (user ${userId})`)
    return result || []
  } catch (error) {
    console.error('[PlayerPerformance] Unexpected error updating aggregates:', error)
    return []
  }
}

