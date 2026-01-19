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
    console.log(`[get-players] User ID: ${userId}, type: ${typeof userId}`)
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // WORKAROUND: .eq('user_id', userId) non funziona correttamente con serviceKey e UUID
    // Recuperiamo tutti i giocatori e filtriamo lato JavaScript (la query senza .eq() funziona)
    console.log(`[get-players] Querying players with user_id: ${userId} (type: ${typeof userId})`)
    
    const { data: allPlayers, error: queryError } = await admin
      .from('players')
      .select('*')
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('[get-players] Query error:', queryError.message)
      return NextResponse.json(
        { error: `Failed to fetch players: ${queryError.message}` },
        { status: 500 }
      )
    }

    // Filtra giocatori dell'utente lato JavaScript (workaround per bug .eq() con UUID)
    const playersList = (allPlayers || []).filter(p => String(p.user_id) === String(userId))
    console.log(`[get-players] Total players in DB: ${(allPlayers || []).length}, filtered for user_id ${userId}: ${playersList.length}`)
    
    if (playersList.length > 0) {
      playersList.forEach((p, idx) => {
        console.log(`[get-players] Player ${idx + 1}: id=${p.id}, user_id=${p.user_id}, player_name=${p.player_name}`)
      })
    } else {
      console.log(`[get-players] No players found for user_id: ${userId}`)
    }
    
    // Filtra solo giocatori validi (con nome)
    const validPlayers = Array.isArray(playersList) 
      ? playersList.filter(p => {
          const hasId = p && p.id
          const hasName = p?.player_name && typeof p.player_name === 'string' && p.player_name.trim().length > 0
          if (!hasId || !hasName) {
            console.warn(`[get-players] Filtered out player:`, { id: p?.id, hasId, hasName, player_name: p?.player_name })
          }
          return hasId && hasName
        })
      : []

    console.log(`[get-players] User ${userId}: Found ${validPlayers.length} valid players (from ${playersList.length} raw)`)

    return NextResponse.json({
      players: validPlayers,
      count: validPlayers.length
    })
  } catch (e) {
    console.error('[get-players] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}