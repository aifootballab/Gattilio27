import React, { useEffect } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import './RosaAnalysis.css'

function RosaAnalysis() {
  const { rosa, analyzeRosa, isLoading } = useRosa()

  useEffect(() => {
    if (rosa.players.length > 0 && !rosa.squad_analysis) {
      analyzeRosa()
    }
  }, [rosa.players.length])

  if (!rosa.squad_analysis) {
    return (
      <div className="rosa-analysis loading">
        {isLoading ? (
          <p>⏳ Analisi in corso...</p>
        ) : (
          <p>Carica analisi...</p>
        )}
      </div>
    )
  }

  const { strengths, weaknesses, recommended_formations } = rosa.squad_analysis

  return (
    <div className="rosa-analysis">
      <h2>Analisi Automatica Squadra</h2>
      
      <div className="analysis-grid">
        <div className="analysis-card strengths">
          <h3>💪 Punti di Forza</h3>
          <ul>
            {strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>

        <div className="analysis-card weaknesses">
          <h3>⚠️ Da Migliorare</h3>
          <ul>
            {weaknesses.map((weakness, index) => (
              <li key={index}>{weakness}</li>
            ))}
          </ul>
        </div>

        {recommended_formations && recommended_formations.length > 0 && (
          <div className="analysis-card formations">
            <h3>📐 Formazioni Consigliate</h3>
            <div className="formations-list">
              {recommended_formations.map((formation, index) => (
                <span key={index} className="formation-badge">
                  {formation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RosaAnalysis
