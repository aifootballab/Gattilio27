# Pulizia Riassunto AI - Rimozione da Aggiungi Partita e Ultime Partite

**Data:** 23 Gennaio 2026  
**Motivo:** Riassunto AI non funzionava correttamente in "Aggiungi Partita" e "Ultime Partite". Rimozione completa per riscrivere da capo.

---

## ✅ CODICE RIMOSSO

### 1. Dashboard (`app/page.jsx`)
- ❌ Rimosso `handleGenerateSummary()` (funzione completa)
- ❌ Rimossi stati: `generatingSummaryId`, `summaryError`
- ❌ Rimossa UI "Genera Riassunto IA" in lista partite
- ❌ Rimossa preview `ai_summary` in lista partite
- ❌ Rimosso caricamento campo `ai_summary` dalla query Supabase
- ✅ Mantenuto: import `Brain` (usato per placeholder "AI Insights")

### 2. Aggiungi Partita (`app/match/new/page.jsx`)
- ❌ Rimossa funzione `handleGenerateAnalysis()`
- ❌ Rimossi stati: `generatingAnalysis`, `analysisSummary`, `analysisConfidence`, `missingSections`
- ❌ Rimossa intera sezione "AI Analysis" dal modal riepilogo
- ❌ Rimosso salvataggio `ai_summary` in `handleSave()`
- ❌ Rimosso import `Brain` (non più usato)

### 3. Backend - Codice Morto Rimosso

#### `app/api/supabase/save-match/route.js`
- ❌ Rimossa logica complessa per gestire `ai_summary` (stringa JSON, oggetto, null)
- ✅ Sostituito con: `ai_summary: null` (commento: generato solo da pagina dettaglio)

#### `app/api/supabase/update-match/route.js`
- ❌ Rimossa riga 335: `ai_summary: toText(data.ai_summary) || existingMatch.ai_summary || null`
- ✅ Sostituito con: `ai_summary: existingMatch.ai_summary || null` (commento: gestito solo da sezione speciale)
- ✅ Mantenuto: gestione speciale per `section === 'ai_summary'` (usata da pagina dettaglio)

---

## ✅ CODICE MANTENUTO (Usato da Pagina Dettaglio Match)

### 1. Endpoint `/api/analyze-match`
- ✅ **File:** `app/api/analyze-match/route.js`
- ✅ **Uso:** Pagina dettaglio match (`app/match/[id]/page.jsx`)
- ✅ **Status:** Funzionante, non toccato

### 2. Endpoint `/api/supabase/update-match` (sezione `ai_summary`)
- ✅ **File:** `app/api/supabase/update-match/route.js` (righe 230-261)
- ✅ **Uso:** Pagina dettaglio match per salvare riassunto generato
- ✅ **Status:** Funzionante, mantenuto

### 3. Pagina Dettaglio Match
- ✅ **File:** `app/match/[id]/page.jsx`
- ✅ **Funzionalità:** Genera e mostra riassunto AI
- ✅ **Status:** Funzionante, non toccato

### 4. Rate Limiter
- ✅ **File:** `lib/rateLimiter.js`
- ✅ **Config:** `/api/analyze-match` (10 req/min)
- ✅ **Status:** Mantenuto (usato da pagina dettaglio)

---

## ✅ DATABASE SUPABASE

### Tabella `matches`
- ✅ **Campo `ai_summary`:** MANTENUTO (usato da pagina dettaglio)
- ✅ **Tipo:** TEXT NULL
- ✅ **Indice:** `idx_matches_ai_summary` (se presente) - MANTENUTO

### Trigger/Funzioni
- ✅ **Trigger:** `trigger_update_matches_updated_at` - MANTENUTO (generico, non specifico per `ai_summary`)
- ✅ **Funzioni:** Nessuna funzione specifica per `ai_summary` trovata

---

## 📋 DOCUMENTAZIONE DA AGGIORNARE

### File da aggiornare (riferimenti a riassunto AI in "Aggiungi Partita" e "Ultime Partite"):

1. `DOCUMENTO_MIGLIORIE_RIASSUNTO_AI_UX.md` - Aggiornare: rimozione da modal aggiungi partita
2. `AUDIT_RIASSUNTO_AI_COMPLETO.md` - Aggiornare: rimozione da dashboard e match/new
3. `IMPLEMENTAZIONE_RIASSUNTO_AI.md` - Aggiornare: rimozione da match/new
4. `ANALISI_RIASSUNTO_AI_ANDAMENTO.md` - Aggiornare: rimozione da match/new
5. `ARCHITETTURA_MATCH_ANALISI.md` - Verificare: potrebbe essere ancora valido per pagina dettaglio

**Nota:** La documentazione per la pagina dettaglio match (`match/[id]/page.jsx`) rimane valida.

---

## 🎯 PROSSIMI PASSI

1. ✅ Codice morto rimosso
2. ⏳ Documentazione da aggiornare (riferimenti a match/new e dashboard)
3. ⏳ Riscrivere sezione riassunto AI in "Aggiungi Partita" e "Ultime Partite" da capo

---

## ⚠️ IMPORTANTE

**NON rimuovere:**
- Campo `ai_summary` dalla tabella `matches` (usato da pagina dettaglio)
- Endpoint `/api/analyze-match` (usato da pagina dettaglio)
- Gestione `section === 'ai_summary'` in `update-match` (usata da pagina dettaglio)
- Rate limiter per `/api/analyze-match` (usato da pagina dettaglio)

**Rimosso solo:**
- Funzionalità riassunto AI da "Aggiungi Partita" (`match/new/page.jsx`)
- Funzionalità riassunto AI da "Ultime Partite" (dashboard, `page.jsx`)
- Codice morto in `save-match` e `update-match` che non viene più chiamato
