// @ts-nocheck
// Supabase Edge Function: Import Players from JSON
// Importa giocatori da JSON diretto in players_base

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequest {
  json_data: any
  batch_size?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { json_data, batch_size = 50 }: ImportRequest = await req.json()

    if (!json_data) {
      throw new Error('json_data is required')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Supporta array diretto o oggetto con array
    let players: any[] = []
    if (Array.isArray(json_data)) {
      players = json_data
    } else if (json_data.players && Array.isArray(json_data.players)) {
      players = json_data.players
    } else if (json_data.data && Array.isArray(json_data.data)) {
      players = json_data.data
    } else {
      throw new Error('Invalid JSON format. Expected array or object with "players" or "data" array')
    }

    console.log(`Importing ${players.length} players...`)

    // Mappa e importa in batch
    let imported = 0
    let updated = 0
    let errors = 0
    const errorsList: string[] = []

    for (let i = 0; i < players.length; i += batch_size) {
      const batch = players.slice(i, i + batch_size)
      
      const results = await Promise.allSettled(
        batch.map(async (player: any) => {
          const mappedData = mapPlayerData(player)
          
          if (!mappedData.player_name) {
            return { action: 'skipped', reason: 'No name' }
          }

          // Cerca esistente
          const { data: existing, error: searchError } = await supabase
            .from('players_base')
            .select('id')
            .ilike('player_name', mappedData.player_name)
            .limit(1)
            .maybeSingle()

          if (searchError && searchError.code !== 'PGRST116') {
            console.error(`Search error for ${mappedData.player_name}:`, searchError)
            throw searchError
          }

          if (existing) {
            // Aggiorna
            const { error: updateError } = await supabase
              .from('players_base')
              .update({
                ...mappedData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id)

            if (updateError) {
              console.error(`Update error for ${mappedData.player_name}:`, updateError)
              throw updateError
            }
            return { action: 'updated', name: mappedData.player_name }
          } else {
            // Crea nuovo
            const { error: insertError, data: inserted } = await supabase
              .from('players_base')
              .insert(mappedData)
              .select()

            if (insertError) {
              console.error(`Insert error for ${mappedData.player_name}:`, insertError)
              throw insertError
            }
            return { action: 'created', name: mappedData.player_name }
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.action === 'created') imported++
          else if (result.value.action === 'updated') updated++
        } else {
          errors++
          errorsList.push(result.reason?.message || 'Unknown error')
        }
      }

      console.log(`Processed ${Math.min(i + batch_size, players.length)}/${players.length}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: players.length,
        imported,
        updated,
        errors,
        errorsList: errorsList.slice(0, 10)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper: Converte stringa in numero
function toNumber(value: any, defaultValue = 0): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseInt(value.trim())
    return isNaN(num) ? defaultValue : num
  }
  return defaultValue
}

// Helper: Estrae informazioni dal campo "Giocatori" (formato: "116\nPT\nNome Giocatore\nStile")
function parseGiocatoriField(giocatoriStr: string) {
  if (!giocatoriStr) return { rating: null, cardType: null, name: null, style: null }
  
  const parts = giocatoriStr.split('\n').map(p => p.trim()).filter(p => p)
  return {
    rating: parts.length > 0 ? toNumber(parts[0]) : null,
    cardType: parts.length > 1 ? parts[1] : null, // PT, ESA, TRQ, P, EDA, etc.
    name: parts.length > 2 ? parts[2] : null,
    style: parts.length > 3 ? parts[3] : null
  }
}

// Helper: Determina posizione dal cardType e stile
function inferPosition(cardType: string, style: string): string {
  if (!cardType) return 'CF'
  
  // Mappa cardType a posizione base
  const cardTypeMap: { [key: string]: string } = {
    'PT': 'GK', // Portiere
    'P': 'CF',  // Punter
    'ESA': 'LWF', // Esterno Sinistro Attaccante
    'TRQ': 'AMF', // Trequartista
    'EDA': 'AMF', // Esterno Destro Attaccante
    // Aggiungi altre mappature se necessario
  }
  
  return cardTypeMap[cardType.toUpperCase()] || 'CF'
}

// Mappa dati giocatore al formato database
function mapPlayerData(jsonPlayer: any) {
  // Estrai informazioni dal campo "Giocatori"
  const giocatoriInfo = parseGiocatoriField(jsonPlayer.Giocatori || jsonPlayer['Giocatori'] || '')
  
  // Usa il nome estratto o fallback su altri campi
  const playerName = giocatoriInfo.name || 
                     jsonPlayer.name || 
                     jsonPlayer.player_name || 
                     jsonPlayer.nome || 
                     jsonPlayer.Name || ''
  
  // Determina card_type
  const cardType = giocatoriInfo.cardType || 
                   jsonPlayer.card_type || 
                   jsonPlayer.tipo_carta || 
                   'Standard'
  
  // Determina posizione
  const position = jsonPlayer.position || 
                   jsonPlayer.pos || 
                   jsonPlayer.posizione || 
                   inferPosition(cardType, giocatoriInfo.style || '')
  
  // Converti valori numerici (il JSON ha stringhe)
  const overallRating = toNumber(jsonPlayer.Complessivamente || jsonPlayer.overall_rating || giocatoriInfo.rating)
  const potential = toNumber(jsonPlayer.Potenziale || jsonPlayer.potential || jsonPlayer.potential_max)
  const height = toNumber(jsonPlayer.Altezza || jsonPlayer.height || jsonPlayer.altezza)
  const weight = toNumber(jsonPlayer.Peso || jsonPlayer.weight || jsonPlayer.peso)
  const age = toNumber(jsonPlayer.Età || jsonPlayer.age || jsonPlayer.eta)
  const levelCap = toNumber(jsonPlayer['Livello Massimo'] || jsonPlayer.level_cap || jsonPlayer.livello_massimo)
  
  // Stats attacco (italiano -> inglese)
  const attacking = {
    offensiveAwareness: toNumber(jsonPlayer['Comportamento offensivo'] || jsonPlayer.attacking?.offensiveAwareness),
    ballControl: toNumber(jsonPlayer['Controllo palla'] || jsonPlayer.attacking?.ballControl),
    dribbling: toNumber(jsonPlayer['Vel. dribbling'] || jsonPlayer.attacking?.dribbling),
    tightPossession: toNumber(jsonPlayer['Possesso stretto'] || jsonPlayer.attacking?.tightPossession),
    lowPass: toNumber(jsonPlayer['Passaggio rasoterra'] || jsonPlayer.attacking?.lowPass),
    loftedPass: toNumber(jsonPlayer['Passaggio alto'] || jsonPlayer.attacking?.loftedPass),
    finishing: toNumber(jsonPlayer.Finalizzazione || jsonPlayer.attacking?.finishing),
    heading: toNumber(jsonPlayer['Colpo di testa'] || jsonPlayer.attacking?.heading),
    placeKicking: toNumber(jsonPlayer['Calci piazzati'] || jsonPlayer.attacking?.placeKicking),
    curl: toNumber(jsonPlayer['Tiro a giro'] || jsonPlayer.attacking?.curl)
  }
  
  // Stats difesa (italiano -> inglese)
  const defending = {
    defensiveAwareness: toNumber(jsonPlayer['Comportamento difensivo'] || jsonPlayer.defending?.defensiveAwareness),
    defensiveEngagement: toNumber(jsonPlayer['Coinvolgimento difensivo'] || jsonPlayer.defending?.defensiveEngagement),
    tackling: toNumber(jsonPlayer.Contrasto || jsonPlayer.defending?.tackling),
    aggression: toNumber(jsonPlayer.Aggressività || jsonPlayer.defending?.aggression),
    goalkeeping: toNumber(jsonPlayer.Portieri || jsonPlayer.defending?.goalkeeping),
    gkCatching: toNumber(jsonPlayer['Presa PT'] || jsonPlayer.defending?.gkCatching),
    gkParrying: toNumber(jsonPlayer['Parata PT'] || jsonPlayer.defending?.gkParrying),
    gkReflexes: toNumber(jsonPlayer['Riflessi PT'] || jsonPlayer.defending?.gkReflexes),
    gkReach: toNumber(jsonPlayer['Estensione PT'] || jsonPlayer.defending?.gkReach)
  }
  
  // Stats fisiche (italiano -> inglese)
  const athleticism = {
    speed: toNumber(jsonPlayer.Velocità || jsonPlayer.athleticism?.speed),
    acceleration: toNumber(jsonPlayer.Accelerazione || jsonPlayer.athleticism?.acceleration),
    kickingPower: toNumber(jsonPlayer['Potenza di tiro'] || jsonPlayer.athleticism?.kickingPower),
    jump: toNumber(jsonPlayer.Elevazione || jsonPlayer.athleticism?.jump),
    physicalContact: toNumber(jsonPlayer['Contatto fisico'] || jsonPlayer.athleticism?.physicalContact),
    balance: toNumber(jsonPlayer.Equilibrio || jsonPlayer.athleticism?.balance),
    stamina: toNumber(jsonPlayer.Resistenza || jsonPlayer.athleticism?.stamina),
    weakFootUsage: toNumber(jsonPlayer.weak_foot_usage || jsonPlayer.athleticism?.weakFootUsage, 4),
    weakFootAccuracy: toNumber(jsonPlayer.weak_foot_accuracy || jsonPlayer.athleticism?.weakFootAccuracy, 4),
    form: toNumber(jsonPlayer.form || jsonPlayer.athleticism?.form, 8),
    injuryResistance: toNumber(jsonPlayer.injury_resistance || jsonPlayer.athleticism?.injuryResistance, 2)
  }
  
  return {
    player_name: playerName,
    position: position,
    height: height || null,
    weight: weight || null,
    age: age || null,
    nationality: jsonPlayer['Nazionalità...'] || jsonPlayer.nationality || jsonPlayer.nazionalita || '',
    club_name: jsonPlayer.ClubName || jsonPlayer.club || jsonPlayer.club_name || '',
    card_type: cardType || 'Standard',
    era: jsonPlayer.era || '',
    team: jsonPlayer.team || '',
    potential_max: potential || null,
    form: jsonPlayer.Condizione || jsonPlayer.condition || jsonPlayer.form || 'B',
    
    base_stats: {
      overall_rating: overallRating || 
                     (attacking.offensiveAwareness > 0 ? 
                      Math.round((attacking.offensiveAwareness + attacking.ballControl + attacking.finishing) / 3) : 0),
      attacking: attacking,
      defending: defending,
      athleticism: athleticism
    },
    
    skills: Array.isArray(jsonPlayer.skills) ? jsonPlayer.skills : 
            typeof jsonPlayer.skills === 'string' ? jsonPlayer.skills.split(',').map((s: string) => s.trim()) : [],
    com_skills: Array.isArray(jsonPlayer.com_skills) ? jsonPlayer.com_skills :
                Array.isArray(jsonPlayer.comSkills) ? jsonPlayer.comSkills :
                typeof jsonPlayer.com_skills === 'string' ? jsonPlayer.com_skills.split(',').map((s: string) => s.trim()) : [],
    
    metadata: {
      preferred_foot: jsonPlayer.preferred_foot || jsonPlayer.piede || 'right',
      konami_id: jsonPlayer.konami_id || jsonPlayer.id || null,
      efootballhub_id: jsonPlayer.efootballhub_id || null,
      style: giocatoriInfo.style || null,
      level_cap: levelCap || null,
      cost: toNumber(jsonPlayer.Costo)
    },
    
    source: 'json_import'
  }
}
