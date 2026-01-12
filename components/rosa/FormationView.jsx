import React from 'react'
import './FormationView.css'

function FormationView({ players = [] }) {
  // Mock formation - da implementare con posizionamento reale
  return (
    <div className="formation-view">
      <div className="formation-field">
        {/* Goal Area Top */}
        <div className="goal-area top"></div>
        
        {/* Penalty Area Top */}
        <div className="penalty-area top"></div>
        
        {/* Center Circle */}
        <div className="center-circle"></div>
        <div className="center-line"></div>
        
        {/* Penalty Area Bottom */}
        <div className="penalty-area bottom"></div>
        
        {/* Goal Area Bottom */}
        <div className="goal-area bottom"></div>
        
        {/* Players positioned on field */}
        {players.map((player, index) => (
          <div 
            key={player.player_id || index}
            className="formation-player"
            style={{
              top: `${20 + (index % 3) * 25}%`,
              left: `${30 + Math.floor(index / 3) * 20}%`
            }}
          >
            <div className="player-marker">
              {player.overall_rating || '?'}
            </div>
            <div className="player-name-tooltip">
              {player.player_name || `Giocatore ${index + 1}`}
            </div>
          </div>
        ))}
      </div>
      
      {players.length === 0 && (
        <div className="empty-formation-message">
          Aggiungi giocatori per vedere la formazione
        </div>
      )}
    </div>
  )
}

export default FormationView
