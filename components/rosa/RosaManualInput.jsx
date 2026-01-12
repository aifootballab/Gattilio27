'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import { 
  X, Save, Target, Shield, Zap, Award,
  User, Ruler, Weight, Calendar, Globe, Building2, Users, Sparkles, Gamepad2, Cpu
} from 'lucide-react'
import * as playerService from '../../services/playerService'
import * as importService from '../../services/importService'
import { supabase } from '@/lib/supabase'
import PlayerAutocomplete from './PlayerAutocomplete'
import NumberInput from './NumberInput'
import './RosaManualInput.css'

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF']
const CARD_TYPES = ['Standard', 'Raro', 'Super Raro', 'Epico', 'Leggendario', 'Fantasy']
const CONDITIONS = ['A', 'B', 'C', 'D', 'E']
const WEAK_FOOT = ['Raramente', 'Occasionalmente', 'Spesso', 'Sempre']
const WEAK_FOOT_ACC = ['Bassa', 'Media', 'Alta', 'Molto Alta']
const FORM = ['E', 'D', 'C', 'B', 'A', 'B', 'A', 'Normale']
const INJURY = ['Bassa', 'Media', 'Alta']
const COMMON_SKILLS = ['Heading', 'Long Range Drive', 'Chip Shot Control', 'Heel Trick', 'First Time Shot', 'One Touch Pass', 'Through Passing', 'Outside Curler', 'Penalty Specialist', 'Fighting Spirit', 'Scissors Feint', 'Double Touch', 'Cross Over Turn', 'Cut Behind & Turn', 'Sole Control', 'Step On Skill Control', 'Marseille Turn', 'Sombrero', 'Flip Flap', 'Interception', 'Man Marking', 'Track Back', 'Acrobatic Clear', 'Captaincy']
const COMMON_COM_SKILLS = ['MazingRun', 'IncisiveRun', 'LongRanger', 'EarlyCross', 'Blocker', 'Track Back', 'Interception', 'Penalty Specialist', 'Captaincy']
const COMMON_BOOSTERS = [
  { name: 'Speed +5', type: 'physical' },
  { name: 'Speed +10', type: 'physical' },
  { name: 'Shooting +5', type: 'attacking' },
  { name: 'Shooting +10', type: 'attacking' },
  { name: 'Passing +5', type: 'attacking' },
  { name: 'Passing +10', type: 'attacking' },
  { name: 'Dribbling +5', type: 'attacking' },
  { name: 'Dribbling +10', type: 'attacking' },
  { name: 'Defending +5', type: 'defending' },
  { name: 'Defending +10', type: 'defending' },
  { name: 'Physical +5', type: 'physical' },
  { name: 'Physical +10', type: 'physical' },
  { name: 'GK +5', type: 'goalkeeping' },
  { name: 'GK +10', type: 'goalkeeping' }
]

// Usa COMMON_BOOSTERS come availableBoosters
const availableBoosters = COMMON_BOOSTERS.map((b, i) => ({ ...b, id: i + 1 }))

// Playing Styles (Stili di gioco del giocatore)
const PLAYING_STYLES = [
  // Attaccanti
  { name: 'Opportunista', positions: ['CF'], category: 'attacking' },
  { name: 'Senza palla', positions: ['CF', 'SS', 'RWF', 'LWF'], category: 'attacking' },
  { name: 'Rapace d\'area', positions: ['CF'], category: 'attacking' },
  { name: 'Fulcro di gioco', positions: ['CF'], category: 'attacking' },
  // Centrocampisti e Ali
  { name: 'Specialista di cross', positions: ['RWF', 'LWF', 'RMF', 'LMF'], category: 'midfield' },
  { name: 'Classico n°10', positions: ['SS', 'AMF'], category: 'midfield' },
  { name: 'Regista creativo', positions: ['SS', 'RWF', 'LWF', 'AMF', 'RMF', 'LMF'], category: 'midfield' },
  { name: 'Ala prolifica', positions: ['RWF', 'LWF'], category: 'midfield' },
  { name: 'Taglio al centro', positions: ['RWF', 'LWF'], category: 'midfield' },
  { name: 'Giocatore chiave', positions: ['SS', 'AMF', 'RMF', 'LMF', 'CMF'], category: 'midfield' },
  // Centrocampisti Difensivi
  { name: 'Tra le linee', positions: ['CMF', 'DMF'], category: 'midfield' },
  { name: 'Onnipresente', positions: ['RMF', 'LMF', 'CMF', 'DMF'], category: 'midfield' },
  { name: 'Collante', positions: ['DMF'], category: 'midfield' },
  { name: 'Incontrista', positions: ['CMF', 'DMF', 'CB'], category: 'midfield' },
  // Difensori
  { name: 'Sviluppo', positions: ['CB'], category: 'defensive' },
  { name: 'Frontale extra', positions: ['CB'], category: 'defensive' },
  // Terzini
  { name: 'Terzino offensivo', positions: ['RB', 'LB'], category: 'fullback' },
  { name: 'Terzino difensivo', positions: ['RB', 'LB'], category: 'fullback' },
  { name: 'Terzino mattatore', positions: ['RB', 'LB'], category: 'fullback' },
  // Portieri
  { name: 'Portiere offensivo', positions: ['GK'], category: 'goalkeeper' },
  { name: 'Portiere difensivo', positions: ['GK'], category: 'goalkeeper' }
]

// AI Playstyles (Stili di gioco IA)
const AI_PLAYSTYLES = [
  { name: 'Funambolo', description: 'Specializzato nel doppio passo e dribbling tecnico' },
  { name: 'Serpentina', description: 'Eccelle nei cambi di direzione e dribbling' },
  { name: 'Treno in corsa', description: 'Attacca la profondità con velocità' },
  { name: 'Inserimento', description: 'Usa il dribbling per creare spazi e occasioni' },
  { name: 'Esperto palle lunghe', description: 'Esegue spesso lanci lunghi' },
  { name: 'Crossatore', description: 'Cerca continuamente spazi per crossare' },
  { name: 'Tiratore', description: 'Predilige tiri da fuori area' }
]

// Team Playing Styles principali (come da efootballhub.net)
const TEAM_PLAYING_STYLES = [
  { name: 'Possession Game', key: 'possession_game', label: 'Possesso Palla' },
  { name: 'Quick Counter', key: 'quick_counter', label: 'Contropiede Rapido' },
  { name: 'Long Ball Counter', key: 'long_ball_counter', label: 'Contropiede Palla Lunga' },
  { name: 'Out Wide', key: 'out_wide', label: 'Gioco sulle Fasce' },
  { name: 'Long Ball', key: 'long_ball', label: 'Palla Lunga' }
]

const initialPlayerData = {
  player_name: '', position: 'CF', overall_rating: 0, potential_max: 0, condition: 'A',
  height: null, weight: null, age: null, nationality: '', club_name: '',
  card_type: 'Standard', era: '', team: '', preferredFoot: 'right',
  attacking: { offensiveAwareness: 0, ballControl: 0, dribbling: 0, tightPossession: 0, lowPass: 0, loftedPass: 0, finishing: 0, heading: 0, placeKicking: 0, curl: 0 },
  defending: { defensiveAwareness: 0, defensiveEngagement: 0, tackling: 0, aggression: 0, goalkeeping: 0, gkCatching: 0, gkParrying: 0, gkReflexes: 0, gkReach: 0 },
  athleticism: { speed: 0, acceleration: 0, kickingPower: 0, jump: 0, physicalContact: 0, balance: 0, stamina: 0, weakFootUsage: 4, weakFootAccuracy: 4, form: 8, injuryResistance: 2 },
  skills: [], comSkills: [], additionalSkills: [], // Abilità aggiuntive personalizzate
  playingStyles: [], // Playing Styles (es: Giocatore chiave, Incontrista)
  aiPlaystyles: [], // AI Playstyles (es: Esperto palle lunghe, Tiratore)
  team_playstyle_competency: {}, // { possession_game: 0, quick_counter: 0, ... }
  boosters: { primary: null, secondary: null }, // Alcuni giocatori hanno 2 booster
  metadata: {}
}

function RosaManualInput({ onBack, onRosaCreated }) {
  const [playerData, setPlayerData] = useState(initialPlayerData)
  const [activeTab, setActiveTab] = useState('basic')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [prefilledFrom, setPrefilledFrom] = useState(null)
  const [positionStats, setPositionStats] = useState(null)
  const [isPositionManuallyChanged, setIsPositionManuallyChanged] = useState(false)
  const { addPlayer } = useRosa()

  useEffect(() => {
    if (playerData.position) {
      loadPositionSuggestions(playerData.position)
    }
  }, [playerData.position])

  const loadPositionSuggestions = async (position) => {
    try {
      const stats = await importService.getPositionStats(position)
      setPositionStats(stats)
    } catch (error) {
      try {
        const defaultStats = importService.getDefaultPositionStats(position)
        setPositionStats(defaultStats)
      } catch {
        setPositionStats(null)
      }
    }
  }

  useEffect(() => {
    if (!positionStats || prefilledFrom) return

    setPlayerData(prev => {
      const hasStats = Object.values(prev.attacking).some(v => v > 0) ||
                       Object.values(prev.defending).some(v => v > 0) ||
                       Object.values(prev.athleticism).slice(0, 7).some(v => v > 0)

      if (hasStats && !isPositionManuallyChanged) return prev

      return {
        ...prev,
        attacking: { ...prev.attacking, ...positionStats.attacking },
        defending: { ...prev.defending, ...positionStats.defending },
        athleticism: { 
          ...prev.athleticism, 
          ...positionStats.athleticism,
          weakFootUsage: prev.athleticism.weakFootUsage || 4,
          weakFootAccuracy: prev.athleticism.weakFootAccuracy || 4,
          form: prev.athleticism.form || 8,
          injuryResistance: prev.athleticism.injuryResistance || 2
        }
      }
    })
    setIsPositionManuallyChanged(false)
  }, [positionStats, prefilledFrom, isPositionManuallyChanged])

  const updateStat = (category, stat, value) => {
    const numValue = typeof value === 'number' ? value : parseInt(value) || 0
    setPlayerData(prev => ({
      ...prev,
      [category]: { ...prev[category], [stat]: numValue }
    }))
  }

  const formatStatName = (stat) => {
    return stat.replace(/([A-Z])/g, ' $1').trim().replace('Gk', 'GK')
  }

  const updateTeamPlaystyleCompetency = (styleKey, value) => {
    const numValue = typeof value === 'number' ? value : parseInt(value) || 0
    setPlayerData(prev => ({
      ...prev,
      team_playstyle_competency: {
        ...prev.team_playstyle_competency,
        [styleKey]: Math.max(0, Math.min(99, numValue))
      }
    }))
  }

  const toggleSkill = (skill, isComSkill = false) => {
    const key = isComSkill ? 'comSkills' : 'skills'
    setPlayerData(prev => ({
      ...prev,
      [key]: prev[key].includes(skill) ? prev[key].filter(s => s !== skill) : [...prev[key], skill]
    }))
  }

  const togglePlayingStyle = (styleName) => {
    setPlayerData(prev => ({
      ...prev,
      playingStyles: prev.playingStyles.includes(styleName)
        ? prev.playingStyles.filter(s => s !== styleName)
        : [...prev.playingStyles, styleName]
    }))
  }

  const toggleAIPlaystyle = (styleName) => {
    setPlayerData(prev => ({
      ...prev,
      aiPlaystyles: prev.aiPlaystyles.includes(styleName)
        ? prev.aiPlaystyles.filter(s => s !== styleName)
        : [...prev.aiPlaystyles, styleName]
    }))
  }

  const addAdditionalSkill = (skillName) => {
    if (!skillName.trim()) return
    setPlayerData(prev => ({
      ...prev,
      additionalSkills: [...prev.additionalSkills, skillName.trim()]
    }))
  }

  const removeAdditionalSkill = (skillName) => {
    setPlayerData(prev => ({
      ...prev,
      additionalSkills: prev.additionalSkills.filter(s => s !== skillName)
    }))
  }

  const getCompatiblePlayingStyles = (position) => {
    return PLAYING_STYLES.filter(style => 
      style.positions.includes(position)
    )
  }

  const calculateOverallRating = () => {
    const att = Object.values(playerData.attacking).reduce((a, b) => a + b, 0) / 10
    const def = Object.values(playerData.defending).filter(v => v > 0).length > 0
      ? Object.values(playerData.defending).reduce((a, b) => a + b, 0) / 9 : 0
    const ath = Object.values(playerData.athleticism).slice(0, 7).reduce((a, b) => a + b, 0) / 7
    if (playerData.position === 'GK') {
      const gkStats = [playerData.defending.goalkeeping, playerData.defending.gkCatching, playerData.defending.gkParrying, playerData.defending.gkReflexes, playerData.defending.gkReach].filter(v => v > 0)
      const gkAvg = gkStats.reduce((a, b) => a + b, 0) / gkStats.length
      return Math.round(Math.max(att * 0.2 + ath * 0.2 + gkAvg * 0.6, 0))
    }
    return Math.max(0, Math.min(120, Math.round((att + ath) / 2 + (def > 0 ? def * 0.2 : 0))))
  }

  const handlePlayerSelect = async (selectedPlayer) => {
    if (!selectedPlayer || !selectedPlayer.id) return

    try {
      // Carica dati completi del giocatore (include base_stats completi)
      const fullPlayerData = await playerService.getPlayerBase(selectedPlayer.id)
      if (!fullPlayerData) return

      // Estrai dati base dal giocatore completo
      const baseData = playerService.extractBaseData(fullPlayerData)
      if (!baseData) return

      // Calcola rating se disponibile
      const baseStats = fullPlayerData.base_stats || {}
      const overallRating = baseStats.overall_rating || 
                           (baseData.attacking && Object.values(baseData.attacking).some(v => v > 0) ?
                            Math.round(Object.values(baseData.attacking).reduce((a, b) => a + b, 0) / 10) : 0)

      // Merge intelligente: dati base + mantieni modifiche utente su campi carta-specifici
      setPlayerData(prev => ({
        ...baseData,
        // Mantieni rating/potential se utente li ha già modificati
        overall_rating: prev.overall_rating || overallRating,
        potential_max: prev.potential_max || fullPlayerData.potential_max || 0,
        condition: prev.condition || fullPlayerData.form || 'A',
        // Mantieni team playstyle competency
        team_playstyle_competency: fullPlayerData.metadata?.team_playstyle_competency || prev.team_playstyle_competency || {},
        // Carica playing styles e AI playstyles
        playingStyles: fullPlayerData.metadata?.playing_styles || prev.playingStyles || [],
        aiPlaystyles: fullPlayerData.metadata?.ai_playstyles || prev.aiPlaystyles || [],
        additionalSkills: fullPlayerData.metadata?.additional_skills || prev.additionalSkills || []
      }))

      setPrefilledFrom(fullPlayerData.player_name)
    } catch (error) {
      console.error('Errore caricamento dati giocatore:', error)
      setError(`Errore precompilazione: ${error.message}`)
    }
  }

  const handleSave = async () => {
    if (!playerData.player_name.trim()) {
      setError('Nome obbligatorio')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const overallRating = playerData.overall_rating || calculateOverallRating()
      const result = await playerService.createPlayerWithBuild({
        player_name: playerData.player_name, position: playerData.position,
        height: playerData.height, weight: playerData.weight, age: playerData.age,
        nationality: playerData.nationality || null, club_name: playerData.club_name || null,
        card_type: playerData.card_type || null, era: playerData.era || null, team: playerData.team || null,
        potential_max: playerData.potential_max || null, form: playerData.condition,
        base_stats: { overall_rating: overallRating, attacking: playerData.attacking, defending: playerData.defending, athleticism: playerData.athleticism },
        skills: [...playerData.skills, ...playerData.additionalSkills], com_skills: playerData.comSkills, position_ratings: {},
        development_points: {}, current_level: null, level_cap: null,
        active_booster_name: playerData.boosters?.primary || null,
        active_booster_id: availableBoosters.find(b => b.name === playerData.boosters?.primary)?.id || null,
        final_stats: { attacking: playerData.attacking, defending: playerData.defending, athleticism: playerData.athleticism },
        final_overall_rating: overallRating, source: 'manual',
        metadata: { 
          ...playerData.metadata, 
          preferred_foot: playerData.preferredFoot,
          team_playstyle_competency: playerData.team_playstyle_competency || {},
          booster_secondary: playerData.boosters?.secondary || null, // Alcuni giocatori hanno 2 booster
          playing_styles: playerData.playingStyles || [],
          ai_playstyles: playerData.aiPlaystyles || [],
          additional_skills: playerData.additionalSkills || [] // Salva anche separatamente per chiarezza
        }
      })
      await addPlayer({ build_id: result.build.id, player_name: playerData.player_name, position: playerData.position, overall_rating: overallRating, source: 'manual' })
      if (onRosaCreated) onRosaCreated()
    } catch (err) {
      setError(err.message || 'Errore salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const overallRating = playerData.overall_rating || calculateOverallRating()
  const potentialMax = playerData.potential_max || overallRating

  return (
    <div className="rosa-manual-input">
      <div className="manual-header">
        <button onClick={onBack} className="back-btn"><X size={20} /></button>
        <div className="player-header-info">
          <div className="rating-display">
            <span className="current-rating">{overallRating}</span>
            {potentialMax > overallRating && <span className="potential-rating">{potentialMax}</span>}
          </div>
          <div className="position-condition">
            <span className="position">{playerData.position}</span>
            <span className="condition">{playerData.condition}</span>
          </div>
          <h2>{playerData.player_name || 'Nuovo Giocatore'}</h2>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tabs-nav">
        <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}><User size={16} />Base</button>
        <button className={activeTab === 'physical' ? 'active' : ''} onClick={() => setActiveTab('physical')}><Ruler size={16} />Fisico</button>
        <button className={activeTab === 'attacking' ? 'active' : ''} onClick={() => setActiveTab('attacking')}><Target size={16} />Att</button>
        <button className={activeTab === 'defending' ? 'active' : ''} onClick={() => setActiveTab('defending')}><Shield size={16} />Dif</button>
        <button className={activeTab === 'athleticism' ? 'active' : ''} onClick={() => setActiveTab('athleticism')}><Zap size={16} />Fis</button>
        <button className={activeTab === 'playstyles' ? 'active' : ''} onClick={() => setActiveTab('playstyles')}><Gamepad2 size={16} />Stili</button>
        <button className={activeTab === 'skills' ? 'active' : ''} onClick={() => setActiveTab('skills')}><Award size={16} />Skill</button>
        <button className={activeTab === 'teamplaystyle' ? 'active' : ''} onClick={() => setActiveTab('teamplaystyle')}><Users size={16} />Team Style</button>
      </div>

      <div className="tab-panel">
        {activeTab === 'basic' && (
          <div className="form-grid">
            <div className="input-field full-width">
              <label>Nome Giocatore</label>
              <PlayerAutocomplete
                value={playerData.player_name}
                onSelect={handlePlayerSelect}
                onInputChange={(name) => {
                  setPlayerData(prev => ({ ...prev, player_name: name }))
                  if (name !== prefilledFrom) {
                    setPrefilledFrom(null)
                  }
                }}
                placeholder="Cerca giocatore..."
              />
            </div>
            <div className="input-field">
              <label>Posizione</label>
              <select 
                value={playerData.position} 
                onChange={(e) => {
                  setIsPositionManuallyChanged(true)
                  setPlayerData(prev => ({ ...prev, position: e.target.value }))
                }}
              >
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="input-field">
              <label>Rating</label>
              <div className="rating-field">
                <input type="number" min="0" max="120" value={overallRating || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, overall_rating: parseInt(e.target.value) || 0 }))} />
                <button type="button" onClick={() => setPlayerData(prev => ({ ...prev, overall_rating: calculateOverallRating() }))}>Auto</button>
              </div>
            </div>
            <div className="input-field">
              <label>Potential</label>
              <input type="number" min="0" max="120" value={playerData.potential_max || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, potential_max: parseInt(e.target.value) || null }))} />
            </div>
            <div className="input-field">
              <label>Condizione</label>
              <select value={playerData.condition} onChange={(e) => setPlayerData(prev => ({ ...prev, condition: e.target.value }))}>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-field">
              <label>Tipo Carta</label>
              <select value={playerData.card_type} onChange={(e) => setPlayerData(prev => ({ ...prev, card_type: e.target.value }))}>
                {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="input-field">
              <label>Era</label>
              <input type="text" value={playerData.era} onChange={(e) => setPlayerData(prev => ({ ...prev, era: e.target.value }))} />
            </div>
            <div className="input-field">
              <label>Squadra</label>
              <input type="text" value={playerData.team} onChange={(e) => setPlayerData(prev => ({ ...prev, team: e.target.value }))} />
            </div>
            <div className="input-field full-width" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #2a2a2a' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={14} />
                Booster 1
              </label>
              <select 
                value={playerData.boosters?.primary || ''} 
                onChange={(e) => setPlayerData(prev => ({ 
                  ...prev, 
                  boosters: { ...prev.boosters, primary: e.target.value || null } 
                }))}
              >
                <option value="">Nessuno</option>
                {availableBoosters.filter(b => !playerData.position || !b.available_for_positions || b.available_for_positions.length === 0 || b.available_for_positions.includes(playerData.position)).map(b => (
                  <option key={b.id || b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="input-field full-width">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={14} />
                Booster 2 <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'normal' }}>(opzionale)</span>
              </label>
              <select 
                value={playerData.boosters?.secondary || ''} 
                onChange={(e) => setPlayerData(prev => ({ 
                  ...prev, 
                  boosters: { ...prev.boosters, secondary: e.target.value || null } 
                }))}
                disabled={!playerData.boosters?.primary}
              >
                <option value="">Nessuno</option>
                {availableBoosters.filter(b => !playerData.position || !b.available_for_positions || b.available_for_positions.length === 0 || b.available_for_positions.includes(playerData.position)).map(b => (
                  <option key={b.id || b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'physical' && (
          <div className="form-grid">
            <div className="input-field">
              <label><Ruler size={14} />Altezza</label>
              <input type="number" min="140" max="220" value={playerData.height || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, height: parseInt(e.target.value) || null }))} />
            </div>
            <div className="input-field">
              <label><Weight size={14} />Peso</label>
              <input type="number" min="40" max="120" value={playerData.weight || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, weight: parseInt(e.target.value) || null }))} />
            </div>
            <div className="input-field">
              <label><Calendar size={14} />Età</label>
              <input type="number" min="16" max="50" value={playerData.age || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, age: parseInt(e.target.value) || null }))} />
            </div>
            <div className="input-field">
              <label><Globe size={14} />Nazionalità</label>
              <input type="text" value={playerData.nationality} onChange={(e) => setPlayerData(prev => ({ ...prev, nationality: e.target.value }))} />
            </div>
            <div className="input-field">
              <label><Building2 size={14} />Club</label>
              <input type="text" value={playerData.club_name} onChange={(e) => setPlayerData(prev => ({ ...prev, club_name: e.target.value }))} />
            </div>
            <div className="input-field">
              <label>Piede</label>
              <select value={playerData.preferredFoot} onChange={(e) => setPlayerData(prev => ({ ...prev, preferredFoot: e.target.value }))}>
                <option value="right">Destro</option>
                <option value="left">Sinistro</option>
                <option value="both">Ambidestro</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'attacking' && (
          <div className="stats-list">
            {Object.entries(playerData.attacking).map(([stat, value]) => (
              <div key={stat} className="stat-item-card">
                <NumberInput
                  label={formatStatName(stat)}
                  value={value}
                  onChange={(newValue) => updateStat('attacking', stat, newValue)}
                  min={0}
                  max={99}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'defending' && (
          <div className="stats-list">
            {Object.entries(playerData.defending).map(([stat, value]) => (
              <div key={stat} className="stat-item-card">
                <NumberInput
                  label={formatStatName(stat)}
                  value={value}
                  onChange={(newValue) => updateStat('defending', stat, newValue)}
                  min={0}
                  max={99}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'athleticism' && (
          <>
            <div className="stats-list">
              {Object.entries(playerData.athleticism).slice(0, 7).map(([stat, value]) => (
                <div key={stat} className="stat-item-card">
                  <NumberInput
                    label={formatStatName(stat)}
                    value={value}
                    onChange={(newValue) => updateStat('athleticism', stat, newValue)}
                    min={0}
                    max={99}
                  />
                </div>
              ))}
            </div>
            <div className="characteristics">
              <div className="char-field">
                <label>Piede Debole Uso</label>
                <select value={playerData.athleticism.weakFootUsage} onChange={(e) => updateStat('athleticism', 'weakFootUsage', e.target.value)}>
                  {WEAK_FOOT.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
                </select>
              </div>
              <div className="char-field">
                <label>Piede Debole Prec</label>
                <select value={playerData.athleticism.weakFootAccuracy} onChange={(e) => updateStat('athleticism', 'weakFootAccuracy', e.target.value)}>
                  {WEAK_FOOT_ACC.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
                </select>
              </div>
              <div className="char-field">
                <label>Forma</label>
                <select value={playerData.athleticism.form} onChange={(e) => updateStat('athleticism', 'form', e.target.value)}>
                  {FORM.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
                </select>
              </div>
              <div className="char-field">
                <label>Resistenza Inf</label>
                <select value={playerData.athleticism.injuryResistance} onChange={(e) => updateStat('athleticism', 'injuryResistance', e.target.value)}>
                  {INJURY.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {activeTab === 'playstyles' && (
          <div className="playstyles-panel">
            <div className="playstyles-section">
              <h3>Playing Styles (Stili di Gioco)</h3>
              <p className="section-description">Stili di gioco del giocatore - determinano il comportamento in campo</p>
              <div className="playstyles-grid">
                {getCompatiblePlayingStyles(playerData.position).map(style => (
                  <label key={style.name} className="playstyle-item-checkbox">
                    <input 
                      type="checkbox" 
                      checked={playerData.playingStyles.includes(style.name)} 
                      onChange={() => togglePlayingStyle(style.name)} 
                    />
                    <span className="playstyle-badge">
                      {style.name}
                      <span className="playstyle-category">{style.category}</span>
                    </span>
                  </label>
                ))}
                {getCompatiblePlayingStyles(playerData.position).length === 0 && (
                  <p className="no-items">Nessuno stile compatibile per la posizione {playerData.position}</p>
                )}
              </div>
            </div>
            
            <div className="playstyles-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #2a2a2a' }}>
              <h3>AI Playstyles (Stili di Gioco IA)</h3>
              <p className="section-description">Stili di gioco IA - determinano il comportamento con palla</p>
              <div className="playstyles-grid">
                {AI_PLAYSTYLES.map(style => (
                  <label key={style.name} className="playstyle-item-checkbox">
                    <input 
                      type="checkbox" 
                      checked={playerData.aiPlaystyles.includes(style.name)} 
                      onChange={() => toggleAIPlaystyle(style.name)} 
                    />
                    <span className="playstyle-badge">
                      {style.name}
                      {style.description && <span className="playstyle-description">{style.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="skills-panel">
            <div className="skills-col">
              <h3>Skills</h3>
              <div className="skills-list">
                {COMMON_SKILLS.map(s => (
                  <label key={s} className="skill-item">
                    <input type="checkbox" checked={playerData.skills.includes(s)} onChange={() => toggleSkill(s, false)} />
                    <span className="skill-badge">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="skills-col">
              <h3>COM Skills</h3>
              <div className="skills-list">
                {COMMON_COM_SKILLS.map(s => (
                  <label key={s} className="skill-item">
                    <input type="checkbox" checked={playerData.comSkills.includes(s)} onChange={() => toggleSkill(s, true)} />
                    <span className="skill-badge">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="skills-col" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #2a2a2a', gridColumn: '1 / -1' }}>
              <h3>Abilità Aggiuntive</h3>
              <p className="section-description">Skills personalizzate che puoi aggiungere manualmente</p>
              <div className="additional-skills-input">
                <input
                  type="text"
                  placeholder="Inserisci nome skill e premi Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addAdditionalSkill(e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>
              <div className="skills-list" style={{ marginTop: '1rem' }}>
                {playerData.additionalSkills.map(skill => (
                  <label key={skill} className="skill-item">
                    <span className="skill-badge additional">{skill}</span>
                    <button 
                      type="button" 
                      className="remove-skill-btn"
                      onClick={() => removeAdditionalSkill(skill)}
                    >
                      <X size={14} />
                    </button>
                  </label>
                ))}
                {playerData.additionalSkills.length === 0 && (
                  <p className="no-items" style={{ fontSize: '0.9rem', color: '#888' }}>Nessuna abilità aggiuntiva</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teamplaystyle' && (
          <div className="team-playstyle-panel">
            <div className="playstyle-intro">
              <p>Competenza del giocatore per ogni stile di gioco di squadra (0-99)</p>
            </div>
            <div className="playstyle-grid">
              {TEAM_PLAYING_STYLES.map(style => (
                <div key={style.key} className="playstyle-item">
                  <label className="playstyle-label">{style.label}</label>
                  <NumberInput
                    value={playerData.team_playstyle_competency[style.key] || 0}
                    onChange={(newValue) => updateTeamPlaystyleCompetency(style.key, newValue)}
                    min={0}
                    max={99}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="form-footer">
        <button onClick={handleSave} disabled={isSaving || !playerData.player_name.trim()} className="save-btn">
          <Save size={18} />
          {isSaving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </div>
  )
}

export default RosaManualInput
