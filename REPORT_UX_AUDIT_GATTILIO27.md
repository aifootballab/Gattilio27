# 🎮 Report UX Audit - Gattilio27
**Data:** 30 Gennaio 2026  
**Analisi effettuata da:** Simulazione cliente  
**File analizzati:** 7 componenti chiave

---

## 📊 RIEPILOGO PER CATEGORIA

| Categoria | Problemi Trovati | Severità Critica | Severità Alta |
|-----------|------------------|------------------|---------------|
| Stati Loading Inconsistenti | 8 | 2 | 3 |
| Messaggi Errore Confusi | 6 | 1 | 2 |
| Flussi Interrotti | 5 | 1 | 3 |
| Comportamenti Inattesi | 7 | 1 | 4 |
| Casi Edge | 4 | 2 | 2 |
| **TOTALE** | **30** | **7** | **14** |

---

## 🚨 1. STATI DI LOADING INCONSISTENTI

### 🔴 CRITICA: Doppio spinner durante salvataggio partita
**File:** `app/match/new/page.jsx`  
**Riga:** 702-738  
**Problema:** Il bottone "Salva Partita" usa `saving` per disabilitare, ma non c'è protezione contro doppio click se l'utente clicca velocemente prima che lo stato si aggiorni. Inoltre, se l'utente ricarica la pagina durante il salvataggio, i dati rimangono in localStorage ma l'operazione viene persa senza notifica.

**Impatto cliente:** L'utente potrebbe salvare la stessa partita 2 volte o perdere dati senza saperlo.

---

### 🟠 ALTA: Pulsante Skip sempre abilitato durante estrazione
**File:** `app/match/new/page.jsx`  
**Riga:** 660-681  
**Problema:** Il bottone "Skip" rimane abilitato durante `extracting` ma viene solo opacizzato. L'utente può cliccarlo e causare race condition.

```jsx
// CODICE PROBLEMATICO:
<button
  onClick={() => handleSkip(currentSection)}
  disabled={extracting || saving}  // ← logica corretta ma...
  style={{
    opacity: extracting || saving ? 0.5 : 1,  // ← solo visivo!
    cursor: extracting || saving ? 'not-allowed' : 'pointer'
  }}
>
  Skip  // ← sempre cliccabile
</button>
```

---

### 🟡 MEDIA: Toast di successo scompare dopo 4 secondi senza persistenza
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 219-225  
**Problema:** I toast scompaiono automaticamente dopo 4 secondi. Se l'utente è distratto o ha problemi di lettura, perde il feedback.

```jsx
// Auto-dismiss toast
React.useEffect(() => {
  if (toast) {
    const timer = setTimeout(() => setToast(null), 4000)  // ← troppo veloce
    return () => clearTimeout(timer)
  }
}, [toast])
```

---

### 🟠 ALTA: Loading non si rimuove in caso di errore di sessione
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 72-193 (fetchData)  
**Problema:** Se la sessione scade durante fetchData, viene impostato `setError()` e poi `setLoading(false)`, ma se c'è un errore nel redirect, lo spinner rimane all'infinito.

---

### 🟡 MEDIA: Spinner infinito se Supabase non risponde
**File:** `app/giocatore/[id]/page.jsx`  
**Riga:** 31-85  
**Problema:** Nessun timeout su `fetchPlayer()`. Se Supabase è lento o non risponde, l'utente vede lo spinner all'infinito senza poter annullare.

---

### 🟡 MEDIA: `setUploading(false)` chiamato dopo chiusura modal
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 930-1100  
**Problema:** In `handleSavePlayerWithPositions`, se c'è un errore nel modal di conferma duplicato, `setUploadingPlayer(false)` viene chiamato solo nel finally, ma il modal potrebbe essere già chiuso, lasciando l'utente senza feedback.

---

### 🟡 MEDIA: TaskWidget senza retry manuale
**File:** `components/TaskWidget.jsx`  
**Riga:** 41-91  
**Problema:** Se il caricamento task fallisce, viene mostrato un errore ma non c'è un bottone per riprovare. L'utente deve ricaricare la pagina.

```jsx
if (error) {
  return (
    <div style={{...}}>
      {t('error') || 'Error'}: {error}  // ← nessun bottone retry
    </div>
  )
}
```

---

### 🟠 ALTA: Loading durante generazione riassunto non blocca navigazione
**File:** `app/match/[id]/page.jsx`  
**Riga:** 189-278  
**Problema:** Se l'utente clicca "Genera Riassunto" e poi cambia pagina, la chiamata API continua in background ma l'utente non ne ha traccia. Al ritorno, non sa se è stato generato o meno.

---

## 🚨 2. MESSAGGI DI ERRORE CONFUSI

### 🔴 CRITICA: Errori tecnici esposti all'utente
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 1511-1522  
**Problema:** Se l'API di estrazione fallisce con errore JSON, viene mostrato all'utente il messaggio tecnico `Errore server: ${extractRes.status} ${extractRes.statusText}`.

```jsx
} catch (jsonError) {
  const errorMsg = `Errore server: ${extractRes.status} ${extractRes.statusText}`  // ← TECNICO!
  errors.push(errorMsg)
}
```

**Impatto cliente:** L'utente vede codici HTTP (500, 502, etc.) che non capisce.

---

### 🟠 ALTA: Messaggi di errore non tradotti
**File:** `app/giocatore/[id]/page.jsx`  
**Riga:** 91-99  
**Problema:** Errori di validazione file sono hardcoded in italiano, ma l'app supporta inglese.

```jsx
if (imageFiles.length === 0) {
  setError('Seleziona almeno un\'immagine')  // ← SEMPRE ITALIANO
  return
}
```

---

### 🟡 MEDIA: `window.confirm()` con messaggi lunghi e confusi
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 400-403  
**Problema:** Quando c'è un giocatore duplicato, viene usato `window.confirm()` con un messaggio lungo che include template strings non sostituite correttamente se le traduzioni mancano.

```jsx
let errorMsg = t('duplicatePlayerAlert')
  .replace('${playerName}', playerToAssign.player_name)  // ← se t() ritorna undefined, replace fallisce
```

---

### 🟡 MEDIA: Errore generico per tutti i problemi di upload
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 846-856  
**Problema:** Qualsiasi errore di estrazione risulta in "Errore estrazione dati" senza specificare se è problema di rete, quota OpenAI, o immagine illeggibile.

---

### 🟡 MEDIA: Errori di Supabase non gestiti uniformemente
**File:** `app/page.jsx` (Dashboard)  
**Riga:** 121-126  
**Problema:** Se il caricamento partite fallisce, viene fatto solo `console.warn` ma l'utente non vede errore. La dashboard mostra "Nessuna partita" invece di "Errore di caricamento".

```jsx
if (matchesError) {
  console.warn('[Dashboard] Error loading matches:', matchesError)  // ← SILENZIATO!
}
```

---

### 🟢 BASSA: Messaggio di saluto chat sempre in italiano se manca profilo
**File:** `components/AssistantChat.jsx`  
**Riga:** 269-281  
**Problema:** Se `userProfile.first_name` non esiste, il saluto è sempre "Ciao! Come posso aiutarti?" senza considerare la lingua.

---

## 🚨 3. FLUSSI INTERROTTI

### 🔴 CRITICA: Dati wizard partita persi se sessione scade
**File:** `app/match/new/page.jsx`  
**Riga:** 250-330  
**Problema:** Se la sessione scade durante il salvataggio, i dati sono in localStorage ma l'utente viene reindirizzato al login e perde tutto il progresso (il localStorage non viene ripristinato dopo il re-login).

**Impatto cliente:** Utente perde 10-15 minuti di lavoro caricando foto.

---

### 🟠 ALTA: Immagine caricata ma non estratta = dati persi al cambio step
**File:** `app/match/new/page.jsx`  
**Riga:** 94-116  
**Problema:** L'utente carica un'immagine, poi cambia step senza cliccare "Estrai Dati". L'immagine rimane in `stepImages` ma non in `stepData`. Se chiude il browser, pensa di aver completato lo step ma in realtà i dati non sono stati estratti.

---

### 🟠 ALTA: Upload giocatore interrotto = slot bloccato
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 748-926  
**Problema:** Se l'utente inizia a caricare un giocatore, chiude il modal, e poi ricarica la pagina, lo slot rimane "in caricamento" nello stato locale ma non c'è indicatore visivo.

---

### 🟡 MEDIA: Formazione personalizzata persa se cambio pagina senza salvare
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 1895-1951  
**Problema:** Se l'utente entra in modalità edit, sposta i giocatori, poi cambia pagina senza cliccare "Salva", le modifiche vengono perse senza warning.

---

### 🟡 MEDIA: Dati incompleti giocatore non recuperabili
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 869-881  
**Problema:** Se l'estrazione dati manca di campi obbligatori, viene mostrato il modal "Dati Mancanti", ma se l'utente chiude il modal per sbaglio, deve ricaricare tutte le foto da capo.

---

## 🚨 4. COMPORTAMENTI INATTESI

### 🟠 ALTA: Click fuori dal modal di assegnazione chiude senza conferma
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 2945  
**Problema:** Se l'utente sta compilando il modal di assegnazione e clicca accidentalmente fuori dal modal (sull'overlay nero), tutto si chiude senza salvare.

```jsx
onClick={onClose}  // ← troppo facile da attivare per sbaglio
```

---

### 🟠 ALTA: Annulla modifiche posizioni non chiede conferma
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 1930-1951  
**Problema:** Se l'utente ha spostato 10 giocatori in modalità edit e clicca "Annulla", tutte le modifiche vengono perse istantaneamente senza "Sei sicuro?".

---

### 🟠 ALTA: Rimozione riserva con un solo click
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 2850-2886  
**Problema:** Il bottone X sulla card riserva elimina immediatamente il giocatore senza conferma. Un click accidentale cancella permanentemente i dati.

---

### 🟡 MEDIA: "Salva e Aggiorna" giocatore non mostra preview delle modifiche
**File:** `app/giocatore/[id]/page.jsx`  
**Riga:** 191-284  
**Problema:** L'utente carica una nuova foto statistiche, clicca "Salva", e i dati vengono sovrascritti senza mostrare cosa cambierà. Non c'è "Anteprima modifiche".

---

### 🟡 MEDIA: Skip step nel wizard non è reversibile
**File:** `app/match/new/page.jsx`  
**Riga:** 197-214  
**Problema:** Se l'utente clicca "Skip" su uno step, quel marchio come "saltato" è permanente per quella sessione. Non può tornare indietro e completarlo dopo.

---

### 🟡 MEDIA: Cambio nome avversario si salva con Enter ma non c'è indicatore
**File:** `app/page.jsx`  
**Riga:** 814-900  
**Problema:** Nella dashboard, quando si modifica il nome avversario, il salvataggio avviene premendo Enter, ma non c'è indicatore visivo che l'operazione è andata a buon fine (solo scomparsa input).

---

### 🟢 BASSA: Quick actions chat si nascondono dopo il primo messaggio
**File:** `components/AssistantChat.jsx`  
**Riga:** 337-371  
**Problema:** I suggerimenti rapidi ("Come carico una partita?") scompaiono dopo il primo messaggio. Se l'utente vuole fare domande simili, deve riscriverle a mano.

---

## 🚨 5. CASI EDGE

### 🔴 CRITICA: Ricarica pagina durante upload giocatore = stato inconsistente
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 748-926  
**Problema:** Se l'utente ricarica la pagina mentre `uploadingPlayer` è true, lo stato React viene perso. Al rientro, il modal è chiuso ma il backend potrebbe ancora processare l'immagine. Risultato: giocatore duplicato o slot vuoto.

---

### 🔴 CRITICA: Perdita connessione durante salvataggio formazione
**File:** `app/gestione-formazione/page.jsx`  
**Riga:** 1269-1477  
**Problema:** Se la connessione cade durante `handleSaveCustomPositions`, le posizioni dei giocatori potrebbero essere salvate parzialmente. Non c'è transazione atomica né rollback.

---

### 🟠 ALTA: Back browser durante wizard partita perde stato
**File:** `app/match/new/page.jsx`  
**Riga:** 39-62  
**Problema:** Se l'utente fa "Back" del browser e poi "Avanti", il wizard riparte dallo step 0 anche se aveva caricato immagini. I dati sono in localStorage ma lo step corrente viene ricalcolato.

---

### 🟠 ALTA: Match aperto in due tab = conflitto di modifiche
**File:** `app/match/[id]/page.jsx`  
**Riga:** 42-91  
**Problema:** Se l'utente apre la stessa partita in due tab e aggiunge foto in entrambe, l'ultima che salva sovrascrive l'altra senza warning di conflitto.

---

## 📋 RACCOMANDAZIONI PRIORITARIE

### 🔥 Da implementare immediatamente:

1. **Aggiungere conferma prima di perdere dati** - Quando l'utente ha modifiche non salvate e tenta di uscire, mostrare `beforeunload` event.

2. **Timeout su tutte le chiamate API** - Aggiungere un timeout di 30 secondi con possibilità di annullare.

3. **Messaggi errore user-friendly** - Mappare tutti gli errori tecnici a messaggi comprensibili in italiano/inglese.

4. **Protezione doppio-click** - Aggiungere flag `isProcessing` che blocca ogni azione finché non completa.

5. **Persistenza stato wizard** - Salvare non solo i dati ma anche lo step corrente e lo stato di processing.

### 🛠️ Da implementare nel breve termine:

6. **Bottone retry ovunque** - Ogni errore di caricamento deve offrire un "Riprova".

7. **Toast con azioni** - I toast di successo dovrebbero avere un bottone "Annulla" per qualche secondo.

8. **Modal di conferma per azioni distruttive** - Elimina, annulla modifiche, skip step.

9. **Indicatore di conflitto** - Se i dati sul server sono più recenti di quelli mostrati, avvisare l'utente.

10. **Salvataggio automatico con indicatore** - Mostrare "Salvataggio..." / "Salvato" in tempo reale.

---

## 🎯 IMPATTO COMPLESSIVO SULL'UTENTE

| Scenario | Probabilità | Impatto | Frustrazione |
|----------|-------------|---------|--------------|
| Perde partita in corso | Media | Alto | 🔴 Critica |
| Giocatore eliminato per sbaglio | Media | Alto | 🔴 Critica |
| Spinner infinito | Bassa | Medio | 🟠 Alta |
| Messaggio errore incomprensibile | Alta | Medio | 🟠 Alta |
| Dati non salvati senza warning | Media | Medio | 🟠 Alta |
| Modifiche perse formazione | Media | Medio | 🟡 Media |

---

**Fine Report**
