# 🧠 Progettazione Barra Conoscenza IA - Enterprise

**Data**: 26 Gennaio 2026  
**Ruolo**: Product Manager Full-Stack Enterprise  
**Obiettivo**: Creare una barra progressiva enterprise-grade che mostra quanto l'IA conosce il cliente  
**Architettura**: Scalabile, performante, monitorabile, robusta

---

## 🎯 CONCETTO BASE

**Idea**: Più il cliente carica dati e usa il sistema, più l'IA lo conosce e può dare consigli personalizzati. La barra mostra visivamente questo progresso.

**Analogia**: Come un "livello di amicizia" nei videogiochi - più interagisci, più l'IA ti conosce.

---

## 📊 COSA MISURARE? (Metriche di Conoscenza)

### **1. Profilo Utente (20%)**
**Peso**: 20% del totale

**Metriche**:
- ✅ Nome e cognome compilati → +5%
- ✅ Divisione attuale → +3%
- ✅ Squadra preferita → +2%
- ✅ Nome squadra nel gioco → +3%
- ✅ Nome personalizzato IA → +2%
- ✅ "Come ricordarmi" compilato → +3%
- ✅ Ore settimanali → +2%

**Logica**: Profilo completo = l'IA sa chi sei e come preferisci essere trattato.

---

### **2. Rosa Giocatori (25%)**
**Peso**: 25% del totale

**Metriche**:
- ✅ Almeno 11 giocatori (titolari) → +10%
- ✅ Almeno 5 riserve → +5%
- ✅ Giocatori con dati completi (stats + skills + boosters) → +5%
- ✅ Formazione configurata → +5%

**Logica**: Rosa completa = l'IA conosce la tua squadra e può fare analisi accurate.

**Dettaglio "Dati Completi"**:
- Card base: +1% per giocatore
- Statistiche dettagliate: +1% per giocatore
- Skills/Abilità: +1% per giocatore
- Boosters: +1% per giocatore
- Max: 5% (se tutti i titolari hanno dati completi)

---

### **3. Storico Partite (30%)**
**Peso**: 30% del totale

**Metriche**:
- ✅ 1-2 partite caricate → +5%
- ✅ 3-5 partite → +10%
- ✅ 6-10 partite → +15%
- ✅ 11-20 partite → +20%
- ✅ 21+ partite → +25%
- ✅ Partite con dati completi (tutte le 5 sezioni) → +5%

**Logica**: Più partite = più pattern l'IA può identificare, più consigli personalizzati.

**Bonus "Dati Completi"**:
- Se almeno 5 partite hanno tutte le 5 sezioni → +5%

---

### **4. Pattern Tattici Identificati (15%)**
**Peso**: 15% del totale

**Metriche**:
- ✅ Pattern tattici calcolati (team_tactical_patterns) → +10%
- ✅ Formazioni più usate identificate → +3%
- ✅ Stili di gioco più usati identificati → +2%

**Logica**: Pattern identificati = l'IA capisce il tuo stile di gioco.

**Requisito**: Almeno 3 partite per calcolare pattern.

---

### **5. Allenatore Configurato (10%)**
**Peso**: 10% del totale

**Metriche**:
- ✅ Allenatore caricato → +5%
- ✅ Allenatore attivo → +5%

**Logica**: Allenatore = l'IA conosce le tue competenze tattiche e può suggerire formazioni/stili compatibili.

---

### **6. Utilizzo Sistema (Bonus)**
**Peso**: Bonus fino a +10%

**Metriche**:
- ✅ Interazioni con Assistant Chat (ogni 10 messaggi = +1%, max +5%)
- ✅ Analisi partite generate (ogni 5 analisi = +1%, max +3%)
- ✅ Contromisure generate (ogni 3 contromisure = +1%, max +2%)

**Logica**: Più usi il sistema, più l'IA impara dalle tue preferenze e domande.

---

### **7. Successi & Obiettivi Raggiunti (15%)** ⭐ **NUOVO**
**Peso**: 15% del totale

**Metriche**:
- ✅ **Miglioramento Divisione**: Divisione migliorata rispetto a quella iniziale → +5%
  - Logica: Confronta `current_division` con `initial_division` (salvata al primo login)
  - Esempio: Da Division 5 → Division 1 = +5%
  
- ✅ **Obiettivi Settimanali Completati**: Task settimanali completati → +5%
  - Logica: Ogni obiettivo completato = +1% (max 5 obiettivi/settimana)
  - Esempi obiettivi:
    - "Riduci gol subiti del 20% questa settimana"
    - "Vinci 3 partite consecutive"
    - "Migliora possesso palla del 10%"
    - "Usa formazione consigliata dall'IA"
  
- ✅ **Miglioramenti Performance**: Metriche migliorate nel tempo → +5%
  - **Gol Subiti**: Media ultimi 10 match < media precedenti 10 match → +2%
  - **Vittorie**: Win rate ultimi 10 match > win rate precedenti → +2%
  - **Possesso Palla**: Media ultimi 10 match > media precedenti → +1%

**Logica**: Successi dimostrano che l'IA sta effettivamente aiutando il cliente a migliorare. Più successi = più l'IA "conosce" come aiutarti efficacemente.

**Tracciamento**:
- `initial_division` salvata in `user_profiles` al primo login
- `weekly_goals` tabella per obiettivi settimanali
- Calcolo metriche: confronto ultimi 10 match vs precedenti 10 match

---

## 🧮 FORMULA DI CALCOLO

```javascript
// Pseudo-codice
function calculateAIKnowledgeScore(userData) {
  let score = 0
  
  // 1. Profilo Utente (20%)
  const profileScore = calculateProfileScore(userData.profile) // 0-20
  score += profileScore
  
  // 2. Rosa Giocatori (25%)
  const rosterScore = calculateRosterScore(userData.players, userData.formation) // 0-25
  score += rosterScore
  
  // 3. Storico Partite (30%)
  const matchesScore = calculateMatchesScore(userData.matches) // 0-30
  score += matchesScore
  
  // 4. Pattern Tattici (15%)
  const patternsScore = calculatePatternsScore(userData.tacticalPatterns) // 0-15
  score += patternsScore
  
  // 5. Allenatore (10%)
  const coachScore = calculateCoachScore(userData.coach) // 0-10
  score += coachScore
  
  // 6. Utilizzo Sistema (Bonus)
  const usageBonus = calculateUsageBonus(userData.usage) // 0-10
  score += usageBonus
  
  // 7. Successi & Obiettivi (15%) ⭐ NUOVO
  const successScore = calculateSuccessScore(
    userData.profile,      // initial_division vs current_division
    userData.weeklyGoals,  // obiettivi settimanali completati
    userData.matches       // metriche performance (gol subiti, vittorie, possesso)
  ) // 0-15
  score += successScore
  
  // Cap a 100%
  return Math.min(100, Math.round(score))
}
```

**Esempio Calcolo**:
- Profilo: 15/20 (75% compilato)
- Rosa: 20/25 (11 titolari, 3 riserve, dati parziali)
- Partite: 10/30 (3 partite caricate)
- Pattern: 0/15 (non ancora calcolati)
- Allenatore: 0/10 (non caricato)
- Utilizzo: 2/10 (20 messaggi chat)
- Successi: 3/15 (divisione migliorata + 1 obiettivo settimanale)
- **Totale: 50%** (prima: 47%)

---

## 🎨 VISUALIZZAZIONE UI

### **Posizionamento**

**Opzione 1: Dashboard (Raccomandato)**
- Posizione: In alto, sotto header, prima delle statistiche squadra
- Dimensione: Barra larga, ben visibile
- Stile: Simile alla barra di profilazione in `/impostazioni-profilo`

**Opzione 2: Widget Fisso**
- Posizione: Top-right, sempre visibile (sticky)
- Dimensione: Compatta, non invasiva
- Stile: Mini barra con percentuale

**Opzione 3: Entrambe**
- Dashboard: Barra completa con dettagli
- Widget: Mini versione sempre visibile

**Raccomandazione**: **Opzione 1** (Dashboard) - più visibile, motiva l'utente a completare il profilo.

---

### **Design Barra**

**Componente**:
```jsx
<div style={{
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #2a2a2a'
}}>
  {/* Header */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
    <Brain size={20} color="#00d4ff" />
    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
      {t('aiKnowledge')} {/* "Conoscenza AI" */}
    </h2>
    <span style={{ fontSize: '14px', color: '#888', marginLeft: 'auto' }}>
      {score}%
    </span>
  </div>
  
  {/* Progress Bar */}
  <div style={{
    width: '100%',
    height: '28px',
    backgroundColor: '#2a2a2a',
    borderRadius: '14px',
    overflow: 'hidden',
    marginBottom: '12px',
    position: 'relative'
  }}>
    <div style={{
      width: `${score}%`,
      height: '100%',
      backgroundColor: getColorForScore(score), // Verde se >80%, Blu se >50%, Arancione se <50%
      transition: 'width 0.5s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '12px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#000'
    }}>
      {score > 15 && `${score}%`}
    </div>
  </div>
  
  {/* Level Badge */}
  <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
    {getLevelText(level)} {/* "Principiante" | "Intermedio" | "Avanzato" | "Esperto" */}
  </div>
  
  {/* Breakdown (Espandibile) */}
  <details style={{ fontSize: '13px', color: '#666' }}>
    <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
      {t('viewDetails')} {/* "Vedi dettagli" */}
    </summary>
    <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
      <div>Profilo: {profileScore}/20</div>
      <div>Rosa: {rosterScore}/25</div>
      <div>Partite: {matchesScore}/30</div>
      <div>Pattern: {patternsScore}/15</div>
      <div>Allenatore: {coachScore}/10</div>
      <div>Utilizzo: {usageBonus}/10</div>
      <div>Successi: {successScore}/15</div>
    </div>
  </details>
  
  {/* CTA se score basso */}
  {score < 50 && (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      backgroundColor: 'rgba(255, 165, 0, 0.1)',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#ffaa00'
    }}>
      💡 {t('completeProfileToIncreaseKnowledge')} {/* "Completa il profilo per aumentare la conoscenza dell'IA" */}
    </div>
  )}
</div>
```

---

### **Colori e Livelli**

**Colori Barra**:
- 🔴 **0-30%**: Rosso/arancione (`#ff6b00`) - "Principiante"
- 🟡 **31-60%**: Giallo/arancione (`#ffaa00`) - "Intermedio"
- 🔵 **61-80%**: Blu (`#00d4ff`) - "Avanzato"
- 🟢 **81-100%**: Verde (`#00ff88`) - "Esperto"

**Livelli**:
- **Principiante** (0-30%): "L'IA sta imparando a conoscerti"
- **Intermedio** (31-60%): "L'IA ti conosce abbastanza bene"
- **Avanzato** (61-80%): "L'IA ti conosce molto bene"
- **Esperto** (81-100%): "L'IA ti conosce perfettamente"

---

## 🔄 AGGIORNAMENTO

### **Quando Aggiornare**

**Real-time** (immediato):
- Dopo salvataggio profilo
- Dopo caricamento giocatore
- Dopo salvataggio partita
- Dopo caricamento allenatore

**On-demand** (calcolo quando necessario):
- All'apertura dashboard
- Dopo calcolo pattern tattici
- Dopo interazione con Assistant Chat

**Periodico** (background):
- Ogni 24h (per aggiornare utilizzo sistema)

---

### **Dove Salvare - Enterprise Architecture**

**Soluzione Enterprise: Campo DB + Cache + Background Jobs**

#### **1. Database Schema (PostgreSQL/Supabase)**
```sql
ALTER TABLE user_profiles
ADD COLUMN ai_knowledge_score DECIMAL(5,2) DEFAULT 0.00 CHECK (ai_knowledge_score >= 0 AND ai_knowledge_score <= 100),
ADD COLUMN ai_knowledge_level TEXT DEFAULT 'beginner' CHECK (ai_knowledge_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
ADD COLUMN ai_knowledge_last_calculated TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN ai_knowledge_breakdown JSONB DEFAULT '{}'::jsonb; -- Dettaglio per componente

-- Indice per query veloci
CREATE INDEX IF NOT EXISTS idx_user_profiles_ai_knowledge 
ON user_profiles(user_id, ai_knowledge_score DESC);

-- Trigger per aggiornamento automatico (opzionale, può essere disabilitato per performance)
CREATE OR REPLACE FUNCTION update_ai_knowledge_on_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag per ricalcolo asincrono (non bloccare transazione)
  PERFORM pg_notify('ai_knowledge_recalc', NEW.user_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger su tabelle rilevanti (players, matches, coaches)
-- NOTA: Disabilitare in produzione se impatta performance, usare background job invece
```

#### **2. Cache Layer (Redis/In-Memory)**
```javascript
// Cache key: `ai_knowledge:${userId}`
// TTL: 5 minuti
// Invalida dopo: save-match, save-player, save-coach, save-profile
```

**Vantaggi Enterprise**:
- ✅ Query DB ridotte (cache hit rate >90%)
- ✅ Latenza <50ms per lettura
- ✅ Scalabile (Redis cluster)
- ✅ Invalidazione intelligente

#### **3. Background Job (Cron/Queue)**
```javascript
// Job periodico: Ricalcola score per utenti attivi (ultimi 30 giorni)
// Frequenza: Ogni 6 ore
// Batch size: 100 utenti per batch
// Priorità: Bassa (non critico)
```

**Vantaggi Enterprise**:
- ✅ Non blocca transazioni utente
- ✅ Ricalcolo incrementale
- ✅ Gestione errori robusta
- ✅ Retry automatico

**Raccomandazione Enterprise**: **Campo DB + Cache Redis + Background Job** per massima performance e scalabilità.

---

## 📍 DOVE VISUALIZZARE

### **1. Dashboard (`/`) - PRIMARIO**
- Posizione: In alto, dopo header, prima statistiche squadra
- Dimensione: Grande, ben visibile
- Dettagli: Breakdown espandibile

### **2. Impostazioni Profilo (`/impostazioni-profilo`) - SECONDARIO**
- Posizione: Accanto alla barra di profilazione
- Dimensione: Media
- Dettagli: Link a dashboard per dettagli

### **3. Assistant Chat (Widget) - OPZIONALE**
- Posizione: Header del widget chat
- Dimensione: Mini (solo percentuale)
- Dettagli: Tooltip con livello

---

## 🎯 OBIETTIVI PRODOTTO

### **Gamification**
- ✅ Motiva l'utente a completare il profilo
- ✅ Mostra progresso visivo
- ✅ Crea senso di "amicizia" con l'IA

### **Trasparenza**
- ✅ L'utente sa quanto l'IA lo conosce
- ✅ Capisce cosa manca per migliorare
- ✅ Vede benefici concreti dell'uso del sistema

### **Personalizzazione**
- ✅ Più alto lo score, più personalizzati i consigli
- ✅ L'IA può dire: "Ti conosco al 60%, per consigli migliori carica più partite"

---

## 🚀 IMPLEMENTAZIONE ENTERPRISE

### **Fase 1: Database & Schema (Foundation)**
1. ✅ Migrazione SQL per colonne `ai_knowledge_*` in `user_profiles`
2. ✅ Indici per query performance
3. ✅ Trigger opzionali (disabilitabili per performance)
4. ✅ Validazione constraints (CHECK)

### **Fase 2: Backend Core (Business Logic)**
1. ✅ Funzione `calculateAIKnowledgeScore(userId)` - **Stateless, testabile**
2. ✅ Funzione `getAIKnowledgeLevel(score)` - **Deterministica**
3. ✅ Funzione `calculateBreakdown(userId)` - **Dettaglio per componente**
4. ✅ Validazione input/output
5. ✅ Error handling robusto
6. ✅ Logging strutturato (per monitoring)

### **Fase 3: API Layer (RESTful)**
1. ✅ `GET /api/ai-knowledge` - **Lettura score (con cache)**
2. ✅ `POST /api/ai-knowledge/recalculate` - **Ricalcolo manuale (admin)**
3. ✅ Rate limiting (10 req/min per utente)
4. ✅ Autenticazione obbligatoria
5. ✅ Response caching headers

### **Fase 4: Cache Layer (Performance)**
1. ✅ Integrazione Redis (o in-memory per dev)
2. ✅ Cache key: `ai_knowledge:${userId}`
3. ✅ TTL: 5 minuti
4. ✅ Invalidazione dopo save-match, save-player, save-coach, save-profile
5. ✅ Cache warming (pre-calcolo per utenti attivi)

### **Fase 5: Background Jobs (Scalabilità)**
1. ✅ Job periodico: Ricalcolo score (ogni 6h)
2. ✅ Queue system (Bull/Agenda per Node.js)
3. ✅ Batch processing (100 utenti per batch)
4. ✅ Retry logic (3 tentativi, exponential backoff)
5. ✅ Dead letter queue (per errori persistenti)

### **Fase 6: Frontend (UI/UX)**
1. ✅ Componente `<AIKnowledgeBar />` - **Reusable, testabile**
2. ✅ Integrazione dashboard
3. ✅ Traduzioni i18n (IT/EN)
4. ✅ Animazioni (CSS transitions, non JS)
5. ✅ Loading states (skeleton loader)
6. ✅ Error boundaries (fallback UI)

### **Fase 7: Monitoring & Analytics**
1. ✅ Tracking eventi (score aumentato, livello cambiato)
2. ✅ Metriche performance (latency, cache hit rate)
3. ✅ Alerting (score calcolo fallito >5 volte)
4. ✅ Dashboard analytics (distribuzione score utenti)

### **Fase 8: Testing & QA**
1. ✅ Unit tests (funzioni calcolo)
2. ✅ Integration tests (API endpoints)
3. ✅ E2E tests (flusso completo)
4. ✅ Load tests (1000+ utenti simultanei)
5. ✅ Regression tests (non rompere score esistenti)

---

## 📊 ESEMPI SCORE

### **Utente Nuovo (0%)**
- Nessun dato caricato
- Barra: 0%, Rosso, "Principiante"
- CTA: "Inizia caricando la tua rosa!"

### **Utente Intermedio (45%)**
- Profilo: 15/20
- Rosa: 15/25 (11 titolari, 4 riserve)
- Partite: 5/30 (3 partite)
- Pattern: 0/15
- Allenatore: 0/10
- Utilizzo: 10/10 (100 messaggi chat)
- Barra: 45%, Arancione, "Intermedio"
- CTA: "Carica più partite per aumentare la conoscenza!"

### **Utente Avanzato (75%)**
- Profilo: 20/20
- Rosa: 25/25 (11 titolari, 10 riserve, dati completi)
- Partite: 25/30 (15 partite)
- Pattern: 15/15
- Allenatore: 10/10
- Utilizzo: 10/10
- Barra: 75%, Blu, "Avanzato"
- Messaggio: "L'IA ti conosce molto bene! 🎉"

### **Utente Esperto (95%)**
- Tutto completo
- 30+ partite
- Pattern identificati
- Utilizzo massimo
- Barra: 95%, Verde, "Esperto"
- Messaggio: "L'IA ti conosce perfettamente! 💪"

---

## ✅ DECISIONI PRODOTTO

### **Metriche Finali** (Confermate)
- ✅ Profilo: 20%
- ✅ Rosa: 25%
- ✅ Partite: 30%
- ✅ Pattern: 15%
- ✅ Allenatore: 10%
- ✅ Utilizzo: Bonus 10%
- ✅ **Successi & Obiettivi: 15%** ⭐ **NUOVO**

### **Visualizzazione**
- ✅ Dashboard principale
- ✅ Barra grande con breakdown espandibile
- ✅ Colori: Rosso → Arancione → Blu → Verde

### **Aggiornamento Enterprise**
- ✅ Campo DB (`ai_knowledge_score`, `ai_knowledge_level`, `ai_knowledge_breakdown`, `ai_knowledge_last_calculated`)
- ✅ Cache Redis (TTL 5 minuti, invalidazione intelligente)
- ✅ Background jobs (ricalcolo periodico, non blocca transazioni)
- ✅ Calcolo on-demand (dopo azioni rilevanti, async)
- ✅ Monitoring e alerting (tracking performance, errori)

### **Performance Target**
- ✅ Lettura score: <50ms (con cache)
- ✅ Calcolo score: <500ms (per utente)
- ✅ Cache hit rate: >90%
- ✅ Scalabilità: 10,000+ utenti simultanei

---

## 🏗️ ARCHITETTURA ENTERPRISE

### **Componenti**

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  <AIKnowledgeBar /> Component                    │   │
│  │  - Cache locale (5 min)                         │   │
│  │  - Loading states                                │   │
│  │  - Error boundaries                              │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────┐
│              API LAYER (Next.js API Routes)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  GET /api/ai-knowledge                           │   │
│  │  - Auth check                                    │   │
│  │  - Rate limiting                                 │   │
│  │  - Cache check (Redis)                           │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼──────┐
│   REDIS      │ │  DATABASE  │ │ BACKGROUND │
│   CACHE      │ │ (Supabase) │ │    JOBS    │
│              │ │            │ │            │
│ TTL: 5 min   │ │ Score +    │ │ Recalc: 6h │
│ Key: user_id │ │ Breakdown  │ │ Batch: 100 │
└──────────────┘ └────────────┘ └────────────┘
```

### **Flusso Dati**

1. **Lettura Score**:
   - Frontend → API → Cache (Redis) → DB (se miss)
   - Latenza: <50ms (cache), <200ms (DB)

2. **Aggiornamento Score**:
   - Evento (save-match) → Queue → Background Job → Calcolo → DB + Cache
   - Non blocca transazione utente (async)

3. **Ricalcolo Periodico**:
   - Cron (6h) → Queue → Batch (100 utenti) → Calcolo → DB + Cache
   - Priorità bassa, retry automatico

---

## 🔒 SICUREZZA ENTERPRISE

### **Autenticazione**
- ✅ Bearer token obbligatorio
- ✅ RLS (Row Level Security) - utente vede solo il proprio score
- ✅ Validazione userId (prevent injection)

### **Rate Limiting**
- ✅ 10 richieste/minuto per utente
- ✅ 100 richieste/minuto per IP (prevent abuse)
- ✅ Headers `X-RateLimit-*` per trasparenza

### **Input Validation**
- ✅ Validazione UUID userId
- ✅ Sanitizzazione input
- ✅ SQL injection prevention (parametri)

### **Error Handling**
- ✅ Non esporre dettagli errori interni
- ✅ Logging strutturato (server-side only)
- ✅ Fallback graceful (score 0 se errore)

---

## 📈 MONITORING ENTERPRISE

### **Metriche Chiave**
- **Performance**: Latency p50/p95/p99, cache hit rate
- **Affidabilità**: Error rate, success rate calcolo
- **Utilizzo**: Richieste/minuto, utenti attivi
- **Business**: Distribuzione score, crescita media score

### **Alerting**
- ⚠️ Cache hit rate <80% (problema cache)
- ⚠️ Error rate >5% (problema calcolo)
- ⚠️ Latency p95 >500ms (problema performance)
- ⚠️ Background job fallito >3 volte (problema batch)

### **Dashboard**
- 📊 Score distribution (histogram)
- 📊 Score growth over time (line chart)
- 📊 Component breakdown (stacked bar)
- 📊 Performance metrics (latency, cache)

---

## 🧪 TESTING ENTERPRISE

### **Unit Tests**
- ✅ `calculateAIKnowledgeScore()` - tutti i casi edge
- ✅ `getAIKnowledgeLevel()` - tutti i livelli
- ✅ `calculateBreakdown()` - tutti i componenti

### **Integration Tests**
- ✅ API endpoint (success, error, auth)
- ✅ Cache invalidation
- ✅ Database updates

### **E2E Tests**
- ✅ Flusso completo: save-match → score aggiornato
- ✅ UI: barra mostra score corretto
- ✅ Breakdown: dettagli corretti

### **Load Tests**
- ✅ 1000 utenti simultanei
- ✅ 10,000 richieste/minuto
- ✅ Cache performance sotto carico

---

---

## 🎯 TRACCIAMENTO SUCCESSI & OBIETTIVI

### **1. Divisione Iniziale vs Attuale**

**Implementazione**:
```sql
-- Aggiungere colonna in user_profiles
ALTER TABLE user_profiles
ADD COLUMN initial_division TEXT; -- Divisione al primo login

-- Trigger: Salva initial_division solo se NULL (prima volta)
CREATE OR REPLACE FUNCTION set_initial_division()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.initial_division IS NULL AND NEW.current_division IS NOT NULL THEN
    NEW.initial_division := NEW.current_division;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_initial_division
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION set_initial_division();
```

**Calcolo Miglioramento**:
```javascript
function calculateDivisionImprovement(initialDivision, currentDivision) {
  if (!initialDivision || !currentDivision) return 0
  
  // Estrai numero divisione (es. "Division 5" → 5)
  const initialNum = parseInt(initialDivision.match(/\d+/)?.[0] || '0')
  const currentNum = parseInt(currentDivision.match(/\d+/)?.[0] || '0')
  
  // Divisione migliorata = numero più basso (Division 1 > Division 5)
  if (currentNum < initialNum) {
    return 5 // +5% per miglioramento divisione
  }
  
  return 0
}
```

---

### **2. Obiettivi Settimanali**

**Tabella Database**:
```sql
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Obiettivo
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'reduce_goals_conceded',    -- Riduci gol subiti
    'increase_wins',            -- Aumenta vittorie
    'improve_possession',       -- Migliora possesso palla
    'use_recommended_formation', -- Usa formazione consigliata
    'complete_matches',         -- Completa N partite
    'custom'                    -- Obiettivo personalizzato
  )),
  goal_description TEXT,        -- Descrizione obiettivo
  target_value DECIMAL(10,2),   -- Valore target (es. 20% riduzione)
  current_value DECIMAL(10,2) DEFAULT 0, -- Valore attuale
  
  -- Periodo
  week_start_date DATE NOT NULL, -- Inizio settimana (Lunedì)
  week_end_date DATE NOT NULL,   -- Fine settimana (Domenica)
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_weekly_goals_user_week 
ON weekly_goals(user_id, week_start_date DESC);

-- RLS
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
ON weekly_goals FOR SELECT
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own goals"
ON weekly_goals FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own goals"
ON weekly_goals FOR UPDATE
USING ((select auth.uid()) = user_id);
```

**Calcolo Obiettivi Completati**:
```javascript
function calculateWeeklyGoalsScore(weeklyGoals) {
  if (!weeklyGoals || weeklyGoals.length === 0) return 0
  
  // Conta obiettivi completati nell'ultima settimana
  const currentWeek = getCurrentWeek() // Lunedì-Domenica corrente
  const completedThisWeek = weeklyGoals.filter(goal => 
    goal.week_start_date === currentWeek.start &&
    goal.status === 'completed'
  ).length
  
  // Max 5 obiettivi/settimana = +5%
  return Math.min(5, completedThisWeek)
}
```

**Generazione Obiettivi Automatici**:
```javascript
// L'IA genera obiettivi settimanali basati su:
// 1. Problemi ricorrenti (common_problems)
// 2. Performance recenti (ultimi 10 match)
// 3. Pattern tattici identificati

function generateWeeklyGoals(userProfile, matchHistory, tacticalPatterns) {
  const goals = []
  
  // Analizza ultimi 10 match
  const recentMatches = matchHistory.slice(0, 10)
  const avgGoalsConceded = calculateAvgGoalsConceded(recentMatches)
  const avgPossession = calculateAvgPossession(recentMatches)
  const winRate = calculateWinRate(recentMatches)
  
  // Obiettivo 1: Riduci gol subiti (se media > 2.0)
  if (avgGoalsConceded > 2.0) {
    goals.push({
      goal_type: 'reduce_goals_conceded',
      goal_description: `Riduci gol subiti del 20% (da ${avgGoalsConceded.toFixed(1)} a ${(avgGoalsConceded * 0.8).toFixed(1)})`,
      target_value: avgGoalsConceded * 0.8
    })
  }
  
  // Obiettivo 2: Migliora possesso (se < 50%)
  if (avgPossession < 50) {
    goals.push({
      goal_type: 'improve_possession',
      goal_description: `Migliora possesso palla del 10% (da ${avgPossession.toFixed(0)}% a ${(avgPossession + 10).toFixed(0)}%)`,
      target_value: avgPossession + 10
    })
  }
  
  // Obiettivo 3: Aumenta vittorie (se win rate < 50%)
  if (winRate < 50) {
    goals.push({
      goal_type: 'increase_wins',
      goal_description: `Vinci 3 partite consecutive questa settimana`,
      target_value: 3
    })
  }
  
  return goals
}
```

---

### **3. Metriche Performance (Miglioramenti)**

**Calcolo Miglioramenti**:
```javascript
function calculatePerformanceImprovements(matches) {
  if (!matches || matches.length < 20) return 0 // Serve almeno 20 partite
  
  // Ultimi 10 match
  const recent10 = matches.slice(0, 10)
  // Precedenti 10 match
  const previous10 = matches.slice(10, 20)
  
  let score = 0
  
  // 1. Gol Subiti (media ultimi 10 < media precedenti 10)
  const recentAvgGoalsConceded = calculateAvgGoalsConceded(recent10)
  const previousAvgGoalsConceded = calculateAvgGoalsConceded(previous10)
  if (recentAvgGoalsConceded < previousAvgGoalsConceded) {
    const improvement = ((previousAvgGoalsConceded - recentAvgGoalsConceded) / previousAvgGoalsConceded) * 100
    if (improvement >= 20) score += 2 // +2% se miglioramento >= 20%
    else if (improvement >= 10) score += 1 // +1% se miglioramento >= 10%
  }
  
  // 2. Win Rate (ultimi 10 > precedenti 10)
  const recentWinRate = calculateWinRate(recent10)
  const previousWinRate = calculateWinRate(previous10)
  if (recentWinRate > previousWinRate) {
    const improvement = recentWinRate - previousWinRate
    if (improvement >= 20) score += 2 // +2% se miglioramento >= 20%
    else if (improvement >= 10) score += 1 // +1% se miglioramento >= 10%
  }
  
  // 3. Possesso Palla (ultimi 10 > precedenti 10)
  const recentAvgPossession = calculateAvgPossession(recent10)
  const previousAvgPossession = calculateAvgPossession(previous10)
  if (recentAvgPossession > previousAvgPossession) {
    const improvement = recentAvgPossession - previousAvgPossession
    if (improvement >= 10) score += 1 // +1% se miglioramento >= 10%
  }
  
  return Math.min(5, score) // Max +5%
}
```

**Helper Functions**:
```javascript
function calculateAvgGoalsConceded(matches) {
  if (!matches || matches.length === 0) return 0
  
  let totalGoals = 0
  let count = 0
  
  matches.forEach(match => {
    // Estrai gol subiti da result (es. "6-1" → 1 gol subito)
    // O da team_stats.goals_conceded
    const goalsConceded = extractGoalsConceded(match)
    if (goalsConceded !== null) {
      totalGoals += goalsConceded
      count++
    }
  })
  
  return count > 0 ? totalGoals / count : 0
}

function calculateWinRate(matches) {
  if (!matches || matches.length === 0) return 0
  
  let wins = 0
  matches.forEach(match => {
    const result = match.result || ''
    // Parse result: "6-1" → win se gol cliente > gol avversario
    if (isWin(result)) wins++
  })
  
  return (wins / matches.length) * 100
}

function calculateAvgPossession(matches) {
  if (!matches || matches.length === 0) return 0
  
  let totalPossession = 0
  let count = 0
  
  matches.forEach(match => {
    const possession = match.team_stats?.possession
    if (typeof possession === 'number') {
      totalPossession += possession
      count++
    }
  })
  
  return count > 0 ? totalPossession / count : 0
}
```

---

### **4. Integrazione nel Calcolo Score**

**Funzione Completa**:
```javascript
function calculateSuccessScore(userProfile, weeklyGoals, matches) {
  let score = 0
  
  // 1. Miglioramento Divisione (+5%)
  if (userProfile.initial_division && userProfile.current_division) {
    score += calculateDivisionImprovement(
      userProfile.initial_division,
      userProfile.current_division
    )
  }
  
  // 2. Obiettivi Settimanali Completati (+5%)
  score += calculateWeeklyGoalsScore(weeklyGoals)
  
  // 3. Miglioramenti Performance (+5%)
  score += calculatePerformanceImprovements(matches)
  
  return Math.min(15, score) // Cap a 15%
}
```

---

## 📊 ESEMPI OBIETTIVI SETTIMANALI

### **Obiettivi Automatici (Generati dall'IA)**

1. **"Riduci gol subiti del 20% questa settimana"**
   - Basato su: Media gol subiti ultimi 10 match > 2.0
   - Target: Media < 1.6 gol/match
   - Tracking: Confronta media ultimi 5 match vs media precedente

2. **"Vinci 3 partite consecutive"**
   - Basato su: Win rate < 50%
   - Target: 3 vittorie consecutive
   - Tracking: Conta vittorie consecutive

3. **"Migliora possesso palla del 10%"**
   - Basato su: Possesso medio < 50%
   - Target: Possesso medio > 55%
   - Tracking: Confronta media ultimi 5 match vs media precedente

4. **"Usa formazione consigliata dall'IA"**
   - Basato su: Formazione attuale non ottimale
   - Target: Usa formazione suggerita in almeno 3 partite
   - Tracking: Conta partite con formazione consigliata

5. **"Completa 5 partite con tutti i dati"**
   - Basato su: Partite incomplete
   - Target: 5 partite con tutte le 5 sezioni
   - Tracking: Conta partite con `data_completeness = 'complete'`

---

## 🔄 AGGIORNAMENTO OBIETTIVI

### **Quando Aggiornare**

**Real-time**:
- Dopo salvataggio partita → Verifica obiettivi attivi
- Dopo aggiornamento divisione → Verifica miglioramento divisione

**Periodico** (Background Job):
- Ogni domenica sera → Genera obiettivi per settimana successiva
- Ogni domenica sera → Valuta obiettivi settimana corrente (completati/failed)
- Ogni giorno → Aggiorna progresso obiettivi attivi

---

## 🎨 UI OBIETTIVI SETTIMANALI

### **Widget Dashboard**

```jsx
<div style={{
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #2a2a2a'
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
    <Trophy size={20} color="#00d4ff" />
    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
      {t('weeklyGoals')} {/* "Obiettivi Settimanali" */}
    </h2>
  </div>
  
  {weeklyGoals.length === 0 ? (
    <div style={{ fontSize: '14px', color: '#888' }}>
      {t('noGoalsThisWeek')} {/* "Nessun obiettivo questa settimana" */}
    </div>
  ) : (
    weeklyGoals.map(goal => (
      <div key={goal.id} style={{
        padding: '12px',
        marginBottom: '8px',
        backgroundColor: goal.status === 'completed' 
          ? 'rgba(34, 197, 94, 0.1)' 
          : 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: `1px solid ${goal.status === 'completed' 
          ? 'rgba(34, 197, 94, 0.3)' 
          : 'rgba(255, 255, 255, 0.1)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {goal.status === 'completed' ? (
            <CheckCircle2 size={16} color="#22c55e" />
          ) : (
            <Circle size={16} color="#888" />
          )}
          <span style={{ fontSize: '14px', flex: 1 }}>
            {goal.goal_description}
          </span>
          {goal.status === 'active' && (
            <span style={{ fontSize: '12px', color: '#888' }}>
              {goal.current_value}/{goal.target_value}
            </span>
          )}
        </div>
        {goal.status === 'active' && (
          <div style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#2a2a2a',
            borderRadius: '2px',
            marginTop: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(goal.current_value / goal.target_value) * 100}%`,
              height: '100%',
              backgroundColor: '#00d4ff',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}
      </div>
    ))
  )}
</div>
```

---

**Fine Documento Progettazione Enterprise + Successi & Obiettivi**

**Prossimo Step**: Implementazione Fase 1 (Database & Schema) + Tabella `weekly_goals`
