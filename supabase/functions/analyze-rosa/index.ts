// @ts-nocheck
// Supabase Edge Function: Analizza Rosa e Genera Suggerimenti
// Analizza squadra e genera coaching suggestions
// Questo file usa Deno runtime, non Node.js - TypeScript validation disabilitata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRosaRequest {
  rosa_id: string
  user_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rosa_id, user_id }: AnalyzeRosaRequest = await req.json()

    if (!rosa_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: rosa_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ottieni rosa con giocatori
    const { data: rosa, error: rosaError } = await supabase
      .from('user_rosa')
      .select(`
        *,
        player_builds:player_build_ids (
          *,
          players_base:player_base_id (
            *
          )
        )
      `)
      .eq('id', rosa_id)
      .eq('user_id', user_id)
      .single()

    if (rosaError || !rosa) {
      throw new Error(`Rosa non trovata: ${rosaError?.message}`)
    }

    // Analizza squadra
    const analysis = analyzeSquad(rosa)

    // Aggiorna rosa con analisi
    await supabase
      .from('user_rosa')
      .update({
        squad_analysis: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', rosa_id)

    // Genera suggerimenti coaching
    const suggestions = generateCoachingSuggestions(rosa, analysis)

    // Salva suggerimenti
    if (suggestions.length > 0) {
      const suggestionsToInsert = suggestions.map(s => ({
        rosa_id: rosa_id,
        suggestion_type: s.type,
        title: s.title,
        description: s.description,
        reasoning: s.reasoning,
        priority: s.priority,
        metadata: s.metadata || {}
      }))

      await supabase
        .from('coaching_suggestions')
        .insert(suggestionsToInsert)
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        suggestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error analyzing rosa:', error)
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

// Helper: Analizza squadra
function analyzeSquad(rosa: any): any {
  const players = rosa.player_builds || []
  
  if (players.length === 0) {
    return {
      strengths: [],
      weaknesses: ['Squadra vuota'],
      recommended_formations: [],
      player_synergies: [],
      tactical_suggestions: []
    }
  }

  // Analisi base
  const positions = players.map(p => p.players_base?.position).filter(Boolean)
  const ratings = players.map(p => p.final_overall_rating || 0).filter(r => r > 0)
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

  // Identifica punti di forza
  const strengths: string[] = []
  if (avgRating >= 90) strengths.push('Squadra di alto livello')
  if (positions.filter(p => ['CF', 'SS', 'LWF', 'RWF'].includes(p)).length >= 2) {
    strengths.push('Attacco ben fornito')
  }
  if (positions.filter(p => ['CB', 'LB', 'RB'].includes(p)).length >= 3) {
    strengths.push('Difesa solida')
  }

  // Identifica debolezze
  const weaknesses: string[] = []
  if (positions.filter(p => p === 'GK').length === 0) weaknesses.push('Manca portiere')
  if (positions.filter(p => ['DMF', 'CMF'].includes(p)).length === 0) {
    weaknesses.push('Centrocampo debole')
  }
  if (players.length < 11) weaknesses.push(`Solo ${players.length} giocatori (servono 11)`)

  // Formazioni consigliate
  const recommended_formations = suggestFormations(positions)

  return {
    strengths,
    weaknesses,
    recommended_formations,
    player_synergies: [],
    tactical_suggestions: [],
    avg_rating: Math.round(avgRating),
    player_count: players.length
  }
}

// Helper: Suggerisci formazioni
function suggestFormations(positions: string[]): string[] {
  const formations: string[] = []
  
  const hasGK = positions.includes('GK')
  const hasCB = positions.filter(p => p === 'CB').length >= 2
  const hasCMF = positions.filter(p => ['CMF', 'DMF', 'AMF'].includes(p)).length >= 2
  const hasCF = positions.filter(p => ['CF', 'SS'].includes(p)).length >= 1

  if (hasGK && hasCB && hasCMF && hasCF) {
    if (positions.filter(p => p === 'CB').length >= 3) {
      formations.push('3-5-2', '3-4-3')
    } else {
      formations.push('4-3-3', '4-4-2', '4-2-3-1')
    }
  }

  return formations.length > 0 ? formations : ['4-3-3']
}

// Helper: Genera suggerimenti coaching
function generateCoachingSuggestions(rosa: any, analysis: any): any[] {
  const suggestions: any[] = []

  // Suggerimento: Completa squadra
  if (rosa.player_build_ids.length < 11) {
    suggestions.push({
      type: 'formation_change',
      title: 'Completa la tua squadra',
      description: `Hai ${rosa.player_build_ids.length} giocatori. Aggiungi ${11 - rosa.player_build_ids.length} giocatori per completare la formazione.`,
      reasoning: 'Una squadra completa permette maggiore flessibilità tattica',
      priority: 9,
      metadata: { missing_players: 11 - rosa.player_build_ids.length }
    })
  }

  // Suggerimento: Formazione consigliata
  if (analysis.recommended_formations.length > 0) {
    suggestions.push({
      type: 'formation_change',
      title: `Prova la formazione ${analysis.recommended_formations[0]}`,
      description: `Questa formazione si adatta bene ai giocatori che hai in rosa.`,
      reasoning: `I tuoi giocatori sono ottimizzati per questa formazione`,
      priority: 7,
      metadata: { formation: analysis.recommended_formations[0] }
    })
  }

  // Suggerimento: Punti deboli
  if (analysis.weaknesses.length > 0) {
    suggestions.push({
      type: 'player_substitution',
      title: 'Rafforza le aree deboli',
      description: analysis.weaknesses.join(', '),
      reasoning: 'Migliorare queste aree aumenterà le prestazioni della squadra',
      priority: 8,
      metadata: { weaknesses: analysis.weaknesses }
    })
  }

  return suggestions
}
