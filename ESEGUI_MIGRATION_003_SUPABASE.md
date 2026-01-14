# 🚀 Esegui Migration 003 in Supabase

**Data**: 2025-01-12  
**Status**: 📋 Script Pronto per Esecuzione  
**Istruzioni**: Copia e incolla nel Supabase Dashboard SQL Editor

---

## 📊 STEP 1: Esegui Migration 003

### **Opzione A: Supabase Dashboard (CONSIGLIATO)** 🎯

1. **Vai su Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Seleziona il tuo progetto

2. **Vai su SQL Editor**
   - Menu laterale: **SQL Editor** → **New query**

3. **Copia e incolla il contenuto completo** del file:
   ```
   supabase/migrations/003_add_gpt_realtime_support.sql
   ```

4. **Esegui la query**
   - Clicca **"Run"** o premi `Ctrl+Enter`

5. **Verifica successo**
   - Dovresti vedere: "Success. No rows returned" o messaggio di successo

---

## ✅ STEP 2: Verifica Tabelle Create

Esegui questa query per verificare che tutte le tabelle siano state create:

```sql
-- Verifica tabelle create
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'candidate_profiles',
    'heat_maps',
    'chart_data',
    'player_match_ratings',
    'squad_formations'
  )
ORDER BY table_name;
```

**Risultato atteso**: 5 righe (una per ogni tabella)

---

## ✅ STEP 3: Verifica RLS e Policies

Esegui questa query per verificare che RLS sia abilitato:

```sql
-- Verifica RLS abilitato
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'candidate_profiles',
    'heat_maps',
    'chart_data',
    'player_match_ratings',
    'squad_formations'
  )
ORDER BY tablename;
```

**Risultato atteso**: Tutte le righe con `rls_enabled = true`

---

## ✅ STEP 4: Verifica Indici

Esegui questa query per verificare che gli indici siano stati creati:

```sql
-- Verifica indici creati
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'candidate_profiles',
    'heat_maps',
    'chart_data',
    'player_match_ratings',
    'squad_formations'
  )
ORDER BY tablename, indexname;
```

**Risultato atteso**: Diversi indici per ogni tabella

---

## ⚠️ TROUBLESHOOTING

### **Errore: "relation already exists"**
- **Causa**: Le tabelle esistono già
- **Soluzione**: La migration usa `CREATE TABLE IF NOT EXISTS`, quindi è sicura da rieseguire

### **Errore: "permission denied"**
- **Causa**: Non hai i permessi necessari
- **Soluzione**: Assicurati di essere loggato come admin del progetto

### **Errore: "column already exists"**
- **Causa**: Alcune colonne esistono già
- **Soluzione**: La migration usa `ADD COLUMN IF NOT EXISTS`, quindi è sicura

---

## 📋 CHECKLIST POST-MIGRATION

- [ ] Migration 003 eseguita con successo
- [ ] 5 tabelle create (candidate_profiles, heat_maps, chart_data, player_match_ratings, squad_formations)
- [ ] RLS abilitato su tutte le tabelle
- [ ] Indici creati correttamente
- [ ] Nessun errore nei logs

---

**Status**: 🟢 **SCRIPT PRONTO** - Esegui nel Supabase Dashboard SQL Editor
