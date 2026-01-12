'use client'

import React from 'react'
import Link from 'next/link'
import './HomePage.css'

function HomePage() {
  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="container">
          <div className="logo-container">
            <div className="logo">⚔️</div>
            <h1 className="title">ATTILA: EFOOTBALL AI COACH</h1>
            <p className="subtitle">Il tuo coach digitale multimodale</p>
          </div>

          <div className="cta-section">
            <Link href="/dashboard" className="cta-button primary">
              Accedi alla Dashboard
            </Link>
            <Link href="/rosa" className="cta-button secondary">
              Crea la tua Rosa
            </Link>
          </div>

          <div className="features-preview">
            <div className="feature-item">
              <span className="feature-icon">🎤</span>
              <span>Input Vocale</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📸</span>
              <span>Screenshot Analysis</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🧠</span>
              <span>AI Coaching</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
