'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { 
  TrendingUp, Sparkles, BarChart3, 
  ChevronLeft, ChevronRight, X
} from 'lucide-react'
import PlayerCardDetailed from './PlayerCardDetailed'
import './PlayerProfileView.css'

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

function PlayerProfileView({ player, onClose, onEdit, mode = 'view' }) {
  const [activeView, setActiveView] = useState(VIEWS.SVILUPPO)
  const [showMaxBooster, setShowMaxBooster] = useState(false)

  // Navigazione viste
  const nextView = useCallback(() => {
    const views = Object.values(VIEWS)
    const currentIndex = views.indexOf(activeView)
    const nextIndex = (currentIndex + 1) % views.length
    setActiveView(views[nextIndex])
  }, [activeView])

  const prevView = useCallback(() => {
    const views = Object.values(VIEWS)
    const currentIndex = views.indexOf(activeView)
    const prevIndex = (currentIndex - 1 + views.length) % views.length
    setActiveView(views[prevIndex])
  }, [activeView])

  // Keyboard navigation (L1/R1 equivalent)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'q') prevView() // L1 equivalent
      if (e.key === 'ArrowRight' || e.key === 'e') nextView() // R1 equivalent
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [nextView, prevView])

  if (!player) return null

  const stats = player.final_stats || player.base_stats || {}
  const attacking = stats.attacking || {}
  const defending = stats.defending || {}
  const athleticism = stats.athleticism || {}
  const metadata = player.metadata || {}

  // Calcola statistiche con boost
  const getStatWithBoost = (statName, baseValue, category) => {
    if (!showMaxBooster || !player.active_booster_name) return baseValue
    
    // Logica per calcolare boost (da implementare in base ai booster reali)
    const boost = 0 // Placeholder
    return baseValue + boost
  }

  return (
    <div className="player-profile-view">
      {/* Header con navigazione */}
      <div className="profile-header">
        <div className="profile-header-left">
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          )}
          <h2 className="profile-title">{player.player_name || 'Giocatore'}</h2>
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
                {key === VIEWS.SVILUPPO && <TrendingUp size={16} />}
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

        {onEdit && (
          <button className="edit-btn" onClick={onEdit}>
            Modifica
          </button>
        )}
      </div>

      {/* Contenuto viste */}
      <div className="profile-content">
        {activeView === VIEWS.SVILUPPO && (
          <SviluppoView 
            player={player} 
            stats={stats}
            metadata={metadata}
          />
        )}

        {activeView === VIEWS.BOOSTER && (
          <BoosterView 
            player={player}
            stats={stats}
            showMaxBooster={showMaxBooster}
            onToggleMaxBooster={setShowMaxBooster}
          />
        )}

        {activeView === VIEWS.STATISTICHE && (
          <StatisticheView 
            player={player}
            attacking={attacking}
            defending={defending}
            athleticism={athleticism}
            metadata={metadata}
            showMaxBooster={showMaxBooster}
          />
        )}
      </div>
    </div>
  )
}

// Vista Sviluppo
function SviluppoView({ player, stats, metadata }) {
  const skills = player.skills || []
  const comSkills = player.com_skills || []
  const playingStyles = metadata.playing_styles || []
  const aiPlaystyles = metadata.ai_playstyles || []

  return (
    <div className="view-container sviluppo-view">
      <div className="view-layout">
        {/* Sinistra: Player Card */}
        <div className="view-left">
          <PlayerCardDetailed player={player} />
          
          {/* Statistiche partite (se disponibili) */}
          {(player.matches_played || player.goals || player.assists) && (
            <div className="match-stats">
              <h4>Statistiche Partite</h4>
              {player.matches_played && (
                <div className="match-stat-item">
                  <span>Partite gioc.</span>
                  <span>{player.matches_played}</span>
                </div>
              )}
              {player.goals !== undefined && (
                <div className="match-stat-item">
                  <span>Gol</span>
                  <span>{player.goals}</span>
                </div>
              )}
              {player.assists !== undefined && (
                <div className="match-stat-item">
                  <span>Assist</span>
                  <span>{player.assists}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Centro: Informazioni Base e Skills */}
        <div className="view-center">
          <div className="base-info-section">
            <h3>Sviluppo</h3>
            <div className="base-info-grid">
              <div className="info-item">
                <span className="info-label">Rating</span>
                <span className="info-value">
                  {player.overall_rating || stats.overall_rating || 'N/A'}
                </span>
              </div>
              {player.current_level && player.level_cap && (
                <div className="info-item">
                  <span className="info-label">Livello</span>
                  <span className="info-value">
                    {player.current_level} / {player.level_cap}
                  </span>
                </div>
              )}
              {player.height && (
                <div className="info-item">
                  <span className="info-label">Altezza</span>
                  <span className="info-value">{player.height} cm</span>
                </div>
              )}
              {player.weight && (
                <div className="info-item">
                  <span className="info-label">Peso</span>
                  <span className="info-value">{player.weight} kg</span>
                </div>
              )}
              {player.age && (
                <div className="info-item">
                  <span className="info-label">Età</span>
                  <span className="info-value">{player.age}</span>
                </div>
              )}
              {player.form && (
                <div className="info-item">
                  <span className="info-label">Valutazione</span>
                  <span className="info-value">{player.form}</span>
                </div>
              )}
              {metadata.preferred_foot && (
                <div className="info-item">
                  <span className="info-label">Piede</span>
                  <span className="info-value">
                    {metadata.preferred_foot === 'right' ? 'Destro' : 
                     metadata.preferred_foot === 'left' ? 'Sinistro' : 'Ambidestro'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="skills-section">
              <h4>Abilità Giocatore</h4>
              <div className="skills-list">
                {skills.map((skill, i) => (
                  <span key={i} className="skill-badge">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Destra: Playstyles e Chart */}
        <div className="view-right">
          {/* AI Playstyles */}
          {aiPlaystyles.length > 0 && (
            <div className="playstyles-section">
              <h4>Stili di gioco IA</h4>
              <div className="playstyles-list">
                {aiPlaystyles.map((style, i) => (
                  <span key={i} className="playstyle-badge">{style}</span>
                ))}
              </div>
            </div>
          )}

          {/* Playing Styles */}
          {playingStyles.length > 0 && (
            <div className="playstyles-section">
              <h4>Stili di gioco</h4>
              <div className="playstyles-list">
                {playingStyles.map((style, i) => (
                  <span key={i} className="playstyle-badge">{style}</span>
                ))}
              </div>
            </div>
          )}

          {/* TODO: Radar Chart */}
          <div className="radar-chart-placeholder">
            <p>Radar Chart (da implementare)</p>
          </div>

          {/* TODO: Campo Posizione */}
          <div className="position-field-placeholder">
            <p>Campo Posizione (da implementare)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Vista Booster
function BoosterView({ player, stats, showMaxBooster, onToggleMaxBooster }) {
  const booster1 = player.active_booster_name
  const booster2 = player.metadata?.booster_secondary

  return (
    <div className="view-container booster-view">
      {/* Stessa struttura Vista Sviluppo */}
      <SviluppoView player={player} stats={stats} metadata={player.metadata || {}} />
      
      {/* Sezione Booster evidenziata */}
      <div className="booster-section">
        <div className="booster-header">
          <h3>Booster</h3>
          <label className="booster-toggle">
            <input
              type="checkbox"
              checked={showMaxBooster}
              onChange={(e) => onToggleMaxBooster(e.target.checked)}
            />
            <span>Vedi effetto Booster max</span>
          </label>
        </div>

        {booster1 ? (
          <div className="booster-card">
            <div className="booster-icon">⚡</div>
            <div className="booster-info">
              <h4>{booster1}</h4>
              <div className="booster-effect">
                <span className="effect-label">Effetto:</span>
                <span className="effect-value">+2</span>
              </div>
              <div className="booster-details">
                +2 alle Statistiche giocatore Comportamento difensivo, Contrasto, Accelerazione e Salto.
              </div>
              <div className="booster-condition">
                <span className="condition-label">Condizione di attivazione:</span>
                <span className="condition-value">Questo Booster è sempre attivo.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-booster">
            <p>Nessun booster attivo</p>
          </div>
        )}

        {booster2 && (
          <div className="booster-card secondary">
            <div className="booster-icon">⚡</div>
            <div className="booster-info">
              <h4>{booster2}</h4>
              <div className="booster-effect">
                <span className="effect-label">Effetto:</span>
                <span className="effect-value">+2</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Vista Statistiche
function StatisticheView({ player, attacking, defending, athleticism, metadata, showMaxBooster }) {
  const formatStatName = (stat) => {
    return stat.replace(/([A-Z])/g, ' $1').trim().replace('Gk', 'GK')
  }

  const hasBoost = (statName, category) => {
    // Logica per determinare se una stat ha boost (da implementare)
    return false
  }

  return (
    <div className="view-container statistiche-view">
      <div className="view-layout">
        {/* Sinistra: Player Card */}
        <div className="view-left">
          <PlayerCardDetailed player={player} />
        </div>

        {/* Centro: Statistiche Complete */}
        <div className="view-center stats-grid">
          {/* Attacco */}
          <div className="stats-column">
            <h3>Attacco</h3>
            <div className="stats-list">
              {Object.entries(attacking).map(([stat, value]) => (
                <div key={stat} className="stat-item">
                  <span className="stat-name">{formatStatName(stat)}</span>
                  <span className="stat-value">{value || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Difesa */}
          <div className="stats-column">
            <h3>Difesa</h3>
            <div className="stats-list">
              {Object.entries(defending).map(([stat, value]) => {
                const boosted = hasBoost(stat, 'defending')
                return (
                  <div key={stat} className={`stat-item ${boosted ? 'boosted' : ''}`}>
                    <span className="stat-name">
                      {formatStatName(stat)}
                      {boosted && <span className="boost-indicator">●</span>}
                    </span>
                    <span className="stat-value">{value || 0}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Forza */}
          <div className="stats-column">
            <h3>Forza</h3>
            <div className="stats-list">
              {Object.entries(athleticism).slice(0, 7).map(([stat, value]) => {
                const boosted = hasBoost(stat, 'athleticism')
                return (
                  <div key={stat} className={`stat-item ${boosted ? 'boosted' : ''}`}>
                    <span className="stat-name">
                      {formatStatName(stat)}
                      {boosted && <span className="boost-indicator">●</span>}
                    </span>
                    <span className="stat-value">{value || 0}</span>
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
            {athleticism.weakFootUsage && (
              <div className="char-item">
                <span className="char-label">Frequenza piede debole</span>
                <span className="char-value">
                  {athleticism.weakFootUsage === 1 ? 'Raramente' :
                   athleticism.weakFootUsage === 2 ? 'Occasionalmente' :
                   athleticism.weakFootUsage === 3 ? 'Spesso' : 'Sempre'}
                </span>
              </div>
            )}
            {athleticism.weakFootAccuracy && (
              <div className="char-item">
                <span className="char-label">Precisione piede debole</span>
                <span className="char-value">
                  {athleticism.weakFootAccuracy === 1 ? 'Bassa' :
                   athleticism.weakFootAccuracy === 2 ? 'Media' :
                   athleticism.weakFootAccuracy === 3 ? 'Alta' : 'Molto Alta'}
                </span>
              </div>
            )}
            {athleticism.form && (
              <div className="char-item">
                <span className="char-label">Forma</span>
                <span className="char-value">
                  {athleticism.form === 8 ? 'Incrollabile' :
                   athleticism.form === 7 ? 'A' :
                   athleticism.form === 6 ? 'B' :
                   athleticism.form === 5 ? 'C' :
                   athleticism.form === 4 ? 'D' :
                   athleticism.form === 3 ? 'E' : 'Normale'}
                </span>
              </div>
            )}
            {athleticism.injuryResistance && (
              <div className="char-item">
                <span className="char-label">Resistenza infortuni</span>
                <span className="char-value">
                  {athleticism.injuryResistance === 1 ? 'Bassa' :
                   athleticism.injuryResistance === 2 ? 'Media' : 'Alta'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayerProfileView
