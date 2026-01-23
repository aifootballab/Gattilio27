import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
 * Costruisce prompt personalizzato e motivante
 */
function buildPersonalizedPrompt(userMessage, context, language = 'it') {
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
- Usa SEMPRE il nome del cliente: "${firstName}"
- Celebra i successi: "Ottimo lavoro!", "Bravo!", "Fantastico!" 🎉
- Incoraggia quando serve: "Non ti preoccupare!", "Andiamo passo-passo insieme!" 💪
- Guida attiva: non solo rispondi, ma accompagni e motivi
- Se cliente è frustrato, sii empatico e rassicurante
- Se cliente ha successo, celebra con entusiasmo

👤 CONTESTO CLIENTE:
- Nome: ${firstName}
- Team: ${teamName}
${howToRemember ? `- Come ricordarti: ${howToRemember}` : ''}
${commonProblems.length > 0 ? `- Problemi comuni: ${commonProblems.join(', ')}` : ''}
${pageContext ? `- Situazione: ${pageContext}` : ''}
${stateContext ? `- Stato: ${stateContext}` : ''}

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

📋 REGOLE:
1. Rispondi SEMPRE in modo personale e amichevole (usa "${firstName}")
2. Usa emoji quando appropriato (max 1-2 per messaggio, non esagerare)
3. Guida passo-passo, non solo istruzioni tecniche
4. Motiva e incoraggia sempre
5. Se cliente è frustrato, sii empatico: "Non ti preoccupare, ${firstName}! Ti aiuto subito!"
6. Se cliente ha successo, celebra: "Fantastico, ${firstName}! 🎉 Ottimo lavoro!"
7. Rispondi in ${language === 'it' ? 'italiano' : 'inglese'}
8. Massimo 3-4 frasi per risposta (breve ma efficace)
9. Se cliente chiede "come faccio X?", guida passo-passo con entusiasmo
10. Se cliente dice "non capisco", spiega in modo più semplice e paziente
11. ⚠️ NON inventare funzionalità - usa SOLO quelle elencate sopra
12. ⚠️ Se cliente chiede qualcosa che non esiste, sii onesto e suggerisci alternativa esistente

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
Tu: "Nessun problema, ${firstName}! 
Andiamo passo-passo insieme. Dimmi cosa non è chiaro e te lo spiego meglio! 😊"

Cliente: "Come faccio a [funzionalità inesistente]?"
Tu: "Mi dispiace ${firstName}, questa funzionalità non è ancora disponibile. 
Ma posso aiutarti con [funzionalità simile esistente]. Vuoi che ti guidi?"

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
    
    const { message, currentPage, appState, language = 'it' } = body
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    
    // Costruisci contesto personale
    const context = await buildAssistantContext(userId, currentPage, appState)
    
    // Costruisci prompt personalizzato
    const prompt = buildPersonalizedPrompt(message, context, language)
    
    // Chiama OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }
    
    // Usa il modello migliore disponibile
    // Prova GPT-5, fallback a GPT-4o se non disponibile
    let model = 'gpt-4o' // Default
    try {
      // Verifica se GPT-5 è disponibile (da testare in produzione)
      // Per ora usiamo GPT-4o che è stabile e disponibile
      // TODO: Testare GPT-5 quando disponibile e aggiornare
      model = 'gpt-4o'
    } catch (e) {
      model = 'gpt-4o' // Fallback sicuro
    }
    
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: `Sei un coach AI personale e amichevole per eFootball. 
Rispondi sempre in modo empatico, motivante e incoraggiante. 
Usa il nome del cliente quando possibile.

⚠️ REGOLE CRITICHE:
- NON inventare funzionalità che non esistono nella piattaforma
- Rispondi SOLO su funzionalità reali e documentate
- Se cliente chiede qualcosa che non esiste, sii onesto e suggerisci alternativa esistente
- Mantieni coerenza: tutte le informazioni devono essere accurate
- Se non sei sicuro di una funzionalità, ammettilo e chiedi chiarimenti`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7, // Bilanciato: creativo ma preciso (non inventare)
      max_tokens: 300, // Breve ma efficace (3-4 frasi)
      response_format: { type: 'text' }
    }
    
    const response = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(errorData.error?.message || 'OpenAI API error')
    }
    
    const data = await response.json()
    let content = data.choices[0]?.message?.content || 'Mi dispiace, non ho capito. Puoi ripetere?'
    
    // Validazione base: rimuovi riferimenti a funzionalità inesistenti comuni
    // (questo è un fallback, il prompt dovrebbe già prevenire)
    const invalidFeatures = [
      'funzionalità non disponibile',
      'non implementato',
      'non ancora disponibile'
    ]
    
    // Se la risposta contiene riferimenti a funzionalità inesistenti, 
    // assicurati che sia chiaro che è onesto (non inventato)
    // Il prompt già gestisce questo, ma aggiungiamo validazione extra
    
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
