import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '../../../../lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Supabase server env missing' }, { status: 500 })
    }

    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid or expired authentication' }, { status: 401 })
    }

    const userId = userData.user.id
    const { searchParams } = new URL(req.url)
    const matchId = searchParams.get('match_id')

    if (!matchId) {
      return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
    }

    // Validazione formato UUID v4
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(matchId)) {
      return NextResponse.json({ error: 'Invalid match_id format' }, { status: 400 })
    }

    // Rate limiting
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/supabase/delete-match']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/supabase/delete-match',
      rateLimitConfig.maxRequests,
      rateLimitConfig.windowMs
    )

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later.',
          resetAt: rateLimit.resetAt
        },
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

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verifica che il match appartenga all'utente
    const { data: existingMatch, error: fetchError } = await admin
      .from('matches')
      .select('id')
      .eq('id', matchId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingMatch) {
      return NextResponse.json({ error: 'Match not found or access denied' }, { status: 404 })
    }

    // Elimina il match
    const { error: deleteError } = await admin
      .from('matches')
      .delete()
      .eq('id', matchId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[delete-match] Supabase delete error:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Error deleting match' },
        { status: 500 }
      )
    }

    // Log senza esporre user_id (privacy/GDPR)
    console.log(`[delete-match] Match deleted successfully: ${matchId}`)

    return NextResponse.json({
      success: true,
      message: 'Match deleted successfully'
    })
  } catch (err) {
    console.error('[delete-match] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Error deleting match' },
      { status: 500 }
    )
  }
}
