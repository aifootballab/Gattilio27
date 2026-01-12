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
          <div className="player-stats-preview">
            <div className="stat-item">
              <span className="stat-label">Attacco</span>
              <span className="stat-value">--</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Difesa</span>
              <span className="stat-value">--</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Forza</span>
              <span className="stat-value">--</span>
            </div>
          </div>

          <div className="player-abilities-preview">
            <span className="abilities-label">Abilità:</span>
            <span className="abilities-count">--</span>
          </div>
        </>
      )}
    </div>
  )
}

export default PlayerCardDetailed
