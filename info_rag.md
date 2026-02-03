**Versione**: 8.0.0 ENTERPRISE | **Data**: 2 Febbraio 2026 | **Lingua**: Italiano
**Fonti**: Manuale eFootball, Best Practices Community, Documentazione Tecnica Ufficiale

# DATABASE MECCANICHE eFootball ENTERPRISE - RAG System

## OBIETTIVO
Database RAG enterprise per consigli tattici basati su meccaniche ufficiali eFootball. 
**Principio fondamentale**: Distinguiere sempre tra CARATTERISTICHE FISSE (card) e ELEMENTI CONFIGURABILI (utente).

---

## CONTESTO VIDEOGIOCO (FONDAMENTALE)

### Cosa sono i Giocatori in eFootball
I giocatori in eFootball sono **CARD DIGITALI** con statistiche e caratteristiche **FISSE**:
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

### 1.6 Soglie indicative (parametri META)
Valori di riferimento per costruzione squadra. Le statistiche restano FISSE sulla card; questi numeri aiutano a scegliere quale card schierare.
- **Difensori centrali**: Velocità e Accelerazione min. 85 (contropiede dominante)
- **Terzini**: Velocità 90+ per recuperare su ali veloci
- **Ali e attaccanti**: Velocità 90+ per dominare 1v1
- **Centrocampisti**: 80+ per essere competitivi
- **Resistenza**: con valore basso, l'Accelerazione cala durante la partita; chi corre/pressa troppo nel primo tempo inizia stanco nel secondo.

---

## 2. STILI GIOCATORE - Caratteristica card (FISSI)

**≠ Stile squadra** (Possesso, Contropiede, ecc.): quello è in §4. Qui solo **caratteristiche FISSE della card**.

**IMPORTANTE**: Gli stili giocatore (Opportunista, Collante, Box-to-Box, ecc.) sono **CARATTERISTICHE FISSE** della card. NON si possono modificare.

### 2.1 Stili Senza Palla (Comportamento senza possesso)

#### Attaccanti e Centrocampisti Offensivi
- **Opportunista** (P): Gioca a contatto con ultimo difensore, scatta verso porta appena si presenta un'opportunità, sovraffolla l'area per creare caos e occasioni. **Quando serve**: squadre con passaggi filtranti, palle in profondità, gioco veloce e contropiede. **Perché**: sempre pronto ad anticipare i passaggi in profondità; stile diretto, adattabile a gameplay veloce. *(Poacher)*
- **Punta avanzata** (P/SP): Punta che si inserisce in profondità, corre negli spazi per creare occasioni. **Quando serve**: stili diretti, palle in profondità. *(Adv. Striker)*
- **Senza palla** (P/SP/TRQ): Attira difensori per creare spazi per inserimenti. **Quando serve**: squadre che cercano imprevedibilità; crea spazi per compagni. *(Dummy Runner)*
- **Rapace d'area** (P): Sempre in agguato in area di rigore per finalizzare; ottimo su cross e ribalzi. **Quando serve**: cross, attaccanti con centrocampisti/esterni che forniscono assist. *(Fox in the Box)*
- **Punta arretrata** (P/SP/TRQ): Arretra in mezzo al campo per impostare, contribuisce alla costruzione. **Quando serve**: possesso palla, squadre che costruiscono dal basso. **Perché**: idealmente abbinato a esterni veloci che corrono oltre i difensori. *(Deep-Lying Forward)*
- **Fulcro di gioco** (P): Protegge palla con fisico, riferimento offensivo. **Quando serve**: gioco aereo, sponde, attaccanti fisici. **Perché**: presenza fisica, crea spazio per esterni e trequartisti. *(Target Man)*
- **Specialista di cross** (EDA/ESA/CLD/CLS): Resta sulla fascia per crossare
- **Classico n° 10** (SP/TRQ): Playmaker, avvia attacchi con passaggi intelligenti, minimizza sforzo difensivo. **Quando serve**: gioco lento e ragionato, possesso palla, controllo partita. **Perché**: gestisce il ritmo, meno coinvolto in fase difensiva.
- **Regista creativo** (SP/EDA/ESA/TRQ/CLD/CLS): Si muove liberamente in fase offensiva, cerca spazi per ricevere palla e creare occasioni. **Quando serve**: imprevedibilità offensiva, disorganizzare la difesa avversaria. **Perché**: movimenti intelligenti di smarcamento.
- **Ala prolifica** (EDA/ESA): Si posiziona sulla fascia e taglia verso il centro per passaggi filtranti; efficace in 1v1. *(Prolific Winger)*
- **Taglio al centro**: Tende a tagliare verso interno per ricevere passaggi. **Quando serve**: esterni che convergono per tiri a giro o passaggi filtranti.

#### Centrocampisti e Difensori
- **Tra le linee** (CC/MED): Rimane arretrato, pronto a lanciare azioni offensive
- **Sviluppo** (DC): Difensore che arretra per impostare azione con lanci lunghi. **Quando serve**: costruzione dal basso, possesso palla. **Perché**: raggio di passaggio lungo da dietro. *(Build Up – solo DC)*
- **Frontale extra** (DC): Partecipa a manovra offensiva, si sovrappone. **Quando serve**: moduli che spingono la difesa in avanti; rischio: espone il dietro. *(Extra Frontman)*
- **Incontrista** (CC/MED/DC): Respinge attacchi con pressing aggressivo. **Quando serve**: contropiede veloce, tattiche aggressive orientate alla riconquista rapida. **Perché**: pressione alta, contrasti decisi. *(NON usare "Difensore distruttore" o "Destroyer": termini non ufficiali)*
- **Box-to-Box** (CC/MED): Corre da area a area, partecipa in fase difensiva e offensiva. **Quando serve**: moduli che richiedono centrocampisti completi, equilibrio e copertura totale. **Perché**: alta resistenza, versatilità; recupera palla e avvia attacchi, arriva tardi in area; utilizzabile in quasi tutti i moduli.
- **Onnipresente** (CLD/CLS/CC/MED): Corre su tutto il campo, copre ogni zona. *(Distinto da Box-to-Box)*
- **Collante** (MED): Centrocampista arretrato davanti difesa, utile difesa/attacco. **Quando serve**: scudo difensivo, opzione di passaggio sicura in costruzione. **Perché**: fondamentale per Vie laterali (Out Wide) per solidità difensiva. *(Anchor Man)*
- **Giocatore chiave** (SP/TRQ/CLD/CLS/CC): Fiuto del gol, sempre proiettato avanti; cerca spazi vuoti quando si passa da difesa ad attacco, corre verso porta prima della punta. **Quando serve**: contropiede veloce. **Perché**: bisogno di buona resistenza per ripetuti scatti; passaggi rasoterra precisi per le punte. *(Hole Player)*

#### Terzini e Portieri
- **Terzino offensivo** (TD/TS): Si unisce ad attacco, sovrapposizioni continue, spinta sulla fascia. **Quando serve**: ampiezza, cross, dominio territoriale. **Rischio**: lascia spazio dietro.
- **Terzino difensivo** (TD/TS): Rimane arretrato per proteggere difesa, copertura prioritaria. **Quando serve**: solidità difensiva, contro ali veloci avversarie.
- **Terzino mattatore** (TD/TS): Si inserisce in azioni offensive centrali. **Quando serve**: moduli che spingono i terzini in attacco centrale.
- **Portiere offensivo** (PT): Più avanzato, esce per anticipare; proattivo nelle uscite. **Quando serve**: linea alta, pressing, gioco aggressivo. **Rischio**: palloni scavalcati.
- **Portiere difensivo** (PT): Rimane vicino alla linea di porta, reattivo. **Quando serve**: gioco conservativo, contro squadre con tiri da lontano.

### 2.2 Stili di Gioco IA (Con Palla)
Comportamento quando IA controlla giocatore in possesso:
- **Funambolo**: Esperto dribbling con doppio passo; controllo palla stretto sotto pressione
- **Serpentina**: Sfrutta dribbling e cambi direzione; spiazza difensori
- **Treno in corsa**: Veloce, attacca spazi, accelerazioni in profondità; ideale per contropiede
- **Inserimento**: Usa dribbling per accentrarsi e creare occasioni; taglio verso l'interno
- **Esperto palle lunghe**: Effettua spesso passaggi lunghi; costruzione da dietro
- **Crossatore**: Sfrutta spazi per crossare; ideale su fasce
- **Tiratore**: Specialista tiri da fuori area; tiene la difesa onesta

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

### 3.5 Ruoli e comportamenti tattici
**Mediano (MED)**: Davanti alla difesa, zona ristretta; interdizione e recupero palla. **Quando serve**: scudo difensivo, proteggere difesa contro trequartisti.
**Mezzala**: Movimento verticale, inserimenti in area. **Quando serve**: goal da centrocampo, superiorità numerica in area.
**Regista Basso**: Arretrato per costruzione, primo passaggio. **Quando serve**: gioco elaborato dal portiere, costruzione dal basso.
**Ala tagliente**: Rientra sul piede forte per tirare; taglio interno verso area. **Quando serve**: tiri a giro, piede invertito (destro a sinistra).
**Ala pura**: Rimane largo per cross; punta linea fondo. **Quando serve**: servire attaccanti centrali, attaccanti forti di testa.

---

## 4. STILI SQUADRA - Tattica (configurabili)

**≠ Stile giocatore** (Opportunista, Collante, ecc.): quello è in §2. Qui solo **stile tattico di squadra** (Possesso, Contropiede, ecc.).

**Definisce direzione tattica squadra. L'attitudine allenatore influenza competenza stile.**

### 4.1 Stili Base (5 Tipologie)
- **Possesso palla**: Gioco costruito con passaggi corti e pazienti. **Quando serve**: centrocampisti tecnici, trequartisti creativi. **Perché**: controllo partita, pazienza, circolazione palla.
- **Contropiede veloce**: Ripartenze veloci sfruttando spazi lasciati. **Quando serve**: attaccanti veloci, difensori con recupero rapido. **Perché**: velocità, passaggi verticali diretti.
- **Contrattacco**: Attacco diretto con passaggi verticali rapidi; difesa compatta, ripartenze organizzate.
- **Passaggio lungo**: Strategia basata su lanci lunghi. **Quando serve**: opportunisti, attaccanti fisici. **Perché**: verticalità, gioco aereo.
- **Vie laterali**: Attacco principalmente attraverso fasce; esterni restano larghi per allargare la difesa avversaria. **Quando serve**: esterni con cross, attaccanti completi (piedi + testa). **Perché**: equilibrio tra fasce e centro; non solo cross – costruzione anche centrale. Difesa si concentra al centro; utile contro attacchi centrali avversari.

### 4.2 Stili Offensivi
- **Attacco Diretto**: Passaggi verticali rapidi. **Quando serve**: velocità in attacco.
- **Cross e Finalizzazione**: Strategia basata su cross per attaccanti forti di testa. **Quando serve**: attaccanti con Colpo di testa, esterni con Cross preciso.
- **Attacco Centrale**: Costruzione con combinazioni corte centrali. **Quando serve**: trequartisti tecnici, possesso.

### 4.3 Stili Difensivi
- **Pressing Alto**: Difesa aggressiva per recuperare palla in zona avanzata. **Quando serve**: squadra con Resistenza alta; rischio: spazi dietro.
- **Difesa Bassa**: Linea difensiva arretrata per ridurre spazi. **Quando serve**: contro attaccanti veloci, in vantaggio.
- **Pressing Selettivo**: Intercettazione linee di passaggio. **Quando serve**: centrocampisti con Intercettazione.
- **Contenimento Difensivo**: Lasciare possesso e ripartire con contropiedi. **Quando serve**: contro possesso avversario.

### 4.4 Costruzione dal Basso
- **Costruzione Posizionale**: Manovra ragionata con passaggi corti. **Quando serve**: possesso palla, portiere con lancio corto.
- **Lancio Lungo**: Passaggi lunghi per scavalcare pressing. **Quando serve**: contro pressing alto, punta fisica per sponde.
- **Costruzione a Triangoli**: Passaggi tra CC per superare pressing. **Quando serve**: centrocampo tecnico.

### 4.5 Tattiche Speciali
- **Gegenpressing**: Recupero palla immediato dopo averla persa. **Quando serve**: squadra con Resistenza alta.
- **Tiki-Taka**: Passaggi corti continui per disorganizzare difesa. **Quando serve**: possesso, tecnica alta.
- **Catenaccio**: Difesa stretta e ripartenze rapide.
- **Pressing Costante**: Squadra sempre aggressiva. **Quando serve**: Resistenza 85+ per tutti.
- **Attacco con Esterni Alti**: Esterni rimangono larghi. **Quando serve**: ampiezza, cross.
- **Tagli Interni**: Esterni convergono verso centro. **Quando serve**: tiri a giro, spazio centrale.

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

### Meccanica posizioni attaccanti (cross/corner)
- **Primo attaccante**: va sul primo palo
- **Secondo attaccante**: va al centro dell'area
- **Terzo attaccante**: va sul secondo palo

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

### 7.5 Movimenti collettivi
- **Triangolazione**: Tre giocatori formano triangolo per possesso; movimento continuo per opzioni passaggio. **Quando serve**: zona fitta, mantenere possesso sotto pressing.
- **Sovrapposizione**: Giocatore supera compagno con palla; corsa oltre per ricevere o attirare marcatore. **Quando serve**: superiorità numerica su fascia, 1v1 su fascia.
- **Taglio**: Movimento diagonale verso porta, corsa senza palla in spazio. **Quando serve**: ricevere passaggio filtrante, difesa schierata, spazio tra linee.
- **Ampiezza**: Giocatori si allargano per occupare campo; stirare difesa avversaria. **Quando serve**: creare spazi centrali, difesa compatta da aprire.
- **Compattezza**: Squadra si stringe in zona ristretta; linee ravvicinate. **Quando serve**: fase difensiva, proteggere risultato.

### 7.6 Situazioni di gioco
- **Transizione positiva** (riconquista → attacco): accelerazione immediata, passaggio verticale rapido; primi 5 secondi critici. **Quando serve**: riconquista alta o a metà campo.
- **Transizione negativa** (perdita palla → difesa): ripiegamento immediato, pressione su portatore; primi 3 secondi per pressing, poi ripiegare. **Quando serve**: palla persa in zona offensiva.
- **Finalizzazione**: 1v1 portiere (spiazzamento o potenza); area affollata (tiro al volo o deviazione); fuori area (tiro potente piazzato).
- **Gestione vantaggio**: abbassare ritmo, possesso sicuro, passaggi corti; ultimi 10-15 minuti. **Quando serve**: vantaggio 1-2 goal.
- **Recupero svantaggio**: aumentare ritmo, pressing alto, terzini alti; ultimi 10-20 minuti. **Quando serve**: svantaggio 1-2 goal.
- **Superiorità numerica**: mantenere possesso, circolare palla, attendere varco.
- **Inferiorità numerica**: compattezza estrema, difesa zona, contropiede.

### 7.7 Principi tattici e best practices
- **Occupazione spazio**: coprire larghezza e profondità campo; mai più di 4-5 giocatori in fase offensiva.
- **Supporto palla**: sempre 2-3 opzioni passaggio vicine.
- **Compattezza difensiva**: linee massimo 30-35 metri distanza.
- **Difesa**: marcatura passiva > pressing cieco; attacco: cambio ritmo > velocità costante.
- **Costruzione squadra**: bilanciamento offensivi/difensivi; complementarietà stili; Resistenza 85+ per 2-3 giocatori se pressing.
- **Sostituzioni**: 60-70 minuti ideale; prima che giocatori siano esausti.
- **Errori da evitare**: pressing sempre (scegliere momenti); sprint costante (esaurisce Resistenza); prevedibilità; zone scoperte.

---

## 8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)

**REGOLA FONDAMENTALE**:
- **Abilità native**: FISSE (con cui nasce la card)
- **Abilità aggiuntive**: MODIFICABILI tramite "Programmi Aggiunta Abilità"
- **Max 6 slot abilità totali** per giocatore
- **NON modificabili per giocatori TRENDING**
- **Modificabili per**: In evidenza, In risalto, Epico, Leggendario, Standard

### 8.1 Abilità Tiro
- **Tiro al volo**: Tiri precisi di prima intenzione dopo stop. **Quando serve**: attaccanti, finalizzatori rapidi; letale in area su assist veloci.
- **Tiro a giro**: Tiri con effetto. **Quando serve**: angoli stretti, fin di palo.
- **Tiro Potente**: Tiri con maggiore potenza. **Quando serve**: fuori area, portiere in uscita.
- **Punta di Precisione**: Tiri precisi in area. **Quando serve**: finalizzatori.
- **Tiro a scendere**: Tiri con traiettoria discendente. **Quando serve**: tiri da distanza.
- **Tiro a salire**: Tiri con traiettoria ascendente. **Quando serve**: tiri speciali.
- **A giro da distante**: Tiri a giro da fuori area. **Quando serve**: centrocampisti offensivi.
- **Esterno a giro**: Tiri a giro con esterno piede. **Quando serve**: angolazioni particolari.
- **Colpo di testa**: Conclusioni di testa più accurate. **Quando serve**: attaccanti fisici, cross; timing migliore su palloni aerei.
- **Tiro acrobatico**: Tiri acrobatici (rovesciate, ecc.). **Quando serve**: area affollata, posizioni scomode.
- **Finalizzazione**: Precisione in conclusione. **Quando serve**: attaccanti, punte.
- **Distanza**: Tiri precisi da lontano. **Quando serve**: centrocampisti offensivi, tiri da fuori area.

### 8.2 Abilità Passaggio
- **Passaggio di prima**: Passaggi rapidi e diretti di prima intenzione. **Quando serve**: triangolazioni veloci, gioco di prima, contro difese compatte.
- **Passaggio al volo**: Controllo e passaggio in un solo tocco. **Quando serve**: triangolazioni rapide, prima intenzione.
- **Passaggio filtrante**: Passaggi in profondità precisi. **Quando serve**: registi, creatori; fondamentale per smarcare attaccanti.
- **Lancio lungo preciso**: Passaggi lunghi accurati. **Quando serve**: costruzione dal basso, cambi gioco, contropiede.
- **Cross preciso**: Cross dalla fascia più precisi. **Quando serve**: esterni, terzini offensivi; cross normali meno efficaci.
- **Passaggio sensazionale**: Passaggi potenti (R2)
- **Passaggio senza guardare**: Passaggio senza guardare ricevente; spiazza avversari. **Quando serve**: creatori, gioco imprevedibile.
- **Passaggio dosato**: Passaggi lunghi/filtranti con backspin per migliore precisione. **Quando serve**: registi, cambi gioco.
- **Passaggio alto rasoterra**: Passaggio lungo con traiettoria bassa quando appropriato. **Quando serve**: costruzione, contropiede.
- **Rabona**: Esecuzione in rabona; passaggio o tiro imprevedibile. **Quando serve**: creatori tecnici.
- **Tocco di tacco**: Passaggio o tiro di tacco anche da posizioni scomode. **Quando serve**: assist improvvisi, finalizzatori.

### 8.3 Abilità Dribbling e Controllo
- **Doppio tocco**: Skill base cambio direzione. **Quando serve**: ali, dribblatori; efficace in 1v1.
- **Elastico**: Cambio direzione rapido con esterno. **Quando serve**: 1v1, spazi stretti.
- **Controllo di suola**: Controllo palla con suola. **Quando serve**: spazi stretti, protezione palla.
- **Doppio tocco speciale**: Combo Doppio tocco + Elastico + Controllo suola. **Quando serve**: dribblatori tecnici.
- **Stop acrobatico**: Controllo palla acrobatico. **Quando serve**: passaggi difficili, posizioni scomode.
- **Finta tiro**: Finta tiro per ingannare difensore. **Quando serve**: 1v1 in area.
- **Finta passaggio**: Finta passaggio. **Quando serve**: aprire linee di passaggio.
- **Tocco secco**: Spinta palla rapida (R2 doppio). **Quando serve**: spazio davanti, accelerazione improvvisa.
- **Protezione**: Proteggere palla con corpo. **Quando serve**: pressione alta, spalle alla porta.

### 8.4 Abilità Difensive
- **Contrasto Aggressivo**: Tackle aggressivi con minori falli
- **Intercettazione**: Intercettare passaggi più facilmente. **Quando serve**: difensori, mediani; prioritaria per recupero palla.
- **Marcatura**: Marcare avversario più efficacemente
- **Entrata aggressiva**: Contrasti più efficaci
- **Sliding tackle**: Tackle scorrevoli efficaci
- **Rientro difensivo**: Rientra rapidamente in fase difensiva dopo fase offensiva. **Quando serve**: centrocampisti, Box-to-Box, ali offensive.
- **Blocco**: Maggiore efficacia nel bloccare passaggi e tiri. **Quando serve**: difensori centrali, mediani.
- **Stoppaggio acrobatico**: Stoppate acrobatiche con i piedi. **Quando serve**: difensori, interventi di emergenza in area.
- **Superiorità aerea**: Maggiore probabilità di vincere duelli aerei. **Quando serve**: difensori centrali, attaccanti fisici, cross.

### 8.5 Abilità Portiere
- **Riflessi Felini**: Parate ravvicinate miracolose. **Quando serve**: portieri, 1v1.
- **Presa sicura**: Afferrare palla invece di respingere. **Quando serve**: ridurre ribalzi.
- **Uscita portiere**: Uscite più sicure. **Quando serve**: linea alta, passaggi filtranti.
- **Parata con piedi**: Parate con piedi su tiri bassi. **Quando serve**: tiri rasoterra.
- **Piazzamento**: Posizionamento ottimale in porta.
- **Estensione PT**: Copertura maggiore porta. **Quando serve**: tiri angolati.

### 8.6 Abilità Fisiche e Atletiche
- **Scatto**: Accelerazione esplosiva. **Quando serve**: attaccanti, ali, contropiede.
- **Resistenza superiore**: Maggiore resistenza alla fatica. **Quando serve**: Box-to-Box, terzini, pressing.
- **Forza fisica**: Maggiore potenza fisica. **Quando serve**: duelli, protezione palla.
- **Agilità superiore**: Maggiore agilità. **Quando serve**: dribblatori, 1v1.
- **Salto**: Salto più potente. **Quando serve**: difensori, attaccanti su cross.
- **Velocità**: Velocità massima superiore. **Quando serve**: ali, attaccanti veloci.

### 8.7 Abilità Speciali e Leadership
- **Leader**: Ispira compagni, riduce impatto fatica squadra. **Quando serve**: partite lunghe, giocatori chiave.
- **Specialista cross**: Cross più precisi e pericolosi. **Quando serve**: esterni, Vie laterali.
- **Specialista punizioni**: Punizioni più precise. **Quando serve**: tiratori punizioni.
- **Specialista rigori**: Rigori più sicuri. **Quando serve**: tiratori designati.
- **Tiratore**: Tiri da fuori area più precisi. **Quando serve**: centrocampisti offensivi, tiri da distanza.
- **Lancio lungo**: Maggiore ampiezza lancio dalle mani (laterali/portieri). **Quando serve**: rinvii rapidi.
- **Super riserva**: Prestazioni migliorate quando subentra in corso partita. **Quando serve**: panchinari d’impatto, cambi tattici.
- **Spirito combattivo**: Prestazioni migliori sotto pressione e fatica. **Quando serve**: Box-to-Box, mediani, pressing.
- **Tattica**: Maggiore probabilità di ottenere falli quando appropriato. **Quando serve**: giocatori esperti, gestione tempo.

### 8.8 Programmi Aggiunta Abilità
- **Disponibile per**: In evidenza, In risalto, Epico, Leggendario, Standard
- **NON disponibile per**: Trending (già max livello)
- **Come funziona**: Usa programmi per far apprendere abilità al giocatore
- **Max slot**: 6 abilità totali (native + aggiunte)

### 8.9 Priorità abilità per ruolo (per consigli)
Quando si consigliano abilità da aggiungere (tramite Programmi, se non Trending): **Attaccanti** → Tiro al volo, Colpo di testa (se fisico), Tiro acrobatico, Controllo pallonetto; **Registi** → Passaggio filtrante, Passaggio di prima, Passaggio dosato; **Mediani** → Intercettazione, Contrasto Aggressivo, Rientro difensivo, Spirito combattivo; **Difensori** → Intercettazione, Marcatura, Colpo di testa, Superiorità aerea, Blocco; **Ali** → Doppio tocco, Cross preciso, Rientro difensivo; **Terzini** → Intercettazione, Cross preciso (se offensivi); **Riserve d'impatto** → Super riserva. Evitare abilità difensive su attaccanti puri; evitare abilità offensive su difensori centrali; max 2-3 abilità dribbling per giocatore.

---

## 9. COMPETENZE E SVILUPPO

### Frecce forma
- **Freccia Su**: forma ottimale, prestazioni migliorate
- **Freccia Giù**: forma scarsa, prestazioni ridotte
- **Neutro**: forma normale
L'influenza sulle prestazioni è significativa; considerare le frecce quando si scelgono titolari.

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

### 9.4 Forza base e Forza complessiva
- **Forza base**: valutazione pura delle statistiche del giocatore (Overall, Velocità, Tiro, ecc.).
- **Forza complessiva**: tiene conto di forza base, alchimia di squadra, competenza nella posizione, compatibilità stile con allenatore. È il parametro più rappresentativo della prestazione effettiva in campo. Quando si consiglia formazione o sostituzioni, considerare la forza complessiva, non solo la base.

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
   - **Punta avanzata** (non "Adv. Striker" in risposta IT). **Punta arretrata** (Deep-Lying Forward).
   - **Classico n° 10** (non "trequartista classico"): lo stile si chiama **Classico n° 10**
   - **Rapace d'area** (con apostrofo). Varianti utente: "rapace d area", "rapace d aera" → rispondi "Rapace d'area"
   - **Sviluppo**, **Frontale extra**, **Incontrista**: nomi ufficiali eFootball. **Sviluppo** = solo DC (Build Up); NON per CC/MED. Orchestrator (regista) = stile centrocampisti, diverso; per CC/MED vedi Tra le linee. NON usare "Costruttore" o "Difensore distruttore" (traduzioni errate). **Box-to-Box** e **Onnipresente** sono stili distinti.
   - **NON dire**: "Poacher" / "Build" / "Stamina" (termini community) → **CORRETTO**: "Opportunista" / "Statistiche" / "Resistenza"

4b. **Nomi stili con apostrofo**: Scrivi sempre **Rapace d'area** (con apostrofo). Il cliente può cercare "rapace d area" o "rapace d aera" (typo): rispondi con la forma ufficiale "Rapace d'area".

5. **NON confondere**: Stile giocatore (§2) vs Stile squadra (§4)
   - **Stile giocatore** (Opportunista, Collante, Box-to-Box) = FISSO, caratteristica card → sez. 2
   - **Stile squadra** (Possesso palla, Contropiede) = CONFIGURABILE, tattica → sez. 4
   - **team_playing_style (configurabile in app)** è SOLO uno di: Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali. Gli stili §4.2-4.5 (Pressing Alto, Gegenpressing, Tiki-Taka, Attacco Diretto, Cross e Finalizzazione, ecc.) NON sono configurabili come team_playing_style. Per consigli su stile squadra da impostare, suggerire SOLO i 5 sopra.

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
   - **Restrizioni di gioco**: **Linea bassa** NON è assegnabile a difensori (TD, TS, DC). **Contropiede** (Obiettivo contropiede, slot difensive) solo per centrocampisti e attaccanti (MED, CC, TRQ, SP, P, CF, CLD, CLS, EDA, ESA). **Ancoraggio**: massimo 2 giocatori in squadra.
   - **NON esistono** istruzioni individuali tipo "passaggi corti", "cross", "passaggi verso area", "favorire passaggi", "istruzioni per cross". NON inventare.
   - Per passaggi corti / gioco costruito → usa **Stile Squadra** (sezione 4): es. Possesso palla, Costruzione posizionale, Tiki-Taka. Per cross → **Stile Squadra** Cross e Finalizzazione, o giocatori con stile **Specialista cross** / abilità **Cross preciso**.

9. **ABILITÀ GIOCATORI – SOLO QUELLE DELLA SEZIONE 8 (OBBLIGATORIO)**
   - **Abilità native**: definite dalla card, FISSE (Tiro al volo, Passaggio filtrante, Contrasto Aggressivo, ecc.). Non si modificano.
   - **Abilità aggiuntive**: il **cliente** le può **inserire** tramite **Programmi Aggiunta Abilità** (sezione 8.8). Solo per card non Trending. **Max 6 abilità totali** (native + aggiunte) per giocatore.
   - Le abilità che puoi consigliare sono **SOLO** quelle sezione 8 (8.1 Tiro, 8.2 Passaggio, 8.3 Dribbling, 8.4 Difensive, 8.5 Portiere, 8.6 Fisiche, 8.7 Speciali). NON inventare nomi.
   - **NON** per giocatori **Trending**: "Quella card è Trending, non può ricevere abilità aggiuntive; schierala così com'è o usa un'altra card."
   - **Modificabili** (possono ricevere abilità aggiuntive tramite Programmi): In evidenza, In risalto, Epico, Leggendario, Standard.
   - Consiglia abilità **coerenti con il ruolo**: difensori → 8.4 (Contrasto Aggressivo, Intercettazione, Marcatura); portieri → 8.5; attaccanti/punte → 8.1/8.2 (Tiro al volo, Passaggio filtrante, Cross preciso); centrocampisti → 8.2/8.3/8.6 (Passaggio di prima, Resistenza superiore, …).

10. **Tiri mancati** – cause possibili (meccaniche eFootball): calciare durante dribbling veloce, orientamento corpo errato rispetto alla porta, piede debole (Precisione piede debole bassa), pressione del difensore. Non inventare altre cause.

11. **Pressing** – usarlo solo quando vicini al portatore e in sicurezza. Da lontano lascia spazi. Momento migliore: avversario con poche opzioni di passaggio (es. vicino alla linea laterale). NON pressare in spazi ampi dietro o al centro.

12. **Rigori (portiere)** – equilibrio fondamentale; non lasciare troppo spazio scoperto. Evitare di uscire troppo presto.

13. **Contromisure tattiche** – **Contro 4-3-3**: spazi centrali (solo 3 CC), fascia opposta quando ali salgono, profondità (difensori alti vulnerabili); contromisura 4-2-3-1 o 4-1-4-1. **Contro 4-2-3-1**: larghezza fasce, trequartista isolato (pressare), punta sola (marcare stretto); contromisura 4-3-3 o 3-5-2. **Contro 3-5-2**: spazi laterali alti, centrocampo affollato (usare ali); contromisura 4-3-3 con ali veloci. **Contro 4-4-2**: centro campo (solo 2 CC), profondità centrale; contromisura 4-3-3 o 4-2-3-1. **Contro 5-3-2**: centrocampo scoperto, mancanza ampiezza; contromisura 4-3-3 per ampiezza. **Contro Possesso avversario**: pressing organizzato, recuperare palla alta; linea alta, pressing aggressivo. **Contro Contropiede avversario**: possesso sicuro, evitare perdite pericolose; linea bassa, costruzione paziente. **Contro Long Ball avversario**: difensori alti, anticipare seconde palle; centrocampisti su seconde palle. **Contro Wing Play (Vie laterali) avversario**: chiudere fasce, soprannumero centro; terzini difensivi, centrocampisti larghi. **Contro Pressing alto**: passaggi lunghi, saltare centrocampo; punta fisica, 4-4-2 o 3-5-2. **Contro Difesa bassa**: possesso paziente, trequartista creativo, ampiezza; 4-3-3 o 4-2-3-1. **Contro Gioco fisico**: gioco tecnico, centrocampisti tecnici, passaggi rapidi; 4-2-3-1.

### ESEMPI RISPOSTE CORRETTE

**Utente**: "Che abilità mi servono per il mio difensore?"
SBAGLIATO: "Devi far crescere il contrasto del tuo difensore"
CORRETTO: "Per difensori utili: Abilità Giocatore come Contrasto Aggressivo, Intercettazione, Marcatura. Se il tuo giocatore non le ha, puoi aggiungerle tramite Programmi Aggiunta Abilità (se non è Trending). Oppure schiera una card dalla rosa che le abbia già native."

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

**Versione**: 8.0.0 ENTERPRISE | **Data**: 2 Febbraio 2026
**Principio**: FISSO vs CONFIGURABILE | **Terminologia**: Ufficiale eFootball
**Changelog 8.0**: Descrizioni ricche §2 §4 §8 (quando serve, perché); §1.6 Soglie/build per ruolo; §9.4 Forza base/complessiva; §7.5-7.7 Movimenti collettivi, Situazioni, Principi tattici; §3.5 Ruoli e comportamenti; §6 Meccanica calci piazzati; §10 punti 10-13; §8.9 Priorità abilità; Frecce forma.
