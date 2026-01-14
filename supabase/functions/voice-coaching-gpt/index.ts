// @ts-nocheck
// Supabase Edge Function: Voice Coaching con GPT-Realtime
// Coach personale vocale - conversazione bidirezionale in tempo reale
// IMPORTANTE: Usa GPT-4o Realtime API per botta e risposta intelligente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// ============================================================================
// FUNZIONI HELPER - DEFINITE PRIMA DI serve() PER DENO EDGE FUNCTIONS
// ============================================================================

/**
 * Trascrivi audio usando OpenAI Whisper API
 */
async function transcribeAudio(audioBase64: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  try {
    // ✅ Rimuovi prefisso data: se presente
    let cleanBase64 = audioBase64
    if (audioBase64.includes(',')) {
      cleanBase64 = audioBase64.split(',')[1]
    }

    // ✅ Verifica che base64 sia valido
    if (!cleanBase64 || cleanBase64.length === 0) {
      throw new Error('Empty audio base64 data')
    }

    // ✅ Converti base64 a buffer
    let audioBuffer: Uint8Array
    try {
      audioBuffer = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0))
    } catch (decodeError) {
      throw new Error(`Invalid base64 audio data: ${decodeError.message}`)
    }

    // ✅ Verifica dimensione (Whisper max 25MB)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (audioBuffer.length > maxSize) {
      throw new Error(`Audio file too large: ${audioBuffer.length} bytes (max: ${maxSize})`)
    }

    if (audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty')
    }

    // ✅ Crea FormData con file audio
    const formData = new FormData()
    
    // ✅ Whisper supporta: mp3, mp4, mpeg, mpga, m4a, wav, webm
    // IMPORTANTE: Whisper richiede che il file abbia un nome con estensione
    // In Deno, dobbiamo usare File per avere il nome file
    // Se File non è disponibile, proviamo un workaround
    
    let audioFile: File | Blob
    
    // ✅ Prova a creare File (supportato in Deno 1.37+)
    try {
      audioFile = new File([audioBuffer], 'audio.webm', { 
        type: 'audio/webm',
        lastModified: Date.now()
      })
      console.log('✅ Using File constructor')
    } catch (fileError) {
      // Fallback: usa Blob (meno ideale ma funziona)
      console.warn('⚠️ File constructor not available, using Blob:', fileError)
      audioFile = new Blob([audioBuffer], { type: 'audio/webm' })
    }
    
    // ✅ Aggiungi file a FormData
    // In Deno, FormData.append con File dovrebbe funzionare
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    formData.append('language', 'it') // Italiano
    formData.append('response_format', 'json')
    
    console.log('📤 FormData prepared:', {
      hasFile: formData.has('file'),
      fileType: audioFile instanceof File ? 'File' : 'Blob',
      fileName: audioFile instanceof File ? (audioFile as File).name : 'unknown',
      size: audioBuffer.length
    })

    console.log('📤 Sending audio to Whisper API:', {
      size: audioBuffer.length,
      sizeKB: Math.round(audioBuffer.length / 1024),
      type: 'audio/webm'
    })

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Whisper API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`Whisper API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const transcribedText = data.text || ''
    
    console.log('✅ Audio transcribed:', {
      textLength: transcribedText.length,
      preview: transcribedText.substring(0, 50) + '...'
    })

    return transcribedText

  } catch (error) {
    console.error('❌ Error transcribing audio:', error)
    throw new Error(`Audio transcription failed: ${error.message}`)
  }
}

/**
 * Handler: Start Session
 */
const handleStartSession = async (supabase: any, userId: string, context: any) => {
  const sessionId = `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Carica contesto utente se non fornito
  let userContext = context || {}
  
  if (!userContext.rosa) {
    const { data: rosa, error: rosaError } = await supabase
      .from('user_rosa')
      .select('*, players:player_builds(*)')
      .eq('user_id', userId)
      .eq('is_main', true)
      .maybeSingle() // ✅ Usa maybeSingle() invece di single() per evitare errori se non trova risultati
    
    if (rosa && !rosaError) {
      userContext.rosa = rosa
    } else if (rosaError && rosaError.code !== 'PGRST116') {
      // PGRST116 = "no rows returned" - non è un errore critico
      console.warn('Warning loading rosa:', rosaError.message)
    }
  }

  if (!userContext.user_profile) {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle() // ✅ Usa maybeSingle() invece di single()
    
    if (profile && !profileError) {
      userContext.user_profile = profile
    } else if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = "no rows returned" - non è un errore critico
      console.warn('Warning loading user profile:', profileError.message)
    }
  }

  // Crea sessione
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000) // 1 ora da ora
  
  const { data, error } = await supabase
    .from('coaching_sessions')
    .insert({
      user_id: userId,
      session_id: sessionId,
      conversation_history: [],
      context_snapshot: userContext,
      is_active: true,
      last_activity: now.toISOString(),
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating session:', error)
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
const handleKeepAlive = async (supabase: any, sessionId: string) => {
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
const handleEndSession = async (supabase: any, sessionId: string) => {
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
 * Salva giocatore in Supabase
 */
async function savePlayerToSupabase(
  supabase: any,
  userId: string,
  playerData: any,
  rosaId?: string
) {
  try {
    // 1. Salva in players_base (se nuovo)
    let playerBaseId = null
    
    if (playerData.player_name) {
      // Cerca se esiste già
      const { data: existing, error: existingError } = await supabase
        .from('players_base')
        .select('id')
        .eq('player_name', playerData.player_name)
        .maybeSingle() // ✅ Usa maybeSingle() invece di single()

      if (existing && !existingError) {
        playerBaseId = existing.id
      } else {
        // Crea nuovo
        const { data: newPlayer, error } = await supabase
          .from('players_base')
          .insert({
            player_name: playerData.player_name,
            position: playerData.position,
            base_stats: playerData.base_stats || {},
            skills: playerData.skills || [],
            com_skills: playerData.com_skills || [],
            height: playerData.height,
            weight: playerData.weight,
            age: playerData.age,
            nationality: playerData.nationality,
            club_name: playerData.club_name
          })
          .select('id')
          .single()

        if (error) throw error
        playerBaseId = newPlayer.id
      }
    }

    // 2. Crea player_build (build utente)
    let playerBuildId = null
    if (playerBaseId && playerData.build) {
      const { data: build, error } = await supabase
        .from('player_builds')
        .upsert({
          user_id: userId,
          player_base_id: playerBaseId,
          development_points: playerData.build.development_points || {},
          current_level: playerData.build.current_level,
          level_cap: playerData.build.level_cap,
          final_stats: playerData.build.final_stats,
          final_overall_rating: playerData.build.final_overall_rating,
          source: 'voice_coaching'
        }, {
          onConflict: 'user_id,player_base_id'
        })
        .select('id')
        .single()

      if (error) throw error
      playerBuildId = build.id
    }

    // 3. Aggiungi a rosa se rosaId fornito
    if (rosaId && playerBuildId) {
      const { data: rosa, error: rosaError } = await supabase
        .from('user_rosa')
        .select('player_build_ids')
        .eq('id', rosaId)
        .eq('user_id', userId)
        .maybeSingle() // ✅ Usa maybeSingle() invece di single()

      if (rosa && !rosaError) {
        const currentIds = rosa.player_build_ids || []
        if (!currentIds.includes(playerBuildId)) {
          await supabase
            .from('user_rosa')
            .update({
              player_build_ids: [...currentIds, playerBuildId]
            })
            .eq('id', rosaId)
        }
      }
    }

    return {
      success: true,
      player_base_id: playerBaseId,
      player_build_id: playerBuildId,
      message: `Giocatore ${playerData.player_name || 'salvato'} salvato con successo`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Carica rosa da Supabase
 */
async function loadRosa(
  supabase: any,
  userId: string,
  rosaId?: string
) {
  try {
    let query = supabase
      .from('user_rosa')
      .select(`
        *,
        player_builds:player_build_ids (
          *,
          players_base:player_base_id (
            *
          )
        )
      `)
      .eq('user_id', userId)

    if (rosaId) {
      query = query.eq('id', rosaId)
    } else {
      // Carica rosa principale o prima disponibile
      query = query.order('created_at', { ascending: false }).limit(1)
    }

    const { data: rosa, error } = await query.maybeSingle() // ✅ Usa maybeSingle() invece di single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!rosa) {
      return {
        success: false,
        error: 'Rosa not found'
      }
    }

    return {
      success: true,
      rosa: {
        id: rosa.id,
        name: rosa.name,
        player_count: rosa.player_build_ids?.length || 0,
        players: rosa.player_builds || []
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Cerca giocatori nel database
 */
async function searchPlayer(
  supabase: any,
  query: string
) {
  try {
    const { data: players, error } = await supabase
      .from('players_base')
      .select('*')
      .ilike('player_name', `%${query}%`)
      .limit(10)

    if (error) throw error

    return {
      success: true,
      players: players || [],
      count: players?.length || 0
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Aggiorna rosa con nuovi giocatori
 */
async function updateRosa(
  supabase: any,
  userId: string,
  rosaId: string,
  playerBuildIds: string[]
) {
  try {
    const { data, error } = await supabase
      .from('user_rosa')
      .update({
        player_build_ids: playerBuildIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', rosaId)
      .eq('user_id', userId)
      .select()

    if (error) throw error

    return {
      success: true,
      message: `Rosa aggiornata con ${playerBuildIds.length} giocatori`
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Analizza screenshot
 */
async function analyzeScreenshotFunction(
  supabase: any,
  userId: string,
  imageUrl: string,
  imageType: string
) {
  try {
    // Chiama process-screenshot-gpt Edge Function
    const { data, error } = await supabase.functions.invoke('process-screenshot-gpt', {
      body: {
        image_url: imageUrl,
        image_type: imageType,
        user_id: userId
      }
    })

    if (error) throw error

    return {
      success: true,
      analysis: data.candidate_profile,
      confidence: data.confidence_score
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Analizza screenshot con GPT-4o Vision
 */
async function analyzeScreenshotWithGPT(imageUrl: string, imageType: string, apiKey: string) {
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
 * Handler: Analyze Screenshot
 */
const handleAnalyzeScreenshot = async (supabase: any, userId: string, sessionId: string | undefined, imageUrl: string, imageType: string, context: any) => {
  // Se c'è una sessione, usa quella, altrimenti analisi standalone
  if (sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle() // ✅ Usa maybeSingle() invece di single()

    if (session && !sessionError) {
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
 * Esegue funzione chiamata da GPT Realtime API
 */
const handleExecuteFunction = async (supabase: any, userId: string, functionName: string, args: any) => {
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
        result = await savePlayerToSupabase(
          supabase,
          userId,
          args.player_data,
          args.rosa_id
        )
        break

      case 'load_rosa':
        result = await loadRosa(
          supabase,
          userId,
          args.rosa_id
        )
        break

      case 'search_player':
        result = await searchPlayer(
          supabase,
          args.query
        )
        break

      case 'update_rosa':
        result = await updateRosa(
          supabase,
          userId,
          args.rosa_id,
          args.player_build_ids
        )
        break

      case 'analyze_screenshot':
        result = await analyzeScreenshotFunction(
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
        stream: true // ✅ Abilita streaming per risposte in tempo reale
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

// ============================================================================
// SERVE() - DEFINITO ALLA FINE DOPO TUTTE LE FUNZIONI
// ============================================================================

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
    // ✅ Verifica formato JWT (semplificato - accetta anche utenti anonymous)
    // Nota: Verifica completa JWT richiederebbe SUPABASE_ANON_KEY come secret
    // Per ora verifichiamo solo che il token esista e abbia formato valido
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    if (!token || token.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid JWT token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Verifica formato base JWT (deve avere 3 parti separate da punti)
    const tokenParts = token.split('.')
    if (tokenParts.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Token ha formato valido - procediamo (accetta anche anonymous users)
    console.log('✅ JWT token format validated (accepting anonymous users)')

    // ✅ Verifica che il body esista e non sia vuoto prima di fare parsing
    let requestBody: VoiceCoachingRequest
    
    try {
      // Controlla se il body esiste
      if (!req.body) {
        return new Response(
          JSON.stringify({ error: 'Request body is missing', code: 'EMPTY_BODY' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      requestBody = await req.json()
      
      // Verifica che requestBody non sia null o undefined
      if (!requestBody) {
        return new Response(
          JSON.stringify({ error: 'Request body is empty', code: 'EMPTY_BODY' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError)
      const errorMessage = parseError?.message || 'Unknown parsing error'
      
      // Se è "Unexpected end of JSON input", significa body vuoto
      if (errorMessage.includes('Unexpected end of JSON input') || errorMessage.includes('JSON')) {
        return new Response(
          JSON.stringify({ 
            error: 'Request body is empty or invalid JSON', 
            code: 'INVALID_JSON',
            details: errorMessage
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Altri errori di parsing
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body', 
          code: 'INVALID_JSON',
          details: errorMessage
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
      .maybeSingle() // ✅ Usa maybeSingle() per gestire meglio il caso "non trovato"

    if (sessionError && sessionError.code !== 'PGRST116') {
      // PGRST116 = "no rows returned" - gestito sotto
      console.error('Error loading session:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Error loading session', details: sessionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!session) {
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
      const { data: rosa, error: rosaError } = await supabase
        .from('user_rosa')
        .select('*, players:player_builds(*)')
        .eq('user_id', user_id)
        .eq('is_main', true)
        .maybeSingle() // ✅ Usa maybeSingle() invece di single()
      
      if (rosa && !rosaError) {
        userContext.rosa = rosa
      } else if (rosaError && rosaError.code !== 'PGRST116') {
        console.warn('Warning loading rosa:', rosaError.message)
      }
    }

    if (!userContext.user_profile) {
      // Carica profilo utente (livello coaching, preferenze)
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle() // ✅ Usa maybeSingle() invece di single()
      
      if (profile && !profileError) {
        userContext.user_profile = profile
      } else if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Warning loading user profile:', profileError.message)
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

    // ✅ 5. Chiama GPT con streaming e restituisci SSE
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
          ...conversationHistory.slice(-10).map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          {
            role: 'user',
            content: coachingPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: true
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      throw new Error(`GPT API error: ${openaiResponse.status} - ${errorData}`)
    }

    // ✅ Crea stream SSE per risposte in tempo reale
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body?.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6)
                if (data === '[DONE]') {
                  // Streaming completo - salva risposta completa
                  const updatedHistory = [
                    ...conversationHistory,
                    { role: 'user', content: transcribedMessage, timestamp: new Date().toISOString() },
                    { role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() }
                  ]

                  await supabase
                    .from('coaching_sessions')
                    .update({
                      conversation_history: updatedHistory,
                      context_snapshot: userContext,
                      last_activity: new Date().toISOString()
                    })
                    .eq('session_id', session_id)

                  // Log completo
                  try {
                    await supabase
                      .from('voice_coaching_sessions')
                      .insert({
                        user_id,
                        user_message: transcribedMessage,
                        coaching_response: fullResponse,
                        context_snapshot: userContext,
                        created_at: new Date().toISOString()
                      })
                  } catch (logError) {
                    console.error('Failed to log conversation:', logError)
                  }

                  controller.close()
                  return
                }

                try {
                  const json = JSON.parse(data)
                  const delta = json.choices?.[0]?.delta?.content
                  if (delta) {
                    fullResponse += delta
                    // Invia delta al client via SSE
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ delta })}\n\n`))
                  }
                } catch (parseError) {
                  // Ignora errori di parsing
                }
              }
            }
          }
        } catch (error) {
          controller.error(error)
        }
      }
    })

    // ✅ Return SSE stream
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

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
    } else if (error.message.includes('is not defined')) {
      errorMessage = `Function not defined: ${error.message}. This is a code structure issue.`
      errorCode = 'FUNCTION_NOT_DEFINED'
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
