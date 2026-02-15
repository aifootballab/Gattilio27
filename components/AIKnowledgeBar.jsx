'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { Brain, RefreshCw, AlertCircle } from 'lucide-react'

/**
 * Componente Barra Conoscenza IA
 * 
 * Mostra quanto l'IA conosce l'utente basandosi su:
 * - Profilo, Rosa, Partite, Pattern, Allenatore, Utilizzo, Successi
 * 
 * Stile: Identico a barra profilazione in impostazioni-profilo
 */
export default function AIKnowledgeBar() {
  const { t } = useTranslation()
  const router = useRouter()
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState('beginner')
  const [breakdown, setBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const scoreRef = React.useRef(score)
  const previousScoreRef = React.useRef(score)
  const retryTimeoutRef = React.useRef(null)
  scoreRef.current = score

  useEffect(() => {
    // Solo lato client per evitare hydration mismatch
    if (typeof window === 'undefined') return

    const ac = new AbortController()
    fetchAIKnowledge(ac.signal)

    const doRefresh = (useRefreshParam = false) => {
      previousScoreRef.current = scoreRef.current
      const retryDelays = [1000, 2000, 3000, 5000, 8000]
      let attempt = 0

      const attemptRefresh = async () => {
        if (attempt >= retryDelays.length) return
        if (ac.signal.aborted) return
        attempt++
        try {
          const { data: session } = await supabase.auth.getSession()
          if (!session?.session?.access_token) return
          if (ac.signal.aborted) return
          const url = useRefreshParam ? '/api/ai-knowledge?refresh=1' : '/api/ai-knowledge'
          const res = await fetch(url, {
            method: 'GET',
            signal: ac.signal,
            headers: {
              'Authorization': `Bearer ${session.session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          if (ac.signal.aborted) return
          
          if (!res.ok) throw new Error('Fetch failed')
          
          const data = await res.json()
          const newScore = data.score || 0
          
          // Se lo score è cambiato, aggiorna e ferma retry
          if (ac.signal.aborted) return
          if (Math.abs(newScore - previousScoreRef.current) > 0.01) {
            if (process.env.NODE_ENV !== 'production') console.log(`[AIKnowledgeBar] Score updated: ${previousScoreRef.current} → ${newScore}`)
            setScore(newScore)
            setLevel(data.level || 'beginner')
            setBreakdown(data.breakdown || {})
            return // Successo, ferma retry
          }
          
          // Se score non cambiato, programma prossimo tentativo
          if (process.env.NODE_ENV !== 'production') console.log(`[AIKnowledgeBar] Score unchanged (${newScore}), scheduling next retry...`)
          if (attempt < retryDelays.length) {
            retryTimeoutRef.current = setTimeout(attemptRefresh, retryDelays[attempt])
          }
        } catch (err) {
          if (err?.name === 'AbortError' || ac.signal.aborted) return
          console.error('[AIKnowledgeBar] Retry attempt failed:', err)
          // Continua con prossimo tentativo anche in caso di errore
          if (attempt < retryDelays.length) {
            retryTimeoutRef.current = setTimeout(attemptRefresh, retryDelays[attempt])
          }
        }
      }
      
      retryTimeoutRef.current = setTimeout(attemptRefresh, retryDelays[0])
    }

    const onMatchSaved = () => doRefresh(false)
    const onKnowledgeRefresh = () => doRefresh(true)

    window.addEventListener('match-saved', onMatchSaved)
    window.addEventListener('knowledge-should-refresh', onKnowledgeRefresh)

    const interval = setInterval(() => { fetchAIKnowledge(ac.signal) }, 1 * 60 * 1000)

    return () => {
      ac.abort()
      clearInterval(interval)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      window.removeEventListener('match-saved', onMatchSaved)
      window.removeEventListener('knowledge-should-refresh', onKnowledgeRefresh)
    }
  }, [])

  const fetchAIKnowledge = async (signal) => {
    try {
      setError(null)
      if (!supabase) {
        setError('Supabase not configured')
        return
      }
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        setLoading(false)
        router.push('/login')
        return
      }
      if (signal?.aborted) return
      const token = session.session.access_token
      const res = await fetch('/api/ai-knowledge', {
        method: 'GET',
        ...(signal && { signal }),
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (signal?.aborted) return
      if (res.status === 401) {
        setLoading(false)
        router.push('/login')
        return
      }
      const data = await safeJsonResponse(res, 'Failed to fetch AI knowledge')
      if (signal?.aborted) return
      setScore(data.score || 0)
      setLevel(data.level || 'beginner')
      setBreakdown(data.breakdown || {})
    } catch (err) {
      if (err?.name === 'AbortError' || signal?.aborted) return
      const msg = err?.message || ''
      const isSessionExpired = /sessione scaduta|session expired|invalid or expired|authentication required/i.test(msg)
      if (isSessionExpired) {
        setLoading(false)
        router.push('/login')
        return
      }
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AIKnowledgeBar] Error fetching:', err)
      }
      setError(msg || t('sessionExpired'))
    } finally {
      setLoading(false)
    }
  }

  /** Zero → Hero: gradienti enterprise (da freddo/zero a caldo/ero) */
  const getBarGradient = (score) => {
    if (score >= 81) return 'linear-gradient(90deg, #0d3d0d 0%, #1a7a32 50%, #00e676 100%)'
    if (score >= 61) return 'linear-gradient(90deg, #0d2d3d 0%, #0d7a9e 50%, #00d4ff 100%)'
    if (score >= 31) return 'linear-gradient(90deg, #3d2d0d 0%, #b8860b 50%, #ffc107 100%)'
    return 'linear-gradient(90deg, #3d1a1a 0%, #b84d4d 50%, #ff6b6b 100%)'
  }

  const getLevelText = (level) => {
    switch (level) {
      case 'expert':
        return t('aiKnowledgeExpert') || 'Esperto'
      case 'advanced':
        return t('aiKnowledgeAdvanced') || 'Avanzato'
      case 'intermediate':
        return t('aiKnowledgeIntermediate') || 'Intermedio'
      default:
        return t('aiKnowledgeBeginner') || 'Principiante'
    }
  }

  const getDescriptionText = (level) => {
    switch (level) {
      case 'expert':
        return t('aiKnowledgeDescriptionExpert') || t('aiKnowledgeDescription') || 'Livello esperto: i consigli sono molto su misura. Più partite e utilizzo aiutano a raggiungere il 100%.'
      case 'advanced':
        return t('aiKnowledgeDescriptionAdvanced') || t('aiKnowledgeDescription') || 'Ti conosciamo bene: i consigli riflettono il tuo modo di giocare.'
      case 'intermediate':
        return t('aiKnowledgeDescriptionIntermediate') || t('aiKnowledgeDescription') || 'Ti conosciamo abbastanza bene: i consigli sono già personalizzati.'
      default:
        return t('aiKnowledgeDescriptionBeginner') || t('aiKnowledgeDescription') || 'Stiamo imparando a conoscerti.'
    }
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: 'clamp(16px, 4vw, 20px)',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={20} color="#00d4ff" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#888' }}>
            {t('loadingShort')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: 'clamp(16px, 4vw, 20px)',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b00' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: 'clamp(13px, 3vw, 14px)' }}>
            {error}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(145deg, #1a1d24 0%, #15181e 100%)',
      borderRadius: '16px',
      padding: 'clamp(18px, 4vw, 24px)',
      marginBottom: '24px',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
    }}>
      {/* Header: titolo + % */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Brain size={22} style={{ color: 'var(--neon-blue, #00d4ff)', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.3))' }} />
          <h2 style={{ margin: 0, fontSize: 'clamp(17px, 4vw, 19px)', fontWeight: '600', letterSpacing: '-0.02em' }}>
            {t('aiKnowledge')}
          </h2>
        </div>
        <span style={{
          fontSize: 'clamp(18px, 4vw, 22px)',
          fontWeight: '700',
          background: getBarGradient(score),
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {Math.round(score)}%
        </span>
      </div>

      {/* Barra Zero → Hero: gradiente + animazione fill */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(score)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${t('aiKnowledge')}: ${Math.round(score)}%`}
        style={{
          width: '100%',
          height: '28px',
          backgroundColor: 'rgba(0,0,0,0.35)',
          borderRadius: '14px',
          overflow: 'hidden',
          marginBottom: '12px',
          position: 'relative',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)'
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: getBarGradient(score),
            transition: 'width 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '14px',
            position: 'relative',
            boxShadow: '0 0 20px rgba(255,255,255,0.08)',
            animation: 'heroBarFill 0.8s ease-out'
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '14px',
            background: 'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
            animation: 'heroBarShine 2.5s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          {score > 12 && (
            <span style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '12px',
              fontWeight: '700',
              color: 'rgba(0,0,0,0.7)',
              textShadow: '0 0 1px rgba(255,255,255,0.5)'
            }}>
              {Math.round(score)}%
            </span>
          )}
        </div>
      </div>

      {/* Livello + descrizione. Suggerimenti prioritari (Rosa, Allenatore, Statistiche) sono nel banner setup sopra. */}
      <p style={{
        fontSize: 'clamp(12px, 2.8vw, 14px)',
        color: 'rgba(255,255,255,0.7)',
        margin: 0,
        lineHeight: 1.4
      }}>
        {getLevelText(level)} — {getDescriptionText(level)}
      </p>
    </div>
  )
}
