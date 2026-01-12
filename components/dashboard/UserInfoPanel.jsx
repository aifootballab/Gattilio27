'use client'

import React from 'react'
import { useRosa } from '@/contexts/RosaContext'
import PostMatchStats from '@/components/post-match/PostMatchStats'
import './UserInfoPanel.css'

function UserInfoPanel() {
  const { rosa } = useRosa()

  return (
    <div className="user-info-panel">
      {/* User Profile */}
      <div className="panel-section">
        <h3 className="section-title">USER PROFILE</h3>
        <div className="subscription-info">
          <div className="subscription-tier">
            <span>ABBONAMENTO: Elite Assistant</span>
          </div>
          <div className="subscription-status">
            <span className="status-badge active">ACTIVE</span>
            <span className="subscription-details">(120 Min/Mese)</span>
          </div>
        </div>
      </div>

      {/* Voice Minutes */}
      <div className="panel-section">
        <h3 className="section-title">MINUTI VOCE RIMANENTI</h3>
        <div className="voice-minutes-display">
          <span className="minutes-large">07</span>
        </div>
      </div>

      {/* Post-Match Statistics */}
      <div className="panel-section">
        <PostMatchStats />
      </div>

      {/* Weaknesses */}
      <div className="panel-section">
        <h3 className="section-title">WEAKNESSES</h3>
        <ul className="weaknesses-list">
          <li>Difesa sui cross</li>
          <li>Costruzione dal basso</li>
        </ul>
      </div>

      {/* Recommended Tactics */}
      <div className="panel-section">
        <h3 className="section-title">RECOMMENDED TACTICS</h3>
        <div className="tactics-list">
          <div className="tactic-item">
            <span className="tactic-number">1.</span>
            <span className="tactic-text">POSIZIONAMENTO: Ronaldinho &gt; ESA</span>
          </div>
          <div className="tactic-item">
            <span className="tactic-number">2.</span>
            <span className="tactic-text">ATTACCO: EDA: Ala Prolifica</span>
          </div>
        </div>
        <div className="voice-feedback">
          <span className="voice-icon">💬</span>
          <span className="voice-text">
            OK GABRIELE. RONALDINHO BIG TIME. ENTRA COME ALA SINISTRA. 
            HO MASSIMIZZATO VELOCITÀ E ACCELERAZIONE...
          </span>
        </div>
      </div>

      {/* Companions */}
      <div className="panel-section">
        <h3 className="section-title">COMPANIONS</h3>
        <div className="companions-grid">
          <div className="companion-card">
            <div className="companion-image">👤</div>
            <div className="companion-info">
              <span className="companion-name">Mbappé</span>
              <span className="companion-badge">(POTW)</span>
            </div>
          </div>
          <div className="companion-card">
            <div className="companion-image">👤</div>
            <div className="companion-info">
              <span className="companion-name">P.Salah</span>
              <span className="companion-badge">Epic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserInfoPanel
