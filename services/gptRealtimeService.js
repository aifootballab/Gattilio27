/**
 * Servizio GPT Realtime API - Implementazione Pulita
 * Connessione WebSocket diretta a OpenAI Realtime API
 */

import { supabase } from '@/lib/supabase'

// Configurazioni tool da mantenere
const toolsConfig = {
  tools: [
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
  ],
  system_prompt: 'Sei un coach professionista di eFootball. Il tuo obiettivo è aiutare il cliente a costruire e gestire la sua rosa, migliorare nel gioco, e vincere partite.\n\nREGOLE FONDAMENTALI:\n1. SOLO DATI VERIFICABILI - Estrai SOLO dati che vedi con certezza. Non inventare mai statistiche.\n2. CHIEDI SEMPRE CONFERMA - Mostra cosa hai riconosciuto, cosa manca, chiedi come procedere.\n3. SPIEGA SEMPRE - Perché un dato è importante, cosa fare quando manca, come procedere.\n4. ORIENTATO AI DATI - Usa rosa attuale per consigli, basati su statistiche reali.\n5. COMPANION E GESTORE - Sii un compagno che guida, aiuta a costruire rosa completa (11+10).\n\nCOMPORTAMENTO: Analitico, prudente, contestualizzato, guidato. Non creativo, non supponente, non generico, non autonomo.',
  session_config: {
    modalities: ['text', 'audio'],
    input_audio_transcription: {
      model: 'whisper-1'
    },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    },
    voice: 'alloy',
    temperature: 0.7,
    max_response_output_tokens: 4096
  }
}

class GPTRealtimeService {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.sessionId = null
    
    // Callbacks
    this.onTextDelta = null
    this.onAudioDelta = null
    this.onAudioDone = null
    this.onTranscription = null
    this.onFunctionCall = null
    this.onError = null
  }

  /**
   * Connetti a GPT Realtime API
   */
  async connect(userId, context = {}) {
    return new Promise((resolve, reject) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        reject(new Error('NEXT_PUBLIC_SUPABASE_URL not configured'))
        return
      }

      // URL WebSocket verso Supabase Edge Function proxy (server-side aggiunge Authorization verso OpenAI)
      const wsUrl = supabaseUrl.replace('https://', 'wss://') + '/functions/v1/realtime-proxy'
      
      console.log('🔌 Connecting to GPT Realtime API...')
      
      try {
        // Connessione al proxy Supabase (no auth lato client, verify_jwt=false)
        this.ws = new WebSocket(wsUrl)
      } catch (error) {
        reject(new Error(`Failed to create WebSocket: ${error.message}`))
        return
      }

      this.ws.onopen = () => {
        console.log('✅ Connected to GPT Realtime API')
        this.isConnected = true
        this.setupSession(context)
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        this.isConnected = false
        if (this.onError) {
          this.onError(new Error('WebSocket connection error'))
        }
        reject(error)
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message, userId)
        } catch (error) {
          console.error('❌ Error parsing message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('🔌 Disconnected from GPT Realtime API', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        })
        this.isConnected = false
        
        if (!event.wasClean && event.code !== 1000) {
          if (this.onError) {
            this.onError(new Error(`Connection closed unexpectedly: ${event.reason || event.code}`))
          }
        }
      }
    })
  }

  /**
   * Configura sessione con tools e prompt
   */
  setupSession(context) {
    const systemPrompt = toolsConfig.system_prompt
    
    // Aggiungi contesto se disponibile
    let prompt = systemPrompt
    if (context.rosa) {
      prompt += `\n\nCONTESTO ROSA:\n- Giocatori: ${context.rosa.players?.length || 0}\n- Formazione: ${context.rosa.formation || 'N/A'}`
    }

    const sessionConfig = {
      type: 'session.update',
      session: {
        tools: toolsConfig.tools,
        instructions: prompt,
        ...toolsConfig.session_config
      }
    }

    console.log('📤 Sending session configuration...')
    this.ws.send(JSON.stringify(sessionConfig))
  }

  /**
   * Gestisce messaggi dal WebSocket
   */
  handleMessage(message, userId) {
    if (!message || !message.type) {
      return
    }

    switch (message.type) {
      case 'session.created':
        if (message.session?.id) {
          this.sessionId = message.session.id
          console.log('📝 Session created:', this.sessionId)
        }
        break

      case 'session.updated':
        console.log('✅ Session updated')
        break

      case 'error':
        const errorMsg = message.error?.message || 'Unknown error'
        console.error('❌ OpenAI error:', errorMsg)
        if (this.onError) {
          this.onError(new Error(`OpenAI API error: ${errorMsg}`))
        }
        break

      case 'response.text.delta':
        if (message.delta && this.onTextDelta) {
          this.onTextDelta(message.delta)
        }
        break

      case 'response.text.done':
        if (this.onTextDelta) {
          this.onTextDelta(null) // null = done
        }
        break

      case 'response.audio.delta':
        if (message.delta && this.onAudioDelta) {
          this.onAudioDelta(message.delta)
        }
        break

      case 'response.audio.done':
        if (message.audio && this.onAudioDone) {
          this.onAudioDone(message.audio)
        }
        break

      case 'input_audio_transcription.completed':
        if (message.transcript && this.onTranscription) {
          this.onTranscription(message.transcript)
        }
        break

      case 'response.function_call':
        if (message.function_call) {
          this.handleFunctionCall(message.function_call, userId)
        }
        break

      default:
        // Ignora messaggi non gestiti
        break
    }
  }

  /**
   * Gestisce function calls
   */
  async handleFunctionCall(call, userId) {
    try {
      if (!call.name || !call.arguments) {
        console.error('❌ Invalid function call:', call)
        return
      }

      let args
      try {
        args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments
      } catch (error) {
        console.error('❌ Error parsing function arguments:', error)
        args = {}
      }

      // Ottieni sessione Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        throw new Error('User not authenticated')
      }

      // Chiama Edge Function per eseguire funzione
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/execute-function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          function_name: call.name,
          arguments: args,
          user_id: userId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`)
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

      // Notifica frontend
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
   * Invia messaggio testuale
   */
  sendTextMessage(text) {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to GPT Realtime API')
    }

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    }))

    // Inizia risposta
    this.ws.send(JSON.stringify({
      type: 'response.create'
    }))
  }

  /**
   * Invia messaggio audio
   */
  sendAudioMessage(audioBase64) {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to GPT Realtime API')
    }

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_audio',
            audio: audioBase64
          }
        ]
      }
    }))

    // Inizia risposta
    this.ws.send(JSON.stringify({
      type: 'response.create'
    }))
  }

  /**
   * Invia messaggio con immagine
   */
  sendImageMessage(text, imageUrl) {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to GPT Realtime API')
    }

    this.ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text || 'Analizza questa immagine'
          },
          {
            type: 'input_image',
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    }))

    // Inizia risposta
    this.ws.send(JSON.stringify({
      type: 'response.create'
    }))
  }

  /**
   * Interrompi risposta corrente
   */
  interrupt() {
    if (!this.isConnected || !this.ws) {
      return
    }

    this.ws.send(JSON.stringify({
      type: 'response.cancel'
    }))
  }

  /**
   * Disconnetti
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.sessionId = null
  }

  // Callbacks setters
  setOnTextDelta(callback) {
    this.onTextDelta = callback
  }

  setOnAudioDelta(callback) {
    this.onAudioDelta = callback
  }

  setOnAudioDone(callback) {
    this.onAudioDone = callback
  }

  setOnTranscription(callback) {
    this.onTranscription = callback
  }

  setOnFunctionCall(callback) {
    this.onFunctionCall = callback
  }

  setOnError(callback) {
    this.onError = callback
  }
}

// Singleton
const gptRealtimeService = new GPTRealtimeService()

export default gptRealtimeService
