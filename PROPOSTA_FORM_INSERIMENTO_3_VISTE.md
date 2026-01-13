# Proposta: Form Inserimento Manuale con 3 Viste Editabili

## 🎯 Obiettivo
Trasformare il form di inserimento manuale in un sistema con **3 viste editabili** (come le foto eFootball), dove ogni vista corrisponde a una schermata del gioco.

---

## 📸 Analisi Dettagliata delle 3 Foto

### Foto 1: Vista "Sviluppo"
**Layout**:
- **Sinistra**: Player Card + Statistiche Partite
- **Centro**: 
  - Nome giocatore (grande, giallo)
  - "Sviluppo"
  - Rating •98 DC (cerchio verde)
  - Loghi (bandiera, club, lega)
  - Tabella attributi: Altezza, Peso, Età, Valutazione, Piede, Livello, Punti progresso
  - **Abilità giocatore** (9 skills elencate)
  - **Abilità aggiuntive** (vuota, editabile)
  - **Competenza posizione aggiuntiva** (vuota, editabile)
- **Destra**:
  - Toggle "Vedi effetto Booster max" (L1/R1)
  - Radar Chart (6 assi: TIR, DRI, PAS, FRZ, DIF, VEL)
  - Campo Posizione (mini campo con posizione evidenziata)
  - **Stili di gioco IA** (2 playstyles: Esperto palle lunghe, Tiratore)

**Bottom Bar**: Indietro, Opzioni giocatore, Cambia visuale

---

### Foto 2: Vista "Booster"
**Layout**:
- **Stessa struttura Foto 1**
- **Aggiunta Centro-Basso**: Sezione "Booster" evidenziata
  - Icona eFootball
  - "Difesa"
  - "Effetto: +2"
  - Dettagli: "+2 alle Statistiche giocatore Comportamento difensivo, Contrasto, Accelerazione e Salto"
  - "Condizione di attivazione: Questo Booster è sempre attivo."
  - Link: "Per saperne di più, vai su [Opzioni giocatore] > [Dettagli Booster]"

**Bottom Bar**: Stessa struttura

---

### Foto 3: Vista "Statistiche"
**Layout**:
- **Stessa struttura Foto 1**
- **Aggiunta Centro**: 3 Colonne Statistiche
  - **Attacco** (10 stat):
    - Comportamento offensivo: 65
    - Controllo palla: 78
    - Dribbling: 70
    - Possesso stretto: 77
    - Passaggio rasoterra: 86
    - Passaggio alto: 87
    - Finalizzazione: 69
    - Colpo di testa: 84
    - Calci da fermo: 77
    - Tiro a giro: 75
  - **Difesa** (9 stat) - con punti verdi per boost:
    - Comportamento difensivo: 92 (● verde)
    - Contrasto: 90 (● verde)
    - Aggressività: 86
    - Coinvolgimento difensivo: 85 (● verde)
    - Comportamento PT: 40
    - Presa PT: 40
    - Parata PT: 40
    - Riflessi PT: 40
    - Estensione PT: 40
  - **Forza** (7 stat) - con punti verdi per boost:
    - Velocità: 80
    - Accelerazione: 77 (● verde)
    - Potenza di tiro: 84
    - Salto: 91 (● verde)
    - Contatto fisico: 78
    - Controllo corpo: 75
    - Resistenza: 82
- **Destra**: Caratteristiche
  - Frequenza piede debole: Raramente
  - Precisione piede debole: Alta
  - Forma: Incrollabile
  - Resistenza infortuni: Alta

**Bottom Bar**: Stessa struttura

---

## 🎨 Proposta Struttura Form

### Sistema a 3 Viste Principali (come PlayerProfileView)

```jsx
<RosaManualInput>
  {/* 3 Tab Principali */}
  <Tab1: "Sviluppo">     {/* Icona: Placeholder o TrendingUp */}
  <Tab2: "Booster">      {/* Icona: Sparkles */}
  <Tab3: "Statistiche">  {/* Icona: BarChart3 */}
</RosaManualInput>
```

### Vista 1: "Sviluppo" (Tab Principale)
**Layout 3 Colonne Editabile**:

**Sinistra (Player Card + Info Carta)**:
- Player Card (visualizzazione)
- Tipo di carta (dropdown editabile)
- Tipo/Era (input editabile) - "FC Bayern München 73-74"
- Partite gioc. (input numerico)
- Gol (input numerico)
- Assist (input numerico)
- Nazionalità/Regione (input editabile)

**Centro (Dati Base + Skills)**:
- Nome giocatore (input grande)
- Posizione (dropdown)
- Rating (input + auto)
- Livello (input: current / max)
- Punti progresso (input)
- Altezza, Peso, Età (input)
- Valutazione/Condizione (dropdown)
- Piede preferito (dropdown)
- **Abilità giocatore** (checkbox multipli - 9 skills)
- **Abilità aggiuntive** (input libero + lista)
- **Competenza posizione aggiuntiva** (input)

**Destra (Playstyles + Chart)**:
- Toggle "Vedi effetto Booster max" (checkbox)
- **Stili di gioco IA** (checkbox multipli)
- **Playing Styles** (checkbox multipli)
- Radar Chart (visualizzazione - da calcolare)
- Campo Posizione (visualizzazione - da implementare)

---

### Vista 2: "Booster" (Tab Booster)
**Layout**:
- **Stessa struttura Vista Sviluppo**
- **Sezione Booster Evidenziata (Centro-Basso)**:
  - Booster 1 (dropdown + dettagli editabili)
    - Nome booster
    - Effetto (+2, input)
    - Dettagli effetti (textarea editabile)
    - Condizione attivazione (textarea editabile)
  - Booster 2 (opzionale, stesso formato)
  - Link "Dettagli Booster" (placeholder)

---

### Vista 3: "Statistiche" (Tab Statistiche)
**Layout**:
- **Stessa struttura Vista Sviluppo**
- **3 Colonne Statistiche (Centro)**:
  - **Attacco** (10 input numerici)
  - **Difesa** (9 input numerici + indicatori boost)
  - **Forza** (7 input numerici + indicatori boost)
- **Caratteristiche (Destra)**:
  - Frequenza piede debole (dropdown)
  - Precisione piede debole (dropdown)
  - Forma (dropdown)
  - Resistenza infortuni (dropdown)

---

## 🔧 Implementazione Tecnica

### Struttura Componente

```jsx
function RosaManualInput({ onBack, onRosaCreated }) {
  const [activeView, setActiveView] = useState(VIEWS.SVILUPPO)
  const [playerData, setPlayerData] = useState(initialPlayerData)
  
  return (
    <div className="rosa-manual-input">
      {/* Header con rating e nome */}
      <ManualHeader playerData={playerData} />
      
      {/* 3 Tab Principali */}
      <ViewTabs 
        activeView={activeView} 
        onViewChange={setActiveView}
      />
      
      {/* Contenuto Vista */}
      {activeView === VIEWS.SVILUPPO && (
        <SviluppoViewEdit 
          playerData={playerData}
          setPlayerData={setPlayerData}
        />
      )}
      {activeView === VIEWS.BOOSTER && (
        <BoosterViewEdit 
          playerData={playerData}
          setPlayerData={setPlayerData}
        />
      )}
      {activeView === VIEWS.STATISTICHE && (
        <StatisticheViewEdit 
          playerData={playerData}
          setPlayerData={setPlayerData}
        />
      )}
      
      {/* Bottom Bar: Indietro, Opzioni, Cambia visuale */}
      <BottomNavBar onBack={onBack} />
    </div>
  )
}
```

### Dati da Raccolgere (Completo)

**Vista Sviluppo**:
- ✅ Nome, Posizione, Rating, Livello, Punti progresso
- ✅ Altezza, Peso, Età, Valutazione, Piede
- ✅ Tipo carta, Tipo/Era, Partite, Gol, Assist
- ✅ Nazionalità, Club
- ✅ Skills (9+)
- ✅ Abilità aggiuntive (personalizzate)
- ✅ Competenza posizione aggiuntiva
- ✅ AI Playstyles
- ✅ Playing Styles

**Vista Booster**:
- ✅ Tutti i dati Vista Sviluppo
- ✅ Booster 1 (nome, effetto, dettagli, condizioni)
- ✅ Booster 2 (opzionale)

**Vista Statistiche**:
- ✅ Tutti i dati Vista Sviluppo
- ✅ 10 statistiche Attacco
- ✅ 9 statistiche Difesa
- ✅ 7 statistiche Forza
- ✅ Caratteristiche (piede debole, forma, resistenza)

---

## 🎯 Vantaggi

1. **Coerenza**: Stessa struttura delle foto eFootball
2. **Focus**: Ogni vista ha un focus specifico
3. **Completeness**: Non si perde nessun dato
4. **UX**: Navigazione intuitiva tra viste
5. **Editabilità**: Tutto editabile in ogni vista
6. **Profilazione**: Visualizzazione completa durante inserimento

---

## 📋 Checklist Completa Dati

### Dati Base (Tutte le Viste)
- [x] Nome giocatore
- [x] Posizione
- [x] Rating
- [x] Livello (current / max)
- [x] Punti progresso
- [x] Tipo carta
- [x] Tipo/Era
- [x] Partite gioc.
- [x] Gol
- [x] Assist
- [x] Nazionalità
- [x] Club
- [x] Altezza
- [x] Peso
- [x] Età
- [x] Valutazione/Condizione
- [x] Piede preferito

### Skills e Abilità (Vista Sviluppo)
- [x] Skills standard (9+)
- [x] Abilità aggiuntive (personalizzate)
- [x] Competenza posizione aggiuntiva

### Playstyles (Vista Sviluppo)
- [x] Playing Styles (Giocatore chiave, Incontrista, etc.)
- [x] AI Playstyles (Esperto palle lunghe, Tiratore, etc.)

### Booster (Vista Booster)
- [x] Booster 1 (nome, effetto, dettagli, condizioni)
- [x] Booster 2 (opzionale)

### Statistiche (Vista Statistiche)
- [x] 10 statistiche Attacco
- [x] 9 statistiche Difesa
- [x] 7 statistiche Forza
- [x] Indicatori boost (punti verdi)

### Caratteristiche (Vista Statistiche)
- [x] Frequenza piede debole
- [x] Precisione piede debole
- [x] Forma
- [x] Resistenza infortuni

### Team Playstyle (Tutte le Viste - opzionale)
- [x] Competenza per ogni stile (0-99)

---

## ✅ Ho Capito?

**Struttura proposta**:
1. **3 Tab Principali** (Sviluppo, Booster, Statistiche) - icona Placeholder per Sviluppo
2. **Ogni vista mostra layout 3 colonne** (come foto)
3. **Tutto editabile** in ogni vista
4. **Nessun dato perso** - tutti i campi dalle foto inclusi
5. **Coerenza** con sistema visualizzazione profilo

**Aspetto conferma prima di implementare!**
