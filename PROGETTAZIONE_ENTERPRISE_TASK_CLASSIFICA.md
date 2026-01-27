# 🏗️ Progettazione Enterprise - Task & Classifica

**Data**: 27 Gennaio 2026  
**Ruolo**: Senior Full-Stack Engineer & Product Manager  
**Obiettivo**: Sistema enterprise-grade per Task (Obiettivi Settimanali) e Classifica (Leaderboard)  
**Focus**: Scalabilità, Sicurezza, Anti-manipolazione, Gestione, Reset

---

## 📋 INDICE

1. [Analisi Requisiti](#analisi-requisiti)
2. [Architettura Enterprise](#architettura-enterprise)
3. [Database Schema](#database-schema)
4. [Sicurezza & Anti-manipolazione](#sicurezza--anti-manipolazione)
5. [Scalabilità](#scalabilità)
6. [Gestione & Reset](#gestione--reset)
7. [API Design](#api-design)
8. [Frontend Components](#frontend-components)
9. [Background Jobs](#background-jobs)
10. [Monitoring & Analytics](#monitoring--analytics)
11. [Testing Strategy](#testing-strategy)
12. [Piano Implementazione](#piano-implementazione)

---

## 🎯 STRATEGIA ANTI-MANIPOLAZIONE: PREMIARE L'UTILIZZO

### **Filosofia: Gamification Positiva**

**Invece di punire chi manipola, PREMIAMO chi usa il sistema correttamente:**
- ✅ Più partite carichi → Più affidabile → Più peso nel ranking
- ✅ Più dati completi → Più valore → Più punti
- ✅ Più regolarità → Più engagement → Più bonus

**Vantaggi**:
- 🎮 Gamification positiva (incentiva comportamento corretto)
- 🔒 Non comunicabile (non possiamo dire "se fai X ti puniamo")
- 📊 Basato su dati reali (non su assunzioni su divisione)
- 💪 Scalabile (funziona per tutti i livelli)

### **Sistema Data Quality Score**

**Formula**: Più carichi, più sei affidabile, più peso hai nel ranking.

**Componenti**:
1. **Volume Score** (40%): Quante partite hai caricato
2. **Completeness Score** (30%): Quante partite complete (tutte le 5 sezioni)
3. **Regularity Score** (20%): Quanto regolarmente carichi
4. **Consistency Score** (10%): Coerenza tra partite (non solo vittorie)

**Applicazione**:
- Score leaderboard moltiplicato per `data_quality_multiplier` (0.5 - 1.5)
- Chi carica 100 partite complete = 1.5x moltiplicatore
- Chi carica 5 partite = 0.5x moltiplicatore

**Vedi sezione dettagliata**: [Sistema Data Quality Score](#e-sistema-data-quality-score-premiare-utilizzo)

---

## 🎯 ANALISI REQUISITI

### **Task (Obiettivi Settimanali)**

**Funzionalità Core**:
- ✅ Generazione automatica obiettivi settimanali (IA)
- ✅ Tracciamento progresso automatico (real-time)
- ✅ Validazione completamento
- ✅ Notifiche quando completato
- ✅ Integrazione con AI Knowledge Score

**Requisiti Enterprise**:
- ⚡ Scalabile: 10,000+ utenti simultanei
- 🔒 Sicuro: Impossibile manipolare progresso
- 📊 Tracciabile: Audit log completo
- 🔄 Resiliente: Gestione errori, retry, fallback
- ⏱️ Performance: <100ms lettura, <500ms aggiornamento

### **Classifica (Leaderboard)**

**Funzionalità Core**:
- ✅ Ranking globale basato su metriche (divisione, win rate, obiettivi completati)
- ✅ Ranking settimanale/mensile
- ✅ Categorie multiple (divisione, obiettivi, performance)
- ✅ Paginazione efficiente
- ✅ Cache intelligente

**Requisiti Enterprise**:
- ⚡ Scalabile: 100,000+ utenti, query <50ms
- 🔒 Sicuro: Impossibile manipolare ranking
- 📊 Trasparente: Calcolo verificabile
- 🔄 Real-time: Aggiornamento automatico
- ⏱️ Performance: Cache Redis, indici ottimizzati

---

## 🏗️ ARCHITETTURA ENTERPRISE

### **Componenti Sistema**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  Task Widget         │  │  Leaderboard Widget   │        │
│  │  (Dashboard)         │  │  (Dashboard)          │        │
│  └──────────────────────┘  └──────────────────────┘        │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼───────────────────────────────────────┐
│              API LAYER (Next.js API Routes)                   │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  /api/tasks/*        │  │  /api/leaderboard/*   │        │
│  │  - GET /list         │  │  - GET /global        │        │
│  │  - GET /progress     │  │  - GET /weekly        │        │
│  │  - POST /complete    │  │  - GET /user-rank     │        │
│  └──────────────────────┘  └──────────────────────┘        │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼─────┐ ┌─────▼──────┐
│   REDIS      │ │  DATABASE  │ │ BACKGROUND │
│   CACHE      │ │ (Supabase) │ │    JOBS    │
│              │ │            │ │            │
│ TTL: 5 min   │ │ Task +     │ │ Generate:  │
│ Leaderboard  │ │ Leaderboard│ │ Daily      │
│ Rankings     │ │ Audit Log  │ │ Weekly     │
└──────────────┘ └────────────┘ └────────────┘
```

### **Flusso Dati**

**1. Generazione Task (Background Job)**:
```
Cron (Domenica 23:00)
  → Queue (Bull/Agenda)
  → Batch Processing (100 utenti/batch)
  → Generate Tasks (AI)
  → Save to DB
  → Invalidate Cache
```

**2. Aggiornamento Progresso Task**:
```
Save Match Event
  → API: /api/tasks/update-progress
  → Validate (server-side only)
  → Update DB (transaction)
  → Update Leaderboard Score (async)
  → Invalidate Cache
  → Notify if completed
```

**3. Calcolo Classifica**:
```
Request Leaderboard
  → Check Cache (Redis)
  → If miss: Calculate from DB
  → Save to Cache (TTL 5 min)
  → Return paginated results
```

---

## 🗄️ DATABASE SCHEMA

### **1. Tabella `weekly_goals` (Task) - Estesa**

```sql
-- ============================================
-- MIGRAZIONE: Estensione weekly_goals per Enterprise
-- ============================================

-- Aggiungi colonne per audit e sicurezza
ALTER TABLE weekly_goals
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system' CHECK (created_by IN ('system', 'user', 'admin')),
ADD COLUMN IF NOT EXISTS verification_hash TEXT, -- Hash per verificare integrità
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completion_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb, -- Dati extra per audit

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week_status 
ON weekly_goals(user_id, week_start_date DESC, status);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_verification 
ON weekly_goals(verification_hash) WHERE verification_hash IS NOT NULL;

-- Trigger per calcolo hash (anti-manipolazione)
CREATE OR REPLACE FUNCTION calculate_goal_verification_hash()
RETURNS TRIGGER AS $$
BEGIN
  -- Hash basato su: user_id + goal_type + target_value + current_value + status + week_start_date
  -- Impossibile modificare senza invalidare hash
  NEW.verification_hash = encode(
    digest(
      NEW.user_id::text || 
      NEW.goal_type || 
      NEW.target_value::text || 
      NEW.current_value::text || 
      NEW.status || 
      NEW.week_start_date::text,
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_goal_hash ON weekly_goals;
CREATE TRIGGER trigger_calculate_goal_hash
BEFORE INSERT OR UPDATE ON weekly_goals
FOR EACH ROW
EXECUTE FUNCTION calculate_goal_verification_hash();
```

### **2. Tabella `leaderboard` (Classifica) - Nuova**

```sql
-- ============================================
-- MIGRAZIONE: Tabella leaderboard per ranking
-- ============================================

CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Score Components (calcolati automaticamente)
  total_score DECIMAL(10,2) DEFAULT 0.00 NOT NULL, -- Score totale (calcolato)
  division_score INTEGER DEFAULT 0, -- Punti basati su divisione (Division 1 = 1000, Division 2 = 800, ...)
  win_rate_score DECIMAL(5,2) DEFAULT 0.00, -- Punti basati su win rate (0-100%)
  goals_completed_score INTEGER DEFAULT 0, -- Punti obiettivi completati (10 punti/obiettivo)
  matches_played_score INTEGER DEFAULT 0, -- Punti partite giocate (1 punto/partita, max 100)
  ai_knowledge_bonus DECIMAL(5,2) DEFAULT 0.00, -- Bonus basato su AI knowledge score (0-50 punti)
  
  -- Ranking
  global_rank INTEGER, -- Ranking globale (calcolato periodicamente)
  division_rank INTEGER, -- Ranking per divisione
  weekly_rank INTEGER, -- Ranking settimanale
  monthly_rank INTEGER, -- Ranking mensile
  
  -- Periodo
  week_start_date DATE, -- Settimana corrente (per ranking settimanale)
  month_start_date DATE, -- Mese corrente (per ranking mensile)
  
  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculation_version INTEGER DEFAULT 1, -- Versione algoritmo calcolo (per rollback)
  metadata JSONB DEFAULT '{}'::jsonb, -- Dati extra per audit
  
  -- Constraints
  CONSTRAINT unique_user_leaderboard UNIQUE (user_id),
  CONSTRAINT valid_total_score CHECK (total_score >= 0),
  CONSTRAINT valid_win_rate CHECK (win_rate_score >= 0 AND win_rate_score <= 100)
);

-- Indici per performance (CRITICI per scalabilità)
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score 
ON leaderboard(total_score DESC, global_rank) 
WHERE global_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leaderboard_division_rank 
ON leaderboard(division_score DESC, division_rank) 
WHERE division_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly_rank 
ON leaderboard(week_start_date, total_score DESC, weekly_rank) 
WHERE weekly_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leaderboard_monthly_rank 
ON leaderboard(month_start_date, total_score DESC, monthly_rank) 
WHERE monthly_rank IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id 
ON leaderboard(user_id);

-- RLS Policies
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- SELECT: Tutti possono vedere leaderboard (pubblico)
CREATE POLICY "Anyone can view leaderboard"
ON leaderboard FOR SELECT
USING (true);

-- UPDATE: Solo sistema può aggiornare (via service role)
-- (Nessuna policy RLS, solo service role può modificare)

-- Trigger per aggiornamento automatico last_calculated_at
CREATE OR REPLACE FUNCTION update_leaderboard_calculated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_calculated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_leaderboard_calculated_at ON leaderboard;
CREATE TRIGGER trigger_update_leaderboard_calculated_at
BEFORE UPDATE ON leaderboard
FOR EACH ROW
EXECUTE FUNCTION update_leaderboard_calculated_at();
```

### **3. Tabella `leaderboard_history` (Storico) - Nuova**

```sql
-- ============================================
-- MIGRAZIONE: Tabella leaderboard_history per storico ranking
-- ============================================

CREATE TABLE IF NOT EXISTS leaderboard_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Snapshot ranking
  total_score DECIMAL(10,2) NOT NULL,
  global_rank INTEGER,
  division_rank INTEGER,
  weekly_rank INTEGER,
  monthly_rank INTEGER,
  
  -- Periodo snapshot
  snapshot_date DATE NOT NULL, -- Data snapshot
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indici
  CONSTRAINT unique_user_snapshot UNIQUE (user_id, snapshot_date, snapshot_type)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_history_user_date 
ON leaderboard_history(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_history_snapshot 
ON leaderboard_history(snapshot_type, snapshot_date DESC, global_rank);

-- RLS: Pubblico (storico)
ALTER TABLE leaderboard_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard history"
ON leaderboard_history FOR SELECT
USING (true);
```

### **4. Tabella `task_audit_log` (Audit) - Nuova**

```sql
-- ============================================
-- MIGRAZIONE: Tabella task_audit_log per audit completo
-- ============================================

CREATE TABLE IF NOT EXISTS task_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES weekly_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Evento
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'updated', 'progress_updated', 'completed', 'failed', 'verified', 'suspicious'
  )),
  event_description TEXT,
  
  -- Dati prima/dopo (per audit)
  old_value JSONB,
  new_value JSONB,
  
  -- Source
  source TEXT DEFAULT 'system' CHECK (source IN ('system', 'api', 'background_job', 'admin')),
  ip_address INET, -- IP richiesta (se da API)
  user_agent TEXT, -- User agent (se da API)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indici
  CONSTRAINT valid_audit_event CHECK (event_type IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_task_audit_task_id 
ON task_audit_log(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_audit_user_id 
ON task_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_audit_event_type 
ON task_audit_log(event_type, created_at DESC);

-- RLS: Solo utente può vedere i propri log
ALTER TABLE task_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
ON task_audit_log FOR SELECT
USING ((select auth.uid()) = user_id);
```

---

## 🔒 SICUREZZA & ANTI-MANIPOLAZIONE

### **1. Protezione Task (Obiettivi)**

#### **A. Validazione Server-Side Only**
```javascript
// ❌ MAI permettere frontend di aggiornare current_value direttamente
// ✅ Solo backend può aggiornare dopo validazione

// app/api/tasks/update-progress/route.js
export async function POST(request) {
  const { task_id, match_id } = await request.json()
  
  // 1. Valida autenticazione
  const token = extractBearerToken(request)
  const { user_id } = await validateToken(token)
  
  // 2. Recupera task (verifica ownership)
  const task = await getTask(task_id, user_id)
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }
  
  // 3. Recupera match (verifica ownership e validità)
  const match = await getMatch(match_id, user_id)
  if (!match || match.match_date < task.week_start_date || match.match_date > task.week_end_date) {
    return NextResponse.json({ error: 'Invalid match' }, { status: 400 })
  }
  
  // 4. Calcola nuovo progresso (SERVER-SIDE ONLY)
  const newProgress = calculateTaskProgress(task, match) // Logica server-side
  
  // 5. Verifica che nuovo progresso sia >= vecchio (no rollback)
  if (newProgress < task.current_value) {
    // Log suspicious activity
    await logAuditEvent(task_id, user_id, 'suspicious', {
      reason: 'Progress rollback attempt',
      old_value: task.current_value,
      new_value: newProgress
    })
    return NextResponse.json({ error: 'Invalid progress update' }, { status: 400 })
  }
  
  // 6. Aggiorna task (transaction)
  await updateTaskProgress(task_id, newProgress, user_id)
  
  // 7. Verifica completamento
  if (newProgress >= task.target_value && task.status === 'active') {
    await completeTask(task_id, user_id)
  }
  
  return NextResponse.json({ success: true, progress: newProgress })
}
```

#### **B. Hash Verification (Integrità Dati)**
```javascript
// Verifica hash per rilevare manipolazioni
async function verifyTaskIntegrity(task) {
  const expectedHash = calculateHash(
    task.user_id,
    task.goal_type,
    task.target_value,
    task.current_value,
    task.status,
    task.week_start_date
  )
  
  if (task.verification_hash !== expectedHash) {
    // Hash mismatch = manipolazione rilevata
    await logAuditEvent(task.id, task.user_id, 'suspicious', {
      reason: 'Hash verification failed',
      expected: expectedHash,
      actual: task.verification_hash
    })
    
    // Ripristina da backup o ricalcola
    await restoreTaskFromBackup(task.id)
    return false
  }
  
  return true
}
```

#### **C. Rate Limiting per Aggiornamenti**
```javascript
// lib/rateLimiter.js
const RATE_LIMIT_CONFIG = {
  '/api/tasks/update-progress': { 
    maxRequests: 10, // Max 10 aggiornamenti/minuto
    windowMs: 60000 
  },
  '/api/tasks/complete': { 
    maxRequests: 5, // Max 5 completamenti/minuto
    windowMs: 60000 
  }
}
```

#### **D. Validazione Completamento**
```javascript
// Verifica che completamento sia realistico
async function validateTaskCompletion(task, userId) {
  // 1. Verifica che current_value sia raggiunto in modo realistico
  const recentMatches = await getRecentMatches(userId, 5, task.week_start_date, task.week_end_date)
  
  switch (task.goal_type) {
    case 'reduce_goals_conceded':
      // Media ultimi 3 match deve essere <= target
      const avgGoals = calculateAvgGoalsConceded(recentMatches.slice(0, 3))
      if (avgGoals > task.target_value * 1.1) { // 10% tolleranza
        return { valid: false, reason: 'Target not consistently met' }
      }
      break
      
    case 'increase_wins':
      // Vittorie questa settimana devono essere >= target
      const wins = recentMatches.filter(m => isWin(m.result)).length
      if (wins < task.target_value) {
        return { valid: false, reason: 'Insufficient wins' }
      }
      break
  }
  
  return { valid: true }
}
```

### **2. Protezione Classifica (Leaderboard)**

#### **A. Calcolo Score Server-Side Only**
```javascript
// Score calcolato SOLO da dati verificati (matches, tasks)
async function calculateLeaderboardScore(userId) {
  // 1. Divisione Score (basato su current_division)
  const profile = await getUserProfile(userId)
  const divisionScore = getDivisionScore(profile.current_division) // Division 1 = 1000, Div 2 = 800, ...
  
  // 2. Win Rate Score (basato su ultimi 30 match verificati)
  const recentMatches = await getRecentMatches(userId, 30)
  const winRate = calculateWinRate(recentMatches)
  const winRateScore = winRate * 10 // 0-100% → 0-1000 punti
  
  // 3. Goals Completed Score (basato su tasks completati verificati) ⭐ PESATI
  const completedGoals = await getCompletedGoals(userId, 8) // Ultime 8 settimane
  const goalsScore = calculateWeightedGoalsScore(completedGoals) // Punteggio pesato per difficoltà e tipo
  
  // 4. Matches Played Score (basato su partite verificate)
  const totalMatches = await getTotalMatches(userId)
  const matchesScore = Math.min(100, totalMatches) // Max 100 punti
  
  // 5. AI Knowledge Bonus (basato su ai_knowledge_score verificato)
  const aiKnowledgeScore = profile.ai_knowledge_score || 0
  const aiBonus = (aiKnowledgeScore / 100) * 50 // 0-50 punti
  
  // Totale
  const totalScore = divisionScore + winRateScore + goalsScore + matchesScore + aiBonus
  
  return {
    total_score: Math.round(totalScore * 100) / 100,
    division_score: divisionScore,
    win_rate_score: winRateScore,
    goals_completed_score: goalsScore,
    matches_played_score: matchesScore,
    ai_knowledge_bonus: aiBonus
  }
}

/**
 * Calcola score pesato per task completati
 * Considera: difficoltà, tipo task, recency
 */
function calculateWeightedGoalsScore(completedGoals) {
  if (!completedGoals || completedGoals.length === 0) {
    return 0
  }
  
  let totalScore = 0
  const now = new Date()
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
  
  completedGoals.forEach(goal => {
    let taskScore = 0
    
    // 1. PESO PER DIFFICOLTÀ
    const difficultyMultiplier = {
      'easy': 1.0,    // 10 punti base
      'medium': 1.5,  // 15 punti
      'hard': 2.0     // 20 punti
    }
    const baseScore = 10
    const difficultyWeight = difficultyMultiplier[goal.difficulty] || 1.0
    taskScore = baseScore * difficultyWeight
    
    // 2. PESO PER TIPO TASK (alcuni sono più importanti)
    const goalTypeMultiplier = {
      'reduce_goals_conceded': 1.2,      // Difesa importante
      'improve_defense': 1.2,            // Difesa importante
      'increase_wins': 1.3,               // Vittorie molto importanti
      'improve_possession': 1.1,         // Possesso importante
      'use_recommended_formation': 1.0,  // Standard
      'use_ai_recommendations': 1.1,     // Engagement importante
      'complete_matches': 0.8,           // Meno importante (solo completamento)
      'custom': 1.0                       // Standard
    }
    const typeWeight = goalTypeMultiplier[goal.goal_type] || 1.0
    taskScore *= typeWeight
    
    // 3. PESO PER RECENCY (task recenti valgono di più)
    const goalDate = new Date(goal.completed_at || goal.week_start_date)
    const weeksAgo = (now - goalDate) / (1000 * 60 * 60 * 24 * 7)
    
    let recencyMultiplier = 1.0
    if (weeksAgo <= 1) {
      recencyMultiplier = 1.5  // Ultima settimana: +50%
    } else if (weeksAgo <= 2) {
      recencyMultiplier = 1.3  // 2 settimane fa: +30%
    } else if (weeksAgo <= 4) {
      recencyMultiplier = 1.1  // 4 settimane fa: +10%
    } else if (weeksAgo <= 8) {
      recencyMultiplier = 1.0  // 8 settimane fa: standard
    } else {
      recencyMultiplier = 0.5  // Più vecchi: -50% (ma contano ancora)
    }
    taskScore *= recencyMultiplier
    
    totalScore += taskScore
  })
  
  // Cap a 200 punti (equivalente a ~10 task hard completati recentemente)
  return Math.min(200, Math.round(totalScore))
}

/**
 * Helper: Recupera task completati (ultime 8 settimane)
 */
async function getCompletedGoals(userId, weeks = 8) {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7))
  
  const { data, error } = await admin
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('week_start_date', cutoffDate.toISOString().split('T')[0])
    .order('completed_at', { ascending: false })
    .order('week_start_date', { ascending: false })
  
  if (error) {
    console.error('[Leaderboard] Error fetching completed goals:', error)
    return []
  }
  
  return data || []
}

/**
 * Helper: Recupera ultime 8 settimane
 */
function getLast8Weeks() {
  const weeks = []
  const now = new Date()
  
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (i * 7))
    // Imposta a lunedì
    const dayOfWeek = weekStart.getDay()
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    
    weeks.push({
      start: weekStart.toISOString().split('T')[0],
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
  }
  
  return weeks
}
}
```

#### **B. Ranking Calcolato Periodicamente (Non Real-time)**
```javascript
// Background job: Calcola ranking ogni ora (non real-time per performance)
async function calculateGlobalRanking() {
  // 1. Calcola score per tutti gli utenti attivi
  const activeUsers = await getActiveUsers() // Utenti con almeno 1 partita
  
  // 2. Batch processing (100 utenti/batch)
  const batches = chunkArray(activeUsers, 100)
  
  for (const batch of batches) {
    await Promise.all(batch.map(async (user) => {
      const score = await calculateLeaderboardScore(user.id)
      await updateLeaderboard(user.id, score)
    }))
  }
  
  // 3. Calcola ranking (dopo aggiornamento score)
  await recalculateRankings('global')
  await recalculateRankings('division')
  await recalculateRankings('weekly')
  await recalculateRankings('monthly')
  
  // 4. Invalida cache
  await invalidateLeaderboardCache()
}
```

#### **C. Verifica Integrità Ranking**
```javascript
// Verifica che ranking sia coerente
async function verifyRankingIntegrity() {
  const leaderboard = await getLeaderboard('global', 1, 1000)
  
  // Verifica che score sia ordinato correttamente
  for (let i = 1; i < leaderboard.length; i++) {
    if (leaderboard[i].total_score > leaderboard[i-1].total_score) {
      // Ranking non ordinato = errore calcolo
      await logError('Ranking integrity check failed', {
        position: i,
        score: leaderboard[i].total_score,
        previous_score: leaderboard[i-1].total_score
      })
      
      // Ricalcola ranking
      await recalculateRankings('global')
      break
    }
  }
}
```

#### **D. Protezione da Manipolazione Dati Sorgente**
```javascript
// Verifica che dati usati per calcolo score siano validi
async function validateScoreData(userId) {
  // 1. Verifica matches (no duplicati, no partite future)
  const matches = await getMatches(userId)
  const duplicates = findDuplicates(matches, 'id')
  const futureMatches = matches.filter(m => m.match_date > new Date())
  
  if (duplicates.length > 0 || futureMatches.length > 0) {
    await logAuditEvent(null, userId, 'suspicious', {
      reason: 'Invalid matches detected',
      duplicates: duplicates.length,
      future: futureMatches.length
    })
    return false
  }
  
  // 2. Verifica tasks (no completamenti sospetti)
  const tasks = await getTasks(userId)
  const suspiciousTasks = tasks.filter(t => 
    t.status === 'completed' && 
    t.completion_verified === false &&
    t.current_value > t.target_value * 2 // Completato oltre 2x target = sospetto
  )
  
  if (suspiciousTasks.length > 0) {
    await logAuditEvent(null, userId, 'suspicious', {
      reason: 'Suspicious task completions',
      count: suspiciousTasks.length
    })
    return false
  }
  
  return true
}
```

#### **E. Sistema Data Quality Score (Premiare Utilizzo)** 🎯 **APPROCCIO POSITIVO**

**Filosofia**: Invece di punire chi manipola, PREMIAMO chi usa il sistema correttamente.

**Principio**: Più carichi, più sei affidabile, più peso hai nel ranking.

```javascript
// lib/dataQualityHelper.js

/**
 * Calcola Data Quality Score (0-100)
 * Più alto = più dati, più affidabile, più peso nel ranking
 * 
 * Componenti:
 * - Volume (25%): Quante partite caricate
 * - Completeness (20%): Quante partite complete
 * - Regularity (15%): Quanto regolarmente carichi
 * - Consistency (10%): Coerenza tra partite
 * - AI Knowledge (15%): Quanto l'IA conosce l'utente (profilo, rosa, pattern)
 * - Task Completed (15%): Obiettivi settimanali completati (engagement)
 */
async function calculateDataQualityScore(userId) {
  const matches = await getMatches(userId)
  const profile = await getUserProfile(userId)
  const weeklyGoals = await getWeeklyGoals(userId) // Recupera task settimanali
  
  if (!matches || matches.length === 0) {
    // Anche senza partite, AI Knowledge e Task possono dare punti
    const aiKnowledgeScore = profile?.ai_knowledge_score || 0
    const aiKnowledgeComponent = (aiKnowledgeScore / 100) * 15 // Max 15 punti
    
    const taskScore = calculateTaskCompletedScore(weeklyGoals) // Max 15 punti
    
    const totalScore = aiKnowledgeComponent + taskScore
    
    return {
      score: Math.round(totalScore),
      multiplier: 0.5, // Minimo 50% del score base
      components: {
        volume: 0,
        completeness: 0,
        regularity: 0,
        consistency: 0,
        ai_knowledge: Math.round(aiKnowledgeComponent),
        tasks_completed: Math.round(taskScore)
      }
    }
  }
  
  // 1. VOLUME SCORE (25%) - Quante partite hai caricato
  const volumeScore = calculateVolumeScore(matches.length)
  
  // 2. COMPLETENESS SCORE (20%) - Quante partite complete (tutte le 5 sezioni)
  const completeMatches = matches.filter(m => m.data_completeness === 'complete').length
  const completenessScore = (completeMatches / matches.length) * 20
  
  // 3. REGULARITY SCORE (15%) - Quanto regolarmente carichi
  const regularityScore = calculateRegularityScore(matches)
  
  // 4. CONSISTENCY SCORE (10%) - Coerenza tra partite (non solo vittorie)
  const consistencyScore = calculateConsistencyScore(matches)
  
  // 5. AI KNOWLEDGE SCORE (15%) - Quanto l'IA conosce l'utente
  const aiKnowledgeScore = profile?.ai_knowledge_score || 0
  const aiKnowledgeComponent = (aiKnowledgeScore / 100) * 15 // Max 15 punti
  
  // 6. TASK COMPLETED SCORE (15%) - Obiettivi settimanali completati ⭐ NUOVO
  const taskScore = calculateTaskCompletedScore(weeklyGoals)
  
  // Totale
  const totalScore = volumeScore + completenessScore + regularityScore + consistencyScore + aiKnowledgeComponent + taskScore
  
  // Calcola moltiplicatore (0.5x - 1.5x)
  // 0-30: 0.5x (troppo pochi dati)
  // 31-60: 0.7x (dati parziali)
  // 61-80: 1.0x (dati buoni)
  // 81-100: 1.5x (dati eccellenti)
  let multiplier = 0.5
  if (totalScore >= 81) multiplier = 1.5
  else if (totalScore >= 61) multiplier = 1.0
  else if (totalScore >= 31) multiplier = 0.7
  
  return {
    score: Math.round(totalScore),
    multiplier: multiplier,
    components: {
      volume: Math.round(volumeScore),
      completeness: Math.round(completenessScore),
      regularity: Math.round(regularityScore),
      consistency: Math.round(consistencyScore),
      ai_knowledge: Math.round(aiKnowledgeComponent),
      tasks_completed: Math.round(taskScore)
    }
  }
}

/**
 * Task Completed Score (15%): Obiettivi settimanali completati
 * Dimostra engagement e utilizzo del sistema
 */
function calculateTaskCompletedScore(weeklyGoals) {
  if (!weeklyGoals || !Array.isArray(weeklyGoals) || weeklyGoals.length === 0) {
    return 0
  }
  
  // Conta task completati (ultime 8 settimane = 2 mesi)
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56) // 8 settimane
  
  const recentGoals = weeklyGoals.filter(g => {
    const goalDate = new Date(g.week_start_date || g.created_at)
    return goalDate >= eightWeeksAgo
  })
  
  const completedGoals = recentGoals.filter(g => g.status === 'completed')
  const totalGoals = recentGoals.length
  
  if (totalGoals === 0) return 0
  
  // Tasso completamento (0-100%)
  const completionRate = (completedGoals.length / totalGoals) * 100
  
  // Score basato su tasso completamento e numero assoluto
  // Max 15 punti se: tasso > 60% E almeno 10 task completati
  let score = 0
  
  // Componente 1: Tasso completamento (60% del punteggio = 9 punti)
  if (completionRate >= 80) {
    score += 9 // Tasso eccellente (>80%)
  } else if (completionRate >= 60) {
    score += 7 // Tasso buono (60-80%)
  } else if (completionRate >= 40) {
    score += 5 // Tasso discreto (40-60%)
  } else if (completionRate >= 20) {
    score += 3 // Tasso basso (20-40%)
  } else {
    score += 1 // Tasso molto basso (<20%)
  }
  
  // Componente 2: Numero assoluto task completati (40% del punteggio = 6 punti)
  const completedCount = completedGoals.length
  if (completedCount >= 15) {
    score += 6 // Molti task completati (15+)
  } else if (completedCount >= 10) {
    score += 5 // Buon numero (10-14)
  } else if (completedCount >= 5) {
    score += 3 // Numero discreto (5-9)
  } else if (completedCount >= 2) {
    score += 2 // Pochi task (2-4)
  } else if (completedCount >= 1) {
    score += 1 // Almeno 1 task (1)
  }
  
  return Math.min(15, score) // Cap a 15 punti
}

/**
 * Volume Score (25%): Più partite = più affidabile
 */
function calculateVolumeScore(totalMatches) {
  // 0 partite: 0
  // 10 partite: 6.25 (25%)
  // 20 partite: 12.5 (50%)
  // 30 partite: 18.75 (75%)
  // 40+ partite: 25 (100%)
  return Math.min(25, (totalMatches / 40) * 25)
}

/**
 * Regularity Score (15%): Carica regolarmente = più affidabile
 */
function calculateRegularityScore(matches) {
  if (matches.length < 5) return 0
  
  // Analizza ultimi 30 giorni
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentMatches = matches.filter(m => new Date(m.match_date) >= thirtyDaysAgo)
  
  if (recentMatches.length === 0) return 0
  
  // Calcola giorni tra partite
  const sorted = [...recentMatches].sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
  const gaps = []
  
  for (let i = 1; i < sorted.length; i++) {
    const daysDiff = (new Date(sorted[i].match_date) - new Date(sorted[i-1].match_date)) / (1000 * 60 * 60 * 24)
    gaps.push(daysDiff)
  }
  
  if (gaps.length === 0) return 15 // Solo 1 partita = max score
  
  // Media gap: più bassa = più regolare
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
  
  // Se media gap < 3 giorni = molto regolare (15 punti)
  // Se media gap < 7 giorni = regolare (12 punti)
  // Se media gap < 14 giorni = abbastanza regolare (8 punti)
  // Altrimenti = poco regolare (4 punti)
  if (avgGap <= 3) return 15
  if (avgGap <= 7) return 12
  if (avgGap <= 14) return 8
  return 4
}

/**
 * Consistency Score (10%): Coerenza tra partite (non solo vittorie)
 */
function calculateConsistencyScore(matches) {
  if (matches.length < 10) return 0
  
  const wins = matches.filter(m => isWin(m.result)).length
  const losses = matches.filter(m => isLoss(m.result)).length
  const draws = matches.length - wins - losses
  
  const winRate = wins / matches.length
  
  // Se win rate troppo estremo (>90% o <10%) = meno coerente
  // Win rate realistico (40-70%) = più coerente
  if (winRate > 0.9 || winRate < 0.1) {
    return 2 // Troppo estremo = sospetto
  }
  
  if (winRate >= 0.4 && winRate <= 0.7) {
    return 10 // Range realistico = max score
  }
  
  return 5 // Range intermedio
}

/**
 * Applica Data Quality Multiplier al score leaderboard
 */
function applyDataQualityMultiplier(baseScore, dataQuality) {
  return Math.round(baseScore * dataQuality.multiplier * 100) / 100
}
```

**Integrazione nel Calcolo Score**:

```javascript
// Modifica calculateLeaderboardScore per includere Data Quality
async function calculateLeaderboardScore(userId) {
  // ... calcolo base score (divisione, win rate, obiettivi, ecc.) ...
  
  // CALCOLA DATA QUALITY SCORE (include AI Knowledge + Task Completed)
  const dataQuality = await calculateDataQualityScore(userId)
  
  // Applica moltiplicatore
  const finalScore = applyDataQualityMultiplier(totalScore, dataQuality)
  
  return {
    ...scoreComponents,
    total_score: finalScore,
    data_quality_score: dataQuality.score,
    data_quality_multiplier: dataQuality.multiplier,
    data_quality_components: dataQuality.components,
    // Include anche AI Knowledge Score e Task per trasparenza
    ai_knowledge_score: profile?.ai_knowledge_score || 0,
    tasks_completed_count: weeklyGoals?.filter(g => g.status === 'completed').length || 0
  }
}

// Helper: Recupera weekly goals
async function getWeeklyGoals(userId) {
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  const { data, error } = await admin
    .from('weekly_goals')
    .select('*')
    .eq('user_id', userId)
    .order('week_start_date', { ascending: false })
    .limit(100) // Ultime 100 settimane (circa 2 anni)
  
  if (error) {
    console.error('[DataQuality] Error fetching weekly goals:', error)
    return []
  }
  
  return data || []
}
```

**Note Importanti**: 
- AI Knowledge Score è già calcolato e salvato in `user_profiles.ai_knowledge_score`
- Task settimanali sono in `weekly_goals` con `status = 'completed'`
- Task Completed Score considera ultime 8 settimane (2 mesi) per rilevanza
- Combinazione tasso completamento + numero assoluto = score più accurato

**Database Schema Estensione**:

```sql
-- Aggiungi colonne per Data Quality in leaderboard
ALTER TABLE leaderboard
ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
ADD COLUMN IF NOT EXISTS data_quality_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (data_quality_multiplier >= 0.5 AND data_quality_multiplier <= 1.5),
ADD COLUMN IF NOT EXISTS data_quality_components JSONB DEFAULT '{}'::jsonb;

-- Indice per query utenti con alta qualità dati
CREATE INDEX IF NOT EXISTS idx_leaderboard_data_quality 
ON leaderboard(data_quality_score DESC, total_score DESC) 
WHERE data_quality_score >= 80;
```

**Esempi Pratici**:

```javascript
// Utente A: 50 partite complete, AI Knowledge 90%, 12 task completati (8 hard, 4 medium, ultima settimana)
// Data Quality: 95.5/100 → Multiplier: 1.5x
// Leaderboard Base: Division 2 (800) + Win Rate 70% (700) + Tasks pesati 240 + Matches 50 + AI 45 = 1835
// Score finale: 1835 * 1.5 = 2752 ✅

// Utente B: 5 partite, AI Knowledge 30%, 0 task completati
// Data Quality: 21.6/100 → Multiplier: 0.5x
// Leaderboard Base: Division 5 (400) + Win Rate 50% (500) + Tasks 0 + Matches 5 + AI 15 = 920
// Score finale: 920 * 0.5 = 460 ⚠️

// Utente C: 30 partite, AI Knowledge 70%, 8 task completati (5 medium, 3 easy, 2 settimane fa)
// Data Quality: 70.6/100 → Multiplier: 1.0x
// Leaderboard Base: Division 3 (600) + Win Rate 60% (600) + Tasks pesati 130 + Matches 30 + AI 35 = 1395
// Score finale: 1395 * 1.0 = 1395 ✅

// Utente E: 20 partite, AI Knowledge 50%, 15 task completati (10 hard recenti, 5 medium) ⭐
// Data Quality: 59/100 → Multiplier: 0.7x
// Leaderboard Base: Division 4 (500) + Win Rate 55% (550) + Tasks pesati 200 + Matches 20 + AI 25 = 1295
// Score finale: 1295 * 0.7 = 906
// (Task completati pesano molto nel leaderboard base, compensano parzialmente Data Quality)
```

**Calcolo Task Pesati (Esempio Utente E)**:
- 10 task hard recenti (ultima settimana): 10 × 2.0 (hard) × 1.3 (increase_wins) × 1.5 (recency) = 39 punti ciascuno = 390
- 5 task medium (2 settimane fa): 5 × 1.5 (medium) × 1.1 (improve_possession) × 1.3 (recency) = 10.7 punti ciascuno = 53.5
- Totale: 443.5 → Cap a 200 punti (max)

**Vantaggi**:
- ✅ **Non comunicabile**: Non diciamo come funziona, solo che "più carichi, più punti"
- ✅ **Basato su dati reali**: Numero partite, completezza, regolarità (tutti dati oggettivi)
- ✅ **Gamification positiva**: Incentiva comportamento corretto
- ✅ **Scalabile**: Funziona per tutti i livelli (non serve divisione)
- ✅ **Semplice**: Logica chiara e trasparente

---

## ⚡ SCALABILITÀ

### **1. Caching Strategy**

#### **A. Redis Cache per Leaderboard**
```javascript
// lib/cacheHelper.js
const REDIS_TTL = {
  LEADERBOARD_GLOBAL: 300, // 5 minuti
  LEADERBOARD_WEEKLY: 300,
  LEADERBOARD_MONTHLY: 300,
  LEADERBOARD_USER_RANK: 600, // 10 minuti
  TASKS_ACTIVE: 300, // 5 minuti
  TASKS_PROGRESS: 60 // 1 minuto
}

async function getLeaderboard(type, page = 1, limit = 50) {
  const cacheKey = `leaderboard:${type}:${page}:${limit}`
  
  // 1. Check cache
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 2. Calculate from DB
  const leaderboard = await calculateLeaderboardFromDB(type, page, limit)
  
  // 3. Save to cache
  await redis.setex(cacheKey, REDIS_TTL.LEADERBOARD_GLOBAL, JSON.stringify(leaderboard))
  
  return leaderboard
}

// Invalida cache quando necessario
async function invalidateLeaderboardCache() {
  const keys = await redis.keys('leaderboard:*')
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
```

#### **B. Database Indexing**
```sql
-- Indici critici per performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_score_rank 
ON leaderboard(total_score DESC NULLS LAST, global_rank) 
WHERE global_rank IS NOT NULL;

-- Indice composito per query frequenti
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_user_week 
ON leaderboard(user_id, week_start_date DESC, total_score DESC);

-- Indice per paginazione
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leaderboard_pagination 
ON leaderboard(global_rank) 
WHERE global_rank BETWEEN 1 AND 10000; -- Top 10k
```

### **2. Background Jobs (Queue System)**

#### **A. Bull Queue per Task Generation**
```javascript
// lib/queue.js
import Bull from 'bull'

const taskQueue = new Bull('task-generation', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

// Job: Genera task settimanali (ogni domenica 23:00)
taskQueue.add('generate-weekly-tasks', {}, {
  repeat: {
    cron: '0 23 * * 0' // Domenica 23:00
  },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  }
})

// Process job
taskQueue.process('generate-weekly-tasks', async (job) => {
  const activeUsers = await getActiveUsers()
  const batches = chunkArray(activeUsers, 100)
  
  for (const batch of batches) {
    await Promise.all(batch.map(async (user) => {
      try {
        const tasks = await generateTasksForUser(user.id)
        await saveTasks(user.id, tasks)
      } catch (error) {
        // Log error, continue with next user
        console.error(`[Task Generation] Error for user ${user.id}:`, error)
      }
    }))
  }
})
```

#### **B. Background Job per Ranking Calculation**
```javascript
// Job: Calcola ranking (ogni ora)
const rankingQueue = new Bull('ranking-calculation', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

rankingQueue.add('calculate-global-ranking', {}, {
  repeat: {
    cron: '0 * * * *' // Ogni ora
  },
  attempts: 2
})

rankingQueue.process('calculate-global-ranking', async (job) => {
  await calculateGlobalRanking()
})
```

### **3. Database Partitioning (Future)**

```sql
-- Partizionamento per leaderboard_history (se > 1M righe)
CREATE TABLE leaderboard_history_2026_01 PARTITION OF leaderboard_history
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE leaderboard_history_2026_02 PARTITION OF leaderboard_history
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

## 🔄 GESTIONE & RESET

### **1. Reset Task Settimanali**

#### **A. Reset Automatico (Domenica)**
```javascript
// Background job: Reset task settimanali
async function resetWeeklyTasks() {
  const currentWeek = getCurrentWeek()
  
  // 1. Valuta task attivi della settimana precedente
  const previousWeek = getPreviousWeek()
  const activeTasks = await getActiveTasks(previousWeek)
  
  for (const task of activeTasks) {
    // Se non completato → failed
    if (task.status === 'active') {
      await updateTaskStatus(task.id, 'failed', {
        reason: 'Week ended without completion'
      })
    }
  }
  
  // 2. Genera nuovi task per settimana corrente
  await generateWeeklyTasksForAllUsers(currentWeek)
  
  // 3. Invalida cache
  await invalidateTasksCache()
}
```

#### **B. Reset Manuale (Admin Only)**
```javascript
// app/api/admin/reset-tasks/route.js
export async function POST(request) {
  // 1. Verifica admin
  const token = extractBearerToken(request)
  const { user_id, is_admin } = await validateToken(token)
  
  if (!is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  const { week_start_date, user_id: targetUserId } = await request.json()
  
  // 2. Reset task per utente specifico o tutti
  if (targetUserId) {
    await resetUserTasks(targetUserId, week_start_date)
  } else {
    await resetAllTasks(week_start_date)
  }
  
  // 3. Log admin action
  await logAdminAction(user_id, 'reset_tasks', { week_start_date, targetUserId })
  
  return NextResponse.json({ success: true })
}
```

### **2. Reset Classifica**

#### **A. Reset Periodico (Mensile/Annuale)**
```javascript
// Background job: Reset ranking mensile
async function resetMonthlyRanking() {
  const currentMonth = getCurrentMonth()
  
  // 1. Salva snapshot storico
  const leaderboard = await getLeaderboard('monthly', 1, 10000)
  await saveLeaderboardSnapshot('monthly', currentMonth, leaderboard)
  
  // 2. Reset ranking mensile (mantieni globale)
  await resetRanking('monthly', currentMonth)
  
  // 3. Ricalcola ranking mensile
  await calculateRanking('monthly', currentMonth)
  
  // 4. Invalida cache
  await invalidateLeaderboardCache()
}
```

#### **B. Reset Manuale (Admin Only)**
```javascript
// app/api/admin/reset-leaderboard/route.js
export async function POST(request) {
  // 1. Verifica admin
  const token = extractBearerToken(request)
  const { user_id, is_admin } = await validateToken(token)
  
  if (!is_admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  const { type, date } = await request.json() // type: 'weekly' | 'monthly' | 'global'
  
  // 2. Salva backup prima di reset
  await backupLeaderboard(type, date)
  
  // 3. Reset
  await resetRanking(type, date)
  
  // 4. Ricalcola
  await calculateRanking(type, date)
  
  // 5. Log admin action
  await logAdminAction(user_id, 'reset_leaderboard', { type, date })
  
  return NextResponse.json({ success: true })
}
```

### **3. Rollback (Recovery)**

```javascript
// Rollback a versione precedente
async function rollbackLeaderboard(version) {
  // 1. Recupera snapshot
  const snapshot = await getLeaderboardSnapshot(version)
  
  // 2. Ripristina
  await restoreLeaderboard(snapshot)
  
  // 3. Invalida cache
  await invalidateLeaderboardCache()
  
  // 4. Log
  await logAdminAction(null, 'rollback_leaderboard', { version })
}
```

---

## 📡 API DESIGN

### **1. Task API**

```javascript
// GET /api/tasks/list
// Restituisce task attivi per utente corrente
// Query params: ?week_start_date=2026-01-26 (opzionale)

// GET /api/tasks/progress/:task_id
// Restituisce progresso task specifico

// POST /api/tasks/update-progress
// Aggiorna progresso task (solo backend, chiamato dopo save-match)
// Body: { task_id, match_id }

// POST /api/tasks/complete
// Segna task come completato (solo backend, chiamato dopo validazione)
// Body: { task_id }

// GET /api/tasks/history
// Restituisce storico task completati
// Query params: ?limit=10&offset=0
```

### **2. Leaderboard API**

```javascript
// GET /api/leaderboard/global
// Restituisce classifica globale
// Query params: ?page=1&limit=50

// GET /api/leaderboard/weekly
// Restituisce classifica settimanale
// Query params: ?week_start_date=2026-01-26&page=1&limit=50

// GET /api/leaderboard/monthly
// Restituisce classifica mensile
// Query params: ?month=2026-01&page=1&limit=50

// GET /api/leaderboard/user-rank
// Restituisce ranking utente corrente per tutte le categorie
// Response: { global_rank, division_rank, weekly_rank, monthly_rank, total_score }

// GET /api/leaderboard/history
// Restituisce storico ranking utente
// Query params: ?type=weekly&limit=10
```

---

## 🎨 FRONTEND COMPONENTS

### **1. Task Widget (Dashboard)**

```jsx
// components/TaskWidget.jsx
export default function TaskWidget() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchTasks()
  }, [])
  
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks/list')
      const data = await response.json()
      setTasks(data.tasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="task-widget">
      <h2>Obiettivi Settimanali</h2>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
```

### **2. Leaderboard Widget (Dashboard)**

```jsx
// components/LeaderboardWidget.jsx
export default function LeaderboardWidget() {
  const [leaderboard, setLeaderboard] = useState([])
  const [userRank, setUserRank] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchLeaderboard()
    fetchUserRank()
  }, [])
  
  return (
    <div className="leaderboard-widget">
      <h2>Classifica Globale</h2>
      {userRank && (
        <div className="user-rank">
          Il tuo ranking: #{userRank.global_rank}
        </div>
      )}
      <LeaderboardTable data={leaderboard} />
    </div>
  )
}
```

---

## 🔄 BACKGROUND JOBS

### **1. Cron Schedule**

```javascript
// lib/cronJobs.js
export const CRON_JOBS = {
  // Genera task settimanali (ogni domenica 23:00)
  GENERATE_WEEKLY_TASKS: '0 23 * * 0',
  
  // Calcola ranking globale (ogni ora)
  CALCULATE_GLOBAL_RANKING: '0 * * * *',
  
  // Calcola ranking settimanale (ogni domenica 00:00)
  CALCULATE_WEEKLY_RANKING: '0 0 * * 0',
  
  // Calcola ranking mensile (1° del mese 00:00)
  CALCULATE_MONTHLY_RANKING: '0 0 1 * *',
  
  // Verifica integrità (ogni 6 ore)
  VERIFY_INTEGRITY: '0 */6 * * *',
  
  // Reset task settimanali (ogni domenica 23:30)
  RESET_WEEKLY_TASKS: '30 23 * * 0',
  
  // Salva snapshot storico (ogni giorno 01:00)
  SAVE_HISTORICAL_SNAPSHOT: '0 1 * * *'
}
```

---

## 📊 MONITORING & ANALYTICS

### **1. Metriche Chiave**

```javascript
// Metriche da tracciare
const METRICS = {
  // Task
  TASK_COMPLETION_RATE: 'task.completion_rate', // % task completati
  TASK_AVERAGE_COMPLETION_TIME: 'task.avg_completion_time', // Giorni medi
  TASK_GENERATION_SUCCESS_RATE: 'task.generation_success_rate', // % utenti con task generati
  
  // Leaderboard
  LEADERBOARD_CACHE_HIT_RATE: 'leaderboard.cache_hit_rate', // % cache hits
  LEADERBOARD_CALCULATION_TIME: 'leaderboard.calculation_time', // Tempo calcolo (ms)
  LEADERBOARD_QUERY_TIME: 'leaderboard.query_time', // Tempo query (ms)
  
  // Sicurezza
  SUSPICIOUS_ACTIVITIES: 'security.suspicious_activities', // Numero attività sospette
  HASH_VERIFICATION_FAILURES: 'security.hash_verification_failures', // Hash mismatch
}
```

### **2. Alerting**

```javascript
// Alert critici
const ALERTS = {
  // Task
  TASK_GENERATION_FAILED: {
    threshold: 10, // % fallimenti
    action: 'notify_admin'
  },
  
  // Leaderboard
  LEADERBOARD_CALCULATION_FAILED: {
    threshold: 1, // Qualsiasi fallimento
    action: 'notify_admin'
  },
  
  // Sicurezza
  SUSPICIOUS_ACTIVITY_DETECTED: {
    threshold: 1, // Qualsiasi attività sospetta
    action: 'notify_admin_and_log'
  },
  
  HASH_VERIFICATION_FAILED: {
    threshold: 1, // Qualsiasi hash mismatch
    action: 'notify_admin_and_restore'
  }
}
```

---

## 🧪 TESTING STRATEGY

### **1. Unit Tests**

```javascript
// tests/task.test.js
describe('Task System', () => {
  test('calculateTaskProgress - reduce_goals_conceded', () => {
    const task = { goal_type: 'reduce_goals_conceded', target_value: 1.6 }
    const matches = [
      { team_stats: { goals_conceded: 1 } },
      { team_stats: { goals_conceded: 2 } },
      { team_stats: { goals_conceded: 1 } }
    ]
    const progress = calculateTaskProgress(task, matches)
    expect(progress).toBe(1.33) // Media: (1+2+1)/3 = 1.33
  })
  
  test('validateTaskCompletion - valid completion', () => {
    const task = { goal_type: 'increase_wins', target_value: 3, current_value: 3 }
    const isValid = validateTaskCompletion(task)
    expect(isValid).toBe(true)
  })
  
  test('verifyTaskIntegrity - hash mismatch', () => {
    const task = {
      id: '123',
      user_id: 'user-1',
      goal_type: 'increase_wins',
      target_value: 3,
      current_value: 5, // Manipolato
      verification_hash: 'wrong-hash'
    }
    const isValid = verifyTaskIntegrity(task)
    expect(isValid).toBe(false)
  })
})
```

### **2. Integration Tests**

```javascript
// tests/integration/task-flow.test.js
describe('Task Flow Integration', () => {
  test('Complete flow: Generate → Update → Complete', async () => {
    // 1. Genera task
    const tasks = await generateTasksForUser('user-1')
    expect(tasks.length).toBeGreaterThan(0)
    
    // 2. Salva match
    const match = await saveMatch('user-1', matchData)
    
    // 3. Aggiorna progresso task
    const updated = await updateTaskProgress(tasks[0].id, match.id)
    expect(updated.current_value).toBeGreaterThan(0)
    
    // 4. Completa task (se target raggiunto)
    if (updated.current_value >= updated.target_value) {
      const completed = await completeTask(tasks[0].id)
      expect(completed.status).toBe('completed')
    }
  })
})
```

### **3. Load Tests**

```javascript
// tests/load/leaderboard.test.js
describe('Leaderboard Load Test', () => {
  test('Handle 1000 concurrent requests', async () => {
    const requests = Array(1000).fill(null).map(() => 
      fetch('/api/leaderboard/global?page=1&limit=50')
    )
    
    const start = Date.now()
    const responses = await Promise.all(requests)
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(5000) // < 5 secondi
    expect(responses.every(r => r.ok)).toBe(true)
  })
})
```

---

## 📋 PIANO IMPLEMENTAZIONE

### **Fase 1: Database & Schema (Settimana 1)**
- [ ] Estendi `weekly_goals` con colonne audit
- [ ] Crea tabella `leaderboard`
- [ ] Crea tabella `leaderboard_history`
- [ ] Crea tabella `task_audit_log`
- [ ] Estendi `user_profiles` con colonne trust_score e manipulation tracking
- [ ] Estendi `leaderboard` con colonne manipulation tracking
- [ ] Crea indici per performance
- [ ] Test migrazioni

### **Fase 2: Backend Core (Settimana 2)**
- [ ] Helper `taskHelper.js` (calcolo progresso, validazione)
- [ ] Helper `leaderboardHelper.js` (calcolo score, ranking)
- [ ] Helper `dataQualityHelper.js` (calcolo data quality score) 🎯 **CRITICO**
- [ ] API `/api/tasks/*`
- [ ] API `/api/leaderboard/*`
- [ ] Integrazione `save-match` → aggiorna task + calcola data quality
- [ ] Test unitari

### **Fase 3: Background Jobs (Settimana 3)**
- [ ] Setup Bull Queue
- [ ] Job generazione task settimanali
- [ ] Job calcolo ranking
- [ ] Job verifica integrità
- [ ] Test background jobs

### **Fase 4: Cache & Performance (Settimana 4)**
- [ ] Setup Redis
- [ ] Cache helper
- [ ] Cache invalidation
- [ ] Ottimizzazione query
- [ ] Load testing

### **Fase 5: Frontend (Settimana 5)**
- [ ] Componente `TaskWidget`
- [ ] Componente `LeaderboardWidget`
- [ ] Pagina `/obiettivi` (dettagli task)
- [ ] Pagina `/classifica` (dettagli leaderboard)
- [ ] Integrazione dashboard

### **Fase 6: Sicurezza & Audit (Settimana 6)**
- [ ] Hash verification
- [ ] Validazione server-side
- [ ] Audit logging
- [ ] Rate limiting
- [ ] Test sicurezza

### **Fase 7: Monitoring & Analytics (Settimana 7)**
- [ ] Metriche tracking
- [ ] Alerting
- [ ] Dashboard analytics
- [ ] Logging strutturato

### **Fase 8: Testing & QA (Settimana 8)**
- [ ] Test end-to-end
- [ ] Test sicurezza
- [ ] Test performance
- [ ] Test scalabilità
- [ ] Bug fixing

---

## ✅ CHECKLIST FINALE

### **Sicurezza**
- [ ] Validazione server-side only
- [ ] Hash verification per integrità
- [ ] Rate limiting
- [ ] Audit logging completo
- [ ] Protezione da manipolazione
- [ ] **Sistema Data Quality Score (premiare utilizzo)** 🎯 **CRITICO**
- [ ] **Calcolo moltiplicatore basato su volume, completezza, regolarità**
- [ ] **Integrazione in calcolo leaderboard score**

### **Scalabilità**
- [ ] Redis cache
- [ ] Database indexing
- [ ] Background jobs (queue)
- [ ] Paginazione efficiente
- [ ] Load testing passato

### **Gestione**
- [ ] Reset automatico
- [ ] Reset manuale (admin)
- [ ] Rollback capability
- [ ] Backup automatico
- [ ] Monitoring completo

### **Performance**
- [ ] Query < 50ms (con cache)
- [ ] Calcolo ranking < 5 minuti
- [ ] Cache hit rate > 90%
- [ ] Supporto 10,000+ utenti

---

**Fine Progettazione Enterprise**

**Prossimo Step**: Implementazione Fase 1 (Database & Schema)
