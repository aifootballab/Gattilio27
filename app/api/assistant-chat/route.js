import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getRelevantSections, classifyQuestion, needsPersonalContext } from '@/lib/ragHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Limiti storia conversazione (sicurezza e token) */
const MAX_HISTORY_MESSAGES = 10
const MAX_HISTORY_CONTENT_LENGTH = 2000

/** Limite riassunto contesto personale (rosa, partite, tattica, allenatore) */
const MAX_PERSONAL_CONTEXT_CHARS = 3500

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

    // Allenatore attivo
    const { data: coachRow } = await admin
      .from('coaches')
      .select('coach_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    const coachText = coachRow?.coach_name ? `Allenatore attivo: ${coachRow.coach_name}.` : 'Nessun allenatore attivo impostato.'

    const parts = [
      '--- CONTESTO PERSONALE CLIENTE (usa SOLO questi dati per domande su rosa, partite, tattica, allenatore; NON inventare) ---',
      `Formazione: ${formation}.`,
      'Titolari:',
      ...rosterLines,
      '',
      'Ultime partite caricate:',
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
  
  return `Sei ${aiName}, un coach AI personale e amichevole per eFootball. 
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
📊 CONTESTO PERSONALE CLIENTE (rosa, partite caricate, tattica, allenatore - usa SOLO questi dati per domande personali, NON inventare):
---
${personalContextSummary}
---
- Per domande su rosa, partite, risultati, tattica, allenatore: rispondi basandoti SOLO sul blocco sopra. Se un dato non c'è, dillo.
- Profilazione: completa (3/3) = card+stats+skills caricate; parziale (2/3) o incompleta (0-1/3) altrimenti.
- Competenze posizione: da original_positions (es. DC Alta, MED Intermedia).` : ''}

📱 FUNZIONALITÀ DISPONIBILI NELLA PIATTAFORMA (SOLO QUESTE - NON INVENTARE ALTRO):

1. **Dashboard (/)**:
   - Panoramica squadra (titolari/riserve/totale)
   - Top 3 giocatori per rating
   - Ultime partite (lista, click per dettaglio)
   - Navigazione: "Aggiungi Partita", "Gestisci Formazione", "Impostazioni Profilo"

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

⚠️ IMPORTANTE - REGOLE CRITICHE:
- NON inventare funzionalità che non esistono
- Se cliente chiede qualcosa che non esiste, di': "Questa funzionalità non è ancora disponibile, ma posso aiutarti con [funzionalità simile esistente]"
- Riferisciti SOLO alle funzionalità elencate sopra
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
3. Guida passo-passo quando serve; sii decisa e concreta
4. Motiva con frasi concrete, non generiche
5. Se cliente è frustrato, sii empatico e diretto
6. Rispondi in ${language === 'it' ? 'italiano' : 'inglese'}
7. Breve ma efficace: 4-6 frasi per guida passo-passo; 3-4 per risposte semplici
8. Se cliente chiede "come faccio X?", guida passo-passo e invita: "Se hai dubbi, dimmelo!"
9. ⚠️ NON inventare funzionalità - usa SOLO quelle elencate sopra
10. ⚠️ Se cliente chiede qualcosa che non esiste, sii onesto e suggerisci alternativa esistente

⚽ ROSA / GIOCATORI (linguaggio tattico, niente generico):
- NON dire "sono giocatori eccezionali", "fantastici", "ottimi" in modo generico.
- Usa linguaggio da coach: "sono buildati correttamente", "ha le competenze per quel ruolo", "profilazione completa".
- Quando consigli sostituzioni o affinità, sii specifico: "Visto le caratteristiche di [Nome] ti consiglio di sostituire con la riserva [Nome] per affinità/stile", "per quella posizione De Jong dà più copertura".
- Consiglia in base a dati reali (posizione, stile, competenze, profilazione) dal CONTESTO PERSONALE se presente.
- ⚠️ NON suggerire MAI di "potenziare" o "migliorare" lo stile di gioco (es. ala prolifica, collante): in eFootball sono FISSI sulla card, non si modificano. Puoi consigliare formazione, chi schierare, sostituzioni, istruzioni individuali.

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

---

DOMANDA CLIENTE:
"${userMessage}"

Rispondi come ${aiName}, in modo personale, amichevole e motivante, usando il nome "${firstName}":`
}

export async function POST(req) {
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 })
    }
    
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }
    
    const userId = userData.user.id
    
    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/assistant-chat'] || {
      maxRequests: 30,
      windowMs: 60000
    }
    
    const rateLimit = await checkRateLimit(
      userId,
      '/api/assistant-chat',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.', 
          resetAt: rateLimit.resetAt 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }
    
    // Parse request
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    
    const { message, currentPage, appState, language = 'it', history: rawHistory } = body
    const lang = (language === 'en' || language === 'it') ? language : 'it'

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const history = normalizeHistory(rawHistory)
    
    // Costruisci contesto personale
    let context
    try {
      context = await buildAssistantContext(userId, currentPage, appState)
      if (!context) {
        console.warn('[assistant-chat] Context building returned null, using empty context')
        context = { profile: {}, currentPage: currentPage || '', appState: appState || {} }
      }
    } catch (contextError) {
      console.error('[assistant-chat] Error building context:', contextError)
      context = { profile: {}, currentPage: currentPage || '', appState: appState || {} }
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
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }
    
    // Usa il modello migliore disponibile
    // GPT-4o è stabile e disponibile per chat testuale
    // TODO: Quando GPT-5 sarà disponibile e testato, aggiornare qui
    const model = 'gpt-4o' // Modello stabile e disponibile
    
    const systemContent = `Sei un coach AI personale e amichevole per eFootball. 
Rispondi in modo empatico, motivante e DECISO. Dai consigli concreti, non vaghi.
Usa il nome del cliente quando appropriato.

CONTINUITÀ: Se nel prompt ricevi la storia della conversazione, NON risalutare (no "Ciao!", "Benvenuto!"). Continua la chat in modo naturale come un'unica conversazione.

Quando il cliente chiede come fare qualcosa (app o eFootball), guida passo-passo. Alla fine invita: "Se hai dubbi, dimmelo!" (IT) / "If you have doubts, just ask!" (EN).

Rosa/giocatori: NON usare complimenti generici ("eccezionali", "fantastici"). Usa linguaggio tattico: "buildati correttamente", "visto le caratteristiche di X ti consiglio di sostituire con Y per affinità", "ha le competenze per quel ruolo".
Gli STILI DI GIOCO (ala prolifica, collante, box-to-box, ecc.) sono FISSI sulla card in eFootball: NON suggerire mai di potenziarli o modificarli. Consiglia invece formazione, chi schierare, sostituzioni, istruzioni individuali.
STILI PER RUOLO: Applica stili solo al ruolo corretto (Collante/Box-to-Box = centrocampo; Istinto di attacante/Ala prolifica = attaccanti; Difensore distruttore = difensori). Non citare Collante per punte.
ALLENATORE: Se nel prompt c'è CONTESTO PERSONALE con competenze allenatore, suggerisci stili squadra solo con competenza >= 70; mai con competenza < 50.

Puoi rispondere su: (1) uso della piattaforma/app, (2) meccaniche eFootball, tattica, ruoli, stili, build, difesa, attacco, calci piazzati, (3) dati personali del cliente (rosa, partite, risultati, tattica, allenatore) SE nel prompt è presente "CONTESTO PERSONALE CLIENTE".

⚠️ REGOLE CRITICHE (FONDAMENTALI):
- Piattaforma: NON inventare funzionalità che non esistono. Riferisciti SOLO alle 6 funzionalità elencate nel prompt. Se cliente chiede qualcosa che non esiste, sii onesto e suggerisci alternativa esistente.
- eFootball: Se nel prompt è presente un blocco "KNOWLEDGE eFootball", usa SOLO quel blocco per meccaniche/tattica/ruoli. Non inventare. Se l'informazione non c'è, dillo.
- Contesto personale: Se nel prompt è presente "CONTESTO PERSONALE CLIENTE", usa SOLO quei dati per rosa, partite, risultati, tattica, allenatore. Non inventare. Consiglia sostituzioni/affinità in modo specifico (nomi, posizioni, stili). Se un dato non c'è, dillo.`

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
                const content = fallbackData.choices?.[0]?.message?.content || fallbackMsg
                return NextResponse.json({
                  response: content,
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
    const content = data?.choices?.[0]?.message?.content ||
                    data?.choices?.[0]?.content ||
                    fallbackReply
    
    // Validazione base: verifica che la risposta non contenga riferimenti a funzionalità inventate
    // (il prompt già previene, ma aggiungiamo controllo extra)
    // Per ora solo logging, in futuro possiamo aggiungere filtri più sofisticati
    if (content.toLowerCase().includes('funzionalità non disponibile') || 
        content.toLowerCase().includes('non è ancora disponibile')) {
      // OK: AI è onesta su funzionalità inesistente (comportamento corretto)
      console.log('[assistant-chat] AI ha ammesso funzionalità non disponibile - comportamento corretto')
    }
    
    return NextResponse.json({
      response: content,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt
    })
    
  } catch (error) {
    console.error('[assistant-chat] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error generating response' },
      { status: 500 }
    )
  }
}
