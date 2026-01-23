# Proposta: Sezione Contromisure Live

**Data:** 23 Gennaio 2026  
**Obiettivo:** Sistema di analisi tattica pre-partita con suggerimenti coerenti e contestuali

---

## 🎯 CONCETTO

Il cliente carica la formazione avversaria (screenshot) e riceve:
- **Contromisure tattiche** specifiche per contrastare quella formazione
- **Adeguamenti** alla propria formazione/impostazioni
- **Suggerimenti giocatori** dalla rosa per ottimizzare la squadra
- **Analisi coerente** che incrocia tutti i dati disponibili
- **Focus su formazioni meta** con contromisure basate su best practices community

### 🎯 Risoluzione Frustrazioni Community

**Problema 1: "Non so come contrastare formazioni meta"**
- ✅ **Soluzione:** Sistema identifica automaticamente se formazione è meta e suggerisce contromisure specifiche
- ✅ **Esempio:** Contro 4-3-3 → Suggerisce 3-5-2 con spiegazione tattica

**Problema 2: "Le formazioni meta sono troppo forti"**
- ✅ **Soluzione:** Analisi punti deboli formazione avversaria con contromisure mirate
- ✅ **Esempio:** Identifica che 4-2-3-1 ha attaccante isolato → Suggerisce due attaccanti

**Problema 3: "Non capisco perché una formazione funziona"**
- ✅ **Soluzione:** Ogni suggerimento include motivazione tattica dettagliata
- ✅ **Esempio:** "Usa 3-5-2 perché crea superiorità numerica 5v3 in centrocampo contro 4-3-3"

**Problema 4: "Non so quali giocatori usare"**
- ✅ **Soluzione:** Suggerimenti specifici di giocatori dalla rosa cliente ideali per ogni ruolo
- ✅ **Esempio:** "Giocatore X è ideale perché ha skill 'Intercettazione' alta per marcare ala"

**Problema 5: "Quick Counter è impossibile da contrastare"**
- ✅ **Soluzione:** Contromisure specifiche: linea difensiva bassa, possesso paziente, evitare pressing aggressivo
- ✅ **Esempio:** Spiega perché possesso paziente neutralizza Quick Counter

---

## 📊 DATI DA INCROCIARE

### 1. **Formazione Avversaria** (input cliente)
- Formazione (es: 4-3-3, 4-2-1-3)
- Stile di gioco
- Giocatori chiave (se estratti)
- Forza complessiva
- Punti di forza/debolezza

### 2. **Rosa Cliente** (già presente)
- Giocatori disponibili con:
  - Overall rating
  - Posizione
  - Skills/Com Skills
  - Base stats
  - Playing style
  - Performance storiche (se disponibili)

### 3. **Formazione Cliente** (già presente)
- Formazione salvata (`formation_layout`)
- Giocatori titolari (slot_index 0-10)
- Posizioni in campo

### 4. **Impostazioni Tattiche Cliente** (già presente)
- Team playing style (`team_tactical_settings`)
- Individual instructions
- Stile preferito

### 5. **Allenatore Attivo** (già presente)
- Competenze stili di gioco
- Stat boosters
- Connection (se presente)

### 6. **Storico Match** (opzionale, se disponibile)
- Match precedenti contro formazioni simili
- Pattern tattici squadra (`team_tactical_patterns`)
- Performance giocatori (`player_performance_aggregates`)

---

## 🏗️ ARCHITETTURA PROPOSTA

### 1. **Frontend: Nuova Pagina `/contromisure-live`**

**Flusso:**
```
1. Cliente carica screenshot formazione avversaria
2. Sistema estrae dati (usando extract-formation esistente)
3. Cliente visualizza formazione avversaria estratta
4. Cliente clicca "Genera Contromisure"
5. Sistema mostra:
   - Analisi formazione avversaria
   - Contromisure suggerite
   - Adeguamenti formazione/impostazioni
   - Suggerimenti giocatori
   - Motivazioni per ogni suggerimento
```

**Componenti UI:**
- Upload screenshot formazione avversaria
- Preview formazione estratta
- Sezione "Analisi Formazione Avversaria"
- Sezione "Contromisure Tattiche"
- Sezione "Adeguamenti Suggeriti"
- Sezione "Suggerimenti Giocatori"
- Pulsante "Applica Suggerimenti" (opzionale)

### 2. **Backend: Nuovo Endpoint `/api/generate-countermeasures`**

**Input:**
```json
{
  "opponent_formation_id": "uuid", // Formazione avversaria salvata
  "context": {
    "match_date": "2026-01-23T15:30:00Z", // Opzionale
    "is_home": true // Opzionale
  }
}
```

**Processo:**
1. Recupera formazione avversaria da `opponent_formations`
2. Recupera rosa cliente completa da `players`
3. Recupera formazione cliente da `formation_layout`
4. Recupera impostazioni tattiche da `team_tactical_settings`
5. Recupera allenatore attivo da `coaches`
6. Recupera storico match (ultimi 10-20 match) da `matches`
7. Recupera pattern tattici da `team_tactical_patterns` (se disponibili)
8. Recupera performance giocatori da `player_performance_aggregates` (se disponibili)
9. Genera prompt contestuale per GPT-4o
10. Chiama GPT-4o per analisi
11. Restituisce contromisure strutturate

**Output:**
```json
{
  "analysis": {
    "opponent_formation_analysis": "Analisi formazione avversaria...",
    "strengths": ["Punti di forza avversario"],
    "weaknesses": ["Punti deboli avversario"]
  },
  "countermeasures": {
    "formation_adjustments": [
      {
        "type": "formation_change",
        "suggestion": "Cambia da 4-3-3 a 4-2-1-3",
        "reason": "Motivazione...",
        "priority": "high"
      }
    ],
    "tactical_adjustments": [
      {
        "type": "playing_style_change",
        "suggestion": "Usa contropiede veloce",
        "reason": "Motivazione...",
        "priority": "medium"
      }
    ],
    "player_suggestions": [
      {
        "player_id": "uuid",
        "player_name": "Nome Giocatore",
        "action": "add_to_starting_xi",
        "position": "SP",
        "reason": "Motivazione...",
        "priority": "high"
      }
    ],
    "individual_instructions": [
      {
        "slot": "attacco_1",
        "player_id": "uuid",
        "instruction": "attacco_spazio",
        "reason": "Motivazione..."
      }
    ],
    "defensive_line": "bassa", // alta, media, bassa
    "pressing": "contenimento", // aggressivo, bilanciato, contenimento
    "possession_strategy": "controllo" // controllo, transizioni, bilanciato
  },
  "confidence": 85, // 0-100
  "data_quality": "high", // high, medium, low
  "warnings": [
    "Formazione avversaria è meta (4-3-3), contromisure specifiche necessarie",
    "Rosa cliente non ha giocatori ideali per marcatura stretta, suggerite alternative"
  ]
}
```

### 3. **Prompt GPT-5.2: Analisi Contromisure (Focus Community)**

**Struttura Prompt:**
```
Sei un esperto tattico di eFootball con conoscenza approfondita delle formazioni meta e delle contromisure efficaci utilizzate dalla community professionale.

FORMazione AVVERSARIA:
- Formazione: [formation_name]
- Stile: [playing_style]
- Forza: [overall_strength]
- Giocatori: [players array]

⚠️ FORMAZIONI META COMUNI (da identificare):
- 4-3-3: Dominante, vulnerabile a superiorità numerica centrale
- 4-2-3-1: Compatta, isolamento attaccante solitario
- 5-2-3: Difensiva, vulnerabile a possesso e cambi di gioco
- 3-5-2: Centrocampo forte, vulnerabile ad ampiezza
- Quick Counter: Spazio dietro difesa, vulnerabile a possesso paziente

ROSA CLIENTE:
- [Lista completa giocatori con stats, skills, overall, playing_style]

FORMazione CLIENTE ATTUALE:
- Formazione: [formation]
- Titolari: [lista giocatori con posizioni, stats, skills]

IMPOSTAZIONI TATTICHE CLIENTE:
- Team Playing Style: [team_playing_style]
- Individual Instructions: [individual_instructions]

ALLENATORE CLIENTE:
- Competenze: [playing_style_competence]
- Stat Boosters: [stat_boosters]
- Connection: [connection] (se presente)

STORICO (se disponibile):
- Pattern formazioni: [formation_usage]
- Pattern stili: [playing_style_usage]
- Problemi ricorrenti: [recurring_issues]
- Performance contro formazioni simili: [match history]

ISTRUZIONI SPECIFICHE (Focus Community eFootball):

1. **IDENTIFICA FORMAZIONE META:**
   - Se formazione avversaria è meta (4-3-3, 4-2-3-1, 5-2-3, 3-5-2), evidenzialo
   - Spiega perché è meta e quali sono i suoi punti di forza
   - Suggerisci contromisure SPECIFICHE basate su best practices community

2. **CONTROMISURE CONTRO META:**
   - **Contro 4-3-3:** Suggerisci 3-5-2 o 4-4-2 Diamond, marcatura stretta ali, superiorità numerica centrale
   - **Contro 4-2-3-1:** Suggerisci due attaccanti (4-4-2/3-5-2), isolare DMF, AMF offensivo
   - **Contro 5-2-3:** Suggerisci possesso palla, cambi di gioco rapidi, sfruttare ampiezza
   - **Contro Quick Counter:** Suggerisci linea difensiva bassa, possesso paziente, evitare pressing aggressivo, centrocampo compatto
   - **Contro 3-5-2:** Suggerisci ampiezza (4-3-3/4-2-3-1), terzini aggressivi, attaccare zone laterali

3. **ANALISI PUNTI FORZA/DEBOLEZZA:**
   - Identifica punti di forza formazione avversaria (es: "4-3-3 ha centrocampo forte ma ali isolate")
   - Identifica punti deboli (es: "4-2-3-1 ha attaccante solitario, vulnerabile a due attaccanti")
   - Spiega PERCHÉ ogni debolezza esiste (ragionamento tattico)

4. **SUGGERIMENTI COERENTI:**
   - Incrocia rosa cliente: suggerisci giocatori SPECIFICI dalla rosa ideali per ogni ruolo
   - Considera formazione cliente attuale: se già ottimale, suggerisci solo adeguamenti
   - Rispetta stile preferito cliente: se preferisce possesso, non suggerire Quick Counter
   - Usa competenze allenatore: se allenatore forte in contropiede, sfrutta quello

5. **ADEGUAMENTI SPECIFICI:**
   - **Linea difensiva:** Alta/Bassa (spiega quando e perché)
   - **Pressing:** Aggressivo/Contenimento (spiega quando e perché)
   - **Possesso:** Controllo paziente vs Transizioni rapide
   - **Ampiezza:** Sfruttare ali vs Gioco centrale
   - **Marcature:** Strette vs Zona (spiega quando e perché)

6. **SUGGERIMENTI GIOCATORI:**
   - Identifica giocatori dalla rosa IDEALI per contromisura
   - Considera: Overall, Skills, Playing Style, Stats rilevanti
   - Suggerisci sostituzioni se giocatori attuali non ottimali
   - Spiega PERCHÉ quel giocatore è ideale (es: "Giocatore X ha skill 'Intercettazione' alta, perfetto per marcare ala")

7. **ISTRUZIONI INDIVIDUALI:**
   - Suggerisci istruzioni SPECIFICHE per ogni ruolo
   - Spiega PERCHÉ ogni istruzione è necessaria
   - Considera formazione avversaria (es: "Marcatura uomo su ala se avversario usa 4-3-3")

8. **PRIORITÀ:**
   - HIGH: Contromisure essenziali per contrastare formazione avversaria
   - MEDIUM: Ottimizzazioni per migliorare efficacia
   - LOW: Fine-tuning per perfezionamento

9. **MOTIVAZIONI:**
   - Ogni suggerimento DEVE avere motivazione chiara
   - Spiega ragionamento tattico (non solo "è meglio")
   - Riferisci a best practices community quando rilevante

10. **AVVERTENZE:**
    - Se formazione avversaria è meta, avverti cliente
    - Se rosa cliente non ha giocatori ideali, suggerisci alternative
    - Se suggerimenti contrastano con stile preferito, spiega trade-off

OUTPUT FORMATO JSON (STRUTTURATO):
{
  "analysis": {
    "opponent_formation_analysis": "Analisi dettagliata...",
    "is_meta_formation": true/false,
    "meta_type": "4-3-3" | "4-2-3-1" | "5-2-3" | "3-5-2" | "quick_counter" | null,
    "strengths": ["Punto forza 1", "Punto forza 2"],
    "weaknesses": ["Punto debole 1", "Punto debole 2"],
    "why_weaknesses": "Spiegazione ragionamento tattico..."
  },
  "countermeasures": {
    "formation_adjustments": [...],
    "tactical_adjustments": [...],
    "player_suggestions": [...],
    "individual_instructions": [...],
    "defensive_line": "alta" | "bassa" | "media",
    "pressing": "aggressivo" | "contenimento" | "bilanciato",
    "possession_strategy": "controllo" | "transizioni" | "bilanciato"
  },
  "confidence": 85,
  "data_quality": "high" | "medium" | "low",
  "warnings": ["Avvertimento 1", "Avvertimento 2"]
}
```

---

## 🔧 IMPLEMENTAZIONE TECNICA

### 1. **Database: Usare `opponent_formations` esistente**

**Campi disponibili:**
- `formation_name`: Nome formazione (es: "4-3-3")
- `playing_style`: Stile di gioco
- `players`: Array giocatori (se estratti)
- `overall_strength`: Forza complessiva
- `tactical_style`: Stile tattico (se presente)
- `is_pre_match`: true per contromisure live

**Aggiungere campo (se necessario):**
```sql
ALTER TABLE opponent_formations
ADD COLUMN IF NOT EXISTS tactical_style TEXT;
```

### 2. **Backend: Endpoint `/api/generate-countermeasures`**

**File:** `app/api/generate-countermeasures/route.js`

**Funzionalità:**
- Autenticazione (token Bearer)
- Rate limiting (5 req/minuto)
- Recupero dati contestuali (rosa, formazione, impostazioni, allenatore, storico)
- Generazione prompt contestuale (con focus community eFootball)
- Chiamata GPT-5.2 (o GPT-5 se 5.2 non disponibile)
- Parsing risposta JSON
- Validazione output
- Restituzione contromisure strutturate

**Sicurezza:**
- Autenticazione obbligatoria
- Rate limiting
- Validazione input (UUID)
- Sanitizzazione output
- RLS policies (dati utente)

### 3. **Frontend: Pagina `/contromisure-live`**

**File:** `app/contromisure-live/page.jsx`

**Componenti:**
- Upload screenshot formazione avversaria
- Preview formazione estratta
- Pulsante "Genera Contromisure"
- Visualizzazione contromisure (accordion/card)
- Pulsante "Applica Suggerimenti" (opzionale)

**Stati:**
- Loading (upload, estrazione, generazione)
- Success (contromisure visualizzate)
- Error (gestione errori)

### 4. **Integrazione con Gestione Formazione**

**Opzione A:** Sezione dedicata in `/gestione-formazione`
- Tab "Contromisure Live"
- Upload formazione avversaria
- Genera contromisure
- Applica suggerimenti direttamente

**Opzione B:** Pagina separata `/contromisure-live`
- Flusso indipendente
- Link da dashboard
- Più spazio per visualizzazione

**Raccomandazione:** Opzione B (pagina separata) per UX migliore

---

## 🎨 UX PROPOSTA

### 1. **Flusso Cliente**

```
Dashboard → "Contromisure Live" → 
  Upload Screenshot → 
  Preview Formazione → 
  "Genera Contromisure" → 
  Visualizza Analisi → 
  Applica Suggerimenti (opzionale)
```

### 2. **Visualizzazione Contromisure**

**Layout:**
```
┌─────────────────────────────────────┐
│ 📊 Analisi Formazione Avversaria    │
│ - Punti di forza                    │
│ - Punti deboli                      │
│ - Stile di gioco                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎯 Contromisure Tattiche            │
│ [Priority: HIGH]                    │
│ Cambia formazione: 4-2-1-3          │
│ Motivo: ...                         │
│                                     │
│ [Priority: MEDIUM]                  │
│ Cambia stile: Contropiede veloce    │
│ Motivo: ...                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 👥 Suggerimenti Giocatori            │
│ [Priority: HIGH]                    │
│ Aggiungi: Nome Giocatore (SP)       │
│ Motivo: ...                         │
│                                     │
│ [Priority: MEDIUM]                  │
│ Rimuovi: Nome Giocatore (DC)        │
│ Motivo: ...                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚙️ Istruzioni Individuali           │
│ - Attacco 1: attacco_spazio         │
│ - Difesa 1: linea_bassa             │
└─────────────────────────────────────┘

[Applica Tutti i Suggerimenti]
```

### 3. **Applicazione Suggerimenti**

**Opzione 1:** Applicazione automatica
- Pulsante "Applica Tutti"
- Conferma modal
- Applica tutti i suggerimenti in sequenza

**Opzione 2:** Applicazione selettiva
- Checkbox per ogni suggerimento
- Pulsante "Applica Selezionati"
- Applica solo quelli selezionati

**Raccomandazione:** Opzione 2 (più controllo utente)

---

## 🔄 INTEGRAZIONE CON SISTEMA ESISTENTE

### 1. **Riutilizzo Codice Esistente**

- `extract-formation/route.js`: Estrazione formazione avversaria
- `save-formation-layout/route.js`: Salvataggio formazione cliente
- `save-tactical-settings/route.js`: Salvataggio impostazioni
- `save-player/route.js`: Gestione giocatori
- `analyze-match/route.js`: Pattern per recupero dati contestuali

### 2. **Nuovo Codice Necessario**

- `generate-countermeasures/route.js`: Endpoint principale
- `contromisure-live/page.jsx`: Frontend pagina
- `lib/countermeasuresHelper.js`: Helper per parsing/validazione
- Traduzioni i18n (IT/EN)

### 3. **Modifiche Minime Esistenti**

- Aggiungere link "Contromisure Live" in dashboard
- Aggiungere campo `tactical_style` in `opponent_formations` (se necessario)

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Verificare struttura `opponent_formations`
- [ ] Aggiungere campo `tactical_style` (se necessario)
- [ ] Verificare RLS policies

### Backend
- [ ] Creare endpoint `/api/generate-countermeasures`
- [ ] Implementare recupero dati contestuali
- [ ] Implementare generazione prompt GPT-4o
- [ ] Implementare parsing risposta JSON
- [ ] Aggiungere rate limiting
- [ ] Aggiungere validazione input/output
- [ ] Aggiungere error handling

### Frontend
- [ ] Creare pagina `/contromisure-live`
- [ ] Implementare upload screenshot
- [ ] Implementare preview formazione
- [ ] Implementare visualizzazione contromisure
- [ ] Implementare applicazione suggerimenti
- [ ] Aggiungere traduzioni i18n
- [ ] Aggiungere responsive design

### Integrazione
- [ ] Aggiungere link dashboard
- [ ] Integrare con gestione formazione (opzionale)
- [ ] Test end-to-end

---

## 🎯 VANTAGGI APPROCCIO

1. **Coerenza:** Incrocia tutti i dati disponibili
2. **Contestualità:** Suggerimenti basati su rosa/impostazioni cliente
3. **Personalizzazione:** Usa storico e pattern cliente
4. **Focus Community:** Risolve frustrazioni reali (formazioni meta, contromisure)
5. **Best Practices:** Integra strategie efficaci dalla community
6. **Spiegazioni:** Ogni suggerimento ha motivazione tattica chiara
7. **Flessibilità:** Applicazione selettiva suggerimenti
8. **Scalabilità:** Riutilizza codice esistente
9. **UX:** Flusso chiaro e intuitivo
10. **GPT-5.2:** Modello più avanzato per analisi più accurate

---

## 🎯 FOCUS: ESIGENZE E FRUSTRAZIONI COMMUNITY

### Frustrazioni Principali Identificate

1. **Dominanza Formazioni Meta**
   - 4-3-3, 4-2-3-1, 5-2-3 dominano il meta
   - Giocatori si sentono limitati nelle scelte
   - Repetitività tattica

2. **Difficoltà a Contrastare Formazioni Meta**
   - Non sanno come adattarsi
   - Mancano contromisure specifiche
   - Quick Counter difficile da contrastare

3. **Mancanza di Guida Tattica**
   - Non capiscono perché una formazione funziona
   - Non sanno quali adeguamenti fare
   - Istruzioni individuali confuse

### Contromisure Efficaci (Best Practices Community)

**Contro 4-3-3:**
- Usa 3-5-2 o 4-4-2 Diamond per dominare centrocampo
- Marcatura stretta sulle ali
- Sfrutta superiorità numerica centrale

**Contro 4-2-3-1:**
- Due attaccanti (4-4-2 o 3-5-2)
- Isola i due centrocampisti difensivi
- Attacca con AMF dietro la linea

**Contro 5-2-3:**
- Possesso palla
- Cambi di gioco rapidi per tirare fuori i terzini
- Sfrutta ampiezza

**Contro Quick Counter:**
- Linea difensiva bassa
- Controllo possesso paziente
- Evita pressing aggressivo
- Centrocampo compatto con BWM e DMF

**Contro 3-5-2:**
- Sfrutta ampiezza (4-3-3 o 4-2-3-1)
- Movimenti aggressivi dei terzini
- Attacca le zone laterali

### Suggerimenti da Integrare nel Prompt

1. **Spiegare PERCHÉ** ogni contromisura funziona
2. **Prioritizzare** contromisure contro formazioni meta comuni
3. **Suggerire adeguamenti** specifici (linea difensiva, pressing, possesso)
4. **Identificare giocatori** dalla rosa ideali per ogni ruolo tattico
5. **Avvertire** se formazione avversaria è meta e suggerire alternative

---

## 🤖 MODELLO AI: GPT-5.2

**Confermato:** GPT-5.2 (rilasciato Gennaio 2026)
- Modello più avanzato disponibile
- Migliori capacità di ragionamento
- Migliore comprensione contestuale
- Personalità system migliorato

**Configurazione:**
```javascript
model: 'gpt-5.2' // o 'gpt-5' se 5.2 non disponibile via API
temperature: 0.7 // Creatività bilanciata
max_tokens: 2000 // Output dettagliato
```

---

## ✅ DECISIONI CONFERMATE

1. **Modello AI:** ✅ GPT-5.2 (o GPT-5 se 5.2 non disponibile)
2. **Pagina:** ✅ Separata (`/contromisure-live`)
3. **Applicazione:** ✅ Selettiva (checkbox per ogni suggerimento)
4. **Storico:** ✅ Sì, usare storico per migliorare suggerimenti
5. **Focus:** ✅ Contromisure contro formazioni meta + esigenze community

---

**Aspetto il tuo via per procedere con l'implementazione!** 🚀
