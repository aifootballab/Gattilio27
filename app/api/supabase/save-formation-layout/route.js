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

    const { formation, slot_positions, preserve_slots } = await req.json()

    if (!formation) {
      return NextResponse.json(
        { error: 'formation is required' },
        { status: 400 }
      )
    }

    // Validazione lunghezza formazione (max 50 caratteri)
    if (formation && String(formation).trim().length > 50) {
      return NextResponse.json(
        { error: 'formation exceeds maximum length (50 characters)' },
        { status: 400 }
      )
    }

    // Validazione dimensione slot_positions JSONB (max 500KB)
    const MAX_JSONB_SIZE = 500 * 1024 // 500KB
    if (slot_positions && JSON.stringify(slot_positions).length > MAX_JSONB_SIZE) {
      return NextResponse.json(
        { error: `slot_positions exceeds maximum size (${MAX_JSONB_SIZE / 1024}KB)` },
        { status: 400 }
      )
    }

    // Completa slot mancanti se necessario (0-10)
    const completeSlotPositions = (slots) => {
      const complete = { ...(slots || {}) }
      const defaultPositions = {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 70, position: 'DC' },
        2: { x: 40, y: 70, position: 'DC' },
        3: { x: 60, y: 70, position: 'DC' },
        4: { x: 80, y: 70, position: 'DC' },
        5: { x: 30, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 70, y: 50, position: 'MED' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
      
      for (let i = 0; i <= 10; i++) {
        if (!complete[i]) {
          complete[i] = defaultPositions[i] || { x: 50, y: 50, position: '?' }
        }
      }
      
      return complete
    }
    
    const completeSlots = completeSlotPositions(slot_positions)
    const slotKeys = Object.keys(completeSlots).map(Number).filter(n => n >= 0 && n <= 10)
    
    if (slotKeys.length < 11) {
      console.warn(`[save-formation-layout] Solo ${slotKeys.length} slot, completati a 11`)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. Gestione cambio formazione intelligente
    // Se preserve_slots è fornito, libera solo i giocatori da slot che non sono nella nuova formazione
    // Altrimenti, libera tutti i titolari (comportamento originale)
    if (preserve_slots && Array.isArray(preserve_slots)) {
      // Libera solo giocatori da slot che non esistono nella nuova formazione
      const slotsToFree = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(slot => !preserve_slots.includes(slot))
      
      if (slotsToFree.length > 0) {
        const { error: updateError } = await admin
          .from('players')
          .update({ 
            slot_index: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .in('slot_index', slotsToFree)

        if (updateError) {
          console.error('[save-formation-layout] Error clearing old starters:', updateError)
          return NextResponse.json(
            { error: `Failed to clear old starters: ${updateError.message}` },
            { status: 500 }
          )
        }
      }
    } else {
      // Comportamento originale: libera tutti i titolari
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
    }

    // 2. Salva/aggiorna layout (UPSERT)
    const { data: layout, error: layoutError } = await admin
      .from('formation_layout')
      .upsert({
        user_id: userId,
        formation: String(formation).trim(),
        slot_positions: completeSlots,
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
