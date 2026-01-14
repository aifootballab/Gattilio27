'use client'

import React from 'react'
import ScreenshotUpload from './ScreenshotUpload'
import { useRosa } from '@/contexts/RosaContext'
import './RosaScreenshotInput.css'

function RosaScreenshotInput({ onBack, onRosaCreated }) {
  const { addPlayer } = useRosa()

  const handlePlayerExtracted = (player) => {
    // Player già aggiunto da ScreenshotUpload
    // Notifica completamento se necessario
    if (onRosaCreated) {
      onRosaCreated()
    }
  }

  return (
    <div className="rosa-screenshot-input">
      <div className="screenshot-header">
        <button className="back-btn" onClick={onBack}>
          ← Indietro
        </button>
        <h2>Carica Screenshot Profilo Giocatore</h2>
      </div>

      <div className="screenshot-instructions">
        <p>
          Carica uno screenshot del profilo giocatore da eFootball.
          Il sistema estrarrà automaticamente:
        </p>
        <ul>
          <li>Nome giocatore e rating</li>
          <li>Posizione e statistiche complete</li>
          <li>Skills e abilità speciali</li>
          <li>Build e punti sviluppo (se visibili)</li>
        </ul>
      </div>

      <ScreenshotUpload onPlayerExtracted={handlePlayerExtracted} />
    </div>
  )
}

export default RosaScreenshotInput
