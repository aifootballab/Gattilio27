# Konami – Meccaniche e consigli ufficiali (solo fonti ufficiali)

**Data**: 2026-01-28  
**Scopo**: raccogliere SOLO ciò che Konami pubblica ufficialmente (manuali e patch notes/news) e trasformarlo in regole/meccaniche utilizzabili dall’IA **senza inventare**.

---

## Fonti ufficiali Konami usate (link)

- Manuale PS5 (controlli/skill di base): `https://www.konami.com/efootball/s/img/manual/manual_ps5_en.pdf`  
- Manuale eFootball 2023 (lista comandi principali): `https://www.konami.com/efootball/s/img/manual/efootball2023_ps5_en.pdf`  
- INFO DETAIL (v5.0.0, 2025-08-14): `https://www.konami.com/efootball/en-us/topic/news/3586`  
- Patch notes v2.4.0 (eFootball 2023): `https://www.konami.com/efootball/en-us/page/2023/season3_patch-notes_v2-40`  
- Carryover v3.0.0 (Game Plan, Team Playstyle level rimosso): `https://www.konami.com/efootball/en-us/page/2024/update_v3_0`

---

## 1) Meccaniche “core” (difesa) citate da Konami

### 1.1 Pressure / Call for Pressure
Da Konami (v5.0.0):
- mentre usi **Pressure** o **Call for Pressure**, i giocatori con alta **Defensive Awareness** tracciano meglio gli avversari;
- sono stati fatti aggiustamenti per evitare reazioni “troppo veloci” contro dribbling/finte;
- **Call for Pressure** viene **annullato** se usato per un certo tempo e i giocatori che pressano sono troppo lontani dalla palla.

Fonte: `https://www.konami.com/efootball/en-us/topic/news/3586`

### 1.2 Match-up
Da Konami (v5.0.0):
- ampliato il range di movimento quando il difensore si trova tra portatore e porta;
- movimento più “smooth” secondo gli input direzionali (entro range correggibile);
- migliorata risposta subito dopo cambio cursore manuale.

Fonte: `https://www.konami.com/efootball/en-us/topic/news/3586`

---

## 2) Meccaniche “core” (attacco/controllo palla) citate da Konami

### 2.1 Accelerazione e movimenti in corsa
Da Konami (v5.0.0):
- l’accelerazione nella corsa dipende da **Acceleration** *e* anche da **Offensive Awareness**;
- in certe situazioni i giocatori corrono al ~70% della velocità, non sempre al massimo;
- i giocatori possono decelerare quando corrono da posizioni profonde dietro la linea difensiva.

Fonte: `https://www.konami.com/efootball/en-us/topic/news/3586`

### 2.2 Dribbling e “second touch”
Da Konami (v2.4.0):
- migliorata la risposta del dribbling (soprattutto subito dopo controllo passaggio o dopo una sterzata ampia);
- **Ball Control** influenza la manovrabilità sulle “second touches” (secondo tocco) → più Ball Control = transizione più agile verso passaggio/tiro/dribbling.

Fonte: `https://www.konami.com/efootball/en-us/page/2023/season3_patch-notes_v2-40`

---

## 3) Manuale Konami (controlli utili, estratto)

> Nota: è manuale PS5, quindi tasti come R1/R2 sono riferiti al controller PlayStation. Il concetto è valido anche su altre piattaforme, ma i tasti cambiano.

Dal manuale:
- **Kick Feint**: dopo aver premuto un tasto di calcio, premi subito “cancel” per annullare e ingannare il difensore.
- **Sharp Touch**: pressione completa e rilascio immediato di R2 durante dribbling o stop → tocco secco in avanti.
- **Controlled Shot**: R1 sul tiro → meno potenza, più traiettoria “buona”.
- **Pass-and-run (Cross Over)**: R1 + passaggio → il passatore fa una corsa in avanti.
- **Dash**: R2 → controlli quanto il giocatore “spinge” la palla e quindi la velocità.
- **Stunning Kicks**: pressione completa di R2 insieme a passaggio/cross/tiro → passaggi/cross/tiro più incisivi ma con tempo di rilascio palla più lento (meglio se sei libero).

Fonte: `https://www.konami.com/efootball/s/img/manual/manual_ps5_en.pdf`

---

## 4) Team Playstyle e posizionamento (citazioni Konami)

### 4.1 Possession Game (Team Playstyle)
Da Konami (v5.0.0):
- con Team Playstyle “**Possession Game**”, terzini tendono a posizionarsi più alti in costruzione (salvo stili giocatore specifici);
- alcuni CC/MED si posizionano “leggermente più alti” in costruzione (salvo stili giocatore specifici).

Fonte: `https://www.konami.com/efootball/en-us/topic/news/3586`

### 4.2 Out Wide (Team Playstyle)
Da Konami (v2.4.0):
- aggiustamenti a Team Playstyle “**Out Wide**” per avere più compagni in supporto per ricevere passaggi e rendere l’attacco più fluido.

Fonte: `https://www.konami.com/efootball/en-us/page/2023/season3_patch-notes_v2-40`

---

## 5) Regole “anti-invenzione” per usare queste meccaniche nel prodotto

- **Queste meccaniche sono “in-match”** (Pressure/Match-up/Call for Pressure, dribbling, feint, stunning kick): l’IA deve consigliarle come “comandi/azioni durante il match”, non come “impostazioni pre-partita”.
- **Pre-partita**: l’IA deve limitarsi a ciò che l’utente può davvero impostare (formazione, stile squadra supportato dalla tua app, titolari/riserve, istruzioni individuali).
- Quando cita un concetto, se non è una voce di menu verificabile, deve dirlo in forma descrittiva (“squadra più compatta”, “attacca più sulle fasce”) senza inventare nomi ufficiali di menu.

