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
    const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || '-'
    return `  ${sanitizeForPrompt(p.player_name, 50) || '?'} (${sanitizeForPrompt(p.position, 20) || '?'}, ${styleName}, ${p.overall_rating ?? '-'})`
  })
  const reserveLines = riserve.slice(0, 12).map(p => {
    const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || '-'
    return `  ${sanitizeForPrompt(p.player_name, 50) || '?'} (${sanitizeForPrompt(p.position, 20) || '?'}, ${styleName}, ${p.overall_rating ?? '-'})`
  })
  sections.push(L.rosterSection(formation, starterLines, reserveLines, riserve.length))

  // 3. Tattica
  const teamStyle = data.teamStyle || formation
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

  // 6. Allenatore
  const coachRow = data.coachRow || null
  let coachText = coachRow?.coach_name
    ? L.coachSection(sanitizeForPrompt(coachRow.coach_name, 60), coachRow.playing_style_competence || {}, coachRow.connection, coachRow.stat_boosters)
    : L.noCoach
  sections.push(coachText)

  // 7. Build (sintesi una riga)
  const buildLine = L.buildSection(titolari.length, riserve.length, teamStyle)
  sections.push(buildLine)

  // 8. Abilità rilevanti (sintesi)
  const allSkills = new Set()
  roster.forEach(p => {
    [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].forEach(s => allSkills.add(sanitizeForPrompt(s, 40)))
  })
  const skillsArr = [...allSkills].filter(Boolean).slice(0, 15)
  if (skillsArr.length > 0) sections.push(L.skillsSection(skillsArr))

  return sections.filter(Boolean).join('\n\n')
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
  buildSection: (numStarters, numReserves, style) =>
    `Build: ${numStarters} titolari, ${numReserves} riserve. Stile squadra: ${style}.`,
  matches: 'partite',
  skillsSection: arr => `Abilità in rosa: ${arr.slice(0, 12).join(', ')}.`,
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
  buildSection: (numStarters, numReserves, style) =>
    `Build: ${numStarters} starters, ${numReserves} reserves. Team style: ${style}.`,
  matches: 'matches',
  skillsSection: arr => `Skills in roster: ${arr.slice(0, 12).join(', ')}.`,
}
