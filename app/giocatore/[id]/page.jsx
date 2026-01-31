'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, User, BarChart3, Zap, Gift, ChevronDown, ChevronUp, Award } from 'lucide-react'
import { getPhotoTypeStyle } from '@/lib/playerPhotoTypes'

export default function PlayerDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const playerId = params?.id

  const [player, setPlayer] = React.useState(null)
  const [playingStyleName, setPlayingStyleName] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [uploading, setUploading] = React.useState(false)
  const [uploadType, setUploadType] = React.useState(null) // 'stats', 'skills', 'booster'
  const [images, setImages] = React.useState([])
  const [confirmModal, setConfirmModal] = React.useState(null) // { show, extractedData, nameMismatch, teamMismatch, positionMismatch, onConfirm, onCancel }
  const [expandedSections, setExpandedSections] = React.useState({
    stats: true,
    skills: true,
    boosters: true
  })

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
          throw new Error(queryError.message || t('playerNotFound'))
        }

        if (!data) {
          throw new Error(t('playerNotFound'))
        }

        setPlayer(data)

        // Carica nome stile di gioco se presente
        if (data.playing_style_id) {
          const { data: styleData } = await supabase
            .from('playing_styles')
            .select('name')
            .eq('id', data.playing_style_id)
            .single()
          
          if (styleData) {
            setPlayingStyleName(styleData.name)
          }
        }
      } catch (err) {
        console.error('[PlayerDetail] Error:', err)
        setError(err.message || t('errorLoadingPlayer'))
      } finally {
        setLoading(false)
      }
    }

    fetchPlayer()
  }, [playerId, router, t])

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

  // Funzione per aggiornare il giocatore con i dati estratti
  const performUpdate = async (extractedPlayerData, type) => {
    if (!player) {
      setError(t('playerNotFound'))
      return
    }
    
    setUploading(true)
    setError(null)

    try {
      const updateData = {}
      const photoSlots = player.photo_slots || {}

      if (type === 'stats') {
        if (extractedPlayerData.base_stats) {
          updateData.base_stats = extractedPlayerData.base_stats
        }
        photoSlots.statistiche = true
      } else if (type === 'skills') {
        if (extractedPlayerData.skills) {
          updateData.skills = extractedPlayerData.skills
        }
        if (extractedPlayerData.com_skills) {
          updateData.com_skills = extractedPlayerData.com_skills
        }
        // Se ci sono booster estratti dalla stessa foto, salvali e traccia
        if (extractedPlayerData.boosters && Array.isArray(extractedPlayerData.boosters) && extractedPlayerData.boosters.length > 0) {
          updateData.available_boosters = extractedPlayerData.boosters
          photoSlots.booster = true
        }
        photoSlots.abilita = true
      } else if (type === 'booster') {
        if (extractedPlayerData.boosters) {
          updateData.available_boosters = extractedPlayerData.boosters
        }
        photoSlots.booster = true
      }

      updateData.photo_slots = photoSlots
      updateData.updated_at = new Date().toISOString()

      // Aggiorna in Supabase
      const { error: updateError } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', playerId)

      if (updateError) {
        throw new Error(updateError.message || t('errorUpdatingPlayer'))
      }

      // Ricarica dati giocatore
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
      console.error('[PlayerDetail] Update error:', err)
      setError(err.message || t('errorUpdatingPlayer'))
    } finally {
      setUploading(false)
    }
  }

  const handleUploadAndUpdate = async () => {
    if (images.length === 0 || !uploadType || !player) {
      setError(t('selectOneImage'))
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error(t('sessionExpired'))
      }

      const token = session.session.access_token
      const img = images[0]

      // 1. Estrai dati dall'immagine
      const extractRes = await fetch('/api/extract-player', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageDataUrl: img.dataUrl })
      })

      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        const errorMsg = extractData.error || t('errorExtractingData')
        // Se c'è un errore di quota OpenAI, mostralo chiaramente
        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
          throw new Error(t('openAQuotaError'))
        }
        throw new Error(errorMsg)
      }

      if (!extractData.player) {
        throw new Error(t('unableToExtractData'))
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
    } catch (err) {
      console.error('[PlayerDetail] Upload error:', err)
      setError(err.message || t('errorUploadingPhoto'))
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
        <button onClick={() => router.push('/gestione-formazione')} className="btn">
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
  
  // Calcola se profilo è completo: 3 foto (Card, Statistiche, Abilità/Booster)
  // Abilità e Booster possono essere nella stessa foto
  const isProfileComplete = photoSlots.card && photoSlots.statistiche && (photoSlots.abilita || photoSlots.booster)

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <main style={{ padding: '32px 24px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
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
        <div style={{ marginLeft: 'auto' }}>
          <LanguageSwitch />
        </div>
        {isProfileComplete && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))',
            border: '2px solid #22c55e',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#22c55e',
            marginLeft: 'auto'
          }}>
            <Award size={18} />
            {t('profileComplete')}
          </div>
        )}
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
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('position')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.position}</div>
            </div>
          )}
          {player.overall_rating && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('overallRating')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-blue)' }}>{player.overall_rating}</div>
            </div>
          )}
          {player.age && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('age')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.age} {t('years')}</div>
            </div>
          )}
          {(player.club_name || player.team) && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('club')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.club_name || player.team}</div>
            </div>
          )}
          {player.nationality && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('nationality')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{player.nationality}</div>
            </div>
          )}
          {(playingStyleName || player.role) && (
            <div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{t('playingStyle')}</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--neon-orange)' }}>{playingStyleName || player.role}</div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Sections */}
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Statistiche */}
        <StatsSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.stats}
          onToggle={() => toggleSection('stats')}
          onFileSelect={(e) => handleFileSelect(e, 'stats')}
          uploading={uploading}
        />

        {/* Abilità */}
        <SkillsSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.skills}
          onToggle={() => toggleSection('skills')}
          onFileSelect={(e) => handleFileSelect(e, 'skills')}
          uploading={uploading}
        />

        {/* Booster */}
        <BoostersSection
          player={player}
          photoSlots={photoSlots}
          isExpanded={expandedSections.boosters}
          onToggle={() => toggleSection('boosters')}
          onFileSelect={(e) => handleFileSelect(e, 'booster')}
          uploading={uploading}
        />
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
                {t('loading')}
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                {t('saveAndUpdate') || 'Salva e Aggiorna'}
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

// Stile card unificato (stesso design del modal Upload in gestione-formazione)
const SECTION_CARD_STYLE = (style) => ({
  padding: '24px',
  borderRadius: '12px',
  border: `1px solid ${style.borderColor}`,
  background: style.bgColor
})

// Componente Sezione Statistiche (design unificato: card = Statistiche, colore neon-blue)
function StatsSection({ player, photoSlots, isExpanded, onToggle, onFileSelect, uploading }) {
  const { t } = useTranslation()
  const style = getPhotoTypeStyle('card')
  if (!player) return null
  
  const baseStats = player.base_stats || {}
  const hasStats = photoSlots.statistiche && baseStats && Object.keys(baseStats).length > 0

  return (
    <div className="card" style={SECTION_CARD_STYLE(style)}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : 0,
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={24} color={style.color} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: style.color }}>{t('statsSection')}</h2>
          {photoSlots.statistiche && (
            <CheckCircle2 size={20} color="#22c55e" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <>
          {hasStats ? (
            <div style={{ marginBottom: '16px' }}>
              {/* Attacco */}
              {baseStats.attacking && Object.keys(baseStats.attacking).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-blue)' }}>
                    Attacco
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.entries(baseStats.attacking).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        background: 'rgba(0, 212, 255, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 212, 255, 0.2)'
                      }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Difesa */}
              {baseStats.defending && Object.keys(baseStats.defending).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#ef4444' }}>
                    {t('defending')}
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.entries(baseStats.defending).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forza/Fisico */}
              {baseStats.athleticism && Object.keys(baseStats.athleticism).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#f59e0b' }}>
                    Forza
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.entries(baseStats.athleticism).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        background: 'rgba(245, 158, 11, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(245, 158, 11, 0.2)'
                      }}>
                        <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(0, 212, 255, 0.05)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              {t('statsNotAvailable')}
            </div>
          )}

          {/* Pulsante upload: stile unificato (stesso bordo/colore del modal Upload) */}
          <label style={{
            display: 'block',
            padding: '12px 16px',
            border: `2px solid ${style.borderColor}`,
            borderRadius: '8px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: style.bgColor,
            opacity: uploading ? 0.6 : 1
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={onFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Upload size={18} color={style.color} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: style.color }}>
                {photoSlots.statistiche ? t('updateStats') : t('uploadStats')}
              </span>
            </div>
          </label>
        </>
      )}
    </div>
  )
}

// Componente Sezione Abilità (design unificato: stats = Abilità, colore neon-purple)
function SkillsSection({ player, photoSlots, isExpanded, onToggle, onFileSelect, uploading }) {
  const { t } = useTranslation()
  const style = getPhotoTypeStyle('stats')
  if (!player) return null
  
  const skills = player.skills || []
  const comSkills = player.com_skills || []
  const hasSkills = photoSlots.abilita && (skills.length > 0 || comSkills.length > 0)

  return (
    <div className="card" style={SECTION_CARD_STYLE(style)}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : 0,
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Zap size={24} color={style.color} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: style.color }}>{t('skillsSection')}</h2>
          {photoSlots.abilita && (
            <CheckCircle2 size={20} color="#22c55e" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <>
          {hasSkills ? (
            <div style={{ marginBottom: '16px' }}>
              {/* Abilità Giocatore */}
              {skills.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-purple)' }}>
                    {t('playerSkills')}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    {skills.map((skill, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--neon-purple)'
                      }}>
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abilità Aggiuntive */}
              {comSkills.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#a855f7' }}>
                    {t('additionalSkills')}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px' 
                  }}>
                    {comSkills.map((skill, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#a855f7'
                      }}>
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(168, 85, 247, 0.05)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              Nessuna abilità disponibile
            </div>
          )}

          {/* Pulsante upload: stile unificato */}
          <label style={{
            display: 'block',
            padding: '12px 16px',
            border: `2px solid ${style.borderColor}`,
            borderRadius: '8px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: style.bgColor,
            opacity: uploading ? 0.6 : 1
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={onFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Upload size={18} color={style.color} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: style.color }}>
                {photoSlots.abilita ? t('updateSkills') : t('uploadSkills')}
              </span>
            </div>
          </label>
        </>
      )}
    </div>
  )
}

// Componente Sezione Booster (design unificato: skills = Booster, colore neon-orange)
function BoostersSection({ player, photoSlots, isExpanded, onToggle, onFileSelect, uploading }) {
  const { t } = useTranslation()
  const style = getPhotoTypeStyle('skills')
  if (!player) return null
  
  const boosters = player.available_boosters || []
  const hasBoosters = photoSlots.booster && Array.isArray(boosters) && boosters.length > 0

  return (
    <div className="card" style={SECTION_CARD_STYLE(style)}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: isExpanded ? '16px' : 0,
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Gift size={24} color={style.color} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: style.color }}>{t('boostersSection')}</h2>
          {photoSlots.booster && (
            <CheckCircle2 size={20} color="#22c55e" />
          )}
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <>
          {hasBoosters ? (
            <div style={{ marginBottom: '16px' }}>
              {boosters.map((booster, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  background: 'rgba(255, 107, 53, 0.1)',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 700, 
                    marginBottom: '8px',
                    color: 'var(--neon-orange)'
                  }}>
                    {booster.name || `${t('boostersSection')} ${idx + 1}`}
                  </div>
                  {booster.effect && (
                    <div style={{ fontSize: '14px', marginBottom: '4px', opacity: 0.9 }}>
                      <strong>Effetto:</strong> {booster.effect}
                    </div>
                  )}
                  {booster.condition && (
                    <div style={{ fontSize: '13px', opacity: 0.7 }}>
                      <strong>{t('condition')}:</strong> {booster.condition}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(255, 107, 53, 0.05)', 
              borderRadius: '8px', 
              marginBottom: '16px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              {t('boostersNotAvailable')}
            </div>
          )}

          {/* Pulsante upload: stile unificato */}
          <label style={{
            display: 'block',
            padding: '12px 16px',
            border: `2px solid ${style.borderColor}`,
            borderRadius: '8px',
            textAlign: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            background: style.bgColor,
            opacity: uploading ? 0.6 : 1
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={onFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Upload size={18} color={style.color} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: style.color }}>
                {photoSlots.booster ? t('updateBoosters') : t('uploadBoosters')}
              </span>
            </div>
          </label>
        </>
      )}
    </div>
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
              <div><strong>{t('name')}:</strong> {currentPlayer.player_name || t('nA')}</div>
              {currentPlayer.team && <div><strong>{t('team')}:</strong> {currentPlayer.team}</div>}
              {currentPlayer.position && <div><strong>{t('role')}:</strong> {currentPlayer.position}</div>}
              {currentPlayer.age && <div><strong>{t('age')}:</strong> {currentPlayer.age}</div>}
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
                  <strong>{t('team')}:</strong> {extractedData.team}
                  {teamMismatch && ' ⚠️'}
                </div>
              )}
              {extractedData.position && (
                <div style={{ color: positionMismatch ? '#ef4444' : 'inherit' }}>
                  <strong>{t('role')}:</strong> {extractedData.position}
                  {positionMismatch && ' ⚠️'}
                </div>
              )}
              {extractedData.age && (
                <div style={{ color: ageMismatch ? '#ef4444' : 'inherit' }}>
                  <strong>{t('age')}:</strong> {extractedData.age}
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
