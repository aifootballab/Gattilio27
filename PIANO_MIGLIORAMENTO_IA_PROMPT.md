# 🧠 Piano Miglioramento Conoscenza IA e Gestione Prompt

**Data**: 2026-01-28  
**Status**: 📋 **PROPOSTA** - Da implementare

---

## 📊 Analisi Situazione Attuale

### Memoria Attila
- **Dimensione**: 314 righe, ~23,574 caratteri
- **Struttura**: 8 sezioni principali
- **Uso attuale**: Solo parzialmente utilizzata (stili critici)
- **Problema**: File monolitico, difficile da gestire e ottimizzare

### Prompt Attuali
- **Countermeasures**: Max 50KB, max_tokens: 2000
- **Analyze Match**: Prompt molto lunghi con molte sezioni
- **Assistant Chat**: Prompt moderato ma con molte funzionalità elencate
- **Problema**: Prompt molto lunghi, informazioni ridondanti, memoria Attila poco utilizzata

### Limiti Tecnici
- **Max prompt size**: 50KB (hard limit)
- **Max tokens output**: 2000 (per countermeasures)
- **Costi**: Prompt lunghi = più costi API
- **Performance**: Prompt lunghi = risposte più lente

---

## 🎯 Obiettivi Miglioramento

1. **Ottimizzare lunghezza prompt**: Ridurre del 30-40% mantenendo qualità
2. **Dividere memoria Attila**: Moduli tematici caricabili on-demand
3. **Migliorare rilevanza**: Includere solo informazioni pertinenti al contesto
4. **Ridurre costi**: Prompt più corti = meno token = meno costi
5. **Migliorare performance**: Risposte più veloci

---

## 🔧 Proposta Soluzione

### 1. Divisione Memoria Attila in Moduli

**Struttura proposta**:
```
memoria_attila/
├── 01_statistiche_giocatori.md      (~3KB)
├── 02_stili_gioco.md                (~4KB)
├── 03_moduli_tattici.md             (~2KB)
├── 04_competenze_sviluppo.md         (~2KB)
├── 05_stili_tattici_squadra.md      (~3KB)
├── 06_calci_piazzati.md             (~2KB)
├── 07_meccaniche_gioco.md           (~3KB)
├── 08_consigli_strategie.md         (~4KB)
└── index.md                          (indice per selezione moduli)
```

**Vantaggi**:
- ✅ Caricamento selettivo: solo moduli rilevanti
- ✅ Manutenzione più semplice: modifiche isolate
- ✅ Riutilizzo: moduli condivisi tra prompt diversi
- ✅ Versioning: aggiornamenti per singolo modulo

---

### 2. Sistema Selezione Moduli Intelligente

**Logica proposta**:
```javascript
// Esempio: countermeasures
const requiredModules = [
  '02_stili_gioco',           // Sempre necessario
  '03_moduli_tattici',       // Sempre necessario
  '05_stili_tattici_squadra' // Se presente team_playing_style
]

// Esempio: analyze-match
const requiredModules = [
  '01_statistiche_giocatori', // Se ci sono player_ratings
  '02_stili_gioco',           // Se ci sono playing_styles
  '08_consigli_strategie'     // Sempre per analisi
]
```

**Implementazione**:
- Funzione `selectAttilaModules(context)` che determina moduli necessari
- Cache moduli caricati per evitare riletture
- Fallback: caricare solo moduli essenziali se contesto ambiguo

---

### 3. Ottimizzazione Prompt Esistenti

#### 3.1 Countermeasures Prompt

**Problemi attuali**:
- Sezione rosa troppo dettagliata (tutti i giocatori)
- Memoria Attila solo stili critici
- Storia match troppo lunga (15 match)

**Miglioramenti**:
```javascript
// Prima: ~15KB prompt
// Dopo: ~8-10KB prompt

// 1. Rosa: solo titolari + top 5 riserve
rosterText = titolari + riserve.slice(0, 5)

// 2. Memoria Attila: moduli selettivi
attilaMemory = selectAttilaModules({
  hasPlayingStyles: true,
  hasFormations: true,
  needsTacticalAdvice: true
})

// 3. Storia: solo ultimi 5 match rilevanti
matchHistory = matchHistory.slice(0, 5)

// 4. Rimuovere sezioni ridondanti
// - Rimuovere dettagli tecnici non necessari
// - Compattare formattazione
```

#### 3.2 Analyze Match Prompt

**Problemi attuali**:
- Troppe regole ripetute
- Dati match troppo dettagliati
- Warning eccessivi

**Miglioramenti**:
```javascript
// Prima: ~20KB+ prompt
// Dopo: ~12-15KB prompt

// 1. Compattare regole critiche
// Unire regole simili in sezioni più concise

// 2. Dati match: solo sezioni rilevanti
// Se confidence < 0.7, includere solo dati essenziali

// 3. Memoria Attila: solo per analisi tattica
attilaMemory = selectAttilaModules({
  needsPlayerStats: hasPlayerRatings,
  needsTacticalAnalysis: true
})
```

#### 3.3 Assistant Chat Prompt

**Problemi attuali**:
- Elenco funzionalità molto lungo
- Regole ripetute

**Miglioramenti**:
```javascript
// Prima: ~5KB prompt
// Dopo: ~3KB prompt

// 1. Funzionalità: solo quelle rilevanti al contesto
// Se currentPage = '/match/new', includere solo funzionalità match

// 2. Regole: compattare in sezioni più concise
```

---

### 4. Sistema Caching Memoria

**Proposta**:
```javascript
// Cache moduli memoria Attila in memoria (Node.js)
const attilaCache = new Map()

function loadAttilaModule(moduleName) {
  if (attilaCache.has(moduleName)) {
    return attilaCache.get(moduleName)
  }
  
  const content = fs.readFileSync(`memoria_attila/${moduleName}.md`, 'utf-8')
  attilaCache.set(moduleName, content)
  return content
}
```

**Vantaggi**:
- ✅ Performance: lettura file solo una volta
- ✅ Scalabilità: cache condivisa tra richieste
- ✅ Invalidazione: ricaricare su aggiornamento file

---

### 5. Metriche e Monitoraggio

**Metriche da tracciare**:
```javascript
{
  promptSize: 12345,        // Caratteri
  promptTokens: 3200,        // Token stimati
  modulesLoaded: 3,          // Moduli Attila caricati
  responseTime: 2.3,         // Secondi
  cost: 0.012               // USD stimato
}
```

**Dashboard proposta**:
- Grafico lunghezza prompt nel tempo
- Costi API per endpoint
- Tempo di risposta medio
- Utilizzo moduli memoria

---

## 📋 Piano Implementazione

### Fase 1: Preparazione (1-2 giorni)
1. ✅ Dividere memoria Attila in moduli
2. ✅ Creare funzione `selectAttilaModules()`
3. ✅ Creare sistema caching
4. ✅ Test unitari moduli

### Fase 2: Ottimizzazione Prompt (2-3 giorni)
1. ✅ Ottimizzare countermeasures prompt
2. ✅ Ottimizzare analyze-match prompt
3. ✅ Ottimizzare assistant-chat prompt
4. ✅ Test A/B confronto qualità risposte

### Fase 3: Monitoraggio (1 giorno)
1. ✅ Implementare metriche
2. ✅ Dashboard monitoraggio
3. ✅ Alerting su anomalie

### Fase 4: Validazione (2-3 giorni)
1. ✅ Test utente
2. ✅ Confronto qualità risposte prima/dopo
3. ✅ Analisi costi risparmiati
4. ✅ Documentazione aggiornata

---

## 🎯 Risultati Attesi

### Metriche Target
- **Riduzione lunghezza prompt**: 30-40%
- **Riduzione costi API**: 25-35%
- **Miglioramento tempo risposta**: 20-30%
- **Qualità risposte**: Mantenuta o migliorata

### Benefici
- ✅ Costi ridotti
- ✅ Performance migliori
- ✅ Manutenzione più semplice
- ✅ Scalabilità migliore
- ✅ Qualità risposte mantenuta

---

## ⚠️ Rischi e Mitigazioni

### Rischio 1: Qualità risposte degradata
**Mitigazione**: Test A/B estensivi, fallback a versione precedente

### Rischio 2: Complessità sistema aumentata
**Mitigazione**: Documentazione chiara, test unitari completi

### Rischio 3: Moduli memoria non trovati
**Mitigazione**: Fallback graceful, logging errori

---

## 📝 Note Tecniche

### Stima Token
- 1 carattere ≈ 0.25 token (italiano)
- Prompt 10KB ≈ 2,500 token
- Output 2000 token ≈ 8KB

### Costi Stimati (GPT-4o)
- Input: $2.50 / 1M token
- Output: $10.00 / 1M token
- Prompt 2,500 token + output 2,000 token ≈ $0.026 per richiesta

### Risparmio Potenziale
- Prima: ~$0.040 per richiesta countermeasures
- Dopo: ~$0.026 per richiesta countermeasures
- **Risparmio: ~35%**

---

## 🚀 Prossimi Step

1. **Approvazione piano**: Review e approvazione proposta
2. **Setup ambiente**: Preparazione struttura file
3. **Implementazione Fase 1**: Divisione memoria Attila
4. **Test iniziali**: Validazione funzionamento base
5. **Iterazione**: Implementazione fasi successive

---

**Ultimo Aggiornamento**: 2026-01-28
