'use client'

import React, { useState } from 'react'
import { Check, X, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import './CandidateProfileView.css'

/**
 * Componente per visualizzare CandidateProfile con badge status
 * Mostra ogni campo con value/status/confidence e permette modifica
 */
export default function CandidateProfileView({ 
  candidateProfile, 
  onConfirm, 
  onCancel 
}) {
  const [editedProfile, setEditedProfile] = useState(candidateProfile)

  if (!candidateProfile) {
    return null
  }

  // Estrai valore da campo (può essere value/status/confidence o valore diretto)
  const getFieldValue = (field) => {
    if (!field) return null
    if (typeof field === 'object' && 'value' in field) {
      return field.value
    }
    return field
  }

  // Estrai status da campo
  const getFieldStatus = (field) => {
    if (!field || typeof field !== 'object') return 'certain'
    if ('status' in field) {
      return field.status
    }
    return 'certain'
  }

  // Estrai confidence da campo
  const getFieldConfidence = (field) => {
    if (!field || typeof field !== 'object') return 1.0
    if ('confidence' in field) {
      return field.confidence
    }
    return 1.0
  }

  // Badge per status
  const StatusBadge = ({ status, confidence }) => {
    const confidencePercent = Math.round(confidence * 100)
    
    if (status === 'certain') {
      return (
        <span className="badge badge-certain">
          <CheckCircle size={14} />
          Certo ({confidencePercent}%)
        </span>
      )
    } else if (status === 'uncertain') {
      return (
        <span className="badge badge-uncertain">
          <HelpCircle size={14} />
          Incerto ({confidencePercent}%)
        </span>
      )
    } else {
      return (
        <span className="badge badge-missing">
          <AlertCircle size={14} />
          Mancante
        </span>
      )
    }
  }

  // Renderizza campo editabile
  const renderField = (key, field, path = '') => {
    const fullKey = path ? `${path}.${key}` : key
    const value = getFieldValue(field)
    const status = getFieldStatus(field)
    const confidence = getFieldConfidence(field)

    // Se è un oggetto annidato, renderizza ricorsivamente
    if (typeof field === 'object' && field !== null && !('value' in field)) {
      return (
        <div key={fullKey} className="nested-section">
          <h4>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
          {Object.entries(field).map(([subKey, subField]) => 
            renderField(subKey, subField, fullKey)
          )}
        </div>
      )
    }

    // Campo semplice con value/status/confidence
    return (
      <div key={fullKey} className="field-row">
        <label>
          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </label>
        <div className="field-input-group">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              const newProfile = { ...editedProfile }
              const keys = fullKey.split('.')
              let current = newProfile
              for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {}
                current = current[keys[i]]
              }
              if (typeof current[keys[keys.length - 1]] === 'object' && current[keys[keys.length - 1]] !== null) {
                current[keys[keys.length - 1]].value = e.target.value
              } else {
                current[keys[keys.length - 1]] = e.target.value
              }
              setEditedProfile(newProfile)
            }}
            placeholder={status === 'missing' ? 'Inserisci valore...' : ''}
            disabled={status === 'certain' && confidence > 0.9}
            className={status === 'missing' ? 'field-missing' : status === 'uncertain' ? 'field-uncertain' : ''}
          />
          <StatusBadge status={status} confidence={confidence} />
        </div>
      </div>
    )
  }

  // Calcola statistiche CandidateProfile
  const stats = {
    total: 0,
    certain: 0,
    uncertain: 0,
    missing: 0
  }

  const countFields = (obj) => {
    if (!obj || typeof obj !== 'object') return
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        if ('status' in value) {
          stats.total++
          if (value.status === 'certain') stats.certain++
          else if (value.status === 'uncertain') stats.uncertain++
          else stats.missing++
        } else {
          countFields(value)
        }
      }
    }
  }

  countFields(candidateProfile)

  return (
    <div className="candidate-profile-view">
      <div className="profile-header">
        <h3>📋 Dati Estratti - Rivedi e Conferma</h3>
        <div className="profile-stats">
          <span className="stat-item">
            <CheckCircle size={16} className="stat-certain" />
            Certi: {stats.certain}
          </span>
          <span className="stat-item">
            <HelpCircle size={16} className="stat-uncertain" />
            Incerti: {stats.uncertain}
          </span>
          <span className="stat-item">
            <AlertCircle size={16} className="stat-missing" />
            Mancanti: {stats.missing}
          </span>
        </div>
      </div>

      <div className="profile-content">
        {Object.entries(editedProfile).map(([key, field]) => 
          renderField(key, field)
        )}
      </div>

      <div className="profile-actions">
        <button className="btn-confirm" onClick={() => onConfirm(editedProfile)}>
          <Check size={18} />
          Conferma e Salva
        </button>
        <button className="btn-cancel" onClick={onCancel}>
          <X size={18} />
          Annulla
        </button>
      </div>
    </div>
  )
}