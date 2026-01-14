'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRosa } from '@/contexts/RosaContext'
import './SidebarNavigation.css'

function SidebarNavigation() {
  const pathname = usePathname()
  const { hasRosa, playerCount } = useRosa()

  const isActive = (path) => pathname === path

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
    }
    // TODO: Aggiungere pagina impostazioni quando necessaria
    // {
    //   path: '/impostazioni',
    //   icon: '⚙️',
    //   label: 'Impostazioni',
    //   badge: null
    // }
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
            href={item.path}
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
