import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '../../../lib/openaiHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function normalizePlayer(player) {
  if (!player || typeof player !== 'object') return player

  const normalized = { ...player }

  // Converte overall_rating a number
  if (normalized.overall_rating !== null && normalized.overall_rating !== undefined) {
    normalized.overall_rating = toInt(normalized.overall_rating)
  }

  // Normalizza base_stats
  if (normalized.base_stats && typeof normalized.base_stats === 'object') {
    const stats = normalized.base_stats
    const normalizedStats = {}

    // Attacking
    if (stats.attacking && typeof stats.attacking === 'object') {
      normalizedStats.attacking = {}
      Object.entries(stats.attacking).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          normalizedStats.attacking[key] = toInt(value)
        }
      })
    }

    // Defending
    if (stats.defending && typeof stats.defending === 'object') {
      normalizedStats.defending = {}
      Object.entries(stats.defending).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          normalizedStats.defending[key] = toInt(value)
        }
      })
    }

    // Athleticism
    if (stats.athleticism && typeof stats.athleticism === 'object') {
      normalizedStats.athleticism = {}
      Object.entries(stats.athleticism).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          normalizedStats.athleticism[key] = toInt(value)
        }
      })
    }

    normalized.base_stats = normalizedStats
  }

  // Normalizza array skills (max 40)
  if (Array.isArray(normalized.skills)) {
    normalized.skills = normalized.skills.slice(0, 40)
  }

  // Normalizza array com_skills (max 20)
  if (Array.isArray(normalized.com_skills)) {
    normalized.com_skills = normalized.com_skills.slice(0, 20)
  }

  // Normalizza array ai_playstyles (max 10)
  if (Array.isArray(normalized.ai_playstyles)) {
    normalized.ai_playstyles = normalized.ai_playstyles.slice(0, 10)
  }

  // Normalizza array boosters
  if (Array.isArray(normalized.boosters)) {
    normalized.boosters = normalized.boosters.slice(0, 10)
  }

  return normalized
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

    const { imageDataUrl } = await req.json()

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageDataUrl is required' },
        { status: 400 }
      )
    }

    // Validazione dimensione immagine (max 10MB)
    // Solo per immagini base64 (data:image/), non per URL esterni
    if (imageDataUrl.startsWith('data:image/')) {
      const base64Image = imageDataUrl.split(',')[1]
      if (base64Image) {
        // Calcola dimensione approssimativa (base64 è ~33% più grande del binario)
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

    // Prompt per estrazione dati giocatore
    const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- PRIORITÀ: Usa la TABELLA statistiche se presente (non il radar chart)
- Estrai TUTTI questi dati: nome giocatore, posizione, overall rating, team, card_type, base_stats (attacking, defending, athleticism), skills, com_skills, boosters, height, weight, age, nationality, level, form, role, playing_style, ai_playstyles, matches_played, goals, assists, weak_foot_frequency, weak_foot_accuracy, injury_resistance
- Se vedi il volto/faccia del giocatore nella card, indicane la descrizione visiva dettagliata:
  * Colore pelle (chiaro, medio, scuro)
  * Colore capelli (nero, biondo, castano, rosso, ecc.)
  * Lunghezza capelli (corti, medi, lunghi)
  * Caratteristiche distintive (barba, baffi, occhiali, capelli ricci, ecc.)
  * Età apparente
  * Nazionalità/etnia (se riconoscibile)

Formato JSON richiesto:
{
  "player_name": "Nome Completo",
  "position": "CF",
  "overall_rating": 85,
  "team": "Team Name",
  "card_type": "Type",
  "base_stats": {
    "attacking": { "offensive_awareness": 85, "finishing": 80, ... },
    "defending": { "defensive_awareness": 60, ... },
    "athleticism": { "speed": 75, "stamina": 70, ... }
  },
  "skills": ["Skill 1", "Skill 2"],
  "com_skills": ["Com Skill 1"],
  "boosters": [{ "name": "Booster Name", "effect": "..." }],
  "ai_playstyles": ["Style 1", "Style 2"],
  "height_cm": 180,
  "weight_kg": 75,
  "age": 25,
  "nationality": "Country",
  "level_current": 10,
  "level_cap": 50,
  "form": "B",
  "role": "Role",
  "playing_style": "Style Name",
  "matches_played": 204,
  "goals": 86,
  "assists": 37,
  "weak_foot_frequency": "Raramente",
  "weak_foot_accuracy": "Alta",
  "injury_resistance": "Media",
  "player_face_description": "Descrizione dettagliata del volto se visibile (colore pelle, capelli, caratteristiche distintive)"
}

Restituisci SOLO JSON valido, senza altro testo.`

    // Chiama OpenAI Vision API con retry e timeout
    let playerData = null
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
        max_tokens: 2500
      }

      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, 'extract-player')
      const parsedData = await parseOpenAIResponse(openaiRes, 'extract-player')

      // Se c'è un campo "player" nel JSON, usalo
      playerData = parsedData.player && typeof parsedData.player === 'object' 
        ? parsedData.player 
        : parsedData
    } catch (error) {
      console.error('[extract-player] OpenAI error:', error)
      
      // Messaggi specifici per tipo di errore
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

    // Normalizza dati
    const normalizedPlayer = normalizePlayer(playerData)

    // Validazione semantica dei dati estratti
    const validationErrors = []
    
    // Validazione overall_rating: 40-100 (range eFootball)
    if (normalizedPlayer.overall_rating !== null && normalizedPlayer.overall_rating !== undefined) {
      const rating = Number(normalizedPlayer.overall_rating)
      if (isNaN(rating) || rating < 40 || rating > 100) {
        validationErrors.push('Overall rating must be between 40 and 100')
      }
    }
    
    // Validazione età: 16-50 (range realistico)
    if (normalizedPlayer.age !== null && normalizedPlayer.age !== undefined) {
      const age = Number(normalizedPlayer.age)
      if (isNaN(age) || age < 16 || age > 50) {
        validationErrors.push('Age must be between 16 and 50')
      }
    }
    
    // Validazione nome: formato valido (no caratteri estremi)
    if (normalizedPlayer.player_name && typeof normalizedPlayer.player_name === 'string') {
      const name = normalizedPlayer.player_name.trim()
      // Nome deve avere almeno 2 caratteri, max 100, no caratteri di controllo
      if (name.length < 2 || name.length > 100) {
        validationErrors.push('Player name must be between 2 and 100 characters')
      } else if (/[\x00-\x1F\x7F]/.test(name)) {
        // Caratteri di controllo non permessi
        validationErrors.push('Player name contains invalid characters')
      }
    }
    
    // Validazione base_stats: range 0-99 per ogni stat
    if (normalizedPlayer.base_stats && typeof normalizedPlayer.base_stats === 'object') {
      const stats = normalizedPlayer.base_stats
      const statCategories = ['attacking', 'defending', 'athleticism']
      
      statCategories.forEach(category => {
        if (stats[category] && typeof stats[category] === 'object') {
          Object.entries(stats[category]).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              const statValue = Number(value)
              if (!isNaN(statValue) && (statValue < 0 || statValue > 99)) {
                validationErrors.push(`Stat ${key} in ${category} must be between 0 and 99`)
              }
            }
          })
        }
      })
    }
    
    // Se ci sono errori di validazione, restituisci errore generico
    if (validationErrors.length > 0) {
      console.error('[extract-player] Validation errors:', validationErrors)
      return NextResponse.json(
        { error: 'Extracted data contains invalid values. Please try with a different image.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      player: normalizedPlayer
    })
  } catch (err) {
    console.error('[extract-player] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore estrazione dati' },
      { status: 500 }
    )
  }
}
