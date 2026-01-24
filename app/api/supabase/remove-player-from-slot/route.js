import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id
    const { player_id } = await req.json()

    if (!player_id || typeof player_id !== 'string') {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verifica che il giocatore appartenga all'utente
    const { data: player, error: fetchError } = await admin
      .from('players')
      .select('id, user_id, player_name, age, slot_index, original_positions, position')
      .eq('id', player_id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !player) {
      return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
    }

    // Validazione duplicati riserve: verifica se stesso giocatore (nome+età) già presente nelle riserve
    const playerName = player.player_name?.trim().toLowerCase()
    const playerAge = player.age != null ? Number(player.age) : null
    
    if (playerName) {
      // Cerca duplicati riserve (escludendo questo giocatore)
      let duplicateQuery = admin
        .from('players')
        .select('id, player_name, age')
        .eq('user_id', userId)
        .is('slot_index', null)
        .neq('id', player_id)
        .ilike('player_name', playerName)
      
      const { data: duplicates, error: dupError } = await duplicateQuery
      
      if (!dupError && duplicates && duplicates.length > 0) {
        // Filtra per età se disponibile
        const exactDuplicates = playerAge != null
          ? duplicates.filter(p => p.age != null && Number(p.age) === playerAge)
          : duplicates
        
        if (exactDuplicates.length > 0) {
          const dup = exactDuplicates[0]
          return NextResponse.json(
            { 
              error: `Player "${player.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} already exists in reserves`,
              duplicate_reserve_id: dup.id,
              duplicate_player_name: player.player_name,
              duplicate_player_age: playerAge
            },
            { status: 400 }
          )
        }
      }
    }

    // NUOVO: Reset a original_position (prima posizione originale o position attuale)
    const originalPosition = Array.isArray(player.original_positions) && player.original_positions.length > 0
      ? player.original_positions[0].position
      : player.position

    // Rimuovi da slot (reset position a originale)
    const { error: updateError } = await admin
      .from('players')
      .update({
        slot_index: null,
        position: originalPosition,  // NUOVO: reset a originale
        updated_at: new Date().toISOString()
      })
      .eq('id', player_id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('[remove-player-from-slot] Update error:', updateError)
      return NextResponse.json(
        { error: `Failed to remove player from slot: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      player_id: player_id,
      player_name: player.player_name,
      action: 'removed_from_slot'
    })
  } catch (err) {
    console.error('[remove-player-from-slot] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore rimozione giocatore da slot' },
      { status: 500 }
    )
  }
}
