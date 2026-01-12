// Utility per parsing dati OCR da Google Vision API

/**
 * Estrae nome giocatore dal testo OCR
 */
export function extractPlayerName(textAnnotations, fullText) {
  if (!textAnnotations || textAnnotations.length === 0) {
    return 'Unknown Player'
  }

  // Pattern per nomi (due parole maiuscole/minuscole)
  const namePatterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, // "Kylian Mbappé" o "Johan Cruyff"
    /([A-Z][A-Z]+ [A-Z][a-z]+)/g, // "DE BRUYNE Kevin"
  ]

  // Cerca nei primi 10 risultati (più probabili)
  const topAnnotations = textAnnotations.slice(0, 10)
  
  for (const annotation of topAnnotations) {
    const text = annotation.description || ''
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern)
      if (match && match[0].length > 5) { // Almeno 5 caratteri
        return match[0].trim()
      }
    }
  }

  // Fallback: cerca nel full text
  for (const pattern of namePatterns) {
    const matches = fullText.match(pattern)
    if (matches && matches.length > 0) {
      return matches[0].trim()
    }
  }

  return 'Unknown Player'
}

/**
 * Estrae overall rating
 */
export function extractOverallRating(textAnnotations, fullText) {
  // Pattern per rating (90-99 o 100+)
  const ratingPatterns = [
    /\b(1[0-2][0-9]|9[0-9]|[1-9][0-9])\b/g, // 10-129
  ]

  // Cerca nei primi risultati (più probabili)
  const topAnnotations = textAnnotations.slice(0, 5)
  
  for (const annotation of topAnnotations) {
    const text = annotation.description || ''
    const matches = text.match(/\b(9[0-9]|[1-9][0-9])\b/)
    if (matches) {
      const rating = parseInt(matches[0])
      if (rating >= 50 && rating <= 120) {
        return rating
      }
    }
  }

  // Fallback: cerca nel full text
  const matches = fullText.match(/\b(9[0-9]|[1-9][0-9])\b/)
  if (matches) {
    const rating = parseInt(matches[0])
    if (rating >= 50 && rating <= 120) {
      return rating
    }
  }

  return 0
}

/**
 * Estrae posizione
 */
export function extractPosition(textAnnotations, fullText) {
  const positions = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF']
  
  const searchText = fullText.toUpperCase()
  
  for (const pos of positions) {
    if (searchText.includes(pos)) {
      return pos
    }
  }

  return 'CF' // Default
}

/**
 * Estrae statistiche attacco
 */
export function extractAttackingStats(textAnnotations, fullText) {
  const stats = {
    offensiveAwareness: extractStatValue(fullText, ['Offensive Awareness', 'Comportamento offensivo']),
    ballControl: extractStatValue(fullText, ['Ball Control', 'Controllo palla']),
    dribbling: extractStatValue(fullText, ['Dribbling']),
    tightPossession: extractStatValue(fullText, ['Tight Possession', 'Possesso stretto']),
    lowPass: extractStatValue(fullText, ['Low Pass', 'Passaggio basso']),
    loftedPass: extractStatValue(fullText, ['Lofted Pass', 'Passaggio alto']),
    finishing: extractStatValue(fullText, ['Finishing', 'Finalizzazione']),
    heading: extractStatValue(fullText, ['Heading', 'Colpo di testa']),
    placeKicking: extractStatValue(fullText, ['Place Kicking', 'Tiro piazzato']),
    curl: extractStatValue(fullText, ['Curl', 'Effetto'])
  }

  return stats
}

/**
 * Estrae statistiche difesa
 */
export function extractDefendingStats(textAnnotations, fullText) {
  const stats = {
    defensiveAwareness: extractStatValue(fullText, ['Defensive Awareness', 'Comportamento difensivo']),
    defensiveEngagement: extractStatValue(fullText, ['Defensive Engagement', 'Coinvolgimento difensivo']),
    tackling: extractStatValue(fullText, ['Tackling', 'Contrasto']),
    aggression: extractStatValue(fullText, ['Aggression', 'Aggressività']),
    goalkeeping: extractStatValue(fullText, ['Goalkeeping', 'Portiere']),
    gkCatching: extractStatValue(fullText, ['GK Catching', 'Parata']),
    gkParrying: extractStatValue(fullText, ['GK Parrying', 'Respinta']),
    gkReflexes: extractStatValue(fullText, ['GK Reflexes', 'Riflessi']),
    gkReach: extractStatValue(fullText, ['GK Reach', 'Portata'])
  }

  return stats
}

/**
 * Estrae statistiche atletiche
 */
export function extractAthleticismStats(textAnnotations, fullText) {
  const stats = {
    speed: extractStatValue(fullText, ['Speed', 'Velocità']),
    acceleration: extractStatValue(fullText, ['Acceleration', 'Accelerazione']),
    kickingPower: extractStatValue(fullText, ['Kicking Power', 'Potenza tiro']),
    jump: extractStatValue(fullText, ['Jump', 'Salto']),
    physicalContact: extractStatValue(fullText, ['Physical Contact', 'Contatto fisico']),
    balance: extractStatValue(fullText, ['Balance', 'Equilibrio']),
    stamina: extractStatValue(fullText, ['Stamina', 'Resistenza']),
    weakFootUsage: extractStatValue(fullText, ['Weak Foot Usage', 'Uso piede debole'], 1, 4),
    weakFootAccuracy: extractStatValue(fullText, ['Weak Foot Accuracy', 'Precisione piede debole'], 1, 4),
    form: extractStatValue(fullText, ['Form', 'Forma'], 1, 8),
    injuryResistance: extractStatValue(fullText, ['Injury Resistance', 'Resistenza infortuni'], 1, 3)
  }

  return stats
}

/**
 * Helper: Estrae valore statistico dal testo
 */
function extractStatValue(fullText, searchTerms, min = 0, max = 99) {
  const upperText = fullText.toUpperCase()
  
  for (const term of searchTerms) {
    const upperTerm = term.toUpperCase()
    const index = upperText.indexOf(upperTerm)
    
    if (index !== -1) {
      // Cerca numero dopo il termine (max 50 caratteri)
      const substring = fullText.substring(index, index + 50)
      const numberMatch = substring.match(/\b(\d{1,3})\b/)
      
      if (numberMatch) {
        const value = parseInt(numberMatch[1])
        if (value >= min && value <= max) {
          return value
        }
      }
    }
  }

  return null
}

/**
 * Estrae skills
 */
export function extractSkills(textAnnotations, fullText) {
  const commonSkills = [
    'Heading', 'Long Range Drive', 'Chip Shot Control', 'Heel Trick',
    'First Time Shot', 'One Touch Pass', 'Through Passing', 'Outside Curler',
    'Penalty Specialist', 'Fighting Spirit', 'Scissors Feint', 'Double Touch',
    'Cross Over Turn', 'Cut Behind & Turn', 'Sole Control', 'Step On Skill Control',
    'Marseille Turn', 'Sombrero', 'Flip Flap', 'Interception', 'Man Marking',
    'Track Back', 'Acrobatic Clear', 'Captaincy', 'GK Long Throw', 'GK High Punt',
    'GK Low Punt', 'Long Throw', 'Low Lofted Pass', 'Weighted Pass', 'Pinpoint Crossing',
    'Early Cross', 'Rising Shot', 'Knuckle Shot', 'Dipping Shot', 'Long Range Shooting',
    'Chip Shot', 'Acrobatic Finishing', 'First-time Shot', 'One-touch Pass',
    'Weighted Pass', 'No Look Pass', 'Low Lofted Pass', 'Through Passing',
    'Rabona', 'No Look Pass', 'Low Lofted Pass', 'Long Ball Expert', 'Blocker',
    'Super-sub', 'Injury Resistance', 'Gamesmanship', 'Fighting Spirit'
  ]

  const foundSkills = []
  const upperText = fullText.toUpperCase()

  for (const skill of commonSkills) {
    const upperSkill = skill.toUpperCase()
    if (upperText.includes(upperSkill)) {
      foundSkills.push(skill)
    }
  }

  return foundSkills
}

/**
 * Estrae COM Skills
 */
export function extractComSkills(textAnnotations, fullText) {
  const comSkills = [
    'MazingRun', 'IncisiveRun', 'LongRanger', 'EarlyCross', 'Blocker',
    'Track Back', 'Interception', 'Penalty Specialist', 'GK Long Throw',
    'GK High Punt', 'GK Low Punt', 'Long Throw', 'Captaincy'
  ]

  const foundSkills = []
  const upperText = fullText.toUpperCase()

  for (const skill of comSkills) {
    const upperSkill = skill.toUpperCase()
    if (upperText.includes(upperSkill)) {
      foundSkills.push(skill)
    }
  }

  return foundSkills
}

/**
 * Estrae build data (se visibile)
 */
export function extractBuild(textAnnotations, fullText) {
  // Pattern per level cap
  const levelCapMatch = fullText.match(/Level Cap[:\s]+(\d+)/i)
  const levelCap = levelCapMatch ? parseInt(levelCapMatch[1]) : null

  // Pattern per current level
  const currentLevelMatch = fullText.match(/(\d+)\s*\/\s*(\d+)/)
  const currentLevel = currentLevelMatch ? parseInt(currentLevelMatch[1]) : null

  // Pattern per development points (da implementare meglio)
  const developmentPoints = {
    shooting: extractDevPoint(fullText, ['Shooting']),
    passing: extractDevPoint(fullText, ['Passing']),
    dribbling: extractDevPoint(fullText, ['Dribbling']),
    dexterity: extractDevPoint(fullText, ['Dexterity']),
    lowerBodyStrength: extractDevPoint(fullText, ['Lower Body Strength', 'Lower Body']),
    aerialStrength: extractDevPoint(fullText, ['Aerial Strength', 'Aerial']),
    defending: extractDevPoint(fullText, ['Defending']),
    gk1: extractDevPoint(fullText, ['GK 1', 'GK1']),
    gk2: extractDevPoint(fullText, ['GK 2', 'GK2']),
    gk3: extractDevPoint(fullText, ['GK 3', 'GK3'])
  }

  // Pattern per booster
  const boosterMatch = fullText.match(/([A-Za-z\s]+\s*\+\s*\d+)/)
  const activeBooster = boosterMatch ? boosterMatch[1].trim() : null

  if (levelCap || currentLevel || Object.values(developmentPoints).some(v => v !== null)) {
    return {
      levelCap,
      currentLevel,
      developmentPoints,
      activeBooster
    }
  }

  return null
}

/**
 * Helper: Estrae development point
 */
function extractDevPoint(fullText, searchTerms) {
  for (const term of searchTerms) {
    const index = fullText.toUpperCase().indexOf(term.toUpperCase())
    if (index !== -1) {
      const substring = fullText.substring(index, index + 30)
      const numberMatch = substring.match(/\b(\d{1,2})\b/)
      if (numberMatch) {
        const value = parseInt(numberMatch[1])
        if (value >= 0 && value <= 99) {
          return value
        }
      }
    }
  }
  return null
}
