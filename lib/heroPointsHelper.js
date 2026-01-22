/**
 * Hero Points Helper Functions
 * 
 * Funzioni condivise per gestione Hero Points con approccio Event Sourcing.
 * Le transazioni sono la fonte di verità, il balance viene sempre calcolato dalle transazioni.
 */

/**
 * Calcola balance dalle transazioni (fonte di verità)
 * 
 * @param {Object} admin - Supabase admin client
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { balance, totalPurchased, totalSpent, lastPurchaseAt }
 */
export async function calculateBalanceFromTransactions(admin, userId) {
  // Recupera TUTTE le transazioni per l'utente (admin bypassa RLS)
  // IMPORTANTE: Usa select('*') per essere sicuri di avere tutti i campi
  const { data: transactions, error } = await admin
    .from('hero_points_transactions')
    .select('transaction_type, hero_points_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[heroPointsHelper] Error fetching transactions:', error)
    // In caso di errore, ritorna valori di default
    return {
      balance: 0,
      totalPurchased: 0,
      totalSpent: 0,
      lastPurchaseAt: null
    }
  }
  
  // DEBUG: Log transazioni trovate con dettagli completi
  console.log(`[heroPointsHelper] DEBUG user ${userId}: found ${transactions?.length || 0} transactions`)
  if (transactions && transactions.length > 0) {
    const txDetails = transactions.map(tx => `${tx.transaction_type}:${tx.hero_points_amount}@${tx.created_at}`).join(', ')
    console.log(`[heroPointsHelper] DEBUG transactions:`, txDetails)
    
    // Calcolo manuale per verifica
    const manualBalance = transactions.reduce((acc, tx) => {
      if (tx.transaction_type === 'purchase') return acc + Math.abs(tx.hero_points_amount)
      if (tx.transaction_type === 'spent') return acc + (tx.hero_points_amount < 0 ? tx.hero_points_amount : -Math.abs(tx.hero_points_amount))
      if (tx.transaction_type === 'refund') return acc + Math.abs(tx.hero_points_amount)
      return acc
    }, 0)
    console.log(`[heroPointsHelper] DEBUG manual balance calculation: ${manualBalance}`)
  }

  let balance = 0
  let totalPurchased = 0
  let totalSpent = 0
  let lastPurchaseAt = null

  if (transactions && transactions.length > 0) {
    // DEBUG: Log ogni transazione durante il calcolo
    console.log(`[heroPointsHelper] Starting balance calculation with ${transactions.length} transactions`)
    
    balance = transactions.reduce((acc, tx, index) => {
      const beforeAcc = acc
      
      if (tx.transaction_type === 'purchase') {
        // Purchase: hero_points_amount è sempre positivo
        const amount = Math.abs(tx.hero_points_amount)
        totalPurchased += amount
        const newAcc = acc + amount
        console.log(`[heroPointsHelper] TX ${index}: purchase +${amount}, acc: ${beforeAcc} -> ${newAcc}`)
        return newAcc
      } else if (tx.transaction_type === 'spent') {
        // Spent: hero_points_amount è negativo (nuovo sistema) o positivo (vecchio sistema)
        // Gestiamo entrambi i casi per compatibilità retroattiva
        const amount = Math.abs(tx.hero_points_amount)
        totalSpent += amount
        // Se è negativo, aggiungiamo direttamente (perché negativo = sottrazione)
        // Se è positivo, sottraiamo (vecchio formato)
        let newAcc
        if (tx.hero_points_amount < 0) {
          newAcc = acc + tx.hero_points_amount // Es: acc + (-100) = acc - 100
        } else {
          newAcc = acc - amount // Vecchio formato: positivo, quindi sottraiamo
        }
        console.log(`[heroPointsHelper] TX ${index}: spent ${tx.hero_points_amount}, acc: ${beforeAcc} -> ${newAcc}`)
        return newAcc
      } else if (tx.transaction_type === 'refund') {
        // Refund: sempre positivo
        const amount = Math.abs(tx.hero_points_amount)
        const newAcc = acc + amount
        console.log(`[heroPointsHelper] TX ${index}: refund +${amount}, acc: ${beforeAcc} -> ${newAcc}`)
        return newAcc
      }
      console.log(`[heroPointsHelper] TX ${index}: unknown type ${tx.transaction_type}, acc unchanged: ${acc}`)
      return acc
    }, 0)
    
    console.log(`[heroPointsHelper] Final balance after reduce: ${balance}, totalPurchased: ${totalPurchased}, totalSpent: ${totalSpent}`)

    // Trova ultimo acquisto
    const purchases = transactions.filter(tx => tx.transaction_type === 'purchase')
    if (purchases.length > 0) {
      purchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      lastPurchaseAt = purchases[0].created_at
    }
  }

  const result = {
    balance,
    totalPurchased,
    totalSpent,
    lastPurchaseAt
  }
  
  // DEBUG: Log risultato finale
  console.log(`[heroPointsHelper] FINAL RESULT user ${userId}:`, JSON.stringify(result))
  
  return result
}

/**
 * Sincronizza cache (user_hero_points) con balance calcolato dalle transazioni
 * 
 * @param {Object} admin - Supabase admin client
 * @param {string} userId - User ID
 * @param {Object} calculatedData - Dati calcolati da calculateBalanceFromTransactions
 * @returns {Promise<Object|null>} Record aggiornato o null se errore
 */
export async function syncBalanceCache(admin, userId, calculatedData) {
  try {
    // Prima verifica se esiste il record
    const { data: existing, error: checkError } = await admin
      .from('user_hero_points')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    let data = null
    let error = null

    if (checkError && checkError.code !== 'PGRST116') {
      // Errore diverso da "not found"
      console.error('[heroPointsHelper] Error checking cache:', checkError)
      return null
    }

    if (existing) {
      // UPDATE esplicito (più affidabile dell'upsert)
      // FORZA aggiornamento con valori espliciti
      const updateData = {
        hero_points_balance: calculatedData.balance,
        total_purchased: calculatedData.totalPurchased,
        total_spent: calculatedData.totalSpent,
        updated_at: new Date().toISOString()
      }
      
      // Aggiungi last_purchase_at solo se presente
      if (calculatedData.lastPurchaseAt) {
        updateData.last_purchase_at = calculatedData.lastPurchaseAt
      }
      
      const updateResult = await admin
        .from('user_hero_points')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()
      
      data = updateResult.data
      error = updateResult.error
      
      // DEBUG: Verifica immediata dopo UPDATE
      if (!error && data) {
        console.log(`[heroPointsHelper] DEBUG UPDATE executed: set balance=${updateData.hero_points_balance}, got back=${data.hero_points_balance}`)
        // Se il valore restituito non corrisponde, c'è un problema
        if (data.hero_points_balance !== calculatedData.balance) {
          console.error(`[heroPointsHelper] CRITICAL: UPDATE returned wrong value! Expected ${calculatedData.balance}, got ${data.hero_points_balance}`)
        }
      }
    } else {
      // INSERT nuovo record
      const insertResult = await admin
        .from('user_hero_points')
        .insert({
          user_id: userId,
          hero_points_balance: calculatedData.balance,
          total_purchased: calculatedData.totalPurchased,
          total_spent: calculatedData.totalSpent,
          last_purchase_at: calculatedData.lastPurchaseAt,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      data = insertResult.data
      error = insertResult.error
    }

    if (error) {
      console.error('[heroPointsHelper] Error syncing cache:', error)
      // Non fallire, ritorna null e il chiamante userà la cache esistente
      return null
    }

    // Verifica che la sincronizzazione sia andata a buon fine
    if (data && data.hero_points_balance !== calculatedData.balance) {
      console.warn(`[heroPointsHelper] Cache sync mismatch: expected ${calculatedData.balance}, got ${data.hero_points_balance}`)
    }
    
    // DEBUG: Log sync risultato
    console.log(`[heroPointsHelper] DEBUG syncBalanceCache user ${userId}: synced balance=${data?.hero_points_balance}, expected=${calculatedData.balance}`)

    return data
  } catch (err) {
    console.error('[heroPointsHelper] Unexpected error syncing cache:', err)
    return null
  }
}

/**
 * Legge balance dalla cache (per performance, quando si sa che è sincronizzata)
 * 
 * @param {Object} admin - Supabase admin client
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Record cache o null se non esiste
 */
export async function getBalanceFromCache(admin, userId) {
  try {
    const { data, error } = await admin
      .from('user_hero_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found (ok)
      console.error('[heroPointsHelper] Error reading cache:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('[heroPointsHelper] Unexpected error reading cache:', err)
    return null
  }
}
