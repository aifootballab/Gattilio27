# 📋 Struttura Rosa: 11 Titolari + 10 Riserve
## Gestione completa squadra

**Data**: 2025-01-12  
**Status**: ✅ Schema supportato

---

## 🏆 STRUTTURA ROSA

### **Tabella: `user_rosa`**

```sql
player_build_ids UUID[]  -- Array di 21 UUID
```

### **Organizzazione**:

```
player_build_ids[0-10]   → 11 TITOLARI
player_build_ids[11-20]  → 10 RISERVE
```

---

## 📊 ESEMPIO STRUTTURA

```javascript
{
  id: "uuid",
  user_id: "uuid",
  name: "La mia squadra",
  description: "Squadra principale",
  
  // 21 giocatori totali
  player_build_ids: [
    // TITOLARI (11)
    "build_id_1",   // Portiere
    "build_id_2",   // Difensore 1
    "build_id_3",   // Difensore 2
    "build_id_4",   // Difensore 3
    "build_id_5",   // Difensore 4
    "build_id_6",   // Centrocampista 1
    "build_id_7",   // Centrocampista 2
    "build_id_8",   // Centrocampista 3
    "build_id_9",   // Attaccante 1
    "build_id_10",  // Attaccante 2
    "build_id_11",  // Attaccante 3
    
    // RISERVE (10)
    "build_id_12",  // Riserva 1
    "build_id_13",  // Riserva 2
    "build_id_14",  // Riserva 3
    "build_id_15",  // Riserva 4
    "build_id_16",  // Riserva 5
    "build_id_17",  // Riserva 6
    "build_id_18",  // Riserva 7
    "build_id_19",  // Riserva 8
    "build_id_20",  // Riserva 9
    "build_id_21"   // Riserva 10
  ],
  
  preferred_formation: "4-3-3",
  squad_analysis: {
    strengths: [...],
    weaknesses: [...],
    recommended_formations: [...],
    titolari: [...],  // Array 11 giocatori completi
    riserve: [...],   // Array 10 giocatori completi
    avg_rating: 92,
    player_count: 21
  }
}
```

---

## 🔄 FUNZIONI HELPER

### **Separare Titolari e Riserve**:

```javascript
function getTitolari(rosa) {
  return rosa.player_build_ids.slice(0, 11)
}

function getRiserve(rosa) {
  return rosa.player_build_ids.slice(11, 21)
}
```

### **Aggiungere Giocatore**:

```javascript
// Aggiungi come titolare (se c'è posto)
if (rosa.player_build_ids.length < 11) {
  rosa.player_build_ids.push(buildId)
}

// Aggiungi come riserva (se c'è posto)
else if (rosa.player_build_ids.length < 21) {
  rosa.player_build_ids.push(buildId)
}
```

### **Spostare Giocatore**:

```javascript
// Da riserva a titolare
function promoteToTitolare(rosa, buildId) {
  const index = rosa.player_build_ids.indexOf(buildId)
  if (index >= 11 && index < 21) {
    // Rimuovi da riserve
    rosa.player_build_ids.splice(index, 1)
    // Aggiungi come titolare (se c'è posto)
    if (rosa.player_build_ids.length < 11) {
      rosa.player_build_ids.push(buildId)
    }
  }
}

// Da titolare a riserva
function demoteToRiserva(rosa, buildId) {
  const index = rosa.player_build_ids.indexOf(buildId)
  if (index >= 0 && index < 11) {
    // Rimuovi da titolari
    rosa.player_build_ids.splice(index, 1)
    // Aggiungi come riserva (se c'è posto)
    if (rosa.player_build_ids.length < 21) {
      rosa.player_build_ids.push(buildId)
    }
  }
}
```

---

## ✅ VALIDAZIONE

### **Regole Rosa**:
- ✅ Massimo 11 titolari
- ✅ Massimo 10 riserve
- ✅ Totale massimo 21 giocatori
- ✅ Un giocatore può essere solo titolare O riserva (non entrambi)

### **Validazione Frontend**:

```javascript
function validateRosa(rosa) {
  const errors = []
  
  if (rosa.player_build_ids.length > 21) {
    errors.push('Massimo 21 giocatori in rosa')
  }
  
  const titolari = rosa.player_build_ids.slice(0, 11)
  if (titolari.length > 11) {
    errors.push('Massimo 11 titolari')
  }
  
  const riserve = rosa.player_build_ids.slice(11, 21)
  if (riserve.length > 10) {
    errors.push('Massimo 10 riserve')
  }
  
  // Verifica duplicati
  const unique = new Set(rosa.player_build_ids)
  if (unique.size !== rosa.player_build_ids.length) {
    errors.push('Giocatori duplicati nella rosa')
  }
  
  return errors
}
```

---

## 📊 ANALISI ROSA

### **Analisi Include**:

```javascript
squad_analysis: {
  // Analisi generale
  strengths: ['Attacco forte', 'Difesa solida'],
  weaknesses: ['Centrocampo debole'],
  recommended_formations: ['4-3-3', '4-4-2'],
  
  // Analisi titolari
  titolari: {
    avg_rating: 92,
    positions: { GK: 1, CB: 2, ... },
    strengths: [...],
    weaknesses: [...]
  },
  
  // Analisi riserve
  riserve: {
    avg_rating: 88,
    positions: { ... },
    coverage: ['GK', 'CB', ...]  // Posizioni coperte
  },
  
  // Analisi completa
  avg_rating: 90,
  player_count: 21,
  formation_compatibility: {
    '4-3-3': 0.95,
    '4-4-2': 0.88,
    ...
  }
}
```

---

**Status**: 🟢 **Schema supporta 11 titolari + 10 riserve**
