'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  RefreshCw, 
  AlertCircle,
  ArrowRight,
  Settings,
  BarChart3,
  Brain,
  Trophy,
  UserCheck,
  FileImage,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  User,
  Shield
} from 'lucide-react'

export default function DashboardPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [stats, setStats] = React.useState({
    totalPlayers: 0,
    titolari: 0,
    riserve: 0,
    formation: null
  })
  const [topPlayers, setTopPlayers] = React.useState([])
  const [recentMatches, setRecentMatches] = React.useState([])
  const [matchesExpanded, setMatchesExpanded] = React.useState(false)
  const [deletingMatchId, setDeletingMatchId] = React.useState(null)

  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.session) {
          router.push('/login')
          return
        }

        // 1. Carica layout formazione
        const { data: layoutData } = await supabase
          .from('formation_layout')
          .select('formation')
          .maybeSingle()

        // 2. Carica giocatori
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('id, player_name, overall_rating, position, slot_index')
          .order('overall_rating', { ascending: false, nullsLast: true })

        if (playersError) {
          throw new Error(playersError.message || t('coachDataLoadError'))
        }

        const playersArray = (players || []).filter(p => p && p.id && p.player_name)
        const titolari = playersArray.filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
        const riserve = playersArray.filter(p => p.slot_index === null)

        setStats({
          totalPlayers: playersArray.length,
          titolari: titolari.length,
          riserve: riserve.length,
          formation: layoutData?.formation || null
        })

        // Top 3 giocatori per rating
        const top = playersArray
          .filter(p => p.overall_rating)
          .sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))
          .slice(0, 3)
          .map(p => ({
            id: p.id,
            name: p.player_name,
            rating: p.overall_rating,
            position: p.position
          }))

        setTopPlayers(top)

        // 3. Carica ultime partite (RLS filtra automaticamente per user_id tramite auth.uid())
        const userId = session.session.user.id
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness')
          .eq('user_id', userId) // Filtro esplicito per sicurezza
          .order('match_date', { ascending: false })
          .limit(10)

        if (matchesError) {
          console.warn('[Dashboard] Error loading matches:', matchesError)
        } else {
          console.log('[Dashboard] Matches loaded:', matches?.length || 0, 'for user:', userId)
          setRecentMatches(matches || [])
        }
      } catch (err) {
        console.error('[Dashboard] Error:', err)
        setError(err.message || t('coachDataLoadError'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          router.push('/login')
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const handleDeleteMatch = async (matchId, e) => {
    e.stopPropagation() // Previeni click sul card
    
    if (!confirm(t('confirmDeleteMatch'))) {
      return
    }

    setDeletingMatchId(matchId)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpired'))
      }

      const token = session.session.access_token

      const res = await fetch(`/api/supabase/delete-match?match_id=${matchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('deleteMatchError'))
      }

      // Rimuovi match dalla lista
      setRecentMatches(prev => prev.filter(m => m.id !== matchId))
    } catch (err) {
      console.error('[Dashboard] Delete match error:', err)
      setError(err.message || t('deleteMatchError'))
    } finally {
      setDeletingMatchId(null)
    }
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loading')}</div>
      </main>
    )
  }

  if (error && !stats) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
        <button onClick={() => router.push('/login')} className="btn">
          {t('back')}
        </button>
      </main>
    )
  }

  return (
    <main style={{ padding: '24px', minHeight: '100vh', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LayoutDashboard size={32} color="var(--neon-blue)" />
          <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
            {t('dashboard')}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <LanguageSwitch />
          <button
            onClick={handleLogout}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Grid Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Panoramica Squadra */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="var(--neon-blue)" />
            {t('squadOverview')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>{t('titolari')}</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                {stats.titolari}/11
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>{t('riserve')}</span>
              <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neon-purple)' }}>
                {stats.riserve}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>{t('total')}</span>
              <span style={{ fontSize: '24px', fontWeight: 700 }}>
                {stats.totalPlayers}
              </span>
            </div>
            {stats.formation && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                background: 'rgba(0, 212, 255, 0.1)', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('formation')}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                  {stats.formation}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={24} color="var(--neon-purple)" />
            {t('navigation')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => router.push('/contromisure-live')}
              className="btn primary"
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 165, 0, 0.1)',
                borderColor: 'rgba(255, 165, 0, 0.3)',
                color: 'var(--neon-orange)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 165, 0, 0.15)'
                e.currentTarget.style.boxShadow = 'var(--glow-orange)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} />
                {t('countermeasuresLive')}
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => router.push('/gestione-formazione')}
              className="btn primary"
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} />
                {t('manageFormation')}
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => router.push('/allenatori')}
              className="btn"
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(0, 212, 255, 0.05)',
                borderColor: 'rgba(0, 212, 255, 0.2)',
                color: 'var(--neon-blue)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                e.currentTarget.style.boxShadow = 'var(--glow-blue)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} />
                {t('coachesLink')}
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => router.push('/match/new')}
              className="btn"
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 165, 0, 0.05)',
                borderColor: 'rgba(255, 165, 0, 0.2)',
                color: 'var(--neon-orange)',
                marginTop: '10px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)'
                e.currentTarget.style.boxShadow = 'var(--glow-orange)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 165, 0, 0.05)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileImage size={18} />
                {t('addMatch')}
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => router.push('/impostazioni-profilo')}
              className="btn"
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(0, 212, 255, 0.05)',
                borderColor: 'rgba(0, 212, 255, 0.2)',
                color: 'var(--neon-blue)',
                marginTop: '10px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                e.currentTarget.style.boxShadow = 'var(--glow-blue)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} />
                {t('userProfile')}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* AI Insights (Placeholder) */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={24} color="var(--neon-orange)" />
            {t('aiInsights')}
          </h2>
          <div style={{ opacity: 0.7, fontSize: '14px' }}>
            {t('aiInsightsPlaceholder')}
          </div>
        </div>
      </div>

      {/* Ultime Partite - Fuori dal grid per essere sempre visibile su mobile */}
      <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            cursor: 'pointer'
          }}
          onClick={() => setMatchesExpanded(!matchesExpanded)}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={24} color="var(--neon-orange)" />
              Ultime Partite
            </h2>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--neon-orange)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {matchesExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentMatches.length === 0 ? (
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                opacity: 0.7,
                fontSize: '14px'
              }}>
                {t('noMatchesSaved')}
              </div>
            ) : (
              (matchesExpanded ? recentMatches : recentMatches.slice(0, 5)).map((match) => {
                const matchDate = match.match_date ? new Date(match.match_date) : null
                const dateStr = matchDate ? matchDate.toLocaleDateString('it-IT', { 
                  day: '2-digit', 
                  month: '2-digit',
                  year: 'numeric'
                }) : 'Data non disponibile'
                const timeStr = matchDate ? matchDate.toLocaleTimeString('it-IT', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : ''
                const displayResult = match.result || 'N/A'
                const displayOpponent = match.opponent_name || t('unknownOpponent')
                const isComplete = match.data_completeness === 'complete'
                const missingCount = match.missing_photos?.length || 0

                return (
                  <div
                    key={match.id}
                    onClick={() => router.push(`/match/${match.id}`)}
                    className="clickable-card"
                    style={{
                      padding: '16px',
                      background: 'rgba(255, 165, 0, 0.05)',
                      border: '1px solid rgba(255, 165, 0, 0.2)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)'
                      e.currentTarget.style.boxShadow = 'var(--glow-orange)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 165, 0, 0.05)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)'
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 165, 0, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-orange)', marginBottom: '4px' }}>
                          {displayOpponent}
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>
                          {dateStr} {timeStr && `• ${timeStr}`}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                          Risultato: <span style={{ color: 'var(--neon-blue)' }}>{displayResult}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`completeness-badge ${isComplete ? 'complete' : 'incomplete'}`}>
                            {isComplete ? '✓ Completa' : `${match.photos_uploaded || 0}/5`}
                          </span>
                          <button
                            onClick={(e) => handleDeleteMatch(match.id, e)}
                            disabled={deletingMatchId === match.id}
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.5)',
                              borderRadius: '6px',
                              padding: '6px',
                              color: '#fca5a5',
                              cursor: deletingMatchId === match.id ? 'not-allowed' : 'pointer',
                              opacity: deletingMatchId === match.id ? 0.5 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (deletingMatchId !== match.id) {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (deletingMatchId !== match.id) {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                              }
                            }}
                            title={t('deleteMatch')}
                          >
                            {deletingMatchId === match.id ? (
                              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                        {missingCount > 0 && (
                          <span style={{ fontSize: '12px', opacity: 0.7, color: 'var(--neon-orange)' }}>
                            {missingCount} mancanti
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {recentMatches.length > 5 && !matchesExpanded && (
            <div style={{ 
              marginTop: '12px', 
              textAlign: 'center', 
              fontSize: '14px', 
              opacity: 0.7,
              cursor: 'pointer',
              padding: '8px'
            }}
            onClick={() => setMatchesExpanded(true)}
            >
              {t('showMoreMatches', { count: recentMatches.length - 5 }).replace('{count}', recentMatches.length - 5)}
            </div>
          )}
        </div>

      {/* Top Players */}
      {topPlayers.length > 0 && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={24} color="var(--neon-orange)" />
            {t('topPlayers')}
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {topPlayers.map((player) => (
              <div
                key={player.id}
                onClick={() => router.push(`/giocatore/${player.id}`)}
                className="card"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'rgba(0, 212, 255, 0.05)',
                  border: '1px solid rgba(0, 212, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = 'var(--glow-blue)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--neon-blue)' }}>
                  {player.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {player.position && (
                    <span style={{ fontSize: '14px', opacity: 0.8 }}>{player.position}</span>
                  )}
                  {player.rating && (
                    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                      {player.rating}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
