# 🎯 Analisi 360° - Gestione Obiettivi Settimanali

**Data**: 26 Gennaio 2026  
**Ruolo**: Product Manager Full-Stack Enterprise  
**Obiettivo**: Definire sistema completo per gestione obiettivi settimanali

---

## 🔍 ANALISI 360° - TUTTE LE DIMENSIONI

### **1. GENERAZIONE OBIETTIVI**

#### **Opzione A: Generazione Automatica IA** (Raccomandato)
**Come funziona**:
- Ogni domenica sera, background job analizza:
  - Problemi ricorrenti (`common_problems`)
  - Performance ultimi 10 match
  - Pattern tattici identificati
  - Obiettivi precedenti (evita duplicati)
- IA genera 3-5 obiettivi personalizzati
- Salva in `weekly_goals` con `status = 'active'`

**Vantaggi**:
- ✅ Personalizzati per ogni utente
- ✅ Basati su dati reali
- ✅ Zero fatica per l'utente
- ✅ Scalabile (automatico per tutti)

**Svantaggi**:
- ⚠️ Richiede almeno 3-5 partite per generare obiettivi sensati
- ⚠️ Potrebbe generare obiettivi troppo facili/difficili

**Implementazione**:
```javascript
// Background job: Ogni domenica 23:00
async function generateWeeklyGoalsForAllUsers() {
  const activeUsers = await getActiveUsers() // Utenti con almeno 3 partite
  
  for (const user of activeUsers) {
    const goals = await generateGoalsForUser(user.id)
    await saveWeeklyGoals(user.id, goals, getCurrentWeek())
  }
}

async function generateGoalsForUser(userId) {
  // 1. Carica dati utente
  const profile = await getUserProfile(userId)
  const matches = await getRecentMatches(userId, 10)
  const patterns = await getTacticalPatterns(userId)
  
  // 2. Analizza performance
  const avgGoalsConceded = calculateAvgGoalsConceded(matches)
  const avgPossession = calculateAvgPossession(matches)
  const winRate = calculateWinRate(matches)
  
  // 3. Genera obiettivi basati su problemi/performance
  const goals = []
  
  // Obiettivo 1: Se prendi troppi gol
  if (avgGoalsConceded > 2.0) {
    goals.push({
      goal_type: 'reduce_goals_conceded',
      description: `Riduci gol subiti del 20% (da ${avgGoalsConceded.toFixed(1)} a ${(avgGoalsConceded * 0.8).toFixed(1)} per partita)`,
      target_value: avgGoalsConceded * 0.8,
      difficulty: 'medium'
    })
  }
  
  // Obiettivo 2: Se possesso basso
  if (avgPossession < 50) {
    goals.push({
      goal_type: 'improve_possession',
      description: `Migliora possesso palla del 10% (da ${avgPossession.toFixed(0)}% a ${(avgPossession + 10).toFixed(0)}%)`,
      target_value: avgPossession + 10,
      difficulty: 'medium'
    })
  }
  
  // Obiettivo 3: Se win rate basso
  if (winRate < 50) {
    goals.push({
      goal_type: 'increase_wins',
      description: `Vinci almeno 3 partite questa settimana`,
      target_value: 3,
      difficulty: 'hard'
    })
  }
  
  // Obiettivo 4: Basato su problemi comuni
  if (profile.common_problems?.includes('difesa')) {
    goals.push({
      goal_type: 'improve_defense',
      description: `Usa formazione più difensiva in almeno 2 partite`,
      target_value: 2,
      difficulty: 'easy'
    })
  }
  
  // Obiettivo 5: Usa consigli IA
  goals.push({
    goal_type: 'use_ai_recommendations',
    description: `Applica almeno 2 consigli dell'IA questa settimana`,
    target_value: 2,
    difficulty: 'easy'
  })
  
  return goals.slice(0, 5) // Max 5 obiettivi
}
```

---

#### **Opzione B: Selezione da Pool Predefiniti**
**Come funziona**:
- Pool di 20-30 obiettivi predefiniti
- Sistema seleziona 3-5 obiettivi rilevanti per utente
- Basati su problemi/performance

**Vantaggi**:
- ✅ Controllo qualità (obiettivi testati)
- ✅ Più veloce (no generazione IA)
- ✅ Prevedibile

**Svantaggi**:
- ⚠️ Meno personalizzati
- ⚠️ Richiede manutenzione pool

---

#### **Opzione C: Utente Crea Manualmente**
**Come funziona**:
- Utente crea obiettivi personalizzati
- Sistema suggerisce obiettivi basati su performance

**Vantaggi**:
- ✅ Massima personalizzazione
- ✅ Engagement utente

**Svantaggi**:
- ⚠️ Fatica per utente
- ⚠️ Obiettivi potrebbero essere irrealistici
- ⚠️ Bassa adozione

---

**Raccomandazione Enterprise**: **Opzione A (Generazione Automatica IA)** con fallback a Opzione B se dati insufficienti.

---

### **2. TRACCIAMENTO PROGRESSO**

#### **Metodo 1: Automatico (Real-time)**
**Come funziona**:
- Dopo ogni partita salvata → Verifica tutti gli obiettivi attivi
- Aggiorna `current_value` automaticamente
- Se `current_value >= target_value` → `status = 'completed'`

**Vantaggi**:
- ✅ Zero fatica utente
- ✅ Sempre aggiornato
- ✅ Impossibile "barare"

**Svantaggi**:
- ⚠️ Logica complessa per ogni tipo obiettivo
- ⚠️ Potrebbe non catturare tutti i casi

**Implementazione**:
```javascript
// Dopo save-match
async function updateWeeklyGoalsAfterMatch(userId, matchData) {
  const activeGoals = await getActiveWeeklyGoals(userId, getCurrentWeek())
  
  for (const goal of activeGoals) {
    let newValue = goal.current_value
    
    switch (goal.goal_type) {
      case 'reduce_goals_conceded':
        // Calcola media gol subiti ultimi 5 match
        const recentMatches = await getRecentMatches(userId, 5)
        const avgGoals = calculateAvgGoalsConceded(recentMatches)
        newValue = avgGoals
        break
        
      case 'increase_wins':
        // Conta vittorie questa settimana
        const winsThisWeek = await countWinsThisWeek(userId)
        newValue = winsThisWeek
        break
        
      case 'improve_possession':
        // Calcola media possesso ultimi 5 match
        const recentMatches2 = await getRecentMatches(userId, 5)
        const avgPossession = calculateAvgPossession(recentMatches2)
        newValue = avgPossession
        break
        
      case 'use_ai_recommendations':
        // Conta partite dove ha applicato consigli IA
        // (richiede tracking in matches o tabella separata)
        const appliedRecommendations = await countAppliedRecommendations(userId, getCurrentWeek())
        newValue = appliedRecommendations
        break
    }
    
    // Aggiorna valore
    await updateGoalProgress(goal.id, newValue)
    
    // Verifica completamento
    if (newValue >= goal.target_value && goal.status === 'active') {
      await completeGoal(goal.id)
      // Trigger: Aggiorna ai_knowledge_score
      await recalculateAIKnowledgeScore(userId)
    }
  }
}
```

---

#### **Metodo 2: Manuale (Utente Conferma)**
**Come funziona**:
- Utente segna obiettivo come completato
- Sistema verifica se è realistico (opzionale)

**Vantaggi**:
- ✅ Semplice da implementare
- ✅ Utente ha controllo

**Svantaggi**:
- ⚠️ Possibile "barare"
- ⚠️ Fatica per utente
- ⚠️ Bassa adozione

---

#### **Metodo 3: Ibrido (Automatico + Conferma)**
**Come funziona**:
- Sistema traccia automaticamente
- Utente può confermare o contestare
- Se contestato, sistema ricalcola

**Vantaggi**:
- ✅ Automatico ma trasparente
- ✅ Utente può correggere errori

**Svantaggi**:
- ⚠️ Più complesso
- ⚠️ Potrebbe confondere utente

---

**Raccomandazione Enterprise**: **Metodo 1 (Automatico Real-time)** per obiettivi misurabili, con notifica quando completato.

---

### **3. VALIDAZIONE E COMPLETAMENTO**

#### **Quando un Obiettivo è Completato?**

**Criteri**:
1. **Obiettivi Numerici** (gol subiti, possesso, vittorie):
   - `current_value >= target_value` per almeno 3 partite consecutive
   - Evita completamento "fortunato" (1 partita buona)

2. **Obiettivi Comportamentali** (usa formazione, applica consigli):
   - Conta occorrenze in settimana
   - `current_value >= target_value`

3. **Obiettivi Trend** (miglioramento nel tempo):
   - Confronta ultimi 5 match vs precedenti 5
   - Se miglioramento >= target → completato

**Implementazione**:
```javascript
async function validateGoalCompletion(goal, userId) {
  switch (goal.goal_type) {
    case 'reduce_goals_conceded':
      // Verifica che media ultimi 3 match <= target
      const recent3 = await getRecentMatches(userId, 3)
      const avg3 = calculateAvgGoalsConceded(recent3)
      return avg3 <= goal.target_value
      
    case 'increase_wins':
      // Verifica che vittorie questa settimana >= target
      const wins = await countWinsThisWeek(userId)
      return wins >= goal.target_value
      
    case 'improve_possession':
      // Verifica che media ultimi 3 match >= target
      const recent3_2 = await getRecentMatches(userId, 3)
      const avgPoss = calculateAvgPossession(recent3_2)
      return avgPoss >= goal.target_value
      
    default:
      return goal.current_value >= goal.target_value
  }
}
```

---

### **4. GESTIONE EDGE CASES**

#### **Caso 1: Utente Non Gioca Questa Settimana**
**Problema**: Obiettivi attivi ma nessuna partita

**Soluzione**:
- Domenica sera → Valuta obiettivi
- Se `current_value` invariato da inizio settimana → `status = 'failed'`
- Oppure: Rollover a settimana successiva (max 1 rollover)

---

#### **Caso 2: Partite Insufficienti per Calcolare Obiettivi**
**Problema**: Utente ha < 3 partite, non può generare obiettivi sensati

**Soluzione**:
- Obiettivi generici/semplici:
  - "Completa 3 partite questa settimana"
  - "Carica la tua rosa completa"
  - "Completa il profilo al 100%"

---

#### **Caso 3: Obiettivo Impossibile**
**Problema**: Obiettivo troppo difficile (es. "Vinci 10 partite" ma gioca solo 3)

**Soluzione**:
- Validazione pre-generazione:
  - Se target > realistico → riduci target
  - Esempio: Se gioca 5 partite/settimana, max vittorie = 5

---

#### **Caso 4: Obiettivo Completato Troppo Presto**
**Problema**: Utente completa obiettivo lunedì, settimana "finita"

**Soluzione**:
- ✅ OK: Obiettivo completato = successo
- Genera obiettivo bonus (opzionale):
  - "Mantieni questo risultato per tutta la settimana"
  - "Supera il target del 20%"

---

#### **Caso 5: Obiettivo Basato su Dati Mancanti**
**Problema**: Obiettivo "Riduci gol subiti" ma partite senza `team_stats`

**Soluzione**:
- Validazione pre-generazione:
  - Solo obiettivi basati su dati disponibili
  - Se dati mancanti → obiettivo generico ("Completa 5 partite con tutti i dati")

---

### **5. INTEGRAZIONE CON SISTEMA ESISTENTE**

#### **A. Integrazione con `save-match`**
```javascript
// app/api/supabase/save-match/route.js
// Dopo salvataggio match
await updateWeeklyGoalsAfterMatch(userId, matchData)
```

#### **B. Integrazione con `analyze-match`**
```javascript
// app/api/analyze-match/route.js
// Nel prompt IA, includi obiettivi attivi:
const activeGoals = await getActiveWeeklyGoals(userId, getCurrentWeek())
if (activeGoals.length > 0) {
  prompt += `\nOBIETTIVI SETTIMANALI ATTIVI:\n`
  activeGoals.forEach(goal => {
    prompt += `- ${goal.goal_description} (Progresso: ${goal.current_value}/${goal.target_value})\n`
  })
  prompt += `\n⚠️ IMPORTANTE: Considera questi obiettivi nei suggerimenti. Aiuta il cliente a raggiungerli.\n`
}
```

#### **C. Integrazione con `assistant-chat`**
```javascript
// app/api/assistant-chat/route.js
// Nel contesto, includi obiettivi attivi
const activeGoals = await getActiveWeeklyGoals(userId, getCurrentWeek())
if (activeGoals.length > 0) {
  context += `\nOBIETTIVI SETTIMANALI:\n`
  activeGoals.forEach(goal => {
    context += `- ${goal.goal_description} (${goal.current_value}/${goal.target_value})\n`
  })
  context += `\nPuoi aiutare il cliente a raggiungere questi obiettivi.\n`
}
```

#### **D. Integrazione Dashboard**
- Widget "Obiettivi Settimanali" con progress bar
- Notifica quando obiettivo completato
- Link a dettagli obiettivo

---

### **6. UI/UX - ESPERIENZA UTENTE**

#### **Dashboard Widget**

**Design**:
```jsx
<div style={{
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #2a2a2a'
}}>
  {/* Header */}
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Trophy size={20} color="#00d4ff" />
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
        {t('weeklyGoals')} {/* "Obiettivi Settimanali" */}
      </h2>
    </div>
    <span style={{ fontSize: '12px', color: '#888' }}>
      {getCurrentWeekLabel()} {/* "Settimana 26 Gen - 2 Feb" */}
    </span>
  </div>
  
  {/* Lista Obiettivi */}
  {weeklyGoals.length === 0 ? (
    <div style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>
      {t('noGoalsThisWeek')} {/* "Nessun obiettivo questa settimana" */}
      <br />
      <span style={{ fontSize: '12px', color: '#666' }}>
        {t('goalsWillBeGenerated')} {/* "Gli obiettivi verranno generati automaticamente ogni domenica" */}
      </span>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {weeklyGoals.map(goal => (
        <div key={goal.id} style={{
          padding: '16px',
          backgroundColor: goal.status === 'completed' 
            ? 'rgba(34, 197, 94, 0.1)' 
            : goal.status === 'failed'
            ? 'rgba(239, 68, 68, 0.1)'
            : 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: `1px solid ${goal.status === 'completed' 
            ? 'rgba(34, 197, 94, 0.3)' 
            : goal.status === 'failed'
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(255, 255, 255, 0.1)'}`
        }}>
          {/* Status Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {goal.status === 'completed' ? (
              <CheckCircle2 size={18} color="#22c55e" />
            ) : goal.status === 'failed' ? (
              <XCircle size={18} color="#ef4444" />
            ) : (
              <Circle size={18} color="#888" />
            )}
            <span style={{ 
              fontSize: '14px', 
              fontWeight: goal.status === 'active' ? '600' : '400',
              flex: 1
            }}>
              {goal.goal_description}
            </span>
            {goal.status === 'active' && (
              <span style={{ fontSize: '12px', color: '#888' }}>
                {goal.current_value.toFixed(1)}/{goal.target_value}
              </span>
            )}
          </div>
          
          {/* Progress Bar (solo se active) */}
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
          
          {/* Completed/Failed Message */}
          {goal.status === 'completed' && goal.completed_at && (
            <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '8px' }}>
              ✅ {t('goalCompleted')} {formatDate(goal.completed_at)}
            </div>
          )}
          {goal.status === 'failed' && (
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>
              ❌ {t('goalFailed')}
            </div>
          )}
        </div>
      ))}
    </div>
  )}
  
  {/* CTA: Vedi tutti gli obiettivi */}
  {weeklyGoals.length > 0 && (
    <button
      onClick={() => router.push('/obiettivi')}
      style={{
        width: '100%',
        marginTop: '12px',
        padding: '10px',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '8px',
        color: '#00d4ff',
        fontSize: '14px',
        cursor: 'pointer'
      }}
    >
      {t('viewAllGoals')} {/* "Vedi tutti gli obiettivi" */}
    </button>
  )}
</div>
```

---

### **7. NOTIFICHE E FEEDBACK**

#### **Quando Notificare?**

1. **Obiettivo Completato**:
   - Notifica immediata: "🎉 Hai completato l'obiettivo 'Riduci gol subiti'!"
   - Aggiorna barra conoscenza IA (+1-5%)
   - Mostra in dashboard

2. **Progresso Significativo**:
   - Notifica: "Sei al 80% dell'obiettivo 'Vinci 3 partite'!"
   - Solo se progresso >= 50% (non spammare)

3. **Obiettivo a Rischio**:
   - Domenica mattina: "Ultimo giorno! Mancano 2 vittorie per completare l'obiettivo"
   - Solo se progresso < 50%

4. **Nuovi Obiettivi Generati**:
   - Domenica sera: "Nuovi obiettivi settimanali disponibili!"
   - Mostra preview in notifica

---

### **8. STORICO E ANALYTICS**

#### **Cosa Tracciare?**

1. **Metriche Obiettivi**:
   - Tasso completamento (% obiettivi completati)
   - Tempo medio completamento (giorni)
   - Obiettivi più completati/falliti
   - Distribuzione difficoltà

2. **Impatto su Performance**:
   - Correlazione obiettivi completati → miglioramento divisione
   - Correlazione obiettivi completati → miglioramento metriche

3. **Engagement**:
   - % utenti con obiettivi attivi
   - % utenti che completano almeno 1 obiettivo/settimana
   - Retention: utenti con obiettivi vs senza

---

### **9. PERSONALIZZAZIONE E ADATTAMENTO**

#### **Adattamento Difficoltà**

**Logica**:
- Se utente completa sempre obiettivi → aumenta difficoltà
- Se utente fallisce sempre → riduci difficoltà
- Target: 60-70% tasso completamento (ottimale)

**Implementazione**:
```javascript
function adjustGoalDifficulty(userId, completionRate) {
  if (completionRate > 0.8) {
    // Troppo facili → aumenta difficoltà
    return 'increase' // +20% target
  } else if (completionRate < 0.4) {
    // Troppo difficili → riduci difficoltà
    return 'decrease' // -20% target
  } else {
    // Perfetto → mantieni
    return 'maintain'
  }
}
```

---

### **10. INTEGRAZIONE CON AI KNOWLEDGE SCORE**

#### **Calcolo Score Successi**

```javascript
function calculateSuccessScore(userProfile, weeklyGoals, matches) {
  let score = 0
  
  // 1. Miglioramento Divisione (+5%)
  if (userProfile.initial_division && userProfile.current_division) {
    const improvement = calculateDivisionImprovement(
      userProfile.initial_division,
      userProfile.current_division
    )
    score += improvement
  }
  
  // 2. Obiettivi Settimanali Completati (+5%)
  const currentWeek = getCurrentWeek()
  const completedThisWeek = weeklyGoals.filter(g => 
    g.week_start_date === currentWeek.start &&
    g.status === 'completed'
  ).length
  score += Math.min(5, completedThisWeek) // Max 5 obiettivi = +5%
  
  // 3. Obiettivi Completati Ultime 4 Settimane (bonus)
  const last4Weeks = getLast4Weeks()
  const completedLast4Weeks = weeklyGoals.filter(g => 
    last4Weeks.some(week => g.week_start_date === week.start) &&
    g.status === 'completed'
  ).length
  // Bonus: +1% ogni 5 obiettivi completati (max +3%)
  score += Math.min(3, Math.floor(completedLast4Weeks / 5))
  
  // 4. Miglioramenti Performance (+5%)
  score += calculatePerformanceImprovements(matches)
  
  return Math.min(15, score) // Cap a 15%
}
```

---

## 🎯 DECISIONI FINALI ENTERPRISE

### **Generazione Obiettivi**
- ✅ **Automatica IA** (ogni domenica)
- ✅ Fallback: Pool predefiniti se dati insufficienti
- ✅ Max 5 obiettivi/settimana

### **Tracciamento**
- ✅ **Automatico real-time** (dopo ogni partita)
- ✅ Validazione: 3 partite consecutive per obiettivi numerici
- ✅ Notifica quando completato

### **Validazione**
- ✅ Obiettivi numerici: Media ultimi 3 match
- ✅ Obiettivi comportamentali: Conta occorrenze
- ✅ Obiettivi trend: Confronto ultimi 5 vs precedenti 5

### **Edge Cases**
- ✅ Utente inattivo → Obiettivi falliti domenica
- ✅ Partite insufficienti → Obiettivi generici
- ✅ Obiettivo impossibile → Validazione pre-generazione
- ✅ Obiettivo completato presto → OK, obiettivo bonus opzionale

### **Integrazione**
- ✅ `save-match` → Aggiorna progresso obiettivi
- ✅ `analyze-match` → Include obiettivi nel prompt IA
- ✅ `assistant-chat` → Include obiettivi nel contesto
- ✅ Dashboard → Widget obiettivi settimanali

### **UI/UX**
- ✅ Widget dashboard con progress bar
- ✅ Notifiche quando completato
- ✅ Pagina dedicata `/obiettivi` (opzionale)

### **Analytics**
- ✅ Tasso completamento
- ✅ Impatto su performance
- ✅ Engagement tracking

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### **Database**
- [ ] Tabella `weekly_goals` (schema completo)
- [ ] Colonna `initial_division` in `user_profiles`
- [ ] Indici per performance
- [ ] RLS policies

### **Backend**
- [ ] Funzione `generateWeeklyGoalsForUser(userId)`
- [ ] Background job (ogni domenica 23:00)
- [ ] Funzione `updateWeeklyGoalsAfterMatch(userId, matchData)`
- [ ] Funzione `validateGoalCompletion(goal, userId)`
- [ ] Integrazione `save-match`
- [ ] Integrazione `analyze-match`
- [ ] Integrazione `assistant-chat`

### **Frontend**
- [ ] Widget "Obiettivi Settimanali" (dashboard)
- [ ] Componente progress bar
- [ ] Notifiche (obiettivo completato)
- [ ] Pagina `/obiettivi` (opzionale, per dettagli)

### **Testing**
- [ ] Unit tests (generazione obiettivi)
- [ ] Unit tests (validazione completamento)
- [ ] Integration tests (save-match → aggiornamento obiettivi)
- [ ] E2E tests (flusso completo)

---

**Fine Analisi 360°**

**Prossimo Step**: Implementazione seguendo questa architettura completa
