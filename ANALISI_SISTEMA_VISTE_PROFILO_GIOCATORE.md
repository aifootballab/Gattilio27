# Analisi Sistema Viste Profilo Giocatore - Focus e Profilazione

## 🎯 Obiettivo
Implementare un sistema di visualizzazione del profilo giocatore con **3 viste diverse** (come nelle foto eFootball) per migliorare:
- **Focus**: Ogni vista mostra informazioni specifiche
- **Profilazione**: Visualizzazione completa e organizzata del giocatore
- **UX**: Navigazione intuitiva tra le viste

---

## 📸 Le 3 Viste dalle Foto

### Vista 1: "Sviluppo" / Vista Principale
**Focus**: Overview completo del giocatore

**Layout**:
- **Sinistra**: Player Card (rating, nome, tipo carta, partite/gol/assist)
- **Centro**: 
  - Informazioni base (nome, rating, livello, punti progresso)
  - Dati fisici (altezza, peso, età, valutazione, piede)
  - Skills (9 skills elencate)
- **Destra**: 
  - AI Playstyles
  - Radar chart
  - Campo con posizione

**Quando usare**: Vista principale per overview rapido

---

### Vista 2: "Booster" / Vista Booster
**Focus**: Booster attivi e loro effetti

**Layout**:
- Stessa struttura Vista 1
- **Aggiunta centrale**: Sezione Booster dettagliata
  - Nome booster
  - Effetto (+2)
  - Dettagli effetti (quali stat aumentano)
  - Condizione di attivazione
- **Controllo**: Toggle "Vedi effetto Booster max" (L1/R1)

**Quando usare**: Quando si vuole vedere/modificare i booster

---

### Vista 3: "Statistiche" / Vista Dettagliata
**Focus**: Tutte le statistiche numeriche complete

**Layout**:
- Stessa struttura Vista 1
- **Aggiunta centrale**: Statistiche complete divise in 3 colonne
  - **Attacco** (10 stat)
  - **Difesa** (9 stat) - con punti verdi per boost
  - **Forza** (7 stat) - con punti verdi per boost
- **Destra**: Caratteristiche (piede debole, forma, resistenza infortuni)

**Quando usare**: Quando si vogliono vedere/modificare tutte le statistiche

---

## 🎨 Proposta Implementazione

### Componente: `PlayerProfileView.jsx`

Un componente che gestisce le 3 viste con navigazione:

```jsx
<PlayerProfileView player={playerData}>
  {/* Vista 1: Sviluppo */}
  {/* Vista 2: Booster */}
  {/* Vista 3: Statistiche */}
</PlayerProfileView>
```

### Navigazione tra Viste

**Opzioni**:
1. **Tab Navigation** (come nel form inserimento)
2. **Button Navigation** (L1/R1 come nel gioco)
3. **Swipe Navigation** (mobile-friendly)

**Raccomandazione**: Tab Navigation + Keyboard shortcuts (L1/R1)

---

## 📋 Struttura Componente

### PlayerProfileView.jsx
```jsx
const VIEWS = {
  SVILUPPO: 'sviluppo',    // Vista 1
  BOOSTER: 'booster',      // Vista 2
  STATISTICHE: 'statistiche' // Vista 3
}

function PlayerProfileView({ player, onEdit, mode = 'view' }) {
  const [activeView, setActiveView] = useState(VIEWS.SVILUPPO)
  
  return (
    <div className="player-profile-view">
      {/* Header con navigazione */}
      <ViewNavigation 
        activeView={activeView} 
        onViewChange={setActiveView}
      />
      
      {/* Contenuto vista */}
      {activeView === VIEWS.SVILUPPO && <SviluppoView player={player} />}
      {activeView === VIEWS.BOOSTER && <BoosterView player={player} />}
      {activeView === VIEWS.STATISTICHE && <StatisticheView player={player} />}
    </div>
  )
}
```

---

## 🎯 Viste Dettagliate

### 1. SviluppoView
**Componenti**:
- `PlayerCard` (sinistra)
- `PlayerBaseInfo` (centro)
- `SkillsList` (centro)
- `AIPlaystylesList` (destra)
- `RadarChart` (destra)
- `PositionField` (destra)

### 2. BoosterView
**Componenti**:
- Tutti i componenti di SviluppoView
- `BoosterSection` (centro, evidenziato)
  - Booster name
  - Effetto
  - Dettagli effetti
  - Condizione attivazione
- `BoosterToggle` (toggle max effect)

### 3. StatisticheView
**Componenti**:
- Tutti i componenti di SviluppoView
- `StatsGrid` (centro, 3 colonne)
  - Attacco (10 stat)
  - Difesa (9 stat) - con indicatori boost
  - Forza (7 stat) - con indicatori boost
- `CharacteristicsPanel` (destra)

---

## 🔄 Integrazione con Form Inserimento

### Opzione 1: Modalità "View" e "Edit"
- **View Mode**: Solo visualizzazione (3 viste)
- **Edit Mode**: Form inserimento (tab come ora)

### Opzione 2: Viste Separate
- **Form Inserimento**: Rimane come ora (tab per inserimento)
- **Visualizzazione Profilo**: Nuovo componente con 3 viste

**Raccomandazione**: Opzione 2 - Separare inserimento da visualizzazione

---

## 📊 Dati Necessari per Ogni Vista

### Vista Sviluppo
- Dati base (nome, rating, posizione, livello)
- Skills
- AI Playstyles
- Playing Styles
- Dati fisici (altezza, peso, età)

### Vista Booster
- Tutti i dati Vista Sviluppo
- Booster 1 (nome, effetti, condizioni)
- Booster 2 (se presente)
- Statistiche con boost applicato

### Vista Statistiche
- Tutti i dati Vista Sviluppo
- Statistiche Attacco (10)
- Statistiche Difesa (9) + indicatori boost
- Statistiche Forza (7) + indicatori boost
- Caratteristiche (piede debole, forma, resistenza)

---

## 🎨 Design e UX

### Layout Responsive
- **Desktop**: 3 colonne (card | info | stats/chart)
- **Tablet**: 2 colonne
- **Mobile**: 1 colonna (stack)

### Navigazione
- **Tab bar** in alto con icone
- **Keyboard shortcuts**: L1/R1 per navigare
- **Breadcrumb**: Mostra vista corrente

### Visual Feedback
- **Transizioni** tra viste
- **Highlight** sezione attiva
- **Indicatori boost** (punti verdi) nelle statistiche

---

## 🚀 Implementazione Step-by-Step

### Step 1: Creare Componente Base
- `PlayerProfileView.jsx` con navigazione base
- 3 viste vuote

### Step 2: Implementare Vista Sviluppo
- PlayerCard
- Info base
- Skills list
- AI Playstyles

### Step 3: Implementare Vista Booster
- Aggiungere sezione booster
- Mostrare effetti
- Toggle max effect

### Step 4: Implementare Vista Statistiche
- Grid statistiche 3 colonne
- Indicatori boost
- Caratteristiche

### Step 5: Integrazione
- Collegare con dati giocatore
- Aggiungere a RosaViewer o componente dedicato

---

## ✅ Benefici

1. **Focus**: Ogni vista mostra informazioni specifiche
2. **Profilazione**: Visualizzazione completa e organizzata
3. **UX**: Navigazione intuitiva come nel gioco
4. **Coerenza**: Allineato con le foto eFootball
5. **Scalabilità**: Facile aggiungere nuove viste

---

## 📝 Note

- Le viste devono essere **read-only** per visualizzazione
- Per modifica, usare il form inserimento esistente
- Le viste possono essere usate anche per **preview** durante inserimento
