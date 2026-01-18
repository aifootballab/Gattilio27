'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Users, Upload, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'

export default function MyPlayersPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [players, setPlayers] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [mounted, setMounted] = React.useState(false)
  const [selectedPlayer, setSelectedPlayer] = React.useState(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return

    const fetchPlayers = async () => {
      if (!supabase) {
        router.push('/login')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !sessionData?.session?.access_token) {
          router.push('/login')
          return
        }

        const token = sessionData.session.access_token

        // Fetch con timestamp per evitare cache
        const res = await fetch(`/api/supabase/get-my-players?t=${Date.now()}`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        })

        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData?.error || `Failed to fetch players (${res.status})`)
        }

        const data = await res.json()

        // Filtra solo giocatori validi (con id e nome)
        const playersArray = Array.isArray(data.players) 
          ? data.players.filter(p => p && p.id && p.player_name) 
          : []
        
        setPlayers(playersArray)
      } catch (err) {
        console.error('[MyPlayers] Fetch error:', err)
        setError(err?.message || (lang === 'it' ? 'Errore caricamento giocatori' : 'Error loading players'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [mounted, router, lang])

  if (!mounted) {
    return null
  }

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
        /* Grid Giocatori */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {players.map((player) => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              t={t} 
              lang={lang}
              onClick={() => setSelectedPlayer(player)}
            />
          ))}
        </div>
      )}

      {/* Modal Dettaglio Giocatore */}
      {selectedPlayer && (
        <PlayerDetailModal 
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          t={t}
          lang={lang}
        />
      )}
    </main>
  )
}

function PlayerCard({ player, t, lang, onClick }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  
  const completeness = player.completeness || { percentage: 0, missing: [] }
  const isComplete = completeness.percentage === 100

  return (
    <div 
      className="player-card-futuristic" 
      style={{ 
        background: 'rgba(10, 14, 39, 0.8)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
      }}
      onClick={onClick}
    >
      {/* Header Card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
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

      {/* Click hint */}
      <div style={{ 
        marginTop: '12px', 
        padding: '8px', 
        background: 'rgba(0, 212, 255, 0.1)', 
        borderRadius: '6px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--neon-blue)',
        opacity: 0.8
      }}>
        {lang === 'it' ? 'Clicca per dettagli' : 'Click for details'}
      </div>
    </div>
  )
}

function PlayerDetailModal({ player, onClose, t, lang }) {
  const baseStats = player.base_stats || {}
  const attacking = baseStats.attacking || {}
  const defending = baseStats.defending || {}
  const athleticism = baseStats.athleticism || {}
  const metadata = player.metadata || {}

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflow: 'auto'
      }}
      onClick={onClose}
    >
      <div 
        className="neon-panel"
        style={{
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px', paddingRight: '40px' }}>
          <h1 className="neon-text" style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
            {player.player_name}
          </h1>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {player.position && (
              <div style={{ padding: '8px 16px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid var(--neon-blue)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{lang === 'it' ? 'Posizione' : 'Position'}</div>
                <div style={{ fontWeight: 600 }}>{player.position}</div>
              </div>
            )}
            {player.overall_rating && (
              <div style={{ padding: '8px 16px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid var(--neon-blue)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>OVR</div>
                <div style={{ fontWeight: 700, fontSize: '24px', color: 'var(--neon-blue)' }}>{player.overall_rating}</div>
              </div>
            )}
            {player.card_type && (
              <div style={{ padding: '8px 16px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--neon-purple)', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('card')}</div>
                <div style={{ fontWeight: 600 }}>{player.card_type}</div>
              </div>
            )}
          </div>
        </div>

        {/* Info Base */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {player.team && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'it' ? 'Team' : 'Team'}</div>
              <div style={{ fontWeight: 600 }}>{player.team}</div>
            </div>
          )}
          {player.nationality && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{t('nationality')}</div>
              <div style={{ fontWeight: 600 }}>{player.nationality}</div>
            </div>
          )}
          {player.age && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{t('age')}</div>
              <div style={{ fontWeight: 600 }}>{player.age}</div>
            </div>
          )}
          {player.height && player.weight && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{t('physical')}</div>
              <div style={{ fontWeight: 600 }}>{player.height}cm / {player.weight}kg</div>
            </div>
          )}
          {player.current_level && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{lang === 'it' ? 'Livello' : 'Level'}</div>
              <div style={{ fontWeight: 600 }}>{player.current_level}/{player.level_cap || '?'}</div>
            </div>
          )}
        </div>

        {/* Stats Sections */}
        {(Object.keys(attacking).length > 0 || Object.keys(defending).length > 0 || Object.keys(athleticism).length > 0) && (
          <div style={{ marginBottom: '24px' }}>
            <h3 className="neon-text" style={{ fontSize: '20px', marginBottom: '16px' }}>Statistiche</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {Object.keys(attacking).length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid var(--neon-blue)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-blue)' }}>{t('attacking')}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {Object.entries(attacking).map(([key, value]) => (
                      value !== null && value !== undefined && (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{key.replace(/_/g, ' ')}</span>
                          <span style={{ fontWeight: 700, color: 'var(--neon-blue)' }}>{value}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(defending).length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid var(--neon-purple)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-purple)' }}>{t('defending')}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {Object.entries(defending).map(([key, value]) => (
                      value !== null && value !== undefined && (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{key.replace(/_/g, ' ')}</span>
                          <span style={{ fontWeight: 700, color: 'var(--neon-purple)' }}>{value}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(athleticism).length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(255, 107, 53, 0.1)', border: '1px solid var(--neon-orange)', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>{t('athleticism')}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {Object.entries(athleticism).map(([key, value]) => (
                      value !== null && value !== undefined && (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{key.replace(/_/g, ' ')}</span>
                          <span style={{ fontWeight: 700, color: 'var(--neon-orange)' }}>{value}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {(Array.isArray(player.skills) && player.skills.length > 0) || (Array.isArray(player.com_skills) && player.com_skills.length > 0) ? (
          <div style={{ marginBottom: '24px' }}>
            <h3 className="neon-text" style={{ fontSize: '20px', marginBottom: '16px' }}>{t('skills')}</h3>
            {Array.isArray(player.skills) && player.skills.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px' }}>{lang === 'it' ? 'Abilità Giocatore' : 'Player Skills'}</div>
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
            {Array.isArray(player.com_skills) && player.com_skills.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px' }}>{lang === 'it' ? 'Abilità Aggiuntive' : 'Additional Skills'}</div>
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
        ) : null}

        {/* Boosters */}
        {Array.isArray(player.available_boosters) && player.available_boosters.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 className="neon-text" style={{ fontSize: '20px', marginBottom: '16px' }}>{t('boosters')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {player.available_boosters.map((booster, idx) => (
                <div key={idx} style={{
                  padding: '12px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid var(--neon-blue)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--neon-blue)' }}>
                    {booster.name || `Booster ${idx + 1}`}
                  </div>
                  {booster.effect && (
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>{booster.effect}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        {(metadata.weak_foot_frequency || metadata.weak_foot_accuracy || metadata.form_detailed || metadata.injury_resistance) && (
          <div>
            <h3 className="neon-text" style={{ fontSize: '20px', marginBottom: '16px' }}>{lang === 'it' ? 'Caratteristiche' : 'Characteristics'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              {metadata.weak_foot_frequency && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('weakFootFrequency')}</div>
                  <div style={{ fontWeight: 600 }}>{metadata.weak_foot_frequency}</div>
                </div>
              )}
              {metadata.weak_foot_accuracy && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('weakFootAccuracy')}</div>
                  <div style={{ fontWeight: 600 }}>{metadata.weak_foot_accuracy}</div>
                </div>
              )}
              {metadata.form_detailed && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('formDetailed')}</div>
                  <div style={{ fontWeight: 600 }}>{metadata.form_detailed}</div>
                </div>
              )}
              {metadata.injury_resistance && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{t('injuryResistance')}</div>
                  <div style={{ fontWeight: 600 }}>{metadata.injury_resistance}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
