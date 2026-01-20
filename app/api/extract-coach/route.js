import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function normalizeCoach(coach) {
  if (!coach || typeof coach !== 'object') return coach

  const normalized = { ...coach }

  // Normalizza age
  if (normalized.age !== null && normalized.age !== undefined) {
    normalized.age = toInt(normalized.age)
  }

  // Normalizza playing_style_competence (5 stili con valori numerici)
  if (normalized.playing_style_competence && typeof normalized.playing_style_competence === 'object') {
    const competence = normalized.playing_style_competence
    const normalizedCompetence = {}
    
    const styles = ['possesso_palla', 'contropiede_veloce', 'contrattacco', 'vie_laterali', 'passaggio_lungo']
    styles.forEach(style => {
      if (competence[style] !== null && competence[style] !== undefined) {
        normalizedCompetence[style] = toInt(competence[style])
      }
    })
    
    normalized.playing_style_competence = normalizedCompetence
  }

  // Normalizza stat_boosters (array di oggetti con stat_name e bonus)
  if (Array.isArray(normalized.stat_boosters)) {
    normalized.stat_boosters = normalized.stat_boosters
      .filter(b => b && typeof b === 'object' && b.stat_name && b.bonus !== undefined)
      .map(b => ({
        stat_name: String(b.stat_name || ''),
        bonus: toInt(b.bonus) || 0
      }))
      .slice(0, 10) // Max 10 booster
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

    // Prompt per estrazione dati allenatore
    const prompt = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili dell'allenatore/manager.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai TUTTI questi dati: nome allenatore, età, nazionalità, squadra, categoria, tipo/pack

COMPETENZA STILE DI GIOCO (5 valori numerici):
Estrai i 5 valori numerici per questi stili:
- "possesso_palla" (Possesso palla / Ball Possession)
- "contropiede_veloce" (Contropiede veloce / Quick Counter)
- "contrattacco" (Contrattacco / Counter Attack)
- "vie_laterali" (Vie laterali / Wide)
- "passaggio_lungo" (Passaggio lungo / Long Ball)

AFFINITÀ DI ALLENAMENTO:
- "training_affinity_description": Descrizione testo completa (es. "Giocatori veterani+: +200% punti esperienza")
- "stat_boosters": Array di oggetti con {"stat_name": "Nome statistica", "bonus": valore numerico}
  Esempio: [{"stat_name": "Finalizzazione", "bonus": 1}, {"stat_name": "Comportamento difensivo", "bonus": 1}]

COLLEGAMENTO (opzionale - se presente):
Se c'è una sezione "Collegamento" con tatica speciale, estrai:
- "connection": {
    "name": "Nome collegamento (es. 'Passaggio sopra la testa A')",
    "description": "Descrizione completa",
    "focal_point": {
      "playing_style": "Stile di gioco (es. 'Tra le linee')",
      "position": "Posizione (es. 'MED')"
    },
    "key_man": {
      "playing_style": "Stile di gioco (es. 'Opportunista')",
      "position": "Posizione (es. 'P')"
    }
  }

Formato JSON richiesto:
{
  "coach_name": "Nome Completo Allenatore",
  "age": 45,
  "nationality": "Italia",
  "team": "AC Milan",
  "category": "Campionato italiano",
  "pack_type": "Manager Pack Fabio Capello 91-92",
  "playing_style_competence": {
    "possesso_palla": 46,
    "contropiede_veloce": 57,
    "contrattacco": 89,
    "vie_laterali": 64,
    "passaggio_lungo": 89
  },
  "training_affinity_description": "Descrizione testo completa",
  "stat_boosters": [
    {"stat_name": "Finalizzazione", "bonus": 1},
    {"stat_name": "Comportamento difensivo", "bonus": 1}
  ],
  "connection": {
    "name": "Nome collegamento",
    "description": "Descrizione completa",
    "focal_point": {
      "playing_style": "Tra le linee",
      "position": "MED"
    },
    "key_man": {
      "playing_style": "Opportunista",
      "position": "P"
    }
  }
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
        max_tokens: 2000
      })
    })

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json().catch(() => ({ error: 'OpenAI API error' }))
      console.error('[extract-coach] OpenAI API error:', errorData)
      return NextResponse.json(
        { error: `OpenAI API error: ${errorData.error?.message || 'Failed to extract data'}` },
        { status: 500 }
      )
    }

    const openaiData = await openaiRes.json()

    // Estrai contenuto JSON dalla risposta
    let coachData = null
    try {
      const content = openaiData.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse JSON dal contenuto
      coachData = JSON.parse(content)

      // Se c'è un campo "coach" nel JSON, usalo
      if (coachData.coach && typeof coachData.coach === 'object') {
        coachData = coachData.coach
      }
    } catch (parseErr) {
      console.error('[extract-coach] JSON parse error:', parseErr)
      return NextResponse.json(
        { error: 'Failed to parse OpenAI response as JSON' },
        { status: 500 }
      )
    }

    // Normalizza dati
    const normalizedCoach = normalizeCoach(coachData)

    return NextResponse.json({
      coach: normalizedCoach
    })
  } catch (err) {
    console.error('[extract-coach] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore estrazione dati' },
      { status: 500 }
    )
  }
}
