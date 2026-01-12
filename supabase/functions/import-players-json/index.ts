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

    console.log(`Starting import of ${players.length} players...`)

    // Mappa e importa in batch
    let imported = 0
    let updated = 0
    let skipped = 0
    let errors = 0
    const errorsList: string[] = []
    const skippedList: string[] = []

    for (let i = 0; i < players.length; i += batch_size) {
      const batch = players.slice(i, i + batch_size)
      console.log(`Processing batch ${Math.floor(i / batch_size) + 1}/${Math.ceil(players.length / batch_size)} (${i + 1}-${Math.min(i + batch_size, players.length)}/${players.length})`)
      
      const results = await Promise.allSettled(
        batch.map(async (player: any, index: number) => {
          try {
            const mappedData = mapPlayerData(player, i + index + 1)
            
            if (!mappedData.player_name || mappedData.player_name.trim() === '') {
              const reason = `Row ${i + index + 1}: No player name found`
              skippedList.push(reason)
              return { action: 'skipped', reason }
            }

            // Cerca esistente
            const { data: existing, error: searchError } = await supabase
              .from('players_base')
              .select('id')
              .ilike('player_name', mappedData.player_name.trim())
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
          } catch (error) {
            const errorMsg = error?.message || 'Unknown error'
            const rowNum = i + index + 1
            console.error(`Error processing row ${rowNum}:`, errorMsg)
            throw new Error(`Row ${rowNum}: ${errorMsg}`)
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.action === 'created') imported++
          else if (result.value.action === 'updated') updated++
          else if (result.value.action === 'skipped') skipped++
        } else {
          errors++
          const errorMsg = result.reason?.message || 'Unknown error'
          errorsList.push(errorMsg)
        }
      }

      console.log(`Batch completed: ${imported} created, ${updated} updated, ${skipped} skipped, ${errors} errors`)
    }

    const summary = {
      success: true,
      total: players.length,
      imported,
      updated,
      skipped,
      errors,
      errorsList: errorsList.slice(0, 20),
      skippedList: skippedList.slice(0, 20)
    }

    console.log(`Import completed:`, summary)

    return new Response(
      JSON.stringify(summary),
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
function toNumber(value: any, defaultValue: number | null = 0): number | null {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }
  if (typeof value === 'number') {
    return isNaN(value) ? defaultValue : value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return defaultValue
    const num = parseInt(trimmed)
    return isNaN(num) ? defaultValue : num
  }
  return defaultValue
}

// Helper: Estrae informazioni dal campo "Giocatori" (formato: "116\nPT\nNome Giocatore\nStile")
function parseGiocatoriField(giocatoriStr: string | null | undefined) {
  if (!giocatoriStr || typeof giocatoriStr !== 'string') {
    return { rating: null, cardType: null, name: null, style: null }
  }
  
  const trimmed = giocatoriStr.trim()
  if (trimmed === '') {
    return { rating: null, cardType: null, name: null, style: null }
  }
  
  // Supporta sia \n che \r\n come separatori
  const parts = trimmed.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0)
  
  if (parts.length === 0) {
    return { rating: null, cardType: null, name: null, style: null }
  }
  
  return {
    rating: parts.length > 0 ? toNumber(parts[0]) : null,
    cardType: parts.length > 1 ? parts[1] : null,
    name: parts.length > 2 ? parts.slice(2, -1).join(' ').trim() || (parts.length > 2 ? parts[2] : null) : null,
    style: parts.length > 3 ? parts[parts.length - 1] : null
  }
}

// Helper: Determina posizione dal cardType e stile
function inferPosition(cardType: string | null, style: string | null): string {
  if (!cardType) return 'CF'
  
  const cardTypeMap: { [key: string]: string } = {
    'PT': 'GK',
    'P': 'CF',
    'ESA': 'LWF',
    'EDA': 'RWF',
    'TRQ': 'AMF',
    'CDC': 'DMF',
    'CC': 'CMF',
    'ES': 'LMF',
    'ED': 'RMF',
    'DC': 'CB',
    'TS': 'LB',
    'TD': 'RB',
    'AT': 'SS'
  }
  
  return cardTypeMap[cardType.toUpperCase()] || 'CF'
}

// Mappa dati giocatore al formato database
function mapPlayerData(jsonPlayer: any, rowNum?: number) {
  try {
    // Estrai informazioni dal campo "Giocatori"
    const giocatoriInfo = parseGiocatoriField(jsonPlayer.Giocatori || jsonPlayer['Giocatori'] || jsonPlayer.giocatori || '')
    
    // Usa il nome estratto o fallback su altri campi (più robusto)
    let playerName = giocatoriInfo.name || 
                     jsonPlayer.name || 
                     jsonPlayer.player_name || 
                     jsonPlayer.nome || 
                     jsonPlayer.Name ||
                     jsonPlayer.PlayerName ||
                     ''
    
    // Cleanup nome
    playerName = (playerName || '').toString().trim()
    
    // Determina card_type
    const cardType = giocatoriInfo.cardType || 
                     jsonPlayer.card_type || 
                     jsonPlayer.tipo_carta || 
                     jsonPlayer.CardType ||
                     'Standard'
    
    // Determina posizione
    const position = jsonPlayer.position || 
                     jsonPlayer.pos || 
                     jsonPlayer.posizione || 
                     jsonPlayer.Position ||
                     inferPosition(cardType, giocatoriInfo.style || null)
    
    // Converti valori numerici
    const overallRating = toNumber(jsonPlayer.Complessivamente || jsonPlayer.overall_rating || jsonPlayer.OverallRating || giocatoriInfo.rating)
    const potential = toNumber(jsonPlayer.Potenziale || jsonPlayer.potential || jsonPlayer.potential_max || jsonPlayer.Potential)
    const height = toNumber(jsonPlayer.Altezza || jsonPlayer.height || jsonPlayer.altezza || jsonPlayer.Height)
    const weight = toNumber(jsonPlayer.Peso || jsonPlayer.weight || jsonPlayer.peso || jsonPlayer.Weight)
    const age = toNumber(jsonPlayer.Età || jsonPlayer.age || jsonPlayer.eta || jsonPlayer.Age)
    const levelCap = toNumber(jsonPlayer['Livello Massimo'] || jsonPlayer.level_cap || jsonPlayer.livello_massimo || jsonPlayer.LevelCap)
    
    // Stats attacco (italiano -> inglese)
    const attacking = {
      offensiveAwareness: toNumber(jsonPlayer['Comportamento offensivo'] || jsonPlayer.attacking?.offensiveAwareness || jsonPlayer.OffensiveAwareness),
      ballControl: toNumber(jsonPlayer['Controllo palla'] || jsonPlayer.attacking?.ballControl || jsonPlayer.BallControl),
      dribbling: toNumber(jsonPlayer['Vel. dribbling'] || jsonPlayer['Dribbling'] || jsonPlayer.attacking?.dribbling || jsonPlayer.Dribbling),
      tightPossession: toNumber(jsonPlayer['Possesso stretto'] || jsonPlayer.attacking?.tightPossession || jsonPlayer.TightPossession),
      lowPass: toNumber(jsonPlayer['Passaggio rasoterra'] || jsonPlayer.attacking?.lowPass || jsonPlayer.LowPass),
      loftedPass: toNumber(jsonPlayer['Passaggio alto'] || jsonPlayer.attacking?.loftedPass || jsonPlayer.LoftedPass),
      finishing: toNumber(jsonPlayer.Finalizzazione || jsonPlayer.attacking?.finishing || jsonPlayer.Finishing),
      heading: toNumber(jsonPlayer['Colpo di testa'] || jsonPlayer.attacking?.heading || jsonPlayer.Heading),
      placeKicking: toNumber(jsonPlayer['Calci piazzati'] || jsonPlayer.attacking?.placeKicking || jsonPlayer.PlaceKicking),
      curl: toNumber(jsonPlayer['Tiro a giro'] || jsonPlayer.attacking?.curl || jsonPlayer.Curl)
    }
    
    // Stats difesa (italiano -> inglese)
    const defending = {
      defensiveAwareness: toNumber(jsonPlayer['Comportamento difensivo'] || jsonPlayer.defending?.defensiveAwareness || jsonPlayer.DefensiveAwareness),
      defensiveEngagement: toNumber(jsonPlayer['Coinvolgimento difensivo'] || jsonPlayer.defending?.defensiveEngagement || jsonPlayer.DefensiveEngagement),
      tackling: toNumber(jsonPlayer.Contrasto || jsonPlayer.defending?.tackling || jsonPlayer.Tackling),
      aggression: toNumber(jsonPlayer.Aggressività || jsonPlayer.defending?.aggression || jsonPlayer.Aggression),
      goalkeeping: toNumber(jsonPlayer.Portieri || jsonPlayer.defending?.goalkeeping || jsonPlayer.Goalkeeping),
      gkCatching: toNumber(jsonPlayer['Presa PT'] || jsonPlayer.defending?.gkCatching || jsonPlayer.GkCatching),
      gkParrying: toNumber(jsonPlayer['Parata PT'] || jsonPlayer.defending?.gkParrying || jsonPlayer.GkParrying),
      gkReflexes: toNumber(jsonPlayer['Riflessi PT'] || jsonPlayer.defending?.gkReflexes || jsonPlayer.GkReflexes),
      gkReach: toNumber(jsonPlayer['Estensione PT'] || jsonPlayer.defending?.gkReach || jsonPlayer.GkReach)
    }
    
    // Stats fisiche (italiano -> inglese)
    const athleticism = {
      speed: toNumber(jsonPlayer.Velocità || jsonPlayer.athleticism?.speed || jsonPlayer.Speed),
      acceleration: toNumber(jsonPlayer.Accelerazione || jsonPlayer.athleticism?.acceleration || jsonPlayer.Acceleration),
      kickingPower: toNumber(jsonPlayer['Potenza di tiro'] || jsonPlayer.athleticism?.kickingPower || jsonPlayer.KickingPower),
      jump: toNumber(jsonPlayer.Elevazione || jsonPlayer.athleticism?.jump || jsonPlayer.Jump),
      physicalContact: toNumber(jsonPlayer['Contatto fisico'] || jsonPlayer.athleticism?.physicalContact || jsonPlayer.PhysicalContact),
      balance: toNumber(jsonPlayer.Equilibrio || jsonPlayer.athleticism?.balance || jsonPlayer.Balance),
      stamina: toNumber(jsonPlayer.Resistenza || jsonPlayer.athleticism?.stamina || jsonPlayer.Stamina),
      weakFootUsage: toNumber(jsonPlayer.weak_foot_usage || jsonPlayer.athleticism?.weakFootUsage, 4),
      weakFootAccuracy: toNumber(jsonPlayer.weak_foot_accuracy || jsonPlayer.athleticism?.weakFootAccuracy, 4),
      form: toNumber(jsonPlayer.form || jsonPlayer.Condizione || jsonPlayer.condition || jsonPlayer.athleticism?.form, 8),
      injuryResistance: toNumber(jsonPlayer.injury_resistance || jsonPlayer.athleticism?.injuryResistance, 2)
    }
    
    return {
      player_name: playerName,
      position: position || 'CF',
      height: height,
      weight: weight,
      age: age,
      nationality: (jsonPlayer['Nazionalità...'] || jsonPlayer.nationality || jsonPlayer.nazionalita || jsonPlayer.Nationality || '').toString().trim(),
      club_name: (jsonPlayer.ClubName || jsonPlayer.club || jsonPlayer.club_name || jsonPlayer.Club || '').toString().trim(),
      card_type: cardType || 'Standard',
      era: (jsonPlayer.era || jsonPlayer.Era || '').toString().trim(),
      team: (jsonPlayer.team || jsonPlayer.Team || '').toString().trim(),
      potential_max: potential,
      form: (jsonPlayer.Condizione || jsonPlayer.condition || jsonPlayer.form || jsonPlayer.Form || 'B').toString().trim().substring(0, 1),
      
      base_stats: {
        overall_rating: overallRating || 
                       (attacking.offensiveAwareness && attacking.offensiveAwareness > 0 ? 
                        Math.round((attacking.offensiveAwareness + attacking.ballControl + attacking.finishing) / 3) : 0),
        attacking: attacking,
        defending: defending,
        athleticism: athleticism
      },
      
      skills: Array.isArray(jsonPlayer.skills) ? jsonPlayer.skills : 
              typeof jsonPlayer.skills === 'string' ? jsonPlayer.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      com_skills: Array.isArray(jsonPlayer.com_skills) ? jsonPlayer.com_skills :
                  Array.isArray(jsonPlayer.comSkills) ? jsonPlayer.comSkills :
                  typeof jsonPlayer.com_skills === 'string' ? jsonPlayer.com_skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      
      metadata: {
        preferred_foot: (jsonPlayer.preferred_foot || jsonPlayer.piede || jsonPlayer.PreferredFoot || 'right').toString().trim(),
        konami_id: jsonPlayer.konami_id || jsonPlayer.id || jsonPlayer.KonamiId || null,
        efootballhub_id: jsonPlayer.efootballhub_id || jsonPlayer.EfootballHubId || null,
        style: giocatoriInfo.style || null,
        level_cap: levelCap,
        cost: toNumber(jsonPlayer.Costo || jsonPlayer.Cost)
      },
      
      source: 'json_import'
    }
  } catch (error) {
    console.error(`Error mapping player data at row ${rowNum}:`, error)
    throw error
  }
}
