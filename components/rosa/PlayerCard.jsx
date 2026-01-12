'use client'

import React from 'react'
import { useRosa } from '../../contexts/RosaContext'
import './PlayerCard.css'

function PlayerCard({ player }) {
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

      <button 
        onClick={handleRemove}
        className="remove-button"
        title="Rimuovi giocatore"
      >
        ×
      </button>
    </div>
  )
}

export default PlayerCard
