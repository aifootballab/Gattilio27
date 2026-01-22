import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { calculateBalanceFromTransactions, syncBalanceCache, getBalanceFromCache } from '../../../../lib/heroPointsHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/hero-points/balance
 * 
 * Ritorna il balance crediti dell'utente.
 * Calcola sempre dalle transazioni (fonte di verità) e sincronizza cache.
 * 
 * Response:
 * {
 *   hero_points_balance: number,
 *   euros_equivalent: number,
 *   last_purchase_at: string | null,
 *   total_purchased: number,
 *   total_spent: number
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

    // Calcola balance dalle transazioni (fonte di verità - Event Sourcing)
    const calculatedData = await calculateBalanceFromTransactions(admin, userId)
    
    // Sincronizza cache (user_hero_points) con balance calcolato
    const cacheData = await syncBalanceCache(admin, userId, calculatedData)
    
    // Leggi cache per euros_equivalent (computed column)
    const cacheRecord = cacheData || await getBalanceFromCache(admin, userId)
    
    // Ritorna balance calcolato dalle transazioni (fonte di verità)
    return NextResponse.json({
      hero_points_balance: calculatedData.balance,
      euros_equivalent: cacheRecord?.euros_equivalent || (calculatedData.balance / 100),
      last_purchase_at: calculatedData.lastPurchaseAt,
      total_purchased: calculatedData.totalPurchased || 0,
      total_spent: calculatedData.totalSpent || 0
    })

  } catch (error) {
    console.error('[hero-points/balance] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
