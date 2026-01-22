# ✅ Checklist Perfezionamento Pre-Lancio

**Data**: Gennaio 2025  
**Versione**: 1.0  
**Obiettivo**: Checklist completa per rendere il sistema perfetto prima del lancio

---

## 🎯 CONTESTO

### Sistema Attuale
- ✅ Screenshot-based (upload foto → estrazione AI → analisi)
- ✅ Rosa gratis (non consuma crediti)
- ✅ Analisi match a pagamento (consuma crediti)
- ✅ Real-time coaching conversazionale (futuro)

### Obiettivo
- ✅ Rendere sistema robusto, scalabile, user-friendly
- ✅ Pricing da decidere in base ai test
- ✅ Multiple API keys OpenAI per scalabilità

---

## ✅ MUST HAVE (Prima di Lancio)

### 1. **Validazione Semantica**

**Cosa serve**:
- [ ] Validazione voto: 0-10 (non 15, non negativo)
- [ ] Validazione formazione: lista valide eFootball (non "5-5-5", non "999-999")
- [ ] Validazione nome: formato valido (no caratteri speciali estremi)
- [ ] Validazione statistiche: range validi (possesso 0-100%, passaggi 0-1000, ecc.)
- [ ] Validazione età: 16-50 (range realistico)
- [ ] Validazione overall rating: 40-100 (range eFootball)

**File da modificare**:
- `app/api/extract-player/route.js` (validazione dati estratti)
- `app/api/extract-formation/route.js` (validazione formazione)
- `app/api/extract-match-data/route.js` (validazione statistiche match)

**Difficoltà**: 🟢 **BASSA**
**Rischio Breaking**: ❌ **NESSUNO** (solo validazione)

---

### 2. **Error Handling Migliorato**

**Cosa serve**:
- [ ] Error messages specifici per ogni tipo di errore:
  - "Immagine troppo grande (max 10MB)"
  - "Formazione non valida (formazioni valide: 4-3-3, 4-4-2, ecc.)"
  - "Voto non valido (range 0-10)"
  - "Rate limit raggiunto, riprova tra 1 minuto"
  - "Crediti insufficienti (ti servono 12 HP, ne hai 5)"
- [ ] Retry automatico con feedback (solo per errori temporanei):
  - Rate limit → Retry dopo 5 secondi
  - Timeout → Retry dopo 10 secondi
  - Max 2 tentativi
- [ ] Timeout handling:
  - Se estrazione > 60s → Mostra errore "Estrazione troppo lunga, riprova"
  - Cancella chiamata OpenAI se timeout

**File da modificare**:
- `app/api/extract-player/route.js` (error handling)
- `app/api/extract-formation/route.js` (error handling)
- `app/api/extract-match-data/route.js` (error handling)

**Difficoltà**: 🟡 **MEDIA**
**Rischio Breaking**: ❌ **NESSUNO** (solo miglioramento UX)

---

### 3. **UI/UX Migliorata**

**Cosa serve**:
- [ ] Disabilitare bottone durante estrazione:
  - `disabled={uploading || extracting}`
  - Mostrare "Estrazione in corso..." durante operazione
- [ ] Progress bar per operazioni lunghe:
  - "Estrazione 1/6 foto..."
  - "Estrazione 2/6 foto..."
  - Progress bar visiva (0-100%)
- [ ] Checklist foto mancanti:
  - Mostrare checklist: "✅ Formazione caricata", "❌ Voti giocatori mancanti"
  - Messaggio friendly: "Più foto carichi, più l'IA ti aiuta!"
- [ ] Loading states migliorati:
  - Skeleton loader invece di spinner generico
  - Messaggio specifico per ogni operazione

**File da modificare**:
- `app/gestione-formazione/page.jsx` (UI upload)
- `app/match/[id]/page.jsx` (UI upload match - quando implementato)
- `components/UploadModal.jsx` (progress bar)
- `components/UploadPlayerModal.jsx` (progress bar)

**Difficoltà**: 🟢 **BASSA**
**Rischio Breaking**: ⚠️ **BASSO** (solo UI, non logica backend)

---

### 4. **Rate Limiting Base**

**Cosa serve**:
- [ ] Rate limiting per utente:
  - Max 10 estrazioni/minuto per utente
  - Max 5 analisi match/ora per utente
  - Max 1 real-time coaching/sessione (quando implementato)
- [ ] Rate limiting globale:
  - Max 100 estrazioni/minuto totali (prima di multiple API keys)
  - Fallback se rate limit raggiunto
- [ ] Messaggio chiaro se rate limit raggiunto:
  - "Hai raggiunto il limite di estrazioni. Riprova tra 1 minuto."

**File da creare/modificare**:
- `lib/rateLimiter.js` (NUOVO - middleware rate limiting)
- `app/api/extract-player/route.js` (aggiungere rate limiting)
- `app/api/extract-formation/route.js` (aggiungere rate limiting)
- `app/api/extract-match-data/route.js` (aggiungere rate limiting)

**Difficoltà**: 🟡 **MEDIA**
**Rischio Breaking**: ⚠️ **BASSO** (solo middleware, non logica esistente)

---

### 5. **Monitoring Costi OpenAI**

**Cosa serve**:
- [ ] Dashboard costi OpenAI:
  - Costi per giorno/settimana/mese
  - Costi per operazione (estrazione, analisi, real-time)
  - Costi per utente (top 10 utenti più costosi)
- [ ] Alert se costi > threshold:
  - Alert se costi giornalieri > $100
  - Alert se costi mensili > $3.000
- [ ] Tracking crediti consumati:
  - Storico crediti consumati per utente
  - Analisi costi vs ricavi

**File da creare/modificare**:
- `app/admin/costi/page.jsx` (NUOVO - dashboard costi)
- `lib/costTracker.js` (NUOVO - tracking costi)
- `app/api/extract-player/route.js` (log costi)
- `app/api/extract-match-data/route.js` (log costi)

**Difficoltà**: 🟡 **MEDIA**
**Rischio Breaking**: ❌ **NESSUNO** (solo logging, non modifica logica)

---

## ⚠️ SHOULD HAVE (Post-Lancio, quando necessario)

### 6. **Queue System** (Quando > 1.000 utenti simultanei)

**Cosa serve**:
- [ ] RabbitMQ o Redis Queue per estrazioni
- [ ] Background jobs per processare estrazioni
- [ ] Status tracking (pending, processing, completed, failed)
- [ ] Retry automatico per job falliti

**Quando implementare**:
- ⚠️ **NON prima di lancio** (over-engineering)
- ✅ **Dopo lancio** quando si raggiungono 1.000+ utenti simultanei

**Difficoltà**: 🔴 **ALTA**
**Rischio Breaking**: ⚠️ **MEDIO** (modifica architettura backend)

---

### 7. **Multiple API Keys OpenAI** (Quando > 10.000 utenti simultanei)

**Cosa serve**:
- [ ] Rotazione API keys (load balancing)
- [ ] Fallback se una chiave raggiunge rate limit
- [ ] Monitoring costi per chiave
- [ ] Configurazione chiavi in environment variables

**Quando implementare**:
- ⚠️ **NON prima di lancio** (non necessario)
- ✅ **Dopo lancio** quando si raggiungono 10.000+ utenti simultanei

**Difficoltà**: 🟡 **MEDIA**
**Rischio Breaking**: ❌ **NESSUNO** (solo configurazione, non codice)

---

### 8. **Caching Risultati Estrazione** (Quando costi aumentano)

**Cosa serve**:
- [ ] Cache hash screenshot (se screenshot identico, riusa risultato)
- [ ] Redis per cache
- [ ] TTL cache: 24 ore
- [ ] Invalida cache se dati cambiano

**Quando implementare**:
- ⚠️ **NON prima di lancio** (non critico)
- ✅ **Dopo lancio** quando costi aumentano

**Difficoltà**: 🟡 **MEDIA**
**Rischio Breaking**: ❌ **NESSUNO** (solo aggiunta cache)

---

## 🔵 NICE TO HAVE (Futuro)

### 9. **Real-Time Coaching** (Fase 2)

**Cosa serve**:
- [ ] WebSocket/SSE per streaming audio
- [ ] GPT-4o Realtime API integration
- [ ] Contesto: formazione salvata, storico utente, profilo
- [ ] UI: bottone "Attiva Coach" durante partita

**Quando implementare**:
- ⚠️ **Dopo MVP** (non critico per lancio)
- ✅ **Fase 2** quando sistema base funziona

**Difficoltà**: 🔴 **ALTA**
**Rischio Breaking**: ❌ **NESSUNO** (feature nuova)

---

## 📊 PRIORITÀ IMPLEMENTAZIONE

### **Fase 1: Pre-Lancio** (Ora - MUST HAVE)

1. ✅ Validazione semantica (1-2 giorni)
2. ✅ Error handling migliorato (2-3 giorni)
3. ✅ UI/UX migliorata (2-3 giorni)
4. ✅ Rate limiting base (1-2 giorni)
5. ✅ Monitoring costi (1-2 giorni)

**Totale**: ~7-12 giorni

---

### **Fase 2: Post-Lancio** (Quando necessario - SHOULD HAVE)

1. ⚠️ Queue system (se > 1.000 utenti simultanei) - 5-7 giorni
2. ⚠️ Multiple API keys (se > 10.000 utenti simultanei) - 2-3 giorni
3. ⚠️ Caching (se costi aumentano) - 2-3 giorni

---

### **Fase 3: Futuro** (NICE TO HAVE)

1. 🔵 Real-time coaching - 10-15 giorni
2. 🔵 Architettura distribuita - 15-20 giorni

---

## 🎯 CONSIDERAZIONI PER QUANDO INIZIEREMO

### **Pricing**
- ⚠️ **Da decidere in base ai test**:
  - Testare costi reali OpenAI
  - Testare utilizzo utenti
  - Calcolare margine sostenibile
  - Aggiustare Hero Points di conseguenza

### **Scalabilità**
- ✅ **Multiple API keys OpenAI**: Già pianificato
- ✅ **Queue system**: Quando necessario (> 1.000 utenti)
- ✅ **Architettura distribuita**: Quando necessario (> 100.000 utenti)

### **Real-Time Coaching**
- ✅ **Conversazionale**: Non screenshot-based
- ✅ **Compatibile**: Con sistema attuale
- ✅ **Futuro**: Dopo MVP

### **Testing**
- [ ] Test con utenti reali (beta testing)
- [ ] Monitorare costi durante test
- [ ] Raccogliere feedback UX
- [ ] Aggiustare pricing in base ai test

---

**Documento creato per checklist perfezionamento - Da consultare prima di iniziare implementazione**
