'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Users, Upload, LogOut, AlertCircle, Settings, ArrowRight } from 'lucide-react'

export default function ListaGiocatoriPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [titolari, setTitolari] = React.useState([])
  const [riserve, setRiserve] = React.useState([])
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
            card_type: p.card_type ? String(p.card_type).trim() : null,
            slot_index: p.slot_index != null ? Number(p.slot_index) : null
          }))

        // Separazione titolari (slot_index 0-10) e riserve (slot_index null)
        const titolariArray = playersArray
          .filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
          .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
        
        const riserveArray = playersArray
          .filter(p => p.slot_index === null)
          .sort((a, b) => (a.player_name || '').localeCompare(b.player_name || ''))

        setTitolari(titolariArray)
        setRiserve(riserveArray)
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

  const totalPlayers = titolari.length + riserve.length

  return (
    <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        gap: '12px'
      }}>
        <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
          {t('myPlayers')}
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {titolari.length > 0 && (
            <button
              onClick={() => router.push('/gestione-formazione')}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              {t('swapFormation')}
            </button>
          )}
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
          {totalPlayers > 0 && (
            <div style={{ marginBottom: '24px', fontSize: '14px', opacity: 0.8 }}>
              {totalPlayers} {t('playersSaved')} • {titolari.length} {t('titolari')} • {riserve.length} {t('riserve')}
            </div>
          )}

          {/* Empty State */}
          {totalPlayers === 0 && (
            <div className="card" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 600 }}>{t('noPlayersSaved')}</div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '16px', lineHeight: '1.6' }}>
                {t('uploadScreenshotsToSee')}
              </div>
              <div style={{ 
                fontSize: '13px', 
                opacity: 0.7, 
                marginBottom: '24px',
                padding: '12px',
                background: 'rgba(0, 212, 255, 0.05)',
                borderRadius: '8px',
                textAlign: 'left',
                maxWidth: '500px',
                margin: '0 auto 24px'
              }}>
                <div style={{ marginBottom: '6px' }}><strong>💡 Suggerimento:</strong></div>
                <div style={{ marginBottom: '4px' }}>• Carica prima una <strong>formazione completa</strong> per avere i tuoi 11 titolari</div>
                <div>• Poi carica le <strong>card giocatori singoli</strong> per aggiungere riserve</div>
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

          {/* Titolari Section */}
          {titolari.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                  {t('titolari')} ({titolari.length}/11)
                </h2>
                {titolari.length > 0 && (
                  <button
                    onClick={() => router.push('/gestione-formazione')}
                    className="btn"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontSize: '14px',
                      padding: '8px 16px'
                    }}
                  >
                    <Settings size={14} />
                    {t('swapFormation')}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px'
              }}>
                {titolari.map((player) => (
                  <PlayerCard key={player.id} player={player} isTitolare={true} />
                ))}
              </div>
            </div>
          )}

          {/* Riserve Section */}
          {riserve.length > 0 && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--neon-purple)' }}>
                {t('riserve')} ({riserve.length})
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '12px'
              }}>
                {riserve.map((player) => (
                  <PlayerCard key={player.id} player={player} isTitolare={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

// Player Card Component (responsive)
function PlayerCard({ player, isTitolare }) {
  const { t } = useTranslation()
  const router = useRouter()
  
  const handleClick = () => {
    if (player?.id) {
      router.push(`/giocatore/${player.id}`)
    }
  }

  return (
    <div 
      className="card"
      onClick={handleClick}
      style={{
        padding: '12px',
        border: `1px solid ${isTitolare ? 'rgba(0, 212, 255, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
        borderRadius: '8px',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = isTitolare 
          ? 'var(--glow-blue)' 
          : 'var(--glow-purple)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Player Name */}
      <div style={{ 
        fontSize: '16px', 
        fontWeight: 700, 
        marginBottom: '6px',
        color: isTitolare ? 'var(--neon-blue)' : 'var(--neon-purple)',
        lineHeight: '1.2',
        wordBreak: 'break-word'
      }}>
        {player.player_name}
      </div>

      {/* Basic Info */}
      <div style={{ fontSize: '13px', marginBottom: '6px', opacity: 0.8 }}>
        {player.position && <span>{player.position}</span>}
        {player.position && player.overall_rating && <span> • </span>}
        {player.overall_rating && (
          <span style={{ fontWeight: 600 }}>{player.overall_rating}</span>
        )}
      </div>

      {/* Slot Index Badge (solo per titolari) */}
      {isTitolare && player.slot_index !== null && (
        <div style={{
          display: 'inline-block',
          fontSize: '11px',
          padding: '2px 6px',
          background: 'rgba(0, 212, 255, 0.2)',
          border: '1px solid rgba(0, 212, 255, 0.4)',
          borderRadius: '4px',
          marginTop: '4px',
          opacity: 0.8
        }}>
          {t('slot')} {player.slot_index}
        </div>
      )}

      {/* Team (solo se c'è spazio) */}
      {player.team && (
        <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', lineHeight: '1.2' }}>
          {player.team.length > 20 ? player.team.substring(0, 20) + '...' : player.team}
        </div>
      )}
    </div>
  )
}