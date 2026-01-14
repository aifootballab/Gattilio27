'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Volume2, Loader, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRosa } from '@/contexts/RosaContext'
import realtimeCoachingService from '@/services/realtimeCoachingService'
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
  const sessionInitialized = useRef(false)

  // Scroll to bottom quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Formatta contenuto messaggio con markdown e strutture
  const formatMessageContent = (content) => {
    if (!content) return null

    // Rileva sezione dati riconosciuti
    const recognizedMatch = content.match(/✅\s*DATI\s*RICONOSCIUTI[^❌]*/s)
    const uncertainMatch = content.match(/⚠️\s*DATI\s*INCERTI[^❌]*/s)
    const missingMatch = content.match(/❌\s*DATI\s*NON\s*RICONOSCIUTI[^💡]*/s)
    const suggestionsMatch = content.match(/💡\s*COSA\s*POSSIAMO\s*FARE:?[^]*/s)

    if (recognizedMatch || uncertainMatch || missingMatch || suggestionsMatch) {
      // Formato strutturato coach professionale
      return (
        <div className="coach-structured-message">
          {recognizedMatch && (
            <div className="coach-section recognized">
              <div className="section-header">✅ DATI RICONOSCIUTI</div>
              <div className="section-content">
                {formatList(recognizedMatch[0].replace(/✅\s*DATI\s*RICONOSCIUTI[:\s]*/i, ''))}
              </div>
            </div>
          )}
          {uncertainMatch && (
            <div className="coach-section uncertain">
              <div className="section-header">⚠️ DATI INCERTI</div>
              <div className="section-content">
                {formatList(uncertainMatch[0].replace(/⚠️\s*DATI\s*INCERTI[:\s]*/i, ''))}
              </div>
            </div>
          )}
          {missingMatch && (
            <div className="coach-section missing">
              <div className="section-header">❌ DATI NON RICONOSCIUTI</div>
              <div className="section-content">
                {formatList(missingMatch[0].replace(/❌\s*DATI\s*NON\s*RICONOSCIUTI[:\s]*/i, ''))}
              </div>
            </div>
          )}
          {suggestionsMatch && (
            <div className="coach-section suggestions">
              <div className="section-header">💡 COSA POSSIAMO FARE</div>
              <div className="section-content">
                {formatList(suggestionsMatch[0].replace(/💡\s*COSA\s*POSSIAMO\s*FARE[:\s]*/i, ''))}
              </div>
            </div>
          )}
          {formatRegularText(content, recognizedMatch, uncertainMatch, missingMatch, suggestionsMatch)}
        </div>
      )
    }

    // Formato normale con markdown base
    return formatRegularText(content)
  }

  const formatList = (text) => {
    const lines = text.split('\n').filter(line => line.trim())
    return (
      <ul className="coach-list">
        {lines.map((line, idx) => {
          // Rileva confidence percentage
          const confidenceMatch = line.match(/\((\d+)%\s*certo\)/i)
          const cleanLine = line.replace(/\s*\([\d%]+[^)]*\)/g, '').replace(/^[-•]\s*/, '').trim()
          
          return (
            <li key={idx} className="coach-list-item">
              <span className="list-item-text">{cleanLine}</span>
              {confidenceMatch && (
                <span className="confidence-badge" style={{
                  backgroundColor: getConfidenceColor(parseInt(confidenceMatch[1]))
                }}>
                  {confidenceMatch[1]}%
                </span>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  const getConfidenceColor = (percentage) => {
    if (percentage >= 90) return '#10b981' // Verde
    if (percentage >= 70) return '#f59e0b' // Arancione
    return '#ef4444' // Rosso
  }

  const formatRegularText = (text, ...exclusions) => {
    // Rimuovi sezioni già formattate
    let cleanText = text
    exclusions.forEach(excl => {
      if (excl) cleanText = cleanText.replace(excl[0], '')
    })
    
    // Formatta markdown base
    const parts = []
    let currentIndex = 0
    
    // Bold **text**
    const boldRegex = /\*\*(.+?)\*\*/g
    let match
    
    while ((match = boldRegex.exec(cleanText)) !== null) {
      if (match.index > currentIndex) {
        parts.push(cleanText.substring(currentIndex, match.index))
      }
      parts.push(<strong key={match.index}>{match[1]}</strong>)
      currentIndex = match.index + match[0].length
    }
    
    if (currentIndex < cleanText.length) {
      parts.push(cleanText.substring(currentIndex))
    }
    
    // Split per paragrafi
    const paragraphs = parts.length > 0 ? parts.join('').split('\n\n') : cleanText.split('\n\n')
    
    return (
      <div className="message-paragraphs">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="message-paragraph">
            {para.split('\n').map((line, lineIdx) => (
              <React.Fragment key={lineIdx}>
                {line}
                {lineIdx < para.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        ))}
      </div>
    )
  }

  // Inizializza sessione persistente quando il componente si monta
  useEffect(() => {
    const initSession = async () => {
      if (!sessionInitialized.current) {
        try {
          const userId = '00000000-0000-0000-0000-000000000001' // TODO: Get from auth
          const context = {
            rosa: rosa,
            user_profile: {
              coaching_level: 'intermedio'
            }
          }

          // Setup callbacks
          realtimeCoachingService.onMessage((message) => {
            setMessages(prev => [...prev, message])
            setIsProcessing(false)
          })

          realtimeCoachingService.onError((error) => {
            const errorMsg = {
              role: 'error',
              content: `Errore: ${error.message}`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsProcessing(false)
          })

          // Avvia sessione persistente
          await realtimeCoachingService.startSession(userId, context)
          sessionInitialized.current = true
        } catch (error) {
          console.error('Error initializing session:', error)
        }
      }
    }

    initSession()

    // Cleanup quando il componente si smonta
    return () => {
      if (sessionInitialized.current) {
        realtimeCoachingService.endSession()
      }
    }
  }, [rosa])

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

  // Invia messaggio testuale usando sessione persistente
  const sendTextMessage = async (text) => {
    if (!realtimeCoachingService.isSessionActive()) {
      // Se sessione non attiva, inizializza
      try {
        const userId = '00000000-0000-0000-0000-000000000001'
        await realtimeCoachingService.startSession(userId, { rosa, user_profile: { coaching_level: 'intermedio' } })
      } catch (error) {
        console.error('Error starting session:', error)
        return
      }
    }

    setIsProcessing(true)

    // Aggiungi messaggio utente alla chat
    const userMsg = {
      role: 'user',
      content: text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])

    try {
      // Usa servizio persistente invece di chiamata singola
      await realtimeCoachingService.sendMessage(text)
      // La risposta arriverà tramite callback onMessage
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg = {
        role: 'error',
        content: `Errore: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      setIsProcessing(false)
    }
  }

  // Invia messaggio audio usando sessione persistente
  const sendAudioMessage = async (audioBlob) => {
    if (!realtimeCoachingService.isSessionActive()) {
      // Se sessione non attiva, inizializza
      try {
        const userId = '00000000-0000-0000-0000-000000000001'
        await realtimeCoachingService.startSession(userId, { rosa, user_profile: { coaching_level: 'intermedio' } })
      } catch (error) {
        console.error('Error starting session:', error)
        return
      }
    }

    setIsProcessing(true)

    try {
      // Converti audio a base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]

        try {
          // Usa servizio persistente
          await realtimeCoachingService.sendMessage(null, base64Audio)
          // La risposta arriverà tramite callback onMessage
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

      reader.readAsDataURL(audioBlob)

    } catch (error) {
      console.error('Error processing audio:', error)
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
        <div className="header-content">
          <div className="header-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h3>🧠 Coach Personale AI</h3>
            <p className="coaching-subtitle">
              Analisi intelligente • Consigli personalizzati • Supporto completo
            </p>
          </div>
        </div>
        <div className="header-status">
          <div className="status-indicator active"></div>
          <span className="status-text">Online</span>
        </div>
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
                <div className="message-content-formatted">
                  {formatMessageContent(msg.content)}
                </div>
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
              <div className="message-avatar coach">
                <div className="avatar-pulse">🧠</div>
              </div>
              <div className="message-text">
                <div className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
                <span className="typing-text">Sto analizzando...</span>
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