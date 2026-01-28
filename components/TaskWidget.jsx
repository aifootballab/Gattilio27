'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Trophy, CheckCircle2, Circle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

export default function TaskWidget() {
  const { t, lang } = useTranslation()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isExpanded, setIsExpanded] = useState(true) // Stato per collassare/espandere

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
      const response = await fetch('/api/tasks/list', {
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

  const activeTasksCount = tasks.filter(t => t.status === 'active').length

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: 'clamp(12px, 3vw, 20px)',
      marginBottom: 'clamp(16px, 4vw, 24px)',
      border: '1px solid #2a2a2a',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 2vw, 12px)' }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: 'clamp(10px, 2.5vw, 16px)',
                    backgroundColor: task.status === 'completed'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : task.status === 'failed'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'clamp(6px, 1.5vw, 8px)',
                    border: `1px solid ${
                      task.status === 'completed'
                        ? 'rgba(34, 197, 94, 0.3)'
                        : task.status === 'failed'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)'
                    }`,
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Status Icon */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: 'clamp(6px, 2vw, 8px)', 
                    marginBottom: 'clamp(6px, 1.5vw, 8px)',
                    flexWrap: 'wrap'
                  }}>
                    {task.status === 'completed' ? (
                      <CheckCircle2 
                        size={18} 
                        color="#22c55e" 
                        style={{ 
                          flexShrink: 0, 
                          marginTop: '2px', 
                          width: 'clamp(16px, 3.5vw, 20px)', 
                          height: 'clamp(16px, 3.5vw, 20px)' 
                        }} 
                      />
                    ) : task.status === 'failed' ? (
                      <XCircle 
                        size={18} 
                        color="#ef4444" 
                        style={{ 
                          flexShrink: 0, 
                          marginTop: '2px', 
                          width: 'clamp(16px, 3.5vw, 20px)', 
                          height: 'clamp(16px, 3.5vw, 20px)' 
                        }} 
                      />
                    ) : (
                      <Circle 
                        size={18} 
                        color="#888" 
                        style={{ 
                          flexShrink: 0, 
                          marginTop: '2px', 
                          width: 'clamp(16px, 3.5vw, 20px)', 
                          height: 'clamp(16px, 3.5vw, 20px)' 
                        }} 
                      />
                    )}
                    <span style={{
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      fontWeight: task.status === 'active' ? '600' : '400',
                      flex: 1,
                      minWidth: '150px',
                      wordBreak: 'break-word',
                      lineHeight: '1.4'
                    }}>
                      {task.goal_description}
                    </span>
                    {task.status === 'active' && task.target_value > 0 && (
                      <span style={{ 
                        fontSize: 'clamp(10px, 2.5vw, 12px)', 
                        color: '#888',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                        {typeof task.current_value === 'number' ? task.current_value.toFixed(1) : 0}/{task.target_value}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar (solo se active e target_value valido) */}
                  {task.status === 'active' && task.target_value > 0 && (
                    <div style={{
                      width: '100%',
                      height: 'clamp(4px, 1vw, 6px)',
                      backgroundColor: '#2a2a2a',
                      borderRadius: '3px',
                      marginTop: 'clamp(6px, 1.5vw, 8px)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, ((typeof task.current_value === 'number' ? task.current_value : 0) / task.target_value) * 100))}%`,
                        height: '100%',
                        backgroundColor: '#00d4ff',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  )}

                  {/* Difficulty Badge */}
                  {task.difficulty && (
                    <div style={{
                      marginTop: 'clamp(6px, 1.5vw, 8px)',
                      fontSize: 'clamp(10px, 2.5vw, 11px)',
                      color: '#888',
                      textTransform: 'uppercase'
                    }}>
                      {task.difficulty === 'easy' && (lang === 'it' ? '🟢 Facile' : '🟢 Easy')}
                      {task.difficulty === 'medium' && (lang === 'it' ? '🟡 Medio' : '🟡 Medium')}
                      {task.difficulty === 'hard' && (lang === 'it' ? '🔴 Difficile' : '🔴 Hard')}
                    </div>
                  )}

                  {/* Completed/Failed Message */}
                  {task.status === 'completed' && task.completed_at && (
                    <div style={{ 
                      fontSize: 'clamp(11px, 2.5vw, 12px)', 
                      color: '#22c55e', 
                      marginTop: 'clamp(6px, 1.5vw, 8px)',
                      lineHeight: '1.4'
                    }}>
                      ✅ {t('goalCompleted') || 'Completato'} {new Date(task.completed_at).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US')}
                    </div>
                  )}
                  {task.status === 'failed' && (
                    <div style={{ 
                      fontSize: 'clamp(11px, 2.5vw, 12px)', 
                      color: '#ef4444', 
                      marginTop: 'clamp(6px, 1.5vw, 8px)',
                      lineHeight: '1.4'
                    }}>
                      ❌ {t('goalFailed') || 'Non completato'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
