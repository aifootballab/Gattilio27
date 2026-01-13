'use client'

import React, { useState, useEffect } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import { 
  X, Save, Sparkles, BarChart3, ChevronLeft, ChevronRight,
  User, Ruler, Weight, Calendar, Globe, Building2, Square, Triangle, FileText
} from 'lucide-react'
import * as playerService from '../../services/playerService'
import * as importService from '../../services/importService'
import { supabase } from '@/lib/supabase'
import PlayerAutocomplete from './PlayerAutocomplete'
import NumberInput from './NumberInput'
import PlayerCardDetailed from './PlayerCardDetailed'
import './RosaManualInput.css'

// ... (mantengo tutte le costanti esistenti)
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
const availableBoosters = COMMON_BOOSTERS.map((b, i) => ({ ...b, id: i + 1 }))
const PLAYING_STYLES = [
  { name: 'Opportunista', positions: ['CF'], category: 'attacking' },
  { name: 'Senza palla', positions: ['CF', 'SS', 'RWF', 'LWF'], category: 'attacking' },
  { name: 'Rapace d\'area', positions: ['CF'], category: 'attacking' },
  { name: 'Fulcro di gioco', positions: ['CF'], category: 'attacking' },
  { name: 'Specialista di cross', positions: ['RWF', 'LWF', 'RMF', 'LMF'], category: 'midfield' },
  { name: 'Classico n°10', positions: ['SS', 'AMF'], category: 'midfield' },
  { name: 'Regista creativo', positions: ['SS', 'RWF', 'LWF', 'AMF', 'RMF', 'LMF'], category: 'midfield' },
  { name: 'Ala prolifica', positions: ['RWF', 'LWF'], category: 'midfield' },
  { name: 'Taglio al centro', positions: ['RWF', 'LWF'], category: 'midfield' },
  { name: 'Giocatore chiave', positions: ['SS', 'AMF', 'RMF', 'LMF', 'CMF'], category: 'midfield' },
  { name: 'Tra le linee', positions: ['CMF', 'DMF'], category: 'midfield' },
  { name: 'Onnipresente', positions: ['RMF', 'LMF', 'CMF', 'DMF'], category: 'midfield' },
  { name: 'Collante', positions: ['DMF'], category: 'midfield' },
  { name: 'Incontrista', positions: ['CMF', 'DMF', 'CB'], category: 'midfield' },
  { name: 'Sviluppo', positions: ['CB'], category: 'defensive' },
  { name: 'Frontale extra', positions: ['CB'], category: 'defensive' },
  { name: 'Terzino offensivo', positions: ['RB', 'LB'], category: 'fullback' },
  { name: 'Terzino difensivo', positions: ['RB', 'LB'], category: 'fullback' },
  { name: 'Terzino mattatore', positions: ['RB', 'LB'], category: 'fullback' },
  { name: 'Portiere offensivo', positions: ['GK'], category: 'goalkeeper' },
  { name: 'Portiere difensivo', positions: ['GK'], category: 'goalkeeper' }
]
const AI_PLAYSTYLES = [
  { name: 'Funambolo', description: 'Specializzato nel doppio passo e dribbling tecnico' },
  { name: 'Serpentina', description: 'Eccelle nei cambi di direzione e dribbling' },
  { name: 'Treno in corsa', description: 'Attacca la profondità con velocità' },
  { name: 'Inserimento', description: 'Usa il dribbling per creare spazi e occasioni' },
  { name: 'Esperto palle lunghe', description: 'Esegue spesso lanci lunghi' },
  { name: 'Crossatore', description: 'Cerca continuamente spazi per crossare' },
  { name: 'Tiratore', description: 'Predilige tiri da fuori area' }
]
const TEAM_PLAYING_STYLES = [
  { name: 'Possession Game', key: 'possession_game', label: 'Possesso Palla' },
  { name: 'Quick Counter', key: 'quick_counter', label: 'Contropiede Rapido' },
  { name: 'Long Ball Counter', key: 'long_ball_counter', label: 'Contropiede Palla Lunga' },
  { name: 'Out Wide', key: 'out_wide', label: 'Gioco sulle Fasce' },
  { name: 'Long Ball', key: 'long_ball', label: 'Palla Lunga' }
]

const VIEWS = {
  SVILUPPO: 'sviluppo',
  BOOSTER: 'booster',
  STATISTICHE: 'statistiche'
}

const VIEW_LABELS = {
  [VIEWS.SVILUPPO]: 'Sviluppo',
  [VIEWS.BOOSTER]: 'Booster',
  [VIEWS.STATISTICHE]: 'Statistiche'
}

const initialPlayerData = {
  player_name: '', position: 'CF', overall_rating: 0, potential_max: 0, condition: 'A',
  height: null, weight: null, age: null, nationality: '', club_name: '',
  card_type: 'Standard', era: '', team: '', preferredFoot: 'right',
  attacking: { offensiveAwareness: 0, ballControl: 0, dribbling: 0, tightPossession: 0, lowPass: 0, loftedPass: 0, finishing: 0, heading: 0, placeKicking: 0, curl: 0 },
  defending: { defensiveAwareness: 0, defensiveEngagement: 0, tackling: 0, aggression: 0, goalkeeping: 0, gkCatching: 0, gkParrying: 0, gkReflexes: 0, gkReach: 0 },
  athleticism: { speed: 0, acceleration: 0, kickingPower: 0, jump: 0, physicalContact: 0, balance: 0, stamina: 0, weakFootUsage: 4, weakFootAccuracy: 4, form: 8, injuryResistance: 2 },
  skills: [], comSkills: [], additionalSkills: [],
  playingStyles: [], aiPlaystyles: [],
  team_playstyle_competency: {},
  boosters: { primary: null, secondary: null },
  metadata: {},
  matches_played: null, goals: null, assists: null,
  current_level: null, level_cap: null, progress_points: 0
}

function RosaManualInput({ onBack, onRosaCreated }) {
  const [playerData, setPlayerData] = useState(initialPlayerData)
  const [activeView, setActiveView] = useState(VIEWS.SVILUPPO)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [prefilledFrom, setPrefilledFrom] = useState(null)
  const [positionStats, setPositionStats] = useState(null)
  const [isPositionManuallyChanged, setIsPositionManuallyChanged] = useState(false)
  const [showMaxBooster, setShowMaxBooster] = useState(false)
  const { addPlayer } = useRosa()

  // ... (mantengo tutti gli useEffect e funzioni esistenti)
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
      const fullPlayerData = await playerService.getPlayerBase(selectedPlayer.id)
      if (!fullPlayerData) return
      const baseData = playerService.extractBaseData(fullPlayerData)
      if (!baseData) return
      const baseStats = fullPlayerData.base_stats || {}
      const overallRating = baseStats.overall_rating || 
                           (baseData.attacking && Object.values(baseData.attacking).some(v => v > 0) ?
                            Math.round(Object.values(baseData.attacking).reduce((a, b) => a + b, 0) / 10) : 0)
      setPlayerData(prev => ({
        ...baseData,
        overall_rating: prev.overall_rating || overallRating,
        potential_max: prev.potential_max || fullPlayerData.potential_max || 0,
        condition: prev.condition || fullPlayerData.form || 'A',
        team_playstyle_competency: fullPlayerData.metadata?.team_playstyle_competency || prev.team_playstyle_competency || {},
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
        development_points: {}, current_level: playerData.current_level || null, level_cap: playerData.level_cap || null,
        active_booster_name: playerData.boosters?.primary || null,
        active_booster_id: availableBoosters.find(b => b.name === playerData.boosters?.primary)?.id || null,
        final_stats: { attacking: playerData.attacking, defending: playerData.defending, athleticism: playerData.athleticism },
        final_overall_rating: overallRating, source: 'manual',
        metadata: { 
          ...playerData.metadata, 
          preferred_foot: playerData.preferredFoot,
          team_playstyle_competency: playerData.team_playstyle_competency || {},
          booster_secondary: playerData.boosters?.secondary || null,
          playing_styles: playerData.playingStyles || [],
          ai_playstyles: playerData.aiPlaystyles || [],
          additional_skills: playerData.additionalSkills || []
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

  // Navigazione viste
  const nextView = () => {
    const views = Object.values(VIEWS)
    const currentIndex = views.indexOf(activeView)
    const nextIndex = (currentIndex + 1) % views.length
    setActiveView(views[nextIndex])
  }

  const prevView = () => {
    const views = Object.values(VIEWS)
    const currentIndex = views.indexOf(activeView)
    const prevIndex = (currentIndex - 1 + views.length) % views.length
    setActiveView(views[prevIndex])
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'q') prevView()
      if (e.key === 'ArrowRight' || e.key === 'e') nextView()
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [activeView])

  // Player object per PlayerCardDetailed
  const playerForCard = {
    player_name: playerData.player_name || 'Nuovo Giocatore',
    position: playerData.position,
    overall_rating: overallRating,
    base_stats: {
      attacking: playerData.attacking,
      defending: playerData.defending,
      athleticism: playerData.athleticism
    },
    height: playerData.height,
    weight: playerData.weight,
    age: playerData.age,
    nationality: playerData.nationality,
    club_name: playerData.club_name,
    form: playerData.condition,
    metadata: {
      preferred_foot: playerData.preferredFoot,
      playing_styles: playerData.playingStyles,
      ai_playstyles: playerData.aiPlaystyles
    },
    matches_played: playerData.matches_played,
    goals: playerData.goals,
    assists: playerData.assists
  }

  return (
    <div className="rosa-manual-input efootball-style">
      {/* Header con navigazione */}
      <div className="manual-header profile-header">
        <div className="profile-header-left">
          <button onClick={onBack} className="close-btn">
            <X size={20} />
          </button>
          <h2 className="profile-title">{playerData.player_name || 'Nuovo Giocatore'}</h2>
        </div>
        
        <div className="view-navigation">
          <button 
            className="nav-btn prev" 
            onClick={prevView}
            title="Vista precedente (← o Q)"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="view-tabs">
            {Object.entries(VIEW_LABELS).map(([key, label]) => (
              <button
                key={key}
                className={`view-tab ${activeView === key ? 'active' : ''}`}
                onClick={() => setActiveView(key)}
              >
                {key === VIEWS.SVILUPPO && <FileText size={16} />}
                {key === VIEWS.BOOSTER && <Sparkles size={16} />}
                {key === VIEWS.STATISTICHE && <BarChart3 size={16} />}
                <span>{label}</span>
              </button>
            ))}
          </div>
          
          <button 
            className="nav-btn next" 
            onClick={nextView}
            title="Vista successiva (→ o E)"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving || !playerData.player_name.trim()} 
          className="edit-btn save-btn"
        >
          <Save size={16} />
          {isSaving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* Contenuto viste */}
      <div className="profile-content">
        {activeView === VIEWS.SVILUPPO && (
          <SviluppoViewEdit 
            playerData={playerData}
            setPlayerData={setPlayerData}
            playerForCard={playerForCard}
            handlePlayerSelect={handlePlayerSelect}
            prefilledFrom={prefilledFrom}
            setPrefilledFrom={setPrefilledFrom}
            setIsPositionManuallyChanged={setIsPositionManuallyChanged}
            overallRating={overallRating}
            calculateOverallRating={calculateOverallRating}
            toggleSkill={toggleSkill}
            togglePlayingStyle={togglePlayingStyle}
            toggleAIPlaystyle={toggleAIPlaystyle}
            addAdditionalSkill={addAdditionalSkill}
            removeAdditionalSkill={removeAdditionalSkill}
            getCompatiblePlayingStyles={getCompatiblePlayingStyles}
            showMaxBooster={showMaxBooster}
            setShowMaxBooster={setShowMaxBooster}
          />
        )}

        {activeView === VIEWS.BOOSTER && (
          <BoosterViewEdit 
            playerData={playerData}
            setPlayerData={setPlayerData}
            playerForCard={playerForCard}
            availableBoosters={availableBoosters}
            showMaxBooster={showMaxBooster}
            setShowMaxBooster={setShowMaxBooster}
            handlePlayerSelect={handlePlayerSelect}
            prefilledFrom={prefilledFrom}
            setPrefilledFrom={setPrefilledFrom}
            setIsPositionManuallyChanged={setIsPositionManuallyChanged}
            overallRating={overallRating}
            calculateOverallRating={calculateOverallRating}
            toggleSkill={toggleSkill}
            togglePlayingStyle={togglePlayingStyle}
            toggleAIPlaystyle={toggleAIPlaystyle}
            addAdditionalSkill={addAdditionalSkill}
            removeAdditionalSkill={removeAdditionalSkill}
            getCompatiblePlayingStyles={getCompatiblePlayingStyles}
          />
        )}

        {activeView === VIEWS.STATISTICHE && (
          <StatisticheViewEdit 
            playerData={playerData}
            setPlayerData={setPlayerData}
            playerForCard={playerForCard}
            updateStat={updateStat}
            formatStatName={formatStatName}
            showMaxBooster={showMaxBooster}
          />
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bottom-nav-bar">
        <button className="nav-bar-btn back" onClick={onBack}>
          <ChevronLeft size={18} />
          <span>Indietro</span>
        </button>
        <button className="nav-bar-btn options">
          <Square size={18} />
          <span>Opzioni giocatore</span>
        </button>
        <button className="nav-bar-btn change-view" onClick={nextView}>
          <Triangle size={18} />
          <span>Cambia visuale</span>
        </button>
      </div>
    </div>
  )
}

// Vista Sviluppo Editabile
function SviluppoViewEdit({ 
  playerData, setPlayerData, playerForCard, handlePlayerSelect, prefilledFrom, setPrefilledFrom,
  setIsPositionManuallyChanged, overallRating, calculateOverallRating, toggleSkill, togglePlayingStyle,
  toggleAIPlaystyle, addAdditionalSkill, removeAdditionalSkill, getCompatiblePlayingStyles,
  showMaxBooster, setShowMaxBooster
}) {
  return (
    <div className="view-container sviluppo-view-edit">
      <div className="view-layout">
        {/* Sinistra: Player Card + Info Carta */}
        <div className="view-left">
          <PlayerCardDetailed player={playerForCard} />
          
          <div className="card-info-section">
            <div className="input-field">
              <label>Tipo di carta</label>
              <select 
                value={playerData.card_type} 
                onChange={(e) => setPlayerData(prev => ({ ...prev, card_type: e.target.value }))}
              >
                {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="input-field">
              <label>Tipo/Era</label>
              <input 
                type="text" 
                value={playerData.era || ''} 
                placeholder="es: FC Bayern München 73-74"
                onChange={(e) => setPlayerData(prev => ({ ...prev, era: e.target.value }))} 
              />
            </div>
            <div className="input-field">
              <label>Partite gioc.</label>
              <input 
                type="number" 
                min="0" 
                value={playerData.matches_played || ''} 
                onChange={(e) => setPlayerData(prev => ({ ...prev, matches_played: parseInt(e.target.value) || null }))} 
              />
            </div>
            <div className="input-field">
              <label>Gol</label>
              <input 
                type="number" 
                min="0" 
                value={playerData.goals || ''} 
                onChange={(e) => setPlayerData(prev => ({ ...prev, goals: parseInt(e.target.value) || null }))} 
              />
            </div>
            <div className="input-field">
              <label>Assist</label>
              <input 
                type="number" 
                min="0" 
                value={playerData.assists || ''} 
                onChange={(e) => setPlayerData(prev => ({ ...prev, assists: parseInt(e.target.value) || null }))} 
              />
            </div>
            <div className="input-field">
              <label>Nazionalità/Regione</label>
              <input 
                type="text" 
                value={playerData.nationality || ''} 
                onChange={(e) => setPlayerData(prev => ({ ...prev, nationality: e.target.value }))} 
              />
            </div>
          </div>
        </div>

        {/* Centro: Dati Base + Skills */}
        <div className="view-center">
          <div className="base-info-section">
            <h3>Sviluppo</h3>
            <div className="player-name-input">
              <PlayerAutocomplete
                value={playerData.player_name}
                onSelect={handlePlayerSelect}
                onInputChange={(name) => {
                  setPlayerData(prev => ({ ...prev, player_name: name }))
                  if (name !== prefilledFrom) {
                    setPrefilledFrom(null)
                  }
                }}
                placeholder="Nome giocatore..."
              />
            </div>
            <div className="base-info-grid">
              <div className="info-item">
                <label>Rating</label>
                <div className="rating-input-group">
                  <input 
                    type="number" 
                    min="0" 
                    max="120" 
                    value={overallRating || ''} 
                    onChange={(e) => setPlayerData(prev => ({ ...prev, overall_rating: parseInt(e.target.value) || 0 }))} 
                  />
                  <button type="button" onClick={() => setPlayerData(prev => ({ ...prev, overall_rating: calculateOverallRating() }))}>
                    Auto
                  </button>
                </div>
              </div>
              <div className="info-item">
                <label>Livello</label>
                <div className="level-input-group">
                  <input 
                    type="number" 
                    min="1" 
                    value={playerData.current_level || ''} 
                    onChange={(e) => setPlayerData(prev => ({ ...prev, current_level: parseInt(e.target.value) || null }))} 
                    placeholder="Current"
                  />
                  <span>/</span>
                  <input 
                    type="number" 
                    min="1" 
                    value={playerData.level_cap || ''} 
                    onChange={(e) => setPlayerData(prev => ({ ...prev, level_cap: parseInt(e.target.value) || null }))} 
                    placeholder="Max"
                  />
                </div>
              </div>
              <div className="info-item">
                <label>Punti progresso</label>
                <input 
                  type="number" 
                  min="0" 
                  value={playerData.progress_points || 0} 
                  onChange={(e) => setPlayerData(prev => ({ ...prev, progress_points: parseInt(e.target.value) || 0 }))} 
                />
              </div>
              <div className="info-item">
                <label>Altezza</label>
                <input 
                  type="number" 
                  min="140" 
                  max="220" 
                  value={playerData.height || ''} 
                  onChange={(e) => setPlayerData(prev => ({ ...prev, height: parseInt(e.target.value) || null }))} 
                  placeholder="cm"
                />
              </div>
              <div className="info-item">
                <label>Peso</label>
                <input 
                  type="number" 
                  min="40" 
                  max="120" 
                  value={playerData.weight || ''} 
                  onChange={(e) => setPlayerData(prev => ({ ...prev, weight: parseInt(e.target.value) || null }))} 
                  placeholder="kg"
                />
              </div>
              <div className="info-item">
                <label>Età</label>
                <input 
                  type="number" 
                  min="16" 
                  max="50" 
                  value={playerData.age || ''} 
                  onChange={(e) => setPlayerData(prev => ({ ...prev, age: parseInt(e.target.value) || null }))} 
                />
              </div>
              <div className="info-item">
                <label>Valutazione</label>
                <select 
                  value={playerData.condition} 
                  onChange={(e) => setPlayerData(prev => ({ ...prev, condition: e.target.value }))}
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="info-item">
                <label>Piede preferito</label>
                <select 
                  value={playerData.preferredFoot} 
                  onChange={(e) => setPlayerData(prev => ({ ...prev, preferredFoot: e.target.value }))}
                >
                  <option value="right">Destro</option>
                  <option value="left">Sinistro</option>
                  <option value="both">Ambidestro</option>
                </select>
              </div>
              <div className="info-item">
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
            </div>
          </div>

          {/* Skills */}
          <div className="skills-section">
            <h4>Abilità giocatore</h4>
            <div className="skills-list">
              {COMMON_SKILLS.map(s => (
                <label key={s} className="skill-item">
                  <input 
                    type="checkbox" 
                    checked={playerData.skills.includes(s)} 
                    onChange={() => toggleSkill(s, false)} 
                  />
                  <span className="skill-badge">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Abilità aggiuntive */}
          <div className="additional-skills-section">
            <h4>Abilità aggiuntive</h4>
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
            <div className="skills-list">
              {playerData.additionalSkills.map(skill => (
                <span key={skill} className="skill-badge additional">
                  {skill}
                  <button 
                    type="button" 
                    className="remove-skill-btn"
                    onClick={() => removeAdditionalSkill(skill)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Destra: Playstyles + Chart */}
        <div className="view-right">
          <div className="booster-toggle-section">
            <label className="booster-toggle">
              <input
                type="checkbox"
                checked={showMaxBooster}
                onChange={(e) => setShowMaxBooster(e.target.checked)}
              />
              <span>Vedi effetto Booster max</span>
            </label>
          </div>

          {/* AI Playstyles */}
          <div className="playstyles-section">
            <h4>Stili di gioco IA</h4>
            <div className="playstyles-list">
              {AI_PLAYSTYLES.map(style => (
                <label key={style.name} className="playstyle-item-checkbox">
                  <input 
                    type="checkbox" 
                    checked={playerData.aiPlaystyles.includes(style.name)} 
                    onChange={() => toggleAIPlaystyle(style.name)} 
                  />
                  <span className="playstyle-badge">{style.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Playing Styles */}
          <div className="playstyles-section">
            <h4>Stili di gioco</h4>
            <div className="playstyles-list">
              {getCompatiblePlayingStyles(playerData.position).map(style => (
                <label key={style.name} className="playstyle-item-checkbox">
                  <input 
                    type="checkbox" 
                    checked={playerData.playingStyles.includes(style.name)} 
                    onChange={() => togglePlayingStyle(style.name)} 
                  />
                  <span className="playstyle-badge">{style.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Radar Chart Placeholder */}
          <div className="radar-chart-placeholder">
            <p>Radar Chart (da implementare)</p>
          </div>

          {/* Campo Posizione Placeholder */}
          <div className="position-field-placeholder">
            <p>Campo Posizione (da implementare)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Vista Booster Editabile
function BoosterViewEdit({ 
  playerData, setPlayerData, playerForCard, availableBoosters, showMaxBooster, setShowMaxBooster,
  handlePlayerSelect, prefilledFrom, setPrefilledFrom, setIsPositionManuallyChanged,
  overallRating, calculateOverallRating, toggleSkill, togglePlayingStyle, toggleAIPlaystyle,
  addAdditionalSkill, removeAdditionalSkill, getCompatiblePlayingStyles
}) {
  return (
    <div className="view-container booster-view-edit">
      {/* Stessa struttura Vista Sviluppo */}
      <SviluppoViewEdit 
        playerData={playerData}
        setPlayerData={setPlayerData}
        playerForCard={playerForCard}
        handlePlayerSelect={handlePlayerSelect}
        prefilledFrom={prefilledFrom}
        setPrefilledFrom={setPrefilledFrom}
        setIsPositionManuallyChanged={setIsPositionManuallyChanged}
        overallRating={overallRating}
        calculateOverallRating={calculateOverallRating}
        toggleSkill={toggleSkill}
        togglePlayingStyle={togglePlayingStyle}
        toggleAIPlaystyle={toggleAIPlaystyle}
        addAdditionalSkill={addAdditionalSkill}
        removeAdditionalSkill={removeAdditionalSkill}
        getCompatiblePlayingStyles={getCompatiblePlayingStyles}
        showMaxBooster={showMaxBooster}
        setShowMaxBooster={setShowMaxBooster}
      />
      
      {/* Sezione Booster Evidenziata - Dopo la struttura principale */}
      <div className="booster-section-edit">
        <div className="booster-header">
          <h3>Booster</h3>
          <label className="booster-toggle">
            <input
              type="checkbox"
              checked={showMaxBooster}
              onChange={(e) => setShowMaxBooster(e.target.checked)}
            />
            <span>Vedi effetto Booster max</span>
          </label>
        </div>

        <div className="booster-cards-edit">
          {/* Booster 1 */}
          <div className="booster-card-edit">
            <div className="booster-icon">⚡</div>
            <div className="booster-info">
              <div className="input-field">
                <label>Booster 1</label>
                <select 
                  value={playerData.boosters?.primary || ''} 
                  onChange={(e) => setPlayerData(prev => ({ 
                    ...prev, 
                    boosters: { ...prev.boosters, primary: e.target.value || null } 
                  }))}
                >
                  <option value="">Nessuno</option>
                  {availableBoosters.map(b => (
                    <option key={b.id || b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-field">
                <label>Effetto</label>
                <input 
                  type="text" 
                  value="+2" 
                  placeholder="+2"
                  readOnly
                />
              </div>
              <div className="input-field">
                <label>Dettagli effetti</label>
                <textarea 
                  placeholder="es: +2 alle Statistiche giocatore Comportamento difensivo, Contrasto, Accelerazione e Salto"
                  rows={3}
                />
              </div>
              <div className="input-field">
                <label>Condizione di attivazione</label>
                <textarea 
                  placeholder="es: Questo Booster è sempre attivo."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Booster 2 */}
          {playerData.boosters?.primary && (
            <div className="booster-card-edit secondary">
              <div className="booster-icon">⚡</div>
              <div className="booster-info">
                <div className="input-field">
                  <label>Booster 2 (opzionale)</label>
                  <select 
                    value={playerData.boosters?.secondary || ''} 
                    onChange={(e) => setPlayerData(prev => ({ 
                      ...prev, 
                      boosters: { ...prev.boosters, secondary: e.target.value || null } 
                    }))}
                  >
                    <option value="">Nessuno</option>
                    {availableBoosters.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Vista Statistiche Editabile
function StatisticheViewEdit({ 
  playerData, setPlayerData, playerForCard, updateStat, formatStatName, showMaxBooster
}) {
  const hasBoost = (statName, category) => {
    // Logica per determinare se una stat ha boost (da implementare)
    return false
  }

  return (
    <div className="view-container statistiche-view-edit">
      <div className="view-layout">
        {/* Sinistra: Player Card */}
        <div className="view-left">
          <PlayerCardDetailed player={playerForCard} />
        </div>

        {/* Centro: Statistiche Complete */}
        <div className="view-center stats-grid-edit">
          {/* Attacco */}
          <div className="stats-column">
            <h3>Attacco</h3>
            <div className="stats-list">
              {Object.entries(playerData.attacking).map(([stat, value]) => (
                <div key={stat} className="stat-item-edit">
                  <label className="stat-name">{formatStatName(stat)}</label>
                  <NumberInput
                    value={value}
                    onChange={(newValue) => updateStat('attacking', stat, newValue)}
                    min={0}
                    max={99}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Difesa */}
          <div className="stats-column">
            <h3>Difesa</h3>
            <div className="stats-list">
              {Object.entries(playerData.defending).map(([stat, value]) => {
                const boosted = hasBoost(stat, 'defending')
                return (
                  <div key={stat} className={`stat-item-edit ${boosted ? 'boosted' : ''}`}>
                    <label className="stat-name">
                      {formatStatName(stat)}
                      {boosted && <span className="boost-indicator">●</span>}
                    </label>
                    <NumberInput
                      value={value}
                      onChange={(newValue) => updateStat('defending', stat, newValue)}
                      min={0}
                      max={99}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Forza */}
          <div className="stats-column">
            <h3>Forza</h3>
            <div className="stats-list">
              {Object.entries(playerData.athleticism).slice(0, 7).map(([stat, value]) => {
                const boosted = hasBoost(stat, 'athleticism')
                return (
                  <div key={stat} className={`stat-item-edit ${boosted ? 'boosted' : ''}`}>
                    <label className="stat-name">
                      {formatStatName(stat)}
                      {boosted && <span className="boost-indicator">●</span>}
                    </label>
                    <NumberInput
                      value={value}
                      onChange={(newValue) => updateStat('athleticism', stat, newValue)}
                      min={0}
                      max={99}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Destra: Caratteristiche */}
        <div className="view-right characteristics-panel">
          <h3>Caratteristiche</h3>
          <div className="characteristics-list">
            <div className="char-item">
              <label className="char-label">Frequenza piede debole</label>
              <select 
                value={playerData.athleticism.weakFootUsage} 
                onChange={(e) => updateStat('athleticism', 'weakFootUsage', e.target.value)}
              >
                {WEAK_FOOT.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
              </select>
            </div>
            <div className="char-item">
              <label className="char-label">Precisione piede debole</label>
              <select 
                value={playerData.athleticism.weakFootAccuracy} 
                onChange={(e) => updateStat('athleticism', 'weakFootAccuracy', e.target.value)}
              >
                {WEAK_FOOT_ACC.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
              </select>
            </div>
            <div className="char-item">
              <label className="char-label">Forma</label>
              <select 
                value={playerData.athleticism.form} 
                onChange={(e) => updateStat('athleticism', 'form', e.target.value)}
              >
                {FORM.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
              </select>
            </div>
            <div className="char-item">
              <label className="char-label">Resistenza infortuni</label>
              <select 
                value={playerData.athleticism.injuryResistance} 
                onChange={(e) => updateStat('athleticism', 'injuryResistance', e.target.value)}
              >
                {INJURY.map((f, i) => <option key={i} value={i + 1}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RosaManualInput
