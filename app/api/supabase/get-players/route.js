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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Recupera giocatori dell'utente (ordinati per data creazione)
    const { data: players, error: queryError } = await admin
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('[get-players] Query error:', queryError.message)
      return NextResponse.json(
        { error: `Failed to fetch players: ${queryError.message}` },
        { status: 500 }
      )
    }

    // Gestione risposta: players può essere null o array
    const playersList = players || []
    
    // Filtra solo giocatori validi (con nome)
    const validPlayers = Array.isArray(playersList) 
      ? playersList.filter(p => p && p.id && p.player_name)
      : []

    console.log(`[get-players] User ${userId}: Found ${validPlayers.length} players`)

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