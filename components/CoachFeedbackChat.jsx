'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Dumbbell, X, Send, Save } from 'lucide-react'
import { mapErrorToUserMessage } from '@/lib/errorHelper'

/**
 * CoachFeedbackChat — Chat dedicata Palestra Coach.
 * Sostituisce AiInfoModal: raccoglie info profilo + feedback post-partita.
 * BLINDATA: solo ascolto, zero consigli tattici.
 *
 * Props:
 * - show {boolean} — se mostrare la chat
 * - onClose {function} — callback alla chiusura
 * - userProfile {object|null} — profilo utente (pre-caricato dalla dashboard)
 * - lastMatch {object|null} — ultima partita (pre-caricata dalla dashboard)
 */
export default function CoachFeedbackChat({ show, onClose, userProfile: externalProfile, lastMatch }) {
  const { t, lang } = useTranslation()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadedProfile, setLoadedProfile] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const sendAbortRef = useRef(null)

  // Carica profilo se non fornito esternamente
  useEffect(() => {
    if (!show) return
    if (externalProfile) { setLoadedProfile(externalProfile); return }
    const load = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session) return
        const { data } = await supabase.from('user_profiles')
          .select('first_name, ai_name, platform, connection_quality, pass_level, smart_assist, input_delay, ai_weak_point, ai_learn_goals, ai_notes, current_division, hours_per_week')
          .eq('user_id', session.session.user.id).maybeSingle()
        setLoadedProfile(data)
      } catch (e) { console.error('[CoachFeedbackChat] Profile load error:', e) }
    }
    load()
  }, [show, externalProfile])

  const userProfile = externalProfile || loadedProfile

  // Determina modalita sessione
  const sessionMode = useMemo(() => {
    const profileFields = [
      userProfile?.platform, userProfile?.connection_quality, userProfile?.pass_level,
      userProfile?.smart_assist, userProfile?.input_delay, userProfile?.ai_weak_point
    ].filter(v => v != null && String(v).trim() !== '').length
    if (profileFields < 3) return 'profile_setup'
    if (lastMatch) return 'feedback'
    return 'update'
  }, [userProfile, lastMatch])

  // Suggerimenti iniziali adattivi
  const initialSuggestions = useMemo(() => {
    if (lang === 'en') {
      if (sessionMode === 'profile_setup') return ['I play on console', 'I have defense problems', 'I use PA2']
      if (sessionMode === 'feedback') return ['It went well', "It didn't work", 'I followed your advice']
      return ["I changed something in my game", "I'm struggling with something", 'I want to update my info']
    }
    if (sessionMode === 'profile_setup') return ['Gioco su console', 'Ho problemi in difesa', 'Uso PA2']
    if (sessionMode === 'feedback') return ['E\' andata bene', 'Non ha funzionato', 'Ho seguito il tuo consiglio']
    return ['Ho cambiato qualcosa nel mio gioco', 'Ho difficolta con qualcosa', 'Voglio aggiornare le mie info']
  }, [sessionMode, lang])

  // Messaggio iniziale automatico
  useEffect(() => {
    if (!show) return
    setMessages([])
    setSaved(false)

    const firstName = userProfile?.first_name || (lang === 'en' ? 'friend' : 'amico')

    let greeting = ''
    if (sessionMode === 'profile_setup') {
      greeting = lang === 'en'
        ? `Hi ${firstName}! I'm your Coach Gym assistant. To get to know you better, tell me about yourself: what platform do you play on? How's your connection? What pass level do you use?`
        : `Ciao ${firstName}! Sono l'assistente della Palestra Coach. Per conoscerti meglio, parlami un po' di te: su che piattaforma giochi? Come va la connessione? Che livello di passaggio usi?`
    } else if (sessionMode === 'feedback' && lastMatch) {
      const opp = lastMatch.opponent_name || (lang === 'en' ? 'your opponent' : 'il tuo avversario')
      const form = lastMatch.formation_played || '?'
      const result = lastMatch.result || '?'
      greeting = lang === 'en'
        ? `Hi ${firstName}! I see you played ${form} vs ${opp} \u2014 ${result}. Tell me how it went!`
        : `Ciao ${firstName}! Vedo che hai giocato ${form} contro ${opp} \u2014 ${result}. Raccontami com'\u00e8 andata!`
    } else {
      greeting = lang === 'en'
        ? `Hi ${firstName}! Is there anything new you want to tell me? Have you changed something in your game?`
        : `Ciao ${firstName}! C'\u00e8 qualcosa di nuovo che vuoi dirmi? Hai cambiato qualcosa nel tuo gioco?`
    }

    setTimeout(() => {
      setMessages([{ role: 'assistant', content: greeting }])
    }, 300)
  }, [show, sessionMode, userProfile, lastMatch, lang])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input quando appare
  useEffect(() => {
    if (show && !loading) {
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [show, loading])

  // Cleanup abort controller
  useEffect(() => {
    return () => { sendAbortRef.current?.abort() }
  }, [])

  const handleSend = useCallback(async (messageText = input) => {
    if (!messageText.trim() || loading || saving) return

    const userMessage = messageText.trim()
    setInput('')
    setLoading(true)

    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      sendAbortRef.current?.abort()
      sendAbortRef.current = new AbortController()
      const signal = sendAbortRef.current.signal

      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) throw new Error('Session expired')
      if (signal.aborted) return

      const history = messages
        .slice(-10)
        .map(({ role, content }) => ({ role, content: typeof content === 'string' ? content : String(content) }))

      const res = await fetch('/api/coach-feedback-chat', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ message: userMessage, history, language: lang })
      })
      if (signal.aborted) return

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error')
      }

      const data = await res.json()
      if (signal.aborted) return

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || (lang === 'en' ? "I didn't understand, can you repeat?" : 'Non ho capito, puoi ripetere?')
      }])

      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

    } catch (error) {
      if (error?.name === 'AbortError') return
      console.error('[CoachFeedbackChat] Error:', error)
      const { message: friendlyMsg } = mapErrorToUserMessage(error, lang === 'en' ? 'Please try again.' : 'Riprova tra poco.')
      setMessages(prev => [...prev, { role: 'assistant', content: friendlyMsg }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, saving, messages, lang])

  const handleQuickAction = useCallback((text) => {
    setInput(text)
    setTimeout(() => handleSend(text), 100)
  }, [handleSend])

  // Salva e chiudi: invia conversazione a /api/save-coach-feedback
  const handleSaveAndClose = useCallback(async () => {
    if (saving) return
    // Se solo messaggio iniziale, chiudi senza salvare
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length === 0) {
      onClose?.()
      return
    }

    setSaving(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        onClose?.()
        return
      }

      const conversation = messages.map(({ role, content }) => ({ role, content }))
      const res = await fetch('/api/save-coach-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          conversation,
          session_type: sessionMode,
          match_id: lastMatch?.id || null
        })
      })

      if (res.ok) {
        setSaved(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('credits-consumed'))
          window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        }
        setTimeout(() => onClose?.(), 1500)
      } else {
        console.error('[CoachFeedbackChat] Save error:', await res.text())
        onClose?.()
      }
    } catch (err) {
      console.error('[CoachFeedbackChat] Save error:', err)
      onClose?.()
    } finally {
      setSaving(false)
    }
  }, [saving, messages, sessionMode, lastMatch, onClose])

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          width: 'clamp(340px, 92vw, 440px)',
          height: 'clamp(520px, 80vh, 680px)',
          background: 'rgba(0, 0, 0, 0.97)',
          border: '2px solid var(--neon-orange)',
          borderRadius: '16px',
          boxShadow: '0 0 30px rgba(255, 140, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            background: 'linear-gradient(135deg, var(--neon-orange), #e65100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Dumbbell size={20} color="white" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '16px' }}>
                {lang === 'en' ? 'Coach Gym' : 'Palestra Coach'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                {sessionMode === 'profile_setup'
                  ? (lang === 'en' ? 'Tell me about yourself' : 'Raccontami di te')
                  : sessionMode === 'feedback'
                    ? (lang === 'en' ? 'Post-match feedback' : 'Feedback post-partita')
                    : (lang === 'en' ? 'Update your info' : 'Aggiorna le tue info')}
              </div>
            </div>
          </div>
          <button
            onClick={handleSaveAndClose}
            disabled={saving}
            style={{
              background: saving ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '8px',
              cursor: saving ? 'wait' : 'pointer',
              color: 'white',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            {saved ? (
              <>{lang === 'en' ? 'Saved!' : 'Salvato!'}</>
            ) : saving ? (
              <>{lang === 'en' ? 'Saving...' : 'Salvo...'}</>
            ) : (
              <><Save size={14} /> {lang === 'en' ? 'Save & Close' : 'Salva e chiudi'}</>
            )}
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: msg.role === 'user'
                  ? 'var(--neon-orange)'
                  : 'rgba(255, 255, 255, 0.1)',
                fontSize: '14px',
                lineHeight: '1.6',
                wordWrap: 'break-word',
                border: msg.role === 'assistant' ? '1px solid rgba(255, 140, 0, 0.3)' : 'none'
              }}
            >
              {msg.content}
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', opacity: 0.7 }}>
              <div style={{ display: 'flex', gap: '4px', padding: '12px' }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--neon-orange)', animation: `bounce 1s infinite ${delay}s`
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (solo se pochi messaggi utente) */}
        {messages.filter(m => m.role === 'user').length < 2 && !loading && (
          <div style={{
            padding: '8px 12px 12px',
            borderTop: '1px solid rgba(255, 140, 0, 0.2)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.3)'
          }}>
            {initialSuggestions.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAction(text)}
                disabled={loading || saving}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 140, 0, 0.1)',
                  border: '1px solid var(--neon-orange)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 140, 0, 0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 140, 0, 0.1)' }}
              >
                {text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255, 140, 0, 0.2)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.5)'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            placeholder={lang === 'en' ? 'Tell me...' : 'Raccontami...'}
            disabled={loading || saving}
            style={{
              flex: 1, padding: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none'
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || saving || !input.trim()}
            style={{
              padding: '12px 16px',
              background: loading || saving || !input.trim() ? 'rgba(255,255,255,0.1)' : 'var(--neon-orange)',
              border: 'none', borderRadius: '8px',
              cursor: loading || saving || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            aria-label={lang === 'en' ? 'Send' : 'Invia'}
          >
            <Send size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  )
}
