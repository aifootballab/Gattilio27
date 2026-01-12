'use client'

import React, { useState } from 'react'
import RosaVoiceInput from './RosaVoiceInput'
import RosaScreenshotInput from './RosaScreenshotInput'
import RosaPrecompilatoInput from './RosaPrecompilatoInput'
import RosaManualInput from './RosaManualInput'
import { UserPlus, Mic, Camera, Database } from 'lucide-react'
import './RosaInputSelector.css'

const INPUT_MODES = {
  MANUAL: 'manual',
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
        {selectedMode === INPUT_MODES.MANUAL && (
          <RosaManualInput onBack={handleBack} onRosaCreated={onRosaCreated} />
        )}
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
          onClick={() => handleModeSelect(INPUT_MODES.MANUAL)}
        >
          <div className="mode-icon">
            <UserPlus size={32} />
          </div>
          <h3>Inserimento Manuale</h3>
          <p>Inserisci manualmente tutti i dati del giocatore</p>
          <div className="mode-badge">Principale</div>
        </div>

        <div 
          className="input-mode-card"
          onClick={() => handleModeSelect(INPUT_MODES.SCREENSHOT)}
        >
          <div className="mode-icon">
            <Camera size={32} />
          </div>
          <h3>Carica Screenshot</h3>
          <p>Carica screenshot dei profili giocatori da eFootball</p>
          <div className="mode-badge">Preciso</div>
        </div>

        <div 
          className="input-mode-card"
          onClick={() => handleModeSelect(INPUT_MODES.PRECOMPILATO)}
        >
          <div className="mode-icon">
            <Database size={32} />
          </div>
          <h3>Import da Database</h3>
          <p>Seleziona da efootballhub.net o database interno</p>
          <div className="mode-badge">Completo</div>
        </div>

        <div 
          className="input-mode-card"
          onClick={() => handleModeSelect(INPUT_MODES.VOICE)}
        >
          <div className="mode-icon">
            <Mic size={32} />
          </div>
          <h3>Dettatura Vocale</h3>
          <p>Descrivi verbalmente i giocatori della tua squadra</p>
          <div className="mode-badge">Rapido</div>
        </div>
      </div>
    </div>
  )
}

export default RosaInputSelector
