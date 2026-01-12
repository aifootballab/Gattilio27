// Componente per selezionare dove inserire il giocatore estratto
// Chiede all'utente: Titolare o Riserva? E in quale posizione?

'use client'

import React, { useState } from 'react'
import { Users, UserPlus, X, Check } from 'lucide-react'
import { useRosa } from '../../contexts/RosaContext'
import './PlayerDestinationSelector.css'

const POSITIONS = [
  { code: 'GK', name: 'Portiere', icon: '🥅' },
  { code: 'CB', name: 'Difensore Centrale', icon: '🛡️' },
  { code: 'LB', name: 'Terzino Sinistro', icon: '⬅️' },
  { code: 'RB', name: 'Terzino Destro', icon: '➡️' },
  { code: 'DMF', name: 'Mediano', icon: '⚙️' },
  { code: 'CMF', name: 'Centrocampista', icon: '⚽' },
  { code: 'LMF', name: 'Esterno Sinistro', icon: '⬅️' },
  { code: 'RMF', name: 'Esterno Destro', icon: '➡️' },
  { code: 'AMF', name: 'Trequartista', icon: '🎯' },
  { code: 'LWF', name: 'Ala Sinistra', icon: '⬅️' },
  { code: 'RWF', name: 'Ala Destra', icon: '➡️' },
  { code: 'SS', name: 'Seconda Punta', icon: '🎯' },
  { code: 'CF', name: 'Attaccante', icon: '⚽' }
]

export default function PlayerDestinationSelector({ 
  playerData, 
  onConfirm, 
  onCancel 
}) {
  const { rosa } = useRosa()
  const [destination, setDestination] = useState(null) // 'titolare' | 'riserva'
  const [selectedPosition, setSelectedPosition] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null) // Indice slot (0-10 per titolari, 11-20 per riserve)

  // Calcola slot disponibili
  const titolariCount = rosa.player_build_ids?.slice(0, 11).length || 0
  const riserveCount = rosa.player_build_ids?.slice(11, 21).length || 0
  const titolariSlots = Array.from({ length: 11 }, (_, i) => i)
  const riserveSlots = Array.from({ length: 10 }, (_, i) => i + 11)

  const handleDestinationSelect = (dest) => {
    setDestination(dest)
    setSelectedSlot(null)
    setSelectedPosition(null)
  }

  const handlePositionSelect = (position) => {
    setSelectedPosition(position)
    // Se è titolare, trova slot libero o suggerisci
    if (destination === 'titolare') {
      // Trova primo slot libero
      const firstFreeSlot = titolariSlots.find(slot => 
        !rosa.player_build_ids?.[slot]
      ) ?? titolariSlots[titolariCount]
      setSelectedSlot(firstFreeSlot)
    }
  }

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot)
  }

  const handleConfirm = () => {
    if (!destination) return
    
    const insertData = {
      destination, // 'titolare' | 'riserva'
      slot: selectedSlot, // Indice nell'array
      position: selectedPosition, // Posizione tattica (opzionale)
      playerData
    }

    onConfirm(insertData)
  }

  const canConfirm = () => {
    if (!destination) return false
    if (destination === 'titolare') {
      // Per titolare, slot è obbligatorio
      return selectedSlot !== null && selectedSlot >= 0 && selectedSlot < 11
    } else {
      // Per riserva, basta che ci sia spazio
      return riserveCount < 10
    }
  }

  return (
    <div className="player-destination-selector">
      <div className="selector-header">
        <h3>Dove inserire {playerData?.player_name || 'il giocatore'}?</h3>
        <button className="close-btn" onClick={onCancel}>
          <X size={20} />
        </button>
      </div>

      <div className="player-preview">
        <div className="preview-info">
          <span className="player-name">{playerData?.player_name}</span>
          <span className="player-rating">OVR {playerData?.overall_rating || 'N/A'}</span>
          <span className="player-position">{playerData?.position || 'N/A'}</span>
        </div>
      </div>

      {/* Selezione Destinazione */}
      <div className="destination-options">
        <div 
          className={`destination-card ${destination === 'titolare' ? 'selected' : ''} ${titolariCount >= 11 ? 'disabled' : ''}`}
          onClick={() => titolariCount < 11 && handleDestinationSelect('titolare')}
        >
          <Users size={24} />
          <div className="card-content">
            <h4>Titolari</h4>
            <p>{titolariCount}/11 giocatori</p>
            {titolariCount >= 11 && (
              <span className="warning">Rosa titolari completa</span>
            )}
          </div>
        </div>

        <div 
          className={`destination-card ${destination === 'riserva' ? 'selected' : ''} ${riserveCount >= 10 ? 'disabled' : ''}`}
          onClick={() => riserveCount < 10 && handleDestinationSelect('riserva')}
        >
          <UserPlus size={24} />
          <div className="card-content">
            <h4>Riserve</h4>
            <p>{riserveCount}/10 giocatori</p>
            {riserveCount >= 10 && (
              <span className="warning">Rosa riserve completa</span>
            )}
          </div>
        </div>
      </div>

      {/* Selezione Posizione (solo per titolari) */}
      {destination === 'titolare' && (
        <div className="position-selector">
          <h4>Seleziona Posizione</h4>
          <div className="positions-grid">
            {POSITIONS.map(pos => (
              <div
                key={pos.code}
                className={`position-card ${selectedPosition === pos.code ? 'selected' : ''}`}
                onClick={() => handlePositionSelect(pos.code)}
              >
                <span className="position-icon">{pos.icon}</span>
                <span className="position-code">{pos.code}</span>
                <span className="position-name">{pos.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selezione Slot (solo per titolari) */}
      {destination === 'titolare' && selectedPosition && (
        <div className="slot-selector">
          <h4>Posizione in Formazione</h4>
          <div className="formation-preview">
            <div className="formation-slots">
              {titolariSlots.map(slot => {
                const isOccupied = !!rosa.player_build_ids?.[slot]
                const isSelected = selectedSlot === slot
                return (
                  <div
                    key={slot}
                    className={`formation-slot ${isOccupied ? 'occupied' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isOccupied && handleSlotSelect(slot)}
                  >
                    {isOccupied ? (
                      <span className="slot-occupied">●</span>
                    ) : (
                      <span className="slot-empty">{slot + 1}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="slot-hint">
              {selectedSlot !== null 
                ? `Slot ${selectedSlot + 1} selezionato`
                : 'Seleziona uno slot libero'}
            </p>
          </div>
        </div>
      )}

      {/* Conferma */}
      <div className="selector-actions">
        <button 
          className="btn-cancel" 
          onClick={onCancel}
        >
          Annulla
        </button>
        <button 
          className={`btn-confirm ${canConfirm() ? 'enabled' : 'disabled'}`}
          onClick={handleConfirm}
          disabled={!canConfirm()}
        >
          <Check size={18} />
          Conferma Inserimento
        </button>
      </div>
    </div>
  )
}
