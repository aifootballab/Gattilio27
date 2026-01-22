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

### 1. **Validazione Semantica** ✅ **COMPLETATO** (minimale - non bloccante)

**Cosa serve**:
- [x] ✅ Validazione base: nome giocatore obbligatorio
- [x] ✅ Validazione formazione: lista valide eFootball (in extract-formation)
- [x] ✅ Validazione nome: formato valido (no caratteri speciali estremi) - base
- [x] ⚠️ **NOTA**: Validazioni rigide (rating 40-100, stats 0-99, età 16-50) rimosse per permettere dati validi come rating > 100 con boosters, stats > 99 con boosters attivi
- [x] ✅ Sistema funziona come il 21 gennaio (prima delle validazioni rigide)

**File da modificare**:
- `app/api/extract-player/route.js` (validazione dati estratti)
- `app/api/extract-formation/route.js` (validazione formazione)
- `app/api/extract-match-data/route.js` (validazione statistiche match)

**Difficoltà**: 🟢 **BASSA**
**Rischio Breaking**: ❌ **NESSUNO** (solo validazione)

---

### 2. **Error Handling Migliorato** ✅ **COMPLETATO**

**Cosa serve**:
- [x] Error messages specifici per ogni tipo di errore:
  - ✅ "Image size exceeds maximum allowed size (10MB). Please use a smaller image."
  - ✅ "Rate limit reached. Please try again in a minute."
  - ✅ "Request took too long. Please try again with a smaller image or different image."
  - ✅ "Service temporarily unavailable. Please try again in a few moments."
  - ✅ "Network error. Please check your connection and try again."
- [x] Retry automatico con feedback (solo per errori temporanei):
  - ✅ Rate limit → Retry dopo 5 secondi
  - ✅ Timeout → Retry dopo 10 secondi
  - ✅ Max 2 tentativi
- [x] Timeout handling:
  - ✅ Se estrazione > 60s → Mostra errore "Request took too long. Please try again..."
  - ✅ Cancella chiamata OpenAI se timeout (AbortController)

**File modificati**:
- ✅ `lib/openaiHelper.js` (nuovo helper con timeout e retry)
- ✅ `app/api/extract-player/route.js` (error handling)
- ✅ `app/api/extract-formation/route.js` (error handling)
- ✅ `app/api/extract-coach/route.js` (error handling)

**Difficoltà**: 🟡 **MEDIA**
**Rischio Breaking**: ❌ **NESSUNO** (solo miglioramento UX)
**Status**: ✅ **COMPLETATO** (Commit: 56c3258)

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
- [x] **Componente HeroPointsBalance** (TASK 1.19 - COMPLETATO):
  - ✅ Balance numerico visibile in header
  - ✅ Cache di 5 minuti (invece di auto-refresh ogni 30s)
  - ✅ Bottone "Compra Crediti" con modal di acquisto
  - ✅ Alert se balance < 50 HP (badge rosso con icona)
  - ✅ Modal acquisto con input importo e calcolo automatico HP

**File da modificare**:
- `app/gestione-formazione/page.jsx` (UI upload)
- `app/match/[id]/page.jsx` (UI upload match - ✅ IMPLEMENTATO)
- `app/match/new/page.jsx` (UI wizard match - ✅ IMPLEMENTATO)
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

---

## ✅ FUNZIONALITÀ MATCH (COMPLETATO)

### **Gestione Partite** ✅ **COMPLETATO**

**Cosa implementato**:
- [x] ✅ Wizard step-by-step per aggiungere partita (`/match/new`)
  - 5 sezioni: Pagelle Giocatori, Statistiche Squadra, Aree Attacco, Recuperi Palla, Formazione Avversaria
  - Upload immagine per sezione con preview
  - Estrazione dati con `/api/extract-match-data`
  - Opzione "Skip" per sezioni opzionali
  - Progress bar e step indicators
  - Persistenza progresso in localStorage
  - Auto-advance dopo estrazione riuscita
- [x] ✅ Lista ultime partite in dashboard (`/`)
  - Mostra ultime 5 partite (espandibile a 10)
  - Info: Avversario, Data/Ora, Risultato, Completamento
  - Click su partita → Dettaglio (`/match/[id]`)
  - Card sempre visibile (anche se vuota, mostra messaggio informativo)
  - Mobile-first design
- [x] ✅ Dettaglio partita (`/match/[id]`)
  - Visualizza info partita completa
  - Lista sezioni con stato (completa/mancante)
  - Upload foto per sezioni mancanti
  - Estrazione e aggiornamento incrementale
  - Merge intelligente dati esistenti + nuovi
- [x] ✅ Endpoint API completi
  - `POST /api/extract-match-data`: Estrazione dati da screenshot (5 sezioni supportate)
  - `POST /api/supabase/save-match`: Salvataggio nuova partita
  - `POST /api/supabase/update-match`: Aggiornamento partita esistente
- [x] ✅ Database schema `matches`
  - Tabella completa con RLS policies
  - Indici per performance
  - Trigger per `updated_at`
- [x] ✅ Traduzione bilingue completa (IT/EN)
  - 50+ chiavi traduzione aggiunte
  - Tutti i testi hardcoded sostituiti con `t()`
  - STEPS memoizzati con `useMemo` per performance
- [x] ✅ Identificazione cliente/avversario
  - Usa `user_profiles` per identificare squadra cliente
  - Distingue automaticamente giocatori cliente vs avversario
  - Estrae risultato partita da qualsiasi screenshot

**File implementati**:
- ✅ `app/match/new/page.jsx` (Wizard aggiungi partita)
- ✅ `app/match/[id]/page.jsx` (Dettaglio partita)
- ✅ `app/page.jsx` (Lista ultime partite in dashboard)
- ✅ `app/api/extract-match-data/route.js` (Estrazione dati match)
- ✅ `app/api/supabase/save-match/route.js` (Salvataggio partita)
- ✅ `app/api/supabase/update-match/route.js` (Aggiornamento partita)
- ✅ `migrations/create_matches_table.sql` (Schema database)
- ✅ `lib/i18n.js` (Traduzioni match)

**Difficoltà**: 🟡 **MEDIA**
**Rischio Breaking**: ❌ **NESSUNO** (nuova funzionalità, non modifica esistente)
**Status**: ✅ **COMPLETATO** (Commit: 2bfa818)

**Note Enterprise**:
- ✅ Validazione dimensione immagini (max 10MB)
- ✅ Autenticazione Bearer token su tutti gli endpoint
- ✅ RLS policies per sicurezza dati
- ✅ Merge intelligente per aggiornamenti incrementali
- ✅ Calcolo automatico metadata (photos_uploaded, missing_photos, data_completeness)
- ✅ Mobile-first design con touch feedback
- ✅ Error handling robusto con messaggi specifici
- ✅ Persistenza progresso wizard in localStorage

---

**Documento creato per checklist perfezionamento - Da consultare prima di iniziare implementazione**
