/**
 * Helper per generazione contromisure tattiche
 */

/**
 * Verifica se una posizione è tra quelle originali del giocatore
 * @param {string} currentPosition - Posizione attuale (es. "LWF")
 * @param {Array} originalPositions - Array di posizioni originali (es. [{"position": "AMF", "competence": "Alta"}, ...])
 * @returns {Object} - { isOriginal: boolean, competence: string | null }
 */
function isPositionOriginal(currentPosition, originalPositions) {
  if (!currentPosition || !Array.isArray(originalPositions) || originalPositions.length === 0) {
    return { isOriginal: false, competence: null }
  }
  
  const found = originalPositions.find(
    op => op.position && op.position.toUpperCase() === currentPosition.toUpperCase()
  )
  
  if (found) {
    return { 
      isOriginal: true, 
      competence: found.competence || "Alta" 
    }
  }
  
  return { isOriginal: false, competence: null }
}

/**
 * Identifica se formazione è meta
 */
export function identifyMetaFormation(formationName, playingStyle) {
  const metaFormations = ['4-3-3', '4-2-3-1', '5-2-3', '3-5-2']
  const metaStyles = ['quick_counter', 'contropiede_veloce']
  
  const isMetaFormation = formationName && metaFormations.some(meta => 
    formationName.includes(meta) || formationName === meta
  )
  
  const isMetaStyle = playingStyle && metaStyles.some(meta => 
    playingStyle.toLowerCase().includes(meta.replace('_', ' '))
  )
  
  return {
    isMeta: isMetaFormation || isMetaStyle,
    metaType: isMetaFormation ? formationName : (isMetaStyle ? 'quick_counter' : null),
    formationName,
    playingStyle
  }
}

/**
 * Genera prompt per contromisure GPT-5.2
 */
export function generateCountermeasuresPrompt(
  opponentFormation,
  clientRoster,
  clientFormation,
  tacticalSettings,
  activeCoach,
  matchHistory,
  tacticalPatterns,
  playerPerformance
) {
  const metaInfo = identifyMetaFormation(
    opponentFormation.formation_name,
    opponentFormation.playing_style
  )
  
  // Costruisci sezione formazione avversaria
  // Leggi da campi separati (con fallback su extracted_data per retrocompatibilità)
  const overallStrength = opponentFormation.overall_strength || opponentFormation.extracted_data?.overall_strength
  const players = opponentFormation.players || opponentFormation.extracted_data?.players || []
  const tacticalStyle = opponentFormation.tactical_style || opponentFormation.extracted_data?.tactical_style
  
  let opponentText = `FORMazione AVVERSARIA:\n`
  opponentText += `- Formazione: ${opponentFormation.formation_name || 'N/A'}\n`
  opponentText += `- Stile: ${opponentFormation.playing_style || 'N/A'}\n`
  if (tacticalStyle) {
    opponentText += `- Stile Tattico: ${tacticalStyle}\n`
  }
  if (overallStrength) {
    opponentText += `- Forza: ${overallStrength}\n`
  }
  if (Array.isArray(players) && players.length > 0) {
    opponentText += `- Giocatori: ${players.length} giocatori rilevati\n`
  }
  
  if (metaInfo.isMeta) {
    opponentText += `\n⚠️ FORMAZIONE META IDENTIFICATA: ${metaInfo.metaType || opponentFormation.formation_name}\n`
    opponentText += `Questa è una formazione meta comune. Applica contromisure specifiche basate su best practices community.\n`
  }

  // Titolari/riserve da playerPerformance (route passa titolari/riserve). Definire prima dell'uso.
  const titolari = playerPerformance?.titolari || []
  const riserve = playerPerformance?.riserve || []
  const hasTitolariRiserve = Array.isArray(titolari) && Array.isArray(riserve)
  
  // Costruisci sezione rosa cliente: se abbiamo titolari/riserve espliciti, usali (audit contromisure)
  let rosterText = ''
  if (hasTitolariRiserve) {
    rosterText = `\nTITOLARI (in campo, ${titolari.length}):\n`
    titolari.forEach((p, idx) => {
      const currentPosition = p.position // Posizione attuale (adattata allo slot)
      const originalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
        ? p.original_positions
        : (p.position ? [{ position: p.position, competence: "Alta" }] : [])
      
      // Verifica se posizione attuale è tra quelle originali
      const positionCheck = isPositionOriginal(currentPosition, originalPositions)
      const isOriginalPosition = positionCheck.isOriginal
      
      const slot = p.slot_index != null ? ` slot ${p.slot_index}` : ''
      const sk = (p.skills && Array.isArray(p.skills) ? p.skills.slice(0, 2).join(', ') : '') || (p.com_skills && Array.isArray(p.com_skills) ? p.com_skills.slice(0, 1).join(', ') : '')
      const skillsPart = sk ? ` (${sk})` : ''
      
      // DISCRETO: Mostra solo info base, NON dire esplicitamente "ATTENZIONE" nel prompt
      rosterText += `- [${p.id}] ${p.player_name || 'N/A'} - ${currentPosition || 'N/A'} - Overall ${p.overall_rating || 'N/A'}${skillsPart}${slot}\n`
      
      // Solo se NON è originale, aggiungi info discreta (per analisi IA, NON per cliente)
      if (!isOriginalPosition && originalPositions.length > 0) {
        const originalPosList = originalPositions.map(op => op.position).join(', ')
        // Info discreta per IA (non mostrare esplicitamente "ATTENZIONE")
        rosterText += `  (Posizioni originali: ${originalPosList})\n`
      }
    })
    rosterText += `\nRISERVE (panchina, ${riserve.length}):\n`
    riserve.slice(0, 30).forEach((p, idx) => {
      const sk = (p.skills && Array.isArray(p.skills) ? p.skills.slice(0, 2).join(', ') : '') || (p.com_skills && Array.isArray(p.com_skills) ? p.com_skills.slice(0, 1).join(', ') : '')
      const skillsPart = sk ? ` (${sk})` : ''
      rosterText += `- [${p.id}] ${p.player_name || 'N/A'} - ${p.position || 'N/A'} - Overall ${p.overall_rating || 'N/A'}${skillsPart}\n`
    })
    if (riserve.length > 30) rosterText += `... e altri ${riserve.length - 30} riserve\n`
  }
  if (!rosterText) {
    rosterText = `\nROSA CLIENTE (${clientRoster.length} giocatori):\n`
    clientRoster.slice(0, 50).forEach((player, idx) => {
      const skills = player.skills && Array.isArray(player.skills) ? player.skills.slice(0, 3).join(', ') : ''
      const comSkills = player.com_skills && Array.isArray(player.com_skills) ? player.com_skills.slice(0, 2).join(', ') : ''
      const skillsText = skills || comSkills ? ` (Skills: ${skills || comSkills})` : ''
      rosterText += `${idx + 1}. ${player.player_name || 'N/A'} - ${player.position || 'N/A'} - Overall: ${player.overall_rating || 'N/A'}${skillsText}\n`
    })
    if (clientRoster.length > 50) rosterText += `... e altri ${clientRoster.length - 50} giocatori\n`
  }

  // Costruisci sezione formazione cliente
  let formationText = `\nFORMazione CLIENTE ATTUALE:\n`
  if (clientFormation) {
    formationText += `- Formazione: ${clientFormation.formation || 'N/A'}\n`
    if (hasTitolariRiserve && titolari.length > 0) {
      formationText += `- Titolari: ${titolari.length} giocatori (vedi elenco TITOLARI sopra)\n`
    } else if (clientFormation.slot_positions) {
      const slotCount = Object.keys(clientFormation.slot_positions).filter(slot =>
        clientFormation.slot_positions[slot] && slot >= 0 && slot <= 10
      ).length
      formationText += `- Titolari: ${slotCount} slot formazione\n`
    }
  } else {
    formationText += `- Formazione: Non configurata\n`
  }
  
  // Costruisci sezione impostazioni tattiche
  let tacticalText = `\nIMPOSTAZIONI TATTICHE CLIENTE:\n`
  if (tacticalSettings) {
    tacticalText += `- Team Playing Style: ${tacticalSettings.team_playing_style || 'N/A'}\n`
    if (tacticalSettings.individual_instructions && Object.keys(tacticalSettings.individual_instructions).length > 0) {
      tacticalText += `- Istruzioni Individuali: ${Object.keys(tacticalSettings.individual_instructions).length} istruzioni configurate\n`
    }
  } else {
    tacticalText += `- Impostazioni: Non configurate\n`
  }
  
  // ✅ FIX: Costruisci sezione allenatore con competenze numeriche e istruzioni esplicite
  let coachText = `\nALLENATORE CLIENTE:\n`
  if (activeCoach) {
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
    coachText += `- Allenatore: Non configurato\n`
    coachText += `⚠️ Nota: Senza allenatore configurato, i suggerimenti non considerano competenze specifiche.\n`
  }
  
  // Costruisci sezione storico con analisi approfondita
  let historyText = ''
  let similarFormationAnalysis = ''
  let playerPerformanceAnalysis = ''
  let tacticalHabitsAnalysis = ''
  
  // Estrai dati analisi approfondita
  const similarFormationMatches = playerPerformance?.similarFormationMatches || []
  const playerPerformanceAgainstSimilar = playerPerformance?.playerPerformanceAgainstSimilar || {}
  const tacticalHabits = playerPerformance?.tacticalHabits || {}
  
  if (matchHistory && matchHistory.length > 0) {
    historyText = `\nSTORICO MATCH COMPLETO (ultimi ${matchHistory.length}):\n`
    matchHistory.slice(0, 15).forEach((match, idx) => {
      const isSimilar = similarFormationMatches.some(sm => sm.id === match.id)
      const marker = isSimilar ? '⚠️ SIMILE' : ''
      historyText += `${idx + 1}. ${marker} vs ${match.opponent_name || 'N/A'} - ${match.result || 'N/A'} - Formazione: ${match.formation_played || 'N/A'} - Stile: ${match.playing_style_played || 'N/A'}\n`
    })
  }

  // Analisi match con formazioni simili
  if (similarFormationMatches.length > 0) {
    const wins = similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
    }).length
    const losses = similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')
    }).length
    const draws = similarFormationMatches.length - wins - losses
    const winRate = similarFormationMatches.length > 0 ? ((wins / similarFormationMatches.length) * 100).toFixed(0) : 0
    
    similarFormationAnalysis = `\n⚠️ ANALISI CRITICA: MATCH CONTRO FORMAZIONI SIMILI:\n`
    similarFormationAnalysis += `- Match trovati con formazione simile: ${similarFormationMatches.length}\n`
    similarFormationAnalysis += `- Vittorie: ${wins} | Sconfitte: ${losses} | Pareggi: ${draws}\n`
    similarFormationAnalysis += `- Win Rate: ${winRate}%\n`
    
    if (losses > wins) {
      similarFormationAnalysis += `\n🚨 PROBLEMA IDENTIFICATO: Il cliente ha più sconfitte che vittorie contro formazioni simili!\n`
      similarFormationAnalysis += `- Questo indica una debolezza tattica specifica contro questo tipo di formazione\n`
      similarFormationAnalysis += `- È CRITICO suggerire contromisure specifiche e alternative tattiche\n`
    }
    
    if (similarFormationMatches.length >= 3) {
      similarFormationAnalysis += `\n- Pattern identificato: Il cliente ha già giocato ${similarFormationMatches.length} volte contro formazioni simili\n`
      similarFormationAnalysis += `- Usa questo storico per suggerimenti basati su esperienza reale\n`
    }
  } else {
    similarFormationAnalysis = `\n⚠️ NOTA: Nessun match storico trovato contro formazioni simili.\n`
    similarFormationAnalysis += `- Questo è il primo match contro questo tipo di formazione (o dati insufficienti)\n`
    similarFormationAnalysis += `- Suggerisci contromisure basate su best practices community\n`
  }

  // Analisi performance giocatori contro formazioni simili
  if (Object.keys(playerPerformanceAgainstSimilar).length > 0) {
    playerPerformanceAnalysis = `\n📊 PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:\n`
    
    // Identifica giocatori che soffrono (rating medio < 6.0)
    const strugglingPlayers = []
    const strongPlayers = []
    
    Object.entries(playerPerformanceAgainstSimilar).forEach(([playerId, perf]) => {
      const avgRating = perf.matches > 0 ? perf.totalRating / perf.matches : 0
      const playerInfo = {
        id: playerId,
        name: perf.playerName,
        avgRating: avgRating.toFixed(1),
        matches: perf.matches,
        minRating: Math.min(...perf.ratings),
        maxRating: Math.max(...perf.ratings)
      }
      
      if (avgRating < 6.0 && perf.matches >= 2) {
        strugglingPlayers.push(playerInfo)
      } else if (avgRating >= 7.0 && perf.matches >= 2) {
        strongPlayers.push(playerInfo)
      }
    })
    
    if (strugglingPlayers.length > 0) {
      playerPerformanceAnalysis += `\n🚨 GIOCATORI CHE SOFFRONO (rating < 6.0):\n`
      strugglingPlayers.forEach(player => {
        playerPerformanceAnalysis += `- ${player.name}: Rating medio ${player.avgRating} in ${player.matches} match (min: ${player.minRating}, max: ${player.maxRating})\n`
        playerPerformanceAnalysis += `  → Considera sostituzione o cambio ruolo per questo match\n`
      })
    }
    
    if (strongPlayers.length > 0) {
      playerPerformanceAnalysis += `\n✅ GIOCATORI CHE PERFORMANO BENE (rating >= 7.0):\n`
      strongPlayers.forEach(player => {
        playerPerformanceAnalysis += `- ${player.name}: Rating medio ${player.avgRating} in ${player.matches} match\n`
        playerPerformanceAnalysis += `  → Mantieni in formazione, sono efficaci contro questo tipo di avversario\n`
      })
    }
    
    if (strugglingPlayers.length === 0 && strongPlayers.length === 0) {
      playerPerformanceAnalysis += `- Dati insufficienti per analisi performance specifiche\n`
    }
  }

  // Analisi abitudini tattiche cliente
  if (tacticalHabits.preferredFormations && Object.keys(tacticalHabits.preferredFormations).length > 0) {
    tacticalHabitsAnalysis = `\n🎯 ABITUDINI TATTICHE CLIENTE:\n`
    
    // Formazioni preferite
    const sortedFormations = Object.entries(tacticalHabits.preferredFormations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    tacticalHabitsAnalysis += `\nFormazioni Preferite (più usate):\n`
    sortedFormations.forEach(([formation, count]) => {
      const winRate = tacticalHabits.winRateByFormation[formation]
      if (winRate) {
        const winRatePct = winRate.total > 0 ? ((winRate.wins / winRate.total) * 100).toFixed(0) : 0
        tacticalHabitsAnalysis += `- ${formation}: ${count} match | Win Rate: ${winRatePct}% (${winRate.wins}W/${winRate.losses}L/${winRate.draws}D)\n`
      } else {
        tacticalHabitsAnalysis += `- ${formation}: ${count} match\n`
      }
    })
    
    // Stili preferiti
    if (tacticalHabits.preferredStyles && Object.keys(tacticalHabits.preferredStyles).length > 0) {
      const sortedStyles = Object.entries(tacticalHabits.preferredStyles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
      
      tacticalHabitsAnalysis += `\nStili di Gioco Preferiti:\n`
      sortedStyles.forEach(([style, count]) => {
        tacticalHabitsAnalysis += `- ${style}: ${count} match\n`
      })
    }
    
    // Identifica problematiche
    const problematicFormations = Object.entries(tacticalHabits.winRateByFormation)
      .filter(([formation, stats]) => {
        const winRate = stats.total > 0 ? stats.wins / stats.total : 0
        return stats.total >= 3 && winRate < 0.4 // Win rate < 40% con almeno 3 match
      })
    
    if (problematicFormations.length > 0) {
      tacticalHabitsAnalysis += `\n⚠️ FORMAZIONI PROBLEMATICHE (Win Rate < 40%):\n`
      problematicFormations.forEach(([formation, stats]) => {
        const winRate = (stats.wins / stats.total * 100).toFixed(0)
        tacticalHabitsAnalysis += `- ${formation}: Win Rate ${winRate}% (${stats.wins}W/${stats.losses}L in ${stats.total} match)\n`
        tacticalHabitsAnalysis += `  → Il cliente ha difficoltà con questa formazione, suggerisci alternative\n`
      })
    }
  }
  
  // Costruisci sezione pattern tattici (opzionale)
  let patternsText = ''
  if (tacticalPatterns) {
    if (tacticalPatterns.formation_usage && Object.keys(tacticalPatterns.formation_usage).length > 0) {
      patternsText = `\nPATTERN FORMAZIONI CLIENTE:\n`
      Object.entries(tacticalPatterns.formation_usage).slice(0, 5).forEach(([formation, stats]) => {
        patternsText += `- ${formation}: ${stats.matches || 0} match, win rate: ${(stats.win_rate * 100).toFixed(0)}%\n`
      })
    }
    if (tacticalPatterns.recurring_issues && Array.isArray(tacticalPatterns.recurring_issues) && tacticalPatterns.recurring_issues.length > 0) {
      patternsText += `\nPROBLEMI RICORRENTI:\n`
      tacticalPatterns.recurring_issues.slice(0, 3).forEach(issue => {
        patternsText += `- ${issue.issue} (frequenza: ${issue.frequency})\n`
      })
    }
  }
  
  // Contromisure specifiche per meta (da best practices community)
  let metaCountermeasures = ''
  if (metaInfo.isMeta) {
    metaCountermeasures = `\n\n⚠️ CONTROMISURE SPECIFICHE PER FORMAZIONE META:\n`
    
    if (opponentFormation.formation_name?.includes('4-3-3')) {
      metaCountermeasures += `- Contro 4-3-3: Usa 3-5-2 o 4-4-2 Diamond per dominare centrocampo (superiorità numerica 5v3)\n`
      metaCountermeasures += `- Marcatura stretta sulle ali per bloccare attacchi laterali\n`
      metaCountermeasures += `- Sfrutta superiorità numerica centrale per controllo possesso\n`
    } else if (opponentFormation.formation_name?.includes('4-2-3-1')) {
      metaCountermeasures += `- Contro 4-2-3-1: Usa due attaccanti (4-4-2 o 3-5-2) per isolare i due DMF avversari\n`
      metaCountermeasures += `- Attacca con AMF offensivo dietro la linea avversaria\n`
      metaCountermeasures += `- Sfrutta vulnerabilità attaccante solitario\n`
    } else if (opponentFormation.formation_name?.includes('5-2-3')) {
      metaCountermeasures += `- Contro 5-2-3: Usa possesso palla e cambi di gioco rapidi\n`
      metaCountermeasures += `- Tira fuori i terzini avversari con ampiezza\n`
      metaCountermeasures += `- Sfrutta zone laterali lasciate scoperte\n`
    } else if (opponentFormation.formation_name?.includes('3-5-2')) {
      metaCountermeasures += `- Contro 3-5-2: Sfrutta ampiezza (4-3-3 o 4-2-3-1)\n`
      metaCountermeasures += `- Terzini aggressivi per attaccare zone laterali\n`
      metaCountermeasures += `- Evita gioco centrale dove avversario è forte\n`
    }
    
    if (opponentFormation.playing_style?.toLowerCase().includes('quick counter') || 
        opponentFormation.playing_style?.toLowerCase().includes('contropiede')) {
      metaCountermeasures += `- Contro Quick Counter: Linea difensiva BASSA per eliminare spazio dietro\n`
      metaCountermeasures += `- Possesso paziente per negare transizioni rapide\n`
      metaCountermeasures += `- Evita pressing aggressivo che lascia gap\n`
      metaCountermeasures += `- Centrocampo compatto con BWM e DMF per intercettare passaggi\n`
    }
  }
  
  return `Sei un esperto tattico di eFootball con conoscenza approfondita delle formazioni meta e delle contromisure efficaci utilizzate dalla community professionale.

${opponentText}${rosterText}${formationText}${tacticalText}${coachText}${historyText}${similarFormationAnalysis}${playerPerformanceAnalysis}${tacticalHabitsAnalysis}${patternsText}${metaCountermeasures}

ISTRUZIONI SPECIFICHE (Focus Community eFootball):

1. **IDENTIFICA FORMAZIONE META:**
   ${metaInfo.isMeta ? `⚠️ FORMAZIONE META: ${metaInfo.metaType || opponentFormation.formation_name}\n   Spiega perché è meta e quali sono i suoi punti di forza.\n   Applica contromisure SPECIFICHE basate su best practices community.` : 'Formazione non meta. Analizza punti di forza/debolezza standard.'}

2. **CONTROMISURE CONTRO META:**
   ${metaInfo.isMeta ? metaCountermeasures : 'Analizza formazione standard e suggerisci contromisure tattiche generali.'}

3. **ANALISI PUNTI FORZA/DEBOLEZZA:**
   - Identifica punti di forza formazione avversaria (es: "4-3-3 ha centrocampo forte ma ali isolate")
   - Identifica punti deboli (es: "4-2-3-1 ha attaccante solitario, vulnerabile a due attaccanti")
   - Spiega PERCHÉ ogni debolezza esiste (ragionamento tattico)

4. **SUGGERIMENTI PERSONALIZZATI (CRITICO):**
   ${similarFormationMatches.length > 0 ? `⚠️ IL CLIENTE HA GIÀ GIOCATO ${similarFormationMatches.length} MATCH CONTRO FORMAZIONI SIMILI:
   - Analizza pattern di vittorie/sconfitte per identificare cosa ha funzionato/non funzionato
   - Se win rate < 50%, identifica errori tattici ricorrenti e suggerisci alternative
   - Evita di suggerire formazioni/stili che hanno già fallito in passato
   - Suggerisci cambiamenti specifici basati su esperienza reale del cliente` : `- Nessun match storico contro formazioni simili, usa best practices community`}
   
   ${Object.keys(playerPerformanceAgainstSimilar).length > 0 ? `⚠️ PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:
   - Giocatori con rating < 6.0: SUGGERISCI SOSTITUZIONE o cambio ruolo
   - Giocatori con rating >= 7.0: MANTIENI in formazione, sono efficaci
   - Considera queste performance per suggerimenti giocatori specifici` : `- Dati performance giocatori insufficienti per analisi specifica`}
   
   ${tacticalHabits.preferredFormations && Object.keys(tacticalHabits.preferredFormations).length > 0 ? `⚠️ ABITUDINI TATTICHE CLIENTE:
   - Formazioni preferite: ${Object.keys(tacticalHabits.preferredFormations).slice(0, 3).join(', ')}
   - Rispetta preferenze ma suggerisci adeguamenti se necessario
   - Se formazione preferita ha win rate basso, suggerisci alternative
   - Considera stile di gioco preferito per coerenza` : `- Dati abitudini tattiche insufficienti`}
   
   - Incrocia rosa cliente: suggerisci giocatori SPECIFICI dalla rosa ideali per ogni ruolo
   - Considera formazione cliente attuale: se già ottimale, suggerisci solo adeguamenti
   - Rispetta stile preferito cliente: se preferisce possesso, non suggerire Quick Counter
   ${activeCoach && activeCoach.playing_style_competence ? `⚠️ REGOLE CRITICHE ALLENATORE:
   - Se suggerisci un cambio stile di gioco, usa SOLO stili in cui l'allenatore ha competenza >= 70
   - NON suggerire stili con competenza < 50, l'allenatore non è competente
   - Esempio: Se Capello ha "Contrattacco: 89" e "Contropiede Veloce: 57" (ALTI) ma "Possesso Palla: 46" (BASSO)
     → ✅ SUGGERISCI: Contrattacco o Contropiede Veloce
     → ❌ NON SUGGERIRE: Possesso Palla (competenza troppo bassa)
   - Verifica sempre le competenze dell'allenatore prima di suggerire uno stile` : `- Usa competenze allenatore se disponibili`}

5. **ADEGUAMENTI SPECIFICI:**
   - **Linea difensiva:** Alta/Bassa (spiega quando e perché)
   - **Pressing:** Aggressivo/Contenimento (spiega quando e perché)
   - **Possesso:** Controllo paziente vs Transizioni rapide
   - **Ampiezza:** Sfruttare ali vs Gioco centrale
   - **Marcature:** Strette vs Zona (spiega quando e perché)

6. **SUGGERIMENTI GIOCATORI (OBBLIGATORIO):**
   ${hasTitolariRiserve ? `- Usa SOLO gli elenchi TITOLARI e RISERVE sopra. Titolari = in campo, Riserve = panchina.
   - add_to_starting_xi: SOLO giocatori dalla lista RISERVE. Mai "aggiungi" per chi è in TITOLARI.
   - remove_from_starting_xi: SOLO giocatori dalla lista TITOLARI. Mai "rimuovi" per chi è in RISERVE.
   - Usa sempre il player_id (UUID) tra [ ] negli elenchi. Non inventare id.` : `- Identifica giocatori dalla rosa ideali per contromisura. Considera Overall, Skills, Stats.`}
   - Considera Overall, Skills, Stats. Motivazione breve (1-2 righe) per ogni suggerimento.

7. **ISTRUZIONI INDIVIDUALI:**
   - Suggerisci istruzioni SPECIFICHE per ogni ruolo
   - Spiega PERCHÉ ogni istruzione è necessaria
   - Considera formazione avversaria

8. **PRIORITÀ:**
   - HIGH: Contromisure essenziali per contrastare formazione avversaria
   - MEDIUM: Ottimizzazioni per migliorare efficacia
   - LOW: Fine-tuning per perfezionamento

9. **MOTIVAZIONI:**
   - Ogni suggerimento DEVE avere motivazione chiara
   - Spiega ragionamento tattico (non solo "è meglio")
   - Riferisci a best practices community quando rilevante

10. **AVVERTENZE E PROBLEMATICHE IDENTIFICATE:**
    ${similarFormationMatches.length > 0 && similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('L') || result.includes('Sconfitta') || result.includes('Loss')
    }).length > similarFormationMatches.filter(m => {
      const result = m.result || ''
      return result.includes('W') || result.includes('Vittoria') || result.includes('Win')
    }).length ? `⚠️ PROBLEMA CRITICO: Il cliente ha più sconfitte che vittorie contro formazioni simili!
    - Questo indica una debolezza tattica specifica
    - È ESSENZIALE suggerire cambiamenti significativi, non solo piccoli adeguamenti
    - Considera formazioni/stili completamente diversi da quelli usati in passato` : ''}
    
    ${Object.keys(playerPerformanceAgainstSimilar).filter(pid => {
      const perf = playerPerformanceAgainstSimilar[pid]
      return perf.matches >= 2 && (perf.totalRating / perf.matches) < 6.0
    }).length > 0 ? `⚠️ PROBLEMA GIOCATORI: Alcuni giocatori hanno performance scarse contro formazioni simili
    - Identifica questi giocatori e suggerisci sostituzioni specifiche
    - Spiega PERCHÉ questi giocatori soffrono contro questo tipo di formazione` : ''}
    
    - Se formazione avversaria è meta, avverti cliente
    - Se rosa cliente non ha giocatori ideali, suggerisci alternative
    - Se suggerimenti contrastano con stile preferito, spiega trade-off
    - Se dati insufficienti, sottolinea limitazioni
    - Se cliente ha pattern di sconfitte, identifica cause specifiche e soluzioni concrete

OUTPUT FORMATO JSON (STRUTTURATO):
{
  "analysis": {
    "opponent_formation_analysis": "Analisi dettagliata formazione avversaria...",
    "is_meta_formation": ${String(metaInfo.isMeta)},
    "meta_type": ${metaInfo.isMeta && metaInfo.metaType ? JSON.stringify(metaInfo.metaType) : 'null'},
    "strengths": ["Punto forza 1", "Punto forza 2"],
    "weaknesses": ["Punto debole 1", "Punto debole 2"],
    "why_weaknesses": "Spiegazione ragionamento tattico..."
  },
  "countermeasures": {
    "formation_adjustments": [
      {
        "type": "formation_change",
        "suggestion": "Cambia da 4-3-3 a 3-5-2",
        "reason": "Motivazione tattica dettagliata...",
        "priority": "high"
      }
    ],
    "tactical_adjustments": [
      {
        "type": "playing_style_change",
        "suggestion": "Usa contropiede veloce",
        "reason": "Motivazione...",
        "priority": "medium"
      },
      {
        "type": "defensive_line",
        "suggestion": "bassa",
        "reason": "Motivazione...",
        "priority": "high"
      },
      {
        "type": "pressing",
        "suggestion": "contenimento",
        "reason": "Motivazione...",
        "priority": "high"
      },
      {
        "type": "possession_strategy",
        "suggestion": "controllo",
        "reason": "Motivazione...",
        "priority": "medium"
      }
    ],
    "player_suggestions": [
      {
        "player_id": "uuid dalla lista TITOLARI o RISERVE",
        "player_name": "Nome Giocatore",
        "action": "add_to_starting_xi (solo riserve) o remove_from_starting_xi (solo titolari)",
        "position": "SP",
        "reason": "Motivazione breve 1-2 righe",
        "priority": "high"
      }
    ],
    "individual_instructions": [
      {
        "slot": "attacco_1",
        "player_id": "uuid",
        "instruction": "offensivo",
        "reason": "Motivazione..."
      }
    ]
  },
  "confidence": 85,
  "data_quality": "high",
  "warnings": ["Avvertimento 1", "Avvertimento 2"]
}

IMPORTANTE: 
- Rispondi SOLO in formato JSON valido
- Non includere markdown o codice
- Ogni suggerimento deve avere reason (breve)
- Priorità: "high", "medium" o "low"
- player_suggestions: usa SOLO player_id dagli elenchi TITOLARI/RISERVE; add_to_starting_xi solo per riserve, remove_from_starting_xi solo per titolari
- Se dati insufficienti, imposta data_quality a "low" e aggiungi warnings`
}

/**
 * Valida output contromisure
 */
export function validateCountermeasuresOutput(output) {
  if (!output || typeof output !== 'object') {
    return { valid: false, error: 'Output must be an object' }
  }
  
  if (!output.analysis || typeof output.analysis !== 'object') {
    return { valid: false, error: 'Missing or invalid analysis field' }
  }
  
  if (!output.countermeasures || typeof output.countermeasures !== 'object') {
    return { valid: false, error: 'Missing or invalid countermeasures field' }
  }
  
  // Valida priorità
  const validPriorities = ['high', 'medium', 'low']
  const allSuggestions = [
    ...(output.countermeasures.formation_adjustments || []),
    ...(output.countermeasures.tactical_adjustments || []),
    ...(output.countermeasures.player_suggestions || [])
  ]
  
  for (const suggestion of allSuggestions) {
    if (suggestion.priority && !validPriorities.includes(suggestion.priority)) {
      return { valid: false, error: `Invalid priority: ${suggestion.priority}` }
    }
    if (!suggestion.reason || typeof suggestion.reason !== 'string') {
      return { valid: false, error: 'All suggestions must have a reason' }
    }
  }
  
  return { valid: true }
}
