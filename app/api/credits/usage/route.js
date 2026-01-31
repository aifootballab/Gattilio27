import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getCurrentUsage } from '@/lib/creditService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/usage
 *
 * Restituisce l'utilizzo crediti del periodo corrente per l'utente autenticato.
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
    const percentUsed =
      usage.credits_included > 0
        ? Math.round((usage.credits_used / usage.credits_included) * 100)
        : 0

    return NextResponse.json({
      period_key: usage.period_key,
      credits_used: usage.credits_used,
      credits_included: usage.credits_included,
      overage: usage.overage,
      percent_used: Math.min(100, percentUsed),
      percent_used_raw: percentUsed
    })
  } catch (err) {
    console.error('[credits/usage] Error:', err)
    return NextResponse.json({ error: 'Error loading usage' }, { status: 500 })
  }
}
