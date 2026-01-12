'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle, Loader } from 'lucide-react'
import { uploadAndProcessScreenshot } from '../../services/visionService'
import { useRosa } from '../../contexts/RosaContext'
import { supabase } from '../../lib/supabase'
import * as playerService from '../../services/playerService'
import * as rosaService from '../../services/rosaService'
import PlayerDestinationSelector from './PlayerDestinationSelector'
import './ScreenshotUpload.css'

export default function ScreenshotUpload({ onPlayerExtracted }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [showDestinationSelector, setShowDestinationSelector] = useState(false)
  const fileInputRef = useRef(null)
  const { rosa, createRosa, loadMainRosa } = useRosa()

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleFile(files[0])
    }
  }

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFile(files[0])
    }
  }

  const handleFile = async (file) => {
    setError(null)
    setExtractedData(null)

    // Preview immagine
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target.result)
    }
    reader.readAsDataURL(file)

    try {
      setIsUploading(true)

      // Ottieni userId da Supabase Auth
      if (!supabase) {
        throw new Error('Supabase non configurato')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Utente non autenticato. Effettua il login.')
      }

      const userId = session.user.id

      // Upload e processa
      const result = await uploadAndProcessScreenshot(
        file,
        'player_profile',
        userId
      )

      setIsUploading(false)
      setIsProcessing(true)

      // Attendi completamento processing
      if (result.processing.extracted_data) {
        setExtractedData(result.processing.extracted_data)
        setIsProcessing(false)
      } else {
        // Polling per status
        await pollProcessingStatus(result.processing.log_id)
      }
    } catch (err) {
      console.error('Error processing screenshot:', err)
      setError(err.message || 'Errore durante il processing dello screenshot')
      setIsUploading(false)
      setIsProcessing(false)
    }
  }

  const pollProcessingStatus = async (logId) => {
    // TODO: Implementare polling
    // Per ora usa extracted_data se disponibile
    setIsProcessing(false)
  }

  const handleConfirm = async () => {
    if (!extractedData) return

    // Mostra selettore destinazione invece di salvare direttamente
    setShowDestinationSelector(true)
  }

  const handleDestinationConfirm = async (insertData) => {
    if (!extractedData || !onPlayerExtracted) return

    try {
      setIsProcessing(true)
      setShowDestinationSelector(false)

      // 1. Cerca o crea player_base
      let playerBaseId = null
      const existingPlayers = await playerService.searchPlayer(extractedData.player_name)
      
      if (existingPlayers.length > 0) {
        playerBaseId = existingPlayers[0].id
      } else if (extractedData.matched_player_id) {
        playerBaseId = extractedData.matched_player_id
      }

      // 2. Crea/aggiorna player_build
      if (playerBaseId) {
        const buildData = {
          player_base_id: playerBaseId,
          development_points: extractedData.build?.developmentPoints || {},
          current_level: extractedData.build?.currentLevel,
          level_cap: extractedData.build?.levelCap,
          active_booster_name: extractedData.build?.activeBooster,
          final_stats: {
            attacking: extractedData.attacking,
            defending: extractedData.defending,
            athleticism: extractedData.athleticism
          },
          final_overall_rating: extractedData.overall_rating,
          source: 'screenshot',
          source_data: {
            screenshot_id: extractedData.log_id,
            confidence: extractedData.confidence
          }
        }

        const build = await playerService.upsertPlayerBuild(buildData)

        // 3. Aggiungi a rosa nella posizione corretta
        const player = {
          build_id: build.id,
          player_base_id: playerBaseId,
          player_name: extractedData.player_name,
          overall_rating: extractedData.overall_rating,
          position: extractedData.position,
          stats: {
            attacking: extractedData.attacking,
            defending: extractedData.defending,
            athleticism: extractedData.athleticism
          },
          skills: extractedData.skills || [],
          comSkills: extractedData.comSkills || [],
          source: 'screenshot',
          extracted_data: extractedData,
          // Informazioni destinazione
          destination: insertData.destination,
          slot: insertData.slot,
          position_tactical: insertData.position
        }

        // Aggiungi a rosa con slot specifico
        await addPlayerToRosaWithSlot(player, insertData)
        
        onPlayerExtracted(player)

        // Reset
        setPreview(null)
        setExtractedData(null)
        setShowDestinationSelector(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        throw new Error('Impossibile identificare il giocatore. Riprova.')
      }
    } catch (err) {
      console.error('Error confirming player:', err)
      setError(err.message || 'Errore durante il salvataggio del giocatore')
      setShowDestinationSelector(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDestinationCancel = () => {
    setShowDestinationSelector(false)
  }

  // Aggiungi giocatore a rosa in slot specifico
  const addPlayerToRosaWithSlot = async (player, insertData) => {
    let currentRosaId = rosa.id
    
    if (!currentRosaId) {
      // Crea rosa se non esiste
      const newRosa = await createRosa({ name: 'La mia squadra' })
      currentRosaId = newRosa.id
    }

    // Usa rosaService per aggiungere in slot specifico
    await rosaService.addPlayerToRosaInSlot(
      currentRosaId,
      player.build_id,
      insertData.destination,
      insertData.slot
    )

    // Ricarica rosa completa
    await loadMainRosa()
  }

  const handleCancel = () => {
    setPreview(null)
    setExtractedData(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="screenshot-upload">
      {!preview ? (
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''} ${isUploading || isProcessing ? 'processing' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {isUploading || isProcessing ? (
            <div className="upload-status">
              <Loader className="spinner" size={48} />
              <p>
                {isUploading ? 'Caricamento in corso...' : 'Elaborazione screenshot...'}
              </p>
            </div>
          ) : (
            <>
              <Upload size={48} />
              <h3>Carica Screenshot Profilo Giocatore</h3>
              <p>Trascina qui l'immagine o clicca per selezionare</p>
              <p className="hint">Formati supportati: JPG, PNG, WebP (max 10MB)</p>
            </>
          )}
        </div>
      ) : (
        <div className="preview-container">
          <div className="preview-image">
            <img src={preview} alt="Screenshot preview" />
            <button className="close-btn" onClick={handleCancel}>
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {extractedData && !showDestinationSelector && (
            <div className="extracted-data">
              <h3>Dati Estratti</h3>
              <div className="data-preview">
                {/* Dati Base */}
                <div className="data-section">
                  <strong>Informazioni Base</strong>
                  <div className="data-grid">
                    <div className="data-row">
                      <strong>Nome:</strong>
                      <span>{extractedData.player_name || extractedData.parsed_data?.player_name || 'N/A'}</span>
                    </div>
                    <div className="data-row">
                      <strong>Rating:</strong>
                      <span>{extractedData.overall_rating || extractedData.parsed_data?.overall_rating || 'N/A'}</span>
                    </div>
                    <div className="data-row">
                      <strong>Posizione:</strong>
                      <span>{extractedData.position || extractedData.parsed_data?.position || 'N/A'}</span>
                    </div>
                    {extractedData.parsed_data?.role && (
                      <div className="data-row">
                        <strong>Ruolo:</strong>
                        <span>{extractedData.parsed_data.role}</span>
                      </div>
                    )}
                    {extractedData.parsed_data?.height && (
                      <div className="data-row">
                        <strong>Altezza:</strong>
                        <span>{extractedData.parsed_data.height} cm</span>
                      </div>
                    )}
                    {extractedData.parsed_data?.weight && (
                      <div className="data-row">
                        <strong>Peso:</strong>
                        <span>{extractedData.parsed_data.weight} kg</span>
                      </div>
                    )}
                    {extractedData.parsed_data?.age && (
                      <div className="data-row">
                        <strong>Età:</strong>
                        <span>{extractedData.parsed_data.age}</span>
                      </div>
                    )}
                    {extractedData.parsed_data?.nationality && (
                      <div className="data-row">
                        <strong>Nazionalità:</strong>
                        <span>{extractedData.parsed_data.nationality}</span>
                      </div>
                    )}
                    {extractedData.parsed_data?.club_name && (
                      <div className="data-row">
                        <strong>Squadra:</strong>
                        <span>{extractedData.parsed_data.club_name}</span>
                      </div>
                    )}
                    {extractedData.parsed_data?.potential_max && (
                      <div className="data-row">
                        <strong>Potenziale:</strong>
                        <span>{extractedData.parsed_data.potential_max}</span>
                      </div>
                    )}
                    {extractedData.parsed_data?.form && (
                      <div className="data-row">
                        <strong>Condizione:</strong>
                        <span>{extractedData.parsed_data.form}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Statistiche Attacco */}
                {(extractedData.attacking || extractedData.parsed_data?.base_stats?.attacking) && (
                  <div className="data-section">
                    <strong>Attacco</strong>
                    <div className="stats-grid">
                      {Object.entries(extractedData.parsed_data?.base_stats?.attacking || extractedData.attacking || {}).map(([key, value]) => (
                        value !== null && value !== undefined && (
                          <span key={key}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistiche Difesa */}
                {(extractedData.defending || extractedData.parsed_data?.base_stats?.defending) && (
                  <div className="data-section">
                    <strong>Difesa</strong>
                    <div className="stats-grid">
                      {Object.entries(extractedData.parsed_data?.base_stats?.defending || extractedData.defending || {}).map(([key, value]) => (
                        value !== null && value !== undefined && (
                          <span key={key}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistiche Atletiche */}
                {(extractedData.athleticism || extractedData.parsed_data?.base_stats?.athleticism) && (
                  <div className="data-section">
                    <strong>Atletica</strong>
                    <div className="stats-grid">
                      {Object.entries(extractedData.parsed_data?.base_stats?.athleticism || extractedData.athleticism || {}).map(([key, value]) => (
                        value !== null && value !== undefined && (
                          <span key={key}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: {value}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {extractedData.skills && extractedData.skills.length > 0 && (
                  <div className="data-section">
                    <strong>Abilità ({extractedData.skills.length})</strong>
                    <div className="skills-list">
                      {extractedData.skills.map((skill, idx) => (
                        <span key={idx} className="skill-badge">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="actions">
                <button className="btn-confirm" onClick={handleConfirm}>
                  <Check size={18} />
                  Scegli Destinazione
                </button>
                <button className="btn-cancel" onClick={handleCancel}>
                  <X size={18} />
                  Annulla
                </button>
              </div>
            </div>
          )}

          {showDestinationSelector && extractedData && (
            <div className="destination-selector-overlay">
              <PlayerDestinationSelector
                playerData={extractedData}
                onConfirm={handleDestinationConfirm}
                onCancel={handleDestinationCancel}
              />
            </div>
          )}

          {isProcessing && !extractedData && (
            <div className="processing-status">
              <Loader className="spinner" size={24} />
              <p>Elaborazione in corso...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
