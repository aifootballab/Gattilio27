'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Volume2, VolumeX, Loader, Sparkles, Square, Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRosa } from '@/contexts/RosaContext'
import gptRealtimeService from '@/services/gptRealtimeService'
import './VoiceCoachingPanel.css'

/**
 * Componente Voice Coaching - Implementazione Pulita
 * Connessione diretta a GPT Realtime API via WebSocket
 */
export default function VoiceCoachingPanel() {
  const [isRecording, setIsRecording] = useState(false)
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [streamingResponse, setStreamingResponse] = useState('')
  const [currentFunctionCall, setCurrentFunctionCall] = useState(null)
  const [canInterrupt, setCanInterrupt] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const messagesEndRef = useRef(null)
  const streamingMessageRef = useRef(null)
  const imageInputRef = useRef(null)
  const audioContextRef = useRef(null)
  const currentAudioRef = useRef(null)
  const { rosa } = useRosa()
  const sessionInitialized = useRef(false)

  // Scroll to bottom quando arrivano nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Inizializza connessione GPT Realtime
  useEffect(() => {
    const initConnection = async () => {
      if (sessionInitialized.current) return

      try {
        // Verifica autenticazione
        let { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!session || sessionError) {
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
          
          if (authError || !authData.session) {
            throw new Error(`Errore autenticazione: ${authError?.message || 'Impossibile creare sessione anonima'}`)
          }
          
          session = authData.session
        }

        const userId = session.user.id
        const context = {
          rosa: rosa,
          user_profile: {
            coaching_level: 'intermedio'
          }
        }

        // Setup callbacks
        gptRealtimeService.setOnTextDelta((delta) => {
          if (delta === null) {
            // Streaming completato
            if (streamingMessageRef.current) {
              streamingMessageRef.current.isStreaming = false
              streamingMessageRef.current = null
            }
            setStreamingResponse('')
            setIsProcessing(false)
            setCanInterrupt(false)
          } else {
            // Nuova parola in streaming
            setStreamingResponse(prev => {
              const newText = prev + delta
              if (streamingMessageRef.current) {
                streamingMessageRef.current.content = newText
                setMessages(prev => prev.map(msg => 
                  msg === streamingMessageRef.current 
                    ? { ...msg, content: newText }
                    : msg
                ))
              } else {
                const streamingMsg = {
                  role: 'coach',
                  content: newText,
                  timestamp: new Date(),
                  isStreaming: true
                }
                streamingMessageRef.current = streamingMsg
                setMessages(prev => [...prev, streamingMsg])
              }
              setCanInterrupt(true)
              setIsProcessing(true)
              return newText
            })
          }
        })

        gptRealtimeService.setOnFunctionCall((call) => {
          setCurrentFunctionCall({
            name: call.name,
            status: 'executing'
          })
          const functionMsg = {
            role: 'system',
            content: `🔧 Eseguendo: ${call.name}...`,
            timestamp: new Date(),
            isFunctionCall: true
          }
          setMessages(prev => [...prev, functionMsg])
          
          setTimeout(() => {
            setCurrentFunctionCall(prev => {
              if (prev && prev.name === call.name) {
                return { ...prev, status: 'completed' }
              }
              return prev
            })
            setMessages(prev => prev.map(msg => 
              msg.isFunctionCall && msg.content.includes(call.name)
                ? { ...msg, content: `✅ Completato: ${call.name}` }
                : msg
            ))
            setTimeout(() => {
              setCurrentFunctionCall(null)
            }, 3000)
          }, 2000)
        })

        gptRealtimeService.setOnTranscription((transcribedText) => {
          setMessages(prev => {
            const updated = [...prev]
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === 'user' && updated[i].isAudio) {
                updated[i] = {
                  ...updated[i],
                  content: transcribedText,
                  transcribed: true
                }
                break
              }
            }
            return updated
          })
        })

        gptRealtimeService.setOnAudioDelta((audioChunk) => {
          if (audioEnabled) {
            playAudioChunk(audioChunk)
          }
        })

        gptRealtimeService.setOnAudioDone((audioBase64) => {
          if (audioEnabled) {
            playCompleteAudio(audioBase64)
          }
        })

        gptRealtimeService.setOnError((error) => {
          const errorMsg = {
            role: 'error',
            content: `Errore: ${error.message}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
          setIsProcessing(false)
          setCanInterrupt(false)
        })

        // Connetti a GPT Realtime API
        await gptRealtimeService.connect(userId, context)
        setIsConnected(true)
        sessionInitialized.current = true

      } catch (error) {
        console.error('Error initializing connection:', error)
        const errorMsg = {
          role: 'error',
          content: `Errore inizializzazione: ${error.message}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMsg])
      }
    }

    initConnection()

    // Cleanup
    return () => {
      if (sessionInitialized.current) {
        gptRealtimeService.disconnect()
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [rosa, audioEnabled])

  // Inizia registrazione audio
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
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
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

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
    }
  }

  // Invia messaggio testuale
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isProcessing) return

    const userMessage = currentMessage.trim()
    setCurrentMessage('')
    await sendTextMessage(userMessage)
  }

  // Gestisce selezione immagine
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Immagine troppo grande. Massimo 10MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
      setSelectedImage(file)
    }
    reader.readAsDataURL(file)
  }

  // Rimuovi immagine selezionata
  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  // Upload immagine a Supabase Storage
  const uploadImageToStorage = async (imageFile) => {
    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `chat-images/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('player-screenshots')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('player-screenshots')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  // Invia messaggio testuale
  const sendTextMessage = async (text) => {
    if (!isConnected) {
      alert('Non connesso a GPT Realtime API. Attendi...')
      return
    }

    setIsProcessing(true)
    setStreamingResponse('')
    setCanInterrupt(false)
    streamingMessageRef.current = null

    // Upload immagine se presente
    let imageUrl = null
    if (selectedImage) {
      try {
        imageUrl = await uploadImageToStorage(selectedImage)
      } catch (error) {
        console.error('Error uploading image:', error)
        const errorMsg = {
          role: 'error',
          content: `Errore caricamento immagine: ${error.message}`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMsg])
        setIsProcessing(false)
        return
      }
    }

    // Aggiungi messaggio utente alla chat
    const userMsg = {
      role: 'user',
      content: text || (imageUrl ? '📷 [Immagine]' : ''),
      timestamp: new Date(),
      isAudio: false,
      imageUrl: imageUrl || null
    }
    setMessages(prev => [...prev, userMsg])

    // Rimuovi immagine dopo invio
    handleRemoveImage()

    try {
      if (imageUrl) {
        gptRealtimeService.sendImageMessage(text, imageUrl)
      } else {
        gptRealtimeService.sendTextMessage(text)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg = {
        role: 'error',
        content: `Errore: ${error.message}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
      setIsProcessing(false)
      setCanInterrupt(false)
    }
  }

  // Invia messaggio audio
  const sendAudioMessage = async (audioBlob) => {
    if (!isConnected) {
      alert('Non connesso a GPT Realtime API. Attendi...')
      return
    }

    setIsProcessing(true)
    setStreamingResponse('')
    setCanInterrupt(false)
    streamingMessageRef.current = null

    try {
      // Converti audio a base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]

        try {
          // Aggiungi messaggio utente placeholder
          const audioMsg = {
            role: 'user',
            content: '🎤 Registrando...',
            timestamp: new Date(),
            isAudio: true,
            transcribed: false
          }
          setMessages(prev => [...prev, audioMsg])

          // Invia audio via GPT Realtime API
          gptRealtimeService.sendAudioMessage(base64Audio)
        } catch (error) {
          console.error('Error sending audio:', error)
          const errorMsg = {
            role: 'error',
            content: `Errore: ${error.message}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
          setIsProcessing(false)
          setCanInterrupt(false)
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
      setCanInterrupt(false)
    }
  }

  // Riproduci chunk audio
  const playAudioChunk = async (audioChunkBase64) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }

      const audioData = Uint8Array.from(atob(audioChunkBase64), c => c.charCodeAt(0))
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer)
      
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start(0)
      
      setIsPlayingAudio(true)
      
      source.onended = () => {
        setIsPlayingAudio(false)
      }
    } catch (error) {
      console.error('Error playing audio chunk:', error)
      setIsPlayingAudio(false)
    }
  }

  // Riproduci audio completo
  const playCompleteAudio = async (audioBase64) => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }

      const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio
      
      setIsPlayingAudio(true)
      
      audio.onended = () => {
        setIsPlayingAudio(false)
        URL.revokeObjectURL(audioUrl)
        currentAudioRef.current = null
      }
      
      audio.onerror = (error) => {
        console.error('Error playing audio:', error)
        setIsPlayingAudio(false)
        URL.revokeObjectURL(audioUrl)
        currentAudioRef.current = null
      }
      
      await audio.play()
    } catch (error) {
      console.error('Error playing complete audio:', error)
      setIsPlayingAudio(false)
    }
  }

  // Toggle audio output
  const handleToggleAudio = () => {
    setAudioEnabled(prev => !prev)
    if (!audioEnabled && currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
      setIsPlayingAudio(false)
    }
  }

  // Interrompi risposta corrente
  const handleInterrupt = () => {
    if (canInterrupt && isConnected) {
      gptRealtimeService.interrupt()
      setCanInterrupt(false)
      setIsProcessing(false)
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
        setIsPlayingAudio(false)
      }
      
      if (streamingMessageRef.current) {
        streamingMessageRef.current.isStreaming = false
        streamingMessageRef.current = null
      }
      setStreamingResponse('')
    }
  }

  // Formatta contenuto messaggio
  const formatMessageContent = (content) => {
    if (!content) return null
    return <div className="message-content-formatted">{content}</div>
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
          <div className={`status-indicator ${isConnected ? 'active' : 'inactive'}`}></div>
          <span className="status-text">{isConnected ? 'Online' : 'Connessione...'}</span>
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
                {msg.imageUrl && (
                  <div className="message-image-container">
                    <img 
                      src={msg.imageUrl} 
                      alt="Immagine inviata" 
                      className="message-image"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  </div>
                )}
                {msg.content && (
                  <div className="message-content-formatted">
                    {formatMessageContent(msg.content)}
                  </div>
                )}
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

        {/* Function Call Notification */}
        {currentFunctionCall && (
          <div className="message system">
            <div className="message-content">
              <div className="message-avatar system">🔧</div>
              <div className="message-text">
                <div className="function-call-indicator">
                  <Loader size={16} className="spinner" />
                  <span>Eseguendo: {currentFunctionCall.name}...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Streaming Response */}
        {isProcessing && streamingResponse && (
          <div className="message coach streaming">
            <div className="message-content">
              <div className="message-avatar coach">
                <div className="avatar-pulse">🧠</div>
              </div>
              <div className="message-text">
                <div className="message-content-formatted">
                  {formatMessageContent(streamingResponse)}
                </div>
                <span className="streaming-indicator">●</span>
              </div>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {isProcessing && !streamingResponse && (
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
          {/* Interrupt Button */}
          {canInterrupt && isProcessing && (
            <button
              onClick={handleInterrupt}
              className="interrupt-button"
              title="Interrompi risposta"
            >
              <Square size={18} />
            </button>
          )}

          {/* Audio Toggle Button */}
          <button
            onClick={handleToggleAudio}
            className={`audio-toggle-button ${!audioEnabled ? 'muted' : ''}`}
            title={audioEnabled ? 'Disabilita audio' : 'Abilita audio'}
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Image Upload Button */}
          <button
            onClick={() => imageInputRef.current?.click()}
            className="image-button"
            disabled={(isProcessing && !canInterrupt) || isRecording}
            title="Carica immagine"
          >
            <ImageIcon size={20} />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />

          {/* Microphone Button */}
          <button
            className={`mic-button ${isRecording ? 'recording' : ''}`}
            onMouseDown={handleStartRecording}
            onMouseUp={handleStopRecording}
            onTouchStart={handleStartRecording}
            onTouchEnd={handleStopRecording}
            disabled={isProcessing && !canInterrupt}
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
            disabled={(isProcessing && !canInterrupt) || isRecording}
            className="message-input"
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={(!currentMessage.trim() && !selectedImage) || (isProcessing && !canInterrupt) || isRecording}
            className="send-button"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="image-preview-container">
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" className="preview-image" />
              <button
                onClick={handleRemoveImage}
                className="remove-image-button"
                title="Rimuovi immagine"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="input-hint">
          {isRecording ? (
            <span className="recording-hint">🎤 Registrando... Rilascia per inviare</span>
          ) : selectedImage ? (
            <span className="image-hint">📷 Immagine selezionata. Scrivi un messaggio o invia solo l'immagine</span>
          ) : (
            <span>💡 Tieni premuto il microfono per parlare, carica un'immagine o scrivi qui sopra</span>
          )}
        </div>
      </div>
    </div>
  )
}
