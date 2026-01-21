'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, Info, X, Plus, User, Settings, BarChart3, Zap, Gift, ChevronDown, ChevronUp, Users, Star, Move } from 'lucide-react'
import TacticalSettingsPanel from '@/components/TacticalSettingsPanel'

export default function GestioneFormazionePage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [layout, setLayout] = React.useState(null) // { formation, slot_positions }
  const [titolari, setTitolari] = React.useState([]) // Giocatori con slot_index 0-10
  const [riserve, setRiserve] = React.useState([]) // Giocatori con slot_index NULL
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [toast, setToast] = React.useState(null) // { message, type: 'success' | 'error' }
  const [selectedSlot, setSelectedSlot] = React.useState(null) // { slot_index, position }
  const [selectedReserve, setSelectedReserve] = React.useState(null) // Player ID per visualizzare statistiche riserva
  const [showAssignModal, setShowAssignModal] = React.useState(false)
  const [assigning, setAssigning] = React.useState(false)
  const [showFormationSelectorModal, setShowFormationSelectorModal] = React.useState(false)
  const [showUploadFormationModal, setShowUploadFormationModal] = React.useState(false)
  const [showUploadReserveModal, setShowUploadReserveModal] = React.useState(false)
  const [uploadingFormation, setUploadingFormation] = React.useState(false)
  const [uploadingReserve, setUploadingReserve] = React.useState(false)
  const [showUploadPlayerModal, setShowUploadPlayerModal] = React.useState(false)
  const [uploadImages, setUploadImages] = React.useState([])
  const [uploadReserveImages, setUploadReserveImages] = React.useState([])
  const [uploadingPlayer, setUploadingPlayer] = React.useState(false)
  const [activeCoach, setActiveCoach] = React.useState(null)
  const [tacticalSettings, setTacticalSettings] = React.useState(null)
  const [savingTacticalSettings, setSavingTacticalSettings] = React.useState(false)

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

        // 2. Carica stili di gioco (per lookup)
        const { data: playingStyles, error: stylesError } = await supabase
          .from('playing_styles')
          .select('id, name')
        
        const stylesLookup = {}
        if (playingStyles && !stylesError) {
          playingStyles.forEach(style => {
            stylesLookup[style.id] = style.name
          })
        }

        // 3. Carica giocatori
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
            slot_index: p.slot_index != null ? Number(p.slot_index) : null,
            // Dati aggiuntivi per visualizzazione
            age: p.age != null ? Number(p.age) : null,
            club_name: p.club_name ? String(p.club_name).trim() : null,
            nationality: p.nationality ? String(p.nationality).trim() : null,
            role: p.role ? String(p.role).trim() : null,
            playing_style_id: p.playing_style_id || null,
            playing_style_name: p.playing_style_id && stylesLookup[p.playing_style_id] 
              ? stylesLookup[p.playing_style_id] 
              : null,
            // Includi tutti i dati estratti per visualizzazione nel modal
            base_stats: p.base_stats || null,
            skills: p.skills || null,
            com_skills: p.com_skills || null,
            available_boosters: p.available_boosters || null,
            photo_slots: p.photo_slots || null
          }))

        const titolariArray = playersArray
          .filter(p => p.slot_index !== null && p.slot_index >= 0 && p.slot_index <= 10)
          .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
        
        const riserveArray = playersArray
          .filter(p => p.slot_index === null)
          .sort((a, b) => (a.player_name || '').localeCompare(b.player_name || ''))

        setTitolari(titolariArray)
        setRiserve(riserveArray)

        // 4. Carica allenatore attivo
        const { data: coachData, error: coachError } = await supabase
          .from('coaches')
          .select('*')
          .eq('is_active', true)
          .maybeSingle()

        if (!coachError && coachData) {
          setActiveCoach(coachData)
        }

        // 5. Carica impostazioni tattiche
        const { data: tacticalSettingsData, error: tacticalError } = await supabase
          .from('team_tactical_settings')
          .select('*')
          .maybeSingle()

        if (!tacticalError && tacticalSettingsData) {
          setTacticalSettings(tacticalSettingsData)
        }
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
      // CONTROLLI INCROCIATI: verifica duplicati sia in campo che in riserve
      const playerToAssign = riserve.find(p => p.id === playerId)
      if (!playerToAssign) {
        throw new Error('Giocatore non trovato nelle riserve')
      }
      
      const playerName = String(playerToAssign.player_name || '').trim().toLowerCase()
      const playerAge = playerToAssign.age != null ? Number(playerToAssign.age) : null
      
      // 1. Verifica duplicati in CAMPO (titolari)
      const duplicateInField = titolari.find(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null
        
        // Match esatto se nome+età corrispondono
        if (playerName && pName && playerAge && pAge) {
          return pName === playerName && pAge === playerAge && p.slot_index !== selectedSlot.slot_index
        }
        // Fallback: solo nome se età non disponibile
        if (playerName && pName) {
          return pName === playerName && p.slot_index !== selectedSlot.slot_index
        }
        return false
      })

      // 2. Verifica duplicati in RISERVE (oltre a quello che stiamo assegnando)
      const duplicateInReserves = riserve.filter(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null
        return p.id !== playerId && // Escludi riserva che stiamo assegnando
               pName === playerName && 
               (playerAge ? pAge === playerAge : (playerAge === null && pAge === null))
      })

      // Se ci sono duplicati, gestisci
      if (duplicateInField || duplicateInReserves.length > 0) {
        let errorMsg = `Il giocatore "${playerToAssign.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} è già presente:`
        if (duplicateInField) {
          errorMsg += `\n- In campo nello slot ${duplicateInField.slot_index}`
        }
        if (duplicateInReserves.length > 0) {
          errorMsg += `\n- Nelle riserve (${duplicateInReserves.length} duplicato/i)`
        }
        errorMsg += `\n\nVuoi eliminare i duplicati e procedere?`
        
        if (!window.confirm(errorMsg)) {
          setAssigning(false)
          return
        }
        
        // Elimina duplicati in riserve
        if (duplicateInReserves.length > 0) {
          const { data: session } = await supabase.auth.getSession()
          if (!session?.session?.access_token) {
            throw new Error('Sessione scaduta')
          }
          
          for (const dup of duplicateInReserves) {
            const deleteRes = await fetch('/api/supabase/delete-player', {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${session.session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ player_id: dup.id })
            })
            if (!deleteRes.ok) {
              const deleteData = await deleteRes.json()
              throw new Error(deleteData.error || `Errore eliminazione duplicato riserva: ${dup.player_name}`)
            }
          }
        }
      }

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

      // Messaggio di successo
      showToast(t('playerAssignedSuccessfully'), 'success')
      
      // Ricarica dati
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      console.error('[GestioneFormazione] Assign error:', err)
      setError(err.message || 'Errore assegnazione giocatore')
      showToast(err.message || t('errorAssigningPlayer'), 'error')
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

      // Rimuovi da slot tramite endpoint API
      const res = await fetch('/api/supabase/remove-player-from-slot', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
      })

      const data = await res.json()
      if (!res.ok) {
        // Se è errore di duplicato riserva, gestisci
        if (data.duplicate_reserve_id) {
          const confirmMsg = `Il giocatore "${data.duplicate_player_name || 'questo giocatore'}"${data.duplicate_player_age ? ` (${data.duplicate_player_age} anni)` : ''} è già presente nelle riserve. Vuoi eliminare il duplicato nelle riserve?`
          if (window.confirm(confirmMsg)) {
            // Elimina duplicato riserva
            const deleteRes = await fetch('/api/supabase/delete-player', {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${session.session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ player_id: data.duplicate_reserve_id })
            })
            if (deleteRes.ok) {
              // Riprova rimozione
              const retryRes = await fetch('/api/supabase/remove-player-from-slot', {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${session.session.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ player_id: playerId })
              })
              const retryData = await retryRes.json()
              if (!retryRes.ok) {
                throw new Error(retryData.error || 'Errore rimozione dopo eliminazione duplicato')
              }
            } else {
              throw new Error('Errore eliminazione giocatore duplicato riserva')
            }
          } else {
            throw new Error('Operazione annullata: giocatore già presente nelle riserve')
          }
        } else {
          throw new Error(data.error || 'Errore rimozione')
        }
      }

      // Messaggio di successo
      showToast(t('playerMovedToReserves'), 'success')
      
      // Ricarica dati
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      console.error('[GestioneFormazione] Remove error:', err)
      setError(err.message || 'Errore rimozione giocatore')
      showToast(err.message || t('errorMovingPlayer'), 'error')
    } finally {
      setAssigning(false)
    }
  }

  // Elimina definitivamente giocatore (sia titolare che riserva)
  const handleDeletePlayer = async (playerId) => {
    if (!supabase) return

    if (!confirm('Sei sicuro di voler eliminare definitivamente questo giocatore? Questa azione non può essere annullata.')) {
      return
    }

    setAssigning(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      // Elimina giocatore tramite endpoint API
      const res = await fetch('/api/supabase/delete-player', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore eliminazione')
      }

      // Chiudi modal se aperto
      setShowAssignModal(false)
      setSelectedSlot(null)

      // Messaggio di successo
      showToast(t('playerDeletedSuccessfully'), 'success')

      // Ricarica dati
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      console.error('[GestioneFormazione] Delete player error:', err)
      setError(err.message || 'Errore eliminazione giocatore')
      showToast(err.message || t('errorDeletingPlayer'), 'error')
    } finally {
      setAssigning(false)
    }
  }

  // Elimina giocatore dalle riserve (cancellazione completa)
  const handleDeleteReserve = async (playerId) => {
    if (!supabase) return

    if (!confirm('Sei sicuro di voler eliminare definitivamente questo giocatore dalle riserve?')) {
      return
    }

    setAssigning(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      // Elimina giocatore tramite endpoint API
      const res = await fetch('/api/supabase/delete-player', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore eliminazione')
      }

      // Ricarica dati
      window.location.reload()
    } catch (err) {
      console.error('[GestioneFormazione] Delete reserve error:', err)
      setError(err.message || 'Errore eliminazione giocatore')
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
      const photoSlots = {} // Traccia quali foto sono state caricate
      const errors = [] // Raccogli errori per mostrare messaggio specifico

      for (const img of uploadImages) {
        const extractRes = await fetch('/api/extract-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: img.dataUrl })
        })

        const extractData = await extractRes.json()
        if (!extractRes.ok) {
          const errorMsg = extractData.error || 'Errore sconosciuto'
          console.warn('[UploadPlayer] Errore estrazione:', errorMsg)
          errors.push(errorMsg)
          continue
        }

        if (extractData.player) {
          // Merge dati (prima immagine = dati base)
          if (!playerData) {
            playerData = extractData.player
          } else {
            // Validazione: verifica che nome+età corrispondano (se presenti)
            const currentName = String(extractData.player.player_name || '').trim().toLowerCase()
            const currentAge = extractData.player.age != null ? Number(extractData.player.age) : null
            const existingName = String(playerData.player_name || '').trim().toLowerCase()
            const existingAge = playerData.age != null ? Number(playerData.age) : null
            
            // Se entrambi hanno nome+età, devono corrispondere
            if (currentName && existingName && currentAge && existingAge) {
              if (currentName !== existingName || currentAge !== existingAge) {
                throw new Error(`Le immagini appartengono a giocatori diversi: "${playerData.player_name}" (${existingAge}) vs "${extractData.player.player_name}" (${currentAge}). Verifica le immagini.`)
              }
            }
            
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
          
          // Traccia foto caricate basandosi sul tipo
          if (img.type === 'card') {
            photoSlots.card = true
          } else if (img.type === 'stats') {
            photoSlots.statistiche = true
          } else if (img.type === 'skills') {
            photoSlots.abilita = true
            // Se ci sono booster estratti dalla stessa foto, traccia anche booster
            if (extractData.player?.boosters && Array.isArray(extractData.player.boosters) && extractData.player.boosters.length > 0) {
              photoSlots.booster = true
            }
          } else if (img.type === 'booster') {
            photoSlots.booster = true
          }
        }
      }

      // Se tutte le immagini sono fallite, mostra errore specifico
      if (!playerData || !playerData.player_name) {
        if (errors.length > 0) {
          // Se c'è un errore di quota OpenAI, mostralo chiaramente
          const quotaError = errors.find(e => e.includes('quota') || e.includes('billing'))
          if (quotaError) {
            throw new Error('Quota OpenAI esaurita. Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing')
          }
          // Altrimenti mostra il primo errore specifico
          throw new Error(`Errore estrazione dati: ${errors[0]}`)
        }
        throw new Error('Errore: dati giocatore non estratti. Verifica le immagini e riprova.')
      }

      // Validazione duplicati: verifica se stesso giocatore (nome+età) già presente nei titolari
      const playerName = String(playerData.player_name || '').trim().toLowerCase()
      const playerAge = playerData.age != null ? Number(playerData.age) : null
      
      const duplicatePlayer = titolari.find(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null
        
        // Match esatto se nome+età corrispondono
        if (playerName && pName && playerAge && pAge) {
          return pName === playerName && pAge === pAge && p.slot_index !== selectedSlot.slot_index
        }
        // Fallback: solo nome se età non disponibile
        if (playerName && pName) {
          return pName === playerName && p.slot_index !== selectedSlot.slot_index
        }
        return false
      })

      if (duplicatePlayer) {
        const confirmMsg = `Il giocatore "${playerData.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} è già presente in formazione nello slot ${duplicatePlayer.slot_index}. Vuoi sostituirlo?`
        if (!window.confirm(confirmMsg)) {
          setUploadingPlayer(false)
          return
        }
        
        // Verifica duplicati riserve prima di rimuovere vecchio titolare
        const duplicateReserve = riserve.find(p => {
          const pName = String(p.player_name || '').trim().toLowerCase()
          const pAge = p.age != null ? Number(p.age) : null
          return pName === playerName && 
                 (playerAge ? pAge === playerAge : true) &&
                 p.id !== duplicatePlayer.id
        })
        
        if (duplicateReserve) {
          // Elimina duplicato riserva prima di rimuovere titolare
          const deleteRes = await fetch('/api/supabase/delete-player', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ player_id: duplicateReserve.id })
          })
          if (!deleteRes.ok) {
            const deleteData = await deleteRes.json()
            throw new Error(deleteData.error || 'Errore eliminazione giocatore duplicato riserva')
          }
        }
        
        // Rimuovi vecchio giocatore (torna riserva)
        await supabase
          .from('players')
          .update({ 
            slot_index: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', duplicatePlayer.id)
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
            slot_index: selectedSlot.slot_index,
            photo_slots: photoSlots // Includi photo_slots tracciati
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
      
      // Messaggio di successo
      showToast(t('photoUploadedSuccessfully'), 'success')
      
      // Ricarica dati
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      console.error('[GestioneFormazione] Upload player error:', err)
      setError(err.message || 'Errore caricamento giocatore')
      showToast(err.message || t('errorUploadingPhoto'), 'error')
    } finally {
      setUploadingPlayer(false)
    }
  }

  // Salva impostazioni tattiche
  const handleSaveTacticalSettings = async (settings) => {
    setSavingTacticalSettings(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      const res = await fetch('/api/supabase/save-tactical-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore salvataggio impostazioni tattiche')
      }

      // Aggiorna state locale
      setTacticalSettings(data.settings)
      
      // Messaggio di successo
      showToast(t('tacticalSettingsSaved'), 'success')
      
      // Ricarica per aggiornare UI (stesso pattern esistente)
      setTimeout(() => window.location.reload(), 500)
    } catch (err) {
      console.error('[GestioneFormazione] Save tactical settings error:', err)
      setError(err.message || 'Errore salvataggio impostazioni tattiche')
      showToast(err.message || t('errorSavingTacticalSettings'), 'error')
    } finally {
      setSavingTacticalSettings(false)
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
        const errorMsg = extractData.error || 'Errore estrazione formazione'
        // Se c'è un errore di quota OpenAI, mostralo chiaramente
        if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
          throw new Error('Quota OpenAI esaurita. Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing')
        }
        throw new Error(errorMsg)
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

  const handleUploadReserve = async () => {
    if (uploadReserveImages.length === 0) return

    setUploadingReserve(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      const token = session.session.access_token

      // Carica tutte le immagini e estrai dati (stessa logica di handleUploadPlayerToSlot)
      let playerData = null
      let allExtractedData = {}
      const photoSlots = {} // Traccia quali foto sono state caricate
      const errors = [] // Raccogli errori per mostrare messaggio specifico

      for (const img of uploadReserveImages) {
        const extractRes = await fetch('/api/extract-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: img.dataUrl })
        })

        const extractData = await extractRes.json()
        if (!extractRes.ok) {
          const errorMsg = extractData.error || 'Errore sconosciuto'
          console.warn('[UploadReserve] Errore estrazione:', errorMsg)
          errors.push(errorMsg)
          continue
        }

        if (extractData.player) {
          // Merge dati (prima immagine = dati base)
          if (!playerData) {
            playerData = extractData.player
          } else {
            // Validazione: verifica che nome+età corrispondano (se presenti)
            const currentName = String(extractData.player.player_name || '').trim().toLowerCase()
            const currentAge = extractData.player.age != null ? Number(extractData.player.age) : null
            const existingName = String(playerData.player_name || '').trim().toLowerCase()
            const existingAge = playerData.age != null ? Number(playerData.age) : null
            
            // Se entrambi hanno nome+età, devono corrispondere
            if (currentName && existingName && currentAge && existingAge) {
              if (currentName !== existingName || currentAge !== existingAge) {
                throw new Error(`Le immagini appartengono a giocatori diversi: "${playerData.player_name}" (${existingAge}) vs "${extractData.player.player_name}" (${currentAge}). Verifica le immagini.`)
              }
            }
            
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
          
          // Traccia foto caricate basandosi sul tipo
          if (img.type === 'card') {
            photoSlots.card = true
          } else if (img.type === 'stats') {
            photoSlots.statistiche = true
          } else if (img.type === 'skills') {
            photoSlots.abilita = true
            // Se ci sono booster estratti dalla stessa foto, traccia anche booster
            if (extractData.player?.boosters && Array.isArray(extractData.player.boosters) && extractData.player.boosters.length > 0) {
              photoSlots.booster = true
            }
          } else if (img.type === 'booster') {
            photoSlots.booster = true
          }
        }
      }

      // Se tutte le immagini sono fallite, mostra errore specifico
      if (!playerData || !playerData.player_name) {
        if (errors.length > 0) {
          // Se c'è un errore di quota OpenAI, mostralo chiaramente
          const quotaError = errors.find(e => e.includes('quota') || e.includes('billing'))
          if (quotaError) {
            throw new Error('Quota OpenAI esaurita. Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing')
          }
          // Altrimenti mostra il primo errore specifico
          throw new Error(`Errore estrazione dati: ${errors[0]}`)
        }
        throw new Error('Errore: dati giocatore non estratti. Verifica le immagini e riprova.')
      }

      // Validazione duplicati riserve: verifica se stesso giocatore (nome+età) già presente nelle riserve
      const playerName = String(playerData.player_name || '').trim().toLowerCase()
      const playerAge = playerData.age != null ? Number(playerData.age) : null
      
      const duplicateReserve = riserve.find(p => {
        const pName = String(p.player_name || '').trim().toLowerCase()
        const pAge = p.age != null ? Number(p.age) : null
        
        // Match esatto se nome+età corrispondono
        if (playerName && pName && playerAge && pAge) {
          return pName === playerName && pAge === playerAge
        }
        // Fallback: solo nome se età non disponibile
        if (playerName && pName) {
          return pName === playerName
        }
        return false
      })

      if (duplicateReserve) {
        const confirmMsg = `Il giocatore "${playerData.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} è già presente nelle riserve. Vuoi sostituirlo con i nuovi dati?`
        if (!window.confirm(confirmMsg)) {
          setUploadingReserve(false)
          return
        }
        // Elimina vecchio giocatore riserva
        const deleteRes = await fetch('/api/supabase/delete-player', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ player_id: duplicateReserve.id })
        })
        if (!deleteRes.ok) {
          const deleteData = await deleteRes.json()
          throw new Error(deleteData.error || 'Errore eliminazione giocatore duplicato')
        }
      }

      // Salva come riserva (slot_index = null)
      const saveRes = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          player: {
            ...playerData,
            slot_index: null, // Riserva
            photo_slots: photoSlots // Includi photo_slots tracciati
          }
        })
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        // Se è un errore di duplicato riserva, mostra messaggio chiaro
        if (saveData.is_reserve && saveData.duplicate_player_id) {
          const confirmMsg = `Il giocatore "${playerData.player_name}"${playerAge ? ` (${playerAge} anni)` : ''} è già presente nelle riserve. Vuoi sostituirlo con i nuovi dati?`
          if (window.confirm(confirmMsg)) {
            // Elimina vecchio giocatore e riprova
            const deleteRes = await fetch('/api/supabase/delete-player', {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ player_id: saveData.duplicate_player_id })
            })
            if (deleteRes.ok) {
              // Riprova salvataggio
              const retryRes = await fetch('/api/supabase/save-player', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  player: {
                    ...playerData,
                    slot_index: null,
                    photo_slots: photoSlots
                  }
                })
              })
              const retryData = await retryRes.json()
              if (!retryRes.ok) {
                throw new Error(retryData.error || 'Errore salvataggio giocatore dopo sostituzione')
              }
            } else {
              throw new Error('Errore eliminazione giocatore duplicato')
            }
          } else {
            return // Utente ha annullato
          }
        } else {
          throw new Error(saveData.error || 'Errore salvataggio giocatore')
        }
      }

      setShowUploadReserveModal(false)
      setUploadReserveImages([])
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

  // Calcola collisioni e offset per evitare sovrapposizioni
  const calculateCardOffsets = (slots) => {
    const CARD_WIDTH_PX = 150 // Larghezza approssimativa card in px
    const CARD_HEIGHT_PX = 160 // Altezza approssimativa card in px
    const MIN_DISTANCE_X = 12 // Distanza minima in % per evitare collisioni
    const MIN_DISTANCE_Y = 15 // Distanza minima in % per evitare collisioni
    
    return slots.map((slot, index) => {
      let offsetX = 0
      let offsetY = 0
      let hasNearbyCards = false
      
      // Controlla collisioni con altri slot
      slots.forEach((otherSlot, otherIndex) => {
        if (index === otherIndex) return
        
        const dx = Math.abs(slot.position.x - otherSlot.position.x)
        const dy = Math.abs(slot.position.y - otherSlot.position.y)
        
        // Se sono sulla stessa linea orizzontale (Y simile) e troppo vicini in X
        if (dy < MIN_DISTANCE_Y && dx < MIN_DISTANCE_X) {
          hasNearbyCards = true
          // Sposta leggermente verso l'esterno
          if (slot.position.x < otherSlot.position.x) {
            offsetX -= 1.5 // Sposta a sinistra
          } else {
            offsetX += 1.5 // Sposta a destra
          }
        }
        
        // Se sono sulla stessa linea verticale (X simile) e troppo vicini in Y
        if (dx < MIN_DISTANCE_X && dy < MIN_DISTANCE_Y && dy > 0) {
          hasNearbyCards = true
          if (slot.position.y < otherSlot.position.y) {
            offsetY -= 1.5 // Sposta in alto
          } else {
            offsetY += 1.5 // Sposta in basso
          }
        }
      })
      
      return {
        ...slot,
        offsetX,
        offsetY,
        hasNearbyCards
      }
    })
  }

  const slotsWithOffsets = layout?.slot_positions ? calculateCardOffsets(slots) : []

  // Funzione helper per mostrare toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000) // Auto-dismiss dopo 4 secondi
  }

  // Auto-dismiss toast
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  return (
    <main style={{ padding: '16px', minHeight: '100vh', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          background: toast.type === 'success' 
            ? 'rgba(34, 197, 94, 0.95)' 
            : 'rgba(239, 68, 68, 0.95)',
          border: `2px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          maxWidth: '500px',
          animation: 'slideInRight 0.3s ease-out',
          backdropFilter: 'blur(8px)'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} color="#ffffff" />
          ) : (
            <AlertCircle size={20} color="#ffffff" />
          )}
          <span style={{ 
            color: '#ffffff', 
            fontSize: '14px', 
            fontWeight: 600,
            flex: 1
          }}>
            {toast.message}
          </span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
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
          <LanguageSwitch />
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
              {t('changeFormation')}
            </button>
          )}
          <button
            onClick={() => router.push('/allenatori')}
            className="btn"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px',
              padding: '8px 16px'
            }}
          >
            <Users size={16} />
            {t('coachesLink')}
          </button>
        </div>
      </div>

      {/* Info Allenatore Attivo */}
      {activeCoach && (
        <div className="card" style={{ 
          marginBottom: '24px',
          padding: '16px', 
          background: 'rgba(0, 212, 255, 0.05)',
          border: '2px solid var(--neon-blue)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Star size={20} fill="var(--neon-blue)" color="var(--neon-blue)" />
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>
                {t('coachActiveTitle')}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                {activeCoach.coach_name}
              </div>
              {activeCoach.team && (
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {activeCoach.team}
                </div>
              )}
            </div>
          </div>
          {activeCoach.playing_style_competence && typeof activeCoach.playing_style_competence === 'object' && (
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {Object.entries(activeCoach.playing_style_competence)
                .filter(([_, value]) => value != null)
                .slice(0, 3)
                .map(([style, value]) => (
                  <span key={style} style={{ marginRight: '12px' }}>
                    {t(style) || style.replace(/_/g, ' ')}: <strong>{value}</strong>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Se non c'è layout, mostra messaggio */}
      {noLayoutContent && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', marginBottom: '24px' }}>
          <Info size={48} style={{ marginBottom: '16px', opacity: 0.5, color: 'var(--neon-blue)' }} />
          <div style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600 }}>
            {t('createFormation')}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
            {t('selectFormationDesc')}
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowFormationSelectorModal(true)}
              className="btn primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} />
              {t('createFormationBtn')}
            </button>
            <button
              onClick={() => setShowUploadFormationModal(true)}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              {t('importFromScreenshot')}
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

      {/* Campo 2D - Full Width come prima */}
      {!noLayoutContent && (
      <>
        {/* Campo 2D */}
        <div className="card" style={{ 
        marginBottom: '24px',
        padding: 'clamp(16px, 2vw, 24px)',
        position: 'relative',
        maxWidth: 'clamp(540px, 45vw, 720px)',
        minHeight: 'clamp(292px, 39vh, 422px)',
        aspectRatio: '2/3',
        margin: '0 auto',
        background: `
          linear-gradient(180deg, rgba(5, 8, 21, 0.4) 0%, rgba(10, 14, 39, 0.3) 50%, rgba(5, 8, 21, 0.4) 100%),
          linear-gradient(90deg, rgba(22, 163, 74, 0.08) 0%, rgba(34, 197, 94, 0.12) 50%, rgba(22, 163, 74, 0.08) 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(34, 197, 94, 0.05) 2px,
            rgba(34, 197, 94, 0.05) 4px
          ),
          linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.15) 50%, rgba(16, 185, 129, 0.12) 100%)
        `,
        borderRadius: '16px',
        border: '2px solid rgba(0, 212, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(34, 197, 94, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Pattern texture erba - ridotto opacità */}
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
              rgba(34, 197, 94, 0.015) 10px,
              rgba(34, 197, 94, 0.015) 20px
            )
          `,
          pointerEvents: 'none',
          opacity: 0.6
        }} />
        
        {/* Overlay scuro per dissolvenza e contrasto */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(ellipse at center, transparent 0%, rgba(5, 8, 21, 0.3) 100%),
            linear-gradient(180deg, rgba(5, 8, 21, 0.2) 0%, transparent 20%, transparent 80%, rgba(5, 8, 21, 0.2) 100%)
          `,
          pointerEvents: 'none'
        }} />

        {/* Linea centrocampo - più visibile */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255, 255, 255, 0.5)',
          transform: 'translateY(-50%)',
          boxShadow: '0 0 12px rgba(255, 255, 255, 0.4)'
        }} />
        
        {/* Cerchio centrocampo - più visibile */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '120px',
          height: '120px',
          border: '3px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 16px rgba(255, 255, 255, 0.3)'
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

        {/* Area di rigore superiore - più visibile */}
        <div style={{
          position: 'absolute',
          top: '8%',
          left: '10%',
          right: '10%',
          height: '18%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderBottom: 'none',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -2px 10px rgba(255, 255, 255, 0.2)'
        }} />
        <div style={{
          position: 'absolute',
          top: '8%',
          left: '20%',
          right: '20%',
          height: '8%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 -2px 8px rgba(255, 255, 255, 0.2)'
        }} />

        {/* Area di rigore inferiore - più visibile */}
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '10%',
          right: '10%',
          height: '18%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '8%',
          left: '20%',
          right: '20%',
          height: '8%',
          border: '3px solid rgba(255, 255, 255, 0.35)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 2px 8px rgba(255, 255, 255, 0.2)'
        }} />

        {/* Linee laterali - più visibili */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '5%',
          bottom: 0,
          width: '2px',
          background: 'rgba(255, 255, 255, 0.4)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: '5%',
          bottom: 0,
          width: '2px',
          background: 'rgba(255, 255, 255, 0.4)',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
        }} />

        {/* Linee orizzontali (zone campo) - più visibili */}
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '5%',
          right: '5%',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.25)',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.15)'
        }} />
        <div style={{
          position: 'absolute',
          top: '75%',
          left: '5%',
          right: '5%',
          height: '1px',
          background: 'rgba(255, 255, 255, 0.25)',
          boxShadow: '0 0 6px rgba(255, 255, 255, 0.15)'
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

        {/* Pannello Impostazioni Tattiche - Collassabile sotto il campo */}
        <TacticalSettingsPanel
          titolari={titolari}
          tacticalSettings={tacticalSettings}
          onSave={handleSaveTacticalSettings}
          saving={savingTacticalSettings}
        />
      </>
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(150px, 18vw, 200px), 1fr))',
            gap: 'clamp(12px, 1.5vw, 16px)'
          }}>
            {riserve.map((player) => (
              <ReserveCard 
                key={player.id}
                player={player}
                onClick={() => {
                  if (selectedSlot && showAssignModal) {
                    // Se il modal di assegnazione è aperto, assegna il giocatore
                    handleAssignFromReserve(player.id)
                  } else {
                    // Altrimenti, apri il modal con le statistiche
                    setSelectedReserve(player.id)
                    setShowAssignModal(true)
                  }
                }}
                disabled={false}
                onDelete={() => handleDeleteReserve(player.id)}
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

      {/* Modal Assegnazione / Visualizzazione Statistiche */}
      {showAssignModal && (selectedSlot || selectedReserve) && (
        <AssignModal
          slot={selectedSlot}
          currentPlayer={
            selectedReserve 
              ? riserve.find(p => p.id === selectedReserve)
              : slots.find(s => s.slot_index === selectedSlot.slot_index)?.player
          }
          riserve={riserve}
          onAssignFromReserve={handleAssignFromReserve}
          onUploadPhoto={handleUploadPhoto}
          onDelete={currentPlayer => handleDeletePlayer(currentPlayer.id)}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedSlot(null)
            setSelectedReserve(null)
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
        <UploadPlayerModal
          slot={{ slot_index: null, position: { x: 50, y: 50, position: 'RESERVE' } }}
          images={uploadReserveImages}
          onImagesChange={setUploadReserveImages}
          onUpload={handleUploadReserve}
          onClose={() => {
            setShowUploadReserveModal(false)
            setUploadReserveImages([])
          }}
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
              {uploading ? t('loading') : t('upload')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Slot Card Component - Badge Minimale (solo nome)
function SlotCard({ slot, onClick, onRemove }) {
  const { t } = useTranslation()
  const { slot_index, position, player, offsetX = 0, offsetY = 0, hasNearbyCards = false } = slot
  const isEmpty = !player

  // Abbrevia nome se troppo lungo
  const getDisplayName = (name) => {
    if (!name) return ''
    if (name.length <= 12) return name
    // Prendi primo nome o abbrevia
    const parts = name.split(' ')
    if (parts.length > 1) {
      return parts[0] + ' ' + parts[parts.length - 1].charAt(0) + '.'
    }
    return name.substring(0, 10) + '...'
  }

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${position.x + offsetX}%`,
        top: `${position.y + offsetY}%`,
        transform: 'translate(-50%, -50%)',
        padding: isEmpty ? '6px 12px' : '5px 12px',
        background: isEmpty 
          ? 'rgba(15, 23, 42, 0.85)' 
          : 'rgba(59, 130, 246, 0.75)',
        border: isEmpty 
          ? '1.5px solid rgba(148, 163, 184, 0.5)' 
          : '1.5px solid rgba(147, 51, 234, 0.8)',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        boxShadow: isEmpty
          ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 4px 16px rgba(59, 130, 246, 0.4), 0 0 20px rgba(147, 51, 234, 0.3)',
        backdropFilter: 'blur(8px)',
        zIndex: hasNearbyCards ? 2 : 1,
        minWidth: 'auto',
        maxWidth: 'clamp(70px, 10vw, 120px)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'
        e.currentTarget.style.boxShadow = isEmpty
          ? '0 6px 20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)'
          : '0 6px 24px rgba(59, 130, 246, 0.6), 0 0 30px rgba(147, 51, 234, 0.5)'
        e.currentTarget.style.zIndex = '100'
        e.currentTarget.style.borderColor = isEmpty 
          ? 'rgba(148, 163, 184, 0.7)' 
          : 'rgba(147, 51, 234, 1)'
        e.currentTarget.style.background = isEmpty
          ? 'rgba(15, 23, 42, 0.95)'
          : 'rgba(59, 130, 246, 0.9)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
        e.currentTarget.style.boxShadow = isEmpty
          ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 4px 16px rgba(59, 130, 246, 0.4), 0 0 20px rgba(147, 51, 234, 0.3)'
        e.currentTarget.style.zIndex = hasNearbyCards ? '2' : '1'
        e.currentTarget.style.borderColor = isEmpty 
          ? 'rgba(148, 163, 184, 0.5)' 
          : 'rgba(147, 51, 234, 0.8)'
        e.currentTarget.style.background = isEmpty
          ? 'rgba(15, 23, 42, 0.85)'
          : 'rgba(59, 130, 246, 0.75)'
      }}
    >
      {isEmpty ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: 'clamp(10px, 1.1vw, 12px)',
          fontWeight: 700,
          color: 'rgba(148, 163, 184, 0.95)',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)'
        }}>
          <Plus size={14} />
          <span>{position.position || '?'}</span>
        </div>
      ) : (
        <div style={{
          fontSize: 'clamp(10px, 1.1vw, 13px)',
          fontWeight: 700,
          color: '#ffffff',
          textShadow: '0 2px 6px rgba(0, 0, 0, 0.8), 0 0 12px rgba(59, 130, 246, 0.5)',
          letterSpacing: '0.3px'
        }}>
          {getDisplayName(player.player_name)}
        </div>
      )}
    </div>
  )
}

// Reserve Card Component - Design Moderno 2024
function ReserveCard({ player, onClick, disabled, onDelete }) {
  return (
    <div
      style={{
        position: 'relative',
        padding: 'clamp(14px, 1.5vw, 18px)',
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(147, 51, 234, 0.15) 100%)',
        border: `2px solid ${disabled ? 'rgba(168, 85, 247, 0.2)' : 'rgba(147, 51, 234, 0.5)'}`,
        borderRadius: '14px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow: disabled 
          ? '0 4px 12px rgba(0, 0, 0, 0.2)'
          : '0 8px 24px rgba(147, 51, 234, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(8px) saturate(150%)',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'
          e.currentTarget.style.boxShadow = '0 16px 40px rgba(147, 51, 234, 0.4), 0 0 60px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
          e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.7)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(147, 51, 234, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.5)'
        }
      }}
    >
      {/* Pattern overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div 
        onClick={disabled ? undefined : onClick}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div style={{ 
          fontSize: 'clamp(14px, 1.5vw, 16px)', 
          fontWeight: 700, 
          marginBottom: '8px', 
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(147, 51, 234, 0.4)',
          lineHeight: '1.3'
        }}>
          {player.player_name}
        </div>
        {player.overall_rating && (
          <div style={{ 
            fontSize: 'clamp(18px, 2vw, 22px)', 
            fontWeight: 800,
            color: '#fbbf24',
            textShadow: '0 2px 6px rgba(0, 0, 0, 0.7), 0 0 12px rgba(251, 191, 36, 0.5)',
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            display: 'inline-block',
            boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)'
          }}>
            {player.overall_rating}
          </div>
        )}
      </div>
      
      {/* Bottone Rimuovi Riserva */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.4) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
            zIndex: 2
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(220, 38, 38, 0.6) 100%)'
            e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.4) 100%)'
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.4)'
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

// Assign Modal Component
function AssignModal({ slot, currentPlayer, riserve, onAssignFromReserve, onUploadPhoto, onRemove, onDelete, onClose, assigning }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = React.useState({
    stats: true,
    skills: true,
    boosters: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Estrai dati giocatore
  const baseStats = currentPlayer?.base_stats || {}
  const skills = Array.isArray(currentPlayer?.skills) ? currentPlayer.skills : []
  const comSkills = Array.isArray(currentPlayer?.com_skills) ? currentPlayer.com_skills : []
  const boosters = Array.isArray(currentPlayer?.available_boosters) ? currentPlayer.available_boosters : []
  const photoSlots = currentPlayer?.photo_slots || {}

  // Mostra sempre i dati se presenti (anche se photo_slots non completo)
  const hasStats = baseStats && Object.keys(baseStats).length > 0
  const hasSkills = skills.length > 0 || comSkills.length > 0
  const hasBoosters = boosters && boosters.length > 0
  
  // Calcola completezza profilo: 3 foto (Card, Statistiche, Abilità/Booster)
  // Abilità e Booster possono essere nella stessa foto
  const isProfileComplete = photoSlots.card && photoSlots.statistiche && (photoSlots.abilita || photoSlots.booster)
  const completedSections = [
    photoSlots.card && 'Card',
    photoSlots.statistiche && 'Statistiche',
    (photoSlots.abilita || photoSlots.booster) && 'Abilità/Booster'
  ].filter(Boolean).length

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
          maxWidth: '700px',
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
            {currentPlayer ? t('details') : t('assignPlayer')}
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

        <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '10px', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          {slot && (
            <div style={{ fontSize: '13px', marginBottom: '8px', opacity: 0.8 }}>
              <strong>{t('slot')} {slot.slot_index}</strong> • {slot.position?.position || '?'}
            </div>
          )}
          {!slot && currentPlayer && (
            <div style={{ fontSize: '13px', marginBottom: '8px', opacity: 0.8 }}>
              <strong>{t('riserve')}</strong> • {currentPlayer.position || '?'}
            </div>
          )}
          {currentPlayer && (
            <>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span>{currentPlayer.player_name}</span>
                {currentPlayer.overall_rating && (
                  <span style={{ 
                    color: '#fbbf24', 
                    fontSize: '20px',
                    fontWeight: 800,
                    textShadow: '0 2px 6px rgba(251, 191, 36, 0.6)'
                  }}>
                    {currentPlayer.overall_rating}
                  </span>
                )}
              </div>
              
              {/* Info aggiuntive: Età, Club, Nazionalità, Stile */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px', 
                marginBottom: '12px' 
              }}>
                {currentPlayer.age && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#60a5fa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <User size={12} />
                    {currentPlayer.age} {t('years')}
                  </div>
                )}
                {(currentPlayer.club_name || currentPlayer.team) && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(147, 51, 234, 0.2)',
                    border: '1px solid rgba(147, 51, 234, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#a78bfa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🏆 {currentPlayer.club_name || currentPlayer.team}
                  </div>
                )}
                {currentPlayer.nationality && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#4ade80',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🌍 {currentPlayer.nationality}
                  </div>
                )}
                {(currentPlayer.playing_style_name || currentPlayer.role) && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(251, 191, 36, 0.2)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#fbbf24',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ⚽ {currentPlayer.playing_style_name || currentPlayer.role}
                  </div>
                )}
              </div>
              {/* Indicatore Completezza */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '12px',
                padding: '6px 12px',
                background: isProfileComplete 
                  ? 'rgba(34, 197, 94, 0.15)' 
                  : 'rgba(251, 191, 36, 0.15)',
                borderRadius: '6px',
                border: `1px solid ${isProfileComplete ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
              }}>
                {isProfileComplete ? (
                  <>
                    <CheckCircle2 size={14} color="var(--neon-green)" />
                    <span style={{ color: 'var(--neon-green)', fontWeight: 600 }}>{t('profileComplete')}</span>
                  </>
                ) : (
                  <>
                    <Info size={14} color="#fbbf24" />
                    <span style={{ color: '#fbbf24', fontWeight: 500 }}>
                      {completedSections}/3 {t('sectionsCompleted')}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {currentPlayer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Messaggio informativo */}
            {!isProfileComplete && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px'
              }}>
                <Info size={16} color="#fbbf24" />
                <span style={{ color: '#fbbf24', fontWeight: 500 }}>
                  {t('partialProfile')} ({completedSections}/3). {t('clickToComplete')}
                </span>
              </div>
            )}
            
            {/* Sezione Statistiche */}
            {hasStats ? (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => toggleSection('stats')}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(34, 197, 94, 0.15)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 size={20} color="var(--neon-green)" />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{t('statsSection')}</span>
                    {photoSlots.statistiche && (
                      <CheckCircle2 size={14} color="var(--neon-green)" style={{ marginLeft: '4px' }} />
                    )}
                    {!photoSlots.statistiche && hasStats && (
                      <span style={{ fontSize: '11px', opacity: 0.7, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                        {t('extractedFromCard')}
                      </span>
                    )}
                  </div>
                  {expandedSections.stats ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {expandedSections.stats && (
                  <div style={{ padding: '18px' }}>
                    {baseStats.attacking && Object.keys(baseStats.attacking).length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ATTACCO</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px' }}>
                          {Object.entries(baseStats.attacking).map(([key, value]) => (
                            <div key={key} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(34, 197, 94, 0.1)'
                            }}>
                              <span style={{ opacity: 0.85, fontWeight: 500 }}>{key.replace(/_/g, ' ')}:</span>
                              <span style={{ fontWeight: 700, color: 'var(--neon-green)', fontSize: '14px' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {baseStats.defending && Object.keys(baseStats.defending).length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DIFESA</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px' }}>
                          {Object.entries(baseStats.defending).map(([key, value]) => (
                            <div key={key} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(34, 197, 94, 0.1)'
                            }}>
                              <span style={{ opacity: 0.85, fontWeight: 500 }}>{key.replace(/_/g, ' ')}:</span>
                              <span style={{ fontWeight: 700, color: 'var(--neon-green)', fontSize: '14px' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {baseStats.athleticism && Object.keys(baseStats.athleticism).length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FORZA</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px' }}>
                          {Object.entries(baseStats.athleticism).map(([key, value]) => (
                            <div key={key} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              background: 'rgba(34, 197, 94, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(34, 197, 94, 0.1)'
                            }}>
                              <span style={{ opacity: 0.85, fontWeight: 500 }}>{key.replace(/_/g, ' ')}:</span>
                              <span style={{ fontWeight: 700, color: 'var(--neon-green)', fontSize: '14px' }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(100, 100, 100, 0.1)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.6
              }}>
                <BarChart3 size={20} color="rgba(255, 255, 255, 0.4)" />
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('statsNotAvailable')}
                </span>
              </div>
            )}

            {/* Sezione Abilità */}
            {hasSkills ? (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => toggleSection('skills')}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(251, 191, 36, 0.15)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Zap size={20} color="var(--neon-orange)" />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{t('skillsSection')}</span>
                    {photoSlots.abilita && (
                      <CheckCircle2 size={14} color="var(--neon-orange)" style={{ marginLeft: '4px' }} />
                    )}
                    {!photoSlots.abilita && hasSkills && (
                      <span style={{ fontSize: '11px', opacity: 0.7, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                        (estratti da card)
                      </span>
                    )}
                  </div>
                  {expandedSections.skills ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {expandedSections.skills && (
                  <div style={{ padding: '18px' }}>
                    {skills.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('skillsLabel')} ({skills.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {skills.map((skill, idx) => (
                            <span key={idx} style={{
                              padding: '6px 12px',
                              background: 'rgba(251, 191, 36, 0.2)',
                              border: '1px solid rgba(251, 191, 36, 0.5)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#fbbf24',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                              boxShadow: '0 2px 4px rgba(251, 191, 36, 0.2)'
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {comSkills.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px', opacity: 0.9, color: 'var(--neon-orange)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COM SKILLS ({comSkills.length})</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {comSkills.map((skill, idx) => (
                            <span key={idx} style={{
                              padding: '6px 12px',
                              background: 'rgba(251, 191, 36, 0.2)',
                              border: '1px solid rgba(251, 191, 36, 0.5)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#fbbf24',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                              boxShadow: '0 2px 4px rgba(251, 191, 36, 0.2)'
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(100, 100, 100, 0.1)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.6
              }}>
                <Zap size={20} color="rgba(255, 255, 255, 0.4)" />
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('skillsSection')} {t('notAvailable')}
                </span>
              </div>
            )}

            {/* Sezione Booster */}
            {hasBoosters ? (
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div
                  onClick={() => toggleSection('boosters')}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: 'rgba(168, 85, 247, 0.15)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Gift size={20} color="var(--neon-purple)" />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{t('boostersSection')}</span>
                    {photoSlots.booster && (
                      <CheckCircle2 size={14} color="var(--neon-purple)" style={{ marginLeft: '4px' }} />
                    )}
                    {!photoSlots.booster && hasBoosters && (
                      <span style={{ fontSize: '11px', opacity: 0.7, color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                        (estratti da card)
                      </span>
                    )}
                  </div>
                  {expandedSections.boosters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {expandedSections.boosters && (
                  <div style={{ padding: '18px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', opacity: 0.9, color: 'var(--neon-purple)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('activeBoosters')} ({boosters.length})
                    </div>
                    {boosters.map((booster, idx) => (
                      <div key={idx} style={{
                        marginBottom: idx < boosters.length - 1 ? '14px' : 0,
                        padding: '14px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        borderRadius: '8px',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        boxShadow: '0 2px 8px rgba(168, 85, 247, 0.15)'
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--neon-purple)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Gift size={16} />
                          {booster.name || `Booster ${idx + 1}`}
                        </div>
                        {booster.effect && (
                          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
                            <strong>Effetto:</strong> {booster.effect}
                          </div>
                        )}
                        {booster.condition && (
                          <div style={{ fontSize: '11px', opacity: 0.7, color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }}>
                            {t('condition')}: {booster.condition}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(100, 100, 100, 0.1)',
                border: '1px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.6
              }}>
                <Gift size={20} color="rgba(255, 255, 255, 0.4)" />
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {t('boostersNotAvailable')}
                </span>
              </div>
            )}

            {/* Azioni */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              {!isProfileComplete && (
                <button
                  onClick={() => router.push(`/giocatore/${currentPlayer.id}`)}
                  className="btn primary"
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    justifyContent: 'center',
                    padding: '12px'
                  }}
                >
                  <User size={18} />
                  {t('completeProfile')} ({completedSections}/3)
                </button>
              )}
              <button
                onClick={() => {
                  onClose()
                  setTimeout(() => onUploadPhoto(), 100)
                }}
                className="btn"
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  justifyContent: 'center',
                  padding: '12px'
                }}
              >
                <Upload size={18} />
                {isProfileComplete ? t('updatePhoto') : t('uploadModifyPhoto')}
              </button>
              {slot && onRemove && currentPlayer && (
                <button
                  onClick={() => {
                    onRemove(currentPlayer)
                    onClose()
                  }}
                  className="btn"
                  style={{ 
                    width: '100%', 
                    background: 'rgba(251, 191, 36, 0.2)',
                    borderColor: '#fbbf24',
                    color: '#fbbf24',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    justifyContent: 'center',
                    marginTop: '8px'
                  }}
                >
                  <Move size={16} />
                  {t('moveToReserves')}
                </button>
              )}
              {onDelete && currentPlayer && (
                <button
                  onClick={() => onDelete(currentPlayer)}
                  className="btn"
                  style={{ 
                    width: '100%', 
                    background: 'rgba(220, 38, 38, 0.3)',
                    borderColor: '#dc2626',
                    color: '#dc2626',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    justifyContent: 'center',
                    marginTop: '8px'
                  }}
                >
                  <X size={16} />
                  {t('deletePermanently')}
                </button>
              )}
            </div>
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
    { key: 'card', label: t('card'), icon: '👤', color: 'var(--neon-blue)' },
    { key: 'stats', label: t('statsLabel'), icon: '📊', color: 'var(--neon-green)' },
    { key: 'skills', label: t('skillsBoosterLabel'), icon: '⭐', color: 'var(--neon-orange)' }
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
            {slot.slot_index !== null ? `${t('uploadPlayer')} - ${t('slot')} ${slot.slot_index}` : t('loadReserve')}
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
                      {t('remove')}
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
                    <div style={{ fontSize: '14px' }}>Clicca per caricare {label ? label.toLowerCase() : key}</div>
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
              {uploading ? 'Estrazione in corso...' : `Salva Giocatore (${images.length} foto)`}
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
