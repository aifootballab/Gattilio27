import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../lib/rateLimiter'
import { callOpenAIWithRetry, parseOpenAIResponse } from '../../../lib/openaiHelper'
import { recordUsage } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGES = 2
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB per image

function getPreferredLanguage(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  return accept.toLowerCase().startsWith('it') || accept.includes('it') ? 'it' : 'en'
}

const ERRORS = {
  it: {
    auth: 'Autenticazione richiesta.',
    invalid: 'Token non valido o scaduto.',
    config: 'Configurazione mancante.',
    images_required: 'Invia almeno uno screenshot della schermata Analisi.',
    too_many: 'Massimo 2 screenshot.',
    too_large: 'Immagine troppo grande (max 10MB).',
    parse: 'Impossibile leggere i dati dall\'immagine. Riprova con uno screenshot più nitido.',
    server: 'Errore durante l\'estrazione. Riprova.'
  },
  en: {
    auth: 'Authentication required.',
    invalid: 'Invalid or expired token.',
    config: 'Server configuration missing.',
    images_required: 'Send at least one Analisi screen screenshot.',
    too_many: 'Maximum 2 screenshots.',
    too_large: 'Image too large (max 10MB).',
    parse: 'Could not read data from image. Try a clearer screenshot.',
    server: 'Error during extraction. Please try again.'
  }
}

const PROMPT = `Analizza gli screenshot della schermata "Analisi" di eFootball (statistiche ultime 10 partite).
Puoi ricevere 1 o 2 immagini: una con "Tipo di gol", "Tiro", "Comandi speciali"; l'altra con "Passaggio", "Dribbling", "Difesa".

Estrai tutti i dati visibili (percentuali, valori, etichette). Per ogni categoria restituisci un oggetto con le voci lette e la percentuale o il valore numerico indicato per l'utente ("Tu").

Formato JSON richiesto (usa null per categorie non presenti nell'immagine):
{
  "goal_types": { "Passaggio filtrante rasoterra": 47, "Cross": 12, "Dribbling": 10, ... },
  "shot_usage": { "Normale": 83, "Tiro calibrato": 12, "Pallonetto": 3, ... },
  "special_commands": { "Chiama pressing": 1, "Cambio cursore": 219, "Uno-due in avanti": 1, ... },
  "passing": { "Passaggio rasoterra": 52, "Passaggio alto": 5, "Passaggio filtrante rasoterra": 37, ... },
  "dribbling": { "Normale": 34, "Scatta": 62, "Dribbling di precisione": 1, ... },
  "defense": { "Pressa": 34, "Testa a testa": 24, "Movimento": 41, ... }
}

Regole:
- Le chiavi devono essere le etichette esatte lette dallo schermo (in italiano).
- I valori sono numeri (percentuali o conteggi).
- Includi solo le voci effettivamente visibili.
- Restituisci SOLO JSON valido, senza altro testo.`

/** GET: restituisce captured_at (e se ci sono dati) per mostrare in UI "Ultima analisi: data". */
export async function GET(req) {
  const lang = getPreferredLanguage(req)
  const L = ERRORS[lang] || ERRORS.en
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: L.config }, { status: 500, headers: { 'Content-Language': lang } })
    }
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: L.auth }, { status: 401, headers: { 'Content-Language': lang } })
    }
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: L.invalid }, { status: 401, headers: { 'Content-Language': lang } })
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: row } = await admin
      .from('user_game_analysis')
      .select('captured_at, stats')
      .eq('user_id', userData.user.id)
      .maybeSingle()
    const hasStats = row?.stats && typeof row.stats === 'object' && Object.keys(row.stats).length > 0
    return NextResponse.json(
      { captured_at: row?.captured_at || null, has_stats: !!hasStats },
      { headers: { 'Content-Language': lang } }
    )
  } catch (e) {
    console.error('[extract-game-analysis] GET error:', e)
    return NextResponse.json(
      { error: (ERRORS[lang] || ERRORS.en).server },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}

export async function POST(req) {
  const lang = getPreferredLanguage(req)
  const L = ERRORS[lang] || ERRORS.en

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: L.config }, { status: 500, headers: { 'Content-Language': lang } })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: L.auth }, { status: 401, headers: { 'Content-Language': lang } })
    }
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: L.invalid }, { status: 401, headers: { 'Content-Language': lang } })
    }
    const userId = userData.user.id

    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/extract-game-analysis'] || { maxRequests: 5, windowMs: 60000 }
    const rateLimit = await checkRateLimit(userId, '/api/extract-game-analysis', rateLimitConfig.maxRequests, rateLimitConfig.windowMs)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: lang === 'it' ? 'Troppe richieste. Riprova tra un minuto.' : 'Too many requests. Try again in a minute.' },
        { status: 429, headers: { 'Content-Language': lang } }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: L.config }, { status: 500, headers: { 'Content-Language': lang } })
    }

    const body = await req.json().catch(() => ({}))
    let imageDataUrls = body.imageDataUrls || (body.imageDataUrl ? [body.imageDataUrl] : [])
    if (!Array.isArray(imageDataUrls)) imageDataUrls = [imageDataUrls].filter(Boolean)
    if (imageDataUrls.length === 0) {
      return NextResponse.json({ error: L.images_required }, { status: 400, headers: { 'Content-Language': lang } })
    }
    if (imageDataUrls.length > MAX_IMAGES) {
      return NextResponse.json({ error: L.too_many }, { status: 400, headers: { 'Content-Language': lang } })
    }

    for (const url of imageDataUrls) {
      if (!url || typeof url !== 'string') continue
      if (url.startsWith('data:image/')) {
        const base64 = url.split(',')[1]
        if (base64 && (base64.length * 3) / 4 > MAX_SIZE_BYTES) {
          return NextResponse.json({ error: L.too_large }, { status: 400, headers: { 'Content-Language': lang } })
        }
      }
    }

    const content = [{ type: 'text', text: PROMPT }]
    imageDataUrls.forEach(u => {
      if (u && typeof u === 'string') content.push({ type: 'image_url', image_url: { url: u, detail: 'high' } })
    })

    let stats = {}
    try {
      const requestBody = {
        model: 'gpt-4o',
        messages: [{ role: 'user', content }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 2000
      }
      const openaiRes = await callOpenAIWithRetry(apiKey, requestBody, 'extract-game-analysis')
      const parsed = await parseOpenAIResponse(openaiRes, 'extract-game-analysis')
      if (parsed && typeof parsed === 'object') {
        stats = {
          goal_types: parsed.goal_types && typeof parsed.goal_types === 'object' ? parsed.goal_types : {},
          shot_usage: parsed.shot_usage && typeof parsed.shot_usage === 'object' ? parsed.shot_usage : {},
          special_commands: parsed.special_commands && typeof parsed.special_commands === 'object' ? parsed.special_commands : {},
          passing: parsed.passing && typeof parsed.passing === 'object' ? parsed.passing : {},
          dribbling: parsed.dribbling && typeof parsed.dribbling === 'object' ? parsed.dribbling : {},
          defense: parsed.defense && typeof parsed.defense === 'object' ? parsed.defense : {}
        }
      }
    } catch (parseErr) {
      console.error('[extract-game-analysis] Parse error:', parseErr)
      return NextResponse.json(
        { error: L.parse },
        { status: 422, headers: { 'Content-Language': lang } }
      )
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const capturedAt = new Date().toISOString()
    const { error: upsertError } = await admin
      .from('user_game_analysis')
      .upsert({ user_id: userId, stats, captured_at: capturedAt }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('[extract-game-analysis] Upsert error:', upsertError.message)
      return NextResponse.json(
        { error: L.server },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    await recordUsage(admin, userId, 3, 'extract-game-analysis')

    return NextResponse.json(
      { success: true, captured_at: capturedAt },
      {
        status: 200,
        headers: {
          'Content-Language': lang,
          'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
          'X-RateLimit-Remaining': String(rateLimit.remaining ?? rateLimitConfig.maxRequests - 1)
        }
      }
    )
  } catch (err) {
    console.error('[extract-game-analysis] Error:', err)
    return NextResponse.json(
      { error: (ERRORS[lang] || ERRORS.en).server },
      { status: 500, headers: { 'Content-Language': lang } }
    )
  }
}
