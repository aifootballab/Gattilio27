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
 */
function generateAnalysisPrompt(matchData, confidence, missingSections, userProfile = null, players = [], opponentFormation = null, playersInMatch = [], matchHistory = [], tacticalPatterns = null) {
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
      rosterText += `${idx + 1}. ${player.player_name || 'N/A'} - ${player.position || 'N/A'} - Overall: ${player.overall_rating || 'N/A'}${skillsText}\n`
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
  
  // Identifica squadra cliente e avversario
  const clientTeamName = userProfile?.team_name || matchData.client_team_name || null
  const clientTeamText = clientTeamName ? `\nSQUADRA CLIENTE: ${clientTeamName}\n` : `\nSQUADRA CLIENTE: Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati match.\n`
  const opponentName = matchData.opponent_name && typeof matchData.opponent_name === 'string' ? String(matchData.opponent_name).trim() : null
  const opponentNameText = opponentName ? `\nAVVERSARIO: ${opponentName}\n` : ''

  const userName = userProfile?.first_name || null
  const greeting = userName ? ` per ${userName}` : ''
  
  return `Analizza i dati di questa partita di eFootball${greeting} e genera un riassunto motivazionale e decisionale dell'andamento.

${hasResult ? `RISULTATO: ${matchData.result}` : 'RISULTATO: Non disponibile'}

${userContext}${clientTeamText}${opponentNameText}${rosterText}${playersInMatchText}${opponentFormationText}${historyAnalysisText}DATI MATCH DISPONIBILI:
${availableDataText}
${missingText}
${conservativeMode}${personalizationInstructions}
ISTRUZIONI PER L'ANALISI (COACH MOTIVAZIONALE - ENTERPRISE):
1. Identifica chiaramente quale squadra è quella del cliente${clientTeamName ? ` (${clientTeamName})` : ''} e analizza le sue performance (non quelle dell'avversario)

2. DISPOSIZIONE REALE GIOCATORI:
   a) Usa la DISPOSIZIONE REALE in campo (players_in_match) per analisi precisa
   b) Analizza performance dei giocatori nella loro posizione reale (slot_index)
   c) Identifica se giocatori sono stati usati fuori posizione e impatto sulle performance
   d) Suggerisci cambiamenti basati su posizioni reali, non su formazione salvata

3. STORICO ANDAMENTO:
   a) Se il cliente soffre contro formazioni simili a quella avversaria, evidenzia il problema
   b) Suggerisci contromisure specifiche basate su storico (se disponibile)
   c) Considera trend recente (miglioramento/declino) per suggerimenti contestuali
   d) Se ci sono problemi ricorrenti, suggerisci soluzioni concrete

4. Rispondi a queste domande intrinseche:
   a) Come è andato il match? (risultato, performance generale della squadra cliente)
   b) Quali giocatori hanno performato bene/male nella loro posizione reale? (confronta pagelle con disposizione reale e rosa disponibile)
   c) Cosa ha funzionato contro questa formazione avversaria? (analisi tattica basata su formazione avversaria e storico)
   d) Cosa cambiare per migliorare? (suggerimenti concreti basati su dati, rosa, disposizione reale, storico)
   e) Quali giocatori della rosa potrebbero essere utili? (suggerimenti specifici basati su skills, overall, e posizioni reali)

5. Sii un coach motivazionale: incoraggiante ma costruttivo, focalizzato sul supporto decisionale

6. Incrocia i dati: usa rosa disponibile, formazione avversaria, disposizione reale, statistiche, storico per analisi coerente e contestuale

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

    // Recupera dati contestuali per analisi completa (profilo, rosa, formazione avversaria, storico)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let userProfile = null
    let players = []
    let opponentFormation = null
    let playersInMatch = []
    let matchHistory = []
    let tacticalPatterns = null
    
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
        
        // 5. Recupera pattern tattici (se disponibili)
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
    
    const prompt = generateAnalysisPrompt(sanitizedMatchData, confidence, missingSections, userProfile, players, opponentFormation, playersInMatch, matchHistory, tacticalPatterns)
    
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
