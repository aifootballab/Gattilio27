// Configurazione completa Istruzioni Individuali eFootball
// Basata su ricerche e immagini fornite

export const INDIVIDUAL_INSTRUCTIONS_CONFIG = {
  attacco_1: {
    nameKey: 'attack1',
    descriptionKey: 'attack1Description',
    // Filtra giocatori: solo attaccanti/ali/centrocampisti offensivi
    filterPlayers: (players) => players.filter(p => 
      p.position && ['SP', 'EDA', 'ESA', 'CLS', 'CLD', 'P', 'CF', 'TRQ', 'CC'].includes(p.position)
    ),
    availableInstructions: [
      { id: 'ancoraggio', nameKey: 'anchoring' },
      { id: 'attacco_spazio', nameKey: 'attackSpace' },
      { id: 'contropiede', nameKey: 'counterTarget' },
      { id: 'offensivo', nameKey: 'offensive' }
    ]
  },
  
  attacco_2: {
    nameKey: 'attack2',
    descriptionKey: 'attack2Description',
    filterPlayers: (players) => players.filter(p => 
      p.position && ['SP', 'EDA', 'ESA', 'CLS', 'CLD', 'P', 'CF', 'TRQ', 'CC'].includes(p.position)
    ),
    availableInstructions: [
      { id: 'ancoraggio', nameKey: 'anchoring' },
      { id: 'attacco_spazio', nameKey: 'attackSpace' },
      { id: 'contropiede', nameKey: 'counterTarget' },
      { id: 'offensivo', nameKey: 'offensive' }
    ]
  },
  
  difesa_1: {
    nameKey: 'defense1',
    descriptionKey: 'defense1Description',
    // Filtra giocatori: solo difensori/centrocampisti difensivi
    filterPlayers: (players) => players.filter(p => 
      p.position && ['TD', 'TS', 'DC', 'MED', 'CC'].includes(p.position)
    ),
    availableInstructions: [
      { id: 'linea_bassa', nameKey: 'deepLine' },
      { id: 'difensivo', nameKey: 'defensive' },
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' }
    ]
  },
  
  difesa_2: {
    nameKey: 'defense2',
    descriptionKey: 'defense2Description',
    filterPlayers: (players) => players.filter(p => 
      p.position && ['TD', 'TS', 'DC', 'MED', 'CC'].includes(p.position)
    ),
    availableInstructions: [
      { id: 'linea_bassa', nameKey: 'deepLine' },
      { id: 'difensivo', nameKey: 'defensive' },
      { id: 'marcatura_stretta', nameKey: 'tightMarking' },
      { id: 'marcatura_uomo', nameKey: 'manMarking' }
    ]
  }
}

// Validazione: verifica che giocatore e istruzione siano compatibili
export function validateIndividualInstruction(category, playerId, instruction, titolari) {
  const config = INDIVIDUAL_INSTRUCTIONS_CONFIG[category]
  
  if (!config) {
    return { valid: false, error: 'Invalid category' }
  }
  
  // Verifica che il giocatore esista e sia titolare
  const player = titolari.find(p => p.id === playerId)
  if (!player) {
    return { valid: false, error: 'Player not found or not in starting lineup' }
  }
  
  // Verifica che la posizione sia compatibile
  const compatiblePlayers = config.filterPlayers(titolari)
  if (!compatiblePlayers.find(p => p.id === playerId)) {
    return { 
      valid: false, 
      error: `Player position ${player.position} not compatible with ${category}` 
    }
  }
  
  // Verifica che l'istruzione sia disponibile
  const instructionObj = config.availableInstructions.find(i => i.id === instruction)
  if (!instructionObj) {
    return { 
      valid: false, 
      error: `Instruction ${instruction} not available for ${category}` 
    }
  }
  
  return { valid: true, config, player, instructionObj }
}
