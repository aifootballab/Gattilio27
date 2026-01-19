# VERIFICA COMPATIBILITÀ: Sistema Slot Foto vs Supabase Attuale

**Data:** 2026-01-19  
**Obiettivo:** Verificare funzioni, trigger, policy RLS esistenti per compatibilità con sistema slot foto

---

## 🔍 ELEMENTI SUPABASE ESISTENTI

### 1. Funzioni/Stored Procedures

**Funzione trovata:**
- `update_updated_at_column` - Aggiorna automaticamente campo `updated_at`

**Impatto:**
- ✅ **COMPATIBILE** - Funzione standard per aggiornare timestamp
- ✅ Non interferisce con `photo_slots` (aggiorna solo `updated_at`)

---

### 2. Trigger

**Trigger trovato:**
- `update_players_updated_at` - Trigger su UPDATE tabella `players`
- Esegue `update_updated_at_column()` automaticamente

**Impatto:**
- ✅ **COMPATIBILE** - Trigger standard per aggiornare `updated_at` su ogni UPDATE
- ✅ Funzionerà automaticamente con UPDATE `photo_slots`
- ✅ Non interferisce con logica business (aggiorna solo timestamp)

**Esempio comportamento:**
```sql
-- UPDATE con photo_slots
UPDATE players 
SET photo_slots = '{"statistiche": true}',
    base_stats = '{"attacking": {...}}'
WHERE id = '...';

-- Trigger esegue automaticamente:
-- updated_at = NOW()  ✅
```

---

### 3. Policy RLS (Row Level Security)

**Policy esistenti su `players`:**

| Policy | Comando | Verifica | Status |
|--------|---------|----------|--------|
| "Users can view own players" | SELECT | `auth.uid() = user_id` | ✅ OK |
| "Users can insert own players" | INSERT | `auth.uid() = user_id` | ✅ OK |
| "Users can update own players" | UPDATE | `auth.uid() = user_id` | ✅ OK |
| "Users can delete own players" | DELETE | `auth.uid() = user_id` | ✅ OK |

**Impatto:**
- ✅ **TUTTE COMPATIBILI** - Policy esistenti proteggono UPDATE
- ✅ UPDATE `photo_slots` funzionerà correttamente con RLS
- ✅ Solo proprietario può aggiornare (`user_id = auth.uid()`)

**Nota Policy UPDATE:**
- `qual`: `auth.uid() = user_id` - Verifica utente può aggiornare (USING clause)
- `with_check`: `null` - Nessuna verifica aggiuntiva su dati inseriti

**Esempio comportamento:**
```javascript
// Frontend: UPDATE con photo_slots (con query dirette o API route)
await supabase
  .from('players')
  .update({ photo_slots: {...} })
  .eq('id', playerId)

// RLS verifica automaticamente:
// auth.uid() = user_id  ✅ Se true, UPDATE permesso
```

---

### 4. Estensioni PostgreSQL

**Estensioni installate:**
- `pgcrypto` (1.3) - Funzioni crittografiche
- `pg_stat_statements` (1.11) - Tracking statistiche query
- `uuid-ossp` (1.1) - Generazione UUID
- `supabase_vault` (0.3.1) - Vault Supabase
- `pg_graphql` (1.5.11) - GraphQL support

**Impatto:**
- ✅ **TUTTE COMPATIBILI** - Nessuna interferenza con `photo_slots`
- ✅ `uuid-ossp` usato per generare ID (non interferisce)
- ✅ Nessuna estensione che modifica UPDATE behavior

---

## ✅ VERIFICA COMPATIBILITÀ

### Aggiunta Campo `photo_slots` JSONB

**Comportamento atteso:**
```sql
-- Migration
ALTER TABLE players 
ADD COLUMN photo_slots JSONB DEFAULT '{}'::jsonb;
```

**Impatto funzioni esistenti:**
- ✅ `update_updated_at_column` - Non tocca `photo_slots` (aggiorna solo `updated_at`)
- ✅ **Nessun conflitto** - Funzione indipendente

**Impatto trigger esistenti:**
- ✅ `update_players_updated_at` - Non tocca `photo_slots` (aggiorna solo `updated_at`)
- ✅ **Nessun conflitto** - Trigger indipendente

**Impatto policy RLS:**
- ✅ "Users can update own players" - Protegge UPDATE `photo_slots` automaticamente
- ✅ **Nessun conflitto** - Policy esistente gestisce UPDATE

**Impatto estensioni:**
- ✅ Nessuna estensione che interferisce con JSONB o UPDATE
- ✅ **Nessun conflitto**

---

## 🎯 CONCLUSIONE

### Status Compatibilità: ✅ **TOTALE**

**Elementi esistenti:**
- ✅ Funzioni: Compatibili (non interferiscono)
- ✅ Trigger: Compatibili (non interferiscono)
- ✅ Policy RLS: Compatibili (proteggono UPDATE automaticamente)
- ✅ Estensioni: Compatibili (nessuna interferenza)

**Nuova funzionalità:**
- ✅ Aggiunta `photo_slots` JSONB - **Nessun conflitto**
- ✅ UPDATE `photo_slots` - **Funziona con RLS esistente**
- ✅ Trigger `updated_at` - **Funziona automaticamente**

**Rischio rottura codice:**
- ✅ **ZERO** - Tutti gli elementi esistenti continuano a funzionare
- ✅ **Backward compatible** - Campo `photo_slots` opzionale (default `{}`)

---

## ✅ RACCOMANDAZIONE

**Procedere con implementazione:** ✅ **SICURO**

**Motivi:**
1. ✅ Nessuna funzione/stored procedure che interferisce
2. ✅ Trigger esistente compatibile (aggiorna solo `updated_at`)
3. ✅ Policy RLS esistente protegge UPDATE automaticamente
4. ✅ Campo `photo_slots` JSONB è standard PostgreSQL (nessun conflitto)
5. ✅ Backward compatible (default `{}` non rompe codice esistente)

**Note implementazione:**
- ✅ Aggiungi `photo_slots` JSONB con default `{}`
- ✅ UPDATE funzionerà automaticamente con RLS esistente
- ✅ Trigger `updated_at` continuerà a funzionare
- ✅ Nessuna modifica necessaria a funzioni/trigger esistenti

---

**Verifica completata:** 2026-01-19  
**Status:** ✅ **COMPATIBILE** - Procedere con implementazione
