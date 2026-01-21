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
    console.log(`[save-coach] User ID: ${userId}`)
    
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { coach } = await req.json()

    if (!coach || !coach.coach_name) {
      return NextResponse.json({ error: 'Coach data is required' }, { status: 400 })
    }

    // Validazione lunghezza campi testo (max 255 caratteri)
    const MAX_TEXT_LENGTH = 255
    if (coach.coach_name && toText(coach.coach_name) && toText(coach.coach_name).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `coach_name exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (coach.team && toText(coach.team) && toText(coach.team).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `team exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }
    if (coach.nationality && toText(coach.nationality) && toText(coach.nationality).length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `nationality exceeds maximum length (${MAX_TEXT_LENGTH} characters)` },
        { status: 400 }
      )
    }

    // Prepara dati allenatore
    const coachData = {
      user_id: userId,
      coach_name: toText(coach.coach_name),
      age: toInt(coach.age),
      nationality: toText(coach.nationality),
      team: toText(coach.team),
      category: toText(coach.category),
      pack_type: toText(coach.pack_type),
      playing_style_competence: coach.playing_style_competence && typeof coach.playing_style_competence === 'object' 
        ? coach.playing_style_competence 
        : {},
      training_affinity_description: toText(coach.training_affinity_description),
      stat_boosters: Array.isArray(coach.stat_boosters) ? coach.stat_boosters : [],
      connection: coach.connection && typeof coach.connection === 'object' ? coach.connection : null,
      photo_slots: coach.photo_slots && typeof coach.photo_slots === 'object' 
        ? coach.photo_slots 
        : {},
      extracted_data: coach,
      // is_active: default false (primo allenatore può essere settato come attivo dopo)
      is_active: false
    }

    // Inserisci nuovo allenatore
    console.log(`[save-coach] Inserting coach for user_id: ${userId}, coach_name: ${coachData.coach_name}`)
    const { data: inserted, error: insertErr } = await admin
      .from('coaches')
      .insert(coachData)
      .select('id, user_id, coach_name')
      .single()

    if (insertErr) {
      console.error('[save-coach] Insert error:', insertErr.message)
      return NextResponse.json(
        { error: `Failed to create coach: ${insertErr.message}` },
        { status: 500 }
      )
    }

    console.log(`[save-coach] Coach saved: id=${inserted.id}, user_id=${inserted.user_id}, coach_name=${inserted.coach_name}`)

    return NextResponse.json({
      success: true,
      coach_id: inserted.id,
      is_new: true
    })
  } catch (e) {
    console.error('[save-coach] Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Errore server' },
      { status: 500 }
    )
  }
}
