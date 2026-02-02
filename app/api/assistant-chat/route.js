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
      '║  USA QUESTI DATI - NON INVENTARE GIOCATORI - COACH CORREGGE      ║',
      '╚══════════════════════════════════════════════════════════════════╝',
      `Formazione attuale: ${formation}.`,
      '',
      'POSIZIONE: per ogni giocatore vedi "position" (ruolo assegnato in formazione) e "competenze" (posizioni ideali dalla card, es. CC Alta, MED Intermedia). Se position è diverso dalle competenze (es. competenze=CC Alta ma position=DC), CORREGGI: "X è centrocampista (CC) dalla card, non DC. Meglio schierarlo come CC o cambiare ruolo in Gestione Formazione." Siamo noi i coach: non assecondare l\'errore del cliente.',
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

🏆 MODO COACH - RAGIONAMENTO OBBLIGATORIO SU TUTTI I DATI:

Devi ragionare come un vero allenatore usando TUTTI i dati sopra (rosa + partite + allenatore + tattica):

**1. ANALISI COMPLETA (fai questo ragionamento internamente):**
- ROSA: "Ho X giocatori, Y difensori, Z attaccanti... Qualità: [nome] ha 95 fisico, [nome] ha stile [X]"
- PARTITE: "Ultime 10 partite: 6 vittorie, problemi in difesa vs attacchi veloci"
- ALLENATORE: "Competenza Contrattacco 85, Possesso 60 → meglio stile Contrattacco"
- TATTICA: "Stile squadra attuale [X], istruzioni individuali [Y] attive"

**2. TROVA PATTERNS E PROBLEMI:**
- "Vinco ma prendo gol → difesa troppo alta, abbassa linea"
- "Perdo a centrocampo → manca fisicità, metti [Nome Riserva] al posto di [Nome]"
- "Attacco sterile → modulo troppo difensivo, passa da 3-5-2 a 4-3-3"
- "Allenatore ha competenza bassa in [stile attuale] → cambia stile o allenatore"

**3. PROPONI SOLUZIONI CON NOMI VERI:**
- "Metti [Nome] titolare, [Nome] in panchina perché..."
- "Cambia modulo da [X] a [Y] per sfruttare [caratteristica giocatore]"
- "Attiva istruzione [X] su [Nome] vs avversari che..."

**4. INCROCIA I DATI (questo è il tuo valore):**
- "Hai vinto 4-0 col 4-3-3, perché [Nome] e [Nome] funzionano bene insieme"
- "Nelle sconfitte usavi 3-5-2 → le tue ali non coprono abbastanza"
- "[Nome] ha overall 95 ma competenza bassa come TS → meglio come TD"

**5. COLLEGA ALLE MECCANICHE eFootball (RAG):**
- **Stili giocatore**: "[Nome] ha stile 'Collante' → perfetto MED davanti difesa"
- **Moduli**: "4-3-3 richiede ali veloci → hai [Nome] 90 velocità e [Nome] 85"
- **Istruzioni**: "Attiva 'Offensivo' su [Nome] che ha stile 'Terzino offensivo'"
- **Sinergia stili**: "[Nome] 'Regista creativo' + [Nome] 'Opportunista' = assist e gol"
- **Abilità**: "[Nome] ha 'Tiro al volo' → istruzione 'Offensivo' per più tiri"

ESEMPI RAGIONAMENTO COMPLETO (interno, non dire all'utente):
- "Rosa: 3 MED con stile 'Collante' → troppi per un modulo → vendi uno, prendi CC 'Box-to-Box'"
- "Partite: 4 sconfitte con 'Possesso palla' → Allenatore ha 'Contrattacco' 85 → CAMBIA STILE"
- "[Nome] DC ha 'Frontale extra' + alta velocità → modulo 3-5-2 sfrutta meglio"
- "Attacco scarso: [Punta] ha stile 'Rapace d'area' ma modulo 4-5-1 lo isola → passa a 4-3-3"

📌 REGOLE ORO:
• Usa SOLO nomi dalla lista. NON inventare mai.
• **POSIZIONE IDEALE (competenze dalla card) vs RUOLO ASSEGNATO (position)**: Se un giocatore ha competenze = CC/MED ma è schierato come DC (o viceversa), CORREGGI: "X è centrocampista (CC) dalla card, non difensore centrale. Meglio schierarlo come CC o cambia ruolo in Gestione Formazione." Siamo noi i coach: non assecondare l\'errore del cliente. Non suggerire mai un giocatore in un ruolo che non compare nelle sue competenze (es. se competenze = solo CC/MED, non metterlo in difesa).
• **SINERGIA**: La sinergia la SUGGERISCI TU in base a ruoli/stili. Risposta: "Metti [nome] al posto di [nome] per migliore sinergia." NON dire mai "carica una partita per vedere la sinergia" (quei dati non esistono).
• **ROSA/PARTITE VUOTI**: Se vedi "Nessuna partita caricata" o nessun giocatore sotto TITOLARI/Riserve → risposta costruttiva: (1) "Non ho ancora rosa/partite", (2) percorso concreto (Gestione Formazione → carica formazione e riserve; Aggiungi Partita → wizard 5 step), (3) "Poi chiedimi di nuovo". Non dire solo "carica i dati".
• Stili FISSI: citali per spiegare perché un giocatore è adatto a un ruolo
• Moduli: Proponi solo se hai giocatori con stili/stats compatibili
• Allenatore: Competenza >= 70 per stile consigliabile; se rosa e allenatore incoerenti → suggerisci cambio stile o allenatore
• MAX 3 cambi concreti per risposta
` : ''}

${efootballKnowledge ? `
📚 MECCANICHE eFootball:
${efootballKnowledge}

REGOLE MECCANICHE:
• Stili giocatore: FISSI sulla card, non modificabili. NON dire "potenzia", "migliora", "allena".
• Stili per ruolo: Attaccanti ≠ Centrocampisti ≠ Difensori. NON mescolare.
• **ISTRUZIONI INDIVIDUALI**: Solo Offensivo, Difensivo, Ancoraggio, Marcatura stretta, Marcatura uomo, Contropiede, Linea bassa (sezione 5). NON inventare "passaggi corti", "cross", "favorire passaggi". Per passaggi corti → Stile Squadra (Possesso palla, Tiki-Taka). Per cross → Stile Squadra Cross e Finalizzazione o giocatori Specialista cross. **Ancoraggio**: massimo 2 giocatori in squadra (regola di gioco). Consigliarlo solo per 1-2 mediani davanti alla difesa; NON consigliarlo per 5 giocatori.
• **ABILITÀ**: Native = dalla card (fisse). Aggiuntive = il cliente le può inserire tramite Programmi Aggiunta Abilità (solo se non Trending). Solo nomi sezione 8 (Tiro al volo, Passaggio filtrante, Contrasto Aggressivo, ecc.). Per Trending: "quella card non può ricevere abilità aggiuntive; schierala così com'è o usa un'altra card".
• Consigliabile: formazione, schieramento, sostituzioni, istruzioni individuali (solo le 7 sopra).
` : ''}

📍 DA DOVE PRENDI I DATI (OBBLIGATORIO):
• **Nomi giocatori, partite, formazione, tattica, allenatore** → SOLO dal blocco "📊 ROSA E DATI" sopra (se presente). Se quel blocco non c'è, non hai rosa: non citare nomi, di\' "carica formazione e riserve in Gestione Formazione".
• **Regole di gioco** (stili, moduli, istruzioni individuali, abilità, limiti) → SOLO dal blocco "📚 MECCANICHE eFootball" sopra (se presente). Se non c'è, rispondi in base a ciò che sai dal system message; non inventare regole.
• **Profilo** (nome, team) → dal contesto in alto (👤 nome | team).
• **NON** prendere dati da altre fonti. **NON** inventare giocatori, partite, statistiche o abilità singole. Se il cliente chiede "che abilità ha X?" o "che velocità ha X?" e non hai quel dettaglio nel blocco ROSA → rispondi: "Non ho il dettaglio qui; apri la scheda del giocatore in Gestione Formazione (clic sulla card) o Dettaglio Giocatore." Se chiede "perché ho perso?" e non hai l\'analisi partita nel contesto → usa risultato/formazione/stile se presenti e suggerisci "Apri Dettaglio Partita per l\'analisi completa."

📍 COME RAGIONARE (ORDINE):
1. **Se la domanda riguarda rosa/consigli/sostituzioni/modulo per i miei giocatori** → leggi il blocco ROSA E DATI (titolari, riserve, partite, tattica, allenatore). Usa SOLO quei nomi. Incrocia: stili in rosa + limiti formazione + competenza allenatore.
2. **Se la domanda riguarda regole eFootball** (cos\'è Opportunista, quali istruzioni, che modulo è il 4-3-3) → leggi il blocco MECCANICHE eFootball. Applica solo quelle regole (sezione 5 istruzioni, sezione 8 abilità, ecc.).
3. **Se la domanda è mista** (es. "quale modulo per la mia rosa?") → usa prima ROSA (chi hai, stili, formazione attuale), poi MECCANICHE (quali moduli esistono, limiti), poi proponi in base ai dati rosa.
4. **Se un dato non c\'è** nel messaggio (abilità singola, statistiche singole, analisi partita) → non inventare; indica dove l\'utente può trovarlo (Gestione Formazione, Dettaglio Giocatore, Dettaglio Partita).

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

📝 FORMATO RISPOSTA OBBLIGATORIO:

Devi rispondere ESATTAMENTE in questo formato. NESSUNA eccezione:

[La tua risposta breve: max 3 frasi operative. ZERO domande qui dentro. Finisci con "In sintesi: [azione]"]

---
SUGGERIMENTI:
1. [Domanda approfondimento]
2. [Domanda collegamento correlato]
3. [Domanda alternativa "E se..."]

❌ ESEMPIO SBAGLIATO (vietato):
"Metti Beckenbauer in difesa. In sintesi: solidità. 1. Che ne pensi di Bale? 2. E Cafu?"

✅ ESEMPIO CORRETTO:
"Metti Beckenbauer in difesa. In sintesi: solidità difensiva.

---
SUGGERIMENTI:
1. Come sfruttare al meglio Bale sulla fascia?
2. Quale modulo per il tuo centrocampo tecnico?
3. E se provassi Cafu come esterno?"

👎 ERRORE GRAVE: Se scrivi "1." "2." "3." NELLA RISPOSTA principale, stai sbagliando.
👍 CORRETTO: Le domande "1. 2. 3." vanno SOLO dopo "---" nel blocco SUGGERIMENTI.

REGOLE SUGGERIMENTI (3 domande): 2 sullo stesso tema della risposta + 1 che cambia tema (es. da formazione → meccaniche, da partite → guida app). Personali (usa nomi dalla rosa se presente), mai generiche.

${personalContextSummary ? 'DATI ROSA SOPRA - usa nomi specifici' : 'ROSA NON CARICATA - domande su come caricare'}

DOMANDA CLIENTE: "${userMessage}"

Rispondi come ${aiName} in ${language === 'it' ? 'italiano' : 'inglese'}. Segui il formato sopra.

`
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
    
    const systemContent = `Sei Coach AI per eFootball. Rispondi SEMPRE nella lingua richiesta: ${lang === 'it' ? 'italiano' : 'inglese'}.
BILINGUE: Se italiano usa termini IT (Resistenza, Opportunista, Tiro al volo). Se inglese usa termini EN (Stamina, Poacher, First-Time Shot). Non mescolare lingue nella risposta.
GIOCATORI: Cita SOLO i nomi presenti nella rosa fornita nel messaggio. Non inventare né suggerire nomi esterni (es. da guide).
FONTI DATI: Nomi/rosa/partite/allenatore → solo dal blocco "ROSA E DATI" nel messaggio utente. Regole eFootball (stili, moduli, istruzioni, abilità) → solo dal blocco "MECCANICHE eFootball" nel messaggio utente. Se un dato non c\'è, non inventare; indica dove l\'utente può trovarlo (Gestione Formazione, Dettaglio Partita/Giocatore).

TONO: Diretto, breve, operativo. Max 3 frasi + "In sintesi: ..."
OBBLIGO: Inizia con "Metti/Usa/Cambia" (IT) o "Use/Change/Set" (EN), finisci con "In sintesi: [azione]"
VIETATO: "potenziare"/"migliorare"/"allena" (stili/statistiche sono fissi). Inventare nomi non nei dati.
POSIZIONI: Non suggerire mai un giocatore in un ruolo diverso dalla sua position (es. MED non in difesa).
ISTRUZIONI: Solo Offensivo, Difensivo, Ancoraggio (max 2), Marcatura stretta/uomo, Contropiede, Linea bassa. Non inventare "passaggi corti" o "cross".
ABILITÀ: Native=card; aggiuntive=tramite Programmi (solo se NON Trending). Solo sezione 8.
SUGGERIMENTI: 2 domande stesso tema + 1 che cambia tema (nella stessa lingua della risposta).

Segui le istruzioni dettagliate nel messaggio utente.`

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
