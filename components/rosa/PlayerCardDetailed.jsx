'use client'

import React from 'react'
import './PlayerCardDetailed.css'

function PlayerCardDetailed({ player, compact = false }) {
  if (!player) return null

  const rating = player.overall_rating || player.base_stats?.overall_rating || 0
  
  const getRatingGradient = (rating) => {
    if (rating >= 90) return 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' // Oro
    if (rating >= 85) return 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' // Rosso
    if (rating >= 80) return 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)' // Turchese
    if (rating >= 75) return 'linear-gradient(135deg, #95e1d3 0%, #7dd3fc 100%)' // Verde chiaro
    if (rating >= 70) return 'linear-gradient(135deg, #fce38a 0%, #f59e0b 100%)' // Giallo
    return 'linear-gradient(135deg, #a0a0a0 0%, #808080 100%)' // Grigio
  }

  const getRatingColor = (rating) => {
    if (rating >= 90) return '#ffd700'
    if (rating >= 85) return '#ff6b6b'
    if (rating >= 80) return '#4ecdc4'
    if (rating >= 75) return '#95e1d3'
    if (rating >= 70) return '#f59e0b'
    return '#a0a0a0'
  }

  const stats = player.final_stats || player.base_stats || {}
  const attacking = stats.attacking || {}
  const defending = stats.defending || {}
  const athleticism = stats.athleticism || {}
  
  // Calcola medie
  const attValues = Object.values(attacking).filter(v => typeof v === 'number' && v > 0)
  const defValues = Object.values(defending).filter(v => typeof v === 'number' && v > 0)
  const athValues = Object.values(athleticism).filter(v => typeof v === 'number' && v > 0)
  
  const attAvg = attValues.length > 0 ? Math.round(attValues.reduce((a, b) => a + b, 0) / attValues.length) : null
  const defAvg = defValues.length > 0 ? Math.round(defValues.reduce((a, b) => a + b, 0) / defValues.length) : null
  const athAvg = athValues.length > 0 ? Math.round(athValues.reduce((a, b) => a + b, 0) / athValues.length) : null

  const ratingColor = getRatingColor(rating)
  const ratingGradient = getRatingGradient(rating)

  return (
    <div 
      className={`player-card-detailed ${compact ? 'compact' : ''}`}
      style={{
        borderColor: `rgba(${rating >= 90 ? '255, 215, 0' : rating >= 85 ? '255, 107, 107' : rating >= 80 ? '78, 205, 196' : rating >= 75 ? '149, 225, 211' : rating >= 70 ? '251, 191, 36' : '160, 160, 160'}, 0.3)`
      }}
    >
      <div className="player-card-header">
        <div 
          className="player-rating-circle"
          style={{
            background: ratingGradient,
            boxShadow: `0 4px 12px ${ratingColor}40`
          }}
        >
          <span className="player-rating-value">{rating || 'N/A'}</span>
        </div>
        <div className="player-info">
          <h3 className="player-name">{player.player_name || 'Giocatore'}</h3>
          <div className="player-meta">
            <span className="player-position">{player.position || 'N/A'}</span>
            {(player.nationality || player.club_name) && (
              <span className="player-separator">•</span>
            )}
            {player.nationality && (
              <span className="player-nationality">{player.nationality}</span>
            )}
            {player.club_name && (
              <span className="player-club">{player.club_name}</span>
            )}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          {/* Info fisiche */}
          {(player.height || player.weight || player.age) && (
            <div className="player-physical-info">
              {player.height && (
                <div className="physical-item">
                  <span className="physical-label">Altezza</span>
                  <span className="physical-value">{player.height} cm</span>
                </div>
              )}
              {player.weight && (
                <div className="physical-item">
                  <span className="physical-label">Peso</span>
                  <span className="physical-value">{player.weight} kg</span>
                </div>
              )}
              {player.age && (
                <div className="physical-item">
                  <span className="physical-label">Età</span>
                  <span className="physical-value">{player.age} anni</span>
                </div>
              )}
            </div>
          )}

          {/* Statistiche */}
          {(attAvg !== null || defAvg !== null || athAvg !== null) && (
            <div className="player-stats-preview">
              {attAvg !== null && (
                <div className="stat-item">
                  <div className="stat-bar">
                    <div 
                      className="stat-bar-fill" 
                      style={{
                        width: `${attAvg}%`,
                        background: 'linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 100%)'
                      }}
                    />
                  </div>
                  <span className="stat-label">Attacco</span>
                  <span className="stat-value">{attAvg}</span>
                </div>
              )}
              {defAvg !== null && (
                <div className="stat-item">
                  <div className="stat-bar">
                    <div 
                      className="stat-bar-fill" 
                      style={{
                        width: `${defAvg}%`,
                        background: 'linear-gradient(90deg, #4ecdc4 0%, #44a08d 100%)'
                      }}
                    />
                  </div>
                  <span className="stat-label">Difesa</span>
                  <span className="stat-value">{defAvg}</span>
                </div>
              )}
              {athAvg !== null && (
                <div className="stat-item">
                  <div className="stat-bar">
                    <div 
                      className="stat-bar-fill" 
                      style={{
                        width: `${athAvg}%`,
                        background: 'linear-gradient(90deg, #fce38a 0%, #f59e0b 100%)'
                      }}
                    />
                  </div>
                  <span className="stat-label">Atletica</span>
                  <span className="stat-value">{athAvg}</span>
                </div>
              )}
            </div>
          )}

          {/* Skills e Build */}
          <div className="player-footer">
            {player.skills && player.skills.length > 0 && (
              <div className="player-abilities">
                <span className="abilities-icon">⚡</span>
                <span className="abilities-count">{player.skills.length} Abilità</span>
              </div>
            )}
            {(player.current_level || player.level_cap || player.active_booster) && (
              <div className="player-build">
                {player.current_level && player.level_cap && (
                  <span className="build-level">Livello {player.current_level}/{player.level_cap}</span>
                )}
                {player.active_booster && (
                  <span className="booster-badge">{player.active_booster}</span>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PlayerCardDetailed
