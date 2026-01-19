import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
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
    console.log(`[get-players] User ID: ${userId}, type: ${typeof userId}`)
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // DEBUG: Verifica tutti i giocatori nel DB (prima della query filtrata)
    const { data: allPlayers, error: debugError } = await admin
      .from('players')
      .select('id, user_id, player_name')
      .limit(10)
    
    if (!debugError && allPlayers) {
      console.log(`[get-players] DEBUG: Found ${allPlayers.length} total players in DB (first 10):`)
      allPlayers.forEach((p, idx) => {
        const userIdMatch = String(p.user_id) === String(userId)
        console.log(`  Player ${idx + 1}: id=${p.id}, user_id=${p.user_id} (${typeof p.user_id}), player_name=${p.player_name}, match=${userIdMatch}`)
      })
      // Verifica se ci sono giocatori con user_id diverso
      const differentUserIds = [...new Set(allPlayers.map(p => p.user_id))]
      console.log(`[get-players] DEBUG: Found ${differentUserIds.length} different user_ids in DB:`, differentUserIds)
      const userMatch = allPlayers.some(p => String(p.user_id) === String(userId))
      console.log(`[get-players] DEBUG: Current user_id ${userId} (${typeof userId}) matches any player: ${userMatch}`)
    } else if (debugError) {
      console.error(`[get-players] DEBUG query error:`, debugError)
    }

    // Recupera giocatori dell'utente (ordinati per data creazione)
    // Usa userId direttamente (come in save-player) - Supabase gestisce il tipo UUID automaticamente
    console.log(`[get-players] Querying players with user_id: ${userId} (type: ${typeof userId})`)
    
    const { data: players, error: queryError } = await admin
      .from('players')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('[get-players] Query error:', queryError.message)
      return NextResponse.json(
        { error: `Failed to fetch players: ${queryError.message}` },
        { status: 500 }
      )
    }

    // Gestione risposta: players può essere null o array
    const playersList = players || []
    console.log(`[get-players] Raw query result: ${playersList.length} players`)
    if (playersList.length > 0) {
      // Verifica user_id match per ogni giocatore
      playersList.forEach((p, idx) => {
        const match = p.user_id === userId
        console.log(`[get-players] Player ${idx + 1}: id=${p.id}, user_id=${p.user_id}, player_name=${p.player_name}, user_match=${match}`)
        if (!match) {
          console.warn(`[get-players] ⚠️ MISMATCH: Player ${p.id} has user_id=${p.user_id} but query used user_id=${userId}`)
        }
      })
    } else {
      console.log(`[get-players] No players found for user_id: ${userId}`)
    }
    
    // Filtra solo giocatori validi (con nome)
    const validPlayers = Array.isArray(playersList) 
      ? playersList.filter(p => {
          const hasId = p && p.id
          const hasName = p?.player_name && typeof p.player_name === 'string' && p.player_name.trim().length > 0
          if (!hasId || !hasName) {
            console.warn(`[get-players] Filtered out player:`, { id: p?.id, hasId, hasName, player_name: p?.player_name })
          }
          return hasId && hasName
        })
      : []

    console.log(`[get-players] User ${userId}: Found ${validPlayers.length} valid players (from ${playersList.length} raw)`)

    return NextResponse.json({
      players: validPlayers,
      count: validPlayers.length
    })
  } catch (e) {
    console.error('[get-players] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}