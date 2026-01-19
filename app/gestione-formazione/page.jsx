'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, Info, X, Plus, User } from 'lucide-react'

export default function GestioneFormazionePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [layout, setLayout] = React.useState(null) // { formation, slot_positions }
  const [titolari, setTitolari] = React.useState([]) // Giocatori con slot_index 0-10
  const [riserve, setRiserve] = React.useState([]) // Giocatori con slot_index NULL
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [selectedSlot, setSelectedSlot] = React.useState(null) // { slot_index, position }
  const [showAssignModal, setShowAssignModal] = React.useState(false)
  const [assigning, setAssigning] = React.useState(false)

  // Carica layout e giocatori
  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.session) {
          setError('Sessione scaduta. Reindirizzamento al login...')
          setTimeout(() => router.push('/login'), 1000)
          return
        }

        // 1. Carica layout formazione
        const { data: layoutData, error: layoutError } = await supabase
          .from('formation_layout')
          .select('formation, slot_positions')
          .maybeSingle()

        if (layoutError && layoutError.code !== 'PGRST116') { // PGRST116 = no rows
          throw new Error(layoutError.message || 'Errore caricamento layout')
        }

        if (layoutData) {
          setLayout({
            formation: layoutData.formation,
            slot_positions: layoutData.slot_positions || {}
          })
        }

        // 2. Carica giocatori
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .order('created_at', { ascending: false })

        if (playersError) {
          throw new Error(playersError.message || 'Errore caricamento giocatori')
        }

        const playersArray = (players || [])
          .filter(p => p && p.id && p.player_name)
          .map(p => ({
            id: p.id,
            player_name: String(p.player_name || 'Unknown').trim(),
            position: p.position ? String(p.position).trim() : null,
            overall_rating: p.overall_rating != null ? Number(p.overall_rating) : null,
            team: p.team ? String(p.team).trim() : null,
            slot_index: p.slot_index != null ? Number(p.slot_index) : null
          }))

        const titolariArray = playersArray
          .filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
          .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
        
        const riserveArray = playersArray
          .filter(p => p.slot_index === null)
          .sort((a, b) => (a.player_name || '').localeCompare(b.player_name || ''))

        setTitolari(titolariArray)
        setRiserve(riserveArray)
      } catch (err) {
        console.error('[GestioneFormazione] Error:', err)
        setError(err.message || 'Errore caricamento dati')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          router.push('/login')
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

  const handleSlotClick = (slotIndex) => {
    const slotPos = layout?.slot_positions?.[slotIndex]
    if (!slotPos) return

    setSelectedSlot({ slot_index: slotIndex, ...slotPos })
    setShowAssignModal(true)
  }

  const handleAssignFromReserve = async (playerId) => {
    if (!selectedSlot || !supabase) return

    setAssigning(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const res = await fetch('/api/supabase/assign-player-to-slot', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slot_index: selectedSlot.slot_index,
          player_id: playerId
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore assegnazione')
      }

      // Ricarica dati
      window.location.reload()
    } catch (err) {
      console.error('[GestioneFormazione] Assign error:', err)
      setError(err.message || 'Errore assegnazione giocatore')
    } finally {
      setAssigning(false)
      setShowAssignModal(false)
      setSelectedSlot(null)
    }
  }

  const handleRemoveFromSlot = async (playerId) => {
    if (!supabase) return

    setAssigning(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      // Rimuovi da slot (torna riserva)
      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          slot_index: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId)

      if (updateError) {
        throw new Error(updateError.message || 'Errore rimozione')
      }

      // Ricarica dati
      window.location.reload()
    } catch (err) {
      console.error('[GestioneFormazione] Remove error:', err)
      setError(err.message || 'Errore rimozione giocatore')
    } finally {
      setAssigning(false)
    }
  }

  const handleUploadPhoto = () => {
    // Upload gestito inline tramite modal (non più redirect a /upload)
    setShowAssignModal(false)
    // TODO: Aprire modal upload specifico per questo slot in futuro
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loading')}</div>
      </main>
    )
  }

  // Se non c'è layout, mostra messaggio
  if (!layout || !layout.slot_positions) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <button
            onClick={() => router.push('/')}
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={16} />
            {t('back')}
          </button>
          <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
            {t('swapFormation')}
          </h1>
        </div>

        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Info size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--neon-blue)' }} />
          <div style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600 }}>
            Nessuna formazione caricata
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
            Carica prima uno screenshot della formazione completa per vedere il campo 2D
          </div>
          <button
            onClick={() => setShowUploadFormationModal(true)}
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={16} />
            {t('loadFormation')}
          </button>
        </div>
      </main>
    )
  }

  // Genera array slot 0-10 con posizioni
  const slots = Array.from({ length: 11 }, (_, i) => ({
    slot_index: i,
    position: layout.slot_positions[i] || { x: 50, y: 50, position: '?' },
    player: titolari.find(p => p.slot_index === i) || null
  }))

  return (
    <main style={{ padding: '16px', minHeight: '100vh', maxWidth: '1400px', margin: '0 auto' }}>
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
          Dashboard
        </button>
        <h1 className="neon-text" style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, margin: 0 }}>
          {t('swapFormation')}
        </h1>
        {layout.formation && (
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            color: 'var(--neon-blue)',
            marginLeft: 'auto'
          }}>
            {layout.formation}
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

      {/* Campo 2D */}
      <div className="card" style={{ 
        marginBottom: '32px',
        padding: '24px',
        position: 'relative',
        minHeight: '500px',
        background: 'linear-gradient(180deg, rgba(34, 139, 34, 0.1) 0%, rgba(0, 100, 0, 0.2) 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(0, 212, 255, 0.2)'
      }}>
        {/* Linee campo (opzionale, decorativo) */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '2px',
          background: 'rgba(255, 255, 255, 0.1)',
          transform: 'translateY(-50%)'
        }} />
        <div style={{
          position: 'absolute',
          top: '25%',
          left: 0,
          right: 0,
          height: '1px',
          background: 'rgba(255, 255, 255, 0.05)'
        }} />
        <div style={{
          position: 'absolute',
          top: '75%',
          left: 0,
          right: 0,
          height: '1px',
          background: 'rgba(255, 255, 255, 0.05)'
        }} />

        {/* Card giocatori posizionate */}
        {slots.map((slot) => (
          <SlotCard
            key={slot.slot_index}
            slot={slot}
            onClick={() => handleSlotClick(slot.slot_index)}
            onRemove={slot.player ? () => handleRemoveFromSlot(slot.player.id) : null}
          />
        ))}
      </div>

      {/* Riserve */}
      {riserve.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            marginBottom: '16px',
            color: 'var(--neon-purple)'
          }}>
            {t('riserve')} ({riserve.length})
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px'
          }}>
            {riserve.map((player) => (
              <ReserveCard 
                key={player.id}
                player={player}
                onClick={() => {
                  if (selectedSlot && showAssignModal) {
                    handleAssignFromReserve(player.id)
                  }
                }}
                disabled={!showAssignModal}
              />
            ))}
          </div>
        )}
        {riserve.length === 0 && (
          <div style={{ 
            padding: '24px', 
            textAlign: 'center', 
            background: 'rgba(168, 85, 247, 0.05)',
            borderRadius: '8px',
            border: '1px dashed rgba(168, 85, 247, 0.3)'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '12px' }}>
              Nessuna riserva. Carica giocatori per aggiungerli alle riserve.
            </div>
            <button
              onClick={() => setShowUploadReserveModal(true)}
              className="btn"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px'
              }}
            >
              <Plus size={16} />
              {t('loadFirstReserve')}
            </button>
          </div>
        )}
      </div>

      {/* Modal Assegnazione */}
      {showAssignModal && selectedSlot && (
        <AssignModal
          slot={selectedSlot}
          currentPlayer={slots.find(s => s.slot_index === selectedSlot.slot_index)?.player}
          riserve={riserve}
          onAssignFromReserve={handleAssignFromReserve}
          onUploadPhoto={handleUploadPhoto}
          onRemove={currentPlayer => handleRemoveFromSlot(currentPlayer.id)}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedSlot(null)
          }}
          assigning={assigning}
        />
      )}

      {/* Modal Upload Formazione */}
      {showUploadFormationModal && (
        <UploadModal
          title={t('loadFormation')}
          description="Carica uno screenshot della formazione completa (11 giocatori sul campo)"
          onUpload={handleUploadFormation}
          onClose={() => setShowUploadFormationModal(false)}
          uploading={uploadingFormation}
        />
      )}

      {/* Modal Upload Riserva */}
      {showUploadReserveModal && (
        <UploadModal
          title={t('loadReserve')}
          description="Carica uno screenshot della card del giocatore"
          onUpload={handleUploadReserve}
          onClose={() => setShowUploadReserveModal(false)}
          uploading={uploadingReserve}
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

// Componente Modal Upload
function UploadModal({ title, description, onUpload, onClose, uploading }) {
  const [image, setImage] = React.useState(null)
  const [preview, setPreview] = React.useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      setPreview(dataUrl)
      setImage({ file, dataUrl })
    }
    reader.readAsDataURL(file)
  }

  const handleConfirm = () => {
    if (image?.dataUrl) {
      onUpload(image.dataUrl)
    }
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
      onClick={onClose}
    >
      <div 
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', marginTop: 0 }}>
          {title}
        </h2>
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px' }}>
          {description}
        </div>

        {!preview ? (
          <label style={{
            display: 'block',
            padding: '32px',
            border: '2px dashed rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(0, 212, 255, 0.05)'
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
              <Upload size={32} style={{ marginBottom: '12px', color: 'var(--neon-blue)' }} />
              <div style={{ fontSize: '14px' }}>Clicca per selezionare immagine</div>
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>
                Formati supportati: JPG, PNG
              </div>
          </label>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            className="btn"
            disabled={uploading}
            style={{ padding: '10px 20px' }}
          >
            Annulla
          </button>
          {preview && (
            <button 
              onClick={handleConfirm} 
              className="btn primary"
              disabled={uploading}
              style={{ 
                padding: '10px 20px',
                opacity: uploading ? 0.6 : 1
              }}
            >
              {uploading ? 'Caricamento...' : 'Carica'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Slot Card Component (posizionata sul campo)
function SlotCard({ slot, onClick, onRemove }) {
  const { t } = useTranslation()
  const { slot_index, position, player } = slot
  const isEmpty = !player

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 'clamp(80px, 8vw, 120px)',
        minHeight: '100px',
        padding: '8px',
        background: isEmpty 
          ? 'rgba(0, 0, 0, 0.4)' 
          : 'rgba(0, 212, 255, 0.15)',
        border: `2px solid ${isEmpty ? 'rgba(255, 255, 255, 0.2)' : 'var(--neon-blue)'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'
        e.currentTarget.style.boxShadow = 'var(--glow-blue)'
        e.currentTarget.style.zIndex = '10'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.zIndex = '1'
      }}
    >
      {isEmpty ? (
        <>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>
            Slot {slot_index}
          </div>
          <div style={{ fontSize: '10px', opacity: 0.6, marginBottom: '8px' }}>
            {position.position || '?'}
          </div>
          <Plus size={24} style={{ color: 'var(--neon-blue)', opacity: 0.6 }} />
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
            Clicca per assegnare
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>
            Slot {slot_index}
          </div>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 700, 
            marginBottom: '4px',
            color: 'var(--neon-blue)',
            lineHeight: '1.2',
            wordBreak: 'break-word'
          }}>
            {player.player_name}
          </div>
          {player.overall_rating && (
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neon-blue)' }}>
              {player.overall_rating}
            </div>
          )}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              style={{
                marginTop: '4px',
                padding: '2px 6px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '4px',
                color: '#ef4444',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Rimuovi
            </button>
          )}
        </>
      )}
    </div>
  )
}

// Reserve Card Component
function ReserveCard({ player, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '12px',
        background: 'rgba(168, 85, 247, 0.1)',
        border: `1px solid ${disabled ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.4)'}`,
        borderRadius: '8px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = 'var(--glow-purple)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: 'var(--neon-purple)' }}>
        {player.player_name}
      </div>
      {player.overall_rating && (
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          {player.overall_rating}
        </div>
      )}
    </div>
  )
}

// Assign Modal Component
function AssignModal({ slot, currentPlayer, riserve, onAssignFromReserve, onUploadPhoto, onRemove, onClose, assigning }) {
  const { t } = useTranslation()
  const router = useRouter()

  return (
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
      padding: '24px'
    }}
    onClick={onClose}
    >
      <div 
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '24px',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {currentPlayer ? 'Modifica Slot' : 'Assegna Giocatore'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>
            <strong>Slot {slot.slot_index}</strong> • {slot.position || '?'}
          </div>
          {currentPlayer && (
            <div style={{ fontSize: '13px', opacity: 0.8 }}>
              Giocatore attuale: <strong>{currentPlayer.player_name}</strong>
            </div>
          )}
        </div>

        {currentPlayer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => router.push(`/giocatore/${currentPlayer.id}`)}
              className="btn"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
            >
              <User size={16} />
              Completa Profilo
            </button>
            <button
              onClick={() => {
                onClose()
                // Apri modal upload inline
                setTimeout(() => {
                  // Gestito da modal upload che verrà aggiunto
                  alert('Funzionalità in sviluppo: upload foto per questo slot')
                }, 100)
              }}
              className="btn"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
            >
              <Upload size={16} />
              Cambia Giocatore (Carica Foto)
            </button>
            {onRemove && (
              <button
                onClick={onRemove}
                className="btn"
                style={{ 
                  width: '100%', 
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  justifyContent: 'center' 
                }}
              >
                <X size={16} />
                Rimuovi da Slot
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => {
                onClose()
                // Apri modal upload inline per questo slot
                setTimeout(() => {
                  alert('Funzionalità in sviluppo: upload foto per questo slot')
                }, 100)
              }}
              className="btn primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
            >
              <Upload size={16} />
              {t('uploadPlayerPhoto')}
            </button>

            {riserve.length > 0 && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '12px', marginBottom: '8px' }}>
                  {t('orSelectFromReserves')}:
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {riserve.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => onAssignFromReserve(player.id)}
                      disabled={assigning}
                      className="btn"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: assigning ? 0.6 : 1
                      }}
                    >
                      <span>{player.player_name}</span>
                      {player.overall_rating && (
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>{player.overall_rating}</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
