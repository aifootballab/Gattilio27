import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { validateIndividualInstruction, INDIVIDUAL_INSTRUCTIONS_CONFIG } from '../../../../lib/tacticalInstructions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const { team_playing_style, individual_instructions } = await req.json()

    // Validazione team_playing_style
    const validStyles = ['possesso_palla', 'contropiede_veloce', 'contrattacco', 'vie_laterali', 'passaggio_lungo']
    if (team_playing_style && !validStyles.includes(team_playing_style)) {
      return NextResponse.json(
        { error: `Invalid team_playing_style. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    // Validazione individual_instructions (opzionale, ma se presente deve essere oggetto)
    if (individual_instructions !== undefined && typeof individual_instructions !== 'object') {
      return NextResponse.json(
        { error: 'individual_instructions must be an object' },
        { status: 400 }
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Recupera tutti i giocatori titolari dell'utente per la validazione delle istruzioni individuali
    const { data: players, error: playersError } = await admin
      .from('players')
      .select('id, position, slot_index')
      .eq('user_id', userId)
      .not('slot_index', 'is', null) // Solo titolari

    if (playersError) {
      console.error('[save-tactical-settings] Error fetching players for validation:', playersError)
      return NextResponse.json({ error: 'Failed to fetch players for validation' }, { status: 500 })
    }

    const titolari = players || []

    // Validazione delle istruzioni individuali
    if (individual_instructions && typeof individual_instructions === 'object') {
      for (const categoryKey in individual_instructions) {
        const instructionData = individual_instructions[categoryKey]
        if (instructionData && instructionData.player_id && instructionData.instruction) {
          const validationResult = validateIndividualInstruction(
            categoryKey,
            instructionData.player_id,
            instructionData.instruction,
            titolari
          )
          if (!validationResult.valid) {
            return NextResponse.json(
              { error: validationResult.error },
              { status: 400 }
            )
          }
        }
      }
    }

    // Salva/aggiorna impostazioni (UPSERT - stesso pattern di save-formation-layout)
    const { data: settings, error: settingsError } = await admin
      .from('team_tactical_settings')
      .upsert({
        user_id: userId,
        team_playing_style: team_playing_style || null,
        individual_instructions: individual_instructions || {},
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('id, team_playing_style, individual_instructions')
      .single()

    if (settingsError) {
      console.error('[save-tactical-settings] Error saving settings:', settingsError)
      return NextResponse.json(
        { error: `Failed to save settings: ${settingsError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: settings.id,
        team_playing_style: settings.team_playing_style,
        individual_instructions: settings.individual_instructions
      }
    })
  } catch (err) {
    console.error('[save-tactical-settings] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore salvataggio impostazioni tattiche' },
      { status: 500 }
    )
  }
}
