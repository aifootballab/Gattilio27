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

    const { formation, slot_positions } = await req.json()

    if (!formation || !slot_positions || typeof slot_positions !== 'object') {
      return NextResponse.json(
        { error: 'formation and slot_positions are required' },
        { status: 400 }
      )
    }

    // Valida che ci siano 11 slot (0-10)
    const slotKeys = Object.keys(slot_positions).map(Number).filter(n => n >= 0 && n <= 10)
    if (slotKeys.length !== 11) {
      return NextResponse.json(
        { error: 'slot_positions must contain exactly 11 slots (0-10)' },
        { status: 400 }
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Cancella vecchi titolari (slot_index 0-10 → NULL, tornano riserve)
    const { error: updateError } = await admin
      .from('players')
      .update({ 
        slot_index: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('slot_index', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

    if (updateError) {
      console.error('[save-formation-layout] Error clearing old starters:', updateError)
      return NextResponse.json(
        { error: `Failed to clear old starters: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 2. Salva/aggiorna layout (UPSERT)
    const { data: layout, error: layoutError } = await admin
      .from('formation_layout')
      .upsert({
        user_id: userId,
        formation: String(formation).trim(),
        slot_positions: slot_positions,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('id, formation, slot_positions')
      .single()

    if (layoutError) {
      console.error('[save-formation-layout] Error saving layout:', layoutError)
      return NextResponse.json(
        { error: `Failed to save layout: ${layoutError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      layout: {
        id: layout.id,
        formation: layout.formation,
        slot_positions: layout.slot_positions
      }
    })
  } catch (err) {
    console.error('[save-formation-layout] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore salvataggio layout' },
      { status: 500 }
    )
  }
}
