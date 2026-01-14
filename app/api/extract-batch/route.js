import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function truncate(value, max = 2000) {
  const s = typeof value === 'string' ? value : JSON.stringify(value)
  if (s.length <= max) return s
  return s.slice(0, max) + '…(truncated)'
}

function pickJsonObject(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

function normName(name) {
  if (!name) return null
  return String(name).trim().toLowerCase()
}

async function openaiJson(apiKey, input, maxTokens = 500) {
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
  const jsonStr = pickJsonObject(String(outputText)) ?? String(outputText)
  return JSON.parse(jsonStr)
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY mancante' }, { status: 500 })

    const body = await req.json().catch(() => null)
    const images = Array.isArray(body?.images) ? body.images : []
    if (!images.length) return NextResponse.json({ error: 'images richieste' }, { status: 400 })

    // 1) Fingerprint minimo per raggruppare anche se miste
    const items = []
    for (const img of images.slice(0, 6)) {
      const id = String(img?.id || '')
      const imageDataUrl = img?.imageDataUrl
      if (!id || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) continue

      const prompt = `
Classifica questa immagine di eFootball.
Rispondi solo JSON:
{
 "player_name": string|null,
 "overall_rating": number|null,
 "position": string|null,
 "screen_type": "profile"|"skills"|"stats"|"boosters"|"unknown",
 "confidence": number
}`

      const out = await openaiJson(
        apiKey,
        [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
            ],
          },
        ],
        250
      )

      items.push({
        id,
        player_name: typeof out?.player_name === 'string' ? out.player_name : null,
        overall_rating: typeof out?.overall_rating === 'number' ? out.overall_rating : null,
        position: typeof out?.position === 'string' ? out.position : null,
        screen_type: typeof out?.screen_type === 'string' ? out.screen_type : 'unknown',
        confidence: typeof out?.confidence === 'number' ? out.confidence : 0.5,
      })
    }

    // 2) Raggruppa per nome (fallback su ovr/pos)
    const groupsMap = new Map()
    for (const it of items) {
      const key = normName(it.player_name) || `unknown-${it.overall_rating ?? 'x'}-${it.position ?? 'x'}`
      if (!groupsMap.has(key)) groupsMap.set(key, { label: it.player_name || 'Giocatore (non riconosciuto)', image_ids: [] })
      groupsMap.get(key).image_ids.push(it.id)
    }

    // 3) Estrazione completa per gruppo (1–3 immagini)
    const resultGroups = []
    let gi = 1
    for (const [, g] of groupsMap.entries()) {
      const groupImages = images.filter((im) => g.image_ids.includes(String(im?.id)))
      const content = [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `
Hai 1-3 immagini dello STESSO giocatore (ordine casuale, schermate diverse).
Fondi le informazioni. Se un campo non è visibile in nessuna immagine -> null (o [] per liste). Non inventare.
Rispondi JSON:
{ "player": { ... }, "missing_screens": string[], "notes": string[] }

Campi player:
player_name, overall_rating, position, role, card_type, team, region_or_nationality, form, preferred_foot,
height_cm, weight_kg, age, nationality, club_name,
level_current, level_cap, progression_points, matches_played, goals, assists,
boosters: [{name,effect}], skills: string[]
`,
            },
            ...groupImages.map((im) => ({ type: 'input_image', image_url: im.imageDataUrl, detail: 'high' })),
          ],
        },
      ]

      const out = await openaiJson(apiKey, content, 1400)
      resultGroups.push({
        group_id: `g${gi++}`,
        label: g.label,
        image_ids: g.image_ids,
        player: out?.player ?? out,
        missing_screens: Array.isArray(out?.missing_screens) ? out.missing_screens : [],
        notes: Array.isArray(out?.notes) ? out.notes : [],
      })
    }

    return NextResponse.json({ groups: resultGroups, items })
  } catch (e) {
    console.error('extract-batch error', e)
    return NextResponse.json({ error: e?.message || 'Errore server', details: truncate(e, 2000) }, { status: 500 })
  }
}

