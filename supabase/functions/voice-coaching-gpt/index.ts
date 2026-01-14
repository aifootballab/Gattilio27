// @ts-nocheck
// Supabase Edge Function: Voice Coaching con GPT-Realtime
// Coach personale vocale - conversazione bidirezionale in tempo reale
// IMPORTANTE: Usa GPT-4o Realtime API per botta e risposta intelligente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as functions from './functions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceCoachingRequest {
  action?: 'start_session' | 'send_message' | 'keep_alive' | 'end_session' | 'analyze_screenshot' | 'execute_function'
  user_id: string
  session_id?: string // ID sessione persistente
  message?: string // Testo o trascrizione audio
  audio_base64?: string // Audio in base64 (opzionale)
  image_url?: string // URL screenshot
  image_type?: string // Tipo screenshot
  function_name?: string // Nome funzione da eseguire
  arguments?: any // Argomenti funzione
  context?: {
    rosa?: any // Rosa utente
    match_stats?: any // Statistiche partita corrente
    opponent_formation?: any // Formazione avversaria
    user_profile?: any // Profilo utente (livello, preferenze)
    conversation_history?: any[] // Storia conversazione
  }
  mode?: 'text' | 'voice' // Modalità conversazione
}

/**
 * Enterprise-ready Edge Function per Voice Coaching con GPT-Realtime
 * 
 * Funzionalità:
 * - Conversazione bidirezionale (utente → AI → utente)
 * - Accesso a contesto completo (rosa, partite, statistiche)
 * - Personalizzazione basata su profilo utente
 * - Risposte contestuali e intelligenti
 * - Supporto per qualsiasi domanda su eFootball
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody: VoiceCoachingRequest = await req.json()
    const { action = 'send_message', user_id, session_id, message, audio_base64, image_url, image_type, function_name, arguments: args, context, mode = 'text' } = requestBody

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Gestione azioni sessione
    if (action === 'start_session') {
      return await handleStartSession(supabase, user_id, context || {})
    }

    if (action === 'keep_alive') {
      return await handleKeepAlive(supabase, session_id!)
    }

    if (action === 'end_session') {
      return await handleEndSession(supabase, session_id!)
    }

    if (action === 'analyze_screenshot') {
      return await handleAnalyzeScreenshot(supabase, user_id, session_id, image_url!, image_type!, context)
    }

    if (action === 'execute_function') {
      return await handleExecuteFunction(supabase, user_id, function_name!, args)
    }

    // Action: send_message (default) - Richiede sessione
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id for send_message action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Recupera sessione esistente
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('session_id', session_id)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verifica se sessione è scaduta
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('coaching_sessions')
        .update({ is_active: false })
        .eq('session_id', session_id)
      
      return new Response(
        JSON.stringify({ error: 'Session expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Carica contesto dalla sessione o usa quello fornito
    let userContext = session.context_snapshot || context || {}
    let conversationHistory = session.conversation_history || []
    
    if (!userContext.rosa) {
      // Carica rosa principale utente
      const { data: rosa } = await supabase
        .from('user_rosa')
        .select('*, players:player_builds(*)')
        .eq('user_id', user_id)
        .eq('is_main', true)
        .single()
      
      if (rosa) {
        userContext.rosa = rosa
      }
    }

    if (!userContext.user_profile) {
      // Carica profilo utente (livello coaching, preferenze)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user_id)
        .single()
      
      if (profile) {
        userContext.user_profile = profile
      }
    }

    // 2. Trascrivi audio se fornito (usando OpenAI Whisper o GPT-4o Realtime)
    let transcribedMessage = message
    
    if (audio_base64 && !message) {
      transcribedMessage = await transcribeAudio(audio_base64)
    }

    if (!transcribedMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing message or audio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Costruisci prompt contestuale per GPT-Realtime (con history)
    const coachingPrompt = buildCoachingPrompt(transcribedMessage, userContext, conversationHistory)

    // 4. Chiama GPT-4o Realtime API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const coachingResponse = await callGPTRealtimeCoaching(
      coachingPrompt,
      userContext,
      openaiApiKey,
      conversationHistory
    )

    // 5. Aggiorna sessione con nuovo messaggio e risposta
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: transcribedMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: coachingResponse, timestamp: new Date().toISOString() }
    ]

    await supabase
      .from('coaching_sessions')
      .update({
        conversation_history: updatedHistory,
        context_snapshot: userContext,
        last_activity: new Date().toISOString()
      })
      .eq('session_id', session_id)

    // 6. Salva anche in voice_coaching_sessions per log completo
    try {
      await supabase
        .from('voice_coaching_sessions')
        .insert({
          user_id,
          user_message: transcribedMessage,
          coaching_response: coachingResponse,
          context_snapshot: userContext,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log conversation:', logError)
      // Non bloccare la risposta se il log fallisce
    }

    // 7. Return risposta coaching
    return new Response(
      JSON.stringify({
        success: true,
        response: coachingResponse,
        transcribed_message: transcribedMessage,
        session_id: session_id,
        context_used: {
          has_rosa: !!userContext.rosa,
          has_match_stats: !!userContext.match_stats,
          has_opponent: !!userContext.opponent_formation
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in voice coaching:', error)
    
    // Log dettagliato per debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
    console.error('Error details:', JSON.stringify(errorDetails, null, 2))
    
    // Messaggio più chiaro per errori comuni
    let errorMessage = error.message
    let errorCode = 'COACHING_ERROR'
    
    if (error.message.includes('OPENAI_API_KEY')) {
      errorMessage = 'OPENAI_API_KEY not configured. Please set it in Supabase Edge Functions secrets.'
      errorCode = 'MISSING_API_KEY'
    } else if (error.message.includes('Supabase credentials')) {
      errorMessage = 'Supabase credentials not configured. This should be automatic.'
      errorCode = 'MISSING_SUPABASE_CREDENTIALS'
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Trascrivi audio usando OpenAI Whisper API
 */
async function transcribeAudio(audioBase64: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  try {
    // Converti base64 a file
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
    
    const formData = new FormData()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'it') // Italiano

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`)
    }

    const data = await response.json()
    return data.text || ''

  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw new Error(`Audio transcription failed: ${error.message}`)
  }
}

/**
 * Handler: Start Session
 */
async function handleStartSession(supabase: any, userId: string, context: any) {
  const sessionId = `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Carica contesto utente se non fornito
  let userContext = context || {}
  
  if (!userContext.rosa) {
    const { data: rosa } = await supabase
      .from('user_rosa')
      .select('*, players:player_builds(*)')
      .eq('user_id', userId)
      .eq('is_main', true)
      .single()
    
    if (rosa) {
      userContext.rosa = rosa
    }
  }

  if (!userContext.user_profile) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (profile) {
      userContext.user_profile = profile
    }
  }

  // Crea sessione
  const { data, error } = await supabase
    .from('coaching_sessions')
    .insert({
      user_id: userId,
      session_id: sessionId,
      conversation_history: [],
      context_snapshot: userContext,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  return new Response(
    JSON.stringify({
      success: true,
      session_id: sessionId,
      message: 'Session started'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Handler: Keep Alive
 */
async function handleKeepAlive(supabase: any, sessionId: string) {
  const { error } = await supabase
    .from('coaching_sessions')
    .update({
      last_activity: new Date().toISOString()
    })
    .eq('session_id', sessionId)
    .eq('is_active', true)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Session kept alive' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Handler: End Session
 */
async function handleEndSession(supabase: any, sessionId: string) {
  const { error } = await supabase
    .from('coaching_sessions')
    .update({ is_active: false })
    .eq('session_id', sessionId)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to end session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Session ended' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Handler: Analyze Screenshot
 */
/**
 * Esegue funzione chiamata da GPT Realtime API
 */
async function handleExecuteFunction(supabase: any, userId: string, functionName: string, args: any) {
  if (!functionName) {
    return new Response(
      JSON.stringify({ error: 'Missing function_name' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    let result
    switch (functionName) {
      case 'save_player_to_supabase':
        result = await functions.savePlayerToSupabase(
          supabase,
          userId,
          args.player_data,
          args.rosa_id
        )
        break

      case 'load_rosa':
        result = await functions.loadRosa(
          supabase,
          userId,
          args.rosa_id
        )
        break

      case 'search_player':
        result = await functions.searchPlayer(
          supabase,
          args.query
        )
        break

      case 'update_rosa':
        result = await functions.updateRosa(
          supabase,
          userId,
          args.rosa_id,
          args.player_build_ids
        )
        break

      case 'analyze_screenshot':
        result = await functions.analyzeScreenshot(
          supabase,
          userId,
          args.image_url,
          args.image_type
        )
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown function: ${functionName}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error executing function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleAnalyzeScreenshot(supabase: any, userId: string, sessionId: string | undefined, imageUrl: string, imageType: string, context: any) {
  // Se c'è una sessione, usa quella, altrimenti analisi standalone
  if (sessionId) {
    const { data: session } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (session) {
      // Analizza screenshot e aggiungi alla conversazione
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured')
      }

      // Chiama GPT-4o Vision per analisi screenshot
      const analysis = await analyzeScreenshotWithGPT(imageUrl, imageType, openaiApiKey)

      // Aggiorna sessione
      const updatedHistory = [
        ...(session.conversation_history || []),
        { role: 'user', content: `[Screenshot: ${imageType}]`, image_url: imageUrl, timestamp: new Date().toISOString() },
        { role: 'assistant', content: analysis.response, timestamp: new Date().toISOString() }
      ]

      await supabase
        .from('coaching_sessions')
        .update({
          conversation_history: updatedHistory,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      return new Response(
        JSON.stringify({
          success: true,
          response: analysis.response,
          analysis: analysis.data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Analisi standalone (senza sessione)
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const analysis = await analyzeScreenshotWithGPT(imageUrl, imageType, openaiApiKey)

  return new Response(
    JSON.stringify({
      success: true,
      response: analysis.response,
      analysis: analysis.data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Analizza screenshot con GPT-4o Vision
 */
async function analyzeScreenshotWithGPT(imageUrl: string, imageType: string, apiKey: string) {
  // Usa process-screenshot-gpt Edge Function o chiama direttamente GPT-4o Vision
  // Per ora, restituisci analisi base
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Sei un coach professionista di eFootball. Analizza screenshot e fornisci informazioni dettagliate.

REGOLE CRITICHE:
1. Estrai SOLO dati che vedi con certezza
2. Per ogni campo, indica: value, status ("certain" | "uncertain" | "missing"), confidence (0.0-1.0)
3. NON inventare valori - se non vedi un dato: value=null, status="missing", confidence=0.0
4. Se sei incerto: status="uncertain", confidence < 0.8
5. Mostra sempre cosa riconosciuto, cosa incerto, cosa mancante
6. Chiedi come procedere prima di salvare

FORMATO RISPOSTA:
✅ DATI RICONOSCIUTI (con confidence)
⚠️ DATI INCERTI
❌ DATI NON RICONOSCIUTI
💡 COSA POSSIAMO FARE (con opzioni)
Come preferisci procedere?`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analizza questo screenshot di tipo ${imageType} e fornisci un'analisi dettagliata.` },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 1000
    })
  })

  if (!response.ok) {
    throw new Error(`GPT Vision API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    response: data.choices[0].message.content,
    data: { image_type: imageType, image_url: imageUrl }
  }
}

/**
 * Costruisci prompt contestuale per coaching (con history)
 */
function buildCoachingPrompt(userMessage: string, context: any, conversationHistory: any[] = []): string {
  const userLevel = context.user_profile?.coaching_level || 'intermedio'
  const hasRosa = !!context.rosa
  const hasMatch = !!context.match_stats
  const hasOpponent = !!context.opponent_formation

  let prompt = `Sei un coach professionista di eFootball. Il tuo obiettivo è aiutare il cliente a costruire e gestire la sua rosa, migliorare nel gioco, e vincere partite.

**REGOLE FONDAMENTALI**:

1. **SOLO DATI VERIFICABILI**
   - Estrai SOLO dati che vedi con certezza
   - Se non sei certo, dillo esplicitamente
   - Non inventare mai statistiche o valori

2. **CHIEDI SEMPRE CONFERMA**
   - Mostra cosa hai riconosciuto (con confidence)
   - Mostra cosa manca
   - Chiedi come procedere
   - Non salvare senza consenso esplicito

3. **SPIEGA SEMPRE**
   - Perché un dato è importante
   - Cosa fare quando manca un dato
   - Come procedere nel prossimo passo

4. **ORIENTATO AI DATI**
   - Usa rosa attuale per consigli
   - Basa suggerimenti su statistiche reali
   - Non dare consigli generici

5. **COMPANION E GESTORE**
   - Sii un compagno che guida
   - Aiuta a costruire la rosa completa (11+10)
   - Mostra progresso e cosa manca
   - Suggerisci come completare

**PROFILO UTENTE:**
- Livello coaching: ${userLevel}
- Ha rosa configurata: ${hasRosa ? 'Sì' : 'No'}
- Sta giocando una partita: ${hasMatch ? 'Sì' : 'No'}
- Ha informazioni avversario: ${hasOpponent ? 'Sì' : 'No'}

**CONTESTO DISPONIBILE:**\n`

  if (context.rosa) {
    prompt += `- Rosa utente: ${context.rosa.players?.length || 0} giocatori\n`
    prompt += `- Formazione: ${context.rosa.formation || 'Non specificata'}\n`
    prompt += `- Forza complessiva: ${context.rosa.overall_strength || 'N/A'}\n`
  }

  if (context.match_stats) {
    prompt += `- Possesso: ${context.match_stats.possession || 'N/A'}%\n`
    prompt += `- Tiri: ${context.match_stats.shots || 'N/A'}\n`
    prompt += `- Risultato: ${context.match_stats.score || 'N/A'}\n`
  }

  if (context.opponent_formation) {
    prompt += `- Formazione avversaria: ${context.opponent_formation.formation || 'N/A'}\n`
    prompt += `- Stile avversario: ${context.opponent_formation.tactical_style || 'N/A'}\n`
  }

  // Aggiungi history conversazione se presente
  if (conversationHistory.length > 0) {
    prompt += `\n**STORIA CONVERSAZIONE:**\n`
    conversationHistory.slice(-5).forEach((msg: any) => {
      if (msg.role === 'user') {
        prompt += `Utente: "${msg.content}"\n`
      } else if (msg.role === 'assistant') {
        prompt += `Coach: "${msg.content}"\n`
      }
    })
  }

  prompt += `\n**DOMANDA UTENTE:**
"${userMessage}"

**ISTRUZIONI:**
1. Rispondi in modo chiaro e conciso, adattando il tono al livello utente (${userLevel})
2. Se l'utente è principiante, spiega i concetti base
3. Se l'utente è avanzato, fornisci consigli tattici dettagliati
4. Usa il contesto disponibile (rosa, partita, avversario) per risposte personalizzate
5. Se mancano informazioni, chiedi all'utente o suggerisci come ottenerle
6. Sii empatico e supportivo, specialmente se l'utente è frustrato
7. Fornisci sempre consigli pratici e azionabili basati su dati reali
8. Puoi rispondere a QUALSIASI domanda su eFootball: tattica, giocatori, formazioni, statistiche, sviluppo giocatori, booster, skills, etc.

**FORMATO RISPOSTE**:

Quando analizzi uno screenshot o fornisci consigli, usa sempre questo formato:

✅ DATI RICONOSCIUTI (con confidence):
- Campo 1: Valore (X% certo)
- Campo 2: Valore (X% certo)

⚠️ DATI INCERTI:
- Campo 3: Potrebbe essere X (Y% certo)

❌ DATI NON RICONOSCIUTI:
- Campo 4: non visibile/non leggibile

💡 COSA POSSIAMO FARE:
1. Opzione A
2. Opzione B
3. Opzione C

Come preferisci procedere?

**MEMORIA**:
- Non hai memoria propria tra sessioni
- Contesto viene ricaricato da Supabase ogni volta
- Puoi proporre cosa salvare, ma devi attendere conferma

**COMPORTAMENTO**:
- Analitico, non creativo
- Prudente, non supponente
- Contestualizzato, non generico
- Guidato, non autonomo

**RISPOSTA:**`

  return prompt
}

/**
 * Chiama GPT-4o Realtime API per coaching (con history)
 */
async function callGPTRealtimeCoaching(
  prompt: string,
  context: any,
  apiKey: string,
  conversationHistory: any[] = []
): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4o per risposte intelligenti
        messages: [
        {
          role: 'system',
          content: `Sei un coach professionista di eFootball. Il tuo obiettivo è aiutare il cliente a costruire e gestire la sua rosa, migliorare nel gioco, e vincere partite.

REGOLE FONDAMENTALI:
1. SOLO DATI VERIFICABILI - Estrai SOLO dati che vedi con certezza. Non inventare mai statistiche.
2. CHIEDI SEMPRE CONFERMA - Mostra cosa hai riconosciuto, cosa manca, chiedi come procedere.
3. SPIEGA SEMPRE - Perché un dato è importante, cosa fare quando manca, come procedere.
4. ORIENTATO AI DATI - Usa rosa attuale per consigli, basati su statistiche reali.
5. COMPANION E GESTORE - Sii un compagno che guida, aiuta a costruire rosa completa (11+10).

COMPORTAMENTO: Analitico, prudente, contestualizzato, guidato. Non creativo, non supponente, non generico, non autonomo.`
        },
          // Aggiungi history conversazione (ultimi 10 messaggi)
          ...conversationHistory.slice(-10).map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7, // Bilanciato tra creatività e coerenza
        stream: false // Per ora non streaming, ma può essere abilitato
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`GPT API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid GPT API response format')
    }

    return data.choices[0].message.content

  } catch (error) {
    console.error('Error calling GPT-Realtime API:', error)
    throw new Error(`GPT API call failed: ${error.message}`)
  }
}