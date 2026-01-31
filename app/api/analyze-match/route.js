import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { callOpenAIWithRetry } from '../../../lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../lib/rateLimiter'
import { getRelevantSectionsForContext } from '../../../lib/ragHelper'
import { recordUsage } from '@/lib/creditService'

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
 * Normalizza struttura output per supportare formato bilingue e retrocompatibilità
 */
function normalizeBilingualStructure(summary, confidence, missingSections) {
  // Normalizza analysis
  if (summary.analysis) {
    if (typeof summary.analysis.match_overview === 'string') {
      summary.analysis.match_overview = { it: summary.analysis.match_overview, en: summary.analysis.match_overview }
    }
    if (typeof summary.analysis.result_analysis === 'string') {
      summary.analysis.result_analysis = { it: summary.analysis.result_analysis, en: summary.analysis.result_analysis }
    }
    if (Array.isArray(summary.analysis.key_highlights)) {
      summary.analysis.key_highlights = { it: summary.analysis.key_highlights, en: summary.analysis.key_highlights }
    }
    if (Array.isArray(summary.analysis.strengths)) {
      summary.analysis.strengths = { it: summary.analysis.strengths, en: summary.analysis.strengths }
    }
    if (Array.isArray(summary.analysis.weaknesses)) {
      summary.analysis.weaknesses = { it: summary.analysis.weaknesses, en: summary.analysis.weaknesses }
    }
  }
  
  // Normalizza tactical_analysis
  if (summary.tactical_analysis) {
    if (typeof summary.tactical_analysis.what_worked === 'string') {
      summary.tactical_analysis.what_worked = { it: summary.tactical_analysis.what_worked, en: summary.tactical_analysis.what_worked }
    }
    if (typeof summary.tactical_analysis.what_didnt_work === 'string') {
      summary.tactical_analysis.what_didnt_work = { it: summary.tactical_analysis.what_didnt_work, en: summary.tactical_analysis.what_didnt_work }
    }
    if (typeof summary.tactical_analysis.formation_effectiveness === 'string') {
      summary.tactical_analysis.formation_effectiveness = { it: summary.tactical_analysis.formation_effectiveness, en: summary.tactical_analysis.formation_effectiveness }
    }
    if (Array.isArray(summary.tactical_analysis.suggestions)) {
      summary.tactical_analysis.suggestions = summary.tactical_analysis.suggestions.map(s => {
        if (typeof s.suggestion === 'string') {
          s.suggestion = { it: s.suggestion, en: s.suggestion }
        }
        if (typeof s.reason === 'string') {
          s.reason = { it: s.reason, en: s.reason }
        }
        return s
      })
    }
  }
  
  // Normalizza player_performance
  if (summary.player_performance) {
    if (Array.isArray(summary.player_performance.top_performers)) {
      summary.player_performance.top_performers = summary.player_performance.top_performers.map(p => {
        if (typeof p.reason === 'string') {
          p.reason = { it: p.reason, en: p.reason }
        }
        return p
      })
    }
    if (Array.isArray(summary.player_performance.underperformers)) {
      summary.player_performance.underperformers = summary.player_performance.underperformers.map(p => {
        if (typeof p.reason === 'string') {
          p.reason = { it: p.reason, en: p.reason }
        }
        if (typeof p.suggested_replacement === 'string') {
          p.suggested_replacement = { it: p.suggested_replacement, en: p.suggested_replacement }
        }
        return p
      })
    }
    if (Array.isArray(summary.player_performance.suggestions)) {
      summary.player_performance.suggestions = summary.player_performance.suggestions.map(s => {
        if (typeof s.suggestion === 'string') {
          s.suggestion = { it: s.suggestion, en: s.suggestion }
        }
        if (typeof s.reason === 'string') {
          s.reason = { it: s.reason, en: s.reason }
        }
        return s
      })
    }
  }
  
  // Normalizza recommendations
  if (Array.isArray(summary.recommendations)) {
    summary.recommendations = summary.recommendations.map(r => {
      if (typeof r.title === 'string') {
        r.title = { it: r.title, en: r.title }
      }
      if (typeof r.description === 'string') {
        r.description = { it: r.description, en: r.description }
      }
      if (typeof r.reason === 'string') {
        r.reason = { it: r.reason, en: r.reason }
      }
      return r
    })
  }
  
  // Aggiungi historical_insights se mancante
  if (!summary.historical_insights) {
    summary.historical_insights = { it: '', en: '' }
  } else if (typeof summary.historical_insights === 'string') {
    summary.historical_insights = { it: summary.historical_insights, en: summary.historical_insights }
  }
  
  return summary
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
 * Analizza storico match per identificare pattern e formazioni che soffre
 */
function analyzeMatchHistory(matchHistory, currentOpponentFormationId) {
  const analysis = {
    totalMatches: matchHistory.length,
    formationsStruggled: {}, // Formazioni avversarie contro cui ha perso più spesso
    winRateByOpponentFormation: {},
    recurringIssues: [],
    recentTrend: 'stable' // 'improving' | 'declining' | 'stable'
  }
  
  if (matchHistory.length === 0) {
    return analysis
  }
  
  // Analizza formazioni avversarie
  const opponentFormationStats = {}
  matchHistory.forEach(match => {
    if (match.opponent_formation_id) {
      const formationId = match.opponent_formation_id
      if (!opponentFormationStats[formationId]) {
        opponentFormationStats[formationId] = { wins: 0, losses: 0, draws: 0, total: 0 }
      }
      opponentFormationStats[formationId].total++
      
      const result = match.result || ''
      if (result.includes('W') || result.includes('Vittoria') || result.includes('Win')) {
        opponentFormationStats[formationId].wins++
      } else if (result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')) {
        opponentFormationStats[formationId].losses++
      } else {
        opponentFormationStats[formationId].draws++
      }
    }
  })
  
  // Identifica formazioni che soffre (loss rate > 50%)
  Object.entries(opponentFormationStats).forEach(([formationId, stats]) => {
    const lossRate = stats.total > 0 ? (stats.losses / stats.total) * 100 : 0
    if (lossRate > 50 && stats.total >= 2) {
      analysis.formationsStruggled[formationId] = {
        lossRate: lossRate.toFixed(0),
        matches: stats.total,
        wins: stats.wins,
        losses: stats.losses
      }
    }
    
    // Win rate per formazione
    const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) : 0
    analysis.winRateByOpponentFormation[formationId] = {
      winRate: parseInt(winRate),
      matches: stats.total
    }
  })
  
  // Analizza trend recente (ultimi 10 match)
  const recentMatches = matchHistory.slice(0, 10)
  if (recentMatches.length > 0) {
    const recentWins = recentMatches.filter(m => {
      const result = m.result || ''
      return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
    }).length
    const recentWinRate = (recentWins / recentMatches.length) * 100
    
    const olderMatches = matchHistory.slice(10, 20)
    if (olderMatches.length > 0) {
      const olderWins = olderMatches.filter(m => {
        const result = m.result || ''
        return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
      }).length
      const olderWinRate = (olderWins / olderMatches.length) * 100
      
      if (recentWinRate > olderWinRate + 10) {
        analysis.recentTrend = 'improving'
      } else if (recentWinRate < olderWinRate - 10) {
        analysis.recentTrend = 'declining'
      }
    }
  }
  
  return analysis
}

/**
 * Genera prompt per analisi AI con conservative mode, personalizzazione e contesto completo (Enterprise)
 * @async
 */
async function generateAnalysisPrompt(matchData, confidence, missingSections, userProfile = null, players = [], opponentFormation = null, playersInMatch = [], matchHistory = [], tacticalPatterns = null, activeCoach = null, tacticalSettings = null) {
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
  
  // ✅ FIX: Determina se match è vecchio o nuovo (deve essere dichiarato prima dell'uso)
  // Identifica squadra cliente e avversario
  // Data implementazione campo is_home nel wizard (27 Gennaio 2026)
  const IS_HOME_IMPLEMENTATION_DATE = new Date('2026-01-27T00:00:00Z')
  
  // Determina se match è vecchio o nuovo (basato su timestamp)
  const matchDate = matchData.match_date 
    ? new Date(matchData.match_date) 
    : new Date()
  const isNewMatch = matchDate >= IS_HOME_IMPLEMENTATION_DATE
  
  // Prepara dati disponibili per il prompt - ✅ FIX: Include dati effettivi, non solo conteggi
  let availableDataText = ''
  
  // ✅ FIX: Includi dati effettivi player_ratings (nomi + voti)
  if (matchData.player_ratings) {
    const clienteRatings = matchData.player_ratings.cliente || {}
    const avversarioRatings = matchData.player_ratings.avversario || {}
    const allRatings = Object.keys(clienteRatings).length > 0 || Object.keys(avversarioRatings).length > 0
      ? null
      : matchData.player_ratings
    
    availableDataText += `\nPAGELLE GIOCATORI CLIENTE:\n`
    if (Object.keys(clienteRatings).length > 0) {
      Object.entries(clienteRatings).forEach(([name, data]) => {
        const rating = data.rating || data.rating_value || 'N/A'
        availableDataText += `- ${name}: Rating ${rating}\n`
      })
    } else if (allRatings) {
      Object.entries(allRatings).forEach(([name, data]) => {
        const rating = data.rating || data.rating_value || 'N/A'
        const team = data.team === 'cliente' ? ' (Cliente)' : data.team === 'avversario' ? ' (Avversario)' : ''
        availableDataText += `- ${name}: Rating ${rating}${team}\n`
      })
    } else {
      availableDataText += `- Nessun dato disponibile\n`
    }
    
    if (Object.keys(avversarioRatings).length > 0) {
      availableDataText += `\nPAGELLE GIOCATORI AVVERSARIO:\n`
      Object.entries(avversarioRatings).forEach(([name, data]) => {
        const rating = data.rating || data.rating_value || 'N/A'
        availableDataText += `- ${name}: Rating ${rating}\n`
      })
    }
    
    availableDataText += `\n⚠️ IMPORTANTE: Questi sono SOLO i VOTI (ratings) dei giocatori.\n`
    availableDataText += `- NON ci sono dati su goals, assists o minuti giocati per singolo giocatore.\n`
    availableDataText += `- NON ci sono dati su azioni specifiche: dribbling, passaggi, tiri, contrasti, recuperi, ecc.\n`
    availableDataText += `- NON analizziamo video: abbiamo SOLO il rating (voto numerico), NON dettagli su come ha giocato.\n`
    availableDataText += `- NON inventare o inferire goals/assists/azioni per giocatori specifici.\n`
    availableDataText += `- Se vedi "goals_scored: X" nelle statistiche squadra, questo è il TOTALE squadra, NON per giocatore.\n`
    availableDataText += `- Usa solo i dati forniti sopra. Se non vedi dati su goals/assists/azioni, NON menzionarli.\n`
    availableDataText += `- Esempi SBAGLIATI da evitare: "Neymar ha fatto dribbling", "Messi ha creato occasioni", "ha dominato con le sue azioni".\n`
    availableDataText += `- Esempi CORRETTI: "Neymar ha performato bene (rating 8.5)", "Messi ha avuto una buona performance (rating 8.5)".\n`
    availableDataText += `\n🎮 CONTESTO VIDEOGIOCO: I giocatori sono CARD DIGITALI di eFootball, non persone reali. NON parlare di "esperienza", "carriera", "crescita" dei giocatori. Le statistiche sono FISSE sulla card.\n`
  } else {
    availableDataText += '- Pagelle Giocatori: Non disponibile\n'
  }
  
  // ✅ FIX: Includi dati effettivi team_stats (valori)
  if (matchData.team_stats) {
    availableDataText += `\nSTATISTICHE SQUADRA CLIENTE:\n`
    Object.entries(matchData.team_stats).forEach(([key, value]) => {
      if (key !== 'result' && value != null) {
        availableDataText += `- ${key}: ${value}\n`
      }
    })
    
    availableDataText += `\n⚠️ IMPORTANTE: TUTTE le statistiche sono TOTALI SQUADRA, NON per giocatore.\n`
    availableDataText += `- "goals_scored" e "goals_conceded" = totali squadra, NON per giocatore\n`
    availableDataText += `- "shots", "passes", "tackles", ecc. = totali squadra, NON per giocatore\n`
    availableDataText += `- NON dire "Messi ha tirato X volte" da shots: 16 (è totale squadra)\n`
  } else {
    availableDataText += '- Statistiche Squadra: Non disponibile\n'
  }
  
  // ✅ FIX: Includi dati effettivi attack_areas (percentuali)
  if (matchData.attack_areas) {
    availableDataText += `\nAREE DI ATTACCO:\n`
    availableDataText += `⚠️ IMPORTANTE: Queste sono PERCENTUALI SQUADRA, NON per giocatore.\n`
    availableDataText += `- NON dire "Messi ha attaccato da sinistra" da left: 46% (è percentuale squadra)\n`
    
    // Determina quale team è cliente in base a is_home (se match nuovo) o assume team1 = cliente (match vecchio)
    const useIsHome = isNewMatch && matchData.is_home !== undefined && matchData.is_home !== null
    const clientTeam = useIsHome ? (matchData.is_home ? 'team1' : 'team2') : 'team1'
    const opponentTeam = useIsHome ? (matchData.is_home ? 'team2' : 'team1') : 'team2'
    
    if (matchData.attack_areas[clientTeam] || matchData.attack_areas.team1) {
      const clientData = matchData.attack_areas[clientTeam] || matchData.attack_areas.team1
      availableDataText += `Squadra Cliente:\n`
      availableDataText += `- Sinistra: ${clientData.left || 0}% (squadra)\n`
      availableDataText += `- Centro: ${clientData.center || 0}% (squadra)\n`
      availableDataText += `- Destra: ${clientData.right || 0}% (squadra)\n`
    }
    if (matchData.attack_areas[opponentTeam] || matchData.attack_areas.team2) {
      const opponentData = matchData.attack_areas[opponentTeam] || matchData.attack_areas.team2
      availableDataText += `Avversario:\n`
      availableDataText += `- Sinistra: ${opponentData.left || 0}% (squadra)\n`
      availableDataText += `- Centro: ${opponentData.center || 0}% (squadra)\n`
      availableDataText += `- Destra: ${opponentData.right || 0}% (squadra)\n`
    }
  } else {
    availableDataText += '- Aree di Attacco: Non disponibile\n'
  }
  
  // ✅ FIX: Includi dati effettivi ball_recovery_zones (coordinate)
  if (matchData.ball_recovery_zones && Array.isArray(matchData.ball_recovery_zones) && matchData.ball_recovery_zones.length > 0) {
    availableDataText += `\nZONE RECUPERO PALLA (${matchData.ball_recovery_zones.length} zone):\n`
    
    // Determina quale team è cliente in base a is_home (se match nuovo) o assume team1 = cliente (match vecchio)
    const useIsHome = isNewMatch && matchData.is_home !== undefined && matchData.is_home !== null
    const clientTeamLabel = useIsHome ? (matchData.is_home ? 'team1' : 'team2') : 'team1'
    
    matchData.ball_recovery_zones.slice(0, 10).forEach((zone, idx) => {
      let teamLabel = 'Avversario'
      if (zone.team === 'cliente') {
        teamLabel = 'Cliente'
      } else if (zone.team === clientTeamLabel || (zone.team === 'team1' && !useIsHome)) {
        teamLabel = 'Cliente'
      }
      const x = typeof zone.x === 'number' ? zone.x.toFixed(2) : zone.x || 'N/A'
      const y = typeof zone.y === 'number' ? zone.y.toFixed(2) : zone.y || 'N/A'
      availableDataText += `- Zona ${idx + 1}: ${teamLabel} (x: ${x}, y: ${y})\n`
    })
    if (matchData.ball_recovery_zones.length > 10) {
      availableDataText += `... e altre ${matchData.ball_recovery_zones.length - 10} zone\n`
    }
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
1. Rivolgiti direttamente a ${userName || `l'utente`} (usa "tu", "la tua squadra", "tuo")
2. ${teamName ? `Riferisciti alla squadra "${teamName}" quando parli della squadra del cliente. Identifica quale squadra è quella del cliente confrontando "${teamName}" con i nomi squadra nei dati.` : `Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati.`}
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
      
      // Verifica se dati sono verificati (per regole comunicazione)
      const isVerified = player.photo_slots && typeof player.photo_slots === 'object' && player.photo_slots.card === true
      const hasOriginalPositions = Array.isArray(player.original_positions) && player.original_positions.length > 0
      const verifiedMarker = isVerified && hasOriginalPositions ? ' ✅' : (isVerified ? ' ⚠️' : ' ❌')
      
      rosterText += `${idx + 1}. ${player.player_name || 'N/A'} - ${player.position || 'N/A'} - Overall: ${player.overall_rating || 'N/A'}${skillsText}${verifiedMarker}\n`
      
      // Se NON verificato, aggiungi warning discreto per IA
      if (!isVerified || !hasOriginalPositions) {
        rosterText += `  (⚠️ Dati posizione/overall non verificati - NON menzionare posizione specifica o overall al cliente)\n`
      }
      
      // Warning su skills/overall = caratteristiche, non performance match
      if (skillsText) {
        rosterText += `  (⚠️ Skills/Overall = caratteristiche giocatore, NON azioni/performance nel match - usa solo rating match)\n`
      }
    })
    if (players.length > 30) {
      rosterText += `... e altri ${players.length - 30} giocatori\n`
    }
  } else {
    rosterText = `\nROSA DISPONIBILE: Non disponibile (nessun giocatore salvato nella rosa)\n`
  }
  
  // Costruisci sezione DISPOSIZIONE REALE GIOCATORI
  let playersInMatchText = ''
  if (playersInMatch && playersInMatch.length > 0) {
    playersInMatchText = `\nDISPOSIZIONE REALE GIOCATORI IN CAMPO (${playersInMatch.length} giocatori):\n`
    playersInMatch.forEach((player, idx) => {
      const slotInfo = player.slot_index !== undefined ? `Slot ${player.slot_index}` : ''
      const matchStatus = player.match_status === 'matched' ? '✓' : player.match_status === 'not_found' ? '⚠️' : '⚠️'
      playersInMatchText += `${idx + 1}. ${matchStatus} ${player.name || 'N/A'} - ${player.position || 'N/A'} ${slotInfo} - Overall: ${player.overall_rating || 'N/A'}\n`
    })
    playersInMatchText += `\n⚠️ IMPORTANTE: I suggerimenti devono essere basati sulla DISPOSIZIONE REALE in campo, non sulla formazione salvata.\n`
    playersInMatchText += `- Analizza performance dei giocatori nella loro posizione reale\n`
    playersInMatchText += `- Suggerisci cambiamenti basati su posizioni reali (slot_index)\n`
    playersInMatchText += `- Considera se giocatori sono stati usati fuori posizione\n`
  } else {
    playersInMatchText = `\nDISPOSIZIONE REALE GIOCATORI: Non disponibile (formazione non caricata)\n`
    playersInMatchText += `⚠️ I suggerimenti saranno basati solo su pagelle e statistiche, non su disposizione reale.\n`
  }
  
  // Analizza storico match
  const historyAnalysis = analyzeMatchHistory(matchHistory, matchData.opponent_formation_id)
  
  // Costruisci sezione STORICO ANDAMENTO
  let historyAnalysisText = ''
  if (historyAnalysis && historyAnalysis.totalMatches > 0) {
    historyAnalysisText = `\nSTORICO ANDAMENTO CLIENTE (${historyAnalysis.totalMatches} partite analizzate):\n`
    
    // Formazioni che soffre
    const strugglingFormations = Object.keys(historyAnalysis.formationsStruggled)
    if (strugglingFormations.length > 0) {
      historyAnalysisText += `\n🚨 FORMAZIONI CHE SOFFRE DI PIÙ:\n`
      strugglingFormations.forEach(formationId => {
        const stats = historyAnalysis.formationsStruggled[formationId]
        historyAnalysisText += `- Formazione ID ${formationId}: Loss rate ${stats.lossRate}% (${stats.losses} sconfitte su ${stats.matches} match)\n`
      })
      historyAnalysisText += `\n⚠️ IMPORTANTE: Se la formazione avversaria di questa partita è simile a quelle che soffre, suggerisci contromisure specifiche.\n`
    }
    
    // Trend recente
    if (historyAnalysis.recentTrend === 'declining') {
      historyAnalysisText += `\n📉 TREND RECENTE: In calo (ultimi 10 match peggiori dei precedenti)\n`
      historyAnalysisText += `- Identifica problemi ricorrenti e suggerisci cambiamenti significativi\n`
    } else if (historyAnalysis.recentTrend === 'improving') {
      historyAnalysisText += `\n📈 TREND RECENTE: In miglioramento (ultimi 10 match migliori dei precedenti)\n`
      historyAnalysisText += `- Mantieni focus su cosa ha funzionato recentemente\n`
    }
    
    // Pattern ricorrenti (da tactical_patterns se disponibile)
    if (tacticalPatterns && tacticalPatterns.recurring_issues && Array.isArray(tacticalPatterns.recurring_issues)) {
      if (tacticalPatterns.recurring_issues.length > 0) {
        historyAnalysisText += `\n⚠️ PROBLEMI RICORRENTI IDENTIFICATI:\n`
        tacticalPatterns.recurring_issues.slice(0, 5).forEach(issue => {
          historyAnalysisText += `- ${issue.issue || issue}: Frequenza ${issue.frequency || 'alta'}, Severità ${issue.severity || 'media'}\n`
        })
        historyAnalysisText += `\n⚠️ IMPORTANTE: Considera questi problemi ricorrenti nei suggerimenti.\n`
      }
    }
  } else {
    historyAnalysisText = `\nSTORICO ANDAMENTO: Non disponibile (meno di 2 partite caricate)\n`
    historyAnalysisText += `⚠️ Più partite carichi, migliore sarà l'analisi del tuo andamento.\n`
  }
  
  // Costruisci sezione FORMAZIONE AVVERSARIA
  let opponentFormationText = ''
  if (opponentFormation) {
    opponentFormationText = `\nFORMAZIONE AVVERSARIA:\n`
    opponentFormationText += `- Nome: ${opponentFormation.formation_name || 'N/A'}\n`
    if (opponentFormation.playing_style) {
      opponentFormationText += `- Stile: ${opponentFormation.playing_style}\n`
    }
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
  
  // ✅ FIX: Costruisci sezione ALLENATORE con competenze numeriche e istruzioni esplicite
  let coachText = ''
  if (activeCoach) {
    coachText = `\nALLENATORE CLIENTE:\n`
    if (activeCoach.coach_name) {
      coachText += `- Nome: ${activeCoach.coach_name}\n`
    }
    
    if (activeCoach.playing_style_competence && typeof activeCoach.playing_style_competence === 'object') {
      coachText += `- Competenze Stili di Gioco (valori 0-100, più alto = più competente):\n`
      
      // Mappa nomi italiani per chiarezza
      const styleNames = {
        'possesso_palla': 'Possesso Palla',
        'contropiede_veloce': 'Contropiede Veloce',
        'contrattacco': 'Contrattacco',
        'vie_laterali': 'Vie Laterali',
        'passaggio_lungo': 'Passaggio Lungo'
      }
      
      const competences = []
      Object.entries(activeCoach.playing_style_competence).forEach(([style, value]) => {
        const styleName = styleNames[style] || style
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0
        competences.push({ style, styleName, value: numValue })
      })
      
      // Ordina per valore (dal più alto)
      competences.sort((a, b) => b.value - a.value)
      
      competences.forEach(({ styleName, value }) => {
        const level = value >= 80 ? '🔴 ALTA' : value >= 60 ? '🟡 MEDIA' : '⚪ BASSA'
        coachText += `  * ${styleName}: ${value} ${level}\n`
      })
      
      // Identifica stili alti e bassi
      const highCompetences = competences.filter(c => c.value >= 70).map(c => c.styleName)
      const lowCompetences = competences.filter(c => c.value < 50).map(c => c.styleName)
      
      coachText += `\n⚠️ REGOLE CRITICHE ALLENATORE:\n`
      if (highCompetences.length > 0) {
        coachText += `- Stili con competenza ALTA (>= 70): ${highCompetences.join(', ')}\n`
        coachText += `  → SUGGERISCI questi stili, sono quelli in cui l'allenatore è più competente\n`
      }
      if (lowCompetences.length > 0) {
        coachText += `- Stili con competenza BASSA (< 50): ${lowCompetences.join(', ')}\n`
        coachText += `  → NON SUGGERIRE questi stili, l'allenatore non è competente\n`
      }
      coachText += `- Se suggerisci un cambio stile, usa SOLO stili con competenza >= 70\n`
      coachText += `- Se l'allenatore ha competenza < 50 in uno stile, NON suggerirlo MAI\n`
    }
    
    if (activeCoach.stat_boosters && Array.isArray(activeCoach.stat_boosters) && activeCoach.stat_boosters.length > 0) {
      coachText += `- Stat Boosters: ${activeCoach.stat_boosters.length} boosters attivi\n`
      activeCoach.stat_boosters.slice(0, 3).forEach(booster => {
        const statName = booster.stat_name || booster.name || 'N/A'
        const bonus = booster.bonus || booster.value || 0
        coachText += `  * ${statName}: +${bonus}\n`
      })
    }
    
    if (activeCoach.connection && activeCoach.connection.name) {
      coachText += `- Connection: ${activeCoach.connection.name}\n`
    }
  } else {
    coachText = `\nALLENATORE CLIENTE: Non configurato\n`
    coachText += `⚠️ Nota: Senza allenatore configurato, i suggerimenti non considerano competenze specifiche.\n`
  }
  
  // Logica identificazione squadra cliente
  // ✅ FIX: clientTeamName deve essere dichiarato fuori dal blocco condizionale per essere disponibile nel template literal
  const clientTeamName = userProfile?.team_name || matchData.client_team_name || null
  
  let clientTeamText = ''
  if (isNewMatch && matchData.is_home !== undefined && matchData.is_home !== null) {
    // Match nuovo: usa logica is_home
    const isHome = matchData.is_home === true
    clientTeamText = isHome
      ? `\nSQUADRA CLIENTE: La PRIMA squadra (team1) nei dati è quella del CLIENTE (hai giocato in casa).\n`
      : `\nSQUADRA CLIENTE: La SECONDA squadra (team2) nei dati è quella del CLIENTE (hai giocato fuori casa).\n`
  } else {
    // Match vecchio: usa logica client_team_name (backward compatibility)
    clientTeamText = clientTeamName
      ? `\nSQUADRA CLIENTE: ${clientTeamName}\n`
      : `\nSQUADRA CLIENTE: Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati match.\n`
  }
  
  const opponentName = matchData.opponent_name && typeof matchData.opponent_name === 'string' ? String(matchData.opponent_name).trim() : null
  const opponentNameText = opponentName ? `\nAVVERSARIO: ${opponentName}\n` : ''

  const userName = userProfile?.first_name || null
  const greeting = userName ? ` per ${userName}` : ''
  
  // ✅ Conoscenza eFootball da RAG (info_rag) per analisi tattica – stesso sistema della chat
  let attilaMemorySection = ''
  try {
    const ragContent = getRelevantSectionsForContext('analyze-match', 12000)
    if (ragContent && ragContent.length > 0) {
      attilaMemorySection = `\n\n📌 MEMORIA ATTILA - eFootball (Conoscenza Tattica):\n${ragContent}\n\n`
    }
  } catch (ragError) {
    console.error('[analyze-match] Error loading RAG knowledge:', ragError)
  }

  return `Analizza i dati di questa partita di eFootball${greeting} e genera un riassunto motivazionale e decisionale dell'andamento.

${hasResult ? `RISULTATO: ${matchData.result}` : 'RISULTATO: Non disponibile'}

${userContext}${clientTeamText}${opponentNameText}${rosterText}${playersInMatchText}${opponentFormationText}${historyAnalysisText}DATI MATCH DISPONIBILI:
${availableDataText}
${missingText}
${attilaMemorySection}${conservativeMode}${personalizationInstructions}
⚠️ REGOLE CRITICHE - NON INVENTARE DATI (ASSOLUTO):
1. NON menzionare goals/assists per giocatori specifici a meno che non siano esplicitamente forniti nei dati sopra
2. Se vedi "goals_scored: X" nelle statistiche squadra, questo è il TOTALE squadra, NON per giocatore
3. Se vedi rating alto (es. 8.5), questo indica buona performance generale, NON necessariamente gol
4. Usa SOLO i dati forniti esplicitamente sopra. NON inferire o inventare dettagli
5. NON inventare azioni specifiche: dribbling, passaggi, tiri, contrasti, recuperi, ecc.
6. NON analizzare video o azioni: abbiamo SOLO il rating (voto), NON dettagli su come ha giocato
7. Se non vedi dati su goals/assists/azioni per giocatore, usa SOLO frasi generiche basate sul rating:
   - ✅ CORRETTO: "Neymar ha performato molto bene (rating 8.5)"
   - ✅ CORRETTO: "Neymar ha avuto una buona performance (rating 8.5)"
   - ❌ SBAGLIATO: "Neymar ha fatto un gol"
   - ❌ SBAGLIATO: "Neymar ha fatto dei dribbling"
   - ❌ SBAGLIATO: "Neymar ha creato occasioni con i suoi passaggi"
   - ❌ SBAGLIATO: "Neymar ha dominato con le sue azioni"
8. Se non sei sicuro, usa descrizioni generiche di performance invece di dettagli specifici
9. RICORDA: Abbiamo SOLO il RATING (voto numerico). NON abbiamo video, azioni, dribbling, passaggi, tiri, ecc.

⚠️ DISTINZIONI CRITICHE - CARATTERISTICHE vs PERFORMANCE:
1. **Skills/Com_Skills** = Caratteristiche del giocatore (es. "Dribbling", "Passing"), NON azioni nel match
   - ❌ SBAGLIATO: "Messi ha fatto dribbling perché ha skill Dribbling"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
2. **Overall Rating** = Caratteristica giocatore (es. 99), NON performance nel match
   - ❌ SBAGLIATO: "Messi ha giocato bene perché ha overall 99"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating match)
3. **Base Stats** (finishing, speed, ecc.) = Caratteristiche giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Messi ha segnato perché ha finishing 95"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
4. **Form** (A/B/C/D/E) = Forma generale giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Messi ha giocato bene perché è in forma A"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
5. **Boosters** = Bonus statistici, NON azioni effettuate
   - ❌ SBAGLIATO: "Messi ha corso veloce perché ha booster Speed"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
6. **Connection** = Bonus statistici, NON causa diretta performance
   - ❌ SBAGLIATO: "Messi ha giocato bene perché ha connection X"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
7. **Statistiche Squadra** (shots, passes, ecc.) = TOTALI squadra, NON per giocatore
   - ❌ SBAGLIATO: "Messi ha tirato 5 volte" (da shots: 16)
   - ✅ CORRETTO: "Squadra ha tirato 16 volte" (se menzioni, dì totale squadra)
8. **Attack Areas** (left/center/right %) = Percentuali squadra, NON per giocatore
   - ❌ SBAGLIATO: "Messi ha attaccato da sinistra" (da left: 46%)
   - ✅ CORRETTO: "Squadra ha attaccato 46% da sinistra" (se menzioni, dì squadra)
9. **Ball Recovery Zones** = Zone squadra, NON per giocatore
   - ❌ SBAGLIATO: "Messi ha recuperato palla in zona X"
   - ✅ CORRETTO: "Squadra ha recuperato palla in zona X" (se menzioni, dì squadra)

⚠️ NON INFERIRE CAUSE - DATI STORICI/STATISTICI ≠ CAUSE DIRETTE:
1. **Competenze Allenatore** = Competenze disponibili, NON stile usato nel match
   - ❌ SBAGLIATO: "Ha usato Contrattacco perché allenatore ha competenza 89"
   - ✅ CORRETTO: "Stile usato: Contrattacco" (se disponibile nei dati)
2. **Win Rate** = Statistica storica, NON causa vittoria
   - ❌ SBAGLIATO: "Ha vinto perché ha win rate 60%"
   - ✅ CORRETTO: "Ha vinto. Win rate storico: 60%" (se menzioni, dì che è storico)
3. **Performance Storiche** = Pattern storico, NON causa performance attuale
   - ❌ SBAGLIATO: "Ha giocato male perché ha sempre giocato male contro 4-3-3"
   - ✅ CORRETTO: "Rating attuale: 5.5. Storicamente ha rating medio 5.8 contro 4-3-3" (se menzioni, dì che è storico)
4. **Istruzioni Individuali** = Istruzioni configurate, NON azioni effettuate
   - ❌ SBAGLIATO: "Ha attaccato perché ha istruzione offensiva"
   - ✅ CORRETTO: "Ha istruzione offensiva configurata" (se menzioni, dì che è configurato)
5. **Formazione Avversaria** = Formazione avversaria, NON causa performance
   - ❌ SBAGLIATO: "Ha giocato bene perché ha sfruttato debolezze 4-3-3"
   - ✅ CORRETTO: "Formazione avversaria: 4-3-3. Performance: rating 8.5" (non inferire causa)
6. **Meta Formation** = Classificazione formazione, NON causa risultato
   - ❌ SBAGLIATO: "Ha perso perché avversario usa formazione meta"
   - ✅ CORRETTO: "Formazione avversaria: 4-3-3 (meta). Risultato: sconfitta" (non inferire causa)
7. **Pattern Ricorrenti** = Pattern identificato, NON causa diretta
   - ❌ SBAGLIATO: "Ha perso perché ha sempre problema X"
   - ✅ CORRETTO: "Pattern ricorrente: problema X. Risultato: sconfitta" (non inferire causa)
8. **Posizioni Originali** = Posizioni naturali giocatore, NON posizione nel match
   - ❌ SBAGLIATO: "Ha giocato in AMF perché è sua posizione originale"
   - ✅ CORRETTO: "Posizione originale: AMF. Posizione match: SP" (se diverse, menziona entrambe)
9. **Playing Style Giocatore** = Stile giocatore, NON stile squadra
   - ❌ SBAGLIATO: "Ha usato stile X perché giocatore ha playing style X"
   - ✅ CORRETTO: "Playing style giocatore: X. Team playing style: Y" (se diversi, menziona entrambi)

⚠️ REGOLE CRITICHE - POSIZIONI E OVERALL:
1. NON menzionare overall_rating se photo_slots è vuoto {} (dati non verificati)
2. NON menzionare posizione specifica se original_positions è vuoto [] (posizioni non estratte)
3. NON menzionare posizione se original_positions.length === 1 E photo_slots.card !== true (troppo incerto)
4. Se dati non verificati, usa generico: "Messi va bene in campo" (non "Messi va bene in SP")
5. Essere professionale: dire solo ciò che sai con certezza, non inventare

ISTRUZIONI PER L'ANALISI (COACH MOTIVAZIONALE - ENTERPRISE):
1. Identifica chiaramente quale squadra è quella del cliente${clientTeamName ? ` (${clientTeamName})` : ''} e analizza le sue performance (non quelle dell'avversario)

2. DISPOSIZIONE REALE GIOCATORI:
   a) Usa la DISPOSIZIONE REALE in campo (players_in_match) per analisi precisa
   b) Analizza performance dei giocatori nella loro posizione reale (slot_index)
   c) Identifica se giocatori sono stati usati fuori posizione e impatto sulle performance
   d) Suggerisci cambiamenti basati su posizioni reali, non su formazione salvata
   e) ⚠️ IMPORTANTE: Posizione originale ≠ posizione match. Se diverse, menziona entrambe ma non inferire causa
   f) ⚠️ NON dire "ha giocato male perché è fuori posizione" (usa solo rating: "rating 5.5 in SP, posizione originale: AMF")

3. STORICO ANDAMENTO:
   a) Se il cliente soffre contro formazioni simili a quella avversaria, evidenzia il problema
   b) Suggerisci contromisure specifiche basate su storico (se disponibile)
   c) Considera trend recente (miglioramento/declino) per suggerimenti contestuali
   d) Se ci sono problemi ricorrenti, suggerisci soluzioni concrete

4. Rispondi a queste domande intrinseche:
   a) Come è andato il match? (risultato, performance generale della squadra cliente)
   b) Quali giocatori hanno performato bene/male nella loro posizione reale? (confronta pagelle con disposizione reale e rosa disponibile)
     ⚠️ IMPORTANTE: Usa SOLO i voti (ratings) forniti sopra. NON menzionare goals/assists/azioni specifiche per giocatore.
     ⚠️ NON inventare dettagli: dribbling, passaggi, tiri, contrasti, recuperi, ecc. NON analizziamo video.
     ⚠️ Esempi CORRETTI: "Neymar ha performato bene (rating 8.5)", "Messi ha avuto una buona performance (rating 8.5)".
     ⚠️ Esempi SBAGLIATI: "Neymar ha fatto dribbling", "Messi ha creato occasioni", "ha dominato con le sue azioni".
   c) Cosa ha funzionato contro questa formazione avversaria?
   d) Cosa cambiare per migliorare?
     ⚠️ IMPORTANTE: Se suggerisci un cambio stile di gioco, usa SOLO stili in cui l'allenatore ha competenza >= 70.
     NON suggerire stili con competenza < 50, l'allenatore non è competente.
     Le competenze allenatore sono VINCOLANTI: non suggerire mai uno stile con competenza < 50; preferisci stili con competenza >= 70.
     ⚠️ NON inferire: competenze allenatore ≠ stile usato nel match. Suggerisci, non dire che lo userà.
   e) Quali giocatori della rosa potrebbero essere utili?

5. Sii un coach motivazionale: incoraggiante ma costruttivo, focalizzato sul supporto decisionale

6. Usa rosa disponibile, formazione avversaria, disposizione reale, statistiche, storico per analisi coerente e contestuale

7. ${confidence < 0.5 ? `⚠️ ATTENZIONE: Dati molto limitati. Sottolinea chiaramente che l'analisi è basata su informazioni parziali e che per suggerimenti più precisi servono più dati.` : ''}
8. ${missingSections.length > 0 ? `Alla fine, aggiungi una nota: "⚠️ Nota: Analisi basata su dati parziali (${Math.round(confidence * 100)}% completezza). Per suggerimenti più precisi, carica anche: ${missingSections.join(', ')}."` : ''}

9. Genera un riassunto in DOPPIA LINGUA (italiano e inglese) - max 300 parole per lingua, breve ma completo

10. Focus su: Decision Support System - cosa cambiare, non archivio dati

11. Formato OUTPUT JSON (bilingue):
{
  "analysis": {
    "match_overview": { "it": "...", "en": "..." },
    "result_analysis": { "it": "...", "en": "..." },
    "key_highlights": { "it": ["..."], "en": ["..."] },
    "strengths": { "it": ["..."], "en": ["..."] },
    "weaknesses": { "it": ["..."], "en": ["..."] }
  },
  "player_performance": {
    "top_performers": [{ "player_name": "...", "rating": 8.5, "reason": { "it": "...", "en": "..." }, "real_position": "SP", "slot_index": 8 }],
    "underperformers": [{ "player_name": "...", "rating": 5.5, "reason": { "it": "...", "en": "..." }, "real_position": "CMF", "slot_index": 5, "suggested_replacement": { "it": "...", "en": "..." } }],
    "suggestions": [{ "player_name": "...", "suggestion": { "it": "...", "en": "..." }, "reason": { "it": "...", "en": "..." }, "priority": "high", "real_position": "AMF", "slot_index": 6 }]
  },
  "tactical_analysis": {
    "what_worked": { "it": "...", "en": "..." },
    "what_didnt_work": { "it": "...", "en": "..." },
    "formation_effectiveness": { "it": "...", "en": "..." },
    "suggestions": [{ "suggestion": { "it": "...", "en": "..." }, "reason": { "it": "...", "en": "..." }, "priority": "high" }]
  },
  "recommendations": [{ "title": { "it": "...", "en": "..." }, "description": { "it": "...", "en": "..." }, "reason": { "it": "...", "en": "..." }, "priority": "high" }],
  "historical_insights": { "it": "...", "en": "..." },
  "confidence": 85,
  "data_quality": "high",
  "warnings": { "it": ["..."], "en": ["..."] }
}

⚠️ IMPORTANTE - CAMPO "reason":
- Il campo "reason" deve contenere solo una breve motivazione diretta (1-2 righe)
- NON spiegare ragionamenti tattici espliciti
- NON dire "perché" o "perché l'avversario ha X quindi Y"
- NON inventare azioni specifiche: dribbling, passaggi, tiri, contrasti, recuperi, ecc.
- NON analizzare video o azioni: abbiamo SOLO il rating (voto), NON dettagli su come ha giocato
- Dire solo il risultato basato sul rating: "Messi ha performato bene in SP (rating 8.5)" (non "Messi ha performato bene perché è in posizione originale SP e ha sfruttato la debolezza del DC")
- Esempi SBAGLIATI: "Neymar ha fatto dribbling", "Messi ha creato occasioni", "ha dominato con le sue azioni"
- Esempi CORRETTI: "Neymar ha performato bene (rating 8.5)", "Messi ha avuto una buona performance (rating 8.5)"
- Essere professionale, fermo, diretto

12. Formato: Testo continuo, naturale, in DOPPIA LINGUA, motivazionale ma costruttivo, rivolto direttamente${userName ? ` a ${userName}` : ` all'utente`} (usa "tu", "la tua squadra", "tuo" in italiano, "you", "your team", "your" in inglese)

13. ${conservativeMode ? 'SII CONSERVATIVO: Evita conclusioni categoriche con dati limitati. Indica quando le analisi sono basate su dati parziali.' : 'Puoi essere più specifico, hai dati completi.'}`
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

    // Parse request body con try-catch
    let matchData
    try {
      const body = await req.json()
      matchData = body.matchData
    } catch (parseError) {
      console.error('[analyze-match] Error parsing request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body. Please check your input.' }, { status: 400 })
    }
    
    if (!matchData || typeof matchData !== 'object') {
      return NextResponse.json({ error: 'matchData is required' }, { status: 400 })
    }

    // Validazione match ID se presente (deve essere UUID)
    if (matchData.id && typeof matchData.id === 'string') {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!UUID_REGEX.test(matchData.id)) {
        return NextResponse.json({ error: 'Invalid match ID format' }, { status: 400 })
      }
    }

    // Recupera dati contestuali per analisi completa (profilo, rosa, formazione avversaria, storico)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let userProfile = null
    let players = []
    let opponentFormation = null
    let playersInMatch = []
    let matchHistory = []
    let tacticalPatterns = null
    let activeCoach = null // ✅ FIX: Dichiarato fuori dal blocco per essere disponibile nello scope esterno
    let tacticalSettings = null // ✅ FIX: Necessario per team_playing_style
    
    // Recupera players_in_match da matchData (disposizione reale giocatori)
    if (matchData.players_in_match && Array.isArray(matchData.players_in_match)) {
      playersInMatch = matchData.players_in_match
    }
    
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
            .select('formation_name, players, overall_strength, tactical_style, playing_style')
            .eq('id', matchData.opponent_formation_id)
            .single()
          
          if (!formationError && formation) {
            opponentFormation = formation
          }
        }
        
        // 4. Recupera storico match (ultimi 30 per analisi andamento)
        const { data: history, error: historyError } = await admin
          .from('matches')
          .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, match_date')
          .eq('user_id', userId)
          .order('match_date', { ascending: false })
          .limit(30)
        
        if (!historyError && history) {
          matchHistory = history
        }
        
        // 5. Recupera impostazioni tattiche (per team_playing_style)
        const { data: settings, error: settingsError } = await admin
          .from('team_tactical_settings')
          .select('team_playing_style')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (!settingsError && settings) {
          tacticalSettings = settings
        }
        
        // 6. Recupera allenatore attivo (✅ FIX: Aggiunto recupero allenatore)
        const { data: coach, error: coachError } = await admin
          .from('coaches')
          .select('coach_name, playing_style_competence, stat_boosters, connection')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle()
        
        if (!coachError && coach) {
          activeCoach = coach // ✅ FIX: Assegna alla variabile dichiarata fuori dal blocco
        }
        
        // 7. Recupera pattern tattici (se disponibili)
        const { data: patterns, error: patternsError } = await admin
          .from('team_tactical_patterns')
          .select('formation_usage, playing_style_usage, recurring_issues')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (!patternsError && patterns) {
          tacticalPatterns = patterns
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
    // ✅ FIX: Includi match_date e is_home per determinare correttamente isNewMatch e identificare squadra cliente
    const sanitizedMatchData = {
      result: matchData.result && typeof matchData.result === 'string'
        ? matchData.result.substring(0, 50)
        : matchData.result,
      opponent_name: matchData.opponent_name && typeof matchData.opponent_name === 'string'
        ? matchData.opponent_name.substring(0, 255).trim()
        : null,
      client_team_name: matchData.client_team_name && typeof matchData.client_team_name === 'string'
        ? matchData.client_team_name.substring(0, 255).trim()
        : null,
      match_date: matchData.match_date || null, // ✅ FIX: Necessario per determinare isNewMatch
      is_home: typeof matchData.is_home === 'boolean' ? matchData.is_home : (matchData.is_home !== undefined ? matchData.is_home : null), // ✅ FIX: Necessario per identificare squadra cliente nei match nuovi
      player_ratings: matchData.player_ratings,
      team_stats: matchData.team_stats,
      attack_areas: matchData.attack_areas,
      ball_recovery_zones: matchData.ball_recovery_zones,
      formation_played: matchData.formation_played && typeof matchData.formation_played === 'string'
        ? matchData.formation_played.substring(0, 100)
        : matchData.formation_played,
      playing_style_played: matchData.playing_style_played && typeof matchData.playing_style_played === 'string'
        ? matchData.playing_style_played.substring(0, 100)
        : matchData.playing_style_played,
      team_strength: matchData.team_strength
    }
    
    // ✅ FIX: Passa activeCoach e tacticalSettings alla funzione generateAnalysisPrompt
    const prompt = await generateAnalysisPrompt(sanitizedMatchData, confidence, missingSections, userProfile, players, opponentFormation, playersInMatch, matchHistory, tacticalPatterns, activeCoach, tacticalSettings)
    
    // Validazione dimensione prompt (max 50KB per sicurezza)
    const promptSize = prompt.length
    const MAX_PROMPT_SIZE = 50 * 1024 // 50KB
    if (promptSize > MAX_PROMPT_SIZE) {
      return NextResponse.json({ 
        error: 'Match data too large to analyze. Please reduce data size.' 
      }, { status: 413 })
    }

    // Chiama OpenAI con formato JSON
    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: confidence < 0.7 ? 0.5 : 0.7, // Più conservativo con dati parziali
      max_tokens: 3000 // Aumentato per output bilingue completo (IT/EN)
    }

    // Chiama OpenAI con gestione errori corretta
    let response
    try {
      response = await callOpenAIWithRetry(apiKey, requestBody, 'analyze-match')
    } catch (openAIError) {
      console.error('[analyze-match] OpenAI error:', openAIError)
      
      // Gestisci errori specifici da callOpenAIWithRetry
      if (openAIError.type === 'rate_limit') {
        return NextResponse.json({ 
          error: 'Quota OpenAI esaurita. Riprova tra qualche minuto.' 
        }, { status: 429 })
      } else if (openAIError.type === 'timeout') {
        return NextResponse.json({ 
          error: 'Timeout durante la generazione. Riprova.' 
        }, { status: 408 })
      } else if (openAIError.type === 'network_error') {
        return NextResponse.json({ 
          error: 'Errore di connessione. Verifica la tua connessione e riprova.' 
        }, { status: 503 })
      }
      
      // Errore generico
      return NextResponse.json({ 
        error: openAIError.message || 'Errore durante la generazione dell\'analisi' 
      }, { status: 500 })
    }

    // Verifica che response sia valido e ok
    if (!response || !response.ok) {
      console.error('[analyze-match] Invalid or error response from OpenAI')
      try {
        const errorData = await response.json()
        return NextResponse.json({ 
          error: errorData.error?.message || 'Errore durante la generazione dell\'analisi' 
        }, { status: response?.status || 500 })
      } catch (e) {
        return NextResponse.json({ 
          error: 'Errore durante la generazione dell\'analisi' 
        }, { status: 500 })
      }
    }

    // Parse risposta JSON
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error('[analyze-match] Error parsing OpenAI response:', jsonError)
      return NextResponse.json({ error: 'Errore nel parsing della risposta' }, { status: 500 })
    }
    
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'Nessun riassunto generato' }, { status: 500 })
    }

    // Parse JSON response
    let structuredSummary
    try {
      structuredSummary = JSON.parse(content)
    } catch (parseError) {
      console.error('[analyze-match] JSON parse error:', parseError)
      // Fallback: se non è JSON valido, crea struttura base con testo
      structuredSummary = {
        analysis: {
          match_overview: { it: content.substring(0, 500), en: content.substring(0, 500) },
          result_analysis: { it: '', en: '' },
          key_highlights: { it: [], en: [] },
          strengths: { it: [], en: [] },
          weaknesses: { it: [], en: [] }
        },
        player_performance: {
          top_performers: [],
          underperformers: [],
          suggestions: []
        },
        tactical_analysis: {
          what_worked: { it: '', en: '' },
          what_didnt_work: { it: '', en: '' },
          formation_effectiveness: { it: '', en: '' },
          suggestions: []
        },
        recommendations: [],
        historical_insights: { it: '', en: '' },
        confidence: Math.round(confidence * 100),
        data_quality: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
        warnings: { 
          it: missingSections.length > 0 ? [`Analisi basata su dati parziali (${Math.round(confidence * 100)}% completezza). Per suggerimenti più precisi, carica anche: ${missingSections.join(', ')}.`] : [],
          en: missingSections.length > 0 ? [`Analysis based on partial data (${Math.round(confidence * 100)}% completeness). For more precise suggestions, also upload: ${missingSections.join(', ')}.`] : []
        }
      }
    }

    // Normalizza struttura per supportare formato bilingue e retrocompatibilità
    structuredSummary = normalizeBilingualStructure(structuredSummary, confidence, missingSections)

    // Valida struttura base
    if (!structuredSummary.analysis || !structuredSummary.player_performance || !structuredSummary.tactical_analysis) {
      return NextResponse.json({ error: 'Struttura riassunto non valida' }, { status: 500 })
    }

    // Assicura che confidence e data_quality siano coerenti
    structuredSummary.confidence = structuredSummary.confidence || Math.round(confidence * 100)
    structuredSummary.data_quality = structuredSummary.data_quality || (confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low')
    
    // Normalizza warnings (bilingue)
    if (!structuredSummary.warnings || typeof structuredSummary.warnings === 'string' || Array.isArray(structuredSummary.warnings)) {
      const warningsIt = Array.isArray(structuredSummary.warnings) 
        ? structuredSummary.warnings 
        : (typeof structuredSummary.warnings === 'string' ? [structuredSummary.warnings] : [])
      const warningsEn = warningsIt.map(w => {
        // Traduzione base (può essere migliorata)
        if (w.includes('dati parziali')) return w.replace('dati parziali', 'partial data').replace('completezza', 'completeness')
        return w
      })
      structuredSummary.warnings = { it: warningsIt, en: warningsEn }
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey && supabaseUrl) {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      await recordUsage(admin, userId, 4, 'analyze-match')
    }

    return NextResponse.json({
      summary: structuredSummary, // Ora è un oggetto strutturato
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
