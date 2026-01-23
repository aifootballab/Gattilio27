# Documento Migliorie UX: Riassunto AI Match

**Data:** 23 Gennaio 2026  
**Ruolo:** Project Manager + Web Designer  
**Problema:** Riassunto AI non persistente, non visibile dopo salvataggio

---

## 🔍 ANALISI PROBLEMA ATTUALE

### Scenario Utente (Problema Reale)

**Flusso Attuale:**
1. ✅ Cliente carica foto match (5 sezioni)
2. ✅ Clicca "Riepilogo" → Modal si apre
3. ⚠️ **OPZIONALE:** Clicca "Genera Riassunto AI" → Riassunto generato
4. ✅ Clicca "Conferma e Salva" → Match salvato
5. ❌ **PROBLEMA:** Se non ha cliccato "Genera Riassunto", non lo vede mai più!

**Cosa Succede:**
- Riassunto generato solo in memoria (state React)
- **NON salvato** nel database
- Se cliente salva senza generare → riassunto perso
- Nella lista match → riassunto non visibile
- Nella pagina dettaglio match → riassunto non presente

---

## 🎯 REQUISITI UX

### 1. **Persistenza Riassunto**
- ✅ Salvare riassunto in database quando generato
- ✅ Recuperare riassunto quando match caricato
- ✅ Permettere rigenerazione se dati cambiano

### 2. **Visibilità Riassunto**
- ✅ **Lista Match (Dashboard):** Mostrare preview riassunto (prima riga + "Leggi tutto")
- ✅ **Pagina Dettaglio Match:** Mostrare riassunto completo
- ✅ **Modal Aggiungi Partita:** Mantenere funzionalità esistente

### 3. **Coerenza**
- ✅ Stesso riassunto in tutte le viste
- ✅ Stesso algoritmo di generazione
- ✅ Stesso contesto (rosa, formazione avversaria, profilo)

### 4. **UX Migliorata**
- ✅ Badge "Riassunto Disponibile" nella lista
- ✅ Pulsante "Genera/Rigenera Riassunto" sempre visibile
- ✅ Indicatore se riassunto basato su dati parziali
- ✅ Warning se dati insufficienti per analisi coerente

---

## 📊 FLUSSO PROPOSTO

### Scenario 1: Cliente Genera Riassunto Prima di Salvare

```
1. Cliente carica foto → Clicca "Riepilogo"
2. Clicca "Genera Riassunto AI" → Riassunto generato
3. Clicca "Conferma e Salva" → Match salvato CON riassunto
4. ✅ Riassunto salvato in database
5. ✅ Riassunto visibile in lista e dettaglio
```

### Scenario 2: Cliente Salva Senza Generare Riassunto

```
1. Cliente carica foto → Clicca "Riepilogo"
2. NON clicca "Genera Riassunto" → Salta
3. Clicca "Conferma e Salva" → Match salvato SENZA riassunto
4. ✅ Badge "Genera Riassunto" visibile in lista
5. ✅ Pulsante "Genera Riassunto" in pagina dettaglio
6. Cliente può generare dopo → Riassunto salvato
```

### Scenario 3: Cliente Aggiorna Match (Aggiunge Foto)

```
1. Cliente apre match esistente
2. Aggiunge foto mancanti
3. ✅ Badge "Rigenera Riassunto" (dati aggiornati)
4. Cliente clicca → Riassunto rigenerato e salvato
```

---

## 🎨 DESIGN PROPOSTO

### 1. **Lista Match (Dashboard) - Preview Riassunto**

```
┌─────────────────────────────────────────┐
│ Avversario: Juventus                    │
│ 23/01/2026 • 15:30                      │
│ Risultato: 6-1                          │
│ ✓ Completa                              │
│                                         │
│ 💬 Riassunto AI:                        │
│ "Attilio, ottima vittoria per 6-1..."  │
│ [Leggi tutto →]                         │
└─────────────────────────────────────────┘
```

**Se riassunto non presente:**
```
┌─────────────────────────────────────────┐
│ Avversario: Juventus                    │
│ 23/01/2026 • 15:30                      │
│ Risultato: 6-1                          │
│ ✓ Completa                              │
│                                         │
│ [🧠 Genera Riassunto AI]                │
└─────────────────────────────────────────┘
```

### 2. **Pagina Dettaglio Match - Riassunto Completo**

```
┌─────────────────────────────────────────┐
│ 📊 Dettagli Partita                      │
│ Data: 23/01/2026 15:30                  │
│ Avversario: Juventus                     │
│ Risultato: 6-1                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🧠 Analisi AI                            │
│                                         │
│ [Riassunto completo qui...]              │
│                                         │
│ ⚠️ Analisi basata su dati parziali (60%)│
│                                         │
│ [🔄 Rigenera Riassunto]                 │
└─────────────────────────────────────────┘
```

**Se riassunto non presente:**
```
┌─────────────────────────────────────────┐
│ 🧠 Analisi AI                            │
│                                         │
│ Nessun riassunto disponibile.           │
│ Genera un riassunto per vedere          │
│ l'analisi della partita.                │
│                                         │
│ [🧠 Genera Riassunto AI]                 │
└─────────────────────────────────────────┘
```

### 3. **Modal Aggiungi Partita - Mantenere Funzionalità**

```
┌─────────────────────────────────────────┐
│ 📋 Riepilogo Partita                     │
│                                         │
│ Risultato: 6-1                          │
│ Sezioni Complete: 3/5                   │
│                                         │
│ 🧠 Analisi AI                            │
│ [Genera Riassunto] / [Riassunto]        │
│                                         │
│ [Conferma e Salva] [Annulla]            │
└─────────────────────────────────────────┘
```

**Nota:** Se riassunto generato, salvarlo insieme al match

---

## 🔧 IMPLEMENTAZIONE TECNICA

### 1. Database: Aggiungere Campo `ai_summary`

```sql
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Indice per query future (opzionale)
CREATE INDEX IF NOT EXISTS idx_matches_ai_summary 
ON matches(ai_summary) 
WHERE ai_summary IS NOT NULL;
```

### 2. Backend: Salvare Riassunto

**Modificare `save-match/route.js`:**
```javascript
// Se matchData contiene ai_summary, salvarlo
const insertData = {
  // ...
  ai_summary: toText(matchData.ai_summary) || null,
  // ...
}
```

**Modificare `update-match/route.js`:**
```javascript
// Se data contiene ai_summary (rigenerato), salvarlo
const updateData = {
  // ...
  ai_summary: toText(data.ai_summary) || existingMatch.ai_summary || null,
  // ...
}
```

**Nuovo endpoint `save-ai-summary/route.js`:**
```javascript
// POST /api/supabase/save-ai-summary
// Salva solo il riassunto (senza rigenerare)
// Utile quando cliente genera riassunto dopo salvataggio
```

### 3. Frontend: Salvare Riassunto Quando Generato

**In `match/new/page.jsx`:**
```javascript
// Quando riassunto generato, includerlo in matchData
const handleConfirmSave = async () => {
  const matchData = {
    // ...
    ai_summary: analysisSummary || null, // ✅ Salva riassunto
    // ...
  }
  // Salva match con riassunto
}
```

### 4. Frontend: Mostrare Riassunto in Lista

**In `app/page.jsx`:**
```javascript
// Mostra preview riassunto (prima 100 caratteri)
{match.ai_summary && (
  <div style={{ marginTop: '12px', fontSize: '13px', opacity: 0.9 }}>
    💬 {match.ai_summary.substring(0, 100)}...
    <button onClick={() => router.push(`/match/${match.id}`)}>
      Leggi tutto →
    </button>
  </div>
)}
```

### 5. Frontend: Mostrare Riassunto in Dettaglio

**In `app/match/[id]/page.jsx`:**
```javascript
// Sezione Analisi AI
{match.ai_summary ? (
  <div>
    <h3>🧠 Analisi AI</h3>
    <div>{match.ai_summary}</div>
    <button onClick={handleRegenerateSummary}>
      🔄 Rigenera Riassunto
    </button>
  </div>
) : (
  <div>
    <p>Nessun riassunto disponibile</p>
    <button onClick={handleGenerateSummary}>
      🧠 Genera Riassunto AI
    </button>
  </div>
)}
```

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Migration: Aggiungere campo `ai_summary` in `matches`
- [ ] Creare indice (opzionale)

### Backend
- [ ] Modificare `save-match/route.js` per salvare `ai_summary`
- [ ] Modificare `update-match/route.js` per aggiornare `ai_summary`
- [ ] Nuovo endpoint `save-ai-summary/route.js` (opzionale, per salvare solo riassunto)

### Frontend - Aggiungi Partita
- [ ] Salvare `ai_summary` quando match salvato con riassunto generato
- [ ] Mantenere funzionalità esistente

### Frontend - Lista Match
- [ ] Mostrare preview riassunto (prima 100 caratteri)
- [ ] Badge "Riassunto Disponibile"
- [ ] Link "Leggi tutto" → pagina dettaglio
- [ ] Pulsante "Genera Riassunto" se non presente

### Frontend - Dettaglio Match
- [ ] Sezione "Analisi AI" con riassunto completo
- [ ] Pulsante "Genera/Rigenera Riassunto"
- [ ] Indicatore dati parziali
- [ ] Warning se dati insufficienti

### UX/Design
- [ ] Stile coerente con design esistente
- [ ] Responsive (mobile-friendly)
- [ ] Animazioni smooth
- [ ] Loading states
- [ ] Error handling

---

## 🎯 PRIORITÀ

### 🔴 ALTA (Blocca UX)
1. Salvare riassunto in database
2. Mostrare riassunto in pagina dettaglio
3. Permettere generazione dopo salvataggio

### 🟡 MEDIA (Migliora UX)
4. Preview riassunto in lista match
5. Badge "Riassunto Disponibile"
6. Pulsante rigenera se dati cambiano

### 🟢 BASSA (Nice to Have)
7. Indice database per performance
8. Endpoint dedicato salvataggio riassunto

---

## ✅ RISULTATO ATTESO

**Prima:**
- ❌ Riassunto perso se non generato prima di salvare
- ❌ Riassunto non visibile dopo salvataggio
- ❌ Cliente deve ricordarsi di generare

**Dopo:**
- ✅ Riassunto sempre salvato quando generato
- ✅ Riassunto visibile in lista e dettaglio
- ✅ Cliente può generare quando vuole
- ✅ Coerenza tra tutte le viste
- ✅ UX fluida e intuitiva

---

## 🔒 GARANZIE

- ✅ **Backward Compatible:** Match vecchi senza riassunto funzionano (mostrano "Genera Riassunto")
- ✅ **Non Bloccante:** Match si salva anche senza riassunto
- ✅ **Performance:** Query veloce (indice opzionale)
- ✅ **Privacy:** Solo riassunto utente (RLS già attivo)

---

**Pronto per implementazione dopo conferma!** 🚀
