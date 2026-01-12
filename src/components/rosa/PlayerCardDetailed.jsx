import React from 'react'
import './PlayerCardDetailed.css'

function PlayerCardDetailed({ player, compact = false }) {
  if (!player) return null

  return (
    <div className={`player-card-detailed ${compact ? 'compact' : ''}`}>
      <div className="player-card-header">
        <div className="player-rating">{player.overall_rating || 'N/A'}</div>
        <div className="player-info">
          <h3 className="player-name">{player.player_name || 'Giocatore'}</h3>
          <span className="player-position">{player.position || 'N/A'}</span>
        </div>
      </div>

      {!compact && (
        <>
          {/* Info Aggiuntive */}
          {(player.height || player.weight || player.age) && (
            <div className="player-physical-info">
              {player.height && <span>{player.height}cm</span>}
              {player.weight && <span>{player.weight}kg</span>}
              {player.age && <span>{player.age} anni</span>}
            </div>
          )}

          {/* Statistiche Principali */}
          {(player.final_stats || player.base_stats) && (
            <div className="player-stats-preview">
              {(() => {
                const stats = player.final_stats || player.base_stats || {}
                const attacking = stats.attacking || {}
                const defending = stats.defending || {}
                const athleticism = stats.athleticism || {}
                
                // Calcola medie
                const attValues = Object.values(attacking).filter(v => typeof v === 'number')
                const defValues = Object.values(defending).filter(v => typeof v === 'number')
                const athValues = Object.values(athleticism).filter(v => typeof v === 'number')
                
                const attAvg = attValues.length > 0 ? Math.round(attValues.reduce((a, b) => a + b, 0) / attValues.length) : null
                const defAvg = defValues.length > 0 ? Math.round(defValues.reduce((a, b) => a + b, 0) / defValues.length) : null
                const athAvg = athValues.length > 0 ? Math.round(athValues.reduce((a, b) => a + b, 0) / athValues.length) : null
                
                return (
                  <>
                    {attAvg !== null && (
                      <div className="stat-item">
                        <span className="stat-label">Attacco</span>
                        <span className="stat-value">{attAvg}</span>
                      </div>
                    )}
                    {defAvg !== null && (
                      <div className="stat-item">
                        <span className="stat-label">Difesa</span>
                        <span className="stat-value">{defAvg}</span>
                      </div>
                    )}
                    {athAvg !== null && (
                      <div className="stat-item">
                        <span className="stat-label">Atletica</span>
                        <span className="stat-value">{athAvg}</span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {/* Abilità */}
          {player.skills && player.skills.length > 0 && (
            <div className="player-abilities-preview">
              <span className="abilities-label">Abilità:</span>
              <span className="abilities-count">{player.skills.length}</span>
            </div>
          )}

          {/* Build Info */}
          {(player.current_level || player.level_cap) && (
            <div className="player-build-info">
              {player.current_level && player.level_cap && (
                <span>Livello: {player.current_level}/{player.level_cap}</span>
              )}
              {player.active_booster && (
                <span className="booster-badge">{player.active_booster}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PlayerCardDetailed
