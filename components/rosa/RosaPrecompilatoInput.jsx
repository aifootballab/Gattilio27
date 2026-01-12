import React, { useState } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import './RosaPrecompilatoInput.css'

function RosaPrecompilatoInput({ onBack, onRosaCreated }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const { createRosa, addPlayer } = useRosa()

  // Mock players database
  const mockPlayers = [
    { id: '1', name: 'Ronaldinho', rating: 98, position: 'AMF' },
    { id: '2', name: 'Kylian Mbappé', rating: 97, position: 'CF' },
    { id: '3', name: 'Marcus Thuram', rating: 85, position: 'LWF' },
    { id: '4', name: 'Franz Beckenbauer', rating: 98, position: 'DC' },
  ]

  const filteredPlayers = mockPlayers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectPlayer = (player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => prev.filter(p => p.id !== player.id))
    } else {
      setSelectedPlayers(prev => [...prev, player])
    }
  }

  const handleCreateRosa = async () => {
    const players = selectedPlayers.map(p => ({
      player_id: p.id,
      player_name: p.name,
      overall_rating: p.rating,
      position: p.position,
      source: 'database'
    }))

    try {
      await createRosa({ 
        name: 'Rosa da Database',
        players 
      })
      
      players.forEach(player => addPlayer(player))
      onRosaCreated()
    } catch (error) {
      console.error('Errore creazione rosa:', error)
    }
  }

  return (
    <div className="rosa-precompilato-input">
      <button onClick={onBack} className="back-button">← Indietro</button>
      
      <div className="precompilato-input-container">
        <h3>Import da Database</h3>
        <p className="instruction">
          Cerca e seleziona i giocatori dal database efootballhub.net
        </p>

        <div className="search-section">
          <input
            type="text"
            placeholder="Cerca giocatore..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="players-section">
          <div className="players-list">
            {filteredPlayers.map(player => {
              const isSelected = selectedPlayers.find(p => p.id === player.id)
              return (
                <div
                  key={player.id}
                  className={`player-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectPlayer(player)}
                >
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-details">
                      {player.position} • Rating: {player.rating}
                    </span>
                  </div>
                  {isSelected && <span className="check-icon">✓</span>}
                </div>
              )
            })}
          </div>

          {selectedPlayers.length > 0 && (
            <div className="selected-section">
              <h4>Giocatori selezionati: {selectedPlayers.length}</h4>
              <button 
                onClick={handleCreateRosa}
                className="create-button"
              >
                Crea Rosa con {selectedPlayers.length} Giocatori
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RosaPrecompilatoInput
