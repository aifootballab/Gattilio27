# 🔧 Fix Problemi Critici Trovati
## Azioni Immediate da Eseguire

**Data**: 2025-01-14  
**Status**: 🟡 **AZIONI RICHIESTE**

---

## 🔴 PROBLEMI CRITICI

### **1. Tabella `coaching_sessions` Mancante** ✅ **RISOLTO**

**Problema**: 
- Tabella `coaching_sessions` usata da `voice-coaching-gpt/index.ts` ma non creata in migration
- Causa errori quando Edge Function cerca di salvare/recuperare sessioni

**Fix**: 
- ✅ Creata migration `007_add_coaching_sessions.sql`
- ✅ Tabella con RLS configurato
- ✅ Indici ottimizzati

**Azione Richiesta**:
```bash
# Eseguire migration in Supabase Dashboard → SQL Editor
# Oppure via CLI:
supabase db push
```

---

### **2. Storage Buckets Inconsistenti** ⚠️ **DA VERIFICARE**

**Problema**:
- Due bucket diversi usati nel codice:
  - `player-screenshots` (usato da `visionService.js` e Edge Functions)
  - `screenshots` (usato da `VoiceCoachingPanel.jsx` e `realtimeCoachingService.js`)

**Analisi**:
- ✅ `player-screenshots` esiste (creato in migration `002_create_storage_bucket.sql`)
- ❓ `screenshots` da verificare se esiste

**Fix Proposto**:
1. **Opzione A**: Usare solo `player-screenshots` con sottocartelle
   - `player-screenshots/chat-images/` per immagini chat
   - `player-screenshots/player-profiles/` per profili giocatori
   - `player-screenshots/formations/` per formazioni

2. **Opzione B**: Creare bucket `screenshots` e migrare tutto lì
   - Più generico
   - Sottocartelle: `chat-images/`, `player-profiles/`, `formations/`

**Raccomandazione**: **Opzione A** (usare `player-screenshots` esistente)

**Azione Richiesta**:
1. Verificare se bucket `screenshots` esiste in Supabase Dashboard
2. Se non esiste, aggiornare `VoiceCoachingPanel.jsx` per usare `player-screenshots`
3. Aggiornare `realtimeCoachingService.js` (se ancora usato)

---

## 🟡 PROBLEMI MEDI

### **3. Servizio Obsoleto `realtimeCoachingService.js`** ⚠️ **DA RIMUOVERE**

**Problema**:
- `realtimeCoachingService.js` (HTTP REST) obsoleto
- Sostituito da `realtimeCoachingServiceV2.js` (WebSocket)
- Ancora presente nel codice ma non usato

**Fix**:
- ✅ Verificare che non sia importato da nessun componente
- ❌ Rimuovere file se non usato
- 📝 Aggiungere commento `@deprecated` se mantenuto per riferimento

**Azione Richiesta**:
```bash
# Verificare usi:
grep -r "realtimeCoachingService" --exclude="realtimeCoachingServiceV2.js"

# Se non usato, rimuovere:
# rm services/realtimeCoachingService.js
```

---

### **4. File Duplicati in `src/`** ⚠️ **DA VERIFICARE**

**Problema**:
- File duplicati in `src/` che potrebbero non essere usati
- Next.js ignora `src/` per default (usa root)

**File Duplicati**:
- `src/services/visionService.js` (duplicato di `services/visionService.js`)
- `src/contexts/RosaContext.jsx` (duplicato di `contexts/RosaContext.tsx`?)

**Fix**:
- ✅ Verificare se `src/` viene usato
- ❌ Rimuovere duplicati se non usati

**Azione Richiesta**:
1. Verificare se Next.js config usa `src/`
2. Se no, rimuovere `src/` o ignorarlo

---

## ✅ AZIONI COMPLETATE

1. ✅ **Creata migration `007_add_coaching_sessions.sql`**
   - Tabella `coaching_sessions` con RLS
   - Indici ottimizzati
   - Trigger per `updated_at`

2. ✅ **Documentazione verifica completa**
   - `VERIFICA_COMPLETA_ENDPOINT_STRUTTURA.md` creato
   - Tutti gli endpoint mappati
   - Conflitti identificati

---

## 📋 CHECKLIST AZIONI

### **Immediate (Oggi)**

- [ ] Eseguire migration `007_add_coaching_sessions.sql` in Supabase
- [ ] Verificare esistenza bucket `screenshots` in Supabase Dashboard
- [ ] Aggiornare `VoiceCoachingPanel.jsx` per usare bucket corretto

### **Breve Termine (Questa Settimana)**

- [ ] Rimuovere `realtimeCoachingService.js` se non usato
- [ ] Verificare e rimuovere file duplicati in `src/`
- [ ] Standardizzare storage buckets

### **Medio Termine (Prossime Settimane)**

- [ ] Documentare functions non usate
- [ ] Pulizia codice legacy
- [ ] Test completo sistema

---

## 🔗 RIFERIMENTI

- **Migration**: `supabase/migrations/007_add_coaching_sessions.sql`
- **Verifica Completa**: `VERIFICA_COMPLETA_ENDPOINT_STRUTTURA.md`
- **Documentazione Endpoint**: `ENDPOINTS_COMPLETE_REFERENCE.md`

---

**Prossimo Step**: Eseguire migration e verificare bucket storage.
