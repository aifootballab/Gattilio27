'use client'

import React, { useState } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import PlayerCard from './PlayerCard'
import PlayerProfileView from './PlayerProfileView'
import './RosaViewer.css'

function RosaViewer() {
  const { rosa } = useRosa()
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'profile'

  if (!rosa.players || rosa.players.length === 0) {
    return (
      <div className="rosa-viewer empty">
        <p>Nessun giocatore nella rosa</p>
      </div>
    )
  }

  const handleViewProfile = (player) => {
    setSelectedPlayer(player)
    setViewMode('profile')
  }

  const handleCloseProfile = () => {
    setSelectedPlayer(null)
    setViewMode('grid')
  }

  if (viewMode === 'profile' && selectedPlayer) {
    return (
      <PlayerProfileView 
        player={selectedPlayer}
        onClose={handleCloseProfile}
        onEdit={() => {
          // TODO: Aprire form modifica
          console.log('Edit player', selectedPlayer)
        }}
      />
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
          <PlayerCard 
            key={player.player_id || index} 
            player={player}
            onViewProfile={handleViewProfile}
          />
        ))}
      </div>
    </div>
  )
}

export default RosaViewer
