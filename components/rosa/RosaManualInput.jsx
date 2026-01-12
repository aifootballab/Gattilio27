'use client'

import React, { useState } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import { 
  User, X, Save, Plus, Trash2, 
  Target, Shield, Zap, 
  TrendingUp, Award, Settings
} from 'lucide-react'
import * as playerService from '../../services/playerService'
import * as rosaService from '../../services/rosaService'
import './RosaManualInput.css'

const POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 
  'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 
  'LWF', 'RWF', 'SS', 'CF'
]

const COMMON_SKILLS = [
  'Heading', 'Long Range Drive', 'Chip Shot Control', 'Heel Trick',
  'First Time Shot', 'One Touch Pass', 'Through Passing', 'Outside Curler',
  'Penalty Specialist', 'Fighting Spirit', 'Scissors Feint', 'Double Touch',
  'Cross Over Turn', 'Cut Behind & Turn', 'Sole Control', 'Step On Skill Control',
  'Marseille Turn', 'Sombrero', 'Flip Flap', 'Interception', 'Man Marking',
  'Track Back', 'Acrobatic Clear', 'Captaincy'
]

const COMMON_COM_SKILLS = [
  'MazingRun', 'IncisiveRun', 'LongRanger', 'EarlyCross', 'Blocker',
  'Track Back', 'Interception', 'Penalty Specialist', 'Captaincy'
]

const initialPlayerData = {
  player_name: '',
  position: 'CF',
  overall_rating: 0,
  attacking: {
    offensiveAwareness: 0,
    ballControl: 0,
    dribbling: 0,
    tightPossession: 0,
    lowPass: 0,
    loftedPass: 0,
    finishing: 0,
    heading: 0,
    placeKicking: 0,
    curl: 0
  },
  defending: {
    defensiveAwareness: 0,
    defensiveEngagement: 0,
    tackling: 0,
    aggression: 0,
    goalkeeping: 0,
    gkCatching: 0,
    gkParrying: 0,
    gkReflexes: 0,
    gkReach: 0
  },
  athleticism: {
    speed: 0,
    acceleration: 0,
    kickingPower: 0,
    jump: 0,
    physicalContact: 0,
    balance: 0,
    stamina: 0,
    weakFootUsage: 4,
    weakFootAccuracy: 4,
    form: 8,
    injuryResistance: 2
  },
  skills: [],
  comSkills: [],
  build: {
    currentLevel: null,
    levelCap: null,
    developmentPoints: {},
    activeBooster: null
  }
}

function RosaManualInput({ onBack, onRosaCreated }) {
  const [playerData, setPlayerData] = useState(initialPlayerData)
  const [activeTab, setActiveTab] = useState('basic')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const { addPlayer } = useRosa()

  const updateStat = (category, stat, value) => {
    setPlayerData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [stat]: parseInt(value) || 0
      }
    }))
  }

  const toggleSkill = (skill, isComSkill = false) => {
    const skillKey = isComSkill ? 'comSkills' : 'skills'
    setPlayerData(prev => ({
      ...prev,
      [skillKey]: prev[skillKey].includes(skill)
        ? prev[skillKey].filter(s => s !== skill)
        : [...prev[skillKey], skill]
    }))
  }

  const calculateOverallRating = () => {
    // Calcolo semplificato - può essere migliorato
    const att = Object.values(playerData.attacking).reduce((a, b) => a + b, 0) / 10
    const def = Object.values(playerData.defending).filter(v => v > 0).length > 0
      ? Object.values(playerData.defending).reduce((a, b) => a + b, 0) / 9
      : 0
    const ath = Object.values(playerData.athleticism).slice(0, 7).reduce((a, b) => a + b, 0) / 7
    
    const base = (att + ath) / 2
    const rating = Math.round(base + (def > 0 ? def * 0.3 : 0))
    return Math.max(0, Math.min(120, rating))
  }

  const handleSave = async () => {
    if (!playerData.player_name.trim()) {
      setError('Nome giocatore obbligatorio')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const overallRating = playerData.overall_rating || calculateOverallRating()

      // Prepara dati completi per creare player e build
      const playerCompleteData = {
        player_name: playerData.player_name,
        position: playerData.position,
        base_stats: {
          overall_rating: overallRating,
          attacking: playerData.attacking,
          defending: playerData.defending,
          athleticism: playerData.athleticism
        },
        skills: playerData.skills,
        com_skills: playerData.comSkills,
        position_ratings: {},
        development_points: playerData.build.developmentPoints || {},
        current_level: playerData.build.currentLevel,
        level_cap: playerData.build.levelCap,
        active_booster_name: playerData.build.activeBooster,
        final_stats: {
          attacking: playerData.attacking,
          defending: playerData.defending,
          athleticism: playerData.athleticism
        },
        final_overall_rating: overallRating,
        source: 'manual'
      }

      // Crea player_base e build insieme
      const result = await playerService.createPlayerWithBuild(playerCompleteData)

      // Aggiungi alla rosa corrente
      const playerForRosa = {
        player_name: playerData.player_name,
        position: playerData.position,
        overall_rating: overallRating,
        build_id: result.build.id,
        player_base_id: result.player_base.id,
        source: 'manual'
      }

      await addPlayer(playerForRosa)

      if (onRosaCreated) {
        onRosaCreated()
      }
    } catch (err) {
      console.error('Errore salvataggio giocatore:', err)
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rosa-manual-input">
      <div className="manual-input-header">
        <button onClick={onBack} className="back-button">
          <X size={20} />
          Indietro
        </button>
        <h2>Inserimento Manuale Giocatore</h2>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="manual-input-container">
        <div className="tabs-container">
          <button
            className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            <User size={18} />
            <span>Dati Base</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'attacking' ? 'active' : ''}`}
            onClick={() => setActiveTab('attacking')}
          >
            <Target size={18} />
            <span>Attacco</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'defending' ? 'active' : ''}`}
            onClick={() => setActiveTab('defending')}
          >
            <Shield size={18} />
            <span>Difesa</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'athleticism' ? 'active' : ''}`}
            onClick={() => setActiveTab('athleticism')}
          >
            <Zap size={18} />
            <span>Fisico</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
            <Award size={18} />
            <span>Abilità</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'build' ? 'active' : ''}`}
            onClick={() => setActiveTab('build')}
          >
            <Settings size={18} />
            <span>Build</span>
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'basic' && (
            <div className="form-section">
              <div className="form-group">
                <label>Nome Giocatore *</label>
                <input
                  type="text"
                  value={playerData.player_name}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, player_name: e.target.value }))}
                  placeholder="Es: Kylian Mbappé"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Posizione</label>
                <select
                  value={playerData.position}
                  onChange={(e) => setPlayerData(prev => ({ ...prev, position: e.target.value }))}
                  className="form-select"
                >
                  {POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Overall Rating</label>
                <div className="rating-input-group">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={playerData.overall_rating || ''}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, overall_rating: parseInt(e.target.value) || 0 }))}
                    className="form-input rating-input"
                    placeholder="Auto"
                  />
                  <button
                    type="button"
                    onClick={() => setPlayerData(prev => ({ ...prev, overall_rating: calculateOverallRating() }))}
                    className="calculate-button"
                  >
                    <TrendingUp size={16} />
                    Calcola
                  </button>
                </div>
                <p className="input-hint">Lascia vuoto per calcolo automatico basato sulle statistiche</p>
              </div>
            </div>
          )}

          {activeTab === 'attacking' && (
            <div className="form-section stats-section">
              <h3>Statistiche Attacco</h3>
              <div className="stats-grid">
                {Object.entries(playerData.attacking).map(([stat, value]) => (
                  <div key={stat} className="stat-input-group">
                    <label>{stat.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={value}
                      onChange={(e) => updateStat('attacking', stat, e.target.value)}
                      className="stat-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'defending' && (
            <div className="form-section stats-section">
              <h3>Statistiche Difesa</h3>
              <div className="stats-grid">
                {Object.entries(playerData.defending).map(([stat, value]) => (
                  <div key={stat} className="stat-input-group">
                    <label>{stat.replace(/([A-Z])/g, ' $1').trim().replace('Gk', 'GK')}</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={value}
                      onChange={(e) => updateStat('defending', stat, e.target.value)}
                      className="stat-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'athleticism' && (
            <div className="form-section stats-section">
              <h3>Statistiche Fisico</h3>
              <div className="stats-grid">
                {Object.entries(playerData.athleticism).map(([stat, value]) => (
                  <div key={stat} className="stat-input-group">
                    <label>{stat.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input
                      type="number"
                      min={stat.includes('weakFoot') || stat === 'form' || stat === 'injuryResistance' ? 1 : 0}
                      max={stat.includes('weakFoot') ? 4 : stat === 'form' ? 8 : stat === 'injuryResistance' ? 3 : 99}
                      value={value}
                      onChange={(e) => updateStat('athleticism', stat, e.target.value)}
                      className="stat-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="form-section skills-section">
              <div className="skills-column">
                <h3>Skills</h3>
                <div className="skills-list">
                  {COMMON_SKILLS.map(skill => (
                    <label key={skill} className="skill-checkbox">
                      <input
                        type="checkbox"
                        checked={playerData.skills.includes(skill)}
                        onChange={() => toggleSkill(skill, false)}
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="skills-column">
                <h3>COM Skills</h3>
                <div className="skills-list">
                  {COMMON_COM_SKILLS.map(skill => (
                    <label key={skill} className="skill-checkbox">
                      <input
                        type="checkbox"
                        checked={playerData.comSkills.includes(skill)}
                        onChange={() => toggleSkill(skill, true)}
                      />
                      <span>{skill}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'build' && (
            <div className="form-section">
              <div className="form-group">
                <label>Livello Attuale</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={playerData.build.currentLevel || ''}
                  onChange={(e) => setPlayerData(prev => ({
                    ...prev,
                    build: { ...prev.build, currentLevel: parseInt(e.target.value) || null }
                  }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Level Cap</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={playerData.build.levelCap || ''}
                  onChange={(e) => setPlayerData(prev => ({
                    ...prev,
                    build: { ...prev.build, levelCap: parseInt(e.target.value) || null }
                  }))}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Booster Attivo</label>
                <input
                  type="text"
                  value={playerData.build.activeBooster || ''}
                  onChange={(e) => setPlayerData(prev => ({
                    ...prev,
                    build: { ...prev.build, activeBooster: e.target.value || null }
                  }))}
                  className="form-input"
                  placeholder="Es: Speed +5"
                />
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            onClick={handleSave}
            disabled={isSaving || !playerData.player_name.trim()}
            className="save-button"
          >
            <Save size={18} />
            {isSaving ? 'Salvataggio...' : 'Salva Giocatore'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RosaManualInput
