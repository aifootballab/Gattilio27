# 🚀 Piano Implementazione Barra Conoscenza IA - Enterprise

**Data**: 26 Gennaio 2026  
**Status**: 📋 **PRE-IMPLEMENTAZIONE** - Analisi completa e preparazione  
**Obiettivo**: Implementare barra conoscenza IA con coerenza totale, UX perfetta, bilingue, rollback sicuro

---

## ✅ CHECKLIST PRE-IMPLEMENTAZIONE

### **1. Analisi Coerenza Supabase** ✅

#### **Schema Database Esistente**
- ✅ Pattern: `CREATE TABLE IF NOT EXISTS` (non distruttivo)
- ✅ Pattern: `ADD COLUMN IF NOT EXISTS` (non distruttivo)
- ✅ Pattern: Trigger per calcolo automatico (es. `calculate_profile_completion_score`)
- ✅ Pattern: RLS con `(select auth.uid()) = user_id`
- ✅ Pattern: Indici per performance (`idx_*`)
- ✅ Pattern: CHECK constraints per validazione

#### **Coerenza da Rispettare**
```sql
-- Pattern esistente per colonne calcolate
profile_completion_score DECIMAL(5,2) DEFAULT 0.00 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100)
profile_completion_level TEXT DEFAULT 'beginner' CHECK (profile_completion_level IN ('beginner', 'intermediate', 'complete'))

-- Pattern esistente per RLS
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id)

-- Pattern esistente per trigger
CREATE OR REPLACE FUNCTION calculate_*()
RETURNS TRIGGER AS $$
BEGIN
  -- Logica calcolo
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### **2. Analisi Coerenza Codice Esistente** ✅

#### **Pattern API Routes**
- ✅ Autenticazione: `extractBearerToken` + `validateToken`
- ✅ Rate limiting: `checkRateLimit` con `RATE_LIMIT_CONFIG`
- ✅ Error handling: `NextResponse.json({ error: ... }, { status: ... })`
- ✅ Validazione input: Helper `toText()`, `toInt()`, `toTextArray()`
- ✅ Service Role Key: `createClient(supabaseUrl, serviceKey)`

#### **Pattern Frontend**
- ✅ `useTranslation()` per i18n
- ✅ `supabase.auth.getSession()` per autenticazione
- ✅ Loading states: `<RefreshCw size={32} style={{ animation: 'spin...' }} />`
- ✅ Error states: `<AlertCircle />` con messaggio
- ✅ Progress bars: Stile esistente in `impostazioni-profilo/page.jsx`

#### **Stile Progress Bar Esistente** (da replicare)
```jsx
// Pattern esistente (impostazioni-profilo/page.jsx, righe 241-266)
<div style={{
  width: '100%',
  height: '24px',
  backgroundColor: '#2a2a2a',
  borderRadius: '12px',
  overflow: 'hidden',
  marginBottom: '8px',
  position: 'relative'
}}>
  <div style={{
    width: `${score}%`,
    height: '100%',
    backgroundColor: score >= 87.5 ? '#00ff88' : score >= 50 ? '#00d4ff' : '#ffaa00',
    transition: 'width 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '8px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#000'
  }}>
    {score > 10 && `${Math.round(score)}%`}
  </div>
</div>
```

---

### **3. Analisi UX e Responsività** ✅

#### **Pattern Dashboard Widget**
- ✅ Container: `backgroundColor: '#1a1a1a'`, `borderRadius: '12px'`, `padding: '20px'`, `border: '1px solid #2a2a2a'`
- ✅ Header: Icona + Titolo + Badge (allineamento flex)
- ✅ Responsive: `clamp()` per font-size, `flexWrap: 'wrap'` per layout
- ✅ Spacing: `marginBottom: '24px'` tra widget

#### **Responsività**
- ✅ Font size: `clamp(18px, 4vw, 24px)` per titoli
- ✅ Padding: `clamp(16px, 4vw, 24px)` per container
- ✅ Gap: `gap: '12px'` per flex items
- ✅ Max width: `maxWidth: '1400px'` per main container

---

### **4. Analisi Bilingue (i18n)** ✅

#### **Pattern Traduzioni**
- ✅ File: `lib/i18n.js`
- ✅ Struttura: `translations.it` e `translations.en`
- ✅ Uso: `t('key')` in componenti
- ✅ Fallback: `t('key') || 'Fallback text'` (da evitare, aggiungere traduzione)

#### **Traduzioni da Aggiungere**
```javascript
// IT
aiKnowledge: 'Conoscenza AI',
aiKnowledgeLevel: 'Livello',
aiKnowledgeBeginner: 'Principiante',
aiKnowledgeIntermediate: 'Intermedio',
aiKnowledgeAdvanced: 'Avanzato',
aiKnowledgeExpert: 'Esperto',
aiKnowledgeDescription: 'L\'IA sta imparando a conoscerti',
viewDetails: 'Vedi dettagli',
completeProfileToIncreaseKnowledge: 'Completa il profilo per aumentare la conoscenza dell\'IA',
weeklyGoals: 'Obiettivi Settimanali',
noGoalsThisWeek: 'Nessun obiettivo questa settimana',
goalsWillBeGenerated: 'Gli obiettivi verranno generati automaticamente ogni domenica',
goalCompleted: 'Obiettivo completato',
goalFailed: 'Obiettivo fallito',
viewAllGoals: 'Vedi tutti gli obiettivi',

// EN
aiKnowledge: 'AI Knowledge',
aiKnowledgeLevel: 'Level',
aiKnowledgeBeginner: 'Beginner',
aiKnowledgeIntermediate: 'Intermediate',
aiKnowledgeAdvanced: 'Advanced',
aiKnowledgeExpert: 'Expert',
aiKnowledgeDescription: 'The AI is learning to know you',
viewDetails: 'View details',
completeProfileToIncreaseKnowledge: 'Complete your profile to increase AI knowledge',
weeklyGoals: 'Weekly Goals',
noGoalsThisWeek: 'No goals this week',
goalsWillBeGenerated: 'Goals will be automatically generated every Sunday',
goalCompleted: 'Goal completed',
goalFailed: 'Goal failed',
viewAllGoals: 'View all goals',
```

---

### **5. Piano Rollback** ✅

#### **File da Creare per Rollback**
1. **`migrations/rollback_ai_knowledge.sql`** - Rimuove colonne aggiunte
2. **`rollback/ai-knowledge-*.js`** - Backup codice API
3. **`rollback/AIKnowledgeBar-*.jsx`** - Backup componente frontend

#### **Procedura Rollback**
```sql
-- 1. Rimuovi colonne user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS ai_knowledge_score,
DROP COLUMN IF EXISTS ai_knowledge_level,
DROP COLUMN IF EXISTS ai_knowledge_breakdown,
DROP COLUMN IF EXISTS ai_knowledge_last_calculated,
DROP COLUMN IF EXISTS initial_division;

-- 2. Rimuovi tabella weekly_goals
DROP TABLE IF EXISTS weekly_goals CASCADE;

-- 3. Rimuovi trigger se creato
DROP TRIGGER IF EXISTS trigger_set_initial_division ON user_profiles;
DROP FUNCTION IF EXISTS set_initial_division();

-- 4. Rimuovi indici
DROP INDEX IF EXISTS idx_user_profiles_ai_knowledge;
DROP INDEX IF EXISTS idx_weekly_goals_user_week;
```

---

## 📋 IMPLEMENTAZIONE STEP-BY-STEP

### **FASE 1: Database Schema (Sicuro, Non Distruttivo)**

#### **1.1 Migrazione `user_profiles`**
```sql
-- migrations/add_ai_knowledge_to_user_profiles.sql

-- Aggiungi colonne (IF NOT EXISTS = sicuro)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS ai_knowledge_score DECIMAL(5,2) DEFAULT 0.00 CHECK (ai_knowledge_score >= 0 AND ai_knowledge_score <= 100),
ADD COLUMN IF NOT EXISTS ai_knowledge_level TEXT DEFAULT 'beginner' CHECK (ai_knowledge_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
ADD COLUMN IF NOT EXISTS ai_knowledge_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ai_knowledge_last_calculated TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS initial_division TEXT;

-- Indice per performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_ai_knowledge 
ON user_profiles(user_id, ai_knowledge_score DESC);

-- Trigger per salvare initial_division (solo se NULL)
CREATE OR REPLACE FUNCTION set_initial_division()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.initial_division IS NULL AND NEW.current_division IS NOT NULL THEN
    NEW.initial_division := NEW.current_division;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_initial_division ON user_profiles;
CREATE TRIGGER trigger_set_initial_division
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION set_initial_division();

-- Commenti per documentazione
COMMENT ON COLUMN user_profiles.ai_knowledge_score IS 'Score 0-100 che indica quanto l''IA conosce il cliente';
COMMENT ON COLUMN user_profiles.ai_knowledge_level IS 'Livello conoscenza: beginner (0-30%), intermediate (31-60%), advanced (61-80%), expert (81-100%)';
COMMENT ON COLUMN user_profiles.ai_knowledge_breakdown IS 'Dettaglio score per componente: {profile: 15, roster: 20, matches: 10, ...}';
COMMENT ON COLUMN user_profiles.initial_division IS 'Divisione al primo login (per tracciare miglioramento)';
```

#### **1.2 Migrazione `weekly_goals`**
```sql
-- migrations/create_weekly_goals_table.sql

CREATE TABLE IF NOT EXISTS weekly_goals (
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
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0.00,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Periodo
  week_start_date DATE NOT NULL, -- Lunedì
  week_end_date DATE NOT NULL,   -- Domenica
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_week 
ON weekly_goals(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_status 
ON weekly_goals(user_id, status, week_start_date DESC);

-- RLS
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "Users can view own goals" ON weekly_goals;
CREATE POLICY "Users can view own goals"
ON weekly_goals FOR SELECT
USING ((select auth.uid()) = user_id);

-- INSERT Policy
DROP POLICY IF EXISTS "Users can insert own goals" ON weekly_goals;
CREATE POLICY "Users can insert own goals"
ON weekly_goals FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- UPDATE Policy
DROP POLICY IF EXISTS "Users can update own goals" ON weekly_goals;
CREATE POLICY "Users can update own goals"
ON weekly_goals FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- DELETE Policy (opzionale, per cleanup)
DROP POLICY IF EXISTS "Users can delete own goals" ON weekly_goals;
CREATE POLICY "Users can delete own goals"
ON weekly_goals FOR DELETE
USING ((select auth.uid()) = user_id);
```

#### **1.3 Rollback Migration**
```sql
-- migrations/rollback_ai_knowledge.sql

-- ATTENZIONE: Eseguire solo se necessario rollback completo

-- 1. Rimuovi colonne user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS ai_knowledge_score,
DROP COLUMN IF EXISTS ai_knowledge_level,
DROP COLUMN IF EXISTS ai_knowledge_breakdown,
DROP COLUMN IF EXISTS ai_knowledge_last_calculated,
DROP COLUMN IF EXISTS initial_division;

-- 2. Rimuovi tabella weekly_goals
DROP TABLE IF EXISTS weekly_goals CASCADE;

-- 3. Rimuovi trigger
DROP TRIGGER IF EXISTS trigger_set_initial_division ON user_profiles;
DROP FUNCTION IF EXISTS set_initial_division();

-- 4. Rimuovi indici
DROP INDEX IF EXISTS idx_user_profiles_ai_knowledge;
DROP INDEX IF EXISTS idx_weekly_goals_user_week;
DROP INDEX IF EXISTS idx_weekly_goals_status;
```

---

### **FASE 2: Backend Core (Business Logic)**

#### **2.1 Libreria Calcolo Score**
```javascript
// lib/aiKnowledgeHelper.js

/**
 * Calcola score conoscenza IA per utente
 * @param {string} userId - User ID
 * @returns {Promise<{score: number, level: string, breakdown: object}>}
 */
export async function calculateAIKnowledgeScore(userId) {
  // Implementazione completa con tutte le metriche
  // Pattern: Stateless, testabile, con error handling
}

/**
 * Determina livello conoscenza da score
 * @param {number} score - Score 0-100
 * @returns {string} - 'beginner' | 'intermediate' | 'advanced' | 'expert'
 */
export function getAIKnowledgeLevel(score) {
  if (score >= 81) return 'expert'
  if (score >= 61) return 'advanced'
  if (score >= 31) return 'intermediate'
  return 'beginner'
}
```

#### **2.2 API Endpoint**
```javascript
// app/api/ai-knowledge/route.js

// Pattern: Stesso stile di save-profile, analyze-match
// - Autenticazione
// - Rate limiting
// - Validazione
// - Error handling
// - Cache headers
```

---

### **FASE 3: Frontend Component**

#### **3.1 Componente AIKnowledgeBar**
```jsx
// components/AIKnowledgeBar.jsx

// Pattern: Stesso stile di progress bar in impostazioni-profilo
// - Responsive (clamp, flexWrap)
// - Bilingue (useTranslation)
// - Loading states
// - Error boundaries
// - Animazioni CSS (non JS)
```

#### **3.2 Integrazione Dashboard**
```jsx
// app/page.jsx

// Posizione: Dopo header, prima statistiche squadra
// Stile: Identico a widget esistenti
// Responsive: clamp, flexWrap
```

---

### **FASE 4: Integrazione Sistema**

#### **4.1 save-match → Aggiorna Score**
```javascript
// app/api/supabase/save-match/route.js

// Dopo salvataggio match
await updateAIKnowledgeScore(userId) // Async, non blocca
```

#### **4.2 analyze-match → Include Obiettivi**
```javascript
// app/api/analyze-match/route.js

// Nel prompt, includi obiettivi attivi
const activeGoals = await getActiveWeeklyGoals(userId)
// Aggiungi al prompt
```

#### **4.3 assistant-chat → Include Obiettivi**
```javascript
// app/api/assistant-chat/route.js

// Nel contesto, includi obiettivi attivi
const activeGoals = await getActiveWeeklyGoals(userId)
// Aggiungi al context
```

---

## 🎨 SPECIFICHE UI/UX

### **Design Barra Conoscenza IA**

**Stile**: Identico a barra profilazione (`impostazioni-profilo/page.jsx`)

```jsx
<div style={{
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: 'clamp(16px, 4vw, 20px)',
  marginBottom: '24px',
  border: '1px solid #2a2a2a'
}}>
  {/* Header */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Brain size={20} color="#00d4ff" />
      <h2 style={{
        margin: 0,
        fontSize: 'clamp(16px, 4vw, 18px)',
        fontWeight: '600'
      }}>
        {t('aiKnowledge')}
      </h2>
    </div>
    <span style={{
      fontSize: 'clamp(12px, 3vw, 14px)',
      color: '#888'
    }}>
      {score}%
    </span>
  </div>
  
  {/* Progress Bar - IDENTICO a profilazione */}
  <div style={{
    width: '100%',
    height: '24px',
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '12px',
    position: 'relative'
  }}>
    <div style={{
      width: `${score}%`,
      height: '100%',
      backgroundColor: getColorForScore(score), // Verde/Blu/Arancione
      transition: 'width 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '8px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#000'
    }}>
      {score > 10 && `${Math.round(score)}%`}
    </div>
  </div>
  
  {/* Level Badge */}
  <div style={{
    fontSize: 'clamp(12px, 3vw, 14px)',
    color: '#888',
    marginBottom: '8px'
  }}>
    {getLevelText(level)} - {t('aiKnowledgeDescription')}
  </div>
  
  {/* Breakdown (Espandibile) */}
  <details style={{
    fontSize: 'clamp(11px, 3vw, 13px)',
    color: '#666',
    marginTop: '8px'
  }}>
    <summary style={{
      cursor: 'pointer',
      marginBottom: '8px',
      color: '#888'
    }}>
      {t('viewDetails')}
    </summary>
    <div style={{
      marginTop: '8px',
      paddingLeft: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <div>Profilo: {breakdown.profile || 0}/20</div>
      <div>Rosa: {breakdown.roster || 0}/25</div>
      <div>Partite: {breakdown.matches || 0}/30</div>
      <div>Pattern: {breakdown.patterns || 0}/15</div>
      <div>Allenatore: {breakdown.coach || 0}/10</div>
      <div>Utilizzo: {breakdown.usage || 0}/10</div>
      <div>Successi: {breakdown.success || 0}/15</div>
    </div>
  </details>
  
  {/* CTA se score basso */}
  {score < 50 && (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      backgroundColor: 'rgba(255, 165, 0, 0.1)',
      borderRadius: '8px',
      fontSize: 'clamp(11px, 3vw, 13px)',
      color: '#ffaa00'
    }}>
      💡 {t('completeProfileToIncreaseKnowledge')}
    </div>
  )}
</div>
```

**Colori** (coerenti con sistema esistente):
- 0-30%: `#ff6b00` (Arancione)
- 31-60%: `#ffaa00` (Giallo/Arancione)
- 61-80%: `#00d4ff` (Blu - neon-blue)
- 81-100%: `#00ff88` (Verde - neon-green)

---

### **Design Widget Obiettivi Settimanali**

**Stile**: Identico a widget dashboard esistenti

```jsx
<div style={{
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: 'clamp(16px, 4vw, 20px)',
  marginBottom: '24px',
  border: '1px solid #2a2a2a'
}}>
  {/* Header */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '8px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Trophy size={20} color="#00d4ff" />
      <h2 style={{
        margin: 0,
        fontSize: 'clamp(16px, 4vw, 18px)',
        fontWeight: '600'
      }}>
        {t('weeklyGoals')}
      </h2>
    </div>
    <span style={{
      fontSize: 'clamp(11px, 3vw, 12px)',
      color: '#888'
    }}>
      {getCurrentWeekLabel()}
    </span>
  </div>
  
  {/* Lista Obiettivi - Responsive */}
  {weeklyGoals.length === 0 ? (
    <div style={{
      fontSize: 'clamp(12px, 3vw, 14px)',
      color: '#888',
      textAlign: 'center',
      padding: '20px'
    }}>
      {t('noGoalsThisWeek')}
      <br />
      <span style={{
        fontSize: 'clamp(11px, 3vw, 12px)',
        color: '#666'
      }}>
        {t('goalsWillBeGenerated')}
      </span>
    </div>
  ) : (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {weeklyGoals.map(goal => (
        <div key={goal.id} style={{
          padding: 'clamp(12px, 3vw, 16px)',
          backgroundColor: getGoalBackgroundColor(goal.status),
          borderRadius: '8px',
          border: `1px solid ${getGoalBorderColor(goal.status)}`
        }}>
          {/* Progress Bar per obiettivo attivo */}
          {goal.status === 'active' && (
            <div style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#2a2a2a',
              borderRadius: '3px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(100, (goal.current_value / goal.target_value) * 100)}%`,
                height: '100%',
                backgroundColor: '#00d4ff',
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

---

## 🔄 PROCEDURA ROLLBACK

### **Se Qualcosa Va Storto**

#### **Step 1: Verifica Problema**
```sql
-- Verifica colonne aggiunte
SELECT column_name, data_type, default_value
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name LIKE 'ai_knowledge%';

-- Verifica tabella weekly_goals
SELECT COUNT(*) FROM weekly_goals;
```

#### **Step 2: Rollback Database**
```bash
# Esegui migrazione rollback
psql $DATABASE_URL -f migrations/rollback_ai_knowledge.sql
```

#### **Step 3: Rollback Codice**
```bash
# Ripristina file da backup
cp rollback/ai-knowledge-*.js app/api/ai-knowledge/route.js
cp rollback/AIKnowledgeBar-*.jsx components/AIKnowledgeBar.jsx
```

#### **Step 4: Verifica**
- ✅ Dashboard carica senza errori
- ✅ Nessun errore console
- ✅ Query database funzionano

---

## 📝 TRADUZIONI COMPLETE

### **Aggiungere in `lib/i18n.js`**

```javascript
it: {
  // ... existing ...
  aiKnowledge: 'Conoscenza AI',
  aiKnowledgeLevel: 'Livello',
  aiKnowledgeBeginner: 'Principiante',
  aiKnowledgeIntermediate: 'Intermedio',
  aiKnowledgeAdvanced: 'Avanzato',
  aiKnowledgeExpert: 'Esperto',
  aiKnowledgeDescription: 'L\'IA sta imparando a conoscerti',
  aiKnowledgeDescriptionBeginner: 'L\'IA sta imparando a conoscerti',
  aiKnowledgeDescriptionIntermediate: 'L\'IA ti conosce abbastanza bene',
  aiKnowledgeDescriptionAdvanced: 'L\'IA ti conosce molto bene',
  aiKnowledgeDescriptionExpert: 'L\'IA ti conosce perfettamente',
  viewDetails: 'Vedi dettagli',
  completeProfileToIncreaseKnowledge: 'Completa il profilo per aumentare la conoscenza dell\'IA',
  weeklyGoals: 'Obiettivi Settimanali',
  noGoalsThisWeek: 'Nessun obiettivo questa settimana',
  goalsWillBeGenerated: 'Gli obiettivi verranno generati automaticamente ogni domenica',
  goalCompleted: 'Obiettivo completato',
  goalFailed: 'Obiettivo fallito',
  viewAllGoals: 'Vedi tutti gli obiettivi',
  currentWeek: 'Settimana corrente',
  // ...
},
en: {
  // ... existing ...
  aiKnowledge: 'AI Knowledge',
  aiKnowledgeLevel: 'Level',
  aiKnowledgeBeginner: 'Beginner',
  aiKnowledgeIntermediate: 'Intermediate',
  aiKnowledgeAdvanced: 'Advanced',
  aiKnowledgeExpert: 'Expert',
  aiKnowledgeDescription: 'The AI is learning to know you',
  aiKnowledgeDescriptionBeginner: 'The AI is learning to know you',
  aiKnowledgeDescriptionIntermediate: 'The AI knows you fairly well',
  aiKnowledgeDescriptionAdvanced: 'The AI knows you very well',
  aiKnowledgeDescriptionExpert: 'The AI knows you perfectly',
  viewDetails: 'View details',
  completeProfileToIncreaseKnowledge: 'Complete your profile to increase AI knowledge',
  weeklyGoals: 'Weekly Goals',
  noGoalsThisWeek: 'No goals this week',
  goalsWillBeGenerated: 'Goals will be automatically generated every Sunday',
  goalCompleted: 'Goal completed',
  goalFailed: 'Goal failed',
  viewAllGoals: 'View all goals',
  currentWeek: 'Current week',
  // ...
}
```

---

## ✅ CHECKLIST FINALE PRE-IMPLEMENTAZIONE

### **Database**
- [x] Schema analizzato (pattern esistenti)
- [x] Migrazioni preparate (IF NOT EXISTS, non distruttive)
- [x] Rollback preparato
- [x] RLS policies coerenti
- [x] Indici per performance

### **Backend**
- [x] Pattern API analizzati
- [x] Error handling coerente
- [x] Validazione input coerente
- [x] Rate limiting incluso
- [x] Cache strategy definita

### **Frontend**
- [x] Stile progress bar analizzato
- [x] Pattern componenti analizzati
- [x] Responsività verificata
- [x] Bilingue completo
- [x] Loading/Error states definiti

### **Integrazione**
- [x] save-match → aggiornamento score
- [x] analyze-match → include obiettivi
- [x] assistant-chat → include obiettivi
- [x] Dashboard → widget visualizzazione

### **Rollback**
- [x] SQL rollback preparato
- [x] Procedura rollback documentata
- [x] Backup strategy definita

---

## 🚀 ORDINE IMPLEMENTAZIONE (Sicuro)

### **Step 1: Database (Sicuro)**
1. Esegui `migrations/add_ai_knowledge_to_user_profiles.sql`
2. Esegui `migrations/create_weekly_goals_table.sql`
3. Verifica: Query test per colonne/indici

### **Step 2: Backend Helper (Isolato)**
1. Crea `lib/aiKnowledgeHelper.js`
2. Test unit (funzioni calcolo)
3. Verifica: Test manuale funzioni

### **Step 3: API Endpoint (Isolato)**
1. Crea `app/api/ai-knowledge/route.js`
2. Test endpoint (Postman/curl)
3. Verifica: Response corretta

### **Step 4: Frontend Component (Isolato)**
1. Crea `components/AIKnowledgeBar.jsx`
2. Test componente (Storybook o pagina test)
3. Verifica: Rendering corretto

### **Step 5: Integrazione Dashboard (Incrementale)**
1. Import componente in `app/page.jsx`
2. Aggiungi widget dopo header
3. Verifica: Dashboard funziona

### **Step 6: Integrazione Sistema (Incrementale)**
1. save-match → aggiorna score (async)
2. analyze-match → include obiettivi
3. assistant-chat → include obiettivi
4. Verifica: Ogni integrazione funziona

### **Step 7: Obiettivi Settimanali (Fase 2)**
1. Background job generazione
2. Tracciamento progresso
3. Widget obiettivi dashboard
4. Verifica: Flusso completo

---

## ⚠️ RISCHI E MITIGAZIONE

### **Rischio 1: Query Pesanti**
**Mitigazione**:
- ✅ Cache Redis (TTL 5 min)
- ✅ Indici database
- ✅ Calcolo async (non blocca)

### **Rischio 2: Rollback Necessario**
**Mitigazione**:
- ✅ Migrazioni non distruttive (IF NOT EXISTS)
- ✅ SQL rollback preparato
- ✅ Backup codice prima modifiche

### **Rischio 3: Performance Frontend**
**Mitigazione**:
- ✅ Lazy loading breakdown
- ✅ Cache locale (5 min)
- ✅ Skeleton loader durante fetch

### **Rischio 4: Bilingue Incompleto**
**Mitigazione**:
- ✅ Checklist traduzioni completa
- ✅ Test cambio lingua
- ✅ Fallback a EN se mancante

---

**Fine Piano Implementazione**

**Status**: ✅ **PRONTO PER IMPLEMENTAZIONE**

**Prossimo Step**: Eseguire Step 1 (Database Schema)
