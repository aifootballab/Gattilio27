import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getCurrentUsage } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/usage
 *
 * Restituisce l'utilizzo crediti del periodo corrente (o ultimo con dati) per l'utente autenticato.
 * Doc: docs/SISTEMA_CREDITI_AI.md
 *
 * Response:
 * {
 *   period_key: string (YYYY-MM),
 *   credits_used: number,
 *   credits_included: number,
 *   overage: number,
 *   percent_used: number (0-100+)
 * }
 */
export async function GET(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
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
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const usage = await getCurrentUsage(admin, userId)
    const creditsUsed = Number(usage.credits_used)
    const creditsIncluded = Number(usage.credits_included) || 200
    const used = Number.isFinite(creditsUsed) ? creditsUsed : 0
    const included = Number.isFinite(creditsIncluded) ? creditsIncluded : 200
    const percentUsed =
      included > 0 ? Math.round((used / included) * 100) : 0

    return NextResponse.json(
      {
        period_key: usage.period_key,
        credits_used: used,
        credits_included: included,
        overage: Math.max(0, used - included),
        percent_used: Math.min(100, percentUsed),
        percent_used_raw: percentUsed
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, private, max-age=0',
          Pragma: 'no-cache'
        }
      }
    )
  } catch (err) {
    console.error('[credits/usage] Error:', err)
    return NextResponse.json({ error: 'Error loading usage' }, { status: 500 })
  }
}
