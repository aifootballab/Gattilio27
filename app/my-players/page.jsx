'use client'

import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Users, Upload, ChevronDown, ChevronUp, Edit, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function MyPlayersPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const [players, setPlayers] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [authStatus, setAuthStatus] = React.useState({ ready: false, userId: null, token: null })

  React.useEffect(() => {
    const initAnon = async () => {
      try {
        if (!supabase) {
          setAuthStatus({ ready: true, userId: null, token: null })
          return
        }
        
        let { data } = await supabase.auth.getSession()
        if (!data?.session?.access_token) {
          const { data: signInData } = await supabase.auth.signInAnonymously()
          data = signInData
        }
        
        setAuthStatus({
          ready: true,
          userId: data?.session?.user?.id || null,
          token: data?.session?.access_token || null,
        })
      } catch (err) {
        setAuthStatus({ ready: true, userId: null, token: null })
      }
    }
    initAnon()
  }, [])

  React.useEffect(() => {
    if (!authStatus.ready || !authStatus.token) return

    const fetchPlayers = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/supabase/get-my-players', {
          headers: { Authorization: `Bearer ${authStatus.token}` },
        })
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data?.error || `Failed to fetch players (${res.status})`)
        }
        
        setPlayers(Array.isArray(data.players) ? data.players : [])
      } catch (err) {
        setError(err?.message || (lang === 'it' ? 'Errore caricamento giocatori' : 'Error loading players'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [authStatus.ready, authStatus.token, lang])

  return (
    <main className="container" style={{ padding: '32px 24px', minHeight: '100vh' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="neon-text" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={32} />
            {t('myPlayers')}
          </h1>
          <p style={{ opacity: 0.8, fontSize: '14px' }}>
            {loading ? t('loading') : `${players.length} ${t('playersSaved')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={16} />
            {t('backToDashboard')}
          </Link>
          <Link href="/rosa" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} />
            {t('backToSquad')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {t('error')}: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.7 }}>
          <Loader2 size={32} className="spin" style={{ marginBottom: '16px', color: 'var(--neon-blue)' }} />
          <div className="neon-text" style={{ fontSize: '18px' }}>{t('loading')}</div>
        </div>
      ) : players.length === 0 ? (
        <div className="neon-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Users size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--neon-blue)' }} />
          <div className="neon-text" style={{ fontSize: '24px', marginBottom: '12px' }}>
            {t('noPlayersSaved')}
          </div>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            {t('uploadScreenshotsToSee')}
          </p>
          <Link href="/rosa" className="btn primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} />
            {t('uploadScreenshots')}
          </Link>
        </div>
      ) : (
        <div className="grid-futuristic">
          {players.map((player) => (
            <PlayerCard key={player.build_id} player={player} t={t} lang={lang} />
          ))}
        </div>
      )}
    </main>
  )
}

function PlayerCard({ player, t, lang }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  
  const completeness = player.completeness || { percentage: 0, missing: [] }
  const isComplete = completeness.percentage === 100

  return (
    <div className="player-card-futuristic">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 className="neon-text" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
            {player.player_name}
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {player.overall_rating && (
              <span className="neon-text" style={{ fontSize: '18px', fontWeight: 700 }}>
                OVR {player.overall_rating}
              </span>
            )}
            {player.position && (
              <span style={{ opacity: 0.8, fontSize: '14px' }}>{player.position}</span>
            )}
            {player.role && (
              <span style={{ opacity: 0.7, fontSize: '12px' }}>· {player.role}</span>
            )}
          </div>
        </div>
        {player.overall_rating && (
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: 'var(--neon-blue)',
            textShadow: 'var(--text-glow-blue)'
          }}>
            {player.overall_rating}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div className={`completeness-badge ${isComplete ? 'complete' : 'incomplete'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isComplete ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{completeness.percentage}% {t('complete')}</span>
          {!isComplete && completeness.missing.length > 0 && (
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              {t('missingFields')}: {completeness.missing.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px', 
        marginBottom: '16px',
        fontSize: '12px',
        opacity: 0.9
      }}>
        {player.team && <div><strong>{lang === 'it' ? 'Team' : 'Team'}:</strong> {player.team}</div>}
        {player.card_type && <div><strong>{t('card')}:</strong> {player.card_type}</div>}
        {player.level && <div><strong>{lang === 'it' ? 'Livello' : 'Level'}:</strong> {player.level}/{player.level_cap || '?'}</div>}
        {player.booster && <div><strong>{t('boosters')}:</strong> {player.booster}</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button 
          className="btn small" 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? t('hide') : t('details')}
        </button>
        <button className="btn small primary" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Edit size={14} />
          {t('edit')}
        </button>
      </div>

      {isExpanded && (
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: 'rgba(0, 0, 0, 0.3)', 
          borderRadius: '12px',
          border: '1px solid rgba(0, 212, 255, 0.2)'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.8' }}>
            {player.nationality && <div><strong>{t('nationality')}:</strong> {player.nationality}</div>}
            {player.height && player.weight && (
              <div><strong>{t('physical')}:</strong> {player.height}cm, {player.weight}kg</div>
            )}
            {player.age && <div><strong>{t('age')}:</strong> {player.age}</div>}
            {player.form && <div><strong>{t('form')}:</strong> {player.form}</div>}
            {Array.isArray(player.skills) && player.skills.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <strong>{t('skills')}:</strong> {player.skills.slice(0, 5).join(', ')}
                {player.skills.length > 5 && ` +${player.skills.length - 5}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
