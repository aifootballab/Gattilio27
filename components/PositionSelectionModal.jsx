import React from 'react'
import { useTranslation } from '@/lib/i18n'

const POSITIONS = [
  { id: 'PT', label: 'PT (Portiere)' },
  { id: 'DC', label: 'DC (Difensore Centrale)' },
  { id: 'TS', label: 'TS (Terzino Sinistro)' },
  { id: 'TD', label: 'TD (Terzino Destro)' },
  { id: 'CC', label: 'CC (Centrocampista Centrale)' },
  { id: 'CMF', label: 'CMF (Centrocampista)' },
  { id: 'MED', label: 'MED (Mediano)' },
  { id: 'ESA', label: 'ESA (Esterno Sinistro Attacco)' },
  { id: 'EDE', label: 'EDE (Esterno Destro Attacco)' },
  { id: 'AMF', label: 'AMF (Trequartista)' },
  { id: 'TRQ', label: 'TRQ (Trequartista)' },
  { id: 'LWF', label: 'LWF (Ala Sinistra)' },
  { id: 'RWF', label: 'RWF (Ala Destra)' },
  { id: 'CLS', label: 'CLS (Centrocampista Laterale Sinistro)' },
  { id: 'CLD', label: 'CLD (Centrocampista Laterale Destro)' },
  { id: 'CF', label: 'CF (Centravanti)' },
  { id: 'P', label: 'P (Punta)' },
  { id: 'SP', label: 'SP (Seconda Punta)' },
  { id: 'SS', label: 'SS (Attaccante)' }
]

const COMPETENCE_LEVELS = [
  { value: 'Alta', label: 'Alta' },
  { value: 'Intermedia', label: 'Intermedia' },
  { value: 'Bassa', label: 'Bassa' }
]

export default function PositionSelectionModal({
  playerName,
  overallRating,
  mainPosition,
  selectedPositions,
  onPositionsChange,
  onConfirm,
  onCancel
}) {
  const { t } = useTranslation()

  const handleTogglePosition = (positionId) => {
    const exists = selectedPositions.find(p => p.position === positionId)
    
    if (exists) {
      // Rimuovi
      onPositionsChange(selectedPositions.filter(p => p.position !== positionId))
    } else {
      // Aggiungi con competenza default "Alta"
      onPositionsChange([...selectedPositions, {
        position: positionId,
        competence: 'Alta'
      }])
    }
  }
  
  const handleCompetenceChange = (positionId, competence) => {
    onPositionsChange(selectedPositions.map(p => 
      p.position === positionId 
        ? { ...p, competence }
        : p
    ))
  }

  const getCompetenceForPosition = (positionId) => {
    const selected = selectedPositions.find(p => p.position === positionId)
    return selected?.competence || 'Alta'
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-primary, #1a1a1a)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color, #333)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          marginTop: 0, 
          marginBottom: '8px',
          color: 'var(--text-primary, #fff)',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          {t('selectOriginalPositions')}
        </h2>
        
        <p style={{ 
          marginTop: 0, 
          marginBottom: '16px',
          color: 'var(--text-secondary, #aaa)',
          fontSize: '14px'
        }}>
          {playerName} - Overall {overallRating}
        </p>
        
        <p style={{ 
          marginBottom: '20px',
          color: 'var(--text-secondary, #aaa)',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          {t('positionSelectionDescription')}
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {POSITIONS.map(pos => {
            const selected = selectedPositions.find(p => p.position === pos.id)
            const isMain = pos.id === mainPosition
            
            return (
              <div 
                key={pos.id} 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px',
                  border: `1px solid ${selected ? 'var(--neon-blue, #00d4ff)' : 'var(--border-color, #333)'}`,
                  borderRadius: '8px',
                  backgroundColor: selected ? 'rgba(0, 212, 255, 0.1)' : 'transparent'
                }}
              >
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary, #fff)',
                  fontSize: '14px'
                }}>
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => handleTogglePosition(pos.id)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontWeight: isMain ? '600' : '400',
                    color: isMain ? 'var(--neon-blue, #00d4ff)' : 'var(--text-primary, #fff)'
                  }}>
                    {pos.label}
                    {isMain && ` (${t('mainPosition')})`}
                  </span>
                </label>
                
                {selected && (
                  <select
                    value={getCompetenceForPosition(pos.id)}
                    onChange={(e) => handleCompetenceChange(pos.id, e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #333)',
                      backgroundColor: 'var(--bg-secondary, #2a2a2a)',
                      color: 'var(--text-primary, #fff)',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    {COMPETENCE_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {t(`competence${level.value === 'Alta' ? 'High' : level.value === 'Intermedia' ? 'Medium' : 'Low'}`)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>
        
        {selectedPositions.length === 0 && (
          <p style={{
            color: 'var(--error-color, #ff4444)',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {t('mustSelectAtLeastOne')}
          </p>
        )}
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '24px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #333)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary, #fff)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={selectedPositions.length === 0}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: selectedPositions.length === 0 
                ? 'var(--border-color, #333)' 
                : 'var(--neon-blue, #00d4ff)',
              color: selectedPositions.length === 0 
                ? 'var(--text-secondary, #aaa)' 
                : '#000',
              cursor: selectedPositions.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
