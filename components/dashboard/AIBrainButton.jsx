'use client'

import React, { useState } from 'react'
import { Brain, Upload, X } from 'lucide-react'
import VoiceCoachingPanel from '../coaching/VoiceCoachingPanel'
import ScreenshotUpload from '../rosa/ScreenshotUpload'
import gptRealtimeService from '@/services/gptRealtimeService'
import './AIBrainButton.css'

/**
 * Componente AI Brain - Pulsante centrale che apre conversazione vocale
 * Il "cervello" è il punto focale che:
 * - Apre la chat vocale persistente
 * - Permette caricamento screenshot
 * - Mantiene la sessione attiva
 */
export default function AIBrainButton() {
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState(null) // 'voice' | 'screenshot' | null

  const handleBrainClick = () => {
    if (!isActive) {
      // Apri modalità voice coaching
      setIsActive(true)
      setMode('voice')
    } else {
      // Chiudi
      setIsActive(false)
      setMode(null)
    }
  }

  const handleScreenshotClick = () => {
    setMode('screenshot')
  }

  const handleClose = async () => {
    // Chiudi sessione Realtime quando si chiude il panel
    gptRealtimeService.disconnect()
    setIsActive(false)
    setMode(null)
  }

  return (
    <div className="ai-brain-container">
      {/* AI Brain Button - Centrale */}
      <button
        className={`ai-brain-button ${isActive ? 'active' : ''}`}
        onClick={handleBrainClick}
        title={isActive ? 'Chiudi Coach' : 'Apri Coach Personale'}
      >
        <div className="brain-glow"></div>
        <Brain size={48} className="brain-icon" />
        {!isActive && (
          <div className="brain-pulse"></div>
        )}
      </button>

      {/* Circuit Lines - Animazione linee che connettono ai panel */}
      {isActive && (
        <svg className="circuit-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          {/* Linee animate che si connettono ai vari panel */}
          <path
            d="M 500 500 L 100 200"
            className="circuit-line line-1"
            stroke="#a855f7"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 500 500 L 900 200"
            className="circuit-line line-2"
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 500 500 L 100 800"
            className="circuit-line line-3"
            stroke="#ec4899"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 500 500 L 900 800"
            className="circuit-line line-4"
            stroke="#10b981"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
        </svg>
      )}

      {/* Panel Conversazione - Si apre quando il cervello è attivo */}
      {isActive && (
        <div className="ai-brain-panel">
          <div className="panel-header">
            <div className="panel-tabs">
              <button
                className={`tab-button ${mode === 'voice' ? 'active' : ''}`}
                onClick={() => setMode('voice')}
              >
                🎤 Voice Coach
              </button>
              <button
                className={`tab-button ${mode === 'screenshot' ? 'active' : ''}`}
                onClick={handleScreenshotClick}
              >
                📸 Screenshot
              </button>
            </div>
            <button className="close-button" onClick={handleClose}>
              <X size={20} />
            </button>
          </div>

          <div className="panel-content">
            {mode === 'voice' && (
              <VoiceCoachingPanel />
            )}
            {mode === 'screenshot' && (
              <ScreenshotUpload onPlayerExtracted={() => {}} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}