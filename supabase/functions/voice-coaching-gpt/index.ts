// @ts-nocheck
// Supabase Edge Function: Voice Coaching con GPT-Realtime
// Coach personale vocale - conversazione bidirezionale in tempo reale
// IMPORTANTE: Usa GPT-4o Realtime API per botta e risposta intelligente

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceCoachingRequest {
  user_id: string
  message?: string // Testo o trascrizione audio
  audio_base64?: string // Audio in base64 (opzionale)
  context?: {
    rosa?: any // Rosa utente
    match_stats?: any // Statistiche partita corrente
    opponent_formation?: any // Formazione avversaria
    user_profile?: any // Profilo utente (livello, preferenze)
    conversation_history?: any[] // Storia conversazione
  }
  mode?: 'text' | 'voice' // Modalità conversazione
}

/**
 * Enterprise-ready Edge Function per Voice Coaching con GPT-Realtime
 * 
 * Funzionalità:
 * - Conversazione bidirezionale (utente → AI → utente)
 * - Accesso a contesto completo (rosa, partite, statistiche)
 * - Personalizzazione basata su profilo utente
 * - Risposte contestuali e intelligenti
 * - Supporto per qualsiasi domanda su eFootball
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, message, audio_base64, context, mode = 'text' }: VoiceCoachingRequest = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Carica contesto utente se non fornito
    let userContext = context || {}
    
    if (!userContext.rosa) {
      // Carica rosa principale utente
      const { data: rosa } = await supabase
        .from('user_rosa')
        .select('*, players:player_builds(*)')
        .eq('user_id', user_id)
        .eq('is_main', true)
        .single()
      
      if (rosa) {
        userContext.rosa = rosa
      }
    }

    if (!userContext.user_profile) {
      // Carica profilo utente (livello coaching, preferenze)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user_id)
        .single()
      
      if (profile) {
        userContext.user_profile = profile
      }
    }

    // 2. Trascrivi audio se fornito (usando OpenAI Whisper o GPT-4o Realtime)
    let transcribedMessage = message
    
    if (audio_base64 && !message) {
      transcribedMessage = await transcribeAudio(audio_base64)
    }

    if (!transcribedMessage) {
      return new Response(
        JSON.stringify({ error: 'Missing message or audio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Costruisci prompt contestuale per GPT-Realtime
    const coachingPrompt = buildCoachingPrompt(transcribedMessage, userContext)

    // 4. Chiama GPT-4o Realtime API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const coachingResponse = await callGPTRealtimeCoaching(
      coachingPrompt,
      userContext,
      openaiApiKey
    )

    // 5. Salva conversazione in database (opzionale, per memoria)
    try {
      await supabase
        .from('voice_coaching_sessions')
        .insert({
          user_id,
          user_message: transcribedMessage,
          coaching_response: coachingResponse,
          context_snapshot: userContext,
          created_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error('Failed to log conversation:', logError)
      // Non bloccare la risposta se il log fallisce
    }

    // 6. Return risposta coaching
    return new Response(
      JSON.stringify({
        success: true,
        response: coachingResponse,
        transcribed_message: transcribedMessage,
        context_used: {
          has_rosa: !!userContext.rosa,
          has_match_stats: !!userContext.match_stats,
          has_opponent: !!userContext.opponent_formation
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in voice coaching:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: 'COACHING_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Trascrivi audio usando OpenAI Whisper API
 */
async function transcribeAudio(audioBase64: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  try {
    // Converti base64 a file
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
    
    const formData = new FormData()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'it') // Italiano

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`)
    }

    const data = await response.json()
    return data.text || ''

  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw new Error(`Audio transcription failed: ${error.message}`)
  }
}

/**
 * Costruisci prompt contestuale per coaching
 */
function buildCoachingPrompt(userMessage: string, context: any): string {
  const userLevel = context.user_profile?.coaching_level || 'intermedio'
  const hasRosa = !!context.rosa
  const hasMatch = !!context.match_stats
  const hasOpponent = !!context.opponent_formation

  let prompt = `Sei un coach personale esperto di eFootball. Il tuo obiettivo è aiutare l'utente a migliorare le sue performance, gestire la rosa, e vincere partite.

**PROFILO UTENTE:**
- Livello coaching: ${userLevel}
- Ha rosa configurata: ${hasRosa ? 'Sì' : 'No'}
- Sta giocando una partita: ${hasMatch ? 'Sì' : 'No'}
- Ha informazioni avversario: ${hasOpponent ? 'Sì' : 'No'}

**CONTESTO DISPONIBILE:**\n`

  if (context.rosa) {
    prompt += `- Rosa utente: ${context.rosa.players?.length || 0} giocatori\n`
    prompt += `- Formazione: ${context.rosa.formation || 'Non specificata'}\n`
    prompt += `- Forza complessiva: ${context.rosa.overall_strength || 'N/A'}\n`
  }

  if (context.match_stats) {
    prompt += `- Possesso: ${context.match_stats.possession || 'N/A'}%\n`
    prompt += `- Tiri: ${context.match_stats.shots || 'N/A'}\n`
    prompt += `- Risultato: ${context.match_stats.score || 'N/A'}\n`
  }

  if (context.opponent_formation) {
    prompt += `- Formazione avversaria: ${context.opponent_formation.formation || 'N/A'}\n`
    prompt += `- Stile avversario: ${context.opponent_formation.tactical_style || 'N/A'}\n`
  }

  prompt += `\n**DOMANDA UTENTE:**
"${userMessage}"

**ISTRUZIONI:**
1. Rispondi in modo chiaro e conciso, adattando il tono al livello utente (${userLevel})
2. Se l'utente è principiante, spiega i concetti base
3. Se l'utente è avanzato, fornisci consigli tattici dettagliati
4. Usa il contesto disponibile (rosa, partita, avversario) per risposte personalizzate
5. Se mancano informazioni, chiedi all'utente o suggerisci come ottenerle
6. Sii empatico e supportivo, specialmente se l'utente è frustrato
7. Fornisci sempre consigli pratici e azionabili
8. Puoi rispondere a QUALSIASI domanda su eFootball: tattica, giocatori, formazioni, statistiche, sviluppo giocatori, booster, skills, etc.

**RISPOSTA:**`

  return prompt
}

/**
 * Chiama GPT-4o Realtime API per coaching
 */
async function callGPTRealtimeCoaching(
  prompt: string,
  context: any,
  apiKey: string
): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // GPT-4o per risposte intelligenti
        messages: [
          {
            role: 'system',
            content: `Sei un coach personale esperto di eFootball. Aiuti gli utenti a migliorare le loro performance, gestire la rosa, e vincere partite. Sei sempre disponibile, empatico, e fornisci consigli pratici e azionabili.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7, // Bilanciato tra creatività e coerenza
        stream: false // Per ora non streaming, ma può essere abilitato
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`GPT API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid GPT API response format')
    }

    return data.choices[0].message.content

  } catch (error) {
    console.error('Error calling GPT-Realtime API:', error)
    throw new Error(`GPT API call failed: ${error.message}`)
  }
}