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

const CHART_HEIGHT = 200
const BAR_GROUP_GAP = 12
const Y_AXIS_WIDTH = 36

function ChartCard({ title, series, isPercent }) {
  const maxVal = Math.max(
    ...series.flatMap(({ tu, div1 }) => [tu ?? 0, div1]),
    1
  )
  const scaleMax = isPercent ? 100 : Math.ceil(maxVal * 1.1)
  const formatVal = (v) => (v == null ? '—' : isPercent ? `${Math.round(v)}%` : String(Math.round(v)))

  return (
    <div className="card" style={{
      padding: '20px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>{title}</h3>
      {/* Legenda */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '3px', background: 'var(--neon-blue, #00d4ff)' }} />
          Tu
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '3px', background: 'rgba(34, 197, 94, 0.85)' }} />
          Top
        </span>
      </div>
      {/* Grafico a barre verticali con asse Y */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, minHeight: CHART_HEIGHT + 48 }}>
        {/* Asse Y */}
        <div style={{
          width: Y_AXIS_WIDTH,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingRight: '8px',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'right'
        }}>
          {[scaleMax, Math.round(scaleMax * 0.75), Math.round(scaleMax * 0.5), Math.round(scaleMax * 0.25), 0].map((tick) => (
            <span key={tick}>{isPercent ? `${tick}%` : tick}</span>
          ))}
        </div>
        {/* Area grafico + griglia */}
        <div style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)'
        }}>
          {/* Linee di griglia orizzontali */}
          {[0.25, 0.5, 0.75].map((p) => (
            <div
              key={p}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${(1 - p) * 100}%`,
                height: '1px',
                background: 'rgba(255,255,255,0.06)'
              }}
            />
          ))}
          {/* Barre: una colonna per metrica, due barre (Tu, Top) affiancate */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
            gap: BAR_GROUP_GAP,
            height: CHART_HEIGHT,
            padding: '0 8px 0 12px'
          }}>
            {series.map(({ label, tu, div1 }) => {
              const tuH = scaleMax > 0 && tu != null ? (tu / scaleMax) * CHART_HEIGHT : 0
              const topH = scaleMax > 0 ? (div1 / scaleMax) * CHART_HEIGHT : 0
              return (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    maxWidth: 80,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: CHART_HEIGHT, width: '100%', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: '50%',
                        minWidth: '16px',
                        height: `${Math.max(0, tuH)}px`,
                        minHeight: tu != null && tu > 0 ? '4px' : 0,
                        background: 'var(--neon-blue, #00d4ff)',
                        borderRadius: '4px 4px 0 0'
                      }}
                      title={formatVal(tu)}
                    />
                    <div
                      style={{
                        width: '50%',
                        minWidth: '16px',
                        height: `${Math.max(0, topH)}px`,
                        minHeight: div1 > 0 ? '4px' : 0,
                        background: 'rgba(34, 197, 94, 0.85)',
                        borderRadius: '4px 4px 0 0'
                      }}
                      title={formatVal(div1)}
                    />
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* Valori sotto le barre (opzionale, per leggibilità) */}
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: BAR_GROUP_GAP, marginTop: '8px', paddingLeft: Y_AXIS_WIDTH + 8, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
        {series.map(({ label, tu, div1 }) => (
          <div key={label} style={{ flex: 1, minWidth: 0, maxWidth: 80, display: 'flex', gap: '4px', justifyContent: 'center' }}>
            <span style={{ width: '50%', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{formatVal(tu)}</span>
            <span style={{ width: '50%', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{formatVal(div1)}</span>
          </div>
        ))}
      </div>
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
                href="/?openAssistantChat=1"
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
