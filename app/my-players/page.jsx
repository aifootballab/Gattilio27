'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Users, Upload, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Loader2, Target } from 'lucide-react'

export default function MyPlayersPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [players, setPlayers] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  // Inizializza autenticazione
  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error || !data?.session?.access_token) {
          router.push('/login')
          return
        }
      } catch (err) {
        console.error('[MyPlayers] Auth check failed:', err)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  // Fetch giocatori
  React.useEffect(() => {
    const fetchPlayers = async () => {
      if (!supabase) return

      setLoading(true)
      setError(null)

      try {
        // Ottieni token
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !sessionData?.session?.access_token) {
          router.push('/login')
          return
        }

        const token = sessionData.session.access_token

        // Chiama API - nessun filtro, ricevi tutto
        const res = await fetch('/api/supabase/get-my-players', {
          headers: { 
            Authorization: `Bearer ${token}` 
          },
          cache: 'no-store'
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.error || `Failed to fetch players (${res.status})`)
        }

        // DEBUG: Log dettagliato
        console.log('[MyPlayers] API response:', { 
          count: data.count, 
          playersReceived: data.players?.length || 0,
          playerNames: data.players?.map(p => p?.player_name) || [],
          playerIds: data.players?.map(p => p?.id) || []
        })

        // Ricevi array giocatori - mostra TUTTI, nessun filtro
        // IMPORTANTE: Filtra solo giocatori con ID valido (non null/undefined)
        const playersArray = Array.isArray(data.players) 
          ? data.players.filter(p => p && p.id) 
          : []
        
        console.log('[MyPlayers] Filtered players count:', playersArray.length)
        console.log('[MyPlayers] Filtered player IDs:', playersArray.map(p => p.id))
        
        setPlayers(playersArray)
      } catch (err) {
        console.error('[MyPlayers] Fetch error:', err)
        setError(err?.message || (lang === 'it' ? 'Errore caricamento giocatori' : 'Error loading players'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [router, lang])

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

      {/* Header */}
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

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {t('error')}: {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.7 }}>
          <Loader2 size={32} className="spin" style={{ marginBottom: '16px', color: 'var(--neon-blue)' }} />
          <div className="neon-text" style={{ fontSize: '18px' }}>{t('loading')}</div>
        </div>
      ) : players.length === 0 ? (
        /* Empty State */
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
        /* Grid Giocatori - MOSTRA TUTTI, nessun filtro */
        <div className="grid-futuristic">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} t={t} lang={lang} />
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
      {/* Header Card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 className="neon-text" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
            {player.player_name || 'Unknown'}
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

      {/* Completeness Badge */}
      <div style={{ marginBottom: '16px' }}>
        <div className={`completeness-badge ${isComplete ? 'complete' : 'incomplete'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isComplete ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{completeness.percentage}% {t('complete')}</span>
          {!isComplete && completeness.missing && completeness.missing.length > 0 && (
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              {t('missingFields')}: {completeness.missing.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Info Grid */}
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
        {player.current_level && <div><strong>{lang === 'it' ? 'Livello' : 'Level'}:</strong> {player.current_level}/{player.level_cap || '?'}</div>}
        {player.active_booster_name && <div><strong>{t('boosters')}:</strong> {player.active_booster_name}</div>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button 
          className="btn small" 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? t('hide') : t('details')}
        </button>
        <Link 
          href={`/player/${player.id}`}
          className="btn small primary" 
          style={{ flex: 1, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Target size={14} />
          {lang === 'it' ? 'Scheda Completa' : 'Full Profile'}
        </Link>
      </div>

      {/* Expanded Details */}
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
