/**
 * Servizio per Chat Vocale Persistente con GPT-Realtime
 * Mantiene una sessione attiva e gestisce conversazioni continue
 */

import { supabase } from '@/lib/supabase'

class RealtimeCoachingService {
  constructor() {
    this.sessionId = null
    this.isActive = false
    this.conversationHistory = []
    this.keepAliveInterval = null
    this.onMessageCallback = null
    this.onErrorCallback = null
  }

  /**
   * Inizia una sessione persistente di coaching
   */
  async startSession(userId, context = {}) {
    if (this.isActive) {
      console.warn('Session already active')
      return this.sessionId
    }

    try {
      // ✅ Verifica sessione prima di chiamare Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('User not authenticated. Please log in.')
      }

      // Crea sessione nel backend
      const { data, error } = await supabase.functions.invoke('voice-coaching-gpt', {
        body: {
          action: 'start_session',
          user_id: userId,
          context: context || {}
        }
      })

      if (error) throw error

      this.sessionId = data.session_id
      this.isActive = true
      this.conversationHistory = []

      // Keep-alive per mantenere sessione attiva
      this.startKeepAlive()

      return this.sessionId
    } catch (error) {
      console.error('Error starting session:', error)
      throw error
    }
  }

  /**
   * Invia messaggio nella sessione attiva
   */
  async sendMessage(message, audioBase64 = null) {
    if (!this.isActive || !this.sessionId) {
      throw new Error('Session not active. Call startSession() first.')
    }

    try {
      // ✅ Verifica sessione prima di chiamare Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('User not authenticated. Please log in.')
      }

      const { data, error } = await supabase.functions.invoke('voice-coaching-gpt', {
        body: {
          action: 'send_message',
          session_id: this.sessionId,
          message: message,
          audio_base64: audioBase64,
          conversation_history: this.conversationHistory
        }
      })

      if (error) throw error

      // Aggiorna history
      this.conversationHistory.push({
        role: 'user',
        content: message || '[audio]',
        timestamp: new Date()
      })

      if (data.response) {
        this.conversationHistory.push({
          role: 'coach',
          content: data.response,
          timestamp: new Date()
        })

        // Callback per nuovo messaggio
        if (this.onMessageCallback) {
          this.onMessageCallback({
            role: 'coach',
            content: data.response,
            transcribed_message: data.transcribed_message
          })
        }
      }

      return data
    } catch (error) {
      console.error('Error sending message:', error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      throw error
    }
  }

  /**
   * Carica screenshot nella sessione
   */
  async uploadScreenshot(imageFile, imageType = 'player_profile') {
    if (!this.isActive || !this.sessionId) {
      throw new Error('Session not active. Call startSession() first.')
    }

    try {
      // Upload immagine a Supabase Storage
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${this.sessionId}_${Date.now()}.${fileExt}`
      const filePath = `screenshots/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(filePath, imageFile)

      if (uploadError) throw uploadError

      // Ottieni URL pubblico
      const { data: urlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(filePath)

      // ✅ Verifica sessione prima di chiamare Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('User not authenticated. Please log in.')
      }

      // Invia screenshot al coach
      const { data, error } = await supabase.functions.invoke('voice-coaching-gpt', {
        body: {
          action: 'analyze_screenshot',
          session_id: this.sessionId,
          image_url: urlData.publicUrl,
          image_type: imageType
        }
      })

      if (error) throw error

      // Aggiungi alla history
      this.conversationHistory.push({
        role: 'user',
        content: `[Screenshot: ${imageType}]`,
        image_url: urlData.publicUrl,
        timestamp: new Date()
      })

      if (data.response) {
        this.conversationHistory.push({
          role: 'coach',
          content: data.response,
          timestamp: new Date()
        })

        if (this.onMessageCallback) {
          this.onMessageCallback({
            role: 'coach',
            content: data.response,
            screenshot_analysis: data.analysis
          })
        }
      }

      return data
    } catch (error) {
      console.error('Error uploading screenshot:', error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
      throw error
    }
  }

  /**
   * Keep-alive per mantenere sessione attiva
   */
  startKeepAlive() {
    // Ping ogni 30 secondi per mantenere sessione attiva
    this.keepAliveInterval = setInterval(async () => {
      if (this.isActive && this.sessionId) {
        try {
          // ✅ Verifica sessione prima di chiamare Edge Function
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !session) {
            console.warn('Keep-alive: User not authenticated, stopping keep-alive')
            this.endSession()
            return
          }

          await supabase.functions.invoke('voice-coaching-gpt', {
            body: {
              action: 'keep_alive',
              session_id: this.sessionId
            }
          })
        } catch (error) {
          console.error('Keep-alive error:', error)
          // Se keep-alive fallisce con 401, la sessione è scaduta
          if (error.status === 401 || error.message?.includes('401')) {
            console.warn('Keep-alive: Authentication failed, ending session')
            this.endSession()
          }
        }
      }
    }, 30000) // 30 secondi
  }

  /**
   * Chiude la sessione
   */
  async endSession() {
    if (!this.isActive) return

    try {
      if (this.sessionId) {
        // ✅ Verifica sessione prima di chiamare Edge Function (se disponibile)
        const { data: { session } } = await supabase.auth.getSession()
        
        // Se c'è sessione, chiama Edge Function, altrimenti solo cleanup locale
        if (session) {
          await supabase.functions.invoke('voice-coaching-gpt', {
            body: {
              action: 'end_session',
              session_id: this.sessionId
            }
          })
        }
      }

      // Stop keep-alive
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval)
        this.keepAliveInterval = null
      }

      this.isActive = false
      this.sessionId = null
      this.conversationHistory = []
    } catch (error) {
      console.error('Error ending session:', error)
      // Forza cleanup anche se la chiamata fallisce
      this.isActive = false
      this.sessionId = null
    }
  }

  /**
   * Callback per nuovi messaggi
   */
  onMessage(callback) {
    this.onMessageCallback = callback
  }

  /**
   * Callback per errori
   */
  onError(callback) {
    this.onErrorCallback = callback
  }

  /**
   * Ottieni history conversazione
   */
  getHistory() {
    return [...this.conversationHistory]
  }

  /**
   * Verifica se sessione è attiva
   */
  isSessionActive() {
    return this.isActive && this.sessionId !== null
  }
}

// Singleton instance
const realtimeCoachingService = new RealtimeCoachingService()

export default realtimeCoachingService