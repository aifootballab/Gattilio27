// @ts-nocheck
// Test Edge Function: Test URL managers efootballhub.net
// Test semplice per verificare quale URL funziona per managers

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
    const possibleURLs = [
      'https://efootballhub.net/efootball23/search/managers',
      'https://efootballhub.net/efootball23/managers',
      'https://efootballhub.net/managers',
      'https://efootballhub.net/efootball2024/search/managers',
      'https://efootballhub.net/efootball2024/managers'
    ]

    const results = []

    for (const url of possibleURLs) {
      try {
        console.log(`Testing URL: ${url}`)
        
        const response = await fetch(url, {
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
        const html = await response.text()
        const htmlLength = html.length

        const isHTML = contentType.includes('text/html') || html.trim().startsWith('<!')
        const is404 = html.toLowerCase().includes('not found') || html.toLowerCase().includes('404')
        const hasManagers = html.toLowerCase().includes('manager') || html.toLowerCase().includes('allenator')

        results.push({
          url,
          status,
          contentType,
          htmlLength,
          accessible: status === 200,
          isHTML,
          is404,
          hasManagers,
          recommendation: status === 200 && isHTML && !is404 && hasManagers
            ? 'URL FUNZIONANTE - Usa questo URL!'
            : status === 200 && isHTML && !is404
            ? 'URL accessibile ma struttura non chiara'
            : status === 404 || is404
            ? '404 - URL non esiste'
            : status === 200
            ? 'URL accessibile ma non HTML standard'
            : 'Errore o accesso negato'
        })

        console.log(`Result for ${url}: Status ${status}, Accessible: ${status === 200}, HTML: ${isHTML}, Has Managers: ${hasManagers}`)

      } catch (error) {
        results.push({
          url,
          status: 0,
          error: error.message,
          accessible: false,
          recommendation: `Errore: ${error.message}`
        })
        console.error(`Error testing ${url}:`, error)
      }
    }

    const workingURLs = results.filter(r => r.accessible && r.isHTML && !r.is404 && r.hasManagers)
    const bestURL = workingURLs.length > 0 ? workingURLs[0].url : null

    return new Response(
      JSON.stringify({
        success: true,
        tested_urls: results,
        working_url: bestURL,
        recommendation: bestURL
          ? `Usa questo URL: ${bestURL}`
          : 'Nessun URL funzionante trovato. Potrebbe essere che la sezione managers non esiste o ha un URL diverso.',
        conclusion: {
          found_working_url: !!bestURL,
          total_tested: possibleURLs.length,
          working_count: workingURLs.length
        }
      }, null, 2),
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
