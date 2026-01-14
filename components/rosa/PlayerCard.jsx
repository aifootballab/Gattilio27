'use client'

import React from 'react'
import { useRosa } from '@/contexts/RosaContext'
import './PlayerCard.css'

function PlayerCard({ player, onViewProfile }) {
  const { removePlayer } = useRosa()

  const handleRemove = () => {
    if (window.confirm(`Rimuovere ${player.player_name} dalla rosa?`)) {
      removePlayer(player.player_id)
    }
  }

  return (
    <div className="player-card">
      <div className="player-header">
        <div className="player-rating">{player.overall_rating}</div>
        <div className="player-info">
          <h3 className="player-name">{player.player_name}</h3>
          <span className="player-position">{player.position}</span>
        </div>
      </div>
      
      <div className="player-source">
        <span className="source-badge">
          {player.source === 'voice' && '🎤'}
          {player.source === 'screenshot' && '📸'}
          {player.source === 'database' && '📋'}
        </span>
      </div>

      <div className="player-actions">
        {onViewProfile && (
          <button 
            onClick={() => onViewProfile(player)}
            className="view-profile-button"
            title="Vedi profilo completo"
          >
            👁️
          </button>
        )}
        <button 
          onClick={handleRemove}
          className="remove-button"
          title="Rimuovi giocatore"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default PlayerCard
