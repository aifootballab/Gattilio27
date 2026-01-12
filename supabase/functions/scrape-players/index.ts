// @ts-nocheck
// Supabase Edge Function: Scrape Players from efootballhub.net
// Scraping giocatori da efootballhub.net per ricerca e precompilazione

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface ScrapePlayersRequest {
  player_name?: string
  age?: number
  team?: string
  limit?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { player_name, age, team, limit = 20 }: ScrapePlayersRequest = await req.json()

    if (!player_name || !player_name.trim()) {
      return new Response(
        JSON.stringify({ error: 'player_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Scraping players from efootballhub.net for: ${player_name}${age ? ` (age: ${age})` : ''}${team ? ` - ${team}` : ''}`)

    // Costruisci URL ricerca
    const baseURL = 'https://efootballhub.net/efootball23/search/players'
    const params = new URLSearchParams()
    params.append('q', player_name.trim())
    if (age) params.append('age', age.toString())
    if (team) params.append('team', team.trim())
    
    const searchURL = `${baseURL}?${params.toString()}`
    console.log(`Fetching: ${searchURL}`)

    // Fetch HTML
    const response = await fetch(searchURL, {
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
    console.log(`HTML received: ${html.length} characters`)

    // Parse HTML e estrai players
    const players = parsePlayersHTML(html, player_name.trim(), limit)

    console.log(`Parsed ${players.length} players from HTML`)

    return new Response(
      JSON.stringify({
        success: true,
        players: players.slice(0, limit),
        count: players.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scrape players error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Parse HTML e estrae dati players
 */
function parsePlayersHTML(html: string, filterName?: string, limit: number = 20): any[] {
  const players: any[] = []
  
  try {
    // Rimuovi spazi e newline per facilitare regex
    const cleanHtml = html.replace(/\s+/g, ' ')
    
    // Pattern 1: Cerca link a dettagli player (es: /players/{id} o /player/{name})
    const playerLinkPattern = new RegExp('href=["\']([^"\']*\\/players?\\/[^"\']*)["\']', 'gi')
    const playerLinks = Array.from(html.matchAll(playerLinkPattern))
    
    // Se troviamo link players, processiamo quelli
    if (playerLinks.length > 0) {
      console.log(`Found ${playerLinks.length} player links`)
      // Estrai ID/nome da ogni link
      for (const link of playerLinks.slice(0, limit * 2)) { // Limita per performance
        const href = link[1] || link[0] || ''
        const playerId = extractPlayerId(href)
        
        if (playerId) {
          // Cerca dati player nel contesto del link
          const contextStart = Math.max(0, (link.index || 0) - 500)
          const contextEnd = Math.min(html.length, (link.index || 0) + 500)
          const context = html.substring(contextStart, contextEnd)
          
          const playerData = extractPlayerFromContext(context, playerId, filterName)
          if (playerData) {
            players.push(playerData)
          }
        }
      }
    } else {
      // Fallback: cerca pattern alternativi nell'HTML
      // Cerca tabelle o liste di players
      const tablePattern = /<table[^>]*>[\s\S]*?<\/table>/gi
      const tables = html.match(tablePattern)
      
      if (tables && tables.length > 0) {
        console.log(`Found ${tables.length} tables`)
        // Processa tabelle per estrarre players
        for (const table of tables) {
          const tablePlayers = extractPlayersFromTable(table, filterName)
          players.push(...tablePlayers)
        }
      } else {
        // Ultimo fallback: cerca pattern generici di card/div con dati player
        const cardPattern = /<div[^>]*(?:class|data-type)=["'][^"']*(?:player|card)[^"']*["'][^>]*>[\s\S]{0,2000}?<\/div>/gi
        const cards = html.match(cardPattern)
        
        if (cards && cards.length > 0) {
          console.log(`Found ${cards.length} player cards`)
          for (const card of cards.slice(0, limit * 2)) {
            const playerData = extractPlayerFromCard(card, filterName)
            if (playerData) {
              players.push(playerData)
            }
          }
        }
      }
    }
    
    // Rimuovi duplicati basati su nome
    const uniquePlayers = removeDuplicates(players)
    
    console.log(`Parsed ${uniquePlayers.length} unique players from HTML`)
    
    return uniquePlayers.slice(0, limit)
    
  } catch (error) {
    console.error('Error parsing HTML:', error)
    return []
  }
}

/**
 * Estrae ID player da un link
 */
function extractPlayerId(href: string): string | null {
  // Pattern: /players/123, /player/john-doe, /players/456
  const idMatch = href.match(/\/(?:players?|player)\/([^\/\?]+)/i)
  return idMatch ? idMatch[1] : null
}

/**
 * Estrae dati player da un contesto HTML
 */
function extractPlayerFromContext(context: string, playerId: string, filterName?: string): any | null {
  // Estrai nome
  const nameMatch = context.match(/<[^>]*>([A-Z][A-Za-z\s\.]+(?:[A-Z][A-Za-z\s\.]+)*)<\/[^>]*>/)
  const name = nameMatch ? nameMatch[1].trim() : null
  
  if (!name) return null
  
  // Filtra per nome se richiesto
  if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) {
    return null
  }
  
  // Estrai rating (pattern: 85, 90, etc.)
  const ratingMatch = context.match(/\b(8[0-9]|9[0-9])\b/)
  const rating = ratingMatch ? parseInt(ratingMatch[1]) : null
  
  // Estrai posizione (pattern: CF, AMF, etc.)
  const positionMatch = context.match(/\b(GK|CB|LB|RB|DMF|CMF|LMF|RMF|AMF|LWF|RWF|SS|CF)\b/)
  const position = positionMatch ? positionMatch[1] : 'CF'
  
  // Estrai età
  const ageMatch = context.match(/\b([1-4][0-9])\s*(?:anni|years|age)\b/i)
  const age = ageMatch ? parseInt(ageMatch[1]) : null
  
  // Estrai squadra
  const teamMatch = context.match(/(?:squadra|team|club)[:\s]+([A-Z][A-Za-z\s]+)/i)
  const team = teamMatch ? teamMatch[1].trim() : null
  
  return {
    player_name: name,
    efootballhub_id: playerId,
    overall_rating: rating,
    position: position,
    age: age,
    club_name: team,
    source: 'efootballhub_scrape',
    source_url: `https://efootballhub.net/efootball23/search/players`
  }
}

/**
 * Estrae players da una tabella HTML
 */
function extractPlayersFromTable(tableHtml: string, filterName?: string): any[] {
  const players: any[] = []
  
  // Cerca righe (<tr>)
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const rows = Array.from(tableHtml.matchAll(rowPattern))
  
  for (const row of rows) {
    const rowHtml = row[1]
    const playerData = extractPlayerFromCard(rowHtml, filterName)
    if (playerData) {
      players.push(playerData)
    }
  }
  
  return players
}

/**
 * Estrae player da una card/div HTML
 */
function extractPlayerFromCard(cardHtml: string, filterName?: string): any | null {
  // Estrai nome
  const nameMatch = cardHtml.match(/<[^>]*>([A-Z][A-Za-z\s\.]+(?:[A-Z][A-Za-z\s\.]+)*)<\/[^>]*>/)
  const name = nameMatch ? nameMatch[1].trim() : null
  
  if (!name) return null
  
  // Filtra per nome se richiesto
  if (filterName && !name.toLowerCase().includes(filterName.toLowerCase())) {
    return null
  }
  
  // Estrai rating
  const ratingMatch = cardHtml.match(/\b(8[0-9]|9[0-9])\b/)
  const rating = ratingMatch ? parseInt(ratingMatch[1]) : null
  
  // Estrai posizione
  const positionMatch = cardHtml.match(/\b(GK|CB|LB|RB|DMF|CMF|LMF|RMF|AMF|LWF|RWF|SS|CF)\b/)
  const position = positionMatch ? positionMatch[1] : 'CF'
  
  // Estrai età
  const ageMatch = cardHtml.match(/\b([1-4][0-9])\s*(?:anni|years|age)\b/i)
  const age = ageMatch ? parseInt(ageMatch[1]) : null
  
  // Estrai squadra
  const teamMatch = cardHtml.match(/(?:squadra|team|club)[:\s]+([A-Z][A-Za-z\s]+)/i)
  const team = teamMatch ? teamMatch[1].trim() : null
  
  return {
    player_name: name,
    overall_rating: rating,
    position: position,
    age: age,
    club_name: team,
    source: 'efootballhub_scrape'
  }
}

/**
 * Rimuove duplicati basati su nome
 */
function removeDuplicates(players: any[]): any[] {
  const seen = new Set<string>()
  const unique: any[] = []
  
  for (const player of players) {
    const key = player.player_name?.toLowerCase().trim()
    if (key && !seen.has(key)) {
      seen.add(key)
      unique.push(player)
    }
  }
  
  return unique
}
