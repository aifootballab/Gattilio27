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

    const payload = await req.json()
    const playerId = payload.player_base_id || payload.player_id || payload.id

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }

    // Verifica che il giocatore appartenga all'utente
    const { data: existingPlayer, error: checkErr } = await admin
      .from('players')
      .select('id, user_id')
      .eq('id', playerId)
      .eq('user_id', userId)
      .maybeSingle()

    if (checkErr || !existingPlayer) {
      return NextResponse.json({ error: 'Player not found or access denied' }, { status: 404 })
    }

    // Prepara aggiornamenti (solo campi presenti nel payload)
    const updates = {}

    if (payload.base_stats !== undefined) {
      updates.base_stats = payload.base_stats
    }

    if (payload.height !== undefined) updates.height = toInt(payload.height)
    if (payload.weight !== undefined) updates.weight = toInt(payload.weight)
    if (payload.age !== undefined) updates.age = toInt(payload.age)
    if (payload.team !== undefined) updates.team = toText(payload.team)
    if (payload.nationality !== undefined) updates.nationality = toText(payload.nationality)

    if (Array.isArray(payload.skills)) {
      updates.skills = payload.skills
    }
    if (Array.isArray(payload.com_skills)) {
      updates.com_skills = payload.com_skills
    }

    if (payload.metadata !== undefined) {
      updates.metadata = payload.metadata
    }

    if (Array.isArray(payload.available_boosters)) {
      updates.available_boosters = payload.available_boosters
      // Se c'è un booster, aggiorna active_booster_name
      if (payload.available_boosters.length > 0 && payload.available_boosters[0]?.name) {
        updates.active_booster_name = String(payload.available_boosters[0].name)
      } else if (payload.available_boosters.length === 0) {
        updates.active_booster_name = null
      }
    }

    // Gestione playing_style (se presente come nome, cerca ID)
    if (payload.playing_style) {
      const playingStyleName = toText(payload.playing_style)
      if (playingStyleName) {
        const { data: playingStyle } = await admin
          .from('playing_styles')
          .select('id')
          .ilike('name', playingStyleName.trim())
          .maybeSingle()

        updates.playing_style_id = playingStyle?.id || null
      }
    }

    // Aggiorna giocatore
    const { data: updated, error: updateErr } = await admin
      .from('players')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .eq('user_id', userId)
      .select('id')
      .single()

    if (updateErr) {
      console.error('[update-player-data] Update error:', updateErr.message)
      return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
    }

    return NextResponse.json({ success: true, player_id: updated.id })
  } catch (e) {
    console.error('[update-player-data] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
