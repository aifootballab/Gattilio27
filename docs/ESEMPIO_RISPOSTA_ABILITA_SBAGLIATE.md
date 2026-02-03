# Esempio risposta: "Che abilità ho sbagliato nei miei giocatori?"

**Domanda utente**: "Che abilità ho sbagliato nei miei giocatori?"  
**Data verifica**: 2 Febbraio 2026  
**Nota**: Non esiste profilo "Zingaro" in Supabase. Esempio basato su dati reali di **Raphael** (team Levi_Ackerman88), user_id `37fcae7a-6787-4e8c-b593-91951b83764e`.

---

## 1. Dati Supabase (estratto)

### Titolari con skills (slot 0–10)

| Nome | Posizione | Skills (prime 5 mostrate all'IA) |
|------|-----------|----------------------------------|
| Peter Schmeichel | PT | Traiettoria bassa PT, Rilancio del PT, Para-rigori, Leader |
| Alessandro Nesta | DC | Colpo di testa, Marcatore, Intercettazione, Muro, Dominio palle alte |
| Gerard Piqué | DC | Doppio tocco, Passaggio filtrante, Passaggio a scavalcare, Marcatore, Intercettazione |
| Giuseppe Bergomi | DC | Colpo di testa, Marcatore, Intercettazione, Muro, Dominio palle alte |
| Deco | AMF | Doppio tocco, Veronica, Taglia alle spalle e gira, A giro da distante, Tiro dalla distanza |
| Lionel Messi | TRQ | Doppio tocco, A giro da distante, Pallonetto mirato, Tiro a scendere, Tiro dalla distanza |
| Patrick Vieira | MED | Colpo di testa, Passaggio di prima, Passaggio calibrato, Esterno e giro, Intercettazione |
| Edgar Davids | MED | Tiro dalla distanza, Sassata rasoterra, Passaggio di prima, Marcatore, Tornante |
| Neymar Jr | ESA | Finta doppio passo, Doppio tocco, Elastico, Taglia alle spalle e girati, Controllo di suola |
| Johan Cruyff | P | Veronica, Taglia alle spalle e gira, Dribbling fulmine, A giro da distante, Finalizzazione acrobatica |
| George Best | EDE | Doppio tocco, Elastico, Veronica, Taglia alle spalle e gira, Controllo di suola |

**Com_skills** (aggiuntive, esempi): Nesta (Passaggio e scavalcare, Tornante), Bergomi (Disimpegno acrobatico, Distanza, Colpo di tacco), Patrick Vieira (Esperto palle lunghe). *(Nota: nei dati Supabase sono presenti errori di estrazione tipo "Ajo de testa", "Colpo acrobatico"; il documento usa i nomi corretti.)*

---

## 2. Blocco che riceve l'IA (ROSA E DATI)

```
SKILLS TITOLARI:
  Peter Schmeichel: Traiettoria bassa PT, Rilancio del PT, Para-rigori, Leader
  Alessandro Nesta: Colpo di testa, Marcatore, Intercettazione, Muro, Dominio palle alte
  Gerard Piqué: Doppio tocco, Passaggio filtrante, Passaggio a scavalcare, Marcatore, Intercettazione
  Giuseppe Bergomi: Colpo di testa, Marcatore, Intercettazione, Muro, Dominio palle alte
  Deco: Doppio tocco, Veronica, Taglia alle spalle e gira, A giro da distante, Tiro dalla distanza
  Lionel Messi: Doppio tocco, A giro da distante, Pallonetto mirato, Tiro a scendere, Tiro dalla distanza
  Patrick Vieira: Colpo di testa, Passaggio di prima, Passaggio calibrato, Esterno e giro, Intercettazione
  Edgar Davids: Tiro dalla distanza, Sassata rasoterra, Passaggio di prima, Marcatore, Tornante
  Neymar Jr: Finta doppio passo, Doppio tocco, Elastico, Taglia alle spalle e girati, Controllo di suola
  Johan Cruyff: Veronica, Taglia alle spalle e gira, Dribbling fulmine, A giro da distante, Finalizzazione acrobatica
  George Best: Doppio tocco, Elastico, Veronica, Taglia alle spalle e gira, Controllo di suola
```

---

## 3. Interpretazione della domanda

- **"che abilità ho sbagliato"** = consiglio tattico (“quali abilità sono poco adatte al ruolo?”), non richiesta del dato grezzo.
- La risposta standard da paletti (“Per abilità e statistiche apri Gestione Formazione…”) si applica a domande del tipo “che abilità ha X?” / “quale velocità ha Y?”.
- Qui l’IA **ha** le skills nel contesto (SKILLS TITOLARI) e può incrociare con RAG §8.9 (priorità abilità per ruolo) per dare consigli.

---

## 4. Esempio di risposta corretta

**Possibile risposta dell’IA**:

> Dai dati della tua rosa, un paio di spunti: **Piqué** (DC) ha Doppio tocco e Passaggio filtrante – utili per costruzione dal basso, ma per un DC classico priorità sono Intercettazione, Marcatura, Colpo di testa (che hai). **Vieira e Davids** (mediani): Passaggio di prima, Intercettazione, Spirito combattivo – ok. **Messi, Cruyff** – buon mix per attacco.
>
> **In sintesi**: Rosa ben bilanciata; Piqué è più costruttore che stopper puro. Dettagli in Gestione Formazione.
>
> Posso aiutarti con formazione, istruzioni o sostituzioni?

---

## 5. Note sui paletti

| Aspetto | Comportamento |
|---------|---------------|
| **Inventare abilità** | Vietato. L’IA usa solo nomi da §8 e da SKILLS TITOLARI. |
| **Dire “non so”** | Se le skills non fossero nel contesto, redirect a Gestione Formazione. |
| **Tono** | Amichevole, rassicurante, max 3 frasi + “In sintesi”. |
| **Esempi** | 3 domande di follow-up su consigli tattici. |

---

## 6. Possibili typo nei dati Supabase (non presenti in questo utente)

In altri utenti sono stati visti estrazione: `Domino` → Dominio, `Nuro` → Muro, `Ajo de testa` (inesistente), `Colpo acrobatico` per DC → Disimpegno acrobatico. Se l’IA li notasse, può suggerire: “Controlla in Gestione Formazione se le abilità sono trascritte correttamente”.

---

*Documento di esempio per verifica coerenza flusso dati → prompt → risposta.*
