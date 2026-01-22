'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import HeroPointsBalance from '@/components/HeroPointsBalance'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, Info, X, Image as ImageIcon, Sparkles, FileImage, TrendingUp, Camera } from 'lucide-react'

const PHOTO_TYPES = [
  { key: 'formation_image', label: 'Formazione in Campo', icon: '⚽', description: 'Screenshot formazione giocata', knowledgeBonus: 3 },
  { key: 'ratings_image', label: 'Pagelle Giocatori', icon: '📊', description: 'Screenshot voti giocatori', knowledgeBonus: 5 },
  { key: 'team_stats_image', label: 'Statistiche Squadra', icon: '📈', description: 'Screenshot statistiche squadra', knowledgeBonus: 5 },
  { key: 'attack_areas_image', label: 'Aree di Attacco', icon: '🎯', description: 'Screenshot aree attacco', knowledgeBonus: 3 },
  { key: 'recovery_zones_image', label: 'Zone Recupero Palla', icon: '🔄', description: 'Screenshot zone recupero', knowledgeBonus: 3 },
  { key: 'goals_chart_image', label: 'Grafico Rete/Gol', icon: '⚡', description: 'Screenshot grafico gol', knowledgeBonus: 2 }
]

export default function NewMatchPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)
  const [photos, setPhotos] = React.useState({})
  const [uploading, setUploading] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [mounted, setMounted] = React.useState(false)

  // Verifica autenticazione (solo client-side)
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
      }
    }
    checkAuth()
  }, [router])

  const handlePhotoUpload = (photoType, file) => {
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotos(prev => ({
        ...prev,
        [photoType]: reader.result
      }))
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = (photoType) => {
    setPhotos(prev => {
      const newPhotos = { ...prev }
      delete newPhotos[photoType]
      return newPhotos
    })
  }

  const calculateKnowledgeBonus = () => {
    return Object.keys(photos).reduce((sum, key) => {
      const photoType = PHOTO_TYPES.find(p => p.key === key)
      return sum + (photoType?.knowledgeBonus || 0)
    }, 0)
  }

  const getMissingPhotosMessages = () => {
    const uploaded = Object.keys(photos)
    const missing = PHOTO_TYPES.filter(p => !uploaded.includes(p.key))
    
    if (missing.length === 0) {
      return { message: '🎉 Perfetto! Hai caricato tutte le foto. La IA avrà la massima conoscenza!', type: 'success' }
    }
    
    if (uploaded.length === 0) {
      return { 
        message: '💡 Va bene così! Se vuoi, puoi caricare più foto per aumentare la conoscenza della IA. Più la IA sa, più ti aiuta! Ogni foto conta 😊', 
        type: 'info' 
      }
    }

    const messages = missing.map(p => {
      return `📸 ${p.icon} ${p.label}: ${p.description} (+${p.knowledgeBonus}% conoscenza)`
    })

    return {
      message: `💡 Vuoi caricare anche queste foto? Più la IA sa, più ti aiuta!\n\n${messages.join('\n')}`,
      type: 'info'
    }
  }

  const handleSubmit = async () => {
    setUploading(true)
    setError(null)
    setSuccess(null)
    setResult(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      // Verifica che almeno una foto sia caricata
      if (Object.keys(photos).length === 0) {
        throw new Error('Carica almeno una foto per analizzare la partita')
      }

      // 1. Estrai dati dalle foto
      const extractRes = await fetch('/api/extract-match-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photos)
      })

      if (!extractRes.ok) {
        const extractData = await extractRes.json()
        throw new Error(extractData.error || 'Errore estrazione dati partita')
      }

      const extractResult = await extractRes.json()

      // 2. Prepara dati per salvataggio (aggiungi campi opzionali)
      const matchDataToSave = {
        ...extractResult.match_data,
        match_date: new Date().toISOString(),
        opponent_name: null,
        opponent_formation_id: null,
        playing_style_played: null,
        team_strength: null,
        result: null,
        is_home: true,
        ai_summary: null,
        ai_insights: [],
        ai_recommendations: [],
        credits_used: extractResult.credits_used || 0
      }

      // 3. Salva match in database
      const saveRes = await fetch('/api/supabase/save-match', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(matchDataToSave)
      })

      if (!saveRes.ok) {
        const saveData = await saveRes.json()
        throw new Error(saveData.error || 'Errore salvataggio partita')
      }

      const saveResult = await saveRes.json()

      setResult({
        match_id: saveResult.match_id,
        credits_used: extractResult.credits_used || 0,
        photos_processed: extractResult.photos_processed || Object.keys(photos).length,
        photos_missing: extractResult.photos_missing || [],
        data_completeness: extractResult.data_completeness || 'partial',
        analysis_status: saveResult.analysis_status || 'pending'
      })

      setSuccess('Partita salvata con successo!')
      
      // Reset form dopo 3 secondi
      setTimeout(() => {
        setPhotos({})
        setResult(null)
        setSuccess(null)
      }, 5000)

    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio della partita')
      setTimeout(() => setError(null), 5000)
    } finally {
      setUploading(false)
    }
  }

  // Memoizza calcoli per evitare errori React durante rendering
  const missingInfo = React.useMemo(() => getMissingPhotosMessages(), [photos])
  const knowledgeBonus = React.useMemo(() => calculateKnowledgeBonus(), [photos])

  // Evita hydration mismatch
  if (!mounted) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>Caricamento...</div>
      </main>
    )
  }

  return (
    <main style={{ 
      padding: '16px', 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '24px',
        position: 'sticky',
        top: 0,
        backgroundColor: '#0a0a0a',
        padding: '16px 0',
        zIndex: 10
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <Camera size={24} color="var(--neon-blue)" />
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Nuova Partita</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HeroPointsBalance />
          <LanguageSwitch />
        </div>
      </div>

      {/* Info Banner - Pay-Per-Use */}
      <div className="card" style={{ 
        marginBottom: '24px',
        padding: '20px',
        background: 'rgba(0, 212, 255, 0.05)',
        border: '2px solid var(--neon-blue)'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
          <Info size={20} color="var(--neon-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--neon-blue)' }}>
              💡 Pay-Per-Use
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.6' }}>
              Credits spesi solo per foto effettivamente processate. 
              Nessuna foto è obbligatoria - il sistema funziona anche con dati parziali. 
              <strong style={{ color: 'var(--neon-blue)' }}> Più la IA sa, più ti aiuta!</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Bar */}
      {knowledgeBonus > 0 && (
        <div className="card" style={{ 
          marginBottom: '24px',
          padding: '20px',
          background: 'rgba(168, 85, 247, 0.05)',
          border: '2px solid var(--neon-purple)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Sparkles size={20} color="var(--neon-purple)" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--neon-purple)' }}>
              Conoscenza IA
            </h2>
          </div>
          <div style={{
            width: '100%',
            height: '24px',
            backgroundColor: '#2a2a2a',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '8px',
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.min(knowledgeBonus, 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--neon-purple), #A855F7)',
              transition: 'width 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#000'
            }}>
              {knowledgeBonus > 10 && `${knowledgeBonus}%`}
            </div>
          </div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>
            Bonus conoscenza: +{knowledgeBonus}% ({Object.keys(photos).length} foto caricate)
          </div>
        </div>
      )}

      {/* Missing Photos Info */}
      {missingInfo && (
        <div className="card" style={{ 
          marginBottom: '24px',
          padding: '20px',
          background: missingInfo.type === 'success' 
            ? 'rgba(0, 255, 136, 0.05)' 
            : 'rgba(255, 170, 0, 0.05)',
          border: `2px solid ${missingInfo.type === 'success' ? '#00ff88' : '#ffaa00'}`
        }}>
          <div style={{ fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-line' }}>
            {missingInfo.message}
          </div>
        </div>
      )}

      {/* Photo Upload Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {PHOTO_TYPES.map(photoType => {
          const hasPhoto = !!photos[photoType.key]
          return (
            <div
              key={photoType.key}
              className="card"
              style={{
                padding: '20px',
                cursor: hasPhoto ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                border: hasPhoto 
                  ? '2px solid #00ff88' 
                  : '2px solid #2a2a2a',
                background: hasPhoto
                  ? 'rgba(0, 255, 136, 0.05)'
                  : 'rgba(26, 26, 26, 0.8)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!hasPhoto) {
                  e.currentTarget.style.borderColor = 'var(--neon-blue)'
                  e.currentTarget.style.boxShadow = 'var(--glow-blue)'
                }
              }}
              onMouseLeave={(e) => {
                if (!hasPhoto) {
                  e.currentTarget.style.borderColor = '#2a2a2a'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              {/* Header Card */}
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '24px' }}>{photoType.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                      {photoType.label}
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
                      {photoType.description}
                    </p>
                  </div>
                </div>
                {hasPhoto && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removePhoto(photoType.key)
                    }}
                    style={{
                      background: 'rgba(255, 68, 68, 0.1)',
                      border: '1px solid #ff4444',
                      borderRadius: '6px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#ff4444'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Content */}
              {hasPhoto ? (
                <div style={{
                  padding: '12px',
                  background: 'rgba(0, 255, 136, 0.1)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} color="#00ff88" />
                  <span style={{ fontSize: '13px', color: '#00ff88' }}>
                    Foto caricata (+{photoType.knowledgeBonus}%)
                  </span>
                </div>
              ) : (
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePhotoUpload(photoType.key, file)
                    }}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    padding: '16px',
                    background: 'rgba(0, 212, 255, 0.05)',
                    border: '2px dashed var(--neon-blue)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <Upload size={24} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '14px', color: 'var(--neon-blue)', fontWeight: 500 }}>
                      Carica foto
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                      +{photoType.knowledgeBonus}% conoscenza
                    </div>
                  </div>
                </label>
              )}
            </div>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="card" style={{ 
          marginBottom: '24px',
          padding: '20px',
          background: 'rgba(255, 68, 68, 0.1)',
          border: '2px solid #ff4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <AlertCircle size={20} color="#ff4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '14px', color: '#ff4444' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="card" style={{ 
          marginBottom: '24px',
          padding: '20px',
          background: 'rgba(0, 255, 136, 0.1)',
          border: '2px solid #00ff88'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
            <CheckCircle2 size={20} color="#00ff88" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#00ff88' }}>
                {success}
              </div>
              {result && (
                <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.8' }}>
                  <div>Match ID: {result.match_id}</div>
                  <div>Foto processate: {result.photos_processed}</div>
                  <div>Credits usati: {result.credits_used}</div>
                  <div>Completezza dati: {result.data_completeness}</div>
                  <div>Stato analisi: {result.analysis_status}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: '12px',
        marginTop: '32px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => router.push('/')}
          className="btn"
          style={{ 
            padding: '12px 24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          disabled={uploading || Object.keys(photos).length === 0}
          className="btn primary"
          style={{ 
            padding: '12px 24px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            opacity: (uploading || Object.keys(photos).length === 0) ? 0.5 : 1,
            cursor: (uploading || Object.keys(photos).length === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? (
            <>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Elaborazione...</span>
            </>
          ) : (
            <>
              <Upload size={16} />
              <span>Salva Partita</span>
            </>
          )}
        </button>
      </div>
    </main>
  )
}
