'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, Info, X, Plus, User, Settings } from 'lucide-react'

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
  const [showFormationSelectorModal, setShowFormationSelectorModal] = React.useState(false)
  const [showUploadFormationModal, setShowUploadFormationModal] = React.useState(false)
  const [showUploadReserveModal, setShowUploadReserveModal] = React.useState(false)
  const [uploadingFormation, setUploadingFormation] = React.useState(false)
  const [uploadingReserve, setUploadingReserve] = React.useState(false)
  const [showUploadPlayerModal, setShowUploadPlayerModal] = React.useState(false)
  const [uploadImages, setUploadImages] = React.useState([])
  const [uploadingPlayer, setUploadingPlayer] = React.useState(false)

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
    // Apri modal upload giocatore per questo slot (mantieni selectedSlot)
    setShowAssignModal(false)
    // NON resettare selectedSlot qui - serve per UploadPlayerModal
    setShowUploadPlayerModal(true)
  }

  const handleUploadPlayerToSlot = async () => {
    if (!selectedSlot || uploadImages.length === 0) return

    setUploadingPlayer(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // Carica tutte le immagini e estrai dati
      let playerData = null
      let allExtractedData = {}

      for (const img of uploadImages) {
        const extractRes = await fetch('/api/extract-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: img.dataUrl })
        })

        const extractData = await extractRes.json()
        if (!extractRes.ok) {
          console.warn('[UploadPlayer] Errore estrazione:', extractData.error)
          continue
        }

        if (extractData.player) {
          // Merge dati (prima immagine = dati base)
          if (!playerData) {
            playerData = extractData.player
          } else {
            // Merge dati aggiuntivi
            playerData = {
              ...playerData,
              ...extractData.player,
              // Mantieni dati migliori
              overall_rating: extractData.player.overall_rating || playerData.overall_rating,
              base_stats: extractData.player.base_stats || playerData.base_stats,
              skills: extractData.player.skills || playerData.skills,
              com_skills: extractData.player.com_skills || playerData.com_skills,
              boosters: extractData.player.boosters || playerData.boosters
            }
          }
          allExtractedData[img.type] = extractData.player
        }
      }

      if (!playerData || !playerData.player_name) {
        throw new Error('Impossibile estrarre dati giocatore dalle immagini')
      }

      // Salva giocatore e assegna allo slot
      const saveRes = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player: {
            ...playerData,
            slot_index: selectedSlot.slot_index
          }
        })
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Errore salvataggio giocatore')
      }

      setShowUploadPlayerModal(false)
      setUploadImages([])
      setSelectedSlot(null)
      // Ricarica dati
      window.location.reload()
    } catch (err) {
      console.error('[GestioneFormazione] Upload player error:', err)
      setError(err.message || 'Errore caricamento giocatore')
    } finally {
      setUploadingPlayer(false)
    }
  }

  const handleUploadFormation = async (imageDataUrl) => {
    setUploadingFormation(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // 1. Estrai formazione
      const extractRes = await fetch('/api/extract-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl })
      })

      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        throw new Error(extractData.error || 'Errore estrazione formazione')
      }

      if (!extractData.formation) {
        throw new Error(t('formationExtractionFailed'))
      }

      // Completa slot mancanti
      const completeSlotPositions = (slotPositions) => {
        const complete = { ...(slotPositions || {}) }
        const defaultPositions = {
          0: { x: 50, y: 90, position: 'PT' },
          1: { x: 20, y: 70, position: 'DC' },
          2: { x: 40, y: 70, position: 'DC' },
          3: { x: 60, y: 70, position: 'DC' },
          4: { x: 80, y: 70, position: 'DC' },
          5: { x: 30, y: 50, position: 'MED' },
          6: { x: 50, y: 50, position: 'MED' },
          7: { x: 70, y: 50, position: 'MED' },
          8: { x: 25, y: 25, position: 'SP' },
          9: { x: 50, y: 25, position: 'CF' },
          10: { x: 75, y: 25, position: 'SP' }
        }
        for (let i = 0; i <= 10; i++) {
          if (!complete[i]) {
            complete[i] = defaultPositions[i] || { x: 50, y: 50, position: '?' }
          }
        }
        return complete
      }

      const slotPositions = completeSlotPositions(extractData.slot_positions)

      // 2. Salva layout
      const layoutRes = await fetch('/api/supabase/save-formation-layout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formation: extractData.formation,
          slot_positions: slotPositions
        })
      })

      const layoutData = await layoutRes.json()
      if (!layoutRes.ok) {
        throw new Error(layoutData.error || 'Errore salvataggio layout')
      }

      setShowUploadFormationModal(false)
      // Ricarica dati
      window.location.reload()
    } catch (err) {
      console.error('[GestioneFormazione] Upload formation error:', err)
      setError(err.message || 'Errore caricamento formazione')
    } finally {
      setUploadingFormation(false)
    }
  }

  const handleSelectManualFormation = async (formation, slotPositions) => {
    setUploadingFormation(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // Quando cambio formazione, mantieni i giocatori nei loro slot_index (0-10)
      // Cambiano solo le posizioni visuali (x, y) e i ruoli (position)
      // Preserva tutti gli slot 0-10 se c'è già una formazione con giocatori
      let preserveSlots = null
      if (layout?.slot_positions && titolari.length > 0) {
        // Tutte le formazioni usano sempre slot 0-10, quindi preserviamo tutti
        preserveSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      }

      // Salva nuovo layout con preservazione intelligente
      const layoutRes = await fetch('/api/supabase/save-formation-layout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formation: formation,
          slot_positions: slotPositions,
          preserve_slots: preserveSlots // Slot da preservare (mantiene giocatori)
        })
      })

      const layoutData = await layoutRes.json()
      if (!layoutRes.ok) {
        throw new Error(layoutData.error || 'Errore salvataggio layout')
      }

      setShowFormationSelectorModal(false)
      // Ricarica dati
      window.location.reload()
    } catch (err) {
      console.error('[GestioneFormazione] Manual formation error:', err)
      setError(err.message || 'Errore salvataggio formazione')
    } finally {
      setUploadingFormation(false)
    }
  }

  const handleUploadReserve = async (imageDataUrl) => {
    setUploadingReserve(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // 1. Estrai giocatore
      const extractRes = await fetch('/api/extract-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl })
      })

      const extractData = await extractRes.json()
      if (!extractRes.ok) {
        throw new Error(extractData.error || 'Errore estrazione dati')
      }

      if (!extractData.player || !extractData.player.player_name) {
        throw new Error('Impossibile estrarre dati giocatore')
      }

      // 2. Salva come riserva (slot_index = null)
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

      setShowUploadReserveModal(false)
      // Ricarica dati
      window.location.reload()
    } catch (err) {
      console.error('[GestioneFormazione] Upload reserve error:', err)
      setError(err.message || 'Errore caricamento riserva')
    } finally {
      setUploadingReserve(false)
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

  // Se non c'è layout, mostra messaggio con opzioni
  const noLayoutContent = !layout || !layout.slot_positions

  // Genera array slot 0-10 con posizioni (solo se layout esiste)
  const slots = layout?.slot_positions ? Array.from({ length: 11 }, (_, i) => ({
    slot_index: i,
    position: layout.slot_positions[i] || { x: 50, y: 50, position: '?' },
    player: titolari.find(p => p.slot_index === i) || null
  })) : []

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
          {layout?.formation && (
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: 'var(--neon-blue)'
            }}>
              {layout.formation}
            </div>
          )}
          {layout?.formation && (
            <button
              onClick={() => setShowFormationSelectorModal(true)}
              className="btn"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '14px',
                padding: '8px 16px'
              }}
            >
              <Settings size={16} />
              Cambia Formazione
            </button>
          )}
        </div>
      </div>

      {/* Se non c'è layout, mostra messaggio */}
      {noLayoutContent && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', marginBottom: '24px' }}>
          <Info size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--neon-blue)' }} />
          <div style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600 }}>
            Crea la tua formazione
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
            Seleziona una formazione tattica predefinita per iniziare. Poi potrai caricare le carte dei giocatori per ogni slot.
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFormationSelectorModal(true)}
              className="btn primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              Crea Formazione
            </button>
            <button
              onClick={() => setShowUploadFormationModal(true)}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              Importa da Screenshot (Avanzato)
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Campo 2D */}
      {!noLayoutContent && (
      <div className="card" style={{ 
        marginBottom: '32px',
        padding: '24px',
        position: 'relative',
        minHeight: '500px',
        background: `
          linear-gradient(90deg, rgba(22, 163, 74, 0.15) 0%, rgba(34, 197, 94, 0.2) 50%, rgba(22, 163, 74, 0.15) 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(34, 197, 94, 0.1) 2px,
            rgba(34, 197, 94, 0.1) 4px
          ),
          linear-gradient(180deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.3) 50%, rgba(16, 185, 129, 0.25) 100%)
        `,
        borderRadius: '16px',
        border: '2px solid rgba(0, 212, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(34, 197, 94, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Pattern texture erba */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(34, 197, 94, 0.03) 10px,
              rgba(34, 197, 94, 0.03) 20px
            )
          `,
          pointerEvents: 'none'
        }} />

        {/* Linea centrocampo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255, 255, 255, 0.4)',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
        }} />
        
        {/* Cerchio centrocampo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '120px',
          height: '120px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.2)'
        }} />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '8px',
          height: '8px',
          background: 'rgba(255, 255, 255, 0.5)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)'
        }} />

        {/* Area di rigore superiore */}
        <div style={{
          position: 'absolute',
          top: '8%',
          left: '10%',
          right: '10%',
          height: '18%',
          border: '3px solid rgba(255, 255, 255, 0.25)',
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -2px 8px rgba(255, 255, 255, 0.15)'
        }} />
        <div style={{
          position: 'absolute',
          top: '8%',
          left: '20%',
          right: '20%',
          height: '8%',
          border: '3px solid rgba(255, 255, 255, 0.25)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 -2px 6px rgba(255, 255, 255, 0.15)'
        }} />

        {/* Area di rigore inferiore */}
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '10%',
          right: '10%',
          height: '18%',
          border: '3px solid rgba(255, 255, 255, 0.25)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 8px rgba(255, 255, 255, 0.15)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '20%',
          right: '20%',
          height: '8%',
          border: '3px solid rgba(255, 255, 255, 0.25)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 2px 6px rgba(255, 255, 255, 0.15)'
        }} />

        {/* Linee laterali */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '5%',
          bottom: 0,
          width: '2px',
          background: 'rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.2)'
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: '5%',
          bottom: 0,
          width: '2px',
          background: 'rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.2)'
        }} />

        {/* Linee orizzontali (zone campo) */}
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '5%',
          right: '5%',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 4px rgba(255, 255, 255, 0.1)'
        }} />
        <div style={{
          position: 'absolute',
          top: '75%',
          left: '5%',
          right: '5%',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 4px rgba(255, 255, 255, 0.1)'
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
      )}

      {/* Riserve */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 700,
            color: 'var(--neon-purple)',
            margin: 0
          }}>
            {t('riserve')} ({riserve.length})
          </h2>
          <button
            onClick={() => setShowUploadReserveModal(true)}
            className="btn"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              background: 'rgba(168, 85, 247, 0.2)',
              borderColor: 'var(--neon-purple)',
              color: 'var(--neon-purple)'
            }}
          >
            <Plus size={16} />
            {t('loadReserve')}
          </button>
        </div>
        {riserve.length > 0 && (
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

      {/* Modal Selezione Formazione Manuale */}
      {showFormationSelectorModal && (
        <FormationSelectorModal
          onSelect={handleSelectManualFormation}
          onClose={() => setShowFormationSelectorModal(false)}
          loading={uploadingFormation}
        />
      )}

      {/* Modal Upload Formazione (Opzione Avanzata) */}
      {showUploadFormationModal && (
        <UploadModal
          title="Importa Formazione da Screenshot"
          description="Carica uno screenshot della formazione completa (11 giocatori sul campo). Questa opzione estrae automaticamente formazione e posizioni."
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

      {/* Modal Upload Giocatore per Slot */}
      {showUploadPlayerModal && selectedSlot && (
        <UploadPlayerModal
          slot={selectedSlot}
          images={uploadImages}
          onImagesChange={setUploadImages}
          onUpload={handleUploadPlayerToSlot}
          onClose={() => {
            setShowUploadPlayerModal(false)
            setUploadImages([])
            setSelectedSlot(null)
          }}
          uploading={uploadingPlayer}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
        }
        @keyframes field-shimmer {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 100% 50%;
          }
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
        width: 'clamp(90px, 8.5vw, 130px)',
        minHeight: '110px',
        padding: '10px',
        background: isEmpty 
          ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(30, 30, 30, 0.6) 100%)' 
          : 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(0, 212, 255, 0.2) 100%)',
        border: isEmpty 
          ? '2px solid rgba(255, 255, 255, 0.25)' 
          : '2px solid rgba(0, 212, 255, 0.6)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxShadow: isEmpty
          ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 4px 16px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(0, 212, 255, 0.1)',
        backdropFilter: 'blur(4px)',
        zIndex: 1
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.15)'
        e.currentTarget.style.boxShadow = isEmpty
          ? '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          : '0 8px 32px rgba(0, 212, 255, 0.4), 0 0 30px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
        e.currentTarget.style.zIndex = '10'
        e.currentTarget.style.borderColor = isEmpty 
          ? 'rgba(255, 255, 255, 0.4)' 
          : 'rgba(0, 212, 255, 0.9)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
        e.currentTarget.style.boxShadow = isEmpty
          ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 4px 16px rgba(0, 212, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(0, 212, 255, 0.1)'
        e.currentTarget.style.zIndex = '1'
        e.currentTarget.style.borderColor = isEmpty 
          ? 'rgba(255, 255, 255, 0.25)' 
          : 'rgba(0, 212, 255, 0.6)'
      }}
    >
      {isEmpty ? (
        <>
          <div style={{ 
            fontSize: '11px', 
            opacity: 0.8, 
            marginBottom: '6px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.9)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
          }}>
            Slot {slot_index}
          </div>
          <div style={{ 
            fontSize: '10px', 
            opacity: 0.7, 
            marginBottom: '10px',
            color: 'rgba(255, 255, 255, 0.8)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 500
          }}>
            {position.position || '?'}
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(0, 212, 255, 0.15)',
            border: '2px dashed rgba(0, 212, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
            transition: 'all 0.3s ease'
          }}>
            <Plus size={24} style={{ color: 'rgba(0, 212, 255, 0.8)' }} />
          </div>
          <div style={{ 
            fontSize: '10px', 
            marginTop: '4px', 
            opacity: 0.9,
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 500
          }}>
            Clicca per assegnare
          </div>
        </>
      ) : (
        <>
          <div style={{ 
            fontSize: '10px', 
            opacity: 0.8, 
            marginBottom: '6px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.7)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
          }}>
            Slot {slot_index}
          </div>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: 700, 
            marginBottom: '6px',
            color: '#ffffff',
            lineHeight: '1.2',
            wordBreak: 'break-word',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.6), 0 0 8px rgba(0, 212, 255, 0.3)',
            letterSpacing: '0.3px'
          }}>
            {player.player_name}
          </div>
          {player.overall_rating && (
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 700, 
              color: '#fbbf24',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.7), 0 0 12px rgba(251, 191, 36, 0.5)',
              marginBottom: '8px',
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.2)'
            }}>
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
                marginTop: '6px',
                padding: '4px 10px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.3) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                borderRadius: '6px',
                color: '#fecaca',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(220, 38, 38, 0.4) 100%)'
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.3) 100%)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)'
                e.currentTarget.style.transform = 'scale(1)'
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
                // Chiudi AssignModal ma mantieni selectedSlot per UploadPlayerModal
                setShowAssignModal(false)
                onUploadPhoto()
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
                onUploadPhoto()
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

// Upload Player Modal Component (per caricare nuovo giocatore con 3 immagini)
function UploadPlayerModal({ slot, images, onImagesChange, onUpload, onClose, uploading }) {
  const { t } = useTranslation()
  const imageTypes = [
    { key: 'card', label: 'Card Giocatore', icon: '👤', color: 'var(--neon-blue)' },
    { key: 'stats', label: 'Statistiche', icon: '📊', color: 'var(--neon-green)' },
    { key: 'skills', label: 'Abilità/Booster', icon: '⭐', color: 'var(--neon-orange)' }
  ]

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target.result
      const existingIndex = images.findIndex(img => img.type === type)
      
      if (existingIndex >= 0) {
        // Sostituisci immagine esistente
        const newImages = [...images]
        newImages[existingIndex] = { file, dataUrl, type, name: file.name }
        onImagesChange(newImages)
      } else {
        // Aggiungi nuova immagine
        onImagesChange([...images, { file, dataUrl, type, name: file.name }])
      }
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (type) => {
    onImagesChange(images.filter(img => img.type !== type))
  }

  const getImageForType = (type) => {
    return images.find(img => img.type === type)
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
        zIndex: 1001,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div 
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Carica Giocatore - Slot {slot.slot_index}
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

        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
          Carica fino a 3 immagini per completare il profilo del giocatore:
        </div>

        {/* Upload Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {imageTypes.map(({ key, label, icon, color }) => {
            const image = getImageForType(key)
            return (
              <div key={key} style={{ 
                padding: '16px', 
                background: 'rgba(0, 212, 255, 0.05)', 
                borderRadius: '8px',
                border: `1px solid ${image ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                  </div>
                  {image && (
                    <button
                      onClick={() => removeImage(key)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                {image ? (
                  <div>
                    <img
                      src={image.dataUrl}
                      alt={label}
                      style={{
                        width: '100%',
                        maxHeight: '200px',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    />
                    <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
                      {image.name}
                    </div>
                  </div>
                ) : (
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
                      onChange={(e) => handleFileSelect(e, key)}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    <Upload size={24} style={{ marginBottom: '8px', color }} />
                    <div style={{ fontSize: '14px' }}>Clicca per caricare {label.toLowerCase()}</div>
                  </label>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            className="btn"
            disabled={uploading}
            style={{ padding: '10px 20px' }}
          >
            Annulla
          </button>
          {images.length > 0 && (
            <button 
              onClick={onUpload} 
              className="btn primary"
              disabled={uploading}
              style={{ 
                padding: '10px 20px',
                opacity: uploading ? 0.6 : 1
              }}
            >
              {uploading ? 'Caricamento...' : `Carica Giocatore (${images.length} immagini)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Formation Selector Modal Component
function FormationSelectorModal({ onSelect, onClose, loading }) {
  const { t } = useTranslation()
  
  // Formazioni ufficiali eFootball con posizioni slot
  const formations = {
    // Moduli con 4 Difensori
    '4-3-3': {
      name: '4-3-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 35, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 65, y: 50, position: 'MED' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    '4-2-3-1': {
      name: '4-2-3-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 40, y: 60, position: 'MED' },
        6: { x: 60, y: 60, position: 'MED' },
        7: { x: 30, y: 35, position: 'TRQ' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 70, y: 35, position: 'TRQ' },
        10: { x: 50, y: 15, position: 'CF' }
      }
    },
    '4-4-2': {
      name: '4-4-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 25, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'MED' },
        8: { x: 40, y: 25, position: 'CF' },
        9: { x: 60, y: 25, position: 'CF' },
        10: { x: 50, y: 50, position: 'MED' }
      }
    },
    '4-1-2-3': {
      name: '4-1-2-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 50, y: 60, position: 'MED' },
        6: { x: 35, y: 45, position: 'MED' },
        7: { x: 65, y: 45, position: 'MED' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    '4-5-1': {
      name: '4-5-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 25, y: 50, position: 'MED' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 50, y: 50, position: 'MED' },
        8: { x: 60, y: 50, position: 'MED' },
        9: { x: 75, y: 50, position: 'MED' },
        10: { x: 50, y: 25, position: 'CF' }
      }
    },
    '4-4-1-1': {
      name: '4-4-1-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 25, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'MED' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 50, y: 50, position: 'MED' }
      }
    },
    '4-2-2-2': {
      name: '4-2-2-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 25, y: 75, position: 'TD' },
        2: { x: 40, y: 75, position: 'DC' },
        3: { x: 60, y: 75, position: 'DC' },
        4: { x: 75, y: 75, position: 'TS' },
        5: { x: 40, y: 60, position: 'MED' },
        6: { x: 60, y: 60, position: 'MED' },
        7: { x: 30, y: 35, position: 'TRQ' },
        8: { x: 70, y: 35, position: 'TRQ' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    // Moduli con 3 Difensori
    '3-5-2': {
      name: '3-5-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 20, y: 50, position: 'TD' },
        5: { x: 40, y: 50, position: 'MED' },
        6: { x: 50, y: 50, position: 'MED' },
        7: { x: 60, y: 50, position: 'MED' },
        8: { x: 80, y: 50, position: 'TS' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    '3-4-3': {
      name: '3-4-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 25, y: 50, position: 'TD' },
        5: { x: 40, y: 50, position: 'MED' },
        6: { x: 60, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'TS' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    },
    '3-1-4-2': {
      name: '3-1-4-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 50, y: 60, position: 'MED' },
        5: { x: 25, y: 50, position: 'TD' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 60, y: 50, position: 'MED' },
        8: { x: 75, y: 50, position: 'TS' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    '3-4-1-2': {
      name: '3-4-1-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 35, y: 75, position: 'DC' },
        2: { x: 50, y: 75, position: 'DC' },
        3: { x: 65, y: 75, position: 'DC' },
        4: { x: 25, y: 50, position: 'TD' },
        5: { x: 40, y: 50, position: 'MED' },
        6: { x: 60, y: 50, position: 'MED' },
        7: { x: 75, y: 50, position: 'TS' },
        8: { x: 50, y: 35, position: 'TRQ' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    // Moduli con 5 Difensori
    '5-3-2': {
      name: '5-3-2',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 50, y: 50, position: 'MED' },
        8: { x: 60, y: 50, position: 'MED' },
        9: { x: 40, y: 25, position: 'CF' },
        10: { x: 60, y: 25, position: 'CF' }
      }
    },
    '5-4-1': {
      name: '5-4-1',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 35, y: 50, position: 'MED' },
        7: { x: 50, y: 50, position: 'MED' },
        8: { x: 65, y: 50, position: 'MED' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 50, y: 50, position: 'MED' }
      }
    },
    '5-2-3': {
      name: '5-2-3',
      slot_positions: {
        0: { x: 50, y: 90, position: 'PT' },
        1: { x: 20, y: 75, position: 'TD' },
        2: { x: 35, y: 75, position: 'DC' },
        3: { x: 50, y: 75, position: 'DC' },
        4: { x: 65, y: 75, position: 'DC' },
        5: { x: 80, y: 75, position: 'TS' },
        6: { x: 40, y: 50, position: 'MED' },
        7: { x: 60, y: 50, position: 'MED' },
        8: { x: 25, y: 25, position: 'SP' },
        9: { x: 50, y: 25, position: 'CF' },
        10: { x: 75, y: 25, position: 'SP' }
      }
    }
  }

  const [selectedFormation, setSelectedFormation] = React.useState(null)

  const handleConfirm = () => {
    if (selectedFormation && formations[selectedFormation]) {
      onSelect(formations[selectedFormation].name, formations[selectedFormation].slot_positions)
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
        zIndex: 1001,
        padding: '24px'
      }}
      onClick={onClose}
    >
      <div 
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'rgba(10, 14, 39, 0.95)',
          border: '2px solid var(--neon-blue)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Seleziona Formazione Tattica
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

        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
          Scegli una formazione tattica ufficiale eFootball. I giocatori già assegnati verranno mantenuti nelle loro posizioni, cambieranno solo le coordinate visuali sul campo.
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {Object.keys(formations).map((key) => {
            const formation = formations[key]
            const isSelected = selectedFormation === key
            return (
              <button
                key={key}
                onClick={() => setSelectedFormation(key)}
                style={{
                  padding: '16px',
                  background: isSelected ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 212, 255, 0.05)',
                  border: `2px solid ${isSelected ? 'var(--neon-blue)' : 'rgba(0, 212, 255, 0.3)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: isSelected ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.9)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.target.style.background = 'rgba(0, 212, 255, 0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.target.style.background = 'rgba(0, 212, 255, 0.05)'
                  }
                }}
              >
                {formation.name}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            className="btn"
            disabled={loading}
            style={{ padding: '10px 20px' }}
          >
            Annulla
          </button>
          {selectedFormation && (
            <button 
              onClick={handleConfirm} 
              className="btn primary"
              disabled={loading}
              style={{ 
                padding: '10px 20px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Salvataggio...' : 'Conferma Formazione'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
