'use client'

import React from 'react'
import { X, Save, ChevronDown, ChevronUp, Plus, Trash2, AlertCircle, Edit, Zap, User, Award, TrendingUp, Activity, Target, Shield } from 'lucide-react'

// Opzioni dropdown da OPZIONI_DROPDOWN.md
const SKILLS_OPTIONS = [
  'A giro da distante',
  'Astuzia',
  'Colpo di tacco',
  'Controllo di suola',
  'Cross calibrato',
  'Cross spiovente',
  'Doppio tocco',
  'Dribbling fulminei',
  'Elastico',
  'Esterno a giro',
  'Fighting Spirit',
  'Finta doppio passo',
  'Intercettazione',
  'Marcatore',
  'No-look',
  'Passaggi illuminanti',
  'Passaggio a scavalcare',
  'Passaggio di prima',
  'Passaggio filtrante',
  'Rimessa lat. lunga',
  'Scatto bruciante',
  'Scivolata',
  'Sombrero',
  'Specialista dei rigori',
  'Taglia alle spalle e gira',
  'Tiro a giro',
  'Tiro a salire',
  'Tiro dalla distanza',
  'Tiro di prima'
].sort()

const TEAMS_OPTIONS = [
  'Arsenal',
  'AS Roma 00-01',
  'Barcellona',
  'FC Barcelona 05-06',
  'FC Bayern München 73-74',
  'Internazionale Milano 09-10',
  'Madrid Chamartin B',
  'Madrid Chamartín B',
  'Madrid Chamartin B 19-20',
  'Paris Saint-Germain',
  'Tottenham WB 09-10'
].sort()

const NATIONALITIES_OPTIONS = [
  'Belgio',
  'Brasile',
  'Francia',
  'Galles',
  'Germania',
  'Inghilterra',
  'Spagna'
].sort()

const POSITIONS_OPTIONS = [
  'AMF',
  'CC',
  'CF',
  'DC',
  'ESA',
  'GK',
  'LWF',
  'MED',
  'P',
  'RB',
  'RWF',
  'TD',
  'Terzino offensivo'
]

const AI_PLAYSTYLES_OPTIONS = [
  'Crossatore',
  'Esperto palle lunghe',
  'Funambolo',
  'Inserimento',
  'Serpentina',
  'Tiratore',
  'Treno in corsa'
].sort()

const BOOSTERS_OPTIONS = [
  'Crossatore',
  'Fantasista',
  'Gestione del pallone',
  'Motore offensivo',
  'Movimento senza palla',
  'Slot Booster',
  'Tecnica'
].sort()

const PLAYING_STYLES_OPTIONS = [
  'Ala prolifica',
  'Classico n°10',
  'Collante',
  'Frontale extra',
  'Fulcro di gioco',
  'Giocatore chiave',
  'Incontrista',
  'Onnipresente',
  'Opportunista',
  'Portiere difensivo',
  'Portiere offensivo',
  'Rapace d\'area',
  'Regista creativo',
  'Senza palla',
  'Specialista di cross',
  'Sviluppo',
  'Taglio al centro',
  'Terzino difensivo',
  'Terzino mattatore',
  'Terzino offensivo',
  'Tra le linee'
].sort()

export default function EditPlayerDataModal({ player, authToken, onClose, onSave, t, lang }) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState({})
  
  const completeness = player.completeness || { percentage: 100, missing: [], missingDetails: {} }
  const missingDetails = completeness.missingDetails || {}
  const baseStats = player.base_stats || {}
  
  // Stats form state
  const [stats, setStats] = React.useState({
    attacking: { ...(baseStats.attacking || {}) },
    defending: { ...(baseStats.defending || {}) },
    athleticism: { ...(baseStats.athleticism || {}) }
  })
  
  // Physical form state
  const [physical, setPhysical] = React.useState({
    height: player.height || '',
    weight: player.weight || '',
    age: player.age || '',
    team: player.team || '',
    nationality: player.nationality || '',
    playing_style: player.playing_style_name || ''
  })
  
  // Skills form state
  const [skills, setSkills] = React.useState([...(player.skills || [])])
  const [comSkills, setComSkills] = React.useState([...(player.com_skills || [])])
  const [aiPlaystyles, setAiPlaystyles] = React.useState([...(player.metadata?.ai_playstyles || [])])
  const [additionalPositions, setAdditionalPositions] = React.useState(
    player.position_ratings ? Object.keys(player.position_ratings) : []
  )
  
  // Boosters form state
  const [boosters, setBoosters] = React.useState([...(player.available_boosters || [])])
  
  // Characteristics form state
  const [characteristics, setCharacteristics] = React.useState({
    weak_foot_frequency: player.metadata?.weak_foot_frequency || '',
    weak_foot_accuracy: player.metadata?.weak_foot_accuracy || '',
    form_detailed: player.metadata?.form_detailed || '',
    injury_resistance: player.metadata?.injury_resistance || ''
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!authToken) {
        throw new Error(t('invalidAuthToken'))
      }

      const payload = {
        player_base_id: player.player_base_id,
      }

      // Base stats - salva sempre se presenti nel form
      const hasStatsData = Object.keys(stats.attacking || {}).length > 0 || 
                          Object.keys(stats.defending || {}).length > 0 || 
                          Object.keys(stats.athleticism || {}).length > 0
      if (hasStatsData) {
        payload.base_stats = {
          ...(baseStats || {}),
          attacking: { ...stats.attacking },
          defending: { ...stats.defending },
          athleticism: { ...stats.athleticism }
        }
      }

      // Physical data - salva sempre se presenti nel form
      if (physical.height || physical.weight || physical.age || physical.team || physical.nationality || physical.playing_style) {
        payload.height = physical.height || null
        payload.weight = physical.weight || null
        payload.age = physical.age || null
        payload.team = physical.team || null
        payload.nationality = physical.nationality || null
        payload.playing_style = physical.playing_style || null
      }

      // Skills - salva sempre (anche array vuoto per rimuovere)
      payload.skills = skills.filter(s => s.trim())
      payload.com_skills = comSkills.filter(s => s.trim())
      if (aiPlaystyles.length > 0 || (payload.metadata && payload.metadata.ai_playstyles)) {
        payload.metadata = { ...(payload.metadata || {}), ai_playstyles: aiPlaystyles.filter(s => s.trim()) }
      }
      payload.additional_positions = additionalPositions.filter(p => p.trim())

      // Boosters - salva sempre se presenti nel form
      if (boosters.length > 0) {
        payload.available_boosters = boosters.slice(0, 2)
      }

      // Characteristics - salva sempre se presenti nel form
      const hasCharacteristics = characteristics.weak_foot_frequency || 
                                 characteristics.weak_foot_accuracy || 
                                 characteristics.form_detailed || 
                                 characteristics.injury_resistance
      if (hasCharacteristics) {
        payload.metadata = {
          ...(payload.metadata || {}),
          weak_foot_frequency: characteristics.weak_foot_frequency || null,
          weak_foot_accuracy: characteristics.weak_foot_accuracy || null,
          form_detailed: characteristics.form_detailed || null,
          injury_resistance: characteristics.injury_resistance || null
        }
      }

      const res = await fetch('/api/supabase/update-player-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || t('saveError'))
      }

      setSuccess(true)
      setTimeout(() => {
        onSave()
      }, 1000)
    } catch (err) {
      setError(err?.message || t('saveError'))
    } finally {
      setLoading(false)
    }
  }

  const addSkill = (type) => {
    if (type === 'skill') setSkills([...skills, ''])
    if (type === 'com_skill') setComSkills([...comSkills, ''])
    if (type === 'playstyle') setAiPlaystyles([...aiPlaystyles, ''])
    if (type === 'position') setAdditionalPositions([...additionalPositions, ''])
    if (type === 'booster') setBoosters([...boosters, { name: '', effect: '', activation_condition: '' }])
  }

  const removeSkill = (type, index) => {
    if (type === 'skill') setSkills(skills.filter((_, i) => i !== index))
    if (type === 'com_skill') setComSkills(comSkills.filter((_, i) => i !== index))
    if (type === 'playstyle') setAiPlaystyles(aiPlaystyles.filter((_, i) => i !== index))
    if (type === 'position') setAdditionalPositions(additionalPositions.filter((_, i) => i !== index))
    if (type === 'booster') setBoosters(boosters.filter((_, i) => i !== index))
  }

  const updateSkill = (type, index, value) => {
    if (type === 'skill') {
      const newSkills = [...skills]
      newSkills[index] = value
      setSkills(newSkills)
    }
    if (type === 'com_skill') {
      const newComSkills = [...comSkills]
      newComSkills[index] = value
      setComSkills(newComSkills)
    }
    if (type === 'playstyle') {
      const newPlaystyles = [...aiPlaystyles]
      newPlaystyles[index] = value
      setAiPlaystyles(newPlaystyles)
    }
    if (type === 'position') {
      const newPositions = [...additionalPositions]
      newPositions[index] = value
      setAdditionalPositions(newPositions)
    }
  }

  const updateBooster = (index, field, value) => {
    const newBoosters = [...boosters]
    newBoosters[index] = { ...newBoosters[index], [field]: value }
    setBoosters(newBoosters)
  }

  // Rileva quali sezioni hanno dati mancanti
  const hasMissingStats = missingDetails.missing_stats && (!missingDetails.missing_stats.has_attacking || !missingDetails.missing_stats.has_defending || !missingDetails.missing_stats.has_athleticism)
  const hasMissingPhysical = missingDetails.missing_physical
  const hasMissingSkills = missingDetails.missing_skills
  const hasMissingComSkills = missingDetails.missing_com_skills
  const hasMissingPlaystyles = missingDetails.missing_ai_playstyles
  const hasMissingPositions = missingDetails.missing_additional_positions
  const hasMissingBoosters = missingDetails.missing_boosters
  const hasMissingCharacteristics = missingDetails.missing_weak_foot || missingDetails.missing_form_detailed || missingDetails.missing_injury_resistance

  return (
    <div 
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'auto'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-overlay)',
          borderRadius: '16px',
          border: '2px solid var(--neon-blue)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'var(--glow-blue)',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px',
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-overlay)',
          zIndex: 10
        }}>
          <h2 className="neon-text" style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit size={20} />
            {t('completeData')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scroll Verticale (Mobile-First) */}
        <div style={{ padding: '20px', maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#EF4444'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#22C55E'
            }}>
              ✅ {t('saved')}
            </div>
          )}

          {/* Stats Section */}
          {hasMissingStats && (
            <Section
              title={t('statsDetails')}
              icon={<Zap size={18} />}
              expanded={expandedSections.stats}
              onToggle={() => toggleSection('stats')}
              lang={lang}
            >
              <StatsForm stats={stats} setStats={setStats} t={t} />
            </Section>
          )}

          {/* Physical Section */}
          {hasMissingPhysical && (
            <Section
              title={t('physicalData')}
              icon={<User size={18} />}
              expanded={expandedSections.physical}
              onToggle={() => toggleSection('physical')}
              lang={lang}
            >
              <PhysicalForm physical={physical} setPhysical={setPhysical} t={t} />
            </Section>
          )}

          {/* Skills Section */}
          {hasMissingSkills && (
            <Section
              title={t('playerSkills')}
              icon={<Award size={18} />}
              expanded={expandedSections.skills}
              onToggle={() => toggleSection('skills')}
              lang={lang}
            >
              <ArrayForm
                items={skills}
                onAdd={() => addSkill('skill')}
                onRemove={(i) => removeSkill('skill', i)}
                onChange={(i, v) => updateSkill('skill', i, v)}
                placeholder={lang === 'it' ? 'Nome skill' : 'Skill name'}
                options={SKILLS_OPTIONS}
                t={t}
                lang={lang}
              />
            </Section>
          )}

          {/* Additional Skills Section */}
          {hasMissingComSkills && (
            <Section
              title={t('additionalSkills')}
              icon={<TrendingUp size={18} />}
              expanded={expandedSections.com_skills}
              onToggle={() => toggleSection('com_skills')}
              lang={lang}
            >
              <ArrayForm
                items={comSkills}
                onAdd={() => addSkill('com_skill')}
                onRemove={(i) => removeSkill('com_skill', i)}
                onChange={(i, v) => updateSkill('com_skill', i, v)}
                placeholder={lang === 'it' ? 'Nome abilità aggiuntiva' : 'Additional skill name'}
                options={SKILLS_OPTIONS}
                t={t}
                lang={lang}
              />
            </Section>
          )}

          {/* AI Playstyles Section */}
          {hasMissingPlaystyles && (
            <Section
              title={t('aiPlaystylesList')}
              icon={<Target size={18} />}
              expanded={expandedSections.playstyles}
              onToggle={() => toggleSection('playstyles')}
              lang={lang}
            >
              <ArrayForm
                items={aiPlaystyles}
                onAdd={() => addSkill('playstyle')}
                onRemove={(i) => removeSkill('playstyle', i)}
                onChange={(i, v) => updateSkill('playstyle', i, v)}
                placeholder={lang === 'it' ? 'Nome stile di gioco IA' : 'AI playstyle name'}
                options={AI_PLAYSTYLES_OPTIONS}
                t={t}
                lang={lang}
              />
            </Section>
          )}

          {/* Additional Positions Section */}
          {hasMissingPositions && (
            <Section
              title={t('additionalPositionsList')}
              icon={<Activity size={18} />}
              expanded={expandedSections.positions}
              onToggle={() => toggleSection('positions')}
              lang={lang}
            >
              <ArrayForm
                items={additionalPositions}
                onAdd={() => addSkill('position')}
                onRemove={(i) => removeSkill('position', i)}
                onChange={(i, v) => updateSkill('position', i, v)}
                placeholder={lang === 'it' ? 'Codice posizione (es: CLD, EDA)' : 'Position code (e.g. CLD, EDA)'}
                options={POSITIONS_OPTIONS}
                t={t}
                lang={lang}
              />
            </Section>
          )}

          {/* Boosters Section */}
          {hasMissingBoosters && (
            <Section
              title={t('boostersList')}
              icon={<Shield size={18} />}
              expanded={expandedSections.boosters}
              onToggle={() => toggleSection('boosters')}
              lang={lang}
            >
              <BoostersForm
                boosters={boosters}
                onAdd={() => addSkill('booster')}
                onRemove={(i) => removeSkill('booster', i)}
                onChange={(i, f, v) => updateBooster(i, f, v)}
                t={t}
                lang={lang}
              />
            </Section>
          )}

          {/* Characteristics Section */}
          {hasMissingCharacteristics && (
            <Section
              title={t('characteristics')}
              icon={<AlertCircle size={18} />}
              expanded={expandedSections.characteristics}
              onToggle={() => toggleSection('characteristics')}
              lang={lang}
            >
              <CharacteristicsForm
                characteristics={characteristics}
                setCharacteristics={setCharacteristics}
                t={t}
                lang={lang}
              />
            </Section>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '20px',
          borderTop: '1px solid rgba(0, 212, 255, 0.2)',
          position: 'sticky',
          bottom: 0,
          background: 'var(--bg-overlay)',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onClose}
            className="btn"
            style={{ flex: 1, minWidth: '100px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <X size={16} />
            {t('close')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn primary"
            style={{ flex: 1, minWidth: '100px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <>
                <div className="spin" style={{ width: 16, height: 16, border: '2px solid transparent', borderTop: '2px solid currentColor', borderRadius: '50%' }} />
                {t('saving')}
              </>
            ) : (
              <>
                <Save size={16} />
                {t('save')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, expanded, onToggle, children, lang }) {
  return (
    <div style={{
      marginBottom: '20px',
      border: '1px solid rgba(0, 212, 255, 0.2)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'rgba(0, 0, 0, 0.3)'
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '16px',
          fontWeight: 600
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neon-blue)' }}>
          {icon}
          {title}
        </div>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {expanded && (
        <div style={{ padding: '16px', borderTop: '1px solid rgba(0, 212, 255, 0.1)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function StatsForm({ stats, setStats, t }) {
  const updateStat = (category, stat, value) => {
    setStats(prev => ({
      ...prev,
      [category]: { ...prev[category], [stat]: value ? parseInt(value) || null : null }
    }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Attacking Stats */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-blue)' }}>
          {t('attacking')}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {[
            { key: 'offensive_awareness', label: lang === 'it' ? 'Comportamento Offensivo' : 'Offensive Awareness' },
            { key: 'ball_control', label: lang === 'it' ? 'Controllo Palla' : 'Ball Control' },
            { key: 'dribbling', label: 'Dribbling' },
            { key: 'tight_possession', label: lang === 'it' ? 'Possesso Stretto' : 'Tight Possession' },
            { key: 'low_pass', label: lang === 'it' ? 'Passaggio Rasoterra' : 'Low Pass' },
            { key: 'lofted_pass', label: lang === 'it' ? 'Passaggio Alto' : 'Lofted Pass' },
            { key: 'finishing', label: lang === 'it' ? 'Finalizzazione' : 'Finishing' },
            { key: 'heading', label: lang === 'it' ? 'Colpo di Testa' : 'Heading' },
            { key: 'place_kicking', label: lang === 'it' ? 'Calci da Fermo' : 'Set Piece Taking' },
            { key: 'curl', label: lang === 'it' ? 'Tiro a Giro' : 'Curl' }
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
                {label}
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={stats.attacking?.[key] || ''}
                onChange={(e) => updateStat('attacking', key, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Defending Stats */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-purple)' }}>
          {t('defending')}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {[
            { key: 'defensive_awareness', label: lang === 'it' ? 'Comportamento Difensivo' : 'Defensive Awareness' },
            { key: 'defensive_engagement', label: lang === 'it' ? 'Coinvolgimento Difensivo' : 'Defensive Engagement' },
            { key: 'tackling', label: lang === 'it' ? 'Contrasto' : 'Tackling' },
            { key: 'aggression', label: lang === 'it' ? 'Aggressività' : 'Aggression' }
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
                {label}
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={stats.defending?.[key] || ''}
                onChange={(e) => updateStat('defending', key, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Athleticism Stats */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--neon-orange)' }}>
          {t('athleticism')}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          {[
            { key: 'speed', label: lang === 'it' ? 'Velocità' : 'Speed' },
            { key: 'acceleration', label: lang === 'it' ? 'Accelerazione' : 'Acceleration' },
            { key: 'kicking_power', label: lang === 'it' ? 'Potenza di Tiro' : 'Kicking Power' },
            { key: 'jump', label: lang === 'it' ? 'Salto' : 'Jump' },
            { key: 'physical_contact', label: lang === 'it' ? 'Contatto Fisico' : 'Physical Contact' },
            { key: 'balance', label: lang === 'it' ? 'Controllo Corpo' : 'Body Control' },
            { key: 'stamina', label: lang === 'it' ? 'Resistenza' : 'Stamina' }
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
                {label}
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={stats.athleticism?.[key] || ''}
                onChange={(e) => updateStat('athleticism', key, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PhysicalForm({ physical, setPhysical, t }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('height')} ({t('cm')})
        </label>
        <input
          type="number"
          min="140"
          max="220"
          value={physical.height || ''}
          onChange={(e) => setPhysical({ ...physical, height: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('weight')} ({t('kg')})
        </label>
        <input
          type="number"
          min="40"
          max="120"
          value={physical.weight || ''}
          onChange={(e) => setPhysical({ ...physical, weight: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('age')} ({t('years')})
        </label>
        <input
          type="number"
          min="16"
          max="50"
          value={physical.age || ''}
          onChange={(e) => setPhysical({ ...physical, age: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('teamName')}
        </label>
        <select
          value={physical.team || ''}
          onChange={(e) => setPhysical({ ...physical, team: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">—</option>
          {TEAMS_OPTIONS.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('nationalityCountry')}
        </label>
        <select
          value={physical.nationality || ''}
          onChange={(e) => setPhysical({ ...physical, nationality: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">—</option>
          {NATIONALITIES_OPTIONS.map(nat => (
            <option key={nat} value={nat}>{nat}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('playingStyle')}
        </label>
        <select
          value={physical.playing_style || ''}
          onChange={(e) => setPhysical({ ...physical, playing_style: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">—</option>
          {PLAYING_STYLES_OPTIONS.map(style => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ArrayForm({ items, onAdd, onRemove, onChange, placeholder, options = [], t, lang }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={item}
            onChange={(e) => onChange(index, e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <option value="">—</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <button
            onClick={() => onRemove(index)}
            style={{
              padding: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#EF4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        style={{
          padding: '10px',
          background: 'rgba(0, 212, 255, 0.1)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          borderRadius: '8px',
          color: 'var(--neon-blue)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600
        }}
      >
        <Plus size={16} />
        {t('addSkill')}
      </button>
    </div>
  )
}

function BoostersForm({ boosters, onAdd, onRemove, onChange, t, lang }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {boosters.slice(0, 2).map((booster, index) => (
        <div key={index} style={{
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--neon-blue)' }}>
              {t('boosterName')} {index + 1}
            </h5>
            <button
              onClick={() => onRemove(index)}
              style={{
                padding: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#EF4444',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              value={booster.name || ''}
              onChange={(e) => onChange(index, 'name', e.target.value)}
              placeholder={lang === 'it' ? 'Nome booster' : 'Booster name'}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            />
            <textarea
              value={booster.effect || ''}
              onChange={(e) => onChange(index, 'effect', e.target.value)}
              placeholder={lang === 'it' ? 'Effetto (es: +2 a Controllo palla, Dribbling...)' : 'Effect (e.g. +2 to Ball Control, Dribbling...)'}
              rows={2}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <input
              type="text"
              value={booster.activation_condition || ''}
              onChange={(e) => onChange(index, 'activation_condition', e.target.value)}
              placeholder={lang === 'it' ? 'Condizione di attivazione' : 'Activation condition'}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      ))}
      {boosters.length < 2 && (
        <button
          onClick={onAdd}
          style={{
            padding: '12px',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'var(--neon-blue)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          <Plus size={16} />
          {t('addBooster')}
        </button>
      )}
    </div>
  )
}

function CharacteristicsForm({ characteristics, setCharacteristics, t, lang }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('weakFootFrequencyLabel')}
        </label>
        <select
          value={characteristics.weak_foot_frequency || ''}
          onChange={(e) => setCharacteristics({ ...characteristics, weak_foot_frequency: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">—</option>
          <option value="Raramente">{t('rarely')}</option>
          <option value="A Volte">{t('sometimes')}</option>
          <option value="Spesso">{t('often')}</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('weakFootAccuracyLabel')}
        </label>
        <select
          value={characteristics.weak_foot_accuracy || ''}
          onChange={(e) => setCharacteristics({ ...characteristics, weak_foot_accuracy: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">—</option>
          <option value="Alta">{t('high')}</option>
          <option value="Media">{t('medium')}</option>
          <option value="Bassa">{t('low')}</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('formDetailedLabel')}
        </label>
        <select
          value={characteristics.form_detailed || ''}
          onChange={(e) => setCharacteristics({ ...characteristics, form_detailed: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">—</option>
          <option value="Incrollabile">{t('unbreakable')}</option>
          <option value="Stabile">{t('stable')}</option>
          <option value="B">{t('b')}</option>
          <option value="A">{t('a')}</option>
          <option value="C">{t('c')}</option>
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
          {t('injuryResistanceLabel')}
        </label>
        <select
          value={characteristics.injury_resistance || ''}
          onChange={(e) => setCharacteristics({ ...characteristics, injury_resistance: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px'
          }}
        >
          <option value="">—</option>
          <option value="Alta">{t('high')}</option>
          <option value="Media">{t('medium')}</option>
          <option value="Bassa">{t('low')}</option>
        </select>
      </div>
    </div>
  )
}
