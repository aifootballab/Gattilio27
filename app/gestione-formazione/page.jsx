'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, SwapHorizontal, AlertCircle, CheckCircle2, RefreshCw, Info, HelpCircle } from 'lucide-react'

export default function GestioneFormazionePage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [titolari, setTitolari] = React.useState([])
  const [riserve, setRiserve] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)
  const [selectedPlayer, setSelectedPlayer] = React.useState(null) // ID giocatore selezionato per swap
  const [swapping, setSwapping] = React.useState(false)

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
          console.warn('[GestioneFormazione] Session error, redirecting to login:', sessionError.message)
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

        // Normalizza e separa titolari/riserve
        const playersArray = (players || [])
          .filter(p => p && p.id && p.player_name)
          .map(p => ({
            id: p.id,
            player_name: String(p.player_name || 'Unknown').trim(),
            position: p.position ? String(p.position).trim() : null,
            overall_rating: p.overall_rating != null ? Number(p.overall_rating) : null,
            team: p.team ? String(p.team).trim() : null,
            slot_index: p.slot_index != null ? Number(p.slot_index) : null
          }))

        const titolariArray = playersArray
          .filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
          .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
        
        const riserveArray = playersArray
          .filter(p => p.slot_index === null)
          .sort((a, b) => (a.player_name || '').localeCompare(b.player_name || ''))

        setTitolari(titolariArray)
        setRiserve(riserveArray)
      } catch (err) {
        console.error('[GestioneFormazione] Error:', err)
        setError(err.message || 'Errore caricamento giocatori')
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

  const handleSwap = async (playerId1, playerId2) => {
    if (!supabase) {
      setError('Supabase non disponibile')
      return
    }

    setSwapping(true)
    setError(null)
    setSuccess(null)
    setSelectedPlayer(null)

    try {
      // Ottieni token
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.session?.access_token) {
        setError('Sessione scaduta. Reindirizzamento al login...')
        setTimeout(() => router.push('/login'), 1000)
        return
      }

      const token = session.session.access_token

      // Chiama API swap
      const res = await fetch('/api/supabase/swap-formation', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playerId1, playerId2 })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t('swapFormationError'))
      }

      setSuccess('Formazione aggiornata con successo!')

      // Ricarica giocatori
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      console.error('[GestioneFormazione] Swap error:', err)
      setError(err.message || t('swapFormationError'))
    } finally {
      setSwapping(false)
    }
  }

  const handlePlayerClick = (playerId, isTitolare) => {
    if (swapping) return

    if (selectedPlayer === null) {
      // Seleziona primo giocatore
      setSelectedPlayer({ id: playerId, isTitolare })
      setError(null)
      setSuccess(null)
    } else {
      // Swap con secondo giocatore
      if (selectedPlayer.id === playerId) {
        // Click stesso giocatore → deseleziona
        setSelectedPlayer(null)
      } else {
        // Swap
        handleSwap(selectedPlayer.id, playerId)
      }
    }
  }

  return (
    <main style={{ padding: '16px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/lista-giocatori')}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}
          >
            <ArrowLeft size={16} />
            {t('back')}
          </button>
          <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
            {t('swapFormation')}
          </h1>
        </div>
        {selectedPlayer && (
          <div style={{ 
            fontSize: '14px', 
            padding: '8px 12px',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'var(--neon-blue)'
          }}>
            {t('selectedPlayer')} • {t('clickAnotherPlayer')}
          </div>
        )}
      </div>

      {/* Guide Box */}
      {!loading && !error && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Info size={18} color="var(--neon-blue)" />
            <strong style={{ fontSize: '14px', color: 'var(--neon-blue)' }}>
              {t('guideSwapTitle')}
            </strong>
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.9 }}>
            <div style={{ marginBottom: '6px' }}>{t('guideSwapStep1')}</div>
            <div style={{ marginBottom: '6px' }}>{t('guideSwapStep2')}</div>
            <div style={{ marginBottom: '8px' }}>{t('guideSwapStep3')}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, fontStyle: 'italic', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0, 212, 255, 0.2)' }}>
              {t('guideSwapNote')}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={{
          marginBottom: '24px',
          padding: '12px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#22c55e'
        }}>
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--neon-blue)' }}>
          <RefreshCw size={24} style={{ animation: 'spin 0.6s linear infinite', marginBottom: '12px' }} />
          <div>{t('loading')}</div>
        </div>
      )}

      {/* Formazione */}
      {!loading && !error && (
        <div>
          {/* Titolari Section */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 700, 
              marginBottom: '16px',
              color: 'var(--neon-blue)'
            }}>
              {t('titolari')} ({titolari.length}/11)
            </h2>
            
            {titolari.length === 0 ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', opacity: 0.7 }}>
                <div>{t('noStarters')}</div>
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
                  {t('uploadFormationFirst')}
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px'
              }}>
                {titolari.map((player) => (
                  <PlayerCard 
                    key={player.id} 
                    player={player} 
                    isTitolare={true}
                    isSelected={selectedPlayer?.id === player.id}
                    onClick={() => handlePlayerClick(player.id, true)}
                    disabled={swapping}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Riserve Section */}
          <div>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 700, 
              marginBottom: '16px',
              color: 'var(--neon-purple)'
            }}>
              {t('riserve')} ({riserve.length})
            </h2>
            
            {riserve.length === 0 ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', opacity: 0.7 }}>
                <div style={{ fontSize: '16px', marginBottom: '8px' }}>{t('noReserves')}</div>
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.8 }}>
                  {t('guideEmptyReserves')}
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px'
              }}>
                {riserve.map((player) => (
                  <PlayerCard 
                    key={player.id} 
                    player={player} 
                    isTitolare={false}
                    isSelected={selectedPlayer?.id === player.id}
                    onClick={() => handlePlayerClick(player.id, false)}
                    disabled={swapping}
                  />
                ))}
              </div>
            )}
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

// Player Card Component (mobile-friendly)
function PlayerCard({ player, isTitolare, isSelected, onClick, disabled }) {
  const { t } = useTranslation()
  return (
    <div 
      className="card"
      onClick={onClick}
      style={{
        padding: '12px',
        border: `2px solid ${
          isSelected 
            ? 'var(--neon-blue)' 
            : (isTitolare ? 'rgba(0, 212, 255, 0.3)' : 'rgba(168, 85, 247, 0.3)')
        }`,
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.3s ease',
        background: isSelected ? 'rgba(0, 212, 255, 0.15)' : 'rgba(10, 14, 39, 0.6)',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isSelected ? 'var(--glow-blue)' : 'none'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isSelected) {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = isTitolare ? 'var(--glow-blue)' : 'var(--glow-purple)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      {/* Player Name */}
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 700, 
        marginBottom: '6px',
        color: isTitolare ? 'var(--neon-blue)' : 'var(--neon-purple)',
        lineHeight: '1.2',
        wordBreak: 'break-word'
      }}>
        {player.player_name}
      </div>

      {/* Basic Info */}
      <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
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
          fontSize: '10px',
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

      {/* Selected Indicator */}
      {isSelected && (
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--neon-blue)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <SwapHorizontal size={12} />
          Selezionato
        </div>
      )}
    </div>
  )
}
