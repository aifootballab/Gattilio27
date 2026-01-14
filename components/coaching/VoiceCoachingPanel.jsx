'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Volume2, VolumeX, Loader, Sparkles, Square, Image as ImageIcon, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRosa } from '@/contexts/RosaContext'
import realtimeCoachingServiceV2 from '@/services/realtimeCoachingServiceV2'
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
  const [audioEnabled, setAudioEnabled] = useState(true) // Abilita/disabilita audio output
  const [streamingResponse, setStreamingResponse] = useState('')
  const [currentFunctionCall, setCurrentFunctionCall] = useState(null)
  const [canInterrupt, setCanInterrupt] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null) // Immagine selezionata per inviare
  const [imagePreview, setImagePreview] = useState(null) // Preview immagine
  const [isPlayingAudio, setIsPlayingAudio] = useState(false) // Stato riproduzione audio
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const messagesEndRef = useRef(null)
  const streamingMessageRef = useRef(null)
  const imageInputRef = useRef(null)
  const audioContextRef = useRef(null) // AudioContext per riproduzione
  const audioQueueRef = useRef([]) // Coda chunk audio
  const currentAudioRef = useRef(null) // Audio element corrente
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

  // Inizializza sessione Realtime API quando il componente si monta
  useEffect(() => {
    const initSession = async () => {
      if (!sessionInitialized.current) {
        try {
          // ✅ Verifica se utente è già autenticato, altrimenti fai login anonymous
          let { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (!session || sessionError) {
            // Se non c'è sessione, fai login anonymous
            const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
            
            if (authError || !authData.session) {
              throw new Error(`Errore autenticazione: ${authError?.message || 'Impossibile creare sessione anonima'}`)
            }
            
            session = authData.session
            console.log('✅ Login anonymous completato', {
              userId: session.user.id,
              isAnonymous: session.user.is_anonymous,
              hasToken: !!session.access_token
            })
            
            // ✅ Piccolo delay per assicurarsi che la sessione sia completamente pronta
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // ✅ Verifica che la sessione sia ancora valida dopo il delay
            const { data: { session: verifySession } } = await supabase.auth.getSession()
            if (verifySession && verifySession.access_token) {
              session = verifySession
            }
          }
          
          const userId = session.user.id
          const context = {
            rosa: rosa,
            user_profile: {
              coaching_level: 'intermedio'
            }
          }

          // Setup callback per streaming word-by-word
          realtimeCoachingServiceV2.onTextDeltaCallback((delta) => {
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
                // Aggiorna messaggio streaming in tempo reale
                if (streamingMessageRef.current) {
                  streamingMessageRef.current.content = newText
                  // Aggiorna messaggio nella lista
                  setMessages(prev => prev.map(msg => 
                    msg === streamingMessageRef.current 
                      ? { ...msg, content: newText }
                      : msg
                  ))
                } else {
                  // Crea nuovo messaggio streaming
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

          // Setup callback per function calls
          realtimeCoachingServiceV2.onFunctionCallCallback((call) => {
            setCurrentFunctionCall({
              name: call.name,
              status: 'executing'
            })
            // Mostra notifica in UI
            const functionMsg = {
              role: 'system',
              content: `🔧 Eseguendo: ${call.name}...`,
              timestamp: new Date(),
              isFunctionCall: true
            }
            setMessages(prev => [...prev, functionMsg])
            
            // Dopo 2 secondi, aggiorna con risultato
            setTimeout(() => {
              setCurrentFunctionCall(prev => {
                if (prev && prev.name === call.name) {
                  return { ...prev, status: 'completed' }
                }
                return prev
              })
              // Aggiorna messaggio con risultato
              setMessages(prev => prev.map(msg => 
                msg.isFunctionCall && msg.content.includes(call.name)
                  ? { ...msg, content: `✅ Completato: ${call.name}` }
                  : msg
              ))
              // Rimuovi dopo 3 secondi
              setTimeout(() => {
                setCurrentFunctionCall(null)
              }, 3000)
            }, 2000)
          })

          // Setup callback per trascrizione audio utente
          realtimeCoachingServiceV2.onAudioTranscriptionCallback((transcribedText) => {
            // Aggiorna ultimo messaggio utente con trascrizione
            setMessages(prev => {
              const updated = [...prev]
              // Trova ultimo messaggio utente (se esiste)
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

          // ✅ Setup callback per audio output (TTS) - chunk in streaming
          realtimeCoachingServiceV2.onAudioDeltaCallback((audioChunk) => {
            if (audioEnabled) {
              // Accumula chunk audio
              audioQueueRef.current.push(audioChunk)
              // Riproduci chunk immediatamente se non c'è audio in riproduzione
              if (!isPlayingAudio) {
                playAudioChunk(audioChunk)
              }
            }
          })

          // ✅ Setup callback per audio output completo (TTS)
          realtimeCoachingServiceV2.onAudioDoneCallback((audioBase64) => {
            if (audioEnabled) {
              // Riproduci audio completo
              playCompleteAudio(audioBase64)
            }
          })

          // Setup callback per errori
          realtimeCoachingServiceV2.onErrorCallback((error) => {
            const errorMsg = {
              role: 'error',
              content: `Errore: ${error.message}`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsProcessing(false)
            setCanInterrupt(false)
          })

          // ✅ Passa la sessione direttamente per evitare problemi di timing
          await realtimeCoachingServiceV2.startSession(userId, context, session)
          sessionInitialized.current = true
        } catch (error) {
          console.error('Error initializing session:', error)
          const errorMsg = {
            role: 'error',
            content: `Errore inizializzazione: ${error.message}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
        }
      }
    }

    initSession()

    // Cleanup quando il componente si smonta
    return () => {
      if (sessionInitialized.current) {
        realtimeCoachingServiceV2.disconnect()
      }
      // ✅ Cleanup audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [rosa])

  // Inizia registrazione audio
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // ✅ Prova formati compatibili con Whisper
      // Whisper supporta webm, ma potrebbe non accettare opus codec
      // Prova prima webm senza codec specifico, poi fallback a opus
      let mimeType = 'audio/webm'
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4'
      ]
      
      // Trova il primo formato supportato
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          console.log(`✅ Using audio format: ${mimeType}`)
          break
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
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

  // Gestisce selezione immagine
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verifica tipo file
    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine valido')
      return
    }

    // Verifica dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Immagine troppo grande. Massimo 10MB')
      return
    }

    // Crea preview
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

  // Upload immagine a Supabase Storage e ottieni URL
  const uploadImageToStorage = async (imageFile) => {
    try {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `chat-images/${fileName}`

      // Upload a Supabase Storage (usa player-screenshots con sottocartella chat-images)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('player-screenshots')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Ottieni URL pubblico
      const { data: urlData } = supabase.storage
        .from('player-screenshots')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  // Invia messaggio testuale usando Realtime API
  const sendTextMessage = async (text) => {
    if (!realtimeCoachingServiceV2.isActive) {
      // Se sessione non attiva, inizializza
      try {
        // ✅ Verifica se utente è già autenticato, altrimenti fai login anonymous
        let { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!session || sessionError) {
          // Se non c'è sessione, fai login anonymous
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
          
          if (authError || !authData.session) {
            throw new Error(`Errore autenticazione: ${authError?.message || 'Impossibile creare sessione anonima'}`)
          }
          
          session = authData.session
        }
        
        const userId = session.user.id
        // ✅ Passa la sessione direttamente per evitare problemi di timing
        await realtimeCoachingServiceV2.startSession(userId, { rosa, user_profile: { coaching_level: 'intermedio' } }, session)
      } catch (error) {
        console.error('Error starting session:', error)
        return
      }
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
      // Invia messaggio via Realtime API (streaming) con immagine se presente
      const messageInput = { text: text || undefined }
      if (imageUrl) {
        messageInput.image = imageUrl
      }
      realtimeCoachingServiceV2.sendMessage(messageInput)
      // La risposta arriverà tramite callback onTextDelta (streaming word-by-word)
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

  // Invia messaggio audio usando Realtime API
  const sendAudioMessage = async (audioBlob) => {
    if (!realtimeCoachingServiceV2.isActive) {
      // Se sessione non attiva, inizializza
      try {
        const userId = '00000000-0000-0000-0000-000000000001'
        await realtimeCoachingServiceV2.startSession(userId, { rosa, user_profile: { coaching_level: 'intermedio' } })
      } catch (error) {
        console.error('Error starting session:', error)
        return
      }
    }

    setIsProcessing(true)
    setStreamingResponse('')
    setCanInterrupt(false)
    streamingMessageRef.current = null

    try {
      // Upload immagine se presente
      let imageUrl = null
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToStorage(selectedImage)
        } catch (error) {
          console.error('Error uploading image:', error)
          // Continua anche se upload immagine fallisce
        }
      }

      // Converti audio a base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1]

        try {
          // Aggiungi messaggio utente placeholder (verrà aggiornato con trascrizione)
          const audioMsg = {
            role: 'user',
            content: '🎤 Registrando...',
            timestamp: new Date(),
            isAudio: true,
            transcribed: false,
            imageUrl: imageUrl || null
          }
          setMessages(prev => [...prev, audioMsg])

          // Rimuovi immagine dopo invio
          if (selectedImage) {
            handleRemoveImage()
          }

          // Invia audio via Realtime API (multimodale: audio + immagine se presente)
          const messageInput = { audio: base64Audio }
          if (imageUrl) {
            messageInput.image = imageUrl
          }
          realtimeCoachingServiceV2.sendMessage(messageInput)
          // La trascrizione arriverà tramite callback onAudioTranscription
          // La risposta arriverà tramite callback onTextDelta (streaming word-by-word)
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

  // ✅ Riproduci chunk audio (streaming)
  const playAudioChunk = async (audioChunkBase64) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }

      // Decodifica base64
      const audioData = Uint8Array.from(atob(audioChunkBase64), c => c.charCodeAt(0))
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer)
      
      // Crea source e riproduci
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

  // ✅ Riproduci audio completo
  const playCompleteAudio = async (audioBase64) => {
    try {
      // Ferma audio corrente se in riproduzione
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }

      // Decodifica base64
      const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
      const audioBlob = new Blob([audioData], { type: 'audio/opus' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Crea e riproduci audio
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

  // ✅ Toggle audio output
  const handleToggleAudio = () => {
    setAudioEnabled(prev => !prev)
    if (!audioEnabled && currentAudioRef.current) {
      // Se riabilitiamo audio, ferma riproduzione corrente
      currentAudioRef.current.pause()
      currentAudioRef.current = null
      setIsPlayingAudio(false)
    }
  }

  // Interrompi risposta corrente
  const handleInterrupt = () => {
    if (canInterrupt && realtimeCoachingServiceV2.isActive) {
      realtimeCoachingServiceV2.interrupt()
      setCanInterrupt(false)
      setIsProcessing(false)
      
      // ✅ Ferma anche audio se in riproduzione
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
        setIsPlayingAudio(false)
      }
      
      // Finalizza messaggio streaming
      if (streamingMessageRef.current) {
        streamingMessageRef.current.isStreaming = false
        streamingMessageRef.current = null
      }
      setStreamingResponse('')
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

        {/* Typing Indicator (quando non c'è streaming) */}
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
          {/* Interrupt Button (mostra solo quando streaming) */}
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
            className={`mic-button ${isRecording ? 'recording' : ''} ${isListening ? 'listening' : ''}`}
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