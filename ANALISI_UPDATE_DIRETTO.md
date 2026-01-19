# ANALISI: UPDATE con Query Dirette vs API Route

**Data:** 2026-01-19  
**Contesto:** Valutazione uso query dirette per UPDATE giocatori esistenti

---

## 🔍 SITUAZIONE ATTUALE

### Policy RLS UPDATE (verificata con MCP)
```sql
"Users can update own players" 
USING (auth.uid() = user_id)
```
✅ **RLS policy UPDATE esiste** - Tecnicamente UPDATE diretto è possibile

### Codice Attuale
- **READ**: Query dirette (✅ funziona)
- **CREATE**: API route `save-player` (✅ INSERT sempre nuovo record)
- **UPDATE**: ❌ **NON ESISTE** - Serve creare nuova API route

---

## ⚠️ UPDATE CON QUERY DIRETTE: RISCHI

### 1. Logica Business Complessa

**Scenario:**
```javascript
// Frontend: aggiorna giocatore esistente con dati da foto Statistiche
const { data, error } = await supabase
  .from('players')
  .update({ base_stats: {...}, overall_rating: 99 })
  .eq('id', playerId)
```

**Problemi:**
- ❌ **Merge dati:** Come unisco `base_stats` nuovi con esistenti?
- ❌ **Validazione:** Devo verificare `photo_slots.statistiche = false` prima?
- ❌ **Coerenza:** Devo aggiornare `photo_slots.statistiche = true` insieme?

**Soluzione API Route:**
```javascript
// API Route gestisce logica business
if (existingPlayer.photo_slots?.statistiche) {
  // Già presente → sostituisce o merge?
}
const updated = mergePlayerData(existingPlayer, newStats)
await supabase.from('players').update(updated).eq('id', playerId)
```

**Verdetto:** ❌ **Query dirette NON gestiscono merge/validazione** - Serve API route

---

### 2. Sicurezza e Validazione

**Query Dirette (RLS protegge ma...):**
```javascript
// Frontend
await supabase
  .from('players')
  .update({ base_stats: {...} })
  .eq('id', playerId)  // RLS verifica user_id = auth.uid()
```

**Rischi:**
- ✅ RLS blocca UPDATE di giocatori di altri utenti
- ⚠️ Ma... nessuna validazione dati server-side
- ⚠️ Frontend può inviare dati malformati
- ⚠️ Nessun controllo logico (es. `photo_slots` coerente)

**API Route (validazione server-side):**
```javascript
// Verifica user_id
if (existingPlayer.user_id !== userId) {
  return 403  // Bloccato prima del DB
}
// Valida dati
if (!validateStats(newStats)) {
  return 400  // Errore validazione
}
// Merge sicuro
const updated = safeMerge(existingPlayer, newStats)
```

**Verdetto:** ⚠️ **Query dirette meno sicure** - Serve validazione server-side

---

### 3. Gestione Errori e Logging

**Query Dirette:**
- ❌ Errori generici client-side
- ❌ Nessun logging centralizzato
- ❌ Difficile debug in production

**API Route:**
- ✅ Logging strutturato server-side
- ✅ Error handling enterprise-grade
- ✅ Monitoring Vercel

**Verdetto:** ⚠️ **Query dirette meno tracciabili** - Serve logging server-side

---

## ✅ SOLUZIONE IBRIDA CONSIGLIATA

### Architettura Finale:

| Operazione | Metodo | Motivo |
|-----------|--------|--------|
| **READ** (get-players) | Query Dirette ✅ | RLS protezione sufficiente, scalabile |
| **CREATE** (new player) | API Route ✅ | Business logic (lookup playing_style) |
| **UPDATE** (completa giocatore) | API Route ✅ | Merge dati, validazione, sicurezza |

---

## 🔧 IMPLEMENTAZIONE UPDATE API ROUTE

### `PATCH /api/supabase/update-player/[id]/route.js`

**Funzionalità:**
1. Verifica autenticazione (`validateToken`)
2. Verifica `user_id` (solo proprietario può aggiornare)
3. Recupera giocatore esistente
4. Merge dati nuovi con esistenti (logica business)
5. Aggiorna `photo_slots` (es. `statistiche: true`)
6. UPDATE record con dati merged

**Vantaggi:**
- ✅ Business logic centralizzata (merge, validazione)
- ✅ Sicurezza (validazione server-side)
- ✅ Logging strutturato
- ✅ Gestione errori enterprise-grade

---

## 📊 RISCHI ROTTURA CODICE

### 1. Aggiunta Campo `photo_slots`

**Rischio:** ⚠️ **MEDIO** - Richiede migrazione DB

**Mitigazione:**
```sql
-- Migration: Aggiungi photo_slots (default vuoto)
ALTER TABLE players 
ADD COLUMN photo_slots JSONB DEFAULT '{}'::jsonb;

-- Backward compatible: Giocatori esistenti hanno photo_slots = {}
```

**Compatibilità:**
- ✅ Giocatori esistenti: `photo_slots = {}` (compatibile)
- ✅ Query esistenti: Funzionano (campo opzionale)
- ✅ Frontend: Può verificare `photo_slots?.statistiche` (safe)

**Verdetto:** ✅ **Backward compatible** - Non rompe codice esistente

---

### 2. Modifica `save-player` API

**Rischio:** ⚠️ **BASSO** - Se manteniamo backward compatible

**Scenario attuale:**
- `save-player` fa sempre INSERT (nuovo record)
- Upload page usa sempre `save-player` (INSERT)

**Nuovo scenario:**
- `save-player` continua a fare INSERT (non cambia)
- Nuova `update-player` API fa UPDATE (non conflitta)

**Mitigazione:**
- ✅ `save-player` rimane identico (solo INSERT)
- ✅ `update-player` è nuova API (non tocca codice esistente)
- ✅ Upload page continua a usare `save-player` (non cambia)

**Verdetto:** ✅ **Nessuna rottura** - Nuova API separata

---

### 3. Nuova Pagina `/giocatore/[id]`

**Rischio:** ✅ **ZERO** - Nuova pagina, non tocca codice esistente

**Verdetto:** ✅ **Nessuna rottura**

---

## 🎯 CONCLUSIONE

### Query Dirette per UPDATE: ❌ **NON CONSIGLIATO**

**Motivi:**
1. ❌ Merge dati complesso (richiede logica server-side)
2. ⚠️ Sicurezza: validazione server-side necessaria
3. ⚠️ Logging: tracking centralizzato necessario

### Soluzione: ✅ **API ROUTE per UPDATE**

**Architettura Finale:**
- **READ**: Query Dirette (✅ RLS sufficiente)
- **CREATE**: API Route (✅ Business logic)
- **UPDATE**: API Route (✅ Business logic + sicurezza)

**Rischio Rottura Codice:** ✅ **MINIMO** (backward compatible)

---

## ✅ RACCOMANDAZIONE

**Implementare:**
1. ✅ Mantieni query dirette per READ (già fatto)
2. ✅ Mantieni `save-player` per CREATE (già fatto)
3. ✅ Crea nuova `update-player` API per UPDATE (nuova, non rompe niente)
4. ✅ Aggiungi `photo_slots` JSONB con default `{}` (backward compatible)

**Risultato:** ✅ **Zero rottura codice esistente**
