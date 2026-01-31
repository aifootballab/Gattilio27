'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { Zap, RefreshCw, AlertCircle, Info } from 'lucide-react'

/**
 * Barra crediti AI – utilizzo mensile (inclusi + overage).
 * Design enterprise, orientato al cliente: chiarezza su usati/inclusi e periodo.
 * Stile coerente con AIKnowledgeBar (card scura, bordo, neon).
 */
export default function CreditsBar() {
  const { t, lang } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUsage = useCallback(async () => {
    try {
      setError(null)
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpired') || 'Session expired')
      }
      const res = await fetch('/api/credits/usage', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const payload = await safeJsonResponse(res, t('creditsError') || 'Error loading usage')
      setData(payload)
    } catch (err) {
      console.error('[CreditsBar] Error:', err)
      setError(err.message || t('creditsError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (typeof window === 'undefined') return
    fetchUsage()
    const interval = setInterval(fetchUsage, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchUsage])

  const formatPeriod = (periodKey) => {
    if (!periodKey || periodKey.length < 7) return periodKey
    const [y, m] = periodKey.split('-')
    const monthIndex = parseInt(m, 10) - 1
    const date = new Date(parseInt(y, 10), monthIndex, 1)
    const locale = lang === 'en' ? 'en-GB' : 'it-IT'
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }

  const getBarColor = (percentUsed, overage) => {
    if (overage > 0) return '#ffaa00' // amber quando oltre il piano
    if (percentUsed >= 95) return '#ff6b00'
    if (percentUsed >= 75) return '#ffaa00'
    return '#00ff88'
  }

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: 'clamp(16px, 4vw, 20px)',
          marginBottom: '24px',
          border: '1px solid #2a2a2a'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={20} color="#00d4ff" style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#888' }}>
            {t('creditsLoading')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: 'clamp(16px, 4vw, 20px)',
          marginBottom: '24px',
          border: '1px solid #2a2a2a'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b00' }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: 'clamp(13px, 3vw, 14px)' }}>{error}</span>
        </div>
      </div>
    )
  }

  const used = data?.credits_used ?? 0
  const included = data?.credits_included ?? 200
  const overage = data?.overage ?? 0
  const percentIncluded = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0
  const periodLabel = formatPeriod(data?.period_key)

  return (
    <div
      style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: 'clamp(16px, 4vw, 20px)',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Zap size={20} color="#00ff88" />
            <h2 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '600' }}>
              {t('creditsTitle')}
            </h2>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 'clamp(12px, 2.5vw, 13px)',
              color: '#888',
              maxWidth: '420px'
            }}
          >
            {t('creditsSubtitle')}
          </p>
        </div>
        <div
          style={{
            fontSize: 'clamp(13px, 3vw, 14px)',
            color: '#888',
            whiteSpace: 'nowrap'
          }}
        >
          {t('creditsPeriod')}: {periodLabel}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '10px',
          flexWrap: 'wrap',
          gap: '4px'
        }}
      >
        <span style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#ccc' }}>
          <strong style={{ color: '#fff' }}>{used}</strong> {t('creditsUsed')} /{' '}
          <strong style={{ color: 'var(--neon-blue)' }}>{included}</strong> {t('creditsIncluded')}
        </span>
        {overage > 0 && (
          <span style={{ fontSize: 'clamp(13px, 3vw, 14px)', color: '#ffaa00' }}>
            +{overage} {t('creditsOverage')}
          </span>
        )}
      </div>

      <div
        style={{
          width: '100%',
          height: '20px',
          backgroundColor: '#2a2a2a',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            width: `${percentIncluded}%`,
            height: '100%',
            backgroundColor: getBarColor(percentIncluded, overage),
            transition: 'width 0.35s ease, background-color 0.2s ease',
            borderRadius: '10px 0 0 10px'
          }}
        />
      </div>

      {overage > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            backgroundColor: 'rgba(255, 170, 0, 0.08)',
            borderRadius: '8px',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            color: '#ffaa00',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}
        >
          <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{t('creditsOverageHint')}</span>
        </div>
      )}
    </div>
  )
}
