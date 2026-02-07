/**
 * RAG Helper per info_rag.md
 * Recupero sezioni rilevanti per domande eFootball nella chat (solo consigli tattici).
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
  'OBIETTIVO': [
    'obiettivo', 'scopo', 'cosa fa', 'a cosa serve'
  ],
  'CONTESTO VIDEOGIOCO (FONDAMENTALE)': [
    'contesto videogioco', 'card digitali', 'fisso vs modificabile', 'terminologia ufficiale effotball',
    'statistiche fisse', 'cosa è modificabile', 'regola oro'
  ],
  '1. STATISTICHE GIOCATORI (UFFICIALI eFootball)': [
    'statistiche', 'colpo di testa', 'calci da fermo', 'tiro a giro', 'velocità', 'accelerazione',
    'potenza di tiro', 'finalizzazione', 'possesso stretto', 'passaggio rasoterra', 'passaggio alto',
    'dribbling', 'controllo palla', 'comportamento offensivo', 'comportamento difensivo', 'contrasto',
    'aggressività', 'coinvolgimento difensivo', 'resistenza', 'contatto fisico', 'controllo corpo',
    'salto', 'equilibrio', 'riflessi pt', 'estensione pt', 'presa pt', 'parata pt',
    'frequenza piede debole', 'precisione piede debole', 'forma', 'resistenza infortuni',
    'soglie', 'meta', 'velocità difensori', 'cb ', 'terzini'
  ],
  '2. STILI GIOCATORE - Caratteristica card (FISSI)': [
    'stile giocatore', 'playing style giocatore', 'opportunista', 'punta avanzata', 'adv striker', 'senza palla', "rapace d'area", 'fulcro',
    'punta arretrata', 'deep lying forward', 'specialista cross', 'classico 10', 'regista creativo', 'ala prolifica', 'taglio al centro',
    'tra le linee', 'sviluppo', 'frontale extra', 'incontrista', 'onnipresente', 'collante',
    'box-to-box', 'giocatore chiave', 'hole player', 'orchestrator', 'anchor man', 'terzino offensivo', 'terzino difensivo', 'terzino mattatore',
    'portiere offensivo', 'portiere difensivo', 'funambolo', 'serpentina', 'treno in corsa',
    'inserimento', 'esperto palle lunghe', 'crossatore', 'tiratore',
    'che punta', 'che mediano', 'quale stile', 'quando serve', 'chi metto', 'chi schiero'
  ],
  '3. MODULI TATTICI (CONFIGURABILI)': [
    'moduli tattici', 'modulo', 'che modulo', 'quale modulo', 'formazione', '4-3-3', '4-2-3-1', '4-4-2', '4-1-2-3', '4-5-1', '4-4-1-1',
    '4-2-2-2', '3-5-2', '3-4-3', '3-1-4-2', '3-4-1-2', '5-3-2', '5-4-1', '5-2-3',
    'che formazione', 'formazione per', 'formazione contro',
    'mediano', 'mezzala', 'regista basso', 'ala tagliente', 'ala pura'
  ],
  '4. STILI SQUADRA - Tattica (configurabili)': [
    'stile squadra', 'stili tattici', 'team style', 'possesso palla', 'contropiede veloce', 'contrattacco', 'passaggio lungo',
    'vie laterali', 'attacco diretto', 'cross e finalizzazione', 'attacco centrale',
    'pressing alto', 'difesa bassa', 'pressing selettivo', 'contenimento difensivo',
    'costruzione posizionale', 'lancio lungo', 'costruzione triangoli',
    'gegenpressing', 'tiki-taka', 'catenaccio', 'pressing costante',
    'out wide', 'contropiede', 'gioco diretto'
  ],
  '5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)': [
    'istruzioni individuali', 'difensivo', 'offensivo', 'ancoraggio', 'anchoring',
    'linea bassa', 'linea alta', 'marcatura stretta', 'marcatura uomo', 'contropiede',
    'deep line', 'slot offensive', 'slot difensive'
  ],
  '6. CALCI PIAZZATI (CONFIGURABILI)': [
    'calci piazzati', 'punizioni', 'corner', 'rigori', 'scatta', 'sponda al centro',
    'scatta e mantieni', 'palla all ariete', 'equilibrato', 'area piccola', 'treno',
    'da centrocampo', 'due ricevitori', 'in diagonale', 'corner corti', 'linea laterale',
    'marcatura a uomo', 'marcatura a zona', 'palo lontano',
    'primo attaccante', 'secondo attaccante', 'terzo attaccante', 'primo palo', 'secondo palo'
  ],
  '7. MECCANICHE DI GIOCO AVANZATE': [
    'meccaniche', 'meccaniche gioco', 'gestione azioni', 'gestire azioni', 'come gestire', 'azioni offensive', 'azioni difensive',
    'testa a testa', 'contrasto spalla', 'chiama pressing', 'comandi', 'controllo palla', 'difesa manuale',
    'protezione', 'uno-due', 'passaggio sensazionale', 'tiro sensazionale', 'tiro calibrato',
    'controllo tocco di suola', 'finte', 'dribbling precisione', 'cross', 'finta tiro', 'finta passaggio',
    'dribbling scatto', 'stop veloce', 'doppio tocco', 'elastico', 'sombrero', 'svolta secca',
    'alzata tacco', 'voltati', 'finta stop', 'skill move', 'stop e ricezione'
  ],
  '8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)': [
    'abilità giocatore', 'programmi aggiunta abilità',
    'tiro al volo', 'tiro a giro', 'tiro potente', 'punta di precisione', 'tiro a scendere',
    'tiro a salire', 'a giro da distante', 'esterno a giro', 'colpo di testa', 'tiro acrobatico',
    'controllo pallonetto', 'tiro a nocca', 'pallonetto',
    'passaggio di prima', 'passaggio al volo', 'passaggio filtrante', 'lancio lungo preciso',
    'passaggio senza guardare', 'passaggio dosato', 'no look pass', 'weighted pass',
    'cross preciso', 'doppio tocco', 'elastico', 'controllo di suola', 'stop acrobatico',
    'taglio dietro', 'scotch move', 'finta forbice', 'rabona', 'tocco di tacco',
    'contrasto aggressivo', 'intercettazione', 'marcatura', 'entrata aggressiva', 'sliding tackle',
    'rientro difensivo', 'track back', 'blocco', 'stoppaggio acrobatico', 'superiorità aerea',
    'riflessi felini', 'presa sicura', 'uscita portiere', 'parata con piedi', 'rilancio basso', 'rilancio alto', 'parata rigori',
    'scatto', 'resistenza superiore', 'leader', 'super riserva', 'spirito combattivo', 'tattica'
  ],
  '9. COMPETENZE E SVILUPPO': [
    'competenze sviluppo', 'tipologie giocatori', 'trending', 'in evidenza', 'in risalto',
    'epico', 'leggendario', 'standard', 'valore giocatore', 'vg', 'competenza posizione',
    'livello competenza', 'basso', 'intermedio', 'alto', 'programmi aggiunta posizione',
    'forza base', 'forza complessiva', 'alchimia',
    'frecce forma', 'freccia su', 'freccia giù', 'forma giocatore'
  ],
  '10. NOTE CRITICHE PER L\'IA': [
    'errori comuni', 'esempi risposte', 'regola oro', 'fisso vs modificabile',
    'statistiche vs abilità', 'passaggio filtrante', 'passaggio rasoterra', 'cerca giocatori', 'filtra per',
    'consigli', 'suggerimenti', 'risposta corretta', 'corretto',
    'mi consigli', 'cosa fare', 'come migliorare', 'contromisure', 'contro 4-3-3', 'contro pressing',
    'tiri mancati', 'pressing', 'rigori',
    'contro 4-2-3-1', 'contro 3-5-2', 'contro 4-4-2', 'contro 5-3-2', 'contro possesso',
    'contro contropiede', 'contro long ball', 'contro wing play', 'contro difesa bassa', 'contro gioco fisico'
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
  'finalizzatore', 'cacciatore di gol', 'ala prolifica', 'istinto di attacante', 'istinto attacante', 'opportunista', "rapace d'area", 'rapace d area', 'fulcro',
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
 * Restituisce il contenuto della sezione STILI GIOCATORE filtrato per ruolo.
 * info_rag usa #### Attaccanti e Centrocampisti Offensivi | Centrocampisti e Difensori | Terzini e Portieri.
 * Se messaggio su attaccanti → blocco 1. Centrocampisti → blocco 2. Difensori → blocchi 2+3.
 * @param {string} userMessage - Messaggio utente (normalizzato non richiesto, fatto internamente)
 * @param {string} fullContent - Corpo completo della sezione STILI GIOCATORE
 * @returns {string}
 */
function getStiliContentFilteredByRole(userMessage, fullContent) {
  if (!fullContent || typeof fullContent !== 'string') return fullContent || ''
  const msg = (userMessage || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
  const hasAtt = ROLE_ATTACCANTI_KEYWORDS.some(kw => msg.includes(kw.replace(/'/g, ' ').trim()))
  const hasMid = ROLE_CENTROCAMPISTI_KEYWORDS.some(kw => msg.includes(kw))
  const hasDef = ROLE_DIFENSORI_KEYWORDS.some(kw => msg.includes(kw))
  const count = [hasAtt, hasMid, hasDef].filter(Boolean).length
  if (count !== 1) return fullContent

  const re = /^#### (Attaccanti e Centrocampisti Offensivi|Centrocampisti e Difensori|Terzini e Portieri)\s*$/gm
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
  if (hasAtt) chosen = blocks.find(b => b.title === 'Attaccanti e Centrocampisti Offensivi')
  else if (hasMid) chosen = blocks.find(b => b.title === 'Centrocampisti e Difensori')
  else if (hasDef) {
    const b2 = blocks.find(b => b.title === 'Centrocampisti e Difensori')
    const b3 = blocks.find(b => b.title === 'Terzini e Portieri')
    if (b2 && b3) {
      return introText + '#### Centrocampisti e Difensori\n\n' + b2.content + '\n\n#### Terzini e Portieri\n\n' + b3.content
    }
    chosen = b3 || b2
  }
  if (!chosen) return fullContent
  return introText + '#### ' + chosen.title + '\n\n' + chosen.content
}

const NOTE_CRITICHE_TITLE = "10. NOTE CRITICHE PER L'IA"
const MECCANICHE_TITLE = '7. MECCANICHE DI GIOCO AVANZATE'

/** Keyword che indicano domanda su gameplay: dare bonus a sez. 7 per includerla più spesso */
const GAMEPLAY_HINT = [
  'come difend', 'come gestir', 'pressing', 'partita', 'in campo', 'in match',
  'calci piazzati', 'corner', 'punizioni', 'difesa', 'attacco', 'transiz',
  'compattezza', 'linea alta', 'linea bassa', 'possesso', 'costruzione'
]

/**
 * Recupera le sezioni più rilevanti per il messaggio utente, fino a maxChars.
 * La sezione 10 (NOTE CRITICHE) è sempre riservata per prima, così non viene mai esclusa da sezioni lunghe.
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
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')

  // 1) Riserva SEMPRE la sezione 10 (NOTE CRITICHE) per non farla escludere dalle altre sezioni lunghe
  const noteSection = sections.find(s => s.title === NOTE_CRITICHE_TITLE)
  const selected = []
  let total = 0
  if (noteSection && noteSection.content.length <= maxChars) {
    selected.push(noteSection)
    total = noteSection.content.length
  }
  const remainingBudget = maxChars - total

  // 2) Bonus punteggio per sez. 7 (MECCANICHE) se la domanda sembra su gameplay
  const isGameplayQuestion = GAMEPLAY_HINT.some(hint => messageNorm.includes(hint))
  const scored = sections
    .filter(s => s.title !== NOTE_CRITICHE_TITLE)
    .map(s => ({
      ...s,
      score: scoreSection(s.title, messageNorm) + (s.title === MECCANICHE_TITLE && isGameplayQuestion ? 3 : 0)
    }))

  scored.sort((a, b) => b.score - a.score)

  for (const s of scored) {
    if (total + s.content.length > maxChars && selected.length > 1) break
    if (s.content.length > remainingBudget && selected.length > 1) continue
    const addLen = selected.some(x => x.title === s.title) ? 0 : s.content.length
    if (addLen === 0) continue
    if (total + addLen > maxChars) continue
    if (s.score > 0 || selected.length < 3) {
      selected.push(s)
      total += addLen
    }
  }

  if (selected.length <= (noteSection ? 1 : 0)) {
    const fallback = scored.slice(0, 4).filter(Boolean)
    for (const s of fallback) {
      if (selected.some(x => x.title === s.title)) continue
      if (total + s.content.length <= maxChars) {
        selected.push(s)
        total += s.content.length
      } else if (selected.length <= 1) {
        selected.push(s)
        total += s.content.length
        break
      }
    }
  }

  const STILI_TITLE = '2. STILI GIOCATORE - Caratteristica card (FISSI)'
  return selected
    .map(s => {
      const content = s.title === STILI_TITLE
        ? getStiliContentFilteredByRole(userMessage, s.content)
        : s.content
      return `## ${s.title}\n\n${content}`
    })
    .join('\n\n---\n\n')
}

/** Sezioni info_rag da includere per contesto "analyze-match" (strategie serie, analisi partita) */
const ANALYZE_MATCH_SECTION_TITLES = [
  '1. STATISTICHE GIOCATORI (UFFICIALI eFootball)',
  '2. STILI GIOCATORE - Caratteristica card (FISSI)',
  '3. MODULI TATTICI (CONFIGURABILI)',
  '4. STILI SQUADRA - Tattica (configurabili)',
  '5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)',
  '6. CALCI PIAZZATI (CONFIGURABILI)',
  '7. MECCANICHE DI GIOCO AVANZATE',
  '8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)',
  '9. COMPETENZE E SVILUPPO',
  '10. NOTE CRITICHE PER L\'IA'
]

/** Sezioni info_rag da includere per contesto "countermeasures" (strategie serie, pre-partita) */
const COUNTERMEASURES_SECTION_TITLES = [
  '1. STATISTICHE GIOCATORI (UFFICIALI eFootball)',
  '2. STILI GIOCATORE - Caratteristica card (FISSI)',
  '3. MODULI TATTICI (CONFIGURABILI)',
  '4. STILI SQUADRA - Tattica (configurabili)',
  '5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)',
  '6. CALCI PIAZZATI (CONFIGURABILI)',
  '7. MECCANICHE DI GIOCO AVANZATE',
  '8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)',
  '9. COMPETENZE E SVILUPPO',
  '10. NOTE CRITICHE PER L\'IA'
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
  // Stili di gioco e ruoli (nomi ufficiali + sinonimi: cacciatore di gol=Opportunista, classico n 10 non trequartista classico)
  'collante', 'orchestrator', 'opportunista', 'cacciatore di gol', 'box-to-box', "rapace d'area", 'rapace d area', 'fulcro', 'istinto di attacante', 'istinto attacante',
  'regista creativo', 'ala prolifica', 'specialista cross', 'senza palla', 'classico 10', 'classico n 10', 'giocatore chiave',
  'onnipresente', 'incontrista', 'sviluppo', 'tra le linee', 'difensore distruttore', 'frontale extra',
  // Meccaniche di gioco e gestione azioni (RAG sezione 7)
  'meccaniche', 'meccaniche di gioco', 'gestione azioni', 'gestire azioni', 'come gestire', 'come gestisco', 'azioni', 'comandi', 'controllo palla',
  'match-up', 'match up', 'pressing', 'manual defending', 'shadow marking', 'contrasto spalla', 'anticipazione',
  'corner', 'punizione', 'calci piazzati', 'free kick', 'set piece', 'barriera',
  'stile di gioco', 'stili gioco', 'playstyle', 'playing style', 
  // Formazione/MODULO con specifiche (consigli tattici)
  'modulo', 'formazione 4-3-3', '4-2-3-1', '3-5-2', 'che modulo', 'quale modulo', 'quale formazione',
  'mi consigli', 'mi suggerisci', 'cosa ne pensi', 'meglio usare', 'conviene usare',
  // Richiesta consiglio specifica e consigli/suggerimenti (RAG meccaniche + note critiche)
  'consigli', 'suggerimenti', 'consiglio su', 'suggerimento su', 'dammi consigli', 'dammi suggerimenti',
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

