'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Upload, LogOut, AlertCircle, CheckCircle, CheckCircle2, Users } from 'lucide-react'

export default function UploadPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [images, setImages] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)
  const [processing, setProcessing] = React.useState(null) // "1/3", "2/3", etc.

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

    // ✅ LIMITE 3 IMMAGINI
    if (imageFiles.length > 3) {
      setError('Puoi caricare massimo 3 immagini')
      return
    }

    if (images.length + imageFiles.length > 3) {
      setError(`Puoi caricare massimo 3 immagini. Hai già ${images.length} immagini.`)
      return
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
      setError('Carica almeno un\'immagine')
      return
    }

    if (images.length > 3) {
      setError('Massimo 3 immagini consentite')
      return
    }

    if (!supabase) {
      setError('Supabase non disponibile')
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
        // Errore sessione (refresh token scaduto/invalido)
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

      // Analizza e salva ogni immagine
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
            throw new Error(extractData.error || 'Errore estrazione dati')
          }

          if (!extractData.player || !extractData.player.player_name) {
            throw new Error(`Immagine ${i + 1}: Impossibile estrarre dati giocatore`)
          }

          setProcessing(`Salvando giocatore ${i + 1}/${images.length}: ${extractData.player.player_name}...`)

          // 2. Salva giocatore
          const saveRes = await fetch('/api/supabase/save-player', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ player: extractData.player })
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
        setSuccess(`✅ ${savedCount} giocatore/i salvato/i con successo!`)
        if (errors.length > 0) {
          setError(`Attenzione: ${errors.join('; ')}`)
        } else {
          setImages([])
        }
      } else {
        setError(`Errore: ${errors.join('; ') || 'Nessun giocatore salvato'}`)
      }
    } catch (err) {
      console.error('[Upload] Validate error:', err)
      setError(err?.message || 'Errore durante analisi e salvataggio')
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
    <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 className="neon-text" style={{ fontSize: '32px', fontWeight: 700 }}>
          Carica Giocatori
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

      {/* Upload Area */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Carica Screenshot Giocatore</h2>
        
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
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={loading}
          />
          <Upload size={32} style={{ marginBottom: '12px', color: 'var(--neon-blue)' }} />
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>Clicca o trascina immagini qui</div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>Formati supportati: JPG, PNG | Massimo 3 immagini</div>
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
        {images.length > 0 && images.length <= 3 && (
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
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <CheckCircle size={20} />
              {loading ? 'Elaborazione...' : 'Convalida Caricamento'}
            </button>
          </div>
        )}

        {images.length === 0 && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
              <strong>Istruzioni:</strong>
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Carica 1-3 screenshot di giocatori eFootball. Clicca "Convalida caricamento" per analizzare e salvare automaticamente.
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
