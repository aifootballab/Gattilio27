'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Trophy, CheckCircle2, Circle, XCircle, Loader2 } from 'lucide-react'

export default function TaskWidget() {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Chiama solo una volta al mount
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Array vuoto = solo al mount

  const fetchTasks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Recupera token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
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
        throw new Error(data.error || 'Failed to fetch tasks')
      }

      const data = await response.json()
      
      // Validazione risposta
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tasks')
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
      setError(err.message || 'Error loading tasks')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
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
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #ef4444',
        color: '#ef4444',
        fontSize: '14px'
      }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      padding: 'clamp(16px, 4vw, 20px)',
      marginBottom: '24px',
      border: '1px solid #2a2a2a',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
          <Trophy size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: 'clamp(16px, 4vw, 18px)', fontWeight: '600' }}>
            {t('weeklyGoals') || 'Obiettivi Settimanali'}
          </h2>
        </div>
        <span style={{ fontSize: 'clamp(11px, 3vw, 12px)', color: '#888', whiteSpace: 'nowrap' }}>
          {tasks.filter(t => t.status === 'active').length} attivi
        </span>
      </div>

      {/* Lista Task */}
      {tasks.length === 0 ? (
        <div style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>
          {t('noGoalsThisWeek') || 'Nessun obiettivo questa settimana'}
          <br />
          <span style={{ fontSize: '12px', color: '#666' }}>
            {t('goalsWillBeGenerated') || 'Gli obiettivi verranno generati automaticamente ogni domenica'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{
                padding: 'clamp(12px, 3vw, 16px)',
                backgroundColor: task.status === 'completed'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : task.status === 'failed'
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
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
                alignItems: 'center', 
                gap: 'clamp(6px, 2vw, 8px)', 
                marginBottom: '8px',
                flexWrap: 'wrap'
              }}>
                {task.status === 'completed' ? (
                  <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />
                ) : task.status === 'failed' ? (
                  <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                ) : (
                  <Circle size={18} color="#888" style={{ flexShrink: 0 }} />
                )}
                <span style={{
                  fontSize: 'clamp(13px, 3.5vw, 14px)',
                  fontWeight: task.status === 'active' ? '600' : '400',
                  flex: 1,
                  minWidth: '200px',
                  wordBreak: 'break-word'
                }}>
                  {task.goal_description}
                </span>
                {task.status === 'active' && task.target_value > 0 && (
                  <span style={{ 
                    fontSize: 'clamp(11px, 3vw, 12px)', 
                    color: '#888',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    {typeof task.current_value === 'number' ? task.current_value.toFixed(1) : 0}/{task.target_value}
                  </span>
                )}
              </div>

              {/* Progress Bar (solo se active e target_value valido) */}
              {task.status === 'active' && task.target_value > 0 && (
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '3px',
                  marginTop: '8px',
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
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#888',
                  textTransform: 'uppercase'
                }}>
                  {task.difficulty === 'easy' && '🟢 Facile'}
                  {task.difficulty === 'medium' && '🟡 Medio'}
                  {task.difficulty === 'hard' && '🔴 Difficile'}
                </div>
              )}

              {/* Completed/Failed Message */}
              {task.status === 'completed' && task.completed_at && (
                <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '8px' }}>
                  ✅ {t('goalCompleted') || 'Completato'} {new Date(task.completed_at).toLocaleDateString('it-IT')}
                </div>
              )}
              {task.status === 'failed' && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
                  ❌ {t('goalFailed') || 'Non completato'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
