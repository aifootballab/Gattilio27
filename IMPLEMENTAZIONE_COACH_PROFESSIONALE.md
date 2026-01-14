# 🎯 Implementazione Coach Professionale - Piano d'Azione

**Data**: 2025-01-14  
**Status**: 📋 **PIANO COMPLETO** - Pronto per implementazione

---

## ✅ COMPLETATO

### **1. Definizione Comportamento** ✅
- ✅ Documento `PROFILO_COACH_PROFESSIONALE.md` creato
- ✅ Regole fondamentali definite
- ✅ Esempi conversazione corretta
- ✅ Flussi UX perfetti documentati

### **2. Prompt Aggiornati** ✅
- ✅ System prompt `voice-coaching-gpt` aggiornato
- ✅ Prompt analisi screenshot aggiornato
- ✅ Regole critiche integrate

---

## ⏳ DA IMPLEMENTARE

### **1. Progress Tracker Rosa** ⏳

**Componente**: `components/rosa/RosaProgressTracker.jsx`

**Funzionalità**:
- Mostra progresso continuo (X/21)
- Indica titolari/riserve completati
- Suggerisce come completare
- Integrato in Dashboard

**Stato Database**:
```sql
-- Query per calcolare progresso
SELECT 
  COUNT(*) FILTER (WHERE position IN titolari) as titolari_completi,
  COUNT(*) FILTER (WHERE position IN riserve) as riserve_complete,
  COUNT(*) as totale
FROM player_builds
WHERE user_id = ? AND rosa_id = ?
```

---

### **2. Analisi Screenshot Dettagliata** ⏳

**Componente**: `components/rosa/ScreenshotAnalysisView.jsx`

**Funzionalità**:
- Mostra dati riconosciuti (con confidence badges)
- Mostra dati incerti (con warning)
- Mostra dati mancanti (con placeholder)
- Formato:
  ```
  ✅ DATI RICONOSCIUTI (con confidence)
  ⚠️ DATI INCERTI
  ❌ DATI NON RICONOSCIUTI
  💡 COSA POSSIAMO FARE (con opzioni)
  ```

**Integrazione**:
- Aggiornare `CandidateProfileView.jsx` per mostrare formato coach
- Aggiungere badges confidence colorati
- Aggiungere opzioni "come procedere"

---

### **3. Gestione Dati Mancanti** ⏳

**Componente**: `components/rosa/MissingDataHandler.jsx`

**Funzionalità**:
- Form per inserimento manuale
- Opzione "salvare con vuoti"
- Opzione "caricare altro screenshot"
- Validazione input

**Flusso**:
```
1. Coach mostra dati mancanti
2. Utente sceglie opzione
3. Se manuale: form guidato
4. Se vuoti: conferma salvataggio
5. Se altro screenshot: ricarica
```

---

### **4. Coaching Contextualizzato** ⏳

**Edge Function**: `voice-coaching-gpt` (già aggiornato)

**Frontend**: `components/coaching/VoiceCoachingPanel.jsx`

**Funzionalità**:
- Analizza rosa attuale
- Identifica problemi
- Suggerisce soluzioni pratiche
- Basato su dati reali

**Esempio**:
```
Utente: "Sto perdendo sempre in difesa"
↓
Coach analizza rosa:
- Difensori: 2 (Van Dijk 96, Ramos 95) ✅
- Terzini: 2 (Alba 88, Cancelo 89) ⚠️
- Mediani: 1 (Casemiro 92) ⚠️
↓
Coach identifica problema:
- Solo 1 mediano
- Terzini rating medio-basso
↓
Coach suggerisce:
1. Aggiungere secondo mediano
2. Sostituire terzino
3. Cambiare formazione
```

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### **Fase 1: UI Components** ⏳
- [ ] `RosaProgressTracker.jsx` - Progress bar rosa
- [ ] `ScreenshotAnalysisView.jsx` - Vista analisi dettagliata
- [ ] `MissingDataHandler.jsx` - Gestione dati mancanti
- [ ] Aggiornare `CandidateProfileView.jsx` - Formato coach

### **Fase 2: Backend Logic** ⏳
- [ ] Query progresso rosa (titolari/riserve)
- [ ] Validazione dati mancanti
- [ ] Salvataggio con vuoti (opzionale)
- [ ] Coaching contextualizzato (già fatto)

### **Fase 3: Integration** ⏳
- [ ] Integrare progress tracker in Dashboard
- [ ] Integrare analisi dettagliata in ScreenshotUpload
- [ ] Integrare gestione mancanti in flusso salvataggio
- [ ] Test end-to-end

### **Fase 4: Testing** ⏳
- [ ] Test caricamento singolo giocatore
- [ ] Test costruzione rosa completa
- [ ] Test gestione dati mancanti
- [ ] Test coaching contextualizzato

---

## 🎯 PRIORITÀ

### **Alta Priorità**:
1. ✅ Prompt aggiornati (FATTO)
2. ⏳ Analisi screenshot dettagliata
3. ⏳ Progress tracker rosa
4. ⏳ Gestione dati mancanti

### **Media Priorità**:
5. ⏳ Coaching contextualizzato (backend fatto, frontend da migliorare)
6. ⏳ Form inserimento manuale
7. ⏳ Validazione input

### **Bassa Priorità**:
8. ⏳ Animazioni UI
9. ⏳ Suggerimenti proattivi
10. ⏳ Analisi sentiment

---

## 📝 NOTE TECNICHE

### **Database Queries**:

```sql
-- Progresso rosa
SELECT 
  COUNT(*) FILTER (WHERE is_starter = true) as titolari,
  COUNT(*) FILTER (WHERE is_starter = false) as riserve,
  COUNT(*) as totale
FROM player_builds pb
JOIN user_rosa ur ON pb.rosa_id = ur.id
WHERE ur.user_id = ? AND ur.is_main = true;

-- Giocatori con dati mancanti
SELECT 
  pb.id,
  pb.player_base_id,
  pb.base_stats,
  CASE 
    WHEN pb.base_stats->>'height' IS NULL THEN 'height'
    WHEN pb.base_stats->>'booster' IS NULL THEN 'booster'
    ELSE NULL
  END as missing_field
FROM player_builds pb
WHERE pb.rosa_id = ? AND (
  pb.base_stats->>'height' IS NULL OR
  pb.base_stats->>'booster' IS NULL
);
```

### **Component Structure**:

```
components/
  rosa/
    RosaProgressTracker.jsx      # Progress bar
    ScreenshotAnalysisView.jsx    # Vista analisi
    MissingDataHandler.jsx        # Gestione mancanti
    CandidateProfileView.jsx      # Aggiornato formato coach
```

---

**Status**: 📋 **PIANO COMPLETO** - Pronto per implementazione fase per fase