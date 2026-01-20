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
    const { player_id } = await req.json()

    if (!player_id || typeof player_id !== 'string') {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verifica che il giocatore appartenga all'utente
    const { data: player, error: fetchError } = await admin
      .from('players')
      .select('id, user_id, player_name')
      .eq('id', player_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
    }

    // Elimina giocatore
    const { error: deleteError } = await admin
      .from('players')
      .delete()
      .eq('id', player_id)
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
      player_id: player_id,
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
