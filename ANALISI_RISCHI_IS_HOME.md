# ⚠️ Analisi Rischi: Implementazione Campo "Casa/Fuori Casa"

**Data**: 26 Gennaio 2026  
**Obiettivo**: Analizzare rischi implementazione campo `is_home` nel wizard match  
**Status**: 📋 **ANALISI RISCHI COMPLETATA**

---

## ✅ COSA ESISTE GIÀ (Verificato)

### **1. Database Schema**

**Verificato tramite MCP Supabase**:
```sql
-- Tabella matches
is_home BOOLEAN DEFAULT true  -- ✅ ESISTE GIÀ
```

**Caratteristiche**:
- ✅ Colonna esiste già nella tabella `matches`
- ✅ Tipo: `BOOLEAN`
- ✅ Default: `true` (casa)
- ✅ Nullable: `YES` (può essere NULL)

**Nessuna migrazione necessaria** ✅

---

### **2. Salvataggio Match (`/api/supabase/save-match`)**

**Codice esistente** (riga 351):
```javascript
is_home: typeof matchData.is_home === 'boolean' ? matchData.is_home : true,
```

**Cosa fa**:
- ✅ Accetta `is_home` da `matchData`
- ✅ Se non presente o non boolean → default `true` (casa)
- ✅ Salva correttamente in database

**Problema**: `is_home` NON viene passato dal wizard, quindi viene sempre `true`

---

### **3. Wizard Match (`/match/new`)**

**Codice esistente** (riga 264-282):
```javascript
const matchData = {
  result: matchResult,
  opponent_name: opponentName.trim() || null,
  player_ratings: stepData.player_ratings || null,
  team_stats: stepData.team_stats || null,
  // ... altri dati
  // ❌ MANCA: is_home
}
```

**Problema**: `is_home` non viene incluso in `matchData`

---

### **4. Estrazione Dati (`/api/extract-match-data`)**

**Codice esistente** (riga 183-194):
```javascript
function getPromptForSection(section, userTeamInfo = null) {
  // Usa userTeamInfo.team_name per identificare squadra cliente
  // ❌ NON usa is_home
}
```

**Problema**: Usa `team_name` da `user_profiles`, non `is_home`

---

### **5. Analisi Match (`/api/analyze-match`)**

**Codice esistente** (riga 627-631):
```javascript
const clientTeamName = userProfile?.team_name || matchData.client_team_name || null
// ❌ NON usa is_home per identificare squadra cliente
```

**Problema**: Usa `team_name` o `client_team_name`, non `is_home`

---

## ⚠️ RISCHI IDENTIFICATI

### **Rischio 1: Match Esistenti con `is_home = true` (Default)**

**Situazione**:
- Tutti i match esistenti hanno `is_home = true` (default)
- Alcuni potrebbero essere stati giocati fuori casa
- Se cambiamo logica identificazione, potremmo analizzare squadra sbagliata

**Impatto**:
- 🔴 **ALTO**: Match esistenti potrebbero avere dati invertiti (cliente/avversario)

**Mitigazione**:
- ✅ **Backward Compatibility**: Mantenere logica attuale per match esistenti
- ✅ **Nuova Logica**: Applicare solo a match nuovi (con `is_home` esplicito)
- ✅ **Check**: Se `is_home` è NULL o non presente → usa logica vecchia (`team_name`)

---

### **Rischio 2: Inconsistenza Dati Estratti**

**Situazione**:
- Match vecchi: dati estratti con logica `team_name`
- Match nuovi: dati estratti con logica `is_home`
- Potrebbero avere strutture diverse

**Esempio**:
```javascript
// Match vecchio (team_name):
player_ratings: {
  "Messi": { "rating": 8.5 },  // Flat, senza cliente/avversario
  "Ronaldo": { "rating": 7.0 }
}

// Match nuovo (is_home):
player_ratings: {
  cliente: { "Messi": { "rating": 8.5 } },
  avversario: { "Ronaldo": { "rating": 7.0 } }
}
```

**Impatto**:
- 🟡 **MEDIO**: Codice deve gestire entrambe le strutture (già fatto)

**Mitigazione**:
- ✅ **Già gestito**: Codice già supporta entrambe le strutture (riga 356-371 in `save-match`)
- ✅ **Normalizzazione**: `normalizePlayerRatings()` gestisce entrambi i formati

---

### **Rischio 3: Cambio Logica Identificazione**

**Situazione**:
- Attualmente: usa `team_name` per identificare squadra cliente
- Nuovo: usa `is_home` per identificare (team1 vs team2)

**Problema**:
- Se match ha `is_home = true` ma dati estratti con logica `team_name`, potrebbero essere inconsistenti

**Esempio**:
```javascript
// Match salvato con is_home = true (default)
// Ma dati estratti con team_name = "Natural Born Game"
// Se "Natural Born Game" è team2 nei dati, abbiamo inconsistenza
```

**Impatto**:
- 🔴 **ALTO**: Analisi match potrebbero essere errate

**Mitigazione**:
- ✅ **Priorità**: Se `is_home` è presente e valido → usa logica `is_home`
- ✅ **Fallback**: Se `is_home` è NULL → usa logica `team_name` (backward compatibility)
- ✅ **Validazione**: Warning se `is_home` e `team_name` danno risultati diversi

---

### **Rischio 4: Attack Areas e Ball Recovery Zones**

**Situazione**:
- `attack_areas` usa `team1` e `team2`
- `ball_recovery_zones` usa `team: "team1"` o `team: "team2"`
- Attualmente: `team1` = cliente (assunto)
- Nuovo: `team1` = cliente solo se `is_home = true`

**Problema**:
- Se match vecchio ha `attack_areas.team1` ma era fuori casa, `team1` non è cliente

**Impatto**:
- 🟡 **MEDIO**: Statistiche potrebbero essere attribuite alla squadra sbagliata

**Mitigazione**:
- ✅ **Check `is_home`**: Se presente → usa per identificare team1/team2
- ✅ **Fallback**: Se `is_home` è NULL → assume `team1 = cliente` (compatibilità retroattiva)

---

### **Rischio 5: Analisi Match Esistenti**

**Situazione**:
- Match esistenti hanno `is_home = true` (default)
- Se erano fuori casa, analisi match è errata

**Impatto**:
- 🔴 **ALTO**: Analisi match esistenti potrebbero analizzare squadra sbagliata

**Mitigazione**:
- ✅ **Non modificare match esistenti**: Lasciare come sono
- ✅ **Nuova logica solo per nuovi match**: Match con `is_home` esplicito dal wizard
- ✅ **Opzione futura**: Permettere modifica `is_home` in match esistenti (opzionale)

---

## ✅ STRATEGIA DI IMPLEMENTAZIONE SICURA

### **Fase 1: Aggiungere Campo nel Wizard (Sicuro)**

**Cosa fare**:
1. Aggiungere stato `isHome` nel wizard (default: `true`)
2. Aggiungere toggle "Casa" / "Fuori Casa"
3. Includere `is_home` in `matchData` quando salvi

**Rischi**: 🟢 **NESSUNO**
- Non modifica logica esistente
- Solo aggiunge campo nel wizard
- Match esistenti non toccati

---

### **Fase 2: Aggiornare Estrazione Dati (Rischio Medio)**

**Cosa fare**:
1. Accettare parametro `is_home` in `extract-match-data`
2. Passare `is_home` al prompt IA
3. Usare `is_home` per identificare team1/team2

**Rischi**: 🟡 **MEDIO**
- Potrebbe cambiare come vengono estratti i dati
- Ma solo per nuovi match (con `is_home` esplicito)

**Mitigazione**:
- ✅ **Backward Compatibility**: Se `is_home` non presente → usa logica `team_name`
- ✅ **Default**: Se `is_home` è NULL → assume `true` (casa)

---

### **Fase 3: Aggiornare Analisi Match (Rischio Alto)**

**Cosa fare**:
1. Leggere `is_home` da `matchData`
2. Usare `is_home` per identificare squadra cliente nel prompt IA

**Rischi**: 🔴 **ALTO**
- Potrebbe cambiare analisi match esistenti
- Match con `is_home = true` (default) potrebbero essere analizzati male

**Mitigazione**:
- ✅ **Check esplicito**: Se `is_home` è NULL o non presente → usa logica `team_name`
- ✅ **Solo match nuovi**: Applicare nuova logica solo se `is_home` è esplicitamente impostato
- ✅ **Validazione**: Warning se `is_home` e `team_name` danno risultati diversi

---

## 📋 CHECKLIST IMPLEMENTAZIONE SICURA

### **Step 1: Wizard (Sicuro - Nessun Rischio)**

- [ ] Aggiungere stato `isHome` (default: `true`)
- [ ] Aggiungere toggle "Casa" / "Fuori Casa"
- [ ] Includere `is_home` in `matchData`
- [ ] Salvare `is_home` in localStorage per persistenza
- [ ] Aggiungere traduzioni i18n

**Rischio**: 🟢 **NESSUNO** - Solo UI, non tocca logica esistente

---

### **Step 2: Estrazione Dati (Rischio Medio)**

- [ ] Accettare parametro `is_home` opzionale in `extract-match-data`
- [ ] Se `is_home` presente → passare al prompt IA
- [ ] Se `is_home` NULL → usare logica `team_name` (backward compatibility)
- [ ] Aggiornare `normalizePlayerRatings()` per usare `is_home` se presente

**Rischio**: 🟡 **MEDIO** - Cambia estrazione, ma solo per nuovi match

**Mitigazione**:
```javascript
// Pseudocodice
function normalizePlayerRatings(data, isHome = null) {
  // Se is_home è NULL → usa logica team_name (backward compatibility)
  if (isHome === null) {
    // Logica esistente con team_name
  } else {
    // Nuova logica con is_home
    // team1 = cliente se is_home = true
    // team2 = cliente se is_home = false
  }
}
```

---

### **Step 3: Analisi Match (Rischio Alto - Richiede Attenzione)**

- [ ] Leggere `is_home` da `matchData`
- [ ] **Check critico**: Se `is_home` è NULL → usa logica `team_name` (backward compatibility)
- [ ] Se `is_home` presente → usa per identificare squadra cliente
- [ ] Aggiornare prompt IA con logica `is_home`

**Rischio**: 🔴 **ALTO** - Potrebbe cambiare analisi match esistenti

**Mitigazione Critica**:
```javascript
// Pseudocodice
const isHome = matchData.is_home !== undefined && matchData.is_home !== null
  ? matchData.is_home
  : null  // NULL = usa logica vecchia

if (isHome !== null) {
  // Nuova logica: usa is_home
  const clientTeamText = isHome
    ? `\nSQUADRA CLIENTE: La PRIMA squadra (team1) nei dati è quella del CLIENTE (hai giocato in casa).\n`
    : `\nSQUADRA CLIENTE: La SECONDA squadra (team2) nei dati è quella del CLIENTE (hai giocato fuori casa).\n`
} else {
  // Logica vecchia: usa team_name
  const clientTeamText = clientTeamName
    ? `\nSQUADRA CLIENTE: ${clientTeamName}\n`
    : `\nSQUADRA CLIENTE: Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati match.\n`
}
```

---

## 🛡️ REGOLE DI SICUREZZA

### **1. Backward Compatibility (CRITICO)**

**Regola**: **NON rompere match esistenti**

```javascript
// ✅ CORRETTO: Check esplicito
if (is_home !== null && is_home !== undefined) {
  // Usa nuova logica
} else {
  // Usa logica vecchia (team_name)
}

// ❌ SBAGLIATO: Assume sempre is_home
if (is_home) {  // Match esistenti hanno is_home = true (default) ma potrebbero essere fuori casa
  // ...
}
```

---

### **2. Default Values**

**Regola**: **Default solo per nuovi match**

```javascript
// ✅ CORRETTO: Default solo se non presente
const isHome = matchData.is_home !== undefined 
  ? matchData.is_home 
  : null  // NULL = usa logica vecchia

// ❌ SBAGLIATO: Default true per tutti
const isHome = matchData.is_home || true  // Match esistenti avrebbero sempre true
```

---

### **3. Validazione Dati**

**Regola**: **Validare prima di usare**

```javascript
// ✅ CORRETTO: Validazione esplicita
if (typeof matchData.is_home === 'boolean') {
  // Usa is_home
} else {
  // Usa logica vecchia
}

// ❌ SBAGLIATO: Assume sempre boolean
if (matchData.is_home) {  // Potrebbe essere null, undefined, o altro
  // ...
}
```

---

## 📊 MATRICE RISCHI

| Componente | Rischio | Impatto | Mitigazione |
|------------|---------|---------|-------------|
| **Wizard (UI)** | 🟢 Basso | Nessuno | Solo aggiunge campo, non tocca logica |
| **Estrazione Dati** | 🟡 Medio | Cambia estrazione nuovi match | Backward compatibility con `team_name` |
| **Salvataggio Match** | 🟢 Basso | Nessuno | Già supporta `is_home`, solo aggiunge campo wizard |
| **Analisi Match** | 🔴 Alto | Potrebbe cambiare analisi esistenti | **Check critico**: NULL → logica vecchia |
| **Attack Areas** | 🟡 Medio | Statistiche potrebbero essere errate | Usa `is_home` se presente, altrimenti assume team1 = cliente |
| **Ball Recovery** | 🟡 Medio | Zone potrebbero essere errate | Usa `is_home` se presente, altrimenti assume team1 = cliente |

---

## ✅ RACCOMANDAZIONI FINALI

### **Implementazione Incrementale (Sicura)**

1. **Fase 1** (Sicura): Aggiungere campo nel wizard
   - ✅ Nessun rischio
   - ✅ Match esistenti non toccati
   - ✅ Solo nuovi match avranno `is_home` esplicito

2. **Fase 2** (Rischio Medio): Aggiornare estrazione
   - ✅ Backward compatibility con `team_name`
   - ✅ Solo nuovi match usano nuova logica

3. **Fase 3** (Rischio Alto): Aggiornare analisi
   - ⚠️ **ATTENZIONE**: Check critico per NULL
   - ✅ Match esistenti usano logica vecchia
   - ✅ Solo nuovi match usano nuova logica

---

### **Test da Fare**

1. ✅ **Test match nuovo con `is_home = true`**: Verifica che team1 = cliente
2. ✅ **Test match nuovo con `is_home = false`**: Verifica che team2 = cliente
3. ✅ **Test match esistente (senza `is_home` esplicito)**: Verifica che usa logica `team_name`
4. ✅ **Test backward compatibility**: Verifica che match vecchi funzionano ancora

---

**Fine Documento Analisi Rischi**

**Raccomandazione**: Implementare in 3 fasi incrementali con backward compatibility
