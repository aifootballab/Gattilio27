# Contesto di Progetto per Cursor (eFootball Platform)

## Scopo del Progetto

La piattaforma eFootball in sviluppo è un prodotto SaaS costruito con React + Vite e distribuito su Vercel. Utilizza Supabase come database e servizio di autenticazione. Il repository Git principale è `aifootballab/Gattilio27`. L'obiettivo è permettere agli utenti di gestire la propria rosa di giocatori, profilare ogni atleta e ottenere suggerimenti tattici e di sviluppo.

---

## Concetti Fondamentali

### 1. PlayerProfileInSquad

Non esiste un "Giocatore generico"; ogni giocatore viene rappresentato da un profilo nella rosa che combina dati fissi (anagrafica) con scelte dell'utente.

Distinguere chiaramente tra:

- **Dati deterministici**: nome, nazionalità, altezza, età, piede preferito, posizioni base. Questi non cambiano e vengono confermati una sola volta.

- **Dati configurabili dall'utente**: tipo di carta, livello attuale e massimo, booster attivi, skill equipaggiate, stile di gioco IA. Cambiano in base alle scelte dell'utente.

- **Dati derivati**: valori di attacco/difesa/atletica, ruoli effettivi, profilo tattico. Si calcolano a partire dai dati configurati.

- **Campi opzionali/incompleti**: non tutti i campi devono essere presenti; l'assenza di un'informazione deve essere gestita senza errori.

---

### 2. Profilazione Progressiva

L'AI non deve mai salvare direttamente dati non confermati. Deve estrarre solo ciò che è visibile o dichiarato (da immagini, OCR o voce) e restituire un JSON strutturato con `value`, `status` (certain/uncertain/missing) e `confidence` per ogni campo.

I campi con `status=missing` o `status=uncertain` devono essere segnalati all'utente, che può completare o correggere manualmente. Solo i campi confermati dall'utente vengono persistiti.

Lo stato del profilo giocatore attraversa una state machine:
- `empty` → `suggested` → `editing` (facoltativo) → `confirmed` → `error`

Una volta confermato, il profilo diventa di sola lettura.

---

### 3. Persistenza e Memoria

Tutti i dati persistenti risiedono in Supabase. L'AI non ha memoria autonoma tra le sessioni; per "ricordare" un cliente bisogna ricaricare dal database profili, note e preferenze.

Salvare solo informazioni ad alto valore: livello coaching (beginner/intermedio/avanzato), stile di gioco preferito, pain points ricorrenti, snapshot della rosa e dei set tattici.

I dati vengono salvati solo dopo esplicita conferma dell'utente; mai in automatico.

---

### 4. Uso di GPT in Tempo Reale

GPT-Realtime viene utilizzato per estrarre dati da input vocali e testuali e per fornire coaching durante la partita.

- **In fase di acquisizione**: produce un `CandidateProfile` con campi compilati e una lista di campi mancanti. Non deve inventare valori per dati non osservati.

- **In fase di coaching**: deve tenere conto del profilo utente (stilato da Supabase) per adattare il tono e i suggerimenti (es. brevi spiegazioni per principianti, consigli avanzati per utenti esperti).

---

### 5. Interfaccia Utente (Concetti, Non Grafica)

La UI mostra sempre una preview card compatta a sinistra e un pannello di dettaglio a destra. Il pannello contiene tab come Sviluppo, Booster, Statistiche e consente di scorrere i contenuti senza perdere il contesto.

I campi vengono presentati in modo chiaro con badge che indicano se sono certi, incerti o mancanti. L'utente deve poter confermare o modificare prima del salvataggio.

Non sono consentite azioni che portino a salvataggi nascosti o a passaggi di stato non previsti.

---

## Regole da Seguire per Cursor

1. **Non assumere che i dati siano completi**. Il sistema deve funzionare con profili incompleti; l'AI deve presentare i campi mancanti e chiedere input.

2. **Non salvare mai in Supabase senza conferma esplicita**. I salvataggi avvengono solo in stato `confirmed`.

3. **Non indovinare valori**. Se un campo non è visibile/udibile, impostare `value=null` e `status=missing`.

4. **Separare i livelli di verità**: dati deterministici vs configurabili vs derivati vs mancanti.

5. **Forzare la coerenza tipologica**: tutte le skill, booster e stili devono corrispondere a dizionari canonici per evitare varianti non standard.

6. **Usare empatia e contesto**. Quando si interagisce con l'utente, adattare il tono in base al livello e allo stato emotivo rilevato (es. frustrazione durante la partita).

---

**Data**: 2025-01-12  
**Status**: 📋 Documento di riferimento per sviluppo futuro
