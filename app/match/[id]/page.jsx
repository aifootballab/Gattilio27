'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, Camera, Calendar, Trophy, Brain, ChevronDown, ChevronUp, Users, Target, TrendingUp, TrendingDown, Shield } from 'lucide-react'

// STEPS sarà definito dentro il componente per avere accesso a t()

export default function MatchDetailPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const matchId = params?.id
  
  const STEPS = React.useMemo(() => [
    { id: 'player_ratings', label: t('stepPlayerRatings'), icon: '⭐' },
    { id: 'team_stats', label: t('stepTeamStats'), icon: '📊' },
    { id: 'attack_areas', label: t('stepAttackAreas'), icon: '⚽' },
    { id: 'ball_recovery_zones', label: t('stepBallRecoveryZones'), icon: '🔄' },
    { id: 'formation_style', label: t('stepFormationStyle'), icon: '🎯' }
  ], [t])

  const [match, setMatch] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [uploadSection, setUploadSection] = React.useState(null)
  const [uploadImage, setUploadImage] = React.useState(null)
  const [extracting, setExtracting] = React.useState(false)
  const [generatingSummary, setGeneratingSummary] = React.useState(false)
  const [summaryError, setSummaryError] = React.useState(null)
  const [expandedSections, setExpandedSections] = React.useState({
    overview: true,
    performance: false,
    tactical: false,
    recommendations: false
  })

  // Carica match
  React.useEffect(() => {
    if (!matchId || !supabase) {
      router.push('/')
      return
    }

    const fetchMatch = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session) {
          router.push('/login')
          return
        }

        const { data, error: queryError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single()

        if (queryError) {
          // Se errore RLS o permessi, mostra errore specifico
          if (queryError.code === 'PGRST116' || queryError.message?.includes('permission') || queryError.message?.includes('row-level')) {
            throw new Error(t('matchNotFound') || 'Partita non trovata o accesso negato')
          }
          // Altri errori: mostra errore ma permette comunque di provare a caricare
          console.error('[MatchDetail] Query error:', queryError)
          throw new Error(queryError.message || t('matchNotFound'))
        }

        if (!data) {
          throw new Error(t('matchNotFound'))
        }

        // Match trovato: imposta anche se incompleto (permette completamento)
        setMatch(data)
      } catch (err) {
        console.error('[MatchDetail] Error:', err)
        setError(err.message || t('loadMatchError'))
      } finally {
        setLoading(false)
      }
    }

    fetchMatch()
  }, [matchId, router])

  const handleImageSelect = (section) => (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setError(t('selectValidImage'))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('imageTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadImage(e.target.result)
      setUploadSection(section)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleExtractAndUpdate = async () => {
    if (!uploadImage || !uploadSection || !match) return

    setExtracting(true)
    setError(null)

    try {
      const token = (await supabase.auth.getSession()).data?.session?.access_token
      if (!token) {
        throw new Error(t('tokenNotAvailable'))
      }

      // 1. Estrai dati
      const extractRes = await fetch('/api/extract-match-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageDataUrl: uploadImage,
          section: uploadSection
        })
      })

      if (!extractRes.ok) {
        const errorData = await extractRes.json()
        throw new Error(errorData.error || t('extractDataError'))
      }

      const extractData = await extractRes.json()

      // 2. Aggiorna match
      const updateRes = await fetch('/api/supabase/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: match.id,
          section: uploadSection,
          data: extractData.data,
          result: extractData.result || null
        })
      })

      if (!updateRes.ok) {
        const errorData = await updateRes.json()
        throw new Error(errorData.error || t('updateMatchError'))
      }

      const updateData = await updateRes.json()

      // 3. Ricarica match
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', match.id)
        .single()

      if (updatedMatch) {
        setMatch(updatedMatch)
      }

      setUploadImage(null)
      setUploadSection(null)
    } catch (err) {
      console.error('[MatchDetail] Upload error:', err)
      setError(err.message || t('loadPhotoError'))
    } finally {
      setExtracting(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!match) return

    setGeneratingSummary(true)
    setSummaryError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('tokenNotAvailable'))
      }

      const token = session.session.access_token

      // Prepara matchData per analisi (include is_home e match_date per identificare squadra cliente team1/team2)
      const matchData = {
        result: match.result,
        opponent_name: match.opponent_name || null,
        is_home: match.is_home,
        match_date: match.match_date || null,
        player_ratings: match.player_ratings,
        team_stats: match.team_stats,
        attack_areas: match.attack_areas,
        ball_recovery_zones: match.ball_recovery_zones,
        formation_played: match.formation_played,
        playing_style_played: match.playing_style_played,
        team_strength: match.team_strength,
        opponent_formation_id: match.opponent_formation_id,
        client_team_name: match.client_team_name,
        players_in_match: match.players_in_match || null
      }

      // Genera riassunto
      const analyzeRes = await fetch('/api/analyze-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchData, language: lang })
      })

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json()
        throw new Error(errorData.error || t('errorGeneratingSummary'))
      }

      const analyzeData = await analyzeRes.json()
      const summary = analyzeData.summary

      if (!summary) {
        throw new Error(t('noSummaryGenerated'))
      }

      // Salva riassunto nel match
      const updateRes = await fetch('/api/supabase/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          match_id: match.id,
          section: 'ai_summary', // Sezione speciale per salvare solo riassunto
          data: { ai_summary: JSON.stringify(summary) } // summary è già un oggetto strutturato
        })
      })

      if (!updateRes.ok) {
        const errorData = await updateRes.json()
        throw new Error(errorData.error || t('errorSavingSummary'))
      }

      // Ricarica match con riassunto
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('id', match.id)
        .single()

      if (updatedMatch) {
        setMatch(updatedMatch)
      }
    } catch (err) {
      console.error('[MatchDetail] Summary generation error:', err)
      setSummaryError(err.message || t('errorGeneratingSummary'))
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleRegenerateSummary = handleGenerateSummary // Stessa funzione

  const hasSection = (section) => {
    if (!match) return false
    
    if (section === 'player_ratings') {
      return match.player_ratings && (
        (match.player_ratings.cliente && Object.keys(match.player_ratings.cliente).length > 0) ||
        (match.player_ratings.avversario && Object.keys(match.player_ratings.avversario).length > 0) ||
        (typeof match.player_ratings === 'object' && !match.player_ratings.cliente && !match.player_ratings.avversario && Object.keys(match.player_ratings).length > 0)
      )
    }
    
    if (section === 'team_stats') {
      return match.team_stats && Object.keys(match.team_stats).length > 0
    }
    
    if (section === 'attack_areas') {
      return match.attack_areas && Object.keys(match.attack_areas).length > 0
    }
    
    if (section === 'ball_recovery_zones') {
      return match.ball_recovery_zones && Array.isArray(match.ball_recovery_zones) && match.ball_recovery_zones.length > 0
    }
    
    if (section === 'formation_style') {
      return match.formation_played || match.playing_style_played || match.team_strength
    }
    
    return false
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return t('dateNotAvailable')
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loading')}</div>
      </main>
    )
  }

  // Se c'è errore ma non abbiamo match, mostra errore
  // Ma se abbiamo match (anche incompleto), permette l'accesso per completarlo
  if (error && !match && !loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
        <button onClick={() => router.push('/')} className="btn">
          {t('backToDashboard')}
        </button>
      </main>
    )
  }

  // Se ancora in caricamento, mostra loading
  if (loading || !match) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RefreshCw size={20} className="spinning" />
          <span>{t('loading') || 'Caricamento...'}</span>
        </div>
      </main>
    )
  }

  return (
    <main style={{ padding: '24px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/')}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} />
            {t('dashboard')}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <LanguageSwitch />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Match Info */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Calendar size={24} color="var(--neon-orange)" />
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {t('match')}
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('dateAndTime')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>{formatDate(match.match_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('opponent')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neon-orange)' }}>
              {match.opponent_name || t('notSpecified')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('result')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neon-blue)' }}>
              {match.result || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('homeAwayLabel')}</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--neon-blue)' }}>
              {match.is_home === true ? t('home') : match.is_home === false ? t('away') : t('notSpecified')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{t('completion')}</div>
            <span className={`completeness-badge ${match.data_completeness === 'complete' ? 'complete' : 'incomplete'}`}>
              {match.data_completeness === 'complete' ? t('matchComplete') : `${match.photos_uploaded || 0}/5`}
            </span>
          </div>
        </div>
      </div>

      {/* Sezioni */}
      <div className="card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
          {t('completeWithMissingPhotos')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {STEPS.map((step) => {
            const hasData = hasSection(step.id)
            const isUploading = uploading && uploadSection === step.id

            return (
              <div
                key={step.id}
                style={{
                  padding: '16px',
                  background: hasData ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 165, 0, 0.05)',
                  border: `1px solid ${hasData ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 165, 0, 0.2)'}`,
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{step.icon}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>{step.label}</span>
                  </div>
                  {hasData ? (
                    <CheckCircle2 size={20} color="#22C55E" />
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--neon-orange)' }}>{t('missing')}</span>
                  )}
                </div>
                
                {!hasData && (
                  <div>
                    {!uploadImage || uploadSection !== step.id ? (
                      <label style={{ display: 'block' }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect(step.id)}
                          style={{ display: 'none' }}
                          disabled={extracting}
                        />
                        <div
                          style={{
                            padding: '12px',
                            background: 'rgba(255, 165, 0, 0.1)',
                            border: '1px dashed rgba(255, 165, 0, 0.3)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            cursor: extracting ? 'not-allowed' : 'pointer',
                            opacity: extracting ? 0.5 : 1
                          }}
                        >
                          <Camera size={20} style={{ marginBottom: '8px', color: 'var(--neon-orange)' }} />
                          <div style={{ fontSize: '14px' }}>{t('uploadPhoto')}</div>
                        </div>
                      </label>
                    ) : (
                      <div>
                        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                          <img 
                            src={uploadImage} 
                            alt="Preview" 
                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleExtractAndUpdate}
                            className="btn primary"
                            disabled={extracting}
                            style={{ flex: 1 }}
                          >
                            {extracting ? (
                              <>
                                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                {t('extracting')}
                              </>
                            ) : (
                              <>
                                <Upload size={16} />
                                {t('extractAndSave')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setUploadImage(null)
                              setUploadSection(null)
                            }}
                            className="btn"
                            disabled={extracting}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sezione Analisi AI */}
      <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Brain size={24} color="var(--neon-blue)" style={{ flexShrink: 0 }} />
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, margin: 0 }}>
            {t('aiAnalysis') || 'Analisi AI'}
          </h2>
        </div>

        {(() => {
          // Parse ai_summary (può essere JSON string, oggetto, o testo semplice)
          let summaryData = null
          if (match.ai_summary) {
            if (typeof match.ai_summary === 'string') {
              try {
                // Prova a parsare come JSON
                summaryData = JSON.parse(match.ai_summary)
                // Verifica che sia un oggetto valido con struttura corretta
                if (!summaryData || typeof summaryData !== 'object') {
                  throw new Error('Invalid JSON structure')
                }
              } catch (e) {
                // Se non è JSON valido, è testo semplice (retrocompatibilità)
                summaryData = { 
                  analysis: { 
                    match_overview: match.ai_summary 
                  },
                  confidence: 0,
                  data_quality: 'low',
                  warnings: ['Riassunto in formato testo semplice (formato legacy)']
                }
              }
            } else if (typeof match.ai_summary === 'object') {
              // Se è già un oggetto, usa direttamente
              summaryData = match.ai_summary
            }
          }

          // Helper per estrarre testo bilingue (supporta formato {it, en} e retrocompatibilità)
          // Stesso pattern di contromisure-live pickLang: stringa o { it, en } → sempre stringa (mai oggetto in JSX)
          const getBilingualText = (text) => {
            if (text == null) return ''
            if (typeof text === 'string') return text
            if (typeof text === 'object' && (text.it !== undefined || text.en !== undefined))
              return text[lang] || text.it || text.en || ''
            return String(text)
          }

          // Helper per estrarre array bilingue
          const getBilingualArray = (arr) => {
            if (!arr) return []
            if (Array.isArray(arr)) return arr // Retrocompatibilità: array semplice
            if (typeof arr === 'object' && arr.it && arr.en) {
              // Formato bilingue: estrai lingua corrente
              return Array.isArray(arr[lang]) ? arr[lang] : (Array.isArray(arr.it) ? arr.it : [])
            }
            return []
          }

          const getPriorityColor = (priority) => {
            switch (priority) {
              case 'high': return 'var(--neon-orange)'
              case 'medium': return 'var(--neon-blue)'
              case 'low': return '#888'
              default: return '#888'
            }
          }

          const getPriorityLabel = (priority) => {
            switch (priority) {
              case 'high': return `${t('priority') || 'Priorità'}: ${t('priorityHigh') || 'Alta'}`
              case 'medium': return `${t('priority') || 'Priorità'}: ${t('priorityMedium') || 'Media'}`
              case 'low': return `${t('priority') || 'Priorità'}: ${t('priorityLow') || 'Bassa'}`
              default: return t('priority') || 'Priorità'
            }
          }

          return summaryData ? (
            <>
              {/* Overview Match */}
              {summaryData.analysis && (
                <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedSections(prev => ({ ...prev, overview: !prev.overview }))}
                  >
                    <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <Trophy size={24} color="var(--neon-orange)" />
                      {t('matchOverview') || 'Riepilogo Partita'}
                    </h2>
                    {expandedSections.overview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {expandedSections.overview && (
                    <div>
                      {summaryData.analysis.match_overview && (
                        <div style={{ marginBottom: '16px', lineHeight: '1.7', fontSize: 'clamp(14px, 3vw, 15px)' }}>
                          {getBilingualText(summaryData.analysis.match_overview)}
                        </div>
                      )}
                      {summaryData.analysis.result_analysis && (
                        <div style={{ marginBottom: '16px', lineHeight: '1.7', fontSize: 'clamp(14px, 3vw, 15px)' }}>
                          {getBilingualText(summaryData.analysis.result_analysis)}
                        </div>
                      )}
                      {getBilingualArray(summaryData.analysis.key_highlights).length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <strong style={{ color: 'var(--neon-blue)' }}>{t('keyHighlights') || 'Punti Chiave'}:</strong>
                          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            {getBilingualArray(summaryData.analysis.key_highlights).map((highlight, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{getBilingualText(highlight)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {getBilingualArray(summaryData.analysis.strengths).length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <strong style={{ color: 'var(--neon-orange)' }}>{t('strengths') || 'Punti di Forza'}:</strong>
                          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            {getBilingualArray(summaryData.analysis.strengths).map((strength, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{getBilingualText(strength)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {getBilingualArray(summaryData.analysis.weaknesses).length > 0 && (
                        <div>
                          <strong style={{ color: 'var(--neon-blue)' }}>{t('weaknesses') || 'Punti Deboli'}:</strong>
                          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            {getBilingualArray(summaryData.analysis.weaknesses).map((weakness, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{getBilingualText(weakness)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Performance Giocatori */}
              {summaryData.player_performance && (
                <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedSections(prev => ({ ...prev, performance: !prev.performance }))}
                  >
                    <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <Users size={24} color="var(--neon-blue)" />
                      {t('playerPerformance') || 'Performance Giocatori'}
                    </h2>
                    {expandedSections.performance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {expandedSections.performance && (
                    <div>
                      {summaryData.player_performance.top_performers && summaryData.player_performance.top_performers.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <strong style={{ color: 'var(--neon-orange)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={18} />
                            {t('topPerformers') || 'Migliori Performance'}
                          </strong>
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summaryData.player_performance.top_performers.map((player, idx) => (
                              <div key={idx} style={{
                                padding: '12px',
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '8px'
                              }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                  {player.player_name} - {t('rating') || 'Voto'}: {player.rating}
                                </div>
                                <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', opacity: 0.9 }}>
                                  {getBilingualText(player.reason)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {summaryData.player_performance.underperformers && summaryData.player_performance.underperformers.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <strong style={{ color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingDown size={18} />
                            {t('underperformers') || 'Performance Insufficienti'}
                          </strong>
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summaryData.player_performance.underperformers.map((player, idx) => (
                              <div key={idx} style={{
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px'
                              }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                  {player.player_name} - {t('rating') || 'Voto'}: {player.rating}
                                </div>
                                <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', opacity: 0.9, marginBottom: player.suggested_replacement ? '8px' : '0' }}>
                                  {getBilingualText(player.reason)}
                                </div>
                                {player.suggested_replacement && (
                                  <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', opacity: 0.8, fontStyle: 'italic' }}>
                                    💡 {t('suggestedReplacement') || 'Suggerimento'}: {getBilingualText(player.suggested_replacement)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {summaryData.player_performance.suggestions && summaryData.player_performance.suggestions.length > 0 && (
                        <div>
                          <strong style={{ color: 'var(--neon-blue)' }}>{t('suggestions') || 'Suggerimenti'}:</strong>
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summaryData.player_performance.suggestions.map((suggestion, idx) => (
                              <div key={idx} style={{
                                padding: '12px',
                                background: 'rgba(0, 212, 255, 0.1)',
                                border: `1px solid ${getPriorityColor(suggestion.priority)}`,
                                borderRadius: '8px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <span style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: getPriorityColor(suggestion.priority), fontWeight: 600 }}>
                                    {getPriorityLabel(suggestion.priority)}
                                  </span>
                                </div>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                  {suggestion.player_name}
                                </div>
                                <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', opacity: 0.9 }}>
                                  {getBilingualText(suggestion.reason)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Analisi Tattica */}
              {summaryData.tactical_analysis && (
                <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedSections(prev => ({ ...prev, tactical: !prev.tactical }))}
                  >
                    <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <Shield size={24} color="var(--neon-orange)" />
                      {t('tacticalAnalysis') || 'Analisi Tattica'}
                    </h2>
                    {expandedSections.tactical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {expandedSections.tactical && (
                    <div>
                      {summaryData.tactical_analysis.what_worked && (
                        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
                          <strong style={{ color: 'var(--neon-orange)' }}>{t('whatWorked') || 'Cosa ha Funzionato'}:</strong>
                          <div style={{ marginTop: '8px', lineHeight: '1.6' }}>{getBilingualText(summaryData.tactical_analysis.what_worked)}</div>
                        </div>
                      )}
                      {summaryData.tactical_analysis.what_didnt_work && (
                        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                          <strong style={{ color: 'var(--neon-blue)' }}>{t('whatDidntWork') || 'Cosa non ha Funzionato'}:</strong>
                          <div style={{ marginTop: '8px', lineHeight: '1.6' }}>{getBilingualText(summaryData.tactical_analysis.what_didnt_work)}</div>
                        </div>
                      )}
                      {summaryData.tactical_analysis.formation_effectiveness && (
                        <div style={{ marginBottom: '16px', lineHeight: '1.6' }}>
                          {getBilingualText(summaryData.tactical_analysis.formation_effectiveness)}
                        </div>
                      )}
                      {summaryData.tactical_analysis.suggestions && summaryData.tactical_analysis.suggestions.length > 0 && (
                        <div>
                          <strong style={{ color: 'var(--neon-blue)' }}>{t('tacticalSuggestions') || 'Suggerimenti Tattici'}:</strong>
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {summaryData.tactical_analysis.suggestions.map((suggestion, idx) => (
                              <div key={idx} style={{
                                padding: '12px',
                                background: 'rgba(0, 212, 255, 0.1)',
                                border: `1px solid ${getPriorityColor(suggestion.priority)}`,
                                borderRadius: '8px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <span style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: getPriorityColor(suggestion.priority), fontWeight: 600 }}>
                                    {getPriorityLabel(suggestion.priority)}
                                  </span>
                                </div>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                  {getBilingualText(suggestion.suggestion)}
                                </div>
                                <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', opacity: 0.9 }}>
                                  {getBilingualText(suggestion.reason)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Raccomandazioni */}
              {summaryData.recommendations && summaryData.recommendations.length > 0 && (
                <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '16px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedSections(prev => ({ ...prev, recommendations: !prev.recommendations }))}
                  >
                    <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <Target size={24} color="var(--neon-blue)" />
                      {t('recommendations') || 'Raccomandazioni'}
                    </h2>
                    {expandedSections.recommendations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>

                  {expandedSections.recommendations && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {summaryData.recommendations.map((rec, idx) => (
                        <div key={idx} style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: `1px solid ${getPriorityColor(rec.priority)}`,
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: getPriorityColor(rec.priority), fontWeight: 600 }}>
                              {getPriorityLabel(rec.priority)}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                            {getBilingualText(rec.title)}
                          </div>
                          <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9, marginBottom: '8px' }}>
                            {getBilingualText(rec.description)}
                          </div>
                          <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', opacity: 0.8, fontStyle: 'italic' }}>
                            💡 {getBilingualText(rec.reason)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {(() => {
                // Gestisci warnings bilingue (può essere {it: [], en: []} o array semplice)
                const warningsArray = Array.isArray(summaryData.warnings) 
                  ? summaryData.warnings 
                  : (summaryData.warnings && typeof summaryData.warnings === 'object' && summaryData.warnings[lang])
                    ? summaryData.warnings[lang]
                    : (summaryData.warnings && typeof summaryData.warnings === 'object' && summaryData.warnings.it)
                      ? summaryData.warnings.it
                      : []
                
                return warningsArray.length > 0 ? (
                  <div style={{
                    padding: 'clamp(12px, 3vw, 16px)',
                    background: 'rgba(255, 165, 0, 0.1)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
                      <AlertCircle size={18} color="var(--neon-orange)" />
                      {t('warnings') || 'Avvertimenti'}
                    </div>
                    <ul style={{ marginLeft: '24px' }}>
                      {warningsArray.map((warning, idx) => (
                        <li key={idx} style={{ marginBottom: '4px', fontSize: 'clamp(13px, 3vw, 14px)' }}>{getBilingualText(warning)}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              })()}

              {/* Historical Insights */}
              {summaryData.historical_insights && getBilingualText(summaryData.historical_insights) && (
                <div style={{
                  padding: 'clamp(12px, 3vw, 16px)',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
                    <Trophy size={18} color="var(--neon-blue)" />
                    {t('historicalInsights') || 'Insight Storico'}
                  </div>
                  <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6' }}>
                    {getBilingualText(summaryData.historical_insights)}
                  </div>
                </div>
              )}

              {/* Info Confidence */}
              <div style={{
                padding: 'clamp(10px, 2.5vw, 12px)',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: 'clamp(12px, 2.5vw, 13px)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span>
                  <strong>{t('confidence') || 'Affidabilità'}:</strong> {summaryData.confidence || 0}%
                </span>
                <span>
                  <strong>{t('dataQuality') || 'Qualità Dati'}:</strong> {summaryData.data_quality || 'N/A'}
                </span>
              </div>

              {/* Pulsante Rigenera */}
              <button
                onClick={handleRegenerateSummary}
                disabled={generatingSummary}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: generatingSummary ? 'rgba(156, 163, 175, 0.2)' : 'rgba(0, 212, 255, 0.2)',
                  border: `1px solid ${generatingSummary ? 'rgba(156, 163, 175, 0.5)' : 'rgba(0, 212, 255, 0.5)'}`,
                  borderRadius: '8px',
                  color: generatingSummary ? '#d1d5db' : 'var(--neon-blue)',
                  cursor: generatingSummary ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                {generatingSummary ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('generatingAnalysis') || 'Generazione in corso...'}
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    {t('regenerateSummary') || 'Rigenera Riassunto'}
                  </>
                )}
              </button>
            </>
          ) : (
          <div style={{
            padding: 'clamp(16px, 4vw, 24px)',
            textAlign: 'center',
            background: 'rgba(255, 165, 0, 0.05)',
            border: '1px dashed rgba(255, 165, 0, 0.3)',
            borderRadius: '12px'
          }}>
            <p style={{ marginBottom: '16px', opacity: 0.8, fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6' }}>
              {t('noSummaryAvailable') || 'Nessun riassunto disponibile. Genera un riassunto per vedere l\'analisi della partita.'}
            </p>
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              style={{
                padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 24px)',
                background: generatingSummary ? 'rgba(156, 163, 175, 0.2)' : 'rgba(0, 212, 255, 0.2)',
                border: `1px solid ${generatingSummary ? 'rgba(156, 163, 175, 0.5)' : 'rgba(0, 212, 255, 0.5)'}`,
                borderRadius: '8px',
                color: generatingSummary ? '#d1d5db' : 'var(--neon-blue)',
                cursor: generatingSummary ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(6px, 1.5vw, 8px)',
                fontWeight: 600,
                fontSize: 'clamp(13px, 3vw, 14px)',
                whiteSpace: 'nowrap'
              }}
            >
              {generatingSummary ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {t('generatingAnalysis') || 'Generazione in corso...'}
                </>
              ) : (
                <>
                  <Brain size={18} />
                  {t('generateAnalysis') || 'Genera Riassunto AI'}
                </>
              )}
            </button>
          </div>
          )
        })()}

        {summaryError && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            {summaryError}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
