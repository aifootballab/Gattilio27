# 📋 Specifica: Prompt Finale per Suggerimenti IA

**Data**: 24 Gennaio 2026  
**Stato**: 📝 **SPECIFICA - Non Implementato**  
**Scopo**: Definire struttura completa del prompt con tutti i dati necessari per incroci completi

---

## 🎯 OBIETTIVO

Creare un prompt che includa **TUTTI i dati necessari** per permettere all'IA di fare **incroci completi** e generare suggerimenti specifici e accurati.

---

## 📊 STRUTTURA PROMPT FINALE

### 1. **INTRODUZIONE E CONTESTO**

```
Sei un esperto tattico di eFootball con conoscenza approfondita delle formazioni meta e delle contromisure efficaci utilizzate dalla community professionale.

[CONOSCENZA EFOOTBALL - MEMORIA ATTILA]
[TUTTO IL CONTENUTO DEL FILE memoria_attila_definitiva_unificata.txt]

IMPORTANTE - APPLICA QUESTA CONOSCENZA:
- Valuta giocatori considerando statistiche specifiche (Velocità, Finalizzazione, Comportamento Offensivo, etc.)
- Suggerisci stili di gioco compatibili con ruolo (es. "Opportunista" solo per P, "Senza palla" per P/SP/TRQ)
- Considera limitazioni tecniche: Attacco max 2P+1EDA/ESA, Centrocampo max 1CLD/CLS, Difesa max 3DC+1TD/TS
- Considera competenze posizione (Basso/Intermedio/Alto) - giocatori con competenza Alta performano meglio
- Considera abilità speciali (Leader, Passaggio di prima, etc.) per suggerimenti tattici
- Applica best practices tattiche dalla sezione "Consigli e Strategie"
- Usa conoscenza moduli tattici per analisi formazioni
```

---

### 2. **FORMazione AVVERSARIA**

```
FORMazione AVVERSARIA:
- Formazione: [nome]
- Stile: [stile]
- Stile Tattico: [stile tattico se disponibile]
- Forza: [overall strength]
- Giocatori: [numero] giocatori rilevati

⚠️ FORMAZIONE META IDENTIFICATA: [tipo] (se meta)
Questa è una formazione meta comune. Applica contromisure specifiche basate su best practices community.
```

**Stato Attuale**: ✅ Già incluso  
**Modifiche Necessarie**: Nessuna

---

### 3. **ROSA CLIENTE (Titolari e Riserve)**

#### 3.1 **TITOLARI (in campo, 11)**

**Formato Attuale**:
```
- [id] Nome - Posizione - Overall 85 (Skills: Leader, Passaggio di prima) slot 0
```

**Formato Finale (CON TUTTI I DATI)**:
```
- [id] Nome - Posizione - Overall 85
  Stats: Velocità 88, Finalizzazione 85, Passaggio 90, Dribbling 82, 
         Resistenza 80, Comportamento Offensivo 85, Comportamento Difensivo 70
  Competenza Posizione: Alta (P) → +20% performance
  Stile Gioco: Opportunista (compatibile con P)
  Skills: Leader, Passaggio di prima
  Slot: 0
```

**Dati da Includere**:
- ✅ Nome, Posizione, Overall (già presente)
- ✅ Skills (già presente)
- ❌ **Statistiche dettagliate** (base_stats: velocita, finalizzazione, passaggio_rasoterra, dribbling, resistenza, comportamento_offensivo, comportamento_difensivo)
- ❌ **Competenza posizione** (position_competence: Basso/Intermedio/Alto)
- ❌ **Stile di gioco individuale** (playing_style_name o da playing_style_id)
- ✅ Slot (già presente)

#### 3.2 **RISERVE (panchina, N)**

**Formato Finale** (stesso formato dei titolari):
```
- [id] Nome - Posizione - Overall 82
  Stats: Velocità 85, Finalizzazione 80, Passaggio 88, Dribbling 80,
         Resistenza 75, Comportamento Offensivo 80, Comportamento Difensivo 65
  Competenza Posizione: Intermedio (SP) → performance standard
  Stile Gioco: Senza palla (compatibile con P/SP/TRQ)
  Skills: Opportunista
```

**Dati da Includere**: Stessi dei titolari

#### 3.3 **SINERGIE TITOLARI** (se disponibili)

```
SINERGIE TITOLARI:
- Messi (P) + Modric (AMF): +15% bonus (Connection attiva)
- Ronaldo (SP) + Benzema (P): +10% bonus (Connection attiva)
```

**Dati da Includere**:
- ❌ **Sinergie tra giocatori** (Connection - da calcolare o recuperare da DB)

---

### 4. **FORMazione CLIENTE ATTUALE**

```
FORMazione CLIENTE ATTUALE:
- Formazione: [nome formazione]
- Titolari: [numero] giocatori (vedi elenco TITOLARI sopra)
```

**Stato Attuale**: ✅ Già incluso  
**Modifiche Necessarie**: Nessuna

---

### 5. **IMPOSTAZIONI TATTICHE CLIENTE**

#### 5.1 **Team Playing Style**

```
IMPOSTAZIONI TATTICHE CLIENTE:
- Team Playing Style: Quick Counter
```

**Stato Attuale**: ✅ Già incluso

#### 5.2 **Istruzioni Individuali Dettagliate**

**Formato Attuale**:
```
- Istruzioni Individuali: 3 istruzioni configurate
```

**Formato Finale (CON DETTAGLI)**:
```
Istruzioni Individuali Configurate:
- Slot 0 (Messi - P): attacco_spazio
  → Richiede: Velocità > 85, Finalizzazione > 80
  → Messi: Velocità 90, Finalizzazione 95 ✅ Compatibile
  
- Slot 1 (Modric - AMF): passaggi_filtranti
  → Richiede: Passaggio > 85, Dribbling > 80
  → Modric: Passaggio 92, Dribbling 85 ✅ Compatibile
  
- Slot 2 (Benzema - P): attacco_spazio
  → Richiede: Velocità > 85, Finalizzazione > 80
  → Benzema: Velocità 75, Finalizzazione 90 ⚠️ Velocità insufficiente
```

**Dati da Includere**:
- ❌ **Dettagli istruzioni per ogni slot** (individual_instructions: { slot: instruction })
- ❌ **Giocatore in ogni slot** (collegare slot con giocatore da titolari)
- ❌ **Requisiti istruzione** (da documentazione Attila o logica: attacco_spazio richiede Velocità > 85)
- ❌ **Verifica compatibilità** (statistiche giocatore vs requisiti istruzione)

---

### 6. **ALLENATORE CLIENTE**

#### 6.1 **Competenze Stili Coach**

**Formato Attuale**:
```
- Competenze Stili: Quick Counter, Possesso palla
```

**Formato Finale (CON LIVELLI)**:
```
Competenze Stili (Livello):
- Quick Counter: Alto (Livello 85)
  → Giocatori veloci (Velocità > 85) performano meglio con questo coach
  → Stile "Opportunista" e "Senza palla" sono ideali
  
- Possesso palla: Intermedio (Livello 65)
  → Giocatori con Passaggio alto (Passaggio > 85) performano meglio
  → Stile "Regista creativo" è ideale
```

**Dati da Includere**:
- ❌ **Livello competenza** (playing_style_competence: { style: level })
- ❌ **Impatto su giocatori** (quali statistiche/stili beneficiano)

#### 6.2 **Stat Boosters**

**Formato Attuale**:
```
- Stat Boosters: 3 boosters attivi
```

**Formato Finale (CON DETTAGLI)**:
```
Stat Boosters Attivi:
- Velocità +5: Aumenta Velocità di tutti i giocatori di +5
  → Messi: Velocità 90 → 95 (perfetto per contropiede)
  → Benzema: Velocità 75 → 80 (ancora insufficiente per contropiede)
  
- Finalizzazione +3: Aumenta Finalizzazione di tutti i giocatori di +3
  → Messi: Finalizzazione 95 → 98 (eccellente)
  → Benzema: Finalizzazione 90 → 93 (buono)
  
- Passaggio +4: Aumenta Passaggio di tutti i giocatori di +4
  → Modric: Passaggio 92 → 96 (eccellente)
```

**Dati da Includere**:
- ❌ **Dettagli boosters** (stat_boosters: array di { name, stat, value } o stringhe)
- ❌ **Impatto su statistiche giocatori** (calcolare statistiche finali con boosters)

#### 6.3 **Connection**

```
- Connection: [nome connection]
```

**Stato Attuale**: ✅ Già incluso

---

### 7. **STORICO MATCH**

```
STORICO MATCH COMPLETO (ultimi 50):
1. ⚠️ SIMILE vs Avversario - Vittoria - Formazione: 4-3-3 - Stile: Quick Counter
2. vs Avversario - Sconfitta - Formazione: 4-2-3-1 - Stile: Possesso palla
...
```

**Stato Attuale**: ✅ Già incluso

---

### 8. **ANALISI CRITICA: MATCH CONTRO FORMAZIONI SIMILI**

```
⚠️ ANALISI CRITICA: MATCH CONTRO FORMAZIONI SIMILI:
- Match trovati con formazione simile: 5
- Vittorie: 2 | Sconfitte: 3 | Pareggi: 0
- Win Rate: 40%

🚨 PROBLEMA IDENTIFICATO: Il cliente ha più sconfitte che vittorie contro formazioni simili!
- Questo indica una debolezza tattica specifica contro questo tipo di formazione
- È CRITICO suggerire contromisure specifiche e alternative tattiche
```

**Stato Attuale**: ✅ Già incluso

---

### 9. **PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI**

**Formato Attuale**:
```
📊 PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:
🚨 GIOCATORI CHE SOFFRONO (rating < 6.0):
- Benzema: Rating medio 5.5 in 3 match (min: 5.0, max: 6.0)
  → Considera sostituzione o cambio ruolo per questo match
```

**Formato Finale (CON ANALISI PERCHÉ)**:
```
📊 PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:
🚨 GIOCATORI CHE SOFFRONO (rating < 6.0):
- Benzema: Rating medio 5.5 in 3 match (min: 5.0, max: 6.0)
  Stats: Velocità 75, Finalizzazione 90, Competenza Intermedio (P)
  → Motivo: Velocità 75 insufficiente per contropiede veloce richiesto
  → Avversario: Quick Counter (richiede Velocità > 85)
  → Considera sostituzione o cambio ruolo per questo match
```

**Dati da Includere**:
- ❌ **Statistiche giocatori che soffrono** (per capire perché)
- ❌ **Confronto con requisiti avversario** (perché non performa)

---

### 10. **ABITUDINI TATTICHE CLIENTE**

```
🎯 ABITUDINI TATTICHE CLIENTE:

Formazioni Preferite (più usate):
- 4-3-3: 10 match | Win Rate: 60% (6W/4L/0D)
- 4-2-3-1: 5 match | Win Rate: 40% (2W/3L/0D)

Stili di Gioco Preferiti:
- Quick Counter: 8 match
- Possesso palla: 7 match

⚠️ FORMAZIONI PROBLEMATICHE (Win Rate < 40%):
- 4-2-3-1: Win Rate 40% (2W/3L in 5 match)
  → Il cliente ha difficoltà con questa formazione, suggerisci alternative
```

**Stato Attuale**: ✅ Già incluso

---

### 11. **PATTERN FORMAZIONI CLIENTE** (opzionale)

```
PATTERN FORMAZIONI CLIENTE:
- 4-3-3: 10 match, win rate: 60%
- 4-2-3-1: 5 match, win rate: 40%

PROBLEMI RICORRENTI:
- Difesa laterale vulnerabile (frequenza: alta)
- Transizioni lente (frequenza: media)
```

**Stato Attuale**: ✅ Già incluso

---

### 12. **CONTROMISURE SPECIFICHE PER FORMAZIONE META**

```
⚠️ CONTROMISURE SPECIFICHE PER FORMAZIONE META:
- Contro 4-3-3: Usa 3-5-2 o 4-4-2 Diamond per dominare centrocampo (superiorità numerica 5v3)
- Marcatura stretta sulle ali per bloccare attacchi laterali
- Sfrutta superiorità numerica centrale per controllo possesso

- Contro Quick Counter: Linea difensiva BASSA per eliminare spazio dietro
- Possesso paziente per negare transizioni rapide
- Evita pressing aggressivo che lascia gap
- Centrocampo compatto con BWM e DMF per intercettare passaggi
```

**Stato Attuale**: ✅ Già incluso

---

## 🔧 MODIFICHE NECESSARIE

### Priorità 1: Documentazione Attila ⭐⭐⭐

**Cosa Aggiungere**:
```javascript
import fs from 'fs'
import path from 'path'

let memoriaAttilaCache = null

function getMemoriaAttila() {
  if (memoriaAttilaCache) return memoriaAttilaCache
  
  try {
    const filePath = path.join(process.cwd(), 'memoria_attila_definitiva_unificata.txt')
    if (fs.existsSync(filePath)) {
      memoriaAttilaCache = fs.readFileSync(filePath, 'utf-8')
      return memoriaAttilaCache
    }
  } catch (error) {
    console.warn('[countermeasuresHelper] Could not load memoria Attila:', error)
  }
  
  return ''
}

// Nel prompt, all'inizio:
const memoriaAttila = getMemoriaAttila()
const attilaContext = memoriaAttila ? `
CONOSCENZA EFOOTBALL (Memoria Attila):
${memoriaAttila}

IMPORTANTE - APPLICA QUESTA CONOSCENZA:
[... istruzioni ...]
` : ''
```

**Dove**: Inizio prompt, prima di tutto

---

### Priorità 2: Statistiche Dettagliate Giocatori ⭐⭐⭐

**Cosa Aggiungere**:
```javascript
// In rosterText, per ogni giocatore:
const stats = p.base_stats || {}
const statsText = stats && Object.keys(stats).length > 0 ? `
  Stats: Velocità ${stats.velocita || 'N/A'}, Finalizzazione ${stats.finalizzazione || 'N/A'}, 
         Passaggio ${stats.passaggio_rasoterra || 'N/A'}, Dribbling ${stats.dribbling || 'N/A'},
         Resistenza ${stats.resistenza || 'N/A'}, Comportamento Offensivo ${stats.comportamento_offensivo || 'N/A'},
         Comportamento Difensivo ${stats.comportamento_difensivo || 'N/A'}` : ''

rosterText += `- [${p.id}] ${p.player_name} - ${p.position} - Overall ${p.overall_rating}${statsText}
  ...`
```

**Dove**: Sezione TITOLARI e RISERVE

---

### Priorità 3: Competenze Posizione ⭐⭐

**Cosa Aggiungere**:
```javascript
const competence = p.position_competence || 'N/A'
const competenceText = competence !== 'N/A' ? `
  Competenza Posizione: ${competence} (${p.position}) → ${competence === 'Alta' ? '+20% performance' : competence === 'Intermedio' ? 'performance standard' : '-20% performance'}` : ''

rosterText += `${competenceText}
  ...`
```

**Dove**: Sezione TITOLARI e RISERVE

---

### Priorità 4: Stili di Gioco Individuali ⭐⭐

**Cosa Aggiungere**:
```javascript
// Recuperare nome stile da playing_style_id (serve query o mapping)
const playingStyle = p.playing_style_name || 'N/A'
const styleCompatibility = getStyleCompatibility(playingStyle, p.position) // Da implementare

const styleText = playingStyle !== 'N/A' ? `
  Stile Gioco: ${playingStyle} ${styleCompatibility ? `(compatibile con ${p.position})` : `(⚠️ non compatibile con ${p.position})`}` : ''

rosterText += `${styleText}
  ...`
```

**Dove**: Sezione TITOLARI e RISERVE

**Nota**: Serve recuperare nome stile da `playing_style_id` (query a tabella `playing_styles` o mapping)

---

### Priorità 5: Istruzioni Individuali Dettagliate ⭐⭐⭐

**Cosa Aggiungere**:
```javascript
if (tacticalSettings.individual_instructions && Object.keys(tacticalSettings.individual_instructions).length > 0) {
  tacticalText += `\nIstruzioni Individuali Configurate:\n`
  Object.entries(tacticalSettings.individual_instructions).forEach(([slot, instruction]) => {
    // Trova giocatore in questo slot
    const playerInSlot = titolari.find(p => 
      p.slot_index === parseInt(slot) || 
      p.slot_index === slot ||
      (p.slot_index != null && String(p.slot_index) === String(slot))
    )
    const playerName = playerInSlot ? playerInSlot.player_name : 'N/A'
    const playerStats = playerInSlot?.base_stats || {}
    
    // Requisiti istruzione (da logica o documentazione Attila)
    const instructionRequirements = getInstructionRequirements(instruction) // Da implementare
    
    // Verifica compatibilità
    const isCompatible = checkInstructionCompatibility(playerStats, instructionRequirements)
    
    tacticalText += `- Slot ${slot} (${playerName} - ${playerInSlot?.position || 'N/A'}): ${instruction}\n`
    if (instructionRequirements) {
      tacticalText += `  → Richiede: ${instructionRequirements.description}\n`
      tacticalText += `  → ${playerName}: ${isCompatible ? '✅ Compatibile' : '⚠️ ' + isCompatible.reason}\n`
    }
  })
}
```

**Dove**: Sezione IMPOSTAZIONI TATTICHE

**Funzioni da Implementare**:
- `getInstructionRequirements(instruction)`: Restituisce requisiti per istruzione
- `checkInstructionCompatibility(playerStats, requirements)`: Verifica compatibilità

---

### Priorità 6: Coach Boosters Dettagliati ⭐⭐

**Cosa Aggiungere**:
```javascript
if (activeCoach.stat_boosters && Array.isArray(activeCoach.stat_boosters) && activeCoach.stat_boosters.length > 0) {
  coachText += `\nStat Boosters Attivi:\n`
  activeCoach.stat_boosters.forEach(booster => {
    // Booster può essere stringa o oggetto
    let boosterName, boosterStat, boosterValue
    
    if (typeof booster === 'string') {
      // Parse stringa (es. "Velocità +5")
      const match = booster.match(/(\w+)\s*\+(\d+)/)
      if (match) {
        boosterName = booster
        boosterStat = match[1]
        boosterValue = parseInt(match[2])
      }
    } else if (booster && typeof booster === 'object') {
      boosterName = booster.name || 'Booster'
      boosterStat = booster.stat || 'N/A'
      boosterValue = booster.value || 0
    }
    
    if (boosterStat && boosterValue) {
      coachText += `- ${boosterName}: Aumenta ${boosterStat} di tutti i giocatori di +${boosterValue}\n`
      
      // Mostra impatto su giocatori titolari (esempio top 3)
      const affectedPlayers = titolari
        .filter(p => p.base_stats && p.base_stats[boosterStat.toLowerCase()])
        .slice(0, 3)
      
      affectedPlayers.forEach(p => {
        const currentStat = p.base_stats[boosterStat.toLowerCase()] || 0
        const boostedStat = currentStat + boosterValue
        coachText += `  → ${p.player_name}: ${boosterStat} ${currentStat} → ${boostedStat} ${boostedStat > 85 ? '(perfetto)' : boostedStat > 75 ? '(buono)' : '(ancora insufficiente)'}\n`
      })
    }
  })
}
```

**Dove**: Sezione ALLENATORE

---

### Priorità 7: Competenze Stili Coach Dettagliate ⭐⭐

**Cosa Aggiungere**:
```javascript
if (activeCoach.playing_style_competence) {
  coachText += `\nCompetenze Stili (Livello):\n`
  Object.entries(activeCoach.playing_style_competence).forEach(([style, level]) => {
    const levelText = typeof level === 'number' 
      ? (level >= 80 ? 'Alto' : level >= 60 ? 'Intermedio' : 'Basso')
      : level
    
    coachText += `- ${style}: ${levelText}${typeof level === 'number' ? ` (Livello ${level})` : ''}\n`
    
    // Impatto su giocatori
    const impact = getStyleImpact(style, levelText) // Da implementare
    if (impact) {
      coachText += `  → ${impact.description}\n`
      coachText += `  → Stili giocatori ideali: ${impact.idealPlayerStyles.join(', ')}\n`
    }
  })
}
```

**Dove**: Sezione ALLENATORE

**Funzioni da Implementare**:
- `getStyleImpact(style, level)`: Restituisce impatto stile coach su giocatori

---

### Priorità 8: Sinergie tra Giocatori ⭐

**Cosa Aggiungere**:
```javascript
// Calcola sinergie (se disponibili da DB o da calcolare)
const synergies = calculateSynergies(titolari) // Da implementare

if (synergies && synergies.length > 0) {
  rosterText += `\nSINERGIE TITOLARI:\n`
  synergies.forEach(synergy => {
    rosterText += `- ${synergy.player1_name} (${synergy.player1_position}) + ${synergy.player2_name} (${synergy.player2_position}): +${synergy.bonus}% bonus (Connection: ${synergy.connection_name || 'N/A'})\n`
  })
}
```

**Dove**: Dopo sezione RISERVE

**Funzioni da Implementare**:
- `calculateSynergies(titolari)`: Calcola sinergie tra giocatori (da Connection o da logica)

---

### Priorità 9: Performance Giocatori con Analisi Perché ⭐⭐

**Cosa Aggiungere**:
```javascript
// In playerPerformanceAnalysis, per ogni giocatore che soffre:
strugglingPlayers.forEach(player => {
  const playerData = titolari.find(p => p.id === player.id) || riserve.find(p => p.id === player.id)
  const playerStats = playerData?.base_stats || {}
  
  playerPerformanceAnalysis += `- ${player.name}: Rating medio ${player.avgRating} in ${player.matches} match (min: ${player.minRating}, max: ${player.maxRating})\n`
  
  if (playerStats && Object.keys(playerStats).length > 0) {
    playerPerformanceAnalysis += `  Stats: Velocità ${playerStats.velocita || 'N/A'}, Finalizzazione ${playerStats.finalizzazione || 'N/A'}, `
    playerPerformanceAnalysis += `Competenza ${playerData?.position_competence || 'N/A'} (${playerData?.position || 'N/A'})\n`
    
    // Analisi perché soffre
    const reason = analyzeWhyStruggling(playerStats, opponentFormation) // Da implementare
    if (reason) {
      playerPerformanceAnalysis += `  → Motivo: ${reason}\n`
    }
  }
  
  playerPerformanceAnalysis += `  → Considera sostituzione o cambio ruolo per questo match\n`
})
```

**Dove**: Sezione PERFORMANCE GIOCATORI

**Funzioni da Implementare**:
- `analyzeWhyStruggling(playerStats, opponentFormation)`: Analizza perché giocatore soffre

---

## 📊 ESEMPIO PROMPT FINALE COMPLETO

```
Sei un esperto tattico di eFootball con conoscenza approfondita delle formazioni meta e delle contromisure efficaci utilizzate dalla community professionale.

═══════════════════════════════════════════════════════════════
CONOSCENZA EFOOTBALL (Memoria Attila):
═══════════════════════════════════════════════════════════════

[TUTTO IL CONTENUTO DEL FILE memoria_attila_definitiva_unificata.txt]

IMPORTANTE - APPLICA QUESTA CONOSCENZA:
- Valuta giocatori considerando statistiche specifiche
- Suggerisci stili di gioco compatibili con ruolo
- Considera limitazioni tecniche
- Considera competenze posizione
- Applica best practices tattiche

═══════════════════════════════════════════════════════════════

FORMazione AVVERSARIA:
- Formazione: 4-3-3
- Stile: Quick Counter
- Forza: 87
- Giocatori: 11 giocatori rilevati

⚠️ FORMAZIONE META IDENTIFICATA: 4-3-3
Questa è una formazione meta comune. Applica contromisure specifiche basate su best practices community.

TITOLARI (in campo, 11):
- [id-1] Messi - P - Overall 92
  Stats: Velocità 90, Finalizzazione 95, Passaggio 88, Dribbling 92,
         Resistenza 85, Comportamento Offensivo 90, Comportamento Difensivo 35
  Competenza Posizione: Alta (P) → +20% performance
  Stile Gioco: Opportunista (compatibile con P)
  Skills: Opportunista, Leader
  Slot: 0

- [id-2] Benzema - P - Overall 88
  Stats: Velocità 75, Finalizzazione 90, Passaggio 82, Dribbling 80,
         Resistenza 78, Comportamento Offensivo 85, Comportamento Difensivo 40
  Competenza Posizione: Intermedio (P) → performance standard
  Stile Gioco: Fulcro di gioco (compatibile con P)
  Skills: Leader
  Slot: 1

[... altri 9 titolari ...]

RISERVE (panchina, 20):
- [id-12] Lewandowski - P - Overall 91
  Stats: Velocità 88, Finalizzazione 92, Passaggio 80, Dribbling 78,
         Resistenza 82, Comportamento Offensivo 88, Comportamento Difensivo 38
  Competenza Posizione: Alta (P) → +20% performance
  Stile Gioco: Opportunista (compatibile con P)
  Skills: Opportunista

[... altre riserve ...]

SINERGIE TITOLARI:
- Messi (P) + Modric (AMF): +15% bonus (Connection: Barcellona)
- Ronaldo (SP) + Benzema (P): +10% bonus (Connection: Real Madrid)

FORMazione CLIENTE ATTUALE:
- Formazione: 4-2-3-1
- Titolari: 11 giocatori (vedi elenco TITOLARI sopra)

IMPOSTAZIONI TATTICHE CLIENTE:
- Team Playing Style: Quick Counter

Istruzioni Individuali Configurate:
- Slot 0 (Messi - P): attacco_spazio
  → Richiede: Velocità > 85, Finalizzazione > 80
  → Messi: Velocità 90, Finalizzazione 95 ✅ Compatibile
  
- Slot 1 (Benzema - P): attacco_spazio
  → Richiede: Velocità > 85, Finalizzazione > 80
  → Benzema: Velocità 75, Finalizzazione 90 ⚠️ Velocità insufficiente (75 < 85)

ALLENATORE CLIENTE:
Competenze Stili (Livello):
- Quick Counter: Alto (Livello 85)
  → Giocatori veloci (Velocità > 85) performano meglio con questo coach
  → Stili giocatori ideali: Opportunista, Senza palla

- Possesso palla: Intermedio (Livello 65)
  → Giocatori con Passaggio alto (Passaggio > 85) performano meglio
  → Stili giocatori ideali: Regista creativo

Stat Boosters Attivi:
- Velocità +5: Aumenta Velocità di tutti i giocatori di +5
  → Messi: Velocità 90 → 95 (perfetto per contropiede)
  → Benzema: Velocità 75 → 80 (ancora insufficiente per contropiede)

- Finalizzazione +3: Aumenta Finalizzazione di tutti i giocatori di +3
  → Messi: Finalizzazione 95 → 98 (eccellente)
  → Benzema: Finalizzazione 90 → 93 (buono)

- Connection: Guardiola

STORICO MATCH COMPLETO (ultimi 50):
1. ⚠️ SIMILE vs Real Madrid - Sconfitta - Formazione: 4-3-3 - Stile: Quick Counter
2. ⚠️ SIMILE vs Barcellona - Vittoria - Formazione: 4-3-3 - Stile: Quick Counter
...

⚠️ ANALISI CRITICA: MATCH CONTRO FORMAZIONI SIMILI:
- Match trovati con formazione simile: 5
- Vittorie: 2 | Sconfitte: 3 | Pareggi: 0
- Win Rate: 40%

🚨 PROBLEMA IDENTIFICATO: Il cliente ha più sconfitte che vittorie contro formazioni simili!

📊 PERFORMANCE GIOCATORI CONTRO FORMAZIONI SIMILI:
🚨 GIOCATORI CHE SOFFRONO (rating < 6.0):
- Benzema: Rating medio 5.5 in 3 match (min: 5.0, max: 6.0)
  Stats: Velocità 75, Finalizzazione 90, Competenza Intermedio (P)
  → Motivo: Velocità 75 insufficiente per contropiede veloce richiesto (avversario Quick Counter richiede Velocità > 85)
  → Considera sostituzione o cambio ruolo per questo match

✅ GIOCATORI CHE PERFORMANO BENE (rating >= 7.0):
- Messi: Rating medio 8.2 in 3 match
  Stats: Velocità 90, Finalizzazione 95, Competenza Alta (P)
  → Motivo: Velocità 90 + Finalizzazione 95 = perfetto per contropiede
  → Mantieni in formazione, sono efficaci contro questo tipo di avversario

🎯 ABITUDINI TATTICHE CLIENTE:
Formazioni Preferite (più usate):
- 4-3-3: 10 match | Win Rate: 60% (6W/4L/0D)
- 4-2-3-1: 5 match | Win Rate: 40% (2W/3L/0D)

⚠️ CONTROMISURE SPECIFICHE PER FORMAZIONE META:
- Contro 4-3-3: Usa 3-5-2 o 4-4-2 Diamond per dominare centrocampo
- Contro Quick Counter: Linea difensiva BASSA per eliminare spazio dietro

[... resto istruzioni esistenti ...]
```

---

## ✅ CHECKLIST IMPLEMENTAZIONE

### Funzioni da Implementare:

- [ ] `getMemoriaAttila()` - Legge file memoria Attila
- [ ] `getStyleCompatibility(style, position)` - Verifica compatibilità stile con ruolo
- [ ] `getInstructionRequirements(instruction)` - Restituisce requisiti istruzione
- [ ] `checkInstructionCompatibility(playerStats, requirements)` - Verifica compatibilità
- [ ] `getStyleImpact(style, level)` - Restituisce impatto stile coach
- [ ] `calculateSynergies(titolari)` - Calcola sinergie tra giocatori
- [ ] `analyzeWhyStruggling(playerStats, opponentFormation)` - Analizza perché giocatore soffre

### Query DB da Aggiungere:

- [ ] Recuperare nome stile da `playing_style_id` (tabella `playing_styles`)
- [ ] Recuperare sinergie/Connection tra giocatori (se disponibile in DB)

### Modifiche File:

- [ ] `lib/countermeasuresHelper.js` - Aggiungere tutte le sezioni
- [ ] `app/api/generate-countermeasures/route.js` - Recuperare dati aggiuntivi da DB

---

## 📊 DIMENSIONE PROMPT STIMATA

**Attuale**: ~10-15K caratteri  
**Dopo Modifiche**: ~30-40K caratteri (con documentazione Attila ~23K)

**Limite OpenAI**: 128K token (~500K caratteri)  
**Stato**: ✅ Ben dentro il limite

---

## ⚠️ ACCORTEZZE

1. **Performance**: Prompt più lungo = risposta leggermente più lenta (~1-2 secondi)
2. **Costi**: +$0.01-0.02 per richiesta (accettabile)
3. **Validazione**: Verificare che tutti i dati siano disponibili prima di includerli
4. **Fallback**: Se dato mancante, continuare senza (non bloccare)
5. **Cache**: Cache documentazione Attila (leggi una volta, riusa)

---

## 🎯 PRIORITÀ IMPLEMENTAZIONE

1. ⭐⭐⭐ Documentazione Attila
2. ⭐⭐⭐ Statistiche Dettagliate
3. ⭐⭐⭐ Istruzioni Individuali Dettagliate
4. ⭐⭐ Competenze Posizione
5. ⭐⭐ Stili di Gioco Individuali
6. ⭐⭐ Coach Boosters Dettagliati
7. ⭐⭐ Competenze Stili Coach Dettagliate
8. ⭐⭐ Performance con Analisi Perché
9. ⭐ Sinergie

---

**Ultimo Aggiornamento**: 24 Gennaio 2026  
**Stato**: 📝 **SPECIFICA COMPLETA - Pronta per Implementazione**
