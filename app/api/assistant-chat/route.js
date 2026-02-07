import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getRelevantSections, classifyQuestion } from '@/lib/ragHelper'
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

/** Suggerimenti di fallback: variati (modulo, gameplay, meta) — non sempre contrattacco/sostituzioni. */
function getDefaultSuggestions(lang, currentPage = '') {
  const page = (currentPage || '').toLowerCase()
  const it = [
    { page: 'gestione-formazione', q: ['Quale modulo per la mia rosa?', 'Come gestire pressing e compattezza in partita?', 'Quali istruzioni individuali mi consigli?'] },
    { page: 'match/new', q: ['Quale modulo per la prossima partita?', 'Come difendere meglio in partita?', 'Quali formazioni sono più forti?'] },
    { page: 'match/', q: ['Perché ho perso questa partita?', 'Come gestire i calci piazzati?', 'Quali stili funzionano meglio?'] },
    { page: 'contromisure', q: ['Quale formazione contro il 4-3-3?', 'Come chiudere gli spazi in difesa?', 'Quali contromisure sono più efficaci?'] },
    { page: 'allenatori', q: ['Quale stile abbinare al mio allenatore?', 'Linea alta o bassa con questo stile?', 'Quali stili sono più efficaci?'] },
    { page: '', q: ['Quale modulo per la mia rosa?', 'Come migliorare costruzione e possesso?', 'Vuoi informazioni sul meta?'] }
  ]
  const en = [
    { page: 'gestione-formazione', q: ['Which formation for my roster?', 'How to manage pressing and compactness in a match?', 'Which individual instructions do you recommend?'] },
    { page: 'match/new', q: ['Which formation for my next match?', 'How to defend better in a match?', 'Which formations are strongest?'] },
    { page: 'match/', q: ['Why did I lose this match?', 'How to handle set pieces?', 'Which styles work best?'] },
    { page: 'contromisure', q: ['Which formation against 4-3-3?', 'How to close down space in defence?', 'Which countermeasures are most effective?'] },
    { page: 'allenatori', q: ['What style fits my coach?', 'High or deep line with this style?', 'Which styles are most effective?'] },
    { page: '', q: ['Which formation for my roster?', 'How to improve build-up and possession?', 'Want info on meta?'] }
  ]
  const list = lang === 'en' ? en : it
  for (const { page: p, q } of list) {
    if (p && page.includes(p)) return q
  }
  return (lang === 'en' ? en : it).find(x => x.page === '').q
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

/** Label contesto bilingue (IT/EN) - usate dall'IA per interpretare dati */
const CONTEXT_LABELS = {
  it: {
    formationNotSet: 'non impostata',
    reserves: 'Riserve',
    noMatches: 'Nessuna partita caricata.',
    starters: 'TITOLARI IN CAMPO (slot 0-10):',
    reservesNote: 'LE RISERVE sono in panchina: usale per sostituzioni. Consiglia solo giocatori di questo elenco e solo per ruoli compatibili con la loro position.',
    lastMatches: 'ULTIME PARTITE GIOCATE:',
    patternMatches: 'Pattern partite',
    partite: 'partite',
    vittorie: 'vittorie',
    recurringIssues: 'Problemi ricorrenti',
    skillsTitolari: 'SKILLS TITOLARI (per consigli abilità):',
    activeCoach: 'Allenatore attivo',
    coachNotSet: 'Nessun allenatore attivo impostato.',
    competenceHint: 'Competenze stili TATTICI (chiavi distinte: contrattacco ≠ contropiede_veloce; solo >= 70 consigliabili):',
    boxTitle: 'CONTESTO PERSONALE CLIENTE - DATI REALI DELLA ROSA',
    boxSubtitle: 'USA QUESTI DATI - PERSONALIZZA - CITA NOMI REALI - NON GENERICO',
    positionNote: 'POSIZIONE: per ogni giocatore vedi "position" (ruolo assegnato in formazione) e "competenze" (posizioni ideali dalla card, es. CC Alta, MED Intermedia). Se position è diverso dalle competenze (es. competenze=CC Alta ma position=DC), CORREGGI: "X è centrocampista (CC) dalla card, non DC. Meglio schierarlo come CC o cambiare ruolo in Gestione Formazione." Siamo noi i coach: non assecondare l\'errore del cliente.',
    teamStyle: 'Stile squadra',
    individualInstructions: 'Istruzioni individuali',
    instructionsActive: 'attive',
    advisableStyles: 'Consigliabili (>=70)',
    notAdvisableStyles: 'Non consigliabili (<70)',
    noneLabel: 'nessuno',
  },
  en: {
    formationNotSet: 'not set',
    reserves: 'Reserves',
    noMatches: 'No matches loaded.',
    starters: 'STARTERS (slot 0-10):',
    reservesNote: 'RESERVES are on the bench: use them for substitutions. Only recommend players from this list and only for roles compatible with their position.',
    lastMatches: 'LAST MATCHES PLAYED:',
    patternMatches: 'Match patterns',
    partite: 'matches',
    vittorie: 'wins',
    recurringIssues: 'Recurring issues',
    skillsTitolari: 'STARTER SKILLS (for ability advice):',
    activeCoach: 'Active coach',
    coachNotSet: 'No active coach set.',
    competenceHint: 'Style competences (contrattacco ≠ contropiede_veloce; only >= 70 advisable):',
    boxTitle: 'PERSONAL CLIENT CONTEXT - REAL ROSA DATA',
    boxSubtitle: 'USE THIS DATA - PERSONALIZE - CITE REAL NAMES - NOT GENERIC',
    positionNote: 'POSITION: for each player see "position" (assigned role) and "competenze" (ideal positions from card, e.g. CM High, DM Intermediate). If position differs from competenze (e.g. competenze=CM High but position=CB), CORRECT: "X is midfielder (CM) from card, not CB. Better field him as CM or change role in Formation Manager." We are the coaches: do not indulge client errors.',
    teamStyle: 'Team style',
    individualInstructions: 'Individual instructions',
    instructionsActive: 'active',
    advisableStyles: 'Advisable (>=70)',
    notAdvisableStyles: 'Not advisable (<70)',
    noneLabel: 'none',
  }
}

/**
 * Costruisce riassunto contesto personale cliente (formazione, rosa, partite, tattica, allenatore).
 * Sempre invocato: la chat è solo consulenza tattica sul cliente. In errore restituisce ''.
 * @param {string} userId - user_id da token
 * @param {'it'|'en'} lang - lingua per label (default 'it')
 * @returns {Promise<string>} Testo compatto (max MAX_PERSONAL_CONTEXT_CHARS) o ''
 */
async function buildPersonalContext(userId, lang = 'it') {
  const L = CONTEXT_LABELS[lang === 'en' ? 'en' : 'it']
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
    const formation = formationRow?.formation || L.formationNotSet

    // Players (titolari + riserve) - include skills per consigli abilità
    const { data: playersData, error: playersError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, playing_style_id, slot_index, photo_slots, base_stats, original_positions, card_type, skills, com_skills')
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
    const reservesHeader = L.reserves + ':'
    rosterLines.push(reservesHeader)
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
      ? [L.noMatches]
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
    const teamStyle = tacticalRow?.team_playing_style || L.formationNotSet
    const indInstr = tacticalRow?.individual_instructions
    const numInstructions = Array.isArray(indInstr) ? indInstr.length : (indInstr && typeof indInstr === 'object' ? Object.keys(indInstr).length : 0)
    const tacticsText = `${L.teamStyle}: ${teamStyle}. ${L.individualInstructions}: ${numInstructions} ${L.instructionsActive}.`

    // Allenatore attivo (con competenze stili per intreccio dati)
    const { data: coachRow } = await admin
      .from('coaches')
      .select('coach_name, playing_style_competence')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    let coachText = coachRow?.coach_name ? `${L.activeCoach}: ${coachRow.coach_name}.` : L.coachNotSet
    if (coachRow?.playing_style_competence && typeof coachRow.playing_style_competence === 'object') {
      const entries = Object.entries(coachRow.playing_style_competence)
        .map(([style, val]) => ({ style, val: parseInt(val, 10) || 0 }))
        .filter(({ val }) => !Number.isNaN(val))
        .sort((a, b) => b.val - a.val)
        .slice(0, 8)
      if (entries.length > 0) {
        const ok = entries.filter(({ val }) => val >= 70).map(({ style, val }) => `${style}=${val}`)
        const no = entries.filter(({ val }) => val < 70).map(({ style, val }) => `${style}=${val}`)
        coachText += ` ${L.competenceHint} ${L.advisableStyles}: ${ok.length ? ok.join(', ') : L.noneLabel}. ${L.notAdvisableStyles}: ${no.length ? no.join(', ') : '-'}.`
      }
    }

    // Pattern tattici (formation_usage, recurring_issues) - per intreccio consigli formazione/problemi
    let patternText = ''
    const { data: patternsRow } = await admin
      .from('team_tactical_patterns')
      .select('formation_usage, playing_style_usage, recurring_issues')
      .eq('user_id', userId)
      .maybeSingle()
    if (patternsRow) {
      const formUsage = patternsRow.formation_usage && typeof patternsRow.formation_usage === 'object' && Object.keys(patternsRow.formation_usage).length > 0
      const issues = Array.isArray(patternsRow.recurring_issues) && patternsRow.recurring_issues.length > 0
      if (formUsage) {
        const top = Object.entries(patternsRow.formation_usage)
          .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
          .slice(0, 2)
        patternText = top.map(([f, d]) => {
          const m = d?.matches || 0
          const wr = d?.win_rate != null ? Math.round(d.win_rate * 100) : '-'
          return `${f}: ${m} ${L.partite} (${wr}% ${L.vittorie})`
        }).join('; ')
        patternText = `${L.patternMatches}: ${patternText}.`
      }
      if (issues) {
        const issueList = patternsRow.recurring_issues.slice(0, 3).map(i => i?.issue || i).filter(Boolean).join(', ')
        patternText += (patternText ? ' ' : '') + `${L.recurringIssues}: ${issueList}.`
      }
    }

    // Skills sintesi (max 5 per titolare) - per consigli abilità
    const skillsLines = []
    const hasAnySkills = titolari.some(p => (Array.isArray(p.skills) && p.skills.length > 0) || (Array.isArray(p.com_skills) && p.com_skills.length > 0))
    if (hasAnySkills) {
      skillsLines.push('', L.skillsTitolari)
      for (const p of titolari.slice(0, 11)) {
        const all = [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].slice(0, 5)
        if (all.length > 0) {
          skillsLines.push(`  ${p.player_name || '?'}: ${all.join(', ')}`)
        }
      }
    }

    const parts = [
      '╔══════════════════════════════════════════════════════════════════╗',
      `║  ${L.boxTitle}                                                       ║`,
      `║  ${L.boxSubtitle}                                                    ║`,
      '╚══════════════════════════════════════════════════════════════════╝',
      `Formazione attuale: ${formation}.`,
      '',
      L.positionNote,
      '',
      L.starters,
      ...rosterLines.slice(0, rosterLines.findIndex(l => l === reservesHeader) + 1),
      ...rosterLines.slice(rosterLines.findIndex(l => l === reservesHeader) + 1),
      '',
      L.reservesNote,
      '',
      L.lastMatches,
      ...matchLines,
      '',
      tacticsText,
      coachText,
      ...(patternText ? ['', patternText] : [])
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
      pageContext = 'Il cliente sta caricando una nuova partita (wizard 6 step: prima Casa/Fuori, poi 5 sezioni foto).'
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

🔍 COME CERCARE E RAGIONARE (OBBLIGATORIO):

**1. CERCARE** – Dove cercare in base alla domanda:
- Rosa/consigli/sostituzioni → blocco ROSA E DATI (titolari, riserve, stili, posizioni) + PARTITE + ALLENATORE + TATTICA
- Regole eFootball (stili, moduli, istruzioni) → blocco MECCANICHE eFootball (se presente): trova la sezione ## corretta
${efootballKnowledge ? `- Se MECCANICHE presente: stili giocatore (Opportunista, Collante) → ## 2; stile squadra (Possesso, Contropiede) → ## 4; moduli → ## 3; istruzioni → ## 5; abilità → ## 8; limiti → ## 3.4` : ''}

**2. RAGIONARE** – Gli stili (RAG sez. 2) definiscono COSA FA il giocatore in campo. Es: Collante = MED arretrato; Rapace d'area = in agguato in area; Opportunista = aspetta palla in area; Regista creativo = assist; Terzino offensivo = si unisce all'attacco. Incrocia: rosa + partite, stili + moduli, allenatore + tattica. Solo dati che hai + RAG.

**3. PALETTI** – Solo nomi dalla rosa | Competenza >= 70 per stile | Istruzioni sez. 5 | Abilità sez. 8 | Ancoraggio max 2. Terminologia ufficiale (Opportunista non Poacher, Resistenza non Stamina).

**4. RISPONDERE** – Solo DOPO 1-2-3. Tono professionale e diretto.

🏆 MODO COACH - RAGIONAMENTO INCROCIATO OBBLIGATORIO:

**1. ANALISI COMPLETA (cerca e incrocia - fai internamente):**
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

**4b. SE HAI PATTERN PARTITE (formation_usage, problemi ricorrenti):**
- Usa formation_usage per consigliare formazione: "4-3-3 è la tua migliore (X partite, Y% vittorie)"
- Usa problemi ricorrenti come priorità: se "centrocampo debole" → priorità sostituzioni/ modulo che rafforza il centro

**5. COLLEGA STILI E MECCANICHE (RAG sez. 2):**
Stile → comportamento in campo → consiglio. Es: [Nome] Collante → MED davanti difesa; [Nome] Regista creativo + [Nome] Opportunista → sinergia assist/gol; 4-3-3 → ali veloci.

ESEMPI RAGIONAMENTO COMPLETO (interno, non dire all'utente):
- "Rosa: 3 MED con stile 'Collante' → troppi per un modulo → schiera 1-2 Collante, uno in panchina; preferisci un CC Box-to-Box o Onnipresente se in rosa"
- "Partite: 4 sconfitte con 'Possesso palla' → Allenatore ha 'Contrattacco' 85 → CAMBIA STILE"
- "[Nome] DC ha 'Frontale extra' + alta velocità → modulo 3-5-2 sfrutta meglio"
- "Attacco scarso: [Punta] ha stile 'Rapace d'area' ma modulo 4-5-1 lo isola → passa a 4-3-3"

📌 PERSONALIZZAZIONE E VARIETÀ (se hai ROSA sopra):
• Risposta DEVE usare NOMI REALI dalla rosa (titolari/riserve). Mai consigli generici senza citare i giocatori del cliente.
• Incrocia: rosa + partite + allenatore. Es: "Le tue ultime 3 sconfitte col Possesso → allenatore ha Contrattacco 85, cambia stile." Non: "Usa 4-3-3" senza riferirti ai suoi dati.
• MAX 3 cambi concreti, ma SPECIFICI (nome giocatore, posizione, motivo legato ai dati).
• VARIA i consigli in base al contesto: non proporre sempre contrattacco e sostituzioni. Includi quando rilevante: linea difensiva, pressing/compattezza, possesso e costruzione, istruzioni individuali, calci piazzati, modulo. Un vero coach adatta il messaggio alla situazione (rosa, partite, problemi ricorrenti).

📌 REGOLE ORO:
• Usa SOLO nomi dalla lista. NON inventare mai.
• **POSIZIONE IDEALE (competenze dalla card) vs RUOLO ASSEGNATO (position)**: Se un giocatore ha competenze = CC/MED ma è schierato come DC (o viceversa), CORREGGI: "X è centrocampista (CC) dalla card, non difensore centrale. Meglio schierarlo come CC o cambia ruolo in Gestione Formazione." Siamo noi i coach: non assecondare l\'errore del cliente. Non suggerire mai un giocatore in un ruolo che non compare nelle sue competenze (es. se competenze = solo CC/MED, non metterlo in difesa).
• **SINERGIA**: La sinergia la SUGGERISCI TU in base a ruoli/stili. Risposta: "Metti [nome] al posto di [nome] per migliore sinergia." NON dire mai "carica una partita per vedere la sinergia" (quei dati non esistono).
• **card_type (Trending/Epico/POTW/In evidenza/ecc.)**: Lo SAI dai dati rosa ("card: X"). NON dire "se non è Trending": di' direttamente "Messi è Trending, non può ricevere abilità aggiuntive" oppure "Pedri è Epico, puoi aggiungere abilità tramite Programmi".
• **ROSA/PARTITE VUOTI**: Se vedi "Nessuna partita caricata" o nessun giocatore sotto TITOLARI/Riserve → risposta breve: (1) "Non ho ancora rosa/partite per darti consigli tattici." (2) "Per caricare formazione e partite usa la Guida (menu) o il tour Mostrami come (bussola)." (3) "Poi chiedimi di nuovo per consigli su modulo, sostituzioni, stile." NON dare istruzioni passo-passo su dove cliccare o come usare il wizard.
• Stili FISSI: citali per spiegare perché un giocatore è adatto (stile → comportamento in campo → consiglio). Terminologia ufficiale.
• Moduli: Proponi solo se hai giocatori compatibili (stili + stats)
• Allenatore: Competenza >= 70 per stile consigliabile; se rosa e allenatore incoerenti → suggerisci cambio stile o allenatore. NON spingere un solo stile come "meta" (es. "tutti usano contropiede"): consiglia in base a rosa e competenza allenatore.
• **STILI ALLENATORE - CRITICO**: contrattacco e contropiede_veloce sono STILI DIVERSI (chiavi diverse). Consiglia uno stile SOLO se il suo valore è >= 70. VIETATO usare competenza di contrattacco per giustificare Contropiede veloce (e viceversa). Es: se contrattacco=89 e contropiede_veloce=57 → consiglia Contrattacco, NON Contropiede veloce.
• **NOMI**: Cita SOLO giocatori in TITOLARI/RISERVE. Mai Mbappé, Haaland, Pedri, Bellingham, ecc. se non nella lista.
• MAX 3 cambi concreti per risposta
` : ''}

${efootballKnowledge ? `
📚 MECCANICHE eFootball:
${efootballKnowledge}

⚠️ PALETTI PER SEZIONE RAG (cerca nella sezione indicata, rispetta, vedi STEP 2 RAGIONARE per stili):
| Domanda su | Cerca in sezione | Paletto obbligatorio |
|------------|------------------|----------------------|
| Stili giocatore (Opportunista, Collante, Rapace d'area, ecc.) | ## 2 STILI GIOCATORE | Cosa FA in campo: Collante=MED arretrato, Rapace d'area=in agguato in area, Opportunista=aspetta palla in area. Solo stili ufficiali. Per ruolo: Attaccanti ≠ Centrocampisti ≠ Difensori. FISSI. Stile squadra (Possesso, Contropiede) → ## 4. |
| Moduli (4-3-3, 4-2-3-1, ecc.) | ## 3 MODULI + ## 3.4 Limiti | Rispetta limiti formazione (max 2 P, max 1 CLD/CLS, ecc.). Incrocia con rosa disponibile. |
| Stili squadra (Possesso, Contropiede, ecc.) | ## 4 STILI TATTICI | Configurabili in app SOLO 5: Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali. NON suggerire Pressing Alto, Gegenpressing, Tiki-Taka ecc. come stile da impostare. Competenza allenatore >= 70 per suggerire. |
| Istruzioni individuali | ## 5 ISTRUZIONI | SOLO: Offensivo, Difensivo, Ancoraggio (max 2), Marcatura stretta/uomo, Contropiede, Linea bassa. Linea bassa: non a difensori. Contropiede (slot difesa): solo CC/attaccanti. NO passaggi corti/cross come istruzioni. |
| Abilità giocatori | ## 8 ABILITÀ | Solo nomi sez. 8. Native=fisse. Aggiuntive=Programmi (NON Trending). Max 6 totali. |
| Statistiche | ## 1 STATISTICHE | FISSE. Resistenza non Stamina. No "allenare/migliorare". |
| Gameplay (come difendo, pressing, calci piazzati, skill) | ## 7 MECCANICHE + ## 6 CALCI PIAZZATI | Descrivi SOLO COSA FARE (azioni: marcatura, contrasto spalla, chiamare pressing, corner/punizioni, finte). VIETATO citare tasti, pulsanti, R1/L1, ⚪/B, combinazioni controller. Solo da RAG; non inventare. |
| Qualsiasi | ## 10 NOTE CRITICHE | Errori comuni, esempi corretti, terminologia. SEMPRE rispettare. |

REGOLE MECCANICHE (sintesi):
• Stili: FISSI, definiscono comportamento in campo. Attaccanti ≠ Centrocampisti ≠ Difensori. Terminologia ufficiale.
• ISTRUZIONI: Solo sez. 5. Ancoraggio max 2. No passaggi corti/cross.
• ABILITÀ: Solo sez. 8. Trending no Programmi. Max 6 totali.
• GAMEPLAY: Come difendere, pressing, calci piazzati, skill → solo sez. 6 e 7 (RAG). Descrivi solo COSA FARE (azioni). VIETATO citare tasti, pulsanti, R1/L1, ⚪/B o combinazioni controller.
` : ''}

📍 DA DOVE PRENDI I DATI (OBBLIGATORIO):
• **Nomi giocatori, partite, formazione, tattica, allenatore** → SOLO dal blocco "📊 ROSA E DATI" sopra (se presente). Se quel blocco non c'è, non hai rosa: non citare nomi; di\' di usare la Guida (menu) o il tour Mostrami come (bussola) per caricare formazione e partite, poi chiedere di nuovo per consigli tattici. NON dare istruzioni passo-passo (es. "vai in Gestione Formazione", "clicca su...").
• **Regole di gioco** (stili, moduli, istruzioni individuali, abilità, limiti) → SOLO dal blocco "📚 MECCANICHE eFootball" sopra (se presente). Se non c'è, rispondi in base a ciò che sai dal system message; non inventare regole.
• **Profilo** (nome, team) → dal contesto in alto (👤 nome | team).
• **NON** inventare dati. DOMANDE DIRETTE SU DATI ("che abilità ha X?", "quale velocità?", "cosa ha nel mio giocatore?") → risposta standard: "Per abilità e statistiche apri la scheda giocatore in Gestione Formazione. Posso aiutarti con consigli tattici: formazione, stile, sostituzioni, istruzioni." Se chiede "perché ho perso?" senza analisi nel contesto → suggerisci "Apri Dettaglio Partita per l'analisi completa" e offri consiglio tattico generico.

📍 ORDINE RAGIONAMENTO (vedi COME CERCARE E RAGIONARE sopra):
- Rosa/consigli/modulo → cerca ROSA + MECCANICHE, incrocia stili+moduli+allenatore, poi consiglio.
- Regole eFootball (cos'è Opportunista, Collante, ecc.) → cerca MECCANICHE sez. ## 2, spiega cosa FA in campo, terminologia ufficiale.
- Dato non presente → non inventare. Puoi indicare in quale sezione si trova (es. scheda giocatore, Dettaglio Partita); per come usare l'app o dove cliccare rimanda alla Guida o al tour Mostrami come.

🔄 CONTINUITÀ CONVERSAZIONE (OBBLIGATORIO):
- **Stesso schema**: Se in questa chat hai già consigliato un modulo o posizioni per uno o più giocatori, le risposte successive devono RISPETTARE quello schema. Stesso modulo; inserisci il nuovo giocatore (o la nuova domanda) in quello schema. NON proporre un modulo diverso che stravolge il precedente.
- **Recap breve**: Quando la risposta dipende da un consiglio che hai dato prima, includi UNA frase di recap (es. "Con il 4-3-3 e Pedri MED centrale che ti ho detto, Bellingham sta bene come MED sinistro"). Così il cliente non deve scorrere indietro.
- **"Perché?"**: Se l'utente chiede "perché?" o "in che senso?" o "spiegami" rispetto all'ultimo consiglio, rispondi in 1-2 frasi usando SOLO dati (stile giocatore da RAG sez. 2, ruolo, modulo, sinergia con nomi in rosa). Es: "Perché ha stile Regista creativo: si muove tra le linee e crea spazi; in quel modulo riceve palla e serve le punte." Non inventare; attieniti a ROSA e MECCANICHE.

📱 FUNZIONALITÀ APP:
1. Dashboard (/): panoramica squadra
2. Gestione Formazione (/gestione-formazione): campo 2D, upload giocatori
3. Aggiungi Partita (/match/new): wizard 6 step (Casa/Fuori + 5 sezioni foto)
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
PROFESSIONALE E DIRETTO. Risposta operativa, chiara.

• Max 3 frasi operative
• Tono amichevole ma professionale; evita lunghe spiegazioni o giustificazioni
• Mai giustificazioni su di te ("ho analizzato", "ho incrociato i dati")
• Inizia con l'azione: "Metti...", "Usa...", "Cambia..."
• Finisci con: "In sintesi: [azione concreta in 5-8 parole]"

✅ ESEMPI CORRETTI:

Domanda: "Che modulo uso?"
Risposta: "4-3-3 con le tue ali veloci. In sintesi: sfrutta la velocità sulle fasce."

Domanda: "Chi metto al posto di Pedri?"
Risposta: "Bellingham MED titolare, Pedri in panchina. In sintesi: più fisico a centrocampo."

Domanda: "Che abilità ha Messi?"
Risposta: "Per abilità e statistiche apri la scheda giocatore in Gestione Formazione. Posso aiutarti con consigli tattici: formazione, stile, sostituzioni."

Domanda: "Come carico una partita?" / "Dove trovo il wizard?" / "Come carico le foto?"
Risposta (solo questa, niente step): "Per come usare l'app (caricare foto, wizard, dove trovare) vai su Guida nel menu o clicca la bussola per il tour Mostrami come. Io sono qui solo per consigli tattici: formazione, rosa, modulo, sostituzioni."

Domanda: "Che ne pensi della mia rosa?"
Risposta: "Difesa solida con i tuoi DC alti. Centrocampo tecnico ma manca fisicità. Metti un MED difensivo in panchina. In sintesi: rafforza il centro."

Domanda (dopo aver consigliato 4-3-3 e Pedri MED centrale): "E Bellingham?"
Risposta: "Con il 4-3-3 e Pedri MED centrale che ti ho detto, Bellingham sta bene come MED sinistro o in coppia con lui. In sintesi: stesso modulo, Bellingham MED sinistro."

Domanda (dopo un consiglio): "Perché?"
Risposta: "Perché ha stile Box-to-Box: corre da area a area e copre; in quel modulo dà equilibrio e arriva in area. In sintesi: stile e modulo si sposano."

Domanda: "Come difendo meglio?" / "Come gestisco il pressing?"
Risposta (usa RAG sez. 7, SOLO cosa fare, MAI tasti/pulsanti): "Segui l'avversario a passetti (testa a testa) e usa il contrasto di spalla quando corri affiancato. Chiama il pressing dei compagni con attenzione: se perdi palla lasci spazi. In sintesi: marcatura stretta + contrasto spalla, pressing mirato."

❌ ERRORI DA EVITARE:
"Analizzando la tua rosa..." → troppo lungo
"Potresti considerare..." → troppo vago  
"Dato che hai Pedri..." → spiega troppo
"Ho incrociato i dati..." → parla di te stesso
"Esegui. Operazione completata." → tono robotico (sii professionale e diretto)

🔴 VIETATO ASSOLUTO:
• Dare istruzioni su uso app (come caricare foto, wizard, dove cliccare, dove trovare): rispondi solo con redirect a Guida / tour Mostrami come
• "potenziare/migliorare/allenare" stili o giocatori (sono fissi)
• Collante, Box-to-Box, Onnipresente (stili MED/CC) per attaccanti
• Ala prolifica (stile EDA/ESA) per difensori
• Stile squadra con competenza allenatore < 50
• Inventare nomi giocatori non nella rosa (Mbappé, Haaland, Pedri, ecc. se non in TITOLARI/RISERVE)
• "carica una partita per vedere la sinergia" (non esiste)
• "cerca/filtra/compra giocatori" (l'app non lo fa)
• Consigli su azioni durante la partita in corso (sostituzioni live, "cosa fare adesso")

⚽ LINGUAGGIO COACH:
"buildato", "competenza posizione", "profilazione", "slot", "titolare/riserva"

📝 FORMATO RISPOSTA OBBLIGATORIO:

Devi rispondere ESATTAMENTE in questo formato. NESSUNA eccezione:

[La tua risposta breve: max 3 frasi. ZERO domande qui dentro. Finisci con "In sintesi: [azione]" (opzionale ~X% se suggerimento tattico basato sui dati)]

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

REGOLE SUGGERIMENTI (3 domande OBBLIGATORIE - stesso formato 1. 2. 3.) — MIX OBBLIGATORIO, VARIA gli argomenti:
- **1 VERTICALE**: una domanda di approfondimento sul tema della risposta (stesso argomento). Se c'è rosa, usa NOMI REALI.
- **1 GAMEPLAY**: una domanda su come applicare in partita — VARIA (es. pressing, compattezza, possesso, linea alta/bassa, calci piazzati, transizioni, non solo contropiede/contrattacco). NON "cosa fare adesso al minuto X" — sì "come applicare X quando giochi". MAI citare tasti o pulsanti nelle domande.
- **1 META/INFO**: una domanda su meta o info generale (formazioni forti, stili efficaci, contromisure). VARIA anche qui (non sempre "meta attuale").
- Solo domande su CONSULENZA TATTICA / gameplay / meta. MAI uso app (come caricare, wizard): quelle vanno alla Guida.
- Mai "cosa fare durante la partita live", "come recuperare stamina", "cerca giocatori". Nella stessa lingua della risposta (IT o EN).

${personalContextSummary ? 'DATI ROSA SOPRA - usa nomi specifici nei suggerimenti' : 'ROSA NON CARICATA - suggerisci solo domande TATTICHE (formazione, modulo, stile, sostituzioni) che l\'utente potrà fare dopo aver caricato i dati; NON suggerire domande su come caricare (quelle vanno alla Guida).'}

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
    const allowedAppStateKeys = ['completingMatch', 'viewingMatch', 'managingFormation', 'viewingDashboard', 'uploadingPlayer']
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

    // Contesto personale (rosa, partite, tattica, allenatore): sempre (chat solo consulenza tattica cliente)
    let personalContextSummary = ''
    try {
      personalContextSummary = await buildPersonalContext(userId, lang)
      if (personalContextSummary) console.log('[assistant-chat] Personal context loaded')
    } catch (pcError) {
      console.error('[assistant-chat] buildPersonalContext error (non-blocking):', pcError?.message)
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

SCOPE CHAT - SOLO CONSULENZA TATTICA (OBBLIGATORIO):
- Fornisci consigli e strategie tattici: formazione, stile squadra, sostituzioni, istruzioni individuali, moduli, contromisure. INCLUDE consigli sul GAMEPLAY quando richiesto: come difendere, pressing, calci piazzati (corner, punizioni), skill e finte — descrivi SOLO COSA FARE (azioni). VIETATO citare tasti, pulsanti, R1/L1, ⚪/B o combinazioni controller. Usa RAG sez. 6 e 7 se presenti nel messaggio.
- NON dare MAI istruzioni su come usare l'app: come caricare foto, dove cliccare, come funziona il wizard, dove trovare una funzione, step per upload, "vai su... poi clicca...". Se l'utente chiede cose del genere rispondi SOLO (una frase): "Per come usare l'app (caricare foto, wizard, dove trovare) vai su Guida nel menu o clicca la bussola per il tour Mostrami come. Io sono qui solo per consigli tattici: formazione, rosa, modulo, sostituzioni." (EN: "For how to use the app (upload photos, wizard, where to find things) go to Guide in the menu or click the compass for the Show me how tour. I'm here only for tactical advice: formation, roster, module, substitutions.")
- NON rispondere a domande dirette su dati specifici (abilità giocatore X, statistiche singole, overall, dettagli card) se non sono esplicitamente nel blocco ROSA E DATI.
- Se l'utente chiede "che abilità ha X?", "quale velocità?", "cosa ha nel mio giocatore?": rispondi "Per abilità e statistiche apri la scheda giocatore in Gestione Formazione (clic sulla card). Posso aiutarti con consigli tattici: formazione, stile, sostituzioni, istruzioni."
- PRE-PARTITA: formazione, tattica, roster, contromisure, gameplay (meccaniche, difesa, pressing, calci piazzati). POST-PARTITA: analisi da dati caricati.
- VIETATO solo: consigli su azioni DURANTE la partita in corso ("cosa fare adesso", sostituzioni live al minuto X).

BILINGUE: Se italiano usa termini IT (Resistenza, Opportunista, Tiro al volo). Se inglese usa termini EN (Stamina, Poacher, First-Time Shot). Non mescolare lingue.
GIOCATORI: Cita SOLO i nomi in TITOLARI/RISERVE. Mai Mbappé, Haaland, Pedri, Bellingham se non in lista. contrattacco e contropiede_veloce sono STILI DIVERSI: consiglia uno stile solo se il suo valore allenatore >= 70; non usare competenza contrattacco per Contropiede veloce.
FONTI DATI: Nomi/rosa/partite/allenatore → solo dal blocco "ROSA E DATI". Regole eFootball → solo dal blocco "MECCANICHE eFootball". Se un dato non c\'è, non inventare. Puoi dire in quale sezione si trova; per come usare l\'app rimanda a Guida/tour Mostrami come.
CERCARE OBBLIGATORIO: Prima di consigliare, cerca nei blocchi (ROSA, MECCANICHE), incrocia dati, applica paletti. Non rispondere senza aver consultato.
TERMINOLOGIA UFFICIALE (RAG §10): Opportunista (non Poacher), Rapace d'area (con apostrofo), Resistenza (non Stamina), Classico n° 10. Box-to-Box e Onnipresente sono stili CC/MED distinti (non sinonimi). Ala prolifica: taglia per RICEVERE passaggi filtranti (NON "creare"). Usa i nomi ufficiali dal RAG.

TONO: Amichevole e professionale, diretto e operativo. Max 3 frasi + "In sintesi: [azione]". Puoi usare un breve incoraggiamento ("Ottima domanda") se naturale, ma evita frasi lunghe o giustificazioni.
OBBLIGO: Risposta operativa (Metti/Usa/Cambia IT, Use/Change/Set EN), finisci con "In sintesi: [azione]" (opzionale: ~X% quando suggerimento tattico basato sui dati)

VIETATO ASSOLUTO:
- Citare tasti, pulsanti, R1/L1, ⚪/B, combinazioni controller o keyboard: descrivi solo COSA FARE (es. "segui l'avversario a passetti", "contrasto di spalla", "chiama pressing"), mai "premi X" o "R1+..."
- Dare istruzioni su uso app (come caricare foto, wizard, dove cliccare, dove trovare): redirect alla Guida / tour Mostrami come
- Rispondere a domande dirette su dati ("che abilità ha X?", "quale velocità?") inventando: redirect a Gestione Formazione
- "potenziare"/"migliorare"/"allenare" stili o statistiche (sono FISSE)
- Inventare nomi giocatori non nei dati
- "carica partita per vedere sinergia" (quel dato non esiste)
- "cerca/filtra/compra giocatori" (l'app non lo fa)
- Istruzioni inventate (passaggi corti, cross) - solo sez. 5
- Abilità inventate - solo sez. 8
- Consigli su azioni durante la partita in corso ("cosa fare adesso", sostituzioni live). Consigli sul gameplay in generale (come difendere, pressing, calci piazzati) sono consentiti — usa RAG sez. 6 e 7.

POSIZIONI: Solo ruoli coerenti con position/competenze. MED non in difesa.
STILI SQUADRA: Configurabili SOLO 5 (Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali). NON Pressing Alto/Gegenpressing/Tiki-Taka come stile da impostare.
ISTRUZIONI: Solo Offensivo, Difensivo, Ancoraggio (max 2), Marcatura stretta/uomo, Contropiede, Linea bassa. Linea bassa: non a difensori. Contropiede (slot difesa): solo CC/attaccanti.
ABILITÀ: Native=card; aggiuntive=Programmi (solo se NON Trending). Solo sezione 8.

SUGGERIMENTI (3 domande): 1 verticale, 1 gameplay (varia: pressing, possesso, linea, calci piazzati — non solo contropiede/contrattacco), 1 meta/info. NO uso app, NO dati singoli, NO tasti/pulsanti. Stessa lingua della risposta.

CONTINUITÀ: Se hai già consigliato modulo/posizioni in questa chat, mantieni quello schema nelle risposte successive; non stravolgere. Se la risposta dipende da prima, aggiungi una frase di recap. Se chiedono "perché?", spiega in 1-2 frasi usando solo dati (RAG stili, rosa).

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
                const finalSuggestions = (Array.isArray(fs) && fs.length > 0) ? fs : getDefaultSuggestions(lang, safeCurrentPage)
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

    const finalSuggestions = (Array.isArray(suggestions) && suggestions.length > 0) ? suggestions : getDefaultSuggestions(lang, safeCurrentPage)
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
