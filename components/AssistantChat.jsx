'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Brain, X, Send, Sparkles } from 'lucide-react'

export default function AssistantChat() {
  const { t, lang } = useTranslation()
  const pathname = usePathname() // Usa Next.js router per tracciare route
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  // Quick actions (domande comuni)
  const quickActions = [
    { text: t('howToAddMatch') || 'Come carico una partita?', icon: '⚽' },
    { text: t('howToManageFormation') || 'Come gestisco la formazione?', icon: '🎯' },
    { text: t('whereAmI') || 'Dove sono?', icon: '📍' },
    { text: t('whatCanYouDo') || 'Cosa puoi fare?', icon: '💡' }
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
              setMessages([{
                role: 'assistant',
                content: `Ciao ${profile.first_name}! 👋 Sono ${profile.ai_name || 'il tuo Coach AI'}. 
                Sono qui per aiutarti e guidarti. Dimmi pure cosa ti serve! 💪`
              }])
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
    
    // Aggiungi messaggio utente
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Session expired')
      }
      
      // Determina stato app (cosa sta facendo il cliente)
      const currentPage = pathname || ''
      const appState = {
        completingMatch: currentPage.includes('/match/new'),
        viewingMatch: currentPage.includes('/match/') && !currentPage.includes('/match/new'),
        managingFormation: currentPage.includes('/gestione-formazione'),
        viewingDashboard: currentPage === '/'
      }
      
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
          language: lang
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
      
      // Aggiungi risposta AI
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || 'Mi dispiace, non ho ricevuto una risposta valida.',
        timestamp: new Date()
      }])
      
    } catch (error) {
      console.error('[AssistantChat] Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Mi dispiace, c'è stato un errore. ${error.message || 'Riprova tra un attimo!'} 😔`
      }])
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
      
      {/* Quick Actions */}
      {messages.length === 0 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
            💡 Suggerimenti rapidi:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.text)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid var(--neon-blue)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                {action.icon} {action.text}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
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
