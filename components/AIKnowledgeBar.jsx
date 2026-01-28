'use client'

import React, { useState, useEffect } from 'react'
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
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState('beginner')
  const [breakdown, setBreakdown] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Solo lato client per evitare hydration mismatch
    if (typeof window === 'undefined') return
    
    fetchAIKnowledge()
    
    // Cache locale: ricarica ogni 5 minuti
    const interval = setInterval(() => {
      fetchAIKnowledge()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const fetchAIKnowledge = async () => {
    try {
      setError(null)
      
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpired') || 'Session expired')
      }

      const token = session.session.access_token

      const res = await fetch('/api/ai-knowledge', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await safeJsonResponse(res, 'Failed to fetch AI knowledge')
      setScore(data.score || 0)
      setLevel(data.level || 'beginner')
      setBreakdown(data.breakdown || {})
    } catch (err) {
      console.error('[AIKnowledgeBar] Error fetching:', err)
      setError(err.message || 'Error loading AI knowledge')
    } finally {
      setLoading(false)
    }
  }

  const getColorForScore = (score) => {
    if (score >= 81) return '#00ff88' // Verde
    if (score >= 61) return '#00d4ff' // Blu
    if (score >= 31) return '#ffaa00' // Arancione
    return '#ff6b00' // Rosso/Arancione
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
        return t('aiKnowledgeDescriptionExpert') || t('aiKnowledgeDescription') || 'L\'IA ti conosce perfettamente'
      case 'advanced':
        return t('aiKnowledgeDescriptionAdvanced') || t('aiKnowledgeDescription') || 'L\'IA ti conosce molto bene'
      case 'intermediate':
        return t('aiKnowledgeDescriptionIntermediate') || t('aiKnowledgeDescription') || 'L\'IA ti conosce abbastanza bene'
      default:
        return t('aiKnowledgeDescriptionBeginner') || t('aiKnowledgeDescription') || 'L\'IA sta imparando a conoscerti'
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
            {t('loading') || 'Loading...'}
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
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: 'clamp(16px, 4vw, 20px)',
      marginBottom: '24px',
      border: '1px solid #2a2a2a'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={20} color="#00d4ff" />
          <h2 style={{
            margin: 0,
            fontSize: 'clamp(16px, 4vw, 18px)',
            fontWeight: '600'
          }}>
            {t('aiKnowledge') || 'Conoscenza AI'}
          </h2>
        </div>
        <span style={{
          fontSize: 'clamp(14px, 3vw, 16px)',
          color: '#888',
          fontWeight: '600'
        }}>
          {Math.round(score)}%
        </span>
      </div>

      {/* Progress Bar - IDENTICO a profilazione */}
      <div style={{
        width: '100%',
        height: '24px',
        backgroundColor: '#2a2a2a',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
        position: 'relative'
      }}>
        <div style={{
          width: `${score}%`,
          height: '100%',
          backgroundColor: getColorForScore(score),
          transition: 'width 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '8px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#000'
        }}>
          {score > 10 && `${Math.round(score)}%`}
        </div>
      </div>

      {/* Level Badge */}
      <div style={{
        fontSize: 'clamp(12px, 3vw, 14px)',
        color: '#888',
        marginBottom: '8px'
      }}>
        {getLevelText(level)} - {getDescriptionText(level)}
      </div>

      {/* Breakdown (Espandibile) */}
      <details 
        style={{
          fontSize: 'clamp(11px, 3vw, 13px)',
          color: '#666',
          marginTop: '8px'
        }}
        open={showDetails}
        onToggle={(e) => setShowDetails(e.target.open)}
      >
        <summary style={{
          cursor: 'pointer',
          marginBottom: '8px',
          color: '#888',
          userSelect: 'none'
        }}>
          {t('viewDetails') || 'Vedi dettagli'}
        </summary>
        <div style={{
          marginTop: '8px',
          paddingLeft: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div>Profilo: {Math.round(breakdown.profile || 0)}/20</div>
          <div>Rosa: {Math.round(breakdown.roster || 0)}/25</div>
          <div>Partite: {Math.round(breakdown.matches || 0)}/30</div>
          <div>Pattern: {Math.round(breakdown.patterns || 0)}/15</div>
          <div>Allenatore: {Math.round(breakdown.coach || 0)}/10</div>
          <div>Utilizzo: {Math.round(breakdown.usage || 0)}/10</div>
          <div>Successi: {Math.round(breakdown.success || 0)}/15</div>
        </div>
      </details>

      {/* CTA se score basso */}
      {score < 50 && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: 'rgba(255, 165, 0, 0.1)',
          borderRadius: '8px',
          fontSize: 'clamp(11px, 3vw, 13px)',
          color: '#ffaa00'
        }}>
          💡 {t('completeProfileToIncreaseKnowledge') || 'Completa il profilo per aumentare la conoscenza dell\'IA'}
        </div>
      )}
    </div>
  )
}
