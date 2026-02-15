'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { getBenchmarkComparison, BENCHMARK_CATEGORIES } from '@/lib/gameAnalysisBenchmark'
import GameAnalysisModal from '@/components/GameAnalysisModal'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, BarChart3, MessageCircle, RefreshCw } from 'lucide-react'

const CATEGORY_KEYS = {
  shot_usage: 'chartsCategoryShot',
  passing: 'chartsCategoryPassing',
  dribbling: 'chartsCategoryDribbling',
  defense: 'chartsCategoryDefense',
  special_commands: 'chartsCategorySpecialCommands'
}

function ComparisonBar({ label, tu, top, maxVal, isPercent }) {
  const formatVal = (v) => (v == null ? '—' : isPercent ? `${Math.round(v)}%` : String(Math.round(v)))
  const tuWidth = maxVal > 0 && tu != null ? Math.min(100, (tu / maxVal) * 100) : 0
  const topWidth = maxVal > 0 ? Math.min(100, (top / maxVal) * 100) : 0
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(70px,100px) minmax(70px,100px)',
      gap: 'clamp(8px, 2vw, 12px)',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      fontSize: 'clamp(12px, 2.5vw, 13px)'
    }}>
      <span style={{ color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          flex: 1,
          height: '20px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${tuWidth}%`,
            height: '100%',
            background: 'var(--neon-blue, #00d4ff)',
            borderRadius: '4px',
            minWidth: tu != null && tu > 0 ? '4px' : 0
          }} />
        </div>
        <span style={{ width: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.85)' }}>{formatVal(tu)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          flex: 1,
          height: '20px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${topWidth}%`,
            height: '100%',
            background: 'rgba(34, 197, 94, 0.6)',
            borderRadius: '4px',
            minWidth: top > 0 ? '4px' : 0
          }} />
        </div>
        <span style={{ width: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.6)' }}>{formatVal(top)}</span>
      </div>
    </div>
  )
}

function ChartCard({ title, series, isPercent }) {
  const maxVal = Math.max(
    ...series.flatMap(({ tu, div1 }) => [tu ?? 0, div1]),
    1
  )
  return (
    <div className="card" style={{
      padding: '20px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(70px,100px) minmax(70px,100px)', gap: 'clamp(8px, 2vw, 12px)', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.5)' }}>
        <span> </span>
        <span>Tu</span>
        <span>Top</span>
      </div>
      {series.map(({ label, tu, div1 }) => (
        <ComparisonBar key={label} label={label} tu={tu} top={div1} maxVal={maxVal} isPercent={isPercent} />
      ))}
    </div>
  )
}

export default function GraficiComparazionePage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState(null)
  const [capturedAt, setCapturedAt] = React.useState(null)
  const [showModal, setShowModal] = React.useState(false)
  const mounted = React.useRef(true)

  const fetchData = React.useCallback(async () => {
    if (!supabase) return
    try {
      const token = await getValidAccessToken()
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch('/api/extract-game-analysis', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!mounted.current) return
      if (data.error || !res.ok) {
        setStats(null)
        setCapturedAt(null)
      } else if (data.stats && typeof data.stats === 'object' && Object.keys(data.stats).length > 0) {
        setStats(data.stats)
        if (data.captured_at) {
          const d = new Date(data.captured_at)
          setCapturedAt(isNaN(d.getTime()) ? data.captured_at : d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short', year: 'numeric' }))
        } else setCapturedAt(null)
      } else {
        setStats(null)
        setCapturedAt(null)
      }
    } catch (_) {
      if (mounted.current) setStats(null)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [router, lang])

  React.useEffect(() => {
    mounted.current = true
    fetchData()
    return () => { mounted.current = false }
  }, [fetchData])

  const comparison = stats ? getBenchmarkComparison(stats) : null
  const hasCharts = comparison && BENCHMARK_CATEGORIES.some(cat => (comparison[cat]?.length ?? 0) > 0)
  const isPercentCategories = { shot_usage: true, passing: true, dribbling: true, defense: true, special_commands: false }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark, #0a0a0f)', color: '#fff' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="btn"
            style={{ padding: '8px', background: 'transparent', borderColor: 'rgba(255,255,255,0.2)' }}
            aria-label={t('back')}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={22} style={{ color: 'var(--neon-blue)' }} />
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('chartsAndComparisonTitle')}</h1>
          </div>
        </div>
        <LanguageSwitch />
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(16px, 4vw, 24px) clamp(16px, 4vw, 20px)' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', color: 'rgba(255,255,255,0.5)' }}>
            <RefreshCw size={24} className="grafici-comparazione-spinner" />
          </div>
        ) : !hasCharts ? (
          <div className="card" style={{
            padding: '32px 24px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px'
          }}>
            <BarChart3 size={48} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }} />
            <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.8)', fontSize: '15px', lineHeight: 1.5 }}>
              {t('chartsAndComparisonEmpty')}
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="btn"
              style={{
                background: 'var(--neon-green, #22c55e)',
                color: '#0a0a0f',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              {t('chartsAndComparisonCta')}
            </button>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
              {t('chartsAndComparisonSubtitle')}
              {capturedAt && (
                <span style={{ marginLeft: '8px', opacity: 0.8 }}> · {t('gameAnalysisLastCapture')}: {capturedAt}</span>
              )}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {BENCHMARK_CATEGORIES.map((cat) => {
                const series = comparison?.[cat]
                if (!series?.length) return null
                return (
                  <ChartCard
                    key={cat}
                    title={t(CATEGORY_KEYS[cat] || cat)}
                    series={series}
                    isPercent={isPercentCategories[cat]}
                  />
                )
              })}
            </div>
            <div style={{ marginTop: '32px', textAlign: 'center' }}>
              <Link
                href="/?openCoach=1"
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'rgba(255, 165, 0, 0.15)',
                  borderColor: 'rgba(255, 165, 0, 0.4)',
                  color: 'var(--neon-orange)'
                }}
              >
                <MessageCircle size={18} />
                {t('chartsAndComparisonAskCoach')}
              </Link>
            </div>
          </>
        )}
      </main>

      <GameAnalysisModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={async () => {
          await Promise.resolve()
          fetchData()
          setShowModal(false)
        }}
        lastCaptureDate={capturedAt}
      />

      <style dangerouslySetInnerHTML={{ __html: '.grafici-comparazione-spinner { animation: grafici-spin 1s linear infinite; } @keyframes grafici-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' }} />
    </div>
  )
}
