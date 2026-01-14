'use client'

import React from 'react'
import { useRosa } from '@/contexts/RosaContext'
import Link from 'next/link'
import { Users, AlertCircle, ArrowRight } from 'lucide-react'
import './RosaStatusPanel.css'

function RosaStatusPanel() {
  const { rosa, hasRosa, playerCount } = useRosa()

  const completionPercentage = hasRosa ? Math.round((playerCount / 21) * 100) : 0
  const titolariCount = hasRosa ? Math.min(playerCount, 11) : 0
  const panchinaCount = hasRosa ? Math.max(0, playerCount - 11) : 0

  return (
    <div className="rosa-status-panel">
      <div className="rosa-status-header">
        <div className="rosa-status-icon">
          <Users size={32} />
        </div>
        <div className="rosa-status-title">
          <h2>Stato Rosa</h2>
          <p>Gestisci la tua squadra eFootball</p>
        </div>
      </div>

      {!hasRosa ? (
        <div className="rosa-empty-state">
          <AlertCircle size={48} className="empty-icon" />
          <h3>Nessuna Rosa Caricata</h3>
          <p>Carica la tua rosa per iniziare a ricevere suggerimenti personalizzati</p>
          <Link href="/rosa" className="rosa-action-btn primary">
            <Users size={20} />
            Carica Rosa
            <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <>
          <div className="rosa-completion-card">
            <div className="completion-header">
              <span className="completion-label">Completamento Rosa</span>
              <span className="completion-percentage">{completionPercentage}%</span>
            </div>
            <div className="completion-bar">
              <div 
                className="completion-fill" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="completion-stats">
              <div className="stat-item">
                <span className="stat-label">Titolari</span>
                <span className="stat-value">{titolariCount}/11</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Panchina</span>
                <span className="stat-value">{panchinaCount}/10</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Totale</span>
                <span className="stat-value">{playerCount}/21</span>
              </div>
            </div>
          </div>

          <div className="rosa-quick-actions">
            <Link href="/rosa" className="rosa-action-btn">
              <Users size={18} />
              Gestisci Rosa
              <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default RosaStatusPanel
