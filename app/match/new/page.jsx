'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import HeroPointsBalance from '@/components/HeroPointsBalance'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, SkipForward, Save, Camera } from 'lucide-react'

// STEPS sarà definito dentro il componente per avere accesso a t()

const STORAGE_KEY = 'match_wizard_progress'

export default function NewMatchPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [stepData, setStepData] = React.useState({}) // { section: { data, image } }
  const [stepImages, setStepImages] = React.useState({}) // { section: dataUrl }
  const [extracting, setExtracting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

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
  }, [])

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
        throw new Error('Sessione scaduta. Reindirizzamento al login...')
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
        throw new Error(extractData.error || 'Errore estrazione dati')
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
      setError(err.message || 'Errore estrazione dati')
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

  const handleSave = async () => {
    // Verifica che almeno una sezione abbia dati
    const hasData = Object.values(stepData).some(data => data !== null && data !== undefined)
    if (!hasData) {
      setError('Carica almeno una sezione prima di salvare')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // Estrai risultato se presente (può essere in stepData.result o in team_stats)
      let matchResult = stepData.result || null
      if (!matchResult && stepData.team_stats && stepData.team_stats.result) {
        matchResult = stepData.team_stats.result
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
        throw new Error(saveData.error || 'Errore salvataggio partita')
      }

      setSuccess(true)
      clearProgress()

      // Redirect dopo 2 secondi
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      console.error('[NewMatch] Save error:', err)
      setError(err.message || 'Errore salvataggio partita')
    } finally {
      setSaving(false)
    }
  }

  const currentStepInfo = STEPS[currentStep]
  const currentSection = currentStepInfo?.id
  const currentImage = stepImages[currentSection]
  const currentData = stepData[currentSection]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  if (!mounted) {
    return null
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#fff',
      padding: '20px',
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {t('addMatch')}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HeroPointsBalance />
          <LanguageSwitch />
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        height: '8px',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(90deg, #00d4ff 0%, #ff6b00 100%)',
          height: '100%',
          width: `${progress}%`,
          transition: 'width 0.3s ease'
        }} />
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
          <span>Partita salvata con successo! Reindirizzamento...</span>
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
            {currentStep === 0 && 'Carica uno screenshot delle pagelle dei giocatori (ratings).'}
            {currentStep === 1 && 'Carica uno screenshot delle statistiche di squadra (possesso, tiri, passaggi, ecc.).'}
            {currentStep === 2 && 'Carica uno screenshot delle aree di attacco (percentuali per zona).'}
            {currentStep === 3 && 'Carica uno screenshot delle aree di recupero palla (punti verdi sul campo).'}
            {currentStep === 4 && 'Carica uno screenshot della formazione e stile di gioco (schema, stile, forza squadra).'}
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
              <span>{currentImage ? 'Cambia Immagine' : 'Carica Immagine'}</span>
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
                    Estrazione...
                  </>
                ) : currentData ? (
                  <>
                    <CheckCircle2 size={18} />
                    Estratto
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
              <strong>✓ Dati estratti con successo</strong>
            </div>
          )}
        </div>
      )}

      {/* Save Button (solo all'ultimo step o se tutti gli step sono completati/saltati) */}
      {(currentStep === STEPS.length - 1 || Object.keys(stepData).length === STEPS.length) && (
        <button
          onClick={handleSave}
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
              Salvataggio...
            </>
          ) : (
            <>
              <Save size={20} />
              {t('saveMatch')}
            </>
          )}
        </button>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
