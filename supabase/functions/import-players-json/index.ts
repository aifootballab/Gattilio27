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

// Mappa dati giocatore al formato database
function mapPlayerData(jsonPlayer: any) {
  const attacking = jsonPlayer.attacking || jsonPlayer.attacco || {}
  const defending = jsonPlayer.defending || jsonPlayer.difesa || {}
  const athleticism = jsonPlayer.athleticism || jsonPlayer.fisico || {}

  return {
    player_name: jsonPlayer.name || jsonPlayer.player_name || jsonPlayer.nome || jsonPlayer.Name || '',
    position: jsonPlayer.position || jsonPlayer.pos || jsonPlayer.posizione || 'CF',
    height: jsonPlayer.height || jsonPlayer.altezza || null,
    weight: jsonPlayer.weight || jsonPlayer.peso || null,
    age: jsonPlayer.age || jsonPlayer.eta || null,
    nationality: jsonPlayer.nationality || jsonPlayer.nazionalita || jsonPlayer.country || '',
    club_name: jsonPlayer.club || jsonPlayer.club_name || jsonPlayer.squadra || '',
    card_type: jsonPlayer.card_type || jsonPlayer.tipo_carta || 'Standard',
    era: jsonPlayer.era || '',
    team: jsonPlayer.team || jsonPlayer.squadra || '',
    
    base_stats: {
      overall_rating: jsonPlayer.overall_rating || jsonPlayer.rating || jsonPlayer.overall || 
                     (attacking && Object.keys(attacking).length > 0 ? 
                      Math.round(Object.values(attacking).reduce((a: number, b: number) => a + b, 0) / 10) : 0),
      attacking: {
        offensiveAwareness: attacking.offensive_awareness || attacking.offensiveAwareness || attacking.OffensiveAwareness || 0,
        ballControl: attacking.ball_control || attacking.ballControl || attacking.BallControl || 0,
        dribbling: attacking.dribbling || attacking.Dribbling || 0,
        tightPossession: attacking.tight_possession || attacking.tightPossession || attacking.TightPossession || 0,
        lowPass: attacking.low_pass || attacking.lowPass || attacking.LowPass || 0,
        loftedPass: attacking.lofted_pass || attacking.loftedPass || attacking.LoftedPass || 0,
        finishing: attacking.finishing || attacking.Finishing || 0,
        heading: attacking.heading || attacking.Heading || 0,
        placeKicking: attacking.place_kicking || attacking.placeKicking || attacking.PlaceKicking || 0,
        curl: attacking.curl || attacking.Curl || 0
      },
      defending: {
        defensiveAwareness: defending.defensive_awareness || defending.defensiveAwareness || defending.DefensiveAwareness || 0,
        defensiveEngagement: defending.defensive_engagement || defending.defensiveEngagement || defending.DefensiveEngagement || 0,
        tackling: defending.tackling || defending.Tackling || 0,
        aggression: defending.aggression || defending.Aggression || 0,
        goalkeeping: defending.goalkeeping || defending.gk || defending.Goalkeeping || 0,
        gkCatching: defending.gk_catching || defending.gkCatching || defending.GkCatching || 0,
        gkParrying: defending.gk_parrying || defending.gkParrying || defending.GkParrying || 0,
        gkReflexes: defending.gk_reflexes || defending.gkReflexes || defending.GkReflexes || 0,
        gkReach: defending.gk_reach || defending.gkReach || defending.GkReach || 0
      },
      athleticism: {
        speed: athleticism.speed || athleticism.velocita || athleticism.Speed || 0,
        acceleration: athleticism.acceleration || athleticism.accelerazione || athleticism.Acceleration || 0,
        kickingPower: athleticism.kicking_power || athleticism.kickingPower || athleticism.KickingPower || 0,
        jump: athleticism.jump || athleticism.salto || athleticism.Jump || 0,
        physicalContact: athleticism.physical_contact || athleticism.physicalContact || athleticism.PhysicalContact || 0,
        balance: athleticism.balance || athleticism.equilibrio || athleticism.Balance || 0,
        stamina: athleticism.stamina || athleticism.resistenza || athleticism.Stamina || 0,
        weakFootUsage: athleticism.weak_foot_usage || athleticism.weakFootUsage || 4,
        weakFootAccuracy: athleticism.weak_foot_accuracy || athleticism.weakFootAccuracy || 4,
        form: athleticism.form || athleticism.forma || 8,
        injuryResistance: athleticism.injury_resistance || athleticism.injuryResistance || 2
      }
    },
    
    skills: Array.isArray(jsonPlayer.skills) ? jsonPlayer.skills : 
            typeof jsonPlayer.skills === 'string' ? jsonPlayer.skills.split(',').map((s: string) => s.trim()) : [],
    com_skills: Array.isArray(jsonPlayer.com_skills) ? jsonPlayer.com_skills :
                Array.isArray(jsonPlayer.comSkills) ? jsonPlayer.comSkills :
                typeof jsonPlayer.com_skills === 'string' ? jsonPlayer.com_skills.split(',').map((s: string) => s.trim()) : [],
    
    metadata: {
      preferred_foot: jsonPlayer.preferred_foot || jsonPlayer.piede || 'right',
      konami_id: jsonPlayer.konami_id || jsonPlayer.id || null,
      efootballhub_id: jsonPlayer.efootballhub_id || null
    },
    
    source: 'json_import'
  }
}
