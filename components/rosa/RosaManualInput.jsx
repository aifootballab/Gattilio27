'use client'

import React, { useState, useEffect } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import { 
  User, X, Save, Plus, Trash2, 
  Target, Shield, Zap, 
  TrendingUp, Award, Settings,
  Info, Globe, Building2, CreditCard,
  Footprints, Calendar, Ruler, Weight
} from 'lucide-react'
import * as playerService from '../../services/playerService'
import { supabase } from '@/lib/supabase'
import './RosaManualInput.css'

const POSITIONS = [
  'GK', 'CB', 'LB', 'RB', 
  'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 
  'LWF', 'RWF', 'SS', 'CF'
]

const CARD_TYPES = [
  'Standard', 'Raro', 'Super Raro', 'Epico', 'Leggendario', 'Fantasy'
]

const WEAK_FOOT_USAGE = [
  { value: 1, label: 'Raramente' },
  { value: 2, label: 'Occasionalmente' },
  { value: 3, label: 'Spesso' },
  { value: 4, label: 'Sempre' }
]

const WEAK_FOOT_ACCURACY = [
  { value: 1, label: 'Bassa' },
  { value: 2, label: 'Media' },
  { value: 3, label: 'Alta' },
  { value: 4, label: 'Molto Alta' }
]

const FORM_OPTIONS = [
  { value: 1, label: 'E - Pessima' },
  { value: 2, label: 'D - Bassa' },
  { value: 3, label: 'C - Media' },
  { value: 4, label: 'B - Buona' },
  { value: 5, label: 'A - Eccellente' },
  { value: 6, label: 'B - Forma Arancione' },
  { value: 7, label: 'A - Forma Verde' },
  { value: 8, label: 'Normale' }
]

const INJURY_RESISTANCE = [
  { value: 1, label: 'Bassa' },
  { value: 2, label: 'Media' },
  { value: 3, label: 'Alta' }
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

// Lista booster comuni per eFootball
const COMMON_BOOSTERS = [
  { name: 'Speed +5', type: 'physical', rarity: 'common' },
  { name: 'Speed +10', type: 'physical', rarity: 'rare' },
  { name: 'Shooting +5', type: 'attacking', rarity: 'common' },
  { name: 'Shooting +10', type: 'attacking', rarity: 'rare' },
  { name: 'Passing +5', type: 'attacking', rarity: 'common' },
  { name: 'Passing +10', type: 'attacking', rarity: 'rare' },
  { name: 'Dribbling +5', type: 'attacking', rarity: 'common' },
  { name: 'Dribbling +10', type: 'attacking', rarity: 'rare' },
  { name: 'Defending +5', type: 'defending', rarity: 'common' },
  { name: 'Defending +10', type: 'defending', rarity: 'rare' },
  { name: 'Physical +5', type: 'physical', rarity: 'common' },
  { name: 'Physical +10', type: 'physical', rarity: 'rare' },
  { name: 'GK +5', type: 'goalkeeping', rarity: 'common' },
  { name: 'GK +10', type: 'goalkeeping', rarity: 'rare' }
]

const initialPlayerData = {
  player_name: '',
  position: 'CF',
  overall_rating: 0,
  // Dati fisici
  height: null,
  weight: null,
  age: null,
  nationality: '',
  club_name: '',
  card_type: 'Standard',
  era: '',
  team: '',
  // Statistiche
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
    activeBooster: null,
    activeBoosterId: null
  },
  preferredFoot: 'right', // right/left
  metadata: {}
}

function RosaManualInput({ onBack, onRosaCreated }) {
  const [playerData, setPlayerData] = useState(initialPlayerData)
  const [activeTab, setActiveTab] = useState('basic')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [availableBoosters, setAvailableBoosters] = useState([])
  const { addPlayer } = useRosa()

  useEffect(() => {
    // Carica booster disponibili dal database
    loadBoosters()
  }, [])

  const loadBoosters = async () => {
    try {
      const { data, error } = await supabase
        .from('boosters')
        .select('*')
        .order('name')

      if (!error && data) {
        setAvailableBoosters(data)
      } else {
        // Fallback: usa booster comuni se il database è vuoto
        setAvailableBoosters(COMMON_BOOSTERS.map((b, i) => ({
          id: `temp-${i}`,
          name: b.name,
          booster_type: b.type,
          rarity: b.rarity,
          description: `Booster ${b.type}`,
          effects: []
        })))
      }
    } catch (err) {
      console.error('Errore caricamento booster:', err)
      // Fallback a booster comuni
      setAvailableBoosters(COMMON_BOOSTERS.map((b, i) => ({
        id: `temp-${i}`,
        name: b.name,
        booster_type: b.type,
        rarity: b.rarity,
        description: `Booster ${b.type}`,
        effects: []
      })))
    }
  }

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
    // Calcolo migliorato basato sulle statistiche principali
    const att = Object.values(playerData.attacking).reduce((a, b) => a + b, 0) / 10
    const def = Object.values(playerData.defending).filter(v => v > 0).length > 0
      ? Object.values(playerData.defending).reduce((a, b) => a + b, 0) / 9
      : 0
    const ath = Object.values(playerData.athleticism).slice(0, 7).reduce((a, b) => a + b, 0) / 7
    
    // Se è un portiere, usa principalmente difesa
    if (playerData.position === 'GK') {
      const gkStats = [
        playerData.defending.goalkeeping,
        playerData.defending.gkCatching,
        playerData.defending.gkParrying,
        playerData.defending.gkReflexes,
        playerData.defending.gkReach
      ].filter(v => v > 0)
      const gkAvg = gkStats.reduce((a, b) => a + b, 0) / gkStats.length
      return Math.round(Math.max(att * 0.2 + ath * 0.2 + gkAvg * 0.6, 0))
    }
    
    // Per altri ruoli, media ponderata
    const base = (att + ath) / 2
    const rating = Math.round(base + (def > 0 ? def * 0.2 : 0))
    return Math.max(0, Math.min(120, rating))
  }

  const handleSave = async () => {
    if (!playerData.player_name.trim()) {
      setError('Nome giocatore obbligatorio')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const overallRating = playerData.overall_rating || calculateOverallRating()

      // Prepara dati completi per creare player e build
      const playerCompleteData = {
        player_name: playerData.player_name,
        position: playerData.position,
        height: playerData.height,
        weight: playerData.weight,
        age: playerData.age,
        nationality: playerData.nationality || null,
        club_name: playerData.club_name || null,
        card_type: playerData.card_type || null,
        era: playerData.era || null,
        team: playerData.team || null,
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
        active_booster_id: playerData.build.activeBoosterId,
        final_stats: {
          attacking: playerData.attacking,
          defending: playerData.defending,
          athleticism: playerData.athleticism
        },
        final_overall_rating: overallRating,
        source: 'manual',
        metadata: {
          ...playerData.metadata,
          preferred_foot: playerData.preferredFoot
        }
      }

      // Crea player_base e build insieme
      const result = await playerService.createPlayerWithBuild(playerCompleteData)

      // Aggiungi alla rosa corrente
      const playerForRosa = {
        build_id: result.build.id,
        player_name: playerData.player_name,
        position: playerData.position,
        overall_rating: overallRating,
        source: 'manual'
      }

      await addPlayer(playerForRosa)

      setSuccess(true)
      setTimeout(() => {
        if (onRosaCreated) {
          onRosaCreated()
        }
      }, 1500)
    } catch (err) {
      console.error('Errore salvataggio giocatore:', err)
      setError(err.message || 'Errore durante il salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const filterBoostersByPosition = (boosters) => {
    if (!playerData.position) return boosters
    // Filtra booster per posizione se disponibile
    return boosters.filter(b => {
      if (!b.available_for_positions || b.available_for_positions.length === 0) return true
      return b.available_for_positions.includes(playerData.position)
    })
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

      {success && (
        <div className="success-message">
          ✓ Giocatore salvato con successo! Aggiunto alla rosa.
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
            className={`tab-button ${activeTab === 'physical' ? 'active' : ''}`}
            onClick={() => setActiveTab('physical')}
          >
            <Info size={18} />
            <span>Info Fisiche</span>
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
            <span>Build & Booster</span>
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'basic' && (
            <div className="form-section">
              <div className="form-row">
                <div className="form-group">
                  <label>Nome Giocatore *</label>
                  <input
                    type="text"
                    value={playerData.player_name}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, player_name: e.target.value }))}
                    placeholder="Es: Gareth Bale"
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
              </div>

              <div className="form-row">
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
                  <p className="input-hint">Lascia vuoto per calcolo automatico</p>
                </div>

                <div className="form-group">
                  <label>Tipo di Carta</label>
                  <select
                    value={playerData.card_type}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, card_type: e.target.value }))}
                    className="form-select"
                  >
                    {CARD_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Era/Tipo Specifico</label>
                  <input
                    type="text"
                    value={playerData.era}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, era: e.target.value }))}
                    placeholder="Es: Tottenham WB 09-10"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Squadra</label>
                  <input
                    type="text"
                    value={playerData.team}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, team: e.target.value }))}
                    placeholder="Es: Tottenham Hotspur"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'physical' && (
            <div className="form-section">
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Ruler size={16} />
                    Altezza (cm)
                  </label>
                  <input
                    type="number"
                    min="140"
                    max="220"
                    value={playerData.height || ''}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, height: parseInt(e.target.value) || null }))}
                    className="form-input"
                    placeholder="185"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Weight size={16} />
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="120"
                    value={playerData.weight || ''}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, weight: parseInt(e.target.value) || null }))}
                    className="form-input"
                    placeholder="82"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Calendar size={16} />
                    Età
                  </label>
                  <input
                    type="number"
                    min="16"
                    max="50"
                    value={playerData.age || ''}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, age: parseInt(e.target.value) || null }))}
                    className="form-input"
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Globe size={16} />
                    Nazionalità
                  </label>
                  <input
                    type="text"
                    value={playerData.nationality}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, nationality: e.target.value }))}
                    placeholder="Es: Galles"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Building2 size={16} />
                    Club
                  </label>
                  <input
                    type="text"
                    value={playerData.club_name}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, club_name: e.target.value }))}
                    placeholder="Es: Tottenham Hotspur"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Footprints size={16} />
                    Piede Preferito
                  </label>
                  <select
                    value={playerData.preferredFoot}
                    onChange={(e) => setPlayerData(prev => ({ ...prev, preferredFoot: e.target.value }))}
                    className="form-select"
                  >
                    <option value="right">Destro</option>
                    <option value="left">Sinistro</option>
                    <option value="both">Ambidestro</option>
                  </select>
                </div>
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
                {Object.entries(playerData.athleticism).slice(0, 7).map(([stat, value]) => (
                  <div key={stat} className="stat-input-group">
                    <label>{stat.replace(/([A-Z])/g, ' $1').trim()}</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={value}
                      onChange={(e) => updateStat('athleticism', stat, e.target.value)}
                      className="stat-input"
                    />
                  </div>
                ))}
              </div>

              <div className="characteristics-section">
                <h4>Caratteristiche</h4>
                <div className="characteristics-grid">
                  <div className="form-group">
                    <label>Frequenza Piede Debole</label>
                    <select
                      value={playerData.athleticism.weakFootUsage}
                      onChange={(e) => updateStat('athleticism', 'weakFootUsage', e.target.value)}
                      className="form-select"
                    >
                      {WEAK_FOOT_USAGE.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Precisione Piede Debole</label>
                    <select
                      value={playerData.athleticism.weakFootAccuracy}
                      onChange={(e) => updateStat('athleticism', 'weakFootAccuracy', e.target.value)}
                      className="form-select"
                    >
                      {WEAK_FOOT_ACCURACY.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Forma</label>
                    <select
                      value={playerData.athleticism.form}
                      onChange={(e) => updateStat('athleticism', 'form', e.target.value)}
                      className="form-select"
                    >
                      {FORM_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Resistenza Infortuni</label>
                    <select
                      value={playerData.athleticism.injuryResistance}
                      onChange={(e) => updateStat('athleticism', 'injuryResistance', e.target.value)}
                      className="form-select"
                    >
                      {INJURY_RESISTANCE.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
              <div className="form-row">
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
                    placeholder="33"
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
                    placeholder="33"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <Award size={16} />
                  Booster Attivo
                </label>
                <select
                  value={playerData.build.activeBooster || ''}
                  onChange={(e) => {
                    const booster = availableBoosters.find(b => b.name === e.target.value)
                    setPlayerData(prev => ({
                      ...prev,
                      build: {
                        ...prev.build,
                        activeBooster: e.target.value || null,
                        activeBoosterId: booster?.id || null
                      }
                    }))
                  }}
                  className="form-select"
                >
                  <option value="">Nessun booster</option>
                  {filterBoostersByPosition(availableBoosters).map(booster => (
                    <option key={booster.id || booster.name} value={booster.name}>
                      {booster.name} {booster.description && `- ${booster.description}`}
                    </option>
                  ))}
                </select>
                <p className="input-hint">Seleziona un booster per potenziare le statistiche</p>
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
