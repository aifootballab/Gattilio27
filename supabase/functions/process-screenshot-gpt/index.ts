// @ts-nocheck
// Supabase Edge Function: Process Screenshot with GPT-Realtime
// Estrae dati da screenshot profilo giocatore eFootball usando GPT-4o Realtime
// IMPORTANTE: Non salva nulla - restituisce solo CandidateProfile per conferma utente
// Questo file usa Deno runtime, non Node.js - TypeScript validation disabilitata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessScreenshotRequest {
  image_url: string
  image_type: 'player_profile' | 'formation' | 'post_match_stats' | 'heat_map' | 'squad_formation' | 'player_ratings'
  user_id: string
}

interface CandidateField {
  value: any | null
  status: "certain" | "uncertain" | "missing"
  confidence: number // 0.0-1.0
}

interface CandidateProfile {
  // Struttura flessibile con value/status/confidence per ogni campo
  [field: string]: CandidateField | CandidateProfile | any
}

/**
 * Enterprise-ready Edge Function per analisi screenshot con GPT-Realtime
 * 
 * Principi rispettati:
 * - ✅ Profilazione Progressiva: Non salva nulla, restituisce solo CandidateProfile
 * - ✅ Confidence per ogni campo: value/status/confidence
 * - ✅ Non salvare senza conferma utente
 * - ✅ Error handling completo
 * - ✅ Logging strutturato
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let logEntry: any = null

  try {
    // 1. VALIDAZIONE INPUT (Enterprise)
    const { image_url, image_type, user_id }: ProcessScreenshotRequest = await req.json()

    if (!image_url || !image_type || !user_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: image_url, image_type, user_id',
          code: 'INVALID_INPUT'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validazione image_type
    const validImageTypes = ['player_profile', 'formation', 'post_match_stats', 'heat_map', 'squad_formation', 'player_ratings']
    if (!validImageTypes.includes(image_type)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid image_type: ${image_type}. Must be one of: ${validImageTypes.join(', ')}`,
          code: 'INVALID_IMAGE_TYPE'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 2. INIZIALIZZAZIONE SUPABASE CLIENT
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 3. LOG ENTRY (NO SAVE - solo tracking processing)
    const { data: logEntryData, error: logError } = await supabase
      .from('screenshot_processing_log')
      .insert({
        user_id,
        image_url,
        image_type,
        processing_status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (logError || !logEntryData) {
      console.error('Failed to create log entry:', logError)
      throw new Error(`Failed to create log entry: ${logError?.message}`)
    }

    logEntry = logEntryData

    // 4. DOWNLOAD IMMAGINE DA STORAGE
    let imageBase64: string | null = null
    
    try {
      // Extract path from URL
      let urlPath = null
      
      if (image_url.includes('/storage/v1/object/public/player-screenshots/')) {
        urlPath = image_url.split('/storage/v1/object/public/player-screenshots/')[1]
      } else if (image_url.includes('/storage/v1/object/player-screenshots/')) {
        urlPath = image_url.split('/storage/v1/object/player-screenshots/')[1]
      } else if (image_url.includes('player-screenshots/')) {
        urlPath = image_url.split('player-screenshots/')[1]
      }
      
      if (urlPath) {
        urlPath = urlPath.split('?')[0]
      }
      
      if (!urlPath) {
        throw new Error('Failed to extract path from URL')
      }

      // Download from Supabase Storage
      const { data: imageData, error: downloadError } = await supabase.storage
        .from('player-screenshots')
        .download(urlPath)

      if (downloadError || !imageData) {
        throw new Error(`Failed to download image: ${downloadError?.message}`)
      }

      // Convert to base64
      const imageArrayBuffer = await imageData.arrayBuffer()
      const imageBuffer = new Uint8Array(imageArrayBuffer)
      imageBase64 = btoa(String.fromCharCode(...imageBuffer))

    } catch (error) {
      console.error('Error downloading image:', error)
      
      // Update log with error
      await supabase
        .from('screenshot_processing_log')
        .update({
          processing_status: 'failed',
          processing_completed_at: new Date().toISOString(),
          error_message: `Failed to download image: ${error.message}`
        })
        .eq('id', logEntry.id)

      throw new Error(`Image download failed: ${error.message}`)
    }

    if (!imageBase64) {
      throw new Error('Failed to convert image to base64')
    }

    // 5. CHIAMATA GPT-REALTIME API (OpenAI GPT-4o Realtime)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured. Please set in Supabase Edge Functions secrets.')
    }

    // Build prompt based on image_type
    const prompt = buildPromptForImageType(image_type)

    // Call GPT-4o Realtime API (Vision capability)
    const candidateProfile = await callGPTRealtimeVision(imageBase64, prompt, openaiApiKey)

    // 6. VALIDAZIONE OUTPUT (Enterprise)
    const validatedProfile = validateCandidateProfile(candidateProfile, image_type)

    // 7. UPDATE LOG (NO SAVE - solo tracking)
    await supabase
      .from('screenshot_processing_log')
      .update({
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        extracted_data: validatedProfile,
        confidence_score: calculateOverallConfidence(validatedProfile),
        // NOTA: NON salviamo matched_player_id o player_build - l'utente deve confermare
      })
      .eq('id', logEntry.id)

    // 8. RETURN CANDIDATE PROFILE (NO SAVE)
    return new Response(
      JSON.stringify({
        success: true,
        log_id: logEntry.id,
        candidate_profile: validatedProfile,
        // IMPORTANTE: Non restituiamo matched_player_id - l'utente deve confermare prima
        message: 'Screenshot processed successfully. Review and confirm to save.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing screenshot with GPT-Realtime:', error)
    
    // Update log with error (if logEntry exists)
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
        console.error('Failed to update log with error:', logError)
      }
    }

    // Enterprise error response (non esporre internals in produzione)
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production'
    
    return new Response(
      JSON.stringify({ 
        error: isProduction ? 'Failed to process screenshot' : error.message,
        code: 'PROCESSING_ERROR',
        details: isProduction ? undefined : error.stack,
        log_id: logEntry?.id || null
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Build GPT-Realtime prompt based on image type
 */
function buildPromptForImageType(imageType: string): string {
  switch (imageType) {
    case 'player_profile':
      return buildPlayerProfilePrompt()
    case 'formation':
      return buildOpponentFormationPrompt()
    case 'post_match_stats':
      return buildMatchStatsPrompt()
    case 'heat_map':
      return buildHeatMapPrompt()
    case 'squad_formation':
      return buildSquadFormationPrompt()
    case 'player_ratings':
      return buildPlayerRatingsPrompt()
    default:
      throw new Error(`Unknown image type: ${imageType}`)
  }
}

/**
 * Prompt per analisi profilo giocatore (come definito in STRATEGIA_GPT_REALTIME_INTEGRATION.md)
 */
function buildPlayerProfilePrompt(): string {
  return `
Analizza questo screenshot di un profilo giocatore eFootball e estrai TUTTI i dati visibili:

**SEZIONE 1: Player Card (Left Panel)**
- Overall rating e tipo carta (es. "99 ESA", "Epico")
- Nome giocatore completo
- Team/Club e stagione (es. "FC Barcelona 05-06")
- Tipo di carta (Epico, Leggendario, etc.)
- Partite giocate, Gol, Assist
- Nazionalità/Regione
- Stelle/rarità (numero stelle visibili)

**SEZIONE 2: Dati Base (Top Section)**
- Nome giocatore
- Ruolo/Stile (es. "Ala prolifica")
- Altezza (cm)
- Peso (kg)
- Età
- Valutazione (A, B, C, etc.)
- Piede preferito (Destro/Sinistro)
- Livello attuale / Livello massimo
- Punti progresso

**SEZIONE 3: Statistiche Complete (Central Panel)**
- **Attacco**: Comportamento offensivo, Controllo palla, Dribbling, Possesso stretto, Passaggio rasoterra, Passaggio alto, Finalizzazione, Colpo di testa, Calci da fermo, Tiro a giro
- **Difesa**: Comportamento difensivo, Contrasto, Aggressività, Coinvolgimento difensivo, tutte le stat PT (portiere)
- **Forza**: Velocità, Accelerazione, Potenza di tiro, Salto, Contatto fisico, Controllo corpo, Resistenza
- **Caratteristiche**: Frequenza piede debole, Precisione piede debole, Forma, Resistenza infortuni
- **Indicatori boost**: Identifica quali stat hanno il punto verde (boost attivo)

**SEZIONE 4: Skills e Abilità**
- **Abilità giocatore**: Lista completa (es. Finta doppio passo, Doppio tocco, Elastico, etc.)
- **Abilità aggiuntive**: Lista completa (es. Colpo di testa, Passaggio a scavalcare, etc.)
- **Competenza posizione aggiuntiva**: Posizioni alternative (es. CLD, EDA)

**SEZIONE 5: Booster Attivi**
- **Booster 1**: Nome, Effetto (+1, +2, etc.), Descrizione completa, Condizione di attivazione
- **Booster 2**: (se presente) Nome, Effetto, Descrizione, Condizione
- Identifica quali statistiche sono boostate da ogni booster

**SEZIONE 6: Visualizzazioni**
- **Radar Chart**: Estrai i 6 valori (TIR, DRI, PAS, FRZ, VEL, DIF) se visibile
- **Position Map**: Identifica le posizioni evidenziate sul campo (zone verdi)

**SEZIONE 7: Stili di Gioco IA**
- Lista completa stili IA (es. Funambolo, Serpentina, etc.)

IMPORTANTE:
- Per ogni campo, indica: value (valore estratto o null se non visibile), status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
- NON inventare valori - se non vedi un dato, status="missing" e value=null
- Rispondi in JSON strutturato completo
`
}

function buildOpponentFormationPrompt(): string {
  return `
Analizza questo screenshot di formazione avversaria e identifica:
- Formazione (es. 4-3-3, 4-4-2, etc.)
- Giocatori in campo (nomi e posizioni)
- Stile di gioco visibile (Pressing, Possession, Counter Attack, etc.)
- Punti di forza della formazione
- Vulnerabilità tattiche

Genera anche suggerimenti per contromisure.

Per ogni campo: value, status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
`
}

function buildMatchStatsPrompt(): string {
  return `
Analizza queste statistiche partita e estrai:
- Possesso palla (%)
- Tiri totali e in porta
- Passaggi completati
- Contrasti vinti
- Falli commessi
- Eventi chiave (gol, assist, cartellini)

Genera anche un'analisi delle performance e suggerimenti di miglioramento.

Per ogni campo: value, status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
`
}

function buildHeatMapPrompt(): string {
  return `
Analizza questo screenshot di heat map partita ("Aree di recupero palla" o "Aree di attacco") e estrai:

- Tipo heat map (es. "Aree di recupero palla", "Aree di attacco")
- Squadra 1 e Squadra 2 (nomi e logo)
- Risultato partita
- Per ogni squadra:
  * Se "Aree di recupero palla": Coordinate punti verdi sul campo (x,y per ogni punto)
  * Se "Aree di attacco": Percentuali per zone (sinistra, centro, destra)
  * Intensità per zona o densità punti
  * Pattern visibili

Per ogni dato: value, status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
`
}

function buildSquadFormationPrompt(): string {
  return `
Analizza questo screenshot di formazione squadra e estrai:

- Nome squadra
- Formazione tattica (es. "4-2-1-3", "4-3-3", etc.)
- Forza complessiva (numero totale)
- Stile di gioco (es. "Contrattacco", "Possession Game", etc.)

Per ogni giocatore in campo (11 giocatori):
- Numero maglia (se visibile)
- Nome completo
- Rating overall (numero sulla card)
- Posizione principale (abbreviazione)
- Posizione sul campo (coordinate o posizione relativa)
- Nazionalità e Club (se visibili)

Dettagli giocatore selezionato (se presente):
- Nome completo
- Rating e tipo carta
- Stelle/rarità

Per ogni campo: value, status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
`
}

function buildPlayerRatingsPrompt(): string {
  return `
Analizza questo screenshot "Pagelle giocatori" post-partita e estrai:

- Nome squadra 1 e squadra 2
- Risultato partita (score)
- Tempo partita

Per ogni giocatore di entrambe le squadre:
- Numero maglia
- Nome completo
- Voto/Rating (numero, es. 6.5, 8.5)
- Indicatori speciali (es. stella per top performer)

Calcola:
- Top performer (giocatore con voto più alto e stella)
- Media voti per squadra
- Distribuzione voti

Per ogni campo: value, status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
`
}

/**
 * Call GPT-4o Realtime API with Vision capability
 */
async function callGPTRealtimeVision(
  imageBase64: string, 
  prompt: string, 
  apiKey: string
): Promise<CandidateProfile> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4o supports vision
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing eFootball player profiles, formations, and match statistics from screenshots. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }, // Force JSON output
        max_tokens: 4000,
        temperature: 0.1 // Low temperature for consistent extraction
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`GPT API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid GPT API response format')
    }

    const content = data.choices[0].message.content
    
    // Parse JSON response
    let candidateProfile: CandidateProfile
    try {
      candidateProfile = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse GPT response as JSON:', content)
      throw new Error(`Failed to parse GPT response: ${parseError.message}`)
    }

    return candidateProfile

  } catch (error) {
    console.error('Error calling GPT-Realtime API:', error)
    throw new Error(`GPT API call failed: ${error.message}`)
  }
}

/**
 * Validate CandidateProfile structure
 */
function validateCandidateProfile(
  profile: any, 
  imageType: string
): CandidateProfile {
  // Basic validation
  if (!profile || typeof profile !== 'object') {
    throw new Error('Invalid CandidateProfile: must be an object')
  }

  // Type-specific validation can be added here
  // For now, return as-is with basic checks

  return profile
}

/**
 * Calculate overall confidence score from CandidateProfile
 */
function calculateOverallConfidence(profile: CandidateProfile): number {
  if (!profile || typeof profile !== 'object') {
    return 0.0
  }

  // Extract all confidence values recursively
  const confidences: number[] = []
  
  function extractConfidences(obj: any): void {
    if (!obj || typeof obj !== 'object') return
    
    for (const key in obj) {
      const value = obj[key]
      
      if (value && typeof value === 'object') {
        if ('confidence' in value && typeof value.confidence === 'number') {
          confidences.push(value.confidence)
        } else {
          extractConfidences(value)
        }
      }
    }
  }

  extractConfidences(profile)

  if (confidences.length === 0) {
    return 0.5 // Default confidence if none found
  }

  // Calculate average confidence
  const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
  return Math.round(avgConfidence * 100) / 100 // Round to 2 decimals
}
