# 🎯 Implementazione Guida Interattiva - Compagno di Viaggio

**Data:** 23 Gennaio 2026  
**Obiettivo:** Guida AI personale, amichevole, motivante - vero compagno di viaggio  
**Approccio:** MVP Testuale → Features Progressive → Ottimizzazioni

---

## 🎨 FILOSOFIA: COMPAGNO DI VIAGGIO

### **Non Solo Assistente, Ma Compagno:**

**Caratteristiche:**
- ✅ **Personale:** Usa nome cliente, conosce il suo team, ricorda preferenze
- ✅ **Amichevole:** Tono conversazionale, empatico, incoraggiante
- ✅ **Motivante:** Celebra successi, incoraggia quando serve, guida passo-passo
- ✅ **Guida Vera:** Non solo risponde, ma accompagna attivamente
- ✅ **Contestuale:** Capisce dove è il cliente e cosa sta facendo

**Esempi Tono:**

❌ **NO (Robotico):**
```
"Per caricare una partita, vai su 'Aggiungi Partita' e segui i 5 step."
```

✅ **SÌ (Compagno di Viaggio):**
```
"Ciao [Nome]! Vedo che vuoi caricare una partita. 
Ottimo! Ti guido passo-passo:
1. Clicca su 'Aggiungi Partita' in alto
2. Carica lo screenshot delle pagelle
3. Io estraggo i dati automaticamente
Sono qui se hai dubbi! 💪"
```

---

## 🏗️ ARCHITETTURA MVP

### **Stack:**
- **Frontend:** React component (chat widget)
- **Backend:** `/api/assistant-chat` endpoint
- **AI:** GPT-4o (standard, non Realtime per MVP)
- **Context:** Pagina corrente, profilo utente, stato app
- **Storage:** Supabase per memory (opzionale MVP)

### **Componenti:**
1. **`components/AssistantChat.jsx`** - Widget chat
2. **`app/api/assistant-chat/route.js`** - Endpoint API
3. **`lib/assistantContext.js`** - Context provider
4. **Database:** Tabella `assistant_conversations` (opzionale)

---

## 💬 PROMPT AI - PERSONALITÀ COMPAGNO DI VIAGGIO

### **System Prompt Base:**

```javascript
const systemPrompt = `Sei un coach AI personale e amichevole per eFootball. 
Il tuo nome è ${userProfile?.ai_name || 'Coach AI'}.

PERSONALITÀ:
- Sei un compagno di viaggio, non solo un assistente
- Tono: amichevole, empatico, motivante, incoraggiante
- Usa il nome del cliente quando possibile: "${userProfile?.first_name || 'amico'}"
- Celebra i successi: "Ottimo lavoro!", "Bravo!", "Fantastico!"
- Incoraggia quando serve: "Non ti preoccupare, ci sono!", "Andiamo passo-passo"
- Guida attiva: non solo rispondi, ma accompagni

CONTESTO CLIENTE:
- Nome: ${userProfile?.first_name || 'Cliente'}
- Team: ${userProfile?.team_name || 'Il tuo team'}
- Come ricordarti: ${userProfile?.how_to_remember || 'N/A'}
- Problemi comuni: ${userProfile?.common_problems?.join(', ') || 'Nessuno'}
- Pagina corrente: ${currentPage}
- Stato app: ${appState}

REGOLE:
1. Rispondi SEMPRE in modo personale e amichevole
2. Usa emoji quando appropriato (ma non esagerare)
3. Guida passo-passo, non solo istruzioni
4. Motiva e incoraggia
5. Se cliente è frustrato, sii empatico
6. Se cliente ha successo, celebra
7. Rispondi in ${language} (italiano o inglese)

ESEMPI RISPOSTE:

Cliente: "Come carico una partita?"
Tu: "Ciao ${userProfile?.first_name || 'amico'}! Perfetto, ti guido subito! 
Vai su 'Aggiungi Partita' in alto, poi carica lo screenshot delle pagelle. 
Io estraggo tutto automaticamente. Se hai dubbi, dimmelo! 💪"

Cliente: "Non funziona"
Tu: "Non ti preoccupare, ${userProfile?.first_name || 'amico'}! 
Dimmi cosa non funziona e ti aiuto subito. 
Siamo qui per questo! 🔧"

Cliente: "Ho vinto 3-0!"
Tu: "Fantastico, ${userProfile?.first_name || 'amico'}! 🎉 
Ottimo risultato! Vuoi che analizziamo la partita per vedere cosa ha funzionato meglio?"
`
```

---

## 🎨 UI/UX - ESPERIENZA PERSONALE

### **Chat Widget Design:**

```
┌─────────────────────────────────────────┐
│  🤖 ${ai_name || 'Il tuo Coach AI'}      │
│  Ciao ${first_name}! Come posso aiutarti?│
│  [🎤] [⌨️]  ← Toggle (solo testo MVP)    │
├─────────────────────────────────────────┤
│                                         │
│  👤 ${first_name}: Come carico una      │
│     partita?                            │
│                                         │
│  🤖 ${ai_name}: Ciao ${first_name}!     │
│     Perfetto, ti guido subito! 💪       │
│     Vai su 'Aggiungi Partita'...       │
│     [Pulsante "Mostrami"]               │
│                                         │
│  👤 ${first_name}: Non capisco          │
│                                         │
│  🤖 ${ai_name}: Non ti preoccupare!     │
│     Andiamo passo-passo insieme...      │
│                                         │
├─────────────────────────────────────────┤
│  [Input text] [Invia]                   │
│  💡 Suggerimenti rapidi:                │
│  [Come carico partita?] [Dove sono?]   │
└─────────────────────────────────────────┘
```

### **Caratteristiche UI:**
- ✅ **Avatar personalizzato:** Usa `ai_name` del cliente
- ✅ **Saluto personale:** "Ciao [Nome]!" al primo messaggio
- ✅ **Quick Actions:** Pulsanti rapidi per domande comuni
- ✅ **Proactive Suggestions:** "Vedo che stai caricando una partita, posso guidarti?"
- ✅ **Progress Indicators:** "Hai completato 3/5 step!"
- ✅ **Celebrazioni:** Animazioni quando cliente completa task

---

## 📋 PIANO IMPLEMENTAZIONE

### **Fase 1: MVP Testuale (3-4 giorni)**

#### **Giorno 1: Backend Endpoint**
- ✅ Creare `/api/assistant-chat/route.js`
- ✅ Funzione `buildAssistantContext()` (pagina, profilo, stato)
- ✅ Prompt AI con personalità
- ✅ Integrazione GPT-4o
- ✅ Rate limiting base

#### **Giorno 2: Frontend Widget**
- ✅ Creare `components/AssistantChat.jsx`
- ✅ UI chat widget (minimizzato/espanso)
- ✅ Input text + invio
- ✅ Rendering messaggi
- ✅ Integrazione in layout principale

#### **Giorno 3: Context & Personalizzazione**
- ✅ Recupero profilo utente
- ✅ Context pagina corrente
- ✅ Quick actions (pulsanti rapidi)
- ✅ Saluto personale al primo accesso

#### **Giorno 4: Testing & Refinement**
- ✅ Test completo flusso
- ✅ Aggiustamenti prompt per tono
- ✅ Error handling
- ✅ Mobile responsiveness

---

## 💻 IMPLEMENTAZIONE TECNICA

### **1. Backend: `/app/api/assistant-chat/route.js`**

```javascript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { extractBearerToken, validateToken } from '@/lib/auth'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'

// Funzione per costruire contesto personale
async function buildAssistantContext(userId, currentPage, appState) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceKey) return null
  
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  // Recupera profilo utente (nome, team, preferenze)
  const { data: profile } = await admin
    .from('user_profiles')
    .select('first_name, team_name, ai_name, how_to_remember, common_problems')
    .eq('user_id', userId)
    .maybeSingle()
  
  return {
    profile: profile || {},
    currentPage,
    appState: appState || {}
  }
}

// Funzione per costruire prompt personale
function buildPersonalizedPrompt(userMessage, context, language = 'it') {
  const { profile, currentPage, appState } = context
  const firstName = profile?.first_name || 'amico'
  const teamName = profile?.team_name || 'il tuo team'
  const aiName = profile?.ai_name || 'Coach AI'
  const howToRemember = profile?.how_to_remember || ''
  const commonProblems = profile?.common_problems || []
  
  return `Sei ${aiName}, un coach AI personale e amichevole per eFootball. 
Il tuo obiettivo è essere un compagno di viaggio, non solo un assistente.

PERSONALITÀ:
- Sei amichevole, empatico, motivante, incoraggiante
- Tono: conversazionale, come parlare con un amico che ti aiuta
- Usa il nome del cliente: "${firstName}"
- Celebra successi: "Ottimo lavoro!", "Bravo!", "Fantastico!" 🎉
- Incoraggia quando serve: "Non ti preoccupare!", "Andiamo passo-passo insieme!" 💪
- Guida attiva: non solo rispondi, ma accompagni e motivi

CONTESTO CLIENTE:
- Nome: ${firstName}
- Team: ${teamName}
${howToRemember ? `- Come ricordarti: ${howToRemember}` : ''}
${commonProblems.length > 0 ? `- Problemi comuni: ${commonProblems.join(', ')}` : ''}
- Pagina corrente: ${currentPage}
${appState.completingMatch ? '- Sta completando una partita' : ''}
${appState.uploadingPlayer ? '- Sta caricando un giocatore' : ''}

REGOLE:
1. Rispondi SEMPRE in modo personale e amichevole
2. Usa emoji quando appropriato (ma non esagerare: max 1-2 per messaggio)
3. Guida passo-passo, non solo istruzioni
4. Motiva e incoraggia sempre
5. Se cliente è frustrato, sii empatico e rassicurante
6. Se cliente ha successo, celebra con entusiasmo
7. Rispondi in ${language === 'it' ? 'italiano' : 'inglese'}
8. Massimo 3-4 frasi per risposta (breve ma efficace)

ESEMPI TONO:

Cliente: "Come carico una partita?"
Tu: "Ciao ${firstName}! Perfetto, ti guido subito! 💪
Vai su 'Aggiungi Partita' in alto, poi carica lo screenshot delle pagelle. 
Io estraggo tutto automaticamente. Se hai dubbi, dimmelo!"

Cliente: "Non funziona"
Tu: "Non ti preoccupare, ${firstName}! 
Dimmi cosa non funziona e ti aiuto subito. 
Siamo qui per questo! 🔧"

Cliente: "Ho vinto 3-0!"
Tu: "Fantastico, ${firstName}! 🎉 
Ottimo risultato! Vuoi che analizziamo la partita per vedere cosa ha funzionato meglio?"

DOMANDA CLIENTE:
${userMessage}

Rispondi come ${aiName}, in modo personale, amichevole e motivante:`
}

export async function POST(req) {
  try {
    // Autenticazione
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }
    
    const userId = userData.user.id
    
    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/assistant-chat'] || {
      maxRequests: 30,
      windowMs: 60000
    }
    
    const rateLimit = await checkRateLimit(
      userId,
      '/api/assistant-chat',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', resetAt: rateLimit.resetAt },
        { status: 429 }
      )
    }
    
    // Parse request
    const body = await req.json()
    const { message, currentPage, appState, language = 'it' } = body
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    
    // Costruisci contesto personale
    const context = await buildAssistantContext(userId, currentPage, appState)
    
    // Costruisci prompt personalizzato
    const prompt = buildPersonalizedPrompt(message, context, language)
    
    // Chiama OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }
    
    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sei un coach AI personale e amichevole. Rispondi sempre in modo empatico, motivante e incoraggiante.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Più creativo per personalità
      max_tokens: 300, // Breve ma efficace
      response_format: { type: 'text' }
    }
    
    const response = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
    const content = response.choices[0]?.message?.content || 'Mi dispiace, non ho capito. Puoi ripetere?'
    
    return NextResponse.json({
      response: content,
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt
    })
    
  } catch (error) {
    console.error('[assistant-chat] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error generating response' },
      { status: 500 }
    )
  }
}
```

---

### **2. Frontend: `components/AssistantChat.jsx`**

```javascript
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Brain, X, Send, Minimize2, Maximize2, Sparkles } from 'lucide-react'

export default function AssistantChat() {
  const { t, lang } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [currentPage, setCurrentPage] = useState('')
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
            setMessages([{
              role: 'assistant',
              content: `Ciao ${profile.first_name}! 👋 Sono ${profile.ai_name || 'il tuo Coach AI'}. 
              Sono qui per aiutarti e guidarti. Dimmi pure cosa ti serve! 💪`
            }])
            localStorage.setItem('assistant_greeted', 'true')
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
      const appState = {
        completingMatch: currentPage.includes('/match/new'),
        viewingMatch: currentPage.includes('/match/'),
        managingFormation: currentPage.includes('/gestione-formazione')
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
      
      const data = await res.json()
      
      // Aggiungi risposta AI
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
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
    handleSend(text)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="white" />
          <div>
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
            padding: '4px'
          }}
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
          gap: '12px'
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
              wordWrap: 'break-word'
            }}
          >
            {msg.content}
          </div>
        ))}
        
        {loading && (
          <div style={{ alignSelf: 'flex-start', opacity: 0.7 }}>
            <div style={{ display: 'flex', gap: '4px', padding: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-blue)', animation: 'bounce 1s infinite' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-blue)', animation: 'bounce 1s infinite 0.2s' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-blue)', animation: 'bounce 1s infinite 0.4s' }} />
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
                  transition: 'all 0.2s'
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
          gap: '8px'
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
            fontSize: '14px'
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
            justifyContent: 'center'
          }}
        >
          <Send size={18} color="white" />
        </button>
      </div>
    </div>
  )
}
```

---

### **3. Integrazione in Layout**

```javascript
// app/layout.tsx o componente principale
import AssistantChat from '@/components/AssistantChat'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <AssistantChat /> {/* Widget sempre disponibile */}
      </body>
    </html>
  )
}
```

---

## 🎯 FEATURES PROGRESSIVE

### **MVP (Fase 1):**
- ✅ Chat widget base
- ✅ Risposte personalizzate (nome, team)
- ✅ Quick actions
- ✅ Saluto personale

### **V2 (Fase 2):**
- ✅ Proactive suggestions ("Vedo che stai caricando una partita...")
- ✅ Tour guidati interattivi
- ✅ Progress tracking ("Hai completato 3/5 step!")

### **V3 (Fase 3):**
- ✅ Memory conversazioni
- ✅ Celebrazioni animazioni
- ✅ Suggerimenti contestuali

---

## ✅ PROSSIMI PASSI

1. **Implementare backend** (`/api/assistant-chat`)
2. **Implementare frontend** (`components/AssistantChat.jsx`)
3. **Integrare in layout**
4. **Test e refinement prompt**

**Vuoi che proceda con l'implementazione?** 🚀
