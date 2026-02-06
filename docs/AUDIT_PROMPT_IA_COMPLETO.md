# Audit completo prompt IA – 6 Febbraio 2026

**Scope:** Tutti i prompt e le istruzioni alle API OpenAI nel progetto. Verifica coerenza con: chat = solo consigli tattici (no istruzioni uso app); analisi/contromisure = nessun “come caricare” o “dove cliccare”.

---

## 1. Assistant Chat (`app/api/assistant-chat/route.js`)

| Elemento | Stato | Note |
|----------|--------|------|
| **System message** | ✅ Allineato | SCOPE: solo consulenza tattica; NON dare istruzioni uso app (caricare foto, wizard, dove cliccare); redirect a Guida/tour Mostrami come. VIETATO: dare istruzioni su uso app. |
| **buildPersonalizedPrompt** | ✅ Allineato | Esempio "Come carico una partita?" → solo redirect. REGOLE ORO: ROSA/PARTITE VUOTI → "usa Guida o tour", NON percorso passo-passo. ROSA NON CARICATA → suggerisci solo domande tattiche, NON "come caricare". REGOLE SUGGERIMENTI: solo domande tattiche, MAI uso app. |
| **getDefaultSuggestions** | ✅ Allineato | match/new: solo domande tattiche (modulo prossima partita, stile squadra, panchina). gestione-formazione: niente "Come carico da screenshot". default: niente "Come carico una partita?". |
| **initialSuggestions (AssistantChat.jsx)** | ✅ Allineato | Stessi suggerimenti tattici per ogni pagina. |

---

## 2. Analyze Match (`app/api/analyze-match/route.js`)

| Elemento | Stato | Note |
|----------|--------|------|
| **generateAnalysisPrompt** | ✅ Allineato | Conservative mode (confidence < 0.7): "Puoi dire che con più sezioni complete l'analisi sarebbe più precisa; NON dare istruzioni su dove cliccare o come caricare (uso app)." Rimosso "Suggerisci di caricare le foto mancanti". |
| **Resto prompt** | ✅ OK | Analisi partita, rating, statistiche squadra, aree attacco, recuperi, formazione. Nessun testo che spiega come usare l’app. "Supporto decisionale" = decision support (tattico), non supporto utente. |

---

## 3. Generate Countermeasures (`app/api/generate-countermeasures/route.js` + `lib/countermeasuresHelper.js`)

| Elemento | Stato | Note |
|----------|--------|------|
| **generateCountermeasuresPrompt** | ✅ OK | Contromisure pre-partita (formazione avversario, roster cliente, formazione, tattica). Nessun riferimento a “come caricare”, “wizard”, “dove trovare”. "Distanze di supporto" = concetto tattico (supporto palla). |

---

## 4. Extract Match Data (`app/api/extract-match-data/route.js`)

| Elemento | Stato | Note |
|----------|--------|------|
| **getPromptForSection** | ✅ OK | Prompt per estrazione dati da screenshot (player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_style). Istruzioni al modello su come parsare l’immagine e restituire JSON. Nessun messaggio utente su “come usare l’app”. |

---

## 5. Extract Player (`app/api/extract-player/route.js`)

| Elemento | Stato | Note |
|----------|--------|------|
| **Prompt estrazione** | ✅ OK | Istruzioni per estrarre dati giocatore da screenshot (overall, posizioni, skills, ecc.). Solo parsing immagine → JSON. Nessun testo per l’utente. |

---

## 6. Extract Formation (`app/api/extract-formation/route.js`)

| Elemento | Stato | Note |
|----------|--------|------|
| **Prompt** | ✅ OK | Estrazione formazione da screenshot. Nessun riferimento a supporto/uso app. |

---

## 7. Extract Coach (`app/api/extract-coach/route.js`)

| Elemento | Stato | Note |
|----------|--------|------|
| **Prompt** | ✅ OK | Estrazione dati allenatore da screenshot. Nessun riferimento a supporto/uso app. |

---

## 8. Altri

| API | Uso OpenAI | Note |
|-----|------------|------|
| **tasks/generate** | No | Nessun prompt OpenAI. |
| **ai-knowledge** | No (solo Supabase) | Nessun prompt. |

---

## 9. Riferimenti testuali aggiornati

| File | Modifica |
|------|----------|
| **lib/i18n.js** | guideUseBrainDesc, guideFooterDesc (IT/EN): “solo consigli tattici”; per uso app → Guida/tour. |
| **lib/ragHelper.js** | Commento: “chat di supporto” → “chat (solo consigli tattici)”. |

---

## 10. Riepilogo

- **Chat:** Solo consigli tattici; per domande su uso app (caricare, wizard, dove trovare) → risposta unica con redirect a Guida/tour. Suggerimenti iniziali e di fallback solo tattici. Prompt rosa vuota/partite vuote senza “percorso concreto” o “come caricare”.
- **Analyze-match:** Conservative mode senza “caricare le foto”; ammesso solo “con più sezioni l’analisi sarebbe più precisa”, senza istruzioni uso app.
- **Contromisure e extract-*:** Nessun riferimento a supporto o istruzioni uso app; scope invariato.

Tutti i prompt IA risultano allineati al perimetro: **consigli/analisi tattica sì, istruzioni su come usare l’app no** (quelle restano in Guida e tour).
