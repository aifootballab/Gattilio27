'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { 
  Users, Home, Users as PlayersIcon, LayoutGrid, BarChart3, 
  ClipboardList, ChevronRight, User, CheckCircle2,
  Target, Zap, Shield
} from 'lucide-react'

export default function DashboardPage() {
  const { t, lang, changeLanguage } = useTranslation()

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '24px',
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 300px) 1fr minmax(280px, 300px)',
      gap: '24px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}
    className="dashboard-container"
    >
      {/* Language Switcher */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        background: 'rgba(10, 14, 39, 0.9)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <button
          onClick={() => changeLanguage('it')}
          style={{
            padding: '6px 12px',
            background: lang === 'it' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            color: lang === 'it' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          IT
        </button>
        <button
          onClick={() => changeLanguage('en')}
          style={{
            padding: '6px 12px',
            background: lang === 'en' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            color: lang === 'en' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          EN
        </button>
      </div>

      {/* LEFT PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <NeonPanel title={t('roster')} subtitle={t('yourPlayers')}>
          <Link href="/my-players" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="clickable-card" style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} />
                {t('viewPlayers')}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {t('manageCollection')}
              </div>
            </div>
          </Link>
        </NeonPanel>

        <NeonPanel title={t('squadOverview')} subtitle={t('yourSquad')}>
          <Link href="/rosa" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="clickable-card" style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutGrid size={16} />
                {t('squadSlots')}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {t('startersAndBench')}
              </div>
            </div>
          </Link>
        </NeonPanel>

        <NeonPanel title={t('tacticalGoals')} subtitle={t('goals')}>
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.3)'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              {t('comingSoon')}
            </div>
          </div>
        </NeonPanel>
      </div>

      {/* CENTER PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <NeonPanel title={t('userProfile')} style={{ width: '100%', maxWidth: '400px' }}>
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
              boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)'
            }}>
              <User size={40} color="white" />
            </div>
            <div className="neon-text" style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              {t('anonymousUser')}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{t('masterLevel')}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {t('aiKnowledge')}: {t('high')} <CheckCircle2 size={14} style={{ color: 'var(--neon-blue)' }} />
            </div>
          </div>
        </NeonPanel>

      </div>

      {/* RIGHT PANEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <NeonPanel title={t('matchInsights')} subtitle={t('analysis')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <InsightItem text={t('strugglesCoachingPress')} />
            <InsightItem text={t('reluctantChangeFormation')} />
            <InsightItem text={t('prefersQuickTips')} />
          </div>
        </NeonPanel>

        <NeonPanel title={t('quickLinks')} subtitle={t('navigation')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <QuickLink href="/dashboard" icon={<Home size={18} />} text={t('home')} />
            <QuickLink href="/my-players" icon={<PlayersIcon size={18} />} text={t('players')} />
            <QuickLink href="/rosa" icon={<LayoutGrid size={18} />} text={t('squadBuilder')} />
            <QuickLink href="/opponent-formation" icon={<Shield size={18} />} text={t('opponentFormation')} />
            <QuickLink href="/dashboard" icon={<BarChart3 size={18} />} text={t('dataAnalytics')} />
            <QuickLink href="/dashboard" icon={<Target size={18} />} text={t('memoryHub')} />
            <QuickLink href="/dashboard" icon={<ClipboardList size={18} />} text={t('coaching')} />
          </div>
        </NeonPanel>

        <NeonPanel title={t('memoryInsights')} subtitle={t('aiLearning')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <InsightItem text={t('strugglesHighPress')} color="orange" />
            <InsightItem text={t('reluctantChangeFormation')} color="orange" />
            <InsightItem text={t('prefersQuickTips')} color="orange" />
          </div>
          <button className="neon-button" style={{ marginTop: '16px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Zap size={16} />
            {t('startSession')}
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
      <ChevronRight size={14} style={{ color: colorMap[color] }} />
      <span style={{ flex: 1, opacity: 0.9 }}>{text}</span>
    </div>
  )
}

function QuickLink({ href, icon, text }) {
  const hrefMap = {
    '/dashboard': '/dashboard',
    '/my-players': '/my-players',
    '/rosa': '/rosa',
    '/opponent-formation': '/opponent-formation',
  }
  const finalHref = hrefMap[href] || href
  
  return (
    <Link href={finalHref} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="clickable-card" style={{ 
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
      }}>
        <span style={{ color: 'var(--neon-blue)' }}>{icon}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{text}</span>
        <ChevronRight size={16} style={{ color: 'var(--neon-blue)', opacity: 0.7 }} />
      </div>
    </Link>
  )
}
