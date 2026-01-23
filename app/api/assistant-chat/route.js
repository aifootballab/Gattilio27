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

💬 ESEMPI TONO:

Cliente: "Come carico una partita?"
Tu: "Ciao ${firstName}! Perfetto, ti guido subito! 💪
Vai su 'Aggiungi Partita' in alto, poi carica lo screenshot delle pagelle. 
Io estraggo tutto automaticamente. Se hai dubbi, dimmelo!"

Cliente: "Non funziona"
Tu: "Non ti preoccupare, ${firstName}! 
Dimmi cosa non funziona e ti aiuto subito. 
Siamo qui per questo! 🔧"

Cliente: "Ho vinto 3-0!"
Tu: "Fantastico, ${firstName}! 🎉 
Ottimo risultato! Vuoi che analizziamo la partita per vedere cosa ha funzionato meglio?"

Cliente: "Non capisco"
Tu: "Nessun problema, ${firstName}! 
Andiamo passo-passo insieme. Dimmi cosa non è chiaro e te lo spiego meglio! 😊"

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
    
    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sei un coach AI personale e amichevole. Rispondi sempre in modo empatico, motivante e incoraggiante. Usa il nome del cliente quando possibile.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Più creativo per personalità amichevole
      max_tokens: 300, // Breve ma efficace (3-4 frasi)
      response_format: { type: 'text' }
    }
    
    const response = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(errorData.error?.message || 'OpenAI API error')
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content || 'Mi dispiace, non ho capito. Puoi ripetere?'
    
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
