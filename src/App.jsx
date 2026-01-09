import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="app">
      <div className="hero-section">
        <div className={`container ${isLoaded ? 'loaded' : ''}`}>
          <div className="logo-container">
            <div className="logo">⚽</div>
            <h1 className="title">eFootball Platform</h1>
            <p className="subtitle">La piattaforma moderna per il calcio digitale</p>
            <p className="greeting">Ciao</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Competizioni</h3>
              <p>Partecipa a tornei e competizioni</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Community</h3>
              <p>Connettiti con altri giocatori</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Statistiche</h3>
              <p>Monitora le tue performance</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>Gaming</h3>
              <p>Esperienza di gioco immersiva</p>
            </div>
          </div>

          <div className="cta-section">
            <button className="cta-button">Inizia Ora</button>
            <button className="cta-button secondary">Scopri di Più</button>
          </div>

          <div className="status-badge">
            <span className="status-dot"></span>
            <span>Sistema Operativo</span>
          </div>
        </div>
      </div>

      <div className="info-section">
        <div className="info-container">
          <h2>Configurazione Sistema</h2>
          <div className="config-grid">
            <div className="config-item">
              <strong>Framework:</strong> React + Vite
            </div>
            <div className="config-item">
              <strong>Hosting:</strong> Vercel
            </div>
            <div className="config-item">
              <strong>Database:</strong> Supabase
            </div>
            <div className="config-item">
              <strong>Version Control:</strong> GitHub
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
