import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function toInt(v) {
  if (v === null || v === undefined || v === '') return null
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
      return NextResponse.json(
        { error: 'Supabase server env missing' },
        { status: 500 }
      )
    }

    const auth = req.headers.get('authorization') || ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null
    
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 })
    }

    // Valida token (stesso sistema di save-player)
    const legacyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaXV1b3Jyd2RldHlsb2xscnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDk0MTksImV4cCI6MjA4MzQ4NTQxOX0.pGnglOpSQ4gJ1JClB_zyBIB3-94eKHJfgveuCfoyffo'
    const authClient = createClient(supabaseUrl, legacyAnonKey)
    const { data: userData, error: userErr } = await authClient.auth.getUser(token)
    
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid auth', details: userErr?.message }, { status: 401 })
    }
    
    const userId = userData.user.id
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const body = await req.json().catch(() => null)
    if (!body || !body.player_base_id) {
      return NextResponse.json({ error: 'player_base_id required' }, { status: 400 })
    }

    const playerBaseId = body.player_base_id
    
    // Verifica che il record appartenga all'utente (source: 'screenshot_extractor')
    const { data: existingBase, error: fetchErr } = await admin
      .from('players_base')
      .select('id, source, metadata')
      .eq('id', playerBaseId)
      .maybeSingle()

    if (fetchErr || !existingBase) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Verifica che sia un record estratto (può essere aggiornato)
    const canUpdate = existingBase.source === 'screenshot_extractor' && 
                      existingBase.metadata?.user_id === userId

    if (!canUpdate) {
      return NextResponse.json({ error: 'This player cannot be updated (not your extracted data)' }, { status: 403 })
    }

    // Costruisci payload di aggiornamento
    const updates = {}

    // Base stats
    if (body.base_stats) {
      const currentStats = existingBase.base_stats || {}
      const newStats = { ...currentStats }
      
      if (body.base_stats.attacking) {
        newStats.attacking = { ...(currentStats.attacking || {}), ...body.base_stats.attacking }
      }
      if (body.base_stats.defending) {
        newStats.defending = { ...(currentStats.defending || {}), ...body.base_stats.defending }
      }
      if (body.base_stats.athleticism) {
        newStats.athleticism = { ...(currentStats.athleticism || {}), ...body.base_stats.athleticism }
      }
      
      updates.base_stats = newStats
    }

    // Physical data
    if (body.height !== undefined) updates.height = toInt(body.height)
    if (body.weight !== undefined) updates.weight = toInt(body.weight)
    if (body.age !== undefined) updates.age = toInt(body.age)
    if (body.team !== undefined) updates.team = toText(body.team)
    if (body.nationality !== undefined) updates.nationality = toText(body.nationality)

    // Skills (sostituisce array esistente)
    if (body.skills !== undefined) {
      updates.skills = Array.isArray(body.skills) ? body.skills.filter(s => typeof s === 'string' && s.trim()).slice(0, 40) : null
    }
    if (body.com_skills !== undefined) {
      updates.com_skills = Array.isArray(body.com_skills) ? body.com_skills.filter(s => typeof s === 'string' && s.trim()).slice(0, 20) : null
    }

    // Position ratings
    if (body.additional_positions !== undefined) {
      const positionRatings = {}
      if (Array.isArray(body.additional_positions) && body.additional_positions.length > 0) {
        body.additional_positions.forEach(pos => {
          if (typeof pos === 'string' && pos.trim()) {
            positionRatings[pos.trim()] = { competency_level: 1, is_learned: true }
          }
        })
      }
      updates.position_ratings = Object.keys(positionRatings).length > 0 ? positionRatings : null
    }

    // Boosters (max 2)
    if (body.available_boosters !== undefined) {
      updates.available_boosters = Array.isArray(body.available_boosters) 
        ? body.available_boosters.slice(0, 2).map(b => ({
            name: typeof b?.name === 'string' ? b.name : null,
            effect: typeof b?.effect === 'string' ? b.effect : null,
            activation_condition: typeof b?.activation_condition === 'string' ? b.activation_condition : null
          }))
        : null
    }

    // Metadata (caratteristiche)
    const currentMetadata = existingBase.metadata || {}
    const newMetadata = { ...currentMetadata }
    
    if (body.metadata) {
      if (body.metadata.weak_foot_frequency !== undefined) {
        newMetadata.weak_foot_frequency = toText(body.metadata.weak_foot_frequency)
      }
      if (body.metadata.weak_foot_accuracy !== undefined) {
        newMetadata.weak_foot_accuracy = toText(body.metadata.weak_foot_accuracy)
      }
      if (body.metadata.form_detailed !== undefined) {
        newMetadata.form_detailed = toText(body.metadata.form_detailed)
      }
      if (body.metadata.injury_resistance !== undefined) {
        newMetadata.injury_resistance = toText(body.metadata.injury_resistance)
      }
      if (body.metadata.ai_playstyles !== undefined) {
        newMetadata.ai_playstyles = Array.isArray(body.metadata.ai_playstyles) 
          ? body.metadata.ai_playstyles.filter(s => typeof s === 'string' && s.trim()).slice(0, 10)
          : null
      }
    }

    if (Object.keys(newMetadata).length > 0) {
      updates.metadata = newMetadata
    }

    updates.updated_at = new Date().toISOString()

    // Aggiorna players_base
    const { error: updateErr } = await admin
      .from('players_base')
      .update(updates)
      .eq('id', playerBaseId)

    if (updateErr) {
      console.error('[update-player-data] Update failed:', updateErr)
      return NextResponse.json(
        { error: 'Update failed', details: updateErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      player_base_id: playerBaseId,
      updated: Object.keys(updates).filter(k => k !== 'updated_at')
    })
  } catch (e) {
    console.error('[update-player-data] Unhandled exception:', e)
    return NextResponse.json(
      {
        error: e?.message || 'Errore server',
        details: process.env.NODE_ENV === 'development' ? String(e) : null,
      },
      { status: 500 }
    )
  }
}
