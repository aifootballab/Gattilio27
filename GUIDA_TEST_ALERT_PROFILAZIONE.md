# 🧪 Guida Test: Alert Profilazione Card 2D

**Data**: 26 Gennaio 2026  
**Obiettivo**: Testare l'alert visivo (colore bordo) su card giocatori campo 2D

---

## 📋 PREREQUISITI

### **Ambiente**
- ✅ Applicazione in esecuzione (`npm run dev`)
- ✅ Autenticazione utente attiva
- ✅ Accesso a pagina "Gestione Formazione" (`/gestione-formazione`)

### **Dati Necessari**
- ✅ Almeno 1 giocatore salvato nel database
- ✅ Possibilità di caricare foto giocatore (card, statistiche, abilità)

---

## 🎯 SCENARI DI TEST

### **Test 1: Slot Vuoto (Grigio - Invariato)**

**Obiettivo**: Verificare che slot vuoti mantengano bordo grigio

**Passi**:
1. Aprire pagina "Gestione Formazione"
2. Identificare uno slot vuoto (senza giocatore assegnato)
3. Verificare colore bordo: **Grigio** (`rgba(148, 163, 184, 0.5)`)
4. Hover su slot vuoto: bordo diventa più scuro (`rgba(148, 163, 184, 0.7)`)

**Risultato Atteso**: ✅ Bordo grigio invariato, nessun cambiamento rispetto a prima

---

### **Test 2: Giocatore Senza photo_slots (Rosso)**

**Obiettivo**: Verificare fallback sicuro per giocatori vecchi

**Setup**:
- Giocatore creato prima dell'implementazione `photo_slots`
- Oppure giocatore con `photo_slots = null` o `undefined`

**Passi**:
1. Assegnare giocatore senza `photo_slots` a uno slot
2. Verificare colore bordo: **Rosso** (`rgba(239, 68, 68, 0.8)`)
3. Hover: bordo diventa `rgba(239, 68, 68, 1.0)`
4. Verificare che drag & drop funzioni ancora

**Risultato Atteso**: ✅ Bordo rosso, indica profilazione incompleta

---

### **Test 3: Giocatore 1/3 Foto (Rosso)**

**Obiettivo**: Verificare alert per profilazione parziale minima

**Setup**:
- Giocatore con solo 1 foto caricata (es: solo `card: true`)

**Passi**:
1. Assegnare giocatore con `photo_slots = { card: true }` a uno slot
2. Verificare colore bordo: **Rosso** (`rgba(239, 68, 68, 0.8)`)
3. Hover: bordo diventa più intenso
4. Verificare che non ci siano errori in console

**Risultato Atteso**: ✅ Bordo rosso, indica profilazione incompleta (1/3)

**Varianti**:
- Solo `statistiche: true` → Rosso
- Solo `abilita: true` → Rosso
- Solo `booster: true` → Rosso

---

### **Test 4: Giocatore 2/3 Foto (Arancione)**

**Obiettivo**: Verificare alert per profilazione parziale avanzata

**Setup**:
- Giocatore con 2 foto caricate (es: `card: true` + `statistiche: true`)

**Passi**:
1. Assegnare giocatore con `photo_slots = { card: true, statistiche: true }` a uno slot
2. Verificare colore bordo: **Arancione** (`rgba(251, 191, 36, 0.8)`)
3. Hover: bordo diventa `rgba(251, 191, 36, 1.0)`
4. Verificare che il colore sia chiaramente distinguibile dal rosso

**Risultato Atteso**: ✅ Bordo arancione, indica profilazione parziale (2/3)

**Varianti**:
- `card: true` + `abilita: true` → Arancione
- `statistiche: true` + `abilita: true` → Arancione
- `card: true` + `booster: true` → Arancione (booster conta come abilita)

---

### **Test 5: Giocatore 3/3 Foto (Verde - Completo)**

**Obiettivo**: Verificare alert per profilazione completa

**Setup**:
- Giocatore con tutte e 3 le foto caricate

**Passi**:
1. Assegnare giocatore con `photo_slots = { card: true, statistiche: true, abilita: true }` a uno slot
2. Verificare colore bordo: **Verde** (`rgba(34, 197, 94, 0.8)`)
3. Hover: bordo diventa `rgba(34, 197, 94, 1.0)`
4. Verificare che il colore sia chiaramente distinguibile

**Risultato Atteso**: ✅ Bordo verde, indica profilazione completa (3/3)

**Varianti**:
- `card: true, statistiche: true, booster: true` → Verde (booster conta come abilita)
- `card: true, statistiche: true, abilita: true, booster: true` → Verde

---

### **Test 6: Transizione Dinamica (Caricamento Foto)**

**Obiettivo**: Verificare che il colore cambi dinamicamente quando si caricano foto

**Passi**:
1. Assegnare giocatore con `photo_slots = {}` (rosso)
2. Caricare foto "Card" → Verificare che rimanga rosso (1/3)
3. Caricare foto "Statistiche" → Verificare che diventi arancione (2/3)
4. Caricare foto "Abilità" → Verificare che diventi verde (3/3)
5. Verificare che il cambio avvenga senza refresh pagina

**Risultato Atteso**: ✅ Colore cambia dinamicamente durante caricamento foto

---

### **Test 7: Hover Interazione**

**Obiettivo**: Verificare che hover funzioni correttamente per tutti i colori

**Passi**:
1. Per ogni colore (grigio, rosso, arancione, verde):
   - Posizionare mouse su card
   - Verificare che bordo diventi più intenso
   - Rimuovere mouse
   - Verificare che bordo torni normale
2. Verificare che non ci siano "flickering" o transizioni brusche

**Risultato Atteso**: ✅ Hover funziona correttamente per tutti i colori

---

### **Test 8: Drag & Drop Non Rotto**

**Obiettivo**: Verificare che drag & drop funzioni ancora correttamente

**Passi**:
1. Trascinare giocatore da riserve a slot (tutti i colori)
2. Trascinare giocatore da slot a slot
3. Trascinare giocatore da slot a riserve
4. Verificare che durante il drag, il bordo sia visibile
5. Verificare che dopo il drop, il colore sia corretto

**Risultato Atteso**: ✅ Drag & drop funziona, colore bordo preservato

---

### **Test 9: Touch Events (Mobile)**

**Obiettivo**: Verificare che funzioni su dispositivi touch

**Passi**:
1. Aprire pagina su dispositivo mobile/tablet
2. Toccare card giocatore
3. Verificare che bordo sia visibile
4. Verificare che drag & drop funzioni con touch

**Risultato Atteso**: ✅ Funziona correttamente su touch devices

---

### **Test 10: Performance**

**Obiettivo**: Verificare che non ci siano problemi di performance

**Passi**:
1. Aprire DevTools → Performance tab
2. Registrare sessione durante interazione con campo 2D
3. Verificare che non ci siano lag o jank
4. Verificare che calcolo colore non causi re-render eccessivi

**Risultato Atteso**: ✅ Nessun problema di performance, calcolo O(1)

---

## 🔍 VERIFICA TECNICA

### **Console Browser**

**Cosa verificare**:
- ✅ Nessun errore JavaScript
- ✅ Nessun warning React
- ✅ Nessun errore di tipo (TypeError, ReferenceError)

**Comandi utili**:
```javascript
// Verificare photo_slots di un giocatore
// (da console browser, dopo aver caricato pagina)
const slots = document.querySelectorAll('[data-slot-index]')
// Oppure ispezionare elemento card e verificare style.borderColor
```

---

### **React DevTools**

**Cosa verificare**:
- ✅ Componente `SlotCard` renderizza correttamente
- ✅ Props `player.photo_slots` passate correttamente
- ✅ Nessun re-render eccessivo

---

### **Network Tab**

**Cosa verificare**:
- ✅ Richieste API per salvare `photo_slots` funzionano
- ✅ Merge `photo_slots` funziona correttamente (non sovrascrive)

---

## 📊 CHECKLIST TEST COMPLETA

### **Test Funzionali**
- [ ] Slot vuoto → Grigio
- [ ] Giocatore senza photo_slots → Rosso
- [ ] Giocatore 1/3 → Rosso
- [ ] Giocatore 2/3 → Arancione
- [ ] Giocatore 3/3 → Verde
- [ ] Transizione dinamica (caricamento foto)
- [ ] Hover funziona per tutti i colori
- [ ] Drag & drop non rotto
- [ ] Touch events funzionano

### **Test Tecnici**
- [ ] Nessun errore console
- [ ] Nessun warning React
- [ ] Performance OK (nessun lag)
- [ ] API photo_slots funzionano
- [ ] Merge photo_slots corretto

### **Test Edge Cases**
- [ ] photo_slots = null → Rosso
- [ ] photo_slots = undefined → Rosso
- [ ] photo_slots = {} → Rosso
- [ ] photo_slots con booster → Gestito correttamente
- [ ] Giocatore vecchio (senza photo_slots) → Rosso

---

## 🐛 PROBLEMI COMUNI E SOLUZIONI

### **Problema 1: Bordo sempre viola (non cambia colore)**

**Possibili cause**:
- Funzione `getProfileBorderColor` non chiamata
- `profileBorderColor` non calcolato prima del return
- Sostituzioni non applicate correttamente

**Soluzione**:
- Verificare che funzione helper sia presente
- Verificare che colori siano calcolati prima del return
- Verificare che sostituzioni siano applicate (3 punti)

---

### **Problema 2: Colore sbagliato (es: verde invece di arancione)**

**Possibili cause**:
- Logica conteggio foto errata
- `photo_slots` non passato correttamente
- Valori boolean non verificati con `=== true`

**Soluzione**:
- Verificare logica `getProfileBorderColor`
- Verificare che `player.photo_slots` sia disponibile
- Verificare che verifica sia `=== true` (non truthy generico)

---

### **Problema 3: Hover non funziona**

**Possibili cause**:
- `profileBorderColorHover` non calcolato
- Handler hover non aggiornato
- Manipolazione DOM non funziona

**Soluzione**:
- Verificare che `profileBorderColorHover` sia calcolato
- Verificare che handler hover usi variabile corretta
- Verificare che manipolazione DOM funzioni

---

### **Problema 4: Drag & drop rotto**

**Possibili cause**:
- Modifiche accidentali a logica drag & drop
- Event handlers interferiscono

**Soluzione**:
- Verificare che logica drag & drop non sia stata modificata
- Verificare che solo colore bordo sia cambiato (non logica)

---

## ✅ CRITERI DI ACCETTAZIONE

**Test considerato PASSATO se**:
- ✅ Tutti i colori funzionano correttamente (grigio, rosso, arancione, verde)
- ✅ Hover funziona per tutti i colori
- ✅ Drag & drop funziona ancora
- ✅ Nessun errore console
- ✅ Performance OK
- ✅ Transizione dinamica funziona (caricamento foto)

---

## 🎯 PROSSIMI PASSI DOPO TEST

**Se tutti i test passano**:
1. ✅ Implementazione completata
2. ✅ Commit e push
3. ✅ Aggiornare documentazione

**Se alcuni test falliscono**:
1. ⚠️ Identificare problema
2. ⚠️ Correggere bug
3. ⚠️ Re-testare
4. ⚠️ Commit fix

---

**Status**: 📝 **GUIDA PRONTA PER TEST**

**Nota**: Questa guida assume che l'implementazione sia già stata completata. Se non è ancora implementata, seguire prima `ANALISI_COMPLESSITA_ALERT_PROFILAZIONE.md` per l'implementazione.
