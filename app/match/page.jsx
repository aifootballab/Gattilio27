'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import HeroPointsBalance from '@/components/HeroPointsBalance'
import { ArrowLeft, Calendar, TrendingUp, FileText, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function MatchHistoryPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [matches, setMatches] = React.useState([])
  const [error, setError] = React.useState(null)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    if (!supabase) {
      router.push('/login')
      return
    }

    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        router.push('/login')
        return
      }
      loadMatches()
    }
    checkAuth()
  }, [router])

  const loadMatches = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const { data, error: fetchError } = await supabase
        .from('matches')
        .select('id, match_date, opponent_name, result, formation_played, photos_uploaded, data_completeness, analysis_status, ai_summary, created_at')
        .order('match_date', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      setMatches(data || [])
    } catch (err) {
      console.error('[MatchHistory] Error loading matches:', err)
      setError(err.message || 'Errore caricamento partite')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Data non disponibile'
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSummaryPreview = (summary) => {
    if (!summary) return 'Nessun riassunto disponibile'
    // Prendi prima frase (max 100 caratteri)
    const firstSentence = summary.split('.')[0]
    return firstSentence.length > 100 
      ? firstSentence.substring(0, 100) + '...' 
      : firstSentence
  }

  if (!mounted) return null

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={18} />
              Indietro
            </button>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
              📋 Storico Partite
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <HeroPointsBalance />
            <LanguageSwitch />
          </div>
        </div>

        {/* Button Nuova Partita */}
        <div style={{ marginBottom: '30px' }}>
          <button
            onClick={() => router.push('/match/new')}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)',
              border: '1px solid rgba(255, 165, 0, 0.4)',
              color: 'var(--neon-orange)',
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(255, 165, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 165, 0, 0.3) 0%, rgba(255, 140, 0, 0.3) 100%)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 165, 0, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 165, 0, 0.2)'
            }}
          >
            <TrendingUp size={20} />
            Analizza Nuova Partita
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Caricamento partite...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            color: '#ff6b6b',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Matches List */}
        {!loading && !error && (
          <>
            {matches.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '40px',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <FileText size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                <p style={{ fontSize: '18px', margin: 0 }}>
                  Nessuna partita salvata ancora
                </p>
                <p style={{ fontSize: '14px', marginTop: '10px', opacity: 0.7 }}>
                  Carica la prima partita per iniziare a tracciare le tue performance
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {matches.map((match) => (
                  <div
                    key={match.id}
                    onClick={() => router.push(`/match/${match.id}`)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.3)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {/* Header Match */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <Calendar size={18} style={{ opacity: 0.7 }} />
                        <span style={{ fontSize: '16px', fontWeight: '600' }}>
                          {formatDate(match.match_date)}
                        </span>
                        {match.opponent_name && (
                          <>
                            <span style={{ opacity: 0.5 }}>vs</span>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--neon-orange)' }}>
                              {match.opponent_name}
                            </span>
                          </>
                        )}
                        {match.result && (
                          <span style={{
                            background: 'rgba(255, 165, 0, 0.2)',
                            border: '1px solid rgba(255, 165, 0, 0.4)',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {match.result}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {match.analysis_status === 'completed' ? (
                          <CheckCircle2 size={18} color="var(--neon-green)" />
                        ) : match.analysis_status === 'pending' ? (
                          <Clock size={18} color="var(--neon-orange)" />
                        ) : null}
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>
                          {match.analysis_status === 'completed' ? 'Analizzata' : match.analysis_status === 'pending' ? 'In attesa' : 'Non analizzata'}
                        </span>
                      </div>
                    </div>

                    {/* Summary Preview */}
                    {match.ai_summary && (
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontStyle: 'italic'
                      }}>
                        📝 {getSummaryPreview(match.ai_summary)}
                      </div>
                    )}

                    {/* Metadata */}
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', fontSize: '12px', opacity: 0.6 }}>
                      {match.formation_played && (
                        <span>Formazione: {match.formation_played}</span>
                      )}
                      {match.photos_uploaded !== undefined && (
                        <span>Foto: {match.photos_uploaded}</span>
                      )}
                      {match.data_completeness && (
                        <span>Completeness: {match.data_completeness}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
