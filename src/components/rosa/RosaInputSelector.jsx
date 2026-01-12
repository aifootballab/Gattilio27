import React, { useState } from 'react'
import RosaVoiceInput from './RosaVoiceInput'
import RosaScreenshotInput from './RosaScreenshotInput'
import RosaPrecompilatoInput from './RosaPrecompilatoInput'
import './RosaInputSelector.css'

const INPUT_MODES = {
  VOICE: 'voice',
  SCREENSHOT: 'screenshot',
  PRECOMPILATO: 'precompilato'
}

function RosaInputSelector({ onRosaCreated }) {
  const [selectedMode, setSelectedMode] = useState(null)

  const handleModeSelect = (mode) => {
    setSelectedMode(mode)
  }

  const handleBack = () => {
    setSelectedMode(null)
  }

  if (selectedMode) {
    return (
      <div className="rosa-input-mode">
        {selectedMode === INPUT_MODES.VOICE && (
          <RosaVoiceInput onBack={handleBack} onRosaCreated={onRosaCreated} />
        )}
        {selectedMode === INPUT_MODES.SCREENSHOT && (
          <RosaScreenshotInput onBack={handleBack} onRosaCreated={onRosaCreated} />
        )}
        {selectedMode === INPUT_MODES.PRECOMPILATO && (
          <RosaPrecompilatoInput onBack={handleBack} onRosaCreated={onRosaCreated} />
        )}
      </div>
    )
  }

  return (
    <div className="rosa-input-selector">
      <div className="input-modes-grid">
        <div 
          className="input-mode-card"
          onClick={() => handleModeSelect(INPUT_MODES.VOICE)}
        >
          <div className="mode-icon">🎤</div>
          <h3>Dettatura Vocale</h3>
          <p>Descrivi verbalmente i giocatori della tua squadra</p>
          <div className="mode-badge">Rapido</div>
        </div>

        <div 
          className="input-mode-card"
          onClick={() => handleModeSelect(INPUT_MODES.SCREENSHOT)}
        >
          <div className="mode-icon">📸</div>
          <h3>Carica Screenshot</h3>
          <p>Carica screenshot dei profili giocatori da eFootball</p>
          <div className="mode-badge">Preciso</div>
        </div>

        <div 
          className="input-mode-card"
          onClick={() => handleModeSelect(INPUT_MODES.PRECOMPILATO)}
        >
          <div className="mode-icon">📋</div>
          <h3>Import da Database</h3>
          <p>Seleziona da efootballhub.net o database interno</p>
          <div className="mode-badge">Completo</div>
        </div>
      </div>
    </div>
  )
}

export default RosaInputSelector
