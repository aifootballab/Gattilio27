import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase env missing' },
        { status: 500 }
      )
    }

    const auth = req.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null
    
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    // Validazione token (stesso sistema di save-player)
    const legacyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXV1b3Jyd2RldHlsb2xscnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDk0MTksImV4cCI6MjA4MzQ4NTQxOX0.pGnglOpSQ4gJ1JClB_zyBIB3-94eKHJfgveuCfoyffo'
    let userData = null
    let userErr = null
    
    try {
      const legacyAuthClient = createClient(supabaseUrl, legacyAnonKey)
      const legacyResult = await legacyAuthClient.auth.getUser(token)
      userData = legacyResult.data
      userErr = legacyResult.error
      if (!userErr && userData?.user?.id) {
        console.log('[get-opponent-formations] Token validated with legacy JWT key')
      }
    } catch (legacyErr) {
      userErr = legacyErr
    }
    
    if (userErr && anonKey?.includes('.') && !anonKey?.startsWith('sb_publishable_')) {
      try {
        const authClient = createClient(supabaseUrl, anonKey)
        const authResult = await authClient.auth.getUser(token)
        if (!authResult.error && authResult.data?.user?.id) {
          userData = authResult.data
          userErr = null
        } else {
          userErr = authResult.error || userErr
        }
      } catch (fallbackErr) {
        userErr = fallbackErr
      }
    }
    
    if (userErr || !userData?.user?.id) {
      return NextResponse.json(
        { error: 'Invalid auth', details: userErr?.message || String(userErr) },
        { status: 401 }
      )
    }
    const userId = userData.user.id

    // Crea client per query (anon key con RLS)
    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    const { data: formations, error: fetchErr } = await supabase
      .from('squad_formations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_opponent', true)
      .order('extracted_at', { ascending: false })

    if (fetchErr) {
      console.error('[get-opponent-formations] Fetch failed:', fetchErr)
      return NextResponse.json(
        { error: `Fetch failed: ${fetchErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      formations: formations || [],
      count: formations?.length || 0,
    })
  } catch (e) {
    console.error('[get-opponent-formations] Unhandled exception:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
