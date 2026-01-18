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

    // Debug: verifica headers
    const authHeader = req.headers.get('authorization')
    console.log('[get-my-players] Auth header present:', !!authHeader)
    console.log('[get-my-players] Auth header value (first 30 chars):', authHeader ? authHeader.substring(0, 30) + '...' : 'null')
    console.log('[get-my-players] All headers:', Object.fromEntries(req.headers.entries()))
    
    const token = extractBearerToken(req)
    if (!token) {
      console.error('[get-my-players] ❌ Token extraction failed')
      console.error('[get-my-players] Authorization header:', authHeader || 'MISSING')
      return NextResponse.json({ 
        error: 'Missing Authorization bearer token',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null
        }
      }, { status: 401 })
    }
    
    console.log('[get-my-players] ✅ Token extracted (first 30 chars):', token.substring(0, 30) + '...')

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid auth' }, { status: 401 })
    }

    const userId = userData.user.id
    
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 401 })
    }
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Query semplice e diretta - service_role_key legge dal leader (no replica lag)
    const { data: players, error: playersErr } = await admin
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10000)

    if (playersErr) {
      console.error('[get-my-players] Query error:', playersErr.message, playersErr)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
    }

    console.log('[get-my-players] Retrieved players:', players?.length || 0)
    console.log('[get-my-players] User ID:', userId)
    console.log('[get-my-players] Raw players count:', players?.length || 0)

    // Recupera playing_styles se necessario
    const playingStyleIds = [...new Set((players || []).map(p => p.playing_style_id).filter(id => id))]
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

    // Formatta per frontend - nessun filtro, tutti i giocatori
    const formattedPlayers = (players || []).map(player => {
      const playingStyle = player.playing_style_id ? playingStylesMap.get(player.playing_style_id) : null
      
      return {
        id: player.id,
        player_name: player.player_name,
        position: player.position,
        card_type: player.card_type,
        team: player.team,
        overall_rating: player.overall_rating,
        base_stats: player.base_stats || {},
        skills: player.skills || [],
        com_skills: player.com_skills || [],
        position_ratings: player.position_ratings || {},
        available_boosters: player.available_boosters || [],
        height: player.height,
        weight: player.weight,
        age: player.age,
        nationality: player.nationality,
        club_name: player.club_name,
        form: player.form,
        role: player.role,
        playing_style_id: player.playing_style_id,
        playing_style_name: playingStyle?.name || null,
        current_level: player.current_level,
        level_cap: player.level_cap,
        active_booster_name: player.active_booster_name,
        development_points: player.development_points || {},
        slot_index: player.slot_index,
        metadata: player.metadata || {},
        extracted_data: player.extracted_data,
        completeness: calculateCompleteness(player),
        created_at: player.created_at,
        updated_at: player.updated_at
      }
    })
    
    console.log('[get-my-players] Formatted players count:', formattedPlayers.length)
    console.log('[get-my-players] Sample player IDs:', formattedPlayers.slice(0, 10).map(p => ({ id: p.id, name: p.player_name })))
    
    return NextResponse.json(
      { 
        players: formattedPlayers, 
        count: formattedPlayers.length 
      },
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

function calculateCompleteness(player) {
  // Calcola completezza senza filtrare giocatori - solo per display
  const hasStats = !!(player.base_stats && typeof player.base_stats === 'object' && (
    (player.base_stats.attacking && Object.keys(player.base_stats.attacking).length > 0) ||
    (player.base_stats.defending && Object.keys(player.base_stats.defending).length > 0) ||
    (player.base_stats.athleticism && Object.keys(player.base_stats.athleticism).length > 0)
  ))
  
  const hasOverallRating = !!player.overall_rating
  
  const fields = {
    base: !!player.player_name && hasOverallRating && !!player.position,
    stats: hasStats,
    physical: !!(player.height && player.weight && player.age),
    skills: Array.isArray(player.skills) && player.skills.length > 0,
    booster: !!player.active_booster_name,
    team: !!player.team,
    nationality: !!player.nationality
  }
  
  const total = Object.keys(fields).length
  const completed = Object.values(fields).filter(Boolean).length
  const percentage = Math.round((completed / total) * 100)
  
  const missing = Object.entries(fields)
    .filter(([_, value]) => !value)
    .map(([key]) => key)
  
  return { percentage, missing, fields }
}
