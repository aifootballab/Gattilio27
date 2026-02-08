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

/** Limite riassunto contesto personale (rosa con stats+abilità, partite, tattica, allenatore) */
const MAX_PERSONAL_CONTEXT_CHARS = 6200

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
 * Enforce "final result only": remove explicit reasoning/explanations.
 * Keeps concise imperative output, strips causal clauses and questions.
 */
function sanitizeCoachOutput(content, lang = 'it') {
  if (!content || typeof content !== 'string') return content
  const markers = lang === 'en'
    ? ['because', 'since', 'due to', 'based on', 'as a result', 'i analyzed', 'i have analyzed', 'i cross', 'i have cross']
    : ['perché', 'poiché', 'dato che', 'in base a', 'visto che', 'ho analizzato', 'ho incrociato', 'ho valutato', 'quindi']

  const sentences = content.match(/[^.!?]+[.!?]?/g) || [content]
  const cleaned = []
  for (const s of sentences) {
    let out = s
    const hasQuestion = out.includes('?')
    for (const m of markers) {
      const re = new RegExp(`\\b${m}\\b.*`, 'i')
      if (re.test(out)) out = out.replace(re, '')
    }
    out = out.trim()
    if (!out) continue
    if (hasQuestion) continue
    cleaned.push(out)
  }
  const merged = cleaned.join(' ').trim()
  return merged.length > 0 ? merged : content.trim()
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
    statsNote: 'STATS: vel, acc, res, fin, pas, tac (RAG §1). forma:↑=ottima, forma:↓=bassa. h/w=altezza/peso (duelli aerei). ABILITÀ: elencate. Usa stili+stats+abilità+forma+h/w per ragionamento. Ogni dato ha utilità.',
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
    statsNote: 'STATS (if present): vel=Speed, acc=Acceleration, res=Stamina (RAG §1), fin=Finishing, pas=Passing, tac=Tackling. SKILLS: listed in roster. Use styles + stats + skills for tactical reasoning.',
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

    // Players (titolari + riserve) - include skills, forma, altezza/peso per ragionamento enterprise
    const { data: playersData, error: playersError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, playing_style_id, slot_index, photo_slots, base_stats, original_positions, card_type, skills, com_skills, form, height, weight')
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

    /** Statistiche chiave per ragionamento tattico (RAG §1). Formato compatto. */
    function formatStatsForContext(baseStats) {
      if (!baseStats || typeof baseStats !== 'object') return ''
      const a = baseStats.athleticism || {}
      const atk = baseStats.attacking || {}
      const def = baseStats.defending || {}
      const parts = []
      if (a.speed != null) parts.push(`vel ${a.speed}`)
      if (a.acceleration != null) parts.push(`acc ${a.acceleration}`)
      if (a.stamina != null) parts.push(`res ${a.stamina}`)
      if (atk.finishing != null) parts.push(`fin ${atk.finishing}`)
      const pas = atk.low_pass ?? atk.lofted_pass
      if (pas != null) parts.push(`pas ${pas}`)
      if (def.tackling != null) parts.push(`tac ${def.tackling}`)
      return parts.length > 0 ? parts.join(' ') : ''
    }
    /** Forma (frecce): ↑=su, ↓=giù, →=neutro. Utile: scelta titolari/riserve. */
    function formatFormForContext(form) {
      if (!form || typeof form !== 'string') return ''
      const f = String(form).toLowerCase()
      if (f.includes('incrollabile') || f.includes('a')) return 'forma:↑'
      if (f.includes('ecc') || f.includes('b')) return 'forma:↓'
      return ''
    }
    /** Altezza/peso: utile duelli aerei, Colpo di testa. Compatto. */
    function formatPhysForContext(height, weight) {
      if (height == null && weight == null) return ''
      const parts = []
      if (height != null) parts.push(`h${height}`)
      if (weight != null) parts.push(`w${weight}`)
      return parts.length > 0 ? ` ${parts.join(' ')}` : ''
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
      const statsStr = formatStatsForContext(p.base_stats)
      const formStr = formatFormForContext(p.form)
      const physStr = formatPhysForContext(p.height, p.weight)
      const skillsArr = [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].slice(0, 5)
      const skillsStr = skillsArr.length > 0 ? ` abilità: ${skillsArr.join(', ')}` : ''
      const statsPart = statsStr ? ` | stats: ${statsStr}` : ''
      const extra = [formStr, physStr].filter(Boolean).join(' ')
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${statsPart}${extra ? ' | ' + extra : ''} | profilazione: ${prof}, competenze: ${comp}${skillsStr})`)
    }
    const reservesHeader = L.reserves + ':'
    rosterLines.push(reservesHeader)
    for (const p of riserve.slice(0, 15)) {
      const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || '-'
      const prof = getProfilazione(p.photo_slots)
      const comp = getCompetenze(p.original_positions)
      const statsStr = formatStatsForContext(p.base_stats)
      const formStr = formatFormForContext(p.form)
      const physStr = formatPhysForContext(p.height, p.weight)
      const skillsArr = [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].slice(0, 5)
      const skillsStr = skillsArr.length > 0 ? ` abilità: ${skillsArr.join(', ')}` : ''
      const statsPart = statsStr ? ` | stats: ${statsStr}` : ''
      const extra = [formStr, physStr].filter(Boolean).join(' ')
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${statsPart}${extra ? ' | ' + extra : ''} | profilazione: ${prof}, competenze: ${comp}${skillsStr})`)
    }
    if (riserve.length > 15) rosterLines.push(`  ... altri ${riserve.length - 15} riserve`)

    // Matches (ultime 10) - con formazione avversario, voti, zone attacco (enterprise)
    const { data: matchesData } = await admin
      .from('matches')
      .select('opponent_name, result, formation_played, playing_style_played, match_date, opponent_formation_id, player_ratings, attack_areas')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(10)
    const matches = matchesData || []
    // Fetch opponent formations for matches that have opponent_formation_id
    const oppIds = [...new Set(matches.map(m => m.opponent_formation_id).filter(Boolean))]
    let oppFormationsMap = {}
    if (oppIds.length > 0) {
      const { data: oppData } = await admin
        .from('opponent_formations')
        .select('id, formation_name, playing_style')
        .in('id', oppIds)
      if (oppData) oppData.forEach(o => { oppFormationsMap[o.id] = o })
    }
    const matchLines = matches.length === 0
      ? [L.noMatches]
      : matches.map(m => {
          const d = m.match_date ? (typeof m.match_date === 'string' ? m.match_date.slice(0, 10) : String(m.match_date).slice(0, 10)) : '?'
          const opp = oppFormationsMap[m.opponent_formation_id]
          const vsForm = opp?.formation_name ? ` vs ${opp.formation_name}${opp?.playing_style ? '/' + opp.playing_style : ''}` : ''
          let votiStr = ''
          const pr = m.player_ratings
          if (pr && typeof pr === 'object') {
            const cliente = pr.cliente || pr
            if (cliente && typeof cliente === 'object') {
              const entries = Object.entries(cliente).slice(0, 4).map(([n, v]) => `${n} ${v?.rating ?? v}`).filter(Boolean)
              if (entries.length) votiStr = ` [voti: ${entries.join(', ')}]`
            }
          }
          return `  ${d} vs ${m.opponent_name || '?'} ${m.result || '-'} (form: ${m.formation_played || '-'}, stile: ${m.playing_style_played || '-'}${vsForm})${votiStr}`
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

    const parts = [
      '╔══════════════════════════════════════════════════════════════════╗',
      `║  ${L.boxTitle}                                                       ║`,
      `║  ${L.boxSubtitle}                                                    ║`,
      '╚══════════════════════════════════════════════════════════════════╝',
      `Formazione attuale: ${formation}.`,
      '',
      L.positionNote,
      '',
      L.statsNote,
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
function buildPersonalizedPromptV2(userMessage, context, language = 'it', efootballKnowledge = '', personalContextSummary = '', hasHistory = false) {
  const { profile, currentPage, appState } = context || {}
  const firstName = profile?.first_name || (language === 'en' ? 'friend' : 'amico')
  const teamName = profile?.team_name || (language === 'en' ? 'your team' : 'il tuo team')
  const aiName = profile?.ai_name || 'Coach AI'
  const howToRemember = profile?.how_to_remember || ''
  const commonProblems = profile?.common_problems || []

  const domandaBreve = userMessage.length > 80 ? userMessage.slice(0, 80).trim() + '…' : userMessage
  const pagina = currentPage ? String(currentPage) : ''
  const contestoAttuale = [
    pagina || (language === 'en' ? 'Dashboard' : 'Dashboard'),
    `${language === 'en' ? 'Question' : 'Domanda'}: "${domandaBreve}"`
  ].join(' | ')

  // Capsule ultra-compatta: incroci + inverse reasoning, senza tasti/pulsanti, senza uso app.
  const capsuleIt = `ENGINE (OBBLIGATORIO, token-budget):
- INPUT: ROSA (stile card, stats vel/acc/res/fin/pas/tac, abilità, forma↑/↓, h/w, competenze), MATCH/PATTERN (result, formation/stile, opponent formation, attack_areas, voti cliente, recurring_issues), COACH (competenze stile), TATTICA (stile squadra + istruzioni), RAG (limiti + movimenti/situazioni + community).
- MICRO-SCORE: FIT (position ∈ competenze), COACH_OK(style>=70; contrattacco≠contropiede_veloce), SPD (vel+acc+Scatto), PASS (pas+filtrante/di prima/dosato), WIN (tac+Intercettazione/Marcatura/Contrasto/Blocco), AIR_DEF (h/w+Dominio palle alte+Superiorità aerea), AIR_ATK (h/w+Colpo di testa), SUB (Riserva di lusso=Super riserva).
- HARD: solo nomi ROSA; solo 5 stili squadra configurabili; istruzioni solo §5; limiti moduli §3.4; NO Tattica(astuzia) sui difensori; NO Tornante su MED Collante; Dominio palle alte ≠ Colpo di testa.
- DECISIONE: scegli 1 leva principale + max 2 secondarie: (1) Fix FIT, (2) Fix mismatch coach/stile squadra, (3) Aggancia top recurring_issue, (4) 1-2 cambi titolari/riserve da forma↑/↓ + voti cliente + micro-score, (5) 1 istruzione §5, (6) gameplay solo “cosa fare” da §7.
- INVERSE: sintomo→cause→leva: fasce (attack_areas wide)→esterni senza WIN/Rientro difensivo→copertura/istruzioni; attacco sterile→PASS basso o stile incoerente→regista/cambio stile/modulo; palle alte→AIR_DEF basso→DC/MED più forti+piazzati.
OUTPUT: max 3 frasi operative, imperativo, chiudi con “In sintesi: …”. Niente spiegazioni del ragionamento.`

  const capsuleEn = `ENGINE (REQUIRED, token-budget):
- INPUT: ROSTER (card style, stats spd/acc/sta/fin/pas/tac, skills, form↑/↓, h/w, competences), MATCH/PATTERN (result, formation/style, opponent formation, attack_areas, client ratings, recurring_issues), COACH (style competence), TACTICS (team style + instructions), RAG (limits + movements/situations + community).
- MICRO-SCORES: FIT (position ∈ competences), COACH_OK(style>=70; contrattacco≠contropiede_veloce), SPD (spd+acc+Sprint), PASS (pas+Through ball/One-touch/Weighted), WIN (tac+Interception/Man marking/Aggressive tackle/Block), AIR_DEF (h/w+High ball dominance+Aerial superiority), AIR_ATK (h/w+Heading), SUB (Luxury sub=Super sub).
- HARD: only roster names; only 5 configurable team styles; instructions only §5; formation limits §3.4; NO Tactical(fouls) on defenders; NO Box-to-box (Tornante) on an Anchor Man DM, especially if Collante/Anchor Man; High ball dominance ≠ Heading.
- DECISION: pick 1 main lever + max 2 secondary: (1) Fix FIT, (2) Fix coach/team-style mismatch, (3) Anchor top recurring_issue, (4) 1-2 lineup changes using form↑/↓ + client ratings + micro-scores, (5) 1 instruction §5, (6) gameplay “what to do” only from §7.
- INVERSE: symptom→cause→lever: wide threat (attack_areas wide)→wide players lack WIN/track back→coverage/instructions; stale attack→low PASS or mismatch style→add creator/change style/formation; aerial goals→low AIR_DEF→stronger CB/DM + set pieces.
OUTPUT: max 3 imperative sentences, end with “In summary: …”. No visible reasoning.`

  const capsule = language === 'en' ? capsuleEn : capsuleIt

  // Suggerimenti: devono derivare dalla leva scelta (vincolo), ma il modello li genera.
  const suggRulesIt = `SUGGERIMENTI (3 domande, obbligatori): 1 verticale sullo stesso problema, 1 gameplay (pressing/compattezza/possesso/piazzati/transizioni), 1 meta/info. Niente uso app, niente tasti/pulsanti.`
  const suggRulesEn = `SUGGESTIONS (3 questions, required): 1 deep-dive on same issue, 1 gameplay (pressing/compactness/possession/set pieces/transitions), 1 meta/info. No app usage, no buttons/inputs.`
  const suggRules = language === 'en' ? suggRulesEn : suggRulesIt

  const header = `CONTESTO: ${contestoAttuale}
${hasHistory ? `NOTA: Continua la conversazione già iniziata. NON salutare.` : ''}

👤 ${firstName} | ${teamName}
${howToRemember ? `Memo: ${howToRemember}` : ''}
${commonProblems.length > 0 ? `Problemi: ${commonProblems.join(', ')}` : ''}`

  const blocks = [
    header,
    personalContextSummary ? `\n📊 ROSA E DATI:\n${personalContextSummary}` : '',
    efootballKnowledge ? `\n📚 MECCANICHE eFootball (RAG):\n${efootballKnowledge}` : '',
    `\n${capsule}\n\nFORMATO RISPOSTA:\n[Max 3 frasi operative. Chiudi con In sintesi / In summary.]\n\n---\nSUGGERIMENTI:\n1. ...\n2. ...\n3. ...\n\n${suggRules}\n\nDOMANDA CLIENTE: "${userMessage}"\nRispondi come ${aiName} in ${language === 'it' ? 'italiano' : 'inglese'}.`
  ].filter(Boolean)

  return blocks.join('\n')
}

function buildSystemContentV2(lang) {
  const it = `Sei Coach AI per eFootball. Rispondi SEMPRE in italiano.

SCOPE: solo consulenza tattica eFootball basata su ROSA, PARTITE, ALLENATORE, TATTICA e RAG.
- Gameplay consentito SOLO come “cosa fare” (azioni). VIETATO citare tasti/pulsanti/controller.
- Uso app (wizard, click, menu, upload): NON spiegare. Se chiesto, rispondi solo: "Sono qui solo per consigli tattici: formazione, rosa, modulo, sostituzioni, stile. Esplora il menu per le altre funzioni."

FONTI: Nomi/rosa/partite/allenatore/tattica → solo dal blocco ROSA E DATI. Regole eFootball → solo dal blocco RAG. Se manca un dato, non inventare.

VINCOLI: solo nomi in ROSA; team_playing_style configurabile SOLO 5 (Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali); contrattacco ≠ contropiede_veloce e serve competenza coach >=70 per consigliare; istruzioni individuali solo §5; limiti moduli §3.4; NO Tattica(astuzia) sui difensori; NO Tornante su MED Collante; Dominio palle alte ≠ Colpo di testa.

OUTPUT COACH: max 3 frasi operative, imperativo, niente ragionamento visibile. Chiudi con "In sintesi: ...".`

  const en = `You are Coach AI for eFootball. Always answer in English.

SCOPE: only eFootball tactical advice based on ROSTER, MATCHES, COACH, TACTICS and RAG.
- Gameplay allowed only as “what to do” (actions). Never mention buttons/inputs/controller.
- App usage (wizard, clicks, menus, upload): do not explain. If asked, reply only: "I'm here only for tactical advice: formation, roster, module, substitutions, style. Explore the menu for other features."

SOURCES: Names/roster/matches/coach/tactics only from the ROSTER & DATA block. eFootball rules only from the RAG block. If data is missing, do not invent.

CONSTRAINTS: only roster names; only 5 configurable team styles (Possession, Quick Counter, Long Ball Counter, Long Ball, Out Wide); contrattacco ≠ contropiede_veloce and require coach competence >=70; individual instructions only §5; formation limits §3.4; no Tactical(fouls) on defenders; no Box-to-box (Tornante) on an Anchor Man DM, especially if Collante/Anchor Man; High ball dominance ≠ Heading.

COACH OUTPUT: max 3 imperative sentences, no visible reasoning. End with "In summary: ...".`

  return lang === 'en' ? en : it
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
      prompt = buildPersonalizedPromptV2(message, context, lang, efootballKnowledge, personalContextSummary, history.length > 0)
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
    
    const systemContent = buildSystemContentV2(lang)

    const openAIMessages = [
      { role: 'system', content: systemContent },
      ...history.map(({ role, content }) => ({ role, content })),
      { role: 'user', content: prompt }
    ]

    const requestBody = {
      model: model,
      messages: openAIMessages,
      temperature: 0.7,
      max_tokens: 450, // spazio per 4-6 frasi quando serve
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
    const sanitizedContent = sanitizeCoachOutput(cleanContent, lang)
    
    // Validazione base: verifica che la risposta non contenga riferimenti a funzionalità inventate
    if (sanitizedContent.toLowerCase().includes('funzionalità non disponibile') || 
        sanitizedContent.toLowerCase().includes('non è ancora disponibile')) {
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
        response: sanitizedContent,
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
