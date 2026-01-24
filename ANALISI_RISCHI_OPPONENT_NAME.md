# ⚠️ Analisi Rischi - Estrazione Opponent Name

**Data**: 23 Gennaio 2026  
**Soluzione**: Estrazione `opponent_name` dalle immagini + Identificatore Intelligente

---

## 🔴 RISCHI DI ROTTURA

### **1. Modifica Prompt - Breaking Change Potenziale**

**Rischio**: 🔴 **MEDIO-ALTO**

**Problema**:
- Modificare prompt potrebbe cambiare formato output OpenAI
- Se AI non estrae `team_names`, output potrebbe essere diverso
- Codice esistente potrebbe non gestire nuovo campo `team_names`

**Mitigazione**:
- ✅ Campo `team_names` è **opzionale** (non obbligatorio)
- ✅ Normalizzazione gestisce caso `null` o mancante
- ✅ Fallback a identificatore intelligente se `team_names` non disponibile
- ✅ Retrocompatibilità: partite vecchie continuano a funzionare

**Test Necessari**:
- Test con immagini che hanno nomi team visibili
- Test con immagini che NON hanno nomi team visibili
- Verificare che output JSON sia sempre valido

---

### **2. Modifica `save-match` - Logica Complessa**

**Rischio**: 🟡 **MEDIO**

**Problema**:
- Aggiungere logica estrazione `opponent_name` da 3 fonti diverse
- Potenziale conflitto se `opponent_name` già presente
- Validazione lunghezza (max 255 caratteri)

**Mitigazione**:
- ✅ Priorità chiara: `matchData.opponent_name` > `team_names.opponent_team` > `extracted_data`
- ✅ Validazione esistente già presente (linea 179-184)
- ✅ `toText()` helper già gestisce null/undefined

**Test Necessari**:
- Test con `opponent_name` esplicito
- Test con `team_names.opponent_team`
- Test con `extracted_data.team_names`
- Test con tutti e 3 presenti (deve usare priorità 1)

---

### **3. Modifica UI Dashboard - Breaking Change Visuale**

**Rischio**: 🟢 **BASSO**

**Problema**:
- Cambio formato visualizzazione partite
- Cliente potrebbe confondersi con nuovo formato
- Responsive design potrebbe rompersi

**Mitigazione**:
- ✅ Helper function con fallback intelligente
- ✅ Mantiene struttura esistente (solo cambia contenuto)
- ✅ Test responsive già presenti

**Test Necessari**:
- Test visuale con partite con/senza `opponent_name`
- Test responsive mobile/desktop
- Test con partite vecchie (retrocompatibilità)

---

### **4. Normalizzazione `team_names` - Nuovo Campo**

**Rischio**: 🟡 **MEDIO**

**Problema**:
- Nuovo campo `team_names` in `extractedData`
- Potrebbe non essere gestito in altri endpoint
- Potrebbe causare errori se passato a funzioni che non lo aspettano

**Mitigazione**:
- ✅ Campo opzionale (non obbligatorio)
- ✅ Normalizzazione gestisce `null`/undefined
- ✅ Non usato in altri endpoint (solo in `save-match`)

**Test Necessari**:
- Verificare che `extractedData` con `team_names` non rompa altri endpoint
- Test con `team_names` null
- Test con `team_names` parziale (solo client_team o solo opponent_team)

---

### **5. Query Dashboard - Nuovi Campi**

**Rischio**: 🟢 **BASSO**

**Problema**:
- Aggiungere `formation_played`, `playing_style_played`, `client_team_name` alla query
- Potrebbe rallentare query se non indicizzati
- Potrebbe causare errori se campi non esistono

**Mitigazione**:
- ✅ Campi già esistono in database (verificato)
- ✅ Query Supabase gestisce campi mancanti (non lancia errore)
- ✅ RLS già configurato

**Test Necessari**:
- Verificare performance query (dovrebbe essere veloce)
- Test con partite senza questi campi (NULL)

---

## 🟡 DIFFICOLTÀ IMPLEMENTAZIONE

### **1. Prompt Engineering - Estrazione Nomi Team**

**Difficoltà**: 🟡 **MEDIA**

**Sfide**:
- Nomi team possono essere in posizioni diverse (loghi, tag, header)
- Nomi possono essere abbreviati o parziali
- Deve distinguere cliente vs avversario

**Soluzione**:
- ✅ Prompt dettagliato con esempi
- ✅ Usa `userTeamInfo` per identificare cliente
- ✅ Campo opzionale (non obbligatorio)

**Tempo Stimato**: 2-3 ore (modifica prompt + test)

---

### **2. Normalizzazione `team_names`**

**Difficoltà**: 🟢 **BASSA**

**Sfide**:
- Gestire vari formati output AI
- Validare e pulire stringhe

**Soluzione**:
- ✅ Funzione `normalizeTeamNames()` semplice
- ✅ Gestisce null/undefined/stringhe vuote
- ✅ Trim automatico

**Tempo Stimato**: 30 minuti

---

### **3. Logica `save-match`**

**Difficoltà**: 🟡 **MEDIA**

**Sfide**:
- Priorità multiple (3 fonti)
- Validazione lunghezza
- Gestione errori

**Soluzione**:
- ✅ Logica sequenziale chiara
- ✅ Validazione esistente riutilizzata
- ✅ Fallback sicuro (null se non disponibile)

**Tempo Stimato**: 1-2 ore (codice + test)

---

### **4. Helper Function Dashboard**

**Difficoltà**: 🟢 **BASSA**

**Sfide**:
- Logica fallback
- Gestione edge cases

**Soluzione**:
- ✅ Funzione semplice e lineare
- ✅ Test edge cases facili

**Tempo Stimato**: 30 minuti

---

### **5. Modifica UI Dashboard**

**Difficoltà**: 🟢 **BASSA**

**Sfide**:
- Sostituire `displayOpponent` con `matchDisplayName`
- Mantenere stile esistente

**Soluzione**:
- ✅ Sostituzione diretta
- ✅ Stile invariato

**Tempo Stimato**: 15 minuti

---

## ⚠️ EDGE CASES DA GESTIRE

### **1. Nome Team Non Visibile nell'Immagine**

**Scenario**: Screenshot non mostra nomi team  
**Comportamento**: `team_names` = null → usa identificatore intelligente  
**Rischio**: 🟢 Basso (fallback funziona)

---

### **2. Solo Nome Cliente Visibile**

**Scenario**: Screenshot mostra solo nome cliente, non avversario  
**Comportamento**: `team_names.opponent_team` = null → usa identificatore intelligente  
**Rischio**: 🟢 Basso (fallback funziona)

---

### **3. Nome Team Molto Lungo (>255 caratteri)**

**Scenario**: Nome avversario estratto è troppo lungo  
**Comportamento**: Validazione in `save-match` rifiuta → `opponent_name` = null → usa identificatore  
**Rischio**: 🟡 Medio (cliente perde nome, ma fallback funziona)

**Mitigazione**:
- Truncate a 255 caratteri invece di rifiutare?
- O mostrare warning?

---

### **4. Nome Team con Caratteri Speciali**

**Scenario**: Nome contiene emoji, caratteri speciali (es: "GONDİKLENDİNİZZZ <^=^>")  
**Comportamento**: Dovrebbe funzionare (stringa normale)  
**Rischio**: 🟢 Basso (stringa normale)

---

### **5. Partite Vecchie (Senza `team_names`)**

**Scenario**: Partite salvate prima della modifica  
**Comportamento**: `opponent_name` = null → usa identificatore intelligente  
**Rischio**: 🟢 Basso (retrocompatibilità garantita)

---

### **6. AI Estrae Nome Sbagliato**

**Scenario**: AI confonde cliente/avversario  
**Comportamento**: Nome salvato potrebbe essere sbagliato  
**Rischio**: 🟡 Medio (cliente vede nome sbagliato)

**Mitigazione**:
- Usa `userTeamInfo` per identificare cliente
- Prompt esplicito: "identifica quale è cliente vs avversario"
- Validazione: se `team_names.client_team` corrisponde a `user_profiles.team_name`, allora `opponent_team` è corretto

---

### **7. Multiple Estrazioni (5 Step)**

**Scenario**: Nome team estratto in step diversi (player_ratings, team_stats, formation_style)  
**Comportamento**: Prima estrazione vince? O merge?  
**Rischio**: 🟡 Medio (conflitto)

**Soluzione**:
- ✅ Priorità: prima estrazione valida vince
- ✅ O: merge (se diverso, usa quello più lungo/completo)
- ✅ Raccomandazione: prima estrazione valida vince (più semplice)

---

## 📊 MATRICE RISCHI

| Modifica | Rischio Rottura | Difficoltà | Priorità Test |
|----------|----------------|------------|---------------|
| Modifica Prompt | 🟡 Medio | 🟡 Media | 🔴 Alta |
| Normalizzazione team_names | 🟢 Basso | 🟢 Bassa | 🟡 Media |
| Logica save-match | 🟡 Medio | 🟡 Media | 🔴 Alta |
| Helper Dashboard | 🟢 Basso | 🟢 Bassa | 🟡 Media |
| UI Dashboard | 🟢 Basso | 🟢 Bassa | 🟢 Bassa |

---

## ✅ MITIGAZIONI RACCOMANDATE

### **1. Test Incrementali**

**Approccio**:
1. ✅ Test modifiche prompt con immagini reali
2. ✅ Test normalizzazione con vari formati
3. ✅ Test `save-match` con tutti gli scenari
4. ✅ Test UI con partite reali (con/senza `opponent_name`)

---

### **2. Validazione Robusta**

**Aggiungere**:
- ✅ Validazione lunghezza `opponent_name` (max 255)
- ✅ Sanitizzazione caratteri speciali (opzionale)
- ✅ Logging quando `team_names` viene estratto

---

### **3. Fallback Sicuro**

**Garantire**:
- ✅ Se `team_names` non disponibile → usa identificatore intelligente
- ✅ Se `opponent_name` non disponibile → usa identificatore intelligente
- ✅ Se identificatore fallisce → usa "Partita #N"

---

### **4. Retrocompatibilità**

**Verificare**:
- ✅ Partite vecchie continuano a funzionare
- ✅ Query dashboard funziona con partite senza nuovi campi
- ✅ UI gestisce partite con/senza `opponent_name`

---

## 🎯 RACCOMANDAZIONI FINALI

### **Implementazione Sicura**:

1. **Fase 1: Test Prompt** (1-2 ore)
   - Modificare prompt `player_ratings` solo
   - Test con immagini reali
   - Verificare output JSON valido

2. **Fase 2: Normalizzazione** (30 min)
   - Implementare `normalizeTeamNames()`
   - Test con vari formati

3. **Fase 3: Save-Match** (1-2 ore)
   - Aggiungere logica estrazione `opponent_name`
   - Test tutti gli scenari
   - Verificare retrocompatibilità

4. **Fase 4: UI Dashboard** (30 min)
   - Helper function
   - Modifica UI
   - Test visuale

5. **Fase 5: Test Completo** (1 ora)
   - Test end-to-end
   - Test con partite vecchie
   - Test responsive

**Tempo Totale Stimato**: 4-6 ore

---

### **Rischi Residui**:

1. 🟡 **AI non estrae nomi team** → Fallback funziona (identificatore intelligente)
2. 🟡 **Nome team sbagliato** → Cliente può vedere nome errato (ma identificatore aiuta)
3. 🟢 **Performance query** → Dovrebbe essere OK (campi già indicizzati)

---

### **Rollback Plan**:

Se qualcosa va storto:
1. ✅ Rimuovere modifiche prompt (revert commit)
2. ✅ Rimuovere logica `save-match` (revert commit)
3. ✅ UI continua a funzionare (fallback intelligente)

**Tempo Rollback**: 15 minuti

---

## ✅ CONCLUSIONE

**Rischio Complessivo**: 🟡 **MEDIO-BASSO**

**Perché**:
- ✅ Modifiche incrementali e testabili
- ✅ Fallback robusti per ogni scenario
- ✅ Retrocompatibilità garantita
- ✅ Rollback semplice

**Raccomandazione**: ✅ **PROCEDERE** con implementazione incrementale e test accurati.

---

**Ultimo Aggiornamento**: 23 Gennaio 2026
