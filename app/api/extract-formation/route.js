import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '../../../lib/openaiHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

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

    // Validazione dimensione immagine (max 10MB)
    // Solo per immagini base64 (data:image/), non per URL esterni
    if (imageDataUrl.startsWith('data:image/')) {
      const base64Image = imageDataUrl.split(',')[1]
      if (base64Image) {
        // Calcola dimensione approssimativa (base64 è ~33% più grande del binario)
        const imageSizeBytes = (base64Image.length * 3) / 4
        const maxSizeBytes = 10 * 1024 * 1024 // 10MB
        
        if (imageSizeBytes > maxSizeBytes) {
          return NextResponse.json(
            { error: 'Image size exceeds maximum allowed size (10MB). Please use a smaller image.' },
            { status: 400 }
          )
        }
      }
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

    // Chiama OpenAI Vision API con retry e timeout
    let formationData = null
    try {
      const requestBody = {
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
      }

      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, 'extract-formation')
      formationData = await parseOpenAIResponse(openaiRes, 'extract-formation')

      // Valida che ci siano 11 giocatori
      if (!formationData.players || !Array.isArray(formationData.players) || formationData.players.length !== 11) {
        console.warn(`[extract-formation] Expected 11 players, got ${formationData.players?.length || 0}`)
        // Non blocco, ma avverto
      }

      // Normalizza slot_index per essere sicuri che siano 0-10 e UNIVOCI
      // IMPORTANTE: Il constraint UNIQUE (user_id, slot_index) richiede slot_index univoci
      if (formationData.players && Array.isArray(formationData.players)) {
        const usedSlots = new Set()
        const maxSlots = 11 // 0-10
        
        formationData.players = formationData.players.map((player, index) => {
          let slotIndex = player.slot_index !== undefined 
            ? Math.max(0, Math.min(10, Number(player.slot_index))) 
            : index
          
          // Se slot già usato, trova primo slot disponibile
          if (usedSlots.has(slotIndex)) {
            // Cerca primo slot disponibile da 0 a 10
            for (let i = 0; i < maxSlots; i++) {
              if (!usedSlots.has(i)) {
                slotIndex = i
                break
              }
            }
            // Se tutti gli slot sono occupati, usa l'indice dell'array (non dovrebbe mai succedere con 11 giocatori)
            if (usedSlots.has(slotIndex)) {
              slotIndex = Math.min(index, 10)
            }
          }
          
          usedSlots.add(slotIndex)
          
          return {
            ...player,
            slot_index: slotIndex
          }
        })
      }
      
      // Validazione semantica formazione
      const validFormations = [
        '4-3-3', '4-4-2', '4-2-1-3', '4-1-2-3', '4-3-1-2', '4-2-3-1', '4-1-4-1',
        '3-4-3', '3-5-2', '3-4-1-2', '3-1-4-2',
        '5-3-2', '5-4-1',
        '4-5-1', '4-1-3-2',
        '3-3-2-2', '4-2-2-2'
      ]
      
      if (formationData.formation && typeof formationData.formation === 'string') {
        const formation = formationData.formation.trim()
        // Valida formato formazione (es. "4-3-3", non "5-5-5" o "999-999")
        const formationPattern = /^\d+-\d+(-\d+)?(-\d+)?$/
        if (!formationPattern.test(formation)) {
          console.warn(`[extract-formation] Invalid formation format: ${formation}`)
          formationData.formation = null // Rimuovi formazione non valida
        } else if (!validFormations.includes(formation)) {
          // Formazione non nella lista valida, ma formato corretto - avvisa ma non blocca
          console.warn(`[extract-formation] Formation "${formation}" not in valid list, but format is correct`)
        }
      }
      
      // Validazione giocatori nella formazione
      if (formationData.players && Array.isArray(formationData.players)) {
        formationData.players.forEach((player, index) => {
          // Validazione overall_rating per ogni giocatore
          if (player.overall_rating !== null && player.overall_rating !== undefined) {
            const rating = Number(player.overall_rating)
            if (isNaN(rating) || rating < 40 || rating > 100) {
              console.warn(`[extract-formation] Invalid rating for player ${index}: ${player.overall_rating}`)
              player.overall_rating = null // Rimuovi rating non valido
            }
          }
          
          // Validazione nome giocatore
          if (player.player_name && typeof player.player_name === 'string') {
            const name = player.player_name.trim()
            if (name.length < 2 || name.length > 100 || /[\x00-\x1F\x7F]/.test(name)) {
              console.warn(`[extract-formation] Invalid name for player ${index}: ${player.player_name}`)
              player.player_name = null // Rimuovi nome non valido
            }
          }
        })
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
