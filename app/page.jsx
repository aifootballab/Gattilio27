'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getValidAccessToken } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import Link from 'next/link'
import AIKnowledgeBar from '@/components/AIKnowledgeBar'
import CoachFeedbackChat from '@/components/CoachFeedbackChat'
import GameAnalysisModal from '@/components/GameAnalysisModal'
import TaskWidget from '@/components/TaskWidget'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
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
  Zap,
  Shield,
  BookOpen,
  Info
} from 'lucide-react'

export default function DashboardPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const mountedRef = React.useRef(true)
  const [retryTrigger, setRetryTrigger] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [stats, setStats] = React.useState({
    totalPlayers: 0,
    titolari: 0,
    riserve: 0,
    formation: null
  })
  const [recentMatches, setRecentMatches] = React.useState([])
  const [matchesExpanded, setMatchesExpanded] = React.useState(false)
  const [deletingMatchId, setDeletingMatchId] = React.useState(null)
  const [editingOpponentId, setEditingOpponentId] = React.useState(null)
  const [editingOpponentName, setEditingOpponentName] = React.useState('')
  const [savingOpponentName, setSavingOpponentName] = React.useState(false)
  const [tacticalPatterns, setTacticalPatterns] = React.useState(null) // Pattern tattici per AI Insights
  const [showCoachFeedback, setShowCoachFeedback] = React.useState(false)
  const [showGameAnalysisModal, setShowGameAnalysisModal] = React.useState(false)
  const [gameAnalysisLastCapture, setGameAnalysisLastCapture] = React.useState(null)
  const [hasActiveCoach, setHasActiveCoach] = React.useState(false)
  const [reminderRotationIndex, setReminderRotationIndex] = React.useState(0)
  const [leaderboardData, setLeaderboardData] = React.useState({ currentUser: null, daysLeftInMonth: null })

  // Banner setup: sempre visibile quando non in loading. Se manca qualcosa: link a rotazione; altrimenti "Setup completo"
  const hasMissingSetup = hasActiveCoach === false || !gameAnalysisLastCapture || stats.titolari < 11
  const showSetupBanner = !loading
  React.useEffect(() => {
    if (!showSetupBanner || !hasMissingSetup) return
    const interval = setInterval(() => {
      setReminderRotationIndex((i) => i + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [showSetupBanner, hasMissingSetup])

  // Reset indice quando cambiano gli elementi mancanti
  const reminderItems = [
    !hasActiveCoach && { key: 'coach', label: t('setupReminderMissingCoach'), onClick: () => router.push('/allenatori') },
    !gameAnalysisLastCapture && { key: 'stats', label: t('setupReminderMissingStats'), onClick: () => setShowGameAnalysisModal(true) },
    stats.titolari < 11 && { key: 'roster', label: t('setupReminderMissingRoster'), onClick: () => router.push('/gestione-formazione') }
  ].filter(Boolean)
  const missingCount = reminderItems.length
  // Notifica setup: priorità (rosso = alta, giallo = media, verde = completo). Non invasiva, icona responsive, messaggio = importanza di completare.
  const setupStatus = missingCount >= 2 ? 'critical' : missingCount === 1 ? 'partial' : 'complete'
  const setupStatusConfig = {
    critical: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.55)', icon: AlertCircle, labelKey: 'setupStatusCritical', iconOpacity: 1 },
    partial: { color: '#eab308', bg: 'rgba(234, 179, 8, 0.18)', border: 'rgba(234, 179, 8, 0.55)', icon: AlertCircle, labelKey: 'setupStatusPartial', iconOpacity: 1 },
    complete: { color: '#22c55e', bg: 'rgba(34, 200, 100, 0.14)', border: 'rgba(34, 200, 100, 0.45)', icon: CheckCircle2, labelKey: 'setupStatusComplete', iconOpacity: 1 }
  }
  const statusCfg = setupStatusConfig[setupStatus]
  React.useEffect(() => {
    setReminderRotationIndex(0)
  }, [missingCount])

  React.useEffect(() => {
    mountedRef.current = true
    if (!supabase) {
      setLoading(false)
      router.push('/login')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.session) {
          setLoading(false)
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

        // 3. Carica ultime partite (RLS filtra automaticamente per user_id tramite auth.uid())
        const userId = session.session.user.id
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness')
          .eq('user_id', userId) // Filtro esplicito per sicurezza
          .order('match_date', { ascending: false })
          .limit(10)

        if (matchesError) {
          if (process.env.NODE_ENV !== 'production') console.warn('[Dashboard] Error loading matches:', matchesError)
        } else {
          if (process.env.NODE_ENV !== 'production') console.log('[Dashboard] Matches loaded:', matches?.length || 0)
          setRecentMatches(matches || [])
        }

        // 4. Carica pattern tattici (per AI Insights)
        const { data: patterns, error: patternsError } = await supabase
          .from('team_tactical_patterns')
          .select('formation_usage, playing_style_usage, recurring_issues')
          .eq('user_id', userId)
          .maybeSingle()

        if (patternsError && patternsError.code !== 'PGRST116') { // PGRST116 = no rows (normale)
          if (process.env.NODE_ENV !== 'production') console.warn('[Dashboard] Error loading tactical patterns:', patternsError)
        } else if (patterns) {
          setTacticalPatterns(patterns)
        } else {
          // Pattern non esistono: verifica se ci sono partite e calcola on-demand (retroattività)
          // Usa matches locale (non recentMatches che è state e potrebbe non essere ancora aggiornato)
          const hasMatches = matches && matches.length > 0
          if (hasMatches) {
            if (process.env.NODE_ENV !== 'production') console.log('[Dashboard] Pattern non trovati ma ci sono partite, calcolo on-demand...')
            try {
              // Chiama API per calcolare pattern retroattivamente
              const session = await supabase.auth.getSession()
              const token = session?.data?.session?.access_token
              if (token) {
                const response = await fetch('/api/admin/recalculate-patterns', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ user_id: userId })
                })
                
                if (response.ok) {
                  const result = await response.json()
                  if (result.success && result.patterns) {
                    setTacticalPatterns(result.patterns)
                    if (process.env.NODE_ENV !== 'production') console.log('[Dashboard] Pattern calcolati retroattivamente')
                  }
                } else {
                  if (process.env.NODE_ENV !== 'production') console.warn('[Dashboard] Errore calcolo pattern:', await response.text())
                }
              }
            } catch (calcError) {
              if (process.env.NODE_ENV !== 'production') console.warn('[Dashboard] Errore calcolo pattern retroattivo (non critico):', calcError)
              // Non bloccare dashboard se fallisce
            }
          }
        }

        // Allenatore attivo (per promemoria setup)
        const { data: activeCoach } = await supabase
          .from('coaches')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle()
        setHasActiveCoach(!!activeCoach)

        // Classifica mensile: stesso token già usato sopra; passare month (client) per allineare a pagina Classifica
        const token = session.session.access_token
        if (token) {
          try {
            const y = new Date().getFullYear()
            const m = String(new Date().getMonth() + 1).padStart(2, '0')
            const lbRes = await fetch(`/api/leaderboard?month=${y}-${m}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
            const lbPayload = await lbRes.json().catch(() => ({}))
            if (Array.isArray(lbPayload.rankings)) {
              setLeaderboardData({
                currentUser: lbPayload.currentUser || null,
                daysLeftInMonth: lbPayload.daysLeftInMonth ?? null
              })
            }
          } catch (_) { /* non bloccare dashboard */ }
        }
      } catch (err) {
        console.error('[Dashboard] Error:', err)
        setError(err.message || t('coachDataLoadError'))
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setLoading((prev) => {
          if (prev) setError(t('coachDataLoadError') || 'Caricamento troppo lento. Riprova.')
          return false
        })
      }
    }, 30000)
    fetchData().finally(() => clearTimeout(timeoutId))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          router.push('/login')
        }
      }
    )

    return () => {
      mountedRef.current = false
      clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [router, retryTrigger])

  const handleRetry = React.useCallback(() => {
    setError(null)
    setLoading(true)
    setRetryTrigger((n) => n + 1)
  }, [])

  const fetchGameAnalysisCapture = React.useCallback(async () => {
    if (!supabase) return
    try {
      const token = await getValidAccessToken()
      if (!token) return
      const res = await fetch('/api/extract-game-analysis', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({}))
      if (data.captured_at) {
        const d = new Date(data.captured_at)
        setGameAnalysisLastCapture(isNaN(d.getTime()) ? data.captured_at : d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'short', year: 'numeric' }))
      } else {
        setGameAnalysisLastCapture(null)
      }
    } catch (_) {
      setGameAnalysisLastCapture(null)
    }
  }, [lang])

  React.useEffect(() => {
    if (!loading && supabase) fetchGameAnalysisCapture()
  }, [loading, supabase, fetchGameAnalysisCapture])

  React.useEffect(() => {
    if (loading || !supabase) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        if (!token) return
        const y = new Date().getFullYear()
        const m = String(new Date().getMonth() + 1).padStart(2, '0')
        const res = await fetch(`/api/leaderboard?month=${y}-${m}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        const payload = await res.json().catch(() => ({}))
        if (!cancelled && Array.isArray(payload.rankings)) {
          setLeaderboardData({
            currentUser: payload.currentUser || null,
            daysLeftInMonth: payload.daysLeftInMonth ?? null
          })
        }
      } catch (_) {}
    })()
    return () => { cancelled = true }
  }, [loading, supabase])

  React.useEffect(() => {
    if (typeof window === 'undefined' || !supabase) return
    const onLeaderboardUpdated = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        const token = session?.session?.access_token
        if (!token) return
        const y = new Date().getFullYear()
        const m = String(new Date().getMonth() + 1).padStart(2, '0')
        const res = await fetch(`/api/leaderboard?month=${y}-${m}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
        const payload = await res.json().catch(() => ({}))
        if (Array.isArray(payload.rankings)) {
          setLeaderboardData({
            currentUser: payload.currentUser || null,
            daysLeftInMonth: payload.daysLeftInMonth ?? null
          })
        }
      } catch (_) {}
    }
    window.addEventListener('leaderboard-updated', onLeaderboardUpdated)
    return () => window.removeEventListener('leaderboard-updated', onLeaderboardUpdated)
  }, [supabase])

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

      const data = await safeJsonResponse(res, t('deleteMatchError'))

      // Rimuovi match dalla lista
      setRecentMatches(prev => prev.filter(m => m.id !== matchId))

      // Aggiorna riassunto analisi (diagnostic) per la chat
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare UI */ }
    } catch (err) {
      console.error('[Dashboard] Delete match error:', err)
      setError(err.message || t('deleteMatchError'))
    } finally {
      setDeletingMatchId(null)
    }
  }

  const handleSaveOpponentName = async (matchId, e) => {
    e.stopPropagation() // Evita click sulla card

    if (!editingOpponentName.trim()) {
      setEditingOpponentId(null)
      return
    }

    setSavingOpponentName(true)
    setError(null)
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpired'))
      }

      const token = session.session.access_token

      const updateRes = await fetch(`/api/supabase/update-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: matchId,
          opponent_name: editingOpponentName.trim()
        })
      })

      const errorData = await updateRes.json().catch(() => ({}))
      if (!updateRes.ok) {
        throw new Error(errorData.error || t('updateMatchError'))
      }

      setRecentMatches(prev => prev.map(m =>
        m.id === matchId
          ? { ...m, opponent_name: editingOpponentName.trim() }
          : m
      ))
      setEditingOpponentId(null)
      setEditingOpponentName('')

      // Aggiorna riassunto analisi (diagnostic) per la chat
      try {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (_) { /* non bloccare UI */ }
    } catch (err) {
      console.error('[Dashboard] Error saving opponent name:', err)
      setError(err.message || t('updateMatchError'))
    } finally {
      setSavingOpponentName(false)
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

  if (error && !stats.totalPlayers && !stats.formation) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleRetry} className="btn" type="button">
            {t('retry')}
          </button>
          <button onClick={() => router.push('/login')} className="btn">
            {t('back')}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main data-tour-id="tour-dashboard-intro" style={{ padding: '24px', minHeight: '100vh', maxWidth: '1400px', margin: '0 auto' }}>
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
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <AlertCircle size={18} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={handleRetry} className="btn" type="button" style={{ marginLeft: 'auto' }}>
            {t('retry')}
          </button>
        </div>
      )}

      {/* AI Knowledge Bar + Informazioni IA */}
      <div data-tour-id="tour-dashboard-ai" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <AIKnowledgeBar />
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setShowCoachFeedback(true)}
          style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'var(--neon-orange)', color: 'var(--neon-orange)' }}
          title={t('palestraCoachTitle') || 'Palestra Coach'}
        >
          <Info size={16} />
          {t('palestraCoachTitle') || 'Palestra Coach'}
        </button>
      </div>

      {/* Banner setup: visibile in UX, icona priorità (rosso/giallo/verde), comunica importanza di completare. */}
      {showSetupBanner && (
        <div
          id="setup-status-banner"
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'clamp(8px, 2vw, 12px)',
            padding: 'clamp(12px, 2.5vw, 14px) clamp(16px, 3vw, 20px)',
            background: statusCfg.bg,
            border: `1px solid ${statusCfg.border}`,
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: 'clamp(13px, 3vw, 14px)',
            lineHeight: 1.45,
            color: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.25)'
          }}
        >
          {(() => {
            const Icon = statusCfg.icon
            return (
              <span
                role="img"
                aria-label={t(statusCfg.labelKey)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: 'clamp(20px, 5vw, 24px)',
                  height: 'clamp(20px, 5vw, 24px)',
                  minWidth: 20,
                  minHeight: 20
                }}
                title={t(statusCfg.labelKey)}
              >
                <Icon size={18} color={statusCfg.color} strokeWidth={setupStatus === 'complete' ? 2 : 2.5} style={{ opacity: statusCfg.iconOpacity }} />
              </span>
            )
          })()}
          <span key={missingCount > 0 ? reminderRotationIndex : 'complete'} style={{ flex: '1 1 auto', minWidth: 0 }}>
            {t('setupReminderIntro')}
            {missingCount > 0 ? (
              <>
                {' '}
                {lang === 'en' ? 'Missing:' : 'Manca:'}{' '}
                {(() => {
                  const idx = reminderRotationIndex % Math.max(missingCount, 1)
                  const item = reminderItems[idx]
                  if (!item) return null
                  return (
                    <button
                      key={`${reminderRotationIndex}-${item.key}`}
                      type="button"
                      onClick={item.onClick}
                      style={{ background: 'none', border: 'none', color: 'var(--neon-blue)', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                    >
                      {item.label}
                    </button>
                  )
                })()}
              </>
            ) : (
              <> · {t('setupReminderComplete')}</>
            )}
          </span>
        </div>
      )}

      <CoachFeedbackChat show={showCoachFeedback} onClose={() => setShowCoachFeedback(false)} userProfile={null} lastMatch={recentMatches?.[0] || null} />
      <GameAnalysisModal show={showGameAnalysisModal} onClose={() => setShowGameAnalysisModal(false)} onSuccess={fetchGameAnalysisCapture} />

      {/* Credits Bar: montata in layout per aggiornamento immediato dopo ogni API (credits-consumed) */}

      {/* Task Widget (Obiettivi Settimanali) */}
      <div data-tour-id="tour-dashboard-task">
        <TaskWidget />
      </div>

      {/* Classifica mensile - in evidenza fuori dalla Navigazione */}
      <Link
        href="/classifica"
        data-tour-id="tour-dashboard-classifica"
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px',
          marginBottom: '24px',
          textDecoration: 'none',
          background: 'linear-gradient(135deg, rgba(255,140,0,0.12), rgba(0,212,255,0.06))',
          border: '1px solid rgba(255,165,0,0.4)',
          color: '#fff',
          borderRadius: '12px'
        }}
      >
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,165,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trophy size={26} color="var(--neon-orange)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '18px' }}>{t('classificaMensile')}</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
            {leaderboardData.currentUser
              ? `${t('laTuaPosizione')}: ${leaderboardData.currentUser.rank}° · ${leaderboardData.currentUser.points} ${t('puntiCoach')}`
              : t('fromZeroToHero')}
          </div>
          {leaderboardData.daysLeftInMonth != null && (
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              {leaderboardData.daysLeftInMonth} {t('giorniAllaFineMese')}
            </div>
          )}
        </div>
        <ArrowRight size={22} color="var(--neon-orange)" style={{ flexShrink: 0 }} />
      </Link>

      {/* Grid Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Panoramica Squadra */}
        <div data-tour-id="tour-dashboard-squad" className="card" style={{ padding: '24px' }}>
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

        {/* Statistiche di gioco - stesso stile card di Classifica/Obiettivi/Ultime partite */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowGameAnalysisModal(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowGameAnalysisModal(true) } }}
          style={{
            marginBottom: 0,
            width: '100%',
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, rgba(255,140,0,0.12), rgba(0,212,255,0.06))',
            border: '1px solid rgba(255,165,0,0.4)',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '20px',
            color: '#fff',
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.95' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,165,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart3 size={26} color="var(--neon-orange)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '18px' }}>
              {t('gameAnalysisTitle')}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
              {gameAnalysisLastCapture
                ? `${t('gameAnalysisLastCapture')}: ${gameAnalysisLastCapture}`
                : t('gameAnalysisDescription')}
            </div>
          </div>
          <ArrowRight size={22} color="var(--neon-orange)" style={{ flexShrink: 0 }} />
        </div>

        {/* Quick Links */}
        <div data-tour-id="tour-dashboard-nav" className="card" style={{ padding: '24px' }}>
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
              data-tour-id="tour-dashboard-add-match"
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
              onClick={() => router.push('/guida')}
              className="btn"
              style={{ 
                width: '100%', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(168, 85, 247, 0.1)',
                borderColor: 'rgba(168, 85, 247, 0.3)',
                color: 'var(--neon-purple)',
                marginTop: '10px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'
                e.currentTarget.style.boxShadow = 'var(--glow-purple)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} />
                {t('guideLink')}
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => router.push('/gestione-profilo')}
              className="btn"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 165, 0, 0.08)',
                borderColor: 'rgba(255, 165, 0, 0.3)',
                color: 'var(--neon-orange)',
                marginTop: '10px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 165, 0, 0.15)'
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 165, 0, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 165, 0, 0.08)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} />
                {t('heroPoints')}
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

        {/* AI Insights */}
        <div data-tour-id="tour-dashboard-insights" className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={24} color="var(--neon-orange)" />
            {t('aiInsights')}
          </h2>
          
          {!tacticalPatterns || (
            (!tacticalPatterns.formation_usage || Object.keys(tacticalPatterns.formation_usage).length === 0) &&
            (!tacticalPatterns.playing_style_usage || Object.keys(tacticalPatterns.playing_style_usage).length === 0) &&
            (!tacticalPatterns.recurring_issues || tacticalPatterns.recurring_issues.length === 0)
          ) ? (
            <div style={{ 
              padding: '24px', 
              textAlign: 'center', 
              opacity: 0.7, 
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {t('aiInsightsNoData')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Formazioni più usate */}
              {tacticalPatterns.formation_usage && Object.keys(tacticalPatterns.formation_usage).length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>
                    {t('formationUsage')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(tacticalPatterns.formation_usage)
                      .sort((a, b) => (b[1].matches || 0) - (a[1].matches || 0))
                      .slice(0, 5)
                      .map(([formation, stats]) => {
                        const winRate = stats.win_rate ? (stats.win_rate * 100).toFixed(0) : 0
                        const matches = stats.matches || 0
                        return (
                          <div
                            key={formation}
                            style={{
                              padding: '12px',
                              background: 'rgba(255, 165, 0, 0.05)',
                              border: '1px solid rgba(255, 165, 0, 0.2)',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '8px'
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{formation}</span>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', opacity: 0.8 }}>
                              <span>{matches} {t('matches')}</span>
                              <span style={{ color: winRate >= 50 ? '#86efac' : '#fca5a5' }}>
                                {winRate}% {t('winRate')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Stili di gioco più usati */}
              {tacticalPatterns.playing_style_usage && Object.keys(tacticalPatterns.playing_style_usage).length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>
                    {t('playingStyleUsage')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(tacticalPatterns.playing_style_usage)
                      .sort((a, b) => (b[1].matches || 0) - (a[1].matches || 0))
                      .slice(0, 5)
                      .map(([style, stats]) => {
                        const winRate = stats.win_rate ? (stats.win_rate * 100).toFixed(0) : 0
                        const matches = stats.matches || 0
                        return (
                          <div
                            key={style}
                            style={{
                              padding: '12px',
                              background: 'rgba(255, 165, 0, 0.05)',
                              border: '1px solid rgba(255, 165, 0, 0.2)',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '8px'
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{style}</span>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', opacity: 0.8 }}>
                              <span>{matches} {t('matches')}</span>
                              <span style={{ color: winRate >= 50 ? '#86efac' : '#fca5a5' }}>
                                {winRate}% {t('winRate')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Problemi ricorrenti */}
              {tacticalPatterns.recurring_issues && Array.isArray(tacticalPatterns.recurring_issues) && tacticalPatterns.recurring_issues.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>
                    {t('recurringIssues')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tacticalPatterns.recurring_issues.slice(0, 5).map((issue, idx) => {
                      const issueText = typeof issue === 'string' ? issue : (issue.issue || issue)
                      const frequency = typeof issue === 'object' ? (issue.frequency || 'media') : 'media'
                      const severity = typeof issue === 'object' ? (issue.severity || 'media') : 'media'
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{issueText}</div>
                          <div style={{ fontSize: '12px', opacity: 0.7 }}>
                            {t('frequency')}: {frequency} | {t('severity')}: {severity}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ultime Partite - stesso stile card di Classifica/Obiettivi */}
      <div
        data-tour-id="tour-dashboard-matches"
        style={{
          marginBottom: '24px',
          width: '100%',
          boxSizing: 'border-box',
          background: 'linear-gradient(135deg, rgba(255,140,0,0.12), rgba(0,212,255,0.06))',
          border: '1px solid rgba(255,165,0,0.4)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-expanded={matchesExpanded}
          aria-label={matchesExpanded ? t('collapseSectionMatches') : t('expandSectionMatches')}
          onClick={() => setMatchesExpanded(!matchesExpanded)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMatchesExpanded(!matchesExpanded) } }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: 'clamp(16px, 4vw, 20px)',
            cursor: 'pointer',
            userSelect: 'none',
            color: '#fff',
            minHeight: '44px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,165,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={26} color="var(--neon-orange)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: 'clamp(16px, 4vw, 18px)' }}>
              {t('recentMatches') || 'Ultime Partite'}
            </div>
            <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', color: 'rgba(255,255,255,0.85)' }}>
              {recentMatches.length === 0 ? t('noMatchesSaved') : `${recentMatches.length} ${recentMatches.length === 1 ? (t('match') || 'partita') : (t('matches') || 'partite')}`}
            </div>
          </div>
          {matchesExpanded ? (
            <ChevronUp size={22} color="var(--neon-orange)" style={{ flexShrink: 0 }} aria-hidden />
          ) : (
            <ChevronDown size={22} color="var(--neon-orange)" style={{ flexShrink: 0 }} aria-hidden />
          )}
        </div>

        {matchesExpanded && (
          <div style={{ padding: '0 20px 20px' }}>
            {recentMatches.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '16px' }}>
                {t('noMatchesSaved')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentMatches.map((match) => {
                  const matchDate = match.match_date ? new Date(match.match_date) : null
                  const dateStr = matchDate ? matchDate.toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }) : t('dateNotAvailable')
                  const displayResult = match.result || 'N/A'
                  const displayOpponent = match.opponent_name || t('unknownOpponent')
                  const isComplete = match.data_completeness === 'complete'

                  return (
                    <div
                      key={match.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(255, 165, 0, 0.05)',
                        border: '1px solid rgba(255, 165, 0, 0.2)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onClick={() => router.push(`/match/${match.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 165, 0, 0.05)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px', minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                        {editingOpponentId === match.id ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                              type="text"
                              value={editingOpponentName}
                              onChange={(e) => setEditingOpponentName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveOpponentName(match.id, e)
                                else if (e.key === 'Escape') { setEditingOpponentId(null); setEditingOpponentName('') }
                              }}
                              autoFocus
                              maxLength={255}
                              style={{ flex: 1, minWidth: '100px', padding: '6px 8px', background: 'rgba(255,165,0,0.2)', border: '1px solid rgba(255,165,0,0.5)', borderRadius: '6px', color: '#ffa500', fontSize: '13px', outline: 'none' }}
                              disabled={savingOpponentName}
                            />
                            <button type="button" onClick={(e) => handleSaveOpponentName(match.id, e)} disabled={savingOpponentName} style={{ padding: '6px 8px', background: 'rgba(34,197,94,0.3)', border: 'none', borderRadius: '6px', color: '#86efac', cursor: savingOpponentName ? 'not-allowed' : 'pointer', fontSize: '12px' }}>{savingOpponentName ? '...' : '✓'}</button>
                            <button type="button" onClick={() => { setEditingOpponentId(null); setEditingOpponentName('') }} style={{ padding: '6px 8px', background: 'rgba(239,68,68,0.3)', border: 'none', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{displayOpponent}</span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{dateStr}</span>
                            <span style={{ fontSize: '12px', opacity: 0.6 }} title={t('clickToEditOpponentName')} onClick={(e) => { e.stopPropagation(); setEditingOpponentId(match.id); setEditingOpponentName(match.opponent_name || '') }}>✏️</span>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neon-blue)' }}>{displayResult}</span>
                        <span className={`completeness-badge ${isComplete ? 'complete' : 'incomplete'}`} style={{ fontSize: '11px' }}>
                          {isComplete ? t('matchComplete') : `${match.photos_uploaded || 0}/5`}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMatch(match.id, e)}
                          disabled={deletingMatchId === match.id}
                          style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', padding: '6px', color: '#fca5a5', cursor: deletingMatchId === match.id ? 'not-allowed' : 'pointer', opacity: deletingMatchId === match.id ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={t('deleteMatch')}
                        >
                          {deletingMatchId === match.id ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
