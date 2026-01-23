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
    // GPT-5 disponibile (Agosto 2025) - modello più avanzato per qualità superiore
    // Per chat testuale: GPT-5 (migliore ragionamento, contesto più ampio)
    // Per Realtime vocale: gpt-realtime (Agosto 2025)
    // Fallback a GPT-4o se GPT-5 non disponibile
    let model = 'gpt-5' // Prova GPT-5 (modello migliore)
    // Se GPT-5 non disponibile, fallback automatico a GPT-4o gestito da OpenAI
    
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'system',
          content: `Sei un coach AI personale e amichevole per eFootball. 
Rispondi sempre in modo empatico, motivante e incoraggiante. 
Usa il nome del cliente quando possibile.

⚠️ REGOLE CRITICHE (FONDAMENTALI):
- NON inventare funzionalità che non esistono nella piattaforma
- Rispondi SOLO su funzionalità reali e documentate nel prompt
- Se cliente chiede qualcosa che non esiste, sii onesto: "Questa funzionalità non è ancora disponibile, ma posso aiutarti con [funzionalità simile esistente]"
- Mantieni coerenza: tutte le informazioni devono essere accurate e verificate
- Se non sei sicuro di una funzionalità, ammettilo: "Non sono sicuro, ma posso guidarti su [funzionalità esistente]"
- Riferisciti SOLO alle 6 funzionalità elencate nel prompt utente`
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
                const content = fallbackData.choices?.[0]?.message?.content || 'Mi dispiace, non ho capito. Puoi ripetere?'
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
    
    // Estrai contenuto con fallback sicuro
    const content = data?.choices?.[0]?.message?.content || 
                    data?.choices?.[0]?.content || 
                    'Mi dispiace, non ho capito. Puoi ripetere?'
    
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
