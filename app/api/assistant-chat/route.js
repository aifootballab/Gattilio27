import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getRelevantSections, classifyQuestion, needsPersonalContext } from '@/lib/ragHelper'
import { recordUsage } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Limiti storia conversazione (sicurezza e token) */
const MAX_HISTORY_MESSAGES = 10
const MAX_HISTORY_CONTENT_LENGTH = 2000

/** Limite riassunto contesto personale (rosa, partite, tattica, allenatore) */
const MAX_PERSONAL_CONTEXT_CHARS = 3500

/** Limiti validazione input (sicurezza e token) */
const MAX_MESSAGE_LENGTH = 4000
const MAX_CURRENT_PAGE_LENGTH = 500

/** Messaggi errore API in doppia lingua (IT/EN) */
const API_ERRORS = {
  AUTH_REQUIRED: { it: 'Autenticazione richiesta.', en: 'Authentication required' },
  AUTH_INVALID: { it: 'Autenticazione non valida o scaduta.', en: 'Invalid or expired authentication' },
  BODY_INVALID: { it: 'Corpo della richiesta non valido.', en: 'Invalid request body.' },
  MESSAGE_REQUIRED: { it: 'Il messaggio è obbligatorio.', en: 'Message is required.' },
  MESSAGE_TOO_LONG: { it: 'Messaggio troppo lungo. Riduci il testo.', en: 'Message too long. Please shorten it.' },
  RATE_LIMIT: { it: 'Troppe richieste. Riprova tra poco.', en: 'Rate limit exceeded. Please try again later.' },
  CONFIG_MISSING: { it: 'Configurazione mancante.', en: 'Supabase configuration missing.' },
  OPENAI_KEY_MISSING: { it: 'Chiave API OpenAI non configurata.', en: 'OpenAI API key not configured.' },
  OPENAI_ERROR: { it: 'Errore nel servizio di risposta. Riprova.', en: 'Error calling AI service. Please try again.' },
  GENERIC_ERROR: { it: 'Errore durante la generazione della risposta.', en: 'Error generating response.' }
}

/**
 * Lingua preferita da richiesta (header Accept-Language). Usato quando il body non è ancora parsato (401, 429).
 * @param {Request} req
 * @returns {'it'|'en'}
 */
function getPreferredLanguageFromRequest(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  if (accept.toLowerCase().startsWith('it') || accept.includes('it')) return 'it'
  return 'en'
}

/**
 * Messaggio errore API in lingua (IT o EN).
 * @param {string} key - Chiave in API_ERRORS (es. 'AUTH_REQUIRED', 'MESSAGE_REQUIRED')
 * @param {'it'|'en'} lang
 * @returns {string}
 */
function getApiError(key, lang) {
  const entry = API_ERRORS[key]
  if (!entry) return API_ERRORS.GENERIC_ERROR[lang]
  return entry[lang] ?? entry.en
}

/** Suggerimenti di fallback quando l'AI non restituisce il blocco SUGGERIMENTI (sempre 3 domande cliccabili). */
function getDefaultSuggestions(lang) {
  if (lang === 'en') {
    return [
      'What\'s my difficulty in matches?',
      'How do I manage my formation?',
      'How do I add a match?'
    ]
  }
  return [
    'Qual è la mia difficoltà nelle partite?',
    'Come gestisco la formazione?',
    'Come carico una partita?'
  ]
}

/**
 * Estrae dal contenuto AI il blocco SUGGERIMENTI (3 domande cliccabili) e restituisce testo pulito + array.
 * Parser robusto: accetta SUGGERIMENTI:/Suggerimenti:, con "---" opzionale, numerazione 1. 1) - ecc.
 * @param {string} content - Testo completo risposta AI
 * @returns {{ cleanContent: string, suggestions: string[] }}
 */
function parseSuggestionsFromContent(content) {
  if (!content || typeof content !== 'string') return { cleanContent: (content || '').trim(), suggestions: [] }
  const normalized = content.trim()
  const suggMarkerMatch = normalized.match(/\b(SUGGERIMENTI|Suggerimenti)\s*:?\s*/i)
  const idx = suggMarkerMatch ? normalized.indexOf(suggMarkerMatch[0]) + suggMarkerMatch[0].length : -1
  if (idx <= 0) return { cleanContent: normalized, suggestions: [] }
  const beforeMarker = normalized.slice(0, idx - (suggMarkerMatch ? suggMarkerMatch[0].length : 0)).trim()
  const blockStart = Math.max(beforeMarker.lastIndexOf('---'), beforeMarker.lastIndexOf('\n\n'))
  const head = blockStart >= 0 ? beforeMarker.slice(0, blockStart).trim() : beforeMarker
  const tail = normalized.slice(idx).trim()
  const lines = tail.split(/\n/).map(l => l.trim()).filter(Boolean)
  const suggestions = []
  for (const line of lines) {
    const m = line.match(/^\s*[123][.)]\s*(.+)$/) || line.match(/^\s*[-•]\s*(.+)$/)
    if (m) {
      const text = m[1].trim()
      if (text.length > 2 && text.length < 120) suggestions.push(text)
    }
    if (suggestions.length >= 3) break
  }
  return { cleanContent: head, suggestions: suggestions.slice(0, 3) }
}

/**
 * Normalizza e valida history conversazione (enterprise: limiti e sanitizzazione).
 * @param {unknown} raw - Array da body (può essere undefined o non-array)
 * @returns {{ role: 'user'|'assistant', content: string }[]}
 */
function normalizeHistory(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out = []
  for (let i = 0; i < Math.min(raw.length, MAX_HISTORY_MESSAGES); i++) {
    const item = raw[i]
    if (!item || typeof item !== 'object') continue
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null
    if (!role) continue
    let content = typeof item.content === 'string' ? item.content.trim() : ''
    if (content.length > MAX_HISTORY_CONTENT_LENGTH) content = content.slice(0, MAX_HISTORY_CONTENT_LENGTH)
    if (content.length === 0) continue
    out.push({ role, content })
  }
  return out
}

/**
 * Costruisce contesto personale per AI
 */
async function buildAssistantContext(userId, currentPage, appState) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceKey || !supabaseUrl) return null
  
  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Recupera profilo utente (nome, team, preferenze)
    const { data: profile } = await admin
      .from('user_profiles')
      .select('first_name, team_name, ai_name, how_to_remember, common_problems')
      .eq('user_id', userId)
      .maybeSingle()
    
    return {
      profile: profile || {},
      currentPage: currentPage || '',
      appState: appState || {}
    }
  } catch (error) {
    console.error('[assistant-chat] Error building context:', error)
    return null
  }
}

/**
 * Costruisce riassunto contesto personale cliente (formazione, rosa, partite, tattica, allenatore).
 * Usato quando needsPersonalContext(message) è true. Non blocca: in errore restituisce ''.
 * @param {string} userId - user_id da token
 * @returns {Promise<string>} Testo compatto (max MAX_PERSONAL_CONTEXT_CHARS) o ''
 */
async function buildPersonalContext(userId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !supabaseUrl) return ''

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Formation layout
    const { data: formationRow } = await admin
      .from('formation_layout')
      .select('formation, slot_positions')
      .eq('user_id', userId)
      .maybeSingle()
    const formation = formationRow?.formation || 'non impostata'

    // Players (titolari + riserve)
    const { data: playersData, error: playersError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, playing_style_id, slot_index, photo_slots, base_stats, original_positions')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true, nullsFirst: false })
      .limit(50)
    if (playersError) {
      console.error('[assistant-chat] buildPersonalContext players error:', playersError.message)
      return ''
    }
    const roster = playersData || []

    // Playing styles lookup
    const { data: stylesData } = await admin.from('playing_styles').select('id, name')
    const stylesLookup = {}
    if (stylesData) {
      stylesData.forEach(s => { stylesLookup[s.id] = s.name || '' })
    }

    // Profilazione: card, statistiche, abilita/booster da photo_slots
    function getProfilazione(photoSlots) {
      if (!photoSlots || typeof photoSlots !== 'object') return 'incompleta (0-1/3)'
      const card = photoSlots.card === true || photoSlots.card === 'true'
      const stats = photoSlots.statistiche === true || photoSlots.statistiche === 'true'
      const skills = photoSlots.abilita === true || photoSlots.abilita === 'true' || photoSlots.booster === true || photoSlots.booster === 'true'
      const count = [card, stats, skills].filter(Boolean).length
      return count === 3 ? 'completa (3/3)' : count === 2 ? 'parziale (2/3)' : 'incompleta (0-1/3)'
    }
    function getCompetenze(originalPositions) {
      if (!Array.isArray(originalPositions) || originalPositions.length === 0) return 'non impostate'
      return originalPositions
        .map(p => (p.position && p.competence ? `${p.position} ${p.competence}` : null))
        .filter(Boolean)
        .join(', ') || 'non impostate'
    }

    const titolari = roster
      .filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
      .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
    const riserve = roster.filter(p => p.slot_index == null)

    let rosterLines = []
    for (const p of titolari) {
      const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || '-'
      const prof = getProfilazione(p.photo_slots)
      const comp = getCompetenze(p.original_positions)
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}, profilazione: ${prof}, competenze: ${comp})`)
    }
    rosterLines.push('Riserve:')
    for (const p of riserve.slice(0, 15)) {
      const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || '-'
      const prof = getProfilazione(p.photo_slots)
      const comp = getCompetenze(p.original_positions)
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}, profilazione: ${prof}, competenze: ${comp})`)
    }
    if (riserve.length > 15) rosterLines.push(`  ... altri ${riserve.length - 15} riserve`)

    // Matches (ultime 10)
    const { data: matchesData } = await admin
      .from('matches')
      .select('opponent_name, result, formation_played, playing_style_played, match_date')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(10)
    const matches = matchesData || []
    const matchLines = matches.length === 0
      ? ['Nessuna partita caricata.']
      : matches.map(m => {
          const d = m.match_date ? (typeof m.match_date === 'string' ? m.match_date.slice(0, 10) : String(m.match_date).slice(0, 10)) : '?'
          return `  ${d} vs ${m.opponent_name || '?'} ${m.result || '-'} (formazione: ${m.formation_played || '-'}, stile: ${m.playing_style_played || '-'})`
        })

    // Team tactical settings
    const { data: tacticalRow } = await admin
      .from('team_tactical_settings')
      .select('team_playing_style, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle()
    const teamStyle = tacticalRow?.team_playing_style || 'non impostato'
    const indInstr = tacticalRow?.individual_instructions
    const numInstructions = Array.isArray(indInstr) ? indInstr.length : (indInstr && typeof indInstr === 'object' ? Object.keys(indInstr).length : 0)
    const tacticsText = `Stile squadra: ${teamStyle}. Istruzioni individuali: ${numInstructions} attive.`

    // Allenatore attivo (con competenze stili per intreccio dati)
    const { data: coachRow } = await admin
      .from('coaches')
      .select('coach_name, playing_style_competence')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    let coachText = coachRow?.coach_name ? `Allenatore attivo: ${coachRow.coach_name}.` : 'Nessun allenatore attivo impostato.'
    if (coachRow?.playing_style_competence && typeof coachRow.playing_style_competence === 'object') {
      const entries = Object.entries(coachRow.playing_style_competence)
        .map(([style, val]) => ({ style, val: parseInt(val, 10) || 0 }))
        .filter(({ val }) => !Number.isNaN(val))
        .sort((a, b) => b.val - a.val)
        .slice(0, 8)
      if (entries.length > 0) {
        coachText += ` Competenze stili (solo >= 70 consigliabili): ${entries.map(({ style, val }) => `${style} ${val}`).join(', ')}.`
      }
    }

    const parts = [
      '╔══════════════════════════════════════════════════════════════════╗',
      '║  CONTESTO PERSONALE CLIENTE - DATI REALI DELLA ROSA             ║',
      '║  USA QUESTI DATI - NON INVENTARE GIOCATORI - RISPETTA POSIZIONI  ║',
      '╚══════════════════════════════════════════════════════════════════╝',
      `Formazione attuale: ${formation}.`,
      '',
      'REGOLA POSIZIONI: position = ruolo del giocatore (P=punta, MED/CC=centrocampista, DC=difensore centrale, TS/TD=ala, ecc.). NON suggerire MAI un giocatore in un ruolo diverso dalla sua position (es. NON dire "Pedri punta" se position=MED).',
      '',
      'TITOLARI IN CAMPO (slot 0-10):',
      ...rosterLines.slice(0, rosterLines.findIndex(l => l === 'Riserve:') + 1),
      ...rosterLines.slice(rosterLines.findIndex(l => l === 'Riserve:') + 1),
      '',
      'LE RISERVE sono in panchina: usale per sostituzioni. Consiglia solo giocatori di questo elenco e solo per ruoli compatibili con la loro position.',
      '',
      'ULTIME PARTITE GIOCATE:',
      ...matchLines,
      '',
      tacticsText,
      coachText
    ]
    let summary = parts.join('\n')
    if (summary.length > MAX_PERSONAL_CONTEXT_CHARS) {
      summary = summary.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).'
    }
    return summary
  } catch (err) {
    console.error('[assistant-chat] buildPersonalContext error:', err?.message || err)
    return ''
  }
}

/**
 * Costruisce prompt personalizzato e motivante.
 * @param {string} efootballKnowledge - Se presente, blocco RAG eFootball (opzionale).
 * @param {string} personalContextSummary - Se presente, blocco contesto personale (rosa, partite, tattica, allenatore).
 * @param {boolean} hasHistory - Se true, c'è già storia conversazione: non risalutare, continua naturalmente.
 */
function buildPersonalizedPrompt(userMessage, context, language = 'it', efootballKnowledge = '', personalContextSummary = '', hasHistory = false) {
  const { profile, currentPage, appState } = context || {}
  const firstName = profile?.first_name || 'amico'
  const teamName = profile?.team_name || 'il tuo team'
  const aiName = profile?.ai_name || 'Coach AI'
  const howToRemember = profile?.how_to_remember || ''
  const commonProblems = profile?.common_problems || []
  
  // Determina contesto pagina
  let pageContext = ''
  if (currentPage) {
    if (currentPage.includes('/match/new')) {
      pageContext = 'Il cliente sta caricando una nuova partita (wizard 5 step).'
    } else if (currentPage.includes('/match/') && !currentPage.includes('/match/new')) {
      pageContext = 'Il cliente sta visualizzando i dettagli di una partita.'
    } else if (currentPage.includes('/gestione-formazione')) {
      pageContext = 'Il cliente sta gestendo la formazione (campo 2D interattivo).'
    } else if (currentPage === '/') {
      pageContext = 'Il cliente è nella dashboard principale.'
    }
  }
  
  // Determina stato app
  let stateContext = ''
  if (appState?.completingMatch) {
    stateContext = 'Sta completando il caricamento di una partita.'
  } else if (appState?.uploadingPlayer) {
    stateContext = 'Sta caricando un giocatore.'
  } else if (appState?.viewingMatch) {
    stateContext = 'Sta visualizzando una partita.'
  }
  
  const domandaBreve = userMessage.length > 80 ? userMessage.slice(0, 80).trim() + '…' : userMessage
  const pagina = (context && context.currentPage) ? String(context.currentPage) : ''
  const contestoAttuale = [
    pageContext ? pageContext.replace(/^Il cliente\s+/, '').replace(/\.$/, '') : (pagina || 'Dashboard'),
    `Domanda: "${domandaBreve}"`
  ].join(' | ')

  return `CONTESTO: ${contestoAttuale}

${hasHistory ? `NOTA: Continua la conversazione già iniziata. NON salutare.` : ''}

👤 ${firstName} | ${teamName}
${howToRemember ? `Memo: ${howToRemember}` : ''}
${commonProblems.length > 0 ? `Problemi: ${commonProblems.join(', ')}` : ''}
${pageContext ? `${pageContext}` : ''}
${stateContext ? `${stateContext}` : ''}

${personalContextSummary ? `
📊 ROSA E DATI:
${personalContextSummary}

REGOLE PER RISPOSTE CON DATI ROSA:
• Usa SOLO i giocatori elencati sopra (titolari + riserve)
• RISPETTA la position: MED/CC=centrocampo, P/SP=attacco, DC/TS/TD=difesa. NON inventare ruoli.
• Riserve sono dopo "Riserve:" - usale per sostituzioni
• Sinergia/compatibilità: SUGGERISCILA TU dai dati, non chiedere altri dati
• Se chiede "cosa cambiare": max 3 cambi concreti, nomi specifici dal blocco
• Concludi SEMPRE con: "In sintesi: [azione concreta]"
• Se rosa vuota: "Carica formazione e riserve in Gestione Formazione, poi chiedimi un parere."
` : ''}

${efootballKnowledge ? `
📚 MECCANICHE eFootball:
${efootballKnowledge}

REGOLE MECCANICHE:
• Stili giocatore: FISSI sulla card, non modificabili. NON dire "potenzia", "migliora", "allena".
• Stili per ruolo: Attaccanti ≠ Centrocampisti ≠ Difensori. NON mescolare.
• Consigliabile: formazione, schieramento, sostituzioni, istruzioni individuali.
` : ''}

📱 FUNZIONALITÀ APP:
1. Dashboard (/): panoramica squadra
2. Gestione Formazione (/gestione-formazione): campo 2D, upload giocatori
3. Aggiungi Partita (/match/new): wizard 5 step
4. Dettaglio Partita (/match/[id]): analisi post-match
5. Dettaglio Giocatore (/giocatore/[id]): scheda completa
6. Impostazioni Profilo (/impostazioni-profilo): dati utente
7. Contromisure Live (/contromisure-live): analisi pre-partita
8. Allenatori (/allenatori): gestione coach
9. Guida (/guida): tour piattaforma

⚠️ NON inventare funzionalità. Se non esiste: "Non disponibile, ma posso aiutarti con [alternativa]."

🎮 CONTESTO VIDEOGIOCO:
I giocatori sono CARD DIGITALI. Statistiche FISSE, non crescono. NON parlare di "esperienza", "carriera", "maturità".

🎯 TONO RISPOSTA (OBBLIGATORIO):
DIRETTO → BREVE → OPERATIVO

• Max 3 frasi operative
• ZERO spiegazioni teoriche ("perché", "dato che", "considerando")
• ZERO giustificazioni ("ho analizzato", "ho visto che")
• Inizia con l'azione: "Metti...", "Usa...", "Cambia..."
• Finisci con: "In sintesi: [azione concreta in 5-8 parole]"

✅ ESEMPI CORRETTI:

Domanda: "Che modulo uso?"
Risposta: "4-3-3 con le tue ali veloci. In sintesi: sfrutta la velocità sulle fasce."

Domanda: "Chi metto al posto di Pedri?"
Risposta: "Bellingham MED titolare, Pedri in panchina. In sintesi: più fisico a centrocampo."

Domanda: "Come carico una partita?"
Risposta: "Vai su 'Aggiungi Partita', carica screenshot pagelle → statistiche → aree attacco → recuperi → formazione avversaria. In sintesi: 5 step con upload foto."

Domanda: "Che ne pensi della mia rosa?"
Risposta: "Difesa solida con i tuoi DC alti. Centrocampo tecnico ma manca fisicità. Metti un MED difensivo in panchina. In sintesi: rafforza il centro."

❌ ERRORI DA EVITARE:
"Analizzando la tua rosa..." → troppo lungo
"Potresti considerare..." → troppo vago  
"Dato che hai Pedri..." → spiega troppo
"Ho incrociato i dati..." → parla di te stesso

🔴 VIETATO ASSOLUTO:
• "potenziare/migliorare/allenare" stili o giocatori (sono fissi)
• Collante/Box-to-Box per attaccanti
• Istinto attacante/Ala prolifica per difensori
• Stile squadra con competenza allenatore < 50
• Inventare nomi giocatori non nella rosa
• "carica una partita per vedere la sinergia" (non esiste)

⚽ LINGUAGGIO COACH:
"buildato", "competenza posizione", "profilazione", "slot", "titolare/riserva"

DOMANDA: "${userMessage}"

Rispondi come ${aiName} in ${language === 'it' ? 'italiano' : 'inglese'}. Max 3 frasi + In sintesi.

---
SUGGERIMENTI (3 domande che esplorano diversi angoli):

🎯 REGOLA PER LE DOMANDE SUGGERITE:
Le 3 domande devono essere PERSONALIZZATE sui dati del cliente (rosa, partite, tattica), NON generiche.

STRUTTURA OBBLIGATORIA:
1. DOMANDA A: Approfondimento sul tema appena trattato (stesso argomento)
2. DOMANDA B: Collegamento a un aspetto CORRELATO ma DIVERSO (es: da modulo → a giocatori specifici della rosa; da tattica → a partite recenti; da singolo giocatore → a sinergia con compagni)
3. DOMANDA C: Prospettiva alternativa o "E se..." (sfida, cambio di approccio, ipotesi diversa)

${personalContextSummary ? `
📊 USA I DATI ROSA PER PERSONALIZZARE:
Titolari elencati sopra → cita nomi specifici nelle domande
Riserve elencate → suggerisci sostituzioni concrete
Partite caricate → collega a risultati recenti
Allenatore → collega a competenze stili
` : '\n📊 SE NON HAI DATI ROSA: domande su come caricarli\n'}

🚫 VIETATO:
• Domande generiche: "Che ne pensi del mio centrocampo?" (troppo vaga)
• Tre domande sullo stesso identico argomento (tutte su modulo, o tutte su stili)
• Domande che ignorano completamente i dati disponibili

✅ ESEMPI CORRETTI (con dati rosa):

Se hai parlato di MODULO 4-3-3:
1. "Passo alla difesa: i miei DC hanno abbastanza fisicità per questo modulo?" ← collega a giocatori specifici
2. "Vedo che hai Messi SP. Conviene metterlo al centro o spostarlo sulla fascia?" ← nome specifico dalla rosa
3. "E se provassi 4-2-3-1 per dare più copertura a centrocampo?" ← prospettiva alternativa

Se hai parlato di SOSTITUZIONI:
1. "Chi altro dovrei valutare in panchina per il centrocampo?" ← approfondimento
2. "La mia difesa ha tenuto nelle ultime partite o serve rinforzo?" ← collega a partite recenti
3. "E se inverto le ali? La mia ESA destra può giocare a sinistra?" ← ipotesi diversa

ISTRUZIONI INDIVIDUALI - REGOLA FERREA:
• NON suggerire istruzioni "a caso"
• Ogni istruzione deve essere COERENTE con:
  - Ruolo del giocatore (non tutte le istruzioni esistono per tutti i ruoli)
  - Stile di gioco del giocatore
  - Posizione in campo
• Se non sei SICURO che un'istruzione esista per quel ruolo, NON proporla
• Preferibile: NON menzionare istruzioni individuali se non hai certezza al 100%

DOMANDE:
1. 
2. 
3. `
}

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const reqLang = getPreferredLanguageFromRequest(req)
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: getApiError('CONFIG_MISSING', reqLang) },
        { status: 500, headers: { 'Content-Language': reqLang } }
      )
    }
    
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json(
        { error: getApiError('AUTH_REQUIRED', reqLang) },
        { status: 401, headers: { 'Content-Language': reqLang } }
      )
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json(
        { error: getApiError('AUTH_INVALID', reqLang) },
        { status: 401, headers: { 'Content-Language': reqLang } }
      )
    }
    
    const userId = userData.user.id
    
    // Rate limiting (config in lib/rateLimiter.js, coerente con altri endpoint)
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/assistant-chat']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/assistant-chat',
      rateLimitConfig?.maxRequests ?? 30,
      rateLimitConfig?.windowMs ?? 60000
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: getApiError('RATE_LIMIT', reqLang), 
          resetAt: rateLimit.resetAt 
        },
        { 
          status: 429,
          headers: {
            'Content-Language': reqLang,
            'X-RateLimit-Limit': String(rateLimitConfig?.maxRequests ?? 30),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt)
          }
        }
      )
    }
    
    // Parse request
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: getApiError('BODY_INVALID', reqLang) },
        { status: 400, headers: { 'Content-Language': reqLang } }
      )
    }
    
    const { message: rawMessage, currentPage, appState, language = 'it', history: rawHistory } = body
    const lang = (language === 'en' || language === 'it') ? language : 'it'

    if (!rawMessage || typeof rawMessage !== 'string') {
      return NextResponse.json(
        { error: getApiError('MESSAGE_REQUIRED', lang) },
        { status: 400, headers: { 'Content-Language': lang } }
      )
    }
    const message = rawMessage.trim()
    if (message.length === 0) {
      return NextResponse.json(
        { error: getApiError('MESSAGE_REQUIRED', lang) },
        { status: 400, headers: { 'Content-Language': lang } }
      )
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: getApiError('MESSAGE_TOO_LONG', lang) },
        { status: 400, headers: { 'Content-Language': lang } }
      )
    }

    const safeCurrentPage = typeof currentPage === 'string' && currentPage.length > MAX_CURRENT_PAGE_LENGTH
      ? currentPage.slice(0, MAX_CURRENT_PAGE_LENGTH)
      : (currentPage || '')

    // appState: solo chiavi ammesse (sicurezza, evita payload enormi)
    const allowedAppStateKeys = ['completingMatch', 'viewingMatch', 'managingFormation', 'viewingDashboard']
    const safeAppState = appState && typeof appState === 'object'
      ? Object.fromEntries(
          allowedAppStateKeys
            .filter(k => Object.prototype.hasOwnProperty.call(appState, k))
            .map(k => [k, !!appState[k]])
        )
      : {}

    const history = normalizeHistory(rawHistory)
    
    // Costruisci contesto personale
    let context
    try {
      context = await buildAssistantContext(userId, safeCurrentPage, safeAppState)
      if (!context) {
        console.warn('[assistant-chat] Context building returned null, using empty context')
        context = { profile: {}, currentPage: currentPage || '', appState: safeAppState }
      }
    } catch (contextError) {
      console.error('[assistant-chat] Error building context:', contextError)
      context = { profile: {}, currentPage: currentPage || '', appState: safeAppState }
    }

    // RAG eFootball: se la domanda riguarda eFootball, carica sezioni rilevanti da info_rag
    let efootballKnowledge = ''
    if (classifyQuestion(message) === 'efootball') {
      try {
        efootballKnowledge = getRelevantSections(message, 18000)
        if (efootballKnowledge) console.log('[assistant-chat] RAG eFootball: loaded sections')
      } catch (ragError) {
        console.error('[assistant-chat] RAG error (non-blocking):', ragError.message)
      }
    }

    // Contesto personale (rosa, partite, tattica, allenatore): solo se la domanda lo richiede
    let personalContextSummary = ''
    if (needsPersonalContext(message)) {
      try {
        personalContextSummary = await buildPersonalContext(userId)
        if (personalContextSummary) console.log('[assistant-chat] Personal context loaded')
      } catch (pcError) {
        console.error('[assistant-chat] buildPersonalContext error (non-blocking):', pcError?.message)
      }
    }

    // Costruisci prompt personalizzato (con eventuali blocchi RAG eFootball e contesto personale)
    let prompt
    try {
      prompt = buildPersonalizedPrompt(message, context, lang, efootballKnowledge, personalContextSummary, history.length > 0)
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Empty prompt generated')
      }
    } catch (promptError) {
      console.error('[assistant-chat] Error building prompt:', promptError)
      throw new Error('Error building AI prompt')
    }

    // Chiama OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: getApiError('OPENAI_KEY_MISSING', lang) },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }
    
    // Usa il modello migliore disponibile
    // GPT-4o è stabile e disponibile per chat testuale
    // TODO: Quando GPT-5 sarà disponibile e testato, aggiornare qui
    const model = 'gpt-4o' // Modello stabile e disponibile
    
    const systemContent = `Sei un coach AI personale e amichevole per eFootball. Siamo i coach migliori: non sbagliamo. Rispondi in modo empatico, motivante e DECISO. Dai consigli concreti, non vaghi. Usa il nome del cliente quando appropriato.

ASPETTATIVA CLIENTE - SOLUZIONI E CONSIGLI: L'utente si aspetta un'IA con questa conoscenza abbia soluzioni e consigli. Ogni risposta deve contenere almeno un consiglio operativo o una soluzione (cosa fare, chi mettere, dove andare, come procedere). Non rispondere solo in modo descrittivo o informativo: sii propositivo. Anche quando i dati sono parziali: la "soluzione" è il percorso concreto per caricare i dati e chiedere di nuovo.

LINGUA: Rispondi SEMPRE in ${lang === 'it' ? 'italiano' : 'inglese'} (la richiesta indica la lingua del cliente).

CONTESTO: Il messaggio utente inizia con "CONTESTO ATTUALE" (pagina dove si trova il cliente + domanda). Usa SEMPRE quel contesto per ancorare la risposta e non confondere l'argomento.

RAGIONAMENTO OBBLIGATORIO - CERCA SEMPRE NEI BLOCCHI (prima di rispondere):
1. Leggi CONTESTO ATTUALE e la domanda del cliente.
2. Determina quali blocchi servono: CONTESTO PERSONALE CLIENTE (rosa, partite, tattica, allenatore), KNOWLEDGE eFootball (stili, moduli, meccaniche, abilità), FUNZIONALITÀ (come fare X nell'app). Una domanda può richiedere più blocchi (es. "che modulo mi consigli?" = rosa + moduli).
3. Cerca SEMPRE nel blocco rilevante prima di rispondere: non inventare nomi, path o meccaniche. Se c'è CONTESTO PERSONALE → leggi titolari, riserve, partite, tattica, allenatore. Se c'è KNOWLEDGE eFootball → leggi la sezione pertinente (stili, moduli, note critiche). Se è come fare X → usa solo FUNZIONALITÀ.
4. Ragionamento serio: incrocia i dati quando servono (es. consiglio modulo → guarda formazione attuale + giocatori + competenze allenatore), poi formula la risposta in max 3 punti + "In sintesi: [azione]".
5. Rispondi SOLO in base a ciò che hai letto nei blocchi; se un dato non c'è, dillo una volta e proponi il passo concreto (es. carica rosa, poi chiedimi di nuovo).

OBBLIGATORIO - SUGGERIMENTI SULLO STESSO ARGOMENTO: Alla FINE di ogni risposta aggiungi SEMPRE il blocco SUGGERIMENTI con 3 domande. Regola fondamentale:
- TUTTE E 3 le domande devono restare sullo STESSO argomento della risposta. VIETATO mescolare: una su formazione, una su partita, una su difficoltà (tre temi diversi). Una sola risposta = un solo tema = tre domande su quel tema.
- Se parli di formazione → le 3 domande sono tutte su formazione/rosa/modulo/sostituzioni (es. "Chi metto in panchina?", "Quale modulo con questa rosa?", "Come vedo le competenze delle riserve?").
- Se parli di partita → le 3 su partita/wizard/analisi (es. "Come estraggo le pagelle?", "Cosa fare se manca uno step?", "Dove vedo il riassunto?").
- Se parli di stili/ruoli → le 3 su stili/allenatore/competenze. Un solo argomento per risposta.
Formato: su nuove righe, SUGGERIMENTI: poi 1. ... 2. ... 3. ... Senza questo blocco l'utente non vede i pulsanti.

REGOLA ENTERPRISE - MAI "NON TROVO" QUANDO HAI I DATI:
- Se nel prompt c'è il blocco "CONTESTO PERSONALE CLIENTE" → HAI la rosa, le partite, la tattica. USA quei dati e rispondi in modo costruttivo. VIETATO dire "non trovo nulla", "non vedo la rosa", "carica i dati", "non ho informazioni sulla squadra". Rispondi usando il blocco.
- Domande tipo "Come pensi che sia la mia rosa?", "Come sono andato nelle partite?", "Ho vinto nell'ultima?", "Che ne pensi?" → se c'è CONTESTO PERSONALE rispondi USANDO i dati: per la rosa fai un riassunto (difensori, centrocampisti, attaccanti) e un breve parere; per le partite indica risultati e se ha vinto l'ultima. MAI "carica la rosa" o "carica la partita".
- ROSA/PARTITE VUOTI: Se nel blocco CONTESTO PERSONALE vedi "Nessuna partita caricata." o nessun giocatore sotto TITOLARI/Riserve → risposta COSTRUTTIVA: (1) "Non ho ancora rosa/partite", (2) percorso concreto (Gestione Formazione → carica formazione/riserve; Aggiungi Partita → wizard 5 step), (3) "Poi chiedimi di nuovo". Non rispondere solo "carica i dati".
- SCOPE E PRIMA IMPRESSIONE: Quando i dati sono completi (rosa + partite) → analisi piena. Quando parziali (solo formazione/tattica/allenatore, rosa vuota o nessuna partita) → dai una prima impressione su ciò che c'è (es. stile squadra, allenatore) e invita a caricare il resto per un parere più preciso. Es: "Hai impostato stile squadra e allenatore; per un parere sulla rosa vai su Gestione Formazione, carica la formazione e chiedimi di nuovo."
- Se nel prompt c'è il blocco "KNOWLEDGE eFootball" → HAI le meccaniche/stili/tattica eFootball. USA quel knowledge e rispondi. Per domande su MECCANICHE e GESTIONE AZIONI: usa i CONSIGLI OPERATIVI presenti nel blocco (es. "Utile quando...", "Efficace in...", "Considera rischio...", esempi §10 NOTE CRITICHE). Risposta breve e operativa; non elencare lunghi ragionamenti. VIETATO dire "non ho dati sufficienti" per domande su stili, ruoli, formazione, abilità: rispondi con ciò che è nel blocco.
- "Non ho questo dato" va detto SOLO se il cliente chiede qualcosa di SPECIFICO assente (es. "quanto ha segnato [nome]" e quel nome non è nel CONTESTO PERSONALE). Per tutto il resto: rispondi da coach con ciò che hai.
- I 3 SUGGERIMENTI in coda possono essere domande esplicite che il cliente può cliccare senza riscrivere: es. "Dimmi che difensori ho", "Ho vinto nell'ultima partita?", "Chi mettere in panchina?", "Come sono andato nelle partite?".

VIETATO RISPOSTE VAGHE:
- NON dire "controlla qui", "fai un controllo", "vai nella sezione X", "dovresti verificare" senza dare il percorso esatto e i passi concreti. Sempre: "Vai su [path reale] → [azione] → [risultato]".
- NON supporre né essere evasivo: "suppongo che", "probabilmente", "dovresti controllare" → sostituisci con la risposta concreta o i passi concreti (1. 2. 3.).

COACH PER CENTINAIA DI DOMANDE:
Rispondi in modo perfetto e costruttivo a tutte le domande che il cliente può fare: formazione, rosa, partite, stili, tattica, wizard partita, profilo, contromisure, allenatori, guida, difficoltà, sostituzioni, modulo, analisi, come fare X, cos'è Y, chi mettere, cosa cambiare, ecc. Per ogni categoria usa il blocco rilevante (CONTESTO PERSONALE, KNOWLEDGE eFootball, FUNZIONALITÀ) e dai una risposta da coach: concreta, operativa, motivante. Una sola risposta = un solo tema; concludi con "In sintesi: [azione]" quando possibile.

PRIMA DI OGNI RISPOSTA - CHECKLIST (cerca sempre nei blocchi, ragionamento serio):
1. Ho letto CONTESTO ATTUALE e la domanda? Ho identificato quale blocco usare (CONTESTO PERSONALE / KNOWLEDGE eFootball / FUNZIONALITÀ)?
2. Ho cercato nel blocco rilevante prima di rispondere? Non inventare: rispondi solo con dati presenti nei blocchi.
3. Funzionalità app: sto citando solo una delle 9 funzionalità reali? Se no → "Questa funzionalità non è disponibile, posso aiutarti con [alternativa]".
4. Rosa/partite/tattica: c'è CONTESTO PERSONALE? Se SÌ → usalo e rispondi; se NO → invita a caricare i dati (con percorso concreto).
5. eFootball/meccaniche: c'è KNOWLEDGE eFootball? Se SÌ → usalo e rispondi; se NO e domanda molto specifica → "Per quella domanda specifica carica la rosa o chiedi in un altro modo".
6. Storia conversazione presente? Se sì → NON salutare di nuovo.

CONTINUITÀ: Se c'è storia conversazione, NON risalutare. Continua in modo naturale.

Quando il cliente chiede come fare qualcosa: guida passo-passo con passi concreti (es. "Vai su Aggiungi Partita (/) → Clicca su step 1 → Carica screenshot pagelle"). Alla fine: "Se hai dubbi, dimmelo!" (IT) / "If you have doubts, just ask!" (EN).

🎯 REGOLA D'ORO - CONSIGLI TATTICI (ENTERPRISE):
Quando vedi "CONTESTO PERSONALE CLIENTE": usa SOLO i nomi e dati che leggi. Risposta BREVE e OPERATIVA: il ragionamento (ruoli, stili, perché) lo fai da dietro le quinte; al cliente dai solo l'azione. Esempio CORRETTO: "Metti Bellingham al posto di [Tizio] per migliore sinergia con Yamal." NON: "Bellingham grazie al suo ruolo CLD centrocampista laterale e alla sua capacità..." (troppo lungo).
SINERGIA: NON dire MAI "carica una partita per vedere la sinergia tra X e Y" — quei dati non esistono nell'app. La sinergia la SUGGERISCI TU in base a ruoli, stili e position nel CONTESTO PERSONALE. Risposta: "Metti [nome] al posto di [nome] per migliore sinergia." (ragionamento dietro le quinte).

VIETATO ASSOLUTO:
- "potenziare/migliorare lo stile" o "far crescere/allenare il giocatore" (stili e stats sono FISSI sulla card).
- Citare Collante/Box-to-Box per attaccanti; Istinto attacante/Ala prolifica per difensori (stili per ruolo).
- Consigliare stile squadra con competenza allenatore < 50 (solo >= 70).
- Complimenti generici ("eccezionali", "fantastici") senza dati concreti; usa "buildato", "competenze", "profilazione".
- Inventare funzionalità, path, nomi giocatori o partite non nel prompt.
- Inventare istruzioni individuali: esistono SOLO Offensivo, Difensivo, Ancoraggio, Marcatura stretta, Marcatura uomo, Contropiede, Linea bassa (vedi KNOWLEDGE sezione 5). NON dire "istruzioni per passaggi corti", "istruzioni per cross", "favorire passaggi": non esistono. Per passaggi corti → Stile Squadra (Possesso palla, Tiki-Taka). Per cross → Stile Squadra Cross e Finalizzazione o giocatori Specialista cross.
- Inventare abilità giocatore: le abilità sono SOLO quelle della sezione 8 (Tiro al volo, Passaggio di prima, Passaggio filtrante, Contrasto Aggressivo, Intercettazione, Marcatura, Resistenza superiore, ecc.). NON inventare nomi (es. "abilità di pressing", "abilità di posizionamento"). Aggiungere abilità: solo tramite Programmi Aggiunta Abilità; NON per giocatori Trending (per Trending: "quella card non può ricevere abilità aggiuntive; schierala così com'è o usa un'altra card"). Consiglia abilità coerenti con il ruolo (difensori → 8.4, portieri → 8.5, punte → 8.1/8.2).

Se un dato SPECIFICO richiesto non c'è (es. nome giocatore non in rosa): dillo una volta ("Non vedo [X] nel tuo profilo/rosa"). Per tutto il resto: rispondi usando CONTESTO PERSONALE o KNOWLEDGE eFootball se presenti; non dire "non trovo" quando il blocco c'è.

Piattaforma: solo le 9 funzionalità e path reali (/, /gestione-formazione, /match/new, /contromisure-live, /allenatori, /guida, /impostazioni-profilo). eFootball: solo dal blocco KNOWLEDGE se presente. Contesto: solo dal blocco CONTESTO PERSONALE se presente.`

    const openAIMessages = [
      { role: 'system', content: systemContent },
      ...history.map(({ role, content }) => ({ role, content })),
      { role: 'user', content: prompt }
    ]

    const requestBody = {
      model: model,
      messages: openAIMessages,
      temperature: 0.7,
      max_tokens: 450, // Guida passo-passo: spazio per 4-6 frasi quando serve
      response_format: { type: 'text' }
    }
    
    // Chiama OpenAI con retry (gestisce anche fallback GPT-4o se GPT-5 non disponibile)
    let response
    try {
      response = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
      
      // callOpenAIWithRetry può lanciare errore invece di restituire Response
      if (!response || typeof response.ok === 'undefined') {
        throw new Error('Invalid response from OpenAI API')
      }
    } catch (retryError) {
      console.error('[assistant-chat] callOpenAIWithRetry error:', retryError)
      // Se è un oggetto errore con message, usa quello
      const errorMsg = retryError?.message || retryError?.type || 'Error calling OpenAI API'
      throw new Error(errorMsg)
    }
    
    // Verifica che response sia valida
    if (!response || !response.ok) {
      let errorMessage = 'OpenAI API error'
      try {
        if (response) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
          
          // Se GPT-5 non disponibile, fallback a GPT-4o
          if (errorData.error?.code === 'model_not_found' && model === 'gpt-5') {
            console.log('[assistant-chat] GPT-5 non disponibile, fallback a GPT-4o')
            requestBody.model = 'gpt-4o'
            try {
              const fallbackResponse = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
              if (fallbackResponse && fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json().catch(() => ({}))
                const fallbackMsg = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
                const raw = fallbackData.choices?.[0]?.message?.content || fallbackMsg
                const { cleanContent: fc, suggestions: fs } = parseSuggestionsFromContent(raw)
                const finalSuggestions = (Array.isArray(fs) && fs.length > 0) ? fs : getDefaultSuggestions(lang)
                return NextResponse.json({
                  response: fc,
                  suggestions: finalSuggestions,
                  remaining: rateLimit.remaining,
                  resetAt: rateLimit.resetAt
                })
              }
            } catch (fallbackError) {
              console.error('[assistant-chat] Fallback error:', fallbackError)
            }
          }
          
          errorMessage = errorData.error?.message || errorMessage
        }
      } catch (parseError) {
        console.error('[assistant-chat] Error parsing error response:', parseError)
      }
      throw new Error(errorMessage)
    }
    
    // Parse risposta JSON con gestione errori
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error('[assistant-chat] JSON parse error:', jsonError)
      throw new Error('Invalid response from OpenAI API')
    }
    
    // Estrai contenuto con fallback sicuro (doppia lingua)
    const fallbackReply = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
    const rawContent = data?.choices?.[0]?.message?.content ||
                       data?.choices?.[0]?.content ||
                       fallbackReply

    // Estrai 3 suggerimenti cliccabili dal blocco SUGGERIMENTI (se presente) e pulisci il testo mostrato
    const { cleanContent, suggestions } = parseSuggestionsFromContent(rawContent)
    
    // Validazione base: verifica che la risposta non contenga riferimenti a funzionalità inventate
    if (cleanContent.toLowerCase().includes('funzionalità non disponibile') || 
        cleanContent.toLowerCase().includes('non è ancora disponibile')) {
      console.log('[assistant-chat] AI ha ammesso funzionalità non disponibile - comportamento corretto')
    }

    // Tracciamento crediti (fire-and-forget, non blocca risposta)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey && supabaseUrl) {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      await recordUsage(admin, userId, 1, 'assistant-chat')
    }

    const finalSuggestions = (Array.isArray(suggestions) && suggestions.length > 0) ? suggestions : getDefaultSuggestions(lang)
    return NextResponse.json(
      {
        response: cleanContent,
        suggestions: finalSuggestions,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt
      },
      { headers: { 'Content-Language': lang } }
    )
    
  } catch (error) {
    console.error('[assistant-chat] Error:', error)
    const errLang = getPreferredLanguageFromRequest(req)
    return NextResponse.json(
      { error: getApiError('GENERIC_ERROR', errLang) },
      { status: 500, headers: { 'Content-Language': errLang } }
    )
  }
}
