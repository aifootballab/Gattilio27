// @ts-nocheck
// Supabase Edge Function: WebSocket Proxy per OpenAI Realtime API
// Questo proxy gestisce l'autenticazione lato server e fa da bridge tra client e OpenAI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verifica che sia una richiesta WebSocket upgrade
    const upgradeHeader = req.headers.get('upgrade')
    if (upgradeHeader?.toLowerCase() !== 'websocket') {
      return new Response(
        JSON.stringify({ error: 'This endpoint requires WebSocket upgrade' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Ottieni API key da environment (sicura, lato server)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured in Supabase secrets' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Estrai model dalla query string (default: gpt-realtime)
    const url = new URL(req.url)
    const model = url.searchParams.get('model') || 'gpt-realtime'

    // Crea connessione WebSocket a OpenAI Realtime API
    // NOTA: Deno WebSocket client NON supporta header personalizzati
    // Dobbiamo usare api_key come query parameter (formato supportato da OpenAI)
    const openaiWsUrl = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}&api_key=${encodeURIComponent(openaiApiKey)}`
    
    // Deno WebSocket client (senza header, usa api_key in URL)
    const openaiWs = new WebSocket(openaiWsUrl)

    // Upgrade la richiesta HTTP a WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req)

    // Bridge: Client <-> OpenAI
    // Client -> OpenAI
    socket.onmessage = (event) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(event.data)
      }
    }

    // OpenAI -> Client
    openaiWs.onmessage = (event) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data)
      }
    }

    // Gestisci errori e chiusure
    socket.onerror = (error) => {
      console.error('Client WebSocket error:', error)
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close()
      }
    }

    openaiWs.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error)
      if (socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }

    socket.onclose = () => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close()
      }
    }

    openaiWs.onclose = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }

    // Attendi che OpenAI WebSocket si connetta
    openaiWs.onopen = () => {
      console.log('✅ Proxy connected to OpenAI Realtime API')
    }

    return response

  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
