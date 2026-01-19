import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req) {
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

    // Estrai body
    const { playerId1, playerId2 } = await req.json()

    if (!playerId1 || !playerId2) {
      return NextResponse.json(
        { error: 'playerId1 and playerId2 are required' },
        { status: 400 }
      )
    }

    // Crea Supabase admin client
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verifica che entrambi i giocatori appartengano all'utente
    const { data: player1, error: err1 } = await admin
      .from('players')
      .select('id, slot_index, user_id')
      .eq('id', playerId1)
      .single()

    if (err1 || !player1) {
      return NextResponse.json(
        { error: 'Player 1 not found' },
        { status: 404 }
      )
    }

    if (player1.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Player 1 does not belong to user' },
        { status: 403 }
      )
    }

    const { data: player2, error: err2 } = await admin
      .from('players')
      .select('id, slot_index, user_id')
      .eq('id', playerId2)
      .single()

    if (err2 || !player2) {
      return NextResponse.json(
        { error: 'Player 2 not found' },
        { status: 404 }
      )
    }

    if (player2.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Player 2 does not belong to user' },
        { status: 403 }
      )
    }

    // Swap slot_index
    const slotIndex1 = player1.slot_index
    const slotIndex2 = player2.slot_index

    // Aggiorna entrambi i giocatori in transazione (simulata con Promise.all)
    const [update1, update2] = await Promise.all([
      admin
        .from('players')
        .update({ 
          slot_index: slotIndex2,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId1),
      admin
        .from('players')
        .update({ 
          slot_index: slotIndex1,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId2)
    ])

    if (update1.error) {
      console.error('[swap-formation] Error updating player1:', update1.error)
      return NextResponse.json(
        { error: 'Failed to update player 1' },
        { status: 500 }
      )
    }

    if (update2.error) {
      console.error('[swap-formation] Error updating player2:', update2.error)
      return NextResponse.json(
        { error: 'Failed to update player 2' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Formation swapped successfully',
      player1: { id: playerId1, slot_index: slotIndex2 },
      player2: { id: playerId2, slot_index: slotIndex1 }
    })
  } catch (err) {
    console.error('[swap-formation] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore swap formazione' },
      { status: 500 }
    )
  }
}
