# 🛡️ Strategia Implementazione `is_home` - Sicura e Senza Interferenze

**Data**: 26 Gennaio 2026  
**Obiettivo**: Implementare campo "Casa/Fuori Casa" senza rompere match esistenti  
**Status**: 📋 **STRATEGIA DEFINITA** - Pronta per implementazione

---

## 📊 SITUAZIONE ATTUALE (Verificato Supabase)

### **Match Esistenti**

**Query Supabase**:
```sql
SELECT COUNT(*) as total_matches, 
       COUNT(CASE WHEN is_home IS NULL THEN 1 END) as null_home,
       COUNT(CASE WHEN is_home = true THEN 1 END) as home_true,
       COUNT(CASE WHEN is_home = false THEN 1 END) as home_false 
FROM matches;
```

**Risultato**:
- ✅ **16 match esistenti**
- ✅ **0 match con `is_home = NULL`**
- ✅ **16 match con `is_home = true`** (default)
- ✅ **0 match con `is_home = false`**

**Match Esempio**:
```json
{
  "id": "1e480540-e5e2-4a10-9f68-4196d34ce710",
  "match_date": "2026-01-26 21:11:15",
  "is_home": true,  // ← Default, potrebbe essere errato
  "opponent_name": "Attilio , dream team , amichevole",
  "client_team_name": "Cairo vattene"  // ← Usato per identificare
}
```

---

## ⚠️ PROBLEMA: Interferenza Codice Vecchio

### **Situazione Attuale**

**Match Esistenti**:
- ✅ Hanno `is_home = true` (default del database)
- ✅ Hanno `client_team_name` popolato (es. "Cairo vattene", "natural born game")
- ✅ Codice attuale usa `client_team_name` o `team_name` per identificare squadra cliente

**Rischio**:
- 🔴 Se cambiamo logica per usare `is_home`, match esistenti potrebbero essere analizzati male
- 🔴 Match con `is_home = true` (default) potrebbero essere stati giocati fuori casa
- 🔴 Sistema attuale funziona con `client_team_name`, se cambiamo potrebbe rompere

---

## ✅ SOLUZIONE: Distinguere Match Vecchi da Nuovi

### **Strategia: Flag Implicito**

**Idea**: Usare `is_home` come flag per distinguere match vecchi da nuovi

**Logica**:
- **Match Vecchio**: `is_home = true` (default) + `client_team_name` presente → usa logica `client_team_name`
- **Match Nuovo**: `is_home` esplicitamente impostato dal wizard → usa logica `is_home`

**Problema**: Come distinguere match vecchio da nuovo se entrambi hanno `is_home = true`?

---

### **Soluzione 1: Campo `is_home_explicit` (Raccomandato)**

**Aggiungere campo nel database**:
```sql
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS is_home_explicit BOOLEAN DEFAULT false;

COMMENT ON COLUMN matches.is_home_explicit IS 
'True se is_home è stato impostato esplicitamente dal wizard, false se è default';
```

**Logica**:
- `is_home_explicit = false` → match vecchio, usa logica `client_team_name`
- `is_home_explicit = true` → match nuovo, usa logica `is_home`

**Vantaggi**:
- ✅ Distingue chiaramente match vecchi da nuovi
- ✅ Non interferisce con match esistenti
- ✅ Match esistenti continuano a funzionare

**Svantaggi**:
- ⚠️ Richiede migrazione database
- ⚠️ Aggiunge colonna extra

---

### **Soluzione 2: Usare `client_team_name` come Flag (Più Semplice)**

**Logica**:
- Se `client_team_name` è presente → match vecchio, usa logica `client_team_name`
- Se `client_team_name` è NULL e `is_home` è esplicito → match nuovo, usa logica `is_home`

**Problema**: Match nuovi potrebbero avere `client_team_name` (recuperato da `user_profiles`)

---

### **Soluzione 3: Timestamp + Flag (Più Robusta)**

**Logica**:
- Match creati PRIMA di implementazione → usa logica `client_team_name`
- Match creati DOPO implementazione → usa logica `is_home`

**Implementazione**:
```javascript
// Data implementazione: 26 Gennaio 2026
const IMPLEMENTATION_DATE = new Date('2026-01-27T00:00:00Z')

const matchDate = new Date(match.match_date)
if (matchDate < IMPLEMENTATION_DATE) {
  // Match vecchio: usa logica client_team_name
} else {
  // Match nuovo: usa logica is_home
}
```

**Vantaggi**:
- ✅ Non richiede migrazione database
- ✅ Distingue chiaramente match vecchi da nuovi
- ✅ Funziona automaticamente

**Svantaggi**:
- ⚠️ Hardcoded date (ma accettabile)

---

## 🎯 SOLUZIONE RACCOMANDATA: Soluzione 3 (Timestamp)

### **Perché questa soluzione**

1. ✅ **Nessuna migrazione database necessaria**
2. ✅ **Non interferisce con match esistenti**
3. ✅ **Funziona automaticamente**
4. ✅ **Semplice da implementare**

---

### **Implementazione**

#### **1. Definire Data Implementazione**

```javascript
// app/api/analyze-match/route.js

// Data implementazione campo is_home nel wizard
const IS_HOME_IMPLEMENTATION_DATE = new Date('2026-01-27T00:00:00Z')
```

#### **2. Logica Identificazione Squadra Cliente**

```javascript
// app/api/analyze-match/route.js (riga 627-631)

// Determina se match è vecchio o nuovo
const matchDate = matchData.match_date 
  ? new Date(matchData.match_date) 
  : new Date()
const isNewMatch = matchDate >= IS_HOME_IMPLEMENTATION_DATE

// Identifica squadra cliente
let clientTeamText = ''
if (isNewMatch && matchData.is_home !== undefined && matchData.is_home !== null) {
  // Match nuovo: usa logica is_home
  const isHome = matchData.is_home === true
  clientTeamText = isHome
    ? `\nSQUADRA CLIENTE: La PRIMA squadra (team1) nei dati è quella del CLIENTE (hai giocato in casa).\n`
    : `\nSQUADRA CLIENTE: La SECONDA squadra (team2) nei dati è quella del CLIENTE (hai giocato fuori casa).\n`
} else {
  // Match vecchio: usa logica client_team_name (backward compatibility)
  const clientTeamName = userProfile?.team_name || matchData.client_team_name || null
  clientTeamText = clientTeamName
    ? `\nSQUADRA CLIENTE: ${clientTeamName}\n`
    : `\nSQUADRA CLIENTE: Identifica quale squadra è quella del cliente confrontando i nomi squadra nei dati match.\n`
}
```

#### **3. Estrazione Dati**

```javascript
// app/api/extract-match-data/route.js

// Accettare is_home opzionale
const { imageDataUrl, section, is_home } = await req.json()

// Se is_home presente → usa per identificare squadra cliente
// Se is_home NULL → usa logica team_name (backward compatibility)
function getPromptForSection(section, userTeamInfo = null, isHome = null) {
  let teamHint = ''
  
  if (isHome !== null && isHome !== undefined) {
    // Nuova logica: usa is_home
    teamHint = `
IDENTIFICAZIONE SQUADRA CLIENTE:
- Il cliente ha giocato ${isHome ? 'IN CASA' : 'FUORI CASA'}
- ${isHome ? 'La PRIMA squadra (team1) nei dati è quella del CLIENTE' : 'La SECONDA squadra (team2) nei dati è quella del CLIENTE'}
- ${isHome ? 'La SECONDA squadra (team2) è l\'AVVERSARIO' : 'La PRIMA squadra (team1) è l\'AVVERSARIO'}
- Per ogni giocatore, identifica se appartiene a team1 o team2 e etichetta come "cliente" o "avversario" di conseguenza
`
  } else if (userTeamInfo) {
    // Vecchia logica: usa team_name
    const hints = []
    if (userTeamInfo.team_name) hints.push(`Nome squadra cliente: "${userTeamInfo.team_name}"`)
    if (userTeamInfo.favorite_team) hints.push(`Squadra preferita: "${userTeamInfo.favorite_team}"`)
    if (userTeamInfo.name) hints.push(`Nome utente: "${userTeamInfo.name}"`)
    if (hints.length > 0) {
      teamHint = `\n\nIDENTIFICAZIONE SQUADRA CLIENTE:\n${hints.join('\n')}\n- La squadra del cliente potrebbe corrispondere a uno di questi nomi o essere simile.\n- L'altra squadra è l'avversario.`
    }
  }
  
  // ... resto del prompt
}
```

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### **Step 1: Wizard (Sicuro)**

- [ ] Aggiungere stato `isHome` (default: `true`)
- [ ] Aggiungere toggle "Casa" / "Fuori Casa"
- [ ] Includere `is_home` in `matchData`
- [ ] Passare `is_home` a `extract-match-data` quando estrai

**Rischio**: 🟢 **NESSUNO**

---

### **Step 2: Estrazione Dati**

- [ ] Accettare parametro `is_home` opzionale
- [ ] Se `is_home` presente → passare al prompt IA
- [ ] Se `is_home` NULL → usare logica `team_name` (backward compatibility)
- [ ] Aggiornare `normalizePlayerRatings()` per usare `is_home` se presente

**Rischio**: 🟡 **MEDIO** - Solo nuovi match usano nuova logica

---

### **Step 3: Analisi Match (CRITICO)**

- [ ] Definire `IS_HOME_IMPLEMENTATION_DATE`
- [ ] Controllare se match è vecchio o nuovo (timestamp)
- [ ] Se match nuovo + `is_home` presente → usa logica `is_home`
- [ ] Se match vecchio → usa logica `client_team_name` (backward compatibility)

**Rischio**: 🟢 **BASSO** - Match esistenti non toccati

---

## ✅ VANTAGGI STRATEGIA TIMESTAMP

1. ✅ **Nessuna migrazione database**: Non serve creare colonne nuove
2. ✅ **Nessuna interferenza**: Match esistenti continuano a funzionare
3. ✅ **Automatico**: Distingue match vecchi da nuovi automaticamente
4. ✅ **Semplice**: Logica chiara e facile da mantenere

---

## ⚠️ ATTENZIONI

### **1. Data Implementazione**

**Scegliere data futura** (es. 27 Gennaio 2026):
- Match creati PRIMA → logica vecchia
- Match creati DOPO → logica nuova

**Esempio**:
```javascript
const IS_HOME_IMPLEMENTATION_DATE = new Date('2026-01-27T00:00:00Z')
```

---

### **2. Match Esistenti**

**Non modificare**:
- ❌ NON aggiornare `is_home` in match esistenti
- ❌ NON cambiare logica per match esistenti
- ✅ Lasciare come sono, continuano a funzionare

---

### **3. Test**

**Testare**:
- ✅ Match nuovo con `is_home = true` → verifica team1 = cliente
- ✅ Match nuovo con `is_home = false` → verifica team2 = cliente
- ✅ Match vecchio (prima 27 gen) → verifica usa logica `client_team_name`
- ✅ Backward compatibility → verifica match esistenti funzionano

---

**Fine Documento Strategia**

**Raccomandazione**: Usare strategia timestamp (Soluzione 3) - nessuna migrazione, nessuna interferenza
