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
    console.log(`[save-player] User ID: ${userId}`)
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { player } = await req.json()

    if (!player || !player.player_name) {
      return NextResponse.json({ error: 'Player data is required' }, { status: 400 })
    }

    // Lookup playing_style_id se presente
    let playingStyleId = null
    const playingStyleName = toText(player.playing_style)
    if (playingStyleName) {
      const { data: playingStyle } = await admin
        .from('playing_styles')
        .select('id, name')
        .ilike('name', playingStyleName.trim())
        .maybeSingle()

      if (playingStyle?.id) {
        playingStyleId = playingStyle.id
      }
    }

    // Prepara dati giocatore (tutto in una struttura)
    const playerData = {
      user_id: userId,
      player_name: toText(player.player_name),
      position: toText(player.position),
      card_type: toText(player.card_type),
      team: toText(player.team),
      overall_rating: typeof player.overall_rating === 'number' ? player.overall_rating : toInt(player.overall_rating),
      base_stats: player.base_stats && typeof player.base_stats === 'object' ? player.base_stats : {},
      skills: Array.isArray(player.skills) ? player.skills : [],
      com_skills: Array.isArray(player.com_skills) ? player.com_skills : [],
      position_ratings: player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {},
      available_boosters: Array.isArray(player.boosters) ? player.boosters : [],
      height: toInt(player.height_cm),
      weight: toInt(player.weight_kg),
      age: toInt(player.age),
      nationality: toText(player.nationality) || toText(player.region_or_nationality),
      club_name: toText(player.club_name),
      form: toText(player.form),
      role: toText(player.role),
      playing_style_id: playingStyleId,
      current_level: toInt(player.level_current),
      level_cap: toInt(player.level_cap),
      active_booster_name: Array.isArray(player.boosters) && player.boosters[0]?.name ? String(player.boosters[0].name) : null,
      development_points: {},
      extracted_data: player,
      metadata: {
        source: 'screenshot_extractor',
        saved_at: new Date().toISOString(),
        weak_foot_frequency: player.weak_foot_frequency || null,
        weak_foot_accuracy: player.weak_foot_accuracy || null,
        form_detailed: player.form_detailed || null,
        injury_resistance: player.injury_resistance || null,
        ai_playstyles: Array.isArray(player.ai_playstyles) ? player.ai_playstyles : [],
        matches_played: player.matches_played || null,
        goals: player.goals || null,
        assists: player.assists || null,
        player_face_description: player.player_face_description || null
      },
      // slot_index: accetta dal body (0-10 per titolari, null per riserve)
      slot_index: player.slot_index !== undefined && player.slot_index !== null 
        ? Math.max(0, Math.min(10, Number(player.slot_index))) 
        : null
    }

    // Inserisci nuovo giocatore
    console.log(`[save-player] Inserting player for user_id: ${userId}, player_name: ${playerData.player_name}`)
    const { data: inserted, error: insertErr } = await admin
      .from('players')
      .insert(playerData)
      .select('id, user_id, player_name')
      .single()

    if (insertErr) {
      console.error('[save-player] Insert error:', insertErr.message)
      return NextResponse.json(
        { error: `Failed to create player: ${insertErr.message}` },
        { status: 500 }
      )
    }

    console.log(`[save-player] Player saved: id=${inserted.id}, user_id=${inserted.user_id}, player_name=${inserted.player_name}`)

    return NextResponse.json({
      success: true,
      player_id: inserted.id,
      is_new: true
    })
  } catch (e) {
    console.error('[save-player] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
