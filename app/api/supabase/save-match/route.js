import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
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

    // Estrai dati match dal body
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
    } = await req.json()

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

    // Crea client Supabase con service role (per bypassare RLS se necessario)
    const supabase = createClient(supabaseUrl, serviceKey)

    // Prepara dati per inserimento
    const matchData = {
      user_id: userId,
      match_date: match_date || new Date().toISOString(),
      opponent_name: opponent_name || null,
      opponent_formation_id: opponent_formation_id || null,
      formation_played: formation_played || null,
      players_in_match: players_in_match || [],
      player_ratings: player_ratings || {},
      team_stats: team_stats || {},
      attack_areas: attack_areas || {},
      ball_recovery_zones: ball_recovery_zones || [],
      goals_events: goals_events || [],
      formation_discrepancies: formation_discrepancies || [],
      extracted_data: extracted_data || {},
      data_completeness: data_completeness || 'partial',
      missing_photos: missing_photos || [],
      analysis_status: 'pending', // Match salvato ma non ancora analizzato
      credits_used: 0 // Verrà aggiornato dopo analisi AI
    }

    // Inserisci match in database
    const { data: insertedMatch, error: insertError } = await supabase
      .from('matches')
      .insert(matchData)
      .select('id, user_id, match_date, analysis_status')
      .single()

    if (insertError) {
      console.error('[save-match] Insert error:', insertError.message)
      return NextResponse.json(
        { error: 'Failed to save match data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      match_id: insertedMatch.id,
      match_date: insertedMatch.match_date,
      analysis_status: insertedMatch.analysis_status,
      data_completeness: data_completeness,
      photos_missing: missing_photos || []
    })

  } catch (error) {
    console.error('[save-match] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save match data' },
      { status: 500 }
    )
  }
}
