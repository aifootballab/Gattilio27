# ANALISI: Costi Refresh Pagina vs OpenAI

**Data:** 2026-01-19  
**Obiettivo:** Chiarire cosa costa e cosa no (refresh pagina vs OpenAI)

---

## 💰 COSA COSTA E COSA NO

### ✅ GRATIS - Refresh Pagina (Query Dirette Supabase)

**Cosa succede:**
- Cliente fa refresh pagina → Frontend carica dati
- Query diretta Supabase: `SELECT * FROM players WHERE user_id = ...`

**Costo:**
- ✅ **GRATIS** (o incluso nel piano Supabase Free)
- Supabase Free Plan: 500MB database + 2GB bandwidth/mese
- Query dirette (READ) → Usa bandwidth Supabase, ma **NO costi OpenAI**

**Esempio:**
```javascript
// Refresh pagina - Query diretta Supabase
const { data: titolari } = await supabase
  .from('players')
  .select('*')
  .gte('slot_index', 0)
  .lte('slot_index', 10)

// COSTO: $0 (gratis - usa solo bandwidth Supabase)
// OPENAI: NO chiamata → $0
```

---

### 💵 COSTA - Chiamate OpenAI (Estrazione Foto)

**Cosa succede:**
- Cliente carica foto → API chiama OpenAI Vision
- `POST /api/extract-formation` o `POST /api/extract-player`

**Costo:**
- ⚠️ **SI PAGA** (~$0.01 - $0.05 per chiamata OpenAI)
- Costo OpenAI per analisi foto (non Supabase)

**Esempio:**
```javascript
// Carica foto formazione - Chiamata OpenAI
const res = await fetch('/api/extract-formation', {
  method: 'POST',
  body: JSON.stringify({ imageDataUrl: '...' })
})

// COSTO: ~$0.01 - $0.05 (OpenAI Vision API)
// SUPABASE: Query salvataggio → Gratis (incluse nel piano)
```

---

## 📊 TABELLA COSTI CHIARA

| Azione | Tipo Chiamata | Costo OpenAI | Costo Supabase |
|--------|---------------|--------------|----------------|
| **Refresh Pagina** | Query diretta Supabase (READ) | $0 | $0 (incluso Free) |
| **Lista Giocatori** | Query diretta Supabase (READ) | $0 | $0 (incluso Free) |
| **Carica Foto Formazione** | API Route → OpenAI Vision | ~$0.01-0.05 | $0 (incluso Free) |
| **Carica Foto Card** | API Route → OpenAI Vision | ~$0.01-0.03 | $0 (incluso Free) |
| **Salva Giocatore** | API Route (WRITE) | $0 | $0 (incluso Free) |
| **Swap Formazione** | API Route (UPDATE) | $0 | $0 (incluso Free) |

**Conclusione:**
- ✅ **Refresh pagina = GRATIS** (solo Supabase READ, no OpenAI)
- ⚠️ **Carica foto = COSTA** (~$0.01-0.05 per OpenAI)

---

## 🎯 QUANDO SI PAGA COSA

### Scenario 1: Cliente Fa Refresh Pagina

**Workflow:**
1. Cliente apre `/lista-giocatori`
2. Frontend carica dati: `supabase.from('players').select('*')`
3. Query diretta Supabase (READ)
4. Nessuna chiamata OpenAI

**Costo:**
- OpenAI: $0 (no chiamata)
- Supabase: $0 (bandwidth incluso Free Plan)
- **TOTALE: $0**

---

### Scenario 2: Cliente Carica Foto Formazione

**Workflow:**
1. Cliente carica foto formazione
2. Frontend chiama: `POST /api/extract-formation`
3. API Route chiama OpenAI Vision
4. OpenAI analizza foto → Estrae 11 giocatori
5. API Route salva in Supabase (WRITE)

**Costo:**
- OpenAI: ~$0.01 - $0.05 (una chiamata Vision API)
- Supabase: $0 (bandwidth incluso Free Plan)
- **TOTALE: ~$0.01 - $0.05**

---

### Scenario 3: Cliente Carica Foto Card Singola

**Workflow:**
1. Cliente carica foto card (statistiche, abilità, booster)
2. Frontend chiama: `POST /api/extract-player`
3. API Route chiama OpenAI Vision
4. OpenAI analizza foto → Estrae dati giocatore
5. API Route salva in Supabase (UPDATE)

**Costo:**
- OpenAI: ~$0.01 - $0.03 (una chiamata Vision API)
- Supabase: $0 (bandwidth incluso Free Plan)
- **TOTALE: ~$0.01 - $0.03**

---

## 💡 COSTI SUPABASE (Bonus Info)

### Free Plan Supabase:
- ✅ Database: 500MB
- ✅ Bandwidth: 2GB/mese
- ✅ API Requests: Unlimited (rate limited)

### Query Dirette (READ):
- ✅ Gratis (incluse nel Free Plan)
- ✅ Usa bandwidth (2GB/mese = ~1000 refresh/giorno)
- ✅ Rate limit: ~100 req/sec

### API Routes (WRITE/UPDATE):
- ✅ Gratis (incluse nel Free Plan)
- ✅ Usa bandwidth (minimo, JSON piccolo)
- ✅ Rate limit: ~100 req/sec

**Conclusione:**
- ✅ **Supabase costi = $0** (Free Plan sufficiente per MVP)
- ⚠️ **OpenAI costi = ~$0.01-0.05 per foto**

---

## ✅ RISPOSTA FINALE

### **Refresh Pagina: GRATIS** ✅

**Perché:**
- Query diretta Supabase (READ)
- **NO chiamata OpenAI** (solo lettura DB)
- Bandwidth Supabase incluso Free Plan

### **Carica Foto: COSTA** ⚠️

**Perché:**
- Chiamata OpenAI Vision (analisi foto)
- ~$0.01 - $0.05 per foto

---

## 📊 RIEPILOGO COSTI PER CLIENTE

### Costo Setup Iniziale:
- Foto formazione (1x): ~$0.01 - $0.05
- Profilazione titolari (11 × 3 foto): ~$0.33 - $0.99
- Profilazione riserve (12 × 1 foto): ~$0.12 - $0.36
- **TOTALE SETUP: ~$0.46 - $1.40**

### Costo Operativo (Giornaliero):
- Refresh pagina (N volte): **$0** ✅
- Cambi formazione (1x): ~$0.01 - $0.05
- Profilazione nuovi giocatori: ~$0.01 - $0.03 per foto

**Conclusione:**
- ✅ **Refresh pagina = GRATIS** (no OpenAI)
- ⚠️ **Solo carica foto = COSTA** (OpenAI Vision)

---

**Status:** ✅ **CHIARITO** - Refresh pagina non costa, solo caricamento foto
