import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase server env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const auth = req.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })

    const authClient = createClient(supabaseUrl, anonKey)
    const { data: userData, error: userErr } = await authClient.auth.getUser(token)
    if (userErr || !userData?.user?.id) {
      return NextResponse.json(
        {
          error: 'Invalid auth',
          details: userErr?.message || null,
        },
        { status: 401 }
      )
    }
    const userId = userData.user.id
    const admin = createClient(supabaseUrl, serviceKey)

    // Cancella SOLO i dati dell’utente corrente (anon): non tocca players_base globali
    const results = {}

    const r1 = await admin.from('user_rosa').delete().eq('user_id', userId)
    results.user_rosa = { error: r1.error?.message || null }

    const r2 = await admin.from('player_builds').delete().eq('user_id', userId)
    results.player_builds = { error: r2.error?.message || null }

    const r3 = await admin.from('screenshot_processing_log').delete().eq('user_id', userId)
    results.screenshot_processing_log = { error: r3.error?.message || null }

    // Cancella SOLO i players_base creati da questa app per questo user_id (tag in metadata)
    const r4 = await admin
      .from('players_base')
      .delete()
      .eq('source', 'screenshot_extractor')
      .contains('metadata', { source: 'screenshot_extractor', user_id: userId })
    results.players_base_test_only = { error: r4.error?.message || null }

    return NextResponse.json({ success: true, user_id: userId, results })
  } catch (e) {
    console.error('reset-my-data error', e)
    return NextResponse.json({ error: e?.message || 'Errore server' }, { status: 500 })
  }
}

