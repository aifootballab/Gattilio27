/**
 * Servizio GPT Realtime API - Versione 2.0
 * Connessione WebSocket diretta a OpenAI Realtime API
 * Supporta: streaming, interrupt, function calling, multimodale
 */

import { supabase } from '@/lib/supabase'

class RealtimeCoachingServiceV2 {
  constructor() {
    this.ws = null
    this.sessionId = null
    this.isActive = false
    this.onTextDelta = null
    this.onFunctionCall = null
    this.onError = null
    this.onAudioTranscription = null // Callback per trascrizione audio utente
    this.onAudioDelta = null // Callback per chunk audio output (TTS)
    this.onAudioDone = null // Callback per audio output completo
    this.currentResponse = ''
    this.audioQueue = [] // Coda per chunk audio in streaming
  }

  /**
   * Inizia sessione Realtime
   */
  async startSession(userId, context = {}, providedSession = null) {
    try {
      // ✅ Usa sessione fornita o ottieni dalla cache Supabase
      let session = providedSession
      
      if (!session) {
        // Se non fornita, prova a ottenerla dalla cache
        const { data: { session: cachedSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !cachedSession) {
          throw new Error('User not authenticated. Please log in.')
        }
        
        session = cachedSession
      }
      
      // ✅ Verifica che la sessione abbia access_token
      if (!session || !session.access_token) {
        throw new Error('Invalid session: missing access_token')
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL or Anon Key not configured')
      }
      
      // ✅ Debug: Verifica token
      console.log('🔑 Using JWT token for Edge Function:', {
        userId: session.user.id,
        isAnonymous: session.user.is_anonymous,
        tokenLength: session.access_token?.length,
        tokenPrefix: session.access_token?.substring(0, 20) + '...'
      })
      
      // ✅ Usa JWT token dell'utente autenticato invece di anon key
      const response = await fetch(`${supabaseUrl}/functions/v1/voice-coaching-gpt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // ✅ JWT token utente
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          action: 'start_session',
          user_id: userId,
          context: context
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText, status: response.status }
        }
        
        // ✅ Log dettagliato per debug 401
        if (response.status === 401) {
          console.error('🔴 401 Unauthorized - Dettagli:', {
            status: response.status,
            error: errorData,
            tokenLength: session.access_token?.length,
            tokenPrefix: session.access_token?.substring(0, 20) + '...',
            userId: session.user.id,
            isAnonymous: session.user.is_anonymous,
            headers: {
              hasAuth: !!session.access_token,
              hasApikey: !!supabaseAnonKey
            }
          })
        }
        
        throw new Error(errorData.error || errorData.message || `Edge Function returned ${response.status}`)
      }

      const sessionData = await response.json()

      if (!sessionData.session_id) {
        throw new Error('Session ID not returned from Edge Function')
      }

      this.sessionId = sessionData.session_id

      // Connetti a OpenAI Realtime API
      await this.connectToRealtimeAPI(userId, context)

      this.isActive = true
      return this.sessionId
    } catch (error) {
      console.error('Error starting session:', error)
      throw error
    }
  }

  /**
   * Connetti a OpenAI Realtime API via WebSocket
   */
  async connectToRealtimeAPI(userId, context) {
    return new Promise((resolve, reject) => {
      // Ottieni API key da variabile d'ambiente Vercel
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
      
      if (!apiKey) {
        reject(new Error('NEXT_PUBLIC_OPENAI_API_KEY not configured. Verifica variabili d\'ambiente in Vercel.'))
        return
      }

      // OpenAI Realtime API WebSocket endpoint
      // NOTA: Per sicurezza, considera di usare un proxy Edge Function invece di esporre API key nel client
      // Usa gpt-realtime (nuovo modello stabile) invece di gpt-4o-realtime-preview
      const model = 'gpt-realtime'
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}&api_key=${apiKey}`
      
      console.log('🔌 Connecting to OpenAI Realtime API...')
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('✅ Connected to GPT Realtime API')
        
        // Configura sessione con funzioni
        this.setupSession(context)
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        reject(new Error('Failed to connect to GPT Realtime API'))
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data), userId)
      }

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from GPT Realtime API')
        this.isActive = false
      }
    })
  }

  /**
   * Configura sessione con funzioni disponibili
   */
  setupSession(context) {
    const functions = [
      {
        type: 'function',
        name: 'save_player_to_supabase',
        description: 'Salva un giocatore nel database Supabase',
        parameters: {
          type: 'object',
          properties: {
            player_data: { type: 'object' },
            rosa_id: { type: 'string' }
          },
          required: ['player_data']
        }
      },
      {
        type: 'function',
        name: 'load_rosa',
        description: 'Carica la rosa dell\'utente da Supabase',
        parameters: {
          type: 'object',
          properties: {
            rosa_id: { type: 'string' }
          }
        }
      },
      {
        type: 'function',
        name: 'search_player',
        description: 'Cerca un giocatore nel database',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        type: 'function',
        name: 'update_rosa',
        description: 'Aggiorna la rosa con nuovi giocatori',
        parameters: {
          type: 'object',
          properties: {
            rosa_id: { type: 'string' },
            player_build_ids: { type: 'array' }
          },
          required: ['rosa_id', 'player_build_ids']
        }
      },
      {
        type: 'function',
        name: 'analyze_screenshot',
        description: 'Analizza uno screenshot di eFootball',
        parameters: {
          type: 'object',
          properties: {
            image_url: { type: 'string' },
            image_type: { type: 'string' }
          },
          required: ['image_url', 'image_type']
        }
      }
    ]

    // Invia configurazione sessione con audio bidirezionale abilitato
    this.ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        tools: functions,
        instructions: this.buildSystemPrompt(context),
        // ✅ Abilita audio bidirezionale
        modalities: ['text', 'audio'],
        // ✅ Configurazione audio input (trascrizione)
        input_audio_transcription: {
          model: 'whisper-1'
        },
        // ✅ Voice Activity Detection (VAD) per rilevare quando utente finisce di parlare
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        // ✅ Configurazione voce output (TTS)
        voice: 'alloy', // Opzioni: alloy, echo, fable, onyx, nova, shimmer
        temperature: 0.7,
        max_response_output_tokens: 4096
      }
    }))
  }

  /**
   * Gestisce messaggi dal WebSocket
   */
  handleMessage(message, userId) {
    const { type, event } = message

    switch (type) {
      case 'session.created':
        this.sessionId = event.session.id
        console.log('📝 Session created:', this.sessionId)
        break

      case 'response.text.delta':
        // Streaming word-by-word
        if (event?.delta && this.onTextDelta) {
          this.currentResponse += event.delta
          this.onTextDelta(event.delta)
        }
        break

      case 'response.text.done':
        // Risposta completa - finalizza streaming
        console.log('✅ Response complete')
        if (this.onTextDelta) {
          // Notifica che streaming è completo
          this.onTextDelta(null) // null = done
        }
        this.currentResponse = ''
        break

      case 'response.function_call':
        // Function call richiesta da GPT
        this.handleFunctionCall(event, userId)
        break

      case 'input_audio_transcription.completed':
        // Trascrizione audio utente completata
        if (event?.text && this.onAudioTranscription) {
          console.log('🎤 Audio transcribed:', event.text)
          this.onAudioTranscription(event.text)
        }
        break

      case 'input_audio_transcription.failed':
        // Errore trascrizione audio
        console.error('❌ Audio transcription failed:', event.error)
        if (this.onError) {
          this.onError(new Error(`Audio transcription failed: ${event.error || 'Unknown error'}`))
        }
        break

      case 'response.audio_transcript.done':
        // Trascrizione risposta audio completata (opzionale)
        if (event?.text) {
          console.log('🎤 Response audio transcribed:', event.text)
        }
        break

      case 'response.audio.delta':
        // ✅ Chunk audio in streaming (TTS)
        if (event?.delta && this.onAudioDelta) {
          // Delta è base64 audio chunk
          this.audioQueue.push(event.delta)
          this.onAudioDelta(event.delta)
        }
        break

      case 'response.audio.done':
        // ✅ Audio completo ricevuto (TTS)
        if (event?.audio && this.onAudioDone) {
          // Audio completo in base64
          console.log('🔊 Audio output complete')
          this.onAudioDone(event.audio)
          this.audioQueue = [] // Reset queue
        }
        break

      case 'error':
        if (this.onError) {
          this.onError(new Error(event.message || 'Unknown error'))
        }
        break
    }
  }

  /**
   * Gestisce function calls da GPT
   */
  async handleFunctionCall(call, userId) {
    try {
      const args = JSON.parse(call.arguments)
      
      // ✅ Fix: Ottieni JWT token dalla sessione Supabase invece di usare anon key
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('User not authenticated. Please log in.')
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL or Anon Key not configured')
      }
      
      // ✅ Usa JWT token dell'utente autenticato invece di anon key
      const response = await fetch(`${supabaseUrl}/functions/v1/voice-coaching-gpt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // ✅ JWT token utente
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          action: 'execute_function',
          function_name: call.name,
          arguments: args,
          user_id: userId,
          session_id: this.sessionId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText, status: response.status }
        }
        throw new Error(errorData.error || `Edge Function returned ${response.status}`)
      }

      const data = await response.json()

      // Invia risultato a GPT
      this.ws.send(JSON.stringify({
        type: 'response.function_call_outputs.submit',
        outputs: [{
          tool_call_id: call.id,
          output: JSON.stringify(data.result)
        }]
      }))

      // Callback per notificare frontend
      if (this.onFunctionCall) {
        this.onFunctionCall({
          name: call.name,
          arguments: args,
          result: data.result
        })
      }
    } catch (error) {
      console.error('Error handling function call:', error)
      // Invia errore a GPT
      this.ws.send(JSON.stringify({
        type: 'response.function_call_outputs.submit',
        outputs: [{
          tool_call_id: call.id,
          is_error: true,
          output: JSON.stringify({ error: error.message })
        }]
      }))
    }
  }

  /**
   * Invia messaggio a GPT
   */
  sendMessage(input) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const inputArray = []
    
    if (input.text) {
      inputArray.push({ type: 'input_text', text: input.text })
    }
    if (input.audio) {
      inputArray.push({ type: 'input_audio', audio: input.audio })
    }
    if (input.image) {
      inputArray.push({ type: 'input_image', image_url: { url: input.image } })
    }

    // Crea messaggio utente
    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: inputArray
      }
    }))

    // Crea risposta (avvia streaming) con audio bidirezionale
    this.ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'] // ✅ Testo + Audio (TTS)
      }
    }))
  }

  /**
   * Interrompe risposta corrente
   */
  interrupt() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Interrompi risposta corrente
    this.ws.send(JSON.stringify({
      type: 'response.cancel'
    }))
    
    console.log('🛑 Response interrupted')
  }

  /**
   * Build system prompt
   */
  buildSystemPrompt(context) {
    return `Sei un coach professionista di eFootball. Il tuo obiettivo è aiutare il cliente a costruire e gestire la sua rosa, migliorare nel gioco, e vincere partite.

REGOLE FONDAMENTALI:
1. SOLO DATI VERIFICABILI - Estrai SOLO dati che vedi con certezza. Non inventare mai statistiche.
2. CHIEDI SEMPRE CONFERMA - Mostra cosa hai riconosciuto, cosa manca, chiedi come procedere.
3. SPIEGA SEMPRE - Perché un dato è importante, cosa fare quando manca, come procedere.
4. ORIENTATO AI DATI - Usa rosa attuale per consigli, basati su statistiche reali.
5. COMPANION E GESTORE - Sii un compagno che guida, aiuta a costruire rosa completa (11+10).

COMPORTAMENTO: Analitico, prudente, contestualizzato, guidato. Non creativo, non supponente, non generico, non autonomo.

Puoi usare le funzioni disponibili per:
- Salvare giocatori: save_player_to_supabase
- Caricare rosa: load_rosa
- Cercare giocatori: search_player
- Aggiornare rosa: update_rosa
- Analizzare screenshot: analyze_screenshot`
  }

  /**
   * Callbacks
   */
  onTextDeltaCallback(callback) {
    this.onTextDelta = callback
  }

  onFunctionCallCallback(callback) {
    this.onFunctionCall = callback
  }

  onErrorCallback(callback) {
    this.onError = callback
  }

  onAudioTranscriptionCallback(callback) {
    this.onAudioTranscription = callback
  }

  onAudioDeltaCallback(callback) {
    this.onAudioDelta = callback
  }

  onAudioDoneCallback(callback) {
    this.onAudioDone = callback
  }

  /**
   * Chiudi connessione
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isActive = false
  }
}

// Singleton
const realtimeCoachingServiceV2 = new RealtimeCoachingServiceV2()

export default realtimeCoachingServiceV2
