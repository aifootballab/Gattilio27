'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, User, BarChart3, Zap, Gift } from 'lucide-react'

export default function PlayerDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const playerId = params?.id

  const [player, setPlayer] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [uploadType, setUploadType] = React.useState(null) // 'stats', 'skills', 'booster'
  const [images, setImages] = React.useState([])
  const [confirmModal, setConfirmModal] = React.useState(null) // { show, extractedData, nameMismatch, teamMismatch, positionMismatch, onConfirm, onCancel }

  // Carica dati giocatore
  React.useEffect(() => {
    if (!playerId || !supabase) {
      router.push('/gestione-formazione')
      return
    }

    const fetchPlayer = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session) {
          router.push('/login')
          return
        }

        const { data, error: queryError } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single()

        if (queryError) {
          throw new Error(queryError.message || 'Giocatore non trovato')
        }

        if (!data) {
          throw new Error('Giocatore non trovato')
        }

        setPlayer(data)
      } catch (err) {
        console.error('[PlayerDetail] Error:', err)
        setError(err.message || 'Errore caricamento giocatore')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayer()
  }, [playerId, router])

  const handleFileSelect = (e, type) => {
    const files = Array.from(e.target.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      setError('Seleziona almeno un\'immagine')
      return
    }

    if (imageFiles.length > 1) {
      setError('Carica una sola immagine alla volta')
      return
    }

    const file = imageFiles[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      setImages([{
        file,
        dataUrl: e.target.result,
        name: file.name,
        type
      }])
      setUploadType(type)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadAndUpdate = async () => {
    if (images.length === 0 || !uploadType || !player) {
      setError('Seleziona un\'immagine')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const img = images[0]

      // 1. Estrai dati dall'immagine
      const extractRes = await fetch('/api/extract-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: img.dataUrl })
      })

      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        throw new Error(extractData.error || 'Errore estrazione dati')
      }

      if (!extractData.player) {
        throw new Error('Impossibile estrarre dati dall\'immagine')
      }

      // 2. VALIDAZIONE: Confronta nome + squadra + ruolo (o età)
      const normalize = (value) => {
        if (!value) return ''
        return String(value).toLowerCase().trim().replace(/\s+/g, ' ')
      }

      const extractedName = normalize(extractData.player.player_name)
      const currentName = normalize(player.player_name)
      const nameMismatch = extractedName !== currentName

      const extractedTeam = normalize(extractData.player.team)
      const currentTeam = normalize(player.team)
      const teamMismatch = extractedTeam !== currentTeam && extractedTeam !== '' && currentTeam !== ''

      const extractedPosition = normalize(extractData.player.position)
      const currentPosition = normalize(player.position)
      const positionMismatch = extractedPosition !== currentPosition && extractedPosition !== '' && currentPosition !== ''

      // Fallback: confronta età se ruolo non disponibile
      const extractedAge = extractData.player.age ? Number(extractData.player.age) : null
      const currentAge = player.age ? Number(player.age) : null
      const ageMismatch = extractedAge !== null && currentAge !== null && extractedAge !== currentAge

      const hasMismatch = nameMismatch || teamMismatch || positionMismatch || ageMismatch

      // 3. Mostra modal conferma SEMPRE
      setConfirmModal({
        show: true,
        extractedData: extractData.player,
        nameMismatch,
        teamMismatch,
        positionMismatch,
        ageMismatch,
        hasMismatch,
        uploadType,
        onConfirm: async () => {
          await performUpdate(extractData.player, uploadType)
          setConfirmModal(null)
        },
        onCancel: () => {
          setImages([])
          setUploadType(null)
          setConfirmModal(null)
        }
      })
      setUploading(false)
      return

      // 4. Aggiorna giocatore con dati aggiuntivi (eseguito solo dopo conferma)
      const updateData = {}
      const photoSlots = player.photo_slots || {}

      if (uploadType === 'stats') {
        if (extractData.player.base_stats) {
          updateData.base_stats = extractData.player.base_stats
        }
        photoSlots.statistiche = true
      } else if (uploadType === 'skills') {
        if (extractData.player.skills) {
          updateData.skills = extractData.player.skills
        }
        if (extractData.player.com_skills) {
          updateData.com_skills = extractData.player.com_skills
        }
        photoSlots.abilita = true
      } else if (uploadType === 'booster') {
        if (extractData.player.boosters) {
          updateData.available_boosters = extractData.player.boosters
        }
        photoSlots.booster = true
      }

      updateData.photo_slots = photoSlots
      updateData.updated_at = new Date().toISOString()

      // 3. Aggiorna in Supabase
      const { error: updateError } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', playerId)

      if (updateError) {
        throw new Error(updateError.message || 'Errore aggiornamento giocatore')
      }

      // 4. Ricarica dati giocatore
      const { data: updatedPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single()

      setPlayer(updatedPlayer)
      setImages([])
      setUploadType(null)
      
      // Success message
      setTimeout(() => {
        setError(null)
      }, 3000)
    } catch (err) {
      console.error('[PlayerDetail] Upload error:', err)
      setError(err.message || 'Errore caricamento foto')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loading')}</div>
      </main>
    )
  }

  if (error && !player) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh' }}>
        <div className="error" style={{ marginBottom: '24px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
        <button onClick={() => router.push('/lista-giocatori')} className="btn">
          <ArrowLeft size={16} />
          {t('back')}
        </button>
      </main>
    )
  }

  if (!player) {
    return null
  }

  const photoSlots = player.photo_slots || {}

  return (
    <main style={{ padding: '32px 24px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        marginBottom: '32px'
      }}>
        <button
          onClick={() => router.push('/gestione-formazione')}
          className="btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} />
          {t('back')}
        </button>
        <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
          {player.player_name}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Player Info */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {player.position && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>Posizione</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.position}</div>
            </div>
          )}
          {player.overall_rating && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>Overall</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-blue)' }}>{player.overall_rating}</div>
            </div>
          )}
          {player.team && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>Team</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.team}</div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Sections */}
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Statistiche */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <BarChart3 size={24} color="var(--neon-blue)" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Statistiche</h2>
            {photoSlots.statistiche && (
              <CheckCircle2 size={20} color="#22c55e" />
            )}
          </div>
          {photoSlots.statistiche ? (
            <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#22c55e' }}>
              ✅ Statistiche completate
            </div>
          ) : (
            <div>
              <label style={{
                display: 'block',
                padding: '16px',
                border: '2px dashed rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(0, 212, 255, 0.05)'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'stats')}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <Upload size={24} style={{ marginBottom: '8px', color: 'var(--neon-blue)' }} />
                <div style={{ fontSize: '14px' }}>Carica screenshot statistiche</div>
              </label>
            </div>
          )}
        </div>

        {/* Abilità */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Zap size={24} color="var(--neon-purple)" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Abilità</h2>
            {photoSlots.abilita && (
              <CheckCircle2 size={20} color="#22c55e" />
            )}
          </div>
          {photoSlots.abilita ? (
            <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#22c55e' }}>
              ✅ Abilità completate
            </div>
          ) : (
            <div>
              <label style={{
                display: 'block',
                padding: '16px',
                border: '2px dashed rgba(168, 85, 247, 0.3)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(168, 85, 247, 0.05)'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'skills')}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <Upload size={24} style={{ marginBottom: '8px', color: 'var(--neon-purple)' }} />
                <div style={{ fontSize: '14px' }}>Carica screenshot abilità</div>
              </label>
            </div>
          )}
        </div>

        {/* Booster */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Gift size={24} color="var(--neon-orange)" />
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Booster</h2>
            {photoSlots.booster && (
              <CheckCircle2 size={20} color="#22c55e" />
            )}
          </div>
          {photoSlots.booster ? (
            <div style={{ padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: '#22c55e' }}>
              ✅ Booster completati
            </div>
          ) : (
            <div>
              <label style={{
                display: 'block',
                padding: '16px',
                border: '2px dashed rgba(255, 107, 53, 0.3)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 107, 53, 0.05)'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'booster')}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <Upload size={24} style={{ marginBottom: '8px', color: 'var(--neon-orange)' }} />
                <div style={{ fontSize: '14px' }}>Carica screenshot booster</div>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      {images.length > 0 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleUploadAndUpdate}
            disabled={uploading}
            className="btn primary"
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              opacity: uploading ? 0.6 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? (
              <>
                <RefreshCw size={20} style={{ animation: 'spin 0.6s linear infinite' }} />
                Caricamento...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Salva e Aggiorna
              </>
            )}
          </button>
        </div>
      )}

      {/* Preview Image */}
      {images.length > 0 && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <img
            src={images[0].dataUrl}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          />
        </div>
      )}

      {/* Modal Conferma Aggiornamento */}
      {confirmModal && confirmModal.show && (
        <ConfirmUpdateModal
          currentPlayer={player}
          extractedData={confirmModal.extractedData}
          nameMismatch={confirmModal.nameMismatch}
          teamMismatch={confirmModal.teamMismatch}
          positionMismatch={confirmModal.positionMismatch}
          ageMismatch={confirmModal.ageMismatch}
          hasMismatch={confirmModal.hasMismatch}
          uploadType={confirmModal.uploadType}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}

// Componente Modal Conferma
function ConfirmUpdateModal({ 
  currentPlayer, 
  extractedData, 
  nameMismatch, 
  teamMismatch, 
  positionMismatch,
  ageMismatch,
  hasMismatch,
  uploadType,
  onConfirm, 
  onCancel 
}) {
  const { t } = useTranslation()
  const uploadTypeLabels = {
    stats: t('stats') || 'Statistiche',
    skills: t('skills') || 'Abilità',
    booster: t('boosters') || 'Booster'
  }

  return (
    <div 
      style={{
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
        padding: '24px'
      }}
      onClick={onCancel}
    >
      <div 
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          background: 'rgba(10, 14, 39, 0.95)',
          border: `2px solid ${hasMismatch ? '#ef4444' : 'var(--neon-blue)'}`
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', marginTop: 0 }}>
          {t('confirmUpdate')} {uploadTypeLabels[uploadType] || ''}
        </h2>

        {/* Confronto Dati */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            padding: '12px', 
            background: 'rgba(0, 212, 255, 0.1)', 
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{t('currentPlayer')}:</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              <div><strong>Nome:</strong> {currentPlayer.player_name || 'N/A'}</div>
              {currentPlayer.team && <div><strong>Squadra:</strong> {currentPlayer.team}</div>}
              {currentPlayer.position && <div><strong>Ruolo:</strong> {currentPlayer.position}</div>}
              {currentPlayer.age && <div><strong>Età:</strong> {currentPlayer.age}</div>}
            </div>
          </div>

          <div style={{ 
            padding: '12px', 
            background: hasMismatch ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
            borderRadius: '8px',
            border: `1px solid ${hasMismatch ? '#ef4444' : '#22c55e'}`
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{t('extractedData')}:</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              <div style={{ color: nameMismatch ? '#ef4444' : 'inherit' }}>
                <strong>Nome:</strong> {extractedData.player_name || 'N/A'}
                {nameMismatch && ' ⚠️'}
              </div>
              {extractedData.team && (
                <div style={{ color: teamMismatch ? '#ef4444' : 'inherit' }}>
                  <strong>Squadra:</strong> {extractedData.team}
                  {teamMismatch && ' ⚠️'}
                </div>
              )}
              {extractedData.position && (
                <div style={{ color: positionMismatch ? '#ef4444' : 'inherit' }}>
                  <strong>Ruolo:</strong> {extractedData.position}
                  {positionMismatch && ' ⚠️'}
                </div>
              )}
              {extractedData.age && (
                <div style={{ color: ageMismatch ? '#ef4444' : 'inherit' }}>
                  <strong>Età:</strong> {extractedData.age}
                  {ageMismatch && ' ⚠️'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Warning se mismatch */}
        {hasMismatch && (
          <div style={{ 
            padding: '12px', 
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: '#ef4444' }}>
              ⚠️ {t('dataMismatch')}
            </div>
            <div style={{ opacity: 0.9 }}>
              {nameMismatch && <div>• {t('nameDifferent')}</div>}
              {teamMismatch && <div>• {t('teamDifferent')}</div>}
              {positionMismatch && <div>• {t('positionDifferent')}</div>}
              {ageMismatch && <div>• {t('ageDifferent')}</div>}
              <div style={{ marginTop: '8px' }}>
                {t('ensureSamePlayer')}
              </div>
            </div>
          </div>
        )}

        {/* Bottoni */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onCancel} 
            className="btn"
            style={{ padding: '10px 20px' }}
          >
            {t('cancel')}
          </button>
          <button 
            onClick={onConfirm} 
            className="btn primary"
            style={{ 
              padding: '10px 20px',
              background: hasMismatch ? '#ef4444' : 'var(--neon-blue)',
              borderColor: hasMismatch ? '#ef4444' : 'var(--neon-blue)'
            }}
          >
            {hasMismatch ? t('confirmAnyway') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
