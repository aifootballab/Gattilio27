import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase server env missing' },
        { status: 500 }
      )
    }

    // Estrai e valida token (stesso sistema di save-player)
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    console.log('[get-my-players] Validating token:', { tokenPrefix: token.substring(0, 20) + '...' })

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      const errorMsg = authError?.message || String(authError) || 'Unknown auth error'
      console.error('[get-my-players] Auth validation failed:', { error: errorMsg, hasUserData: !!userData, hasUserId: !!userData?.user?.id })
      return NextResponse.json({ error: 'Invalid auth', details: errorMsg }, { status: 401 })
    }
    
    const userId = userData.user.id
    const userEmail = userData.user.email
    console.log('[get-my-players] Auth OK, userId:', userId, 'email:', userEmail || 'anon')
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Recupera player_builds dell'utente con join a players_base
    const { data: builds, error: buildsErr } = await admin
      .from('player_builds')
      .select(`
        id,
        player_base_id,
        final_overall_rating,
        current_level,
        level_cap,
        active_booster_name,
        source_data,
        players_base (
          id,
          player_name,
          position,
          card_type,
          team,
          base_stats,
          skills,
          com_skills,
          position_ratings,
          available_boosters,
          height,
          weight,
          age,
          nationality,
          club_name,
          form,
          role,
          playing_style_id,
          metadata,
          playing_styles (
            id,
            name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (buildsErr) {
      console.error('[get-my-players] Error fetching builds:', buildsErr)
      return NextResponse.json({ error: 'Failed to fetch players', details: buildsErr.message }, { status: 500 })
    }

    // Formatta i dati per il frontend
    const players = (builds || []).map(build => {
      const base = build.players_base
      return {
        build_id: build.id,
        player_base_id: build.player_base_id,
        player_name: base?.player_name || 'Unknown',
        overall_rating: build.final_overall_rating || base?.base_stats?.overall_rating || null,
        position: base?.position || null,
        role: base?.role || null,
        playing_style_id: base?.playing_style_id || null,
        playing_style_name: base?.playing_styles?.name || null,
        card_type: base?.card_type || null,
        team: base?.team || null,
        club_name: base?.club_name || null,
        level: build.current_level || null,
        level_cap: build.level_cap || null,
        booster: build.active_booster_name || null,
        skills: base?.skills || [],
        com_skills: base?.com_skills || [],
        base_stats: base?.base_stats || null,
        position_ratings: base?.position_ratings || null,
        available_boosters: base?.available_boosters || null,
        height: base?.height || null,
        weight: base?.weight || null,
        age: base?.age || null,
        nationality: base?.nationality || null,
        form: base?.form || null,
        metadata: base?.metadata || null,
        extracted_data: build.source_data?.extracted || base?.metadata?.extracted || null,
        completeness: calculateCompleteness(base, build)
      }
    })

    return NextResponse.json({ players, count: players.length })
  } catch (e) {
    console.error('[get-my-players] Unhandled exception:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server', details: process.env.NODE_ENV === 'development' ? String(e) : null },
      { status: 500 }
    )
  }
}

function calculateCompleteness(base, build) {
  // Controlla se base_stats ha effettivamente dati (coerente con extract-batch)
  const hasStats = !!(base?.base_stats && (
    Object.keys(base.base_stats.attacking || {}).length > 0 ||
    Object.keys(base.base_stats.defending || {}).length > 0 ||
    Object.keys(base.base_stats.athleticism || {}).length > 0
  ))
  
  const fields = {
    base: !!base?.player_name && !!build?.final_overall_rating && !!base?.position,
    stats: hasStats, // Usa la logica corretta invece di solo !!base?.base_stats
    physical: !!(base?.height && base?.weight && base?.age),
    skills: Array.isArray(base?.skills) && base.skills.length > 0,
    booster: !!build?.active_booster_name,
    team: !!base?.team,
    nationality: !!base?.nationality
  }
  
  // Dettaglio campi mancanti specifici
  const missingDetails = {
    // Stats dettagliate
    missing_stats: {
      has_attacking: !!(base?.base_stats?.attacking && Object.keys(base.base_stats.attacking).length > 0),
      has_defending: !!(base?.base_stats?.defending && Object.keys(base.base_stats.defending).length > 0),
      has_athleticism: !!(base?.base_stats?.athleticism && Object.keys(base.base_stats.athleticism).length > 0),
    },
    // Skills e caratteristiche
    missing_skills: !Array.isArray(base?.skills) || base.skills.length === 0,
    missing_com_skills: !Array.isArray(base?.com_skills) || base.com_skills.length === 0,
    missing_ai_playstyles: !Array.isArray(base?.metadata?.ai_playstyles) || base.metadata?.ai_playstyles?.length === 0,
    missing_additional_positions: !base?.position_ratings || Object.keys(base.position_ratings || {}).length === 0,
    missing_boosters: !Array.isArray(base?.available_boosters) || base.available_boosters.length === 0,
    // Caratteristiche
    missing_weak_foot: !base?.metadata?.weak_foot_frequency || !base?.metadata?.weak_foot_accuracy,
    missing_form_detailed: !base?.metadata?.form_detailed,
    missing_injury_resistance: !base?.metadata?.injury_resistance,
    // Dati base
    missing_physical: !base?.height || !base?.weight || !base?.age,
    missing_team: !base?.team,
    missing_nationality: !base?.nationality,
  }
  
  const total = Object.keys(fields).length
  const completed = Object.values(fields).filter(Boolean).length
  const percentage = Math.round((completed / total) * 100)
  
  const missing = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key]) => key)
  
  return { percentage, missing, fields, missingDetails }
}
