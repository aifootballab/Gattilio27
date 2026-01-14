'use client'

import React from 'react'
import { useRosa } from '@/contexts/RosaContext'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import RosaStatusPanel from '@/components/dashboard/RosaStatusPanel'
import AIBrainButton from '@/components/dashboard/AIBrainButton'
import Link from 'next/link'
import { 
  TrendingUp, Users, 
  ArrowRight, FileText, Target
} from 'lucide-react'
import './DashboardPage.css'

function DashboardPage() {
  const { rosa, hasRosa, playerCount } = useRosa()

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-container">
          {/* AI Brain Button - Centrale */}
          <div className="dashboard-brain-container">
            <AIBrainButton />
          </div>

          {/* Hero Section - Rosa Status */}
          <div className="dashboard-hero">
            <RosaStatusPanel />
          </div>

          {/* Quick Actions Grid */}
          <div className="dashboard-actions">
            <h2 className="section-title">Azioni Rapide</h2>
            <div className="actions-grid">
              <Link href="/rosa" className="action-card rosa-card">
                <div className="action-icon">
                  <Users size={32} />
                </div>
                <div className="action-content">
                  <h3>Gestisci Rosa</h3>
                  <p>Carica e gestisci la tua squadra</p>
                </div>
                <ArrowRight size={20} className="action-arrow" />
              </Link>
            </div>
          </div>

          {/* Recommendations Section (se ci sono dati) */}
          {hasRosa && playerCount > 0 && (
            <div className="dashboard-recommendations">
              <h2 className="section-title">Raccomandazioni</h2>
              <div className="recommendations-grid">
                <div className="recommendation-card">
                  <div className="recommendation-header">
                    <TrendingUp size={20} />
                    <span className="recommendation-label">Alto Impatto</span>
                  </div>
                  <div className="recommendation-count">0</div>
                  <p className="recommendation-desc">Raccomandazioni prioritarie</p>
                </div>
                <div className="recommendation-card">
                  <div className="recommendation-header">
                    <Target size={20} />
                    <span className="recommendation-label">Medio Impatto</span>
                  </div>
                  <div className="recommendation-count">0</div>
                  <p className="recommendation-desc">Miglioramenti consigliati</p>
                </div>
                <div className="recommendation-card">
                  <div className="recommendation-header">
                    <FileText size={20} />
                    <span className="recommendation-label">Basso Impatto</span>
                  </div>
                  <div className="recommendation-count">0</div>
                  <p className="recommendation-desc">Suggerimenti opzionali</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
