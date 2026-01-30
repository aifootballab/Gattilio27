# 🧪 GUIDA TEST - Modifiche Gattilio27

**Ultimo aggiornamento:** 2026-01-30  
**Commit da testare:** `ae38cd6`

---

## 📋 Prerequisiti

```bash
# 1. Assicurati di avere Node.js 18+
node --version  # Deve essere >= 18.0.0

# 2. Installa dipendenze (se non l'hai già fatto)
npm install

# 3. Verifica variabili ambiente
cp .env.example .env.local
# Modifica .env.local con le tue credenziali Supabase
```

---

## 🚀 Step 1: Avvio Ambiente Locale

```bash
# Avvia server di sviluppo
npm run dev

# L'app sarà disponibile su:
# → http://localhost:3000
```

**Verifica avvio corretto:**
- [ ] Nessun errore rosso in console
- [ ] Pagina login si carica
- [ ] Puoi fare login (ospiti o email)

---

## 🧪 Step 2: Test Modifiche Specifiche

### TEST A: Verifica Blocco Doppio Click (RC-004)

**Scenario:** Giocatore in riserva → Assegnazione a slot

```
1. Vai su "Gestione Formazione"
2. Assicurati di avere almeno una riserva caricata
3. Apri DevTools (F12) → Network tab
4. Clicca su uno slot vuoto
5. Seleziona una riserva da assegnare
6. Clicca RAPIDAMENTE 2-3 volte sul pulsante di conferma
```

**Risultato atteso:**
- ✅ Solo UNA chiamata API in Network tab
- ✅ Pulsante disabilitato durante l'operazione
- ✅ Toast "Giocatore assegnato" appare una sola volta

**Risultato negativo (BUG):**
- ❌ Multiple chiamate API
- ❌ Toast duplicati
- ❌ Giocatore assegnato più volte

---

### TEST B: Verifica ConfirmModal (nuovo componente)

**Scenario:** Testare che il ConfirmModal si renderizzi correttamente

```
1. Vai su "Gestione Formazione"
2. Prova a caricare un giocatore duplicato (stesso nome+età)
```

**Cosa cercare:**
- Il modal di conferma duplicato appare (già esistente prima)
- Stile coerente con il resto dell'app
- Pulsanti funzionanti

**Nota:** I window.confirm generici non sono ancora sostituiti (RC-002 pendente).

---

### TEST C: Test Errori User-Friendly

**Scenario:** Simulare errori API

```
1. Apri DevTools (F12) → Console
2. Esegui questo codice per testare la mappatura errori:
```

```javascript
// Test in console browser
import('/lib/errorHelper.js').then(m => {
  console.log(m.mapErrorToUserMessage({message: 'Quota OpenAI esaurita'}));
  console.log(m.mapErrorToUserMessage({message: 'timeout'}));
  console.log(m.mapErrorToUserMessage({message: '500 Internal Server Error'}));
});
```

**Risultato atteso:**
```javascript
{message: "Servizio momentaneamente sovraccarico...", code: "QUOTA_EXCEEDED"}
{message: "Connessione lenta o interrotta...", code: "NETWORK_ERROR"}
{message: "Errore del server. Riprova tra poco.", code: "SERVER_ERROR"}
```

---

### TEST D: Test Memory Leak (useIsMounted)

**Scenario:** Verificare che non ci siano memory leak

```
1. Vai su "Gestione Formazione"
2. Carica un giocatore (upload foto)
3. Mentre carica, naviga rapidamente su Dashboard
4. Torna indietro su Gestione Formazione
5. Ripeti 5-10 volte
```

**Verifica in DevTools:**
```
1. Memory tab → Take heap snapshot
2. Cerca "GestioneFormazione" o componenti React
3. Non dovrebbero esserci istanze pendenti
```

**Risultato atteso:**
- ✅ Nessun warning in console "Can't perform a React state update..."
- ✅ Memoria stabile dopo navigazioni ripetute

---

## 🔍 Step 3: Test Funzionalità Core

Devi verificare che le funzionalità principali FUNZIONINO ancora:

### Test 1: Upload Giocatore
```
1. Gestione Formazione → Clicca slot vuoto
2. Carica screenshot giocatore
3. Completa flusso fino a salvataggio
4. Verifica giocatore appaia nella lista
```

### Test 2: Assegnazione Riserva
```
1. Gestione Formazione → Sezione riserve
2. Clicca su una riserva
3. Assegna a slot libero
4. Verifica spostamento corretto
```

### Test 3: Wizard Partita
```
1. Dashboard → Aggiungi Partita
2. Completa tutti i 5 step
3. Salva partita
4. Verifica appaia in lista partite
```

### Test 4: Chat AI
```
1. Apri chat (pulsante cervello)
2. Scrivi un messaggio
3. Verifica risposta arrivi
4. Cambia pagina, torna indietro
```

---

## 🐛 Step 4: Come Riportare Bug

Se trovi un problema, copia questo template:

```markdown
**Bug:** [Breve descrizione]
**File:** [es. app/gestione-formazione/page.jsx]
**Riga:** [numero riga se noto]
**Browser:** [Chrome/Firefox/Safari]
**Passi per riprodurre:**
1. 
2. 
3. 

**Errore console:**
```
[Incolla stack trace]
```

**Screenshot:** [allega se utile]
```

---

## 🚨 Rollback (Se Qualcosa Va Storto)

Se l'app si rompe irreparabilmente:

```bash
# Torna al commit precedente
git reset --hard HEAD~1

# Oppure torna a un commit specifico stabile
git reset --hard 46bfb80

# Poi reinstalla dipendenze
rm -rf node_modules package-lock.json
npm install

# Riavvia
npm run dev
```

---

## ✅ Checklist Finale

Prima di dire "tutto OK", verifica:

- [ ] App si avvia senza errori
- [ ] Login funziona
- [ ] Upload giocatore funziona
- [ ] Assegnazione slot funziona
- [ ] Wizard partite funziona
- [ ] Chat AI funziona
- [ ] Nessun errore in console (tranne warning accettabili)
- [ ] Blocco doppio click funziona (TEST A)

---

## 📞 Supporto

Se qualcosa non funziona:
1. Controlla prima la console del browser (F12)
2. Verifica che Supabase sia raggiungibile
3. Controlla che le env vars siano corrette
4. Riavvia il server (`Ctrl+C` e `npm run dev`)

---

**Buon testing!** 🚀
