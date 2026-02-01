'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Brain, X, Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { mapErrorToUserMessage } from '@/lib/errorHelper'

export default function AssistantChat() {
  const { t, lang } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [currentPage, setCurrentPage] = useState('')
  const [lastSuggestions, setLastSuggestions] = useState([]) // 3 suggerimenti cliccabili dopo ogni risposta
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false) // riquadro suggerimenti collassato = più spazio chat
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  // Tre domande cliccabili all'apertura chat (prima volta)
  const initialSuggestions = [
    t('howToAddMatch') || 'Come carico una partita?',
    t('howToManageFormation') || 'Come gestisco la formazione?',
    (lang === 'en' ? 'What\'s my difficulty in matches?' : 'Qual è la mia difficoltà nelle partite?')
  ]
  
  // Carica profilo utente al mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session) return
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('first_name, team_name, ai_name')
          .eq('user_id', session.session.user.id)
          .maybeSingle()
        
        if (profile) {
          setUserProfile(profile)
          
          // Saluto personale al primo accesso
          const hasGreeted = localStorage.getItem('assistant_greeted')
          if (!hasGreeted && profile.first_name) {
            setTimeout(() => {
              const aiName = profile.ai_name || (lang === 'en' ? 'your Coach AI' : 'il tuo Coach AI')
              const greeting = lang === 'en'
                ? `Hi ${profile.first_name}! 👋 I'm ${aiName}. I'm here to help and guide you. Just tell me what you need! 💪`
                : `Ciao ${profile.first_name}! 👋 Sono ${aiName}. Sono qui per aiutarti e guidarti. Dimmi pure cosa ti serve! 💪`
              setMessages([{ role: 'assistant', content: greeting }])
              localStorage.setItem('assistant_greeted', 'true')
            }, 500)
          }
        }
      } catch (error) {
        console.error('[AssistantChat] Error loading profile:', error)
      }
    }
    
    loadProfile()
    
    // Rileva pagina corrente
    if (typeof window !== 'undefined') {
      setCurrentPage(window.location.pathname)
      
      // Aggiorna quando cambia pagina
      const handleRouteChange = () => {
        setCurrentPage(window.location.pathname)
      }
      window.addEventListener('popstate', handleRouteChange)
      return () => window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])
  
  // Auto-scroll a ultimo messaggio
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return
    
    const userMessage = messageText.trim()
    setInput('')
    setLoading(true)
    setLastSuggestions([]) // nascondi suggerimenti precedenti mentre carica
    
    // Aggiungi messaggio utente
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Session expired')
      }
      
      // Determina stato app (cosa sta facendo il cliente)
      const appState = {
        completingMatch: currentPage.includes('/match/new'),
        viewingMatch: currentPage.includes('/match/') && !currentPage.includes('/match/new'),
        managingFormation: currentPage.includes('/gestione-formazione'),
        viewingDashboard: currentPage === '/'
      }

      // Storia conversazione (ultimi 10 messaggi, senza il messaggio corrente) per continuità come ChatGPT
      const history = messages
        .slice(-10)
        .map(({ role, content }) => ({ role, content: typeof content === 'string' ? content : String(content) }))
      
      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          message: userMessage,
          currentPage,
          appState,
          language: lang,
          history
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error generating response')
      }
      
      const data = await res.json().catch((jsonError) => {
        console.error('[AssistantChat] JSON parse error:', jsonError)
        throw new Error('Invalid response from server')
      })
      
      // Verifica che data.response esista
      if (!data || !data.response) {
        console.error('[AssistantChat] Invalid response data:', data)
        throw new Error('Invalid response format')
      }
      
      // Aggiungi risposta AI (fallback doppia lingua)
      const fallbackNoResponse = lang === 'en' ? "Sorry, I didn't receive a valid response." : 'Mi dispiace, non ho ricevuto una risposta valida.'
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || fallbackNoResponse,
        timestamp: new Date()
      }])
      setLastSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      setSuggestionsExpanded(false) // nuove risposta = suggerimenti collassati per non restringere la chat
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

    } catch (error) {
      console.error('[AssistantChat] Error:', error)
      const { message: friendlyMsg } = mapErrorToUserMessage(error, lang === 'en' ? 'Please try again in a moment!' : 'Riprova tra un attimo!')
      const errorMsg = lang === 'en'
        ? `Sorry, something went wrong. ${friendlyMsg} 😔`
        : `Mi dispiace, c'è stato un errore. ${friendlyMsg} 😔`
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }
  
  const handleQuickAction = (text) => {
    setInput(text)
    setTimeout(() => handleSend(text), 100)
  }
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-orange))',
          border: 'none',
          cursor: 'pointer',
          boxShadow: 'var(--glow-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        aria-label={t('openAssistant') || 'Apri assistente'}
      >
        <Brain size={28} color="white" />
      </button>
    )
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: 'clamp(320px, 90vw, 400px)',
        height: 'clamp(500px, 70vh, 600px)',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '2px solid var(--neon-blue)',
        borderRadius: '16px',
        boxShadow: 'var(--glow-blue)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-orange))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <Sparkles size={20} color="white" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'white', fontSize: '16px' }}>
              {userProfile?.ai_name || t('yourCoach') || 'Il tuo Coach AI'}
            </div>
            {userProfile?.first_name && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)' }}>
                Ciao {userProfile.first_name}! 👋
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label={t('closeAssistant') || 'Chiudi assistente'}
        >
          <X size={20} />
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
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.7 }}>
            <Brain size={48} color="var(--neon-blue)" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
              {userProfile?.first_name 
                ? `Ciao ${userProfile.first_name}! Come posso aiutarti?`
                : 'Ciao! Come posso aiutarti?'
              }
            </div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>
              Fammi una domanda o usa i suggerimenti qui sotto
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: msg.role === 'user' 
                ? 'var(--neon-blue)'
                : 'rgba(255, 255, 255, 0.1)',
              fontSize: '14px',
              lineHeight: '1.6',
              wordWrap: 'break-word',
              border: msg.role === 'assistant' ? '1px solid rgba(0, 212, 255, 0.3)' : 'none'
            }}
          >
            {msg.content}
          </div>
        ))}
        
        {loading && (
          <div style={{ alignSelf: 'flex-start', opacity: 0.7 }}>
            <div style={{ display: 'flex', gap: '4px', padding: '12px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: 'var(--neon-blue)', 
                animation: 'bounce 1s infinite' 
              }} />
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: 'var(--neon-blue)', 
                animation: 'bounce 1s infinite 0.2s' 
              }} />
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: 'var(--neon-blue)', 
                animation: 'bounce 1s infinite 0.4s' 
              }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggerimenti: riquadro collassabile (UX enterprise: colori e bordi coerenti con globals.css) */}
      {messages.length === 0 && (
        <div style={{ borderTop: '1px solid rgba(0, 212, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)' }}>
          <button
            type="button"
            onClick={() => setSuggestionsExpanded(s => !s)}
            aria-expanded={suggestionsExpanded}
            aria-label={lang === 'en' ? 'Show or hide suggested questions' : 'Mostra o nascondi domande suggerite'}
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neon-blue)',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--neon-blue)'; e.currentTarget.style.outlineOffset = '2px' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >
            <span>💡 {lang === 'en' ? 'Suggested questions (3)' : 'Domande suggerite (3)'}</span>
            {suggestionsExpanded ? <ChevronUp size={16} color="var(--neon-blue)" /> : <ChevronDown size={16} color="var(--neon-blue)" />}
          </button>
          {suggestionsExpanded && (
            <div style={{ padding: '8px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {initialSuggestions.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAction(text)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid var(--neon-blue)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'white',
                    maxWidth: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                    e.currentTarget.style.boxShadow = 'var(--glow-blue)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {messages.length > 0 && lastSuggestions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(0, 212, 255, 0.2)', background: 'rgba(0, 0, 0, 0.3)' }}>
          <button
            type="button"
            onClick={() => setSuggestionsExpanded(s => !s)}
            aria-expanded={suggestionsExpanded}
            aria-label={lang === 'en' ? 'Show or hide follow-up questions' : 'Mostra o nascondi altre domande'}
            style={{
              width: '100%',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--neon-blue)',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--neon-blue)'; e.currentTarget.style.outlineOffset = '2px' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >
            <span>💡 {lang === 'en' ? 'Follow-up (3)' : 'Altre domande (3)'}</span>
            {suggestionsExpanded ? <ChevronUp size={16} color="var(--neon-blue)" /> : <ChevronDown size={16} color="var(--neon-blue)" />}
          </button>
          {suggestionsExpanded && (
            <div style={{ padding: '8px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {lastSuggestions.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAction(text)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid var(--neon-blue)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'white',
                    maxWidth: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                    e.currentTarget.style.boxShadow = 'var(--glow-blue)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Input (bordo coerente con area messaggi e suggerimenti) */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid rgba(0, 212, 255, 0.2)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.5)'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={t('typeMessage') || 'Scrivi un messaggio...'}
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 16px',
            background: loading || !input.trim() 
              ? 'rgba(255, 255, 255, 0.1)'
              : 'var(--neon-blue)',
            border: 'none',
            borderRadius: '8px',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.background = 'var(--neon-orange)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && input.trim()) {
              e.currentTarget.style.background = 'var(--neon-blue)'
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
          aria-label={t('sendMessage') || 'Invia messaggio'}
        >
          <Send size={18} color="white" />
        </button>
      </div>
    </div>
  )
}
