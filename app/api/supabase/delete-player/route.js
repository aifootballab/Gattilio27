import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req) {
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
    
    // Leggi body - Next.js DELETE può avere body JSON
    let player_id
    try {
      const text = await req.text()
      if (text) {
        try {
          const body = JSON.parse(text)
          player_id = body?.player_id || body?.playerId || body?.id
        } catch (e) {
          // Se non è JSON valido, prova come stringa diretta
          player_id = text.trim() || null
        }
      }
    } catch (e) {
      console.error('[delete-player] Error reading body:', e)
    }

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 })
    }

    // Normalizza player_id
    const playerIdStr = String(player_id).trim()
    
    // Validazione UUID base (deve essere UUID valido)
    if (playerIdStr.length < 30 || playerIdStr.length > 40) {
      return NextResponse.json({ error: 'Invalid player_id format' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verifica che il giocatore appartenga all'utente
    const { data: player, error: fetchError } = await admin
      .from('players')
      .select('id, user_id, player_name')
      .eq('id', playerIdStr)
      .eq('user_id', userId)
      .single()

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
    }

    // Elimina giocatore
    const { error: deleteError } = await admin
      .from('players')
      .delete()
      .eq('id', playerIdStr)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[delete-player] Delete error:', deleteError)
      return NextResponse.json(
        { error: `Failed to delete player: ${deleteError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      player_id: playerIdStr,
      player_name: player.player_name
    })
  } catch (err) {
    console.error('[delete-player] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore eliminazione giocatore' },
      { status: 500 }
    )
  }
}
