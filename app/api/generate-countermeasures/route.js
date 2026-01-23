import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry } from '../../../lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../lib/rateLimiter'
import { generateCountermeasuresPrompt, validateCountermeasuresOutput } from '../../../lib/countermeasuresHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/generate-countermeasures']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/generate-countermeasures',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const { opponent_formation_id, context } = await req.json()
    
    if (!opponent_formation_id || typeof opponent_formation_id !== 'string') {
      return NextResponse.json({ error: 'opponent_formation_id is required' }, { status: 400 })
    }

    // Validazione UUID
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(opponent_formation_id)) {
      return NextResponse.json({ error: 'Invalid opponent_formation_id format' }, { status: 400 })
    }

    // Recupera dati contestuali
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Recupera formazione avversaria
    const { data: opponentFormation, error: formationError } = await admin
      .from('opponent_formations')
      .select('*')
      .eq('id', opponent_formation_id)
      .eq('user_id', userId)
      .single()

    if (formationError || !opponentFormation) {
      return NextResponse.json(
        { error: 'Opponent formation not found or access denied' },
        { status: 404 }
      )
    }

    // 2. Recupera rosa cliente completa
    const { data: clientRoster, error: rosterError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id')
      .eq('user_id', userId)
      .order('overall_rating', { ascending: false })
      .limit(100) // Max 100 giocatori

    const roster = clientRoster || []

    // 3. Recupera formazione cliente
    const { data: clientFormation, error: formationLayoutError } = await admin
      .from('formation_layout')
      .select('formation, slot_positions')
      .eq('user_id', userId)
      .maybeSingle()

    // 4. Recupera impostazioni tattiche
    const { data: tacticalSettings, error: tacticalError } = await admin
      .from('team_tactical_settings')
      .select('team_playing_style, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle()

    // 5. Recupera allenatore attivo
    const { data: activeCoach, error: coachError } = await admin
      .from('coaches')
      .select('playing_style_competence, stat_boosters, connection')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    // 6. Recupera storico match completo (ultimi 50 per analisi approfondita)
    const { data: matchHistory, error: historyError } = await admin
      .from('matches')
      .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, player_ratings, team_stats, match_date')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(50)

    // 6.1 Analizza match con formazioni simili all'avversario
    const similarFormationMatches = []
    const opponentFormationName = opponentFormation.formation_name || ''
    const opponentPlayingStyle = opponentFormation.playing_style || ''
    
    if (matchHistory && matchHistory.length > 0) {
      matchHistory.forEach(match => {
        // Confronta formazione avversaria vs formazione avversaria del match storico
        const matchOpponentFormationId = match.opponent_formation_id
        
        // Se match ha opponent_formation_id, confronta direttamente
        if (matchOpponentFormationId && matchOpponentFormationId === opponent_formation_id) {
          similarFormationMatches.push(match)
        } else {
          // Altrimenti confronta per nome formazione (meno preciso ma utile)
          const matchFormation = match.formation_played || ''
          const isSimilar = opponentFormationName && matchFormation && (
            matchFormation.includes(opponentFormationName) || 
            opponentFormationName.includes(matchFormation) ||
            // Confronta anche stile di gioco se disponibile
            (opponentPlayingStyle && match.playing_style_played && 
             match.playing_style_played.toLowerCase().includes(opponentPlayingStyle.toLowerCase()))
          )
          
          if (isSimilar) {
            similarFormationMatches.push(match)
          }
        }
      })
    }

    // 6.2 Analizza performance giocatori contro formazioni simili
    const playerPerformanceAgainstSimilar = {}
    if (similarFormationMatches.length > 0 && roster.length > 0) {
      similarFormationMatches.forEach(match => {
        if (match.player_ratings && typeof match.player_ratings === 'object') {
          Object.entries(match.player_ratings).forEach(([playerId, rating]) => {
            if (!playerPerformanceAgainstSimilar[playerId]) {
              playerPerformanceAgainstSimilar[playerId] = {
                matches: 0,
                totalRating: 0,
                ratings: [],
                playerName: roster.find(p => p.id === playerId)?.player_name || playerId
              }
            }
            const numRating = typeof rating === 'number' ? rating : parseFloat(rating) || 0
            if (numRating > 0) {
              playerPerformanceAgainstSimilar[playerId].matches++
              playerPerformanceAgainstSimilar[playerId].totalRating += numRating
              playerPerformanceAgainstSimilar[playerId].ratings.push(numRating)
            }
          })
        }
      })
    }

    // 6.3 Analizza abitudini tattiche cliente
    const tacticalHabits = {
      preferredFormations: {},
      preferredStyles: {},
      winRateByFormation: {},
      lossRateByFormation: {},
      commonIssues: []
    }

    if (matchHistory && matchHistory.length > 0) {
      matchHistory.forEach(match => {
        const formation = match.formation_played || 'unknown'
        const style = match.playing_style_played || 'unknown'
        const result = match.result || ''
        
        // Conta formazioni preferite
        if (!tacticalHabits.preferredFormations[formation]) {
          tacticalHabits.preferredFormations[formation] = 0
        }
        tacticalHabits.preferredFormations[formation]++

        // Conta stili preferiti
        if (!tacticalHabits.preferredStyles[style]) {
          tacticalHabits.preferredStyles[style] = 0
        }
        tacticalHabits.preferredStyles[style]++

        // Analizza win/loss rate per formazione
        if (!tacticalHabits.winRateByFormation[formation]) {
          tacticalHabits.winRateByFormation[formation] = { wins: 0, losses: 0, draws: 0, total: 0 }
        }
        tacticalHabits.winRateByFormation[formation].total++
        
        if (result.includes('W') || result.includes('Vittoria') || result.includes('Win')) {
          tacticalHabits.winRateByFormation[formation].wins++
        } else if (result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')) {
          tacticalHabits.winRateByFormation[formation].losses++
        } else {
          tacticalHabits.winRateByFormation[formation].draws++
        }
      })
    }

    // 7. Recupera pattern tattici (opzionale)
    const { data: tacticalPatterns, error: patternsError } = await admin
      .from('team_tactical_patterns')
      .select('formation_usage, playing_style_usage, recurring_issues')
      .eq('user_id', userId)
      .maybeSingle()

    // 9. Genera prompt contestuale con analisi approfondita
    const prompt = generateCountermeasuresPrompt(
      opponentFormation,
      roster,
      clientFormation,
      tacticalSettings,
      activeCoach,
      matchHistory || [],
      tacticalPatterns,
      {
        similarFormationMatches,
        playerPerformanceAgainstSimilar,
        tacticalHabits
      }
    )

    // Validazione dimensione prompt (max 50KB)
    const promptSize = prompt.length
    const MAX_PROMPT_SIZE = 50 * 1024
    if (promptSize > MAX_PROMPT_SIZE) {
      return NextResponse.json(
        { error: 'Countermeasures data too large. Please reduce data size.' },
        { status: 413 }
      )
    }

    // 10. Chiama GPT-5.2 (o fallback)
    // Prova prima gpt-5.2, poi gpt-5, poi gpt-4o
    const models = ['gpt-5.2', 'gpt-5', 'gpt-4o']
    let lastError = null
    let response = null

    for (const model of models) {
      try {
        const requestBody = {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 2000
        }

        response = await callOpenAIWithRetry(apiKey, requestBody, 'generate-countermeasures')
        
        if (response.ok) {
          break // Successo, esci dal loop
        }
        
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error?.code === 'model_not_found' || errorData.error?.message?.includes('not found')) {
          // Modello non disponibile, prova il prossimo
          lastError = errorData
          continue
        }
        
        // Altro errore, non retry
        throw new Error(errorData.error?.message || 'OpenAI API error')
      } catch (err) {
        if (err.message?.includes('model') || err.message?.includes('not found')) {
          lastError = err
          continue // Prova modello successivo
        }
        throw err // Altro errore, propaga
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: lastError?.message || 'Unable to generate countermeasures. Please try again.' },
        { status: 500 }
      )
    }

    // 11. Parsing risposta JSON
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { error: 'No content in response' },
        { status: 500 }
      )
    }

    let countermeasures
    try {
      countermeasures = JSON.parse(content)
    } catch (parseErr) {
      console.error('[generate-countermeasures] JSON parse error:', parseErr)
      return NextResponse.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      )
    }

    // 12. Validazione output
    const validation = validateCountermeasuresOutput(countermeasures)
    if (!validation.valid) {
      console.error('[generate-countermeasures] Validation error:', validation.error)
      return NextResponse.json(
        { error: `Invalid countermeasures format: ${validation.error}` },
        { status: 500 }
      )
    }

    // 13. Restituisci contromisure
    return NextResponse.json({
      success: true,
      countermeasures,
      model_used: data.model || 'unknown'
    })
  } catch (err) {
    console.error('[generate-countermeasures] Error:', err)
    
    let errorMessage = 'Error generating countermeasures'
    let statusCode = 500
    
    if (err.type === 'rate_limit') {
      errorMessage = 'Rate limit exceeded. Please try again later.'
      statusCode = 429
    } else if (err.type === 'timeout') {
      errorMessage = 'Request timeout. Please try again.'
      statusCode = 408
    } else if (err.message) {
      errorMessage = err.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
