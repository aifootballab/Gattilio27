# 👨‍💻 Guida Sviluppatori - Sistema Task

**Versione**: 1.0.0  
**Data**: 27 Gennaio 2026

---

## 🚀 Quick Start

### **Setup Locale**

1. **Clona repository**:
```bash
git clone <repository-url>
cd Gattilio27-master
```

2. **Installa dipendenze**:
```bash
npm install
```

3. **Configura variabili ambiente**:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

4. **Esegui migration (Supabase SQL Editor)**:
- Apri Supabase → **SQL Editor**
- Copia/incolla il contenuto di:
  - `migrations/create_weekly_goals_table.sql`
  - `migrations/fix_weekly_goals_created_by.sql`
- Esegui le query in ordine (sono non-distruttive dove possibile).

5. **Avvia dev server**:
```bash
npm run dev
```

---

## 📁 Struttura File

```
Gattilio27-master/
├── app/
│   └── api/
│       └── tasks/
│           ├── list/
│           │   └── route.js          # GET /api/tasks/list
│           └── generate/
│               └── route.js          # POST /api/tasks/generate
│
├── lib/
│   └── taskHelper.js                 # Helper functions principali
│
├── components/
│   └── TaskWidget.jsx                # Componente React frontend
│
├── migrations/
│   ├── create_weekly_goals_table.sql # Migration iniziale
│   └── fix_weekly_goals_created_by.sql # Migration created_by
│
└── DOCUMENTAZIONE_TASK_SISTEMA.md    # Documentazione completa
```

---

## 🔧 Sviluppo

### **Aggiungere Nuovo Tipo Task**

1. **Aggiorna schema database**:
```sql
-- Aggiungi nuovo tipo in CHECK constraint
ALTER TABLE weekly_goals
DROP CONSTRAINT weekly_goals_goal_type_check;

ALTER TABLE weekly_goals
ADD CONSTRAINT weekly_goals_goal_type_check
CHECK (goal_type IN (
  'reduce_goals_conceded',
  'increase_wins',
  'improve_possession',
  'use_recommended_formation',
  'complete_matches',
  'improve_defense',
  'use_ai_recommendations',
  'custom',
  'new_task_type'  -- ⭐ NUOVO
));
```

2. **Aggiungi logica in `taskHelper.js`**:
```javascript
// In generateTasksBasedOnData()
if (/* condizione per nuovo task */) {
  tasks.push({
    goal_type: 'new_task_type',
    goal_description: 'Descrizione task',
    target_value: 10,
    difficulty: 'medium'
  })
}

// In calculateTaskProgress()
case 'new_task_type':
  // Logica calcolo progresso
  currentValue = calculateNewTaskProgress(recentMatches, newMatch)
  break
```

3. **Aggiorna documentazione**:
- Aggiungi tipo in `DOCUMENTAZIONE_TASK_SISTEMA.md`
- Aggiorna esempi

---

### **Modificare Logica Generazione**

**File**: `lib/taskHelper.js` → `generateTasksBasedOnData()`

**Esempio**: Cambiare soglia per task "reduce_goals_conceded"

```javascript
// Prima: avgGoalsConceded > 2.0
if (avgGoalsConceded > 2.0) {
  // ...
}

// Dopo: avgGoalsConceded > 1.5
if (avgGoalsConceded > 1.5) {
  // ...
}
```

---

### **Modificare Calcolo Progresso**

**File**: `lib/taskHelper.js` → `calculateTaskProgress()`

**Esempio**: Cambiare numero match per media gol subiti

```javascript
case 'reduce_goals_conceded':
  // Prima: ultimi 5 match
  const matchesForAvg = recentMatches.slice(0, 5)
  
  // Dopo: ultimi 10 match
  const matchesForAvg = recentMatches.slice(0, 10)
  currentValue = calculateAvgGoalsConceded(matchesForAvg)
  break
```

---

### **Aggiungere Endpoint API**

**Template**:
```javascript
// app/api/tasks/[action]/route.js
import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '../../../../lib/authHelper'
import { checkRateLimit } from '../../../../lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    // 1. Autenticazione
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    
    if (authError || !userData?.user?.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const user_id = userData.user.id

    // 2. Rate limiting
    const rateLimit = checkRateLimit(user_id, '/api/tasks/[action]')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: rateLimit.resetAt },
        { status: 429 }
      )
    }

    // 3. Logica endpoint
    // ...

    // 4. Response
    return NextResponse.json({
      success: true,
      // ...
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
      }
    })
  } catch (error) {
    console.error('[tasks/[action]] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 🧪 Testing

### **Test Unitari**

**File**: `lib/taskHelper.test.js` (da creare)

```javascript
import { getCurrentWeek, calculateWeightedTasksScore } from './taskHelper'

describe('taskHelper', () => {
  test('getCurrentWeek returns correct week', () => {
    const week = getCurrentWeek()
    expect(week.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(week.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('calculateWeightedTasksScore calculates correctly', () => {
    const tasks = [
      { difficulty: 'hard', goal_type: 'increase_wins', completed_at: new Date() }
    ]
    const score = calculateWeightedTasksScore(tasks)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(200)
  })
})
```

### **Test Integration**

**File**: `__tests__/api/tasks.test.js` (da creare)

```javascript
import { createMocks } from 'node-mocks-http'
import handler from '../../../app/api/tasks/list/route'

describe('/api/tasks/list', () => {
  test('returns 401 without token', async () => {
    const { req, res } = createMocks({
      method: 'GET'
    })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(401)
  })
})
```

---

## 🐛 Debug

### **Logging**

**Pattern**:
```javascript
console.log('[TaskHelper] Action:', { userId, taskId, ...data })
console.error('[TaskHelper] Error:', error)
```

**Esempi**:
```javascript
// Generazione task
console.log(`[TaskHelper] Generated ${tasks.length} tasks for user ${userId}`)

// Aggiornamento progresso
console.log(`[TaskHelper] Updated task ${task.id}: ${oldValue} → ${newValue}`)

// Completamento task
console.log(`[TaskHelper] Task ${task.id} completed!`)
```

### **Verifica Database**

```sql
-- Verifica task utente
SELECT * FROM weekly_goals 
WHERE user_id = '<user_id>' 
ORDER BY week_start_date DESC;

-- Verifica task completati
SELECT COUNT(*) FROM weekly_goals 
WHERE user_id = '<user_id>' 
AND status = 'completed';

-- Verifica indici
EXPLAIN SELECT * FROM weekly_goals 
WHERE user_id = '<user_id>' 
AND week_start_date = '2026-01-26';
```

---

## 📊 Monitoring

### **Metriche da Monitorare**

1. **Generazione Task**:
   - Numero task generati per settimana
   - Tasso successo generazione
   - Errori generazione

2. **Completamento Task**:
   - Tasso completamento per tipo task
   - Tempo medio completamento
   - Task falliti

3. **Performance**:
   - Tempo risposta API
   - Query database performance
   - Rate limit hits

### **Logs da Analizzare**

```bash
# Generazione task
grep "TaskHelper.*Generated" logs.txt

# Errori
grep "TaskHelper.*Error" logs.txt

# Completamento task
grep "TaskHelper.*completed" logs.txt
```

---

## 🔄 Deployment

### **Pre-Deployment Checklist**

- [ ] Migration eseguite in produzione
- [ ] Variabili ambiente configurate
- [ ] Rate limiting testato
- [ ] RLS policies verificate
- [ ] Indici creati
- [ ] Test end-to-end passati

### **Deployment Steps**

1. **Esegui migration**:
```sql
-- In Supabase Production SQL Editor
\i migrations/create_weekly_goals_table.sql
\i migrations/fix_weekly_goals_created_by.sql
```

2. **Verifica schema**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weekly_goals';
```

3. **Deploy codice**:
```bash
git push origin main
# Vercel auto-deploy
```

4. **Verifica post-deploy**:
```bash
# Test endpoint
curl -X GET "https://api.production.com/api/tasks/list" \
  -H "Authorization: Bearer <token>"
```

---

## 📚 Best Practices

### **Codice**

1. **Error Handling**: Sempre try-catch, logging strutturato
2. **Validazione**: Valida input prima di processare
3. **Async**: Usa async/await, non bloccare operazioni principali
4. **RLS**: Sempre verifica user_id in query
5. **Rate Limiting**: Configura per ogni endpoint

### **Database**

1. **Indici**: Crea indici per query frequenti
2. **RLS**: Abilita sempre RLS per tabelle user-specific
3. **Constraints**: Usa CHECK constraints per validazione
4. **Migration**: Sempre IF NOT EXISTS per non distruttive

### **API**

1. **Autenticazione**: Sempre Bearer Token
2. **Rate Limiting**: Configura appropriato
3. **Error Response**: Formato coerente
4. **Headers**: Rate limit headers sempre

---

## 🆘 Supporto

**Documentazione**: `DOCUMENTAZIONE_TASK_SISTEMA.md`  
**Issues**: Apri issue su repository  
**Team**: Contatta team eFootball AI Coach

---

**Ultimo Aggiornamento**: 27 Gennaio 2026
