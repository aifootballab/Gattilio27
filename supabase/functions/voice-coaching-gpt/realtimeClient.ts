// @ts-nocheck
// GPT Realtime API Client per Deno Edge Functions
// Implementa WebSocket connection per streaming word-by-word, interrupt, function calling

interface RealtimeConfig {
  apiKey: string
  model?: string
}

interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

interface FunctionCall {
  id: string
  name: string
  arguments: string
}

/**
 * Client per GPT Realtime API via WebSocket
 * Supporta: streaming, interrupt, function calling, multimodale
 */
export class RealtimeClient {
  private ws: WebSocket | null = null
  private apiKey: string
  private model: string
  private sessionId: string | null = null
  private functions: Map<string, FunctionDefinition> = new Map()
  private functionHandlers: Map<string, Function> = new Map()
  private onTextDelta: ((delta: string) => void) | null = null
  private onFunctionCall: ((call: FunctionCall) => Promise<any>) | null = null
  private onError: ((error: Error) => void) | null = null

  constructor(config: RealtimeConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'gpt-4o-realtime-preview-2024-12-17'
  }

  /**
   * Connetti a GPT Realtime API via WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // OpenAI Realtime API WebSocket endpoint
        const wsUrl = `wss://api.openai.com/v1/realtime?model=${this.model}&api_key=${this.apiKey}`
        
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('✅ Connected to GPT Realtime API')
          resolve()
        }

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          reject(new Error('Failed to connect to GPT Realtime API'))
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data))
        }

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from GPT Realtime API')
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Gestisce messaggi dal WebSocket
   */
  private handleMessage(message: any) {
    const { type, event } = message

    switch (type) {
      case 'session.created':
        this.sessionId = message.session.id
        console.log('📝 Session created:', this.sessionId)
        break

      case 'response.text.delta':
        // Streaming word-by-word
        if (this.onTextDelta && event?.delta) {
          this.onTextDelta(event.delta)
        }
        break

      case 'response.text.done':
        // Risposta completa
        console.log('✅ Response complete')
        break

      case 'response.function_call':
        // Function call richiesta da GPT
        this.handleFunctionCall(event)
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
  private async handleFunctionCall(call: FunctionCall) {
    try {
      const args = JSON.parse(call.arguments)
      const handler = this.functionHandlers.get(call.name)

      if (!handler) {
        throw new Error(`Function ${call.name} not found`)
      }

      // Esegui funzione
      const result = await handler(args)

      // Invia risultato a GPT
      this.submitToolOutputs([{
        tool_call_id: call.id,
        output: JSON.stringify(result)
      }])
    } catch (error) {
      console.error('Error handling function call:', error)
      // Invia errore a GPT
      this.submitToolOutputs([{
        tool_call_id: call.id,
        is_error: true,
        output: JSON.stringify({ error: error.message })
      }])
    }
  }

  /**
   * Invia messaggio a GPT
   */
  sendMessage(input: Array<{ type: string; text?: string; audio?: string; image?: string }>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: input.map(item => {
          if (item.type === 'text') {
            return { type: 'input_text', text: item.text }
          } else if (item.type === 'audio') {
            return { type: 'input_audio', audio: item.audio }
          } else if (item.type === 'image') {
            return { type: 'input_image', image_url: { url: item.image } }
          }
        })
      }
    }

    this.ws.send(JSON.stringify(message))
  }

  /**
   * Interrompe risposta corrente
   */
  interrupt() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.ws.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text'],
        instructions: 'Interrupt current response'
      }
    }))
  }

  /**
   * Aggiunge funzioni disponibili
   */
  addFunctions(functions: FunctionDefinition[], handlers: Map<string, Function>) {
    functions.forEach(func => {
      this.functions.set(func.name, func)
    })
    this.functionHandlers = handlers

    // Invia funzioni a GPT
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          tools: Array.from(this.functions.values()).map(f => ({
            type: 'function',
            name: f.name,
            description: f.description,
            parameters: f.parameters
          }))
        }
      }))
    }
  }

  /**
   * Invia risultati function call a GPT
   */
  submitToolOutputs(outputs: Array<{ tool_call_id: string; output: string; is_error?: boolean }>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.ws.send(JSON.stringify({
      type: 'response.function_call_outputs.submit',
      outputs: outputs.map(o => ({
        tool_call_id: o.tool_call_id,
        output: o.output,
        is_error: o.is_error || false
      }))
    }))
  }

  /**
   * Callback per streaming text
   */
  onTextDeltaCallback(callback: (delta: string) => void) {
    this.onTextDelta = callback
  }

  /**
   * Callback per errori
   */
  onErrorCallback(callback: (error: Error) => void) {
    this.onError = callback
  }

  /**
   * Chiudi connessione
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
