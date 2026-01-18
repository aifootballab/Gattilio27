'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Upload, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function UploadPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [images, setImages] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)

  React.useEffect(() => {
    // Verifica sessione
    const checkSession = async () => {
      if (!supabase) {
        router.push('/login')
        return
      }

      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        router.push('/login')
      }
    }

    checkSession()
  }, [router])

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      setError('Seleziona almeno un\'immagine')
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
  }

  const handleSavePlayer = async (playerData) => {
    if (!supabase) {
      setError('Supabase non disponibile')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        setError('Sessione non valida. Effettua nuovamente il login.')
        router.push('/login')
        return
      }

      const token = session.session.access_token

      const res = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player: playerData })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Errore salvataggio giocatore')
      }

      setSuccess(`Giocatore ${playerData.player_name} salvato con successo!`)
      setImages([])
    } catch (err) {
      console.error('[Upload] Save error:', err)
      setError(err?.message || 'Errore salvataggio giocatore')
    } finally {
      setLoading(false)
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
        <button
          onClick={handleLogout}
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <LogOut size={16} />
          {t('logout')}
        </button>
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
          <div style={{ fontSize: '12px', opacity: 0.7 }}>Formati supportati: JPG, PNG</div>
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
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Nota:</strong> Questa pagina è per caricare immagini. 
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            L'estrazione dati e salvataggio automatico verranno implementati successivamente.
          </div>
        </div>
      </div>
    </main>
  )
}
