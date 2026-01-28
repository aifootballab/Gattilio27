# 📋 Documentazione Completa - Sistema Task (Obiettivi Settimanali)

**Versione**: 1.0.0  
**Data**: 27 Gennaio 2026  
**Status**: ✅ **Produzione Ready**

---

## 📑 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Schema Database](#schema-database)
4. [API Endpoints](#api-endpoints)
5. [Helper Functions](#helper-functions)
6. [Frontend Components](#frontend-components)
7. [Flussi Operativi](#flussi-operativi)
8. [Sicurezza](#sicurezza)
9. [Performance](#performance)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 Panoramica

Il **Sistema Task (Obiettivi Settimanali)** è un sistema enterprise-grade per la gestione di obiettivi settimanali personalizzati generati automaticamente dall'IA per ogni utente.

### **Caratteristiche Principali**

- ✅ **Generazione Automatica**: Task generati automaticamente basati su performance utente
- ✅ **Tracking in Tempo Reale**: Progresso aggiornato automaticamente dopo ogni partita
- ✅ **Gamification**: Sistema di difficoltà (easy/medium/hard) e scoring pesato
- ✅ **Integrazione Leaderboard**: Task completati contribuiscono al punteggio classifica
- ✅ **Data Quality Score**: Task completati migliorano il Data Quality Score (anti-manipolazione)

### **Tipi di Task Supportati**

1. **`reduce_goals_conceded`**: Riduci gol subiti
2. **`increase_wins`**: Aumenta vittorie
3. **`improve_possession`**: Migliora possesso palla
4. **`complete_matches`**: Completa N partite
5. **`improve_defense`**: Migliora difesa
6. **`use_recommended_formation`**: Usa formazione consigliata
7. **`use_ai_recommendations`**: Applica consigli IA
8. **`custom`**: Obiettivo personalizzato

---

## 🏗️ Architettura

### **Stack Tecnologico**

- **Backend**: Next.js 14 API Routes (Node.js serverless)
- **Database**: Supabase (PostgreSQL)
- **Frontend**: React 18, Next.js 14 (App Router)
- **Autenticazione**: Supabase Auth (Bearer Token)
- **Sicurezza**: Row Level Security (RLS), Rate Limiting

### **Componenti Principali**

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  TaskWidget.jsx                                  │   │
│  │  - Visualizza task attivi                        │   │
│  │  - Progress bar                                  │   │
│  │  - Status (active/completed/failed)              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │  /api/tasks/list │  │ /api/tasks/      │           │
│  │  GET             │  │ generate         │           │
│  │  - Lista task    │  │ POST             │           │
│  │  - Filtro sett.  │  │ - Genera task    │           │
│  └──────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    HELPER LAYER                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  taskHelper.js                                   │   │
│  │  - generateWeeklyTasksForUser()                  │   │
│  │  - updateTasksProgressAfterMatch()               │   │
│  │  - calculateTaskProgress()                      │   │
│  │  - calculateWeightedTasksScore()                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  weekly_goals                                     │   │
│  │  - RLS abilitato                                  │   │
│  │  - 4 indici ottimizzati                           │   │
│  │  - CHECK constraints                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Schema Database

### **Tabella `weekly_goals`**

```sql
CREATE TABLE weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Obiettivo
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'reduce_goals_conceded',
    'increase_wins',
    'improve_possession',
    'use_recommended_formation',
    'complete_matches',
    'improve_defense',
    'use_ai_recommendations',
    'custom'
  )),
  goal_description TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0.00,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Periodo
  week_start_date DATE NOT NULL,  -- Lunedì
  week_end_date DATE NOT NULL,    -- Domenica
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_by TEXT DEFAULT 'system' CHECK (created_by IN ('system', 'user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Indici**

```sql
-- Indice principale: query per user + settimana
CREATE INDEX idx_weekly_goals_user_week 
ON weekly_goals(user_id, week_start_date DESC);

-- Indice per status: query task attivi/completati
CREATE INDEX idx_weekly_goals_status 
ON weekly_goals(user_id, status, week_start_date DESC);

-- Indice parziale: solo task attivi (più performante)
CREATE INDEX idx_weekly_goals_active 
ON weekly_goals(user_id, status) 
WHERE status = 'active';
```

### **RLS Policies**

```sql
-- SELECT: Utente vede solo propri task
CREATE POLICY "Users can view own goals"
ON weekly_goals FOR SELECT
USING ((select auth.uid()) = user_id);

-- INSERT: Utente può inserire solo propri task
CREATE POLICY "Users can insert own goals"
ON weekly_goals FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE: Utente può aggiornare solo propri task
CREATE POLICY "Users can update own goals"
ON weekly_goals FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- DELETE: Utente può eliminare solo propri task
CREATE POLICY "Users can delete own goals"
ON weekly_goals FOR DELETE
USING ((select auth.uid()) = user_id);
```

---

## 🔌 API Endpoints

### **GET `/api/tasks/list`**

**Descrizione**: Restituisce task attivi per l'utente corrente.

**Autenticazione**: Bearer Token (obbligatorio)

**Query Parameters**:
- `week_start_date` (opzionale): Data inizio settimana (YYYY-MM-DD). Default: settimana corrente.

**Rate Limiting**:
- **Configurato** in `lib/rateLimiter.js` come `60 req/min`
- **Attualmente disabilitato** nella route `app/api/tasks/list/route.js` (commentato perché endpoint di sola lettura e leggero)

**Response**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "goal_type": "reduce_goals_conceded",
      "goal_description": "Riduci gol subiti del 20% (da 2.5 a 2.0 per partita)",
      "target_value": 2.0,
      "current_value": 2.3,
      "difficulty": "medium",
      "week_start_date": "2026-01-26",
      "week_end_date": "2026-02-01",
      "status": "active",
      "completed_at": null,
      "created_by": "system",
      "created_at": "2026-01-26T10:00:00Z",
      "updated_at": "2026-01-27T15:30:00Z"
    }
  ],
  "week_start_date": "2026-01-26",
  "count": 1
}
```

**Error Responses**:
- `401 Unauthorized`: Token mancante o invalido
- `400 Bad Request`: Formato data invalido
- `429 Too Many Requests`: Rate limit superato
- `500 Internal Server Error`: Errore server

**Esempio**:
```bash
curl -X GET "https://api.example.com/api/tasks/list?week_start_date=2026-01-26" \
  -H "Authorization: Bearer <token>"
```

---

### **POST `/api/tasks/generate`**

**Descrizione**: Genera task settimanali per l'utente corrente (principalmente per test/manuale).

**Autenticazione**: Bearer Token (obbligatorio)

**Body** (opzionale):
```json
{
  "week_start_date": "2026-01-26"  // Opzionale, default: settimana corrente
}
```

**Rate Limiting**: 5 richieste/minuto

**Response**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid",
      "goal_type": "reduce_goals_conceded",
      "goal_description": "Riduci gol subiti del 20%",
      "target_value": 2.0,
      "difficulty": "medium",
      "status": "active"
    }
  ],
  "week": {
    "start": "2026-01-26",
    "end": "2026-02-01"
  },
  "count": 1
}
```

**Note**:
- Se task già esistono per la settimana, ritorna array vuoto (non duplica)
- Genera task basati su performance utente (ultime 10 partite)

**Esempio**:
```bash
curl -X POST "https://api.example.com/api/tasks/generate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"week_start_date": "2026-01-26"}'
```

---

## 🛠️ Helper Functions

### **`generateWeeklyTasksForUser(userId, supabaseUrl, serviceKey, week)`**

**Descrizione**: Genera task settimanali per un utente basati su performance.

**Parametri**:
- `userId` (string): ID utente
- `supabaseUrl` (string): URL Supabase
- `serviceKey` (string): Service Role Key
- `week` (object): `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`

**Ritorna**: `Promise<Array>` - Array di task generati

**Logica**:
1. Recupera profilo utente
2. Recupera ultime 10 partite
3. Recupera pattern tattici
4. Analizza performance (gol subiti, possesso, win rate)
5. Genera task personalizzati
6. Salva nel database

**Esempio**:
```javascript
import { generateWeeklyTasksForUser, getCurrentWeek } from '@/lib/taskHelper'

const week = getCurrentWeek()
const tasks = await generateWeeklyTasksForUser(
  userId,
  supabaseUrl,
  serviceKey,
  week
)
```

---

### **`updateTasksProgressAfterMatch(userId, supabaseUrl, serviceKey, matchData)`**

**Descrizione**: Aggiorna progresso task dopo salvataggio partita.

**Parametri**:
- `userId` (string): ID utente
- `supabaseUrl` (string): URL Supabase
- `serviceKey` (string): Service Role Key
- `matchData` (object): Dati partita appena salvata

**Ritorna**: `Promise<Array>` - Array di task aggiornati

**Logica**:
1. Recupera task attivi (ultime 2 settimane, per supportare partite caricate in ritardo)
2. Recupera ultime 20 partite per calcolo metriche
3. Per ogni task attivo:
   - Calcola nuovo progresso basato su tipo task
   - Aggiorna `current_value`
   - Se `current_value >= target_value`, completa task
4. Se task completati, aggiorna AI Knowledge Score (async)

**Integrazione**: Chiamato automaticamente in `/api/supabase/save-match` (async, non blocca)

**Esempio**:
```javascript
import { updateTasksProgressAfterMatch } from '@/lib/taskHelper'

// Chiamato automaticamente dopo save-match
await updateTasksProgressAfterMatch(
  userId,
  supabaseUrl,
  serviceKey,
  savedMatch
)
```

---

### **`calculateTaskProgress(task, recentMatches, newMatch)`**

**Descrizione**: Calcola nuovo progresso per un task specifico.

**Parametri**:
- `task` (object): Task da aggiornare
- `recentMatches` (array): Ultime partite
- `newMatch` (object): Nuova partita appena salvata

**Ritorna**: `Promise<{ current_value: number }>`

**Logica per Tipo Task**:

1. **`reduce_goals_conceded`**:
   - Media gol subiti ultimi 5 match nella settimana del task
   - Formula: `sum(goals_conceded) / count(matches)`

2. **`increase_wins`**:
   - Conta vittorie nella settimana del task
   - Formula: `count(matches WHERE result = 'win' AND match_date IN week)`

3. **`improve_possession`**:
   - Media possesso ultimi 5 match nella settimana del task
   - Formula: `sum(possession) / count(matches)`

4. **`complete_matches`**:
   - Conta partite complete nella settimana del task
   - Formula: `count(matches WHERE data_completeness = 'complete' AND match_date IN week)`

**Note**:
- Filtra partite per settimana del task (non settimana corrente)
- Supporta partite caricate in ritardo (ultime 2 settimane)

---

### **`calculateWeightedTasksScore(completedTasks)`**

**Descrizione**: Calcola score pesato per task completati (usato in leaderboard).

**Parametri**:
- `completedTasks` (array): Array di task completati

**Ritorna**: `number` - Score pesato (0-200)

**Formula**:
```
Base Score = 10 punti per task

Moltiplicatori:
- Difficoltà:
  - easy: 1.0x
  - medium: 1.5x
  - hard: 2.0x

- Tipo Task:
  - increase_wins: 1.3x
  - reduce_goals_conceded: 1.2x
  - improve_defense: 1.2x
  - improve_possession: 1.1x
  - use_ai_recommendations: 1.1x
  - altri: 1.0x

- Recency (settimane fa):
  - ≤ 1 settimana: 1.5x
  - ≤ 2 settimane: 1.3x
  - ≤ 4 settimane: 1.1x
  - ≤ 8 settimane: 1.0x
  - > 8 settimane: 0.5x

Score Finale = Base × Difficoltà × Tipo × Recency
Cap: 200 punti totali
```

**Esempio**:
```javascript
import { calculateWeightedTasksScore } from '@/lib/taskHelper'

const score = calculateWeightedTasksScore(completedTasks)
// Esempio: 3 task hard completati questa settimana = ~90 punti
```

---

### **`getCurrentWeek()`**

**Descrizione**: Ottiene settimana corrente (Lunedì - Domenica).

**Ritorna**: `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`

**Esempio**:
```javascript
import { getCurrentWeek } from '@/lib/taskHelper'

const week = getCurrentWeek()
// { start: '2026-01-26', end: '2026-02-01' }
```

---

## 🎨 Frontend Components

### **`TaskWidget.jsx`**

**Descrizione**: Componente React per visualizzare task settimanali nella dashboard.

**Props**: Nessuna (usa Supabase Auth per autenticazione)

**Features**:
- ✅ Lista task attivi/completati/falliti
- ✅ Progress bar per task attivi
- ✅ Badge difficoltà (🟢 Facile, 🟡 Medio, 🔴 Difficile)
- ✅ Responsive (mobile-friendly)
- ✅ Loading states
- ✅ Error handling

**Utilizzo**:
```jsx
import TaskWidget from '@/components/TaskWidget'

export default function Dashboard() {
  return (
    <div>
      <AIKnowledgeBar />
      <TaskWidget />  {/* ⭐ Task Widget */}
      {/* ... altri componenti */}
    </div>
  )
}
```

**Styling**:
- Background: `#1a1a1a`
- Border: `#2a2a2a`
- Accent: `#00d4ff`
- Completed: `rgba(34, 197, 94, 0.1)`
- Failed: `rgba(239, 68, 68, 0.1)`

---

## 🔄 Flussi Operativi

### **1. Generazione Task (Automatica)**

```
┌─────────────────────────────────────────┐
│  Background Job (ogni domenica)        │
│  - Per ogni utente attivo               │
│  - Genera task per settimana successiva │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  generateWeeklyTasksForUser()           │
│  - Analizza performance                 │
│  - Genera 2-3 task personalizzati       │
│  - Salva in weekly_goals                │
└─────────────────────────────────────────┘
```

### **2. Aggiornamento Progresso (Automatico)**

```
┌─────────────────────────────────────────┐
│  Utente salva partita                   │
│  POST /api/supabase/save-match          │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  updateTasksProgressAfterMatch()         │
│  (async, non blocca risposta)           │
│  - Recupera task attivi                 │
│  - Calcola nuovo progresso              │
│  - Aggiorna current_value               │
│  - Se target raggiunto → completa task  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Se task completati:                    │
│  - Aggiorna AI Knowledge Score (async)  │
│  - Contribuisce a Leaderboard Score     │
└─────────────────────────────────────────┘
```

### **3. Visualizzazione Task (Frontend)**

```
┌─────────────────────────────────────────┐
│  Utente apre Dashboard                  │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  TaskWidget.jsx                         │
│  - useEffect() → fetchTasks()           │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  GET /api/tasks/list                    │
│  - Autenticazione Bearer Token          │
│  - Rate Limiting                        │
│  - Query Supabase (RLS)                 │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Render Task List                       │
│  - Status icons                         │
│  - Progress bars                        │
│  - Difficulty badges                    │
└─────────────────────────────────────────┘
```

---

## 🔒 Sicurezza

### **Autenticazione**

- **Bearer Token**: Obbligatorio per tutti gli endpoint
- **Validazione**: `validateToken(token, supabaseUrl, anonKey)`
- **Pattern**: Coerente con altri endpoint del progetto

### **Row Level Security (RLS)**

- ✅ **Abilitato** su `weekly_goals`
- ✅ **Policies**: Utente vede/modifica solo propri task
- ✅ **Verifica Doppia**: `user_id` verificato in query + update

### **Rate Limiting**

- `/api/tasks/list`:
  - **Configurato**: `60 req/min` in `lib/rateLimiter.js`
  - **Enforcement**: al momento **disabilitato** nella route (commentato)
- `/api/tasks/generate`: **5 req/min** (enforced)

### **Validazione Input**

- ✅ Formato data: `YYYY-MM-DD`
- ✅ Range data: non futura, max 1 anno fa
- ✅ `target_value > 0`
- ✅ `current_value >= 0`
- ✅ CHECK constraints nel database

---

## ⚡ Performance

### **Ottimizzazioni Database**

1. **Indici**:
   - `idx_weekly_goals_user_week`: Query per user + settimana
   - `idx_weekly_goals_status`: Query per status
   - `idx_weekly_goals_active`: Indice parziale (solo active)

2. **Query Ottimizzate**:
   - Select solo colonne necessarie
   - Limit su query match (max 20)
   - Filtro match validi prima di processare

3. **Async Operations**:
   - Aggiornamento task non blocca save-match
   - AI Knowledge Score update async

### **Frontend**

- ✅ Validazione dati prima di render
- ✅ Loading states
- ✅ Error boundaries
- ✅ Responsive (clamp, flexWrap)

---

## 🧪 Testing

### **Test Manuali**

1. **Generazione Task**:
   ```bash
   POST /api/tasks/generate
   Authorization: Bearer <token>
   ```

2. **Lista Task**:
   ```bash
   GET /api/tasks/list
   Authorization: Bearer <token>
   ```

3. **Aggiornamento Progresso**:
   - Salva partita → Verifica aggiornamento task
   - Completa target → Verifica completamento automatico

### **Test Edge Cases**

- ✅ Task già esistenti per settimana (non duplica)
- ✅ Partita fuori settimana task (non aggiorna)
- ✅ Target value = 0 (filtra task invalidi)
- ✅ Current value > target (completa task)
- ✅ Match data mancante (gestione graceful)

---

## 🐛 Troubleshooting

### **Problema: Task non vengono generati**

**Possibili Cause**:
1. Utente non ha abbastanza partite (< 3)
2. Task già esistenti per settimana
3. Errore in generazione

**Soluzione**:
```javascript
// Verifica task esistenti
const { data } = await supabase
  .from('weekly_goals')
  .select('*')
  .eq('user_id', userId)
  .eq('week_start_date', weekStart)

// Se vuoto, genera manualmente
POST /api/tasks/generate
```

---

### **Problema: Progresso non si aggiorna**

**Possibili Cause**:
1. Partita fuori settimana task
2. Errore in calcolo progresso
3. Task già completato

**Soluzione**:
```javascript
// Verifica log
console.log('[TaskHelper] Error updating tasks progress:', error)

// Verifica settimana partita
const matchDate = new Date(match.match_date)
const taskWeekStart = new Date(task.week_start_date)
const taskWeekEnd = new Date(task.week_end_date)

// Match deve essere nella settimana del task
```

---

### **Problema: Task completati non aggiornano AI Knowledge**

**Possibili Cause**:
1. Update async fallito
2. AI Knowledge Score non calcolato

**Soluzione**:
```javascript
// Verifica log
console.log('[TaskHelper] Failed to update AI knowledge score:', err)

// Ricalcola manualmente
POST /api/ai-knowledge
```

---

## 📚 Riferimenti

- **Documentazione Supabase**: https://supabase.com/docs
- **Next.js API Routes**: https://nextjs.org/docs/api-routes/introduction
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security

---

## 📝 Changelog

### **v1.0.0** (27 Gennaio 2026)
- ✅ Implementazione iniziale sistema Task
- ✅ Generazione automatica task
- ✅ Tracking progresso in tempo reale
- ✅ Integrazione leaderboard
- ✅ Frontend TaskWidget
- ✅ Documentazione completa

---

**Ultimo Aggiornamento**: 27 Gennaio 2026  
**Mantenuto da**: Team eFootball AI Coach
