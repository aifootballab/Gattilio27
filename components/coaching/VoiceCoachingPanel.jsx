'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Volume2, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useRosa } from '../../contexts/RosaContext'
import './VoiceCoachingPanel.css'

/**
 * Componente Voice Coaching - Coach personale vocale
 * Conversazione bidirezionale con GPT-Realtime
 */
export default function VoiceCoachingPanel() {
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const messagesEndRef = useRef(null)
  const { rosa } = useRosa()

  // Scroll to bottom quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Inizia registrazione audio
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioMessage(audioBlob)
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsListening(true)

    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Errore accesso microfono. Verifica i permessi.')
    }
  }

  // Stop registrazione
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsListening(false)
    }
  }

  // Invia messaggio testuale
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isProcessing) return

    const userMessage = currentMessage.trim()
    setCurrentMessage('')
    await sendTextMessage(userMessage)
  }

  // Invia messaggio testuale
  const sendTextMessage = async (text) => {
    setIsProcessing(true)

    // Aggiungi messaggio utente alla chat
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const userId = '00000000-0000-0000-0000-000000000001' // TODO: Get from auth

      // Carica contesto
      const context = {
        rosa: rosa,
        user_profile: {
          coaching_level: 'intermedio' // TODO: Get from user profile
        }
      }

      const { data, error } = await supabase.functions.invoke('voice-coaching-gpt', {
        body: {
          user_id: userId,
          message: text,
          context: context,
          mode: 'text'
        }
      })

      if (error) throw error

      // Aggiungi risposta coach
      const coachMsg = {
        role: 'coach',
        content: data.response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, coachMsg])

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg = {
        role: 'error',
        content: `Errore: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsProcessing(false)
    }
  }

  // Invia messaggio audio
  const sendAudioMessage = async (audioBlob) => {
    setIsProcessing(true)

    try {
      // Converti audio a base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]

        const userId = '00000000-0000-0000-0000-000000000001' // TODO: Get from auth

        // Carica contesto
        const context = {
          rosa: rosa,
          user_profile: {
            coaching_level: 'intermedio' // TODO: Get from user profile
          }
        }

        const { data, error } = await supabase.functions.invoke('voice-coaching-gpt', {
          body: {
            user_id: userId,
            audio_base64: base64Audio,
            context: context,
            mode: 'voice'
          }
        })

        if (error) throw error

        // Aggiungi messaggio utente (trascritto) e risposta coach
        const userMsg = {
          role: 'user',
          content: data.transcribed_message,
          timestamp: new Date(),
          isAudio: true
        }

        const coachMsg = {
          role: 'coach',
          content: data.response,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg, coachMsg])
        setIsProcessing(false)
      }

      reader.readAsDataURL(audioBlob)

    } catch (error) {
      console.error('Error sending audio:', error)
      const errorMsg = {
        role: 'error',
        content: `Errore: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      setIsProcessing(false)
    }
  }

  return (
    <div className="voice-coaching-panel">
      <div className="coaching-header">
        <h3>🎤 Coach Personale</h3>
        <p className="coaching-subtitle">
          Chiedi qualsiasi cosa su eFootball. Sono qui per aiutarti!
        </p>
      </div>

      {/* Chat Messages */}
      <div className="coaching-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>👋 Ciao! Sono il tuo coach personale.</p>
            <p>Puoi chiedermi:</p>
            <ul>
              <li>Consigli tattici per la tua formazione</li>
              <li>Come sviluppare i tuoi giocatori</li>
              <li>Contromisure contro l'avversario</li>
              <li>Analisi delle tue statistiche</li>
              <li>Qualsiasi altra cosa su eFootball!</li>
            </ul>
            <p>Usa il microfono per parlare o scrivi qui sotto.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.role === 'user' && (
                <div className="message-avatar user">👤</div>
              )}
              {msg.role === 'coach' && (
                <div className="message-avatar coach">🤖</div>
              )}
              <div className="message-text">
                {msg.isAudio && <span className="audio-badge">🎤</span>}
                <p>{msg.content}</p>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('it-IT', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="message coach">
            <div className="message-content">
              <div className="message-avatar coach">🤖</div>
              <div className="message-text">
                <Loader className="spinner" size={16} />
                <span>Sto pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="coaching-input">
        <div className="input-controls">
          {/* Microphone Button */}
          <button
            className={`mic-button ${isRecording ? 'recording' : ''} ${isListening ? 'listening' : ''}`}
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onTouchStart={handleStartRecording}
            onTouchEnd={handleStopRecording}
            disabled={isProcessing}
            title={isRecording ? 'Rilascia per inviare' : 'Tieni premuto per parlare'}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Scrivi qui o usa il microfono..."
            disabled={isProcessing || isRecording}
            className="message-input"
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!currentMessage.trim() || isProcessing || isRecording}
            className="send-button"
          >
            <Send size={18} />
          </button>
        </div>

        <div className="input-hint">
          {isRecording ? (
            <span className="recording-hint">🎤 Registrando... Rilascia per inviare</span>
          ) : (
            <span>💡 Tieni premuto il microfono per parlare o scrivi qui sopra</span>
          )}
        </div>
      </div>
    </div>
  )
}