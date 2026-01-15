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

function normalizePlayer(p) {
  const boostersRaw = Array.isArray(p?.boosters) ? p.boosters : []
  const boosters = boostersRaw.slice(0, 4).map((b) => ({
    name: typeof b?.name === 'string' ? b.name : null,
    effect: typeof b?.effect === 'string' ? b.effect : null,
    activation_condition: typeof b?.activation_condition === 'string' ? b.activation_condition : null,
  }))

  const skills = Array.isArray(p?.skills) ? p.skills.filter((s) => typeof s === 'string').slice(0, 40) : []
  const comSkills = Array.isArray(p?.com_skills) ? p.com_skills.filter((s) => typeof s === 'string').slice(0, 20) : []
  const aiPlaystyles = Array.isArray(p?.ai_playstyles) ? p.ai_playstyles.filter((s) => typeof s === 'string').slice(0, 10) : []
  const additionalPositions = Array.isArray(p?.additional_positions) ? p.additional_positions.filter((s) => typeof s === 'string').slice(0, 10) : []

  // Normalizza base_stats se presente
  let baseStats = null
  if (p?.base_stats && typeof p.base_stats === 'object') {
    baseStats = {
      overall_rating: toNumber(p.base_stats.overall_rating) || toNumber(p?.overall_rating),
      attacking: p.base_stats.attacking && typeof p.base_stats.attacking === 'object' ? {
        offensive_awareness: toNumber(p.base_stats.attacking.offensive_awareness),
        ball_control: toNumber(p.base_stats.attacking.ball_control),
        dribbling: toNumber(p.base_stats.attacking.dribbling),
        tight_possession: toNumber(p.base_stats.attacking.tight_possession),
        low_pass: toNumber(p.base_stats.attacking.low_pass),
        lofted_pass: toNumber(p.base_stats.attacking.lofted_pass),
        finishing: toNumber(p.base_stats.attacking.finishing),
        heading: toNumber(p.base_stats.attacking.heading),
        place_kicking: toNumber(p.base_stats.attacking.place_kicking),
        curl: toNumber(p.base_stats.attacking.curl),
      } : null,
      defending: p.base_stats.defending && typeof p.base_stats.defending === 'object' ? {
        defensive_awareness: toNumber(p.base_stats.defending.defensive_awareness),
        defensive_engagement: toNumber(p.base_stats.defending.defensive_engagement),
        tackling: toNumber(p.base_stats.defending.tackling),
        aggression: toNumber(p.base_stats.defending.aggression),
        goalkeeping: toNumber(p.base_stats.defending.goalkeeping),
        gk_catching: toNumber(p.base_stats.defending.gk_catching),
        gk_parrying: toNumber(p.base_stats.defending.gk_parrying),
        gk_reflexes: toNumber(p.base_stats.defending.gk_reflexes),
        gk_reach: toNumber(p.base_stats.defending.gk_reach),
      } : null,
      athleticism: p.base_stats.athleticism && typeof p.base_stats.athleticism === 'object' ? {
        speed: toNumber(p.base_stats.athleticism.speed),
        acceleration: toNumber(p.base_stats.athleticism.acceleration),
        kicking_power: toNumber(p.base_stats.athleticism.kicking_power),
        jump: toNumber(p.base_stats.athleticism.jump),
        physical_contact: toNumber(p.base_stats.athleticism.physical_contact),
        balance: toNumber(p.base_stats.athleticism.balance),
        stamina: toNumber(p.base_stats.athleticism.stamina),
      } : null,
    }
    // Rimuovi chiavi null
    if (baseStats.attacking && Object.values(baseStats.attacking).every(v => v === null)) baseStats.attacking = null
    if (baseStats.defending && Object.values(baseStats.defending).every(v => v === null)) baseStats.defending = null
    if (baseStats.athleticism && Object.values(baseStats.athleticism).every(v => v === null)) baseStats.athleticism = null
  }

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
    base_stats: baseStats,
    skills,
    com_skills: comSkills,
    ai_playstyles: aiPlaystyles,
    additional_positions: additionalPositions,
    weak_foot_frequency: typeof p?.weak_foot_frequency === 'string' ? p.weak_foot_frequency : null,
    weak_foot_accuracy: typeof p?.weak_foot_accuracy === 'string' ? p.weak_foot_accuracy : null,
    form_detailed: typeof p?.form_detailed === 'string' ? p.form_detailed : null,
    injury_resistance: typeof p?.injury_resistance === 'string' ? p.injury_resistance : null,
    boosters,
  }
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY mancante su Vercel (Production). Fai Redeploy.' }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    const imageDataUrl = body?.imageDataUrl
    if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUrl non valido' }, { status: 400 })
    }

    const prompt = `
Sei un estrattore dati da screenshot di eFootball (profilo giocatore).
Regole CRITICHE:
- Estrai SOLO ciò che vedi con certezza. Se un campo non è visibile: null.
- Non inventare.
- Rispondi SOLO con JSON valido.
- **IMPORTANTE**: Se vedi un radar chart (grafico esagonale) con statistiche, estrai TUTTI i valori visibili (TIR, DRI, PAS, FRZ, DIF, VEL).

Campi base:
player_name, overall_rating, position, role, card_type, team, region_or_nationality, form, preferred_foot,
height_cm, weight_kg, age, nationality, club_name,
level_current, level_cap, progression_points, matches_played, goals, assists

Statistiche dal RADAR CHART (se presente):
Il radar chart mostra 6 statistiche principali:
- TIR (Tiro/Shooting) → mappa a: finishing, place_kicking, heading
- DRI (Dribbling) → mappa a: dribbling, ball_control, tight_possession
- PAS (Passing) → mappa a: low_pass, lofted_pass, offensive_awareness
- FRZ (Forza/Physical) → mappa a: physical_contact, balance, stamina
- DIF (Difesa/Defending) → mappa a: defensive_awareness, defensive_engagement, tackling, aggression
- VEL (Velocità/Speed) → mappa a: speed, acceleration

Se vedi il radar chart, estrai i valori numerici (0-99) per TIR, DRI, PAS, FRZ, DIF, VEL e inseriscili in base_stats.

Statistiche dettagliate (se visibili in tabelle/elenchi):
base_stats: {
  overall_rating: number,
  attacking: {
    offensive_awareness, ball_control, dribbling, tight_possession,
    low_pass, lofted_pass, finishing, heading, place_kicking, curl
  },
  defending: {
    defensive_awareness, defensive_engagement, tackling, aggression,
    goalkeeping, gk_catching, gk_parrying, gk_reflexes, gk_reach
  },
  athleticism: {
    speed, acceleration, kicking_power, jump, physical_contact, balance, stamina
  }
}

**MAPPATURA RADAR CHART → base_stats**:
- Se vedi solo il radar chart (TIR, DRI, PAS, FRZ, DIF, VEL):
  - TIR → attacking.finishing, attacking.place_kicking (stesso valore)
  - DRI → attacking.dribbling, attacking.ball_control (stesso valore)
  - PAS → attacking.low_pass, attacking.lofted_pass (stesso valore)
  - FRZ → athleticism.physical_contact
  - DIF → defending.defensive_awareness, defending.tackling (stesso valore)
  - VEL → athleticism.speed, athleticism.acceleration (stesso valore)
- Se vedi statistiche dettagliate, usa quelle invece del radar chart.

Abilità e caratteristiche:
skills: string[] (lista "Abilità giocatore" - tutte le abilità visibili),
com_skills: string[] (lista "Abilità aggiuntive" o "Abilità complementari" - se presente),
ai_playstyles: string[] (lista "Stili di gioco IA" - se presente),
additional_positions: string[] (posizioni aggiuntive/competenza posizione - se presente)

Caratteristiche:
weak_foot_frequency: string (es: "Raramente", "Spesso")
weak_foot_accuracy: string (es: "Alta", "Media", "Bassa")
form_detailed: string (es: "Incrollabile", "Stabile")
injury_resistance: string (es: "Media", "Alta", "Bassa")

Boosters:
boosters: [{name: string, effect: string, activation_condition: string}]

**Nazionalità**: Estrai da "Nazionalità/Regione" o da bandiere/emblemi visibili.
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
        max_output_tokens: 2500,
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
    let playerRaw
    try {
      playerRaw = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'Impossibile parse JSON da OpenAI', raw: truncate(outputText, 4000) }, { status: 500 })
    }

    const player = normalizePlayer(playerRaw)
    return NextResponse.json({ player })
  } catch (err) {
    console.error('Server error /api/extract-player:', err)
    return NextResponse.json({ error: err?.message || 'Errore server', details: truncate(err, 2000) }, { status: 500 })
  }
}

