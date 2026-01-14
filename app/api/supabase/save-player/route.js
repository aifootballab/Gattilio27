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
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error('[save-player] Missing env vars:', { hasUrl: !!supabaseUrl, hasAnon: !!anonKey, hasService: !!serviceKey })
      return NextResponse.json(
        { error: 'Supabase server env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const auth = req.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null
    
    if (!token) {
      console.error('[save-player] Missing token in header:', { authHeader: auth ? `${auth.substring(0, 20)}...` : 'empty' })
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    console.log('[save-player] Validating token:', { tokenPrefix: token.substring(0, 20) + '...', anonKeyKind: anonKey?.startsWith('sb_publishable_') ? 'publishable' : anonKey?.includes('.') ? 'jwt' : 'unknown' })

    // IMPORTANT: I token anon sono sempre JWT e richiedono la chiave legacy JWT (anon) per essere validati.
    // Se anonKey è una publishable moderna (sb_publishable_...), dobbiamo usare la legacy JWT.
    let userData = null
    let userErr = null
    let userId = null
    
    // Prova PRIMA con legacy JWT (più affidabile per token anon)
    const legacyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXV1b3Jyd2RldHlsb2xscnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDk0MTksImV4cCI6MjA4MzQ4NTQxOX0.pGnglOpSQ4gJ1JClB_zyBIB3-94eKHJfgveuCfoyffo'
    try {
      const legacyAuthClient = createClient(supabaseUrl, legacyAnonKey)
      const legacyResult = await legacyAuthClient.auth.getUser(token)
      userData = legacyResult.data
      userErr = legacyResult.error
      if (!userErr && userData?.user?.id) {
        console.log('[save-player] Token validated with legacy JWT key')
      }
    } catch (legacyErr) {
      console.error('[save-player] Legacy JWT validation failed:', legacyErr?.message || legacyErr)
      userErr = legacyErr
    }
    
    // Fallback: se legacy fallisce e anonKey è JWT, prova con anonKey
    if (userErr && anonKey?.includes('.') && !anonKey?.startsWith('sb_publishable_')) {
      try {
        const authClient = createClient(supabaseUrl, anonKey)
        const authResult = await authClient.auth.getUser(token)
        if (!authResult.error && authResult.data?.user?.id) {
          userData = authResult.data
          userErr = null
          console.log('[save-player] Token validated with configured JWT key')
        } else {
          userErr = authResult.error || userErr
        }
      } catch (fallbackErr) {
        console.error('[save-player] Fallback validation failed:', fallbackErr?.message || fallbackErr)
        userErr = fallbackErr
      }
    }
    
    if (userErr || !userData?.user?.id) {
      const errorMsg = userErr?.message || String(userErr) || 'Unknown auth error'
      console.error('[save-player] Auth validation failed:', { error: errorMsg, hasUserData: !!userData, hasUserId: !!userData?.user?.id })
      return NextResponse.json(
        {
          error: 'Invalid auth',
          details: errorMsg,
        },
        { status: 401 }
      )
    }
    userId = userData.user.id
    console.log('[save-player] Auth OK, userId:', userId)
    let admin = null
    try {
      admin = createClient(supabaseUrl, serviceKey)
    } catch (adminErr) {
      console.error('[save-player] Failed to create admin client:', adminErr?.message || adminErr)
      return NextResponse.json({ error: 'Failed to initialize Supabase admin client', details: adminErr?.message }, { status: 500 })
    }

    let body = null
    try {
      body = await req.json()
    } catch (parseErr) {
      console.error('[save-player] JSON parse failed:', parseErr?.message || parseErr)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }
    
    const player = body?.player
    const slotIndex = toInt(body?.slotIndex)
    
    console.log('[save-player] Request body:', { hasPlayer: !!player, playerName: player?.player_name, slotIndex })
    
    if (!player || slotIndex === null || slotIndex < 0 || slotIndex > 20) {
      console.error('[save-player] Invalid input:', { hasPlayer: !!player, slotIndex })
      return NextResponse.json({ error: 'Invalid input: player + slotIndex(0-20) required' }, { status: 400 })
    }

    // Log diagnostico su Supabase (per capire se la chiamata arriva davvero in produzione)
    // NB: screenshot_processing_log richiede image_url e image_type NOT NULL.
    let logId = null
    try {
      const { data: logRow } = await admin
        .from('screenshot_processing_log')
        .insert({
          user_id: userId,
          image_url: 'inline://save-player',
          image_type: 'save_player',
          processing_status: 'processing',
          processing_started_at: new Date().toISOString(),
          processing_method: 'next_api',
          extracted_data: {
            action: 'save_player',
            slotIndex,
            player_name: player?.player_name ?? null,
            overall_rating: player?.overall_rating ?? null,
            position: player?.position ?? null,
          },
        })
        .select('id')
        .single()
      logId = logRow?.id || null
    } catch {
      // se il log fallisce, non blocchiamo il salvataggio
    }

    // 1) players_base: cerchiamo per player_name + team (se presente).
    // IMPORTANTE: non sovrascrivere record "globali" già esistenti (database base).
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
        user_id: userId,
        extracted: player,
        saved_at: new Date().toISOString(),
      },
      // tag per poter pulire facilmente i dati test senza toccare il DB base
      source: 'screenshot_extractor',
    }

    console.log('[save-player] basePayload:', { player_name: basePayload.player_name, has_base_stats: !!basePayload.base_stats, source: basePayload.source })

    let playerBaseId = existingBase?.id || null
    if (!playerBaseId) {
      console.log('[save-player] Inserting new players_base...')
      const { data: inserted, error: insErr } = await admin
        .from('players_base')
        .insert(basePayload)
        .select('id')
        .single()
      if (insErr) {
        console.error('[save-player] players_base insert failed:', { error: insErr.message, code: insErr.code, details: insErr.details, hint: insErr.hint })
        throw new Error(`players_base insert failed: ${insErr.message}${insErr.details ? ` (${insErr.details})` : ''}${insErr.hint ? ` Hint: ${insErr.hint}` : ''}`)
      }
      playerBaseId = inserted.id
      console.log('[save-player] players_base inserted, id:', playerBaseId)
    } else {
      console.log('[save-player] players_base exists, id:', playerBaseId, '- updating metadata if tagged...')
      const { error: updateErr } = await admin
        .from('players_base')
        .update({ metadata: basePayload.metadata, updated_at: new Date().toISOString() })
        .eq('id', playerBaseId)
        .contains('metadata', { source: 'screenshot_extractor' })
      if (updateErr) {
        console.error('[save-player] players_base update failed:', { error: updateErr.message })
        // Non blocchiamo se l'update fallisce (potrebbe essere un record del DB base)
      }
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
      development_points: {}, // NOT NULL, required
      current_level: toInt(player.level_current),
      level_cap: toInt(player.level_cap),
      final_overall_rating: typeof player.overall_rating === 'number' ? player.overall_rating : toInt(player.overall_rating),
      active_booster_name: Array.isArray(player.boosters) && player.boosters[0]?.name ? String(player.boosters[0].name) : null,
      source: 'screenshot',
      source_data: { extracted: player },
    }

    console.log('[save-player] buildPayload:', { user_id: userId, player_base_id: playerBaseId, has_dev_points: !!buildPayload.development_points })

    let buildId = existingBuild?.id || null
    if (!buildId) {
      console.log('[save-player] Inserting new player_build...')
      const { data: b, error: bErr } = await admin.from('player_builds').insert(buildPayload).select('id').single()
      if (bErr) {
        console.error('[save-player] player_builds insert failed:', { error: bErr.message, code: bErr.code, details: bErr.details, hint: bErr.hint })
        throw new Error(`player_builds insert failed: ${bErr.message}${bErr.details ? ` (${bErr.details})` : ''}${bErr.hint ? ` Hint: ${bErr.hint}` : ''}`)
      }
      buildId = b.id
      console.log('[save-player] player_builds inserted, id:', buildId)
    } else {
      console.log('[save-player] Updating existing player_build, id:', buildId)
      const { error: updateErr } = await admin.from('player_builds').update(buildPayload).eq('id', buildId)
      if (updateErr) {
        console.error('[save-player] player_builds update failed:', { error: updateErr.message, code: updateErr.code, details: updateErr.details })
        throw new Error(`player_builds update failed: ${updateErr.message}${updateErr.details ? ` (${updateErr.details})` : ''}`)
      }
    }

    // 3) user_rosa: crea se non esiste main, poi setta lo slot
    let { data: rosa } = await admin
      .from('user_rosa')
      .select('id, player_build_ids')
      .eq('user_id', userId)
      .eq('is_main', true)
      .maybeSingle()

    if (!rosa) {
      console.log('[save-player] Creating new user_rosa...')
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
      if (rErr) {
        console.error('[save-player] user_rosa insert failed:', { error: rErr.message, code: rErr.code, details: rErr.details })
        throw new Error(`user_rosa insert failed: ${rErr.message}${rErr.details ? ` (${rErr.details})` : ''}`)
      }
      rosa = newRosa
      console.log('[save-player] user_rosa created, id:', rosa.id)
    } else {
      console.log('[save-player] user_rosa exists, id:', rosa.id)
    }

    const updated = ensureArrayLen(rosa.player_build_ids, 21)
    updated[slotIndex] = buildId
    console.log('[save-player] Updating user_rosa slot', slotIndex, 'with build_id:', buildId)

    const { error: upErr } = await admin
      .from('user_rosa')
      .update({ player_build_ids: updated, updated_at: new Date().toISOString() })
      .eq('id', rosa.id)
    if (upErr) {
      console.error('[save-player] user_rosa update failed:', { error: upErr.message, code: upErr.code, details: upErr.details })
      throw new Error(`user_rosa update failed: ${upErr.message}${upErr.details ? ` (${upErr.details})` : ''}`)
    }

    if (logId) {
      await admin
        .from('screenshot_processing_log')
        .update({
          processing_status: 'completed',
          processing_completed_at: new Date().toISOString(),
          matched_player_id: playerBaseId,
          extracted_data: {
            action: 'save_player',
            ok: true,
            slotIndex,
            player_base_id: playerBaseId,
            player_build_id: buildId,
            rosa_id: rosa.id,
          },
        })
        .eq('id', logId)
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      player_base_id: playerBaseId,
      player_build_id: buildId,
      rosa_id: rosa.id,
      slot: slotIndex,
    })
  } catch (e) {
    console.error('[save-player] Unhandled exception:', {
      message: e?.message || String(e),
      stack: e?.stack,
      name: e?.name,
    })
    return NextResponse.json(
      {
        error: e?.message || 'Errore server',
        details: process.env.NODE_ENV === 'development' ? String(e) : null,
      },
      { status: 500 }
    )
  }
}

