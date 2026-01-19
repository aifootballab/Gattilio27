import { NextResponse } from 'next/server'

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

    // Prompt per estrazione formazione completa (11 giocatori)
    const prompt = `Analizza questo screenshot di eFootball che mostra una formazione completa con 11 giocatori sul campo.

IMPORTANTE:
- Identifica TUTTI gli 11 giocatori visibili sul campo (formazione completa)
- Per ogni giocatore, estrai: nome giocatore, posizione sul campo (slot_index 0-10), posizione giocatore (CF, MF, ecc.), overall rating, team, nationality (se visibile)
- Lo slot_index deve essere basato sulla posizione sul campo:
  * Portiere (PT): slot_index = 0
  * Difensori (DC, TS, TD): slot_index = 1-4 (da sinistra a destra)
  * Centrocampisti (MED, CC, CCB, TRQ, ESA): slot_index = 5-8 (da sinistra a destra)
  * Attaccanti (SP, CF, CLD, CLS): slot_index = 9-10 (da sinistra a destra)
- Estrai anche la formazione (es. "4-2-1-3", "4-3-3", ecc.) se visibile
- Se vedi il volto/faccia del giocatore nella card, indicane la descrizione visiva

Formato JSON richiesto:
{
  "formation": "4-2-1-3",
  "players": [
    {
      "player_name": "Nome Completo",
      "slot_index": 0,
      "position": "PT",
      "overall_rating": 95,
      "team": "Team Name",
      "nationality": "Country (se visibile)",
      "player_face_description": "Descrizione volto se visibile (colore pelle, capelli, caratteristiche distintive)"
    },
    // ... altri 10 giocatori
  ]
}

Restituisci SOLO JSON valido, senza altro testo. Assicurati che ci siano ESATTAMENTE 11 giocatori nell'array.`

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
        max_tokens: 4000 // Più token per 11 giocatori
      })
    })

    if (!openaiRes.ok) {
      const errorData = await openaiRes.json().catch(() => ({ error: 'OpenAI API error' }))
      console.error('[extract-formation] OpenAI API error:', errorData)
      return NextResponse.json(
        { error: `OpenAI API error: ${errorData.error?.message || 'Failed to extract formation'}` },
        { status: 500 }
      )
    }

    const openaiData = await openaiRes.json()

    // Estrai contenuto JSON dalla risposta
    let formationData = null
    try {
      const content = openaiData.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse JSON dal contenuto
      formationData = JSON.parse(content)

      // Valida che ci siano 11 giocatori
      if (!formationData.players || !Array.isArray(formationData.players) || formationData.players.length !== 11) {
        console.warn(`[extract-formation] Expected 11 players, got ${formationData.players?.length || 0}`)
        // Non blocco, ma avverto
      }

      // Normalizza slot_index per essere sicuri che siano 0-10
      if (formationData.players && Array.isArray(formationData.players)) {
        formationData.players = formationData.players.map((player, index) => ({
          ...player,
          slot_index: player.slot_index !== undefined ? Math.max(0, Math.min(10, player.slot_index)) : index
        }))
      }
    } catch (parseErr) {
      console.error('[extract-formation] JSON parse error:', parseErr)
      return NextResponse.json(
        { error: 'Failed to parse OpenAI response as JSON' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      formation: formationData.formation || null,
      slot_positions: formationData.slot_positions || {},
      players: formationData.players || [] // Opzionale, per preview
    })
  } catch (err) {
    console.error('[extract-formation] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Errore estrazione formazione' },
      { status: 500 }
    )
  }
}
