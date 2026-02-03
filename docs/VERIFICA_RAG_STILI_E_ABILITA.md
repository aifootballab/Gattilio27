# Verifica RAG – Stili Giocatore e Abilità

**Data**: 2 Febbraio 2026  
**Obiettivo**: Controllare completezza e riconoscimento di stili e abilità in info_rag e ragHelper.

---

## 1. STILI GIOCATORE – Verifica completezza

### 1.1 Lista ufficiale (VERIFICA_STILI_EFOOTBALL + Game8)

| EN (Game8) | IT (info_rag) | In info_rag §2? | In SECTION_KEYWORDS? |
|------------|---------------|-----------------|----------------------|
| Poacher | Opportunista | ✅ | ✅ |
| Adv. Striker | Punta avanzata | ✅ | ✅ |
| Dummy Runner | Senza palla | ✅ | ✅ |
| Fox in the Box | Rapace d'area | ✅ | ✅ |
| Target Man | Fulcro di gioco | ✅ | ✅ |
| Deep-Lying Forward | Punta arretrata | ✅ | ✅ |
| Prolific Winger | Ala prolifica | ✅ | ✅ |
| Roaming Flank | Taglio al centro | ✅ | ✅ |
| Cross Specialist | Specialista di cross | ✅ | ✅ |
| Classic No. 10 | Classico n° 10 | ✅ | ✅ |
| Creative Playmaker | Regista creativo | ✅ | ✅ |
| Hole Player | Giocatore chiave | ✅ | ✅ |
| Box-to-Box | Box-to-Box | ✅ | ✅ |
| The Destroyer | Incontrista | ✅ (con nota no "Distruttore") | ✅ |
| Orchestrator | Stile CC/MED (regista) – non "Sviluppo"; nel DB: Tra le linee (CC,MED) | ✅ | ✅ |
| Anchor Man | Collante | ✅ | ✅ |
| Build Up | Sviluppo (solo DC) | ✅ | ✅ |
| Extra Frontman | Frontale extra | ✅ | ✅ |
| Offensive Fullback | Terzino offensivo | ✅ | ✅ |
| Defensive Fullback | Terzino difensivo | ✅ | ✅ |
| Fullback Finisher | Terzino mattatore | ✅ | ✅ |
| Offensive Goalkeeper | Portiere offensivo | ✅ | ✅ |
| Defensive Goalkeeper | Portiere difensivo | ✅ | ✅ |
| *(non in Game8)* | Onnipresente | ✅ | ✅ |

**Stili IA (Con Palla)**: Funambolo, Serpentina, Treno in corsa, Inserimento, Esperto palle lunghe, Crossatore, Tiratore – **tutti presenti** ✅

**Esito stili**: Tutti presenti in info_rag. SECTION_KEYWORDS copre i nomi IT e alcuni EN.

---

## 2. ABILITÀ – Verifica completezza (FIFPlay eFootball 2024)

### 2.1 Abilità in info_rag vs lista ufficiale

| Abilità EN (FIFPlay) | Abilità IT (info_rag) | In info_rag §8? |
|---------------------|------------------------|-----------------|
| Double Touch | Doppio tocco | ✅ |
| Flip Flap | Elastico | ✅ (Elastico) |
| Marseille Turn | Veronica | ✅ (Veronica in §7.3) |
| Sombrero | Sombrero | ✅ |
| Chop Turn | Svolta secca | ✅ (§7.3) |
| Cut Behind & Turn | — | ❌ **MANCA** |
| Scotch Move | — | ❌ **MANCA** |
| Sole Control | Controllo di suola | ✅ |
| Scissors Feint | — | ❌ **MANCA** |
| Heading | Colpo di testa | ✅ |
| Long-Range Curler | A giro da distante | ✅ |
| Chip Shot Control | — | ❌ **MANCA** |
| Long-Range Shooting | Distanza | ✅ |
| Knuckle Shot | — | ❌ **MANCA** |
| Dipping Shot | Tiro a scendere | ✅ |
| Rising Shot | Tiro a salire | ✅ |
| Acrobatic Finishing | Tiro acrobatico | ✅ |
| Heel Trick | — | ❌ **MANCA** |
| First-time Shot | Tiro al volo | ✅ |
| One-touch Pass | Passaggio di prima | ✅ |
| Through Passing | Passaggio filtrante | ✅ |
| Weighted Pass | — | ❌ (Passaggio sensazionale è R2, diverso) |
| Pinpoint Crossing | Cross preciso | ✅ |
| Outside Curler | Esterno a giro | ✅ |
| Rabona | — | ❌ **MANCA** |
| No Look Pass | — | ❌ **MANCA** |
| Low Lofted Pass | — | ❌ **MANCA** |
| GK Low Punt | — | ❌ **MANCA** |
| GK High Punt | — | ❌ **MANCA** |
| Long Throw | — | ❌ **MANCA** |
| GK Long Throw | — | ❌ **MANCA** |
| Penalty Specialist | Specialista rigori | ✅ |
| GK Penalty Saver | — | ❌ **MANCA** |
| Gamesmanship | — | ❌ **MANCA** |
| Man Marking | Marcatura | ✅ |
| Track Back | — | ❌ **MANCA** |
| Interception | Intercettazione | ✅ |
| Blocker | — | ❌ **MANCA** |
| Aerial Superiority | — | ❌ **MANCA** |
| Sliding Tackle | Sliding tackle | ✅ |
| Acrobatic Clearance | — | ❌ **MANCA** |
| Captaincy | Leader | ✅ |
| Super-sub | — | ❌ **MANCA** |
| Fighting Spirit | — | ❌ **MANCA** |

### 2.2 Abilità in info_rag non mappate da FIFPlay
- Tiro Potente, Punta di Precisione, Finalizzazione (possono essere statistiche o abilità)
- Passaggio al volo, Passaggio sensazionale
- Stop acrobatico, Finta tiro, Finta passaggio, Tocco secco, Protezione
- Contrasto Aggressivo, Entrata aggressiva
- Riflessi Felini, Presa sicura, Uscita portiere, Parata con piedi, Piazzamento, Estensione PT
- Scatto, Resistenza superiore, Forza fisica, Agilità superiore, Salto, Velocità
- Specialista cross, Specialista punizioni, Tiratore

*Nota: eFootball può avere nomi diversi tra versioni e lingue. L'estrazione Vision restituisce i nomi come compaiono nello screenshot (IT o EN).*

---

## 3. COME VIENE ELABORATO – Flusso dati

### 3.1 Stili giocatore

| Fase | Dove | Cosa succede |
|------|------|--------------|
| **Estrazione** | extract-player | Vision estrae `playing_style` (es. "Opportunista", "Box-to-Box") |
| **Salvataggio** | save-player | Cerca in `playing_styles` con `ilike name` → ottiene `playing_style_id` |
| **Rosa chat** | assistant-chat buildPersonalContext | `stylesLookup[playing_style_id]` → nome (es. "Opportunista") |
| **RAG** | getRelevantSections | Keyword messaggio → carica §2 STILI GIOCATORE |
| **Filtro ruolo** | getStiliContentFilteredByRole | Cerca `### Attaccanti` o `### Centrocampisti` o `### Difensori` |

**Problema identificato**: La regex in `getStiliContentFilteredByRole` cerca `### (Attaccanti|Centrocampisti|Difensori)` ma info_rag ha `#### Attaccanti e Centrocampisti Offensivi`, `#### Centrocampisti e Difensori`, `#### Terzini e Portieri`. **La regex non matcha** → il filtro non funziona, viene restituito sempre il contenuto completo. Non è un errore critico (l'IA riceve tutto), ma il filtro per ruolo non opera.

### 3.2 Abilità

| Fase | Dove | Cosa succede |
|------|------|--------------|
| **Estrazione** | extract-player | Vision estrae `skills` e `com_skills` (array di stringhe) |
| **Salvataggio** | save-player | Salva in `players.skills`, `players.com_skills` (JSONB) |
| **Rosa chat** | buildPersonalContext | Non include esplicitamente le abilità nel testo rosa (solo profilazione: "completa/parziale") |
| **RAG** | getRelevantSections | Keyword → carica §8 ABILITÀ |
| **Paletti** | route.js | "Abilità: solo sez. 8", "NON inventare" |

**Nota**: Le abilità del giocatore non sono nel riassunto rosa inviato all'IA (per risparmio token). L'IA sa che deve consigliare solo abilità da §8, ma non riceve l'elenco abilità di ogni giocatore nel contesto.

---

## 4. SECTION_KEYWORDS e ROLE_KEYWORDS

### 4.1 §2 Stili – keyword per caricamento
Presenti: opportunista, punta avanzata, rapace d'area, fulcro, box-to-box, collante, incontrista, classico 10, regista creativo, terzino offensivo/difensivo, portiere offensivo/difensivo, ecc. + sinonimi EN (poacher, hole player, anchor man, orchestrator).

### 4.2 §8 Abilità – keyword per caricamento
Presenti: tiro al volo, colpo di testa, passaggio filtrante, intercettazione, cross preciso, doppio tocco, elastico, contrasto aggressivo, marcatura, scatto, resistenza superiore, leader, ecc.

**Mancano** (per abilità non in info_rag): chip shot, track back, acrobatic clear, aerial superiority, super-sub, fighting spirit, gk low punt, gk high punt, no look pass, blocker, gamesmanship.

---

## 5. RACCOMANDAZIONI

### 5.1 Priorità alta
1. ~~**Aggiungere abilità mancanti** in info_rag §8~~ ✅ **FATTO (2 feb 2026)**:
   Abilità aggiunte: Controllo pallonetto, Tiro a nocca; Passaggio senza guardare, Passaggio dosato, Passaggio alto rasoterra, Rabona, Tocco di tacco; Taglio dietro e svolta, Scotch move, Finta forbice; Rientro difensivo, Blocco, Stoppaggio acrobatico, Superiorità aerea; Rilancio basso/alto/lungo PT, Parata rigori; Lancio lungo, Super riserva, Spirito combattivo, Tattica. SECTION_KEYWORDS §8 aggiornato.

2. **Verificare nomi** con versione IT del gioco (screenshot o guida IT) per allineare extract → RAG.

### 5.2 Priorità media
3. **Filtro ruolo §2**: Aggiornare regex in `getStiliContentFilteredByRole` per matchare `#### Attaccanti e Centrocampisti` (blocco attaccanti), `#### Centrocampisti e Difensori` (blocco centrocampo), `#### Terzini e Portieri` (blocco difensori). Oppure aggiungere titoli ### Attaccanti, ### Centrocampisti, ### Difensori in info_rag.

4. **Rosa + abilità**: Valutare se includere sintesi abilità nel contesto personale (es. "Messi: Tiro al volo, Passaggio filtrante") per consigli più mirati, considerando limite token.

### 5.3 Priorità bassa
5. **Sinonimi EN** in §10 NOTE CRITICHE: Aggiungere mapping esplicito per abilità EN→IT quando l'utente o l'estrazione usa termini inglesi.

---

*Fine documento verifica.*
