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
    
    // DEBUG: Log calcolo
    console.log(`[hero-points/balance] DEBUG user ${userId}: calculated balance=${calculatedData.balance}, totalPurchased=${calculatedData.totalPurchased}, totalSpent=${calculatedData.totalSpent}`)

    // Sincronizza cache (user_hero_points) con balance calcolato
    // IMPORTANTE: Sincronizziamo sempre per garantire coerenza
    const cacheData = await syncBalanceCache(admin, userId, calculatedData)
    
    // DEBUG: Log sync
    if (cacheData) {
      console.log(`[hero-points/balance] DEBUG user ${userId}: cache synced to balance=${cacheData.hero_points_balance}`)
    } else {
      console.warn(`[hero-points/balance] DEBUG user ${userId}: syncBalanceCache returned null - retrying...`)
      
      // Se syncBalanceCache fallisce, riprova una volta
      const retryCacheData = await syncBalanceCache(admin, userId, calculatedData)
      if (retryCacheData) {
        console.log(`[hero-points/balance] DEBUG user ${userId}: retry successful, cache synced to balance=${retryCacheData.hero_points_balance}`)
      } else {
        console.error(`[hero-points/balance] CRITICAL: syncBalanceCache failed twice for user ${userId}`)
      }
    }

    // Leggi cache per euros_equivalent (computed column)
    // IMPORTANTE: Usiamo sempre calculatedData come fonte di verità per balance
    const cacheRecord = cacheData || await getBalanceFromCache(admin, userId)

    // Log per debug (solo se c'è discrepanza)
    if (cacheRecord && cacheRecord.hero_points_balance !== calculatedData.balance) {
      console.error(`[hero-points/balance] CRITICAL Cache discrepancy for user ${userId}: cache=${cacheRecord.hero_points_balance}, calculated=${calculatedData.balance}`)
      // Forza aggiornamento diretto se c'è discrepanza
      try {
        await admin
          .from('user_hero_points')
          .update({
            hero_points_balance: calculatedData.balance,
            total_purchased: calculatedData.totalPurchased,
            total_spent: calculatedData.totalSpent,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
        console.log(`[hero-points/balance] Forced cache update for user ${userId} to balance=${calculatedData.balance}`)
      } catch (forceError) {
        console.error(`[hero-points/balance] Failed to force cache update:`, forceError)
      }
    }

    // Ritorna balance calcolato dalle transazioni (fonte di verità)
    return NextResponse.json({
      hero_points_balance: calculatedData.balance,
      euros_equivalent: cacheRecord?.euros_equivalent || (calculatedData.balance / 100),
      last_purchase_at: calculatedData.lastPurchaseAt,
      total_purchased: calculatedData.totalPurchased,
      total_spent: calculatedData.totalSpent
    })

  } catch (error) {
    console.error('[hero-points/balance] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
