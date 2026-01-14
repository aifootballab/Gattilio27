// @ts-nocheck
// Supabase Edge Function: Analyze Squad Formation Screenshot with GPT-Realtime
// Estrae dati da screenshot formazione squadra completa
// IMPORTANTE: Non salva nulla - restituisce solo CandidateProfile per conferma utente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeSquadFormationRequest {
  image_url: string
  user_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let logEntry: any = null

  try {
    const { image_url, user_id }: AnalyzeSquadFormationRequest = await req.json()

    if (!image_url || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image_url, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log entry (no save)
    const { data: logEntryData, error: logError } = await supabase
      .from('screenshot_processing_log')
      .insert({
        user_id,
        image_url,
        image_type: 'squad_formation',
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError || !logEntryData) {
      throw new Error(`Failed to create log entry: ${logError?.message}`)
    }

    logEntry = logEntryData

    // Download image
    let imageBase64: string | null = null
    
    try {
      let urlPath = null
      if (image_url.includes('/storage/v1/object/public/player-screenshots/')) {
        urlPath = image_url.split('/storage/v1/object/public/player-screenshots/')[1].split('?')[0]
      }

      if (!urlPath) throw new Error('Failed to extract path from URL')

      const { data: imageData, error: downloadError } = await supabase.storage
        .from('player-screenshots')
        .download(urlPath)

      if (downloadError || !imageData) {
        throw new Error(`Failed to download image: ${downloadError?.message}`)
      }

      const imageArrayBuffer = await imageData.arrayBuffer()
      const imageBuffer = new Uint8Array(imageArrayBuffer)
      imageBase64 = btoa(String.fromCharCode(...imageBuffer))

    } catch (error) {
      await supabase
        .from('screenshot_processing_log')
        .update({
          processing_status: 'failed',
          processing_completed_at: new Date().toISOString(),
          error_message: `Failed to download image: ${error.message}`
        })
        .eq('id', logEntry.id)

      throw error
    }

    // GPT-Realtime API call
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const prompt = `
Analizza questo screenshot di formazione squadra e estrai:

**SEZIONE 1: Informazioni Squadra**
- Nome squadra
- Formazione tattica (es. "4-2-1-3", "4-3-3", etc.)
- Forza complessiva (numero totale, es. 3245)
- Stile di gioco (es. "Contrattacco", "Possession Game", etc.)

**SEZIONE 2: Giocatori in Campo (11 giocatori)**
Per ogni giocatore visibile:
- Numero maglia (se visibile)
- Nome completo
- Rating overall (numero grande sulla card)
- Posizione principale (abbreviazione, es. P, SP, TRQ, CC, MED, TS, DC, PT)
- Posizione sul campo (coordinate x,y o posizione relativa nella formazione)
- Nazionalità (bandiera se visibile)
- Club (logo se visibile)
- Tipo carta (Epico, Leggendario, etc. se visibile)

**SEZIONE 3: Dettagli Giocatore Selezionato (se presente)**
- Nome completo
- Rating e tipo carta (es. "97 CLD")
- Stelle/rarità

**SEZIONE 4: Panel Sinistra (se visibile)**
- Opzioni menu (es. "Tattiche", "Squadra", "Sostituti", "Riserve")

Per ogni dato: value, status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
Rispondi in JSON strutturato.
`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing eFootball squad formations from screenshots. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.1
      }),
    })

    if (!response.ok) {
      throw new Error(`GPT API error: ${response.status}`)
    }

    const data = await response.json()
    const candidateProfile = JSON.parse(data.choices[0].message.content)

    // Update log (no save)
    await supabase
      .from('screenshot_processing_log')
      .update({
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        extracted_data: candidateProfile,
        processing_method: 'gpt_realtime'
      })
      .eq('id', logEntry.id)

    return new Response(
      JSON.stringify({
        success: true,
        log_id: logEntry.id,
        candidate_profile: candidateProfile,
        message: 'Squad formation analyzed successfully. Review and confirm to save.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error analyzing squad formation:', error)
    
    if (logEntry) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          await supabase
            .from('screenshot_processing_log')
            .update({
              processing_status: 'failed',
              processing_completed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', logEntry.id)
        }
      } catch (logError) {
        console.error('Failed to update log:', logError)
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: 'PROCESSING_ERROR',
        log_id: logEntry?.id || null
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
