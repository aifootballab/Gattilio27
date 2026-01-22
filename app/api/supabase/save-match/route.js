import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

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
  
  if (!matchData.player_ratings || Object.keys(matchData.player_ratings).length === 0) {
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
  // Considera "complete" se ha almeno 4 su 5 sezioni
  return missing.length <= 1 ? 'complete' : 'partial'
}

/**
 * Calcola photos_uploaded (numero di sezioni con dati)
 */
function calculatePhotosUploaded(matchData) {
  let count = 0
  
  if (matchData.player_ratings && Object.keys(matchData.player_ratings).length > 0) count++
  if (matchData.team_stats && Object.keys(matchData.team_stats).length > 0) count++
  if (matchData.attack_areas && Object.keys(matchData.attack_areas).length > 0) count++
  if (matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0) count++
  if (matchData.formation_played || matchData.playing_style_played || matchData.team_strength) count++
  
  return count
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
    console.log(`[save-match] User ID: ${userId}`)
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { matchData } = await req.json()

    if (!matchData || typeof matchData !== 'object') {
      return NextResponse.json({ error: 'matchData is required' }, { status: 400 })
    }

    // Validazione: almeno una sezione deve avere dati
    const photosUploaded = calculatePhotosUploaded(matchData)
    if (photosUploaded === 0) {
      return NextResponse.json(
        { error: 'At least one section must have data' },
        { status: 400 }
      )
    }

    // Validazione lunghezza campi testo (max 255 caratteri)
    const MAX_TEXT_LENGTH = 255
    if (matchData.opponent_name && toText(matchData.opponent_name) && toText(matchData.opponent_name).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `opponent_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (matchData.result && toText(matchData.result) && toText(matchData.result).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `result exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (matchData.formation_played && toText(matchData.formation_played) && toText(matchData.formation_played).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `formation_played exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (matchData.playing_style_played && toText(matchData.playing_style_played) && toText(matchData.playing_style_played).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `playing_style_played exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // Calcola metadata
    const missingPhotos = calculateMissingPhotos(matchData)
    const dataCompleteness = calculateDataCompleteness(matchData)
    const creditsUsed = photosUploaded // 1 credito per foto

    // Prepara dati per inserimento
    const insertData = {
      user_id: userId,
      match_date: matchData.match_date ? new Date(matchData.match_date).toISOString() : new Date().toISOString(),
      opponent_name: toText(matchData.opponent_name),
      result: toText(matchData.result),
      is_home: typeof matchData.is_home === 'boolean' ? matchData.is_home : true,
      formation_played: toText(matchData.formation_played),
      playing_style_played: toText(matchData.playing_style_played),
      team_strength: toInt(matchData.team_strength),
      opponent_formation_id: matchData.opponent_formation_id || null,
      player_ratings: (matchData.player_ratings && Object.keys(matchData.player_ratings).length > 0) 
        ? matchData.player_ratings 
        : null,
      team_stats: (matchData.team_stats && Object.keys(matchData.team_stats).length > 0) 
        ? matchData.team_stats 
        : null,
      attack_areas: (matchData.attack_areas && Object.keys(matchData.attack_areas).length > 0) 
        ? matchData.attack_areas 
        : null,
      ball_recovery_zones: (matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0) 
        ? matchData.ball_recovery_zones 
        : null,
      goals_events: (matchData.goals_events && Array.isArray(matchData.goals_events) && matchData.goals_events.length > 0) 
        ? matchData.goals_events 
        : null,
      formation_discrepancies: (matchData.formation_discrepancies && Array.isArray(matchData.formation_discrepancies) && matchData.formation_discrepancies.length > 0) 
        ? matchData.formation_discrepancies 
        : null,
      extracted_data: matchData.extracted_data || {},
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos.length > 0 ? missingPhotos : null,
      data_completeness: dataCompleteness,
      credits_used: creditsUsed
    }

    // Inserisci in Supabase
    const { data: savedMatch, error: insertError } = await admin
      .from('matches')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[save-match] Supabase insert error:', insertError)
      return NextResponse.json(
        { error: insertError.message || 'Error saving match data' },
        { status: 500 }
      )
    }

    console.log(`[save-match] Match saved successfully: ${savedMatch.id}`)

    return NextResponse.json({
      success: true,
      match: savedMatch,
      photos_uploaded: photosUploaded,
      missing_photos: missingPhotos,
      data_completeness: dataCompleteness,
      credits_used: creditsUsed
    })
  } catch (err) {
    console.error('[save-match] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore salvataggio partita' },
      { status: 500 }
    )
  }
}
