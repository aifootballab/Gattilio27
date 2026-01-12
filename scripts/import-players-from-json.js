/**
 * Script di Import Giocatori da JSON
 * 
 * Questo script legge un file JSON con dati giocatori e li importa in Supabase
 * Supporta sia file locale che URL Google Drive
 * 
 * Uso:
 *   node scripts/import-players-from-json.js <path-to-json-file>
 *   oppure
 *   node scripts/import-players-from-json.js <google-drive-url>
 */

const fs = require('fs')
const path = require('path')

// Configurazione Supabase (usa variabili d'ambiente)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Configura variabili d\'ambiente:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Import dinamico di supabase-js (se disponibile)
let supabase
try {
  const { createClient } = require('@supabase/supabase-js')
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
} catch (error) {
  console.error('❌ Installa @supabase/supabase-js: npm install @supabase/supabase-js')
  process.exit(1)
}

/**
 * Mappa i dati dal JSON al formato players_base
 * ADATTA QUESTA FUNZIONE alla struttura del tuo JSON
 */
function mapPlayerData(jsonPlayer) {
  // Esempio di mapping - ADATTA alla struttura reale del JSON
  return {
    player_name: jsonPlayer.name || jsonPlayer.player_name || jsonPlayer.nome || '',
    position: jsonPlayer.position || jsonPlayer.pos || jsonPlayer.posizione || 'CF',
    height: jsonPlayer.height || jsonPlayer.altezza || null,
    weight: jsonPlayer.weight || jsonPlayer.peso || null,
    age: jsonPlayer.age || jsonPlayer.eta || null,
    nationality: jsonPlayer.nationality || jsonPlayer.nazionalita || jsonPlayer.country || '',
    club_name: jsonPlayer.club || jsonPlayer.club_name || jsonPlayer.squadra || '',
    card_type: jsonPlayer.card_type || jsonPlayer.tipo_carta || 'Standard',
    era: jsonPlayer.era || '',
    team: jsonPlayer.team || jsonPlayer.squadra || '',
    
    // Stats base
    base_stats: {
      overall_rating: jsonPlayer.overall_rating || jsonPlayer.rating || jsonPlayer.overall || 0,
      attacking: jsonPlayer.attacking || jsonPlayer.attacco || {
        offensiveAwareness: jsonPlayer.offensive_awareness || jsonPlayer.offensiveAwareness || 0,
        ballControl: jsonPlayer.ball_control || jsonPlayer.ballControl || 0,
        dribbling: jsonPlayer.dribbling || 0,
        tightPossession: jsonPlayer.tight_possession || jsonPlayer.tightPossession || 0,
        lowPass: jsonPlayer.low_pass || jsonPlayer.lowPass || 0,
        loftedPass: jsonPlayer.lofted_pass || jsonPlayer.loftedPass || 0,
        finishing: jsonPlayer.finishing || 0,
        heading: jsonPlayer.heading || 0,
        placeKicking: jsonPlayer.place_kicking || jsonPlayer.placeKicking || 0,
        curl: jsonPlayer.curl || 0
      },
      defending: jsonPlayer.defending || jsonPlayer.difesa || {
        defensiveAwareness: jsonPlayer.defensive_awareness || jsonPlayer.defensiveAwareness || 0,
        defensiveEngagement: jsonPlayer.defensive_engagement || jsonPlayer.defensiveEngagement || 0,
        tackling: jsonPlayer.tackling || 0,
        aggression: jsonPlayer.aggression || 0,
        goalkeeping: jsonPlayer.goalkeeping || jsonPlayer.gk || 0,
        gkCatching: jsonPlayer.gk_catching || jsonPlayer.gkCatching || 0,
        gkParrying: jsonPlayer.gk_parrying || jsonPlayer.gkParrying || 0,
        gkReflexes: jsonPlayer.gk_reflexes || jsonPlayer.gkReflexes || 0,
        gkReach: jsonPlayer.gk_reach || jsonPlayer.gkReach || 0
      },
      athleticism: jsonPlayer.athleticism || jsonPlayer.fisico || {
        speed: jsonPlayer.speed || jsonPlayer.velocita || 0,
        acceleration: jsonPlayer.acceleration || jsonPlayer.accelerazione || 0,
        kickingPower: jsonPlayer.kicking_power || jsonPlayer.kickingPower || 0,
        jump: jsonPlayer.jump || jsonPlayer.salto || 0,
        physicalContact: jsonPlayer.physical_contact || jsonPlayer.physicalContact || 0,
        balance: jsonPlayer.balance || jsonPlayer.equilibrio || 0,
        stamina: jsonPlayer.stamina || jsonPlayer.resistenza || 0,
        weakFootUsage: jsonPlayer.weak_foot_usage || jsonPlayer.weakFootUsage || 4,
        weakFootAccuracy: jsonPlayer.weak_foot_accuracy || jsonPlayer.weakFootAccuracy || 4,
        form: jsonPlayer.form || jsonPlayer.forma || 8,
        injuryResistance: jsonPlayer.injury_resistance || jsonPlayer.injuryResistance || 2
      }
    },
    
    // Skills
    skills: Array.isArray(jsonPlayer.skills) ? jsonPlayer.skills : 
            jsonPlayer.skills ? jsonPlayer.skills.split(',').map(s => s.trim()) : [],
    com_skills: Array.isArray(jsonPlayer.com_skills) ? jsonPlayer.com_skills :
                jsonPlayer.comSkills ? jsonPlayer.comSkills.split(',').map(s => s.trim()) : [],
    
    // Metadata
    metadata: {
      preferred_foot: jsonPlayer.preferred_foot || jsonPlayer.piede || 'right',
      konami_id: jsonPlayer.konami_id || jsonPlayer.id || null,
      efootballhub_id: jsonPlayer.efootballhub_id || null
    },
    
    source: 'json_import'
  }
}

/**
 * Importa un singolo giocatore
 */
async function importPlayer(playerData) {
  try {
    // Cerca se esiste già
    const { data: existing } = await supabase
      .from('players_base')
      .select('id')
      .ilike('player_name', playerData.player_name)
      .limit(1)
      .single()

    if (existing) {
      // Aggiorna esistente
      const { data, error } = await supabase
        .from('players_base')
        .update({
          ...playerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return { action: 'updated', data }
    } else {
      // Crea nuovo
      const { data, error } = await supabase
        .from('players_base')
        .insert(playerData)
        .select()
        .single()

      if (error) throw error
      return { action: 'created', data }
    }
  } catch (error) {
    console.error(`❌ Errore import ${playerData.player_name}:`, error.message)
    return { action: 'error', error: error.message }
  }
}

/**
 * Leggi e processa il file JSON
 */
async function importFromFile(filePath) {
  console.log(`📂 Leggendo file: ${filePath}`)
  
  let jsonData
  try {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // URL - scarica via fetch
      console.log('🌐 Scaricando da URL...')
      const response = await fetch(filePath)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      jsonData = await response.json()
    } else {
      // File locale
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      jsonData = JSON.parse(fileContent)
    }
  } catch (error) {
    console.error('❌ Errore lettura file:', error.message)
    process.exit(1)
  }

  // Supporta sia array che oggetto con array
  let players = []
  if (Array.isArray(jsonData)) {
    players = jsonData
  } else if (jsonData.players && Array.isArray(jsonData.players)) {
    players = jsonData.players
  } else if (jsonData.data && Array.isArray(jsonData.data)) {
    players = jsonData.data
  } else {
    console.error('❌ Formato JSON non supportato. Atteso: array o oggetto con campo "players" o "data"')
    console.log('📋 Struttura trovata:', Object.keys(jsonData))
    process.exit(1)
  }

  console.log(`✅ Trovati ${players.length} giocatori`)
  console.log('📊 Esempio primo giocatore:', JSON.stringify(players[0], null, 2).substring(0, 500))

  // Chiedi conferma
  console.log('\n⚠️  Vuoi procedere con l\'import? (Ctrl+C per annullare)')
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Import batch
  let created = 0
  let updated = 0
  let errors = 0

  console.log('\n🚀 Inizio import...\n')

  for (let i = 0; i < players.length; i++) {
    const player = players[i]
    const mappedData = mapPlayerData(player)
    
    if (!mappedData.player_name) {
      console.log(`⏭️  [${i + 1}/${players.length}] Salto giocatore senza nome`)
      continue
    }

    const result = await importPlayer(mappedData)
    
    if (result.action === 'created') {
      created++
      console.log(`✅ [${i + 1}/${players.length}] Creato: ${mappedData.player_name}`)
    } else if (result.action === 'updated') {
      updated++
      console.log(`🔄 [${i + 1}/${players.length}] Aggiornato: ${mappedData.player_name}`)
    } else {
      errors++
      console.log(`❌ [${i + 1}/${players.length}] Errore: ${mappedData.player_name}`)
    }

    // Rate limiting
    if ((i + 1) % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log('\n📊 Riepilogo:')
  console.log(`   ✅ Creati: ${created}`)
  console.log(`   🔄 Aggiornati: ${updated}`)
  console.log(`   ❌ Errori: ${errors}`)
  console.log(`   📦 Totale processati: ${created + updated + errors}`)
}

// Main
const filePath = process.argv[2]

if (!filePath) {
  console.error('❌ Uso: node scripts/import-players-from-json.js <path-to-json-file>')
  console.error('   oppure')
  console.error('   node scripts/import-players-from-json.js <google-drive-url>')
  process.exit(1)
}

importFromFile(filePath)
  .then(() => {
    console.log('\n✅ Import completato!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Errore import:', error)
    process.exit(1)
  })
