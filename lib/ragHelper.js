/**
 * RAG Helper per info_rag.md
 * Recupero sezioni rilevanti per domande eFootball nella chat di supporto.
 * Fase 1 MVP: keyword + parsing per ## (sezioni).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** Path info_rag.md: su Vercel __dirname è nel bundle, non in lib/; usiamo cwd (project root). */
function getInfoRagPath() {
  const fromCwd = path.join(process.cwd(), 'info_rag.md')
  if (fs.existsSync(fromCwd)) return fromCwd
  const fromDirname = path.join(__dirname, '..', 'info_rag.md')
  if (fs.existsSync(fromDirname)) return fromDirname
  return fromCwd
}

/** Cache contenuto e sezioni (in memoria) */
let cachedContent = null
let cachedSections = null

/** Massimo caratteri per sezioni RAG in una singola richiesta (limite token/costo) */
const DEFAULT_MAX_CHARS = 18000

/**
 * Mappa: titolo sezione (come in info_rag) -> parole chiave per matching (minuscolo)
 * Le keyword servono per capire quando includere la sezione in base al messaggio utente.
 */
const SECTION_KEYWORDS = {
  'STILI DI GIOCO DEI GIOCATORI (FIASSE)': [
    'stili gioco', 'stile giocatore', 'opportunista', 'rapace d area', 'rapace', 'regista creativo',
    'collante', 'orchestrator', 'terzino', 'portiere', 'ruoli', 'ala prolifica', 
    'fulcro', 'classico 10', 'giocatore chiave', 'onnipresente', 'incontrista', 'sviluppo',
    'tra le linee', 'difensore distruttore', 'frontale extra', 'senza palla', 'specialista cross',
    'taglio al centro', 'terzino offensivo', 'terzino difensivo', 'terzino mattatore',
    'portiere offensivo', 'portiere difensivo', 'funambolo', 'serpentina', 'treno in corsa',
    'inserimento', 'esperto palle lunghe', 'crossatore', 'tiratore'
  ],
  'COMANDI E MECCANICHE': [
    'comando', 'comandi', 'tasto', 'passaggio sensazionale', 'tocco secco', 
    'passaggio filtrante', 'cross', 'tiro', 'pressure', 'match-up', 'match up', 
    'chiama pressing', 'testa a testa', 'contrasto spalla', 'protezione',
    'uno-due', 'uno due', 'l1 piu x', 'tiro sensazionale', 'tiro calibrato',
    'dribbling di precisione', 'controllo palla', 'finta'
  ],
  'ISTRUZIONI INDIVIDUALI E SCHEMI': [
    'istruzione individuale', 'istruzioni individuali', 'istruzioni',
    'ancoraggio', 'anchoring', 'linea bassa', 'linea alta', 'deep line', 'high line',
    'marcatura stretta', 'marcatura uomo', 'tight marking', 'man marking',
    'contropiede', 'counter target', 'difensivo', 'offensivo', 'defensive', 'offensive',
    'pre-partita', 'in partita', 'slot offensive', 'slot difensive'
  ],
  'MECCANICHE DIFENSIVE AVANZATE': [
    'match-up', 'match up', 'manual defending', 'difesa manuale', 'pressing', 'pressure',
    'call for pressure', 'shadow marking', 'linea difensiva', 'marcatura', 'contrasto spalla',
    'anticipazione', 'switchare', 'difendere', 'difesa', 'sliding tackle', 'posizionamento difensivo',
    'switch intelligente', 'cb vs midfielder', 'difesa compatta'
  ],
  'DRIBBLING E SKILLS': [
    'dribbling', 'skill', 'skills', 'finta', 'doppio passo', 'elastic', 'veronica',
    'sombrero', 'tocco', 'superare', 'uno contro uno', 'finesse dribbling', 'sharp touch',
    'momentum', 'shield', '180 turn', 'chain skills', 'footwork'
  ],
  'CONTROLLO E RICEZIONE PALLA': [
    'controllo palla', 'ricezione', 'controllo', 'primo tocco', 'stop', 'trap',
    'sharp touch trap', 'trick trap', 'trap aereo'
  ],
  'CALCI PIAZZATI': [
    'calci piazzati', 'corner', 'punizione', 'free kick', 'calcio angolo', 'rigore',
    'set piece', 'cross area', 'corner corto', 'barriera', 'knuckle shot', 'dipping shot',
    'trivela', 'low driven', 'under the wall', 'rolling free kick', 'secondo tiratore'
  ],
  'STILI DI GIOCO SQUADRA': [
    'stile squadra', 'stile di gioco squadra', 'possesso palla', 'contropiede',
    'contropiede veloce', 'contrattacco', 'passaggio lungo', 'vie laterali', 'out wide',
    'possesso', 'contropiede veloce', 'out wide playstyle', 'tattica fasce',
    'cross specialist', 'switch play', 'overload'
  ],
  // Rimossa sezione PLAYSTYLES - duplicata in STILI DI GIOCO con termini ufficiali
  'RUOLI SPECIFICI E COMPORTAMENTI': [
    'ruoli', 'portiere', 'terzino', 'mediano', 'ala', 'centrocampista', 'difensore',
    'comportamento', 'ruolo', 'portiere difensivo', 'portiere offensivo',
    'terzino difensivo', 'terzino offensivo', 'terzino mattatore',
    'ala tagliente', 'ala pura', 'regista basso', 'mezzala'
  ],
  'STATISTICHE GIOCATORI': [
    'statistica', 'statistiche', 'rating', 'attributo', 'velocità', 'finalizzazione',
    'contrasto', 'riflessi', 'colpo di testa', 'passaggio rasoterra', 'resistenza'
  ],
  'CARATTERISTICHE FISICHE E TECNICHE': [
    'caratteristiche fisiche', 'velocità', 'fisicità', 'stamina', 'dribbling', 'passaggio',
    'tiro', 'resistenza', 'attributi'
  ],
  'RESISTENZA E STATISTICHE FISICHE': [
    'resistenza', 'statistiche fisiche', 'degradazione resistenza',
    'velocità massima', 'accelerazione', 'contatto fisico', 'controllo corpo', 'equilibrio'
  ],
  'BUILD DEI GIOCATORI': [
    'build', 'altezza', 'peso', 'meta', 'fisico', 'velocità accelerazione', 'stamina',
    'build difensore', 'build centrocampista', 'build attaccante', 'soglie critiche'
  ],
  'MODULI TATTICI': [
    'modulo', 'formazione', '4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2',
    'moduli', 'difensori', 'centrocampisti', 'attaccanti'
  ],
  'MOVIMENTI COLLETTIVI': [
    'triangolazione', 'sovrapposizione', 'movimenti', 'collettivo', 'uno-due', 'one-two',
    'taglio', 'ampiezza', 'compattezza'
  ],
  'SCHEMI OFFENSIVI': [
    'schemi offensivi', 'costruzione', 'finalizzazione', 'transizioni',
    'trust the run', 'attacco', 'lettura avversario'
  ],
  'PASSAGGI E COSTRUZIONE': [
    'passaggio', 'passaggi', 'passaggio rasoterra', 'passaggio alto', 
    'passaggio filtrante', 'passaggio sensazionale', 'costruzione gioco'
  ],
  'SITUAZIONI DI GIOCO': [
    'situazione', 'transizione', 'contropiede', 'palla persa', 'palla vinta', 'fase',
    'transizione positiva', 'transizione negativa', 'gestione vantaggio', 'recupero svantaggio'
  ],
  'BEST PRACTICES E CONSIGLI PRATICI': [
    'consiglio', 'pratica', 'best practice', 'suggerimento', 'consigli',
    'costruzione squadra', 'errori da evitare', 'principi tattici'
  ],
  'FUNZIONI ASSISTITE': [
    'sostituzioni automatiche', 'sostituzione', 'substitution', 'auto sub', 'bench',
    'funzioni assistite', 'assistenze', 'squadra automatica'
  ],
  'NOTE PER L\'IA': [
    'regola', 'risposta', 'non inventare'
  ],
  'SISTEMA COMPETENZE POSIZIONE': [
    'competenza posizione', 'posizione', 'slot posizione', 'aggiunta posizione',
    'trending', 'livello competenza', 'tipologie giocatori', 'valore giocatore'
  ],
  'FORZA BASE vs FORZA COMPLESSIVA': [
    'forza base', 'forza complessiva', 'overall', 'rating squadra'
  ],
  'LIMITAZIONI MODIFICA POSIZIONE': [
    'modifica posizione', 'cambio posizione', 'limitazione'
  ],
  'ABILITÀ GIOCATORI (MISTE)': [
    'abilità', 'abilità giocatore', 'programmi aggiunta abilità', 'trending',
    'tiro al volo', 'tiro a giro', 'tiro potente', 'punta di precisione',
    'tiro a scendere', 'tiro a salire', 'a giro da distante', 'esterno a giro',
    'colpo di testa', 'tiro acrobatico', 'finalizzazione', 'distanza',
    'passaggio di prima', 'passaggio al volo', 'passaggio filtrante',
    'lancio lungo preciso', 'cross preciso', 'passaggio sensazionale',
    'doppio tocco', 'elastico', 'controllo di suola', 'doppio tocco speciale',
    'stop acrobatico', 'finta tiro', 'finta passaggio', 'tocco secco',
    'contrasto aggressivo', 'intercettazione', 'marcatura',
    'entrata aggressiva', 'sliding tackle',
    'riflessi felini', 'presa sicura', 'uscita portiere',
    'parata con piedi', 'piazzamento', 'estensione pt',
    'scatto', 'resistenza superiore', 'forza fisica', 'agilità superiore',
    'salto', 'velocità', 'leader', 'specialista cross',
    'specialista punizioni', 'specialista rigori', 'tiratore'
  ],
  'TIRO E FINALIZZAZIONE': [
    'tiro', 'tiro al volo', 'tiro a giro', 'tiro potente', 'punta di precisione', 'tiro di precisione',
    'timed shot', 'low driven', 'chip shot', 'trivela', 'one touch', 'heel trick', 'finalizzazione',
    'distanza', 'volt shot', 'curved shot', 'powerful shot', 'acute goal scorer', 'shooting'
  ],
  'TATTICHE AVANZATE': [
    'tattiche avanzate', 'building from the back', 'pressing alto', 'catenaccio', 'falso 9', 'falso nove',
    'wing overload', 'tiki-taka', 'contropiede', 'possesso palla', 'transizione', 'transizioni',
    'gioco posizionale', 'verticalità', 'attacco', 'tattica', 'strategia', 'schema', 'approccio tattico'
  ],
  // Nuove sezioni v6.1.0 - keywords consolidate sopra
  'STATISTICHE E VALORI GIOCATORI': [
    'statistiche', 'overall', 'valore giocatore', 'vg', 'stelle',
    'statistiche tecniche', 'statistiche difensive', 'statistiche portiere',
    'frequenza piede debole', 'precisione piede debole', 'forma', 'resistenza infortuni'
  ],
  'REQUISITI DI SISTEMA E TECNICI': [
    'requisiti sistema', 'device', 'connessione', 'network', 'manual defending requisiti',
    'lag', 'delay', 'fps', 'controller', 'input lag'
  ],
  'GLOSSARIO TERMINI eFootball': [
    'glossario', 'termini', 'termine', 'significato', 'cosa significa', 'definizione',
    'play style', 'tactic', 'formation', 'counter', 'high line', 'low block'
  ],
  'NOTE FINALI E BEST PRACTICES': [
    'best practices', 'comportamento consigliato', 'errori da evitare', 'allenamento consigliato',
    'consigli pratici', 'linee guida', 'come migliorare', 'pratica'
  ],
  'CONSIGLI TECNICI AVANZATI': [
    'consiglio tecnico', 'avanzato', 'tecnica', 'tiri mancati', 'rigori'
  ],
  'SISTEMA REPORT E MACHINE LEARNING': [
    'report', 'machine learning', 'classificazione eventi', 'modelli predittivi',
    'heatmap', 'timeline', 'benchmark', 'feedback'
  ]
}

/**
 * Carica il contenuto di info_rag.md (con cache)
 * @returns {string}
 */
function loadInfoRagContent() {
  if (cachedContent !== null) return cachedContent
  const infoRagPath = getInfoRagPath()
  try {
    cachedContent = fs.readFileSync(infoRagPath, 'utf-8')
    if (cachedContent && cachedContent.length > 0) {
      console.log('[ragHelper] info_rag.md loaded, length:', cachedContent.length)
    }
    return cachedContent
  } catch (error) {
    console.error('[ragHelper] Error loading info_rag.md:', error.message, 'path:', infoRagPath)
    return ''
  }
}

/**
 * Parsing: spezza il file per sezioni ## TITOLO (riga che inizia con ## ).
 * content = solo corpo della sezione (senza la riga ## TITOLO).
 * @param {string} content
 * @returns {Array<{ title: string, content: string }>}
 */
function parseSections(content) {
  if (!content || content.trim().length === 0) return []

  const sections = []
  const re = /^## (.+)$/gm
  let match
  let lastTitle = null
  let lastBodyStart = 0

  while ((match = re.exec(content)) !== null) {
    if (lastTitle !== null) {
      const bodyEnd = match.index
      const sectionContent = content.slice(lastBodyStart, bodyEnd).trim()
      if (sectionContent.length > 0) {
        sections.push({ title: lastTitle, content: sectionContent })
      }
    }
    lastTitle = match[1].trim()
    lastBodyStart = match.index + match[0].length
    if (content[lastBodyStart] === '\n') lastBodyStart += 1
  }
  if (lastTitle !== null) {
    const sectionContent = content.slice(lastBodyStart).trim()
    if (sectionContent.length > 0) {
      sections.push({ title: lastTitle, content: sectionContent })
    }
  }

  return sections
}

/**
 * Restituisce le sezioni parse (con cache)
 * @returns {Array<{ title: string, content: string }>}
 */
function getSections() {
  if (cachedSections !== null) return cachedSections
  const content = loadInfoRagContent()
  cachedSections = parseSections(content)
  return cachedSections
}

/**
 * Conta quante keyword della sezione compaiono nel messaggio (normalizzato)
 * @param {string} sectionTitle
 * @param {string} messageNorm
 * @returns {number}
 */
function scoreSection(sectionTitle, messageNorm) {
  const keywords = SECTION_KEYWORDS[sectionTitle]
  if (!keywords || keywords.length === 0) return 0
  let count = 0
  for (const kw of keywords) {
    if (messageNorm.includes(kw)) count += 1
  }
  return count
}

/** Keyword per ruolo (stili giocatori): se il messaggio è chiaramente su un solo ruolo, restituiamo solo quel blocco */
const ROLE_ATTACCANTI_KEYWORDS = [
  'punte', 'punta', 'attaccanti', 'attaccante', 'striker', 'strikers', 'forward', 'forwards',
  'finalizzatore', 'ala prolifica', 'istinto di attacante', 'istinto attacante', 'opportunista', 'rapace area', 'fulcro',
  'eda', 'esa', 'p ', ' sp ', ' trq ', 'centravanti'
]
const ROLE_CENTROCAMPISTI_KEYWORDS = [
  'centrocampo', 'centrocampisti', 'centrocampista', 'mediano', 'mediani', 'collante',
  'box-to-box', 'tra le linee', 'sviluppo', 'incontrista', 'onnipresente', 'giocatore chiave',
  'med ', ' cc ', 'mezzala', 'trequartista'
]
const ROLE_DIFENSORI_KEYWORDS = [
  'difensori', 'difensore', 'difesa', 'terzino', 'terzini', 'centrale', 'dc ', ' td ', ' ts ',
  'difensore distruttore', 'frontale extra', 'stopper', 'libero'
]

/**
 * Restituisce il contenuto della sezione STILI DI GIOCO DEI GIOCATORI filtrato per ruolo.
 * Se il messaggio è chiaramente su attaccanti/punte → solo blocco ### Attaccanti (+ intro).
 * Se centrocampisti → solo ### Centrocampisti (+ intro). Se difensori → solo ### Difensori (+ intro).
 * Altrimenti restituisce il contenuto completo (coerenza enterprise: evita Collante per punte).
 * @param {string} userMessage - Messaggio utente (normalizzato non richiesto, fatto internamente)
 * @param {string} fullContent - Corpo completo della sezione STILI DI GIOCO DEI GIOCATORI
 * @returns {string}
 */
function getStiliContentFilteredByRole(userMessage, fullContent) {
  if (!fullContent || typeof fullContent !== 'string') return fullContent || ''
  const msg = (userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
  const hasAtt = ROLE_ATTACCANTI_KEYWORDS.some(kw => msg.includes(kw))
  const hasMid = ROLE_CENTROCAMPISTI_KEYWORDS.some(kw => msg.includes(kw))
  const hasDef = ROLE_DIFENSORI_KEYWORDS.some(kw => msg.includes(kw))
  const count = [hasAtt, hasMid, hasDef].filter(Boolean).length
  if (count !== 1) return fullContent

  const re = /^### (Attaccanti|Centrocampisti|Difensori)\s*$/gm
  const blocks = []
  let lastIndex = 0
  let match
  while ((match = re.exec(fullContent)) !== null) {
    if (lastIndex < match.index) {
      const chunk = fullContent.slice(lastIndex, match.index).trim()
      if (chunk.length > 0) blocks.push({ title: null, content: chunk })
    }
    lastIndex = match.index + match[0].length
    const nextMatch = re.exec(fullContent)
    re.lastIndex = nextMatch ? nextMatch.index : fullContent.length
    const end = nextMatch ? nextMatch.index : fullContent.length
    const body = fullContent.slice(lastIndex, end).trim()
    if (body.length > 0) blocks.push({ title: match[1], content: body })
    lastIndex = end
    if (!nextMatch) break
  }
  if (blocks.length === 0) return fullContent

  const intro = blocks.find(b => b.title === null)
  const introText = intro ? intro.content + '\n\n' : ''
  let chosen = null
  if (hasAtt) chosen = blocks.find(b => b.title === 'Attaccanti')
  else if (hasMid) chosen = blocks.find(b => b.title === 'Centrocampisti')
  else if (hasDef) chosen = blocks.find(b => b.title === 'Difensori')
  if (!chosen) return fullContent
  return introText + '### ' + chosen.title + '\n\n' + chosen.content
}

/**
 * Recupera le sezioni più rilevanti per il messaggio utente, fino a maxChars.
 * @param {string} userMessage - Messaggio dell'utente
 * @param {number} maxChars - Limite caratteri totale (default 18000)
 * @returns {string} - Blocco di testo (sezioni concatenate) da appendere al prompt
 */
export function getRelevantSections(userMessage, maxChars = DEFAULT_MAX_CHARS) {
  const sections = getSections()
  if (sections.length === 0) return ''

  const messageNorm = (userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')

  const scored = sections.map(s => ({
    ...s,
    score: scoreSection(s.title, messageNorm)
  }))

  scored.sort((a, b) => b.score - a.score)

  let total = 0
  const selected = []
  for (const s of scored) {
    if (total + s.content.length > maxChars && selected.length > 0) break
    if (s.score > 0 || selected.length < 2) {
      selected.push(s)
      total += s.content.length
    }
  }

  if (selected.length === 0) {
    const fallback = scored.slice(0, 4).filter(Boolean)
    for (const s of fallback) {
      if (total + s.content.length <= maxChars) {
        selected.push(s)
        total += s.content.length
      } else if (selected.length === 0) {
        selected.push(s)
        total += s.content.length
        break
      }
    }
  }

  return selected
    .map(s => {
      const content = s.title === 'STILI DI GIOCO DEI GIOCATORI'
        ? getStiliContentFilteredByRole(userMessage, s.content)
        : s.content
      return `## ${s.title}\n\n${content}`
    })
    .join('\n\n---\n\n')
}

/** Sezioni info_rag da includere per contesto "analyze-match" (strategie serie, analisi partita) */
const ANALYZE_MATCH_SECTION_TITLES = [
  '1. STATISTICHE GIOCATORI', '2. STILI DI GIOCO DEI GIOCATORI (FIASSE)', '3. MODULI TATTICI',
  '4. STILI TATTICI DI SQUADRA', '5. ISTRUZIONI INDIVIDUALI', '6. CALCI PIAZZATI',
  '7. MECCANICHE DI GIOCO AVANZATE', '8. ABILITÀ GIOCATORI (FIASSE)', '9. COMPETENZE E SVILUPPO',
  'NOTE CRITICHE PER L\'IA'
]

/** Sezioni info_rag da includere per contesto "countermeasures" (strategie serie, pre-partita) */
const COUNTERMEASURES_SECTION_TITLES = [
  '1. STATISTICHE GIOCATORI', '2. STILI DI GIOCO DEI GIOCATORI (FIASSE)', '3. MODULI TATTICI',
  '4. STILI TATTICI DI SQUADRA', '5. ISTRUZIONI INDIVIDUALI', '6. CALCI PIAZZATI',
  '7. MECCANICHE DI GIOCO AVANZATE', '8. ABILITÀ GIOCATORI (FIASSE)', '9. COMPETENZE E SVILUPPO'
]

/**
 * Restituisce sezioni info_rag per contesto analyze-match o countermeasures (strategie serie).
 * Non dipende da messaggio utente: usa elenco fisso di sezioni. Stesso RAG della chat, uso diverso.
 * @param {'analyze-match' | 'countermeasures'} contextType
 * @param {number} maxChars - Limite caratteri (default 12000)
 * @returns {string}
 */
export function getRelevantSectionsForContext(contextType, maxChars = 12000) {
  const titles = contextType === 'countermeasures' ? COUNTERMEASURES_SECTION_TITLES : ANALYZE_MATCH_SECTION_TITLES
  const sections = getSections()
  if (!sections || sections.length === 0) return ''

  const byTitle = new Map(sections.map(s => [s.title, s]))
  let total = 0
  const selected = []
  for (const title of titles) {
    const s = byTitle.get(title)
    if (!s) continue
    if (total + s.content.length > maxChars && selected.length > 0) break
    selected.push(s)
    total += s.content.length
  }

  if (selected.length === 0) return ''
  return selected.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n---\n\n')
}

/**
 * Termini eFootball: se presenti nel messaggio, la domanda è classificata eFootball (priorità).
 * IT + EN per coerenza bilingue.
 */
const EFOOTBALL_TERMS = [
  // Stili di gioco e ruoli
  'collante', 'orchestrator', 'opportunista', 'box-to-box', 'rapace area', 'fulcro', 'istinto di attacante', 'istinto attacante',
  'regista creativo', 'ala prolifica', 'specialista cross', 'senza palla', 'classico 10', 'giocatore chiave',
  'onnipresente', 'incontrista', 'sviluppo', 'tra le linee', 'difensore distruttore', 'frontale extra',
  // Meccaniche di gioco
  'match-up', 'match up', 'pressing', 'manual defending', 'shadow marking', 'contrasto spalla', 'anticipazione',
  'corner', 'punizione', 'calci piazzati', 'free kick', 'set piece', 'barriera',
  'stile di gioco', 'stili gioco', 'playstyle', 'playing style', 
  // Formazione/MODULO con specifiche (consigli tattici)
  'modulo', 'formazione 4-3-3', '4-2-3-1', '3-5-2', 'che modulo', 'quale modulo', 'quale formazione',
  'mi consigli', 'mi suggerisci', 'cosa ne pensi', 'meglio usare', 'conviene usare',
  // Richiesta consiglio specifica
  'come devo giocare', 'come gioco contro', 'tattica contro', 'strategia per',
  'ruolo', 'ruoli', 'meccanica', 'meccaniche', 'difesa', 'attacco', 'build', 'overall', 'rating',
  'dribbling', 'skill', 'tocco doppio', 'double touch', 'possesso palla', 'contropiede', 'transizione',
  'triangolazione', 'sovrapposizione', 'competenza posizione', 'abilità speciali', 'trait',
  'ancoraggio', 'anchoring', 'linea bassa', 'linea alta', 'deep line', 'marcatura stretta', 'marcatura uomo',
  'istruzioni individuali', 'pre-partita', 'in partita',
  'cos\'è ', 'cosa fa ', 'what is ', 'what does ', 'how do i defend', 'come difendo', 'consigli su'
]

/**
 * Classifica se la domanda riguarda la PIATTAFORMA (app) o eFootball (meccaniche/tattica/ruoli).
 * Priorità: se nel messaggio c'è un termine eFootball → efootball; altrimenti termini piattaforma → platform; default efootball.
 * @param {string} message
 * @returns {'platform' | 'efootball'}
 */
export function classifyQuestion(message) {
  const m = (message || '').toLowerCase().trim()
  if (!m) return 'efootball'

  // Priorità eFootball: domande su stili, meccaniche, ruoli, moduli, calci piazzati, ecc.
  for (const term of EFOOTBALL_TERMS) {
    if (m.includes(term)) return 'efootball'
  }

  const platformTerms = [
    // Italiano: riferimenti espliciti all'app/navigazione (OPERAZIONI)
    'dashboard', 'aggiungi partita', 'caricare partita', 'carico partita', 'upload',
    'dove trovo', 'dove si trova', 'funzionalità', 'profilo', 'impostazioni profilo',
    'wizard', 'step', 'screenshot', 'estrai dati', 'salva partita',
    'pagelle', 'riserve', 'slot', 'campo 2d', 'come faccio a caricare', 'non riesco a',
    'dove vado', 'menu', 'navigazione', 'app ', 'sito', 'piattaforma',
    // Pattern operativi specifici (cambiare/imparare vs consigliare)
    'come faccio a cambiare', 'come cambio', 'come si cambia', 'dove cambio',
    'come faccio a mettere', 'come metto', 'come aggiungo', 'come rimuovo',
    'come salvo', 'come carico', 'come modifico', 'come configuro',
    // English
    'how do i add', 'how to add a match', 'where is the formation', 'manage formation',
    'upload match', 'add match', 'save match', 'where do i find', 'profile settings',
    'how do i upload', 'where can i', 'screenshots', 'wizard steps', 'navigation',
    'platform', 'app feature', 'what can you do', 'guide me',
    'how do i change', 'how do i set', 'how do i add', 'how do i remove'
  ]
  for (const term of platformTerms) {
    if (m.includes(term)) return 'platform'
  }
  return 'efootball'
}

/**
 * Termini che indicano domande sul contesto personale (rosa, partite, tattica, allenatore).
 * Se presenti, la chat carica formation_layout, players, matches, team_tactical_settings, coaches.
 * IT + EN.
 */
const PERSONAL_CONTEXT_TERMS = [
  'rosa', 'mia rosa', 'la rosa', 'titolari', 'riserve', 'i miei giocatori', 'i tuoi giocatori',
  'partite caricate', 'partite salvate', 'quante partite', 'ultime partite', 'ultima partita',
  'risultati', 'com\'è andata', "com'e andata", 'ultimi risultati', 'partita vinta', 'partita persa',
  'tattica', 'tattiche', 'stile squadra', 'istruzioni individuali', 'impostazioni tattiche',
  'allenatore', 'mio allenatore', 'coach', 'active coach', 'chi è il mio allenatore',
  'formazione che uso', 'la mia formazione', 'la formazione attuale', 'slot in campo',
  'profilazione', 'profilati', 'chi è ben profilato', 'competenza posizione', 'competenze',
  'my roster', 'my team', 'my formation', 'loaded matches', 'last matches', 'match history',
  'tactical settings', 'team style', 'who is my coach', 'my players', 'starters', 'reserves',
  // Termini impliciti che richiedono contesto rosa
  'come miglioro', 'cosa cambio', 'chi metto', 'sostituire', 'sostituzione',
  'non segno', 'sbaglio tiro', 'sbaglio i tiri', 'difficoltà a segnare',
  'non vinco', 'perdo sempre', 'come vinco', 'come segno',
  'difesa debole', 'prendo goal', 'aiuto tattica', 'consigli per vincere'
]

/**
 * Restituisce true se il messaggio suggerisce una domanda su dati personali (rosa, partite, tattica, allenatore).
 * Usato per caricare contesto personale on-demand e risparmiare token.
 * @param {string} message
 * @returns {boolean}
 */
export function needsPersonalContext(message) {
  if (!message || typeof message !== 'string') return false
  const m = message.toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  for (const term of PERSONAL_CONTEXT_TERMS) {
    const t = term.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    if (m.includes(t)) return true
  }
  return false
}

