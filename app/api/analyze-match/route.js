import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry } from '../../../lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Verifica se una sezione ha dati
 */
function hasSectionData(matchData, section) {
  if (section === 'player_ratings') {
    return matchData.player_ratings && (
      (matchData.player_ratings.cliente && Object.keys(matchData.player_ratings.cliente).length > 0) ||
      (matchData.player_ratings.avversario && Object.keys(matchData.player_ratings.avversario).length > 0) ||
      (typeof matchData.player_ratings === 'object' && !matchData.player_ratings.cliente && !matchData.player_ratings.avversario && Object.keys(matchData.player_ratings).length > 0)
    )
  }
  if (section === 'team_stats') {
    return matchData.team_stats && Object.keys(matchData.team_stats).length > 0
  }
  if (section === 'attack_areas') {
    return matchData.attack_areas && Object.keys(matchData.attack_areas).length > 0
  }
  if (section === 'ball_recovery_zones') {
    return matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0
  }
  if (section === 'formation_style') {
    return matchData.formation_played || matchData.playing_style_played || matchData.team_strength
  }
  return false
}

/**
 * Calcola confidence score (0.0 - 1.0)
 * Ogni sezione completa = +20%
 */
function calculateConfidence(matchData) {
  let score = 0
  const sections = [
    'player_ratings',
    'team_stats', 
    'attack_areas',
    'ball_recovery_zones',
    'formation_style'
  ]
  
  sections.forEach(section => {
    if (hasSectionData(matchData, section)) {
      score += 20 // 20% per sezione
    }
  })
  
  return score / 100 // 0.0 - 1.0
}

/**
 * Identifica sezioni mancanti
 */
function getMissingSections(matchData) {
  const missing = []
  const sections = {
    'player_ratings': 'Pagelle Giocatori',
    'team_stats': 'Statistiche Squadra',
    'attack_areas': 'Aree di Attacco',
    'ball_recovery_zones': 'Aree di Recupero Palla',
    'formation_style': 'Formazione Avversaria'
  }
  
  Object.keys(sections).forEach(section => {
    if (!hasSectionData(matchData, section)) {
      missing.push(sections[section])
    }
  })
  
  return missing
}

/**
 * Genera prompt per analisi AI con conservative mode, personalizzazione e contesto completo
 */
function generateAnalysisPrompt(matchData, confidence, missingSections, userProfile = null, players = [], opponentFormation = null) {
  const hasResult = matchData.result && matchData.result !== 'N/A' && matchData.result !== null
  const missingText = missingSections.length > 0 
    ? `\n\n⚠️ DATI PARZIALI: Le seguenti sezioni non sono disponibili: ${missingSections.join(', ')}.`
    : ''
  
  const conservativeMode = confidence < 0.7
    ? `\n\n⚠️ MODALITÀ CONSERVATIVA: I dati disponibili sono limitati (${Math.round(confidence * 100)}% completezza). 
Sii CONSERVATIVO nelle conclusioni. Evita affermazioni categoriche. 
Indica chiaramente quando le tue analisi sono basate su dati limitati.
Suggerisci di caricare le foto mancanti per un'analisi più precisa.`
    : ''
  
  // Prepara dati disponibili per il prompt
  let availableDataText = ''
  
  if (matchData.player_ratings) {
    const ratingsCount = matchData.player_ratings.cliente 
      ? Object.keys(matchData.player_ratings.cliente).length 
      : (matchData.player_ratings.avversario 
        ? Object.keys(matchData.player_ratings.avversario).length 
        : Object.keys(matchData.player_ratings).length)
    availableDataText += `- Pagelle Giocatori: ${ratingsCount} giocatori con voti\n`
  } else {
    availableDataText += '- Pagelle Giocatori: Non disponibile\n'
  }
  
  if (matchData.team_stats) {
    const statsKeys = Object.keys(matchData.team_stats).filter(k => k !== 'result')
    availableDataText += `- Statistiche Squadra: ${statsKeys.length} statistiche disponibili\n`
  } else {
    availableDataText += '- Statistiche Squadra: Non disponibile\n'
  }
  
  if (matchData.attack_areas) {
    availableDataText += `- Aree di Attacco: Disponibili\n`
  } else {
    availableDataText += '- Aree di Attacco: Non disponibile\n'
  }
  
  if (matchData.ball_recovery_zones) {
    availableDataText += `- Zone Recupero: ${matchData.ball_recovery_zones.length} zone\n`
  } else {
    availableDataText += '- Zone Recupero: Non disponibile\n'
  }
  
  if (matchData.formation_played) {
    availableDataText += `- Formazione: ${matchData.formation_played}\n`
  } else {
    availableDataText += '- Formazione: Non disponibile\n'
  }
  
  if (matchData.playing_style_played) {
    availableDataText += `- Stile di Gioco: ${matchData.playing_style_played}\n`
  }
  
  // Costruisci contesto utente per personalizzazione
  let userContext = ''
  let personalizationInstructions = ''
  
  if (userProfile) {
    const userName = userProfile.first_name || null
    const teamName = userProfile.team_name || null
    const howToRemember = userProfile.how_to_remember || null
    const aiName = userProfile.ai_name || null
    
    if (userName || teamName || howToRemember) {
      userContext = `\nCONTESTO UTENTE:\n`
      if (userName) {
        userContext += `- Nome: ${userName}\n`
      }
      if (teamName) {
        userContext += `- Squadra: ${teamName}\n`
      }
      if (howToRemember) {
        userContext += `- Preferenze: ${howToRemember}\n`
      }
      if (aiName) {
        userContext += `- Nome IA: ${aiName}\n`
      }
      
      // Istruzioni personalizzazione
      personalizationInstructions = `\nISTRUZIONI PERSONALIZZAZIONE:
1. Rivolgiti direttamente a ${userName || 'l\'utente'} (usa "tu", "la tua squadra", "tuo")
2. ${teamName ? `Riferisciti alla squadra "${teamName}" quando parli della squadra del cliente. Identifica quale squadra è quella del cliente confrontando "${teamName}" con i nomi squadra nei dati.` : 'Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati.'}
3. ${howToRemember ? `Considera che ${howToRemember}. Adatta il tono e i suggerimenti di conseguenza.` : ''}
4. Sii incoraggiante ma costruttivo, focalizzato sul miglioramento
5. Usa un tono ${howToRemember?.includes('divertimento') ? 'amichevole e positivo' : 'professionale ma accessibile'}\n`
    }
  }
  
  // Costruisci sezione ROSA DISPONIBILE
  let rosterText = ''
  if (players && players.length > 0) {
    rosterText = `\nROSA DISPONIBILE (${players.length} giocatori):\n`
    players.slice(0, 30).forEach((player, idx) => { // Max 30 per non appesantire prompt
      const skills = player.skills && Array.isArray(player.skills) ? player.skills.slice(0, 3).join(', ') : ''
      const comSkills = player.com_skills && Array.isArray(player.com_skills) ? player.com_skills.slice(0, 2).join(', ') : ''
      const skillsText = skills || comSkills ? ` (Skills: ${skills || comSkills})` : ''
      rosterText += `${idx + 1}. ${player.player_name || 'N/A'} - ${player.position || 'N/A'} - Overall: ${player.overall_rating || 'N/A'}${skillsText}\n`
    })
    if (players.length > 30) {
      rosterText += `... e altri ${players.length - 30} giocatori\n`
    }
  } else {
    rosterText = `\nROSA DISPONIBILE: Non disponibile (nessun giocatore salvato nella rosa)\n`
  }
  
  // Costruisci sezione FORMAZIONE AVVERSARIA
  let opponentFormationText = ''
  if (opponentFormation) {
    opponentFormationText = `\nFORMAZIONE AVVERSARIA:\n`
    opponentFormationText += `- Nome: ${opponentFormation.formation_name || 'N/A'}\n`
    if (opponentFormation.overall_strength) {
      opponentFormationText += `- Forza Complessiva: ${opponentFormation.overall_strength}\n`
    }
    if (opponentFormation.tactical_style) {
      opponentFormationText += `- Stile Tattico: ${opponentFormation.tactical_style}\n`
    }
    if (opponentFormation.players && Array.isArray(opponentFormation.players)) {
      opponentFormationText += `- Giocatori: ${opponentFormation.players.length} giocatori rilevati\n`
    }
  } else {
    opponentFormationText = `\nFORMAZIONE AVVERSARIA: Non disponibile\n`
  }
  
  // Identifica squadra cliente
  const clientTeamName = userProfile?.team_name || matchData.client_team_name || null
  const clientTeamText = clientTeamName ? `\nSQUADRA CLIENTE: ${clientTeamName}\n` : `\nSQUADRA CLIENTE: Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati match.\n`
  
  const userName = userProfile?.first_name || null
  const greeting = userName ? ` per ${userName}` : ''
  
  return `Analizza i dati di questa partita di eFootball${greeting} e genera un riassunto motivazionale e decisionale dell'andamento.

${hasResult ? `RISULTATO: ${matchData.result}` : 'RISULTATO: Non disponibile'}

${userContext}${clientTeamText}${rosterText}${opponentFormationText}DATI MATCH DISPONIBILI:
${availableDataText}
${missingText}
${conservativeMode}${personalizationInstructions}
ISTRUZIONI PER L'ANALISI (COACH MOTIVAZIONALE):
1. Identifica chiaramente quale squadra è quella del cliente${clientTeamName ? ` (${clientTeamName})` : ''} e analizza le sue performance (non quelle dell'avversario)
2. Rispondi a queste domande intrinseche:
   a) Come è andato il match? (risultato, performance generale della squadra cliente)
   b) Quali giocatori hanno performato bene/male? (confronta pagelle con rosa disponibile, suggerisci alternative dalla rosa se necessario)
   c) Cosa ha funzionato contro questa formazione avversaria? (analisi tattica basata su formazione avversaria se disponibile)
   d) Cosa cambiare per migliorare? (suggerimenti concreti basati su dati, rosa e formazione avversaria)
   e) Quali giocatori della rosa potrebbero essere utili? (suggerimenti specifici basati su skills e overall dei giocatori disponibili)
3. Sii un coach motivazionale: incoraggiante ma costruttivo, focalizzato sul supporto decisionale
4. Incrocia i dati: usa rosa disponibile, formazione avversaria, statistiche per analisi coerente e contestuale
5. ${confidence < 0.5 ? '⚠️ ATTENZIONE: Dati molto limitati. Sottolinea chiaramente che l\'analisi è basata su informazioni parziali e che per suggerimenti più precisi servono più dati.' : ''}
6. ${missingSections.length > 0 ? `Alla fine, aggiungi una nota: "⚠️ Nota: Analisi basata su dati parziali (${Math.round(confidence * 100)}% completezza). Per suggerimenti più precisi, carica anche: ${missingSections.join(', ')}."` : ''}

7. Genera un riassunto in italiano (max 300 parole, breve ma completo)
8. Focus su: Decision Support System - cosa cambiare, non archivio dati
9. Formato: Testo continuo, naturale, in italiano, rivolto direttamente${userName ? ` a ${userName}` : ' all\'utente'} (usa "tu", "la tua squadra", "tuo")
10. ${conservativeMode ? 'SII CONSERVATIVO: Evita conclusioni categoriche con dati limitati. Indica quando le analisi sono basate su dati parziali.' : 'Puoi essere più specifico, hai dati completi.'}

Formato: Testo continuo, naturale, in italiano, motivazionale ma costruttivo.`
}

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

    const userId = userData.user.id

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/analyze-match']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/analyze-match',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
    }

    const { matchData } = await req.json()
    
    if (!matchData || typeof matchData !== 'object') {
      return NextResponse.json({ error: 'matchData is required' }, { status: 400 })
    }

    // Recupera dati contestuali per analisi completa (profilo, rosa, formazione avversaria)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let userProfile = null
    let players = []
    let opponentFormation = null
    
    if (serviceKey) {
      try {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })
        
        // 1. Recupera profilo utente
        const { data: profile, error: profileError } = await admin
          .from('user_profiles')
          .select('first_name, team_name, ai_name, how_to_remember')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (!profileError && profile) {
          userProfile = profile
        }
        
        // 2. Recupera rosa del cliente (per analisi contestuale)
        const { data: roster, error: rosterError } = await admin
          .from('players')
          .select('player_name, position, overall_rating, base_stats, skills, com_skills')
          .eq('user_id', userId)
          .order('overall_rating', { ascending: false })
          .limit(50) // Max 50 giocatori per evitare prompt troppo grande
        
        if (!rosterError && roster) {
          players = roster
        }
        
        // 3. Recupera formazione avversaria (se presente nel match)
        if (matchData.opponent_formation_id) {
          const { data: formation, error: formationError } = await admin
            .from('opponent_formations')
            .select('formation_name, players, overall_strength, tactical_style')
            .eq('id', matchData.opponent_formation_id)
            .single()
          
          if (!formationError && formation) {
            opponentFormation = formation
          }
        }
      } catch (err) {
        console.warn('[analyze-match] Error retrieving contextual data:', err)
        // Non bloccare analisi se errore recupero dati contestuali
      }
    }

    // Verifica che ci sia almeno una sezione con dati
    const confidence = calculateConfidence(matchData)
    if (confidence === 0) {
      return NextResponse.json({ 
        error: 'Almeno una sezione deve avere dati per generare l\'analisi' 
      }, { status: 400 })
    }

    const missingSections = getMissingSections(matchData)
    
    // Sanitizzazione prompt: limita lunghezza campi stringa
    const sanitizedMatchData = {
      result: matchData.result && typeof matchData.result === 'string' 
        ? matchData.result.substring(0, 50) // Max 50 caratteri per risultato
        : matchData.result,
      player_ratings: matchData.player_ratings,
      team_stats: matchData.team_stats,
      attack_areas: matchData.attack_areas,
      ball_recovery_zones: matchData.ball_recovery_zones,
      formation_played: matchData.formation_played && typeof matchData.formation_played === 'string'
        ? matchData.formation_played.substring(0, 100) // Max 100 caratteri
        : matchData.formation_played,
      playing_style_played: matchData.playing_style_played && typeof matchData.playing_style_played === 'string'
        ? matchData.playing_style_played.substring(0, 100) // Max 100 caratteri
        : matchData.playing_style_played,
      team_strength: matchData.team_strength
    }
    
    const prompt = generateAnalysisPrompt(sanitizedMatchData, confidence, missingSections, userProfile, players, opponentFormation)
    
    // Validazione dimensione prompt (max 50KB per sicurezza)
    const promptSize = prompt.length
    const MAX_PROMPT_SIZE = 50 * 1024 // 50KB
    if (promptSize > MAX_PROMPT_SIZE) {
      return NextResponse.json({ 
        error: 'Match data too large to analyze. Please reduce data size.' 
      }, { status: 413 })
    }

    // Chiama OpenAI
    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: confidence < 0.7 ? 0.5 : 0.7, // Più conservativo con dati parziali
      max_tokens: 500
    }

    const response = await callOpenAIWithRetry(apiKey, requestBody, 'analyze-match')
    const data = await response.json()
    
    const summary = data.choices?.[0]?.message?.content

    if (!summary) {
      return NextResponse.json({ error: 'Nessun riassunto generato' }, { status: 500 })
    }

    return NextResponse.json({
      summary,
      confidence: Math.round(confidence * 100), // 0-100
      missing_sections: missingSections,
      data_completeness: confidence === 1.0 ? 'complete' : 'partial'
    })
  } catch (err) {
    console.error('[analyze-match] Error:', err)
    
    let errorMessage = 'Errore durante la generazione dell\'analisi'
    let statusCode = 500
    
    if (err.type === 'rate_limit') {
      errorMessage = 'Quota OpenAI esaurita. Riprova tra qualche minuto.'
      statusCode = 429
    } else if (err.type === 'timeout') {
      errorMessage = 'Timeout durante la generazione. Riprova.'
      statusCode = 408
    } else if (err.message) {
      errorMessage = err.message
    }
    
    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
