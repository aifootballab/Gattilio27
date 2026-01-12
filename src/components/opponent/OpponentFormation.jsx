import React, { useState } from 'react'
import './OpponentFormation.css'

function OpponentFormation() {
  const [inputMode, setInputMode] = useState(null) // 'screenshot', 'manual', 'voice'
  const [formation, setFormation] = useState(null)

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // TODO: Process screenshot with Vision AI to extract formation
      console.log('Processing opponent formation screenshot:', file.name)
    }
  }

  const handleVoiceInput = () => {
    // TODO: Start voice recording for formation description
    console.log('Starting voice input for formation')
  }

  return (
    <div className="opponent-formation">
      <h3 className="section-title">FORMAZIONE AVVERSARIA</h3>

      {!formation ? (
        <div className="input-selector">
          <p className="instruction">Come vuoi inserire la formazione avversaria?</p>
          
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
                <span className="mode-desc">Carica screenshot formazione</span>
              </div>
            </label>

            <button
              className="input-mode-card"
              onClick={() => setInputMode('manual')}
            >
              <div className="mode-content">
                <span className="mode-icon">✏️</span>
                <span className="mode-label">Manuale</span>
                <span className="mode-desc">Seleziona formazione</span>
              </div>
            </button>

            <button
              className="input-mode-card"
              onClick={handleVoiceInput}
            >
              <div className="mode-content">
                <span className="mode-icon">🎤</span>
                <span className="mode-label">Voce</span>
                <span className="mode-desc">Descrivi formazione</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="formation-display">
          <div className="formation-name">{formation.name}</div>
          <div className="formation-tactics">{formation.tactics}</div>
          <button className="analyze-btn">Analizza Contromisure</button>
        </div>
      )}

      {inputMode === 'manual' && (
        <div className="manual-formation-selector">
          <h4>Seleziona Formazione</h4>
          <div className="formations-grid">
            {['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2'].map((form) => (
              <button
                key={form}
                className="formation-option"
                onClick={() => {
                  setFormation({ name: form, tactics: 'Standard' })
                  setInputMode(null)
                }}
              >
                {form}
              </button>
            ))}
          </div>
          <div className="tactics-selector">
            <label>Tattiche Avversarie:</label>
            <select className="tactics-select">
              <option>Contropiede Veloce</option>
              <option>Possesso Palla</option>
              <option>Gioco sulle Fasce</option>
              <option>Gioco Centrale</option>
              <option>Pressing Alto</option>
            </select>
          </div>
          <button
            className="save-formation-btn"
            onClick={() => {
              // Save formation
              setInputMode(null)
            }}
          >
            Salva Formazione
          </button>
        </div>
      )}
    </div>
  )
}

export default OpponentFormation
