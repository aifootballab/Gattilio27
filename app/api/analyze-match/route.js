import { NextResponse } from 'next/server'
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
 * Genera prompt per analisi AI con conservative mode
 */
function generateAnalysisPrompt(matchData, confidence, missingSections) {
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
  
  return `Analizza i dati di questa partita di eFootball e genera un riassunto dell'andamento.

${hasResult ? `RISULTATO: ${matchData.result}` : 'RISULTATO: Non disponibile'}

DATI DISPONIBILI:
${availableDataText}
${missingText}
${conservativeMode}

ISTRUZIONI PER IL RIASSUNTO:
1. Genera un riassunto in italiano (max 300 parole)
2. Focus su: Decision Support System - cosa cambiare, non archivio dati
3. Includi:
   - Analisi del risultato (se disponibile)
   - Performance chiave dei giocatori (se disponibili)
   - Statistiche significative (se disponibili)
   - Punti di forza e debolezze (basati sui dati disponibili)
   - Suggerimenti tattici concreti (cosa cambiare)
4. ${conservativeMode ? 'SII CONSERVATIVO: Evita conclusioni categoriche con dati limitati. Indica quando le analisi sono basate su dati parziali.' : 'Puoi essere più specifico, hai dati completi.'}
5. ${missingSections.length > 0 ? `Alla fine, aggiungi una nota: "⚠️ Nota: Analisi basata su dati parziali (${Math.round(confidence * 100)}% completezza). Per suggerimenti più precisi, carica anche: ${missingSections.join(', ')}."` : ''}

Formato: Testo continuo, naturale, in italiano.`
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
    
    const prompt = generateAnalysisPrompt(sanitizedMatchData, confidence, missingSections)
    
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
