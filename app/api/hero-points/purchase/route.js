import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { calculateBalanceFromTransactions, syncBalanceCache } from '../../../../lib/heroPointsHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/hero-points/purchase
 * 
 * Acquista Hero Points con euro.
 * Conversione: 100 Hero Points = 1€ (quindi 10€ = 1000 HP)
 * 
 * Input:
 * {
 *   amount_euros: number // Es. 10 per 1000 HP
 * }
 * 
 * Response:
 * {
 *   hero_points_added: number,
 *   hero_points_balance: number,
 *   euros_equivalent: number,
 *   transaction_id: string
 * }
 */
export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error('[hero-points/purchase] Supabase server env missing')
      return NextResponse.json({ error: 'Server configuration error. Please try again later.' }, { status: 500 })
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
    
    const { amount_euros } = await req.json()

    // Validazione input
    if (!amount_euros || typeof amount_euros !== 'number' || amount_euros <= 0) {
      return NextResponse.json({ 
        error: 'Invalid amount. Please enter a positive number.' 
      }, { status: 400 })
    }

    // Calcolo Hero Points: 100 HP = 1€
    const heroPointsToAdd = Math.round(amount_euros * 100)
    
    if (heroPointsToAdd <= 0) {
      return NextResponse.json({ 
        error: 'Minimum purchase is 0.01€ (1 Hero Point).' 
      }, { status: 400 })
    }

    console.log(`[hero-points/purchase] Purchasing ${heroPointsToAdd} HP for ${amount_euros}€`)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Calcola balance corrente dalle transazioni (fonte di verità - Event Sourcing)
    const currentData = await calculateBalanceFromTransactions(admin, userId)
    const currentBalance = currentData.balance

    // Calcola nuovo balance
    const newBalance = currentBalance + heroPointsToAdd
    const newTotalPurchased = currentData.totalPurchased + heroPointsToAdd

    // IMPORTANTE: Crea transazione PRIMA (fonte di verità)
    // Se la transazione fallisce, non aggiorniamo il balance
    const { data: transaction, error: transactionError } = await admin
      .from('hero_points_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'purchase',
        hero_points_amount: heroPointsToAdd,
        euros_amount: amount_euros,
        operation_type: 'purchase',
        operation_id: null,
        balance_after: newBalance,
        description: `Acquisto ${heroPointsToAdd} Hero Points per ${amount_euros}€`
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[hero-points/purchase] Error creating transaction:', transactionError)
      return NextResponse.json({ error: 'Unable to complete purchase. Please try again.' }, { status: 500 })
    }

    // Sincronizza cache (user_hero_points) con nuovo balance
    const cacheData = await syncBalanceCache(admin, userId, {
      balance: newBalance,
      totalPurchased: newTotalPurchased,
      totalSpent: currentData.totalSpent,
      lastPurchaseAt: new Date().toISOString()
    })

    console.log(`[hero-points/purchase] Purchase completed: ${heroPointsToAdd} HP added, new balance: ${newBalance}`)

    // Ritorna risultato
    return NextResponse.json({
      hero_points_added: heroPointsToAdd,
      hero_points_balance: newBalance,
      euros_equivalent: cacheData?.euros_equivalent || (newBalance / 100),
      transaction_id: transaction?.id || null
    })

  } catch (error) {
    console.error('[hero-points/purchase] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
