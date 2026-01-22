# 🔍 AUDIT COMPLETO SISTEMA HERO POINTS

**Data**: 2025-01-XX  
**Problema Segnalato**: Balance torna a 0 dopo refresh o cambio pagina  
**Utente Test**: attiliomazzetti@gmail.com

---

## 📋 PROBLEMI IDENTIFICATI

### 🚨 PROBLEMA CRITICO #1: Inconsistenza tra `spend` e `balance`

**File**: `app/api/hero-points/spend/route.js` (righe 82-102)

**Problema**:
- `/api/hero-points/balance` legge da `user_hero_points` (fonte di verità) ✅
- `/api/hero-points/spend` **calcola dalle transazioni** invece di leggere da `user_hero_points` ❌

**Codice Problematico**:
```javascript
// spend/route.js - RIGA 82-102
// Calcola balance dalle transazioni per garantire coerenza
const { data: transactions } = await admin
  .from('hero_points_transactions')
  .select('transaction_type, hero_points_amount')
  .eq('user_id', userId)
  .order('created_at', { ascending: true })

let currentBalance = 0
if (transactions && transactions.length > 0) {
  currentBalance = transactions.reduce((balance, tx) => {
    if (tx.transaction_type === 'purchase') {
      return balance + tx.hero_points_amount
    } else if (tx.transaction_type === 'spent') {
      return balance - Math.abs(tx.hero_points_amount)
    }
    return balance
  }, 0)
}
```

**Impatto**:
- Se una transazione non viene salvata o non è visibile (RLS, errore), `spend` calcola un balance sbagliato
- Se `purchase` salva in `user_hero_points` ma la transazione fallisce, `spend` non vede i punti acquistati
- **Race condition**: Due chiamate simultanee a `spend` potrebbero calcolare lo stesso balance iniziale

**Soluzione**: Leggere da `user_hero_points` come fa `balance`

---

### 🚨 PROBLEMA CRITICO #2: Cache nel componente frontend

**File**: `components/HeroPointsBalance.jsx` (righe 24-73)

**Problema**:
1. Cache basata su `lastFetchRef.current` e `balance !== null`
2. Al refresh, `balance` è `null` inizialmente, quindi la cache check fallisce
3. Ma se la sessione non è ancora pronta, `fetchBalance` potrebbe fallire silenziosamente

**Codice Problematico**:
```javascript
const fetchBalance = async (force = false) => {
  const now = Date.now()
  if (!force && lastFetchRef.current && (now - lastFetchRef.current) < CACHE_DURATION && balance !== null) {
    return // Usa cache
  }
  
  // Se sessione non pronta, setBalance(null) e return
  const { data: session, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.session) {
    setBalance(null) // ⚠️ Resetta a null
    setLoading(false)
    return
  }
}
```

**Impatto**:
- Al refresh, se la sessione non è ancora pronta, `balance` viene resettato a `null`
- Il componente mostra `0 HP` invece di attendere il caricamento
- La cache non viene invalidata correttamente dopo un acquisto se si fa refresh

**Soluzione**: 
- Non resettare `balance` a `null` se c'è un errore di sessione
- Attendere che la sessione sia pronta prima di fare fetch
- Invalidare cache dopo acquisto

---

### ⚠️ PROBLEMA #3: `euros_equivalent` potrebbe non essere restituito

**File**: `app/api/hero-points/balance/route.js` (riga 130)

**Problema**:
- `euros_equivalent` è una computed column nel database (`GENERATED ALWAYS AS ... STORED`)
- Se la query non include esplicitamente questa colonna, potrebbe non essere restituita
- Il codice fa `heroPointsData.euros_equivalent || 0`, ma se è `null` nel DB, restituisce `0`

**Verifica Necessaria**: Controllare se `euros_equivalent` viene effettivamente restituito dalla query

---

### ⚠️ PROBLEMA #4: RLS Policies potrebbero bloccare query

**File**: `migrations/create_user_hero_points_table.sql` (righe 40-56)

**Problema Potenziale**:
- Le RLS policies usano `(select auth.uid())` che dipende dalla sessione Supabase
- L'API usa `serviceKey` quindi dovrebbe bypassare RLS, ma se c'è un problema di configurazione...

**Verifica Necessaria**: Testare che le query con `serviceKey` bypassino correttamente RLS

---

### ⚠️ PROBLEMA #5: Race Condition in `purchase`

**File**: `app/api/hero-points/purchase/route.js` (righe 76-104)

**Problema Potenziale**:
- `purchase` legge balance corrente, calcola nuovo, fa upsert
- Se due acquisti simultanei, potrebbero leggere lo stesso balance iniziale
- Non c'è lock sulla riga (`SELECT FOR UPDATE`)

**Impatto**: Basso (acquisti simultanei rari), ma possibile

---

## 🔧 REFACTORING PROPOSTO

### 1. **Unificare logica balance**: Tutti gli endpoint leggono da `user_hero_points`

**Cambiamenti**:
- ✅ `balance/route.js`: Già corretto (legge da `user_hero_points`)
- ❌ `spend/route.js`: **DA CORREGGERE** - Leggere da `user_hero_points` invece di calcolare dalle transazioni
- ✅ `purchase/route.js`: Già corretto (aggiorna `user_hero_points`)

### 2. **Migliorare cache frontend**

**Cambiamenti**:
- Non resettare `balance` a `null` su errore sessione
- Attendere che sessione sia pronta prima di fetch
- Invalidare cache dopo acquisto/spend
- Usare `sessionStorage` per persistenza tra refresh (opzionale)

### 3. **Aggiungere logging dettagliato**

**Cambiamenti**:
- Log balance letto da DB
- Log balance calcolato (se diverso)
- Log errori RLS o query

### 4. **Aggiungere validazione coerenza** (opzionale, per debug)

**Cambiamenti**:
- Endpoint `/api/hero-points/verify` che confronta `user_hero_points` vs transazioni
- Usare solo in sviluppo/staging

---

## 📊 PRIORITÀ CORREZIONI

1. **URGENTE**: Correggere `spend/route.js` per leggere da `user_hero_points`
2. **URGENTE**: Migliorare gestione cache e sessione in `HeroPointsBalance.jsx`
3. **IMPORTANTE**: Verificare che `euros_equivalent` sia restituito correttamente
4. **OPZIONALE**: Aggiungere lock su `purchase` per race condition
5. **OPZIONALE**: Aggiungere logging dettagliato

---

## 🧪 TEST DA ESEGUIRE

1. ✅ Acquisto → Refresh → Verificare balance persiste
2. ✅ Acquisto → Cambio pagina → Verificare balance persiste
3. ✅ Acquisto → Spend → Verificare balance corretto
4. ✅ Due acquisti simultanei → Verificare nessuna perdita
5. ✅ Verificare `euros_equivalent` viene restituito correttamente

---

## 📝 NOTE FINALI

Il problema principale è l'**inconsistenza tra `spend` e `balance`**: uno legge da `user_hero_points`, l'altro calcola dalle transazioni. Questo causa discrepanze.

La cache frontend potrebbe anche causare problemi, ma il problema principale è lato backend.

**Raccomandazione**: Refactoring completo per unificare logica balance e migliorare gestione cache frontend.
