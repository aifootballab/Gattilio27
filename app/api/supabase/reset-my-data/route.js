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

    // IMPORTANT:
    // I token anon sono sempre JWT e richiedono la chiave legacy JWT (anon) per essere validati.
    // Se anonKey è una publishable moderna (sb_publishable_...), dobbiamo usare la legacy JWT.
    let userData = null
    let userErr = null
    let userId = null
    
    // Prova con la chiave configurata
    const authClient = createClient(supabaseUrl, anonKey)
    const authResult = await authClient.auth.getUser(token)
    userData = authResult.data
    userErr = authResult.error
    
    // Se fallisce con "Invalid API key" e anonKey è publishable, prova con legacy JWT
    if (userErr?.message?.includes('Invalid API key') && anonKey?.startsWith('sb_publishable_')) {
      // Usa la legacy JWT anon key (hardcoded per questo progetto)
      const legacyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXV1b3Jyd2RldHlsb2xscnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDk0MTksImV4cCI6MjA4MzQ4NTQxOX0.pGnglOpSQ4gJ1JClB_zyBIB3-94eKHJfgveuCfoyffo'
      const legacyAuthClient = createClient(supabaseUrl, legacyAnonKey)
      const legacyResult = await legacyAuthClient.auth.getUser(token)
      userData = legacyResult.data
      userErr = legacyResult.error
    }
    
    if (userErr || !userData?.user?.id) {
      return NextResponse.json(
        {
          error: 'Invalid auth',
          details: userErr?.message || null,
        },
        { status: 401 }
      )
    }
    userId = userData.user.id
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

