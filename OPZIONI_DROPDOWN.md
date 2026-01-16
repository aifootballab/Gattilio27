# Opzioni Dropdown - EditPlayerDataModal

Questo documento contiene tutte le opzioni disponibili per i menu a tendina nel form di inserimento manuale dati giocatore.

## Skills (Abilità Giocatore)

Lista completa delle skills disponibili in eFootball:

- A giro da distante
- Astuzia
- Colpo di tacco
- Controllo di suola
- Cross calibrato
- Cross spiovente
- Doppio tocco
- Dribbling fulminei
- Elastico
- Esterno a giro
- Fighting Spirit
- Finta doppio passo
- Intercettazione
- Marcatore
- No-look
- Passaggi illuminanti
- Passaggio a scavalcare
- Passaggio di prima
- Passaggio filtrante
- Rimessa lat. lunga
- Scatto bruciante
- Scivolata
- Sombrero
- Specialista dei rigori
- Taglia alle spalle e gira
- Tiro a giro
- Tiro a salire
- Tiro dalla distanza
- Tiro di prima

**Nota**: Le skills sono le stesse sia per "Player Skills" che per "Additional Skills" (com_skills).

---

## Teams (Squadre)

Lista squadre presenti nel database (da completare con tutte le squadre eFootball):

- Arsenal
- AS Roma 00-01
- Barcellona
- FC Barcelona 05-06
- FC Bayern München 73-74
- Internazionale Milano 09-10
- Madrid Chamartin B
- Madrid Chamartín B
- Madrid Chamartin B 19-20
- Paris Saint-Germain
- Tottenham WB 09-10

**Nota**: Aggiungere tutte le squadre disponibili in eFootball. Il campo accetta anche testo libero se la squadra non è in lista.

---

## Nationalities (Nazionalità)

Lista nazionalità presenti nel database (da completare con tutte le nazionalità eFootball):

- Belgio
- Brasile
- Francia
- Galles
- Germania
- Inghilterra
- Spagna

**Nota**: Aggiungere tutte le nazionalità disponibili in eFootball. Il campo accetta anche testo libero se la nazionalità non è in lista.

---

## Positions (Posizioni)

Lista posizioni disponibili in eFootball:

- AMF (Attaccante Centrale)
- CC (Centrocampista Centrale)
- CF (Centravanti)
- DC (Difensore Centrale)
- ESA (Esterno Sinistro Attaccante)
- GK (Portiere)
- LWF (Ala Sinistra)
- MED (Mediano)
- P (Portiere)
- RB (Terzino Destro)
- RWF (Ala Destra)
- TD (Terzino Destro)
- Terzino offensivo

**Nota**: Le posizioni possono essere codici (es: AMF, CF) o nomi completi. Aggiungere tutte le posizioni standard eFootball.

---

## AI Playstyles (Stili di Gioco IA)

Lista stili di gioco IA disponibili:

- Crossatore
- Esperto palle lunghe
- Funambolo
- Inserimento
- Serpentina
- Tiratore
- Treno in corsa

**Nota**: Questi sono gli stili di gioco che l'IA del giocatore può utilizzare durante le partite.

---

## Boosters (Potenziatori)

Lista booster disponibili:

- Crossatore
- Fantasista
- Gestione del pallone
- Motore offensivo
- Movimento senza palla
- Slot Booster
- Tecnica

**Nota**: Ogni giocatore può avere massimo 2 booster attivi. Ogni booster ha:
- `name`: Nome del booster
- `effect`: Effetto (es: "+2 a Controllo palla, Dribbling...")
- `activation_condition`: Condizione di attivazione (opzionale)

---

## Form (Forma)

Valori possibili per il campo "Form":

- A
- B
- C
- D
- E
- Incrollabile
- Stabile

---

## Preferred Foot (Piede Preferito)

Valori possibili:

- Destro
- Sinistro
- Ambidestro

---

## Weak Foot Frequency (Frequenza Piede Debole)

Valori possibili:

- Raramente
- A Volte
- Spesso

---

## Weak Foot Accuracy (Precisione Piede Debole)

Valori possibili:

- Alta
- Media
- Bassa

---

## Form Detailed (Forma Dettagliata)

Valori possibili:

- Incrollabile
- Stabile
- A
- B
- C

---

## Injury Resistance (Resistenza Infortuni)

Valori possibili:

- Alta
- Media
- Bassa

---

## Note Implementazione

1. **Dropdown vs Text Input**: 
   - Per Skills, Teams, Nationalities, Positions, AI Playstyles, Boosters: usare `<select>` con opzioni predefinite
   - Aggiungere sempre opzione vuota "—" o "Seleziona..." come primo elemento
   - Considerare di permettere anche inserimento libero per Teams e Nationalities (campo ibrido)

2. **Ordinamento**:
   - Skills: alfabetico
   - Teams: alfabetico
   - Nationalities: alfabetico
   - Positions: prima codici (AMF, CF, ecc.), poi nomi completi
   - AI Playstyles: alfabetico
   - Boosters: alfabetico

3. **Multiselect**:
   - Skills, AI Playstyles, Additional Positions: possono essere multiple (array)
   - Boosters: massimo 2
   - Teams, Nationalities: singolo valore

4. **Validazione**:
   - Verificare che i valori selezionati siano validi
   - Per Skills/Playstyles multiple, rimuovere duplicati

---

## Aggiornamenti

Questo file deve essere aggiornato quando:
- Vengono aggiunte nuove skills in eFootball
- Vengono aggiunte nuove squadre/nazionalità
- Cambiano le posizioni disponibili
- Vengono introdotti nuovi booster o playstyles
