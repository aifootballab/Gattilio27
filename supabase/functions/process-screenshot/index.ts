// @ts-nocheck
// Supabase Edge Function: Process Screenshot with Google Vision API
// Estrae dati da screenshot profilo giocatore eFootball
// Questo file usa Deno runtime, non Node.js - TypeScript validation disabilitata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Removed parseGoogleDriveData import - not needed for basic screenshot processing

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessScreenshotRequest {
  image_url: string
  image_type: 'player_profile' | 'formation' | 'post_match_stats'
  user_id: string
}

interface VisionOCRResult {
  textAnnotations?: Array<{ description: string; boundingPoly?: any }>
  fullTextAnnotation?: {
    text: string
    pages?: Array<{
      blocks?: Array<{
        paragraphs?: Array<{
          words?: Array<{
            symbols?: Array<{ text: string }>
          }>
        }>
      }>
    }>
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_url, image_type, user_id }: ProcessScreenshotRequest = await req.json()

    if (!image_url || !image_type || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image_url, image_type, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
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

    if (logError || !logEntry) {
      throw new Error(`Failed to create log entry: ${logError?.message}`)
    }

    // Download image from Storage using Supabase client (bucket is private)
    // Extract path from URL (format: .../storage/v1/object/public/player-screenshots/path/to/file.jpg)
    let urlPath = null
    
    // Try different URL formats
    if (image_url.includes('/storage/v1/object/public/player-screenshots/')) {
      urlPath = image_url.split('/storage/v1/object/public/player-screenshots/')[1]
    } else if (image_url.includes('/storage/v1/object/player-screenshots/')) {
      urlPath = image_url.split('/storage/v1/object/player-screenshots/')[1]
    } else if (image_url.includes('player-screenshots/')) {
      // Fallback: extract everything after player-screenshots/
      urlPath = image_url.split('player-screenshots/')[1]
    }
    
    // Remove query parameters if present
    if (urlPath) {
      urlPath = urlPath.split('?')[0]
    }
    
    if (!urlPath) {
      console.error('Failed to extract path from URL:', image_url)
      throw new Error(`Invalid image URL format: ${image_url}`)
    }

    console.log('Downloading image with path:', urlPath)

    const { data: imageData, error: downloadError } = await supabase.storage
      .from('player-screenshots')
      .download(urlPath)

    if (downloadError) {
      console.error('Download error:', downloadError)
      throw new Error(`Failed to download image: ${downloadError.message || 'Unknown error'}`)
    }

    if (!imageData) {
      throw new Error('Downloaded image data is null or undefined')
    }

    // Convert blob to base64
    const imageBuffer = await imageData.arrayBuffer()
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    // Check if Vision API is enabled
    const visionEnabled = Deno.env.get('GOOGLE_VISION_API_ENABLED') === 'true'
    
    if (!visionEnabled) {
      // Return mock data for development
      const mockData = generateMockExtraction(image_type)
      
      await supabase
        .from('screenshot_processing_log')
        .update({
          processing_status: 'completed',
          processing_completed_at: new Date().toISOString(),
          extracted_data: mockData,
          confidence_score: 0.5,
          error_message: 'Vision API not enabled - using mock data'
        })
        .eq('id', logEntry.id)

      return new Response(
        JSON.stringify({
          success: true,
          log_id: logEntry.id,
          extracted_data: mockData,
          warning: 'Vision API not enabled - mock data returned'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get API Key or use credentials
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    
    let annotations: any = {}
    
    if (apiKey) {
      // Use API Key (simpler method)
      const visionData = await callVisionAPI(imageBase64, apiKey)
      annotations = visionData.responses?.[0] || {}
    } else {
      // Try to use service account (requires proper JWT implementation)
      const credentialsStr = Deno.env.get('GOOGLE_VISION_CREDENTIALS')
      if (credentialsStr) {
        // For now, fallback to mock if JWT not properly implemented
        console.warn('Service account JWT not fully implemented, using mock data')
        const mockData = generateMockExtraction(image_type)
        
        await supabase
          .from('screenshot_processing_log')
          .update({
            processing_status: 'completed',
            processing_completed_at: new Date().toISOString(),
            extracted_data: mockData,
            confidence_score: 0.5,
            error_message: 'Vision API requires GOOGLE_VISION_API_KEY or proper JWT implementation'
          })
          .eq('id', logEntry.id)

        return new Response(
          JSON.stringify({
            success: true,
            log_id: logEntry.id,
            extracted_data: mockData,
            warning: 'Using mock data - configure GOOGLE_VISION_API_KEY for real OCR'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        throw new Error('GOOGLE_VISION_API_KEY or GOOGLE_VISION_CREDENTIALS not configured')
      }
    }

    // Extract structured data
    const extractedData = extractPlayerData(
      annotations,
      image_type
    )

    // Match player with database
    const matchedPlayer = await matchPlayer(extractedData.player_name, supabase)

    // Save/update players_base (if new player)
    let playerBaseId = matchedPlayer?.id
    if (!playerBaseId && extractedData.player_name) {
      const { data: newPlayer, error: playerError } = await supabase
        .from('players_base')
        .insert({
          player_name: extractedData.player_name,
          position: extractedData.position,
          base_stats: extractedData.attacking ? {
            attacking: extractedData.attacking,
            defending: extractedData.defending,
            athleticism: extractedData.athleticism
          } : {},
          skills: extractedData.skills || [],
          com_skills: extractedData.comSkills || [],
          position_ratings: extractedData.positionRatings || {},
          source: 'user_upload'
        })
        .select()
        .single()

      if (!playerError && newPlayer) {
        playerBaseId = newPlayer.id
      }
    }

    // Save build (if build data exists)
    if (playerBaseId && extractedData.build) {
      await supabase
        .from('player_builds')
        .upsert({
          user_id,
          player_base_id: playerBaseId,
          development_points: extractedData.build.developmentPoints || {},
          current_level: extractedData.build.currentLevel,
          level_cap: extractedData.build.levelCap,
          active_booster_name: extractedData.build.activeBooster,
          source: 'screenshot',
          source_data: {
            screenshot_id: logEntry.id,
            confidence: extractedData.confidence || 0.8
          }
        }, {
          onConflict: 'user_id,player_base_id'
        })
    }

    // Update log
    await supabase
      .from('screenshot_processing_log')
      .update({
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        raw_ocr_data: annotations,
        extracted_data: extractedData,
        confidence_score: extractedData.confidence || 0.8,
        matched_player_id: playerBaseId,
        matching_confidence: matchedPlayer?.confidence || 1.0
      })
      .eq('id', logEntry.id)

    return new Response(
      JSON.stringify({
        success: true,
        log_id: logEntry.id,
        extracted_data: extractedData,
        matched_player_id: playerBaseId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing screenshot:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper: Get Google Access Token
async function getGoogleAccessToken(credentials: any): Promise<string> {
  // Use API Key if available (simpler for Vision API)
  const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
  if (apiKey) {
    return apiKey
  }

  // Otherwise, use service account JWT
  // Note: In production, implement proper JWT signing with crypto
  // For now, we'll use a simplified approach or require API key
  
  throw new Error('GOOGLE_VISION_API_KEY not configured. Please set API key in Vercel environment variables.')
}

// Helper: Call Vision API with API Key (simpler method)
async function callVisionAPI(imageBase64: string, apiKey: string): Promise<any> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBase64
            },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 10 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
              { type: 'LABEL_DETECTION', maxResults: 10 }
            ]
          }
        ]
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vision API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Helper: Extract player data from OCR
function extractPlayerData(annotations: any, imageType: string): any {
  const textAnnotations = annotations.textAnnotations || []
  const fullText = annotations.fullTextAnnotation?.text || ''
  const labels = annotations.labelAnnotations || []

  // Estrai dati usando funzioni helper
  const playerName = extractPlayerName(textAnnotations, fullText)
  const overallRating = extractOverallRating(textAnnotations, fullText)
  const position = extractPosition(textAnnotations, fullText)
  const attacking = extractAttackingStats(textAnnotations, fullText)
  const defending = extractDefendingStats(textAnnotations, fullText)
  const athleticism = extractAthleticismStats(textAnnotations, fullText)
  const skills = extractSkills(textAnnotations, fullText)
  const comSkills = extractComSkills(textAnnotations, fullText)
  const build = extractBuild(textAnnotations, fullText)

  // Calcola confidence basato su quanti dati abbiamo estratto
  const extractedFields = [
    playerName !== 'Unknown Player',
    overallRating > 0,
    position !== 'CF', // Default, potrebbe non essere corretto
    Object.values(attacking).some(v => v !== null),
    Object.values(defending).some(v => v !== null),
    Object.values(athleticism).some(v => v !== null),
    skills.length > 0
  ]
  const confidence = extractedFields.filter(Boolean).length / extractedFields.length

  return {
    player_name: playerName,
    overall_rating: overallRating,
    position: position,
    attacking: attacking,
    defending: defending,
    athleticism: athleticism,
    skills: skills,
    comSkills: comSkills,
    positionRatings: {},
    build: build,
    confidence: Math.max(0.5, confidence) // Minimo 0.5
  }
}

// Helper functions for extraction
function extractPlayerName(textAnnotations: any[], fullText: string): string {
  if (!textAnnotations || textAnnotations.length === 0) {
    return 'Unknown Player'
  }

  const namePatterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /([A-Z][A-Z]+ [A-Z][a-z]+)/g,
  ]

  const topAnnotations = textAnnotations.slice(0, 10)
  
  for (const annotation of topAnnotations) {
    const text = annotation.description || ''
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[0].length > 5) {
        return match[0].trim()
      }
    }
  }

  for (const pattern of namePatterns) {
    const matches = fullText.match(pattern)
    if (matches && matches.length > 0) {
      return matches[0].trim()
    }
  }

  return 'Unknown Player'
}

function extractOverallRating(textAnnotations: any[], fullText: string): number {
  const topAnnotations = textAnnotations.slice(0, 5)
  
  for (const annotation of topAnnotations) {
    const text = annotation.description || ''
    const matches = text.match(/\b(9[0-9]|[1-9][0-9])\b/)
    if (matches) {
      const rating = parseInt(matches[0])
      if (rating >= 50 && rating <= 120) {
        return rating
      }
    }
  }

  const matches = fullText.match(/\b(9[0-9]|[1-9][0-9])\b/)
  if (matches) {
    const rating = parseInt(matches[0])
    if (rating >= 50 && rating <= 120) {
      return rating
    }
  }

  return 0
}

function extractPosition(textAnnotations: any[], fullText: string): string {
  const positions = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF']
  const searchText = fullText.toUpperCase()
  
  for (const pos of positions) {
    if (searchText.includes(pos)) {
      return pos
    }
  }

  return 'CF'
}

function extractAttackingStats(textAnnotations: any[], fullText: string): any {
  return {
    offensiveAwareness: extractStatValue(fullText, ['Offensive Awareness', 'Comportamento offensivo']),
    ballControl: extractStatValue(fullText, ['Ball Control', 'Controllo palla']),
    dribbling: extractStatValue(fullText, ['Dribbling']),
    tightPossession: extractStatValue(fullText, ['Tight Possession', 'Possesso stretto']),
    lowPass: extractStatValue(fullText, ['Low Pass', 'Passaggio basso']),
    loftedPass: extractStatValue(fullText, ['Lofted Pass', 'Passaggio alto']),
    finishing: extractStatValue(fullText, ['Finishing', 'Finalizzazione']),
    heading: extractStatValue(fullText, ['Heading', 'Colpo di testa']),
    placeKicking: extractStatValue(fullText, ['Place Kicking', 'Tiro piazzato']),
    curl: extractStatValue(fullText, ['Curl', 'Effetto'])
  }
}

function extractDefendingStats(textAnnotations: any[], fullText: string): any {
  return {
    defensiveAwareness: extractStatValue(fullText, ['Defensive Awareness', 'Comportamento difensivo']),
    defensiveEngagement: extractStatValue(fullText, ['Defensive Engagement', 'Coinvolgimento difensivo']),
    tackling: extractStatValue(fullText, ['Tackling', 'Contrasto']),
    aggression: extractStatValue(fullText, ['Aggression', 'Aggressività']),
    goalkeeping: extractStatValue(fullText, ['Goalkeeping', 'Portiere']),
    gkCatching: extractStatValue(fullText, ['GK Catching', 'Parata']),
    gkParrying: extractStatValue(fullText, ['GK Parrying', 'Respinta']),
    gkReflexes: extractStatValue(fullText, ['GK Reflexes', 'Riflessi']),
    gkReach: extractStatValue(fullText, ['GK Reach', 'Portata'])
  }
}

function extractAthleticismStats(textAnnotations: any[], fullText: string): any {
  return {
    speed: extractStatValue(fullText, ['Speed', 'Velocità']),
    acceleration: extractStatValue(fullText, ['Acceleration', 'Accelerazione']),
    kickingPower: extractStatValue(fullText, ['Kicking Power', 'Potenza tiro']),
    jump: extractStatValue(fullText, ['Jump', 'Salto']),
    physicalContact: extractStatValue(fullText, ['Physical Contact', 'Contatto fisico']),
    balance: extractStatValue(fullText, ['Balance', 'Equilibrio']),
    stamina: extractStatValue(fullText, ['Stamina', 'Resistenza']),
    weakFootUsage: extractStatValue(fullText, ['Weak Foot Usage', 'Uso piede debole'], 1, 4),
    weakFootAccuracy: extractStatValue(fullText, ['Weak Foot Accuracy', 'Precisione piede debole'], 1, 4),
    form: extractStatValue(fullText, ['Form', 'Forma'], 1, 8),
    injuryResistance: extractStatValue(fullText, ['Injury Resistance', 'Resistenza infortuni'], 1, 3)
  }
}

function extractSkills(textAnnotations: any[], fullText: string): string[] {
  const commonSkills = [
    'Heading', 'Long Range Drive', 'Chip Shot Control', 'Heel Trick',
    'First Time Shot', 'One Touch Pass', 'Through Passing', 'Outside Curler',
    'Penalty Specialist', 'Fighting Spirit', 'Scissors Feint', 'Double Touch',
    'Cross Over Turn', 'Cut Behind & Turn', 'Sole Control', 'Step On Skill Control',
    'Marseille Turn', 'Sombrero', 'Flip Flap', 'Interception', 'Man Marking',
    'Track Back', 'Acrobatic Clear', 'Captaincy', 'GK Long Throw', 'GK High Punt',
    'GK Low Punt', 'Long Throw', 'Low Lofted Pass', 'Weighted Pass', 'Pinpoint Crossing',
    'Early Cross', 'Rising Shot', 'Knuckle Shot', 'Dipping Shot', 'Long Range Shooting',
    'Chip Shot', 'Acrobatic Finishing', 'First-time Shot', 'One-touch Pass',
    'Weighted Pass', 'No Look Pass', 'Low Lofted Pass', 'Through Passing',
    'Rabona', 'No Look Pass', 'Low Lofted Pass', 'Long Ball Expert', 'Blocker',
    'Super-sub', 'Injury Resistance', 'Gamesmanship', 'Fighting Spirit'
  ]

  const foundSkills: string[] = []
  const upperText = fullText.toUpperCase()

  for (const skill of commonSkills) {
    const upperSkill = skill.toUpperCase()
    if (upperText.includes(upperSkill)) {
      foundSkills.push(skill)
    }
  }

  return foundSkills
}

function extractComSkills(textAnnotations: any[], fullText: string): string[] {
  const comSkills = [
    'MazingRun', 'IncisiveRun', 'LongRanger', 'EarlyCross', 'Blocker',
    'Track Back', 'Interception', 'Penalty Specialist', 'GK Long Throw',
    'GK High Punt', 'GK Low Punt', 'Long Throw', 'Captaincy'
  ]

  const foundSkills: string[] = []
  const upperText = fullText.toUpperCase()

  for (const skill of comSkills) {
    const upperSkill = skill.toUpperCase()
    if (upperText.includes(upperSkill)) {
      foundSkills.push(skill)
    }
  }

  return foundSkills
}

function extractBuild(textAnnotations: any[], fullText: string): any {
  const levelCapMatch = fullText.match(/Level Cap[:\s]+(\d+)/i)
  const levelCap = levelCapMatch ? parseInt(levelCapMatch[1]) : null

  const currentLevelMatch = fullText.match(/(\d+)\s*\/\s*(\d+)/)
  const currentLevel = currentLevelMatch ? parseInt(currentLevelMatch[1]) : null

  const developmentPoints: any = {
    shooting: extractDevPoint(fullText, ['Shooting']),
    passing: extractDevPoint(fullText, ['Passing']),
    dribbling: extractDevPoint(fullText, ['Dribbling']),
    dexterity: extractDevPoint(fullText, ['Dexterity']),
    lowerBodyStrength: extractDevPoint(fullText, ['Lower Body Strength', 'Lower Body']),
    aerialStrength: extractDevPoint(fullText, ['Aerial Strength', 'Aerial']),
    defending: extractDevPoint(fullText, ['Defending']),
    gk1: extractDevPoint(fullText, ['GK 1', 'GK1']),
    gk2: extractDevPoint(fullText, ['GK 2', 'GK2']),
    gk3: extractDevPoint(fullText, ['GK 3', 'GK3'])
  }

  const boosterMatch = fullText.match(/([A-Za-z\s]+\s*\+\s*\d+)/)
  const activeBooster = boosterMatch ? boosterMatch[1].trim() : null

  if (levelCap || currentLevel || Object.values(developmentPoints).some((v: any) => v !== null)) {
    return {
      levelCap,
      currentLevel,
      developmentPoints,
      activeBooster
    }
  }

  return null
}

function extractStatValue(fullText: string, searchTerms: string[], min: number = 0, max: number = 99): number | null {
  const upperText = fullText.toUpperCase()
  
  for (const term of searchTerms) {
    const upperTerm = term.toUpperCase()
    const index = upperText.indexOf(upperTerm)
    
    if (index !== -1) {
      const substring = fullText.substring(index, index + 50)
      const numberMatch = substring.match(/\b(\d{1,3})\b/)
      
      if (numberMatch) {
        const value = parseInt(numberMatch[1])
        if (value >= min && value <= max) {
          return value
        }
      }
    }
  }

  return null
}

function extractDevPoint(fullText: string, searchTerms: string[]): number | null {
  for (const term of searchTerms) {
    const index = fullText.toUpperCase().indexOf(term.toUpperCase())
    if (index !== -1) {
      const substring = fullText.substring(index, index + 30)
      const numberMatch = substring.match(/\b(\d{1,2})\b/)
      if (numberMatch) {
        const value = parseInt(numberMatch[1])
        if (value >= 0 && value <= 99) {
          return value
        }
      }
    }
  }
  return null
}

// Helper: Match player with database
async function matchPlayer(playerName: string, supabase: any): Promise<any> {
  if (!playerName || playerName === 'Unknown Player') {
    return null
  }

  // Fuzzy matching
  const { data, error } = await supabase
    .from('players_base')
    .select('id, player_name')
    .ilike('player_name', `%${playerName}%`)
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    confidence: 0.9
  }
}

// Helper: Generate mock extraction for development
function generateMockExtraction(imageType: string): any {
  return {
    player_name: 'Kylian Mbappé',
    overall_rating: 98,
    position: 'CF',
    attacking: {
      offensiveAwareness: 90,
      ballControl: 88,
      dribbling: 92,
      tightPossession: 90,
      lowPass: 82,
      loftedPass: 75,
      finishing: 95,
      heading: 80,
      placeKicking: 70,
      curl: 85
    },
    defending: {
      defensiveAwareness: 40,
      defensiveEngagement: 45,
      tackling: 35,
      aggression: 50
    },
    athleticism: {
      speed: 99,
      acceleration: 98,
      kickingPower: 90,
      jump: 85,
      physicalContact: 75,
      balance: 88,
      stamina: 85,
      weakFootUsage: 4,
      weakFootAccuracy: 4,
      form: 8,
      injuryResistance: 2
    },
    skills: ['Long Range Drive', 'Chip Shot Control', 'First Time Shot'],
    comSkills: ['MazingRun', 'IncisiveRun'],
    positionRatings: { CF: 98, LWF: 97, SS: 95 },
    confidence: 0.5
  }
}
