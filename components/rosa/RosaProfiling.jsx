import React, { useState } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import RosaInputSelector from './RosaInputSelector'
import RosaViewer from './RosaViewer'
import RosaAnalysis from './RosaAnalysis'
import './RosaProfiling.css'

function RosaProfiling() {
  const { rosa, hasRosa, createRosa, resetRosa } = useRosa()
  const [showInput, setShowInput] = useState(!hasRosa)

  const handleRosaCreated = () => {
    setShowInput(false)
  }

  const handleReset = () => {
    resetRosa()
    setShowInput(true)
  }

  return (
    <div className="rosa-profiling">
      {!hasRosa || showInput ? (
        <div className="rosa-input-section">
          <div className="section-header">
            <h2>Crea la tua Rosa</h2>
            <p>Scegli come vuoi inserire i giocatori della tua squadra</p>
          </div>
          <RosaInputSelector onRosaCreated={handleRosaCreated} />
        </div>
      ) : (
        <div className="rosa-content-section">
          <div className="rosa-actions">
            <button onClick={() => setShowInput(true)} className="action-btn">
              ➕ Aggiungi Giocatori
            </button>
            <button onClick={handleReset} className="action-btn secondary">
              🔄 Reset Rosa
            </button>
          </div>
          
          <RosaViewer />
          
          {rosa.players.length > 0 && (
            <RosaAnalysis />
          )}
        </div>
      )}
    </div>
  )
}

export default RosaProfiling
