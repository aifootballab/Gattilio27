import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry, parseOpenAIResponse } from '../../../lib/openaiHelper'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validazione dimensione immagine (max 10MB)
function validateImageSize(imageDataUrl) {
  if (!imageDataUrl || typeof imageDataUrl !== 'string') return false
  
  if (imageDataUrl.startsWith('data:image/')) {
    const base64Image = imageDataUrl.split(',')[1]
    if (base64Image) {
      const imageSizeBytes = (base64Image.length * 3) / 4
      const maxSizeBytes = 10 * 1024 * 1024 // 10MB
      return imageSizeBytes <= maxSizeBytes
    }
  }
  return true // URL esterni o altri formati non validati qui
}

// Estrae dati da una singola immagine usando OpenAI Vision
async function extractImageData(apiKey, imageDataUrl, prompt, operationType) {
  if (!imageDataUrl) {
    return null // Foto mancante, ritorna null
  }

  // Validazione dimensione
  if (!validateImageSize(imageDataUrl)) {
    throw { type: 'image_too_large', message: 'Image size exceeds maximum allowed size (10MB). Please use a smaller image.' }
  }

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }
    ],
    max_tokens: 4000,
    temperature: 0.1
  }

  const response = await callOpenAIWithRetry(apiKey, requestBody, operationType)
  const extractedData = await parseOpenAIResponse(response, operationType)
  
  return extractedData
}

// Normalizza nome giocatore per matching
function normalizeName(name) {
  if (!name || typeof name !== 'string') return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuovi accenti
    .trim()
}

// Matching giocatori con rosa utente
async function matchPlayersToRoster(players, userId, supabaseUrl, anonKey) {
  if (!players || !Array.isArray(players)) return []

  // Carica rosa utente da Supabase
  const supabase = createClient(supabaseUrl, anonKey)
  
  const { data: roster, error } = await supabase
    .from('players')
    .select('id, player_name, age, position, overall_rating')
    .eq('user_id', userId)
    .order('player_name')

  if (error || !roster) {
    console.error('[extract-match-data] Error loading roster:', error)
    return players.map(p => ({
      ...p,
      matched_player_id: null,
      match_status: 'not_found'
    }))
  }

  // Match ogni giocatore
  return players.map(player => {
    const playerName = player.player_name || player.name
    if (!playerName) {
      return {
        ...player,
        matched_player_id: null,
        match_status: 'not_found'
      }
    }

    const normalizedPlayerName = normalizeName(playerName)

    // Match esatto
    let matched = roster.find(p => normalizeName(p.player_name) === normalizedPlayerName)

    // Match parziale (es. "Eto'o" vs "Samuel Eto'o")
    if (!matched) {
      matched = roster.find(p => {
        const normalizedRosterName = normalizeName(p.player_name)
        return normalizedRosterName.includes(normalizedPlayerName) ||
               normalizedPlayerName.includes(normalizedRosterName)
      })
    }

    // Match per posizione + rating simile (se disponibile)
    if (!matched && player.position && player.overall_rating) {
      matched = roster.find(p => 
        p.position === player.position &&
        Math.abs((p.overall_rating || 0) - (player.overall_rating || 0)) <= 5
      )
    }

    return {
      ...player,
      matched_player_id: matched?.id || null,
      match_status: matched ? 'matched' : 'not_found'
    }
  })
}

// Confronta formazione salvata vs giocata
async function compareFormations(playedFormation, playersInMatch, userId, supabaseUrl, anonKey) {
  const discrepancies = []

  // Carica formazione salvata
  const supabase = createClient(supabaseUrl, anonKey)
  
  const { data: savedFormation, error } = await supabase
    .from('formation_layout')
    .select('formation, slot_positions')
    .eq('user_id', userId)
    .single()

  if (error || !savedFormation) {
    return discrepancies // Nessuna formazione salvata, nessuna discrepanza
  }

  // Carica giocatori in formazione salvata
  const { data: savedPlayers } = await supabase
    .from('players')
    .select('id, player_name, slot_index')
    .eq('user_id', userId)
    .not('slot_index', 'is', null)

  // Confronta slot per slot
  for (let slotIndex = 0; slotIndex < 11; slotIndex++) {
    const playedPlayer = playersInMatch.find(p => p.slot_index === slotIndex)
    const savedPlayer = savedPlayers?.find(p => p.slot_index === slotIndex)

    if (savedPlayer && playedPlayer) {
      const savedName = normalizeName(savedPlayer.player_name)
      const playedName = normalizeName(playedPlayer.player_name || playedPlayer.name)

      if (savedName !== playedName) {
        discrepancies.push({
          slot_index: slotIndex,
          saved_player: savedPlayer.player_name,
          played_player: playedPlayer.player_name || playedPlayer.name,
          severity: 'high',
          impact: 'Giocatore diverso da quello in formazione salvata'
        })
      }
    } else if (savedPlayer && !playedPlayer) {
      discrepancies.push({
        slot_index: slotIndex,
        saved_player: savedPlayer.player_name,
        played_player: null,
        severity: 'medium',
        impact: 'Giocatore in formazione salvata non presente in partita'
      })
    } else if (!savedPlayer && playedPlayer) {
      discrepancies.push({
        slot_index: slotIndex,
        saved_player: null,
        played_player: playedPlayer.player_name || playedPlayer.name,
        severity: 'low',
        impact: 'Giocatore in partita non presente in formazione salvata'
      })
    }
  }

  // Confronta formazione (es. "4-3-3" vs "4-2-1-3")
  if (savedFormation.formation && playedFormation.formation) {
    if (savedFormation.formation !== playedFormation.formation) {
      discrepancies.push({
        type: 'formation',
        saved_formation: savedFormation.formation,
        played_formation: playedFormation.formation,
        severity: 'high',
        impact: 'Formazione giocata diversa da quella salvata'
      })
    }
  }

  return discrepancies
}

// Calcola metriche derivate da team_stats
function calculateDerivedMetrics(teamStats) {
  if (!teamStats || typeof teamStats !== 'object') return teamStats

  const derived = { ...teamStats }

  // Precisione passaggi
  if (derived.passes && derived.successful_passes) {
    derived.pass_accuracy = (derived.successful_passes / derived.passes) * 100
  }

  // Efficacia tiri
  if (derived.shots && derived.goals_scored) {
    derived.shot_accuracy = (derived.goals_scored / derived.shots) * 100
  }

  // Tiri in porta / tiri totali
  if (derived.shots && derived.shots_on_target) {
    derived.shots_on_target_ratio = (derived.shots_on_target / derived.shots) * 100
  }

  return derived
}

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Estrai immagini dal body
    // REGOLA: Ogni tipo può essere una singola foto (string) o un array di foto
    // "a volte per ogni sezione sono 2 a volte no" - supportiamo array per gestire più foto per sezione
    const requestBody = await req.json()
    
    // Normalizza: converte stringhe in array per gestire uniformemente
    const normalizePhotoInput = (photo) => {
      if (!photo) return []
      if (Array.isArray(photo)) return photo.filter(p => p) // Filtra valori null/undefined
      return [photo] // Singola foto diventa array con 1 elemento
    }
    
    const formationImages = normalizePhotoInput(requestBody.formation_image)
    const ratingsImages = normalizePhotoInput(requestBody.ratings_image)
    const teamStatsImages = normalizePhotoInput(requestBody.team_stats_image)
    const attackAreasImages = normalizePhotoInput(requestBody.attack_areas_image)
    const recoveryZonesImages = normalizePhotoInput(requestBody.recovery_zones_image)
    const goalsChartImages = normalizePhotoInput(requestBody.goals_chart_image)
    
    // Calcola numero totale di foto FISICHE caricate (non solo tipi)
    const totalPhotosUploaded = 
      formationImages.length +
      ratingsImages.length +
      teamStatsImages.length +
      attackAreasImages.length +
      recoveryZonesImages.length +
      goalsChartImages.length
    
    // Identifica sezioni mancanti (almeno 1 foto per tipo)
    const photosMissing = []
    if (formationImages.length === 0) photosMissing.push('formation_image')
    if (ratingsImages.length === 0) photosMissing.push('ratings_image')
    if (teamStatsImages.length === 0) photosMissing.push('team_stats_image')
    if (attackAreasImages.length === 0) photosMissing.push('attack_areas_image')
    if (recoveryZonesImages.length === 0) photosMissing.push('recovery_zones_image')
    if (goalsChartImages.length === 0) photosMissing.push('goals_chart_image')
    
    // photos_processed = numero totale di foto FISICHE processate
    const photosProcessed = totalPhotosUploaded
    const dataCompleteness = photosMissing.length === 0 ? 'complete' : 'partial'

    // Estrai dati da ogni immagine disponibile
    const extractedData = {}
    let formationData = null
    let ratingsData = null
    let teamStatsData = null
    let attackAreasData = null
    let recoveryZonesData = null
    let goalsEventsData = null

    // 1. Formazione (processa tutte le foto se array)
    if (formationImages.length > 0) {
      try {
        // Processa tutte le foto di formazione e unisci i risultati
        const formationResults = []
        for (const formationImage of formationImages) {
          const prompt = `Analizza questo screenshot di eFootball che mostra la formazione in campo con 11 giocatori.

IMPORTANTE:
- Identifica TUTTI gli 11 giocatori visibili sul campo
- Per ogni giocatore: nome, slot_index (0-10), posizione (PT, DC, CC, SP, ecc.), overall_rating, team, nationality (se visibile)
- Estrai anche la formazione (es. "4-3-3", "4-2-1-3")
- Estrai stile di gioco se visibile (es. "Possesso palla", "Contrattacco")

Formato JSON:
{
  "formation": "4-2-1-3",
  "playing_style": "Contrattacco",
  "players": [
    {
      "name": "Nome Giocatore",
      "slot_index": 0,
      "position": "PT",
      "overall_rating": 95,
      "team": "Team Name",
      "nationality": "Country"
    }
  ]
}

Restituisci SOLO JSON valido, senza altro testo.`
          
          const result = await extractImageData(apiKey, formationImage, prompt, 'extract-match-formation')
          if (result) formationResults.push(result)
        }
        
        // Unisci risultati: preferisci dati più completi (più giocatori, formazione presente)
        if (formationResults.length > 0) {
          formationData = formationResults.reduce((best, current) => {
            const bestPlayers = best?.players?.length || 0
            const currentPlayers = current?.players?.length || 0
            return currentPlayers > bestPlayers ? current : best
          }, formationResults[0])
          extractedData.formation = formationData
        }
      } catch (err) {
        console.error('[extract-match-data] Error extracting formation:', err)
        // Continua anche se formazione fallisce
      }
    }

    // 2. Pagelle (ratings) - processa tutte le foto se array
    if (ratingsImages.length > 0) {
      try {
        const ratingsResults = []
        for (const ratingsImage of ratingsImages) {
          const prompt = `Analizza questo screenshot di eFootball che mostra le pagelle/voti dei giocatori dopo la partita.

IMPORTANTE:
- Per ogni giocatore: nome, numero maglia, voto (rating), stella (se presente), gol, assist, minuti giocati
- Il voto può essere un numero decimale (es. 8.5, 6.0, 5.5)

Formato JSON:
{
  "ratings": {
    "Nome Giocatore": {
      "rating": 8.5,
      "jersey": 9,
      "star": true,
      "goals": 2,
      "assists": 1,
      "minutes_played": 90
    }
  }
}

Restituisci SOLO JSON valido, senza altro testo.`
          
          const result = await extractImageData(apiKey, ratingsImage, prompt, 'extract-match-ratings')
          if (result) ratingsResults.push(result)
        }
        
        // Unisci tutti i ratings da tutte le foto (merge oggetti)
        if (ratingsResults.length > 0) {
          ratingsData = ratingsResults.reduce((merged, current) => {
            return { ...merged, ...(current?.ratings || current) }
          }, {})
          extractedData.ratings = ratingsData
        }
      } catch (err) {
        console.error('[extract-match-data] Error extracting ratings:', err)
      }
    }

    // 3. Statistiche squadra - processa tutte le foto se array
    if (teamStatsImages.length > 0) {
      try {
        const teamStatsResults = []
        for (const teamStatsImage of teamStatsImages) {
          const prompt = `Analizza questo screenshot di eFootball che mostra le statistiche della squadra dopo la partita.

IMPORTANTE:
- Estrai TUTTE le statistiche visibili: possesso (%), tiri totali, tiri in porta, falli, fuorigioco, calci d'angolo, punizioni, passaggi, passaggi riusciti, cross, passaggi intercettati, contrasti, parate
- Gol segnati e gol subiti (se visibili nel risultato)

Formato JSON:
{
  "possession": 49,
  "shots": 16,
  "shots_on_target": 10,
  "fouls": 0,
  "offsides": 0,
  "corners": 2,
  "free_kicks": 0,
  "passes": 110,
  "successful_passes": 81,
  "crosses": 0,
  "interceptions": 29,
  "tackles": 4,
  "saves": 4,
  "goals_scored": 6,
  "goals_conceded": 1
}

Restituisci SOLO JSON valido, senza altro testo.`
          
          const result = await extractImageData(apiKey, teamStatsImage, prompt, 'extract-match-team-stats')
          if (result) teamStatsResults.push(result)
        }
        
        // Unisci statistiche (preferisci valori più completi)
        if (teamStatsResults.length > 0) {
          teamStatsData = teamStatsResults.reduce((best, current) => {
            const bestKeys = Object.keys(best || {}).length
            const currentKeys = Object.keys(current || {}).length
            return currentKeys > bestKeys ? current : best
          }, teamStatsResults[0])
          extractedData.team_stats = teamStatsData
        }
      } catch (err) {
        console.error('[extract-match-data] Error extracting team stats:', err)
      }
    }

    // 4. Aree di attacco - processa tutte le foto se array (può essere 2 foto per le 2 squadre)
    if (attackAreasImages.length > 0) {
      try {
        const attackAreasResults = []
        for (const attackAreasImage of attackAreasImages) {
          const prompt = `Analizza questo screenshot di eFootball che mostra le aree di attacco (percentuali sinistra/centro/destra).

IMPORTANTE:
- Estrai percentuali per zona: sinistra, centro, destra
- Le percentuali devono sommare ~100%

Formato JSON:
{
  "left": 46,
  "center": 45,
  "right": 9
}

Restituisci SOLO JSON valido, senza altro testo.`
          
          const result = await extractImageData(apiKey, attackAreasImage, prompt, 'extract-match-attack-areas')
          if (result) attackAreasResults.push(result)
        }
        
        // Unisci aree di attacco (se 2 foto = 2 squadre, altrimenti usa la prima)
        if (attackAreasResults.length > 0) {
          if (attackAreasResults.length === 2) {
            // 2 foto = probabilmente una per squadra, unisci in oggetto con team1/team2
            attackAreasData = {
              team1: attackAreasResults[0],
              team2: attackAreasResults[1],
              // Mantieni anche formato originale per compatibilità
              ...attackAreasResults[0]
            }
          } else {
            // 1 foto = dati combinati o solo una squadra
            attackAreasData = attackAreasResults[0]
          }
          extractedData.attack_areas = attackAreasData
        }
      } catch (err) {
        console.error('[extract-match-data] Error extracting attack areas:', err)
      }
    }

    // 5. Zone di recupero - processa tutte le foto se array (può essere 2 foto per le 2 squadre)
    if (recoveryZonesImages.length > 0) {
      try {
        const recoveryZonesResults = []
        for (const recoveryZonesImage of recoveryZonesImages) {
          const prompt = `Analizza questo screenshot di eFootball che mostra la mappa delle zone di recupero palla (punti verdi sul campo).

IMPORTANTE:
- Identifica distribuzione spaziale dei recuperi
- Estrai direzione d'attacco se visibile

Formato JSON:
{
  "zones": [
    { "x": 50, "y": 30, "intensity": 0.8 },
    { "x": 60, "y": 40, "intensity": 0.6 }
  ],
  "direction": "up"
}

Restituisci SOLO JSON valido, senza altro testo.`
          
          const result = await extractImageData(apiKey, recoveryZonesImage, prompt, 'extract-match-recovery-zones')
          if (result) recoveryZonesResults.push(result)
        }
        
        // Unisci zone di recupero (se 2 foto = 2 squadre, altrimenti usa la prima)
        if (recoveryZonesResults.length > 0) {
          if (recoveryZonesResults.length === 2) {
            // 2 foto = probabilmente una per squadra, unisci in array di zone
            recoveryZonesData = {
              zones: [
                ...(recoveryZonesResults[0]?.zones || []),
                ...(recoveryZonesResults[1]?.zones || [])
              ],
              // Mantieni direzione dalla prima
              direction: recoveryZonesResults[0]?.direction || 'up'
            }
          } else {
            // 1 foto = dati combinati o solo una squadra
            recoveryZonesData = recoveryZonesResults[0]
          }
          extractedData.recovery_zones = recoveryZonesData
        }
      } catch (err) {
        console.error('[extract-match-data] Error extracting recovery zones:', err)
      }
    }

    // 6. Grafico rete (eventi gol) - processa tutte le foto se array
    if (goalsChartImages.length > 0) {
      try {
        const goalsEventsResults = []
        for (const goalsChartImage of goalsChartImages) {
          const prompt = `Analizza questo screenshot di eFootball che mostra il grafico rete con eventi gol.

IMPORTANTE:
- Per ogni gol: minuto, marcatore (nome giocatore), assist (se presente), tipo gol (normale, rigore, autogol), squadra (propria o avversaria)

Formato JSON:
{
  "goals": [
    {
      "minute": 15,
      "scorer": "Alessandro Del Piero",
      "assist": "Eden Hazard",
      "type": "goal",
      "team": "own"
    }
  ]
}

Restituisci SOLO JSON valido, senza altro testo.`
          
          const result = await extractImageData(apiKey, goalsChartImage, prompt, 'extract-match-goals')
          if (result) goalsEventsResults.push(result)
        }
        
        // Unisci tutti gli eventi gol da tutte le foto
        if (goalsEventsResults.length > 0) {
          const allGoals = goalsEventsResults.flatMap(r => r?.goals || [])
          goalsEventsData = { goals: allGoals }
          extractedData.goals_events = goalsEventsData
        }
      } catch (err) {
        console.error('[extract-match-data] Error extracting goals events:', err)
      }
    }

    // Prepara dati strutturati
    const playersInMatch = formationData?.players || []
    const playerRatings = ratingsData?.ratings || {}
    
    // Matching giocatori con rosa utente (solo se ratings disponibili)
    let matchedPlayers = playersInMatch
    if (ratingsImages.length > 0 && playersInMatch.length > 0) {
      matchedPlayers = await matchPlayersToRoster(playersInMatch, userId, supabaseUrl, anonKey)
    }

    // Confronto formazione (solo se formation disponibile)
    let formationDiscrepancies = []
    if (formationImages.length > 0 && playersInMatch.length > 0) {
      formationDiscrepancies = await compareFormations(
        formationData,
        matchedPlayers,
        userId,
        supabaseUrl,
        anonKey
      )
    }

    // Calcola metriche derivate
    const teamStats = teamStatsData ? calculateDerivedMetrics(teamStatsData) : null

    // Prepara dati per salvataggio
    const matchData = {
      formation_played: formationData?.formation || null,
      players_in_match: matchedPlayers,
      player_ratings: playerRatings,
      team_stats: teamStats,
      attack_areas: attackAreasData || null,
      ball_recovery_zones: recoveryZonesData || null,
      goals_events: goalsEventsData?.goals || [],
      formation_discrepancies: formationDiscrepancies,
      extracted_data: extractedData,
      data_completeness: dataCompleteness,
      missing_photos: photosMissing,
      analysis_status: 'pending'
    }

    // Calcola credits usati (1 credit per foto FISICA processata - pay-per-use)
    // Se una sezione ha 2 foto, conta come 2 credits
    const creditsUsed = photosProcessed

    return NextResponse.json({
      success: true,
      match_data: matchData,
      photos_processed: photosProcessed,
      photos_missing: photosMissing,
      data_completeness: dataCompleteness,
      players_matched: matchedPlayers.filter(p => p.match_status === 'matched').length,
      players_not_found: matchedPlayers.filter(p => p.match_status === 'not_found').length,
      formation_discrepancies_count: formationDiscrepancies.length,
      credits_used: creditsUsed
    })

  } catch (error) {
    console.error('[extract-match-data] Error:', error)
    
    // Messaggi errore generici (sicurezza)
    if (error.type === 'rate_limit') {
      return NextResponse.json({ error: 'Rate limit reached. Please try again in a minute.' }, { status: 429 })
    }
    if (error.type === 'timeout') {
      return NextResponse.json({ error: 'Request took too long. Please try again with a smaller image or different image.' }, { status: 408 })
    }
    if (error.type === 'server_error') {
      return NextResponse.json({ error: 'Service temporarily unavailable. Please try again.' }, { status: 503 })
    }
    if (error.type === 'network_error') {
      return NextResponse.json({ error: 'Network error. Please check your connection and try again.' }, { status: 503 })
    }
    if (error.type === 'image_too_large') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Unable to extract data from images. Please try again with different images.' },
      { status: 500 }
    )
  }
}
