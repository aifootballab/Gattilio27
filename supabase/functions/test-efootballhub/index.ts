// @ts-nocheck
// Test Edge Function: Test scraping efootballhub.net
// Test semplice per verificare se lo scraping funziona

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, age, team } = await req.json().catch(() => ({ name: 'Gullit', age: null, team: null }))
    
    const playerName = name || 'Gullit'
    const playerAge = age || null
    const playerTeam = team || null

    console.log(`Testing efootballhub.net search for: ${playerName}${playerAge ? ` (${playerAge} anni)` : ''}${playerTeam ? ` - ${playerTeam}` : ''}`)

    // Test 1: Prova richiesta base alla pagina di ricerca
    const baseURL = 'https://efootballhub.net/efootball23/search/players'
    
    console.log('Test 1: Fetching base URL...')
    const response = await fetch(baseURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://efootballhub.net/',
      }
    })

    const status = response.status
    const contentType = response.headers.get('content-type') || ''
    const htmlLength = (await response.text()).length

    console.log(`Response: Status ${status}, Content-Type: ${contentType}, HTML length: ${htmlLength}`)

    // Test 2: Prova ricerca con query string
    const searchURL = `${baseURL}?q=${encodeURIComponent(playerName)}`
    console.log(`Test 2: Fetching search URL: ${searchURL}`)
    
    const searchResponse = await fetch(searchURL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://efootballhub.net/efootball23/search/players',
      }
    })

    const searchStatus = searchResponse.status
    const searchContentType = searchResponse.headers.get('content-type') || ''
    const searchHTML = await searchResponse.text()
    const searchHTMLLength = searchHTML.length

    console.log(`Search Response: Status ${searchStatus}, Content-Type: ${searchContentType}, HTML length: ${searchHTMLLength}`)

    // Test 3: Analizza HTML per trovare risultati
    let playerFound = false
    let playerCount = 0
    let sampleData = null

    // Cerca pattern comuni nei risultati
    const namePattern = new RegExp(playerName, 'i')
    if (namePattern.test(searchHTML)) {
      playerFound = true
      console.log(`Found player name "${playerName}" in HTML`)
    }

    // Conta occorrenze del nome (approssimativo)
    const matches = searchHTML.match(new RegExp(playerName, 'gi'))
    playerCount = matches ? matches.length : 0

    // Estrai sample HTML intorno al nome (primi 500 caratteri)
    const nameIndex = searchHTML.toLowerCase().indexOf(playerName.toLowerCase())
    if (nameIndex !== -1) {
      const start = Math.max(0, nameIndex - 200)
      const end = Math.min(searchHTML.length, nameIndex + 500)
      sampleData = searchHTML.substring(start, end).replace(/\s+/g, ' ').substring(0, 300)
    }

    // Test 4: Verifica se è HTML o JSON
    const isHTML = searchContentType.includes('text/html') || searchHTML.trim().startsWith('<!')
    const isJSON = searchContentType.includes('application/json') || (searchHTML.trim().startsWith('{') || searchHTML.trim().startsWith('['))

    // Test 5: Cerca indicatori di struttura (es: div, table, etc.)
    const hasDivStructure = searchHTML.includes('<div') || searchHTML.includes('</div>')
    const hasTableStructure = searchHTML.includes('<table') || searchHTML.includes('<tr>')
    const hasListStructure = searchHTML.includes('<ul>') || searchHTML.includes('<li>')

    const results = {
      success: true,
      tests: {
        baseURL: {
          status,
          contentType,
          htmlLength,
          accessible: status === 200
        },
        searchURL: {
          status: searchStatus,
          contentType: searchContentType,
          htmlLength: searchHTMLLength,
          accessible: searchStatus === 200
        },
        contentAnalysis: {
          isHTML,
          isJSON,
          hasDivStructure,
          hasTableStructure,
          hasListStructure
        },
        playerSearch: {
          playerName,
          playerAge,
          playerTeam,
          playerFound,
          playerCount,
          sampleData: sampleData ? sampleData.substring(0, 200) : null
        }
      },
      conclusion: {
        accessible: status === 200 && searchStatus === 200,
        canScrape: status === 200 && searchStatus === 200 && isHTML,
        playerFound: playerFound,
        recommendation: status === 200 && searchStatus === 200 && isHTML && playerFound
          ? 'Scraping possibile - HTML accessibile e player trovato'
          : status === 200 && searchStatus === 200 && isHTML
          ? 'Scraping possibile - HTML accessibile ma player non trovato (verificare query)'
          : status === 200 && searchStatus === 200
          ? 'Scraping non raccomandato - Response non è HTML standard'
          : 'Scraping non possibile - Accesso negato o errore'
      }
    }

    return new Response(
      JSON.stringify(results, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Test error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }, null, 2),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
