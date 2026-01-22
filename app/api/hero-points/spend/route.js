import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/hero-points/spend
 * 
 * Consuma Hero Points per un'operazione.
 * Verifica balance sufficiente prima di sottrarre.
 * 
 * Input:
 * {
 *   amount: number, // Hero Points da sottrarre
 *   operation_type: string, // Es. "analyze_match", "extract_player", "realtime_coach"
 *   operation_id: string | null, // ID dell'operazione (es. match_id, session_id)
 *   description: string | null // Descrizione opzionale
 * }
 * 
 * Response:
 * {
 *   hero_points_spent: number,
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
    
    const { amount, operation_type, operation_id, description } = await req.json()

    // Validazione input
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        error: 'Invalid amount. Please enter a positive number.' 
      }, { status: 400 })
    }

    if (!operation_type || typeof operation_type !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid operation type.' 
      }, { status: 400 })
    }

    const heroPointsToSpend = Math.round(amount)
    
    if (heroPointsToSpend <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be at least 1 Hero Point.' 
      }, { status: 400 })
    }

    console.log(`[hero-points/spend] Attempting to spend ${heroPointsToSpend} HP for operation: ${operation_type}`)

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Recupera balance corrente (o crea se non esiste con starter pack)
    const { data: existingBalance, error: fetchError } = await admin
      .from('user_hero_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found (ok)
      console.error('[hero-points/spend] Error fetching balance:', fetchError)
      return NextResponse.json({ error: 'Unable to process request. Please try again.' }, { status: 500 })
    }

    // Se non esiste record, assegna starter pack prima
    let currentBalance = existingBalance?.hero_points_balance || 0
    let totalSpent = existingBalance?.total_spent || 0

    if (!existingBalance || !existingBalance.starter_pack_claimed) {
      console.log('[hero-points/spend] Assigning starter pack')
      
      const starterPackAmount = 1000
      currentBalance = starterPackAmount
      
      // Crea record con starter pack
      const { data: newBalance, error: upsertError } = await admin
        .from('user_hero_points')
        .upsert({
          user_id: userId,
          hero_points_balance: starterPackAmount,
          starter_pack_claimed: true,
          starter_pack_amount: starterPackAmount,
          total_purchased: starterPackAmount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (upsertError) {
        console.error('[hero-points/spend] Error creating balance with starter pack:', upsertError)
        return NextResponse.json({ error: 'Unable to initialize account. Please try again.' }, { status: 500 })
      }

      // Crea transazione starter pack
      await admin
        .from('hero_points_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'purchase',
          hero_points_amount: starterPackAmount,
          euros_amount: null,
          operation_type: 'starter_pack',
          operation_id: null,
          balance_after: starterPackAmount,
          description: 'Starter Pack - Benvenuto! 1000 Hero Points gratuiti'
        })

      console.log(`[hero-points/spend] Starter pack assigned: ${starterPackAmount} HP`)
    }

    // Verifica balance sufficiente
    if (currentBalance < heroPointsToSpend) {
      return NextResponse.json({ 
        error: 'Insufficient Hero Points balance',
        hero_points_balance: currentBalance,
        hero_points_required: heroPointsToSpend,
        euros_equivalent: currentBalance / 100
      }, { status: 402 }) // 402 Payment Required
    }

    // Calcola nuovo balance
    const newBalance = currentBalance - heroPointsToSpend
    totalSpent = totalSpent + heroPointsToSpend

    // Aggiorna balance (con constraint CHECK per prevenire balance negativo)
    const { data: updatedBalance, error: updateError } = await admin
      .from('user_hero_points')
      .update({
        hero_points_balance: newBalance,
        total_spent: totalSpent,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('[hero-points/spend] Error updating balance:', updateError)
      
      // Se errore è constraint violation (balance negativo), ritorna errore
      if (updateError.code === '23514') { // CHECK constraint violation
        return NextResponse.json({ 
          error: 'Insufficient Hero Points balance',
          hero_points_balance: currentBalance,
          hero_points_required: heroPointsToSpend
        }, { status: 402 })
      }
      
      return NextResponse.json({ error: 'Unable to process transaction. Please try again.' }, { status: 500 })
    }

    // Crea transazione
    const { data: transaction, error: transactionError } = await admin
      .from('hero_points_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'spent',
        hero_points_amount: -heroPointsToSpend, // Negativo per spent
        euros_amount: null,
        operation_type: operation_type,
        operation_id: operation_id || null,
        balance_after: newBalance,
        description: description || `Consumo ${heroPointsToSpend} Hero Points per ${operation_type}`
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[hero-points/spend] Error creating transaction:', transactionError)
      // Non fallire se la transazione non viene creata, ma logga l'errore
      // Il balance è già stato aggiornato
    }

    console.log(`[hero-points/spend] Spend completed: ${heroPointsToSpend} HP spent, new balance: ${newBalance}`)

    // Ritorna risultato
    return NextResponse.json({
      hero_points_spent: heroPointsToSpend,
      hero_points_balance: newBalance,
      euros_equivalent: updatedBalance.euros_equivalent || (newBalance / 100),
      transaction_id: transaction?.id || null
    })

  } catch (error) {
    console.error('[hero-points/spend] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
