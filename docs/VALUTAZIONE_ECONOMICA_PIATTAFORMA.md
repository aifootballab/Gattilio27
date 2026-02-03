# Valutazione economica reale – eFootball AI Coach

**Data**: 3 Febbraio 2026  
**Obiettivo**: Valutazione economica della piattaforma considerando costi, limiti e potenziale di mercato.

---

## 1. Stato attuale

| Aspetto | Situazione |
|---------|------------|
| **Revenue** | Nessuna. Fase test, no Stripe/pagamento |
| **Crediti** | 200/mese default, **tracciati ma non applicati**: utenti possono usare oltre 200 senza blocco |
| **Costo operativo** | Solo OpenAI (API) + Supabase + Vercel (piani fissi) |
| **Target** | Giocatori eFootball (pre/post partita, formazione, contromisure) |

---

## 2. Costi reali

### 2.1 OpenAI (unico costo variabile significativo)

| Operazione | Crediti | Costo stimato USD | Note |
|------------|---------|-------------------|------|
| assistant-chat (1 msg) | 1 | 0.02–0.05 | Prompt lungo, RAG, contesto |
| extract-player | 2 | 0.03–0.08 | Vision |
| extract-coach | 2 | 0.03–0.08 | Vision |
| extract-match-data (1 sezione) | 2 | 0.03–0.07 | 5 sezioni = wizard partita |
| generate-countermeasures | 3 | 0.04–0.12 | Prompt lungo |
| extract-formation | 3 | 0.05–0.12 | Vision + output fino 4.5k token |
| analyze-match | 4 | 0.05–0.15 | Output fino 3k token |

**Utente tipico (200 crediti/mese):**
- Mix realista: 120 chat (120) + 15 extract-player (30) + 5 wizard partita (10) + 3 analyze (12) + 2 contromisure (6) + 2 formation (6) ≈ 184 crediti
- **Costo OpenAI stimato per utente**: 120×0.03 + 15×0.05 + 5×0.05 + 3×0.10 + 2×0.08 + 2×0.08 ≈ **5.5–8 USD/mese** (ordine di grandezza)

### 2.2 Supabase e Vercel
- **Supabase**: Free tier o Pro (~25 USD/mese) per DB, Auth, storage
- **Vercel**: Free/Pro per deploy Next.js
- Costi fissi bassi fino a migliaia di utenti (limiti free tier).

---

## 3. Modello pricing ipotizzato (da doc)

- **Piano base**: 20 €/mese
- **Crediti inclusi**: 200 (allineato a CREDITS_INCLUDED_DEFAULT)
- **Ricarico su costo**: 3×–4×
- **Overage**: 0.10 €/credito oltre i 200

Con costo medio ~0.03 USD/credito:
- 200 crediti → costo ~6 USD → 20 € = ricarico ~3.5× (sostenibile)
- Overage: 0.10 €/credito → margine molto alto su uso extra

---

## 4. Limiti della piattaforma (fattori economici)

### 4.1 Limiti di prodotto
| Limite | Impatto economico |
|--------|-------------------|
| **Solo eFootball** | Mercato di nicchia (~75k attivi stimati, 3.3M totale multi-piattaforma). Non FIFA/altri titoli. |
| **Solo pre/post partita** | Nessun valore in-game; utente deve usare app separata. Rischio abbandono durante partita. |
| **Card digitali (no carriera)** | Nessun hook per modalità carriera/campagna → pubblico più ristretto. |
| **IT/EN** | Mercato primario Italia + anglofono. eFootball forte in Asia (Giappone): nessun JP/CN. |
| **Upload screenshot** | Friction alta: utente deve fare foto, caricare. UX non immediata. |
| **No integrazione diretta con gioco** | Nessun dato live dal client eFootball. Dipendenza totale da screenshot. |

### 4.2 Limiti tecnici
| Limite | Impatto economico |
|--------|-------------------|
| **Crediti non bloccanti** | Oggi utente può superare 200 senza pagare → costo OpenAI senza revenue. Da risolvere prima di monetizzazione. |
| **Rate limit in-memory** | Su Vercel serverless, store in-memory non condiviso. Rate limit inefficace su più istanze. Serve Redis per produzione seria. |
| **No Stripe** | Nessuna fatturazione, nessun abbonamento, nessun overage a pagamento. |

### 4.3 Limiti di scala
- **OpenAI quota**: dipende dal piano del developer. Con molti utenti servono upgrade e budget.
- **Supabase**: free tier ha limiti (500MB, 2GB bandwidth). Pro consigliato per produzione.
- **Vercel**: limiti sulle function execution time e bandwidth.

---

## 5. Mercato e potenziale

### 5.1 Dimensioni
- **eFootball**: ~3.3M giocatori totali, ~75k attivi (stime web)
- **Steam**: ~12–15k monthly players
- **Conversion rate realistico** (da totale a “utente pagante app coaching”): 0.1%–0.5% → 330–1.650 utenti paganti potenziali a livello globale

### 5.2 Proiezione revenue (scenario conservativo)
- **Utenti paganti**: 500 (target anno 1)
- **ARPU**: 20 €/mese
- **Revenue mensile**: 500 × 20 = **10.000 €/mese**
- **Costi OpenAI** (500 utenti × 7 USD): ~3.500 USD ≈ 3.200 €
- **Supabase + Vercel**: ~100–200 €
- **Margine lordo**: ~6.500 €/mese (65%)

### 5.3 Proiezione costo (scenario pessimistico)
- **Utenti gratuiti o abuso**: senza blocco crediti, 1.000 utenti “attivi” che usano 300 crediti/mese
- **Costo OpenAI**: 1.000 × (300/200) × 7 ≈ 10.500 USD/mese
- **Revenue**: 0 (nessun pagamento)
- **Perdita**: ~10.000 €/mese → insostenibile

---

## 6. Raccomandazioni prioritarie

| # | Azione | Priorità | Effetto |
|---|--------|----------|---------|
| 1 | **Blocco uso oltre crediti inclusi** | Alta | Evita costo OpenAI senza revenue; prerequisito per monetizzazione |
| 2 | **Integrazione Stripe** (subscription + overage) | Alta | Abilita revenue reale |
| 3 | **Redis per rate limit** | Media | Rate limit affidabile in produzione multi-istanza |
| 4 | **Piano free con tetto basso** (es. 30 crediti/mese) | Media | Acquisizione utenti senza bruciare budget |
| 5 | **Analytics uso reale** | Media | Tarare crediti inclusi e overage su dati reali |
| 6 | **Espansione mercato** (es. JP se eFootball forte lì) | Bassa | Aumenta TAM a lungo termine |

---

## 7. Sintesi

- **Punto di forza**: Prodotto verticale, differenziato, con costo per utente stimato gestibile (6–8 USD) e margine buono a 20 €/mese.
- **Rischi**: Mercato di nicchia, credito illimitato oggi, assenza di pagamento.
- **Prerequisiti economici**: Blocco crediti + Stripe prima di qualsiasi go-to-market serio.
- **Potenziale**: Con 500–1.000 utenti paganti, revenue 10–20k €/mese è plausibile; scalare oltre richiede ampliamento target (altro gioco, altre lingue) o partnership.
