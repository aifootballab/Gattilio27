'use client'

import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function MyPlayersPage() {
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
        console.error('[MyPlayers] Auth init failed:', err)
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
        console.error('[MyPlayers] Fetch failed:', err)
        setError(err?.message || 'Errore caricamento giocatori')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [authStatus.ready, authStatus.token])

  return (
    <main className="container" style={{ padding: '32px 24px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="neon-text" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
            I Miei Giocatori
          </h1>
          <p style={{ opacity: 0.8, fontSize: '14px' }}>
            {loading ? 'Caricamento...' : `${players.length} giocatori salvati`}
          </p>
        </div>
        <Link href="/" className="btn">
          ← Torna alla Rosa
        </Link>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '24px' }}>
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.7 }}>
          <div className="neon-text" style={{ fontSize: '18px' }}>Caricamento giocatori...</div>
        </div>
      ) : players.length === 0 ? (
        <div className="neon-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="neon-text" style={{ fontSize: '24px', marginBottom: '12px' }}>
            Nessun giocatore salvato
          </div>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            Carica screenshot e salva giocatori per vederli qui
          </p>
          <Link href="/" className="btn primary">
            Carica Screenshot
          </Link>
        </div>
      ) : (
        <div className="grid-futuristic">
          {players.map((player) => (
            <PlayerCard key={player.build_id} player={player} />
          ))}
        </div>
      )}
    </main>
  )
}

function PlayerCard({ player }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  
  const completeness = player.completeness || { percentage: 0, missing: [] }
  const isComplete = completeness.percentage === 100

  return (
    <div className="player-card-futuristic">
      {/* Header */}
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

      {/* Completeness Badge */}
      <div style={{ marginBottom: '16px' }}>
        <div className={`completeness-badge ${isComplete ? 'complete' : 'incomplete'}`}>
          <span>{completeness.percentage}% Completo</span>
          {!isComplete && completeness.missing.length > 0 && (
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              ⚠️ Manca: {completeness.missing.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px', 
        marginBottom: '16px',
        fontSize: '12px',
        opacity: 0.9
      }}>
        {player.team && <div><strong>Team:</strong> {player.team}</div>}
        {player.card_type && <div><strong>Carta:</strong> {player.card_type}</div>}
        {player.level && <div><strong>Livello:</strong> {player.level}/{player.level_cap || '?'}</div>}
        {player.booster && <div><strong>Booster:</strong> {player.booster}</div>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button 
          className="btn small" 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ flex: 1 }}
        >
          {isExpanded ? '▼ Nascondi' : '▶ Dettagli'}
        </button>
        <button className="btn small primary" style={{ flex: 1 }}>
          Modifica
        </button>
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
            {player.nationality && <div><strong>Nazionalità:</strong> {player.nationality}</div>}
            {player.height && player.weight && (
              <div><strong>Fisico:</strong> {player.height}cm, {player.weight}kg</div>
            )}
            {player.age && <div><strong>Età:</strong> {player.age}</div>}
            {player.form && <div><strong>Forma:</strong> {player.form}</div>}
            {Array.isArray(player.skills) && player.skills.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <strong>Skills:</strong> {player.skills.slice(0, 5).join(', ')}
                {player.skills.length > 5 && ` +${player.skills.length - 5}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
