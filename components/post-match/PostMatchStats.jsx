import React, { useState } from 'react'
import './PostMatchStats.css'

function PostMatchStats() {
  const [inputMode, setInputMode] = useState(null) // 'screenshot', 'manual', 'voice'
  const [stats, setStats] = useState(null)

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // TODO: Process screenshot with Vision AI
      console.log('Processing screenshot:', file.name)
    }
  }

  const handleVoiceInput = () => {
    // TODO: Start voice recording
    console.log('Starting voice input')
  }

  return (
    <div className="post-match-stats">
      <h3 className="section-title">STATISTICHE POST-PARTITA</h3>

      {!stats ? (
        <div className="input-selector">
          <p className="instruction">Come vuoi inserire le statistiche?</p>
          
          <div className="input-modes">
            <label className="input-mode-card">
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                className="file-input"
              />
              <div className="mode-content">
                <span className="mode-icon">📸</span>
                <span className="mode-label">Screenshot</span>
                <span className="mode-desc">Carica screenshot statistiche</span>
              </div>
            </label>

            <button
              className="input-mode-card"
              onClick={() => setInputMode('manual')}
            >
              <div className="mode-content">
                <span className="mode-icon">✏️</span>
                <span className="mode-label">Manuale</span>
                <span className="mode-desc">Inserisci manualmente</span>
              </div>
            </button>

            <button
              className="input-mode-card"
              onClick={handleVoiceInput}
            >
              <div className="mode-content">
                <span className="mode-icon">🎤</span>
                <span className="mode-label">Voce</span>
                <span className="mode-desc">Descrivi verbalmente</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="stats-display">
          {/* Stats will be displayed here */}
          <p>Statistiche caricate</p>
        </div>
      )}

      {inputMode === 'manual' && (
        <div className="manual-input-form">
          <h4>Inserisci Statistiche</h4>
          <div className="stats-form">
            <div className="form-row">
              <label>Possesso:</label>
              <input type="text" placeholder="45% - 55%" />
            </div>
            <div className="form-row">
              <label>Tiri Totali:</label>
              <input type="text" placeholder="12" />
            </div>
            <div className="form-row">
              <label>Tiri in Porta:</label>
              <input type="text" placeholder="8" />
            </div>
            <div className="form-row">
              <label>Passaggi Riusciti:</label>
              <input type="text" placeholder="85%" />
            </div>
            <div className="form-row">
              <label>Contrasti:</label>
              <input type="text" placeholder="15" />
            </div>
            <button className="save-stats-btn">Salva Statistiche</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostMatchStats
