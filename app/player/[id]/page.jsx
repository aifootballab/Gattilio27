'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, User, Target, Zap, Shield, Activity, Award, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function PlayerDetailPage() {
  const params = useParams()
  const { t, lang, changeLanguage } = useTranslation()
  const [player, setPlayer] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [authStatus, setAuthStatus] = React.useState({ ready: false, token: null })

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        if (!supabase) {
          setAuthStatus({ ready: true, token: null })
          return
        }
        
        let { data } = await supabase.auth.getSession()
        if (!data?.session?.access_token) {
          const { data: signInData } = await supabase.auth.signInAnonymously()
          data = signInData
        }
        
        setAuthStatus({
          ready: true,
          token: data?.session?.access_token || null,
        })
      } catch (err) {
        console.error('[PlayerDetail] Auth init failed:', err)
        setAuthStatus({ ready: true, token: null })
      }
    }
    
    initAuth()
  }, [])

  React.useEffect(() => {
    if (!authStatus.ready || !authStatus.token) return

    const fetchPlayer = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/supabase/get-my-players', {
          headers: { Authorization: `Bearer ${authStatus.token}` },
        })
        const apiData = await res.json()
        
        if (!res.ok) {
          throw new Error(apiData?.error || 'Failed to fetch player')
        }
        
        const found = apiData.players?.find(p => p.build_id === params.id)
        if (!found) {
          throw new Error(lang === 'it' ? 'Giocatore non trovato' : 'Player not found')
        }
        
        setPlayer(found)
      } catch (err) {
        console.error('[PlayerDetail] Fetch failed:', err)
        setError(err?.message || (lang === 'it' ? 'Errore caricamento giocatore' : 'Error loading player'))
      } finally {
        setLoading(false)
      }
    }
    
    fetchPlayer()
  }, [authStatus.ready, authStatus.token, params.id, lang])

  if (loading) {
    return (
      <main className="container" style={{ padding: '40px 24px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="neon-text" style={{ fontSize: '24px' }}>{t('loading')}</div>
        </div>
      </main>
    )
  }

  if (error || !player) {
    return (
      <main className="container" style={{ padding: '40px 24px', minHeight: '100vh' }}>
        <Link href="/my-players" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <ArrowLeft size={16} />
          {lang === 'it' ? 'Torna ai Giocatori' : 'Back to Players'}
        </Link>
        <div className="error" style={{ padding: '24px', textAlign: 'center' }}>
          {error || (lang === 'it' ? 'Giocatore non trovato' : 'Player not found')}
        </div>
      </main>
    )
  }

  return <PlayerDetailView player={player} t={t} lang={lang} changeLanguage={changeLanguage} />
}

function PlayerDetailView({ player, t, lang, changeLanguage }) {
  const baseStats = player.base_stats || {}
  const attacking = baseStats.attacking || {}
  const defending = baseStats.defending || {}
  const athleticism = baseStats.athleticism || {}
  const metadata = player.metadata || {}

  return (
    <main className="container" style={{ padding: '24px', minHeight: '100vh' }}>
      {/* Language Switcher */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        background: 'rgba(10, 14, 39, 0.9)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <button
          onClick={() => changeLanguage('it')}
          style={{
            padding: '6px 12px',
            background: lang === 'it' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            color: lang === 'it' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          IT
        </button>
        <button
          onClick={() => changeLanguage('en')}
          style={{
            padding: '6px 12px',
            background: lang === 'en' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            color: lang === 'en' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          EN
        </button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link href="/my-players" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ArrowLeft size={16} />
          {lang === 'it' ? 'Torna ai Giocatori' : 'Back to Players'}
        </Link>
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Player Card Visual */}
          <div className="neon-panel" style={{ minWidth: '200px', textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '120px',
              height: '160px',
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(168, 85, 247, 0.2))',
              borderRadius: '12px',
              border: '2px solid var(--neon-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-blue)'
            }}>
              <User size={64} style={{ color: 'var(--neon-blue)' }} />
            </div>
            <div className="neon-text" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              {player.player_name}
            </div>
            {player.overall_rating && (
              <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--neon-blue)', textShadow: 'var(--text-glow-blue)' }}>
                {player.overall_rating}
              </div>
            )}
          </div>

          {/* Player Info */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h1 className="neon-text" style={{ fontSize: '36px', fontWeight: 700, marginBottom: '12px' }}>
              {player.player_name}
            </h1>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {player.position && (
                <div style={{ padding: '8px 16px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid var(--neon-blue)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'it' ? 'Posizione' : 'Position'}</div>
                  <div style={{ fontWeight: 600 }}>{player.position}</div>
                </div>
              )}
              {player.role && (
                <div style={{ padding: '8px 16px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--neon-purple)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{t('role')}</div>
                  <div style={{ fontWeight: 600 }}>{player.role}</div>
                </div>
              )}
              {player.card_type && (
                <div style={{ padding: '8px 16px', background: 'rgba(236, 72, 153, 0.1)', border: '1px solid var(--neon-pink)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{t('card')}</div>
                  <div style={{ fontWeight: 600 }}>{player.card_type}</div>
                </div>
              )}
            </div>

            {/* Physical Attributes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {player.height && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{lang === 'it' ? 'Altezza' : 'Height'}</div>
                  <div style={{ fontWeight: 600 }}>{player.height} cm</div>
                </div>
              )}
              {player.weight && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{lang === 'it' ? 'Peso' : 'Weight'}</div>
                  <div style={{ fontWeight: 600 }}>{player.weight} kg</div>
                </div>
              )}
              {player.age && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('age')}</div>
                  <div style={{ fontWeight: 600 }}>{player.age}</div>
                </div>
              )}
              {player.nationality && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('nationality')}</div>
                  <div style={{ fontWeight: 600 }}>{player.nationality}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Attacking Stats */}
        {Object.keys(attacking).length > 0 && (
          <StatsSection 
            title={lang === 'it' ? 'Attacco' : 'Attack'} 
            icon={<Zap size={20} />}
            stats={attacking}
            color="blue"
          />
        )}

        {/* Defending Stats */}
        {Object.keys(defending).length > 0 && (
          <StatsSection 
            title={lang === 'it' ? 'Difesa' : 'Defense'} 
            icon={<Shield size={20} />}
            stats={defending}
            color="purple"
          />
        )}

        {/* Athleticism Stats */}
        {Object.keys(athleticism).length > 0 && (
          <StatsSection 
            title={lang === 'it' ? 'Forza' : 'Strength'} 
            icon={<Activity size={20} />}
            stats={athleticism}
            color="orange"
          />
        )}
      </div>

      {/* Skills & Characteristics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Player Skills */}
        {Array.isArray(player.skills) && player.skills.length > 0 && (
          <div className="neon-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Award size={20} style={{ color: 'var(--neon-blue)' }} />
              {lang === 'it' ? 'Abilità Giocatore' : 'Player Skills'}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {player.skills.map((skill, idx) => (
                <span key={idx} style={{
                  padding: '6px 12px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid var(--neon-blue)',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Additional Skills */}
        {Array.isArray(player.com_skills) && player.com_skills.length > 0 && (
          <div className="neon-panel">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingUp size={20} style={{ color: 'var(--neon-purple)' }} />
              {lang === 'it' ? 'Abilità Aggiuntive' : 'Additional Skills'}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {player.com_skills.map((skill, idx) => (
                <span key={idx} style={{
                  padding: '6px 12px',
                  background: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid var(--neon-purple)',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Boosters */}
      {Array.isArray(player.available_boosters) && player.available_boosters.length > 0 && (
        <div className="neon-panel" style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>{lang === 'it' ? 'Boosters' : 'Boosters'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {player.available_boosters.map((booster, idx) => (
              <div key={idx} style={{
                padding: '16px',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid var(--neon-blue)',
                borderRadius: '8px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--neon-blue)' }}>
                  {booster.name || `Booster ${idx + 1}`}
                </div>
                {booster.effect && (
                  <div style={{ fontSize: '14px', marginBottom: '4px' }}>{booster.effect}</div>
                )}
                {booster.activation_condition && (
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {lang === 'it' ? 'Condizione:' : 'Condition:'} {booster.activation_condition}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Characteristics */}
      {(metadata.weak_foot_frequency || metadata.weak_foot_accuracy || metadata.form_detailed || metadata.injury_resistance) && (
        <div className="neon-panel">
          <h3 style={{ marginBottom: '16px' }}>{lang === 'it' ? 'Caratteristiche' : 'Characteristics'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {metadata.weak_foot_frequency && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                  {lang === 'it' ? 'Frequenza piede debole' : 'Weak foot frequency'}
                </div>
                <div style={{ fontWeight: 600 }}>{metadata.weak_foot_frequency}</div>
              </div>
            )}
            {metadata.weak_foot_accuracy && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                  {lang === 'it' ? 'Precisione piede debole' : 'Weak foot accuracy'}
                </div>
                <div style={{ fontWeight: 600 }}>{metadata.weak_foot_accuracy}</div>
              </div>
            )}
            {metadata.form_detailed && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                  {lang === 'it' ? 'Forma' : 'Form'}
                </div>
                <div style={{ fontWeight: 600 }}>{metadata.form_detailed}</div>
              </div>
            )}
            {metadata.injury_resistance && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                  {lang === 'it' ? 'Resistenza infortuni' : 'Injury resistance'}
                </div>
                <div style={{ fontWeight: 600 }}>{metadata.injury_resistance}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

function StatsSection({ title, icon, stats, color }) {
  const colorMap = {
    blue: 'var(--neon-blue)',
    purple: 'var(--neon-purple)',
    orange: 'var(--neon-orange)'
  }
  const bgColor = color === 'blue' ? 'rgba(0, 212, 255, 0.1)' : color === 'purple' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 107, 53, 0.1)'
  const borderColor = colorMap[color]

  return (
    <div className="neon-panel">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: colorMap[color] }}>
        {icon}
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Object.entries(stats).map(([key, value]) => (
          value !== null && value !== undefined && (
            <div key={key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '6px'
            }}>
              <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </span>
              <span style={{ fontWeight: 700, color: colorMap[color] }}>{value}</span>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
