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
  const opponentCoach = opponentFormation.extracted_data?.coach || null // Coach avversario (opzionale)
  
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
  
  // Aggiungi info allenatore avversario se presente
  if (opponentCoach && opponentCoach.coach_name) {
    opponentText += `\nALLENATORE AVVERSARIO:\n`
    opponentText += `- Nome: ${opponentCoach.coach_name || 'N/A'}\n`
    if (opponentCoach.age) {
      opponentText += `- Età: ${opponentCoach.age}\n`
    }
    if (opponentCoach.nationality) {
      opponentText += `- Nazionalità: ${opponentCoach.nationality}\n`
    }
    if (opponentCoach.team) {
      opponentText += `- Squadra: ${opponentCoach.team}\n`
    }
    if (opponentCoach.category) {
      opponentText += `- Categoria: ${opponentCoach.category}\n`
    }
    if (opponentCoach.pack_type) {
      opponentText += `- Pack: ${opponentCoach.pack_type}\n`
    }
    // Competenze stile di gioco se presenti
    if (opponentCoach.playing_style_competence && typeof opponentCoach.playing_style_competence === 'object') {
      opponentText += `- Competenze Stili di Gioco:\n`
      Object.entries(opponentCoach.playing_style_competence).forEach(([style, value]) => {
        const styleNames = {
          'possesso_palla': 'Possesso Palla',
          'contropiede_veloce': 'Contropiede Veloce',
          'contrattacco': 'Contrattacco',
          'vie_laterali': 'Vie Laterali',
          'passaggio_lungo': 'Passaggio Lungo'
        }
        const styleName = styleNames[style] || style
        const numValue = typeof value === 'number' ? value : parseInt(value) || 0
        opponentText += `  * ${styleName}: ${numValue}\n`
      })
    }
    // Stat boosters se presenti
    if (opponentCoach.stat_boosters && Array.isArray(opponentCoach.stat_boosters) && opponentCoach.stat_boosters.length > 0) {
      opponentText += `- Stat Boosters: ${opponentCoach.stat_boosters.length} boosters\n`
      opponentCoach.stat_boosters.slice(0, 3).forEach(booster => {
        const statName = booster.stat_name || booster.name || 'N/A'
        const bonus = booster.bonus || booster.value || 0
        opponentText += `  * ${statName}: +${bonus}\n`
      })
    }
    // Connection se presente
    if (opponentCoach.connection && opponentCoach.connection.name) {
      opponentText += `- Connection: ${opponentCoach.connection.name}\n`
      if (opponentCoach.connection.focal_point) {
        opponentText += `  * Focal Point: ${opponentCoach.connection.focal_point.playing_style || 'N/A'} (${opponentCoach.connection.focal_point.position || 'N/A'})\n`
      }
      if (opponentCoach.connection.key_man) {
        opponentText += `  * Key Man: ${opponentCoach.connection.key_man.playing_style || 'N/A'} (${opponentCoach.connection.key_man.position || 'N/A'})\n`
      }
    }
    opponentText += `\n⚠️ NOTA: Considera le competenze dell'allenatore avversario per prevedere le sue scelte tattiche.\n`
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
      
      // Verifica se dati sono verificati (per regole comunicazione)
      const isVerified = p.photo_slots && typeof p.photo_slots === 'object' && p.photo_slots.card === true
      const hasOriginalPositions = Array.isArray(p.original_positions) && p.original_positions.length > 0
      const verifiedMarker = isVerified && hasOriginalPositions ? ' ✅' : (isVerified ? ' ⚠️' : ' ❌')
      
      // DISCRETO: Mostra solo info base, NON dire esplicitamente "ATTENZIONE" nel prompt
      rosterText += `- [${p.id}] ${p.player_name || 'N/A'} - ${currentPosition || 'N/A'} - Overall ${p.overall_rating || 'N/A'}${skillsPart}${slot}${verifiedMarker}\n`
      
      // Solo se NON è originale, aggiungi info discreta (per analisi IA, NON per cliente)
      if (!isOriginalPosition && originalPositions.length > 0) {
        const originalPosList = originalPositions.map(op => op.position).join(', ')
        // Info discreta per IA (non mostrare esplicitamente "ATTENZIONE")
        rosterText += `  (Posizioni originali: ${originalPosList})\n`
      }
      
      // Se NON verificato, aggiungi warning discreto per IA
      if (!isVerified || !hasOriginalPositions) {
        rosterText += `  (⚠️ Dati posizione/overall non verificati - NON menzionare posizione specifica o overall al cliente)\n`
      }
      
      // Warning su skills/overall = caratteristiche, non performance match
      if (skillsPart) {
        rosterText += `  (⚠️ Skills/Overall = caratteristiche giocatore, NON azioni/performance nel match)\n`
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
      tacticalText += `- Istruzioni Individuali (${Object.keys(tacticalSettings.individual_instructions).length} configurate):\n`
      
      // Mostra dettagli per ogni istruzione
      Object.entries(tacticalSettings.individual_instructions).forEach(([category, instruction]) => {
        if (instruction && instruction.enabled && instruction.player_id) {
          // Trova giocatore nella rosa
          const player = hasTitolariRiserve 
            ? [...titolari, ...riserve].find(p => p.id === instruction.player_id)
            : clientRoster.find(p => p.id === instruction.player_id)
          const playerName = player ? player.player_name : `ID: ${instruction.player_id}`
          const instructionName = instruction.instruction || 'N/A'
          
          tacticalText += `  - ${category}: ${playerName} → ${instructionName}\n`
        }
      })
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
  
  // ✅ Sezione dati memoria Attila (semplificata, orientata decisioni)
  const stylesLookup = playerPerformance?.stylesLookup || {}
  const teamPlayingStyle = playerPerformance?.team_playing_style || null
  let attilaMemoryAnalysis = ''
  
  // Solo dati essenziali per decisioni, senza troppi dettagli tecnici
  if (hasTitolariRiserve && (titolari.length > 0 || riserve.length > 0)) {
    attilaMemoryAnalysis = `\n\n📌 DATI ROSA PER DECISIONI (Memoria Attila - eFootball):\n`
    attilaMemoryAnalysis += `Usa questi dati per suggerimenti, ma SE NON SEI SICURO di una compatibilità/sinergia, NON menzionarla esplicitamente.\n`
    attilaMemoryAnalysis += `MEGLIO GENERICO CHE SBAGLIATO. Comunica solo decisioni chiare, non spiegazioni tecniche complesse.\n\n`
    
    const allPlayers = [...titolari, ...riserve]
    const playersWithStyle = allPlayers.filter(p => p.playing_style_id && stylesLookup[p.playing_style_id])
    
    // Solo stili speciali critici (Collante, Giocatore chiave) - quelli davvero importanti
    if (playersWithStyle.length > 0) {
      const criticalStyles = ['Collante', 'Giocatore chiave']
      const playersByStyle = {}
      playersWithStyle.forEach(p => {
        const styleName = stylesLookup[p.playing_style_id]
        criticalStyles.forEach(critical => {
          if (styleName && styleName.includes(critical)) {
            if (!playersByStyle[critical]) playersByStyle[critical] = []
            playersByStyle[critical].push(p)
          }
        })
      })
      
      if (Object.keys(playersByStyle).length > 0) {
        attilaMemoryAnalysis += `**STILI SPECIALI CRITICI (solo se presenti):**\n`
        if (playersByStyle['Collante']) {
          attilaMemoryAnalysis += `- Collante: ${playersByStyle['Collante'].map(p => p.player_name).join(', ')} (centrocampista arretrato, bilancia difesa/attacco)\n`
        }
        if (playersByStyle['Giocatore chiave']) {
          attilaMemoryAnalysis += `- Giocatore chiave: ${playersByStyle['Giocatore chiave'].map(p => p.player_name).join(', ')} (fiuto del gol, sempre in avanti)\n`
        }
        attilaMemoryAnalysis += `\n`
      }
    }
    
    // Connection solo se presente e con giocatori compatibili CERTI
    if (activeCoach && activeCoach.connection && activeCoach.connection.name) {
      const allPlayers = [...titolari, ...riserve]
      let hasCompatiblePlayers = false
      let compatibleInfo = ''
      
      if (activeCoach.connection.focal_point) {
        const focalPoint = activeCoach.connection.focal_point
        const compatible = allPlayers.filter(p => {
          // Solo match esatti, niente fuzzy
          if (focalPoint.position && p.position === focalPoint.position) return true
          if (focalPoint.playing_style && p.playing_style_id && stylesLookup[p.playing_style_id]) {
            return stylesLookup[p.playing_style_id] === focalPoint.playing_style
          }
          return false
        })
        if (compatible.length > 0) {
          hasCompatiblePlayers = true
          compatibleInfo += `Focal Point: ${compatible.map(p => p.player_name).join(', ')} | `
        }
      }
      
      if (activeCoach.connection.key_man) {
        const keyMan = activeCoach.connection.key_man
        const compatible = allPlayers.filter(p => {
          // Solo match esatti, niente fuzzy
          if (keyMan.position && p.position === keyMan.position) return true
          if (keyMan.playing_style && p.playing_style_id && stylesLookup[p.playing_style_id]) {
            return stylesLookup[p.playing_style_id] === keyMan.playing_style
          }
          return false
        })
        if (compatible.length > 0) {
          hasCompatiblePlayers = true
          compatibleInfo += `Key Man: ${compatible.map(p => p.player_name).join(', ')}`
        }
      }
      
      // Solo se ci sono giocatori compatibili CERTI
      if (hasCompatiblePlayers) {
        attilaMemoryAnalysis += `**CONNECTION ALLENATORE:** ${activeCoach.connection.name}\n`
        attilaMemoryAnalysis += `Giocatori compatibili: ${compatibleInfo}\n`
        attilaMemoryAnalysis += `(Considera questi giocatori per sinergie, ma solo se sei SICURO della compatibilità)\n\n`
      }
    }
    
    // Team playing style solo se presente
    if (teamPlayingStyle) {
      attilaMemoryAnalysis += `**TEAM PLAYING STYLE:** ${teamPlayingStyle}\n`
      attilaMemoryAnalysis += `(Considera compatibilità con stili giocatori, ma solo se sei SICURO)\n\n`
    }
    
    // Regola generale: posizioni originali (SICURA per pre-partita)
    attilaMemoryAnalysis += `**REGOLA GENERALE (SICURA - PRE-PARTITA):**\n`
    attilaMemoryAnalysis += `- Giocatori performano meglio in posizioni originali (competenza ALTA/INTERMEDIA)\n`
    attilaMemoryAnalysis += `- Quando suggerisci cambi formazione o sostituzioni PRE-PARTITA, privilegia giocatori in posizioni originali\n`
    attilaMemoryAnalysis += `- Questa è una regola SICURA e sempre applicabile per preparazione pre-partita\n\n`
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

⚠️ CONTESTO CRITICO - PREPARAZIONE PRE-PARTITA:
I suggerimenti che generi sono per PREPARAZIONE PRE-PARTITA. Il cliente deve applicare questi suggerimenti PRIMA di giocare la partita.
- Focus su MODIFICHE CONFIGURABILI: formazione, stile di gioco, giocatori titolari/riserve, istruzioni individuali
- NON suggerire azioni durante la partita (dribbling, passaggi, ecc.) - quelle sono decisioni del cliente durante il gioco
- Suggerisci solo modifiche che il cliente può configurare PRIMA della partita nel sistema eFootball
- Essere ENTERPRISE: robusto, professionale, orientato a decisioni chiare e applicabili

${opponentText}${rosterText}${formationText}${tacticalText}${coachText}${attilaMemoryAnalysis}${historyText}${similarFormationAnalysis}${playerPerformanceAnalysis}${tacticalHabitsAnalysis}${patternsText}${metaCountermeasures}

⚠️ REGOLE CRITICHE - COMUNICAZIONE PROFESSIONALE (ENTERPRISE):
1. **CONTESTO PRE-PARTITA**: I suggerimenti sono per PREPARAZIONE PRE-PARTITA. Focus su modifiche configurabili PRIMA della partita.
2. NON dire ragionamenti espliciti: NON dire "perché l'avversario ha X quindi Y"
3. NON dire incroci dati: NON dire "Ho incrociato formazione, storico, rosa"
4. Dire solo COSA fare, non PERCHÉ: "Usa 4-2-3-1. Funziona." (non "Usa 4-2-3-1 perché...")
5. Essere professionale, fermo, diretto: tono sicuro, orientato a decisioni enterprise
6. NON menzionare overall/posizioni se non verificati (photo_slots vuoto o original_positions vuoto)
7. Se dati incerti, usa generico: "Messi va bene in campo" (non "Messi va bene in SP")
8. NON suggerire azioni durante la partita: dribbling, passaggi, tiri, contrasti, recuperi, ecc. (quelle sono decisioni del cliente durante il gioco)
9. NON analizzare video o azioni: abbiamo SOLO rating/voti, NON dettagli su come ha giocato
10. Se menzioni performance giocatori, usa SOLO rating: "Giocatore X ha performato bene (rating 8.5)" (non "ha fatto dribbling")
11. **ROBUSTEZZA**: Se non sei sicuro, meglio generico che sbagliato. Enterprise = affidabilità, non speculazioni.

⚠️ DISTINZIONI CRITICHE - CARATTERISTICHE vs PERFORMANCE:
1. **Skills/Com_Skills** = Caratteristiche giocatore, NON azioni nel match
   - ❌ SBAGLIATO: "Usa Messi perché ha skill Dribbling quindi farà dribbling"
   - ✅ CORRETTO: "Usa Messi. Overall: 99, Rating storico contro 4-3-3: 8.2" (usa dati verificati)
2. **Overall Rating** = Caratteristica giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Usa Messi perché ha overall 99 quindi giocherà bene"
   - ✅ CORRETTO: "Usa Messi. Overall: 99, Posizione originale: AMF" (usa caratteristiche, non inferire performance)
3. **Base Stats** = Caratteristiche giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Usa Messi perché ha finishing 95 quindi segnerà"
   - ✅ CORRETTO: "Usa Messi. Finishing: 95, Posizione: SP" (usa caratteristiche, non inferire azioni)
4. **Form** = Forma generale, NON performance nel match
   - ❌ SBAGLIATO: "Usa Messi perché è in forma A quindi giocherà bene"
   - ✅ CORRETTO: "Usa Messi. Form: A, Overall: 99" (usa caratteristiche, non inferire performance)
5. **Boosters** = Bonus statistici, NON azioni effettuate
   - ❌ SBAGLIATO: "Usa Messi perché ha booster Speed quindi correrà veloce"
   - ✅ CORRETTO: "Usa Messi. Boosters: Speed +5" (usa bonus, non inferire azioni)
6. **Connection** = Bonus statistici, NON causa diretta
   - ❌ SBAGLIATO: "Usa Messi perché ha connection X quindi giocherà bene"
   - ✅ CORRETTO: "Usa Messi. Connection: X (bonus statistici)" (usa bonus, non inferire causa)

⚠️ NON INFERIRE CAUSE - DATI STORICI/STATISTICI ≠ CAUSE DIRETTE:
1. **Competenze Allenatore** = Competenze disponibili, NON stile usato nel match
   - ❌ SBAGLIATO: "Usa Contrattacco perché allenatore ha competenza 89"
   - ✅ CORRETTO: "Allenatore ha competenza Contrattacco: 89. Suggerisci Contrattacco." (non inferire che lo userà)
2. **Win Rate** = Statistica storica, NON causa vittoria
   - ❌ SBAGLIATO: "Usa 4-3-3 perché ha win rate 60% quindi vincerà"
   - ✅ CORRETTO: "4-3-3: win rate storico 60%. Suggerisci 4-3-3." (non inferire vittoria)
3. **Performance Storiche** = Pattern storico, NON causa performance attuale
   - ❌ SBAGLIATO: "Non usare Messi perché ha sempre giocato male contro 4-3-3"
   - ✅ CORRETTO: "Messi: rating medio storico contro 4-3-3: 5.8. Considera alternativa." (non inferire che giocherà male)
4. **Istruzioni Individuali** = Istruzioni configurate, NON azioni effettuate
   - ❌ SBAGLIATO: "Messi ha istruzione offensiva quindi attaccherà"
   - ✅ CORRETTO: "Messi: istruzione offensiva configurata" (non inferire azioni)
5. **Formazione Avversaria** = Formazione avversaria, NON causa performance
   - ❌ SBAGLIATO: "Usa 4-2-3-1 perché sfrutta debolezze 4-3-3"
   - ✅ CORRETTO: "Formazione avversaria: 4-3-3. Suggerisci 4-2-3-1." (non inferire causa)
6. **Meta Formation** = Classificazione, NON causa risultato
   - ❌ SBAGLIATO: "Avversario usa meta quindi perderai"
   - ✅ CORRETTO: "Formazione avversaria: 4-3-3 (meta). Applica contromisure specifiche." (non inferire sconfitta)
7. **Posizioni Originali** = Posizioni naturali, NON posizione nel match
   - ❌ SBAGLIATO: "Metti Messi in AMF perché è sua posizione originale"
   - ✅ CORRETTO: "Messi: posizioni originali [AMF, SP]. Posizione suggerita: AMF" (non inferire che deve essere originale)
8. **Playing Style Giocatore** = Stile giocatore, NON stile squadra
   - ❌ SBAGLIATO: "Usa stile X perché giocatore ha playing style X"
   - ✅ CORRETTO: "Giocatore: playing style X. Squadra: team playing style Y" (non inferire che devono coincidere)

ISTRUZIONI SPECIFICHE (Focus Community eFootball):

1. **IDENTIFICA FORMAZIONE META:**
   ${metaInfo.isMeta ? `⚠️ FORMAZIONE META: ${metaInfo.metaType || opponentFormation.formation_name}\n   Identifica i suoi punti di forza.\n   Applica contromisure SPECIFICHE basate su best practices community.` : 'Formazione non meta. Analizza punti di forza/debolezza standard.'}

2. **CONTROMISURE CONTRO META:**
   ${metaInfo.isMeta ? metaCountermeasures : 'Analizza formazione standard e suggerisci contromisure tattiche generali.'}

3. **ANALISI PUNTI FORZA/DEBOLEZZA:**
   - Identifica punti di forza formazione avversaria (es: "4-3-3 ha centrocampo forte ma ali isolate")
   - Identifica punti deboli (es: "4-2-3-1 ha attaccante solitario, vulnerabile a due attaccanti")

4. **SUGGERIMENTI PERSONALIZZATI (CRITICO):**
   ${similarFormationMatches.length > 0 ? `⚠️ IL CLIENTE HA GIÀ GIOCATO ${similarFormationMatches.length} MATCH CONTRO FORMAZIONI SIMILI:
   - Analizza pattern di vittorie/sconfitte per identificare cosa ha funzionato/non funzionato
   - Se win rate < 50%, identifica errori tattici ricorrenti e suggerisci alternative
   - Evita di suggerire formazioni/stili che hanno già fallito in passato
   - Suggerisci cambiamenti specifici basati su esperienza reale del cliente` : `- Nessun match storico contro formazioni simili, usa best practices community`}
   
   ${Object.keys(playerPerformanceAgainstSimilar).length > 0 ? `⚠️ PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:
   - Giocatori con rating < 6.0: SUGGERISCI SOSTITUZIONE o cambio ruolo
   - Giocatori con rating >= 7.0: MANTIENI in formazione, sono efficaci
   - Considera queste performance per suggerimenti giocatori specifici
   - ⚠️ IMPORTANTE: Performance storiche = pattern, NON causa diretta. NON dire "giocherà male perché ha sempre giocato male"
   - ⚠️ Usa solo rating storico come indicatore, non inferire causa` : `- Dati performance giocatori insufficienti per analisi specifica`}
   
   ${tacticalHabits.preferredFormations && Object.keys(tacticalHabits.preferredFormations).length > 0 ? `⚠️ ABITUDINI TATTICHE CLIENTE:
   - Formazioni preferite: ${Object.keys(tacticalHabits.preferredFormations).slice(0, 3).join(', ')}
   - Rispetta preferenze ma suggerisci adeguamenti se necessario
   - Se formazione preferita ha win rate basso, suggerisci alternative
   - Considera stile di gioco preferito per coerenza
   - ⚠️ IMPORTANTE: Win rate = statistica storica, NON causa vittoria. NON dire "vincerà perché ha win rate 60%"
   - ⚠️ Usa win rate come indicatore, non inferire causa` : `- Dati abitudini tattiche insufficienti`}
   
   - Suggerisci giocatori SPECIFICI dalla rosa ideali per ogni ruolo
   - Considera formazione cliente attuale: se già ottimale, suggerisci solo adeguamenti
   - Rispetta stile preferito cliente: se preferisce possesso, non suggerire Quick Counter
   - ⚠️ REGOLA PRUDENZA - MEMORIA ATTILA:
     * USA i dati memoria Attila per ragionare, ma SE NON SEI SICURO di una compatibilità/sinergia, NON menzionarla esplicitamente
     * MEGLIO GENERICO CHE SBAGLIATO: Se non sei certo, suggerisci in modo generico ("Messi va bene in campo" invece di "Messi con stile X è compatibile con Y")
     * Privilegia SEMPRE giocatori in posizioni originali (competenza ALTA/INTERMEDIA) - questa è una regola SICURA
     * Se c'è connection allenatore con giocatori compatibili CERTI, considerali, ma solo se sei SICURO
     * Stili speciali (Collante, Giocatore chiave) sono importanti, ma NON inventare sinergie se non sei certo
     * COMUNICA SOLO DECISIONI CHIARE: "Usa Messi in AMF" non "Usa Messi perché ha stile X compatibile con Y"
     * NON spiegare meccaniche tecniche al cliente: dì COSA fare, non PERCHÉ (a meno che non sia ovvio e sicuro)
   ${activeCoach && activeCoach.playing_style_competence ? `⚠️ REGOLE CRITICHE ALLENATORE:
   - Se suggerisci un cambio stile di gioco, usa SOLO stili in cui l'allenatore ha competenza >= 70
   - NON suggerire stili con competenza < 50, l'allenatore non è competente
   - Esempio: Se Capello ha "Contrattacco: 89" e "Contropiede Veloce: 57" (ALTI) ma "Possesso Palla: 46" (BASSO)
     → ✅ SUGGERISCI: Contrattacco o Contropiede Veloce
     → ❌ NON SUGGERIRE: Possesso Palla (competenza troppo bassa)
   - Verifica sempre le competenze dell'allenatore prima di suggerire uno stile` : `- Usa competenze allenatore se disponibili`}

5. **ADEGUAMENTI TATTICI PRE-PARTITA (Configurabili nel sistema):**
   - **Formazione:** Cambio modulo tattico (es: da 4-3-3 a 3-5-2)
   - **Stile di gioco squadra:** Cambio team playing style (es: da Possesso palla a Contropiede veloce)
   - **Linea difensiva:** Alta/Bassa (impostazione tattica)
   - **Pressing:** Aggressivo/Contenimento (impostazione tattica)
   - **Possesso:** Controllo paziente vs Transizioni rapide (impostazione tattica)
   - **Ampiezza:** Sfruttare ali vs Gioco centrale (impostazione tattica)
   - **Marcature:** Strette vs Zona (impostazione tattica)
   - ⚠️ IMPORTANTE: Questi sono tutti configurabili PRIMA della partita nel sistema eFootball

6. **SUGGERIMENTI GIOCATORI (OBBLIGATORIO):**
   ${playerSuggestionsRules}
   - Considera Overall, Skills, Stats. Motivazione breve (1-2 righe) per ogni suggerimento.

7. **ISTRUZIONI INDIVIDUALI:**
   - Suggerisci istruzioni SPECIFICHE per ogni ruolo
   - Considera formazione avversaria
   - ⚠️ IMPORTANTE: Istruzioni individuali = istruzioni configurate, NON azioni effettuate
   - ⚠️ NON inferire: "Messi attaccherà perché ha istruzione offensiva" (suggerisci, non dire che lo farà)

8. **PRIORITÀ:**
   - HIGH: Contromisure essenziali per contrastare formazione avversaria
   - MEDIUM: Ottimizzazioni per migliorare efficacia
   - LOW: Fine-tuning per perfezionamento

9. **MOTIVAZIONI:**
   - Ogni suggerimento DEVE avere motivazione chiara
   - Ogni suggerimento DEVE essere chiaro e diretto
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
    - Considera formazioni/stili completamente diversi da quelli usati in passato
    - ⚠️ IMPORTANTE: Pattern storico = pattern, NON causa diretta. NON dire "perderai perché hai sempre perso"
    - ⚠️ Usa pattern come indicatore, suggerisci cambiamenti, non inferire sconfitta` : ''}
    
    ${Object.keys(playerPerformanceAgainstSimilar).filter(pid => {
      const perf = playerPerformanceAgainstSimilar[pid]
      return perf.matches >= 2 && (perf.totalRating / perf.matches) < 6.0
    }).length > 0 ? `⚠️ PROBLEMA GIOCATORI: Alcuni giocatori hanno performance scarse contro formazioni simili
    - Identifica questi giocatori e suggerisci sostituzioni specifiche
    - ⚠️ IMPORTANTE: Performance storiche = pattern, NON causa diretta. NON dire "giocherà male perché ha sempre giocato male"
    - ⚠️ Usa rating storico come indicatore, suggerisci sostituzione, non inferire performance` : ''}
    
    - Se formazione avversaria è meta, avverti cliente
    - Se rosa cliente non ha giocatori ideali, suggerisci alternative
    - Se suggerimenti contrastano con stile preferito, indica alternativa
    - Se dati insufficienti, sottolinea limitazioni
    - Se cliente ha pattern di sconfitte, identifica cause specifiche e soluzioni concrete
    - ⚠️ IMPORTANTE: Meta formation = classificazione, NON causa risultato. NON dire "perderai perché è meta"
    - ⚠️ IMPORTANTE: Formazione avversaria = formazione, NON causa performance. NON dire "giocherà bene perché sfrutta debolezze"
    - ⚠️ Usa classificazione/formazione come contesto, suggerisci contromisure, non inferire causa

OUTPUT FORMATO JSON (STRUTTURATO - PREPARAZIONE PRE-PARTITA):
⚠️ IMPORTANTE: Tutti i suggerimenti sono per PREPARAZIONE PRE-PARTITA. Il cliente applica queste modifiche PRIMA di giocare.

{
  "analysis": {
    "opponent_formation_analysis": "Analisi formazione avversaria (breve, professionale)...",
    "is_meta_formation": ${String(metaInfo.isMeta)},
    "meta_type": ${metaInfo.isMeta && metaInfo.metaType ? JSON.stringify(metaInfo.metaType) : 'null'},
    "strengths": ["Punto forza 1", "Punto forza 2"],
    "weaknesses": ["Punto debole 1", "Punto debole 2"]
  },
  "countermeasures": {
    "formation_adjustments": [
      {
        "type": "formation_change",
        "suggestion": "Cambia da 4-3-3 a 3-5-2",
        "reason": "Motivazione breve e diretta (1-2 righe max)",
        "priority": "high"
      }
    ],
    "tactical_adjustments": [
      {
        "type": "playing_style_change",
        "suggestion": "Usa contropiede veloce",
        "reason": "Motivazione breve (1 riga)",
        "priority": "medium"
      },
      {
        "type": "defensive_line",
        "suggestion": "bassa",
        "reason": "Motivazione breve (1 riga)",
        "priority": "high"
      },
      {
        "type": "pressing",
        "suggestion": "contenimento",
        "reason": "Motivazione breve (1 riga)",
        "priority": "high"
      },
      {
        "type": "possession_strategy",
        "suggestion": "controllo",
        "reason": "Motivazione breve (1 riga)",
        "priority": "medium"
      }
    ],
    "player_suggestions": [
      {
        "player_id": "uuid dalla lista TITOLARI o RISERVE",
        "player_name": "Nome Giocatore",
        "action": "add_to_starting_xi (solo riserve) o remove_from_starting_xi (solo titolari)",
        "position": "SP",
        "reason": "Motivazione breve 1 riga (es: 'Rating storico 8.2 contro formazioni simili')",
        "priority": "high"
      }
    ],
    "individual_instructions": [
      {
        "slot": "attacco_1",
        "player_id": "uuid",
        "instruction": "offensivo",
        "reason": "Motivazione breve 1 riga"
      }
    ]
  },
  "confidence": 85,
  "data_quality": "high",
  "warnings": ["Avvertimento 1", "Avvertimento 2"]
}

IMPORTANTE - PREPARAZIONE PRE-PARTITA: 
- Rispondi SOLO in formato JSON valido
- Non includere markdown o codice
- Ogni suggerimento deve avere reason (breve, diretto, 1 riga max, senza ragionamenti espliciti)
- Priorità: "high", "medium" o "low"
- player_suggestions: usa SOLO player_id dagli elenchi TITOLARI/RISERVE; add_to_starting_xi solo per riserve, remove_from_starting_xi solo per titolari
- Se dati insufficienti, imposta data_quality a "low" e aggiungi warnings
- ENTERPRISE: Focus su robustezza. Se non sei sicuro, meglio generico che sbagliato.
- TUTTI i suggerimenti sono modifiche configurabili PRIMA della partita (formazione, stile, giocatori, istruzioni)

⚠️ REGOLE CRITICHE - CAMPO "reason":
- Il campo "reason" deve contenere solo una breve motivazione diretta (1-2 righe)
- NON spiegare ragionamenti tattici espliciti
- NON dire "perché" o "perché l'avversario ha X quindi Y"
- NON inventare azioni specifiche: dribbling, passaggi, tiri, contrasti, recuperi, ecc.
- NON analizzare video o azioni: abbiamo SOLO rating/voti, NON dettagli su come ha giocato
- NON inferire cause: competenze allenatore, win rate, performance storiche ≠ cause dirette
- NON confondere caratteristiche (skills, overall, base stats) con performance match
- Dire solo il risultato: "Usa 4-2-3-1. Funziona." (non "Usa 4-2-3-1 perché l'avversario ha 4-3-3 con centrocampo forte ma ali isolate")
- Se menzioni performance giocatori, usa SOLO rating: "Giocatore X ha performato bene (rating 8.5)" (non "ha fatto dribbling")
- Se menzioni caratteristiche giocatore, dì che sono caratteristiche: "Messi: overall 99, skills Dribbling" (non "farà dribbling")
- Essere professionale, fermo, diretto

⚠️ REGOLA PRUDENZA - MEMORIA ATTILA (CRITICO):
- USA i dati memoria Attila per ragionare INTERNAMENTE, ma nel campo "reason" comunica SOLO decisioni chiare
- SE NON SEI SICURO di una compatibilità/sinergia/stile, NON menzionarla esplicitamente nel "reason"
- MEGLIO GENERICO CHE SBAGLIATO: "Usa Messi in campo" invece di "Usa Messi perché ha stile X compatibile con Y" (se non sei certo)
- Se sei SICURO (dati chiari, match esatti), puoi essere specifico: "Messi: posizione originale AMF" (se verificato)
- NON inventare sinergie o compatibilità se non sei certo: meglio non menzionarle
- COMUNICA SOLO DECISIONI: "Usa 4-2-3-1" non "Usa 4-2-3-1 perché stile X è compatibile con Y" (a meno che non sia ovvio e sicuro)
- Il cliente vuole DECISIONI, non spiegazioni tecniche complesse che potrebbero essere sbagliate`
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
