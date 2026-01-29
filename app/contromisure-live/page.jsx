'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { safeJsonResponse } from '@/lib/fetchHelper'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, Camera, Shield, Target, Users, Settings, ChevronDown, ChevronUp, Brain } from 'lucide-react'

/** Estrae testo in lingua da valore stringa o oggetto bilingue { it, en } (coerente con analyze-match) */
function pickLang(val, lang) {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && (val.it !== undefined || val.en !== undefined)) return val[lang] || val.it || val.en || ''
  return String(val)
}

export default function CountermeasuresLivePage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  
  const [uploadImage, setUploadImage] = React.useState(null)
  const [extracting, setExtracting] = React.useState(false)
  const [extractedFormation, setExtractedFormation] = React.useState(null)
  const [generating, setGenerating] = React.useState(false)
  const [countermeasures, setCountermeasures] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [selectedSuggestions, setSelectedSuggestions] = React.useState(new Set())
  const [applying, setApplying] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState({
    analysis: true,
    formation: false,
    tactical: false,
    players: false,
    instructions: false
  })

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validazione dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('errorImageTooLarge') || 'Immagine troppo grande (max 10MB)')
      return
    }

    // Validazione tipo
    if (!file.type.startsWith('image/')) {
      setError(t('errorInvalidImage') || 'File non è un\'immagine valida')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadImage(event.target.result)
      setError(null)
      setExtractedFormation(null)
      setCountermeasures(null)
    }
    reader.readAsDataURL(file)
  }

  const handleExtractFormation = async () => {
    if (!uploadImage) {
      setError(t('noFormationUploaded') || 'Carica prima una formazione avversaria')
      return
    }

    setExtracting(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('tokenNotAvailable'))
      }

      const token = session.session.access_token

      const extractRes = await fetch('/api/extract-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageDataUrl: uploadImage })
      })

      if (!extractRes.ok) {
        const errorData = await extractRes.json()
        throw new Error(errorData.error || t('errorExtractingFormation') || 'Errore estrazione formazione')
      }

      const extractData = await extractRes.json()
      
      // Salva formazione avversaria in Supabase
      const saveRes = await fetch('/api/supabase/save-opponent-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          formation_name: extractData.formation || null,
          playing_style: extractData.playing_style || null,
          extracted_data: {
            formation: extractData.formation,
            slot_positions: extractData.slot_positions,
            players: extractData.players,
            overall_strength: extractData.overall_strength,
            tactical_style: extractData.tactical_style,
            coach: extractData.coach || null // Include coach se presente
          },
          is_pre_match: true
        })
      })

      const saveData = await safeJsonResponse(saveRes, 'Errore salvataggio formazione')
      setExtractedFormation({
        id: saveData.formation?.id,
        formation_name: extractData.formation,
        playing_style: extractData.playing_style,
        players: extractData.players,
        overall_strength: extractData.overall_strength,
        tactical_style: extractData.tactical_style,
        coach: extractData.coach || null // Include coach se presente
      })
    } catch (err) {
      console.error('[CountermeasuresLive] Extract error:', err)
      setError(err.message || t('errorExtractingFormation') || 'Errore estrazione formazione')
    } finally {
      setExtracting(false)
    }
  }

  const handleGenerateCountermeasures = async () => {
    if (!extractedFormation?.id) {
      setError(t('noFormationUploaded') || 'Estrai prima la formazione avversaria')
      return
    }

    setGenerating(true)
    setError(null)
    setCountermeasures(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('tokenNotAvailable'))
      }

      const token = session.session.access_token

      const generateRes = await fetch('/api/generate-countermeasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          opponent_formation_id: extractedFormation.id,
          language: lang
        })
      })

      const generateData = await safeJsonResponse(generateRes, t('errorGeneratingCountermeasures'))
      // La risposta API ha struttura: { success: true, countermeasures: {...}, model_used: '...' }
      if (generateData.success && generateData.countermeasures) {
        setCountermeasures(generateData.countermeasures)
      } else {
        throw new Error(t('errorGeneratingCountermeasures') || 'Errore generazione contromisure')
      }
    } catch (err) {
      console.error('[CountermeasuresLive] Generate error:', err)
      setError(err.message || t('errorGeneratingCountermeasures'))
    } finally {
      setGenerating(false)
    }
  }

  const toggleSuggestion = (suggestionId) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId)
      } else {
        newSet.add(suggestionId)
      }
      return newSet
    })
  }

  const handleApplySuggestions = async () => {
    if (selectedSuggestions.size === 0) {
      setError(t('selectSuggestionsToApply') || 'Seleziona almeno un suggerimento')
      return
    }

    setApplying(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('tokenNotAvailable'))
      }

      const token = session.session.access_token

      // Applica suggerimenti selezionati
      // TODO: Implementare logica applicazione
      // Per ora solo simulazione
      
      // Dopo applicazione, mostra successo
      alert(t('suggestionsApplied') || 'Suggerimenti applicati con successo')
      setSelectedSuggestions(new Set())
    } catch (err) {
      console.error('[CountermeasuresLive] Apply error:', err)
      setError(err.message || t('errorApplyingSuggestions'))
    } finally {
      setApplying(false)
    }
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
      case 'high': return `${t('priority')}: ${t('priorityHigh')}`
      case 'medium': return `${t('priority')}: ${t('priorityMedium')}`
      case 'low': return `${t('priority')}: ${t('priorityLow')}`
      default: return t('priority')
    }
  }

  return (
    <main data-tour-id="tour-counter-intro" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      padding: 'clamp(16px, 4vw, 24px)',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/')}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} />
            {t('back')}
          </button>
          <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
            {t('countermeasuresLive') || 'Contromisure Live'}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

      {/* Upload Sezione */}
      {!extractedFormation && (
        <div data-tour-id="tour-counter-upload" className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} color="var(--neon-orange)" />
            {t('uploadOpponentFormation') || 'Carica Formazione Avversaria'}
          </h2>
          
          {!uploadImage ? (
            <label style={{ display: 'block' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                disabled={extracting}
              />
              <div
                style={{
                  padding: 'clamp(24px, 6vw, 48px)',
                  background: 'rgba(255, 165, 0, 0.1)',
                  border: '2px dashed rgba(255, 165, 0, 0.3)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  cursor: extracting ? 'not-allowed' : 'pointer',
                  opacity: extracting ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!extracting) {
                    e.currentTarget.style.background = 'rgba(255, 165, 0, 0.15)'
                    e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!extracting) {
                    e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.3)'
                  }
                }}
              >
                <Camera size={48} style={{ marginBottom: '16px', color: 'var(--neon-orange)' }} />
                <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 600, marginBottom: '8px' }}>
                  {t('uploadPhoto') || 'Carica Screenshot'}
                </div>
                <div style={{ fontSize: 'clamp(12px, 2.5vw, 14px)', opacity: 0.8 }}>
                  {t('uploadPhotoDescription') || 'Carica uno screenshot della formazione avversaria'}
                </div>
              </div>
            </label>
          ) : (
            <div>
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img 
                  src={uploadImage} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleExtractFormation}
                  className="btn primary"
                  disabled={extracting}
                  style={{ flex: 1, minWidth: '200px' }}
                >
                  {extracting ? (
                    <>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {t('extracting') || 'Estrazione...'}
                    </>
                  ) : (
                    <>
                      <Target size={16} />
                      {t('extractFormation') || 'Estrai Formazione'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setUploadImage(null)
                    setError(null)
                  }}
                  className="btn"
                  disabled={extracting}
                >
                  <X size={16} />
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Formazione Estratta */}
      {extractedFormation && !countermeasures && (
        <div data-tour-id="tour-counter-extracted" className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={24} color="#22C55E" />
            {t('formationExtracted') || 'Formazione Estratta'}
          </h2>
          
          <div style={{ 
            padding: 'clamp(12px, 3vw, 16px)', 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.3)', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <strong>{t('formation') || 'Formazione'}:</strong> {extractedFormation.formation_name || 'N/A'}
              </div>
              {extractedFormation.playing_style && (
                <div>
                  <strong>{t('playingStyle') || 'Stile'}:</strong> {extractedFormation.playing_style}
                </div>
              )}
              {extractedFormation.overall_strength && (
                <div>
                  <strong>{t('overallStrength') || 'Forza'}:</strong> {extractedFormation.overall_strength}
                </div>
              )}
            </div>
            {extractedFormation.coach && (
              <div style={{ 
                marginTop: '12px', 
                padding: '10px', 
                background: 'rgba(0, 212, 255, 0.1)', 
                border: '1px solid rgba(0, 212, 255, 0.3)', 
                borderRadius: '6px',
                fontSize: 'clamp(12px, 2.5vw, 14px)'
              }}>
                <strong style={{ color: 'var(--neon-blue)' }}>✓ {t('coach') || 'Allenatore'} estratto:</strong> {extractedFormation.coach.coach_name || 'N/A'}
                {extractedFormation.coach.age && ` (${extractedFormation.coach.age} ${t('years') || 'anni'})`}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateCountermeasures}
            className="btn primary"
            disabled={generating}
            style={{ width: '100%' }}
          >
            {generating ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {t('generatingCountermeasures') || 'Generazione contromisure...'}
              </>
            ) : (
              <>
                <Brain size={18} />
                {t('generateCountermeasures') || 'Genera Contromisure'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Contromisure Generate */}
      {countermeasures && (
        <>
          {/* Analisi Formazione Avversaria */}
          <div data-tour-id="tour-counter-result" className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px',
                cursor: 'pointer'
              }}
              onClick={() => setExpandedSections(prev => ({ ...prev, analysis: !prev.analysis }))}
            >
              <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Target size={24} color="var(--neon-blue)" />
                {t('opponentFormationAnalysis') || 'Analisi Formazione Avversaria'}
              </h2>
              {expandedSections.analysis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {expandedSections.analysis && (
              <div>
                {countermeasures.analysis.is_meta_formation && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 165, 0, 0.1)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={18} color="var(--neon-orange)" />
                    <strong>{t('metaFormation') || 'Formazione Meta'}:</strong> {countermeasures.analysis.meta_type}
                  </div>
                )}

                <div style={{ marginBottom: '16px', lineHeight: '1.7' }}>
                  {countermeasures.analysis.opponent_formation_analysis}
                </div>

                {countermeasures.analysis.strengths && countermeasures.analysis.strengths.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: 'var(--neon-orange)' }}>{t('formationStrengths') || 'Punti di Forza'}:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {countermeasures.analysis.strengths.map((strength, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {countermeasures.analysis.weaknesses && countermeasures.analysis.weaknesses.length > 0 && (
                  <div>
                    <strong style={{ color: 'var(--neon-blue)' }}>{t('formationWeaknesses') || 'Punti Deboli'}:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {countermeasures.analysis.weaknesses.map((weakness, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {countermeasures.analysis.why_weaknesses && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px', fontSize: 'clamp(13px, 3vw, 14px)' }}>
                    <strong>{t('reason') || 'Motivazione'}:</strong> {countermeasures.analysis.why_weaknesses}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contromisure Tattiche */}
          {(countermeasures.countermeasures.formation_adjustments?.length > 0 || 
            countermeasures.countermeasures.tactical_adjustments?.length > 0) && (
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
                  {t('tacticalCountermeasures') || 'Contromisure Tattiche'}
                </h2>
                {expandedSections.tactical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.tactical && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {countermeasures.countermeasures.formation_adjustments?.map((adj, idx) => {
                    const suggestionId = `formation_${idx}`
                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: selectedSuggestions.has(suggestionId) ? 'rgba(255, 165, 0, 0.2)' : 'rgba(255, 165, 0, 0.1)',
                          border: `1px solid ${getPriorityColor(adj.priority)}`,
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleSuggestion(suggestionId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="checkbox"
                            checked={selectedSuggestions.has(suggestionId)}
                            onChange={() => toggleSuggestion(suggestionId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(adj.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(adj.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {adj.type === 'formation_change' ? t('changeFormation') : t('changePlayingStyle')}: {pickLang(adj.suggestion, lang)}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {pickLang(adj.reason, lang)}
                        </div>
                      </div>
                    )
                  })}

                  {countermeasures.countermeasures.tactical_adjustments?.map((adj, idx) => {
                    const suggestionId = `tactical_${idx}`
                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: selectedSuggestions.has(suggestionId) ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.1)',
                          border: `1px solid ${getPriorityColor(adj.priority)}`,
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleSuggestion(suggestionId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="checkbox"
                            checked={selectedSuggestions.has(suggestionId)}
                            onChange={() => toggleSuggestion(suggestionId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(adj.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(adj.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {adj.type === 'defensive_line' ? t('adjustDefensiveLine') :
                           adj.type === 'pressing' ? t('adjustPressing') :
                           adj.type === 'possession_strategy' ? t('adjustPossession') :
                           t('changePlayingStyle')}: {adj.suggestion}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {adj.reason}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Suggerimenti Giocatori */}
          {countermeasures.countermeasures.player_suggestions?.length > 0 && (
            <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, players: !prev.players }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Users size={24} color="var(--neon-blue)" />
                  {t('playerSuggestions') || 'Suggerimenti Giocatori'}
                </h2>
                {expandedSections.players ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.players && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {countermeasures.countermeasures.player_suggestions.map((suggestion, idx) => {
                    const suggestionId = `player_${idx}`
                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: selectedSuggestions.has(suggestionId) ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.1)',
                          border: `1px solid ${getPriorityColor(suggestion.priority)}`,
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleSuggestion(suggestionId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="checkbox"
                            checked={selectedSuggestions.has(suggestionId)}
                            onChange={() => toggleSuggestion(suggestionId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(suggestion.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(suggestion.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {suggestion.action === 'add_to_starting_xi' ? t('addToStartingXI') : t('removeFromStartingXI')}: {suggestion.player_name} ({suggestion.position})
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {pickLang(suggestion.reason, lang)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Istruzioni Individuali */}
          {countermeasures.countermeasures.individual_instructions?.length > 0 && (
            <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, instructions: !prev.instructions }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Settings size={24} color="var(--neon-blue)" />
                  {t('individualInstructions') || 'Istruzioni Individuali'}
                </h2>
                {expandedSections.instructions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.instructions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {countermeasures.countermeasures.individual_instructions.map((instruction, idx) => {
                    const suggestionId = `instruction_${idx}`
                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(10px, 2.5vw, 12px)',
                          background: selectedSuggestions.has(suggestionId) ? 'rgba(0, 212, 255, 0.15)' : 'rgba(0, 212, 255, 0.05)',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                        onClick={() => toggleSuggestion(suggestionId)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <input
                            type="checkbox"
                            checked={selectedSuggestions.has(suggestionId)}
                            onChange={() => toggleSuggestion(suggestionId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={{ fontSize: 'clamp(13px, 3vw, 14px)', fontWeight: 600 }}>
                            {instruction.slot}: {pickLang(instruction.instruction, lang)}
                          </span>
                        </div>
                        <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', opacity: 0.8, marginLeft: '24px' }}>
                          {pickLang(instruction.reason, lang)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {countermeasures.warnings && countermeasures.warnings.length > 0 && (
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
                {countermeasures.warnings.map((warning, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', fontSize: 'clamp(13px, 3vw, 14px)' }}>{pickLang(warning, lang)}</li>
                ))}
              </ul>
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
              <strong>{t('confidence') || 'Affidabilità'}:</strong> {countermeasures.confidence}%
            </span>
            <span>
              <strong>{t('dataQuality') || 'Qualità Dati'}:</strong> {countermeasures.data_quality || 'N/A'}
            </span>
          </div>

          {/* Pulsante Applica Selezionati */}
          {selectedSuggestions.size > 0 && (
            <button
              onClick={handleApplySuggestions}
              className="btn primary"
              disabled={applying}
              style={{ width: '100%', marginTop: '24px' }}
            >
              {applying ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  {t('applying') || 'Applicazione...'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {t('applySelected')} ({selectedSuggestions.size})
                </>
              )}
            </button>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
