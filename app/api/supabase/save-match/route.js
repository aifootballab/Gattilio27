import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Estrai dati match dal body (una sola volta)
    const requestData = await req.json()
    const {
      match_date,
      opponent_name,
      opponent_formation_id,
      formation_played,
      players_in_match,
      player_ratings,
      team_stats,
      attack_areas,
      ball_recovery_zones,
      goals_events,
      formation_discrepancies,
      extracted_data,
      data_completeness,
      missing_photos
    } = requestData

    // Validazione base
    if (!players_in_match || !Array.isArray(players_in_match)) {
      return NextResponse.json(
        { error: 'Invalid match data: players_in_match is required' },
        { status: 400 }
      )
    }

    // Validazione dimensione JSONB (Supabase gestisce automaticamente, ma validiamo per sicurezza)
    const jsonbFields = {
      players_in_match,
      player_ratings,
      team_stats,
      attack_areas,
      ball_recovery_zones,
      goals_events,
      formation_discrepancies,
      extracted_data
    }

    for (const [field, value] of Object.entries(jsonbFields)) {
      if (value && JSON.stringify(value).length > 10 * 1024 * 1024) { // 10MB max
        return NextResponse.json(
          { error: `Field ${field} exceeds maximum size` },
          { status: 400 }
        )
      }
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Normalizza player_ratings (mantieni come oggetto, schema DB accetta JSONB)
    const normalizedPlayerRatings = player_ratings || {}

    // Calcola photos_uploaded (campo presente nello schema DB)
    // REGOLA: photos_uploaded = numero di foto FISICHE caricate dal cliente
    // Il valore viene passato da extract-match-data come photos_processed
    // Se non presente, calcoliamo da missing_photos o dai dati disponibili
    let photosUploaded = 0
    
    // Priorità 1: Usa photos_processed se presente (conta foto fisiche processate)
    if (requestData.photos_processed !== undefined && requestData.photos_processed !== null) {
      photosUploaded = parseInt(requestData.photos_processed) || 0
    }
    // Priorità 2: Calcola da missing_photos (se array: 6 - missing_photos.length)
    else if (Array.isArray(missing_photos)) {
      photosUploaded = 6 - missing_photos.length
    }
    // Priorità 3: Fallback - conta dati presenti (meno accurato ma funziona)
    else {
      // Conta foto presenti nei dati estratti
      if (formation_played) photosUploaded++
      if (player_ratings && Object.keys(player_ratings).length > 0) photosUploaded++
      if (team_stats && Object.keys(team_stats).length > 0) photosUploaded++
      if (attack_areas && Object.keys(attack_areas).length > 0) photosUploaded++
      if (ball_recovery_zones && (Array.isArray(ball_recovery_zones) ? ball_recovery_zones.length > 0 : Object.keys(ball_recovery_zones).length > 0)) photosUploaded++
      if (goals_events && Array.isArray(goals_events) && goals_events.length > 0) photosUploaded++
    }
    
    // Assicura che photos_uploaded sia >= 0 e <= 20 (limite aumentato per supportare più foto per sezione)
    photosUploaded = Math.max(0, Math.min(20, photosUploaded))
    
    // Normalizza missing_photos (Supabase usa ARRAY TEXT, non JSONB)
    // Deve essere array di stringhe, non oggetti
    const normalizedMissingPhotos = Array.isArray(missing_photos) 
      ? missing_photos.filter(p => typeof p === 'string') // Filtra solo stringhe
      : (missing_photos ? [String(missing_photos)] : [])
    
    // Normalizza data_completeness (deve essere 'complete' o 'partial')
    const normalizedDataCompleteness = (data_completeness === 'complete' || data_completeness === 'partial') 
      ? data_completeness 
      : 'partial'

    // Prepara dati per inserimento (tutti i campi presenti nello schema DB)
    const matchData = {
      user_id: userId,
      match_date: match_date || new Date().toISOString(),
      opponent_name: opponent_name || null,
      opponent_formation_id: opponent_formation_id || null,
      formation_played: formation_played || null,
      playing_style_played: null, // Da aggiungere in futuro se estratto
      team_strength: null, // Da aggiungere in futuro se estratto
      result: null, // Da aggiungere in futuro se estratto
      is_home: true, // Default
      players_in_match: Array.isArray(players_in_match) ? players_in_match : [],
      player_ratings: normalizedPlayerRatings, // Mantieni come oggetto (schema DB accetta JSONB)
      team_stats: team_stats || {},
      attack_areas: attack_areas || {},
      ball_recovery_zones: Array.isArray(ball_recovery_zones) ? ball_recovery_zones : [],
      goals_events: Array.isArray(goals_events) ? goals_events : [],
      formation_discrepancies: Array.isArray(formation_discrepancies) ? formation_discrepancies : [],
      extracted_data: extracted_data || {},
      photos_uploaded: photosUploaded, // Numero foto fisiche caricate
      missing_photos: normalizedMissingPhotos, // Array foto mancanti
      data_completeness: normalizedDataCompleteness, // 'complete' o 'partial'
      credits_used: requestData.credits_used || 0, // Credits spesi per estrazione
      analysis_status: 'pending' // Match salvato ma non ancora analizzato
    }

    // Inserisci match in database
    const { data: insertedMatch, error: insertError } = await admin
      .from('matches')
      .insert(matchData)
      .select('id, user_id, match_date, analysis_status')
      .single()

    if (insertError) {
      console.error('[save-match] Insert error:', insertError)
      console.error('[save-match] Error details:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      })
      return NextResponse.json(
        { 
          error: 'Failed to save match data',
          details: process.env.NODE_ENV === 'development' ? insertError.message : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      match_id: insertedMatch.id,
      match_date: insertedMatch.match_date,
      analysis_status: insertedMatch.analysis_status,
      data_completeness: normalizedDataCompleteness, // Dato salvato in DB
      photos_missing: normalizedMissingPhotos, // Dato salvato in DB
      photos_uploaded: photosUploaded, // Dato salvato in DB
      credits_used: requestData.credits_used || 0 // Dato salvato in DB
    })

  } catch (error) {
    console.error('[save-match] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save match data' },
      { status: 500 }
    )
  }
}
