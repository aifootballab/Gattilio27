# Documento “Perfetto” – Terminologia eFootball (anti-invenzione)

**Data**: 2026-01-28  
**Obiettivo**: evitare termini PES “vecchi” e impedire all’IA di inventare voci di menu/impostazioni non verificabili.

---

## 1) Cosa è stato verificato su fonti ufficiali Konami

### **A) Comandi difensivi reali (in-match)**
Konami parla esplicitamente di comandi come **Pressure**, **Call for Pressure**, **Match-up** e dei loro effetti/aggiustamenti.

- Fonte ufficiale (Konami): [INFO DETAIL – New Season Update (v5.0.0)](`https://www.konami.com/efootball/en-us/topic/news/3586`)

> Nota: questi sono **comandi in partita**, non “impostazioni pre-partita”.

### **B) “Team Playstyle” (stile di squadra) citati da Konami**
Konami cita esplicitamente almeno:
- **Possession Game**
- **Out Wide**

- Fonte ufficiale (Konami): [eFootball 2023 v2.4.0 Patch Notes](`https://www.konami.com/efootball/en-us/page/2023/season3_patch-notes_v2-40`)  
- Fonte ufficiale (Konami): [INFO DETAIL – v5.0.0](`https://www.konami.com/efootball/en-us/topic/news/3586`) (esempio su “Possession Game”)

### **C) “Team Playstyle Level” e Game Plan**
Konami conferma che “Team Playstyle Level” è stato rimosso (v3.0.0) e che esiste il percorso **[Game Plan]** nel menu.

- Fonte ufficiale (Konami): [In-Game Asset and Data Carryover to v3.0.0](`https://www.konami.com/efootball/en-us/page/2024/update_v3_0`)

---

## 2) Cosa NON è stato trovato come voce “ufficiale” indicizzabile (quindi: NON lo trattiamo come certezza)

### **A) Termini PES “vecchi”**
Questi termini sono tipici del linguaggio PES/vecchie guide e **non li usiamo come “impostazioni”**:
- “gegenpressing”
- “tiki-taka”
- “catenaccio”

✅ Nel progetto **non sono più presenti** in nessun file.

### **B) Nomi specifici di “voci di menu” non confermate da Konami nelle pagine consultate**
Non abbiamo trovato (sulle pagine ufficiali consultate) prove testuali “facilmente citabili” che questi siano nomi ufficiali di voci Game Plan:
- “Frontline Pressure”, “All-out Defense”
- “Compactness”, “Support Range”, “Attacking Area”

➡️ Quindi, nel prompt l’IA non deve mai dirle come “impostazioni certe”.  
Se l’utente le vede nel proprio menu, può usarle, ma l’IA deve parlarne **in modo descrittivo** (“squadra più stretta”, “attacco più sulle fasce”) senza spacciare i nomi come ufficiali.

---

## 3) Cosa supporta la TUA app (verità “interna” del prodotto)

Nel DB (`team_tactical_settings.team_playing_style`) la tua app accetta **solo questi 5 valori**:
- `possesso_palla`
- `contropiede_veloce`
- `contrattacco`
- `vie_laterali`
- `passaggio_lungo`

Questi 5 sono la “verità operativa” della tua piattaforma: l’IA può e deve usarli quando suggerisce cambi stile **pre-partita**.

> Nota: Konami nelle fonti ufficiali che abbiamo letto cita esplicitamente “Possession Game” e “Out Wide” (molto vicini a `possesso_palla` e `vie_laterali`). Per gli altri tre nomi, non abbiamo trovato una pagina ufficiale indicizzabile che li riporti con quel testo: quindi li trattiamo come **valori interni app** (non come citazione Konami).

---

## 4) Stili del GIOCATORE (Collante / Giocatore chiave ecc.) – cosa sono davvero

- “Collante”, “Giocatore chiave”, “Classico n° 10”, ecc. sono **stili/ruoli di movimento del giocatore** (come si posiziona e si muove).  
- NON sono “toggle” di menu e NON vanno presentati come “impostazioni squadra”.

Questa parte è corretta e rimane in:
- `memoria_attila/02_stili_gioco.md`

---

## 5) Regola d’oro “anti-invenzione” (quella che rende il prompt sicuro)

Nel prompt contromisure (pre-partita) l’IA deve:
- suggerire **solo** cose configurabili con certezza (formazione, 5 stili squadra della tua app, titolari/riserve, istruzioni individuali)
- se parla di concetti “ampiezza/compattezza/linea più alta o bassa”, deve farlo **senza inventare nomi di voci** e usando formule tipo:
  - “Se nel tuo Game Plan esiste un’impostazione per…”

---

## 6) Stato attuale del progetto (dopo la pulizia)

### Memoria Attila “divisa” (moduli reali)
Cartella: `memoria_attila/` con:
- `01_statistiche_giocatori.md`
- `02_stili_gioco.md`
- `03_moduli_tattici.md`
- `04_competenze_sviluppo.md`
- `05_stili_tattici_squadra.md` (**solo i 5 stili squadra app**)
- `06_calci_piazzati.md` (uomo/zona in calci piazzati = ok)
- `07_meccaniche_gioco.md` (**ripulito**: tolte parti non-eFootball tipo “Machine Learning/Report”)
- `08_consigli_strategie.md`
- `index.json`
- `memoria_attila_definitiva_unificata.txt` (backup unificato, non usato dal prompt)

### Prompt contromisure (pre-partita)
File: `lib/countermeasuresHelper.js`  
È stato aggiornato per:
- non usare termini PES vecchi
- non usare nomi di menu non verificati come “certezza”
- mantenere “ampiezza” come concetto, non come voce di menu inventata

