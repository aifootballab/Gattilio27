import { NextResponse } from 'next/server'

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

    // Estrai base64 da dataUrl se necessario
    let base64Image = imageDataUrl
    if (imageDataUrl.startsWith('data:image/')) {
      base64Image = imageDataUrl.split(',')[1]
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

    // Chiama OpenAI Vision API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    })

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json().catch(() => ({ error: 'OpenAI API error' }))
      console.error('[extract-player] OpenAI API error:', errorData)
      return NextResponse.json(
        { error: `OpenAI API error: ${errorData.error?.message || 'Failed to extract data'}` },
        { status: 500 }
      )
    }

    const openaiData = await openaiRes.json()

    // Estrai contenuto JSON dalla risposta
    let playerData = null
    try {
      const content = openaiData.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse JSON dal contenuto
      playerData = JSON.parse(content)

      // Se c'è un campo "player" nel JSON, usalo
      if (playerData.player && typeof playerData.player === 'object') {
        playerData = playerData.player
      }
    } catch (parseErr) {
      console.error('[extract-player] JSON parse error:', parseErr)
      return NextResponse.json(
        { error: 'Failed to parse OpenAI response as JSON' },
        { status: 500 }
      )
    }

    // Normalizza dati
    const normalizedPlayer = normalizePlayer(playerData)

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
