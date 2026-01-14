# 🎯 Piano Dashboard AI-Centric - Focus Implementation

**Data**: 2025-01-12  
**Status**: 📋 Piano d'Azione - Priorità Alta  
**Approccio**: PM Full Stack - Focus su valore utente e AI

---

## 🔍 ANALISI GAP

### **Cosa c'è OGGI**:
- ✅ DashboardPage basic (RosaStatusPanel + action cards)
- ✅ UserInfoPanel (ma non allineato al concept)
- ✅ MatchCenterPanel (esiste ma non integrato)
- ✅ PlayerCard (basic, funziona)
- ✅ RosaViewer (funziona)

### **Cosa MANCA rispetto al concept immagine**:
1. ❌ **Layout 3-colonne completo** (Left/Center/Right con specifici componenti)
2. ❌ **User Profile completo** con rating/level/tier/division (come nell'immagine)
3. ❌ **Player Cards in left panel** (Messi 97, Rondalla 94, Paulo 91)
4. ❌ **Tactical Stats panel** (Possession Game, Counter Attack, etc.)
5. ❌ **Tactical Goals panel** (Open Tactical Goals con obiettivi)
6. ❌ **AI Brain centrale** con circuit lines (elemento visuale chiave)
7. ❌ **Mahcio Insights panel** (AI insights strutturati)
8. ❌ **Memory Insights panel** (insights da storico)
9. ❌ **Quick Links navigation** strutturata
10. ❌ **Start Session button** prominente
11. ❌ **Design futuristico** (neon purple/blue, dark theme)

---

## 🎯 FOCUS: PRIORITÀ IMPLEMENTAZIONE

### **FASE 1: Foundation - Layout & Structure** (Priorità ALTA)
**Obiettivo**: Creare la struttura base della dashboard come nell'immagine

#### 1.1 Ristrutturare DashboardPage.jsx
```
Layout 3 colonne:
├── Left Column
│   ├── Player Profiles Section (top)
│   ├── Tactical Stats Section (middle)
│   └── Tactical Goals Section (bottom)
│
├── Center/Top Column
│   └── User Profile Complete (con rating, level, tier, division)
│
└── Right Column
    ├── Mahcio Insights (top)
    ├── Quick Links (middle)
    └── Memory Insights + Start Session (bottom)
```

**File da modificare/creare**:
- `components/pages/DashboardPage.jsx` - Ristrutturare completamente
- `components/pages/DashboardPage.css` - Nuovo design futuristico
- `components/dashboard/DashboardLeftPanel.jsx` - NUOVO
- `components/dashboard/DashboardRightPanel.jsx` - NUOVO
- `components/dashboard/UserProfileComplete.jsx` - NUOVO (sostituisce UserInfoPanel)

#### 1.2 Componente AI Brain Centrale
- `components/dashboard/AIBrainVisual.jsx` - Brain con circuit lines
- SVG/Canvas per animazione circuit lines che connettono i panel

---

### **FASE 2: Left Panel Components** (Priorità ALTA)

#### 2.1 Player Profiles Section
**Componente**: `components/dashboard/PlayerProfilesSection.jsx`
- Lista player cards compatte (come nell'immagine: Messi 97, Rondalla 94, Paulo 91)
- Rating prominente, flag nazionalità, nome, club
- Click per aprire profilo completo

**Data source**: `useRosa()` hook - già disponibile

#### 2.2 Tactical Stats Section
**Componente**: `components/dashboard/TacticalStatsSection.jsx`
- "Squads Overview" con count (es. "154")
- Progress bars per:
  - Overall Team Pressing Goal (42%)
  - Possession Game (82%)
  - Counter Attack (61%)
  - Quick Build-Up (84%)
- Due sezioni: "Squads Overview" (doppia come nell'immagine)

**Data source**: Da calcolare da rosa + stats partite (placeholder per ora)

#### 2.3 Tactical Goals Section
**Componente**: `components/dashboard/TacticalGoalsSection.jsx`
- "Open Tactical Goals" con numero (es. "67886 06")
- Lista goals con:
  - Nome goal (es. "Improve Pressing High")
  - Descrizione
  - Icona

**Data source**: Da coaching_suggestions table o mock per ora

---

### **FASE 3: Center Panel - User Profile** (Priorità ALTA)

#### 3.1 UserProfileComplete Component
**Componente**: `components/dashboard/UserProfileComplete.jsx`

**Contenuto**:
- Immagine profilo (player card style)
- Rating utente (es. 93)
- **USERNAME**: AlexUnited92
- **REGIST BY**: Level 5
- **MASTES TERIGE LEIVE**: High (Master Tier League)
- **MIASTES RECEGGIE EVE**: Master Legision 2
- **DESTET OS**: AI Knowledge High

**Data source**: 
- Da Supabase `client_profiles` table (da creare o usare auth.users)
- Mock per ora, poi integrare

**File da modificare**:
- Sostituire `UserInfoPanel.jsx` o integrare in nuovo componente

---

### **FASE 4: Right Panel Components** (Priorità MEDIA-ALTA)

#### 4.1 Mahcio Insights Section
**Componente**: `components/dashboard/MahcioInsightsSection.jsx`

**Contenuto**:
- Titolo "Mahcio Insights"
- Lista insights con icona e arrow:
  - "Struggles coaching press"
  - "Reluctant to change formation"
  - "Prefers quick, actionable tips"

**Data source**: 
- Da AI analysis (GPT o edge function)
- Mock per ora, poi integrare con `analyze-rosa` edge function

#### 4.2 Quick Links Section
**Componente**: `components/dashboard/QuickLinksSection.jsx`

**Contenuto**:
- Menu navigation con icone e arrow:
  - Home
  - Users
  - Players
  - Squad Builder
  - Data & Analytics
  - Memory Hub
  - Coaching

**File da modificare**:
- Usa `SidebarNavigation.jsx` esistente o crea variante per dashboard

#### 4.3 Memory Insights + Start Session
**Componente**: `components/dashboard/MemoryInsightsSection.jsx`

**Contenuto**:
- Lista insights (simile a Mahcio):
  - "Struggles against high press"
  - "Reluctant to change formation"
  - "Prefers quick, actionable tips"
- Input numerico (es. "0")
- Button "Start Session" (prominente, purple)

**Data source**: 
- Da `client_profiles` table (match_history, patterns)
- Mock per ora

---

### **FASE 5: Design System Futuristic** (Priorità MEDIA)

#### 5.1 CSS Theme Variables
**File**: `components/pages/DashboardPage.css`

**Colori**:
- Background: Dark (#0a0a0a o simile)
- Neon Purple: #a855f7 / #9333ea
- Neon Blue: #3b82f6 / #2563eb
- Neon Pink: #ec4899
- Text: White/Gray scale

**Effetti**:
- Glow effects su elementi AI
- Circuit lines animation
- Gradient overlays
- Glass morphism per panels

#### 5.2 Typography
- Font moderno (Inter, Space Grotesk, o simile)
- All caps per labels importanti
- Font sizes gerarchici

---

## 📁 FILE STRUCTURE DA CREARE

```
components/
├── dashboard/
│   ├── DashboardPage.jsx              [MODIFICARE] - Layout principale
│   ├── DashboardPage.css              [MODIFICARE] - Design futuristico
│   ├── DashboardLeftPanel.jsx         [NUOVO]
│   ├── DashboardRightPanel.jsx        [NUOVO]
│   ├── UserProfileComplete.jsx        [NUOVO]
│   ├── PlayerProfilesSection.jsx      [NUOVO]
│   ├── TacticalStatsSection.jsx       [NUOVO]
│   ├── TacticalGoalsSection.jsx       [NUOVO]
│   ├── MahcioInsightsSection.jsx      [NUOVO]
│   ├── QuickLinksSection.jsx          [NUOVO]
│   ├── MemoryInsightsSection.jsx      [NUOVO]
│   └── AIBrainVisual.jsx              [NUOVO] - SVG/Canvas brain
```

---

## 🚀 ROADMAP ESECUZIONE

### **Sprint 1: Foundation (2-3 giorni)**
1. ✅ Ristrutturare DashboardPage.jsx con layout 3 colonne
2. ✅ Creare DashboardLeftPanel.jsx (placeholder)
3. ✅ Creare DashboardRightPanel.jsx (placeholder)
4. ✅ Creare UserProfileComplete.jsx (con mock data)
5. ✅ CSS base per layout

### **Sprint 2: Left Panel (2 giorni)**
1. ✅ PlayerProfilesSection.jsx (usa PlayerCard esistente)
2. ✅ TacticalStatsSection.jsx (con mock data)
3. ✅ TacticalGoalsSection.jsx (con mock data)

### **Sprint 3: Right Panel (2 giorni)**
1. ✅ MahcioInsightsSection.jsx (con mock data)
2. ✅ QuickLinksSection.jsx (usa navigation esistente)
3. ✅ MemoryInsightsSection.jsx + Start Session button

### **Sprint 4: AI Brain & Polish (1-2 giorni)**
1. ✅ AIBrainVisual.jsx (SVG brain + circuit lines)
2. ✅ Animazioni CSS
3. ✅ Responsive design
4. ✅ Integration testing

---

## 💡 DECISIONI TECNICHE

### **State Management**
- Usa `RosaContext` esistente per player data
- Crea `DashboardContext` per:
  - User profile data
  - Tactical stats
  - AI insights
  - Memory insights

### **Data Fetching**
- Inizialmente: Mock data in componenti
- Poi: Integrare con Supabase:
  - `client_profiles` table (user profile)
  - `coaching_suggestions` table (insights)
  - `user_rosa` + calcoli per tactical stats

### **Performance**
- Lazy load right panel components
- Memoize calculations per tactical stats
- SVG brain: ottimizzato per performance

---

## ✅ CRITERI DI ACCETTAZIONE

1. ✅ Layout 3 colonne funziona come nell'immagine
2. ✅ User Profile mostra tutti i campi richiesti
3. ✅ Player cards visualizzabili in left panel
4. ✅ Tactical stats con progress bars
5. ✅ AI Insights panels funzionanti
6. ✅ Start Session button presente
7. ✅ Design futuristico implementato
8. ✅ Responsive su desktop (mobile in fase 2)

---

**Status**: 🟡 **READY TO START** - Sprint 1 può iniziare immediatamente
