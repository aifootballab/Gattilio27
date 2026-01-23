'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, Camera, Calendar, Trophy, Brain } from 'lucide-react'

// STEPS sarà definito dentro il componente per avere accesso a t()

export default function MatchDetailPage() {
  const { t } = useTranslation()
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
          throw new Error(queryError.message || t('matchNotFound'))
        }

        if (!data) {
          throw new Error(t('matchNotFound'))
        }

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

      // Prepara matchData per analisi
      const matchData = {
        result: match.result,
        player_ratings: match.player_ratings,
        team_stats: match.team_stats,
        attack_areas: match.attack_areas,
        ball_recovery_zones: match.ball_recovery_zones,
        formation_played: match.formation_played,
        playing_style_played: match.playing_style_played,
        team_strength: match.team_strength,
        opponent_formation_id: match.opponent_formation_id,
        client_team_name: match.client_team_name
      }

      // Genera riassunto
      const analyzeRes = await fetch('/api/analyze-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchData })
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
          data: { ai_summary: summary }
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

  if (error && !match) {
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

  if (!match) return null

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

        {match.ai_summary ? (
          <div>
            {/* Riassunto Completo */}
            <div style={{
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '12px',
              padding: 'clamp(16px, 4vw, 20px)',
              marginBottom: '16px',
              lineHeight: '1.7',
              fontSize: 'clamp(14px, 3vw, 15px)',
              color: '#fff',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {match.ai_summary}
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
          </div>
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
        )}

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
