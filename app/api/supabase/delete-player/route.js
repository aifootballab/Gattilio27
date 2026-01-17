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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { searchParams } = new URL(req.url)
    const playerId = searchParams.get('id')

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Verifica che il giocatore appartenga all'utente e cancella
    const { error: deleteErr } = await admin
      .from('players')
      .delete()
      .eq('id', playerId)
      .eq('user_id', userId)

    if (deleteErr) {
      console.error('[delete-player] Delete error:', deleteErr.message)
      return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[delete-player] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
