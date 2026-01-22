# 🏗️ REFACTORING HERO POINTS - APPROCCIO ENTERPRISE

**Data**: 2025-01-XX  
**Problema**: Inconsistenza tra `balance` (legge da `user_hero_points`) e `spend` (calcola dalle transazioni)

---

## 🎯 APPROCCIO ENTERPRISE: EVENT SOURCING

### Filosofia
**Le transazioni sono la fonte di verità. Il balance è calcolato dalle transazioni.**

**Vantaggi**:
- ✅ **Coerenza garantita**: Se balance si corrompe, si può sempre ricalcolare
- ✅ **Audit trail completo**: Ogni operazione è tracciata
- ✅ **No race conditions**: Le transazioni sono atomiche
- ✅ **Enterprise standard**: Pattern usato da sistemi bancari, e-commerce, etc.

**`user_hero_points` è solo una cache ottimizzata**:
- Aggiornata dopo ogni transazione
- Usata per performance (evita ricalcolo ogni volta)
- Se desincronizzata, si ricalcola dalle transazioni

---

## 🔧 ARCHITETTURA PROPOSTA

### 1. **Tutti gli endpoint calcolano dalle transazioni**

**Pattern**:
```javascript
// 1. Calcola balance dalle transazioni (fonte di verità)
const balance = calculateBalanceFromTransactions(userId)

// 2. Verifica/aggiorna cache (user_hero_points)
await syncBalanceCache(userId, balance)

// 3. Usa balance calcolato
```

### 2. **Funzione helper condivisa**

**File**: `lib/heroPointsHelper.js` (NUOVO)

```javascript
/**
 * Calcola balance dalle transazioni (fonte di verità)
 */
export async function calculateBalanceFromTransactions(admin, userId) {
  const { data: transactions } = await admin
    .from('hero_points_transactions')
    .select('transaction_type, hero_points_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  let balance = 0
  let totalPurchased = 0
  let totalSpent = 0
  let lastPurchaseAt = null

  if (transactions && transactions.length > 0) {
    balance = transactions.reduce((acc, tx) => {
      if (tx.transaction_type === 'purchase') {
        totalPurchased += Math.abs(tx.hero_points_amount)
        return acc + tx.hero_points_amount
      } else if (tx.transaction_type === 'spent') {
        totalSpent += Math.abs(tx.hero_points_amount)
        return acc - Math.abs(tx.hero_points_amount)
      } else if (tx.transaction_type === 'refund') {
        return acc + Math.abs(tx.hero_points_amount)
      }
      return acc
    }, 0)

    // Trova ultimo acquisto
    const lastPurchase = transactions
      .filter(tx => tx.transaction_type === 'purchase')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    
    if (lastPurchase) {
      lastPurchaseAt = lastPurchase.created_at
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
 * Sincronizza cache (user_hero_points) con balance calcolato
 */
export async function syncBalanceCache(admin, userId, calculatedData) {
  const { error } = await admin
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

  if (error) {
    console.error('[heroPointsHelper] Error syncing cache:', error)
    // Non fallire, è solo cache
  }
}
```

### 3. **Refactoring endpoint**

#### `/api/hero-points/balance` (GET)
```javascript
import { calculateBalanceFromTransactions, syncBalanceCache } from '@/lib/heroPointsHelper'

export async function GET(req) {
  // ... auth ...
  
  // Calcola dalle transazioni (fonte di verità)
  const calculatedData = await calculateBalanceFromTransactions(admin, userId)
  
  // Sincronizza cache
  await syncBalanceCache(admin, userId, calculatedData)
  
  // Leggi cache per euros_equivalent (computed column)
  const { data: cache } = await admin
    .from('user_hero_points')
    .select('euros_equivalent')
    .eq('user_id', userId)
    .single()
  
  return NextResponse.json({
    hero_points_balance: calculatedData.balance,
    euros_equivalent: cache?.euros_equivalent || (calculatedData.balance / 100),
    last_purchase_at: calculatedData.lastPurchaseAt,
    total_purchased: calculatedData.totalPurchased,
    total_spent: calculatedData.totalSpent
  })
}
```

#### `/api/hero-points/purchase` (POST)
```javascript
import { calculateBalanceFromTransactions } from '@/lib/heroPointsHelper'

export async function POST(req) {
  // ... auth, validation ...
  
  // Calcola balance corrente dalle transazioni
  const currentData = await calculateBalanceFromTransactions(admin, userId)
  const currentBalance = currentData.balance
  
  // Calcola nuovo balance
  const newBalance = currentBalance + heroPointsToAdd
  const newTotalPurchased = currentData.totalPurchased + heroPointsToAdd
  
  // TRANSACTION ATOMICA: Inserisci transazione + aggiorna cache
  const { error: transactionError } = await admin.rpc('purchase_hero_points', {
    p_user_id: userId,
    p_hero_points: heroPointsToAdd,
    p_euros: amount_euros,
    p_new_balance: newBalance,
    p_new_total_purchased: newTotalPurchased
  })
  
  // Oppure, se non usiamo stored procedure:
  // 1. INSERT transaction
  // 2. UPDATE cache
  // (entrambi nella stessa transazione DB)
  
  return NextResponse.json({
    hero_points_added: heroPointsToAdd,
    hero_points_balance: newBalance,
    // ...
  })
}
```

#### `/api/hero-points/spend` (POST)
```javascript
import { calculateBalanceFromTransactions } from '@/lib/heroPointsHelper'

export async function POST(req) {
  // ... auth, validation ...
  
  // Calcola balance corrente dalle transazioni (fonte di verità)
  const currentData = await calculateBalanceFromTransactions(admin, userId)
  const currentBalance = currentData.balance
  
  // Verifica balance sufficiente
  if (currentBalance < heroPointsToSpend) {
    return NextResponse.json({ 
      error: 'Insufficient Hero Points balance',
      hero_points_balance: currentBalance,
      // ...
    }, { status: 402 })
  }
  
  // Calcola nuovo balance
  const newBalance = currentBalance - heroPointsToSpend
  const newTotalSpent = currentData.totalSpent + heroPointsToSpend
  
  // TRANSACTION ATOMICA: Inserisci transazione + aggiorna cache
  // (stesso pattern di purchase)
  
  return NextResponse.json({
    hero_points_spent: heroPointsToSpend,
    hero_points_balance: newBalance,
    // ...
  })
}
```

---

## 🔒 GARANZIE ENTERPRISE

### 1. **Atomicità Transazioni**

**Opzione A: Stored Procedure PostgreSQL** (Raccomandato)
```sql
CREATE OR REPLACE FUNCTION purchase_hero_points(
  p_user_id UUID,
  p_hero_points INTEGER,
  p_euros DECIMAL,
  p_new_balance INTEGER,
  p_new_total_purchased INTEGER
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Inserisci transazione
  INSERT INTO hero_points_transactions (
    user_id, transaction_type, hero_points_amount, euros_amount,
    balance_after, description
  ) VALUES (
    p_user_id, 'purchase', p_hero_points, p_euros,
    p_new_balance, 'Acquisto ' || p_hero_points || ' Hero Points'
  ) RETURNING id INTO v_transaction_id;
  
  -- Aggiorna cache
  INSERT INTO user_hero_points (
    user_id, hero_points_balance, total_purchased, last_purchase_at, updated_at
  ) VALUES (
    p_user_id, p_new_balance, p_new_total_purchased, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    hero_points_balance = p_new_balance,
    total_purchased = p_new_total_purchased,
    last_purchase_at = NOW(),
    updated_at = NOW();
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;
```

**Opzione B: Transazione JavaScript** (Se Supabase supporta)
```javascript
// Usa Supabase transaction se disponibile
const { data, error } = await admin.rpc('begin_transaction')
// ... operazioni ...
await admin.rpc('commit_transaction')
```

### 2. **Verifica Coerenza** (Opzionale, per debug)

**Endpoint**: `/api/hero-points/verify` (solo dev/staging)
```javascript
export async function GET(req) {
  // Calcola dalle transazioni
  const calculated = await calculateBalanceFromTransactions(admin, userId)
  
  // Leggi cache
  const { data: cache } = await admin
    .from('user_hero_points')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  // Confronta
  const isConsistent = 
    calculated.balance === (cache?.hero_points_balance || 0) &&
    calculated.totalPurchased === (cache?.total_purchased || 0) &&
    calculated.totalSpent === (cache?.total_spent || 0)
  
  return NextResponse.json({
    consistent: isConsistent,
    calculated,
    cache: cache || null,
    discrepancy: isConsistent ? null : {
      balance: calculated.balance - (cache?.hero_points_balance || 0),
      totalPurchased: calculated.totalPurchased - (cache?.total_purchased || 0),
      totalSpent: calculated.totalSpent - (cache?.total_spent || 0)
    }
  })
}
```

---

## 📊 VANTAGGI APPROCCIO ENTERPRISE

1. ✅ **Coerenza garantita**: Balance sempre calcolato dalle transazioni
2. ✅ **Audit trail completo**: Ogni operazione tracciata
3. ✅ **Recupero da errori**: Se cache si corrompe, si ricalcola
4. ✅ **Performance**: Cache per query veloci, ma fonte di verità è transazioni
5. ✅ **No race conditions**: Transazioni atomiche
6. ✅ **Enterprise standard**: Pattern usato da sistemi bancari

---

## ⚠️ CONSIDERAZIONI

### Performance
- **Calcolo dalle transazioni**: O(n) dove n = numero transazioni
- **Con indice su `user_id, created_at`**: Molto veloce anche con migliaia di transazioni
- **Cache**: Query istantanea, usata per display UI

### Scalabilità
- Con > 10.000 transazioni per utente, considerare:
  - Snapshot periodici (salvare balance a intervalli)
  - Partizionamento transazioni per data
  - Ma per ora, query è sufficiente

---

## 🚀 IMPLEMENTAZIONE

1. **Creare `lib/heroPointsHelper.js`** con funzioni helper
2. **Refactoring `balance/route.js`** per usare helper
3. **Refactoring `purchase/route.js`** per calcolare dalle transazioni
4. **Refactoring `spend/route.js`** per calcolare dalle transazioni
5. **Creare stored procedure** per atomicità (opzionale ma raccomandato)
6. **Test**: Verificare coerenza dopo ogni operazione

---

## ✅ RISULTATO FINALE

- **Fonte di verità**: Transazioni (`hero_points_transactions`)
- **Cache**: `user_hero_points` (sincronizzata dopo ogni operazione)
- **Coerenza**: Garantita da calcolo sempre dalle transazioni
- **Performance**: Cache per query veloci
- **Enterprise**: Pattern standard, audit trail completo
