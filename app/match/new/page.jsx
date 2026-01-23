'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, SkipForward, Save, Camera, Brain, Trophy } from 'lucide-react'

// STEPS sarà definito dentro il componente per avere accesso a t()

const STORAGE_KEY = 'match_wizard_progress'

export default function NewMatchPage() {
  const { t } = useTranslation()
  const router = useRouter()
  
  const STEPS = React.useMemo(() => [
    { id: 'player_ratings', label: t('stepPlayerRatings'), icon: '⭐' },
    { id: 'team_stats', label: t('stepTeamStats'), icon: '📊' },
    { id: 'attack_areas', label: t('stepAttackAreas'), icon: '⚽' },
    { id: 'ball_recovery_zones', label: t('stepBallRecoveryZones'), icon: '🔄' },
    { id: 'formation_style', label: t('stepFormationStyle'), icon: '🎯' }
  ], [t])
  
  const [currentStep, setCurrentStep] = React.useState(0)
  const [stepData, setStepData] = React.useState({}) // { section: { data, image } }
  const [stepImages, setStepImages] = React.useState({}) // { section: dataUrl }
  const [extracting, setExtracting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [showSummary, setShowSummary] = React.useState(false)
  const [generatingAnalysis, setGeneratingAnalysis] = React.useState(false)
  const [analysisSummary, setAnalysisSummary] = React.useState(null)
  const [analysisConfidence, setAnalysisConfidence] = React.useState(null)
  const [missingSections, setMissingSections] = React.useState([])

  // Carica progresso salvato al mount
  React.useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setStepData(parsed.stepData || {})
        setStepImages(parsed.stepImages || {})
        // Trova primo step senza dati
        const firstEmptyStep = STEPS.findIndex(step => !parsed.stepData?.[step.id])
        if (firstEmptyStep >= 0) {
          setCurrentStep(firstEmptyStep)
        }
      }
    } catch (err) {
      console.warn('[NewMatch] Error loading saved progress:', err)
    }
  }, [STEPS])

  // Salva progresso in localStorage
  const saveProgress = React.useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stepData,
        stepImages,
        timestamp: Date.now()
      }))
    } catch (err) {
      console.warn('[NewMatch] Error saving progress:', err)
    }
  }, [stepData, stepImages])

  React.useEffect(() => {
    if (mounted) {
      saveProgress()
    }
  }, [stepData, stepImages, mounted, saveProgress])

  // Pulisci localStorage dopo salvataggio riuscito
  const clearProgress = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.warn('[NewMatch] Error clearing progress:', err)
    }
  }

  const handleImageSelect = (section) => (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setError('Seleziona un file immagine valido')
      return
    }

    // Validazione dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('L\'immagine è troppo grande (max 10MB)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setStepImages(prev => ({ ...prev, [section]: dataUrl }))
      setError(null)
    }
    reader.readAsDataURL(file)
    // Reset input
    e.target.value = ''
  }

  const handleExtract = async (section) => {
    const imageDataUrl = stepImages[section]
    if (!imageDataUrl) {
      setError(t('loadImageFirst'))
      return
    }

    setExtracting(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpiredRedirect'))
      }

      const token = session.session.access_token

      const extractRes = await fetch('/api/extract-match-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageDataUrl,
          section
        })
      })

      const extractData = await extractRes.json()

      if (!extractRes.ok) {
        // Messaggi di errore specifici
        let errorMsg = extractData.error || t('extractDataError')
        
        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
          errorMsg = t('errorQuotaExhausted')
        } else if (errorMsg.includes('timeout') || errorMsg.includes('took too long')) {
          errorMsg = t('errorTimeout')
        } else if (errorMsg.includes('too large') || errorMsg.includes('10MB')) {
          errorMsg = t('errorImageTooLarge')
        } else if (errorMsg.includes('Unable to extract') || errorMsg.includes('No content')) {
          errorMsg = t('errorInvalidScreenshot')
        }
        
        throw new Error(errorMsg)
      }

      // Salva dati estratti
      setStepData(prev => ({
        ...prev,
        [section]: extractData.data
      }))

      // Salva risultato se presente (può essere estratto da qualsiasi sezione)
      if (extractData.result && typeof extractData.result === 'string' && extractData.result.trim()) {
        setStepData(prev => ({
          ...prev,
          result: extractData.result.trim()
        }))
      }

      // Avanza automaticamente allo step successivo se c'è
      const currentIndex = STEPS.findIndex(s => s.id === section)
      if (currentIndex < STEPS.length - 1) {
        setTimeout(() => {
          setCurrentStep(currentIndex + 1)
        }, 500)
      }
    } catch (err) {
      console.error('[NewMatch] Extract error:', err)
      setError(err.message || t('extractDataError'))
    } finally {
      setExtracting(false)
    }
  }

  const handleSkip = (section) => {
    // Salva null per indicare che è stato saltato
    setStepData(prev => ({
      ...prev,
      [section]: null
    }))
    setStepImages(prev => {
      const next = { ...prev }
      delete next[section]
      return next
    })

    // Avanza allo step successivo
    const currentIndex = STEPS.findIndex(s => s.id === section)
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(currentIndex + 1)
    }
  }

  const handleGenerateAnalysis = async () => {
    setGeneratingAnalysis(true)
    setError(null)
    
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpired'))
      }

      const token = session.session.access_token
      
      // Prepara dati match (stessa logica di handleSave)
      let matchResult = stepData.result || null
      if (!matchResult && stepData.team_stats && stepData.team_stats.result) {
        matchResult = stepData.team_stats.result
      }

      const matchData = {
        result: matchResult,
        player_ratings: stepData.player_ratings || null,
        team_stats: stepData.team_stats || null,
        attack_areas: stepData.attack_areas || null,
        ball_recovery_zones: stepData.ball_recovery_zones || null,
        formation_played: stepData.formation_style?.formation_played || null,
        playing_style_played: stepData.formation_style?.playing_style_played || null,
        team_strength: stepData.formation_style?.team_strength || null
      }

      const res = await fetch('/api/analyze-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchData })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('errorAnalysisGeneration'))
      }

      setAnalysisSummary(data.summary)
      setAnalysisConfidence(data.confidence)
      setMissingSections(data.missing_sections || [])
    } catch (err) {
      console.error('[NewMatch] Analysis error:', err)
      setError(err.message || t('errorAnalysisGeneration'))
    } finally {
      setGeneratingAnalysis(false)
    }
  }

  // Calcola progresso foto (solo sezioni, non result)
  const photosUploaded = React.useMemo(() => {
    return STEPS.filter(step => stepData[step.id] && stepData[step.id] !== null).length
  }, [stepData, STEPS])

  const photosMissing = React.useMemo(() => {
    return STEPS.filter(step => !stepData[step.id] || stepData[step.id] === null).map(step => step.label)
  }, [stepData, STEPS])

  const photosComplete = React.useMemo(() => {
    return STEPS.filter(step => stepData[step.id] && stepData[step.id] !== null).map(step => step.label)
  }, [stepData, STEPS])

  const handleShowSummary = () => {
    // Verifica che almeno una sezione abbia dati
    const hasData = Object.values(stepData).some(data => data !== null && data !== undefined)
    if (!hasData) {
      setError(t('loadAtLeastOneSection'))
      return
    }
    setShowSummary(true)
    setError(null)
  }

  const handleConfirmSave = () => {
    setShowSummary(false)
    handleSave()
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpired'))
      }

      const token = session.session.access_token

      // Estrai risultato se presente (può essere in stepData.result o in team_stats)
      let matchResult = stepData.result || null
      if (!matchResult && stepData.team_stats && stepData.team_stats.result) {
        matchResult = stepData.team_stats.result
      }
      
      // Rimuovi result da team_stats se presente (non fa parte delle statistiche)
      if (stepData.team_stats && stepData.team_stats.result) {
        const { result, ...statsWithoutResult } = stepData.team_stats
        stepData.team_stats = statsWithoutResult
      }

      // Prepara dati match
      const matchData = {
        result: matchResult,
        player_ratings: stepData.player_ratings || null,
        team_stats: stepData.team_stats || null,
        attack_areas: stepData.attack_areas || null,
        ball_recovery_zones: stepData.ball_recovery_zones || null,
        formation_played: stepData.formation_style?.formation_played || null,
        playing_style_played: stepData.formation_style?.playing_style_played || null,
        team_strength: stepData.formation_style?.team_strength || null,
        ai_summary: analysisSummary || null, // ✅ Salva riassunto AI se generato
        extracted_data: {
          stepData,
          stepImages: Object.keys(stepImages).reduce((acc, key) => {
            // Non salvare le immagini base64 nel DB (troppo grandi)
            acc[key] = 'uploaded'
            return acc
          }, {})
        }
      }

      const saveRes = await fetch('/api/supabase/save-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchData })
      })

      const saveData = await saveRes.json()

      if (!saveRes.ok) {
        throw new Error(saveData.error || t('saveMatchError'))
      }

      setSuccess(true)
      clearProgress()

      // Redirect dopo 2 secondi
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      console.error('[NewMatch] Save error:', err)
      setError(err.message || t('saveMatchError'))
    } finally {
      setSaving(false)
    }
  }

  const currentStepInfo = STEPS[currentStep]
  const currentSection = currentStepInfo?.id
  const currentImage = stepImages[currentSection]
  const currentData = stepData[currentSection]
  const progress = ((currentStep + 1) / STEPS.length) * 100
  const extractedResult = stepData.result || null

  if (!mounted) {
    return null
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#fff',
      padding: 'clamp(12px, 3vw, 20px)',
      paddingBottom: '100px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 700, margin: 0 }}>
            {t('addMatch')}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LanguageSwitch />
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        height: '8px',
        marginBottom: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #00d4ff 0%, #ff6b00 100%)',
          height: '100%',
          width: `${progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Progress Counter & Result */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          fontSize: '14px',
          opacity: 0.8,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{photosUploaded}/{STEPS.length} {t('photosCount')}</span>
        </div>
        {extractedResult && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: '#86efac'
          }}>
            <Trophy size={16} />
            <span><strong>{t('resultExtracted')}:</strong> {extractedResult}</span>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '32px',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {STEPS.map((step, index) => {
          const isActive = index === currentStep
          const isCompleted = stepData[step.id] !== null && stepData[step.id] !== undefined
          const isSkipped = stepData[step.id] === null

          return (
            <div
              key={step.id}
              style={{
                flex: 1,
                minWidth: '60px',
                textAlign: 'center',
                padding: '8px',
                borderRadius: '8px',
                background: isActive
                  ? 'rgba(0, 212, 255, 0.2)'
                  : isCompleted
                  ? 'rgba(34, 197, 94, 0.2)'
                  : isSkipped
                  ? 'rgba(156, 163, 175, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${
                  isActive
                    ? 'rgba(0, 212, 255, 0.5)'
                    : isCompleted
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'rgba(255, 255, 255, 0.1)'
                }`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setCurrentStep(index)}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{step.icon}</div>
              <div style={{
                fontSize: '10px',
                opacity: 0.8,
                display: isCompleted ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <CheckCircle2 size={12} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fca5a5'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.5)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#86efac'
        }}>
          <CheckCircle2 size={20} />
          <span>{t('matchSavedSuccess')}</span>
        </div>
      )}

      {/* Current Step Content */}
      {currentStepInfo && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{currentStepInfo.icon}</span>
            Passaggio {currentStep + 1}: {currentStepInfo.label}
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px' }}>
            {currentStep === 0 && t('step0Instruction')}
            {currentStep === 1 && t('step1Instruction')}
            {currentStep === 2 && t('step2Instruction')}
            {currentStep === 3 && t('step3Instruction')}
            {currentStep === 4 && t('step4Instruction')}
          </p>

          {/* Image Preview */}
          {currentImage && (
            <div style={{
              marginBottom: '16px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <img
                src={currentImage}
                alt="Preview"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>
          )}

          {/* Upload Button */}
          <label style={{
            display: 'block',
            width: '100%',
            marginBottom: '12px'
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect(currentSection)}
              style={{ display: 'none' }}
              disabled={extracting || saving}
            />
            <div style={{
              background: currentImage
                ? 'rgba(0, 212, 255, 0.1)'
                : 'rgba(0, 212, 255, 0.2)',
              border: `1px solid ${currentImage ? 'rgba(0, 212, 255, 0.5)' : 'rgba(0, 212, 255, 0.3)'}`,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              cursor: extracting || saving ? 'not-allowed' : 'pointer',
              opacity: extracting || saving ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#00d4ff'
            }}>
              <Camera size={20} />
              <span>{currentImage ? t('changeImage') : t('loadImage')}</span>
            </div>
          </label>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            {currentImage && (
              <button
                onClick={() => handleExtract(currentSection)}
                disabled={extracting || saving || !!currentData}
                style={{
                  flex: 1,
                  background: currentData
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(0, 212, 255, 0.2)',
                  border: `1px solid ${currentData ? 'rgba(34, 197, 94, 0.5)' : 'rgba(0, 212, 255, 0.5)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  color: currentData ? '#86efac' : '#00d4ff',
                  cursor: extracting || saving || currentData ? 'not-allowed' : 'pointer',
                  opacity: extracting || saving || currentData ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600
                }}
              >
                {extracting ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('extracting')}
                  </>
                ) : currentData ? (
                  <>
                    <CheckCircle2 size={18} />
                    {t('extractData')}
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    {t('extractData')}
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => handleSkip(currentSection)}
              disabled={extracting || saving}
              style={{
                flex: currentImage ? 0.5 : 1,
                background: 'rgba(156, 163, 175, 0.2)',
                border: '1px solid rgba(156, 163, 175, 0.5)',
                borderRadius: '8px',
                padding: '12px',
                color: '#d1d5db',
                cursor: extracting || saving ? 'not-allowed' : 'pointer',
                opacity: extracting || saving ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600
              }}
            >
              <SkipForward size={18} />
              Skip
            </button>
          </div>

          {/* Extracted Data Preview */}
          {currentData && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              fontSize: '12px',
              opacity: 0.8
            }}>
              <strong>{t('dataExtractedSuccess')}</strong>
            </div>
          )}
        </div>
      )}

      {/* Save Button (solo all'ultimo step o se tutti gli step sono completati/saltati) */}
      {(currentStep === STEPS.length - 1 || Object.keys(stepData).length === STEPS.length) && (
        <button
          onClick={handleShowSummary}
          disabled={saving || !Object.values(stepData).some(d => d !== null && d !== undefined)}
          style={{
            width: '100%',
            background: saving
              ? 'rgba(156, 163, 175, 0.2)'
              : 'rgba(34, 197, 94, 0.2)',
            border: `1px solid ${saving ? 'rgba(156, 163, 175, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
            borderRadius: '8px',
            padding: '16px',
            color: saving ? '#d1d5db' : '#86efac',
            cursor: saving || !Object.values(stepData).some(d => d !== null && d !== undefined) ? 'not-allowed' : 'pointer',
            opacity: saving || !Object.values(stepData).some(d => d !== null && d !== undefined) ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '16px'
          }}
        >
          {saving ? (
            <>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
              {t('saving')}
            </>
          ) : (
            <>
              <Save size={20} />
              {t('saveMatch')}
            </>
          )}
        </button>
      )}

      {/* Summary Modal */}
      {showSummary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          overflowY: 'auto'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSummary(false)
          }
        }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: 'clamp(16px, 4vw, 24px)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowSummary(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Trophy size={24} color="var(--neon-orange)" />
              {t('matchSummary')}
            </h2>

            {/* Risultato Estratto */}
            {extractedResult && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#86efac'
              }}>
                <Trophy size={18} />
                <span><strong>{t('resultExtracted')}:</strong> {extractedResult}</span>
              </div>
            )}

            {/* Sezioni Complete/Mancanti */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {photosComplete.length > 0 && (
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                    {t('sectionsComplete')} ({photosComplete.length})
                  </div>
                  <div style={{ fontSize: '14px', color: '#86efac' }}>
                    {photosComplete.join(', ')}
                  </div>
                </div>
              )}
              {photosMissing.length > 0 && (
                <div style={{
                  background: 'rgba(255, 165, 0, 0.1)',
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
                    {t('sectionsMissing')} ({photosMissing.length})
                  </div>
                  <div style={{ fontSize: '14px', color: '#ffa500' }}>
                    {photosMissing.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* AI Analysis Section */}
            <div style={{ marginTop: '24px' }}>
              {!analysisSummary ? (
                <button
                  onClick={handleGenerateAnalysis}
                  disabled={generatingAnalysis || saving}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 212, 255, 0.2)',
                    border: '1px solid rgba(0, 212, 255, 0.5)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#00d4ff',
                    cursor: generatingAnalysis || saving ? 'not-allowed' : 'pointer',
                    opacity: generatingAnalysis || saving ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 600
                  }}
                >
                  {generatingAnalysis ? (
                    <>
                      <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      {t('generatingAnalysis')}
                    </>
                  ) : (
                    <>
                      <Brain size={18} />
                      {t('generateAnalysis')}
                    </>
                  )}
                </button>
              ) : (
                <div style={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '16px'
                }}>
                  {/* Confidence Badge */}
                  {analysisConfidence < 100 && (
                    <div style={{
                      background: 'rgba(255, 165, 0, 0.2)',
                      border: '1px solid rgba(255, 165, 0, 0.5)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      color: '#ffa500'
                    }}>
                      <AlertCircle size={16} />
                      <span>
                        <strong>{t('analysisBasedOnPartialData')} ({analysisConfidence}% {t('completeness')})</strong>
                        {missingSections.length > 0 && (
                          <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', opacity: 0.9 }}>
                            {t('missingData')}: {missingSections.join(', ')}. {t('loadMorePhotos')}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  
                  {/* Riassunto */}
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#fff',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {analysisSummary}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleConfirmSave}
                disabled={saving}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background: saving
                    ? 'rgba(156, 163, 175, 0.2)'
                    : 'rgba(34, 197, 94, 0.2)',
                  border: `1px solid ${saving ? 'rgba(156, 163, 175, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  color: saving ? '#d1d5db' : '#86efac',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {t('confirmSave')}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSummary(false)}
                disabled={saving}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background: 'rgba(156, 163, 175, 0.2)',
                  border: '1px solid rgba(156, 163, 175, 0.5)',
                  borderRadius: '8px',
                  padding: '12px',
                  color: '#d1d5db',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 600
                }}
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
