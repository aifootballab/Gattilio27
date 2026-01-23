# 📋 TODO: Ottimizzazioni Performance / Performance Optimizations

**Data Creazione / Creation Date**: Gennaio 2025  
**Priorità / Priority**: Media / Medium  
**Stato / Status**: Da implementare / To be implemented

---

## 🎯 Obiettivo / Objective

Ottimizzare le performance delle pagine principali (Dashboard, Gestione Formazione) per ridurre i tempi di caricamento e migliorare l'esperienza utente.

Optimize the performance of main pages (Dashboard, Formation Management) to reduce loading times and improve user experience.

---

## ✅ Task da Implementare / Tasks to Implement

### 1. Query Parallele nella Dashboard / Parallel Queries in Dashboard ⚠️

**File**: `app/page.jsx`

**Problema Attuale / Current Problem**:
- 3 query Supabase eseguite in sequenza / 3 Supabase queries executed sequentially
- Tempo totale: ~1-2 secondi / Total time: ~1-2 seconds

**Soluzione / Solution**:
```javascript
// Invece di / Instead of:
const { data: layoutData } = await supabase.from('formation_layout')...
const { data: players } = await supabase.from('players')...
const { data: matches } = await supabase.from('matches')...

// Usa / Use:
const [layoutResult, playersResult, matchesResult] = await Promise.allSettled([
  supabase.from('formation_layout').select('formation').maybeSingle(),
  supabase.from('players').select('id, player_name, overall_rating, position, slot_index').order('overall_rating', { ascending: false, nullsLast: true }),
  supabase.from('matches').select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness').eq('user_id', userId).order('match_date', { ascending: false }).limit(10)
])
```

**Beneficio / Benefit**: Riduzione tempo da ~1-2s a ~0.5-1s (50% più veloce) / Time reduction from ~1-2s to ~0.5-1s (50% faster)

---

### 2. Query Parallele in Gestione Formazione / Parallel Queries in Formation Management ⚠️

**File**: `app/gestione-formazione/page.jsx`

**Problema Attuale / Current Problem**:
- 5 query Supabase eseguite in sequenza / 5 Supabase queries executed sequentially
- Tempo totale: ~2-3 secondi / Total time: ~2-3 seconds

**Soluzione / Solution**:
```javascript
// Invece di query sequenziali, usa Promise.allSettled per / Instead of sequential queries, use Promise.allSettled for:
// 1. formation_layout
// 2. playing_styles
// 3. players
// 4. coaches
// 5. team_tactical_settings
```

**Beneficio / Benefit**: Riduzione tempo da ~2-3s a ~0.8-1.2s (60% più veloce) / Time reduction from ~2-3s to ~0.8-1.2s (60% faster)

---

### 3. Caching Condiviso tra Pagine / Shared Caching Between Pages ⚠️

**Problema Attuale / Current Problem**:
- Dashboard e Gestione Formazione caricano entrambi `players` e `formation_layout` / Dashboard and Formation Management both load `players` and `formation_layout`
- Navigazione avanti/indietro = query duplicate / Forward/backward navigation = duplicate queries
- Nessun caching tra pagine / No caching between pages

**Soluzione Proposta / Proposed Solution**:
- Opzione A: React Context globale per dati condivisi / Global React Context for shared data
- Opzione B: React Query per caching automatico / React Query for automatic caching
- Opzione C: localStorage con TTL (semplice ma limitato) / localStorage with TTL (simple but limited)

**Beneficio / Benefit**: Elimina 50% query duplicate, navigazione più fluida / Eliminates 50% duplicate queries, smoother navigation

**Priorità / Priority**: Media (non critico ma migliora UX) / Medium (not critical but improves UX)

---

### 4. Sostituire `window.location.reload()` con Refetch / Replace `window.location.reload()` with Refetch ✅

**File**: `app/gestione-formazione/page.jsx`

**Problema Attuale / Current Problem**:
- 6 occorrenze di `window.location.reload()` dopo operazioni / 6 occurrences of `window.location.reload()` after operations
- Ricarica completa pagina (lento, perde stato) / Full page reload (slow, loses state)

**Soluzione / Solution**:
```javascript
// Invece di / Instead of:
window.location.reload()

// Usa / Use:
await fetchData()  // Ricarica solo dati necessari / Reload only necessary data
setShowUploadPlayerModal(false)
setUploadImages([])
```

**Occorrenze da Sostituire / Occurrences to Replace**:
- `handleAssignFromReserve` (linea ~186 / line ~186)
- `handleRemoveFromSlot` (linea ~223 / line ~223)
- `handleDeleteReserve` (linea ~260 / line ~260)
- `handleUploadPlayerToSlot` (linea ~386 / line ~386)
- `handleUploadFormation` (linea ~474 / line ~474)
- `handleUploadReserve` (linea ~593 / line ~593)

**Beneficio / Benefit**: ~1-3 secondi risparmiati per operazione, migliore UX / ~1-3 seconds saved per operation, better UX

**Priorità / Priority**: Alta (già documentato in `ANALISI_COSTI_E_OTTIMIZZAZIONI.md`) / High (already documented in `ANALISI_COSTI_E_OTTIMIZZAZIONI.md`)

---

## 📊 Stima Benefici / Estimated Benefits

### Con Task 1 + 2 (Query Parallele) / With Tasks 1 + 2 (Parallel Queries):
- Dashboard: 50% più veloce / 50% faster
- Gestione Formazione: 60% più veloce / Formation Management: 60% faster
- **Tempo totale risparmiato / Total time saved**: ~1-2 secondi per navigazione / ~1-2 seconds per navigation

### Con Task 3 (Caching) / With Task 3 (Caching):
- Elimina 50% query duplicate / Eliminates 50% duplicate queries
- Navigazione avanti/indietro istantanea (dati già in cache) / Forward/backward navigation instant (data already cached)

### Con Task 4 (Refetch invece di Reload) / With Task 4 (Refetch instead of Reload):
- ~1-3 secondi risparmiati per ogni operazione / ~1-3 seconds saved per operation
- UX significativamente migliorata / Significantly improved UX
- Stato componenti preservato / Component state preserved

---

## 🎯 Priorità Implementazione / Implementation Priority

1. **Task 4** (Refetch) - Alta priorità, già documentato / High priority, already documented
2. **Task 1** (Dashboard parallele) - Media priorità, migliora UX principale / Medium priority, improves main UX
3. **Task 2** (Gestione Formazione parallele) - Media priorità / Medium priority
4. **Task 3** (Caching) - Bassa priorità, ottimizzazione avanzata / Low priority, advanced optimization

---

## ⚠️ RISCHI DI ROTTURA E COERENZA / BREAKING RISKS AND CONSISTENCY

### 🔴 RISCHI CRITICI / CRITICAL RISKS

#### 1. **Promise.all() - Gestione Errori / Error Handling**

**Rischio / Risk**: Se una query fallisce, `Promise.all()` fallisce completamente (fail-fast) / If one query fails, `Promise.all()` fails completely (fail-fast)

**Problema / Problem**:
```javascript
// ❌ SBAGLIATO / WRONG - Se una query fallisce, tutte falliscono / If one query fails, all fail
const [layoutResult, playersResult, matchesResult] = await Promise.all([...])
```

**Soluzione Sicura / Safe Solution**:
```javascript
// ✅ CORRETTO / CORRECT - Gestione errori individuale / Individual error handling
const [layoutResult, playersResult, matchesResult] = await Promise.allSettled([
  supabase.from('formation_layout').select('formation').maybeSingle(),
  supabase.from('players').select('...').order('...'),
  supabase.from('matches').select('...').eq('user_id', userId).limit(10)
])

// Estrai dati con gestione errori / Extract data with error handling
const layoutData = layoutResult.status === 'fulfilled' ? layoutResult.value.data : null
const players = playersResult.status === 'fulfilled' ? playersResult.value.data : []
const matches = matchesResult.status === 'fulfilled' ? matchesResult.value.data : []

// Gestisci errori individuali / Handle individual errors
if (layoutResult.status === 'rejected') {
  console.warn('[Dashboard] Error loading layout:', layoutResult.reason)
}
if (playersResult.status === 'rejected') {
  throw new Error(playersResult.reason?.message || 'Error loading players')
}
if (matchesResult.status === 'rejected') {
  console.warn('[Dashboard] Error loading matches:', matchesResult.reason)
}
```

**Coerenza / Consistency**: Mantieni lo stesso comportamento di gestione errori del codice esistente (alcune query sono critiche, altre possono fallire silenziosamente) / Maintain the same error handling behavior as existing code (some queries are critical, others can fail silently)

---

#### 2. **Session e userId - Dipendenze / Session and userId - Dependencies**

**Rischio / Risk**: `userId` deve essere disponibile PRIMA delle query parallele che lo richiedono / `userId` must be available BEFORE parallel queries that require it

**Problema / Problem**:
```javascript
// ❌ SBAGLIATO / WRONG - userId non disponibile nelle query parallele / userId not available in parallel queries
const [layoutResult, playersResult, matchesResult] = await Promise.all([
  supabase.from('formation_layout')...,
  supabase.from('players')...,
  supabase.from('matches').eq('user_id', userId)... // userId non definito! / userId not defined!
])
```

**Soluzione Sicura / Safe Solution**:
```javascript
// ✅ CORRETTO / CORRECT - Ottieni session PRIMA di Promise.all / Get session BEFORE Promise.all
const { data: session, error: sessionError } = await supabase.auth.getSession()

if (sessionError || !session?.session) {
  router.push('/login')
  return
}

const userId = session.session.user.id

// Ora userId è disponibile per le query parallele / Now userId is available for parallel queries
const [layoutResult, playersResult, matchesResult] = await Promise.allSettled([
  supabase.from('formation_layout').select('formation').maybeSingle(),
  supabase.from('players').select('...').order('...'),
  supabase.from('matches').select('...').eq('user_id', userId).limit(10)
])
```

**Coerenza / Consistency**: Mantieni la stessa sequenza: `getSession()` → `userId` → query parallele / Maintain the same sequence: `getSession()` → `userId` → parallel queries

---

#### 3. **RLS (Row Level Security) - Autenticazione / Authentication**

**Rischio / Risk**: Le query parallele devono usare lo stesso client Supabase autenticato / Parallel queries must use the same authenticated Supabase client

**Problema / Problem**:
```javascript
// ❌ SBAGLIATO / WRONG - Client non autenticato / Unauthenticated client
const unauthenticatedClient = createClient(url, key)
const [result1, result2] = await Promise.all([...]) // RLS bloccherà le query / RLS will block queries
```

**Soluzione Sicura / Safe Solution**:
```javascript
// ✅ CORRETTO / CORRECT - Usa lo stesso client autenticato / Use the same authenticated client
// Il client `supabase` è già autenticato dalla sessione / The `supabase` client is already authenticated by session
const [layoutResult, playersResult] = await Promise.allSettled([
  supabase.from('formation_layout')..., // Usa supabase (autenticato) / Use supabase (authenticated)
  supabase.from('players')...           // Usa supabase (autenticato) / Use supabase (authenticated)
])
```

**Coerenza / Consistency**: 
- ✅ Usa sempre `supabase` (client globale autenticato) / Always use `supabase` (global authenticated client)
- ✅ NON creare nuovi client nelle query parallele / DO NOT create new clients in parallel queries
- ✅ RLS funziona automaticamente con `auth.uid()` se client è autenticato / RLS works automatically with `auth.uid()` if client is authenticated

---

#### 4. **Filtri Espliciti vs RLS / Explicit Filters vs RLS**

**Rischio / Risk**: Alcune query hanno filtri espliciti `eq('user_id', userId)` per sicurezza extra / Some queries have explicit filters `eq('user_id', userId)` for extra security

**Problema / Problem**:
```javascript
// Query matches ha filtro esplicito / Matches query has explicit filter
.eq('user_id', userId) // Filtro esplicito per sicurezza / Explicit filter for security
```

**Soluzione Sicura / Safe Solution**:
```javascript
// ✅ MANTIENI i filtri espliciti anche nelle query parallele / KEEP explicit filters in parallel queries too
const [layoutResult, playersResult, matchesResult] = await Promise.allSettled([
  supabase.from('formation_layout').select('formation').maybeSingle(),
  // players: RLS basta (auth.uid() = user_id) / players: RLS is enough (auth.uid() = user_id)
  supabase.from('players').select('...').order('...'),
  // matches: MANTIENI filtro esplicito (già presente nel codice) / matches: KEEP explicit filter (already in code)
  supabase.from('matches')
    .select('...')
    .eq('user_id', userId) // ✅ MANTIENI questo filtro / KEEP this filter
    .order('match_date', { ascending: false })
    .limit(10)
])
```

**Coerenza / Consistency**: 
- ✅ Mantieni tutti i filtri espliciti esistenti / Keep all existing explicit filters
- ✅ Non rimuovere `.eq('user_id', userId)` anche se RLS lo gestisce / Do not remove `.eq('user_id', userId)` even if RLS handles it
- ✅ Doppia sicurezza: RLS + filtro esplicito / Double security: RLS + explicit filter

---

### 🟡 RISCHI MEDI / MEDIUM RISKS

#### 5. **Ordine di Esecuzione - Dipendenze Logiche / Execution Order - Logical Dependencies**

**Rischio / Risk**: Alcune query potrebbero avere dipendenze logiche (non tecniche) / Some queries might have logical dependencies (not technical)

**Problema / Problem**: 
- Se `formation_layout` fallisce, `stats.formation` sarà `null` (OK) / If `formation_layout` fails, `stats.formation` will be `null` (OK)
- Se `players` fallisce, `stats` non può essere calcolato (CRITICO) / If `players` fails, `stats` cannot be calculated (CRITICAL)
- Se `matches` fallisce, mostra lista vuota (OK) / If `matches` fails, show empty list (OK)

**Soluzione Sicura / Safe Solution**:
```javascript
// ✅ Gestisci errori in base alla criticità / Handle errors based on criticality
const [layoutResult, playersResult, matchesResult] = await Promise.allSettled([...])

// Layout: opzionale, può fallire silenziosamente / Layout: optional, can fail silently
const layoutData = layoutResult.status === 'fulfilled' 
  ? layoutResult.value.data 
  : null

// Players: CRITICO, se fallisce lancia errore / Players: CRITICAL, if fails throw error
if (playersResult.status === 'rejected') {
  throw new Error(playersResult.reason?.message || t('coachDataLoadError'))
}
const players = playersResult.value.data || []

// Matches: opzionale, può fallire silenziosamente / Matches: optional, can fail silently
const matches = matchesResult.status === 'fulfilled'
  ? matchesResult.value.data || []
  : []
```

**Coerenza / Consistency**: Mantieni la stessa logica di gestione errori del codice esistente / Maintain the same error handling logic as existing code

---

#### 6. **Caching - Invalidation e Stale Data / Cache Invalidation and Stale Data**

**Rischio / Risk**: Cache può mostrare dati obsoleti dopo modifiche / Cache can show stale data after modifications

**Problema / Problem**:
```javascript
// Cache mostra dati vecchi dopo upload giocatore / Cache shows old data after player upload
const cachedPlayers = localStorage.getItem('players') // Dati vecchi! / Old data!
```

**Soluzione Sicura / Safe Solution**:
```javascript
// ✅ Invalida cache dopo operazioni di scrittura / Invalidate cache after write operations
const handleUploadPlayer = async () => {
  // ... upload ...
  
  // Invalida cache / Invalidate cache
  localStorage.removeItem('players')
  localStorage.removeItem('formation_layout')
  
  // Ricarica dati freschi / Reload fresh data
  await fetchData()
}
```

**Coerenza / Consistency**:
- ✅ Invalida cache dopo: INSERT, UPDATE, DELETE / Invalidate cache after: INSERT, UPDATE, DELETE
- ✅ Usa TTL (Time To Live) per cache automatica / Use TTL (Time To Live) for automatic cache
- ✅ Considera React Query per invalidation automatica / Consider React Query for automatic invalidation

---

#### 7. **Refetch invece di Reload - Stato Componenti / Refetch instead of Reload - Component State**

**Rischio / Risk**: `fetchData()` potrebbe non aggiornare tutti gli stati / `fetchData()` might not update all states

**Problema / Problem**:
```javascript
// ❌ SBAGLIATO / WRONG - fetchData() potrebbe non resettare tutti gli stati / fetchData() might not reset all states
await fetchData()
// Modal ancora aperto? Upload images ancora presenti? / Modal still open? Upload images still present?
```

**Soluzione Sicura / Safe Solution**:
```javascript
// ✅ CORRETTO / CORRECT - Reset completo stati dopo refetch / Complete state reset after refetch
await fetchData()

// Reset stati UI / Reset UI states
setShowUploadPlayerModal(false)
setUploadImages([])
setError(null)
setUploadingPlayer(false)
```

**Coerenza / Consistency**: 
- ✅ Dopo ogni operazione, reset tutti gli stati UI / After each operation, reset all UI states
- ✅ Chiudi modali / Close modals
- ✅ Pulisci form/upload / Clear form/upload
- ✅ Resetta loading states / Reset loading states

---

### 🟢 RISCHI BASSI / LOW RISKS

#### 8. **Performance - Troppe Query Parallele / Too Many Parallel Queries**

**Rischio / Risk**: Troppe query parallele possono saturare connessioni / Too many parallel queries can saturate connections

**Problema / Problem**: 10+ query parallele potrebbero essere troppo / 10+ parallel queries might be too many

**Soluzione / Solution**: 
- ✅ Limita a 5-7 query parallele per batch / Limit to 5-7 parallel queries per batch
- ✅ Raggruppa query correlate / Group related queries
- ✅ Usa batch separati se necessario / Use separate batches if necessary

---

#### 9. **TypeScript - Tipi Promise.allSettled / Promise.allSettled Types**

**Rischio / Risk**: TypeScript potrebbe non inferire correttamente i tipi / TypeScript might not correctly infer types

**Soluzione / Solution**:
```typescript
// ✅ Tipi espliciti per Promise.allSettled / Explicit types for Promise.allSettled
type LayoutResult = { data: { formation: string } | null, error: null }
type PlayersResult = { data: Player[] | null, error: PostgrestError | null }
type MatchesResult = { data: Match[] | null, error: PostgrestError | null }

const results = await Promise.allSettled([...]) as [
  PromiseSettledResult<LayoutResult>,
  PromiseSettledResult<PlayersResult>,
  PromiseSettledResult<MatchesResult>
]
```

---

## ✅ CHECKLIST COERENZA / CONSISTENCY CHECKLIST

Prima di implementare, verifica / Before implementing, verify:

### Query Parallele / Parallel Queries
- [ ] `getSession()` chiamato PRIMA di `Promise.all()` / `getSession()` called BEFORE `Promise.all()`
- [ ] `userId` disponibile per query che lo richiedono / `userId` available for queries that require it
- [ ] Usa `Promise.allSettled()` invece di `Promise.all()` per gestione errori / Use `Promise.allSettled()` instead of `Promise.all()` for error handling
- [ ] Mantieni tutti i filtri espliciti esistenti (`.eq('user_id', userId)`) / Keep all existing explicit filters (`.eq('user_id', userId)`)
- [ ] Usa lo stesso client `supabase` autenticato / Use the same authenticated `supabase` client
- [ ] Gestisci errori individuali in base alla criticità / Handle individual errors based on criticality

### Refetch invece di Reload / Refetch instead of Reload
- [ ] Reset tutti gli stati UI dopo operazione / Reset all UI states after operation
- [ ] Chiudi modali / Close modals
- [ ] Pulisci form/upload / Clear form/upload
- [ ] Resetta loading states / Reset loading states
- [ ] Mantieni gestione errori esistente / Maintain existing error handling

### Caching
- [ ] Invalida cache dopo INSERT/UPDATE/DELETE / Invalidate cache after INSERT/UPDATE/DELETE
- [ ] Usa TTL per cache automatica / Use TTL for automatic cache
- [ ] Considera React Query per invalidation automatica / Consider React Query for automatic invalidation
- [ ] Testa scenario: modifica dati → naviga → torna → cache aggiornata? / Test scenario: modify data → navigate → return → cache updated?

---

## 🧪 TEST DA FARE / TESTS TO PERFORM

### Test Query Parallele / Parallel Queries Tests
1. ✅ Test con tutte le query che riescono / Test with all successful queries
2. ✅ Test con una query che fallisce (Promise.allSettled gestisce?) / Test with one failing query (does Promise.allSettled handle it?)
3. ✅ Test con session scaduta (redirect a login?) / Test with expired session (redirect to login?)
4. ✅ Test con RLS (query bloccate se non autenticato?) / Test with RLS (queries blocked if not authenticated?)
5. ✅ Test performance (effettivamente più veloce?) / Performance test (actually faster?)

### Test Refetch / Refetch Tests
1. ✅ Test upload giocatore → dati aggiornati senza reload? / Test player upload → data updated without reload?
2. ✅ Test modale chiusa dopo operazione? / Test modal closed after operation?
3. ✅ Test stati reset correttamente? / Test states reset correctly?
4. ✅ Test error handling preservato? / Test error handling preserved?

### Test Caching / Caching Tests
1. ✅ Test cache hit (naviga avanti/indietro → query duplicate?) / Test cache hit (navigate forward/backward → duplicate queries?)
2. ✅ Test cache invalidation (modifica dati → cache aggiornata?) / Test cache invalidation (modify data → cache updated?)
3. ✅ Test TTL (cache scade dopo X minuti?) / Test TTL (cache expires after X minutes?)

---

## 📝 Note / Notes

- Le query parallele sono sicure: Supabase supporta connessioni multiple / Parallel queries are safe: Supabase supports multiple connections
- Il caching può essere implementato incrementally (prima Context semplice, poi React Query se necessario) / Caching can be implemented incrementally (first simple Context, then React Query if needed)
- Testare performance prima/dopo per validare miglioramenti / Test performance before/after to validate improvements
- **IMPORTANTE / IMPORTANT**: Usa sempre `Promise.allSettled()` invece di `Promise.all()` per gestione errori robusta / Always use `Promise.allSettled()` instead of `Promise.all()` for robust error handling

---

## 🔗 Riferimenti / References

- `ANALISI_COSTI_E_OTTIMIZZAZIONI.md` - Analisi completa problemi performance / Complete performance issues analysis
- `PRIORITA_CORREZIONI_PROFILAZIONE.md` - Priorità correzioni generali / General corrections priorities
- `AUDIT_SICUREZZA.md` - Verifica RLS e autenticazione / RLS and authentication verification
- `VERIFICA_SUPABASE_DETTAGLIATA.md` - Schema database e RLS policies / Database schema and RLS policies
