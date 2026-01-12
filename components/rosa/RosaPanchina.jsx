import React from 'react'
import { useRosa } from '../../contexts/RosaContext'
import PlayerCardDetailed from './PlayerCardDetailed'
import './RosaPanchina.css'

function RosaPanchina() {
  const { rosa } = useRosa()
  
  // Giocatori di riserva (slot 11-20) - rosa.players è array di 21 elementi (con null per slot vuoti)
  // IMPORTANTE: rosa.players mantiene l'ordine degli slot (0-20)
  const panchina = (rosa.players || [])
    .slice(11, 21) // Slot 11-20 (riserve)
    .filter(player => player !== null && player !== undefined) // Rimuovi slot vuoti

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
