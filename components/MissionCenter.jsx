'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { 
  Trophy, 
  Target, 
  Users, 
  Gamepad2, 
  UserCircle, 
  BarChart3, 
  CheckCircle2,
  MessageCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'

export default function MissionCenter({ 
  recentMatches, 
  stats, 
  hasActiveCoach,
  gameAnalysisLastCapture,
  userProfile,
  lang,
  t,
  onOpenChat
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState(null)

  // Fetch tasks settimanali
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch(`/api/tasks/list?lang=${lang === 'en' ? 'en' : 'it'}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })

        if (response.ok) {
          const data = await response.json()
          const validTasks = (data.tasks || []).filter(task => 
            task && task.id && task.target_value > 0
          )
          setTasks(validTasks)
          
          // Trova task attivo con progresso < 100%
          const incomplete = validTasks.find(t => 
            t.status === 'active' && t.current_value < t.target_value
          )
          setActiveTask(incomplete || null)
        }
      } catch (err) {
        console.error('[MissionCenter] Error fetching tasks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
    
    // Refresh quando cambiano partite
    const handleMatchSaved = () => setTimeout(fetchTasks, 1500)
    window.addEventListener('match-saved', handleMatchSaved)
    return () => window.removeEventListener('match-saved', handleMatchSaved)
  }, [lang])

  const getMission = () => {
    // 1. Task settimanale attivo e incompleto
    if (activeTask) {
      const progress = (activeTask.current_value / activeTask.target_value) * 100
      const lastMatchId = recentMatches.length > 0 ? recentMatches[0].id : null
      const taskActionHref = lastMatchId ? `/match/${lastMatchId}` : '/match/new'
      return {
        type: 'task',
        icon: Target,
        title: activeTask.goal_description,
        message: `${activeTask.current_value || 0} / ${activeTask.target_value} ${t('completed') || 'completati'}`,
        progress,
        primaryAction: { label: t('viewDetails') || 'Vedi dettagli', href: taskActionHref },
        chatMessage: t('taskHelpMessage', { task: activeTask.goal_description }) || `Aiutami con: ${activeTask.goal_description}`
      }
    }

    // 2. Setup rosa incompleta
    if (stats.titolari < 11) {
      const progress = (stats.titolari / 11) * 100
      return {
        type: 'setup_roster',
        icon: Users,
        title: t('missionRosterTitle') || 'Completa la Rosa',
        message: t('missionRosterMsg', { current: stats.titolari, missing: 11 - stats.titolari }) || 
                 `Hai ${stats.titolari}/11 titolari. Mancano ${11 - stats.titolari} alla squadra completa!`,
        progress,
        primaryAction: { label: t('missionRosterAction') || 'Aggiungi giocatori', href: '/gestione-formazione' },
        chatMessage: t('missionRosterChat') || 'Ho solo ' + stats.titolari + ' giocatori nella rosa. Perché dovrei completarla prima di giocare?'
      }
    }

    // 3. Prima partita
    if (recentMatches.length === 0) {
      return {
        type: 'setup_first_match',
        icon: Gamepad2,
        title: t('missionFirstMatchTitle') || 'Pronto per il Debutto?',
        message: t('missionFirstMatchMsg') || 'La tua rosa è pronta. Carica la tua prima partita per sbloccare l\'AI!',
        progress: 50,
        primaryAction: { label: t('missionFirstMatchAction') || 'Carica partita', href: '/match/new' },
        chatMessage: t('missionFirstMatchChat') || 'Ho appena completato la rosa. Cosa mi consigli per la prima partita?'
      }
    }

    // 4. Profilo incompleto
    if (!userProfile?.ai_weak_point) {
      return {
        type: 'setup_profile',
        icon: UserCircle,
        title: t('missionProfileTitle') || 'Ultimo Step: Profilo',
        message: t('missionProfileMsg') || 'Aggiungi il tuo punto debole per ricevere consigli mirati.',
        progress: 75,
        primaryAction: { label: t('missionProfileAction') || 'Completa profilo', href: '/profilo' },
        chatMessage: t('missionProfileChat') || 'Non so cosa mettere come punto debole nel profilo. Puoi aiutarmi a capire qual è il mio problema principale?'
      }
    }

    // 5. Analisi eFootball mancante
    if (!gameAnalysisLastCapture) {
      return {
        type: 'setup_analysis',
        icon: BarChart3,
        title: t('missionAnalysisTitle') || 'Analisi eFootball',
        message: t('missionAnalysisMsg') || 'Carica lo screenshot delle statistiche per analisi avanzate.',
        progress: 90,
        primaryAction: { label: t('missionAnalysisAction') || 'Carica analisi', onClick: 'openGameAnalysis' },
        chatMessage: t('missionAnalysisChat') || 'A cosa serve l\'analisi delle statistiche eFootball? Come faccio a trovarla nel gioco?'
      }
    }

    // 6. Tutto completo
    return {
      type: 'complete',
      icon: CheckCircle2,
      title: t('missionCompleteTitle') || 'Missione Completata!',
      message: t('missionCompleteMsg') || 'Hai completato tutto! Ora puoi studiare contromisure e salire in classifica.',
      progress: 100,
      primaryAction: { label: t('missionCompleteAction') || 'Contromisure', href: '/contromisure-pre-partita' },
      chatMessage: t('missionCompleteChat') || 'Ho completato tutte le missioni iniziali. Cosa mi consigli per migliorare ulteriormente e salire in classifica?'
    }
  }

  const mission = getMission()
  const Icon = mission.icon

  const getProgressColor = (progress) => {
    if (progress < 50) return '#ef4444' // red
    if (progress < 100) return '#eab308' // yellow
    return '#22c55e' // green
  }

  const handlePrimaryAction = () => {
    if (mission.primaryAction.onClick === 'openGameAnalysis') {
      // Questo deve essere gestito dal parent per aprire il modal
      if (onOpenChat) onOpenChat('__OPEN_GAME_ANALYSIS__')
    } else if (mission.primaryAction.href) {
      router.push(mission.primaryAction.href)
    }
  }

  const handleChatAction = () => {
    if (onOpenChat && mission.chatMessage) {
      onOpenChat(mission.chatMessage)
    }
  }

  if (loading && !mission.title) {
    return (
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <Loader2 size={32} color="#00d4ff" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.iconWrapper}>
          <Icon size={28} color="#00d4ff" />
        </div>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>{mission.title}</h3>
          <span style={styles.badge}>
            {mission.type === 'task' ? '🎯 Task' : mission.type === 'complete' ? '✅ Complete' : '🚀 Setup'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressLabel}>
          <span>{t('missionProgressLabel') || 'Progresso'}</span>
          <span>{Math.round(mission.progress)}%</span>
        </div>
        <div style={styles.progressBarBg}>
          <div 
            style={{
              ...styles.progressBarFill,
              width: `${mission.progress}%`,
              backgroundColor: getProgressColor(mission.progress)
            }}
          />
        </div>
      </div>

      {/* Message */}
      <p style={styles.message}>{mission.message}</p>

      {/* Actions */}
      <div style={styles.actions}>
        <button 
          onClick={handlePrimaryAction}
          style={styles.primaryButton}
        >
          <span>{mission.primaryAction.label}</span>
          <ArrowRight size={18} />
        </button>
        
        <button 
          onClick={handleChatAction}
          style={styles.secondaryButton}
        >
          <MessageCircle size={18} />
          <span>{t('askCoach') || 'Chiedi al Coach'}</span>
        </button>
      </div>
    </div>
  )
}

const styles = {
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: 'clamp(20px, 4vw, 28px)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    boxShadow: '0 0 30px rgba(0, 212, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    height: '100%',
    minHeight: '280px'
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px'
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
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
    gap: '6px'
  },
  title: {
    margin: 0,
    fontSize: 'clamp(18px, 3vw, 22px)',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.3
  },
  badge: {
    fontSize: '12px',
    color: '#00d4ff',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  progressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: 500
  },
  progressBarBg: {
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease-out'
  },
  message: {
    margin: 0,
    fontSize: 'clamp(14px, 2.5vw, 16px)',
    color: '#d1d5db',
    lineHeight: 1.5
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: 'auto'
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '14px 20px',
    backgroundColor: '#00d4ff',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#00b8db',
      transform: 'translateY(-1px)'
    }
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#ffffff'
    }
  }
}
