# Valutazione Economica — eFootball AI Coach

**Data:** 2026-02-13
**Pricing:** 200 HP (Hero Points) = 20 EUR/mese
**Modello AI:** GPT-4o (OpenAI)

---

## 1. COSTO PER OPERAZIONE (tuo costo OpenAI)

| Operazione | Peso HP | Costo OpenAI/chiamata | Note |
|---|---|---|---|
| Chat principale (1 msg) | 1 HP | $0.03 | Prompt lungo (RAG + diagnostic + history) |
| Palestra Coach (1 msg) | 1 HP | $0.03 | Prompt leggero (no RAG) |
| Palestra Coach (save) | 1 HP | $0.03 | Estrazione JSON duale |
| Upload giocatore (1 foto) | 2 HP | $0.06 | Vision (immagine + prompt) |
| Upload allenatore | 2 HP | $0.06 | Vision |
| Partita (1 sezione) | 2 HP | $0.05 | Vision (5 sezioni max per partita) |
| Contromisure (generazione) | 3 HP | $0.10 | Prompt lungo + RAG + storico |
| Extract formazione avversaria | 3 HP | $0.08 | Vision + output lungo |
| Extract statistiche gioco | 3 HP | $0.08 | Vision |
| Analisi partita (riassunto) | 4 HP | $0.13 | Prompt pesante, output fino a 3k token |

---

## 2. COSTO PROFILAZIONE NUOVO CLIENTE

### Setup base (l'IA funziona)

| Azione | HP | Tuo costo |
|---|---|---|
| Palestra Coach (profilo: 5 msg + save) | 6 | $0.18 |
| 11 titolari (1 foto card) | 22 | $0.66 |
| 1 allenatore | 2 | $0.06 |
| **TOTALE SETUP BASE** | **30 HP** | **$0.90 (0.83 EUR)** |

AI Knowledge Score: ~50% (Intermediate)

### Setup base + prima partita

| + Prima partita (3 sezioni) | 6 | $0.15 |
|---|---|---|
| **TOTALE** | **36 HP** | **$1.05 (0.97 EUR)** |

### Setup completo (IA ti conosce bene)

| Azione | HP | Tuo costo |
|---|---|---|
| Palestra Coach profilo | 6 | $0.18 |
| 15 giocatori (card) | 30 | $0.90 |
| Foto extra 11 titolari (stats + skills) | 44 | $1.32 |
| 1 allenatore | 2 | $0.06 |
| Statistiche di gioco (screenshot) | 3 | $0.08 |
| 3 partite (5 sezioni) | 30 | $0.75 |
| 3 feedback Palestra Coach | 18 | $0.54 |
| 5 messaggi chat | 5 | $0.15 |
| 1 contromisura | 6 | $0.18 |
| **TOTALE SETUP COMPLETO** | **144 HP** | **$4.16 (3.83 EUR)** |

AI Knowledge Score: ~85% (Expert)

---

## 3. CONSUMO MENSILE TIPICO (200 HP)

### Mix operazioni realistico (cliente attivo)

| Operazione | HP consumati | Chiamate reali | Costo OpenAI |
|---|---|---|---|
| Chat principale | 80 HP | 80 messaggi | $2.40 |
| Palestra Coach (profilo + feedback) | 18 HP | 18 messaggi | $0.54 |
| Upload giocatori | 30 HP | 15 foto | $0.90 |
| Partite (4 partite × 3 sezioni) | 24 HP | 12 sezioni | $0.60 |
| Contromisure (2 avversari) | 12 HP | 2 sessioni | $0.30 |
| Extract formazione avversaria | 6 HP | 2 foto | $0.16 |
| Statistiche gioco | 3 HP | 1 foto | $0.08 |
| Margine non usato | 7 HP | — | $0.21 |
| **TOTALE 200 HP** | **200 HP** | — | **$5.19 (4.80 EUR)** |

### Dal secondo mese (giocatori gia caricati)

| Operazione | HP consumati | Costo OpenAI |
|---|---|---|
| Chat | 50 HP | $1.50 |
| Palestra Coach (4 feedback) | 24 HP | $0.72 |
| 4 partite (3 sezioni) | 24 HP | $0.60 |
| 2 contromisure | 12 HP | $0.30 |
| Extract formazione | 6 HP | $0.16 |
| **Consumo tipico** | **~116 HP** | **$3.28 (3.02 EUR)** |

Non tutti i clienti consumano 200 HP. Media stimata: **120-150 HP/mese**.

---

## 4. MARGINALITA PER CLIENTE

### Cliente che consuma tutti i 200 HP (worst case)

| | EUR |
|---|---|
| Incasso | 20.00 |
| Costo OpenAI | 4.80 |
| Infrastruttura (pro-rata) | 0.45 |
| **Costo totale** | **5.25** |
| **Margine** | **14.75** |
| **Marginalita** | **74%** |

### Cliente medio (consuma ~130 HP)

| | EUR |
|---|---|
| Incasso | 20.00 |
| Costo OpenAI | ~3.20 |
| Infrastruttura (pro-rata) | 0.45 |
| **Costo totale** | **3.65** |
| **Margine** | **16.35** |
| **Marginalita** | **82%** |

### Cliente light (consuma ~60 HP)

| | EUR |
|---|---|
| Incasso | 20.00 |
| Costo OpenAI | ~1.50 |
| Infrastruttura (pro-rata) | 0.45 |
| **Costo totale** | **1.95** |
| **Margine** | **18.05** |
| **Marginalita** | **90%** |

---

## 5. SCENARIO A VOLUME

### Costi fissi mensili

| Servizio | Costo/mese |
|---|---|
| Supabase Pro | 25 EUR |
| Vercel Pro | 20 EUR |
| Dominio | ~1 EUR |
| **Totale fissi** | **~46 EUR** |

### Proiezione

| Clienti | Incasso | OpenAI (media 130 HP) | Fissi | Margine netto | % |
|---|---|---|---|---|---|
| 3 | 60 | 10 | 46 | **4** | 7% (breakeven) |
| 10 | 200 | 32 | 46 | **122** | 61% |
| 25 | 500 | 80 | 46 | **374** | 75% |
| 50 | 1.000 | 160 | 46 | **794** | 79% |
| 100 | 2.000 | 320 | 46 | **1.634** | 82% |
| 250 | 5.000 | 800 | 60 | **4.140** | 83% |
| 500 | 10.000 | 1.600 | 70 | **8.330** | 83% |

**Breakeven: 3 clienti.**
**Target 50 clienti: ~800 EUR/mese netti.**
**Target 100 clienti: ~1.600 EUR/mese netti.**

---

## 6. RISCHI E NOTE

### Rischio: cliente che abusa dei crediti

Un cliente potrebbe usare solo chat (1 HP/msg) e bruciare 200 messaggi chat = $6.00 costo.
Margine scenderebbe a 68%. Accettabile.

### Rischio: operazioni Vision costose

Se un cliente carica 50 giocatori con 3 foto ciascuno: 150 foto × $0.06 = $9.00.
Ma consumerebbe 300 HP (piu del suo budget mensile). Il sistema di crediti lo previene.

### Nota: il sistema di crediti e gia un cap naturale

200 HP = budget massimo. Non puoi spendere piu di ~$5.20 per cliente in un mese.
Il cap protegge il margine indipendentemente dal comportamento del cliente.

### Nota: costi OpenAI in calo

I prezzi OpenAI calano ogni 6-12 mesi. GPT-4o e gia 50% piu economico di GPT-4.
Il margine migliorera nel tempo senza cambiare pricing al cliente.

---

## 7. RIEPILOGO

| Metrica | Valore |
|---|---|
| Prezzo cliente | 20 EUR/mese (200 HP) |
| Costo profilazione base | **0.83 EUR** (30 HP) |
| Costo profilazione completa | **3.83 EUR** (144 HP) |
| Costo massimo/mese/cliente | **5.25 EUR** (200 HP + infra) |
| Marginalita worst case | **74%** |
| Marginalita media | **82%** |
| Breakeven | **3 clienti** |
| Target 100 clienti | **1.634 EUR/mese netti** |
