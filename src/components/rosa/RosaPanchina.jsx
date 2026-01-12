import React from 'react'
import { useRosa } from '../../contexts/RosaContext'
import PlayerCardDetailed from './PlayerCardDetailed'
import './RosaPanchina.css'

function RosaPanchina() {
  const { rosa } = useRosa()
  
  // Giocatori di riserva (dopo i primi 11)
  const panchina = rosa.players.slice(11)

  return (
    <div className="rosa-panchina">
      <div className="panchina-header">
        <h2>Panchina</h2>
        <span className="players-count">{panchina.length}</span>
      </div>

      {panchina.length === 0 ? (
        <div className="empty-panchina">
          <p>Nessun giocatore in panchina</p>
        </div>
      ) : (
        <div className="panchina-list">
          {panchina.map((player) => (
            <PlayerCardDetailed key={player.player_id} player={player} compact />
          ))}
        </div>
      )}
    </div>
  )
}

export default RosaPanchina
