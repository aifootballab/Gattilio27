'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import HeroPointsBalance from '@/components/HeroPointsBalance'
import { ArrowLeft, Calendar, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, BarChart3, Users, Target, MapPin, Zap } from 'lucide-react'

export default function MatchDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const matchId = params?.id

  const [loading, setLoading] = React.useState(true)
  const [match, setMatch] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [showDetails, setShowDetails] = React.useState(false)
  const [analyzing, setAnalyzing] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    if (!supabase || !matchId) {
      router.push('/match')
      return
    }

    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        router.push('/login')
        return
      }
      loadMatch()
    }
    checkAuth()
  }, [router, matchId])

  const loadMatch = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (fetchError) throw fetchError
      if (!data) throw new Error('Partita non trovata')

      setMatch(data)
    } catch (err) {
      console.error('[MatchDetail] Error loading match:', err)
      setError(err.message || 'Errore caricamento partita')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true)
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const res = await fetch('/api/ai/analyze-match', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ match_id: matchId })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore analisi IA')
      }

      // Ricarica match per vedere i nuovi dati
      await loadMatch()
    } catch (err) {
      console.error('[MatchDetail] Error analyzing:', err)
      setError(err.message || 'Errore analisi IA')
    } finally {
      setAnalyzing(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Data non disponibile'
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return '#ff6b6b'
      case 'medium': return '#ffa500'
      case 'low': return '#51cf66'
      default: return 'rgba(255, 255, 255, 0.6)'
    }
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
              onClick={() => router.push('/match')}
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
              Dettaglio Partita
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <HeroPointsBalance />
            <LanguageSwitch />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Caricamento partita...
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
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {/* Match Content */}
        {!loading && match && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Match Header Info */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Calendar size={18} style={{ opacity: 0.7 }} />
                  <span style={{ fontSize: '18px', fontWeight: '600' }}>
                    {formatDate(match.match_date)}
                  </span>
                  {match.opponent_name && (
                    <>
                      <span style={{ opacity: 0.5 }}>vs</span>
                      <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--neon-orange)' }}>
                        {match.opponent_name}
                      </span>
                    </>
                  )}
                  {match.result && (
                    <span style={{
                      background: 'rgba(255, 165, 0, 0.2)',
                      border: '1px solid rgba(255, 165, 0, 0.4)',
                      padding: '6px 16px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      {match.result}
                    </span>
                  )}
                </div>
                {match.formation_played && (
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>
                    Formazione: {match.formation_played}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {match.analysis_status === 'pending' && (
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 165, 0, 0.2) 0%, rgba(255, 140, 0, 0.2) 100%)',
                      border: '1px solid rgba(255, 165, 0, 0.4)',
                      color: 'var(--neon-orange)',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: analyzing ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: analyzing ? 0.6 : 1
                    }}
                  >
                    {analyzing ? 'Analisi in corso...' : 'Analizza con IA'}
                  </button>
                )}
                {match.analysis_status === 'completed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--neon-green)' }}>
                    <CheckCircle2 size={20} />
                    <span>Analisi completata</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Summary */}
            {match.ai_summary && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '25px'
              }}>
                <h2 style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  📝 Riassunto
                </h2>
                <div style={{
                  fontSize: '16px',
                  lineHeight: '1.8',
                  color: 'rgba(255, 255, 255, 0.9)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {match.ai_summary}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {match.ai_insights && Array.isArray(match.ai_insights) && match.ai_insights.length > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '25px'
              }}>
                <h2 style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  ⚠️ Insight Tattici ({match.ai_insights.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {match.ai_insights.map((insight, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: `1px solid ${getSeverityColor(insight.severity)}40`,
                        borderRadius: '8px',
                        padding: '15px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            marginBottom: '8px'
                          }}>
                            <span style={{
                              background: getSeverityColor(insight.severity),
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {insight.severity || 'MEDIUM'}
                            </span>
                            <span style={{ fontSize: '16px', fontWeight: '600' }}>
                              {insight.title || `Insight ${idx + 1}`}
                            </span>
                          </div>
                          {insight.description && (
                            <p style={{ 
                              margin: 0, 
                              fontSize: '14px', 
                              lineHeight: '1.6',
                              color: 'rgba(255, 255, 255, 0.8)'
                            }}>
                              {insight.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {match.ai_recommendations && Array.isArray(match.ai_recommendations) && match.ai_recommendations.length > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '25px'
              }}>
                <h2 style={{ 
                  margin: '0 0 15px 0', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  ✅ Raccomandazioni ({match.ai_recommendations.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {match.ai_recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(51, 207, 102, 0.3)',
                        borderRadius: '8px',
                        padding: '15px'
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>
                        {rec.action || rec.title || `Raccomandazione ${idx + 1}`}
                      </div>
                      {rec.details && (
                        <p style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: '14px', 
                          lineHeight: '1.6',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                          {rec.details}
                        </p>
                      )}
                      {rec.impact && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontStyle: 'italic'
                        }}>
                          Impatto: {rec.impact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details Section (Collapsible) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  fontSize: '18px',
                  fontWeight: '600',
                  padding: '0'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  📊 Dettagli
                </span>
                {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showDetails && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Team Stats */}
                  {match.team_stats && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={18} />
                        Statistiche Squadra
                      </h3>
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '10px',
                        fontSize: '14px'
                      }}>
                        {Object.entries(match.team_stats).map(([key, value]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ opacity: 0.7 }}>{key.replace(/_/g, ' ')}:</span>
                            <span style={{ fontWeight: '600' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Player Ratings */}
                  {match.player_ratings && Object.keys(match.player_ratings).length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} />
                        Voti Giocatori
                      </h3>
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        {Object.entries(match.player_ratings).map(([playerName, data]) => (
                          <div key={playerName} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px'
                          }}>
                            <span style={{ fontWeight: '600' }}>{playerName}</span>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '14px' }}>
                              {data.rating && <span>Voto: <strong>{data.rating}</strong></span>}
                              {data.goals !== undefined && <span>Gol: {data.goals}</span>}
                              {data.assists !== undefined && <span>Assist: {data.assists}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attack Areas */}
                  {match.attack_areas && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Target size={18} />
                        Aree di Attacco
                      </h3>
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '15px',
                        fontSize: '14px'
                      }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                          {JSON.stringify(match.attack_areas, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Goals Events */}
                  {match.goals_events && Array.isArray(match.goals_events) && match.goals_events.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={18} />
                        Eventi Gol
                      </h3>
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {match.goals_events.map((goal, idx) => (
                          <div key={idx} style={{
                            padding: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}>
                            <strong>{goal.minute}'</strong> - {goal.scorer || 'Marcatore sconosciuto'}
                            {goal.assist && ` (assist: ${goal.assist})`}
                            {goal.type && ` - ${goal.type}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
