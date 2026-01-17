# Debug Frontend ↔ Backend - Perché Vedo Frank ma Non Pedri?

## 🔴 PROBLEMA IDENTIFICATO

**Database SQL (Verificato):**
- ✅ **Pedri**: Esiste (1 giocatore)
- ❌ **Frank e altri 4**: NON esistono nel database

**Frontend:**
- ❌ Vede **Frank e altri 4** (che NON esistono)
- ❌ NON vede **Pedri** (che ESISTE)

**Conclusione:** Frontend sta leggendo dati da una fonte diversa dal database attuale.

---

## 🔍 POSSIBILI CAUSE

### 1. **Cache API Response (Vercel/Next.js)**
- Next.js 14 cachea risposte API di default
- `get-my-players` potrebbe restituire risposta vecchia cacheata
- **Verifica**: `export const dynamic = 'force-dynamic'` dovrebbe disabilitare cache

### 2. **Cache Browser (Service Worker / HTTP Cache)**
- Browser cachea risposte HTTP
- Hard refresh non sempre pulisce cache Service Worker
- **Verifica**: Network tab → Disable cache → Hard refresh

### 3. **Database Diverso (Variabili Ambiente)**
- Frontend potrebbe usare URL database diverso
- Dev vs Prod hanno variabili ambiente diverse
- **Verifica**: Controlla `NEXT_PUBLIC_SUPABASE_URL` in Vercel

### 4. **Dati Mock/Hardcoded**
- Codice potrebbe avere dati di test hardcoded
- Fallback a dati mock se API fallisce
- **Verifica**: Cerca `mock`, `test`, `hardcoded`, `Frank` nel codice

### 5. **RLS (Row Level Security) Filtering**
- RLS policies potrebbero filtrare risultati diversi
- Admin query bypassa RLS, ma frontend potrebbe essere filtrato
- **Verifica**: RLS policies su `players_base` e `player_builds`

---

## 📋 CHECKLIST DEBUG

### ✅ STEP 1: Verifica Database (FATTO)
```sql
-- Database ha SOLO Pedri
SELECT * FROM players_base; -- 1 riga: Pedri
SELECT * FROM player_builds WHERE user_id = '...'; -- 1 riga: Pedri
```

### ⚠️ STEP 2: Verifica API Response
**Aprire Network Tab in Browser:**
1. F12 → Network
2. Hard refresh (Ctrl+Shift+R)
3. Cercare `/api/supabase/get-my-players`
4. **Verificare Response:**
   - Cosa restituisce realmente l'API?
   - Contiene Frank o Pedri?
   - È cacheata (status 304)?

### ⚠️ STEP 3: Verifica Cache Next.js
**File:** `app/api/supabase/get-my-players/route.js`
```javascript
export const dynamic = 'force-dynamic' // ✅ Dovrebbe disabilitare cache
```

**Verifica in Vercel:**
- Settings → Edge Config / KV Store
- Cache invalidation necessario?

### ⚠️ STEP 4: Verifica Variabili Ambiente
**Vercel Dashboard:**
- Settings → Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` → Verifica che sia `zliuuorrwdetylollrua.supabase.co`
- **Diversi tra Dev/Preview/Production?**

### ⚠️ STEP 5: Verifica Frontend State
**File:** `app/my-players/page.jsx`
```javascript
// Linea 155: setPlayers(Array.isArray(data.players) ? data.players : [])
// Verifica: data.players cosa contiene realmente?
```

**Aggiungere Log:**
```javascript
console.log('[MyPlayers] 🔍 API RESPONSE:', data)
console.log('[MyPlayers] 🔍 PLAYERS RECEIVED:', data.players)
console.log('[MyPlayers] 🔍 PLAYER NAMES:', data.players?.map(p => p.player_name))
```

---

## 🎯 SOLUZIONI IMMEDIATE

### Soluzione 1: Pulizia Cache Completa

**Browser:**
1. F12 → Application → Clear Storage
2. Seleziona "Clear site data"
3. Hard refresh (Ctrl+Shift+R)

**Vercel:**
1. Settings → Cache
2. Purge Edge Cache
3. Redeploy app

### Soluzione 2: Logging Dettagliato

**Aggiungere in `get-my-players/route.js`:**
```javascript
console.log('[get-my-players] 🔍 FINAL RESPONSE:', {
  players_count: players.length,
  player_names: players.map(p => p.player_name),
  builds_count: builds?.length,
  builds_ids: builds?.map(b => b.id)
})
```

**Aggiungere in `my-players/page.jsx`:**
```javascript
console.log('[MyPlayers] 🔍 RAW API RESPONSE:', data)
console.log('[MyPlayers] 🔍 PLAYERS SET:', players.map(p => p.player_name))
```

### Soluzione 3: Verifica Diretta API

**Test API direttamente:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://YOUR_DOMAIN/api/supabase/get-my-players
```

**Verifica cosa restituisce realmente l'API.**

---

## 🔧 FIX PROPOSED

### Fix #1: Disabilita Cache Completamente

**File:** `app/api/supabase/get-my-players/route.js`
```javascript
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // ✅ Già presente
export const revalidate = 0 // Aggiungere per sicurezza
```

**Aggiungere headers nella risposta:**
```javascript
return NextResponse.json(
  { players, count: players.length },
  {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
)
```

### Fix #2: Logging Dettagliato Frontend/Backend

Aggiungere log in ogni step per vedere dove si perde la sincronizzazione.

---

## 🚨 PROSSIMI STEP

1. **Apri Network Tab** → Verifica cosa restituisce `/api/supabase/get-my-players`
2. **Controlla Response** → Contiene Frank o Pedri?
3. **Se contiene Frank** → API sta leggendo da database diverso/cache
4. **Se contiene Pedri** → Problema frontend (state/cache)

---

**Fine Debug Analysis**
