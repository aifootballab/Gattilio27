'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { Zap, RefreshCw, AlertCircle, Info, ChevronDown } from 'lucide-react'

/**
 * Crediti AI – versione compatta: icona fissa in alto a destra, clic apre popover con dettaglio.
 * Non occupa spazio in pagina; responsive (solo icona + numeri su mobile).
 * Legge POST /api/credits/usage (Bearer). Doc: docs/SISTEMA_CREDITI_AI.md
 */
export default function CreditsBar() {
  const { t, lang } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [noSession, setNoSession] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const fetchUsage = useCallback(async (signal) => {
    try {
      setError(null)
      setNoSession(false)
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }
      const token = await getValidAccessToken()
      if (signal?.aborted) return
      if (!token) {
        setNoSession(true)
        setLoading(false)
        return
      }
      const res = await fetch('/api/credits/usage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        cache: 'no-store',
        ...(signal && { signal })
      })
      if (signal?.aborted) return
      const payload = await safeJsonResponse(res, t('creditsError') || 'Error loading usage')
      if (signal?.aborted) return
      setData(payload)
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.error('[CreditsBar] Error:', err)
      if (!signal?.aborted) setError(err.message || t('creditsError'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ac = new AbortController()
    fetchUsage(ac.signal)
    const interval = setInterval(() => fetchUsage(ac.signal), 45 * 1000)
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchUsage(ac.signal) }
    const onCreditsConsumed = () => fetchUsage(ac.signal)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('credits-consumed', onCreditsConsumed)
    let authUnsub = null
    if (supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setNoSession(false)
          fetchUsage(ac.signal)
        }
      })
      authUnsub = data?.subscription
    }
    return () => {
      ac.abort()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('credits-consumed', onCreditsConsumed)
      authUnsub?.unsubscribe?.()
    }
  }, [fetchUsage])

  // Chiudi popover su click fuori o Escape
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDocClick, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const formatPeriod = (periodKey) => {
    if (!periodKey || periodKey.length < 7) return periodKey
    const [y, m] = periodKey.split('-')
    const monthIndex = parseInt(m, 10) - 1
    const date = new Date(parseInt(y, 10), monthIndex, 1)
    const locale = lang === 'en' ? 'en-GB' : 'it-IT'
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }

  const getBarColor = (percentUsed, overage) => {
    if (overage > 0) return '#ffaa00'
    if (percentUsed >= 95) return '#ff6b00'
    if (percentUsed >= 75) return '#ffaa00'
    return '#00ff88'
  }

  if (noSession) return null

  const used = Number.isFinite(Number(data?.credits_used)) ? Number(data.credits_used) : 0
  const included = Number.isFinite(Number(data?.credits_included)) ? Number(data.credits_included) : 200
  const overage = Math.max(0, Number(data?.overage) || 0)
  const percentIncluded = included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0
  const periodLabel = formatPeriod(data?.period_key)
  const barColor = data ? getBarColor(percentIncluded, overage) : '#00d4ff'

  const compactLabel = loading
    ? null
    : error
      ? t('creditsError') || 'Error'
      : `${used}/${included}`

  const triggerAriaLabel = open ? (t('creditsCloseAria') || (lang === 'en' ? 'Close credits' : 'Chiudi crediti')) : (t('creditsViewAria') || (lang === 'en' ? 'View AI credits' : 'Vedi crediti AI'))

  return (
    <div ref={containerRef} className="credits-bar-pill-wrap">
      <button
        type="button"
        data-tour-id="tour-dashboard-credits"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={triggerAriaLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '9999px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          color: '#e5e5e5',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          fontSize: 'clamp(13px, 2.5vw, 14px)',
          minHeight: '40px'
        }}
      >
        {loading ? (
          <RefreshCw size={18} color="#00d4ff" style={{ animation: 'spin 1s linear infinite' }} />
        ) : error ? (
          <AlertCircle size={18} color="#ff6b00" />
        ) : (
          <Zap size={18} color={barColor} />
        )}
        {compactLabel != null && (
          <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{compactLabel}</span>
        )}
        <ChevronDown
          size={16}
          color="#888"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('creditsTitle')}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: 'min(360px, calc(100vw - 24px))',
            maxHeight: 'min(85vh, 420px)',
            overflowY: 'auto',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: 'clamp(16px, 4vw, 20px)',
            border: '1px solid #2a2a2a',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {loading && !data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#888' }}>
              <RefreshCw size={20} color="#00d4ff" style={{ animation: 'spin 1s linear infinite' }} />
              <span>{t('creditsLoading')}</span>
            </div>
          )}

          {error && !data && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b00' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '14px' }}>{error}</span>
            </div>
          )}

          {data && (
            <>
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
                    <Zap size={20} color={getBarColor(percentIncluded, overage)} />
                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{t('creditsTitle')}</h2>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888', maxWidth: '320px' }}>
                    {t('creditsSubtitle')}
                  </p>
                </div>
                <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>
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
                <span style={{ fontSize: '14px', color: '#ccc' }}>
                  <strong style={{ color: '#fff' }}>{used}</strong> {t('creditsUsed')} /{' '}
                  <strong style={{ color: 'var(--neon-blue)' }}>{included}</strong> {t('creditsIncluded')}
                </span>
                {overage > 0 && (
                  <span style={{ fontSize: '13px', color: '#ffaa00' }}>
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
                role="progressbar"
                aria-valuenow={used}
                aria-valuemin={0}
                aria-valuemax={included}
                aria-label={`${used} ${t('creditsUsed')} ${included} ${t('creditsIncluded')}`}
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
                    fontSize: '12px',
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
