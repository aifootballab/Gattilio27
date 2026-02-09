'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Trophy, CheckCircle2, Circle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function TaskWidget() {
  const { t, lang } = useTranslation()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(true) // Stato per collassare/espandere
  const [completedFeedbackToast, setCompletedFeedbackToast] = useState(null)
  const previousCompletedIdsRef = useRef([])
  const hasFetchedBeforeRef = useRef(false)

  useEffect(() => {
    // Chiama al mount
    fetchTasks()
    
    // FIX: Ascolta eventi di salvataggio partita per ricaricare task
    const handleMatchSaved = () => {
      // Delay per permettere salvataggio DB
      setTimeout(() => {
        console.log('[TaskWidget] Match saved event received, refreshing tasks...')
        fetchTasks()
      }, 1500)
    }
    
    // Solo lato client
    if (typeof window !== 'undefined') {
      window.addEventListener('match-saved', handleMatchSaved)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('match-saved', handleMatchSaved)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Array vuoto = solo al mount

  // Auto-dismiss toast completamento obiettivo
  useEffect(() => {
    if (!completedFeedbackToast) return
    const timer = setTimeout(() => setCompletedFeedbackToast(null), 4000)
    return () => clearTimeout(timer)
  }, [completedFeedbackToast])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Recupera token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError(t('notAuthenticated') || 'Not authenticated')
        return
      }

      const token = session.access_token

      // Chiama API
      const response = await fetch(`/api/tasks/list?lang=${lang === 'en' ? 'en' : 'it'}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('failedToFetchTasks') || 'Failed to fetch tasks')
      }

      const data = await response.json()
      
      // Validazione risposta
      if (!data.success) {
        throw new Error(data.error || t('failedToFetchTasks') || 'Failed to fetch tasks')
      }
      
      // Validazione e normalizzazione task
      const validTasks = (data.tasks || []).filter(task => {
        // Filtra task con dati validi
        return task && 
               task.id && 
               task.goal_description && 
               task.target_value > 0 &&
               (task.current_value === null || task.current_value >= 0)
      })

      // Feedback al completamento: toast solo dopo un refetch (non al primo caricamento)
      const completedIds = validTasks.filter(tk => tk.status === 'completed').map(tk => tk.id)
      const prev = previousCompletedIdsRef.current
      const newlyCompleted = completedIds.filter(id => !prev.includes(id))
      if (hasFetchedBeforeRef.current && newlyCompleted.length > 0) {
        setCompletedFeedbackToast(t('goalCompletedFeedback') || 'Obiettivo completato! Contribuisce alla barra Conoscenza IA.')
      }
      hasFetchedBeforeRef.current = true
      previousCompletedIdsRef.current = completedIds
      
      setTasks(validTasks)
    } catch (err) {
      console.error('[TaskWidget] Error fetching tasks:', err)
      setError(err.message || t('errorLoadingTasks') || 'Error loading tasks')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: 'clamp(16px, 4vw, 20px)',
        marginBottom: 'clamp(16px, 4vw, 24px)',
        border: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px'
      }}>
        <Loader2 size={24} color="#00d4ff" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: 'clamp(16px, 4vw, 20px)',
        marginBottom: 'clamp(16px, 4vw, 24px)',
        border: '1px solid #ef4444',
        color: '#ef4444',
        fontSize: 'clamp(12px, 3vw, 14px)'
      }}>
        {t('error') || 'Error'}: {error}
      </div>
    )
  }

  const activeTasksCount = tasks.filter(task => task.status === 'active').length

  return (
    <div
      className="card"
      style={{
        padding: 'clamp(16px, 4vw, 24px)',
        marginBottom: 'clamp(16px, 4vw, 24px)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Header - Clickable per collassare/espandere */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: isExpanded ? 'clamp(12px, 3vw, 16px)' : '0',
          flexWrap: 'wrap',
          gap: 'clamp(6px, 2vw, 8px)',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'margin-bottom 0.2s ease'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'clamp(6px, 2vw, 8px)', 
          flex: 1, 
          minWidth: '150px' 
        }}>
          <Trophy 
            size={20} 
            color="#00d4ff" 
            style={{ 
              width: 'clamp(18px, 4vw, 22px)', 
              height: 'clamp(18px, 4vw, 22px)',
              flexShrink: 0
            }} 
          />
          <h2 style={{ 
            margin: 0, 
            fontSize: 'clamp(14px, 3.5vw, 18px)', 
            fontWeight: '600',
            lineHeight: '1.2'
          }}>
            {t('weeklyGoals') || 'Obiettivi Settimanali'}
          </h2>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'clamp(6px, 2vw, 8px)',
          flexShrink: 0
        }}>
          <span style={{ 
            fontSize: 'clamp(11px, 2.5vw, 12px)', 
            color: '#888', 
            whiteSpace: 'nowrap' 
          }}>
            {activeTasksCount} {t('active') || 'attivi'}
          </span>
          {isExpanded ? (
            <ChevronUp 
              size={18} 
              color="#888" 
              style={{ flexShrink: 0, width: 'clamp(16px, 3.5vw, 18px)', height: 'clamp(16px, 3.5vw, 18px)' }} 
            />
          ) : (
            <ChevronDown 
              size={18} 
              color="#888" 
              style={{ flexShrink: 0, width: 'clamp(16px, 3.5vw, 18px)', height: 'clamp(16px, 3.5vw, 18px)' }} 
            />
          )}
        </div>
      </div>

      {/* Nesso task → barra Conoscenza */}
      {isExpanded && (
        <p style={{
          fontSize: 'clamp(11px, 2.5vw, 12px)',
          color: '#666',
          margin: '0 0 clamp(10px, 2.5vw, 12px) 0',
          lineHeight: '1.4'
        }}>
          {t('goalsIncreaseKnowledge') || 'Completare gli obiettivi aumenta la conoscenza che l\'IA ha di te.'}
        </p>
      )}

      {/* Toast completamento obiettivo */}
      {completedFeedbackToast && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 'clamp(16px, 4vw, 24px)',
            right: 'clamp(16px, 4vw, 24px)',
            padding: 'clamp(10px, 2.5vw, 14px) clamp(14px, 3vw, 18px)',
            backgroundColor: 'rgba(34, 197, 94, 0.95)',
            color: '#fff',
            borderRadius: '8px',
            fontSize: 'clamp(12px, 2.8vw, 14px)',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            maxWidth: 'min(320px, 90vw)'
          }}
        >
          {completedFeedbackToast}
        </div>
      )}

      {/* Lista Task - Collassabile */}
      {isExpanded && (
        <>
          {tasks.length === 0 ? (
            <div style={{ 
              fontSize: 'clamp(12px, 3vw, 14px)', 
              color: '#888', 
              textAlign: 'center', 
              padding: 'clamp(16px, 4vw, 20px)',
              lineHeight: '1.5'
            }}>
              {t('noGoalsThisWeek') || 'Nessun obiettivo questa settimana'}
              <br />
              <span style={{ fontSize: 'clamp(11px, 2.5vw, 12px)', color: '#666' }}>
                {t('goalsWillBeGenerated') || 'Gli obiettivi verranno generati automaticamente ogni domenica'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2.5vw, 14px)' }}>
              {tasks.map(task => {
                const isCompleted = task.status === 'completed'
                const isFailed = task.status === 'failed'
                const isActive = task.status === 'active'
                const borderColor = isCompleted ? 'rgba(34, 197, 94, 0.5)' : isFailed ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 212, 255, 0.35)'
                const progressPct = isActive && task.target_value > 0
                  ? Math.min(100, Math.max(0, ((typeof task.current_value === 'number' ? task.current_value : 0) / task.target_value) * 100))
                  : 0
                const difficultyStyles = {
                  easy: { bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', label: t('goalDifficultyEasy') },
                  medium: { bg: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', label: t('goalDifficultyMedium') },
                  hard: { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', label: t('goalDifficultyHard') }
                }
                const diffStyle = task.difficulty ? difficultyStyles[task.difficulty] || difficultyStyles.medium : null
                return (
                  <div
                    key={task.id}
                    style={{
                      padding: 'clamp(14px, 3vw, 18px)',
                      backgroundColor: isCompleted
                        ? 'rgba(34, 197, 94, 0.08)'
                        : isFailed
                        ? 'rgba(239, 68, 68, 0.06)'
                        : 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.25)' : isFailed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderLeft: `4px solid ${borderColor}`,
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease, background 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Status icon */}
                      <div style={{ flexShrink: 0, marginTop: '2px' }}>
                        {isCompleted ? (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={16} color="#22c55e" />
                          </div>
                        ) : isFailed ? (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <XCircle size={16} color="#ef4444" />
                          </div>
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(0, 212, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Circle size={12} color="rgba(0, 212, 255, 0.7)" style={{ fill: 'transparent' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: 'clamp(13px, 3.2vw, 15px)',
                          fontWeight: isActive ? '600' : '500',
                          color: isCompleted ? 'rgba(255,255,255,0.9)' : '#fff',
                          wordBreak: 'break-word',
                          lineHeight: '1.45'
                        }}>
                          {task.goal_description}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                          {task.difficulty && diffStyle && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: diffStyle.bg,
                              color: diffStyle.color
                            }}>
                              {diffStyle.label}
                            </span>
                          )}
                          {isActive && task.target_value > 0 && (
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                              {typeof task.current_value === 'number' ? task.current_value.toFixed(1) : 0} / {task.target_value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar - solo active */}
                    {isActive && task.target_value > 0 && (
                      <div style={{
                        marginTop: '12px',
                        height: '6px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, rgba(0,212,255,0.8), var(--neon-blue))',
                          borderRadius: '3px',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    )}

                    {/* Completed / Failed footer */}
                    {isCompleted && task.completed_at && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#22c55e',
                        fontWeight: '500'
                      }}>
                        <CheckCircle2 size={14} />
                        {t('goalCompleted')} · {new Date(task.completed_at).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US')}
                      </div>
                    )}
                    {isFailed && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#ef4444',
                        fontWeight: '500'
                      }}>
                        <XCircle size={14} />
                        {t('goalFailed')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
