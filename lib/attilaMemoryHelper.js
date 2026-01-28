/**
 * Helper per gestione modulare memoria Attila
 * Sistema RAG (Retrieval-Augmented Generation) con caricamento selettivo
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Supporto ESM (Next.js)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cache moduli in memoria (Node.js)
const moduleCache = new Map()

// Path cartella memoria Attila
const MEMORIA_ATTILA_PATH = path.join(__dirname, '..', 'memoria_attila')

/**
 * Carica un modulo memoria Attila con caching
 * @param {string} moduleName - Nome modulo (es: '01_statistiche_giocatori')
 * @returns {Promise<string>} Contenuto modulo
 */
export async function loadAttilaModule(moduleName) {
  // Verifica cache
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName)
  }

  // Carica da file
  const filePath = path.join(MEMORIA_ATTILA_PATH, `${moduleName}.md`)
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    moduleCache.set(moduleName, content)
    return content
  } catch (error) {
    console.error(`[AttilaMemory] Error loading module ${moduleName}:`, error)
    return '' // Fallback: ritorna stringa vuota invece di crashare
  }
}

/**
 * Carica più moduli contemporaneamente
 * @param {string[]} moduleNames - Array nomi moduli
 * @returns {Promise<string>} Contenuto combinato moduli
 */
export async function loadAttilaModules(moduleNames) {
  const contents = await Promise.all(
    moduleNames.map(name => loadAttilaModule(name))
  )
  
  // Combina moduli con separatore
  return contents
    .filter(content => content.length > 0) // Rimuovi moduli vuoti
    .join('\n\n---\n\n')
}

/**
 * Seleziona moduli memoria Attila basati su contesto
 * @param {Object} context - Contesto richiesta
 * @param {string} context.type - Tipo richiesta ('countermeasures', 'analyze-match', 'assistant-chat')
 * @param {boolean} context.hasPlayerRatings - Se ci sono player_ratings
 * @param {boolean} context.hasTeamPlayingStyle - Se c'è team_playing_style
 * @param {boolean} context.needsDevelopmentAnalysis - Se serve analisi sviluppo
 * @param {boolean} context.needsSetPiecesAnalysis - Se serve analisi set pieces
 * @param {boolean} context.needsMechanics - Se servono meccaniche gioco
 * @returns {Promise<string[]>} Array nomi moduli da caricare
 */
export async function selectAttilaModules(context) {
  const modules = []
  
  // Moduli sempre necessari per tipo richiesta
  if (context.type === 'countermeasures') {
    modules.push('02_stili_gioco', '03_moduli_tattici', '08_consigli_strategie')
  } else if (context.type === 'analyze-match') {
    modules.push('08_consigli_strategie')
  } else if (context.type === 'assistant-chat') {
    // Assistant chat: solo se necessario
    if (context.needsMechanics) {
      modules.push('07_meccaniche_gioco')
    }
  }
  
  // Moduli condizionali
  if (context.hasPlayerRatings) {
    modules.push('01_statistiche_giocatori')
  }
  
  if (context.hasTeamPlayingStyle) {
    modules.push('05_stili_tattici_squadra')
  }
  
  if (context.needsDevelopmentAnalysis) {
    modules.push('04_competenze_sviluppo')
  }
  
  if (context.needsSetPiecesAnalysis) {
    modules.push('06_calci_piazzati')
  }
  
  // Rimuovi duplicati
  return [...new Set(modules)]
}

/**
 * Carica memoria Attila selettiva basata su contesto
 * @param {Object} context - Contesto richiesta (vedi selectAttilaModules)
 * @returns {Promise<string>} Contenuto memoria Attila selettiva
 */
export async function loadAttilaMemory(context) {
  const moduleNames = await selectAttilaModules(context)
  
  if (moduleNames.length === 0) {
    return '' // Nessun modulo necessario
  }
  
  const content = await loadAttilaModules(moduleNames)
  
  // Aggiungi header se presente contenuto
  if (content.length > 0) {
    return `📌 MEMORIA ATTILA - eFootball (Moduli: ${moduleNames.join(', ')})\n\n${content}`
  }
  
  return content
}

/**
 * Invalida cache modulo (utile per aggiornamenti)
 * @param {string} moduleName - Nome modulo da invalidare
 */
export function invalidateModuleCache(moduleName) {
  if (moduleName) {
    moduleCache.delete(moduleName)
  } else {
    // Invalida tutto
    moduleCache.clear()
  }
}

/**
 * Ottieni statistiche cache
 * @returns {Object} Statistiche cache
 */
export function getCacheStats() {
  return {
    cachedModules: moduleCache.size,
    moduleNames: Array.from(moduleCache.keys())
  }
}
