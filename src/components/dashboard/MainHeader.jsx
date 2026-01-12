import React from 'react'
import { Link } from 'react-router-dom'
import './MainHeader.css'

function MainHeader({ userName = 'GABRIELE' }) {
  return (
    <header className="main-header">
      <div className="header-left">
        <button className="nav-arrow left" aria-label="Indietro">
          ←
        </button>
      </div>

      <div className="header-center">
        <div className="header-logo">
          <span className="logo-icon">⚔️</span>
          <span className="logo-text">ATTILA: EFOOTBALL AI COACH</span>
        </div>
      </div>

      <div className="header-right">
        <div className="user-info">
          <span className="user-label">Utente:</span>
          <span className="user-name">{userName}</span>
          <div className="user-avatar">
            <span>👤</span>
          </div>
        </div>
        <button className="nav-arrow right" aria-label="Avanti">
          →
        </button>
      </div>
    </header>
  )
}

export default MainHeader
