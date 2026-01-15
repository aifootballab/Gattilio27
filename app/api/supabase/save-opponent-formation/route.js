import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error('[save-opponent-formation] Missing env vars')
      return NextResponse.json(
        { error: 'Supabase server env missing' },
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
        console.log('[save-opponent-formation] Token validated with legacy JWT key')
      }
    } catch (legacyErr) {
      console.error('[save-opponent-formation] Legacy JWT validation failed:', legacyErr?.message || legacyErr)
      userErr = legacyErr
    }
    
    if (userErr && anonKey?.includes('.') && !anonKey?.startsWith('sb_publishable_')) {
      try {
        const authClient = createClient(supabaseUrl, anonKey)
        const authResult = await authClient.auth.getUser(token)
        if (!authResult.error && authResult.data?.user?.id) {
          userData = authResult.data
          userErr = null
          console.log('[save-opponent-formation] Token validated with configured JWT key')
        } else {
          userErr = authResult.error || userErr
        }
      } catch (fallbackErr) {
        console.error('[save-opponent-formation] Fallback validation failed:', fallbackErr?.message || fallbackErr)
        userErr = fallbackErr
      }
    }
    
    if (userErr || !userData?.user?.id) {
      const errorMsg = userErr?.message || String(userErr) || 'Unknown auth error'
      console.error('[save-opponent-formation] Auth validation failed:', { error: errorMsg })
      return NextResponse.json(
        {
          error: 'Invalid auth',
          details: errorMsg,
        },
        { status: 401 }
      )
    }
    const userId = userData.user.id
    console.log('[save-opponent-formation] Auth OK, userId:', userId)

    // Verifica tipo service key
    const serviceKeyKind = serviceKey?.startsWith('sb_secret_') ? 'sb_secret' : 
                          serviceKey?.startsWith('sb_publishable_') ? 'sb_publishable' : 
                          serviceKey?.includes('.') && serviceKey.split('.').length >= 3 ? 'jwt' : 'unknown'
    
    if (serviceKeyKind === 'sb_publishable') {
      return NextResponse.json({ 
        error: 'Invalid service role key type', 
        details: 'SUPABASE_SERVICE_ROLE_KEY deve essere una service role key (JWT legacy)' 
      }, { status: 500 })
    }
    
    // Crea admin client (solo per JWT legacy)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const body = await req.json().catch(() => null)
    if (!body || !body.formation) {
      return NextResponse.json({ error: 'formation data required' }, { status: 400 })
    }

    const formation = body.formation
    
    // Validazione struttura formation
    if (typeof formation !== 'object' || !Array.isArray(formation.players)) {
      return NextResponse.json({ error: 'Invalid formation structure' }, { status: 400 })
    }
    
    // Limite giocatori (max 11 titolari + sostituti/riserve)
    if (formation.players.length > 11) {
      return NextResponse.json({ error: 'Too many players (max 11)' }, { status: 400 })
    }
    
    // Sanitizzazione nome (max 200 caratteri)
    const name = typeof body.name === 'string' 
      ? body.name.slice(0, 200).trim() 
      : `Formazione Avversaria - ${new Date().toLocaleDateString('it-IT')}`
    
    // Sanitizzazione screenshot_url (max 2000 caratteri)
    const screenshotUrl = typeof body.screenshot_url === 'string' && body.screenshot_url.length <= 2000
      ? body.screenshot_url
      : null

    // Prepara payload per squad_formations
    const payload = {
      user_id: userId,
      name: name,
      is_opponent: true,
      team_name: formation.team_name || null,
      formation: formation.formation || null,
      overall_strength: formation.overall_strength || null,
      tactical_style: formation.tactical_style || null,
      manager_name: formation.manager_name || null,
      players: Array.isArray(formation.players) ? formation.players.slice(0, 11) : [],
      selected_player: null,
      screenshot_url: screenshotUrl,
      metadata: {
        substitutes: Array.isArray(formation.substitutes) ? formation.substitutes : [],
        reserves: Array.isArray(formation.reserves) ? formation.reserves : [],
        extracted_at: new Date().toISOString(),
        source: 'screenshot_extractor',
      },
      extracted_at: new Date().toISOString(),
    }

    console.log('[save-opponent-formation] Inserting formation:', { 
      name, 
      formation: payload.formation, 
      players_count: payload.players.length,
      overall_strength: payload.overall_strength 
    })

    const { data: inserted, error: insErr } = await admin
      .from('squad_formations')
      .insert(payload)
      .select('id')
      .single()

    if (insErr) {
      console.error('[save-opponent-formation] Insert failed:', { error: insErr.message, code: insErr.code, details: insErr.details })
      return NextResponse.json(
        { error: `Insert failed: ${insErr.message}${insErr.details ? ` (${insErr.details})` : ''}` },
        { status: 500 }
      )
    }

    console.log('[save-opponent-formation] Formation saved, id:', inserted.id)

    return NextResponse.json({
      success: true,
      formation_id: inserted.id,
      user_id: userId,
    })
  } catch (e) {
    console.error('[save-opponent-formation] Unhandled exception:', {
      message: e?.message || String(e),
      stack: e?.stack,
      name: e?.name,
    })
    return NextResponse.json(
      {
        error: e?.message || 'Errore server',
        details: process.env.NODE_ENV === 'development' ? String(e) : null,
      },
      { status: 500 }
    )
  }
}
