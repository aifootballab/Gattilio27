# Coerenza: Memoria Attila vs info_rag (RAG) – Spiegazione e verifica

## 1. Cosa c’entra la Memoria Attila con le sezioni RAG?

**Risposta breve**: la Memoria Attila **non** è usata dal sistema. Le sezioni RAG sono **solo** quelle in **info_rag.md**. La Memoria Attila serve a **noi** (te + Cursor) per allineare e verificare.

### Chi legge cosa

| File | Chi lo legge | Quando |
|------|--------------|--------|
| **info_rag.md** | L’**API** (assistant-chat) tramite `ragHelper.js` | Quando la domanda è classificata come eFootball: `getRelevantSections(message)` legge **solo** info_rag.md e sceglie le sezioni ## (1, 2, 3, … 10). |
| **MEMORIA_ATTILA_BRAINSTORM.md** | Solo **tu** e **Cursor** (per brainstorming) | Quando lavoriamo sul progetto: per non contraddire le regole di gioco quando modifichiamo info_rag o il prompt. **L’app e l’API non lo aprono mai.** |

Quindi:
- Le **sezioni RAG** sono **solo** le `##` di **info_rag.md** (OBIETTIVO, CONTESTO VIDEOGIOCO, 1. STATISTICHE …, 2. STILI …, … 10. NOTE CRITICHE).
- La **Memoria Attila** (ripulita) ha 14 blocchi (1. Statistiche, 2. Stili, … 14. Sistema ML): è una **mappa concettuale** delle regole di gioco, **non** un file che il RAG carica.
- Il **collegamento** è: quando aggiungiamo o cambiamo qualcosa in info_rag o nel prompt, usiamo la Memoria Attila come **riferimento** per controllare che non ci siano errori o contraddizioni con le regole di gioco.

In sintesi: **Memoria Attila = “libretto di gioco” per noi; info_rag = “libretto” che l’AI legge davvero.**

---

## 2. Mappa: Memoria Attila (14 blocchi) ↔ Sezioni info_rag (##)

Non c’è corrispondenza 1:1. Questa è la mappa logica:

| Memoria Attila (ripulita) | info_rag.md (sezioni ##) | Note |
|---------------------------|---------------------------|------|
| §1 Statistiche giocatori | ## 1. STATISTICHE GIOCATORI | Stesso contenuto; info_rag più dettagliato (sottosezioni, Equilibrio, Comportamento Offensivo). |
| §2 Stili di gioco (senza palla) | ## 2. STILI DI GIOCO DEI GIOCATORI (§2.1) | Allineati (nomi + posizioni compatibili). |
| §3 Stili di gioco IA | ## 2. STILI … (§2.2 Stili IA) | Allineati. |
| §4 Modifica posizione – limiti | ## 3. MODULI TATTICI (§3.4 Limiti di schieramento) | Allineati (aggiunto in info_rag come da piano). |
| §5 Forza base / Forza complessiva | **Non presente** | Vedi “Gap” sotto. |
| §6 Stile di gioco di squadra e allenatore | ## 4. STILI TATTICI DI SQUADRA | Allineati (5 stili base + estesi). |
| §7 VG e tipologie | ## 9. COMPETENZE E SVILUPPO (§9.1, §9.3) | Allineati. |
| §8 Competenze posizione | ## 9. COMPETENZE E SVILUPPO (§9.2) | Allineati (livelli, max 2 slot, Trending no). |
| §9 Squadre (Autentica / dei Sogni) | Solo citato in §9.1 “Squadra dei Sogni” | Vedi “Gap” sotto. |
| §10 Moduli tattici | ## 3. MODULI TATTICI (§3.1–3.3) | Allineati. |
| §11 Calci piazzati | ## 6. CALCI PIAZZATI | Allineati. |
| §12 Abilità e consigli (Leader, uno-due, pressing, tiri mancati, rischio infortunio) | ## 7 MECCANICHE, ## 8 ABILITÀ (Leader), ## 10 NOTE CRITICHE | Leader e uno-due/pressing in info_rag; “tiri mancati” e “rischio infortunio” non espliciti. Vedi “Gap”. |
| §13 Comandi / meccaniche | ## 7. MECCANICHE DI GIOCO AVANZATE | Allineati. |
| §14 Sistema ML / Report | Non in info_rag (è per programmatore) | Voluto: non serve alla chat. |

---

## 3. Controllo coerenza: cosa manca o è incoerente

### 3.1 Incoerenza trovata (da correggere)

**Tabella “FISSO vs MODIFICABILE” in info_rag (CONTESTO VIDEOGIOCO)**

- Oggi c’è: **Abilità Giocatore** → ✅ FISSO.
- Ma in ## 8 si dice: abilità **native** fisse, abilità **aggiuntive** modificabili (Programmi).
- Quindi la tabella è **imprecisa**: fa pensare che tutte le abilità siano fisse.

**Correzione consigliata**: nella tabella, sostituire la riga “Abilità Giocatore” con due righe:
- **Abilità native** → FISSO  
- **Abilità aggiuntive** → MODIFICABILI (tramite Programmi Aggiunta Abilità; max 6 totali; non per Trending)

Così non c’è contraddizione con la sezione 8.

---

### 3.2 Gap in info_rag (opzionali)

| Cosa (dalla Memoria Attila) | In info_rag oggi | Azione suggerita |
|-----------------------------|------------------|-------------------|
| **Forza base / Forza complessiva** | Non presenti | Opzionale: 2 righe in ## 9 (es. sotto §9.3) o in CONTESTO VIDEOGIOCO: “Forza base = somma abilità individuali; Forza complessiva = considera anche alchimia, competenza posizione, stile.” |
| **Squadra Autentica vs Squadra dei Sogni** | Solo il titolo “Squadra dei Sogni” in §9.1 | Opzionale: 1 riga in §9: “Squadra Autentica = preimpostata, dati live; Squadra dei Sogni = personalizzata (giocatori, allenatori, eventi).” |
| **Tiri mancati** (cause: tiro in dribbling veloce o orientamento corpo sbagliato) | Non presente | Opzionale: 1 riga in ## 7 o in ## 10 (NOTE CRITICHE) come “consiglio tecnico”. |
| **Rischio infortunio** (sostituire giocatore se segnala problema) | Non presente | Opzionale: 1 riga in ## 10 o in ## 1 (caratteristiche speciali). |

Nessuno di questi gap è critico per il funzionamento della chat; sono migliorie per completezza.

---

### 3.3 Coerenza verificata (nessun conflitto)

- Statistiche: stessi nomi e concetti (Resistenza, non “Stamina”; Forma “Incrollabile”, ecc.).
- Stili di gioco + posizioni compatibili: allineati (incluso Sviluppo CC/MED/DC, Collante MED, ecc.).
- Limiti formazione (A/C/D/PT): uguali in Memoria e in info_rag §3.4.
- Istruzioni individuali: stesse 7 + Ancoraggio max 2 giocatori.
- Abilità: native fisse + aggiuntive tramite Programmi, non per Trending, max 6 totali.
- Competenze posizione: livelli Basso/Intermedio/Alto, max 2 slot, Trending no, portieri/campo non interscambiabili.
- Moduli e stili di squadra: stessi elenchi.
- Calci piazzati: stesse opzioni (punizioni, corner, difesa).
- Comandi (uno-due, pressing, contrasto spalla, tiro sensazionale, ecc.): presenti in ## 7.

---

## 4. Riepilogo

- **Cosa c’entra Memoria Attila con le sezioni RAG?**  
  La Memoria Attila **non** è una sezione RAG: è un documento di riferimento per noi. Le sezioni RAG sono **solo** in **info_rag.md**. La Memoria serve per tenere **coerenti** info_rag e prompt con le regole di gioco.

- **Coerenza controllata?**  
  Sì: confronto fatto tra Memoria Attila (ripulita) e info_rag. Quasi tutto è allineato.

- **Cosa aggiungere / incoerenze?**  
  - **Da correggere**: tabella FISSO vs MODIFICABILE (Abilità → distinguere native fisse / aggiuntive modificabili).  
  - **Opzionale**: Forza base/complessiva, Squadra Autentica/Sogni, “tiri mancati”, “rischio infortunio” in info_rag se vuoi risposte più complete.

Se vuoi, il passo successivo è applicare la correzione alla tabella in info_rag (e eventualmente aggiungere le 2–4 righe opzionali).
