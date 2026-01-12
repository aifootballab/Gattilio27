// @ts-nocheck
// Supabase Edge Function: Scrape Managers from efootballhub.net
// Scraping allenatori da efootballhub.net per popolare tabella managers

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface ScrapeManagersRequest {
  manager_name?: string
  batch_size?: number
  test_mode?: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { manager_name, batch_size = 10, test_mode = false }: ScrapeManagersRequest = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Scraping managers from efootballhub.net${manager_name ? ` for: ${manager_name}` : ' (batch mode)'}`)

    // Test mode: return structure without actual scraping
    if (test_mode) {
      return new Response(
        JSON.stringify({
          success: true,
          test_mode: true,
          message: 'Test mode - structure ready for scraping',
          expected_structure: {
            manager_name: 'string',
            efootballhub_id: 'string',
            overall_rating: 'number',
            preferred_formation: 'string',
            tactics: {
              defensive_line: 'string',
              compactness: 'string',
              build_up: 'string',
              attacking_area: 'string',
              positioning: 'string',
              support_range: 'number',
              compactness_attacking: 'number',
              compactness_defending: 'number',
              number_of_players_in_box: 'number',
              corner_kicks: 'string',
              free_kicks: 'string'
            },
            skills: ['array of strings'],
            team_playing_styles: ['array of style names'],
            metadata: {}
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Real scraping implementation
    // Usa stesso pattern del test-efootballhub che ha funzionato per players
    // Pattern: https://efootballhub.net/efootball23/search/players -> https://efootballhub.net/efootball23/search/managers
    
    // Prova URL possibili per managers (seguendo pattern players)
    const possibleURLs = [
      'https://efootballhub.net/efootball23/search/managers',
      'https://efootballhub.net/efootball23/managers',
      'https://efootballhub.net/managers'
    ]
    
    let html = ''
    let baseURL = possibleURLs[0]
    let response = null
    
    // Prova il primo URL (più probabile, seguendo pattern players)
    console.log(`Fetching managers from: ${baseURL}`)
    
    try {
      response = await fetch(baseURL, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://efootballhub.net/',
        }
      })

      if (response.ok) {
        html = await response.text()
        console.log(`Fetched HTML from ${baseURL} (length: ${html.length})`)
      } else {
        // Se 404, prova URL alternativi
        console.log(`${baseURL} returned ${response.status}, trying alternatives...`)
        for (let i = 1; i < possibleURLs.length; i++) {
          const altURL = possibleURLs[i]
          console.log(`Trying alternative URL: ${altURL}`)
          const altResponse = await fetch(altURL, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
              'Referer': 'https://efootballhub.net/',
            }
          })
          if (altResponse.ok) {
            html = await altResponse.text()
            baseURL = altURL
            response = altResponse
            console.log(`Successfully fetched from ${altURL} (length: ${html.length})`)
            break
          }
        }
      }
    } catch (error) {
      console.error('Error fetching managers:', error)
    }

    if (!html || !response || !response.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Managers page not accessible (404 or error). URL pattern may be different.',
          attempted_urls: possibleURLs,
          scraped: 0,
          saved: 0,
          errors: [`No accessible URL found. Tried: ${possibleURLs.join(', ')}`]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse HTML and extract managers
    const parsedManagers = parseManagersHTML(html, manager_name)

    if (parsedManagers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No managers found (HTML parsing not yet implemented)',
          scraped: 0,
          saved: 0,
          errors: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get team_playing_styles for mapping
    const { data: styles, error: stylesError } = await supabase
      .from('team_playing_styles')
      .select('id, name')

    if (stylesError) {
      console.warn('Error fetching team_playing_styles:', stylesError)
    }

    const styleMap = new Map((styles || []).map(s => [s.name.toLowerCase(), s.id]))

    // Save managers to database
    let saved = 0
    let updated = 0
    const errors: string[] = []

    for (const managerData of parsedManagers.slice(0, batch_size)) {
      try {
        // Check if manager exists
        const { data: existing, error: searchError } = await supabase
          .from('managers')
          .select('id')
          .or(`name.ilike.%${managerData.name}%,efootballhub_id.eq.${managerData.efootballhub_id || 'null'}`)
          .limit(1)
          .maybeSingle()

        if (searchError && searchError.code !== 'PGRST116') {
          throw searchError
        }

        const managerRecord = {
          name: managerData.name,
          efootballhub_id: managerData.efootballhub_id || null,
          overall_rating: managerData.overall_rating || null,
          preferred_formation: managerData.preferred_formation || null,
          tactics: managerData.tactics || {},
          skills: managerData.skills || [],
          metadata: managerData.metadata || {},
          source: 'efootballhub',
          updated_at: new Date().toISOString()
        }

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('managers')
            .update(managerRecord)
            .eq('id', existing.id)

          if (updateError) throw updateError
          updated++
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('managers')
            .insert(managerRecord)

          if (insertError) throw insertError
          saved++

          // Get the inserted manager ID for style competencies
          const { data: inserted, error: fetchError } = await supabase
            .from('managers')
            .select('id')
            .eq('name', managerData.name)
            .single()

          if (!fetchError && inserted && managerData.team_playing_styles) {
            // Create style competencies
            await createStyleCompetencies(
              supabase,
              inserted.id,
              managerData.team_playing_styles,
              styleMap
            )
          }
        }
      } catch (error) {
        console.error(`Error saving manager ${managerData.name}:`, error)
        errors.push(`${managerData.name}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scraped: parsedManagers.length,
        saved,
        updated,
        total: saved + updated,
        errors: errors.slice(0, 10) // Limit errors in response
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scrape managers error:', error)
    return new Response(
      JSON.stringify({
        success: false,
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

/**
 * Parse HTML and extract managers data
 * TODO: Implement based on actual efootballhub.net structure
 */
function parseManagersHTML(html: string, filterName?: string): any[] {
  // Placeholder - actual parsing needs to be implemented
  // This should:
  // 1. Parse HTML structure of efootballhub.net/managers
  // 2. Extract manager data (name, rating, formation, tactics, styles, skills)
  // 3. Filter by name if provided
  // 4. Return array of manager objects

  console.log('HTML parsing not yet implemented - returning empty array')
  return []
}

/**
 * Create style competencies for a manager
 */
async function createStyleCompetencies(
  supabase: any,
  managerId: string,
  styleNames: string[],
  styleMap: Map<string, string>
) {
  const competencies = []

  for (let i = 0; i < styleNames.length; i++) {
    const styleName = styleNames[i].toLowerCase()
    const styleId = styleMap.get(styleName)

    if (styleId) {
      competencies.push({
        manager_id: managerId,
        team_playing_style_id: styleId,
        competency_level: i === 0 ? 99 : Math.max(70, 99 - (i * 10)), // Primary style = 99, others decreasing
        is_primary: i === 0
      })
    }
  }

  if (competencies.length > 0) {
    const { error } = await supabase
      .from('manager_style_competency')
      .upsert(competencies, {
        onConflict: 'manager_id,team_playing_style_id'
      })

    if (error) {
      console.error('Error creating style competencies:', error)
    }
  }
}
