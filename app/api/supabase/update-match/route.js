import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../../lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}

/**
 * Calcola quali sezioni sono mancanti
 */
function calculateMissingPhotos(matchData) {
  const missing = []
  
  const hasPlayerRatings = matchData.player_ratings && (
    (matchData.player_ratings.cliente && Object.keys(matchData.player_ratings.cliente).length > 0) ||
    (matchData.player_ratings.avversario && Object.keys(matchData.player_ratings.avversario).length > 0) ||
    (typeof matchData.player_ratings === 'object' && !matchData.player_ratings.cliente && !matchData.player_ratings.avversario && Object.keys(matchData.player_ratings).length > 0)
  )
  
  if (!hasPlayerRatings) {
    missing.push('player_ratings')
  }
  if (!matchData.team_stats || Object.keys(matchData.team_stats).length === 0) {
    missing.push('team_stats')
  }
  if (!matchData.attack_areas || Object.keys(matchData.attack_areas).length === 0) {
    missing.push('attack_areas')
  }
  if (!matchData.ball_recovery_zones || !Array.isArray(matchData.ball_recovery_zones) || matchData.ball_recovery_zones.length === 0) {
    missing.push('ball_recovery_zones')
  }
  if (!matchData.formation_played && !matchData.playing_style_played && !matchData.team_strength) {
    missing.push('formation_style')
  }
  
  return missing
}

/**
 * Calcola data_completeness
 */
function calculateDataCompleteness(matchData) {
  const missing = calculateMissingPhotos(matchData)
  // Considera "complete" solo se tutte le 5 sezioni hanno dati (0 mancanti)
  return missing.length === 0 ? 'complete' : 'partial'
}

/**
 * Calcola photos_uploaded
 */
function calculatePhotosUploaded(matchData) {
  let count = 0
  
  const hasPlayerRatings = matchData.player_ratings && (
    (matchData.player_ratings.cliente && Object.keys(matchData.player_ratings.cliente).length > 0) ||
    (matchData.player_ratings.avversario && Object.keys(matchData.player_ratings.avversario).length > 0) ||
    (typeof matchData.player_ratings === 'object' && !matchData.player_ratings.cliente && !matchData.player_ratings.avversario && Object.keys(matchData.player_ratings).length > 0)
  )
  
  if (hasPlayerRatings) count++
  if (matchData.team_stats && Object.keys(matchData.team_stats).length > 0) count++
  if (matchData.attack_areas && Object.keys(matchData.attack_areas).length > 0) count++
  if (matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0) count++
  if (matchData.formation_played || matchData.playing_style_played || matchData.team_strength) count++
  
  return count
}

/**
 * Merge dati esistenti con nuovi dati
 */
function mergeMatchData(existing, newData, section) {
  const merged = { ...existing }

  if (section === 'player_ratings') {
    // newData è già normalizzato: { cliente: {...}, avversario: {...} } o { ...ratings... }
    // NON è wrappato in player_ratings
    if (newData && typeof newData === 'object') {
      if (newData.cliente || newData.avversario) {
        // Struttura nuova con cliente/avversario
        merged.player_ratings = {
          cliente: { ...(merged.player_ratings?.cliente || {}), ...(newData.cliente || {}) },
          avversario: { ...(merged.player_ratings?.avversario || {}), ...(newData.avversario || {}) }
        }
      } else {
        // Struttura vecchia (compatibilità retroattiva)
        merged.player_ratings = { ...(merged.player_ratings || {}), ...newData }
      }
    }
  } else if (section === 'team_stats') {
    // newData contiene direttamente le statistiche (non wrappate in team_stats)
    // Rimuovi result se presente (viene gestito separatamente)
    const statsWithoutResult = { ...newData }
    delete statsWithoutResult.result
    merged.team_stats = { ...(merged.team_stats || {}), ...statsWithoutResult }
  } else if (section === 'attack_areas') {
    // newData contiene direttamente le aree (non wrappate in attack_areas)
    merged.attack_areas = { ...(merged.attack_areas || {}), ...newData }
  } else if (section === 'ball_recovery_zones') {
    // newData è già normalizzato: array diretto [...zones...]
    // NON è wrappato in ball_recovery_zones
    const existingZones = Array.isArray(merged.ball_recovery_zones) ? merged.ball_recovery_zones : []
    const newZones = Array.isArray(newData) ? newData : (Array.isArray(newData.ball_recovery_zones) ? newData.ball_recovery_zones : [])
    merged.ball_recovery_zones = [...existingZones, ...newZones]
  } else if (section === 'formation_style') {
    if (newData.formation_played) merged.formation_played = toText(newData.formation_played)
    if (newData.playing_style_played) merged.playing_style_played = toText(newData.playing_style_played)
    if (newData.team_strength !== undefined) merged.team_strength = toInt(newData.team_strength)
  }

  // Merge extracted_data
  merged.extracted_data = {
    ...(merged.extracted_data || {}),
    ...(newData.extracted_data || {}),
    [section]: newData.extracted_data?.[section] || newData
  }

  return merged
}

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
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
    const { match_id, section, data, result } = await req.json()

    if (!match_id || !section || !data) {
      return NextResponse.json({ error: 'match_id, section, and data are required' }, { status: 400 })
    }

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/supabase/update-match']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/supabase/update-match',
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Recupera match esistente
    const { data: existingMatch, error: fetchError } = await admin
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingMatch) {
      return NextResponse.json({ error: 'Match not found or access denied' }, { status: 404 })
    }

    // Se client_team_name non è presente, recuperalo da user_profiles
    let clientTeamName = existingMatch.client_team_name
    if (!clientTeamName) {
      try {
        const { data: userProfile } = await admin
          .from('user_profiles')
          .select('team_name')
          .eq('user_id', userId)
          .maybeSingle()
        
        clientTeamName = userProfile?.team_name
        
        // Fallback: prova a recuperare da coaches.team se non presente
        if (!clientTeamName) {
          const { data: activeCoach } = await admin
            .from('coaches')
            .select('team')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle()
          clientTeamName = activeCoach?.team
        }
      } catch (err) {
        console.warn('[update-match] Error retrieving team_name:', err)
        // Non bloccare update se errore recupero team_name
      }
    }

    // 2. Merge dati
    const mergedData = mergeMatchData(existingMatch, data, section)

    // 3. Estrai risultato se presente (può essere nel data o come parametro separato, da qualsiasi sezione)
    let finalResult = existingMatch.result
    if (result && typeof result === 'string' && result.trim()) {
      // Priorità 1: parametro result separato (viene passato dal frontend quando estratto da qualsiasi sezione)
      finalResult = result.trim()
    } else if (data && data.result && typeof data.result === 'string' && data.result.trim()) {
      // Priorità 2: result nei dati normalizzati (per compatibilità)
      finalResult = data.result.trim()
    } else if (mergedData.team_stats && mergedData.team_stats.result) {
      // Priorità 3: result in team_stats merged (per compatibilità retroattiva)
      finalResult = mergedData.team_stats.result
      // Rimuovi result da team_stats (non fa parte delle statistiche)
      delete mergedData.team_stats.result
    }
    // Nota: il risultato viene estratto da TUTTE le sezioni (player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_style)
    // e viene passato come parametro separato 'result' dal frontend, quindi la priorità 1 dovrebbe sempre catturarlo

    // 4. Calcola metadata aggiornati
    const missingPhotos = calculateMissingPhotos(mergedData)
    const dataCompleteness = calculateDataCompleteness(mergedData)
    const photosUploaded = calculatePhotosUploaded(mergedData)
    
    // Log per debug
    console.log(`[update-match] Section: ${section}`)
    console.log(`[update-match] Missing photos before: ${existingMatch.missing_photos?.length || 0}`)
    console.log(`[update-match] Missing photos after: ${missingPhotos.length}`)
    console.log(`[update-match] Photos uploaded: ${photosUploaded}`)
    console.log(`[update-match] Data completeness: ${dataCompleteness}`)

    // 5. Prepara update (usa mergedData, che contiene già i dati esistenti mergiati con i nuovi)
    const updateData = {
      result: finalResult || existingMatch.result,
      client_team_name: toText(clientTeamName) || existingMatch.client_team_name || null, // Aggiorna solo se recuperato
      player_ratings: mergedData.player_ratings,
      team_stats: (mergedData.team_stats && Object.keys(mergedData.team_stats).length > 0) ? mergedData.team_stats : null,
      attack_areas: (mergedData.attack_areas && Object.keys(mergedData.attack_areas).length > 0) ? mergedData.attack_areas : null,
      ball_recovery_zones: (mergedData.ball_recovery_zones && Array.isArray(mergedData.ball_recovery_zones) && mergedData.ball_recovery_zones.length > 0) ? mergedData.ball_recovery_zones : null,
      formation_played: toText(mergedData.formation_played) || existingMatch.formation_played,
      playing_style_played: toText(mergedData.playing_style_played) || existingMatch.playing_style_played,
      team_strength: toInt(mergedData.team_strength) ?? existingMatch.team_strength,
      extracted_data: mergedData.extracted_data || existingMatch.extracted_data || {},
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos.length > 0 ? missingPhotos : null,
      data_completeness: dataCompleteness,
      updated_at: new Date().toISOString()
    }

    // 5. Aggiorna match
    const { data: updatedMatch, error: updateError } = await admin
      .from('matches')
      .update(updateData)
      .eq('id', match_id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[update-match] Supabase update error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Error updating match' },
        { status: 500 }
      )
    }

    console.log(`[update-match] Match updated successfully: ${updatedMatch.id}`)
    console.log(`[update-match] Final missing_photos: ${updatedMatch.missing_photos?.length || 0}`)
    console.log(`[update-match] Final data_completeness: ${updatedMatch.data_completeness}`)
    console.log(`[update-match] Final photos_uploaded: ${updatedMatch.photos_uploaded}`)

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos,
      data_completeness: dataCompleteness
    })
  } catch (err) {
    console.error('[update-match] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error updating match' },
      { status: 500 }
    )
  }
}
