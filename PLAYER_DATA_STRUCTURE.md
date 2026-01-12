# 📊 Struttura Dati Giocatore
## Allineamento con dati reali da Google Drive

**Data**: 2025-01-12  
**Status**: ✅ Schema aggiornato

---

## 📋 STRUTTURA COMPLETA GIOCATORE

### **Tabella: `players_base`**

#### **Campi Diretti (Colonne)**:

```sql
-- Identificazione
player_name TEXT NOT NULL          -- "Vinícius Júnior"
position TEXT                      -- "ESA" (posizione principale)
role TEXT                         -- "ESA Ala prolifica" (ruolo specifico)
konami_id TEXT UNIQUE
efootballhub_id TEXT

-- Dati Anagrafici
height INTEGER                     -- 176 (cm)
weight INTEGER                     -- 73 (kg)
age INTEGER                        -- 24
nationality TEXT                   -- Nazionalità
club_name TEXT                     -- Nome club
team TEXT                          -- Team (alternativo)
era TEXT                          -- Era (es: "2024")

-- Dati Gioco
card_type TEXT                     -- Tipo carta
potential_max INTEGER              -- 103 (potenziale massimo)
cost INTEGER                       -- 0 (costo)
form TEXT                          -- "B" (condizione: A, B, C, D, E)

-- Statistiche (JSONB)
base_stats JSONB                   -- Vedi struttura sotto
skills TEXT[]                      -- Array skills
com_skills TEXT[]                  -- Array COM skills
position_ratings JSONB             -- Rating per posizione
available_boosters JSONB           -- Booster disponibili

-- Metadata
metadata JSONB                     -- Dati aggiuntivi
source TEXT                        -- 'user_upload', 'efootballhub', etc.
```

---

## 📊 STRUTTURA `base_stats` JSONB

### **Formato Completo**:

```json
{
  "overall_rating": 98,
  "potential_max": 103,
  
  "attacking": {
    "offensive_awareness": 84,      // "Comportamento offensivo"
    "ball_control": 89,             // "Controllo palla"
    "dribbling": 90,                // "Vel. dribbling"
    "tight_possession": 86,         // "Possesso stretto"
    "low_pass": 72,                 // "Passaggio rasoterra"
    "lofted_pass": 72,              // "Passaggio alto"
    "finishing": 85,                // "Finalizzazione"
    "heading": 56,                  // "Colpo di testa"
    "place_kicking": 65,            // "Calci piazzati"
    "curl": 84                      // "Tiro a giro"
  },
  
  "defending": {
    "defensive_awareness": 49,      // "Comportamento difensivo"
    "defensive_engagement": 68,     // "Coinvolgimento difensivo"
    "tackling": 50,                 // "Contrasto"
    "aggression": 58,              // "Aggressività"
    "goalkeeping": 40,              // "Portieri"
    "gk_catching": 40,              // "Presa PT"
    "gk_parrying": 40,             // "Parata PT"
    "gk_reflexes": 40,              // "Riflessi PT"
    "gk_reach": 40                  // "Estensione PT"
  },
  
  "athleticism": {
    "speed": 91,                    // "Velocità"
    "acceleration": 92,             // "Accelerazione"
    "kicking_power": 82,           // "Potenza di tiro"
    "jump": 65,                     // "Elevazione"
    "physical_contact": 65,         // "Contatto fisico"
    "balance": 89,                  // "Equilibrio"
    "stamina": 86                   // "Resistenza"
  }
}
```

---

## 🔄 MAPPING DATI GOOGLE DRIVE → DATABASE

### **Esempio: Dati Input**:

```json
{
  "Giocatori": "98\nESA\nVinícius Júnior\nESA Ala prolifica",
  "Complessivamente": "98",
  "Potenziale": "103",
  "Costo": "0",
  "Livello Massimo": "-2",
  "Condizione": "B",
  "ClubName": "",
  "Nazionalità...": "",
  "Altezza": "176",
  "Peso": "73",
  "Età": "24",
  "Comportamento offensivo": "84",
  "Controllo palla": "89",
  ...
}
```

### **Parsing e Salvataggio**:

```javascript
// 1. Parse "Giocatori" field
const giocatoriParts = data["Giocatori"].split("\n");
// ["98", "ESA", "Vinícius Júnior", "ESA Ala prolifica"]

const player = {
  // Campi diretti
  player_name: giocatoriParts[2],           // "Vinícius Júnior"
  position: giocatoriParts[1],              // "ESA"
  role: giocatoriParts[3],                  // "ESA Ala prolifica"
  overall_rating: parseInt(giocatoriParts[0]), // 98
  
  // Dati anagrafici
  height: parseInt(data["Altezza"]),        // 176
  weight: parseInt(data["Peso"]),          // 73
  age: parseInt(data["Età"]),               // 24
  nationality: data["Nazionalità..."],      // ""
  club_name: data["ClubName"],              // ""
  
  // Dati gioco
  potential_max: parseInt(data["Potenziale"]), // 103
  cost: parseInt(data["Costo"]),            // 0
  form: data["Condizione"],                  // "B"
  level_cap: parseInt(data["Livello Massimo"]), // -2 (va in player_builds)
  
  // base_stats JSONB
  base_stats: {
    overall_rating: parseInt(data["Complessivamente"]), // 98
    attacking: {
      offensive_awareness: parseInt(data["Comportamento offensivo"]), // 84
      ball_control: parseInt(data["Controllo palla"]), // 89
      dribbling: parseInt(data["Vel. dribbling"]), // 90
      tight_possession: parseInt(data["Possesso stretto"]), // 86
      low_pass: parseInt(data["Passaggio rasoterra"]), // 72
      lofted_pass: parseInt(data["Passaggio alto"]), // 72
      finishing: parseInt(data["Finalizzazione"]), // 85
      heading: parseInt(data["Colpo di testa"]), // 56
      place_kicking: parseInt(data["Calci piazzati"]), // 65
      curl: parseInt(data["Tiro a giro"]) // 84
    },
    defending: {
      defensive_awareness: parseInt(data["Comportamento difensivo"]), // 49
      defensive_engagement: parseInt(data["Coinvolgimento difensivo"]), // 68
      tackling: parseInt(data["Contrasto"]), // 50
      aggression: parseInt(data["Aggressività"]), // 58
      goalkeeping: parseInt(data["Portieri"]), // 40
      gk_catching: parseInt(data["Presa PT"]), // 40
      gk_parrying: parseInt(data["Parata PT"]), // 40
      gk_reflexes: parseInt(data["Riflessi PT"]), // 40
      gk_reach: parseInt(data["Estensione PT"]) // 40
    },
    athleticism: {
      speed: parseInt(data["Velocità"]), // 91
      acceleration: parseInt(data["Accelerazione"]), // 92
      kicking_power: parseInt(data["Potenza di tiro"]), // 82
      jump: parseInt(data["Elevazione"]), // 65
      physical_contact: parseInt(data["Contatto fisico"]), // 65
      balance: parseInt(data["Equilibrio"]), // 89
      stamina: parseInt(data["Resistenza"]) // 86
    }
  }
}
```

---

## 📋 ROSA: 11 TITOLARI + 10 RISERVE

### **Tabella: `user_rosa`**

```sql
player_build_ids UUID[]  -- Array di 21 UUID (11 titolari + 10 riserve)
```

### **Struttura Rosa**:

```javascript
{
  id: "uuid",
  user_id: "uuid",
  name: "La mia squadra",
  player_build_ids: [
    // 11 TITOLARI (indici 0-10)
    "build_id_1", "build_id_2", ..., "build_id_11",
    // 10 RISERVE (indici 11-20)
    "build_id_12", "build_id_13", ..., "build_id_21"
  ],
  preferred_formation: "4-3-3",
  squad_analysis: {
    titolari: [...],  // Array 11 giocatori
    riserve: [...],   // Array 10 giocatori
    ...
  }
}
```

---

## ✅ CHECKLIST COMPLETEZZA

### **Campi Database**:
- [x] `player_name` - Nome giocatore
- [x] `position` - Posizione principale
- [x] `role` - Ruolo specifico
- [x] `height` - Altezza (cm)
- [x] `weight` - Peso (kg)
- [x] `age` - Età
- [x] `nationality` - Nazionalità
- [x] `club_name` - Club
- [x] `potential_max` - Potenziale
- [x] `cost` - Costo
- [x] `form` - Condizione
- [x] `base_stats` - Tutte le statistiche
- [x] `skills` - Skills array
- [x] `com_skills` - COM skills array

### **Statistiche `base_stats`**:
- [x] Overall rating
- [x] Attacking (10 stats)
- [x] Defending (9 stats)
- [x] Athleticism (7 stats)

---

## 🔄 AGGIORNAMENTO EDGE FUNCTION

L'Edge Function `process-screenshot` deve essere aggiornata per:

1. **Parse campo "Giocatori"**:
   ```javascript
   const giocatoriParts = data["Giocatori"].split("\n");
   const overall = parseInt(giocatoriParts[0]);
   const position = giocatoriParts[1];
   const playerName = giocatoriParts[2];
   const role = giocatoriParts[3];
   ```

2. **Mappare tutte le statistiche**:
   ```javascript
   base_stats: {
     overall_rating: parseInt(data["Complessivamente"]),
     attacking: {
       offensive_awareness: parseInt(data["Comportamento offensivo"]),
       // ... tutte le altre
     },
     // ...
   }
   ```

3. **Salvare campi fisici**:
   ```javascript
   height: parseInt(data["Altezza"]),
   weight: parseInt(data["Peso"]),
   age: parseInt(data["Età"]),
   nationality: data["Nazionalità..."],
   club_name: data["ClubName"],
   potential_max: parseInt(data["Potenziale"]),
   cost: parseInt(data["Costo"]),
   form: data["Condizione"],
   role: role
   ```

---

**Status**: 🟢 **Schema aggiornato e allineato con dati reali**
