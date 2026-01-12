import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useRosa } from '../../contexts/RosaContext'
import './DashboardLayout.css'

function DashboardLayout({ children }) {
  const location = useLocation()
  const { hasRosa, playerCount } = useRosa()

  const isActive = (path) => location.pathname === path

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <Link to="/" className="logo-link">
            <span className="logo-icon">⚔️</span>
            <span className="logo-text">ATTILA: EFOOTBALL AI COACH</span>
          </Link>
          
          <nav className="header-nav">
            <Link 
              to="/dashboard" 
              className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/rosa" 
              className={`nav-link ${isActive('/rosa') ? 'active' : ''}`}
            >
              Rosa {hasRosa && <span className="badge-small">{playerCount}</span>}
            </Link>
            <Link 
              to="/coaching" 
              className={`nav-link ${isActive('/coaching') ? 'active' : ''}`}
            >
              Coaching
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {children}
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>&copy; 2025 ATTILA: EFOOTBALL AI COACH</p>
      </footer>
    </div>
  )
}

export default DashboardLayout
