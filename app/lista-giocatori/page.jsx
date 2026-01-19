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

  // Verifica sessione e carica giocatori
  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    const fetchPlayers = async () => {
      setLoading(true)
      setError(null)

      try {
        // Verifica sessione
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.warn('[ListaGiocatori] Session error, redirecting to login:', sessionError.message)
          setError('Sessione scaduta. Reindirizzamento al login...')
          setTimeout(() => router.push('/login'), 1000)
          return
        }

        if (!session?.session) {
          setError('Sessione non valida. Reindirizzamento al login...')
          setTimeout(() => router.push('/login'), 1000)
          return
        }

        // Query diretta a Supabase - RLS filtra automaticamente per auth.uid()
        const { data: players, error: queryError } = await supabase
          .from('players')
          .select('*')
          .order('created_at', { ascending: false })

        if (queryError) {
          throw new Error(queryError.message || 'Errore caricamento giocatori')
        }

        // Normalizza array giocatori: solo quelli con id e nome valido
        const playersArray = (players || [])
          .filter(p => {
            if (!p || !p.id) return false
            const name = p.player_name
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
              console.warn('[ListaGiocatori] Player without valid name:', p.id)
              return false
            }
            return true
          })
          .map(p => ({
            id: p.id,
            player_name: String(p.player_name || 'Unknown').trim(),
            position: p.position ? String(p.position).trim() : null,
            overall_rating: p.overall_rating != null ? Number(p.overall_rating) : null,
            team: p.team ? String(p.team).trim() : null,
            card_type: p.card_type ? String(p.card_type).trim() : null
          }))

        setPlayers(playersArray)
      } catch (err) {
        console.error('[ListaGiocatori] Error:', err)
        
        // Gestione errori auth-specifici
        if (err.message?.includes('JWT') || err.message?.includes('session') || err.message?.includes('auth')) {
          setError('Sessione scaduta. Reindirizzamento al login...')
          setTimeout(() => router.push('/login'), 1000)
        } else {
          setError(err.message || 'Errore caricamento giocatori')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()

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
          {players.length > 0 && (
            <div style={{ marginBottom: '24px', fontSize: '16px', opacity: 0.8 }}>
              {players.length} {t('playersSaved')}
            </div>
          )}

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