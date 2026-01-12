# Analisi Regole eFootball - Sistema Suggerimenti

## 📋 Obiettivo

Analisi delle regole ufficiali di eFootball per identificare tutte le variabili, microvariabili, sinergie e collegamenti necessari per il sistema di suggerimenti intelligente.

---

## 🔑 Concetti Chiave Identificati

### 1. **Forza Complessiva della Squadra**

La **Forza Complessiva** è più importante della **Forza Base** perché tiene conto di:

- ✅ **Alchimia di squadra** (sinergie tra giocatori)
- ✅ **Competenza nella posizione** (Basso/Intermedio/Alto)
- ✅ **Stile di gioco** (compatibilità playing style)

**Implicazione per il sistema:**
- Il sistema deve calcolare la forza complessiva, non solo la somma delle abilità
- Deve considerare sinergie tra giocatori
- Deve verificare competenze posizione
- Deve valutare compatibilità playing style

---

## 🎯 2. Stile di Gioco di Squadra e Allenatore

### Stili Disponibili (5 principali):
1. **Possesso palla**
2. **Contropiede veloce**
3. **Contrattacco**
4. **Passaggio lungo**
5. **Vie laterali**

### Stili Tattici Avanzati:
- **Offensivi**: Possesso palla, Contropiede rapido, Attacco diretto, Cross e finalizzazione, Gioco sulle fasce, Attacco centrale
- **Difensivi**: Pressing alto, Difesa bassa, Pressing selettivo, Contenimento difensivo
- **Costruzione**: Posizionale, Lancio lungo, Costruzione a triangoli
- **Speciali**: Gegenpressing, Tiki-Taka, Catenaccio, Pressing costante, Attacco con esterni alti, Tagli interni

### **REGOLA FONDAMENTALE:**
> **L'attitudine dell'allenatore influisce direttamente sulla competenza dello stile di gioco dei giocatori.**

**Implicazione per il sistema:**
- L'allenatore è **critico** per i suggerimenti
- Deve esserci una tabella di compatibilità allenatore → stile di gioco
- Ogni allenatore ha un livello di competenza per ogni stile
- Questo influenza direttamente le prestazioni dei giocatori

---

## 👥 3. Stili di Gioco dei Giocatori (Playing Style)

Gli stili di gioco definiscono il comportamento del giocatore **senza palla**. Ogni stile ha **posizioni compatibili** specifiche.

### Attaccanti e Centrocampisti Offensivi:
- **Opportunista** → Pos: P
- **Senza palla** → Pos: P/SP/TRQ
- **Rapace d'area** → Pos: P
- **Fulcro di gioco** → Pos: P
- **Specialista di cross** → Pos: EDA/ESA/CLD/CLS
- **Classico n° 10** → Pos: SP/TRQ
- **Regista creativo** → Pos: SP/EDA/ESA/TRQ/CLD/CLS
- **Ala prolifica** → Pos: EDA/ESA
- **Taglio al centro** → Pos: EDA/ESA
- **Giocatore chiave** → Pos: SP/TRQ/CLD/CLS/CC

### Centrocampisti e Difensori:
- **Tra le linee** → Pos: CC/MED
- **Sviluppo** → Pos: DC
- **Frontale extra** → Pos: DC
- **Incontrista** → Pos: CC/MED/DC
- **Onnipresente** → Pos: CLD/CLS/CC/MED
- **Collante** → Pos: MED

### Terzini e Portieri:
- **Terzino offensivo** → Pos: TD/TS
- **Terzino difensivo** → Pos: TD/TS
- **Terzino mattatore** → Pos: TD/TS
- **Portiere offensivo** → Pos: PT
- **Portiere difensivo** → Pos: PT

**Implicazione per il sistema:**
- Deve verificare compatibilità playing style ↔ posizione
- Un giocatore con playing style incompatibile con la posizione **non attiva lo stile**
- Deve suggerire posizioni compatibili o cambiare playing style

---

## 🎮 4. Stili di Gioco IA

Determinano il comportamento dei giocatori **in possesso di palla** (gestiti dall'IA):
- Funambolo
- Serpentina
- Treno in corsa
- Inserimento
- Esperto palle lunghe
- Crossatore
- Tiratore

**Implicazione per il sistema:**
- Questi influenzano il comportamento in fase offensiva
- Potrebbero essere considerati per suggerimenti tattici

---

## 📍 5. Competenza Posizione

### Livelli di Competenza:
- **Basso** (nessun colore)
- **Intermedio** (verde sfumato)
- **Alto** (verde brillante)

### Regole:
- Ogni giocatore può avere **massimo 2 slot** per competenze posizione aggiuntive
- Se la competenza è bassa o intermedia, può essere aumentata di 1 livello
- Se la competenza è già alta, non può essere migliorata ulteriormente
- Le competenze posizione possono essere sovrascritte
- I portieri con competenza bassa in posizioni da campo non possono apprendere nuove competenze in tali posizioni (e viceversa)

**Implicazione per il sistema:**
- Deve tracciare competenza posizione per ogni giocatore
- Deve considerare competenza posizione nel calcolo forza complessiva
- Deve suggerire posizioni con competenza alta/intermedia

---

## 🔗 6. Alchimia di Squadra (Sinergie)

La **Forza Complessiva** tiene conto dell'**alchimia di squadra**. 

**Cosa potrebbe includere l'alchimia:**
- Compatibilità playing style tra giocatori adiacenti
- Collegamenti tra giocatori (stessa nazionalità, club, era)
- Compatibilità moduli/formazioni
- Bilanciamento squadra (attacco/difesa/centrocampo)

**Implicazione per il sistema:**
- Serve una tabella/calcolo per sinergie tra giocatori
- Deve considerare collegamenti (nazionalità, club, era)
- Deve suggerire giocatori che migliorano l'alchimia

---

## 📊 7. Moduli Tattici Disponibili

### Moduli con 4 Difensori:
- 4-3-3, 4-2-3-1, 4-4-2, 4-1-2-3, 4-5-1, 4-4-1-1, 4-2-2-2

### Moduli con 3 Difensori:
- 3-5-2, 3-4-3, 3-1-4-2, 3-4-1-2

### Moduli con 5 Difensori:
- 5-3-2, 5-4-1, 5-2-3

**Implicazione per il sistema:**
- Deve suggerire moduli compatibili con lo stile di gioco scelto
- Deve verificare limitazioni posizione (es. max 2 P, max 1 CLD/CLS, etc.)

---

## 🎯 8. Limitazioni Posizione

### Limitazioni per ruolo:
- **Attacco**: 1-5 giocatori (max 2 P e 1 EDA/ESA)
- **Centrocampo**: 1-6 giocatori (max 1 CLD/CLS)
- **Difesa**: 2-5 giocatori (max 3 DC e 1 TD/TS)
- **Portiere**: Non modificabile

**Implicazione per il sistema:**
- Deve verificare limitazioni quando suggerisce formazioni
- Deve rispettare regole del gioco

---

## ⭐ 9. Valore Giocatore (VG)

Il VG rappresenta una valutazione delle capacità di un giocatore (fino a 5★):
- **Trending**: Valutati in base alle statistiche iniziali
- **Altri tipi**: Valutati in base a statistiche + potenziale di crescita

**Implicazione per il sistema:**
- VG potrebbe essere usato per ranking giocatori
- Potenziale di crescita importante per sviluppo squadra

---

## 📋 10. Variabili e Microvariabili per Suggerimenti

### Variabili Principali (Macro):
1. **Stile di gioco di squadra** (5 stili principali)
2. **Allenatore** (influenza competenza stile)
3. **Modulo tattico** (formazione)
4. **Alchimia di squadra** (sinergie)

### Microvariabili (Dettaglio):
1. **Playing style giocatore** (compatibilità con posizione)
2. **Competenza posizione** (Basso/Intermedio/Alto)
3. **Collegamenti giocatori** (nazionalità, club, era)
4. **Stats giocatore** (attacco/difesa/fisico)
5. **Abilità speciali** (skills, COM skills)
6. **Build giocatore** (livello, dev points, booster)
7. **Tipo carta** (Trending/In evidenza/Epico/Leggendario/Standard)
8. **VG** (valore giocatore)

---

## 🔄 11. Flusso di Calcolo Suggerimenti

### Step 1: Analisi Input Cliente
- Rosa corrente
- Allenatore selezionato
- Stile di gioco preferito
- Modulo tattico corrente

### Step 2: Calcolo Forza Complessiva Corrente
```
Forza Complessiva = 
  Forza Base (somma stats) +
  Bonus Alchimia (sinergie giocatori) +
  Bonus Competenza Posizione +
  Bonus Compatibilità Playing Style +
  Bonus Allenatore (competenza stile)
```

### Step 3: Identificazione Debolezze
- Giocatori con competenza posizione bassa
- Playing style incompatibili
- Mancanza sinergie
- Squilibri formazione

### Step 4: Generazione Suggerimenti
- Giocatori alternativi compatibili
- Cambio posizioni
- Cambio playing style
- Cambio modulo
- Cambio allenatore
- Miglioramenti build

### Step 5: Ranking Suggerimenti
- Priorità basata su impatto forza complessiva
- Considera costo/beneficio
- Considera preferenze cliente

---

## 🗄️ 12. Struttura Database Necessaria

### Tabelle Esistenti (verificare completezza):
- ✅ `players_base` (giocatori base)
- ✅ `player_builds` (build giocatori)
- ✅ `user_rosa` (rose utenti)
- ⚠️ `managers` / `coaches` (ALLENATORI - da creare/verificare)
- ⚠️ `playing_styles` (playing style giocatori - da creare)
- ⚠️ `team_playing_styles` (stili di gioco squadra - da creare)
- ⚠️ `position_competency` (competenza posizione - da verificare)
- ⚠️ `player_links` / `synergies` (collegamenti/sinergie - da creare)
- ⚠️ `manager_style_competency` (competenza allenatore per stile - da creare)

### Campi Necessari per Giocatori:
- `playing_style` (stile di gioco giocatore)
- `position_competency` (JSON: {position: level})
- `nationality` (per collegamenti)
- `club_name` (per collegamenti)
- `era` (per collegamenti)

### Campi Necessari per Allenatori:
- `name`
- `team_playing_styles` (JSON: {style: competency_level})
- `preferred_formation`
- `style_competency` (competenza per ogni stile)

### Tabelle Nuove Necessarie:

#### `managers`
```sql
- id (uuid)
- name (text)
- team_playing_styles (jsonb) -- {style: competency}
- preferred_formation (text)
- created_at, updated_at
```

#### `playing_styles`
```sql
- id (uuid)
- name (text) -- "Opportunista", "Senza palla", etc.
- compatible_positions (text[]) -- ["P"], ["P", "SP", "TRQ"], etc.
- description (text)
```

#### `team_playing_styles`
```sql
- id (uuid)
- name (text) -- "Possesso palla", "Contropiede veloce", etc.
- category (text) -- "offensive", "defensive", "build-up", "special"
- description (text)
```

#### `player_links` / `synergies`
```sql
- id (uuid)
- player_1_id (uuid)
- player_2_id (uuid)
- link_type (text) -- "nationality", "club", "era"
- synergy_bonus (numeric) -- bonus forza
```

#### `manager_style_competency`
```sql
- manager_id (uuid)
- team_playing_style_id (uuid)
- competency_level (integer) -- 1-100
```

---

## 🎯 13. Priorità Implementazione

### Fase 1: Fondamentali (CRITICO)
1. ✅ Database giocatori (già presente)
2. ⚠️ Database allenatori (da creare/completare)
3. ⚠️ Tabelle playing style (da creare)
4. ⚠️ Tabelle stili squadra (da creare)
5. ⚠️ Compatibilità allenatore → stile (da creare)

### Fase 2: Sinergie
1. ⚠️ Sistema collegamenti giocatori (nazionalità/club/era)
2. ⚠️ Calcolo alchimia squadra
3. ⚠️ Competenza posizione

### Fase 3: Suggerimenti Intelligenti
1. ⚠️ Algoritmo calcolo forza complessiva
2. ⚠️ Identificazione debolezze
3. ⚠️ Generazione suggerimenti
4. ⚠️ Ranking suggerimenti

---

## 📝 14. Note Importanti

1. **L'allenatore è fondamentale** - influenza direttamente la competenza dello stile di gioco
2. **Playing style deve essere compatibile con posizione** - altrimenti non si attiva
3. **Alchimia di squadra** - sinergie migliorano forza complessiva
4. **Competenza posizione** - giocatori con competenza alta rendono di più
5. **Forza complessiva > Forza base** - il sistema deve calcolare entrambe

---

## ✅ Prossimi Passi

1. Verificare/correggere struttura database esistente
2. Creare tabelle mancanti (allenatori, playing styles, sinergie)
3. Implementare calcolo forza complessiva
4. Implementare sistema suggerimenti base
5. Migliorare con machine learning (fase successiva)
