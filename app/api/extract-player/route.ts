import { NextResponse } from 'next/server'

type ExtractedPlayer = {
  player_name: string | null
  overall_rating: number | null
  position: string | null
  role: string | null
  card_type: string | null
  team: string | null
  region_or_nationality: string | null
  form: string | null
  preferred_foot: string | null
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  nationality: string | null
  club_name: string | null
  level_current: number | null
  level_cap: number | null
  progression_points: number | null
  matches_played: number | null
  goals: number | null
  assists: number | null
  boosters: { name: string | null; effect: string | null }[]
  skills: string[]
}

export const runtime = 'nodejs'

function pickJsonObject(text: string): string | null {
  // tenta di prendere il primo oggetto JSON dal testo
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

function truncate(value: any, max = 2000) {
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  if (s.length <= max) return s
  return s.slice(0, max) + '…(truncated)'
}

function toNumber(v: any): number | null {
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

function normalizePlayer(p: any): ExtractedPlayer {
  const boostersRaw = Array.isArray(p?.boosters) ? p.boosters : []
  const boosters = boostersRaw.slice(0, 4).map((b: any) => ({
    name: typeof b?.name === 'string' ? b.name : null,
    effect: typeof b?.effect === 'string' ? b.effect : null,
  }))

  const skills = Array.isArray(p?.skills) ? p.skills.filter((s: any) => typeof s === 'string').slice(0, 40) : []

  return {
    player_name: typeof p?.player_name === 'string' ? p.player_name : null,
    overall_rating: toNumber(p?.overall_rating),
    position: typeof p?.position === 'string' ? p.position : null,
    role: typeof p?.role === 'string' ? p.role : null,
    card_type: typeof p?.card_type === 'string' ? p.card_type : null,
    team: typeof p?.team === 'string' ? p.team : null,
    region_or_nationality: typeof p?.region_or_nationality === 'string' ? p.region_or_nationality : null,
    form: typeof p?.form === 'string' ? p.form : null,
    preferred_foot: typeof p?.preferred_foot === 'string' ? p.preferred_foot : null,
    height_cm: toNumber(p?.height_cm),
    weight_kg: toNumber(p?.weight_kg),
    age: toNumber(p?.age),
    nationality: typeof p?.nationality === 'string' ? p.nationality : null,
    club_name: typeof p?.club_name === 'string' ? p.club_name : null,
    level_current: toNumber(p?.level_current),
    level_cap: toNumber(p?.level_cap),
    progression_points: toNumber(p?.progression_points),
    matches_played: toNumber(p?.matches_played),
    goals: toNumber(p?.goals),
    assists: toNumber(p?.assists),
    boosters,
    skills,
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'OPENAI_API_KEY mancante su questo deployment Vercel. Aggiungila in Vercel → Settings → Environment Variables (Preview + Production) e fai Redeploy.',
        },
        { status: 500 }
      )
    }

    const body = await req.json().catch(() => null)
    const imageDataUrl = body?.imageDataUrl
    if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUrl non valido' }, { status: 400 })
    }

    const prompt = `
Sei un estrattore dati da screenshot di eFootball (profilo giocatore).

Regole:
- Estrai SOLO ciò che vedi con certezza. Se un campo non è visibile (anche perché coperto da popup): null.
- Non inventare mai.
- Rispondi SOLO con JSON valido (senza markdown, senza testo extra).

Campi da estrarre (se presenti nello screenshot):
- player_name (es. "Ronaldinho Gaúcho")
- overall_rating (numero grande tipo 99)
- position (sigla, es. "ESA", "CF", "CMF")
- role (es. "Ala prolifica")
- card_type (es. "Epico", "Standard")
- team (es. "FC Barcelona 05-06")
- region_or_nationality (se appare come "Nazionalità/Regione" o bandiera)
- club_name (se appare come club separato)
- form (es. "A", "B", "C"... se visibile)
- preferred_foot (es. "Destro" / "Sinistro" / null)
- height_cm, weight_kg, age
- level_current, level_cap (es. 31/31)
- progression_points (numero, se visibile)
- matches_played, goals, assists (se visibili)
- boosters: array di { name, effect } (se visibili nel popup)
- skills: array string (se visibili; altrimenti [])

Output JSON con queste chiavi esatte.
`

    // NOTE: usiamo l'API Responses (server-side). Nessuna key nel browser.
    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // più affidabile su screenshot complessi; puoi cambiare in futuro via env se vuoi
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
        // Responses API: il vecchio `response_format` è stato spostato qui
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
        max_output_tokens: 1200,
      }),
    })

    const openaiJson = await openaiRes.json().catch(() => null)
    if (!openaiRes.ok) {
      console.error('OpenAI error', {
        status: openaiRes.status,
        body: openaiJson,
      })
      return NextResponse.json(
        {
          error: openaiJson?.error?.message || `OpenAI error (${openaiRes.status})`,
          openai_status: openaiRes.status,
          openai_body: truncate(openaiJson, 4000),
        },
        { status: 500 }
      )
    }

    // Proviamo a ricostruire il testo output in modo robusto
    const outputText =
      openaiJson?.output_text ??
      openaiJson?.output?.map((o: any) => o?.content?.map((c: any) => c?.text).join('')).join('') ??
      ''

    const jsonStr = pickJsonObject(String(outputText)) ?? String(outputText)
    let playerRaw: any
    try {
      playerRaw = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: 'Impossibile parse JSON da OpenAI', raw: truncate(outputText, 4000) },
        { status: 500 }
      )
    }

    const player = normalizePlayer(playerRaw)
    return NextResponse.json({ player })
  } catch (err: any) {
    console.error('Server error /api/extract-player:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore server', details: truncate(err, 2000) },
      { status: 500 }
    )
  }
}

