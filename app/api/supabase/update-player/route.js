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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { playerId, updates } = await req.json()

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Verifica che il giocatore appartenga all'utente
    const { data: existingPlayer, error: checkErr } = await admin
      .from('players')
      .select('id, user_id')
      .eq('id', playerId)
      .eq('user_id', userId)
      .maybeSingle()

    if (checkErr || !existingPlayer) {
      return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
    }

    // Aggiorna giocatore
    const { data: updated, error: updateErr } = await admin
      .from('players')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (updateErr) {
      console.error('[update-player] Update error:', updateErr.message)
      return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
    }

    return NextResponse.json({ success: true, player_id: updated.id })
  } catch (e) {
    console.error('[update-player] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
