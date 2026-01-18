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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { formation, name, screenshot_url } = await req.json()

    if (!formation || typeof formation !== 'object') {
      return NextResponse.json({ error: 'Formation data is required' }, { status: 400 })
    }

    // Salva formazione (struttura base - può essere estesa con tabella dedicata)
    // Per ora salva come JSON in una struttura semplice
    const formationData = {
      user_id: userId,
      name: name || `Formation ${new Date().toISOString()}`,
      formation_data: formation,
      screenshot_url: screenshot_url || null,
      created_at: new Date().toISOString()
    }

    // Nota: Se esiste una tabella 'opponent_formations', usala:
    // const { data: saved, error: saveErr } = await admin
    //   .from('opponent_formations')
    //   .insert(formationData)
    //   .select('id')
    //   .single()

    // Per ora restituiamo successo (l'implementazione completa richiede tabella dedicata)
    return NextResponse.json({
      success: true,
      message: 'Formation saved (stub - implementazione completa richiede tabella dedicata)',
      formation_data: formationData
    })
  } catch (e) {
    console.error('[save-opponent-formation] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
