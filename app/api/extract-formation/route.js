import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function pickJsonObject(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

function truncate(value, max = 2000) {
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  if (s.length <= max) return s
  return s.slice(0, max) + '…(truncated)'
}

function toNumber(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/)
    if (!m) return null
    const n = Number(m[0])
    return Number.isFinite(n) ? n : null
  }
  return null
}

async function openaiJson(apiKey, input, maxTokens = 2000) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      text: { format: { type: 'json_object' } },
      input,
      temperature: 0,
      max_output_tokens: maxTokens,
    }),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error?.message || `OpenAI error (${res.status})`)

  const outputText =
    json?.output_text ??
    json?.output?.map((o) => o?.content?.map((c) => c?.text).join('')).join('') ??
    ''
  
  if (!outputText || String(outputText).trim().length === 0) {
    throw new Error('OpenAI response vuota o invalida')
  }
  
  const jsonStr = pickJsonObject(String(outputText)) ?? String(outputText)
  
  if (!jsonStr || jsonStr.trim().length === 0) {
    throw new Error('Impossibile estrarre JSON dalla risposta OpenAI')
  }
  
  try {
    return JSON.parse(jsonStr)
  } catch (parseErr) {
    console.error('[openaiJson] JSON parse error:', { jsonStr: jsonStr.slice(0, 200), error: parseErr.message })
    throw new Error(`Errore parsing JSON: ${parseErr.message}. Output: ${String(jsonStr).slice(0, 100)}...`)
  }
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY mancante su Vercel (Production). Fai Redeploy.' }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Request body required' }, { status: 400 })
    }
    
    const imageDataUrl = body?.imageDataUrl
    if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUrl non valido' }, { status: 400 })
    }
    
    // Validazione dimensione (max 10MB quando decodificato)
    const base64Data = imageDataUrl.split(',')[1]
    if (base64Data && base64Data.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Immagine troppo grande (max 10MB)' }, { status: 400 })
    }

    const prompt = `
Sei un estrattore dati da screenshot di eFootball (schermata FORMAZIONE SQUADRA).
Questa è una schermata che mostra la formazione titolare di una squadra con 11 giocatori disposti sul campo.

Regole CRITICHE:
- Estrai SOLO ciò che vedi con certezza. Se un campo non è visibile: null.
- Non inventare.
- Rispondi SOLO con JSON valido.
- **IMPORTANTE**: Devi estrarre TUTTI gli 11 giocatori titolari con le loro posizioni precise nel campo.

Campi da estrarre:

formation: string (es: "4-2-1-3", "4-3-3", "4-4-2") - la formazione numerica
overall_strength: number (es: 3245) - la "Forza complessiva" se visibile
tactical_style: string (es: "Contrattacco", "Possesso palla") - lo stile tattico se visibile
team_name: string (es: "Corinthians S.C. Paulista") - nome squadra se visibile
manager_name: string (es: "Nome Manager") - nome manager/coach se visibile

players: array di 11 oggetti (TUTTI i giocatori titolari, nell'ordine in cui appaiono):
  [
    {
      "name": string (nome completo giocatore, es: "Vinícius Júnior"),
      "position": string (posizione abbreviata, es: "P", "SP", "TRQ", "MED", "CC", "TS", "DC", "PT"),
      "rating": number (rating complessivo, es: 105, 104, 103),
      "field_position": string (posizione nel campo: "goalkeeper" | "left_back" | "left_center_back" | "right_center_back" | "right_back" | "left_midfielder" | "center_midfielder" | "right_midfielder" | "left_forward" | "center_forward" | "right_forward"),
      "team_logo": string|null (nome squadra del giocatore se visibile, es: "Inter Milan", "FC Barcelona"),
      "nationality_flag": string|null (nazionalità se visibile da bandiera, es: "Brasile", "Olanda")
    },
    ... (altri 10 giocatori)
  ]

**ORDINE GIOCATORI**: Estrai i giocatori nell'ordine in cui appaiono sul campo:
1. Portiere (PT) - in basso
2. Difensori (da sinistra a destra: TS, DC, DC, TD)
3. Centrocampisti (da sinistra a destra)
4. Attaccanti (da sinistra a destra: P/ESA, SP/CLD, P/ESA)

substitutes: array di oggetti (sostituti se visibili nella sezione "Sostituti"):
  [
    {
      "name": string,
      "position": string,
      "rating": number|null
    }
  ]

reserves: array di oggetti (riserve se visibili nella sezione "Riserve"):
  [
    {
      "name": string,
      "position": string,
      "rating": number|null
    }
  ]

**MAPPATURA POSIZIONI CAMPO**:
- Portiere (PT) → "goalkeeper"
- Terzino Sinistro (TS) → "left_back"
- Difensore Centrale Sinistro → "left_center_back"
- Difensore Centrale Destro → "right_center_back"
- Terzino Destro (TD) → "right_back"
- Centrocampista Sinistro → "left_midfielder"
- Centrocampista Centrale → "center_midfielder"
- Centrocampista Destro → "right_midfielder"
- Ala Sinistra (P/ESA) → "left_forward"
- Attaccante Centrale (SP/CLD) → "center_forward"
- Ala Destra (P/ESA) → "right_forward"

**IMPORTANTE**: 
- Se vedi meno di 11 giocatori, indica solo quelli visibili
- Se vedi più di 11 giocatori, indica solo i titolari (quelli nel campo principale)
- La posizione "field_position" deve riflettere la posizione effettiva nel campo, non solo la posizione del giocatore
`

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
        text: { format: { type: 'json_object' } },
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
            ],
          },
        ],
        temperature: 0,
        max_output_tokens: 3000,
      }),
    })

    const openaiJson = await openaiRes.json().catch(() => null)
    if (!openaiRes.ok) {
      console.error('OpenAI error', { status: openaiRes.status, body: openaiJson })
      return NextResponse.json(
        {
          error: openaiJson?.error?.message || `OpenAI error (${openaiRes.status})`,
          openai_status: openaiRes.status,
          openai_body: truncate(openaiJson, 4000),
        },
        { status: 500 }
      )
    }

    const outputText =
      openaiJson?.output_text ??
      openaiJson?.output?.map((o) => o?.content?.map((c) => c?.text).join('')).join('') ??
      ''

    const jsonStr = pickJsonObject(String(outputText)) ?? String(outputText)
    let formationData
    try {
      formationData = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'Impossibile parse JSON da OpenAI', raw: truncate(outputText, 4000) }, { status: 500 })
    }

    // Normalizza i dati
    const normalized = {
      formation: typeof formationData?.formation === 'string' ? formationData.formation : null,
      overall_strength: toNumber(formationData?.overall_strength),
      tactical_style: typeof formationData?.tactical_style === 'string' ? formationData.tactical_style : null,
      team_name: typeof formationData?.team_name === 'string' ? formationData.team_name : null,
      manager_name: typeof formationData?.manager_name === 'string' ? formationData.manager_name : null,
      players: Array.isArray(formationData?.players) 
        ? formationData.players
            .filter(p => p && typeof p === 'object')
            .map(p => ({
              name: typeof p.name === 'string' ? p.name : null,
              position: typeof p.position === 'string' ? p.position : null,
              rating: toNumber(p.rating),
              field_position: typeof p.field_position === 'string' ? p.field_position : null,
              team_logo: typeof p.team_logo === 'string' ? p.team_logo : null,
              nationality_flag: typeof p.nationality_flag === 'string' ? p.nationality_flag : null,
            }))
            .slice(0, 11) // Max 11 giocatori
        : [],
      substitutes: Array.isArray(formationData?.substitutes)
        ? formationData.substitutes
            .filter(s => s && typeof s === 'object')
            .map(s => ({
              name: typeof s.name === 'string' ? s.name : null,
              position: typeof s.position === 'string' ? s.position : null,
              rating: toNumber(s.rating),
            }))
        : [],
      reserves: Array.isArray(formationData?.reserves)
        ? formationData.reserves
            .filter(r => r && typeof r === 'object')
            .map(r => ({
              name: typeof r.name === 'string' ? r.name : null,
              position: typeof r.position === 'string' ? r.position : null,
              rating: toNumber(r.rating),
            }))
        : [],
    }

    return NextResponse.json({ formation: normalized })
  } catch (err) {
    console.error('Server error /api/extract-formation:', err)
    return NextResponse.json({ error: err?.message || 'Errore server', details: truncate(err, 2000) }, { status: 500 })
  }
}
