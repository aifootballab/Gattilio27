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
Fondi TUTTE le informazioni da TUTTE le immagini. Se un campo non è visibile in nessuna immagine -> null (o [] per liste). Non inventare.

**IMPORTANTE - FUSIONE DATI**:
1. **Array (skills, com_skills, ai_playstyles, additional_positions, boosters)**: Unisci TUTTI gli elementi da TUTTE le immagini, rimuovi duplicati mantenendo l'ordine.
2. **Stats**: Se vedi una TABELLA con statistiche dettagliate (colonne "Attacco", "Difesa", "Forza" con valori numerici precisi), usa SOLO QUELLA. IGNORA completamente il radar chart (grafico esagonale TIR/DRI/PAS/FRZ/VEL/DIF) - non usare quei valori.
3. **Valori singoli**: Se un campo è presente in più immagini, usa il valore più completo/dettagliato.

**BOOSTERS**: Massimo 2 boosters (POTW card = 1, giocatori vecchi = 1-2). Se vedi più di 2, prendi i primi 2.

Rispondi JSON:
{ "player": { ... }, "missing_screens": string[], "notes": string[] }

Campi player:
player_name, overall_rating, position, role, playing_style, card_type, team, region_or_nationality, form, preferred_foot,
height_cm, weight_kg, age, nationality, club_name,
level_current, level_cap, progression_points, matches_played, goals, assists,

**STILE DI GIOCO (playing_style)**: Estrai lo stile di gioco del giocatore (es: "Ala prolifica", "Incontrista", "Collante", "Classico n°10", "Onnipresente", "Terzino offensivo", ecc.).
Questo è diverso da "role" (che può essere una descrizione più generica). Lo stile di gioco è un campo specifico visibile nello screenshot del profilo.
Se vedi "ESA Ala prolifica", estrai playing_style: "Ala prolifica" (senza il prefisso della posizione).

base_stats: {
  overall_rating: number,
  attacking: {
    offensive_awareness (o "Comportamento offensivo"),
    ball_control (o "Controllo palla"),
    dribbling,
    tight_possession (o "Possesso stretto"),
    low_pass (o "Passaggio rasoterra"),
    lofted_pass (o "Passaggio alto"),
    finishing (o "Finalizzazione"),
    heading (o "Colpo di testa"),
    place_kicking (o "Calci da fermo"),
    curl (o "Tiro a giro")
  },
  defending: {
    defensive_awareness (o "Comportamento difensivo"),
    defensive_engagement (o "Coinvolgimento difensivo"),
    tackling (o "Contrasto"),
    aggression (o "Aggressività"),
    goalkeeping (o "Comportamento PT"),
    gk_catching (o "Presa PT"),
    gk_parrying (o "Parata PT"),
    gk_reflexes (o "Riflessi PT"),
    gk_reach (o "Estensione PT")
  },
  athleticism: {
    speed (o "Velocità"),
    acceleration (o "Accelerazione"),
    kicking_power (o "Potenza di tiro"),
    jump (o "Salto"),
    physical_contact (o "Contatto fisico"),
    balance (o "Controllo corpo"),
    stamina (o "Resistenza")
  }
}

**NOTA SUL RADAR CHART**: Il radar chart (grafico esagonale) NON fornisce valori precisi. Usa SOLO la tabella dettagliata con valori numerici. Se vedi solo il radar chart e non la tabella, lascia base_stats con solo overall_rating (non estrarre valori dal radar chart).

skills: string[] (TUTTE le "Abilità giocatore" visibili - lista completa),
com_skills: string[] (TUTTE le "Abilità aggiuntive" o "Abilità complementari" visibili - lista completa),
ai_playstyles: string[] (TUTTI gli "Stili di gioco IA" visibili - lista completa),
additional_positions: string[] (TUTTE le posizioni aggiuntive/competenza posizione visibili - es: "CLD", "EDA"),

weak_foot_frequency (es: "Raramente", "Spesso"),
weak_foot_accuracy (es: "Alta", "Media", "Bassa"),
form_detailed (es: "Incrollabile", "Stabile", "B"),
injury_resistance (es: "Media", "Alta", "Bassa"),

boosters: [{name: string, effect: string, activation_condition: string}] (Massimo 2 boosters. Unisci da tutte le immagini, rimuovi duplicati, prendi i primi 2)

**Nazionalità**: Estrai da "Nazionalità/Regione" o da bandiere/emblemi visibili (es: bandiera Brasile → "Brasile").
`,
            },
            ...groupImages.map((im) => ({ type: 'input_image', image_url: im.imageDataUrl, detail: 'high' })),
          ],
        },
      ]

      const out = await openaiJson(apiKey, content, 3000)
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

