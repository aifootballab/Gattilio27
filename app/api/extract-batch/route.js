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
  // Normalizza: lowercase, rimuovi punti, spazi multipli, caratteri speciali
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\./g, '')  // rimuovi punti
    .replace(/\s+/g, ' ')  // spazi multipli -> singolo spazio
    .replace(/[^\w\s]/g, '')  // rimuovi caratteri speciali (mantieni lettere, numeri, spazi)
    .trim()
}

// Funzione per raggruppare nomi simili (es: "frenkie de jong" = "f de jong" = "de jong")
function normalizePlayerKey(item) {
  const name = normName(item.player_name)
  if (name) {
    // Se il nome contiene più parole, prova anche solo l'ultima parte (cognome)
    const parts = name.split(' ').filter(p => p.length > 1)
    if (parts.length >= 2) {
      // Usa anche solo il cognome come fallback per matching
      return `${name}|${parts[parts.length - 1]}|${item.overall_rating ?? 'x'}-${item.position ?? 'x'}`
    }
    return `${name}|${item.overall_rating ?? 'x'}-${item.position ?? 'x'}`
  }
  return `unknown-${item.overall_rating ?? 'x'}-${item.position ?? 'x'}`
}

// Funzioni merge intelligenti per Smart Batch
function mergeIdentity(existing, newData) {
  if (!existing) return newData
  if (!newData) return existing
  
  // Se conflitto forte (nome diverso), preferisci quello con più dati
  const existingName = normName(existing.player_name)
  const newName = normName(newData.player_name)
  
  if (existingName && newName && existingName !== newName) {
    // Preferisci quello con più campi compilati
    const existingFields = Object.values(existing).filter(v => v !== null && v !== undefined).length
    const newFields = Object.values(newData).filter(v => v !== null && v !== undefined).length
    return newFields > existingFields ? newData : existing
  }
  
  // Merge: usa il più completo
  return {
    ...existing,
    ...newData,  // sovrascrive solo campi presenti
    overall_rating: newData.overall_rating || existing.overall_rating,
    position: newData.position || existing.position,
    player_name: newData.player_name || existing.player_name
  }
}

function mergeStats(existing, newData) {
  if (!existing) return newData
  if (!newData) return existing
  
  return {
    overall_rating: newData.overall_rating || existing.overall_rating,
    attacking: {
      ...(existing.attacking || {}),
      ...(newData.attacking || {})  // sovrascrive solo se presente
    },
    defending: {
      ...(existing.defending || {}),
      ...(newData.defending || {})
    },
    athleticism: {
      ...(existing.athleticism || {}),
      ...(newData.athleticism || {})
    }
  }
}

function dedupArray(arr) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  return arr.filter(item => {
    const key = String(item).toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeSkills(existing, newData) {
  if (!existing) return newData
  if (!newData) return existing
  
  return {
    skills: dedupArray([...(existing.skills || []), ...(newData.skills || [])]),
    com_skills: dedupArray([...(existing.com_skills || []), ...(newData.com_skills || [])]),
    ai_playstyles: dedupArray([...(existing.ai_playstyles || []), ...(newData.ai_playstyles || [])])
  }
}

function mergeBoosters(existing, newData) {
  if (!existing || !Array.isArray(existing)) return Array.isArray(newData) ? newData.slice(0, 2) : []
  if (!newData || !Array.isArray(newData)) return existing.slice(0, 2)
  
  // Merge con dedup basato su nome
  const merged = []
  const seen = new Set()
  
  for (const b of [...existing, ...newData]) {
    const name = String(b?.name || '').toLowerCase().trim()
    if (name && !seen.has(name)) {
      seen.add(name)
      merged.push(b)
    }
  }
  
  return merged.slice(0, 2)  // max 2
}

function calculateCompleteness(player) {
  const hasIdentity = !!(player.player_name && player.position)
  const hasStats = !!(player.base_stats && (
    Object.keys(player.base_stats.attacking || {}).length > 0 ||
    Object.keys(player.base_stats.defending || {}).length > 0 ||
    Object.keys(player.base_stats.athleticism || {}).length > 0
  ))
  const hasSkills = !!(
    (Array.isArray(player.skills) && player.skills.length > 0) ||
    (Array.isArray(player.com_skills) && player.com_skills.length > 0) ||
    (Array.isArray(player.ai_playstyles) && player.ai_playstyles.length > 0)
  )
  const hasBoosters = !!(Array.isArray(player.boosters) && player.boosters.length > 0)
  
  const percentage = Math.round(
    (hasIdentity ? 25 : 0) +
    (hasStats ? 25 : 0) +
    (hasSkills ? 25 : 0) +
    (hasBoosters ? 25 : 0)
  )
  
  return {
    identity: hasIdentity,
    stats: hasStats,
    skills: hasSkills,
    boosters: hasBoosters,
    percentage
  }
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

    // 2) Raggruppa per nome (con matching intelligente)
    const groupsMap = new Map()
    for (const it of items) {
      // Usa chiave normalizzata che include anche OVR e position per matching migliore
      const key = normalizePlayerKey(it)
      
      // Cerca gruppo esistente con nome simile o stesso OVR+position
      let foundGroup = null
      for (const [existingKey, group] of groupsMap.entries()) {
        const existingName = normName(group.label)
        const currentName = normName(it.player_name)
        
        // Match se: stesso nome normalizzato, O stesso OVR+position, O cognome match
        if (existingName && currentName) {
          const existingParts = existingName.split(' ').filter(p => p.length > 1)
          const currentParts = currentName.split(' ').filter(p => p.length > 1)
          
          // Match esatto o cognome match
          if (existingName === currentName || 
              (existingParts.length >= 2 && currentParts.length >= 2 && 
               existingParts[existingParts.length - 1] === currentParts[currentParts.length - 1] &&
               it.overall_rating && it.overall_rating === parseInt(existingKey.split('-').pop()))) {
            foundGroup = group
            break
          }
        }
        
        // Match per OVR+position se nome non disponibile
        if (!existingName && !currentName && key.includes(it.overall_rating ?? 'x') && key.includes(it.position ?? 'x')) {
          foundGroup = group
          break
        }
      }
      
      if (foundGroup) {
        foundGroup.image_ids.push(it.id)
        // Aggiorna label se abbiamo un nome migliore
        if (it.player_name && !foundGroup.label.includes(it.player_name)) {
          foundGroup.label = it.player_name
        }
      } else {
        groupsMap.set(key, { 
          label: it.player_name || 'Giocatore (non riconosciuto)', 
          image_ids: [it.id] 
        })
      }
    }

    // 3) Estrazione completa per gruppo con Smart Batch (processing sequenziale interno)
    const resultGroups = []
    let gi = 1
    for (const [, g] of groupsMap.entries()) {
      const groupImages = images.filter((im) => g.image_ids.includes(String(im?.id)))
      
      // Smart Batch: processing sequenziale interno con merge progressivo
      const sections = {
        identity: null,
        stats: null,
        skills: null,
        boosters: null,
        additional: {}  // altri campi (height, weight, etc.)
      }
      
      // Processa ogni immagine SEQUENZIALMENTE (una alla volta)
      for (const img of groupImages) {
        try {
          // Estrai dati da questa singola immagine
          const content = [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `
**IMPORTANTE**: Questa è una delle 1-3 immagini dello STESSO giocatore. Estrai TUTTE le informazioni visibili da QUESTA immagine.
Il sistema unirà automaticamente i dati da tutte le immagini, quindi estrai OGNI campo che vedi, anche se parziale.

**PRIORITÀ ESTRAZIONE**:
1. Se vedi una TABELLA con statistiche dettagliate (colonne "Attacco", "Difesa", "Forza" con valori numerici precisi per OGNI statistica), estrai TUTTI i valori dalla tabella.
2. IGNORA completamente il radar chart (grafico esagonale) - non fornisce valori precisi.
3. Estrai TUTTE le skills visibili (anche se solo alcune sono mostrate).
4. Estrai TUTTE le com_skills visibili.
5. Estrai TUTTI gli ai_playstyles visibili.
6. Estrai TUTTI i boosters visibili (max 2).
7. Estrai TUTTE le caratteristiche fisiche (altezza, peso, età) se visibili.
8. Estrai TUTTE le caratteristiche (piede preferito, resistenza infortuni, forma dettagliata) se visibili.

**REGOLA**: Se un campo è visibile anche parzialmente, estrailo. Se NON è visibile -> null (o [] per liste). NON inventare valori.

Rispondi JSON:
{ "player": { ... } }

Campi player (estrai SOLO ciò che vedi):
player_name, overall_rating, position, role, playing_style, card_type, team, region_or_nationality, form, preferred_foot,
height_cm, weight_kg, age, nationality, club_name,
level_current, level_cap, progression_points, matches_played, goals, assists,

base_stats: {
  overall_rating: number,
  attacking: { offensive_awareness, ball_control, dribbling, tight_possession, low_pass, lofted_pass, finishing, heading, place_kicking, curl },
  defending: { defensive_awareness, defensive_engagement, tackling, aggression, goalkeeping, gk_catching, gk_parrying, gk_reflexes, gk_reach },
  athleticism: { speed, acceleration, kicking_power, jump, physical_contact, balance, stamina }
}

skills: string[],
com_skills: string[],
ai_playstyles: string[],
additional_positions: string[],
boosters: [{name, effect, activation_condition}] (max 2),
weak_foot_frequency, weak_foot_accuracy, form_detailed, injury_resistance
`,
                },
                { type: 'input_image', image_url: img.imageDataUrl, detail: 'high' },
              ],
            },
          ]
          
          const extracted = await openaiJson(apiKey, content, 3000)
          const playerData = extracted?.player || extracted
          
          if (!playerData) continue
          
          // Merge progressivo per sezione
          // Identity
          if (playerData.player_name || playerData.position || playerData.overall_rating) {
            sections.identity = mergeIdentity(sections.identity, {
              player_name: playerData.player_name,
              position: playerData.position,
              overall_rating: playerData.overall_rating,
              role: playerData.role,
              playing_style: playerData.playing_style,
              card_type: playerData.card_type,
              team: playerData.team,
              nationality: playerData.nationality || playerData.region_or_nationality,
              club_name: playerData.club_name,
              form: playerData.form,
              preferred_foot: playerData.preferred_foot,
              age: playerData.age,
              height_cm: playerData.height_cm,
              weight_kg: playerData.weight_kg
            })
          }
          
          // Stats
          if (playerData.base_stats) {
            sections.stats = mergeStats(sections.stats, playerData.base_stats)
          }
          
          // Skills
          if (playerData.skills || playerData.com_skills || playerData.ai_playstyles) {
            sections.skills = mergeSkills(sections.skills, {
              skills: playerData.skills || [],
              com_skills: playerData.com_skills || [],
              ai_playstyles: playerData.ai_playstyles || []
            })
          }
          
          // Boosters
          if (playerData.boosters && Array.isArray(playerData.boosters)) {
            sections.boosters = mergeBoosters(sections.boosters, playerData.boosters)
          }
          
          // Additional fields
          if (playerData.additional_positions) {
            sections.additional.additional_positions = dedupArray([
              ...(sections.additional.additional_positions || []),
              ...(Array.isArray(playerData.additional_positions) ? playerData.additional_positions : [])
            ])
          }
          if (playerData.weak_foot_frequency) sections.additional.weak_foot_frequency = playerData.weak_foot_frequency
          if (playerData.weak_foot_accuracy) sections.additional.weak_foot_accuracy = playerData.weak_foot_accuracy
          if (playerData.form_detailed) sections.additional.form_detailed = playerData.form_detailed
          if (playerData.injury_resistance) sections.additional.injury_resistance = playerData.injury_resistance
          
        } catch (imgErr) {
          console.error(`[extract-batch] Error processing image ${img.id}:`, imgErr)
          // Continua con prossima immagine
        }
      }
      
      // Costruisci player finale da sezioni
      const finalPlayer = {
        ...(sections.identity || {}),
        base_stats: sections.stats || { overall_rating: sections.identity?.overall_rating || null },
        skills: sections.skills?.skills || [],
        com_skills: sections.skills?.com_skills || [],
        ai_playstyles: sections.skills?.ai_playstyles || [],
        additional_positions: sections.additional.additional_positions || [],
        boosters: sections.boosters || [],
        weak_foot_frequency: sections.additional.weak_foot_frequency || null,
        weak_foot_accuracy: sections.additional.weak_foot_accuracy || null,
        form_detailed: sections.additional.form_detailed || null,
        injury_resistance: sections.additional.injury_resistance || null
      }
      
      // Calcola completeness
      const completeness = calculateCompleteness(finalPlayer)
      
      resultGroups.push({
        group_id: `g${gi++}`,
        label: finalPlayer.player_name || g.label,
        image_ids: g.image_ids,
        player: finalPlayer,
        completeness: completeness,
        missing_screens: [],  // calcolato da completeness
        notes: []
      })
    }

    return NextResponse.json({ groups: resultGroups, items })
  } catch (e) {
    console.error('extract-batch error', e)
    return NextResponse.json({ error: e?.message || 'Errore server', details: truncate(e, 2000) }, { status: 500 })
  }
}

