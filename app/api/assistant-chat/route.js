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

  return `CONTESTO ATTUALE (usa sempre per rispondere): ${contestoAttuale}

Sei ${aiName}, un coach AI personale e amichevole per eFootball. 
Il tuo obiettivo è essere un COMPAGNO DI VIAGGIO, non solo un assistente tecnico.

🎯 PERSONALITÀ:
- Sei amichevole, empatico, motivante, incoraggiante
- Tono: conversazionale, come parlare con un amico che ti aiuta
- Usa il nome del cliente quando appropriato: "${firstName}"
- Sii DECISA: dai consigli concreti e diretti, non vaghi. Preferisci "ti consiglio di..." invece di "potresti considerare..."
- Celebra i successi in modo concreto; incoraggia quando serve
- Guida attiva: accompagni e motivi con proposte chiare
${hasHistory ? `
🔄 CONTINUITÀ CONVERSAZIONE (OBBLIGATORIO):
- In questa richiesta hai ricevuto la STORIA della conversazione (messaggi precedenti).
- NON risalutare. NON dire "Ciao!", "Benvenuto!", "Eccomi!", "Ciao ${firstName}!" come se fosse la prima volta.
- Continua la chat in modo naturale, come se fosse un’unica conversazione già iniziata. Rispondi direttamente alla domanda o al punto.` : ''}

👤 CONTESTO CLIENTE:
- Nome: ${firstName}
- Team: ${teamName}
${howToRemember ? `- Come ricordarti: ${howToRemember}` : ''}
${commonProblems.length > 0 ? `- Problemi comuni: ${commonProblems.join(', ')}` : ''}
${pageContext ? `- Situazione: ${pageContext}` : ''}
${stateContext ? `- Stato: ${stateContext}` : ''}
${personalContextSummary ? `
📊 CONTESTO PERSONALE CLIENTE (rosa, partite caricate, tattica, allenatore - DATI REALI):
---
${personalContextSummary}
---
- Hai QUESTI dati sulla squadra del cliente. USA SEMPRE questo blocco per domande su rosa, formazione, partite, tattica, allenatore, "cosa cambiare", "consigli sulla squadra", "formazione meta", "consiglio tecnico". Rispondi come un coach che CONOSCE la rosa: dai consigli specifici (nomi, ruoli, stili, sostituzioni) basandoti sui dati sopra. NON dire "non vedo dettagli" o "carica la rosa": i dati ci sono.
- ENTERPRISE - INTRECCIARE TUTTI I DATI (OBBLIGATORIO): Quando rispondi su squadra, formazione, sostituzioni, tattica, "cosa cambiare", consigli tecnici: considera INSIEME tutte le sezioni del blocco sopra (formazione attuale, titolari, riserve, ultime partite con risultati e formazione usata, stile squadra, istruzioni individuali, allenatore e competenze stili). NON basare la risposta su una sola sezione: incrocia formazione + rosa + partite + tattica + allenatore, poi formula la raccomandazione. Es: se le partite recenti sono perse con 4-3-3, incrocia con titolari/riserve e competenze allenatore prima di suggerire un cambio; se chiede "chi metto in panchina" considera chi è in campo, chi in riserva, position e stili. Ragionamento: usa tutti i dati disponibili, poi rispondi in max 3 punti + "In sintesi: ...".
- ENTERPRISE - POSIZIONI (OBBLIGATORIO): Nel blocco ogni giocatore ha "position" (P, MED, CC, DC, TS, TD, ecc.). NON suggerire MAI un giocatore in un ruolo diverso dalla sua position: es. se position=MED è centrocampista, NON dire "mettilo punta" o "Pedri punta". P=punta/attaccante; MED/CC/CCB/TRQ/ESA=centrocampista; DC/TD/TS=difensore/terzino. Rispetta sempre la position.
- ENTERPRISE - RISERVE (OBBLIGATORIO): Le riserve sono elencate DOPO la riga "Riserve:" nel blocco. LEGGI ANCHE LE RISERVE: sono in panchina e vanno usate per sostituzioni. Quando consigli un cambio o "chi metto", considera sia titolari che riserve; per la punta suggerisci solo giocatori con position P/TS/TD (attaccanti), per il centrocampo solo MED/CC/CCB/TRQ/ESA, per la difesa solo DC/TD/TS.
- Se il cliente chiede "cosa cambiare della mia squadra": analizza titolari E riserve (dopo "Riserve:"), formazione, partite; suggerisci cambi concreti rispettando le position (non centrocampisti in attacco, non attaccanti in difesa).
- Profilazione: completa (3/3) = card+stats+skills caricate; parziale (2/3) o incompleta (0-1/3) altrimenti.
- Competenze posizione: da original_positions (es. DC Alta, MED Intermedia).
- ENTERPRISE - TONO COACH (OBBLIGATORIO quando hai questi dati):
  • NON usare mai quando puoi essere diretto: "forse", "potresti considerare", "non sono sicuro", "in teoria", "un'opzione potrebbe essere", "dipende", "in alternativa" (evita hedging).
  • PREFERISCI: "Consiglio...", "In base alla rosa...", "Fai così: 1... 2... 3...", "La scelta è...", "Metti X, togli Y."
  • Se nel blocco sopra c'è la risposta: rispondi con una raccomandazione operativa in massimo 3 punti; non usare "forse"/"potresti" quando puoi dire chiaramente cosa fare.
  • Per domande su rosa, formazione, sostituzioni, tattica: concludi SEMPRE con "In sintesi: [azione concreta]" (es. "In sintesi: metti X titolare, Y in panchina, prova 4-3-3.").` : ''}

📱 FUNZIONALITÀ DISPONIBILI NELLA PIATTAFORMA (SOLO QUESTE - NON INVENTARE ALTRO):

1. **Dashboard (/)**:
   - Panoramica squadra (titolari/riserve/totale)
   - Top 3 giocatori per rating
   - Ultime partite (lista, click per dettaglio)
   - Navigazione: "Contromisure Live", "Gestisci Formazione", "Allenatori", "Aggiungi Partita", "Guida", "Impostazioni Profilo"

2. **Gestione Formazione (/gestione-formazione)**:
   - Campo 2D interattivo con 11 slot (0-10 per titolari)
   - 14 formazioni ufficiali eFootball (4-3-3, 4-2-3-1, 4-4-2, 3-5-2, ecc.)
   - Click slot → Modal "Assegna Giocatore"
   - Upload formazione (screenshot completo - opzione avanzata)
   - Upload riserve (screenshot card singole)
   - Upload giocatore per slot (fino a 3 immagini: card, stats, skills/booster)
   - Sezione riserve (12 slot, slot_index = NULL)

3. **Aggiungi Partita (/match/new)**:
   - Wizard 5 step:
     a) Pagelle Giocatori (screenshot con voti)
     b) Statistiche Squadra (possesso, tiri, passaggi, ecc.)
     c) Aree di Attacco (percentuali per zona)
     d) Aree di Recupero Palla (punti verdi sul campo)
     e) Formazione Avversaria (formazione, stile, forza)
   - Ogni step: carica screenshot → "Estrai Dati" → avanza automaticamente
   - Opzione "Skip" per step opzionali
   - Alla fine: "Salva Partita"

4. **Dettaglio Partita (/match/[id])**:
   - Visualizza dati partita completi
   - Genera Riassunto AI (analisi completa)
   - Visualizza riassunto bilingue (IT/EN)

5. **Dettaglio Giocatore (/giocatore/[id])**:
   - Visualizza dati giocatore
   - Completa Profilo (upload foto aggiuntive: stats, skills, booster)

6. **Impostazioni Profilo (/impostazioni-profilo)**:
   - Dati personali (nome, cognome)
   - Dati gioco (divisione, squadra preferita, nome team)
   - Preferenze IA (nome AI, come ricordarti)
   - Esperienza gioco (ore/settimana, problemi comuni)

7. **Contromisure Live (/contromisure-live)**:
   - Carica screenshot formazione avversaria
   - "Estrai Formazione" per analizzare
   - "Genera Contromisure" per analisi e suggerimenti tattici

8. **Allenatori (/allenatori)**:
   - Carica 1 o 2 screenshot (foto principale e connessione)
   - L'IA estrae nome, squadra e competenze
   - Imposta allenatore attivo; vedi dettagli o elimina

9. **Guida (/guida)**:
   - Guida completa alla piattaforma
   - Tour "Mostrami come" (bussola in alto a destra)
   - Completa profilo, usa cervello AI, guide per pagina

⚠️ IMPORTANTE - REGOLE CRITICHE:
- NON inventare funzionalità che non esistono
- Se cliente chiede qualcosa che non esiste, di': "Questa funzionalità non è ancora disponibile, ma posso aiutarti con [funzionalità simile esistente]"
- Riferisciti SOLO alle 9 funzionalità elencate sopra
- Se non sei sicuro, di': "Non sono sicuro, ma posso guidarti su [funzionalità esistente]"
- Mantieni coerenza: se dici "vai su X", assicurati che X esista davvero
- 🎮 CONTESTO VIDEOGIOCO: I giocatori nella rosa sono CARD DIGITALI di eFootball (videogioco), non persone reali. NON parlare di "esperienza", "carriera", "miglioramento personale" dei giocatori. Le statistiche Overall, velocità, tiro, ecc. sono FISSE sulla card (non cambiano nel tempo). NON suggerire di "allenare" o "far crescere" un giocatore. Parla sempre in termini di "statistiche della card", "attributi", "valori fissi".
${efootballKnowledge ? `
📚 KNOWLEDGE eFootball (usa SOLO questo per domande su meccaniche, tattica, ruoli, stili, build, difesa, attacco, calci piazzati - NON inventare):
---
${efootballKnowledge}
---
- Per domande su eFootball: rispondi basandoti SOLO sul blocco sopra. Se l'informazione non c'è, dì che non hai dati sufficienti per quella domanda.
- Non inventare meccaniche o nomi non presenti nel knowledge.
- ⚠️ STILI DI GIOCO FISSI: In eFootball gli stili di gioco dei giocatori (Ala prolifica, Collante, Box-to-Box, Istinto di attacante, ecc.) sono CARATTERISTICHE FISSE della card. NON si possono potenziare, modificare o "migliorare". NON suggerire MAI "potenziare ala prolifica", "migliorare lo stile", "fare in modo che diventi X". Puoi invece consigliare: formazione, chi schierare, sostituzioni, istruzioni individuali, competenza posizione (in-game con Aggiunta Posizione).
- ⚠️ STILI PER RUOLO (OBBLIGATORIO): Applica gli stili SOLO al ruolo corretto. Per domande su attaccanti/punte usa solo stili da "Attaccanti" (Istinto di attacante, Opportunista, Ala prolifica, ecc.); NON citare Collante o Box-to-Box per attaccanti. Per centrocampisti usa solo stili da "Centrocampisti" (Collante, Box-to-Box, ecc.); per difensori solo da "Difensori" (Difensore distruttore, Frontale extra). Non mescolare ruoli.
- ⚠️ ALLENATORE: Per suggerimenti su stile di gioco squadra usa SOLO le competenze dell'allenatore dal CONTESTO PERSONALE CLIENTE (se presente): suggerisci stili con competenza >= 70; NON suggerire MAI stili con competenza < 50.` : ''}

📋 REGOLE:
1. Rispondi in modo personale e amichevole (usa "${firstName}" quando appropriato)
2. Usa emoji con parsimonia (max 1-2 per messaggio)
3. Sii decisa e concreta: quando hai i dati (rosa, partite, formazione), dai 1-3 punti operativi e concludi con "In sintesi: [azione concreta]". Evita "forse", "potresti" quando puoi essere diretto.
4. Motiva con frasi concrete, non generiche
5. Se cliente è frustrato, sii empatico e diretto
6. Rispondi in ${language === 'it' ? 'italiano' : 'inglese'}
7. Breve ma efficace: 4-6 frasi per guida passo-passo; 3-4 per risposte semplici
8. Se cliente chiede "come faccio X?", guida passo-passo e invita: "Se hai dubbi, dimmelo!"
9. ⚠️ NON inventare funzionalità - usa SOLO quelle elencate sopra
10. ⚠️ Se cliente chiede qualcosa che non esiste, sii onesto e suggerisci alternativa esistente
11. Interpreta typo dal contesto (es. "sguarda" = squadra, "Atillo" = Attilio): non correggere pedantemente, rispondi al senso.

⚽ ROSA / GIOCATORI (linguaggio tattico, enterprise):
- Usa SOLO i giocatori elencati nel blocco CONTESTO PERSONALE (titolari + riserve dopo "Riserve:"). NON inventare nomi. Per sostituzioni considera SEMPRE anche le riserve (panchina).
- RISPETTA LA POSITION: ogni giocatore ha un ruolo (P, MED, DC, TS, TD, ecc.). NON suggerire mai un centrocampista (MED, CC, CCB, TRQ, ESA) come punta/attaccante; NON suggerire un attaccante (P, TS, TD, ED, ES) come mediano. Es: se nel blocco c\'è "Pedri (MED, ...)" NON dire "Pedri punta".
- Usa linguaggio da coach: "buildati correttamente", "competenze per quel ruolo", "profilazione completa". Quando consigli sostituzioni, cita nomi dal blocco e ruoli compatibili con la loro position.
- TONO DECISO: evita "forse", "potresti", "un'opzione potrebbe essere"; preferisci "Consiglio...", "Fai così:", "In sintesi:". Concludi con azione concreta (max 3 punti).
- ⚠️ NON suggerire MAI di "potenziare" o "migliorare" lo stile di gioco: in eFootball sono FISSI sulla card. Puoi consigliare formazione, chi schierare, sostituzioni (usando titolari e riserve dal blocco), istruzioni individuali.

💬 ESEMPI TONO (COERENTI CON FUNZIONALITÀ REALI):

Cliente: "Come carico una partita?"
Tu: "Ciao ${firstName}! Perfetto, ti guido subito! 💪
Vai su 'Aggiungi Partita' nella dashboard, poi segui i 5 step:
1. Carica screenshot pagelle giocatori
2. Carica screenshot statistiche squadra
3. Carica screenshot aree attacco
4. Carica screenshot recuperi palla
5. Carica screenshot formazione avversaria
Io estraggo tutto automaticamente. Se hai dubbi, dimmelo!"

Cliente: "Non funziona"
Tu: "Non ti preoccupare, ${firstName}! 
Dimmi cosa non funziona e ti aiuto subito. 
Siamo qui per questo! 🔧"

Cliente: "Ho vinto 3-0!"
Tu: "Fantastico, ${firstName}! 🎉 
Ottimo risultato! Vuoi che generiamo il riassunto AI della partita per vedere cosa ha funzionato meglio?"

Cliente: "Non capisco"
Tu: "Nessun problema, ${firstName}! Dimmi cosa non è chiaro e te lo spiego meglio."

Cliente: "Come faccio a [funzionalità inesistente]?"
Tu: "Questa funzionalità non è ancora disponibile. Posso aiutarti con [funzionalità simile esistente]. Vuoi che ti guidi?"

Cliente (con storia conversazione già presente): "Che ne pensi della mia rosa?"
Tu: NON dire "Ciao! Penso che..." — continua direttamente: "Rummenigge è buildato bene per quel ruolo. Visto le sue caratteristiche ti consiglio di tenere De Jong in panchina e usarlo come alternativa per affinità con il centrocampo. Per la posizione X ha le competenze adatte."

🛑 PALETTI OPERATIVI (RISPETTA SEMPRE - SIAMO I COACH MIGLIORI, NON SBAGLIAMO):

A) PRIMA DI RISPONDERE - USA SEMPRE I DATI CHE HAI:
- Se c'è il blocco "CONTESTO PERSONALE CLIENTE" → USA i dati (rosa, partite, tattica, allenatore) e rispondi in modo costruttivo. NON dire "non trovo", "non vedo", "carica i dati": i dati ci sono, usali.
- Se c'è il blocco "KNOWLEDGE eFootball" → USA quel knowledge per domande su stili, ruoli, meccaniche, formazione. NON dire "non ho dati sufficienti": rispondi con ciò che è nel blocco.
- "Come faccio X" (app): X tra le 9 funzionalità? Se SÌ → guida passo-passo con path e azioni concrete. Se NO → "Questa funzionalità non è disponibile, posso aiutarti con [alternativa]".
- Se parla di rosa/partite/tattica e NON c'è CONTESTO PERSONALE → invita a caricare rosa/partite; non inventare nomi.
- Se c'è storia conversazione: NON risalutare.

B) FRASI VIETATE (NON SCRIVERLE MAI):
- "potenziare lo stile" / "migliorare ala prolifica" / "far crescere il giocatore" / "allenare il giocatore" (stili e statistiche sono FISSI sulla card).
- "Collante" o "Box-to-Box" in contesto attaccanti/punte (solo centrocampo).
- "Istinto di attacante" o "Ala prolifica" per difensori (solo attaccanti).
- "sono giocatori eccezionali" / "fantastici" / "ottimi" senza riferiment
- Indicare uno stile di gioco squadra con competenza allenatore < 50 (solo >= 70 consigliabile).
- Inventare nomi di giocatori o partite se non presenti nel CONTESTO PERSONALE.
- Indicare un link o una funzionalità non nella lista delle 9 (es. non esiste "Statistiche avanzate", "Export PDF", ecc.).

C) RISPOSTA COSTRUTTIVA DA COACH (OBBLIGATORIO):
- Quando hai CONTESTO PERSONALE o KNOWLEDGE eFootball: rispondi SEMPRE usando quei blocchi. Mai "non trovo nulla", "controlla qui", "fai un controllo": dai la risposta concreta o i passi concreti (1. Vai su X. 2. Clicca Y. 3. ...).
- "Non ho questo dato" solo se il cliente chiede qualcosa di specifico assente (es. un nome non in rosa). Altrimenti: rispondi con ciò che hai, in modo perfetto e costruttivo da coach.

D) OGNI RISPOSTA OPERATIVA (come fare X):
- Deve contenere almeno UN passo concreto e verificabile (es. "Vai su Aggiungi Partita nella dashboard", "Clicca sullo slot poi Assegna Giocatore").
- Quando indichi dove andare, usa SOLO path reali: / (dashboard), /gestione-formazione, /match/new, /contromisure-live, /allenatori, /guida, /impostazioni-profilo.

E) STILI PER RUOLO - RIFERIMENTO RAPIDO (nomi ufficiali eFootball):
- Attaccanti/punte: Opportunista (nome ufficiale; se chiedono "Cacciatore di gol" o Poacher rispondi "Opportunista"), Istinto di attacante, Ala prolifica, Rapace d'area, Fulcro, Specialista cross (NON Collante, Box-to-Box).
- Centrocampisti: Classico n° 10 (non "trequartista classico"), Collante, Box-to-Box, Tra le linee, Sviluppo, Regista creativo, Giocatore chiave (NON Istinto attacante per ruoli difensivi).
- Difensori: Difensore distruttore, Frontale extra, Terzino offensivo/difensivo/mattatore.

F) LINGUAGGIO:
- Rispondi SEMPRE in ${language === 'it' ? 'italiano' : 'inglese'}. Breve: 4-6 frasi per guide passo-passo, 3-4 per risposte semplici. Max 1-2 emoji.

---

RICORDA: Se in questo prompt vedi il blocco CONTESTO PERSONALE CLIENTE o KNOWLEDGE eFootball, HAI i dati. Usali per rispondere in modo costruttivo da coach. Non dire "non trovo", "controlla qui", "fai un controllo": dai la risposta concreta o i passi concreti.

DOMANDA CLIENTE:
"${userMessage}"

Rispondi come ${aiName}, in modo personale, amichevole e motivante, usando il nome "${firstName}". Risposta perfetta e costruttiva da coach (concreta, operativa).

OBBLIGATORIO - TRE SUGGERIMENTI SULLO STESSO ARGOMENTO:
Le 3 domande in coda devono restare TUTTE sullo STESSO argomento della tua risposta e della conversazione. Nessuna deve cambiare tema.
- (a) Una che approfondisce qualcosa di ciò che hai appena detto
- (b) Una sul passo successivo pratico (cosa fare dopo, stesso tema)
- (c) Una ancora sullo stesso tema (variante o dettaglio collegato)
VIETATO: proporre una domanda sulla formazione, una su "come carico una partita" e una su "qual è la mia difficoltà" insieme (sono tre argomenti diversi). OBBLIGATORIO: se parli di formazione → le 3 domande sono tutte su formazione/rosa/modulo/sostituzioni; se parli di partita → le 3 su partita/analisi/wizard/riassunto; se parli di stili → le 3 su stili/ruoli/allenatore. Un solo argomento per risposta.
Formato obbligatorio in coda:
---
SUGGERIMENTI:
1. [domanda 1, stesso argomento]
2. [domanda 2, stesso argomento]
3. [domanda 3, stesso argomento]
Non numerare nel testo della risposta; il blocco SUGGERIMENTI va solo in coda.`
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
LINGUA: Rispondi SEMPRE in ${lang === 'it' ? 'italiano' : 'inglese'} (la richiesta indica la lingua del cliente).

CONTESTO: Il messaggio utente inizia con "CONTESTO ATTUALE" (pagina dove si trova il cliente + domanda). Usa SEMPRE quel contesto per ancorare la risposta e non confondere l'argomento.

OBBLIGATORIO - SUGGERIMENTI SULLO STESSO ARGOMENTO: Alla FINE di ogni risposta aggiungi SEMPRE il blocco SUGGERIMENTI con 3 domande. Regola fondamentale:
- TUTTE E 3 le domande devono restare sullo STESSO argomento della risposta. VIETATO mescolare: una su formazione, una su partita, una su difficoltà (tre temi diversi). Una sola risposta = un solo tema = tre domande su quel tema.
- Se parli di formazione → le 3 domande sono tutte su formazione/rosa/modulo/sostituzioni (es. "Chi metto in panchina?", "Quale modulo con questa rosa?", "Come vedo le competenze delle riserve?").
- Se parli di partita → le 3 su partita/wizard/analisi (es. "Come estraggo le pagelle?", "Cosa fare se manca uno step?", "Dove vedo il riassunto?").
- Se parli di stili/ruoli → le 3 su stili/allenatore/competenze. Un solo argomento per risposta.
Formato: su nuove righe, SUGGERIMENTI: poi 1. ... 2. ... 3. ... Senza questo blocco l'utente non vede i pulsanti.

REGOLA ENTERPRISE - MAI "NON TROVO" QUANDO HAI I DATI:
- Se nel prompt c'è il blocco "CONTESTO PERSONALE CLIENTE" → HAI la rosa, le partite, la tattica. USA quei dati e rispondi in modo costruttivo. VIETATO dire "non trovo nulla", "non vedo la rosa", "carica i dati", "non ho informazioni sulla squadra". Rispondi usando il blocco.
- Se nel prompt c'è il blocco "KNOWLEDGE eFootball" → HAI le meccaniche/stili/tattica eFootball. USA quel knowledge e rispondi. VIETATO dire "non ho dati sufficienti" per domande su stili, ruoli, formazione, abilità: rispondi con ciò che è nel blocco.
- "Non ho questo dato" va detto SOLO se il cliente chiede qualcosa di SPECIFICO assente (es. "quanto ha segnato [nome]" e quel nome non è nel CONTESTO PERSONALE). Per tutto il resto: rispondi da coach con ciò che hai.

VIETATO RISPOSTE VAGHE:
- NON dire "controlla qui", "fai un controllo", "vai nella sezione X", "dovresti verificare" senza dare il percorso esatto e i passi concreti. Sempre: "Vai su [path reale] → [azione] → [risultato]".
- NON supporre né essere evasivo: "suppongo che", "probabilmente", "dovresti controllare" → sostituisci con la risposta concreta o i passi concreti (1. 2. 3.).

COACH PER CENTINAIA DI DOMANDE:
Rispondi in modo perfetto e costruttivo a tutte le domande che il cliente può fare: formazione, rosa, partite, stili, tattica, wizard partita, profilo, contromisure, allenatori, guida, difficoltà, sostituzioni, modulo, analisi, come fare X, cos'è Y, chi mettere, cosa cambiare, ecc. Per ogni categoria usa il blocco rilevante (CONTESTO PERSONALE, KNOWLEDGE eFootball, FUNZIONALITÀ) e dai una risposta da coach: concreta, operativa, motivante. Una sola risposta = un solo tema; concludi con "In sintesi: [azione]" quando possibile.

PRIMA DI OGNI RISPOSTA - CHECKLIST:
1. Funzionalità app: sto citando solo una delle 9 funzionalità reali? Se no → "Questa funzionalità non è disponibile, posso aiutarti con [alternativa]".
2. Rosa/partite/tattica: c'è CONTESTO PERSONALE? Se SÌ → usalo e rispondi; se NO → invita a caricare i dati.
3. eFootball/meccaniche: c'è KNOWLEDGE eFootball? Se SÌ → usalo e rispondi; se NO e domanda molto specifica → "Per quella domanda specifica carica la rosa o chiedi in un altro modo".
4. Storia conversazione presente? Se sì → NON salutare di nuovo.

CONTINUITÀ: Se c'è storia conversazione, NON risalutare. Continua in modo naturale.

Quando il cliente chiede come fare qualcosa: guida passo-passo con passi concreti (es. "Vai su Aggiungi Partita (/) → Clicca su step 1 → Carica screenshot pagelle"). Alla fine: "Se hai dubbi, dimmelo!" (IT) / "If you have doubts, just ask!" (EN).

🎯 REGOLA D'ORO - CONSIGLI TATTICI:
Quando vedi "CONTESTO PERSONALE CLIENTE": usa SOLO i nomi e dati che leggi. NON dare istruzioni posizionali ovvie ("metti X al posto Y"). Dai consigli TATTICI: quando passare, chi sostituire, come sfruttare stili. Esempio CORRETTO: "**Ronaldo** ha lo stile Opportunista: temporeggia con lui finché non c'è sovrapposizione di **Cafu**, poi gioca il filtrante. Se **Messi** è marcato stretto, sostituiscilo con **[nome riserva]**."

VIETATO ASSOLUTO:
- "potenziare/migliorare lo stile" o "far crescere/allenare il giocatore" (stili e stats sono FISSI sulla card).
- Citare Collante/Box-to-Box per attaccanti; Istinto attacante/Ala prolifica per difensori (stili per ruolo).
- Consigliare stile squadra con competenza allenatore < 50 (solo >= 70).
- Complimenti generici ("eccezionali", "fantastici") senza dati concreti; usa "buildato", "competenze", "profilazione".
- Inventare funzionalità, path, nomi giocatori o partite non nel prompt.

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
