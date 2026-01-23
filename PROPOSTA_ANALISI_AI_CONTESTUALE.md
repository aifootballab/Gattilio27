# Proposta: Analisi AI Contestuale e Motivazionale

**Data:** 23 Gennaio 2026  
**Obiettivo:** Analisi AI che incrocia rosa cliente, formazione avversaria e dati match per supporto decisionale

---

## 🎯 REQUISITI

### 1. **Coerenza con Squadra Cliente**
- ✅ Identificare quale squadra è quella del cliente (usando `client_team_name` o `team_name` profilo)
- ✅ Analizzare statistiche/performance della squadra del cliente (non avversaria)
- ✅ Confrontare con formazione avversaria per capire cosa ha funzionato

### 2. **Coach Motivazionale**
- Tono: incoraggiante ma costruttivo
- Focus: supporto decisionale (cosa cambiare, non archivio dati)
- Personalizzato: usa nome utente, squadra, preferenze

### 3. **Analisi Incrociata**
- **Dati Match**: statistiche, pagelle, aree attacco/recupero
- **Rosa Cliente**: giocatori disponibili con caratteristiche
- **Formazione Avversaria**: per capire tattica e contromisure

### 4. **Domande Intrinseche da Rispondere**
1. **Come è andato il match?** (risultato, performance generale)
2. **Quali giocatori hanno performato bene/male?** (pagelle + confronto con rosa)
3. **Cosa ha funzionato contro questa formazione?** (analisi tattica)
4. **Cosa cambiare per migliorare?** (suggerimenti concreti)
5. **Quali giocatori della rosa potrebbero essere utili?** (suggerimenti basati su rosa)

### 5. **Formato**
- Breve: max 300 parole
- Coerente: analisi logica e strutturata
- Azionabile: suggerimenti concreti

---

## 📊 FLUSSO PROPOSTO

### 1. Recupero Dati Contestuali

```javascript
// 1. Profilo utente (già implementato)
const { data: userProfile } = await admin
  .from('user_profiles')
  .select('first_name, team_name, ai_name, how_to_remember')
  .eq('user_id', userId)
  .maybeSingle()

// 2. Rosa del cliente (NUOVO)
const { data: players } = await admin
  .from('players')
  .select('id, player_name, position, overall_rating, base_stats, skills, com_skills')
  .eq('user_id', userId)
  .order('overall_rating', { ascending: false })

// 3. Formazione avversaria (se presente nel match)
let opponentFormation = null
if (matchData.opponent_formation_id) {
  const { data: formation } = await admin
    .from('opponent_formations')
    .select('formation_name, players, overall_strength, tactical_style')
    .eq('id', matchData.opponent_formation_id)
    .single()
  opponentFormation = formation
}
```

### 2. Identificazione Squadra Cliente nei Dati Match

```javascript
// Identifica quale squadra è quella del cliente
const clientTeamName = userProfile?.team_name || matchData.client_team_name

// Nei dati match, identifica quale è "cliente" vs "avversario"
// player_ratings: { cliente: {...}, avversario: {...} }
// team_stats: potrebbe avere team1/team2 o nomi squadra
```

### 3. Prompt Migliorato

**Esempio Prompt:**

```
Analizza questa partita di eFootball per Attilio e genera un riassunto motivazionale e decisionale.

CONTESTO UTENTE:
- Nome: Attilio
- Squadra: natural born game
- Preferenze: gioco per divertimento ma voglio migliorare

RISULTATO: 6-1

SQUADRA CLIENTE: natural born game
SQUADRA AVVERSARIA: [nome estratto dai dati]

DATI MATCH DISPONIBILI:
- Pagelle Giocatori (cliente): [lista giocatori con voti]
- Pagelle Giocatori (avversario): [lista giocatori con voti]
- Statistiche Squadra: [statistiche cliente vs avversario]
- Aree di Attacco: [zone dove ha attaccato la squadra cliente]
- Zone Recupero: [zone dove ha recuperato palla la squadra cliente]
- Formazione Giocata: [formazione cliente]
- Stile di Gioco: [stile cliente]

ROSA DISPONIBILE:
[lista giocatori con: nome, posizione, overall, skills principali]

FORMAZIONE AVVERSARIA:
[se disponibile: formazione, forza complessiva, stile tattico]

ISTRUZIONI PER L'ANALISI:
1. Identifica chiaramente quale squadra è quella del cliente (natural born game)
2. Analizza le performance della squadra del cliente (non avversaria)
3. Rispondi a queste domande:
   a) Come è andato il match? (risultato, performance generale)
   b) Quali giocatori hanno performato bene/male? (confronta pagelle con rosa disponibile)
   c) Cosa ha funzionato contro questa formazione avversaria? (analisi tattica)
   d) Cosa cambiare per migliorare? (suggerimenti concreti basati su dati)
   e) Quali giocatori della rosa potrebbero essere utili? (suggerimenti basati su rosa)
4. Sii un coach motivazionale: incoraggiante ma costruttivo
5. Focus su supporto decisionale: cosa cambiare, non archivio dati
6. Incrocia i dati: usa rosa, formazione avversaria, statistiche per analisi coerente
7. Max 300 parole, breve ma completo

Formato: Testo continuo, naturale, in italiano, rivolto direttamente ad Attilio.
```

---

## 💡 ESEMPI RISPOSTA ATTESA

### Esempio 1: Vittoria 6-1 con dati completi

> **Attilio, ottima vittoria per 6-1 con la tua natural born game!** 
> 
> L'analisi mostra che la tua squadra ha dominato in attacco con 15 tiri in porta e 65% possesso palla. I tuoi attaccanti hanno performato benissimo: [Nome Giocatore] ha segnato 3 gol con voto 9.0, sfruttando perfettamente le debolezze della formazione avversaria 4-3-3.
> 
> **Cosa ha funzionato:** La tua formazione 4-2-3-1 ha sfruttato i corridoi laterali contro la loro difesa alta. Le zone di attacco mostrano che hai creato pericolo soprattutto dalle fasce, dove i tuoi esterni hanno trovato spazio.
> 
> **Suggerimenti per migliorare:** Considera di inserire [Nome Giocatore dalla Rosa] (overall 85, skills: "Pinpoint Crossing") per rafforzare il lato destro, dove hai recuperato palla spesso ma potresti essere più efficace.
> 
> Continua così, stai migliorando! 💪

### Esempio 2: Sconfitta con dati parziali

> **Attilio, la partita è finita 2-1 per l'avversario, ma ci sono aspetti positivi da cui partire.**
> 
> Con i dati disponibili (60% completezza), vedo che la tua natural born game ha mantenuto buon possesso (58%) ma ha faticato in fase offensiva. [Nome Giocatore] ha performato bene (voto 7.5) ma la squadra ha creato poche occasioni.
> 
> **Cosa migliorare:** Le zone di recupero mostrano che recuperi palla spesso in centrocampo, ma poi perdi il possesso rapidamente. Considera di inserire [Nome Giocatore dalla Rosa] (overall 82, skills: "Through Passing") per migliorare la costruzione del gioco.
> 
> **Nota:** Per suggerimenti più precisi, carica anche le pagelle complete e le statistiche dettagliate.
> 
> Non demordere, ogni partita è un'opportunità per migliorare! 🎯

---

## 🔧 MODIFICHE NECESSARIE

### 1. Recupero Rosa Cliente
```javascript
// In analyze-match/route.js, dopo recupero profilo
const { data: players } = await admin
  .from('players')
  .select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style')
  .eq('user_id', userId)
  .order('overall_rating', { ascending: false })
```

### 2. Recupero Formazione Avversaria
```javascript
// Se match ha opponent_formation_id
let opponentFormation = null
if (matchData.opponent_formation_id) {
  const { data: formation } = await admin
    .from('opponent_formations')
    .select('formation_name, players, overall_strength, tactical_style')
    .eq('id', matchData.opponent_formation_id)
    .single()
  opponentFormation = formation
}
```

### 3. Identificazione Squadra Cliente
```javascript
// Usa client_team_name dal match o team_name dal profilo
const clientTeamName = matchData.client_team_name || userProfile?.team_name

// Nei dati match, identifica quale è cliente
// player_ratings.cliente vs player_ratings.avversario
// team_stats potrebbe avere team1/team2 o nomi squadra
```

### 4. Prompt Migliorato
- Aggiungere sezione "ROSA DISPONIBILE"
- Aggiungere sezione "FORMAZIONE AVVERSARIA" (se disponibile)
- Istruzioni specifiche per rispondere alle 5 domande
- Focus su incrocio dati

---

## ❓ DOMANDE PER CONFERMA

1. **Rosa Cliente**: Recuperare tutti i giocatori o solo titolari?
   - Proposta: Tutti (per suggerire alternative)

2. **Formazione Avversaria**: Sempre presente o opzionale?
   - Proposta: Opzionale (se presente, usarla per analisi tattica)

3. **Lunghezza Analisi**: 300 parole è ok o preferisci più breve?
   - Proposta: 250-300 parole (breve ma completo)

4. **Tono**: Più motivazionale o più tecnico?
   - Proposta: Bilanciato (motivazionale ma con dati tecnici)

---

## ✅ PROSSIMI PASSI

1. ✅ Aspetto conferma su approccio
2. Implemento recupero rosa e formazione avversaria
3. Miglioro prompt con contesto completo
4. Testo con match reali
5. Aggiusto tono e formato in base a feedback

**Dimmi se l'approccio ti convince e procedo con l'implementazione!** 🚀
