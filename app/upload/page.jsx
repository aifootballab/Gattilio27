'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Upload, LogOut, AlertCircle, CheckCircle, CheckCircle2, Users, Info, HelpCircle } from 'lucide-react'

export default function UploadPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [images, setImages] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)
  const [processing, setProcessing] = React.useState(null) // "1/3", "2/3", etc.
  const [uploadType, setUploadType] = React.useState('card') // 'card' or 'formation'

  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    // Verifica sessione iniziale
    const checkSession = async () => {
      const { data: session, error } = await supabase.auth.getSession()
      
      if (error) {
        // Errore sessione (es. refresh token invalido) - redirect automatico
        console.warn('[Upload] Session error, redirecting to login:', error.message)
        router.push('/login')
        return
      }

      if (!session?.session) {
        router.push('/login')
      }
    }

    checkSession()

    // Listener per cambiamenti auth (gestisce refresh token scaduti)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          // Sessione scaduta o refresh fallito - redirect automatico
          router.push('/login')
        }
      }
    )

    // Cleanup listener
    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      setError('Seleziona almeno un\'immagine')
      return
    }

    // Per formazione: solo 1 immagine
    if (uploadType === 'formation') {
      if (imageFiles.length > 1) {
        setError(t('formationOneImageOnly'))
        return
      }
      if (images.length >= 1) {
        setError(t('formationAlreadyUploaded'))
        return
      }
    } else {
      // ✅ LIMITE 3 IMMAGINI per card
      if (imageFiles.length > 3) {
        setError(t('maxThreeImages'))
        return
      }

      if (images.length + imageFiles.length > 3) {
        setError(t('maxThreeImagesAlready') + ` ${images.length} ${t('images')}.`)
        return
      }
    }

    // Converti in base64
    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => [...prev, {
          file,
          dataUrl: e.target.result,
          name: file.name
        }])
      }
      reader.readAsDataURL(file)
    })
    
    setError(null)
  }

  const handleValidateAndSave = async () => {
    if (images.length === 0) {
      setError(t(uploadType === 'formation' ? 'uploadFormationPhoto' : 'uploadPlayerCard'))
      return
    }

    if (uploadType === 'formation' && images.length !== 1) {
      setError(t('formationOneImageRequired'))
      return
    }

    if (uploadType === 'card' && images.length > 3) {
      setError(t('maxThreeImages'))
      return
    }

    if (!supabase) {
      setError(t('supabaseNotAvailable'))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setProcessing(null)

    try {
      // Ottieni token con gestione errori enterprise
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError('Sessione scaduta. Reindirizzamento al login...')
        setTimeout(() => router.push('/login'), 1000)
        return
      }

      if (!session?.session?.access_token) {
        setError('Sessione non valida. Effettua nuovamente il login.')
        setTimeout(() => router.push('/login'), 1000)
        return
      }

      const token = session.session.access_token
      let savedCount = 0
      let errors = []

      if (uploadType === 'formation') {
        // ESTRAZIONE FORMAZIONE (solo layout, non giocatori)
        const img = images[0]
        setProcessing(t('extractingFormation'))

        try {
          // 1. Estrai formazione (layout + opzionalmente giocatori per preview)
          const extractRes = await fetch('/api/extract-formation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: img.dataUrl })
          })

          const extractData = await extractRes.json()
          if (!extractRes.ok) {
            throw new Error(extractData.error || 'Errore estrazione formazione')
          }

          if (!extractData.formation || !extractData.slot_positions) {
            throw new Error(t('formationExtractionFailed'))
          }

          // Valida che ci siano 11 slot
          const slotKeys = Object.keys(extractData.slot_positions || {}).map(Number).filter(n => n >= 0 && n <= 10)
          if (slotKeys.length !== 11) {
            throw new Error('Formazione incompleta: devono esserci 11 slot (0-10)')
          }

          setProcessing(t('savingFormation'))

          // 2. Salva layout formazione (cancella vecchi titolari e salva nuovo layout)
          const layoutRes = await fetch('/api/supabase/save-formation-layout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              formation: extractData.formation,
              slot_positions: extractData.slot_positions
            })
          })

          const layoutData = await layoutRes.json()
          if (!layoutRes.ok) {
            throw new Error(layoutData.error || 'Errore salvataggio layout')
          }

          setSuccess(t('formationLayoutSaved'))
          setImages([])
          
          // Redirect a gestione-formazione per assegnare giocatori
          setTimeout(() => router.push('/gestione-formazione'), 1500)

        } catch (formErr) {
          console.error('[Upload] Formation error:', formErr)
          setError(formErr?.message || t('formationExtractionError'))
        }
      } else {
        // ESTRAZIONE CARD SINGOLE (1-3 foto, riserve)
        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          setProcessing(`Analizzando immagine ${i + 1}/${images.length}...`)

          try {
            // 1. Estrai dati da immagine
            const extractRes = await fetch('/api/extract-player', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageDataUrl: img.dataUrl })
            })

            const extractData = await extractRes.json()
            if (!extractRes.ok) {
              throw new Error(extractData.error || t('extractionError'))
            }

            if (!extractData.player || !extractData.player.player_name) {
              throw new Error(`Immagine ${i + 1}: Impossibile estrarre dati giocatore`)
            }

            setProcessing(`${t('savingPlayer')} ${i + 1}/${images.length}: ${extractData.player.player_name}...`)

            // 2. Salva giocatore come RISERVA (slot_index: null)
            const saveRes = await fetch('/api/supabase/save-player', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                player: {
                  ...extractData.player,
                  slot_index: null // Riserva
                }
              })
            })

            const saveData = await saveRes.json()
            if (!saveRes.ok) {
              throw new Error(saveData.error || 'Errore salvataggio giocatore')
            }

            savedCount++
          } catch (imgErr) {
            console.error(`[Upload] Error processing image ${i + 1}:`, imgErr)
            errors.push(`Immagine ${i + 1}: ${imgErr.message}`)
          }
        }

        // Risultato finale
        if (savedCount > 0) {
          setSuccess(`✅ ${savedCount} giocatore/i salvato/i come riserve!`)
          if (errors.length > 0) {
            setError(`Attenzione: ${errors.join('; ')}`)
          } else {
            setImages([])
          }
        } else {
          setError(`Errore: ${errors.join('; ') || 'Nessun giocatore salvato'}`)
        }
      }
    } catch (err) {
      console.error('[Upload] Validate error:', err)
      setError(err?.message || t('uploadError'))
    } finally {
      setLoading(false)
      setProcessing(null)
    }
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  return (
    <main style={{ padding: '32px 16px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        gap: '12px'
      }}>
        <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700 }}>
          {t('uploadScreenshots')}
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/lista-giocatori')}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={16} />
            {t('myPlayers')}
          </button>
          <button
            onClick={handleLogout}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div style={{
          marginBottom: '24px',
          padding: '12px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#22c55e'
        }}>
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Upload Type Selector */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>{t('selectUploadType')}</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setUploadType('formation')
              setImages([])
              setError(null)
            }}
            className="btn"
            style={{
              ...(uploadType === 'formation' ? {
                background: 'rgba(0, 212, 255, 0.2)',
                borderColor: 'var(--neon-blue)',
                boxShadow: 'var(--glow-blue)'
              } : {})
            }}
          >
            {t('uploadFormation')}
          </button>
          <button
            onClick={() => {
              setUploadType('card')
              setImages([])
              setError(null)
            }}
            className="btn"
            style={{
              ...(uploadType === 'card' ? {
                background: 'rgba(0, 212, 255, 0.2)',
                borderColor: 'var(--neon-blue)',
                boxShadow: 'var(--glow-blue)'
              } : {})
            }}
          >
            {t('uploadPlayerCard')}
          </button>
        </div>

        {/* Guide Box */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(0, 212, 255, 0.08)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Info size={18} color="var(--neon-blue)" />
            <strong style={{ fontSize: '14px', color: 'var(--neon-blue)' }}>
              {uploadType === 'formation' ? t('guideFormationTitle') : t('guideCardTitle')}
            </strong>
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.9 }}>
            {uploadType === 'formation' ? (
              <>
                <div style={{ marginBottom: '6px' }}>{t('guideFormationStep1')}</div>
                <div style={{ marginBottom: '6px' }}>{t('guideFormationStep2')}</div>
                <div style={{ marginBottom: '6px' }}>{t('guideFormationStep3')}</div>
                <div style={{ marginBottom: '8px' }}>{t('guideFormationStep4')}</div>
                <div style={{ fontSize: '12px', opacity: 0.8, fontStyle: 'italic' }}>
                  {t('guideFormationNote')}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '6px' }}>{t('guideCardStep1')}</div>
                <div style={{ marginBottom: '6px' }}>{t('guideCardStep2')}</div>
                <div style={{ marginBottom: '6px' }}>{t('guideCardStep3')}</div>
                <div style={{ marginBottom: '8px' }}>{t('guideCardStep4')}</div>
                <div style={{ fontSize: '12px', opacity: 0.8, fontStyle: 'italic' }}>
                  {t('guideCardNote')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>
          {uploadType === 'formation' ? t('uploadFormationPhoto') : t('uploadPlayerCard')}
        </h2>
        
        <label style={{
          display: 'block',
          padding: '24px',
          border: '2px dashed rgba(255,255,255,0.22)',
          borderRadius: '12px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.04)'
        }}>
            <input
            type="file"
            accept="image/*"
            multiple={uploadType === 'card'}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={loading}
          />
          <Upload size={32} style={{ marginBottom: '12px', color: 'var(--neon-blue)' }} />
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>{t('clickOrDragImage')}</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            {uploadType === 'formation' 
              ? t('formationImageFormat')
              : t('cardImageFormat')
            }
          </div>
        </label>

        {/* Preview Images */}
        {images.length > 0 && (
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {idx + 1}/{images.length}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Processing Status */}
        {processing && (
          <div style={{
            marginTop: '24px',
            padding: '12px',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--neon-blue)',
            fontSize: '14px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(0, 212, 255, 0.3)',
              borderTopColor: 'var(--neon-blue)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite'
            }} />
            {processing}
          </div>
        )}

        {/* Convalida Button */}
        {images.length > 0 && ((uploadType === 'formation' && images.length === 1) || (uploadType === 'card' && images.length <= 3)) && (
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleValidateAndSave}
              disabled={loading}
              className="btn primary"
              style={{
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                maxWidth: '400px'
              }}
            >
              <CheckCircle size={20} />
              {loading 
                ? (uploadType === 'formation' ? t('extractingFormation') : t('processingImage'))
                : (uploadType === 'formation' ? t('extractFormation') : t('extractData'))
              }
            </button>
          </div>
        )}

        {images.length === 0 && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <HelpCircle size={18} color="var(--neon-blue)" />
              <strong style={{ fontSize: '14px' }}>{t('instructions')}</strong>
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.9 }}>
              {uploadType === 'formation' ? (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>{t('whatIsFormation')}</strong>
                  </div>
                  <div style={{ marginBottom: '12px', opacity: 0.85 }}>
                    {t('whatIsFormationDesc')}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>{t('whatIsCard')}</strong>
                  </div>
                  <div style={{ marginBottom: '12px', opacity: 0.85 }}>
                    {t('whatIsCardDesc')}
                  </div>
                </>
              )}
              <div style={{ fontSize: '12px', opacity: 0.8, fontStyle: 'italic', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0, 212, 255, 0.2)' }}>
                {t('uploadInstructions')}
              </div>
            </div>
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
