// @ts-nocheck
// Handler per Function Calls da GPT Realtime API
// Quando GPT chiama una funzione, questa Edge Function la esegue

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as functions from './functions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FunctionCallRequest {
  function_name: string
  arguments: any
  user_id: string
  session_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { function_name, arguments: args, user_id, session_id }: FunctionCallRequest = await req.json()

    if (!function_name || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: function_name, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Esegui funzione
    let result
    switch (function_name) {
      case 'save_player_to_supabase':
        result = await functions.savePlayerToSupabase(
          supabase,
          user_id,
          args.player_data,
          args.rosa_id
        )
        break

      case 'load_rosa':
        result = await functions.loadRosa(
          supabase,
          user_id,
          args.rosa_id
        )
        break

      case 'search_player':
        result = await functions.searchPlayer(
          supabase,
          args.query
        )
        break

      case 'update_rosa':
        result = await functions.updateRosa(
          supabase,
          user_id,
          args.rosa_id,
          args.player_build_ids
        )
        break

      case 'analyze_screenshot':
        result = await functions.analyzeScreenshot(
          supabase,
          user_id,
          args.image_url,
          args.image_type
        )
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown function: ${function_name}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error handling function call:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
