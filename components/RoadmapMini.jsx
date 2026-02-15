'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Gamepad2, 
  UserCircle, 
  BarChart3, 
  Trophy,
  Target,
  MessageSquare,
  CheckCircle2,
  Lock,
  Map
} from 'lucide-react'

export default function RoadmapMini({ 
  stats,
  recentMatches,
  userProfile,
  gameAnalysisLastCapture,
  t
}) {
  const router = useRouter()

  const steps = [
    {
      id: 'roster',
      icon: Users,
      title: t('roadmapRosterShort') || '11 titolari',
      completed: stats.titolari >= 11,
      unlocked: true
    },
    {
      id: 'first_match',
      icon: Gamepad2,
      title: t('roadmapFirstMatchShort') || 'Prima partita',
      completed: recentMatches.length > 0,
      unlocked: stats.titolari >= 11
    },
    {
      id: 'profile',
      icon: UserCircle,
      title: t('roadmapProfileShort') || 'Profilo',
      completed: userProfile?.ai_weak_point && userProfile?.platform,
      unlocked: recentMatches.length > 0
    },
    {
      id: 'matches',
      icon: Target,
      title: t('roadmapMatchesShort') || '5 partite',
      completed: recentMatches.length >= 5,
      unlocked: recentMatches.length > 0
    },
    {
      id: 'analysis',
      icon: BarChart3,
      title: t('roadmapAnalysisShort') || 'Analisi',
      completed: !!gameAnalysisLastCapture,
      unlocked: recentMatches.length >= 3
    },
    {
      id: 'palestra',
      icon: MessageSquare,
      title: t('roadmapPalestraShort') || 'Palestra',
      completed: false,
      unlocked: recentMatches.length >= 1
    },
    {
      id: 'mastery',
      icon: Trophy,
      title: t('roadmapMasteryShort') || 'Maestro',
      completed: false,
      unlocked: recentMatches.length >= 5 && userProfile?.ai_weak_point
    }
  ]

  const completedCount = steps.filter(s => s.completed).length
  const progress = Math.round((completedCount / steps.length) * 100)

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.iconWrapper}>
          <Map size={20} color="#00d4ff" />
        </div>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>{t('roadmapMiniTitle') || 'Il tuo percorso'}</h3>
          <span style={styles.progressText}>{completedCount}/{steps.length} {t('completed') || 'completati'}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressBarBg}>
        <div 
          style={{
            ...styles.progressBarFill,
            width: `${progress}%`
          }}
        />
      </div>

      {/* Steps - Horizontal scroll on mobile, grid on desktop */}
      <div style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const Icon = step.icon
          const isLocked = !step.unlocked
          
          return (
            <React.Fragment key={step.id}>
              <div 
                style={{
                  ...styles.step,
                  opacity: isLocked ? 0.4 : 1
                }}
                title={step.title}
              >
                <div style={{
                  ...styles.stepIcon,
                  backgroundColor: step.completed ? 'rgba(34, 197, 94, 0.2)' :
                                  isLocked ? 'rgba(255, 255, 255, 0.05)' :
                                  'rgba(0, 212, 255, 0.1)',
                  borderColor: step.completed ? '#22c55e' :
                               isLocked ? '#444' :
                               '#00d4ff'
                }}>
                  {step.completed ? (
                    <CheckCircle2 size={16} color="#22c55e" />
                  ) : isLocked ? (
                    <Lock size={12} color="#666" />
                  ) : (
                    <Icon size={16} color="#00d4ff" />
                  )}
                </div>
                <span style={{
                  ...styles.stepLabel,
                  color: step.completed ? '#22c55e' :
                         isLocked ? '#666' :
                         '#ccc'
                }}>
                  {step.title}
                </span>
              </div>
              
              {/* Connector */}
              {index < steps.length - 1 && (
                <div style={{
                  ...styles.connector,
                  backgroundColor: step.completed ? '#22c55e' : '#333'
                }} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Footer link */}
      <button 
        onClick={() => router.push('/roadmap')}
        style={styles.link}
      >
        {t('viewFullRoadmap') || 'Vedi dettagli percorso'} →
      </button>
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: 'clamp(16px, 3vw, 24px)',
    border: '1px solid rgba(0, 212, 255, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  titleSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  title: {
    margin: 0,
    fontSize: 'clamp(16px, 2.5vw, 18px)',
    fontWeight: 600,
    color: '#fff'
  },
  progressText: {
    fontSize: '13px',
    color: '#888'
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00d4ff',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out'
  },
  stepsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    overflowX: 'auto',
    paddingBottom: '8px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#333 transparent',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'none'
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    minWidth: '60px',
    flexShrink: 0,
    transition: 'opacity 0.2s ease'
  },
  stepIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  stepLabel: {
    fontSize: '11px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    fontWeight: 500
  },
  connector: {
    width: '16px',
    height: '2px',
    flexShrink: 0,
    marginTop: '-20px'
  },
  link: {
    marginTop: 'auto',
    padding: '10px 0 0 0',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#00d4ff',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    transition: 'color 0.2s ease'
  }
}
