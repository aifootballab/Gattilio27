# 📁 Struttura Progetto eFootball AI Coach

## 🎯 Approccio: Frontend-First

**Strategia**: Sviluppiamo prima il frontend con dati mock, poi integriamo Supabase e backend.

---

## 📂 Struttura Directory Completa

```
src/
├── components/           # Componenti riusabili
│   ├── dashboard/        # Componenti dashboard
│   │   ├── DashboardLayout.jsx
│   │   ├── UserProfile.jsx
│   │   ├── SubscriptionBadge.jsx
│   │   └── Navigation.jsx
│   │
│   ├── rosa/            # Componenti profilazione rosa
│   │   ├── RosaProfiling.jsx      # Container principale
│   │   ├── RosaInputSelector.jsx  # Selettore modalità input
│   │   ├── RosaVoiceInput.jsx     # Input vocale
│   │   ├── RosaScreenshotInput.jsx # Input screenshot
│   │   ├── RosaPrecompilatoInput.jsx # Import da DB
│   │   ├── RosaViewer.jsx         # Visualizzazione rosa
│   │   ├── PlayerCard.jsx          # Card singolo giocatore
│   │   └── RosaAnalysis.jsx        # Analisi automatica rosa
│   │
│   ├── coaching/        # Componenti coaching
│   │   ├── CoachingPanel.jsx
│   │   ├── TacticalRecommendations.jsx
│   │   ├── PlayerAdvice.jsx
│   │   └── FormationSuggestions.jsx
│   │
│   ├── match-center/    # Componenti match center
│   │   ├── MatchCenter.jsx
│   │   ├── LiveStats.jsx
│   │   └── TacticalPitch.jsx
│   │
│   └── shared/          # Componenti condivisi
│       ├── LoadingSpinner.jsx
│       ├── ErrorBoundary.jsx
│       ├── Button.jsx
│       ├── Card.jsx
│       └── Toast.jsx
│
├── pages/               # Pagine/Route
│   ├── HomePage.jsx
│   ├── DashboardPage.jsx
│   ├── RosaPage.jsx
│   ├── CoachingPage.jsx
│   └── NotFoundPage.jsx
│
├── hooks/               # Custom React Hooks
│   ├── useRosa.js              # Gestione stato rosa
│   ├── useVoiceRecorder.js     # Registrazione audio
│   ├── useImageUpload.js       # Upload immagini
│   ├── useCoachingAnalysis.js  # Analisi coaching
│   └── useAuth.js              # Autenticazione
│
├── services/            # Servizi API
│   ├── api/
│   │   ├── rosaService.js      # API rosa (mock → Supabase)
│   │   ├── coachingService.js  # API coaching
│   │   └── storageService.js   # Upload file
│   │
│   ├── ai/
│   │   ├── visionService.js    # Vision AI (mock → OpenAI)
│   │   ├── speechService.js    # Speech-to-Text (mock → OpenAI)
│   │   └── analysisService.js  # LLM Analysis (mock → OpenAI)
│   │
│   └── game/
│       ├── efootballRules.js   # Regole eFootball
│       └── gameStateParser.js  # Parser stato gioco
│
├── utils/               # Utility functions
│   ├── contextFusion.js        # Fusion image + voice
│   ├── dataNormalization.js    # Normalizzazione dati
│   ├── formatters.js           # Formattazione dati
│   └── validators.js           # Validazione input
│
├── contexts/            # React Context
│   ├── RosaContext.jsx         # Context rosa globale
│   ├── AuthContext.jsx         # Context autenticazione
│   └── ThemeContext.jsx        # Context tema
│
├── lib/                 # Librerie/config
│   └── supabase.js      # Config Supabase (già presente)
│
├── styles/              # Stili globali
│   ├── theme.css        # Variabili CSS, colori
│   ├── components.css   # Stili componenti
│   └── animations.css   # Animazioni
│
├── App.jsx              # Root component con routing
├── App.css              # Stili App
├── main.jsx             # Entry point
└── index.css            # Reset CSS globale
```

---

## 🚀 Fasi di Implementazione

### Fase 1: Foundation (Ora)
- ✅ Struttura directory
- ✅ Routing base
- ✅ Componenti base Dashboard
- ✅ Context per Rosa

### Fase 2: Rosa Profiling (Prossimo)
- Input multimodale (voce, screenshot, precompilato)
- Visualizzazione rosa
- Analisi automatica

### Fase 3: Coaching (Dopo)
- Panel coaching
- Suggerimenti tattici
- Visualizzazioni

### Fase 4: Integrazione Backend (Finale)
- Sostituzione mock con Supabase
- Edge Functions
- Storage reale

---

## 📦 Dipendenze Aggiunte

- `react-router-dom`: Routing
- `lucide-react`: Icone moderne

---

## 🎨 Design System

**Colori** (da definire in theme.css):
- Primary: Blu scuro (#1a1f3a)
- Accent: Arancione (#ff6b35)
- Success: Verde
- Error: Rosso
- Background: Nero/Grigio scuro

**Tipografia**:
- Headings: Bold, modern sans-serif
- Body: Regular, readable
