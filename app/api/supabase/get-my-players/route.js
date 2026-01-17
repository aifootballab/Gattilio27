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
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 })
    }

    const userId = userData.user.id
    const userEmail = userData.user.email
    
    // LOG TEMPORANEO PER DEBUG
    console.log('[get-my-players] 🔍 USER ID FROM TOKEN:', userId)
    console.log('[get-my-players] 🔍 USER EMAIL FROM TOKEN:', userEmail)
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Recupera player_builds dell'utente
    const { data: builds, error: buildsErr } = await admin
      .from('player_builds')
      .select('id, player_base_id, final_overall_rating, current_level, level_cap, active_booster_name, source_data, created_at, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    // LOG TEMPORANEO PER DEBUG
    console.log('[get-my-players] 🔍 QUERY RESULT:', {
      userId,
      userEmail,
      buildsCount: builds?.length || 0,
      buildUserIds: builds?.map(b => b.user_id) || []
    })

    if (buildsErr) {
      console.error('[get-my-players] Query error:', buildsErr.message)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }
    
    if (!builds || builds.length === 0) {
      return NextResponse.json({ players: [], count: 0 })
    }
    
    // 2. Recupera players_base per i player_base_id trovati
    const playerBaseIds = builds.map(b => b.player_base_id).filter(id => id)
    
    if (playerBaseIds.length === 0) {
      return NextResponse.json({ players: [], count: 0 })
    }
    
    const { data: playersBase, error: baseErr } = await admin
      .from('players_base')
      .select(`
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
        metadata
      `)
      .in('id', playerBaseIds)

    if (baseErr) {
      console.error('[get-my-players] players_base query error:', baseErr.message)
    }
    
    // 3. Recupera playing_styles se necessario
    const playingStyleIds = [...new Set(playersBase?.map(pb => pb.playing_style_id).filter(id => id) || [])]
    let playingStylesMap = new Map()
    
    if (playingStyleIds.length > 0) {
      const { data: playingStyles } = await admin
        .from('playing_styles')
        .select('id, name')
        .in('id', playingStyleIds)
      
      if (playingStyles) {
        playingStylesMap = new Map(playingStyles.map(ps => [ps.id, ps]))
      }
    }

    // 4. Crea mappa per lookup veloce
    const playersBaseMap = new Map((playersBase || []).map(pb => [pb.id, pb]))
    
    // 5. Formatta i dati per il frontend
    const players = builds.map(build => {
      const base = playersBaseMap.get(build.player_base_id)
      const playingStyle = base?.playing_style_id ? playingStylesMap.get(base.playing_style_id) : null
      return {
        build_id: build.id,
        player_base_id: build.player_base_id,
        player_name: base?.player_name || 'Unknown',
        overall_rating: build.final_overall_rating || base?.base_stats?.overall_rating || null,
        position: base?.position || null,
        role: base?.role || null,
        playing_style_id: base?.playing_style_id || null,
        playing_style_name: playingStyle?.name || null,
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

    return NextResponse.json(
      { players, count: players.length },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (e) {
    console.error('[get-my-players] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}

function calculateCompleteness(base, build) {
  const hasStats = !!(base?.base_stats && (
    Object.keys(base.base_stats.attacking || {}).length > 0 ||
    Object.keys(base.base_stats.defending || {}).length > 0 ||
    Object.keys(base.base_stats.athleticism || {}).length > 0
  ))
  
  const hasOverallRating = !!(build?.final_overall_rating || base?.base_stats?.overall_rating)
  
  const fields = {
    base: !!base?.player_name && hasOverallRating && !!base?.position,
    stats: hasStats,
    physical: !!(base?.height && base?.weight && base?.age),
    skills: Array.isArray(base?.skills) && base.skills.length > 0,
    booster: !!build?.active_booster_name,
    team: !!base?.team,
    nationality: !!base?.nationality
  }
  
  const total = Object.keys(fields).length
  const completed = Object.values(fields).filter(Boolean).length
  const percentage = Math.round((completed / total) * 100)
  
  const missing = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key]) => key)
  
  return { percentage, missing, fields }
}

