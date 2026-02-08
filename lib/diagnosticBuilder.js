/**
 * Sanitizza stringa da DB per uso in prompt: evita newline/carriage return (prompt injection).
 * Tronca a maxLen caratteri se specificato.
 * @param {*} val - Valore (stringa o altro)
 * @param {number} [maxLen] - Lunghezza massima (opzionale)
 * @returns {string}
 */
function sanitizeForPrompt(val, maxLen = 200) {
  if (val == null) return ''
  const s = String(val).replace(/\r\n|\r|\n/g, ' ').trim()
  return maxLen > 0 && s.length > maxLen ? s.slice(0, maxLen) + '…' : s
}

/** Posizioni considerate "centrocampo" per match flessibile connection */
const MID_POSITIONS = new Set(['MED', 'CC', 'TRQ', 'TS', 'TD', 'ESA', 'EDA', 'CLD', 'CLS'])
/** Posizioni attacco per stat booster Finalizzazione */
const ATK_POSITIONS = new Set(['P', 'SP', 'ALA', 'AD', 'AS'])
/** Posizioni difesa per stat booster Comportamento difensivo */
const DEF_POSITIONS = new Set(['DC', 'TD', 'TS', 'MED', 'CC'])

function matchConnectionToRoster(connection, roster, stylesLookup) {
  if (!connection || !roster?.length) return { focal: [], keyMan: [], focalReq: null, keyManReq: null }
  const allPlayers = roster
  const styleMatch = (p, styleName, pos) => {
    const pStyle = (p.playing_style_id && stylesLookup[p.playing_style_id]) || (p.role ? String(p.role).trim() : '')
    const styleOk = !styleName || (pStyle && String(pStyle).toLowerCase() === String(styleName).toLowerCase())
    const posOk = !pos || p.position === pos || (pos === 'MED' && MID_POSITIONS.has(p.position)) || (pos === 'P' && ATK_POSITIONS.has(p.position))
    return styleOk && posOk
  }
  let focalReq = null
  let keyManReq = null
  if (connection.focal_point) {
    focalReq = `${connection.focal_point.playing_style || '?'} (${connection.focal_point.position || '?'})`
  }
  if (connection.key_man) {
    keyManReq = `${connection.key_man.playing_style || '?'} (${connection.key_man.position || '?'})`
  }
  const focal = connection.focal_point
    ? allPlayers.filter(p => styleMatch(p, connection.focal_point.playing_style, connection.focal_point.position))
    : []
  const keyMan = connection.key_man
    ? allPlayers.filter(p => styleMatch(p, connection.key_man.playing_style, connection.key_man.position))
    : []
  return { focal, keyMan, focalReq, keyManReq }
}

function statBoostersBeneficiaries(statBoosters, roster) {
  if (!Array.isArray(statBoosters) || statBoosters.length === 0 || !roster?.length) return []
  const lines = []
  for (const b of statBoosters.slice(0, 4)) {
    const name = (b && (b.stat_name || b.name)) ? String(b.stat_name || b.name) : ''
    if (!name) continue
    const nameLower = name.toLowerCase()
    let players = []
    if (nameLower.includes('finalizzazione') || nameLower.includes('finishing')) {
      players = roster.filter(p => p.position && ATK_POSITIONS.has(p.position)).map(p => sanitizeForPrompt(p.player_name, 25))
    } else if (nameLower.includes('comportamento difensivo') || nameLower.includes('defens') || nameLower.includes('difensiv')) {
      players = roster.filter(p => p.position && DEF_POSITIONS.has(p.position)).map(p => sanitizeForPrompt(p.player_name, 25))
    } else {
      players = roster.slice(0, 5).map(p => sanitizeForPrompt(p.player_name, 25))
    }
    if (players.length) lines.push(`${name}: ${players.slice(0, 5).join(', ')}`)
  }
  return lines
}

function coachAdvisableStyles(competence, lang) {
  if (!competence || typeof competence !== 'object') return { advisable: [], notAdvisable: [] }
  const entries = Object.entries(competence)
    .map(([k, v]) => ({ style: k, val: parseInt(v, 10) || 0 }))
    .filter(({ val }) => !Number.isNaN(val))
  const advisable = entries.filter(({ val }) => val >= 70).map(({ style }) => style)
  const notAdvisable = entries.filter(({ val }) => val < 70).map(({ style, val }) => `${style} (${val})`)
  return { advisable, notAdvisable }
}

function formationVsUsage(formation, formationUsage) {
  if (!formationUsage || typeof formationUsage !== 'object' || Object.keys(formationUsage).length === 0) return null
  const top = Object.entries(formationUsage)
    .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
    .slice(0, 2)
  const topFormations = top.map(([f]) => f).filter(Boolean)
  if (!formation || topFormations.length === 0) return null
  if (topFormations.includes(formation)) return null
  return { saved: formation, used: topFormations }
}

/**
 * Costruisce il testo del riassunto enterprise (diagnostic) per la chat.
 * Solo template/regole, nessuna chiamata OpenAI. Usato da POST /api/refresh-diagnostic.
 * Riferimento: docs/DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md §10.3 e §11
 *
 * @param {'it'|'en'} lang - Lingua output
 * @param {object} data - Dati già letti dal DB (profile, formation, roster, matches, coach, patterns, ecc.)
 * @returns {string} Testo del diagnostic (profilo, rosa, tattica, andamento, difficoltà, allenatore, build, abilità, sinergie)
 */
export function buildDiagnostic(lang, data) {
  const L = lang === 'en' ? LABELS_EN : LABELS_IT
  const sections = []

  // 1. Profilo (sanitizza campi da DB)
  const profile = data.profile || {}
  const firstName = sanitizeForPrompt(profile.first_name, 80) || (lang === 'en' ? 'User' : 'Utente')
  const teamName = sanitizeForPrompt(profile.team_name, 80) || (lang === 'en' ? 'your team' : 'il tuo team')
  const problems = Array.isArray(profile.common_problems)
    ? profile.common_problems.map(p => sanitizeForPrompt(p, 60)).filter(Boolean)
    : []
  sections.push(L.profileSection(firstName, teamName, problems))

  // 2. Rosa (sintesi)
  const formation = data.formation || (lang === 'en' ? 'not set' : 'non impostata')
  const roster = data.roster || []
  const stylesLookup = data.stylesLookup || {}
  const titolari = roster.filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
    .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
  const riserve = roster.filter(p => p.slot_index == null)
  const starterLines = titolari.map(p => {
    const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || sanitizeForPrompt(p.role, 30) || '-'
    return `  ${sanitizeForPrompt(p.player_name, 50) || '?'} (${sanitizeForPrompt(p.position, 20) || '?'}, ${styleName}, ${p.overall_rating ?? '-'})`
  })
  const reserveLines = riserve.slice(0, 12).map(p => {
    const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || sanitizeForPrompt(p.role, 30) || '-'
    return `  ${sanitizeForPrompt(p.player_name, 50) || '?'} (${sanitizeForPrompt(p.position, 20) || '?'}, ${styleName}, ${p.overall_rating ?? '-'})`
  })
  sections.push(L.rosterSection(formation, starterLines, reserveLines, riserve.length))

  // 3. Tattica (teamStyle = stile squadra da team_tactical_settings, NON formazione)
  const teamStyle = data.teamStyle && String(data.teamStyle).trim() && data.teamStyle !== 'non impostato' && data.teamStyle !== 'not set'
    ? data.teamStyle
    : (lang === 'en' ? 'not set' : 'non impostato')
  const numInstructions = data.numInstructions ?? 0
  sections.push(L.tacticsSection(teamStyle, numInstructions))

  // 4. Andamento (ultime partite + pattern)
  const matches = data.matches || []
  const oppMap = data.oppFormationsMap || {}
  const matchLines = matches.slice(0, 10).map(m => {
    const d = m.match_date ? String(m.match_date).slice(0, 10) : '?'
    const opp = oppMap[m.opponent_formation_id]
    const vs = opp?.formation_name ? ` vs ${sanitizeForPrompt(opp.formation_name, 30)}` : ''
    return `  ${d} vs ${sanitizeForPrompt(m.opponent_name, 40) || '?'} ${m.result || '-'} (${sanitizeForPrompt(m.formation_played, 20) || '-'}${vs})`
  })
  const patterns = data.patternsRow || {}
  const formUsage = patterns.formation_usage && typeof patterns.formation_usage === 'object'
  let patternText = ''
  if (formUsage && Object.keys(patterns.formation_usage).length > 0) {
    const top = Object.entries(patterns.formation_usage)
      .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
      .slice(0, 3)
    patternText = top.map(([f, d]) => `${f}: ${d?.matches || 0} ${L.matches} (${d?.win_rate != null ? Math.round(d.win_rate * 100) : '-'}%)`).join('; ')
  }
  sections.push(L.andamentoSection(matchLines, patternText, matches.length === 0))

  // 5. Difficoltà
  const recurring = Array.isArray(patterns.recurring_issues)
    ? patterns.recurring_issues.slice(0, 3).map(i => sanitizeForPrompt(i?.issue ?? i, 60)).filter(Boolean)
    : []
  sections.push(L.difficoltaSection(problems, recurring))

  // 6. Allenatore (con connection ↔ rosa e stat boosters beneficiari)
  const coachRow = data.coachRow || null
  const allRoster = [...titolari, ...riserve]
  const connMatch = coachRow?.connection ? matchConnectionToRoster(coachRow.connection, allRoster, stylesLookup) : null
  const boosterLines = coachRow?.stat_boosters ? statBoostersBeneficiaries(coachRow.stat_boosters, allRoster) : []
  const { advisable: coachAdvisable, notAdvisable: coachNotAdvisable } = coachRow?.playing_style_competence
    ? coachAdvisableStyles(coachRow.playing_style_competence, lang)
    : { advisable: [], notAdvisable: [] }
  let coachText = coachRow?.coach_name
    ? L.coachSectionFull(
        sanitizeForPrompt(coachRow.coach_name, 60),
        coachRow.playing_style_competence || {},
        coachRow.connection,
        coachAdvisable,
        coachNotAdvisable,
        connMatch,
        boosterLines,
        lang
      )
    : L.noCoach
  sections.push(coachText)

  // 7. Build (sintesi: tipo rosa e come si muove in base agli stili)
  const buildSintesi = buildSintesiText(titolari, riserve, stylesLookup, formation, teamStyle, lang, L)
  sections.push(buildSintesi)

  // 8. Abilità rilevanti (sintesi)
  const allSkills = new Set()
  roster.forEach(p => {
    [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].forEach(s => allSkills.add(sanitizeForPrompt(s, 40)))
  })
  const skillsArr = [...allSkills].filter(Boolean).slice(0, 15)
  if (skillsArr.length > 0) sections.push(L.skillsSection(skillsArr))

  // 9. Sinergie e note derivate (allineamento coach-stile, disallineamento formazione, conflitti)
  const formVsUsage = formationVsUsage(formation, patterns.formation_usage)
  const individualInstructions = data.individualInstructions || {}
  const synergiesText = L.synergiesSection(
    teamStyle,
    coachAdvisable,
    formVsUsage,
    connMatch,
    individualInstructions,
    coachRow?.playing_style_competence,
    lang
  )
  if (synergiesText) sections.push(synergiesText)

  // 10. Leve possibili (ragionamenti inversi: sintomo → leva)
  const leveText = L.leveSection(problems, recurring, patterns.formation_usage, matches.length, lang)
  if (leveText) sections.push(leveText)

  return sections.filter(Boolean).join('\n\n')
}

function styleNameForPlayer(p, stylesLookup) {
  return (p.playing_style_id && stylesLookup[p.playing_style_id]) || sanitizeForPrompt(p.role, 30) || ''
}
function buildSintesiText(titolari, riserve, stylesLookup, formation, teamStyle, lang, L) {
  const styleNames = titolari.map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  const uniqueStyles = [...new Set(styleNames)].slice(0, 6)
  const defStyles = titolari.filter(p => ['DC', 'TD', 'TS', 'MED'].includes(p.position)).map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  const midStyles = titolari.filter(p => MID_POSITIONS.has(p.position)).map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  const atkStyles = titolari.filter(p => p.position && ATK_POSITIONS.has(p.position)).map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  return L.buildSectionRich(
    titolari.length,
    riserve.length,
    formation,
    teamStyle,
    uniqueStyles.length ? uniqueStyles.join(', ') : '-',
    defStyles.length ? [...new Set(defStyles)].join(', ') : '-',
    midStyles.length ? [...new Set(midStyles)].join(', ') : '-',
    atkStyles.length ? [...new Set(atkStyles)].join(', ') : '-',
    lang
  )
}

const LABELS_IT = {
  profileSection: (name, team, problems) =>
    `Profilo: ${name}, squadra ${team}.${problems.length ? ` Problemi dichiarati: ${problems.join(', ')}.` : ''}`,
  rosterSection: (form, starters, reserves, totalReserves) =>
    `Rosa. Formazione: ${form}.\nTitolari:\n${starters.join('\n')}\nRiserve (${totalReserves}):\n${reserves.join('\n')}${totalReserves > 12 ? `\n... altri ${totalReserves - 12}` : ''}`,
  tacticsSection: (style, num) => `Tattica: stile squadra ${style}. Istruzioni individuali: ${num} attive.`,
  andamentoSection: (matchLines, patternText, noMatches) =>
    noMatches ? 'Andamento: nessuna partita caricata.' : `Andamento (ultime partite):\n${matchLines.join('\n')}${patternText ? `\nPattern: ${patternText}` : ''}`,
  difficoltaSection: (declared, recurring) =>
    `Difficoltà:${declared.length ? ` dichiarate: ${declared.join(', ')}.` : ''}${recurring.length ? ` Ricorrenti: ${recurring.join(', ')}.` : ' Nessun problema ricorrente in DB.'}`,
  noCoach: 'Allenatore: nessun allenatore attivo impostato.',
  coachSection: (name, competence, connection, statBoosters) => {
    let t = `Allenatore: ${name}. Competenze stili: `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += entries.map(({ k, v }) => `${k}=${v}`).join(', ') + '.'
    } else t += 'non impostate.'
    if (connection) t += ` Connection: ${typeof connection === 'string' ? connection : (connection.name || '')}.`
    if (statBoosters && (Array.isArray(statBoosters) ? statBoosters.length : Object.keys(statBoosters || {}).length)) t += ' Stat boosters attivi.'
    return t
  },
  coachSectionFull: (name, competence, connection, advisable, notAdvisable, connMatch, boosterLines, lang) => {
    let t = `Allenatore: ${name}. `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += `Competenze: ${entries.map(({ k, v }) => `${k}=${v}`).join(', ')}. `
      if (advisable?.length) t += `Consigliabili (≥70): ${advisable.join(', ')}. `
      if (notAdvisable?.length) t += `Sconsigliabili (<70): ${notAdvisable.slice(0, 3).join(', ')}. `
    }
    if (connection?.name) {
      t += `Connection: ${connection.name}. `
      if (connMatch) {
        const focalNames = connMatch.focal.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        const keyNames = connMatch.keyMan.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        if (focalNames.length) t += `Focal Point compatibili: ${focalNames.join(', ')}. `
        else if (connMatch.focalReq) t += `Focal Point richiesto (${connMatch.focalReq}): nessun match in rosa. `
        if (keyNames.length) t += `Key Man compatibili: ${keyNames.join(', ')}. `
        else if (connMatch.keyManReq) t += `Key Man richiesto (${connMatch.keyManReq}): nessun match in rosa. `
      }
    }
    if (boosterLines?.length) t += `Stat boosters beneficiari: ${boosterLines.join('; ')}. `
    return t.trim()
  },
  buildSection: (numStarters, numReserves, form, style) =>
    `Build: ${numStarters} titolari, ${numReserves} riserve. Formazione: ${form}. Stile squadra: ${style}.`,
  buildSectionRich: (numStarters, numReserves, form, style, uniqueStyles, defStyles, midStyles, atkStyles, lang) =>
    `Build: ${numStarters} titolari, ${numReserves} riserve. Formazione: ${form}, stile squadra: ${style}. Stili in rosa: ${uniqueStyles}. Difesa: ${defStyles}. Centrocampo: ${midStyles}. Attacco: ${atkStyles}. Usa questi stili per fit con modulo e connection.`,
  matches: 'partite',
  skillsSection: arr => `Abilità in rosa: ${arr.slice(0, 12).join(', ')}.`,
  synergiesSection: (teamStyle, coachAdvisable, formVsUsage, connMatch, individualInstructions, competence, lang) => {
    const parts = []
    if (teamStyle === 'non impostato' || teamStyle === 'not set') {
      if (coachAdvisable?.length) parts.push(`Stile squadra non impostato → consigliabile impostare uno tra: ${coachAdvisable.join(', ')} (coach forte su questi).`)
    } else if (coachAdvisable?.length && !coachAdvisable.some(s => teamStyle && String(teamStyle).toLowerCase().includes(s.toLowerCase()))) {
      const norm = String(teamStyle).toLowerCase().replace(/_/g, ' ')
      const match = coachAdvisable.find(s => norm.includes(s.toLowerCase()))
      if (!match) parts.push(`Stile squadra (${teamStyle}): verificare competenza coach; consigliabili con questo coach: ${coachAdvisable.join(', ')}.`)
    }
    if (formVsUsage) parts.push(`Disallineamento: formazione salvata ${formVsUsage.saved} vs moduli più usati in partita: ${formVsUsage.used.join(', ')}. Considerare moduli con miglior win rate.`)
    if (connMatch && (!connMatch.focal.length || !connMatch.keyMan.length)) {
      parts.push('Connection allenatore non pienamente attivabile: manca Focal Point o Key Man in rosa. Per attivarla servono giocatori con stile e posizione richiesti.')
    }
    const instr = individualInstructions && typeof individualInstructions === 'object' ? individualInstructions : {}
    const hasContropiedeOnDef = Object.entries(instr).some(([slot, o]) => {
      const s = (slot || '').toLowerCase()
      const inst = o?.instruction || o
      return (s.includes('difesa') || s.includes('def')) && (String(inst).toLowerCase().includes('contropiede') || String(inst).toLowerCase().includes('counter'))
    })
    if (hasContropiedeOnDef && competence) {
      const contropiedeVal = competence.contropiede_veloce ?? competence.contropiede
      const v = parseInt(contropiedeVal, 10)
      if (!Number.isNaN(v) && v < 70) parts.push('Nota: Contropiede attivo su difensori ma competenza coach Contropiede <70 — per contropiede sistematico preferire stile Contrattacco/Passaggio lungo o allenatore con Contropiede ≥70.')
    }
    return parts.length ? `Sinergie e note:\n${parts.map(p => `- ${p}`).join('\n')}` : ''
  },
  leveSection: (problems, recurring, formationUsage, matchesCount, lang) => {
    const leve = []
    if (problems.some(p => /difesa|defen|defens/i.test(String(p)))) leve.push('Difesa → leva: compattezza, istruzioni (linea bassa, marcatura, copertura), rinforzo centrale o terzini.')
    if (problems.some(p => /attacco|attack|goal|gol/i.test(String(p)))) leve.push('Attacco → leva: stile squadra adatto a verticalizzazione, punte da area, istruzioni su attaccanti (ancoraggio/contropiede dove consentito).')
    if (problems.some(p => /formazione|formation|modulo/i.test(String(p)))) leve.push('Formazione → leva: provare moduli con miglior win rate dai dati partite; allineare formazione salvata all\'uso reale.')
    if (recurring.length) leve.push(`Problemi ricorrenti (${recurring.slice(0, 2).join(', ')}) → agganciare una leva per volta: fix FIT, istruzioni §5, o cambio modulo/stile.`)
    if (matchesCount > 0 && formationUsage && typeof formationUsage === 'object') {
      const top = Object.entries(formationUsage).sort((a, b) => (b[1]?.win_rate || 0) - (a[1]?.win_rate || 0)).slice(0, 1)
      if (top.length && top[0][1]?.win_rate >= 0.6) leve.push(`Modulo con buon win rate: ${top[0][0]} (${Math.round((top[0][1].win_rate || 0) * 100)}%). Considerare per prossime partite.`)
    }
    return leve.length ? `Leve possibili (sintomo → leva):\n${leve.map(l => `- ${l}`).join('\n')}` : ''
  },
}

const LABELS_EN = {
  profileSection: (name, team, problems) =>
    `Profile: ${name}, team ${team}.${problems.length ? ` Declared issues: ${problems.join(', ')}.` : ''}`,
  rosterSection: (form, starters, reserves, totalReserves) =>
    `Roster. Formation: ${form}.\nStarters:\n${starters.join('\n')}\nReserves (${totalReserves}):\n${reserves.join('\n')}${totalReserves > 12 ? `\n... ${totalReserves - 12} more` : ''}`,
  tacticsSection: (style, num) => `Tactics: team style ${style}. Individual instructions: ${num} active.`,
  andamentoSection: (matchLines, patternText, noMatches) =>
    noMatches ? 'Form: no matches loaded.' : `Form (last matches):\n${matchLines.join('\n')}${patternText ? `\nPattern: ${patternText}` : ''}`,
  difficoltaSection: (declared, recurring) =>
    `Difficulties:${declared.length ? ` declared: ${declared.join(', ')}.` : ''}${recurring.length ? ` Recurring: ${recurring.join(', ')}.` : ' No recurring issues in DB.'}`,
  noCoach: 'Coach: no active coach set.',
  coachSection: (name, competence, connection, statBoosters) => {
    let t = `Coach: ${name}. Style competence: `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += entries.map(({ k, v }) => `${k}=${v}`).join(', ') + '.'
    } else t += 'not set.'
    if (connection) t += ` Connection: ${typeof connection === 'string' ? connection : (connection.name || '')}.`
    if (statBoosters && (Array.isArray(statBoosters) ? statBoosters.length : Object.keys(statBoosters || {}).length)) t += ' Stat boosters active.'
    return t
  },
  coachSectionFull: (name, competence, connection, advisable, notAdvisable, connMatch, boosterLines, lang) => {
    let t = `Coach: ${name}. `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += `Competence: ${entries.map(({ k, v }) => `${k}=${v}`).join(', ')}. `
      if (advisable?.length) t += `Advisable (≥70): ${advisable.join(', ')}. `
      if (notAdvisable?.length) t += `Not advisable (<70): ${notAdvisable.slice(0, 3).join(', ')}. `
    }
    if (connection?.name) {
      t += `Connection: ${connection.name}. `
      if (connMatch) {
        const focalNames = connMatch.focal.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        const keyNames = connMatch.keyMan.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        if (focalNames.length) t += `Focal Point compatible: ${focalNames.join(', ')}. `
        else if (connMatch.focalReq) t += `Focal Point required (${connMatch.focalReq}): no match in roster. `
        if (keyNames.length) t += `Key Man compatible: ${keyNames.join(', ')}. `
        else if (connMatch.keyManReq) t += `Key Man required (${connMatch.keyManReq}): no match in roster. `
      }
    }
    if (boosterLines?.length) t += `Stat boosters beneficiaries: ${boosterLines.join('; ')}. `
    return t.trim()
  },
  buildSection: (numStarters, numReserves, form, style) =>
    `Build: ${numStarters} starters, ${numReserves} reserves. Formation: ${form}. Team style: ${style}.`,
  buildSectionRich: (numStarters, numReserves, form, style, uniqueStyles, defStyles, midStyles, atkStyles, lang) =>
    `Build: ${numStarters} starters, ${numReserves} reserves. Formation: ${form}, team style: ${style}. Styles in roster: ${uniqueStyles}. Defence: ${defStyles}. Midfield: ${midStyles}. Attack: ${atkStyles}. Use these for fit with formation and connection.`,
  matches: 'matches',
  skillsSection: arr => `Skills in roster: ${arr.slice(0, 12).join(', ')}.`,
  synergiesSection: (teamStyle, coachAdvisable, formVsUsage, connMatch, individualInstructions, competence, lang) => {
    const parts = []
    if (teamStyle === 'non impostato' || teamStyle === 'not set') {
      if (coachAdvisable?.length) parts.push(`Team style not set → advisable to set one of: ${coachAdvisable.join(', ')} (coach strong on these).`)
    } else if (coachAdvisable?.length && !coachAdvisable.some(s => teamStyle && String(teamStyle).toLowerCase().includes(s.toLowerCase()))) {
      const norm = String(teamStyle).toLowerCase().replace(/_/g, ' ')
      const match = coachAdvisable.find(s => norm.includes(s.toLowerCase()))
      if (!match) parts.push(`Team style (${teamStyle}): check coach competence; advisable with this coach: ${coachAdvisable.join(', ')}.`)
    }
    if (formVsUsage) parts.push(`Mismatch: saved formation ${formVsUsage.saved} vs most used in matches: ${formVsUsage.used.join(', ')}. Consider formations with better win rate.`)
    if (connMatch && (!connMatch.focal.length || !connMatch.keyMan.length)) {
      parts.push('Coach connection not fully activatable: missing Focal Point or Key Man in roster. Need players with required style and position.')
    }
    const instr = individualInstructions && typeof individualInstructions === 'object' ? individualInstructions : {}
    const hasContropiedeOnDef = Object.entries(instr).some(([slot, o]) => {
      const s = (slot || '').toLowerCase()
      const inst = o?.instruction || o
      return (s.includes('difesa') || s.includes('def')) && (String(inst).toLowerCase().includes('contropiede') || String(inst).toLowerCase().includes('counter'))
    })
    if (hasContropiedeOnDef && competence) {
      const contropiedeVal = competence.contropiede_veloce ?? competence.contropiede
      const v = parseInt(contropiedeVal, 10)
      if (!Number.isNaN(v) && v < 70) parts.push('Note: Counter on defenders but coach Quick Counter <70 — for systematic counter prefer Long Ball Counter/Passing or coach with Quick Counter ≥70.')
    }
    return parts.length ? `Synergies and notes:\n${parts.map(p => `- ${p}`).join('\n')}` : ''
  },
  leveSection: (problems, recurring, formationUsage, matchesCount, lang) => {
    const leve = []
    if (problems.some(p => /defen|defens/i.test(String(p)))) leve.push('Defence → lever: compactness, instructions (deep line, marking, cover), reinforce centre or full-backs.')
    if (problems.some(p => /attack|goal/i.test(String(p)))) leve.push('Attack → lever: team style suited to vertical play, strikers in box, instructions on forwards (anchor/counter where allowed).')
    if (problems.some(p => /formation|modul/i.test(String(p)))) leve.push('Formation → lever: try formations with better win rate from match data; align saved formation to actual usage.')
    if (recurring.length) leve.push(`Recurring issues (${recurring.slice(0, 2).join(', ')}) → anchor one lever at a time: fix FIT, §5 instructions, or change formation/style.`)
    if (matchesCount > 0 && formationUsage && typeof formationUsage === 'object') {
      const top = Object.entries(formationUsage).sort((a, b) => (b[1]?.win_rate || 0) - (a[1]?.win_rate || 0)).slice(0, 1)
      if (top.length && top[0][1]?.win_rate >= 0.6) leve.push(`Formation with good win rate: ${top[0][0]} (${Math.round((top[0][1].win_rate || 0) * 100)}%). Consider for next matches.`)
    }
    return leve.length ? `Possible levers (symptom → lever):\n${leve.map(l => `- ${l}`).join('\n')}` : ''
  },
}
