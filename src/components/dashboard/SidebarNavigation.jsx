import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useRosa } from '../../contexts/RosaContext'
import './SidebarNavigation.css'

function SidebarNavigation() {
  const location = useLocation()
  const { hasRosa, playerCount } = useRosa()

  const isActive = (path) => location.pathname === path

  const menuItems = [
    {
      path: '/dashboard',
      icon: '🏠',
      label: 'Dashboard',
      badge: null
    },
    {
      path: '/rosa',
      icon: '👥',
      label: 'Rosa',
      badge: hasRosa ? playerCount : null
    },
    {
      path: '/match-center',
      icon: '🎯',
      label: 'Match Center',
      badge: null
    },
    {
      path: '/coaching',
      icon: '💡',
      label: 'Coaching',
      badge: null
    },
    {
      path: '/analisi',
      icon: '📊',
      label: 'Analisi',
      badge: null
    },
    {
      path: '/impostazioni',
      icon: '⚙️',
      label: 'Impostazioni',
      badge: null
    }
  ]

  return (
    <aside className="sidebar-navigation">
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-icon">⚔️</span>
          <span className="logo-text">ATTILA</span>
        </div>
        <div className="logo-subtitle">EFOOTBALL AI COACH</div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-quick-info">
          <div className="voice-minutes">
            <span className="minutes-label">Minuti Voce</span>
            <span className="minutes-value">--</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default SidebarNavigation
