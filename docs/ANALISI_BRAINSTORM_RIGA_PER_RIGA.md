# Analisi Brainstorm Documento – Riga per Riga

**Data**: 2 Febbraio 2026  
**Riferimento**: BRAINSTORM_DOCUMENTO.md (Matti v5.2.2)  
**Obiettivo**: Classificare ogni blocco per integrazione in info_rag, con separazione netta:
- **STILI GIOCATORE** (caratteristica card, FISSI) vs **STILI SQUADRA** (tattica, configurabili)
- **ABILITÀ NATIVE** (incluse nella card) vs **ABILITÀ AGGIUNGIBILI** (Programmi Aggiunta Abilità)

**Regola**: Nessuna citazione fonti (Mattiotti, Gambler, PRO). Contenuto in formato neutro.

---

## SEPARAZIONI CHIAVE

| Concetto | A | B | Dove in info_rag |
|----------|---|---|------------------|
| **Stili giocatore** | Caratteristica card, FISSI | Opportunista, Box-to-Box, Collante, Incontrista | §2 |
| **Stili squadra** | Tattica configurabile | Possesso, Contropiede, Vie laterali, Passaggio lungo | §4 |
| **Abilità native** | Incluse nella card alla nascita | Non modificabili | §8 (elenco) |
| **Abilità aggiungibili** | Tramite Programmi Aggiunta Abilità | Non per Trending, max 6 totali | §8.8 |

---

## LEGENDA

| Simbolo | Significato |
|---------|-------------|
| ✅ | OK – Integrare così (adattando terminologia/citazioni) |
| 🔧 | Adattare – utile ma richiede rielaborazione |
| ❌ | Scartare – fuori perimetro |
| 🔄 | Ridondante – già in info_rag |

| Destinazione | Sezione info_rag |
|--------------|------------------|
| §2 | STILI GIOCATORE |
| §4 | STILI SQUADRA |
| §8 | ABILITÀ GIOCATORI |
| §1 | STATISTICHE |
| §7 | MECCANICHE |
| §10 | NOTE CRITICHE |
| §3 | MODULI |
| §5 | ISTRUZIONI |
| §6 | CALCI PIAZZATI |
| §9 | COMPETENZE |

---

## REGOLA DESCRIZIONI RICCHE (FONDAMENTALE)

Le definizioni con **Quando serve** / **Perché** / **Utilizzo** / **Comportamento** servono all'IA per:
- Capire **quando** suggerire un certo stile, abilità o tattica
- Motivare **perché** quel consiglio
- Incrociare con formazione, stile squadra, avversario

**NON ridurre** queste descrizioni. **Integrare** mantenendo il dettaglio: posizionamento, movimento, utilizzo, quando serve, comportamento. Sono la base per suggerimenti corretti.

Valido per: Stili giocatore (§2), Stili squadra (§4), Abilità (§8), Contromisure (§10).

---

# PARTE A: STILI GIOCATORE (Caratteristica card – FISSI)

**≠ Stili squadra** (Possesso, Contropiede, Vie laterali, ecc.) → quelli in PARTE B.

---

## A.1 Brainstorm righe 47-93 – Stili Attaccanti e Centrocampisti

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 51-56 | Opportunista (P) – posizionamento, movimento, utilizzo, quando serve | ✅ | **Integrare TUTTO**: posizionamento linea difensori, scatta verso porta, passaggi filtranti, palle profondità, gioco veloce/contropiede | §2 |
| 58-63 | Opportunista (P) – movimento, crea caos area, gioco diretto | ✅ | **Unificare** con 51-56 in una descrizione ricca: corre verso porta, sovraffolla area, crea caos, gioco diretto/aggressivo | §2 |
| 65-70 | Classico n° 10 (SP/TRQ) – caratteristica, movimento, utilizzo, quando serve | ✅ | **Integrare TUTTO**: playmaking, passaggi intelligenti, gioco lento e ragionato, possesso, meno difensivo | §2 |
| 72-77 | Regista Creativo (Fantasista) – movimento, comportamento, utilizzo | ✅ | **Integrare TUTTO**: si muove liberamente, cerca spazi, disorganizza difesa, imprevedibilità offensiva | §2 |
| 81-86 | Box-to-Box – movimento, comportamento, utilizzo, quando serve | ✅ | **Integrare TUTTO**: copre tutto il campo, fase difensiva+offensiva, equilibrio, copertura totale, alta resistenza | §2 |
| 89-94 | **Difensore Distruttore** | ❌ | Termine non ufficiale. In info_rag usiamo **Incontrista**. NON integrare | — |

---

## A.2 Brainstorm righe 478-547 – Playstyles Giocatori (terminologia EN)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 482-486 | POACHER | ✅ | Sinonimo Opportunista. **Integrare** focus, quando serve: positioning in area, quick finishing su cross/rebounds, midfielders/wingers che forniscono | §2 |
| 488-492 | TARGET MAN | ✅ | Sinonimo **Fulcro di gioco**. **Integrare** physical presence, hold-up play, aereo, crea spazio per wide/AMF | §2 |
| 494-498 | DEEP-LYING FORWARD | ✅ | Sinonimo **Punta arretrata**. **Integrare** drops in midfield, possession-heavy, paired con wide forwards veloci | §2 |
| 500-502 | WIDE FORWARD | ✅ | Vicino **Ala prolifica**. **Integrare** flank player, 1v1 dribbles, speed, stamina per stretch defense | §2 |
| 504-507 | COMPLETE FORWARD | 🔧 | Verificare se esiste in eFootball. **Integrare** se sì: multifaceted, positioning+movement+finishing | §2 |
| 510-513 | PLAYMAKER | ✅ | Classico n° 10 / Regista. **Integrare** dictate tempo, control possession, unlock defenses | §2 |
| 515-518 | ORCHESTRATOR | ✅ | Sinonimo **Sviluppo**. **Integrare** deep-lying creators, build from back, long passing range | §2 |
| 520-525 | ANCHOR MAN | ✅ | Sinonimo **Collante**. **Integrare** shield back line, resta back sempre, crucial per Out Wide solidità | §2 |
| 527-533 | BOX-TO-BOX | ✅ | Integrare descrizione ricca: contribute both ends, recover possession, arrive late box, stamina, usable in almost any formation | §2 |
| 535-541 | HOLE PLAYER | 🔧 | Sinonimo di **Giocatore chiave** | §2 |
| 543-547 | BALANCE CENTROCAMPO | ✅ | Principio utile: "ogni midfield playstyle si comporta diversamente, complementarsi" | §2 o §10 |

**Regola**: Usare sempre nome ufficiale IT. EN tra parentesi solo come riferimento: *(Poacher)*.

---

## A.3 Stili da NON confondere con Stili Squadra

| Brainstorm | È Stile Giocatore? | È Stile Squadra? |
|------------|--------------------|------------------|
| Opportunista, Box-to-Box, Collante | ✅ SÌ | ❌ |
| Contropiede Veloce, Possesso, Out Wide | ❌ | ✅ SÌ |
| Quick Counter, Long Ball, Possession | ❌ | ✅ SÌ (nomi EN stili squadra) |

---

# PARTE B: STILI SQUADRA (Tattica – configurabili)

**≠ Stili giocatore** (Opportunista, Collante, ecc.) → quelli in PARTE A.

---

## B.1 Brainstorm righe 872-891 – Stili Squadra base

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 874-878 | Contropiede Veloce | ✅ | Già in info_rag §4.1 | §4 |
| 880-884 | Controllo Possesso | ✅ | Già come Possesso palla | §4 |
| 886-890 | Gioco Diretto | ✅ | Vicino a Passaggio lungo / Attacco diretto | §4 |

---

## B.2 Brainstorm righe 412-476 – Out Wide (Vie Laterali)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 414-421 | Principio base Out Wide | ✅ | Integrare in §4 Vie laterali: attacco attraverso fasce | §4 |
| 423-430 | Tattica inganno (primi 20-30 min fascia, poi centro) | ❌ | Decisione **durante** partita. Fuori perimetro | — |
| 432-436 | Fase attacco Out Wide | ✅ | Cross base tattica, supporto centro su fasce | §4 |
| 438-444 | Fase difesa Out Wide | ✅ | Difesa si concentra al centro, densità centrocampo | §4 |
| 461-465 | Ruoli Out Wide (OFB, Roaming Flank, Anchorman) | ✅ | Collante obbligatorio per Out Wide? Verificare | §4 |
| 472-477 | NON solo cross spam | ✅ | Out Wide = equilibrio fasce e centro | §4 |

---

## B.3 Stili Squadra – Contromisure (righe 2855-2881)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 2858-2862 | Contromisura Possesso Palla | ✅ | Indicatori, punti deboli, contromisura | Nuova sez. o §10 |
| 2864-2868 | Contromisura Contropiede | ✅ | Idem | Nuova sez. o §10 |
| 2870-2874 | Contromisura Long Ball | ✅ | Idem | Nuova sez. o §10 |
| 2876-2881 | Contromisura Wing Play (Ala Corta) | ✅ | "Ala Corta" = Vie laterali. Usare nome ufficiale | §4 o §10 |

---

# PARTE C: ABILITÀ – Native vs Aggiungibili

**Regola info_rag**:
- **Native**: incluse nella card alla nascita. FISSE.
- **Aggiungibili**: tramite Programmi Aggiunta Abilità. NON per Trending. Max 6 totali.

---

## C.1 Split concettuale

| Tipo | Cosa sono | Modificabile? |
|------|-----------|---------------|
| **Abilità native** | Quelle con cui la card nasce | No |
| **Abilità aggiungibili** | Stesso pool, ma apprese tramite Programmi | Sì (tranne Trending) |

*La stessa abilità (es. Intercettazione) può essere native su una card e aggiungibile su un'altra.*

---

## C.2 Brainstorm righe 2978-3048 – Abilità (nomi EN)

**Regola**: Per ogni abilità, integrare **quando serve** e **perché** (es. First-Time Shot: "letale in area su assist veloci") per suggerimenti corretti.

| Brainstorm (EN) | info_rag (IT) | Decisione | Note |
|-----------------|---------------|-----------|------|
| Acrobatic Finishing | Tiro acrobatico | ✅ | Integrare: posizioni scomode, area affollata, quando serve |
| Heading | Colpo di testa | ✅ | Integrare: cross, attaccanti fisici, timing aereo |
| First-Time Shot | Tiro al volo | ✅ | Integrare: letale in area su assist veloci, riduce tempo preparazione |
| Long Range Shooting | Distanza | ✅ | Integrare: centrocampisti offensivi, mantiene precisione |
| Chip Shot Control | — | 🔧 | Verificare nome ufficiale IT, aggiungere in §8 |
| Double Touch | Doppio tocco | ✅ | §8.3 |
| Flip Flap | — | 🔧 | Verificare se in §8 (Elastico?) |
| Marseille Turn | — | 🔧 | Roulette? Verificare |
| Scotch Move | — | 🔧 | Verificare nome IT |
| Sombrero | Sombrero | ✅ | §7.3 |
| Through Passing | Passaggio filtrante | ✅ | §8.2 |
| Interception | Intercettazione | ✅ | §8.4 |
| Man Marking | Marcatura | ✅ | §8.4 |
| Track Back | — | 🔧 | Verificare nome IT (Rientro?) |
| Pinpoint Crossing | Cross preciso | ✅ | §8.2 |

**Regola**: Usare SEMPRE nomi italiani ufficiali in info_rag. EN solo come sinonimo tra parentesi se serve.

---

## C.3 Brainstorm righe 3302-3527 – Consigli abilità per ruolo

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 3304-3318 | Attaccanti finalizzatori: First-Time Shot, Acrobatic | ✅ | Integrare priorità per ruolo. **Rimuovere citazioni PRO** | §8.8 o nuova §8.9 |
| 3319-3329 | Ali/Dribblatori: Double Touch, Pinpoint Crossing | ✅ | Idem | §8 |
| 3330-3340 | Registi: Through Passing, Outside Curler | ✅ | Idem | §8 |
| 3341-3353 | Mediani: Interception, Man Marking | ✅ | Idem | §8 |
| 3365-3377 | Difensori centrali: Interception, Heading | ✅ | Idem | §8 |
| 3378-3389 | Terzini: Track Back, Interception | ✅ | Idem | §8 |
| 3406-3412 | Regola slot: 2-3 essenziali, evitare inutili | ✅ | Utile per §8 | §8 o §10 |
| 3438-3489 | Sopravvalutate vs Sottovalutate | 🔧 | Integrare con cautela, formato neutro, no fonti | §10 |
| 3492-3522 | Abilità META tier list | ✅ | Must Have, High Tier, ecc. Formato neutro | §8.8 |

---

# PARTE D: CONTROMISURE, MODULI, MECCANICHE

## D.1 Contromisure per modulo (righe 2813-2851)

**Regola**: Integrare **punti deboli** + **contromisura** (formazione consigliata). L'IA deve sapere perché e quando suggerire.

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 2816-2822 | Contro 4-3-3 | ✅ | **Integrare** spazi centrali, fascia opposta, profondità, formazione contromisura (es. 4-2-3-1) | Nuova §11 o §10 |
| 2824-2829 | Contro 4-2-3-1 | ✅ | **Integrare** larghezza fasce, trequartista isolato, contromisura | Idem |
| 2831-2836 | Contro 3-5-2 | ✅ | Spazi laterali alti | Idem |
| 2838-2843 | Contro 4-4-2 | ✅ | Centro campo, profondità | Idem |
| 2845-2850 | Contro 5-3-2 | ✅ | Centrocampo scoperto | Idem |

---

## D.2 Contromisure specifiche (righe 2928-2952)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 2929-2932 | Contro Pressing Alto | ✅ | **Integrare** tattica, giocatori, istruzioni, modulo – tutto necessario per suggerimento | §10 o §11 |
| 2934-2938 | Contro Difesa Bassa | ✅ | **Integrare** idem | Idem |
| 2940-2944 | Contro Contropiede Veloce | ✅ | Possesso sicuro, difensori veloci | Idem |
| 2946-2951 | Contro Gioco Fisico | ✅ | Gioco tecnico, centrocampisti tecnici | Idem |

---

## D.3 Suggerimenti durante partita (righe 2893-2924)

| Riga | Contenuto | Decisione | Note |
|------|-----------|-----------|------|
| 2893-2899 | Analisi Pre-Partita | ✅ | Integrabile – è PRE partita |
| 2894-2924 | Minuto 0-15, 15-30, 30-60, 60-75, 75-90 | ❌ | Decisioni **durante** partita. Fuori perimetro |

---

## D.4 Manual Defending, R1+X, Super Cancel (righe 160-400)

| Blocco | Decisione | Motivo |
|--------|-----------|--------|
| Manual Defending step-by-step | ❌ | Azioni in partita, comandi live |
| R1+X Pass and Run Crossover | ❌ | Comando in partita |
| L1+X Trigger Run | ❌ | Comando in partita |
| Super Cancel | ❌ | Comando in partita |
| Shadow marking, Call for pressure | 🔧 | Principi generali: "posizionamento > pressing con CB" → sintesi in §7 |

---

## D.5 Build, soglie META, Forza base (righe 967-1100, 2500-2520)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 1005-1084 | Soglie META 2026 (CB 85+ vel, terzini 90+) | ✅ | Integrare. **Rimuovere citazioni** | §1.6 nuova |
| 2518-2520 | Forza base vs Forza complessiva | ✅ | Già in INTEGRAZIONI_RAG | §9.4 |
| 1116-1172 | Training, progression, errori build | ❌ | Statistiche FISSE, no "allenare" | — |

---

## D.6 Frecce forma, Panchina, Navigazione (righe 1378-1394)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 1379-1383 | Panchina lunga, sostituzioni 60-70 min | ✅ | Principio pre-partita: gestione roster | §10 |
| 1385-1389 | Navigazione menu (filtri, quadrato, frecce) | ❌ | UI gioco, non RAG | — |
| 1391-1395 | Frecce forma (Su, Giù, Neutro) | ✅ | Già in info_rag §1.5 Forma | §1.5 o §9 |

---

## D.7 Istruzioni individuali, Calci piazzati (righe 143-157)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 145-148 | 4 slot, 2 off + 2 def | 🔄 | Già in §5 | §5 |
| 150-153 | Meccanica calci piazzati (primo/secondo/terzo attaccante) | ✅ | Integrare in §6 | §6 |

---

## D.8 Comandi avanzati (righe 97-142)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 99-105 | Passaggio Sensazionale | 🔄 | Già in §7.2 | §7 |
| 106-111 | Tocco Secco | 🔄 | Già in §8.3 | §8 |
| 112-117 | Protezione Palla | 🔄 | Già in §7.1 | §7 |
| 129-136 | Testa a Testa | 🔄 | Già in §7.1 | §7 |
| 137-142 | Pressing | ✅ | Principi generali, integrare in §7 | §7 |

---

## D.9 Situazioni specifiche (righe 1427-1440)

| Riga | Contenuto | Decisione | Note | Destinazione |
|------|-----------|-----------|------|--------------|
| 1428-1430 | Superiorità/inferiorità numerica | ✅ | Principi tattici pre-partita | §10 |
| 1432-1435 | Fine partita (vincendo/perdendo/pareggio) | ✅ | Strategia generale | §10 |
| 1437-1440 | Rigori | ✅ | Scelta tiratore, portiere | §10 |

---

# PARTE E: SCARTATI (Fuori perimetro)

| Blocco | Motivo |
|--------|--------|
| Righe 3-4: Versione, Fonti Matti | Rimuovere sempre |
| Manual Defending dettagliato (switch, lag, device) | Durante partita |
| R1+X, L1+X, Super Cancel, comandi controller | Durante partita |
| Impostazioni PRO (Smart Assist, Cambio Cursore, Guida Direzionale) | Setup gioco, non tattica |
| Suggerimenti minuto per minuto | Durante partita |
| Sistema Report/ML Attila | Parte piattaforma, non RAG |
| Training/Progression punti | Statistiche fisse |
| "Mattiotti", "Gambler", "PRO" ovunque | Rimuovere |
| Difensore Distruttore | Usare Incontrista |

---

# PROSSIMI PASSI

1. **Implementare** in ordine: §1.6 Soglie META, §9.4 Forza base, §10 (Tiri, Pressing, Rigori, Contromisure sintesi)
2. **Espandere §4** con dettagli Out Wide
3. **Espandere §8** con priorità abilità per ruolo (formato neutro)
4. **Aggiungere §11 CONTROMISURE** (o espandere §10) con punti deboli per modulo e per stile
5. **Verificare** ragHelper SECTION_KEYWORDS per nuove sezioni
6. **Rimuovere** tutte le citazioni fonti dal testo finale

---

*Fine analisi. Documento di lavoro per integrazione in info_rag.md.*
