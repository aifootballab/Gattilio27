'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Users, Upload, LogOut, AlertCircle } from 'lucide-react'

export default function ListaGiocatoriPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [players, setPlayers] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    // Verifica sessione iniziale
    const checkSession = async () => {
      const { data: session, error } = await supabase.auth.getSession()
      
      if (error) {
        console.warn('[ListaGiocatori] Session error, redirecting to login:', error.message)
        router.push('/login')
        return
      }

      if (!session?.session) {
        router.push('/login')
        return
      }
    }

    checkSession()

    // Listener per cambiamenti auth
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

  // Carica giocatori
  React.useEffect(() => {
    const fetchPlayers = async () => {
      if (!supabase) return

      setLoading(true)
      setError(null)

      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.session?.access_token) {
          throw new Error('Sessione non valida')
        }

        const token = session.session.access_token

        const res = await fetch('/api/supabase/get-players', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Errore caricamento giocatori')
        }

        const playersArray = Array.isArray(data.players)
          ? data.players.filter(p => p && p.id && p.player_name)
          : []

        setPlayers(playersArray)
      } catch (err) {
        console.error('[ListaGiocatori] Fetch error:', err)
        setError(err.message || 'Errore caricamento giocatori')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const handleGoToUpload = () => {
    router.push('/upload')
  }

  return (
    <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 className="neon-text" style={{ fontSize: '32px', fontWeight: 700 }}>
          {t('myPlayers')}
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleGoToUpload}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={16} />
            {t('uploadScreenshots')}
          </button>
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

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--neon-blue)' }}>
          {t('loading')}
        </div>
      )}

      {/* Players List */}
      {!loading && !error && (
        <div>
          {/* Count */}
          <div style={{ marginBottom: '24px', fontSize: '16px', opacity: 0.8 }}>
            {players.length} {t('playersSaved')}
          </div>

          {/* Empty State */}
          {players.length === 0 && (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>{t('noPlayersSaved')}</div>
              <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px' }}>
                {t('uploadScreenshotsToSee')}
              </div>
              <button
                onClick={handleGoToUpload}
                className="btn primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Upload size={16} />
                {t('uploadScreenshots')}
              </button>
            </div>
          )}

          {/* Players Grid */}
          {players.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '16px' 
            }}>
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className="card"
                  style={{
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }}
                >
                  {/* Player Name */}
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 700, 
                    marginBottom: '8px',
                    color: 'var(--neon-blue)'
                  }}>
                    {player.player_name}
                  </div>

                  {/* Basic Info */}
                  <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.8 }}>
                    {player.position && <span>{player.position}</span>}
                    {player.position && player.overall_rating && <span> • </span>}
                    {player.overall_rating && (
                      <span style={{ fontWeight: 600 }}>{player.overall_rating}</span>
                    )}
                  </div>

                  {/* Team */}
                  {player.team && (
                    <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '4px' }}>
                      {player.team}
                    </div>
                  )}

                  {/* Card Type */}
                  {player.card_type && (
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>
                      {player.card_type}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}