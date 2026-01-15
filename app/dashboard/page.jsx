'use client'

import React from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '32px',
      display: 'grid',
      gridTemplateColumns: '300px 1fr 300px',
      gap: '24px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      {/* LEFT PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Player Roster */}
        <NeonPanel title="Roster" subtitle="I tuoi giocatori">
          <Link href="/my-players" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Visualizza Giocatori</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Gestisci la tua collezione</div>
            </div>
          </Link>
        </NeonPanel>

        {/* Squad Overview */}
        <NeonPanel title="Squad Overview" subtitle="La tua rosa">
          <Link href="/rosa" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Rosa (21 slot)</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Titolari e panchina</div>
            </div>
          </Link>
        </NeonPanel>

        {/* Tactical Goals */}
        <NeonPanel title="Open Tactical Goals" subtitle="Obiettivi">
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.3)'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Prossimamente...</div>
          </div>
        </NeonPanel>
      </div>

      {/* CENTER PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        {/* User Profile */}
        <NeonPanel title="User Profile" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 700,
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)'
            }}>
              👤
            </div>
            <div className="neon-text" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Utente Anonimo
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Master Level</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>AI Knowledge: High ✓</div>
          </div>
        </NeonPanel>

        {/* AI Brain - Elemento Centrale */}
        <div style={{
          width: '300px',
          height: '300px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            position: 'absolute',
            animation: 'pulse 4s ease-in-out infinite'
          }} />
          <div style={{
            fontSize: '120px',
            filter: 'drop-shadow(0 0 30px rgba(0, 212, 255, 0.8))',
            color: 'var(--neon-blue)',
            zIndex: 1
          }}>
            🧠
          </div>
          {/* Linee di connessione (decorative) */}
          <div style={{
            position: 'absolute',
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            background: `
              linear-gradient(45deg, transparent 48%, rgba(0, 212, 255, 0.1) 49%, rgba(0, 212, 255, 0.1) 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, rgba(168, 85, 247, 0.1) 49%, rgba(168, 85, 247, 0.1) 51%, transparent 52%)
            `,
            pointerEvents: 'none'
          }} />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Match Insights */}
        <NeonPanel title="Match Insights" subtitle="Analisi">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <InsightItem text="Struggles coaching press" />
            <InsightItem text="Reluctant to change formation" />
            <InsightItem text="Prefers quick, actionable tips" />
          </div>
        </NeonPanel>

        {/* Quick Links */}
        <NeonPanel title="Quick Links" subtitle="Navigazione">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <QuickLink href="/dashboard" icon="🏠" text="Home" />
            <QuickLink href="/my-players" icon="👥" text="Players" />
            <QuickLink href="/rosa" icon="⚽" text="Squad Builder" />
            <QuickLink href="/dashboard" icon="📊" text="Data & Analytics" />
            <QuickLink href="/dashboard" icon="🧠" text="Memory Hub" />
            <QuickLink href="/dashboard" icon="📋" text="Coaching" />
          </div>
        </NeonPanel>

        {/* Memory Insights */}
        <NeonPanel title="Memory Insights" subtitle="AI Learning">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <InsightItem text="Struggles against high press" color="orange" />
            <InsightItem text="Reluctant to change formation" color="orange" />
            <InsightItem text="Prefers quick, actionable tips" color="orange" />
          </div>
          <button className="neon-button" style={{ marginTop: '16px', width: '100%' }}>
            Start Session
          </button>
        </NeonPanel>
      </div>
    </div>
  )
}

function NeonPanel({ title, subtitle, children, style = {} }) {
  return (
    <div className="neon-panel" style={style}>
      <div style={{ marginBottom: '16px' }}>
        <h3 className="neon-text" style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
          {title}
        </h3>
        {subtitle && (
          <div style={{ fontSize: '12px', opacity: 0.7 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function InsightItem({ text, color = 'blue' }) {
  const colorMap = {
    blue: 'var(--neon-blue)',
    orange: 'var(--neon-orange)',
    purple: 'var(--neon-purple)'
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px',
      padding: '8px',
      borderRadius: '6px',
      background: `rgba(${color === 'blue' ? '0, 212, 255' : color === 'orange' ? '255, 107, 53' : '168, 85, 247'}, 0.1)`,
      border: `1px solid rgba(${color === 'blue' ? '0, 212, 255' : color === 'orange' ? '255, 107, 53' : '168, 85, 247'}, 0.3)`,
      fontSize: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `rgba(${color === 'blue' ? '0, 212, 255' : color === 'orange' ? '255, 107, 53' : '168, 85, 247'}, 0.2)`
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = `rgba(${color === 'blue' ? '0, 212, 255' : color === 'orange' ? '255, 107, 53' : '168, 85, 247'}, 0.1)`
    }}
    >
      <span style={{ color: colorMap[color] }}>→</span>
      <span style={{ flex: 1, opacity: 0.9 }}>{text}</span>
    </div>
  )
}

function QuickLink({ href, icon, text }) {
  // Mappa href corretti
  const hrefMap = {
    '/': '/rosa',
    '/my-players': '/my-players',
    '/squad': '/rosa',
    '/analytics': '/dashboard',
    '/memory': '/dashboard',
    '/coaching': '/dashboard'
  }
  const finalHref = hrefMap[href] || href
  
  return (
    <Link href={finalHref} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        padding: '10px',
        borderRadius: '8px',
        background: 'rgba(0, 212, 255, 0.1)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.4)'
        e.currentTarget.style.transform = 'translateX(4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateX(0)'
      }}
      >
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{text}</span>
        <span style={{ color: 'var(--neon-blue)', opacity: 0.7 }}>→</span>
      </div>
    </Link>
  )
}
