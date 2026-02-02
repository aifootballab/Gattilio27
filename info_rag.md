**Versione**: 7.0.0 ENTERPRISE | **Data**: 31 Gennaio 2026 | **Lingua**: Italiano
**Fonti**: Manuale eFootball, Best Practices Community, Documentazione Tecnica Ufficiale

# DATABASE MECCANICHE eFootball ENTERPRISE - RAG System

## OBIETTIVO
Database RAG enterprise per consigli tattici basati su meccaniche ufficiali eFootball. 
**Principio fondamentale**: Distinguiere sempre tra CARATTERISTICHE FISSE (card) e ELEMENTI CONFIGURABILI (utente).

---

## CONTESTO VIDEOGIOCO (FONDAMENTALE)

### Cosa sono i Giocatori in eFootball
I giocatori in eFootball sono **CARD DIGITALI** con statistiche e caratteristiche **FIASSE**:
- **Non sono persone reali** → NON hanno "esperienza", "carriera", "maturità"
- **Non crescono nel tempo** → Statistiche Overall, Velocità, Tiro sono FISSE sulla card
- **Non si allenano** → Non puoi "migliorare" un giocatore
- **Puoi solo scegliere** → Quale schierare, come posizionarlo, che istruzioni dare

### Differenza FISSO vs MODIFICABILE

| ELEMENTO | STATO | DESCRIZIONE |
|----------|-------|-------------|
| **Statistiche Giocatore** | FISSO | Overall, Velocità, Tiro, Resistenza, ecc. - Immutabili |
| **Stili di Gioco Giocatore** | ✅ FISSO | Opportunista, Collante, Box-to-Box, ecc. - Immutabili |
| **Abilità native** (dalla card) | ✅ FISSO | Tiro al Volo, Contrasto Aggressivo, ecc. - Immutabili |
| **Abilità aggiuntive** | 🔧 MODIFICABILE | Tramite Programmi Aggiunta Abilità (max 6 totali; NON per Trending) |
| **Forma Giocatore** | ✅ FISSO | Incrollabile, Normale, Ecc. - Caratteristica card |
| **Posizioni Originali** | ✅ FISSO | Dove il giocatore ha competenza Alta/Intermedia |
| **Formazione** | MODIFICABILE | 4-3-3, 4-2-3-1, 5-2-3, ecc. - Scelta utente |
| **Stile Squadra** | 🔧 MODIFICABILE | Possesso palla, Contropiede, ecc. - Scelta utente |
| **Istruzioni Individuali** | 🔧 MODIFICABILE | Offensivo, Difensivo, Marcatura, ecc. - Configurabili |
| **Titolari vs Riserve** | 🔧 MODIFICABILE | Chi schierare in campo - Decisione utente |
| **Competenza Posizione** | 🔧 PARZIALE | Alto/Intermedio fisso, ma si può aggiungere posizione (max 2) |

**REGOLA ORO per l'AI**: MAI suggerire di "potenziare", "migliorare", "far crescere" un giocatore. 
Puoi solo suggerire: chi usare, dove posizionarlo, che istruzioni dargli.

---

## 1. STATISTICHE GIOCATORI (UFFICIALI eFootball)

### 1.1 Statistiche Tecniche e Offensive
- **Colpo di testa**: Precisione nei colpi di testa
- **Calci da fermo**: Precisione in calci piazzati, rigori, punizioni
- **Tiro a giro**: Capacità di imprimere effetto al pallone
- **Velocità**: Velocità massima del giocatore
- **Accelerazione**: Rapidità nel raggiungere velocità massima
- **Potenza di tiro**: Forza del tiro
- **Finalizzazione**: Precisione nel tiro
- **Possesso stretto**: Abilità nel cambiare direzione durante dribbling a bassa velocità
- **Passaggio rasoterra**: Precisione nei passaggi rasoterra
- **Passaggio alto**: Precisione nei passaggi aerei
- **Dribbling**: Controllo di palla durante dribbling in velocità
- **Controllo palla**: Controllo generale, influenza stop e finte
- **Comportamento Offensivo**: Rapidità di risposta sul pallone in attacco

### 1.2 Statistiche Difensive
- **Comportamento difensivo**: Rapidità di risposta in fase difensiva
- **Contrasto**: Abilità nel vincere scontri con avversari
- **Aggressività**: Intensità nel cercare di recuperare il possesso
- **Coinvolgimento difensivo**: Inclinazione ad aiutare in fase difensiva

### 1.3 Statistiche Fisiche
- **Resistenza** (NON "Stamina"): Forma fisica e durata prestazione
- **Contatto fisico**: Capacità di contenere avversario e mantenere equilibrio
- **Controllo corpo**: Abilità nel resistere ai contrasti
- **Salto**: Altezza del salto
- **Equilibrio**: Stabilità del giocatore

### 1.4 Statistiche Portieri
- **Riflessi PT**: Capacità di bloccare tiri ravvicinati
- **Estensione PT**: Copertura area di porta
- **Comportamento PT**: Rapidità di risposta sul pallone
- **Presa PT**: Capacità di afferrare il pallone
- **Parata PT**: Abilità nel respingere pallone in zone sicure

### 1.5 Caratteristiche Speciali
- **Frequenza piede debole**: Frequenza utilizzo piede debole
- **Precisione piede debole**: Precisione tiri/passaggi con piede debole
- **Forma**: Variazione condizione fisica ("Incrollabile" = condizione stabile)
- **Resistenza infortuni**: Probabilità di subire infortuni (valore alto = minor probabilità)

---

## 2. STILI DI GIOCO DEI GIOCATORI (UFFICIALI - FISSI)

**IMPORTANTE**: Gli stili di gioco sono **CARATTERISTICHE FISSE** della card. NON si possono modificare.

### 2.1 Stili Senza Palla (Comportamento senza possesso)

#### Attaccanti e Centrocampisti Offensivi
- **Opportunista** (P): Gioca a contatto con ultimo difensore, aspetta palla in area per finalizzare. *(Nome ufficiale eFootball; "Cacciatore di gol" / Poacher sono termini alternativi: in risposta usa sempre "Opportunista".)*
- **Senza palla** (P/SP/TRQ): Attira difensori per creare spazi inserimenti
- **Rapace d'area** (P): Sempre in agguato in area di rigore per finalizzare
- **Fulcro di gioco** (P): Protegge palla con fisico, riferimento offensivo
- **Specialista di cross** (EDA/ESA/CLD/CLS): Resta sulla fascia per crossare
- **Classico n° 10** (SP/TRQ): Playmaker, avvia attacchi, minimizza sforzo difensivo
- **Regista creativo** (SP/EDA/ESA/TRQ/CLD/CLS): Sfrutta aperture difensive per creare assist
- **Ala prolifica** (EDA/ESA): Si posiziona fascia e taglia centro per passaggi filtranti
- **Taglio al centro**: Tende a tagliare verso interno per ricevere passaggi

#### Centrocampisti e Difensori
- **Tra le linee** (CC/MED): Rimane arretrato, pronto a lanciare azioni offensive
- **Sviluppo** (CC/MED/DC): Arretra per impostare azione con lanci lunghi
- **Frontale extra** (DC): Partecipa a manovra offensiva, si sovrappone
- **Incontrista** (CC/MED/DC): Respinge attacchi con pressing aggressivo
- **Onnipresente** (CLD/CLS/CC/MED): Corre su tutto il campo, copre ogni zona
- **Collante** (MED): Centrocampista arretrato davanti difesa, utile difesa/attacco
- **Giocatore chiave** (SP/TRQ/CLD/CLS/CC): Fiuto del gol, sempre proiettato avanti

#### Terzini e Portieri
- **Terzino offensivo** (TD/TS): Si unisce ad attacco, corre in profondità
- **Terzino difensivo** (TD/TS): Rimane arretrato per proteggere difesa
- **Terzino mattatore** (TD/TS): Si inserisce in azioni offensive centrali
- **Portiere offensivo** (PT): Agisce come libero, supporta difesa
- **Portiere difensivo** (PT): Preferisce restare sulla linea di porta

### 2.2 Stili di Gioco IA (Con Palla)
Comportamento quando IA controlla giocatore in possesso:
- **Funambolo**: Esperto dribbling con doppio passo
- **Serpentina**: Sfrutta dribbling e cambi direzione
- **Treno in corsa**: Veloce, attacca spazi, accelerazioni in profondità
- **Inserimento**: Usa dribbling per accentrarsi e creare occasioni
- **Esperto palle lunghe**: Effettua spesso passaggi lunghi
- **Crossatore**: Sfrutta spazi per crossare
- **Tiratore**: Specialista tiri da fuori area

---

## 3. MODULI TATTICI (CONFIGURABILI)

### 3.1 Moduli con 4 Difensori
- **4-3-3**: Tre CC e tre attaccanti, possesso palla e ampiezza
- **4-2-3-1**: Due mediani copertura, tre trequartisti dietro punta
- **4-4-2**: Due linee da quattro, equilibrio difesa/attacco
- **4-1-2-3**: Un mediano, due mezzali, tre attaccanti
- **4-5-1**: Densità centrocampo, unica punta riferimento
- **4-4-1-1**: Variante 4-4-2 con trequartista dietro punta
- **4-2-2-2**: Due mediani, due trequartisti larghi, due punte

### 3.2 Moduli con 3 Difensori
- **3-5-2**: Due punte, CC folto, esterni supportano difesa
- **3-4-3**: Tre attaccanti, quattro CC, gioco offensivo
- **3-1-4-2**: Un mediano, quattro CC per dominare possesso
- **3-4-1-2**: Trequartista dietro due punte, creazione gioco

### 3.3 Moduli con 5 Difensori
- **5-3-2**: Difesa solida, tre CC, due attaccanti, contropiede
- **5-4-1**: Massima copertura difensiva, unica punta
- **5-2-3**: Variante offensiva, tre attaccanti, due mediani

### 3.4 Limiti di schieramento per ruolo (regole di gioco)
- **Attacco (A)**: 1-5 giocatori (max 2 P, max 1 EDA/ESA)
- **Centrocampo (C)**: 1-6 giocatori (max 1 CLD/CLS)
- **Difesa (D)**: 2-5 giocatori (max 3 DC, max 1 TD/TS)
- **Portiere (PT)**: posizione non modificabile

---

## 4. STILI TATTICI DI SQUADRA (CONFIGURABILI)

**Definisce direzione tattica squadra. L'attitudine allenatore influenza competenza stile.**

### 4.1 Stili Base (5 Tipologie)
- **Possesso palla**: Gioco costruito con passaggi corti e pazienti
- **Contropiede veloce**: Ripartenze veloci sfruttando spazi lasciati
- **Contrattacco**: Attacco diretto con passaggi verticali rapidi
- **Passaggio lungo**: Strategia basata su lanci lunghi
- **Vie laterali**: Coinvolgimento esterni per allargare difesa

### 4.2 Stili Offensivi
- **Attacco Diretto**: Passaggi verticali rapidi
- **Cross e Finalizzazione**: Strategia basata su cross per attaccanti forti di testa
- **Attacco Centrale**: Costruzione con combinazioni corte centrali

### 4.3 Stili Difensivi
- **Pressing Alto**: Difesa aggressiva per recuperare palla in zona avanzata
- **Difesa Bassa**: Linea difensiva arretrata per ridurre spazi
- **Pressing Selettivo**: Intercettazione linee di passaggio
- **Contenimento Difensivo**: Lasciare possesso e ripartire con contropiedi

### 4.4 Costruzione dal Basso
- **Costruzione Posizionale**: Manovra ragionata con passaggi corti
- **Lancio Lungo**: Passaggi lunghi per scavalcare pressing
- **Costruzione a Triangoli**: Passaggi tra CC per superare pressing

### 4.5 Tattiche Speciali
- **Gegenpressing**: Recupero palla immediato dopo averla persa
- **Tiki-Taka**: Passaggi corti continui per disorganizzare difesa
- **Catenaccio**: Difesa stretta e ripartenze rapide
- **Pressing Costante**: Squadra sempre aggressiva
- **Attacco con Esterni Alti**: Esterni rimangono larghi
- **Tagli Interni**: Esterni convergono verso centro

---

## 5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)

**4 slot totali: 2 offensive (possesso palla), 2 difensive (senza possesso)**

### Slot Offensive (in possesso palla)
- **Difensivo**: Giocatore non si spinge troppo in avanti
- **Offensivo**: Giocatore si spinge in avanti, partecipa ad attacco
- **Ancoraggio (Anchoring)**: Resta ancorato in zona (es. mediano davanti difesa). **Regola di gioco: massimo 2 giocatori in squadra** possono avere Ancoraggio. Consigliare solo per 1-2 mediani davanti alla difesa; non assegnare a 5 giocatori.

### Slot Difensive (senza possesso palla)
- **Marcatura stretta**: Marca avversario da vicino, riduce spazio
- **Marcatura uomo**: Marca avversario specifico (man marking)
- **Contropiede**: Giocatore è riferimento per contropiede (solo CC e attaccanti)
- **Linea bassa (Deep line)**: Resta più arretrato (non assegnabile a difensori)

### Impostazioni Squadra
- **Linea alta/bassa**: Alzare/abbassare linea difensiva con frecce
- **Calci piazzati**: Primo/Secondo/Terzo attaccante per cross

---

## 6. CALCI PIAZZATI (CONFIGURABILI)

### 6.1 Punizioni Attacco
- **Scatta**: Giocatori schierati fianco a fianco prima corsa verso porta
- **Sponda al centro**: Corsa arcuata verso palo lontano
- **Scatta e mantieni**: Alcuni avanzano, altri in copertura
- **Palla all'ariete**: Strategia gioco aereo
- **Equilibrato**: Giocatori si adattano a situazione

### 6.2 Corner Attacco
- **Scatta**: Corsa dal palo lontano
- **Area piccola**: Schierati stretti vicino area rigore
- **Treno**: Disposti in verticale prima di attaccare
- **Da centrocampo**: Uno arretra leggermente dietro area
- **Due ricevitori**: Due vicino bandierina per passaggio
- **In diagonale**: Uno solo si avvicina lateralmente
- **Corner corto**: Tattiche per giocare corner corto
- **Linea laterale**: Compagno vicino bandierina per passaggio

### 6.3 Calci Piazzati Difesa
- **Marcatura a uomo**: 1 contro 1 in area
- **Marcatura a zona**: Difesa su aree designate
- **Equilibrato**: Mix tra uomo e zona
- **Palo lontano**: Forti di testa sul palo lontano

---

## 7. MECCANICHE DI GIOCO AVANZATE

### 7.1 Difesa Manuale (Comandi Ufficiali)
**Testa a Testa**: Premi ⚪ (PS) / B (XB) per seguire avversario con passetti. Fondamentale in difesa, più possibilità di bloccare tiri e passaggi.

**Contrasto di Spalla**: Premi R1 (PS) / RB (XB) per contrasto spalla a spalla. Utile quando corri accanto a avversario che prova dribbling.

**Chiama Pressing**: Premi ⚪ (PS) / B (XB) per chiedere ai compagni di pressare. Considera rischio: se avversario mantiene possesso, lasci spazi.

**Protezione**: Durante dribbling, se avversario prova a rubare palla da dietro/lati, il giocante protegge automaticamente palla col corpo. Probabilità più alta se "Contatto fisico" > avversario.

**Marcature**: Marcatura a uomo vs zona in calci piazzati difensivi.

### 7.2 Comandi Offensivi Avanzati

**Uno-due in Avanti**: L1 + X (PS) / LB + A (XB) → Autore passaggio scatta in avanti dopo passaggio. Utile per far avanzare attacco.

**Passaggio Sensazionale**: Premi a fondo R2 (PS) / RT (XB) durante passaggio → Passaggio rapido e incisivo. Palla si stacca più lentamente, usare dopo essersi smarcati.

**Tiro Sensazionale**: Premi R2 (PS) / RT (XB) mentre tiri → Tiro potente. Con "Tiro a scendere" o "Tiro a salire" → traiettorie speciali.

**Tiro Calibrato**: Barra potenza blu chiara → Tiro più delicato, enfasi su piazzamento. Con "A giro da distante" o "Esterno a giro" → traiettorie speciali.

**Controllo Tocco di Palla**: Combinazioni L + R2 per varie mosse. Più fondo premi R2, più rapidamente dribbli. Doppio R2 = sposta pallone in avanti.

**Dribbling di Precisione**: Tieni premuto L2, poi sfiora L per tocchi di fino. Efficace in spazi stretti e uno contro uno.

### 7.3 Finte e Skill Moves

**Finte di Corpo**: Sposta R avanti e di lato per varie finte.

**Doppio Tocco**: Skill base per superare avversari.

**Elastico / Elastico inverso**: Cambio direzione rapido.

**Veronica**: Skill avanzata.

**Sombrero / Sombrero e tacco**: Passaggio alto a sé stessi.

**Svolta secca**: Cambio direzione immediato.

**Alzata di tacco**: Controllo palla avanzato.

### 7.4 Stop e Ricezione

**Voltati verso porta**: Stop orientato ad attaccare.

**Finta di stop**: Inganna difensore.

**Stop e alzata**: Controllo aereo.

**Finta con stop**: Cambio direzione dopo stop.

---

## 8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)

**REGOLA FONDAMENTALE**:
- **Abilità native**: FISSE (con cui nasce la card)
- **Abilità aggiuntive**: MODIFICABILI tramite "Programmi Aggiunta Abilità"
- **Max 6 slot abilità totali** per giocatore
- **NON modificabili per giocatori TRENDING**
- **Modificabili per**: In evidenza, In risalto, Epico, Leggendario, Standard

### 8.1 Abilità Tiro
- **Tiro al volo**: Tiri precisi di prima intenzione dopo stop
- **Tiro a giro**: Tiri con effetto
- **Tiro Potente**: Tiri con maggiore potenza
- **Punta di Precisione**: Tiri precisi in area
- **Tiro a scendere**: Tiri con traiettoria discendente
- **Tiro a salire**: Tiri con traiettoria ascendente
- **A giro da distante**: Tiri a giro da fuori area
- **Esterno a giro**: Tiri a giro con esterno piede
- **Colpo di testa**: Conclusioni di testa più accurate
- **Tiro acrobatico**: Tiri acrobatici (rovesciate, ecc.)
- **Finalizzazione**: Precisione in conclusione
- **Distanza**: Tiri precisi da lontano

### 8.2 Abilità Passaggio
- **Passaggio di prima**: Passaggi rapidi e diretti di prima intenzione
- **Passaggio al volo**: Controllo e passaggio in un solo tocco
- **Passaggio filtrante**: Passaggi in profondità precisi
- **Lancio lungo preciso**: Passaggi lunghi accurati
- **Cross preciso**: Cross dalla fascia più precisi
- **Passaggio sensazionale**: Passaggi potenti (R2)

### 8.3 Abilità Dribbling e Controllo
- **Doppio tocco**: Skill base cambio direzione
- **Elastico**: Cambio direzione rapido con esterno
- **Controllo di suola**: Controllo palla con suola
- **Doppio tocco speciale**: Combo Doppio tocco + Elastico + Controllo suola = movimento speciale
- **Stop acrobatico**: Controllo palla acrobatico
- **Finta tiro**: Finta tiro per ingannare difensore
- **Finta passaggio**: Finta passaggio
- **Tocco secco**: Spinta palla rapida (R2 doppio)
- **Protezione**: Proteggere palla con corpo

### 8.4 Abilità Difensive
- **Contrasto Aggressivo**: Tackle aggressivi con minori falli
- **Intercettazione**: Intercettare passaggi più facilmente
- **Marcatura**: Marcare avversario più efficacemente
- **Entrata aggressiva**: Contrasti più efficaci
- **Sliding tackle**: Tackle scorrevoli efficaci

### 8.5 Abilità Portiere
- **Riflessi Felini**: Parate ravvicinate miracolose
- **Presa sicura**: Afferrare palla invece di respingere
- **Uscita portiere**: Uscite più sicure
- **Parata con piedi**: Parate con piedi su tiri bassi
- **Piazzamento**: Posizionamento ottimale in porta
- **Estensione PT**: Copertura maggiore porta

### 8.6 Abilità Fisiche e Atletiche
- **Scatto**: Accelerazione esplosiva
- **Resistenza superiore**: Maggiore resistenza alla fatica
- **Forza fisica**: Maggiore potenza fisica
- **Agilità superiore**: Maggiore agilità
- **Salto**: Salto più potente
- **Velocità**: Velocità massima superiore

### 8.7 Abilità Speciali e Leadership
- **Leader**: Ispira compagni, riduce impatto fatica squadra
- **Specialista cross**: Cross più precisi e pericolosi
- **Specialista punizioni**: Punizioni più precise
- **Specialista rigori**: Rigori più sicuri
- **Tiratore**: Tiri da fuori area più precisi

### 8.8 Programmi Aggiunta Abilità
- **Disponibile per**: In evidenza, In risalto, Epico, Leggendario, Standard
- **NON disponibile per**: Trending (già max livello)
- **Come funziona**: Usa programmi per far apprendere abilità al giocatore
- **Max slot**: 6 abilità totali (native + aggiunte)

---

## 9. COMPETENZE E SVILUPPO

### 9.1 Tipologie Giocatori (Squadra dei Sogni)
- **Trending**: Max livello, immediatamente schierabili
- **In evidenza**: Personalizzabili
- **In risalto**: Personalizzabili e potenziabili
- **Epico**: Alte potenzialità crescita
- **Leggendario**: Prestazioni elevate e costanti
- **Standard**: Giocatori base, personalizzabili

### 9.2 Competenza Posizione
**Livelli**:
- **Basso**: Nessun colore
- **Intermedio**: Verde sfumato
- **Alto**: Verde brillante

**Apprendimento**:
- Massimo 2 slot competenze posizione
- Programmi Aggiunta Posizione per acquisire nuove posizioni
- Portieri e campo non interscambiabili

### 9.3 Valore Giocatore (VG)
Valutazione massima 5 stelle (5★). Trending valutati su statistiche iniziali. Altri tipi su statistiche + potenziale.

---

## 10. NOTE CRITICHE PER L'IA

### ERRORI COMUNI DA EVITARE

1. **NON dire**: "Fai crescere il giocatore" / "Allenalo" / "Miglioralo"
   - **CORRETTO**: "Usa questo giocatore" / "Schiera quell'altro" / "Aggiungi abilità tramite Programmi"

2. **NON dire**: "Il giocatore ha esperienza" / "Maturità" / "Carriera"
   - **CORRETTO**: "La card ha queste statistiche" / "Questi valori"

3. **NON dire**: "Potenzia lo stile" / "Modifica le statistiche"
   - **CORRETTO**: "Scegli un altro giocatore con stile diverso" / "Usa istruzioni individuali"

4. **Nomi ufficiali stili (usa sempre questi)**:
   - **Opportunista** = nome ufficiale. Se il cliente dice "Cacciatore di gol" o "Poacher", rispondi sempre **Opportunista**.
   - **Classico n° 10** (non "trequartista classico"): lo stile si chiama **Classico n° 10**
   - **Rapace d'area** (con apostrofo). Varianti utente: "rapace d area", "rapace d aera" → rispondi "Rapace d'area"
   - **Difensore distruttore**, **Sviluppo**, **Frontale extra**: nomi ufficiali eFootball
   - **NON dire**: "Poacher" / "Build" / "Stamina" (termini community) → **CORRETTO**: "Opportunista" / "Statistiche" / "Resistenza"

4b. **Nomi stili con apostrofo**: Scrivi sempre **Rapace d'area** (con apostrofo). Il cliente può cercare "rapace d area" o "rapace d aera" (typo): rispondi con la forma ufficiale "Rapace d'area".

5. **NON confondere**: Stili di gioco FISSI vs Stile Squadra CONFIGURABILE
   - Stile giocatore (Opportunista, Collante) = FISSO
   - Stile squadra (Possesso palla) = CONFIGURABILE

6. **NON confondere**: Abilità native vs Abilità aggiungibili
   - Abilità native (con cui nasce) = FISSE
   - Abilità aggiuntive = MODIFICABILI (max 6 slot, tramite Programmi, NON per Trending)
   - Statistiche (Overall, Velocità, ecc.) = SEMPRE FISSE

7. **STATISTICHE vs ABILITÀ (terminologia ufficiale – OBBLIGATORIO)**
   - **Statistiche** (sezione 1): valori numerici fissi della card. Es.: Passaggio rasoterra, Passaggio alto, Velocità, Finalizzazione, Resistenza.
   - **Abilità** (sezione 8): tratti speciali della card. Es.: Passaggio filtrante, Passaggio di prima, Tiro al volo, Contrasto Aggressivo.
   - **Passaggio filtrante** = ABILITÀ (through ball), NON statistica. **Passaggio rasoterra** / **Passaggio alto** = STATISTICHE.
   - **NON suggerire MAI** di "cercare", "filtrare" o "selezionare" giocatori per statistica o abilità: l'app non ha quella funzionalità. Usa SOLO i giocatori elencati nel CONTESTO PERSONALE (rosa fornita). Se il cliente chiede "chi ha passaggio filtrante", cita nomi dalla rosa se presenti, altrimenti indica che non hai quel dettaglio.

8. **ISTRUZIONI INDIVIDUALI – SOLO QUELLE DELLA SEZIONE 5 (OBBLIGATORIO)**
   - Le istruzioni individuali configurabili sono **SOLO** queste (vedi sezione 5): **Slot offensive**: Difensivo, Offensivo, Ancoraggio (Anchoring). **Slot difensive**: Marcatura stretta, Marcatura uomo, Contropiede, Linea bassa (Deep line). **Impostazioni squadra**: Linea alta/bassa, Calci piazzati (Primo/Secondo/Terzo attaccante per cross).
   - **NON esistono** istruzioni individuali tipo "passaggi corti", "cross", "passaggi verso area", "favorire passaggi", "istruzioni per cross". NON inventare.
   - Per passaggi corti / gioco costruito → usa **Stile Squadra** (sezione 4): es. Possesso palla, Costruzione posizionale, Tiki-Taka. Per cross → **Stile Squadra** Cross e Finalizzazione, o giocatori con stile **Specialista cross** / abilità **Cross preciso**.

9. **ABILITÀ GIOCATORI – SOLO QUELLE DELLA SEZIONE 8 (OBBLIGATORIO)**
   - **Abilità native**: definite dalla card, FISSE (Tiro al volo, Passaggio filtrante, Contrasto Aggressivo, ecc.). Non si modificano.
   - **Abilità aggiuntive**: il **cliente** le può **inserire** tramite **Programmi Aggiunta Abilità** (sezione 8.8). Solo per card non Trending. **Max 6 abilità totali** (native + aggiunte) per giocatore.
   - Le abilità che puoi consigliare sono **SOLO** quelle sezione 8 (8.1 Tiro, 8.2 Passaggio, 8.3 Dribbling, 8.4 Difensive, 8.5 Portiere, 8.6 Fisiche, 8.7 Speciali). NON inventare nomi.
   - **NON** per giocatori **Trending**: "Quella card è Trending, non può ricevere abilità aggiuntive; schierala così com'è o usa un'altra card."
   - **Modificabili** (possono ricevere abilità aggiuntive tramite Programmi): In evidenza, In risalto, Epico, Leggendario, Standard.
   - Consiglia abilità **coerenti con il ruolo**: difensori → 8.4 (Contrasto Aggressivo, Intercettazione, Marcatura); portieri → 8.5; attaccanti/punte → 8.1/8.2 (Tiro al volo, Passaggio filtrante, Cross preciso); centrocampisti → 8.2/8.3/8.6 (Passaggio di prima, Resistenza superiore, …).

### ESEMPI RISPOSTE CORRETTE

**Utente**: "Che abilità mi servono per il mio difensore?"
SBAGLIATO: "Devi far crescere il contrasto del tuo difensore"
CORRETTO: "Per difensori utili: Abilità Giocatore come Contrasto Aggressivo, Intercettazione, Marcatura. Se il tuo giocatore non le ha, puoi aggiungerle tramite Programmi Aggiunta Abilità (se non è Trending). Oppure cerca una card che le abbia già native."

**Utente**: "Come miglioro la mia punta?"
SBAGLIATO: "Falla allenare per aumentare finalizzazione"
CORRETTO: "Le statistiche (Overall, Finalizzazione, ecc.) sono FISSE. Puoi: 1) Aggiungere Abilità Giocatore tramite Programmi (es. Tiro al volo, se non è Trending), 2) Cambiare formazione/stile squadra, 3) Aggiungere istruzioni offensive, 4) Sostituirla con card migliore."

**Utente**: "Il mio centrocampista è stanco?"
❌ SBAGLIATO: "Devi farlo riposare per recuperare stamina"
✅ CORRETTO: "In eFootball la Resistenza è una statistica FISSA della card che determina quanto il giocatore resiste alla fatica. NON si recupera nel tempo. Se vuoi un giocatore più resistente, devi usare una card diversa con valore Resistenza più alto."

**Utente**: "Cerca giocatori con passaggio filtrante" / "Filtra per statistiche passaggio filtrante"
❌ SBAGLIATO: "Vai su [menu] e filtra per passaggio filtrante" / "Cerca nella rosa per quella statistica"
✅ CORRETTO: "Passaggio filtrante è un'ABILITÀ (non una statistica). L'app non ha filtri per statistica o abilità. Guarda nella tua rosa (CONTESTO PERSONALE): se hai caricato i giocatori, posso indicarti chi in elenco ha abilità utili per il passaggio in profondità; altrimenti carica la rosa dalla Gestione Formazione."

**Utente**: "Quali istruzioni individuali per favorire passaggi corti e cross?" / "Imposta istruzioni che favoriscono passaggi e cross"
❌ SBAGLIATO: "Imposta istruzioni individuali che favoriscono passaggi corti e cross" / "Usa istruzioni per passaggi verso area"
✅ CORRETTO: "Le istruzioni individuali sono solo: Offensivo, Difensivo, Ancoraggio, Marcatura stretta, Marcatura uomo, Contropiede, Linea bassa. Non esistono 'passaggi corti' o 'cross' come istruzioni. Per passaggi corti usa Stile Squadra (es. Possesso palla, Tiki-Taka). Per i cross usa Stile Squadra Cross e Finalizzazione o schiera giocatori con stile Specialista cross. Per Ronaldinho (Ala prolifica) puoi dare Offensivo per farlo spingere in avanti."

**Utente**: "Che abilità aggiungo al mio centrocampista?" / "Quali abilità per la mia punta?"
❌ SBAGLIATO: "Aggiungi abilità di pressing" / "Dagli l'abilità di finalizzazione" (se "finalizzazione" intesa come statistica) / suggerire Programmi per una card Trending
✅ CORRETTO: "Per centrocampisti utili: Passaggio di prima, Resistenza superiore, Passaggio filtrante (sezione 8). Se la card non è Trending, aggiungile tramite Programmi Aggiunta Abilità (max 6 abilità totali). Se è Trending, quella card non può ricevere abilità aggiuntive." Per punta: "Tiro al volo, Punta di Precisione, Passaggio filtrante (sezione 8). Tramite Programmi se non è Trending."

**Utente**: "Posso aggiungere abilità al mio [giocatore Trending]?"
✅ CORRETTO: "I giocatori Trending non possono ricevere abilità aggiuntive tramite Programmi. Puoi schierarlo così com'è o usare una card In evidenza/Epico/Leggendario/Standard se vuoi personalizzare le abilità."

---

**Versione**: 7.0.0 ENTERPRISE | **Data**: 31 Gennaio 2026
**Principio**: FISSO vs CONFIGURABILE | **Terminologia**: Ufficiale eFootball
