import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../lib/rateLimiter'
import { calculateAIKnowledgeScore, getAIKnowledgeLevel } from '../../../lib/aiKnowledgeHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai-knowledge
 * 
 * Restituisce lo score di conoscenza IA per l'utente autenticato.
 * 
 * Response:
 * {
 *   score: number (0-100),
 *   level: string ('beginner' | 'intermediate' | 'advanced' | 'expert'),
 *   breakdown: {
 *     profile: number,
 *     roster: number,
 *     matches: number,
 *     patterns: number,
 *     coach: number,
 *     usage: number,
 *     success: number
 *   },
 *   last_calculated: string (ISO timestamp)
 * }
 */
export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    // Autenticazione (prima per ottenere userId per rate limiting)
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/ai-knowledge']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/ai-knowledge',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }

    // Crea client admin per query
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Prova a leggere score dal database (cache)
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('ai_knowledge_score, ai_knowledge_level, ai_knowledge_breakdown, ai_knowledge_last_calculated')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('[AIKnowledge API] Error fetching profile:', profileError)
    }

    // Se score esiste e è stato calcolato di recente (< 5 minuti), restituisci cached
    const now = new Date()
    const lastCalculated = profile?.ai_knowledge_last_calculated 
      ? new Date(profile.ai_knowledge_last_calculated)
      : null
    
    const cacheValid = lastCalculated && 
      (now - lastCalculated) < 5 * 60 * 1000 // 5 minuti

    if (profile?.ai_knowledge_score !== null && profile?.ai_knowledge_score !== undefined && cacheValid) {
      // Restituisci score cached
      return NextResponse.json({
        score: profile.ai_knowledge_score,
        level: profile.ai_knowledge_level || getAIKnowledgeLevel(profile.ai_knowledge_score),
        breakdown: profile.ai_knowledge_breakdown || {},
        last_calculated: profile.ai_knowledge_last_calculated
      }, {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 minuti
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      })
    }

    // Calcola score (se non cached o scaduto)
    try {
      const result = await calculateAIKnowledgeScore(userId, supabaseUrl, serviceKey)

      // Salva nel database (async, non blocca response)
      admin
        .from('user_profiles')
        .update({
          ai_knowledge_score: result.score,
          ai_knowledge_level: result.level,
          ai_knowledge_breakdown: result.breakdown,
          ai_knowledge_last_calculated: new Date().toISOString()
        })
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            console.error('[AIKnowledge API] Error updating score:', error)
          }
        })
        .catch(err => {
          console.error('[AIKnowledge API] Error updating score (async):', err)
        })

      return NextResponse.json({
        score: result.score,
        level: result.level,
        breakdown: result.breakdown,
        last_calculated: new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': 'private, max-age=300', // 5 minuti
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      })
    } catch (calcError) {
      console.error('[AIKnowledge API] Error calculating score:', calcError)
      
      // Fallback: restituisci score cached anche se scaduto, o default
      if (profile?.ai_knowledge_score !== null && profile?.ai_knowledge_score !== undefined) {
        return NextResponse.json({
          score: profile.ai_knowledge_score,
          level: profile.ai_knowledge_level || getAIKnowledgeLevel(profile.ai_knowledge_score),
          breakdown: profile.ai_knowledge_breakdown || {},
          last_calculated: profile.ai_knowledge_last_calculated
        }, {
          headers: {
            'Cache-Control': 'private, max-age=60', // 1 minuto (fallback)
            'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        })
      }

      // Ultimo fallback: score 0
      return NextResponse.json({
        score: 0,
        level: 'beginner',
        breakdown: {
          profile: 0,
          roster: 0,
          matches: 0,
          patterns: 0,
          coach: 0,
          usage: 0,
          success: 0
        },
        last_calculated: null
      }, {
        status: 200, // 200 OK anche se errore (fallback graceful)
        headers: {
          'Cache-Control': 'private, max-age=60',
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      })
    }
  } catch (error) {
    console.error('[AIKnowledge API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
