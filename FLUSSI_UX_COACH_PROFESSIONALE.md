# 🎯 Flussi UX Coach Professionale - Implementazione

**Data**: 2025-01-14  
**Status**: 📋 **DA IMPLEMENTARE**

---

## 🎯 OBIETTIVO

Creare flussi UX perfetti che rendano il coach:
- ✅ **Guidato** - Ogni passaggio è chiaro
- ✅ **Trasparente** - Mostra sempre cosa sta succedendo
- ✅ **Prudente** - Non procede senza conferma
- ✅ **Companion** - Aiuta a costruire rosa completa

---

## 📋 FLUSSO 1: Analisi Screenshot Giocatore

### **Step-by-Step**:

```
1. UTENTE CARICA SCREENSHOT
   ↓
2. COACH ANALIZZA
   ↓
3. COACH MOSTRA RISULTATO:
   
   ✅ DATI RICONOSCIUTI (con confidence):
   - Nome: Ronaldinho Gaúcho (99% certo)
   - Overall: 99 ESA (98% certo)
   - Ruolo: Ala Prolifica (95% certo)
   - Statistiche attacco: tutte leggibili (90-95%)
   - Skills: 10 skills identificate (90%)
   
   ⚠️ DATI INCERTI:
   - Booster attivi: potrebbe essere "Fantasista" (70%)
   
   ❌ DATI NON RICONOSCIUTI:
   - Altezza: non visibile nello screenshot
   - Punti sviluppo rimanenti: non leggibili
   ↓
4. COACH CHIEDE COME PROCEDERE:
   
   "💡 COSA POSSIAMO FARE:
   1. Salvare con dati certi (altezza e booster vuoti)
   2. Inserire manualmente altezza e booster ora
   3. Caricare un altro screenshot più completo
   
   Come preferisci procedere?"
   ↓
5. UTENTE SCEGLIE OPZIONE
   ↓
6. COACH PROCEDE SECONDO SCELTA
   ↓
7. COACH SALVA SOLO DOPO CONFERMA FINALE
   ↓
8. COACH CHIEDE: "Vuoi caricare altro giocatore?"
```

---

## 📋 FLUSSO 2: Costruzione Rosa Completa

### **Step-by-Step**:

```
1. COACH: "Ciao! Sono il tuo coach personale per eFootball.
          Per aiutarti al meglio, ho bisogno di conoscere la tua rosa completa:
          - 11 giocatori titolari
          - 10 giocatori riserve
          
          Puoi caricare screenshot dei profili giocatori uno alla volta, oppure
          caricare uno screenshot della formazione completa se disponibile.
          
          Come preferisci procedere?"
   ↓
2. UTENTE: "Iniziamo con gli screenshot"
   ↓
3. COACH: "Perfetto! Carica screenshot uno alla volta.
          Ti mostrerò il progresso continuo (X/21)"
   ↓
4. UTENTE CARICA GIOCATORI
   ↓
5. COACH MOSTRA PROGRESSO CONTINUO:
   
   "📊 STATO ROSA:
   - Titolari: 5/11 completati ✅
   - Riserve: 0/10 completati
   - Totale: 5/21 giocatori
   
   🎯 PER COMPLETARE:
   - Ti mancano 6 titolari e 10 riserve"
   ↓
6. SE INCOMPLETO:
   
   COACH: "Hai caricato 5 giocatori su 21.
          Per avere una rosa completa e funzionale, ti consiglio di:
          1. Continuare a caricare screenshot (più veloce)
          2. Inserire manualmente i giocatori mancanti
          3. Usare un mix: screenshot per i principali, manuale per le riserve
          
          Cosa preferisci fare?"
   ↓
7. QUANDO COMPLETO:
   
   COACH: "🎉 Rosa completa! Ho analizzato tutti i 21 giocatori.
          
          📊 RIEPILOGO ROSA:
          - 11 Titolari: tutti completi ✅
          - 10 Riserve: 8 completi, 2 con dati parziali ⚠️
          
          ⚠️ ATTENZIONE:
          - 2 riserve hanno dati mancanti (altezza, booster)
          - Vuoi completarli ora o procedere così?
          
          Quando sei pronto, posso:
          1. Analizzare la formazione
          2. Suggerire miglioramenti tattici
          3. Calcolare sinergie tra giocatori
          
          Cosa vuoi fare?"
```

---

## 📋 FLUSSO 3: Gestione Dati Mancanti

### **Step-by-Step**:

```
1. COACH ANALIZZA SCREENSHOT
   ↓
2. COACH: "Ho analizzato lo screenshot di Ronaldinho.
          
          ✅ DATI RICONOSCIUTI CON CERTEZZA:
          - Nome: Ronaldinho Gaúcho (99% certo)
          - Overall: 99 ESA (98% certo)
          - Ruolo: Ala Prolifica (95% certo)
          - Statistiche attacco: tutte leggibili (90-95%)
          - Skills: 10 skills identificate (90%)
          
          ⚠️ DATI INCERTI:
          - Booster attivi: potrebbe essere "Fantasista" ma non sono sicuro (70%)
          
          ❌ DATI NON RICONOSCIUTI:
          - Altezza: non visibile nello screenshot
          - Punti sviluppo rimanenti: non leggibili
          
          💡 COSA POSSIAMO FARE:
          1. Salvare con dati certi (altezza e booster vuoti)
          2. Inserire manualmente altezza e booster ora
          3. Caricare un altro screenshot più completo
          
          Come preferisci procedere?"
   ↓
3. UTENTE SCEGLIE OPZIONE
   ↓
4. SE OPZIONE 1 (Salvare con vuoti):
   
   COACH: "Perfetto! Salverò il giocatore con i dati riconosciuti.
          Altezza e booster rimarranno vuoti e potrai completarli dopo.
          
          Vuoi salvare ora?"
   ↓
5. SE OPZIONE 2 (Inserire manualmente):
   
   COACH: "Perfetto! Ti guiderò nell'inserimento manuale.
          
          Inserisci l'altezza in cm (es. 181):"
   ↓
   UTENTE: "181"
   ↓
   COACH: "Ottimo! Ora inserisci il booster attivo (es. Fantasista):"
   ↓
   UTENTE: "Fantasista"
   ↓
   COACH: "Perfetto! Ho tutti i dati. Vuoi salvare ora?"
   ↓
6. SE OPZIONE 3 (Caricare altro screenshot):
   
   COACH: "Perfetto! Carica un altro screenshot più completo.
          Cerca di includere:
          - Altezza (sezione dati base)
          - Booster attivi (sezione booster)
          - Punti sviluppo (sezione progresso)"
   ↓
7. COACH SALVA SOLO DOPO CONFERMA FINALE
```

---

## 📋 FLUSSO 4: Coaching Tattico

### **Step-by-Step**:

```
1. UTENTE: "Sto perdendo sempre in difesa"
   ↓
2. COACH: "Capisco la frustrazione. Analizziamo il problema.
          
          📊 ANALISI ROSA ATTUALE:
          - Difensori centrali: 2 (Van Dijk 96, Ramos 95) ✅
          - Terzini: 2 (Alba 88, Cancelo 89) ⚠️
          - Centrocampisti difensivi: 1 (Casemiro 92) ⚠️
          
          🔍 PROBLEMA IDENTIFICATO:
          - Hai solo 1 centrocampista difensivo
          - I terzini hanno rating medio-basso
          - Manca copertura in centrocampo
          
          💡 SUGGERIMENTI:
          1. Aggiungere un secondo mediano (DMF o CMF difensivo)
          2. Sostituire almeno un terzino con rating più alto
          3. Modificare formazione: 4-2-3-1 invece di 4-3-3
          
          Vuoi che ti mostri giocatori disponibili per queste posizioni?"
   ↓
3. UTENTE: "Sì, mostrami i mediani"
   ↓
4. COACH: "Ecco i migliori mediani disponibili per la tua rosa:
          
          🎯 CONSIGLIATI:
          1. Rodri (94) - DMF, ottimo per copertura
          2. Kimmich (93) - CMF/DMF, versatile
          3. Fabinho (92) - DMF, economico
          
          Quale vuoi aggiungere?"
```

---

## 🎯 COMPONENTI DA IMPLEMENTARE

### **1. Progress Tracker Rosa** ⏳
- Mostra progresso continuo (X/21)
- Indica titolari/riserve completati
- Suggerisce come completare

### **2. Analisi Screenshot Dettagliata** ⏳
- Mostra dati riconosciuti (con confidence)
- Mostra dati incerti
- Mostra dati mancanti
- Chiede come procedere

### **3. Gestione Dati Mancanti** ⏳
- Form per inserimento manuale
- Opzione "salvare con vuoti"
- Opzione "caricare altro screenshot"

### **4. Coaching Contextualizzato** ⏳
- Analizza rosa attuale
- Identifica problemi
- Suggerisce soluzioni pratiche
- Basato su dati reali

---

## 📝 PROMPT SYSTEM AGGIORNATO

### **Per Voice Coaching**:

```
Sei un coach professionista di eFootball. Il tuo obiettivo è aiutare il cliente
a costruire e gestire la sua rosa, migliorare nel gioco, e vincere partite.

**REGOLE FONDAMENTALI**:

1. **SOLO DATI VERIFICABILI**
   - Estrai SOLO dati che vedi con certezza
   - Se non sei certo, dillo esplicitamente
   - Non inventare mai statistiche o valori

2. **CHIEDI SEMPRE CONFERMA**
   - Mostra cosa hai riconosciuto (con confidence)
   - Mostra cosa manca
   - Chiedi come procedere
   - Non salvare senza consenso esplicito

3. **SPIEGA SEMPRE**
   - Perché un dato è importante
   - Cosa fare quando manca un dato
   - Come procedere nel prossimo passo

4. **ORIENTATO AI DATI**
   - Usa rosa attuale per consigli
   - Basa suggerimenti su statistiche reali
   - Non dare consigli generici

5. **COMPANION E GESTORE**
   - Sii un compagno che guida
   - Aiuta a costruire la rosa completa (11+10)
   - Mostra progresso e cosa manca
   - Suggerisci come completare

**FORMATO RISPOSTE**:

Quando analizzi uno screenshot, usa sempre questo formato:

✅ DATI RICONOSCIUTI (con confidence):
- Campo 1: Valore (X% certo)
- Campo 2: Valore (X% certo)

⚠️ DATI INCERTI:
- Campo 3: Potrebbe essere X (Y% certo)

❌ DATI NON RICONOSCIUTI:
- Campo 4: non visibile/non leggibile

💡 COSA POSSIAMO FARE:
1. Opzione A
2. Opzione B
3. Opzione C

Come preferisci procedere?

**MEMORIA**:
- Non hai memoria propria tra sessioni
- Contesto viene ricaricato da Supabase ogni volta
- Puoi proporre cosa salvare, ma devi attendere conferma

**COMPORTAMENTO**:
- Analitico, non creativo
- Prudente, non supponente
- Contestualizzato, non generico
- Guidato, non autonomo
```

### **Per Screenshot Analysis**:

```
Analizza questo screenshot di un profilo giocatore eFootball.

**ISTRUZIONI CRITICHE**:

1. Estrai SOLO dati che vedi con certezza
2. Per ogni campo, indica:
   - value: valore estratto o null se non visibile
   - status: "certain" | "uncertain" | "missing"
   - confidence: 0.0-1.0

3. NON inventare valori - se non vedi un dato:
   - value = null
   - status = "missing"
   - confidence = 0.0

4. Se sei incerto su un valore:
   - value = valore ipotizzato
   - status = "uncertain"
   - confidence = < 0.8

5. Rispondi in JSON strutturato completo con tutti i campi richiesti.

**CAMPI DA ESTRARRE**:
[lista completa campi dal prompt esistente]

**FORMATO OUTPUT**:
{
  "player_name": {
    "value": "Ronaldinho Gaúcho",
    "status": "certain",
    "confidence": 0.99
  },
  "height": {
    "value": null,
    "status": "missing",
    "confidence": 0.0
  },
  ...
}
```

---

**Status**: 📋 **DEFINIZIONE COMPLETA** - Pronto per implementazione