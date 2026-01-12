import React from 'react'
import { useRosa } from '../../contexts/RosaContext'
import PlayerCard from './PlayerCard'
import './RosaViewer.css'

function RosaViewer() {
  const { rosa } = useRosa()

  if (!rosa.players || rosa.players.length === 0) {
    return (
      <div className="rosa-viewer empty">
        <p>Nessun giocatore nella rosa</p>
      </div>
    )
  }

  return (
    <div className="rosa-viewer">
      <div className="rosa-header">
        <h2>{rosa.name || 'La mia Rosa'}</h2>
        <span className="player-count">{rosa.players.length} giocatori</span>
      </div>

      <div className="players-grid">
        {rosa.players.map((player, index) => (
          <PlayerCard key={player.player_id || index} player={player} />
        ))}
      </div>
    </div>
  )
}

export default RosaViewer
