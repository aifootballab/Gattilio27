import { NextResponse } from 'next/server'

type ExtractedPlayer = {
  player_name: string | null
  overall_rating: number | null
  position: string | null
  role: string | null
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  nationality: string | null
  club_name: string | null
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

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY mancante (server-only). Crea .env.local e riavvia.' },
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
- Estrai SOLO ciò che vedi con certezza. Se un campo non è visibile: null.
- Rispondi SOLO con un JSON valido (senza markdown) conforme a questo schema:
{
  "player_name": string|null,
  "overall_rating": number|null,
  "position": string|null,
  "role": string|null,
  "height_cm": number|null,
  "weight_kg": number|null,
  "age": number|null,
  "nationality": string|null,
  "club_name": string|null,
  "skills": string[]
}
`

    // NOTE: usiamo l'API Responses (server-side). Nessuna key nel browser.
    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl },
            ],
          },
        ],
        temperature: 0,
        max_output_tokens: 800,
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
    let player: ExtractedPlayer
    try {
      player = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: 'Impossibile parse JSON da OpenAI', raw: truncate(outputText, 4000) },
        { status: 500 }
      )
    }

    // normalizza skills
    if (!Array.isArray((player as any).skills)) {
      ;(player as any).skills = []
    }

    return NextResponse.json({ player })
  } catch (err: any) {
    console.error('Server error /api/extract-player:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore server', details: truncate(err, 2000) },
      { status: 500 }
    )
  }
}

