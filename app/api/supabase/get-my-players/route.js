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
    
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 401 })
    }
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Query con retry per replica lag: se record recente (ultimi 30s), ritenta
    let players = null
    let playersErr = null
    let retries = 0
    const maxRetries = 2
    
    while (retries <= maxRetries) {
      const result = await admin
        .from('players')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10000)
      
      players = result.data || []
      playersErr = result.error
      
      if (playersErr) {
        console.error('[get-my-players] Query error:', playersErr.message, playersErr)
        return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
      }
      
      // Se non ci sono record recenti (ultimi 30s), la query è completa
      const now = new Date()
      const recentPlayers = players.filter(p => {
        if (!p.created_at) return false
        const created = new Date(p.created_at)
        const secondsAgo = (now - created) / 1000
        return secondsAgo < 30 // Record creato negli ultimi 30 secondi
      })
      
      // Se non ci sono record recenti o abbiamo già ritentato, OK
      if (recentPlayers.length === 0 || retries >= maxRetries) {
        break
      }
      
      // C'è un record recente - potrebbe essere replica lag, ritenta dopo 1s
      console.log(`[get-my-players] Found ${recentPlayers.length} recent player(s), retry ${retries + 1}/${maxRetries} after 1s (replica lag protection)`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      retries++
    }

    console.log('[get-my-players] Retrieved players:', players?.length || 0, `(${retries} retries)`)

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
