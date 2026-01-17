import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Estrai e valida token (supporta sia anon che email)
    const token = extractBearerToken(req)
    if (!token) {
      console.error('[save-player] Missing token in header')
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    console.log('[save-player] Validating token:', { tokenPrefix: token.substring(0, 20) + '...', anonKeyKind: anonKey?.startsWith('sb_publishable_') ? 'publishable' : anonKey?.includes('.') ? 'jwt' : 'unknown' })

    console.log('[save-player] ===== AUTHENTICATION START =====')
    console.log('[save-player] Token received (first 30 chars):', token.substring(0, 30) + '...')
    console.log('[save-player] Token length:', token.length)
    console.log('[save-player] Token type check:', { hasDots: token.includes('.'), dotCount: token.split('.').length })
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      const errorMsg = authError?.message || String(authError) || 'Unknown auth error'
      console.error('[save-player] ❌ AUTH VALIDATION FAILED:', { 
        error: errorMsg, 
        hasUserData: !!userData, 
        hasUserId: !!userData?.user?.id,
        userDataKeys: userData ? Object.keys(userData) : null
      })
      return NextResponse.json(
        {
          error: 'Invalid auth',
          details: errorMsg,
        },
        { status: 401 }
      )
    }
    
    const userId = userData.user.id
    const userEmail = userData.user.email
    console.log('[save-player] ✅ AUTH OK')
    console.log('[save-player] UserId extracted:', userId)
    console.log('[save-player] UserId type:', typeof userId, 'length:', userId?.length)
    console.log('[save-player] UserEmail:', userEmail || '(null/empty)')
    console.log('[save-player] UserData keys:', Object.keys(userData.user || {}))
    console.log('[save-player] ===== AUTHENTICATION END =====')
    
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
    const slotIndex = body?.slotIndex !== undefined ? toInt(body?.slotIndex) : null // Opzionale: non più richiesto nella nuova UX
    
    console.log('[save-player] Request body:', { hasPlayer: !!player, playerName: player?.player_name, slotIndex })
    
    // Validazione: player è obbligatorio, slotIndex è opzionale
    if (!player) {
      console.error('[save-player] Invalid input: player required')
      return NextResponse.json({ error: 'Invalid input: player required' }, { status: 400 })
    }
    
    // Se slotIndex è fornito, deve essere valido (0-20)
    if (slotIndex !== null && (slotIndex < 0 || slotIndex > 20)) {
      console.error('[save-player] Invalid slotIndex:', slotIndex)
      return NextResponse.json({ error: 'Invalid input: slotIndex must be between 0 and 20 if provided' }, { status: 400 })
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
    // IMPORTANTE: NON riutilizzare record "globali" dal database base (json_import/user_upload).
    // Il cliente carica 22 giocatori via screenshot → creiamo SEMPRE nuovi record con source='screenshot_extractor'.
    // I giocatori con json_import sono SOLO per ricerca/matchmaking, NON per profilazione utente.
    const playerName = toText(player.player_name)
    if (!playerName) return NextResponse.json({ error: 'player_name required' }, { status: 400 })

    const team = toText(player.team)
    const normalizedName = normName(playerName)
    
    // Cerca SOLO giocatori già salvati da questo utente (source='screenshot_extractor' con metadata.user_id)
    // NON cercare giocatori del database base (json_import/user_upload)
    let q = admin.from('players_base').select('id, player_name, team, source, metadata')
    q = q.ilike('player_name', normalizedName)
    q = q.eq('source', 'screenshot_extractor')  // Solo giocatori salvati da screenshot
    if (team) {
      const normalizedTeam = normName(team)
      q = q.ilike('team', normalizedTeam)
    }
    const { data: existingBases } = await q
    
    // Filtra in JS per metadata.user_id (per sicurezza, anche se source è già filtrato)
    const existingBase = existingBases?.find(b => 
      b.metadata?.user_id === userId && b.source === 'screenshot_extractor'
    ) || null

    // Lookup playing_style_id dalla tabella playing_styles
    let playingStyleId = null
    const playingStyleName = toText(player.playing_style)
    if (playingStyleName) {
      try {
        // Cerca per nome (case-insensitive)
        const { data: playingStyle } = await admin
          .from('playing_styles')
          .select('id, name')
          .ilike('name', playingStyleName.trim())
          .maybeSingle()
        
        if (playingStyle?.id) {
          playingStyleId = playingStyle.id
          console.log('[save-player] Found playing_style:', { name: playingStyle.name, id: playingStyleId })
        } else {
          console.log('[save-player] Playing style not found in database:', playingStyleName)
        }
      } catch (styleErr) {
        console.error('[save-player] Error looking up playing_style:', styleErr?.message || styleErr)
        // Non blocchiamo se il lookup fallisce
      }
    }

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
      playing_style_id: playingStyleId,
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
      // Giocatore esistente salvato dallo stesso utente → aggiorna dati
      console.log('[save-player] players_base exists (from same user), id:', playerBaseId, '- updating metadata and playing_style_id...')
      const updateData = {
        metadata: basePayload.metadata,  // Aggiorna metadata completo
        updated_at: new Date().toISOString(),
      }
      // Aggiorna playing_style_id solo se presente
      if (playingStyleId) {
        updateData.playing_style_id = playingStyleId
      }
      // Aggiorna solo se è un record creato da screenshot_extractor (sicurezza)
      const { error: updateErr } = await admin
        .from('players_base')
        .update(updateData)
        .eq('id', playerBaseId)
        .eq('source', 'screenshot_extractor')  // Solo aggiornare record screenshot_extractor
      if (updateErr) {
        console.error('[save-player] players_base update failed:', { error: updateErr.message })
        throw new Error(`players_base update failed: ${updateErr.message}`)
      } else {
        console.log('[save-player] ✅ players_base updated, id:', playerBaseId)
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

    // Controllo: rosa piena (21 slot occupati)?
    const existingBuildIds = ensureArrayLen(rosa.player_build_ids || [], 21).filter(id => id !== null && id !== undefined)
    const isRosaFull = existingBuildIds.length >= 21
    
    // Controllo: giocatore già presente in rosa?
    let existingBuildIdInRosa = null
    let existingSlotIndex = null
    
    if (existingBuildIds.length > 0) {
      const { data: existingBuilds } = await admin
        .from('player_builds')
        .select('id, player_base_id')
        .in('id', existingBuildIds)
      
      const duplicateBuild = existingBuilds?.find(b => b.player_base_id === playerBaseId)
      if (duplicateBuild) {
        existingBuildIdInRosa = duplicateBuild.id
        existingSlotIndex = rosa.player_build_ids.findIndex(id => id === duplicateBuild.id)
        console.log('[save-player] Giocatore già presente nella rosa:', { 
          player_name: playerName, 
          existing_build_id: existingBuildIdInRosa, 
          existing_slot: existingSlotIndex,
          new_slot: slotIndex !== null ? slotIndex : 'not provided'
        })
      }
    }

    // Se rosa piena E giocatore non è già in rosa → errore
    if (isRosaFull && !existingBuildIdInRosa) {
      return NextResponse.json(
        { 
          error: 'Rosa piena',
          message: 'La rosa è completa (21 giocatori). Vai a "I Miei Giocatori" per rimuovere un giocatore prima di aggiungerne uno nuovo.',
          rosa_full: true
        },
        { status: 400 }
      )
    }

    // Prepara payload per build
    console.log('[save-player] ===== BUILDING PLAYER_BUILDS PAYLOAD =====')
    console.log('[save-player] PlayerBaseId:', playerBaseId)
    console.log('[save-player] UserId for buildPayload:', userId)
    
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
    
    console.log('[save-player] BuildPayload created:', {
      user_id: buildPayload.user_id,
      user_id_type: typeof buildPayload.user_id,
      user_id_length: buildPayload.user_id?.length,
      player_base_id: buildPayload.player_base_id,
      player_name: player?.player_name
    })
    console.log('[save-player] ===== PAYLOAD BUILD END =====')

    let buildId = null
    let isNewBuild = false
    let wasMoved = false

    console.log('[save-player] ===== SAVING PLAYER_BUILDS =====')
    console.log('[save-player] ExistingBuildIdInRosa:', existingBuildIdInRosa || '(null - nuovo giocatore)')
    
    if (existingBuildIdInRosa) {
      // Giocatore già presente in rosa → sempre aggiorna build esistente (sovrascrivi)
      buildId = existingBuildIdInRosa
      console.log('[save-player] 🔄 UPDATE MODE: Giocatore già in rosa, aggiornando build esistente')
      console.log('[save-player] BuildId esistente:', buildId)
      console.log('[save-player] Executing UPDATE on player_builds WHERE id =', buildId)
      console.log('[save-player] Update payload user_id:', buildPayload.user_id)
      
      const { error: updateErr } = await admin.from('player_builds').update(buildPayload).eq('id', buildId)
      
      if (updateErr) {
        console.error('[save-player] ❌ player_builds UPDATE FAILED:', { 
          error: updateErr.message, 
          code: updateErr.code, 
          details: updateErr.details,
          hint: updateErr.hint
        })
        throw new Error(`player_builds update failed: ${updateErr.message}${updateErr.details ? ` (${updateErr.details})` : ''}`)
      }
      
      console.log('[save-player] ✅ player_builds UPDATE SUCCESS')
      console.log('[save-player] BuildId updated:', buildId, 'with user_id:', buildPayload.user_id)
      // wasMoved: solo se slotIndex è fornito e diverso da quello esistente
      wasMoved = slotIndex !== null && existingSlotIndex !== slotIndex
    } else {
      // Giocatore nuovo → crea nuovo build
      console.log('[save-player] ➕ INSERT MODE: Giocatore nuovo, creando nuovo player_build')
      console.log('[save-player] Insert payload:', {
        user_id: buildPayload.user_id,
        player_base_id: buildPayload.player_base_id,
        player_name: player?.player_name
      })
      
      const { data: b, error: bErr } = await admin.from('player_builds').insert(buildPayload).select('id').single()
      
      if (bErr) {
        console.error('[save-player] ❌ player_builds INSERT FAILED:', { 
          error: bErr.message, 
          code: bErr.code, 
          details: bErr.details, 
          hint: bErr.hint,
          payload_user_id: buildPayload.user_id
        })
        throw new Error(`player_builds insert failed: ${bErr.message}${bErr.details ? ` (${bErr.details})` : ''}${bErr.hint ? ` Hint: ${bErr.hint}` : ''}`)
      }
      
      buildId = b.id
      isNewBuild = true
      console.log('[save-player] ✅ player_builds INSERT SUCCESS')
      console.log('[save-player] New BuildId created:', buildId)
      console.log('[save-player] BuildId saved with user_id:', buildPayload.user_id)
    }
    
    console.log('[save-player] Final BuildId:', buildId)
    console.log('[save-player] IsNewBuild:', isNewBuild)
    console.log('[save-player] ===== PLAYER_BUILDS SAVE END =====')

    // Aggiorna rosa: gestisce slot solo se slotIndex è fornito, altrimenti mantiene posizione esistente o trova primo slot disponibile
    const updated = ensureArrayLen(rosa.player_build_ids || [], 21)
    
    if (slotIndex !== null && slotIndex >= 0 && slotIndex < 21) {
      // Slot specificato: gestisci spostamento/inserimento
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
    } else if (existingBuildIdInRosa && existingSlotIndex !== null && existingSlotIndex >= 0 && existingSlotIndex < 21) {
      // Giocatore già in rosa, slotIndex non fornito: mantieni nella posizione esistente
      updated[existingSlotIndex] = buildId
      console.log('[save-player] Giocatore già in rosa, mantiene slot esistente:', existingSlotIndex)
    } else {
      // Giocatore NON in rosa (nuovo o esistente ma non in rosa), slotIndex non fornito: trova primo slot disponibile
      const firstAvailableSlot = updated.findIndex(id => id === null || id === undefined)
      if (firstAvailableSlot >= 0 && firstAvailableSlot < 21) {
        updated[firstAvailableSlot] = buildId
        console.log('[save-player] Giocatore inserito nel primo slot disponibile:', firstAvailableSlot, isNewBuild ? '(nuovo build)' : '(build esistente ma non in rosa)')
      } else {
        // Rosa piena: questo caso dovrebbe essere già gestito sopra, ma per sicurezza...
        console.error('[save-player] Rosa piena, nessuno slot disponibile')
        return NextResponse.json(
          { 
            error: 'Rosa piena',
            message: 'La rosa è completa (21 giocatori). Vai a "I Miei Giocatori" per rimuovere un giocatore prima di aggiungerne uno nuovo.',
            rosa_full: true
          },
          { status: 400 }
        )
      }
    }

    console.log('[save-player] ===== UPDATING USER_ROSA =====')
    console.log('[save-player] RosaId:', rosa.id)
    console.log('[save-player] BuildId to add/update:', buildId)
    console.log('[save-player] Updated player_build_ids array length:', updated.length)
    console.log('[save-player] Updated array (first 5):', updated.slice(0, 5))
    console.log('[save-player] BuildId position in array:', updated.findIndex(id => id === buildId))
    
    const { error: upErr } = await admin
      .from('user_rosa')
      .update({ player_build_ids: updated, updated_at: new Date().toISOString() })
      .eq('id', rosa.id)
      
    if (upErr) {
      console.error('[save-player] ❌ user_rosa UPDATE FAILED:', { 
        error: upErr.message, 
        code: upErr.code, 
        details: upErr.details 
      })
      throw new Error(`user_rosa update failed: ${upErr.message}${upErr.details ? ` (${upErr.details})` : ''}`)
    }
    
    console.log('[save-player] ✅ user_rosa UPDATE SUCCESS')
    console.log('[save-player] ===== USER_ROSA UPDATE END =====')

    if (logId) {
      console.log('[save-player] Updating screenshot_processing_log with logId:', logId)
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
    
    // VERIFICA FINALE: Query per confermare che il build esiste con il user_id corretto
    console.log('[save-player] ===== FINAL VERIFICATION =====')
    const { data: verifyBuild, error: verifyErr } = await admin
      .from('player_builds')
      .select('id, user_id, player_base_id')
      .eq('id', buildId)
      .single()
    
    if (verifyErr) {
      console.error('[save-player] ⚠️ VERIFICATION QUERY FAILED:', verifyErr.message)
    } else {
      console.log('[save-player] ✅ VERIFICATION SUCCESS')
      console.log('[save-player] Build verified:', {
        id: verifyBuild.id,
        user_id: verifyBuild.user_id,
        user_id_match: verifyBuild.user_id === userId,
        player_base_id: verifyBuild.player_base_id
      })
      if (verifyBuild.user_id !== userId) {
        console.error('[save-player] ⚠️⚠️⚠️ USER_ID MISMATCH!')
        console.error('[save-player] Expected userId:', userId)
        console.error('[save-player] Actual user_id in DB:', verifyBuild.user_id)
      }
    }
    console.log('[save-player] ===== VERIFICATION END =====')

    // Trova lo slot finale del giocatore nella rosa aggiornata
    const finalSlot = updated.findIndex(id => id === buildId)
    
    // Determina slot finale: preferisci finalSlot se valido, altrimenti slotIndex, altrimenti existingSlotIndex, altrimenti null
    const responseSlot = finalSlot >= 0 ? finalSlot : (slotIndex !== null ? slotIndex : (existingSlotIndex !== null ? existingSlotIndex : null))
    
    const response = {
      success: true,
      user_id: userId,
      player_base_id: playerBaseId,
      player_build_id: buildId,
      rosa_id: rosa.id,
      slot: responseSlot, // Slot finale del giocatore nella rosa
      was_duplicate: !!existingBuildIdInRosa,
      was_moved: wasMoved,
      previous_slot: wasMoved ? existingSlotIndex : null,
      is_new_build: isNewBuild,
    }
    
    console.log('[save-player] ===== RESPONSE PREPARATION =====')
    console.log('[save-player] ✅ SAVE COMPLETED SUCCESSFULLY')
    console.log('[save-player] Response data:', {
      user_id: response.user_id,
      user_id_type: typeof response.user_id,
      player_build_id: response.player_build_id,
      is_new_build: response.is_new_build,
      was_duplicate: response.was_duplicate
    })
    console.log('[save-player] ===== SAVE-PLAYER END =====')
    
    return NextResponse.json(response)
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

