'use client'

import React, { useState, useEffect } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import { 
  X, Save, Target, Shield, Zap, Award, Settings,
  User, Ruler, Weight, Calendar, Globe, Building2
} from 'lucide-react'
import * as playerService from '../../services/playerService'
import { supabase } from '@/lib/supabase'
import './RosaManualInput.css'

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF']
const CARD_TYPES = ['Standard', 'Raro', 'Super Raro', 'Epico', 'Leggendario', 'Fantasy']
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

const initialPlayerData = {
  player_name: '', position: 'CF', overall_rating: 0,
  height: null, weight: null, age: null, nationality: '', club_name: '',
  card_type: 'Standard', era: '', team: '', preferredFoot: 'right',
  attacking: { offensiveAwareness: 0, ballControl: 0, dribbling: 0, tightPossession: 0, lowPass: 0, loftedPass: 0, finishing: 0, heading: 0, placeKicking: 0, curl: 0 },
  defending: { defensiveAwareness: 0, defensiveEngagement: 0, tackling: 0, aggression: 0, goalkeeping: 0, gkCatching: 0, gkParrying: 0, gkReflexes: 0, gkReach: 0 },
  athleticism: { speed: 0, acceleration: 0, kickingPower: 0, jump: 0, physicalContact: 0, balance: 0, stamina: 0, weakFootUsage: 4, weakFootAccuracy: 4, form: 8, injuryResistance: 2 },
  skills: [], comSkills: [],
  build: { currentLevel: null, levelCap: null, developmentPoints: {}, activeBooster: null, activeBoosterId: null },
  metadata: {}
}

function RosaManualInput({ onBack, onRosaCreated }) {
  const [playerData, setPlayerData] = useState(initialPlayerData)
  const [activeTab, setActiveTab] = useState('basic')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [availableBoosters, setAvailableBoosters] = useState([])
  const { addPlayer } = useRosa()

  useEffect(() => {
    loadBoosters()
  }, [])

  const loadBoosters = async () => {
    try {
      const { data } = await supabase.from('boosters').select('*').order('name')
      setAvailableBoosters(data || COMMON_BOOSTERS.map((b, i) => ({ id: `temp-${i}`, ...b })))
    } catch {
      setAvailableBoosters(COMMON_BOOSTERS.map((b, i) => ({ id: `temp-${i}`, ...b })))
    }
  }

  const updateStat = (category, stat, value) => {
    setPlayerData(prev => ({
      ...prev,
      [category]: { ...prev[category], [stat]: parseInt(value) || 0 }
    }))
  }

  const toggleSkill = (skill, isComSkill = false) => {
    const key = isComSkill ? 'comSkills' : 'skills'
    setPlayerData(prev => ({
      ...prev,
      [key]: prev[key].includes(skill) ? prev[key].filter(s => s !== skill) : [...prev[key], skill]
    }))
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
        base_stats: { overall_rating: overallRating, attacking: playerData.attacking, defending: playerData.defending, athleticism: playerData.athleticism },
        skills: playerData.skills, com_skills: playerData.comSkills, position_ratings: {},
        development_points: playerData.build.developmentPoints || {}, current_level: playerData.build.currentLevel,
        level_cap: playerData.build.levelCap, active_booster_name: playerData.build.activeBooster,
        active_booster_id: playerData.build.activeBoosterId,
        final_stats: { attacking: playerData.attacking, defending: playerData.defending, athleticism: playerData.athleticism },
        final_overall_rating: overallRating, source: 'manual',
        metadata: { ...playerData.metadata, preferred_foot: playerData.preferredFoot }
      })
      await addPlayer({ build_id: result.build.id, player_name: playerData.player_name, position: playerData.position, overall_rating: overallRating, source: 'manual' })
      if (onRosaCreated) onRosaCreated()
    } catch (err) {
      setError(err.message || 'Errore salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rosa-manual-input">
      <div className="manual-header">
        <button onClick={onBack} className="back-btn"><X size={20} /></button>
        <h2>Nuovo Giocatore</h2>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="tabs-nav">
        <button className={activeTab === 'basic' ? 'active' : ''} onClick={() => setActiveTab('basic')}><User size={16} />Base</button>
        <button className={activeTab === 'physical' ? 'active' : ''} onClick={() => setActiveTab('physical')}><Ruler size={16} />Fisico</button>
        <button className={activeTab === 'attacking' ? 'active' : ''} onClick={() => setActiveTab('attacking')}><Target size={16} />Att</button>
        <button className={activeTab === 'defending' ? 'active' : ''} onClick={() => setActiveTab('defending')}><Shield size={16} />Dif</button>
        <button className={activeTab === 'athleticism' ? 'active' : ''} onClick={() => setActiveTab('athleticism')}><Zap size={16} />Fis</button>
        <button className={activeTab === 'skills' ? 'active' : ''} onClick={() => setActiveTab('skills')}><Award size={16} />Skill</button>
        <button className={activeTab === 'build' ? 'active' : ''} onClick={() => setActiveTab('build')}><Settings size={16} />Build</button>
      </div>

      <div className="tab-panel">
        {activeTab === 'basic' && (
          <div className="form-grid">
            <div className="input-field">
              <label>Nome</label>
              <input type="text" value={playerData.player_name} onChange={(e) => setPlayerData(prev => ({ ...prev, player_name: e.target.value }))} />
            </div>
            <div className="input-field">
              <label>Posizione</label>
              <select value={playerData.position} onChange={(e) => setPlayerData(prev => ({ ...prev, position: e.target.value }))}>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="input-field">
              <label>Rating</label>
              <div className="rating-field">
                <input type="number" min="0" max="120" value={playerData.overall_rating || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, overall_rating: parseInt(e.target.value) || 0 }))} />
                <button type="button" onClick={() => setPlayerData(prev => ({ ...prev, overall_rating: calculateOverallRating() }))}>Auto</button>
              </div>
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
          <div className="stats-grid">
            {Object.entries(playerData.attacking).map(([stat, value]) => (
              <div key={stat} className="stat-field">
                <label>{stat.replace(/([A-Z])/g, ' $1').trim()}</label>
                <input type="number" min="0" max="99" value={value} onChange={(e) => updateStat('attacking', stat, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'defending' && (
          <div className="stats-grid">
            {Object.entries(playerData.defending).map(([stat, value]) => (
              <div key={stat} className="stat-field">
                <label>{stat.replace(/([A-Z])/g, ' $1').trim().replace('Gk', 'GK')}</label>
                <input type="number" min="0" max="99" value={value} onChange={(e) => updateStat('defending', stat, e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'athleticism' && (
          <>
            <div className="stats-grid">
              {Object.entries(playerData.athleticism).slice(0, 7).map(([stat, value]) => (
                <div key={stat} className="stat-field">
                  <label>{stat.replace(/([A-Z])/g, ' $1').trim()}</label>
                  <input type="number" min="0" max="99" value={value} onChange={(e) => updateStat('athleticism', stat, e.target.value)} />
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

        {activeTab === 'skills' && (
          <div className="skills-panel">
            <div className="skills-col">
              <h3>Skills</h3>
              <div className="skills-list">
                {COMMON_SKILLS.map(s => (
                  <label key={s} className="skill-item">
                    <input type="checkbox" checked={playerData.skills.includes(s)} onChange={() => toggleSkill(s, false)} />
                    <span>{s}</span>
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
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'build' && (
          <div className="form-grid">
            <div className="input-field">
              <label>Livello</label>
              <input type="number" min="1" max="100" value={playerData.build.currentLevel || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, build: { ...prev.build, currentLevel: parseInt(e.target.value) || null } }))} />
            </div>
            <div className="input-field">
              <label>Level Cap</label>
              <input type="number" min="1" max="120" value={playerData.build.levelCap || ''} onChange={(e) => setPlayerData(prev => ({ ...prev, build: { ...prev.build, levelCap: parseInt(e.target.value) || null } }))} />
            </div>
            <div className="input-field full-width">
              <label>Booster</label>
              <select value={playerData.build.activeBooster || ''} onChange={(e) => {
                const booster = availableBoosters.find(b => b.name === e.target.value)
                setPlayerData(prev => ({ ...prev, build: { ...prev.build, activeBooster: e.target.value || null, activeBoosterId: booster?.id || null } }))
              }}>
                <option value="">Nessuno</option>
                {availableBoosters.filter(b => !playerData.position || !b.available_for_positions || b.available_for_positions.length === 0 || b.available_for_positions.includes(playerData.position)).map(b => (
                  <option key={b.id || b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
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
