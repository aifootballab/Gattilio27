import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function ensureArrayLen(arr, len) {
  const a = Array.isArray(arr) ? [...arr] : []
  while (a.length < len) a.push(null)
  if (a.length > len) return a.slice(0, len)
  return a
}

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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase server env missing (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL)' }, { status: 500 })
    }

    const auth = req.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user?.id) return NextResponse.json({ error: 'Invalid auth' }, { status: 401 })
    const userId = userData.user.id

    const body = await req.json().catch(() => null)
    const player = body?.player
    const slotIndex = toInt(body?.slotIndex)
    if (!player || slotIndex === null || slotIndex < 0 || slotIndex > 20) {
      return NextResponse.json({ error: 'Invalid input: player + slotIndex(0-20) required' }, { status: 400 })
    }

    // 1) players_base: cerca per player_name + team (se presente), altrimenti solo player_name
    const playerName = toText(player.player_name)
    if (!playerName) return NextResponse.json({ error: 'player_name required' }, { status: 400 })

    const team = toText(player.team)
    let q = admin.from('players_base').select('id').eq('player_name', playerName)
    if (team) q = q.eq('team', team)
    const { data: existingBase } = await q.maybeSingle()

    const basePayload = {
      player_name: playerName,
      position: toText(player.position),
      card_type: toText(player.card_type),
      team: team,
      era: null,
      height: toInt(player.height_cm),
      weight: toInt(player.weight_kg),
      age: toInt(player.age),
      nationality: toText(player.nationality) || toText(player.region_or_nationality),
      club_name: toText(player.club_name),
      form: toText(player.form),
      role: toText(player.role),
      skills: Array.isArray(player.skills) ? player.skills : [],
      com_skills: [],
      base_stats: {
        ...(typeof player.overall_rating === 'number' ? { overall_rating: player.overall_rating } : {}),
      },
      metadata: {
        source: 'screenshot_extractor',
        extracted: player,
        saved_at: new Date().toISOString(),
      },
      source: 'user_upload',
    }

    let playerBaseId = existingBase?.id || null
    if (!playerBaseId) {
      const { data: inserted, error: insErr } = await admin
        .from('players_base')
        .insert(basePayload)
        .select('id')
        .single()
      if (insErr) throw insErr
      playerBaseId = inserted.id
    } else {
      // aggiorna i campi che abbiamo
      await admin.from('players_base').update(basePayload).eq('id', playerBaseId)
    }

    // 2) player_builds: 1 build per user_id + player_base_id
    const { data: existingBuild } = await admin
      .from('player_builds')
      .select('id')
      .eq('user_id', userId)
      .eq('player_base_id', playerBaseId)
      .maybeSingle()

    const buildPayload = {
      user_id: userId,
      player_base_id: playerBaseId,
      current_level: toInt(player.level_current),
      level_cap: toInt(player.level_cap),
      final_overall_rating: typeof player.overall_rating === 'number' ? player.overall_rating : toInt(player.overall_rating),
      active_booster_name: Array.isArray(player.boosters) && player.boosters[0]?.name ? String(player.boosters[0].name) : null,
      source: 'screenshot',
      source_data: { extracted: player },
    }

    let buildId = existingBuild?.id || null
    if (!buildId) {
      const { data: b, error: bErr } = await admin.from('player_builds').insert(buildPayload).select('id').single()
      if (bErr) throw bErr
      buildId = b.id
    } else {
      await admin.from('player_builds').update(buildPayload).eq('id', buildId)
    }

    // 3) user_rosa: crea se non esiste main, poi setta lo slot
    let { data: rosa } = await admin
      .from('user_rosa')
      .select('id, player_build_ids')
      .eq('user_id', userId)
      .eq('is_main', true)
      .maybeSingle()

    if (!rosa) {
      const { data: newRosa, error: rErr } = await admin
        .from('user_rosa')
        .insert({
          user_id: userId,
          name: 'Rosa Principale',
          is_main: true,
          player_build_ids: ensureArrayLen([], 21),
        })
        .select('id, player_build_ids')
        .single()
      if (rErr) throw rErr
      rosa = newRosa
    }

    const updated = ensureArrayLen(rosa.player_build_ids, 21)
    updated[slotIndex] = buildId

    const { error: upErr } = await admin
      .from('user_rosa')
      .update({ player_build_ids: updated, updated_at: new Date().toISOString() })
      .eq('id', rosa.id)
    if (upErr) throw upErr

    return NextResponse.json({
      success: true,
      user_id: userId,
      player_base_id: playerBaseId,
      player_build_id: buildId,
      rosa_id: rosa.id,
      slot: slotIndex,
    })
  } catch (e) {
    console.error('save-player error', e)
    return NextResponse.json({ error: e?.message || 'Errore server' }, { status: 500 })
  }
}

