'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, X, Trash2, Star, User, Info } from 'lucide-react'

export default function AllenatoriPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [coaches, setCoaches] = React.useState([])
  const [activeCoach, setActiveCoach] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [showUploadModal, setShowUploadModal] = React.useState(false)
  const [uploadImage, setUploadImage] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [selectedCoach, setSelectedCoach] = React.useState(null)
  const [showDetailsModal, setShowDetailsModal] = React.useState(false)

  // Carica allenatori
  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    const fetchCoaches = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.session) {
          router.push('/login')
          return
        }

        const { data: coachesData, error: coachesError } = await supabase
          .from('coaches')
          .select('*')
          .order('is_active', { ascending: false })
          .order('created_at', { ascending: false })

        if (coachesError) {
          throw new Error(coachesError.message || 'Errore caricamento allenatori')
        }

        setCoaches(coachesData || [])
        const active = (coachesData || []).find(c => c.is_active)
        setActiveCoach(active || null)
      } catch (err) {
        console.error('[Allenatori] Fetch error:', err)
        setError(err.message || 'Errore caricamento dati')
      } finally {
        setLoading(false)
      }
    }

    fetchCoaches()
  }, [router])

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Seleziona un file immagine')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadImage({
        file,
        dataUrl: e.target.result
      })
    }
    reader.readAsDataURL(file)
  }

  const handleUploadCoach = async () => {
    if (!uploadImage) return

    setUploading(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // Estrai dati dall'immagine
      const extractRes = await fetch('/api/extract-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: uploadImage.dataUrl })
      })

      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        const errorMsg = extractData.error || 'Errore estrazione dati'
        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
          throw new Error('Quota OpenAI esaurita. Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing')
        }
        throw new Error(errorMsg)
      }

      if (!extractData.coach || !extractData.coach.coach_name) {
        throw new Error('Errore: dati allenatore non estratti. Verifica l\'immagine e riprova.')
      }

      // Salva allenatore
      const coachData = {
        ...extractData.coach,
        photo_slots: { main: true }
      }

      const saveRes = await fetch('/api/supabase/save-coach', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coach: coachData })
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Errore salvataggio allenatore')
      }

      // Ricarica lista
      window.location.reload()
    } catch (err) {
      console.error('[Allenatori] Upload error:', err)
      setError(err.message || 'Errore caricamento allenatore')
    } finally {
      setUploading(false)
    }
  }

  const handleSetActive = async (coachId) => {
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      const res = await fetch('/api/supabase/set-active-coach', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coach_id: coachId })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore impostazione allenatore attivo')
      }

      // Ricarica lista
      window.location.reload()
    } catch (err) {
      console.error('[Allenatori] Set active error:', err)
      setError(err.message || 'Errore impostazione allenatore attivo')
    }
  }

  const handleDelete = async (coachId) => {
    if (!confirm(t('confirmDeleteCoach'))) return

    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('coaches')
        .delete()
        .eq('id', coachId)

      if (deleteError) {
        throw new Error(deleteError.message || 'Errore eliminazione allenatore')
      }

      // Ricarica lista
      window.location.reload()
    } catch (err) {
      console.error('[Allenatori] Delete error:', err)
      setError(err.message || 'Errore eliminazione allenatore')
    }
  }

  const showCoachDetails = (coach) => {
    setSelectedCoach(coach)
    setShowDetailsModal(true)
  }

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(16px, 3vw, 32px)', background: 'var(--bg-dark)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => router.push('/')}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} />
            {t('dashboard')}
          </button>
          <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
            {t('coachesTitle')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <LanguageSwitch />
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              {t('uploadCoach')}
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

        {/* Loading */}
        {loading && (
          <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
            <div className="neon-text">{t('loading')}</div>
          </div>
        )}

        {/* Lista Allenatori */}
        {!loading && (
          <>
            {coaches.length === 0 ? (
              <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                <Info size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--neon-blue)' }} />
                <div style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600 }}>
                  {t('noCoachesLoaded')}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
                  {t('uploadCoachDescription')}
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Upload size={16} />
                  {t('uploadFirstCoach')}
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '24px'
              }}>
                {coaches.map((coach) => (
                  <div
                    key={coach.id}
                    className="card"
                    style={{
                      padding: '20px',
                      border: coach.is_active ? '2px solid var(--neon-blue)' : '2px solid rgba(0, 212, 255, 0.3)',
                      position: 'relative'
                    }}
                  >
                    {coach.is_active && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'var(--neon-blue)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Star size={18} fill="white" color="white" />
                      </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, marginBottom: '8px' }}>
                        {coach.coach_name}
                      </h3>
                      {coach.team && (
                        <div style={{ fontSize: '14px', opacity: 0.8 }}>
                          {coach.team}
                        </div>
                      )}
                    </div>

                    {coach.playing_style_competence && typeof coach.playing_style_competence === 'object' && (
                      <div style={{ marginBottom: '12px', fontSize: '12px', opacity: 0.7 }}>
                        {Object.entries(coach.playing_style_competence).slice(0, 2).map(([style, value]) => (
                          <div key={style} style={{ marginBottom: '4px' }}>
                            {style.replace(/_/g, ' ')}: {value}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => showCoachDetails(coach)}
                        className="btn"
                        style={{ fontSize: '12px', padding: '6px 12px', flex: 1 }}
                      >
                        <Info size={14} style={{ marginRight: '4px' }} />
                        {t('details')}
                      </button>
                      {!coach.is_active && (
                        <button
                          onClick={() => handleSetActive(coach.id)}
                          className="btn"
                          style={{ fontSize: '12px', padding: '6px 12px', flex: 1 }}
                        >
                          <Star size={14} style={{ marginRight: '4px' }} />
                          {t('setAsTitular')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(coach.id)}
                        className="btn"
                        style={{ 
                          fontSize: '12px', 
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          color: 'rgba(239, 68, 68, 1)'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info allenatore attivo */}
            {activeCoach && (
              <div className="card" style={{ 
                padding: '16px', 
                background: 'rgba(0, 212, 255, 0.05)',
                border: '2px solid var(--neon-blue)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Star size={18} fill="var(--neon-blue)" color="var(--neon-blue)" />
                  <strong>{t('activeCoach')}:</strong> {activeCoach.coach_name}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {t('activeCoachInfo')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Upload */}
      {showUploadModal && (
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
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => {
                setShowUploadModal(false)
                setUploadImage(null)
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontSize: '24px'
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>{t('uploadCoach')}</h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                {t('selectCoachScreenshot')}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 212, 255, 0.05)',
                  border: '2px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
            </div>

            {uploadImage && (
              <div style={{ marginBottom: '20px' }}>
                <img
                  src={uploadImage.dataUrl}
                  alt="Preview"
                  style={{ width: '100%', borderRadius: '8px', border: '2px solid rgba(0, 212, 255, 0.3)' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadImage(null)
                }}
                className="btn"
                disabled={uploading}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUploadCoach}
                className="btn primary"
                disabled={!uploadImage || uploading}
              >
                {uploading ? t('loading') : t('upload')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dettagli */}
      {showDetailsModal && selectedCoach && (
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
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => {
                setShowDetailsModal(false)
                setSelectedCoach(null)
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontSize: '24px'
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>{selectedCoach.coach_name}</h2>

            {/* Dati base */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('informations')}</h3>
              <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                {selectedCoach.age && <div>{t('age')}: {selectedCoach.age}</div>}
                {selectedCoach.nationality && <div>{t('nationality')}: {selectedCoach.nationality}</div>}
                {selectedCoach.team && <div>{t('team')}: {selectedCoach.team}</div>}
                {selectedCoach.category && <div>{t('category')}: {selectedCoach.category}</div>}
                {selectedCoach.pack_type && <div>{t('type')}: {selectedCoach.pack_type}</div>}
              </div>
            </div>

            {/* Competenza Stili di Gioco */}
            {selectedCoach.playing_style_competence && typeof selectedCoach.playing_style_competence === 'object' && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('playingStyleCompetence')}</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  {Object.entries(selectedCoach.playing_style_competence).map(([style, value]) => (
                    <div key={style} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{style.replace(/_/g, ' ')}:</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affinità di allenamento */}
            {selectedCoach.training_affinity_description && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('trainingAffinity')}</h3>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  {selectedCoach.training_affinity_description}
                </div>
              </div>
            )}

            {/* Stat Boosters */}
            {Array.isArray(selectedCoach.stat_boosters) && selectedCoach.stat_boosters.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('statBoosters')}</h3>
                <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
                  {selectedCoach.stat_boosters.map((booster, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{booster.stat_name}:</span>
                      <strong>+{booster.bonus}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collegamento */}
            {selectedCoach.connection && typeof selectedCoach.connection === 'object' && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>{t('connection')}</h3>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>{selectedCoach.connection.name}</strong>
                  </div>
                  {selectedCoach.connection.description && (
                    <div style={{ marginBottom: '12px', opacity: 0.8 }}>
                      {selectedCoach.connection.description}
                    </div>
                  )}
                  {selectedCoach.connection.focal_point && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>{t('focalPoint')}:</strong> {selectedCoach.connection.focal_point.playing_style} ({selectedCoach.connection.focal_point.position})
                    </div>
                  )}
                  {selectedCoach.connection.key_man && (
                    <div>
                      <strong>{t('keyMan')}:</strong> {selectedCoach.connection.key_man.playing_style} ({selectedCoach.connection.key_man.position})
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              {!selectedCoach.is_active && (
                <button
                  onClick={() => {
                    handleSetActive(selectedCoach.id)
                    setShowDetailsModal(false)
                  }}
                  className="btn primary"
                >
                  <Star size={16} style={{ marginRight: '8px' }} />
                  {t('setAsTitular')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
