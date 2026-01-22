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

  let balance = 0
  let totalPurchased = 0
  let totalSpent = 0
  let lastPurchaseAt = null

  if (transactions && transactions.length > 0) {
    balance = transactions.reduce((acc, tx) => {
      if (tx.transaction_type === 'purchase') {
        // Purchase: hero_points_amount è sempre positivo
        const amount = Math.abs(tx.hero_points_amount)
        totalPurchased += amount
        return acc + amount
      } else if (tx.transaction_type === 'spent') {
        // Spent: hero_points_amount è negativo (nuovo sistema) o positivo (vecchio sistema)
        // Gestiamo entrambi i casi per compatibilità retroattiva
        const amount = Math.abs(tx.hero_points_amount)
        totalSpent += amount
        // Se è negativo, aggiungiamo direttamente (perché negativo = sottrazione)
        // Se è positivo, sottraiamo (vecchio formato)
        if (tx.hero_points_amount < 0) {
          return acc + tx.hero_points_amount // Es: acc + (-100) = acc - 100
        } else {
          return acc - amount // Vecchio formato: positivo, quindi sottraiamo
        }
      } else if (tx.transaction_type === 'refund') {
        // Refund: sempre positivo
        return acc + Math.abs(tx.hero_points_amount)
      }
      return acc
    }, 0)

    // Trova ultimo acquisto
    const purchases = transactions.filter(tx => tx.transaction_type === 'purchase')
    if (purchases.length > 0) {
      purchases.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      lastPurchaseAt = purchases[0].created_at
    }
  }

  return {
    balance,
    totalPurchased,
    totalSpent,
    lastPurchaseAt
  }
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
    const { data, error } = await admin
      .from('user_hero_points')
      .upsert({
        user_id: userId,
        hero_points_balance: calculatedData.balance,
        total_purchased: calculatedData.totalPurchased,
        total_spent: calculatedData.totalSpent,
        last_purchase_at: calculatedData.lastPurchaseAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[heroPointsHelper] Error syncing cache:', error)
      // Non fallire, ritorna null e il chiamante userà la cache esistente
      return null
    }

    // Verifica che la sincronizzazione sia andata a buon fine
    if (data && data.hero_points_balance !== calculatedData.balance) {
      console.warn(`[heroPointsHelper] Cache sync mismatch: expected ${calculatedData.balance}, got ${data.hero_points_balance}`)
    }

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
