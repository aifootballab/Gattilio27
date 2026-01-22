import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '../../../lib/openaiHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Tipi di sezione supportati
const VALID_SECTIONS = ['player_ratings', 'team_stats', 'attack_areas', 'ball_recovery_zones', 'formation_style']

/**
 * Normalizza dati estratti per player_ratings
 */
function normalizePlayerRatings(data) {
  if (!data || typeof data !== 'object') return {}
  
  const ratings = {}
  
  // Supporta sia { ratings: {...} } che { ... } diretto
  const ratingsData = data.ratings || data
  
  if (typeof ratingsData === 'object') {
    Object.entries(ratingsData).forEach(([playerName, playerData]) => {
      if (playerName && typeof playerData === 'object' && playerData !== null) {
        // Funzione helper per convertire valori a number
        const toNumber = (value) => {
          if (typeof value === 'number') return value
          if (typeof value === 'string') {
            // Rimuovi caratteri non numerici e converti
            const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.')
            const num = parseFloat(cleaned)
            return !isNaN(num) ? num : null
          }
          return null
        }
        
        // Estrai SOLO il rating (voto) - è l'unico dato disponibile nelle pagelle
        // goals, assists, minutes_played NON sono visibili in questa schermata
        const rating = toNumber(playerData.rating)
        
        if (rating !== null) {
          ratings[playerName] = {
            rating: rating
            // Non includiamo goals, assists, minutes_played perché non sono visibili nelle pagelle
          }
        }
      }
    })
  }
  
  return ratings
}

/**
 * Normalizza dati estratti per team_stats
 */
function normalizeTeamStats(data) {
  if (!data || typeof data !== 'object') return {}
  
  const stats = {}
  
  // Estrai statistiche comuni
  const statFields = [
    'possession', 'shots', 'shots_on_target', 'fouls', 'offsides',
    'corner_kicks', 'free_kicks', 'passes', 'successful_passes',
    'crosses', 'interceptions', 'tackles', 'saves',
    'goals_scored', 'goals_conceded'
  ]
  
  statFields.forEach(field => {
    const value = data[field]
    if (typeof value === 'number') {
      stats[field] = value
    } else if (typeof value === 'string') {
      // Prova a convertire stringhe numeriche (es. "49%" -> 49)
      const numValue = parseFloat(value.replace(/[^\d.]/g, ''))
      if (!isNaN(numValue)) {
        stats[field] = numValue
      }
    }
  })
  
  return stats
}

/**
 * Normalizza dati estratti per attack_areas
 */
function normalizeAttackAreas(data) {
  if (!data || typeof data !== 'object') return {}
  
  const areas = {}
  
  // Supporta sia { team1: {...}, team2: {...} } che { left: ..., center: ..., right: ... }
  if (data.team1 || data.team2) {
    if (data.team1 && typeof data.team1 === 'object') {
      areas.team1 = {
        left: typeof data.team1.left === 'number' ? data.team1.left : null,
        center: typeof data.team1.center === 'number' ? data.team1.center : null,
        right: typeof data.team1.right === 'number' ? data.team1.right : null
      }
    }
    if (data.team2 && typeof data.team2 === 'object') {
      areas.team2 = {
        left: typeof data.team2.left === 'number' ? data.team2.left : null,
        center: typeof data.team2.center === 'number' ? data.team2.center : null,
        right: typeof data.team2.right === 'number' ? data.team2.right : null
      }
    }
  } else {
    // Se non c'è team1/team2, assume che siano per la squadra dell'utente
    areas.team1 = {
      left: typeof data.left === 'number' ? data.left : null,
      center: typeof data.center === 'number' ? data.center : null,
      right: typeof data.right === 'number' ? data.right : null
    }
  }
  
  return areas
}

/**
 * Normalizza dati estratti per ball_recovery_zones
 */
function normalizeBallRecoveryZones(data) {
  if (!data) return []
  
  // Supporta sia array diretto che oggetto con array
  const zones = Array.isArray(data) ? data : (data.zones || data.recovery_zones || [])
  
  if (!Array.isArray(zones)) return []
  
  return zones
    .filter(zone => zone && typeof zone === 'object')
    .map(zone => ({
      x: typeof zone.x === 'number' ? Math.max(0, Math.min(1, zone.x)) : null,
      y: typeof zone.y === 'number' ? Math.max(0, Math.min(1, zone.y)) : null,
      team: typeof zone.team === 'string' ? zone.team : 'team1'
    }))
    .filter(zone => zone.x !== null && zone.y !== null)
}

/**
 * Normalizza dati estratti per formation_style
 */
function normalizeFormationStyle(data) {
  if (!data || typeof data !== 'object') return {}
  
  return {
    formation_played: typeof data.formation === 'string' ? data.formation.trim() : null,
    playing_style_played: typeof data.playing_style === 'string' ? data.playing_style.trim() : null,
    team_strength: typeof data.team_strength === 'number' ? data.team_strength : 
                  (typeof data.strength === 'number' ? data.strength : null)
  }
}

/**
 * Genera prompt per estrazione dati in base alla sezione
 */
function getPromptForSection(section) {
  const prompts = {
    player_ratings: `Analizza questo screenshot di eFootball e estrai TUTTE le pagelle (ratings) dei giocatori.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine
- Questa schermata mostra SOLO i VOTI (ratings) dei giocatori, NON ci sono goals, assists o minuti giocati
- Per ogni giocatore visibile nella lista delle pagelle, estrai:
  * nome (nome completo del giocatore come appare nella lista)
  * rating (voto numerico, es. 8.5, 7.0, 6.5, 5.5 - OBBLIGATORIO, è l'unico dato visibile)
- I valori numerici devono essere numeri, non stringhe
- Se vedi una lista di giocatori con voti, estrai TUTTI i giocatori visibili
- Se ci sono due squadre (team1 e team2), identifica chiaramente quale giocatore appartiene a quale squadra
- NON inventare dati che non vedi (goals, assists, minutes_played non sono visibili in questa schermata)

Formato JSON richiesto:
{
  "ratings": {
    "Nome Giocatore 1": {
      "rating": 8.5
    },
    "Nome Giocatore 2": {
      "rating": 6.5
    }
  }
}

Restituisci SOLO JSON valido, senza altro testo.`,

    team_stats: `Analizza questo screenshot di eFootball e estrai TUTTE le statistiche di squadra.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai: possesso di palla (possession %), tiri totali (shots), tiri in porta (shots_on_target), falli (fouls), fuorigioco (offsides), calci d'angolo (corner_kicks), punizioni (free_kicks), passaggi (passes), passaggi riusciti (successful_passes), cross, passaggi intercettati (interceptions), contrasti (tackles), parate (saves), gol segnati (goals_scored), gol subiti (goals_conceded)
- Se ci sono statistiche per entrambe le squadre, estrai entrambe

Formato JSON richiesto:
{
  "possession": 49,
  "shots": 16,
  "shots_on_target": 10,
  "fouls": 0,
  "offsides": 0,
  "corner_kicks": 2,
  "free_kicks": 0,
  "passes": 110,
  "successful_passes": 81,
  "crosses": 0,
  "interceptions": 29,
  "tackles": 4,
  "saves": 4,
  "goals_scored": 6,
  "goals_conceded": 1
}

Restituisci SOLO JSON valido, senza altro testo.`,

    attack_areas: `Analizza questo screenshot di eFootball e estrai le aree di attacco.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai le percentuali per zona: sinistra (left), centro (center), destra (right)
- Se ci sono dati per entrambe le squadre, identifica team1 (squadra utente) e team2 (avversario)

Formato JSON richiesto:
{
  "team1": {
    "left": 46,
    "center": 45,
    "right": 9
  },
  "team2": {
    "left": 19,
    "center": 64,
    "right": 17
  }
}

Restituisci SOLO JSON valido, senza altro testo.`,

    ball_recovery_zones: `Analizza questo screenshot di eFootball e estrai le zone di recupero palla.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Per ogni punto verde sul campo, estrai la posizione normalizzata (x: 0-1, y: 0-1 dove 0,0 è in alto a sinistra)
- Identifica quale squadra ha recuperato (team1 o team2)

Formato JSON richiesto:
{
  "zones": [
    { "x": 0.3, "y": 0.5, "team": "team1" },
    { "x": 0.7, "y": 0.4, "team": "team2" }
  ]
}

Restituisci SOLO JSON valido, senza altro testo.`,

    formation_style: `Analizza questo screenshot di eFootball e estrai formazione, stile di gioco e forza squadra.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai: formazione (es. "4-2-1-3", "4-3-3"), stile di gioco (es. "Contrattacco", "Possesso palla"), forza complessiva (team_strength, numero grande tipo 3245)

Formato JSON richiesto:
{
  "formation": "4-2-1-3",
  "playing_style": "Contrattacco",
  "team_strength": 3245
}

Restituisci SOLO JSON valido, senza altro testo.`
  }
  
  return prompts[section] || prompts.player_ratings
}

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY not configured' },
        { status: 500 }
      )
    }

    const { imageDataUrl, section } = await req.json()

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageDataUrl is required' },
        { status: 400 }
      )
    }

    if (!section || !VALID_SECTIONS.includes(section)) {
      return NextResponse.json(
        { error: `section must be one of: ${VALID_SECTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validazione dimensione immagine (max 10MB)
    if (imageDataUrl.startsWith('data:image/')) {
      const base64Image = imageDataUrl.split(',')[1]
      if (base64Image) {
        const imageSizeBytes = (base64Image.length * 3) / 4
        const maxSizeBytes = 10 * 1024 * 1024 // 10MB
        
        if (imageSizeBytes > maxSizeBytes) {
          return NextResponse.json(
            { error: 'Image size exceeds maximum allowed size (10MB)' },
            { status: 400 }
          )
        }
      }
    }

    // Genera prompt per sezione
    const prompt = getPromptForSection(section)

    // Chiama OpenAI Vision API
    let extractedData = null
    try {
      const requestBody = {
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageDataUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000
      }

      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, `extract-match-data-${section}`)
      const parsedData = await parseOpenAIResponse(openaiRes, `extract-match-data-${section}`)

      extractedData = parsedData
    } catch (error) {
      console.error(`[extract-match-data] OpenAI error for section ${section}:`, error)
      
      let errorMessage = 'Unable to extract data from image. Please try again with a different image.'
      let statusCode = 500
      
      if (error.type === 'rate_limit') {
        errorMessage = 'Rate limit reached. Please try again in a minute.'
        statusCode = 429
      } else if (error.type === 'timeout') {
        errorMessage = 'Request took too long. Please try again with a smaller image or different image.'
        statusCode = 408
      } else if (error.type === 'server_error') {
        errorMessage = 'Service temporarily unavailable. Please try again in a few moments.'
        statusCode = 503
      } else if (error.type === 'network_error') {
        errorMessage = 'Network error. Please check your connection and try again.'
        statusCode = 503
      } else if (error.type === 'no_content' || error.type === 'parse_error') {
        errorMessage = error.message || errorMessage
        statusCode = 500
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      )
    }

    // Normalizza dati in base alla sezione
    let normalizedData = null
    switch (section) {
      case 'player_ratings':
        normalizedData = normalizePlayerRatings(extractedData)
        break
      case 'team_stats':
        normalizedData = normalizeTeamStats(extractedData)
        break
      case 'attack_areas':
        normalizedData = normalizeAttackAreas(extractedData)
        break
      case 'ball_recovery_zones':
        normalizedData = normalizeBallRecoveryZones(extractedData)
        break
      case 'formation_style':
        normalizedData = normalizeFormationStyle(extractedData)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid section' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      section,
      data: normalizedData,
      raw: extractedData // Include dati raw per debug
    })
  } catch (err) {
    console.error('[extract-match-data] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore estrazione dati' },
      { status: 500 }
    )
  }
}
