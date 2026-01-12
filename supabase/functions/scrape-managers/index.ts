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
    // Pattern: https://efootballhub.net/efootball23/search/players -> https://efootballhub.net/efootball23/search/coaches
    // NOTA: efootballhub.net usa "coaches" invece di "managers" nell'URL!
    
    // URL corretto per managers (testato: funziona!)
    const baseURL = 'https://efootballhub.net/efootball23/search/coaches'
    
    console.log(`Fetching managers (coaches) from: ${baseURL}`)
    
    const response = await fetch(baseURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://efootballhub.net/',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    console.log(`Fetched HTML from ${baseURL} (length: ${html.length})`)

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

    // Process in batches for better performance
    const batch = parsedManagers.slice(0, batch_size)
    console.log(`Processing ${batch.length} managers...`)

    for (const managerData of batch) {
      try {
        if (!managerData.name || managerData.name.trim() === '') {
          console.warn('Skipping manager with empty name')
          continue
        }

        // Check if manager exists (by name or efootballhub_id)
        let existing = null
        if (managerData.efootballhub_id) {
          const { data, error: searchError } = await supabase
            .from('managers')
            .select('id')
            .eq('efootballhub_id', managerData.efootballhub_id)
            .limit(1)
            .maybeSingle()

          if (searchError && searchError.code !== 'PGRST116') {
            throw searchError
          }
          existing = data
        }

        // If not found by ID, try by name
        if (!existing) {
          const { data, error: nameSearchError } = await supabase
            .from('managers')
            .select('id')
            .ilike('name', `%${managerData.name}%`)
            .limit(1)
            .maybeSingle()

          if (nameSearchError && nameSearchError.code !== 'PGRST116') {
            throw nameSearchError
          }
          existing = data
        }

        const managerRecord = {
          name: managerData.name.trim(),
          efootballhub_id: managerData.efootballhub_id || null,
          overall_rating: managerData.overall_rating || null,
          preferred_formation: managerData.preferred_formation || null,
          tactics: managerData.tactics || {},
          skills: managerData.skills || [],
          metadata: managerData.metadata || {},
          source: 'efootballhub',
          updated_at: new Date().toISOString()
        }

        let managerId: string

        if (existing) {
          // Update existing
          const { error: updateError } = await supabase
            .from('managers')
            .update(managerRecord)
            .eq('id', existing.id)

          if (updateError) throw updateError
          managerId = existing.id
          updated++
          console.log(`Updated manager: ${managerData.name}`)
        } else {
          // Insert new
          const { data: inserted, error: insertError } = await supabase
            .from('managers')
            .insert(managerRecord)
            .select('id')
            .single()

          if (insertError) throw insertError
          managerId = inserted.id
          saved++
          console.log(`Inserted manager: ${managerData.name}`)
        }

        // Create/update style competencies if styles provided
        if (managerId && managerData.team_playing_styles && managerData.team_playing_styles.length > 0) {
          await createStyleCompetencies(
            supabase,
            managerId,
            managerData.team_playing_styles,
            styleMap
          )
        }
      } catch (error) {
        console.error(`Error saving manager ${managerData?.name || 'Unknown'}:`, error)
        errors.push(`${managerData?.name || 'Unknown'}: ${error.message}`)
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
 * Parse HTML and extract managers data from efootballhub.net/coaches
 * Estrae dati managers dalla pagina HTML usando regex/pattern matching
 */
function parseManagersHTML(html: string, filterName?: string): any[] {
  const managers: any[] = []
  
  try {
    // Rimuovi spazi e newline per facilitare regex
    const cleanHtml = html.replace(/\s+/g, ' ').toLowerCase()
    
    // Pattern per trovare card/entry di managers
    // efootballhub.net probabilmente ha una struttura con div/card per ogni manager
    // Cerca pattern comuni come link, card, o tabelle
    
    // Pattern 1: Cerca link a dettagli manager (es: /coaches/{id} o /manager/{name})
    // Usa new RegExp per evitare problemi con escape
    const managerLinkPattern = new RegExp('href=["\']([^"\']*\\/coaches?\\/[^"\']*|\\/[^"\']*manager[^"\']*)["\']', 'gi')
    const managerLinks = Array.from(html.matchAll(managerLinkPattern))
    
    // Se troviamo link managers, processiamo quelli
    if (managerLinks.length > 0) {
      // Estrai ID/nome da ogni link
      for (const link of managerLinks.slice(0, 50)) { // Limita a 50 per performance
        const href = link[1] || link[0] || ''
        const managerId = extractManagerId(href)
        
        if (managerId) {
          // Cerca dati manager nel contesto del link
          const contextStart = Math.max(0, link.index! - 500)
          const contextEnd = Math.min(html.length, link.index! + 500)
          const context = html.substring(contextStart, contextEnd)
          
          const managerData = extractManagerFromContext(context, managerId, filterName)
          if (managerData) {
            managers.push(managerData)
          }
        }
      }
    } else {
      // Fallback: cerca pattern alternativi nell'HTML
      // Cerca tabelle o liste di managers
      const tablePattern = /<table[^>]*>[\s\S]*?<\/table>/gi
      const tables = html.match(tablePattern)
      
      if (tables && tables.length > 0) {
        // Processa tabelle per estrarre managers
        for (const table of tables) {
          const tableManagers = extractManagersFromTable(table, filterName)
          managers.push(...tableManagers)
        }
      } else {
        // Ultimo fallback: cerca pattern generici di card/div con dati manager
        const cardPattern = /<div[^>]*(?:class|data-type)=["'][^"']*(?:manager|coach|card)[^"']*["'][^>]*>[\s\S]{0,2000}?<\/div>/gi
        const cards = html.match(cardPattern)
        
        if (cards && cards.length > 0) {
          for (const card of cards.slice(0, 50)) {
            const managerData = extractManagerFromCard(card, filterName)
            if (managerData) {
              managers.push(managerData)
            }
          }
        }
      }
    }
    
    // Rimuovi duplicati basati su nome o ID
    const uniqueManagers = removeDuplicates(managers)
    
    console.log(`Parsed ${uniqueManagers.length} managers from HTML`)
    
    return uniqueManagers
    
  } catch (error) {
    console.error('Error parsing HTML:', error)
    return []
  }
}

/**
 * Estrae ID manager da un link
 */
function extractManagerId(href: string): string | null {
  // Pattern: /coaches/123, /coaches/john-doe, /manager/456
  const idMatch = href.match(/\/(?:coaches?|manager)\/([^\/\?]+)/i)
  return idMatch ? idMatch[1] : null
}

/**
 * Estrae dati manager da un contesto HTML
 */
function extractManagerFromContext(context: string, managerId: string, filterName?: string): any | null {
  // Estrai nome
  const nameMatch = context.match(/<[^>]*>([A-Z][A-Za-z\s\.]+(?:[A-Z][A-Za-z\s\.]+)*)<\/[^>]*>/)
  const name = nameMatch ? nameMatch[1].trim() : null
  
  if (!name) return null
  
  // Filtra per nome se richiesto
  if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) {
    return null
  }
  
  // Estrai rating
  const ratingMatch = context.match(/(\d{2,3})(?:\s*<\/[^>]*>)?[^<]*(?:rating|overall|ovr)/i)
  const rating = ratingMatch ? parseInt(ratingMatch[1]) : null
  
  // Estrai formazione
  const formationMatch = context.match(/(\d+-\d+(?:-\d+)*)/)
  const formation = formationMatch ? formationMatch[1] : null
  
  // Estrai stili di gioco
  const styles = extractStylesFromContext(context)
  
  // Estrai skills/tactics
  const skills = extractSkillsFromContext(context)
  const tactics = extractTacticsFromContext(context)
  
  return {
    name: name,
    efootballhub_id: managerId,
    overall_rating: rating,
    preferred_formation: formation,
    tactics: tactics,
    skills: skills,
    team_playing_styles: styles,
    metadata: {
      source_url: `https://efootballhub.net/efootball23/search/coaches`
    }
  }
}

/**
 * Estrae stili di gioco da un contesto HTML
 */
function extractStylesFromContext(context: string): string[] {
  const styles: string[] = []
  
  // Stili comuni efootball
  const commonStyles = [
    'possession game', 'long ball counter', 'out wide', 'long ball',
    'frontline pressure', 'all-out defence', 'possession', 'counter',
    'quick counter', 'tiki-taka', 'gegenpress', 'park the bus'
  ]
  
  const lowerContext = context.toLowerCase()
  for (const style of commonStyles) {
    if (lowerContext.includes(style)) {
      styles.push(style)
    }
  }
  
  return styles
}

/**
 * Estrae skills da un contesto HTML
 */
function extractSkillsFromContext(context: string): string[] {
  const skills: string[] = []
  
  // Skills comuni managers
  const commonSkills = [
    'attacking fullback', 'counter target', 'defensive line',
    'build up', 'compactness', 'support range'
  ]
  
  const lowerContext = context.toLowerCase()
  for (const skill of commonSkills) {
    if (lowerContext.includes(skill)) {
      skills.push(skill)
    }
  }
  
  return skills
}

/**
 * Estrae tactics da un contesto HTML
 */
function extractTacticsFromContext(context: string): any {
  const tactics: any = {}
  
  // Cerca pattern per tactics comuni
  const defensiveLineMatch = context.match(/defensive[^>]*line[^>]*>([^<]+)/i)
  if (defensiveLineMatch) tactics.defensive_line = defensiveLineMatch[1].trim()
  
  const compactnessMatch = context.match(/compactness[^>]*>(\d+)/i)
  if (compactnessMatch) tactics.compactness = parseInt(compactnessMatch[1])
  
  const buildUpMatch = context.match(/build[^>]*up[^>]*>([^<]+)/i)
  if (buildUpMatch) tactics.build_up = buildUpMatch[1].trim()
  
  const attackingAreaMatch = context.match(/attacking[^>]*area[^>]*>([^<]+)/i)
  if (attackingAreaMatch) tactics.attacking_area = attackingAreaMatch[1].trim()
  
  return tactics
}

/**
 * Estrae managers da una tabella HTML
 */
function extractManagersFromTable(tableHtml: string, filterName?: string): any[] {
  const managers: any[] = []
  
  // Cerca righe (<tr>)
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const rows = Array.from(tableHtml.matchAll(rowPattern))
  
  for (const row of rows) {
    const rowHtml = row[1]
    const managerData = extractManagerFromCard(rowHtml, filterName)
    if (managerData) {
      managers.push(managerData)
    }
  }
  
  return managers
}

/**
 * Estrae dati manager da una card/div HTML
 */
function extractManagerFromCard(cardHtml: string, filterName?: string): any | null {
  // Estrai nome (cerca in link, heading, o span/div con class specifiche)
  const namePatterns = [
    /<h[1-6][^>]*>([A-Z][A-Za-z\s\.]+(?:[A-Z][A-Za-z\s\.]+)*)<\/h[1-6]>/,
    /<a[^>]*>([A-Z][A-Za-z\s\.]+(?:[A-Z][A-Za-z\s\.]+)*)<\/a>/,
    /<[^>]*(?:name|title|manager)[^>]*>([A-Z][A-Za-z\s\.]+(?:[A-Z][A-Za-z\s\.]+)*)<\/[^>]*>/
  ]
  
  let name: string | null = null
  for (const pattern of namePatterns) {
    const match = cardHtml.match(pattern)
    if (match && match[1].length > 3) {
      name = match[1].trim()
      break
    }
  }
  
  if (!name) return null
  
  // Filtra per nome se richiesto
  if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) {
    return null
  }
  
  // Estrai altri dati
  const ratingMatch = cardHtml.match(/(\d{2,3})(?:\s*<\/[^>]*>)?[^<]*(?:rating|overall|ovr)/i)
  const rating = ratingMatch ? parseInt(ratingMatch[1]) : null
  
  const formationMatch = cardHtml.match(/(\d+-\d+(?:-\d+)*)/)
  const formation = formationMatch ? formationMatch[1] : null
  
  const styles = extractStylesFromContext(cardHtml)
  const skills = extractSkillsFromContext(cardHtml)
  const tactics = extractTacticsFromContext(cardHtml)
  
  // Genera ID fittizio se non trovato
  const managerId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  
  return {
    name: name,
    efootballhub_id: managerId,
    overall_rating: rating,
    preferred_formation: formation,
    tactics: tactics,
    skills: skills,
    team_playing_styles: styles,
    metadata: {
      source_url: `https://efootballhub.net/efootball23/search/coaches`
    }
  }
}

/**
 * Rimuove duplicati da array managers
 */
function removeDuplicates(managers: any[]): any[] {
  const seen = new Set<string>()
  const unique: any[] = []
  
  for (const manager of managers) {
    const key = manager.efootballhub_id || manager.name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(manager)
    }
  }
  
  return unique
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
