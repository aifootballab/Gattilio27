import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { calculateBalanceFromTransactions, getBalanceFromCache } from '../../../../lib/heroPointsHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/hero-points/debug
 * 
 * Endpoint di debug per verificare coerenza tra transazioni e cache.
 * SOLO PER DEBUG - rimuovere in produzione
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

    // Calcola dalle transazioni
    const calculatedData = await calculateBalanceFromTransactions(admin, userId)

    // Leggi cache
    const cacheData = await getBalanceFromCache(admin, userId)

    // Recupera tutte le transazioni per analisi dettagliata
    const { data: allTransactions, error: txError } = await admin
      .from('hero_points_transactions')
      .select('id, transaction_type, hero_points_amount, created_at, description')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    // Calcola manualmente per debug (stessa logica di calculateBalanceFromTransactions)
    let manualBalance = 0
    let purchaseCount = 0
    let spentCount = 0
    let purchaseTotal = 0
    let spentTotal = 0

    if (allTransactions && allTransactions.length > 0) {
      allTransactions.forEach(tx => {
        if (tx.transaction_type === 'purchase') {
          purchaseCount++
          const amount = Math.abs(tx.hero_points_amount)
          purchaseTotal += amount
          manualBalance += amount
        } else if (tx.transaction_type === 'spent') {
          spentCount++
          const amount = Math.abs(tx.hero_points_amount)
          spentTotal += amount
          // Stessa logica: se negativo, aggiungiamo direttamente; se positivo, sottraiamo
          if (tx.hero_points_amount < 0) {
            manualBalance += tx.hero_points_amount // Es: acc + (-100) = acc - 100
          } else {
            manualBalance -= amount // Vecchio formato
          }
        } else if (tx.transaction_type === 'refund') {
          manualBalance += Math.abs(tx.hero_points_amount)
        }
      })
    }

    return NextResponse.json({
      userId,
      calculated: {
        balance: calculatedData.balance,
        totalPurchased: calculatedData.totalPurchased,
        totalSpent: calculatedData.totalSpent,
        lastPurchaseAt: calculatedData.lastPurchaseAt
      },
      cache: cacheData ? {
        balance: cacheData.hero_points_balance,
        totalPurchased: cacheData.total_purchased,
        totalSpent: cacheData.total_spent,
        eurosEquivalent: cacheData.euros_equivalent
      } : null,
      manual: {
        balance: manualBalance,
        purchaseCount,
        spentCount,
        purchaseTotal,
        spentTotal
      },
      transactions: {
        total: allTransactions?.length || 0,
        sample: allTransactions?.slice(0, 10) || [],
        last10: allTransactions?.slice(-10) || []
      },
      consistency: {
        calculatedVsCache: calculatedData.balance === (cacheData?.hero_points_balance || 0),
        calculatedVsManual: calculatedData.balance === manualBalance,
        discrepancy: calculatedData.balance - (cacheData?.hero_points_balance || 0)
      }
    })

  } catch (error) {
    console.error('[hero-points/debug] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
