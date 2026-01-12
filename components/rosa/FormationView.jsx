'use client'

import React, { useState } from 'react'
import './FormationView.css'

// Mappa posizioni a coordinate campo (percentuali)
const POSITION_COORDS = {
  GK: { x: 50, y: 92 },
  CB: [
    { x: 30, y: 70 },
    { x: 50, y: 75 },
    { x: 70, y: 70 }
  ],
  LB: { x: 15, y: 60 },
  RB: { x: 85, y: 60 },
  DMF: [
    { x: 50, y: 60 }
  ],
  CMF: [
    { x: 35, y: 50 },
    { x: 50, y: 50 },
    { x: 65, y: 50 }
  ],
  LMF: { x: 20, y: 40 },
  RMF: { x: 80, y: 40 },
  AMF: [
    { x: 50, y: 40 }
  ],
  LWF: { x: 25, y: 25 },
  RWF: { x: 75, y: 25 },
  SS: [
    { x: 45, y: 25 },
    { x: 55, y: 25 }
  ],
  CF: [
    { x: 50, y: 20 }
  ]
}

function FormationView({ players = [] }) {
  const [hoveredPlayer, setHoveredPlayer] = useState(null)

  // Mappa giocatori alle posizioni sul campo
  const getPlayerPosition = (player, index) => {
    if (!player?.position) {
      // Default position se non specificata
      return { x: 30 + (index % 4) * 20, y: 30 + Math.floor(index / 4) * 25 }
    }

    const position = player.position
    const coords = POSITION_COORDS[position]

    if (!coords) {
      // Fallback
      return { x: 30 + (index % 4) * 20, y: 30 + Math.floor(index / 4) * 25 }
    }

    if (Array.isArray(coords)) {
      // Posizione che può avere più giocatori
      const posIndex = players.slice(0, index).filter(p => p?.position === position).length
      return coords[posIndex % coords.length] || coords[0]
    }

    return coords
  }

  const getRatingColor = (rating) => {
    if (rating >= 90) return '#ffd700' // Oro
    if (rating >= 85) return '#ff6b6b' // Rosso
    if (rating >= 80) return '#4ecdc4' // Turchese
    if (rating >= 75) return '#95e1d3' // Verde chiaro
    if (rating >= 70) return '#fce38a' // Giallo
    return '#a0a0a0' // Grigio
  }

  return (
    <div className="formation-view">
      <div className="formation-field">
        {/* Pattern erba */}
        <div className="grass-pattern"></div>
        
        {/* Linee campo */}
        <div className="center-line"></div>
        <div className="center-circle"></div>
        <div className="penalty-area top">
          <div className="penalty-box top"></div>
        </div>
        <div className="penalty-area bottom">
          <div className="penalty-box bottom"></div>
        </div>
        <div className="goal-area top">
          <div className="goal-box top"></div>
        </div>
        <div className="goal-area bottom">
          <div className="goal-box bottom"></div>
        </div>

        {/* Cerchi campo */}
        <div className="corner-circle top-left"></div>
        <div className="corner-circle top-right"></div>
        <div className="corner-circle bottom-left"></div>
        <div className="corner-circle bottom-right"></div>

        {/* Giocatori */}
        {players.map((player, index) => {
          if (!player) return null

          const pos = getPlayerPosition(player, index)
          const rating = player.overall_rating || player.base_stats?.overall_rating || 0
          const ratingColor = getRatingColor(rating)
          const isHovered = hoveredPlayer === index

          return (
            <div
              key={player.player_id || index}
              className={`formation-player ${isHovered ? 'hovered' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`
              }}
              onMouseEnter={() => setHoveredPlayer(index)}
              onMouseLeave={() => setHoveredPlayer(null)}
            >
              <div 
                className="player-marker"
                style={{
                  background: `linear-gradient(135deg, ${ratingColor} 0%, ${ratingColor}dd 100%)`,
                  borderColor: ratingColor,
                  boxShadow: isHovered ? `0 0 20px ${ratingColor}80` : '0 4px 12px rgba(0,0,0,0.4)'
                }}
              >
                <span className="player-rating">{rating || '?'}</span>
              </div>
              
              {/* Tooltip */}
              <div className={`player-tooltip ${isHovered ? 'visible' : ''}`}>
                <div className="tooltip-name">{player.player_name || 'Giocatore'}</div>
                <div className="tooltip-position">{player.position || 'N/A'}</div>
                {rating > 0 && (
                  <div className="tooltip-rating">Rating: {rating}</div>
                )}
              </div>

              {/* Linea connettore */}
              <div className="player-connector" style={{ borderColor: ratingColor }}></div>
            </div>
          )
        })}
      </div>

      {players.length === 0 && (
        <div className="empty-formation-message">
          <div className="empty-icon">⚽</div>
          <p>Nessun giocatore in formazione</p>
          <p className="empty-hint">Aggiungi giocatori per visualizzare la formazione</p>
        </div>
      )}
    </div>
  )
}

export default FormationView
