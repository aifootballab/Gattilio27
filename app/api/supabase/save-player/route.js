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
    
    // Verifica tipo service key
    const serviceKeyKind = serviceKey?.startsWith('sb_secret_') ? 'sb_secret' : 
                          serviceKey?.startsWith('sb_publishable_') ? 'sb_publishable' : 
                          serviceKey?.includes('.') && serviceKey.split('.').length >= 3 ? 'jwt' : 'unknown'
    console.log('[save-player] Service key kind:', serviceKeyKind, { prefix: serviceKey?.substring(0, 20) + '...' })
    
    // IMPORTANT: Le chiavi sb_secret_ moderne non sono supportate dal client JS.
    // Usiamo fetch diretto con header apikey per sb_secret_, client JS per JWT legacy.
    const useDirectFetch = serviceKeyKind === 'sb_secret'
    
    if (serviceKeyKind === 'sb_publishable') {
      console.error('[save-player] Service key è publishable, non può essere usato come service role!')
      return NextResponse.json({ 
        error: 'Invalid service role key type', 
        details: 'SUPABASE_SERVICE_ROLE_KEY deve essere una service role key (sb_secret_... o JWT legacy), non una publishable key' 
      }, { status: 500 })
    }
    
    let admin = null
    if (!useDirectFetch) {
      // Usa client JS per chiavi JWT legacy
      try {
        admin = createClient(supabaseUrl, serviceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })
        
        // Test: prova a fare una query semplice per verificare che il client funzioni
        const { data: testData, error: testError } = await admin
          .from('players_base')
          .select('id')
          .limit(1)
        
        if (testError) {
          console.error('[save-player] Admin client test failed:', { error: testError.message, code: testError.code, details: testError.details })
          return NextResponse.json({ 
            error: 'Admin client test failed', 
            details: `Service role key non valida: ${testError.message}${testError.hint ? ` (${testError.hint})` : ''}` 
          }, { status: 500 })
        }
        
        console.log('[save-player] Admin client OK, test query successful')
      } catch (adminErr) {
        console.error('[save-player] Failed to create admin client:', adminErr?.message || adminErr)
        return NextResponse.json({ error: 'Failed to initialize Supabase admin client', details: adminErr?.message }, { status: 500 })
      }
    } else {
      // Per sb_secret_, useremo fetch diretto - il client sarà null
      console.log('[save-player] Usando fetch diretto per chiave sb_secret_')
      // Test rapido con fetch
      const testUrl = `${supabaseUrl}/rest/v1/players_base?select=id&limit=1`
      const testRes = await fetch(testUrl, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })
      
      if (!testRes.ok) {
        const testErrorText = await testRes.text().catch(() => '')
        console.error('[save-player] Fetch test failed:', { status: testRes.status, statusText: testRes.statusText, body: testErrorText })
        return NextResponse.json({ 
          error: 'Service role key test failed', 
          details: `sb_secret_ key non valida: ${testRes.status} ${testRes.statusText}` 
        }, { status: 500 })
      }
      
      console.log('[save-player] Fetch diretto OK, sb_secret_ key valida')
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

    // Funzione per normalizzare nome (come in extract-batch)
    const normName = (name) => {
      if (!name) return null
      return String(name).trim().toLowerCase()
    }

    // 1) players_base: cerchiamo per player_name + team (se presente).
    // IMPORTANTE: normalizziamo il nome per matchare anche con variazioni maiuscole/minuscole
    // IMPORTANTE: non sovrascrivere record "globali" già esistenti (database base).
    const playerName = toText(player.player_name)
    if (!playerName) return NextResponse.json({ error: 'player_name required' }, { status: 400 })

    const team = toText(player.team)
    const normalizedName = normName(playerName)
    
    // Cerca con nome normalizzato (case-insensitive)
    let q = admin.from('players_base').select('id, player_name, team')
    // Usa il filtro ilike per match case-insensitive (PostgreSQL)
    q = q.ilike('player_name', normalizedName)
    if (team) {
      const normalizedTeam = normName(team)
      q = q.ilike('team', normalizedTeam)
    }
    const { data: existingBases } = await q
    
    // Se ci sono più match, preferisci quello con team esatto, altrimenti il primo
    const existingBase = existingBases?.length > 0 
      ? (team ? existingBases.find(b => normName(b.team) === normName(team)) || existingBases[0] : existingBases[0])
      : null

    // Costruisci base_stats completo
    const baseStats = player.base_stats && typeof player.base_stats === 'object' 
      ? player.base_stats 
      : (typeof player.overall_rating === 'number' ? { overall_rating: player.overall_rating } : {})

    // Costruisci position_ratings da additional_positions
    const positionRatings = {}
    if (Array.isArray(player.additional_positions) && player.additional_positions.length > 0) {
      player.additional_positions.forEach(pos => {
        if (typeof pos === 'string' && pos.trim()) {
          positionRatings[pos.trim()] = { competency_level: 1, is_learned: true }
        }
      })
    }

    // Costruisci metadata con caratteristiche extra
    const metadata = {
      source: 'screenshot_extractor',
      user_id: userId,
      extracted: player,
      saved_at: new Date().toISOString(),
    }
    
    // Aggiungi caratteristiche se presenti
    if (player.weak_foot_frequency) metadata.weak_foot_frequency = player.weak_foot_frequency
    if (player.weak_foot_accuracy) metadata.weak_foot_accuracy = player.weak_foot_accuracy
    if (player.form_detailed) metadata.form_detailed = player.form_detailed
    if (player.injury_resistance) metadata.injury_resistance = player.injury_resistance
    if (Array.isArray(player.ai_playstyles) && player.ai_playstyles.length > 0) {
      metadata.ai_playstyles = player.ai_playstyles
    }
    if (player.matches_played !== null && player.matches_played !== undefined) metadata.matches_played = player.matches_played
    if (player.goals !== null && player.goals !== undefined) metadata.goals = player.goals
    if (player.assists !== null && player.assists !== undefined) metadata.assists = player.assists

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
      com_skills: Array.isArray(player.com_skills) ? player.com_skills : [],
      base_stats: baseStats,
      position_ratings: Object.keys(positionRatings).length > 0 ? positionRatings : null,
      available_boosters: Array.isArray(player.boosters) && player.boosters.length > 0 
        ? player.boosters.map(b => ({
            name: b.name || null,
            effect: b.effect || null,
            activation_condition: b.activation_condition || null
          }))
        : null,
      metadata: metadata,
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

    // 3) user_rosa: crea se non esiste main, poi controlla duplicati
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

    // Funzione per confrontare build (skills, boosters, stats)
    const compareBuilds = (existingBuildData, newPlayer) => {
      // Confronta skills
      const existingSkills = Array.isArray(existingBuildData?.source_data?.extracted?.skills) 
        ? existingBuildData.source_data.extracted.skills.sort().join(',')
        : ''
      const newSkills = Array.isArray(newPlayer?.skills) 
        ? newPlayer.skills.sort().join(',')
        : ''
      if (existingSkills !== newSkills) {
        console.log('[save-player] Build diverso: skills cambiate')
        return false
      }
      
      // Confronta boosters (nome del booster attivo)
      const existingBooster = existingBuildData?.active_booster_name || null
      const newBooster = Array.isArray(newPlayer?.boosters) && newPlayer.boosters[0]?.name 
        ? String(newPlayer.boosters[0].name)
        : null
      if (existingBooster !== newBooster) {
        console.log('[save-player] Build diverso: booster cambiato', { existing: existingBooster, new: newBooster })
        return false
      }
      
      // Confronta OVR (se cambia significativamente, potrebbe essere un build diverso)
      const existingOVR = existingBuildData?.final_overall_rating || null
      const newOVR = typeof newPlayer?.overall_rating === 'number' ? newPlayer.overall_rating : toInt(newPlayer?.overall_rating)
      if (existingOVR !== null && newOVR !== null && Math.abs(existingOVR - newOVR) > 2) {
        console.log('[save-player] Build diverso: OVR cambiato significativamente', { existing: existingOVR, new: newOVR })
        return false
      }
      
      // Confronta level
      const existingLevel = existingBuildData?.current_level || null
      const newLevel = toInt(newPlayer?.level_current)
      if (existingLevel !== null && newLevel !== null && existingLevel !== newLevel) {
        console.log('[save-player] Build diverso: level cambiato', { existing: existingLevel, new: newLevel })
        return false
      }
      
      return true // Build identico
    }

    // Controllo duplicati: verifica se lo stesso player_base_id è già presente nella rosa
    const existingBuildIds = ensureArrayLen(rosa.player_build_ids || [], 21).filter(id => id !== null && id !== undefined)
    let existingBuildIdInRosa = null
    let existingSlotIndex = null
    let existingBuildData = null
    
    if (existingBuildIds.length > 0) {
      // Recupera tutti i build esistenti con dati completi per confronto
      const { data: existingBuilds } = await admin
        .from('player_builds')
        .select('id, player_base_id, active_booster_name, final_overall_rating, current_level, source_data')
        .in('id', existingBuildIds)
      
      // Cerca se c'è già un build con lo stesso player_base_id
      const duplicateBuild = existingBuilds?.find(b => b.player_base_id === playerBaseId)
      if (duplicateBuild) {
        existingBuildIdInRosa = duplicateBuild.id
        existingBuildData = duplicateBuild
        // Trova lo slot dove si trova
        existingSlotIndex = rosa.player_build_ids.findIndex(id => id === duplicateBuild.id)
        console.log('[save-player] Giocatore già presente nella rosa:', { 
          player_name: playerName, 
          existing_build_id: existingBuildIdInRosa, 
          existing_slot: existingSlotIndex,
          new_slot: slotIndex 
        })
      }
    }

    // 2) player_builds: confronta build e decide se creare nuovo o aggiornare esistente
    let buildId = null
    let isNewBuild = false
    let wasMoved = false
    let buildChanged = false

    // Prepara payload per nuovo build
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

    if (existingBuildIdInRosa && existingBuildData) {
      // Giocatore già presente nella rosa: confronta build
      const buildsAreIdentical = compareBuilds(existingBuildData, player)
      
      if (buildsAreIdentical) {
        // Build identico: aggiorna e sposta se necessario
        buildId = existingBuildIdInRosa
        console.log('[save-player] Build identico, aggiornando build esistente dalla rosa, id:', buildId)
        const { error: updateErr } = await admin.from('player_builds').update(buildPayload).eq('id', buildId)
        if (updateErr) {
          console.error('[save-player] player_builds update failed:', { error: updateErr.message, code: updateErr.code, details: updateErr.details })
          throw new Error(`player_builds update failed: ${updateErr.message}${updateErr.details ? ` (${updateErr.details})` : ''}`)
        }
        wasMoved = existingSlotIndex !== slotIndex
      } else {
        // Build diverso: crea nuovo build (stesso giocatore ma build diversa)
        buildId = null // Forza creazione nuovo build
        buildChanged = true
        console.log('[save-player] Build diverso per giocatore già presente, creando nuovo build')
      }
    }

    if (!buildId) {
      // Cerca se esiste un build per user_id + player_base_id (ma non nella rosa)
      const { data: existingBuild } = await admin
        .from('player_builds')
        .select('id, active_booster_name, final_overall_rating, current_level, source_data')
        .eq('user_id', userId)
        .eq('player_base_id', playerBaseId)
        .maybeSingle()

      if (existingBuild && !buildChanged) {
        // Build esiste ma non è nella rosa: confronta
        const buildsAreIdentical = compareBuilds(existingBuild, player)
        
        if (buildsAreIdentical) {
          // Build identico: riutilizza
          buildId = existingBuild.id
          console.log('[save-player] Riutilizzando build esistente (non in rosa), id:', buildId)
          const { error: updateErr } = await admin.from('player_builds').update(buildPayload).eq('id', buildId)
          if (updateErr) {
            console.error('[save-player] player_builds update failed:', { error: updateErr.message, code: updateErr.code, details: updateErr.details })
            throw new Error(`player_builds update failed: ${updateErr.message}${updateErr.details ? ` (${updateErr.details})` : ''}`)
          }
        } else {
          // Build diverso: crea nuovo
          buildId = null // Forza creazione
          console.log('[save-player] Build diverso per giocatore esistente (non in rosa), creando nuovo build')
        }
      }

      if (!buildId) {
        // Crea nuovo build (primo build o build diverso)
        console.log('[save-player] Inserting new player_build...')
        const { data: b, error: bErr } = await admin.from('player_builds').insert(buildPayload).select('id').single()
        if (bErr) {
          console.error('[save-player] player_builds insert failed:', { error: bErr.message, code: bErr.code, details: bErr.details, hint: bErr.hint })
          throw new Error(`player_builds insert failed: ${bErr.message}${bErr.details ? ` (${bErr.details})` : ''}${bErr.hint ? ` Hint: ${bErr.hint}` : ''}`)
        }
        buildId = b.id
        isNewBuild = true
        console.log('[save-player] player_builds inserted, id:', buildId, buildChanged ? '(nuovo build per giocatore esistente)' : '(primo build)')
      }
    }

    // Aggiorna rosa: sposta build nello slot nuovo, svuota slot precedente se diverso
    const updated = ensureArrayLen(rosa.player_build_ids, 21)
    
    // Se il giocatore era già in un altro slot, svuota quello precedente
    if (wasMoved && existingSlotIndex !== null && existingSlotIndex >= 0 && existingSlotIndex < 21) {
      updated[existingSlotIndex] = null
      console.log('[save-player] Svuotato slot precedente:', existingSlotIndex)
    }
    
    // Se lo slot nuovo è occupato da un altro giocatore, lo spostiamo in riserva (null per ora)
    const previousBuildInSlot = updated[slotIndex]
    if (previousBuildInSlot && previousBuildInSlot !== buildId) {
      console.log('[save-player] Slot', slotIndex, 'era occupato da build:', previousBuildInSlot, '- verrà sostituito')
      // TODO: In futuro potremmo spostare il giocatore esistente in un altro slot disponibile
    }
    
    updated[slotIndex] = buildId
    console.log('[save-player] Updating user_rosa slot', slotIndex, 'with build_id:', buildId, wasMoved ? '(spostato da slot ' + existingSlotIndex + ')' : isNewBuild ? '(nuovo build)' : '(build esistente)')

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
      was_duplicate: !!existingBuildIdInRosa,
      was_moved: wasMoved,
      previous_slot: wasMoved ? existingSlotIndex : null,
      is_new_build: isNewBuild,
      build_changed: buildChanged,
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

