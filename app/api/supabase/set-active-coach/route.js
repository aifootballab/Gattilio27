import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
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
    const { coach_id } = await req.json()

    if (!coach_id || typeof coach_id !== 'string') {
      return NextResponse.json({ error: 'coach_id is required' }, { status: 400 })
    }
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verifica che l'allenatore appartenga all'utente
    const { data: coach, error: fetchError } = await admin
      .from('coaches')
      .select('id, user_id')
      .eq('id', coach_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !coach) {
      return NextResponse.json({ error: 'Coach not found or access denied' }, { status: 404 })
    }

    // Disattiva tutti gli altri allenatori dell'utente (transazione atomica)
    const { error: deactivateError } = await admin
      .from('coaches')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('id', coach_id)

    if (deactivateError) {
      console.error('[set-active-coach] Deactivate error:', deactivateError)
      return NextResponse.json(
        { error: `Failed to deactivate other coaches: ${deactivateError.message}` },
        { status: 500 }
      )
    }

    // Attiva l'allenatore selezionato
    const { error: activateError } = await admin
      .from('coaches')
      .update({ is_active: true })
      .eq('id', coach_id)
      .eq('user_id', userId)

    if (activateError) {
      console.error('[set-active-coach] Activate error:', activateError)
      return NextResponse.json(
        { error: `Failed to activate coach: ${activateError.message}` },
        { status: 500 }
      )
    }

    console.log(`[set-active-coach] Coach activated: id=${coach_id}, user_id=${userId}`)

    return NextResponse.json({
      success: true,
      coach_id: coach_id
    })
  } catch (e) {
    console.error('[set-active-coach] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
