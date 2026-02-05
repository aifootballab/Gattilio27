# Audit completo prompt AI Coach – 5 Febbraio 2026

**Trigger:** Risposta incoerente per utente zingaronicolo98@gmail.com (Zingaro)
**Caso:** Domanda "meglio alla tua rosa?" – AI consiglia Contropiede veloce citando competenza allenatore in contrattacco; roster reale senza Mbappé.

---

## 1. Dati reali vs risposta AI

| Fonte | Dato | Valore reale |
|-------|------|--------------|
| **Allenatore** | Fabio Capello | playing_style_competence: contrattacco 89, passaggio_lungo 89, vie_laterali 64, **contropiede_veloce 57**, possesso_palla 46 |
| **Rosa titolari** | Attaccanti | Messi, Neymar Jr, Zlatan, Rummenigge (NO Mbappé) |

**Risposta AI (errata):**
- Consiglia **Contropiede veloce** (competenza allenatore = 57)
- Dice "allenatore ha buona competenza nel **contrattacco**" (89) – stile diverso
- Cita **Mbappé** (non in rosa)

---

## 2. Bug identificati

### 2.1 Confusione contrattacco vs contropiede_veloce (CRITICO)

**Causa:** Nel prompt non è esplicitato che `contrattacco` e `contropiede_veloce` sono **chiavi distinte** con **valori numerici indipendenti**.

- `contrattacco` = 89 (consigliabile)
- `contropiede_veloce` = 57 (NON consigliabile)

L’AI usa la competenza di un stile per giustificare la raccomandazione di un altro.

**Dove:** `app/api/assistant-chat/route.js` – `buildPersonalContext` (righe 334-339), `buildPersonalizedPrompt` (paletti stile squadra), system message.

### 2.2 Allucinazione nomi giocatori

**Causa:** L’AI invoca conoscenza a priori (Mbappé + Neymar = contropiede) invece di limitarsi alla rosa fornita.

**Dove:** Regole "Usa SOLO nomi dalla lista" presenti ma non sufficientemente vincolanti; manca divieto esplicito per nomi comuni (Mbappé, Haaland, ecc.) se non in rosa.

### 2.3 Regola ">= 70" non applicata correttamente

**Causa:** La label "Competenze stili (solo >= 70 consigliabili)" è generica; non c’è regola del tipo: "Per stile X, controlla il valore di X; non usare il valore di Y".

---

## 3. Flusso dati (verificato)

1. **needsPersonalContext("meglio alla tua rosa?")** → true (contiene "rosa")
2. **buildPersonalContext** carica: formazione, players, matches, team_tactical_settings, **coaches** (con playing_style_competence), team_tactical_patterns
3. **Formato coach:** `Allenatore attivo: Fabio Capello. Competenze stili (solo >= 70 consigliabili): contrattacco 89, passaggio_lungo 89, vie_laterali 64, contropiede_veloce 57, possesso_palla 46.`
4. **classifyQuestion** → "efootball" → carica RAG da info_rag.md
5. **info_rag §4.1:** Contropiede veloce e Contrattacco sono descritti come stili diversi

Il contesto arriva corretto; il problema è nell’interpretazione e nelle regole del prompt.

---

## 4. File coinvolti

| File | Ruolo |
|------|--------|
| `app/api/assistant-chat/route.js` | buildPersonalContext, buildPersonalizedPrompt, system message |
| `lib/ragHelper.js` | needsPersonalContext, classifyQuestion |
| `info_rag.md` | RAG stili squadra §4 |

---

## 5. Correzioni da applicare

### 5.1 Paletto stili allenatore (assistant-chat)

Aggiungere nel prompt (sezione paletti / MODO COACH):

```
STILI ALLENATORE - REGOLA CRITICA:
- contrattacco e contropiede_veloce sono STILI DIVERSI (chiavi diverse nel DB).
- Consiglia uno stile SOLO se il suo valore numerico è >= 70.
- Esempio: consigliare "Contropiede veloce" solo se contropiede_veloce >= 70.
- VIETATO: usare la competenza di contrattacco per giustificare Contropiede veloce (e viceversa).
```

### 5.2 Formato contesto allenatore

In `buildPersonalContext`, ordinare le competenze e/o aggiungere un’avvertenza:

- Mantenere l’ordine per valore decrescente (già fatto)
- Aggiungere una riga esplicita: "Consigliabili (>= 70): [elenco]. Non consigliabili (< 70): [elenco]."

Oppure separare visivamente le competenze >= 70 da quelle < 70 nel testo iniettato.

### 5.3 Divieto nomi inventati

Nel prompt / system message aggiungere:

```
VIETATO ASSOLUTO - NOMI:
- Cita SOLO giocatori presenti in TITOLARI o RISERVE nel blocco ROSA E DATI.
- Mai Mbappé, Haaland, Pedri, Bellingham, ecc. se non sono nella lista.
- Se non hai il nome nella rosa, non citarlo.
```

### 5.4 Esempio corretto in prompt

Aggiungere un esempio che mostri il ragionamento corretto:

```
Esempio: Allenatore ha contrattacco 89, contropiede_veloce 57.
Corretto: "Contrattacco è ideale (competenza 89)."
Sbagliato: "Contropiede veloce è ideale perché l'allenatore ha buona competenza nel contrattacco."
```

---

## 6. Checklist pre-deploy

- [ ] Paletto contrattacco vs contropiede_veloce nel prompt
- [ ] Divieto esplicito nomi non in rosa (con esempi)
- [ ] Esempio corretto/sbagliato per stili allenatore
- [ ] Test con utente Zingaro: domanda "meglio alla tua rosa?"
- [ ] Verifica che la risposta consigli contrattacco o passaggio_lungo (>= 70) e citi solo Messi, Neymar, Zlatan, Rummenigge

---

## 7. Riferimenti

- `app/api/assistant-chat/route.js` righe 334-339 (coachText), 383-414 (paletti), 854-898 (system)
- `info_rag.md` §4.1 Stili Base (Contropiede veloce vs Contrattacco)
- DB: `coaches.playing_style_competence` (jsonb: contrattacco, contropiede_veloce, possesso_palla, passaggio_lungo, vie_laterali)
