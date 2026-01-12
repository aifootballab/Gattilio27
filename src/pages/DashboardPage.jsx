import React from 'react'
import { Link } from 'react-router-dom'
import { useRosa } from '../contexts/RosaContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import './DashboardPage.css'

function DashboardPage() {
  const { rosa, hasRosa, playerCount } = useRosa()

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p>Benvenuto nel tuo centro di controllo</p>
        </div>

        <div className="dashboard-grid">
          {/* Rosa Status Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2>La tua Rosa</h2>
              {hasRosa && (
                <span className="badge">{playerCount} giocatori</span>
              )}
            </div>
            <div className="card-content">
              {hasRosa ? (
                <>
                  <p className="rosa-name">{rosa.name}</p>
                  <Link to="/rosa" className="card-link">
                    Visualizza Rosa →
                  </Link>
                </>
              ) : (
                <>
                  <p>Nessuna rosa creata</p>
                  <Link to="/rosa" className="card-link primary">
                    Crea la tua Rosa →
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Azioni Rapide</h2>
            </div>
            <div className="card-content">
              <Link to="/rosa" className="quick-action">
                <span className="action-icon">➕</span>
                <span>Aggiungi Giocatori</span>
              </Link>
              <Link to="/coaching" className="quick-action">
                <span className="action-icon">💡</span>
                <span>Chiedi Consiglio</span>
              </Link>
            </div>
          </div>

          {/* Stats Preview */}
          {hasRosa && rosa.squad_analysis && (
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Analisi Squadra</h2>
              </div>
              <div className="card-content">
                <div className="analysis-preview">
                  <div className="analysis-item">
                    <strong>Punti di Forza:</strong>
                    <ul>
                      {rosa.squad_analysis.strengths.slice(0, 2).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="analysis-item">
                    <strong>Da Migliorare:</strong>
                    <ul>
                      {rosa.squad_analysis.weaknesses.slice(0, 2).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
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
