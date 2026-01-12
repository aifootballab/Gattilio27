import React from 'react'
import './MatchCenterPanel.css'

function MatchCenterPanel() {
  return (
    <div className="match-center-panel">
      {/* Match Center Section */}
      <div className="panel-section">
        <h3 className="section-title">MATCH CENTER</h3>
        <button className="voice-coaching-btn">
          <span className="btn-icon">🎤</span>
          <span>START VOICE COACHING</span>
        </button>
      </div>

      {/* Live Game Data */}
      <div className="panel-section">
        <h3 className="section-title">LIVE GAME DATA</h3>
        <div className="game-stats">
          <div className="stat-item">
            <span className="stat-label">POSSESSION:</span>
            <span className="stat-value">45% - 55%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">SHOTS (ON TARGET):</span>
            <span className="stat-value">5(3) - 5(4)</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">OPPONENT:</span>
            <span className="stat-value">8(3) - 5(4)</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">OPPONENT TACTICS:</span>
            <span className="stat-value">Contropiede Veloce</span>
          </div>
        </div>
      </div>

      {/* Player Focus */}
      <div className="panel-section">
        <h3 className="section-title">PLAYER FOCUS</h3>
        <div className="player-focus-card">
          <div className="player-image">
            <span>👤</span>
          </div>
          <div className="player-info">
            <h4 className="player-name">Ronaldinho</h4>
            <div className="player-details">
              <span>(Big Time)</span>
              <span>Restsico</span>
              <span>N°10 (Qatica)</span>
            </div>
            <div className="player-style">
              <span>▲ Style: Classico N°10 (Statico)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MatchCenterPanel
