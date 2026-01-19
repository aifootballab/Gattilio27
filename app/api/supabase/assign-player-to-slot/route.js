import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function toText(v) {
  return typeof v === 'string' && v.trim().length ? v.trim() : null
}

export async function PATCH(req) {
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

    const { slot_index, player_id, player_data } = await req.json()

    // Valida slot_index
    if (slot_index === undefined || slot_index === null || slot_index < 0 || slot_index > 10) {
      return NextResponse.json(
        { error: 'slot_index must be between 0 and 10' },
        { status: 400 }
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Se slot già occupato, libera vecchio giocatore
    const { data: existingPlayerInSlot } = await admin
      .from('players')
      .select('id, player_name')
      .eq('user_id', userId)
      .eq('slot_index', slot_index)
      .maybeSingle()

    if (existingPlayerInSlot) {
      // Libera vecchio slot (torna riserva)
      await admin
        .from('players')
        .update({ 
          slot_index: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPlayerInSlot.id)
    }

    // Assegna nuovo giocatore
    if (player_id) {
      // Caso 1: Assegna giocatore esistente (da riserve o altro slot)
      const { data: player, error: playerError } = await admin
        .from('players')
        .select('id, user_id')
        .eq('id', player_id)
        .eq('user_id', userId)
        .single()

      if (playerError || !player) {
        return NextResponse.json(
          { error: 'Player not found or unauthorized' },
          { status: 404 }
        )
      }

      // UPDATE: Assegna slot
      const { error: updateError } = await admin
        .from('players')
        .update({
          slot_index: slot_index,
          updated_at: new Date().toISOString()
        })
        .eq('id', player_id)

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to assign player: ${updateError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        player_id: player_id,
        slot_index: slot_index,
        action: 'assigned_existing'
      })

    } else if (player_data) {
      // Caso 2: Crea nuovo giocatore e assegna slot
      // Usa logica simile a save-player
      const playerData = {
        user_id: userId,
        player_name: toText(player_data.player_name),
        position: toText(player_data.position),
        card_type: toText(player_data.card_type),
        team: toText(player_data.team),
        overall_rating: typeof player_data.overall_rating === 'number' 
          ? player_data.overall_rating 
          : toInt(player_data.overall_rating),
        base_stats: player_data.base_stats && typeof player_data.base_stats === 'object' 
          ? player_data.base_stats 
          : {},
        skills: Array.isArray(player_data.skills) ? player_data.skills : [],
        com_skills: Array.isArray(player_data.com_skills) ? player_data.com_skills : [],
        slot_index: slot_index, // Assegna slot
        metadata: {
          source: 'formation_assignment',
          saved_at: new Date().toISOString(),
          player_face_description: player_data.player_face_description || null
        },
        extracted_data: player_data
      }

      const { data: inserted, error: insertError } = await admin
        .from('players')
        .insert(playerData)
        .select('id, player_name, slot_index')
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to create player: ${insertError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        player_id: inserted.id,
        slot_index: slot_index,
        action: 'created_new'
      })

    } else {
      return NextResponse.json(
        { error: 'Either player_id or player_data is required' },
        { status: 400 }
      )
    }

  } catch (err) {
    console.error('[assign-player-to-slot] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore assegnazione giocatore' },
      { status: 500 }
    )
  }
}
