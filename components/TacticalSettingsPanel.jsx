'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { INDIVIDUAL_INSTRUCTIONS_CONFIG } from '@/lib/tacticalInstructions'
import { ChevronDown, Save, Settings } from 'lucide-react'

export default function TacticalSettingsPanel({ 
  titolari, 
  tacticalSettings, 
  onSave,
  saving = false 
}) {
  const { t } = useTranslation()
  
  const [teamPlayingStyle, setTeamPlayingStyle] = React.useState(
    tacticalSettings?.team_playing_style || ''
  )
  const [individualInstructions, setIndividualInstructions] = React.useState(
    tacticalSettings?.individual_instructions || {}
  )

  // Opzioni stile di gioco di squadra
  const teamPlayingStyleOptions = [
    { id: 'possesso_palla', nameKey: 'possesso_palla' },
    { id: 'contropiede_veloce', nameKey: 'contropiede_veloce' },
    { id: 'contrattacco', nameKey: 'contrattacco' },
    { id: 'vie_laterali', nameKey: 'vie_laterali' },
    { id: 'passaggio_lungo', nameKey: 'passaggio_lungo' }
  ]

  const handleCategoryChange = (category, field, value) => {
    setIndividualInstructions(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [field]: value,
        enabled: true
      }
    }))
  }

  const handleSave = async () => {
    if (onSave) {
      await onSave({
        team_playing_style: teamPlayingStyle || null,
        individual_instructions: individualInstructions
      })
    }
  }

  return (
    <div className="card" style={{
      padding: 'clamp(12px, 1.5vw, 18px)',
      marginBottom: '0',
      background: 'rgba(10, 14, 39, 0.95)',
      border: '1px solid rgba(0, 212, 255, 0.3)',
      borderRadius: '10px',
      maxWidth: '100%',
      width: '100%'
    }}>
      {/* Header - Compatto Enterprise */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(0, 212, 255, 0.15)'
      }}>
        <Settings size={16} color="var(--neon-blue)" />
        <h2 style={{
          fontSize: 'clamp(14px, 1.8vw, 16px)',
          fontWeight: 600,
          margin: 0,
          color: 'var(--neon-blue)',
          letterSpacing: '0.3px'
        }}>
          {t('tacticalSettings')}
        </h2>
      </div>

      {/* Team Playing Style - Compatto */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: 'clamp(12px, 1.3vw, 13px)',
          fontWeight: 600,
          marginBottom: '6px',
          color: '#fff',
          opacity: 0.9
        }}>
          {t('teamPlayingStyle')}
        </label>
        <div style={{ position: 'relative' }}>
          <select
            value={teamPlayingStyle}
            onChange={(e) => setTeamPlayingStyle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              paddingRight: '40px',
              background: 'rgba(10, 14, 39, 0.8)',
              border: '1px solid var(--neon-blue)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: 'clamp(13px, 1.5vw, 15px)',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="">{t('selectInstruction')}</option>
            {teamPlayingStyleOptions.map(option => (
              <option key={option.id} value={option.id}>
                {t(option.nameKey)}
              </option>
            ))}
          </select>
          <ChevronDown 
            size={18} 
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              opacity: 0.6
            }}
          />
        </div>
        <div style={{
          fontSize: 'clamp(10px, 1.1vw, 11px)',
          opacity: 0.6,
          marginTop: '4px',
          lineHeight: '1.3'
        }}>
          {t('teamPlayingStyleDescription')}
        </div>
      </div>

      {/* Individual Instructions - 4 Categorie - Layout Verticale Compatto */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {Object.entries(INDIVIDUAL_INSTRUCTIONS_CONFIG).map(([category, config]) => {
          const currentSetting = individualInstructions[category] || {}
          const compatiblePlayers = config.filterPlayers(titolari || [])
          
          return (
            <div 
              key={category}
              className="card"
              style={{
                padding: '12px',
                background: 'rgba(0, 212, 255, 0.04)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                borderRadius: '6px'
              }}
            >
              {/* Titolo Categoria - Compatto */}
              <div style={{
                fontSize: 'clamp(12px, 1.3vw, 13px)',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--neon-blue)',
                opacity: 0.9
              }}>
                {t(config.nameKey)}
              </div>
              
              {/* Dropdown Istruzione - Compatto */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(11px, 1.2vw, 12px)',
                  opacity: 0.75,
                  marginBottom: '4px'
                }}>
                  {t('instruction')}:
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={currentSetting.instruction || ''}
                    onChange={(e) => handleCategoryChange(category, 'instruction', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: '35px',
                      background: 'rgba(10, 14, 39, 0.8)',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: 'clamp(12px, 1.3vw, 14px)',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  >
                    <option value="">{t('selectInstruction')}</option>
                    {config.availableInstructions.map(inst => (
                      <option key={inst.id} value={inst.id}>
                        {t(inst.nameKey)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown 
                    size={16} 
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      opacity: 0.6
                    }}
                  />
                </div>
              </div>

              {/* Dropdown Giocatore - Compatto */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(11px, 1.2vw, 12px)',
                  opacity: 0.75,
                  marginBottom: '4px'
                }}>
                  {t('selectPlayer')}:
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={currentSetting.player_id || ''}
                    onChange={(e) => handleCategoryChange(category, 'player_id', e.target.value)}
                    disabled={compatiblePlayers.length === 0}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: '35px',
                      background: compatiblePlayers.length === 0 
                        ? 'rgba(10, 14, 39, 0.4)' 
                        : 'rgba(10, 14, 39, 0.8)',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '6px',
                      color: compatiblePlayers.length === 0 ? 'rgba(255, 255, 255, 0.5)' : '#fff',
                      fontSize: 'clamp(12px, 1.3vw, 14px)',
                      cursor: compatiblePlayers.length === 0 ? 'not-allowed' : 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  >
                    <option value="">{t('selectPlayer')}</option>
                    {compatiblePlayers.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.player_name} {player.position ? `(${player.position})` : ''}
                        {player.overall_rating ? ` - ${player.overall_rating}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown 
                    size={16} 
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      opacity: 0.6
                    }}
                  />
                </div>
                {compatiblePlayers.length === 0 && (
                  <div style={{
                    fontSize: 'clamp(11px, 1.2vw, 12px)',
                    opacity: 0.6,
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    {t('noCompatiblePlayers')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottone Salva - Compatto Enterprise */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn primary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 12px',
          fontSize: 'clamp(12px, 1.3vw, 13px)',
          fontWeight: 600,
          marginTop: '8px'
        }}
      >
        <Save size={14} />
        {saving ? t('saving') : t('save')}
      </button>
    </div>
  )
}
