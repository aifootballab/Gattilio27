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

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { formation_name, playing_style, extracted_data, is_pre_match, formation_image } = await req.json()

    // Validazione
    if (!extracted_data || typeof extracted_data !== 'object') {
      return NextResponse.json({ error: 'extracted_data is required' }, { status: 400 })
    }

    // Estrai dati da extracted_data per salvarli anche nei campi separati (per query più efficienti)
    const tactical_style = extracted_data.tactical_style || null
    const overall_strength = extracted_data.overall_strength || null
    const players = Array.isArray(extracted_data.players) ? extracted_data.players : []

    // Prepara dati
    const formationData = {
      user_id: userId,
      formation_name: formation_name || extracted_data.formation || null,
      playing_style: playing_style || extracted_data.playing_style || null,
      tactical_style: tactical_style,
      overall_strength: overall_strength,
      players: players,
      extracted_data: extracted_data,
      is_pre_match: is_pre_match === true,
      formation_image: formation_image || null,
      match_date: is_pre_match ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }

    // Salva formazione avversaria
    const { data: inserted, error: insertError } = await admin
      .from('opponent_formations')
      .insert(formationData)
      .select('id, formation_name, playing_style, extracted_data, is_pre_match')
      .single()

    if (insertError) {
      console.error('[save-opponent-formation] Error:', insertError)
      return NextResponse.json(
        { error: `Failed to save opponent formation: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      formation: inserted
    })
  } catch (err) {
    console.error('[save-opponent-formation] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error saving opponent formation' },
      { status: 500 }
    )
  }
}
