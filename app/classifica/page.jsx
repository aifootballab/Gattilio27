'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Trophy, Zap, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { safeJsonResponse } from '@/lib/fetchHelper'

export default function ClassificaPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [data, setData] = React.useState({ month: '', rankings: [], currentUser: null, daysLeftInMonth: null })
  const [showBreakdown, setShowBreakdown] = React.useState(false)

  const fetchLeaderboard = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: session } = await supabase.auth.getSession()
      const token = session?.session?.access_token
      const headers = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch('/api/leaderboard?' + new URLSearchParams({ month: getCurrentMonth() }), {
        headers,
        cache: 'no-store'
      })
      const payload = await safeJsonResponse(res, t('errorLoadingUsage'))
      if (payload?.error) {
        setError(payload.error)
        return
      }
      setData({
        month: payload.month || '',
        rankings: payload.rankings || [],
        currentUser: payload.currentUser || null,
        daysLeftInMonth: payload.daysLeftInMonth ?? null
      })
    } catch (e) {
      console.error('[Classifica]', e)
      setError(t('errorLoadingUsage'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  function getCurrentMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  function formatMonth(ym) {
    if (!ym) return ''
    const [y, m] = ym.split('-')
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1)
    return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { month: 'long', year: 'numeric' })
  }

  const currentUser = data.currentUser
  const rankingsRaw = data.rankings || []
  // Se l'API restituisce la tua posizione ma la lista è vuota (es. snapshot non sincronizzato), mostra almeno te
  const rankings = rankingsRaw.length > 0
    ? rankingsRaw
    : currentUser
      ? [{ rank: currentUser.rank, nickname: t('you') || 'Tu', points: currentUser.points }]
      : []

  return (
    <main style={{
      padding: 'clamp(12px, 4vw, 24px)',
      minHeight: '100vh',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        paddingBottom: '8px',
        paddingTop: '4px',
        background: 'rgba(10, 10, 18, 0.92)',
        backdropFilter: 'blur(8px)',
              }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', display: 'flex' }}
            aria-label={t('back')}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="neon-text" style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={28} color="var(--neon-orange)" />
            {t('classificaMensile')}
          </h1>
        </div>
        <LanguageSwitch />
      </div>

      {error && (
        <div role="alert" style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          color: '#fca5a5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <span>{error}</span>
          <button type="button" onClick={() => { setError(null); fetchLeaderboard() }} className="btn" style={{ padding: '6px 12px', fontSize: '14px' }}>
            {t('retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'clamp(48px, 10vw, 80px)', color: 'var(--neon-blue)' }}>
          <div style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} aria-hidden="true">
            <Trophy size={48} />
          </div>
          <p style={{ marginTop: '16px', fontSize: '18px' }}>{t('creditsLoading')}</p>
        </div>
      ) : (
        <>
          {/* Countdown + Hero */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(255,140,0,0.18), rgba(0,212,255,0.08))',
            borderColor: 'rgba(255,165,0,0.5)',
            marginBottom: '24px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              {t('fromZeroToHero')} · {formatMonth(data.month)}
            </div>
            {data.daysLeftInMonth != null && (
              <div style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                {data.daysLeftInMonth} {t('giorniAllaFineMese')}
              </div>
            )}
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
              {t('comeSalireHint')}
            </p>
          </div>

          {/* La tua posizione */}
          {currentUser && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,212,255,0.04))',
              borderColor: 'rgba(0,212,255,0.45)',
              marginBottom: '24px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--neon-blue)',
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 800
                }}>
                  {currentUser.rank}
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>{t('laTuaPosizione')}</div>
                  <div style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 700, color: '#fff' }}>
                    {currentUser.points} {t('puntiCoach')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '8px 14px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {t('breakdownPunti')}
                {showBreakdown ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          )}

          {currentUser && showBreakdown && currentUser.pointsBreakdown && (
            <div className="card" style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                {[
                  { key: 'matches', label: t('daPartite') },
                  { key: 'tasks', label: t('daObiettivi') },
                  { key: 'usage_ia', label: t('daUtilizzoIA') },
                  { key: 'profile', label: t('daProfilo') },
                  { key: 'improvement', label: t('daMiglioramento') }
                ].map(({ key, label }) => (
                  <div key={key} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                      {Number(currentUser.pointsBreakdown[key]) || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabella classifica */}
          <section className="card" style={{ padding: '0', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={20} color="var(--neon-orange)" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('classifica')}</h2>
            </div>
            {rankings.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '15px' }}>
                {t('nonInClassifica')}
                <p style={{ marginTop: '12px', fontSize: '14px' }}>{t('entraInClassifica')}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '280px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: 600 }} scope="col">{t('posizione')}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: 600 }}>{t('nickname')}</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', fontWeight: 600 }}>{t('punti')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((row, idx) => {
                      const isYou = currentUser && row.rank === currentUser.rank && row.points === currentUser.points
                      return (
                        <tr
                          key={`${row.rank}-${(row.nickname || '').slice(0, 20)}-${row.points}`}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: isYou ? 'rgba(0,212,255,0.12)' : (idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent')
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: isYou ? 'var(--neon-blue)' : '#fff', fontSize: '16px' }}>
                            {row.rank <= 3 && <span style={{ marginRight: '6px' }}>{['🥇', '🥈', '🥉'][row.rank - 1]}</span>}
                            {row.rank}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#fff', fontWeight: isYou ? 600 : 400 }}>{row.nickname || '—'}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--neon-orange)' }}>{row.points}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* CTA Come salire */}
          <Link
            href="/"
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '20px',
              textDecoration: 'none',
              background: 'rgba(34,197,94,0.08)',
              borderColor: 'rgba(34,197,94,0.4)',
              color: '#fff'
            }}
          >
            <Zap size={28} color="#22c55e" />
            <div>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{t('comeSalire')}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{t('comeSalireHint')}</div>
            </div>
          </Link>
        </>
      )}
    </main>
  )
}
