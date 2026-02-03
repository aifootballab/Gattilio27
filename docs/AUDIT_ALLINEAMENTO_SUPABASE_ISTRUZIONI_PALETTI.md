# Audit: Allineamento Supabase, Istruzioni e Paletti IA

**Data**: 2 Febbraio 2026  
**Obiettivo**: Verificare coerenza tra dati Supabase, istruzioni prompt e paletti IA.

---

## 1. team_playing_style (Stile squadra)

| Livello | Valori | Stato |
|---------|--------|-------|
| **Supabase** (team_tactical_settings) | possesso_palla, contropiede_veloce, contrattacco, vie_laterali, passaggio_lungo | CHECK constraint |
| **save-tactical-settings API** | validStyles = stesso elenco | ✅ Allineato |
| **coaches.playing_style_competence** | Stesse 5 chiavi | ✅ Allineato |
| **info_rag §4.1** | Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali | ✅ Allineato |
| **info_rag §4.2-4.5** | Attacco Diretto, Cross e Finalizzazione, Pressing Alto, Gegenpressing, Tiki-Taka, ecc. | ⚠️ NON configurabili in team_playing_style |

**Gap**: L'IA potrebbe suggerire "Usa Pressing Alto" o "Gegenpressing" ma l'app accetta SOLO i 5 stili base. Gli stili §4.2-4.5 sono dell'allenatore/tattiche avanzate, non team_playing_style.

**Azione**: Aggiungere in info_rag §10 nota esplicita che team_playing_style è SOLO uno dei 5.

---

## 2. individual_instructions (Istruzioni individuali)

| Livello | Valori | Stato |
|---------|--------|-------|
| **Supabase** (JSONB) | attacco_1/2, difesa_1/2 → instruction: difensivo, offensivo, ancoraggio, marcatura_stretta, marcatura_uomo, contropiede, linea_bassa | Struttura documentata |
| **tacticalInstructions.js** | Stessi id (difensivo, offensivo, ancoraggio, marcatura_stretta, marcatura_uomo, contropiede, linea_bassa) | ✅ Allineato |
| **save-tactical-settings** | validateIndividualInstruction() | ✅ Allineato |
| **info_rag §5** | Difensivo, Offensivo, Ancoraggio, Marcatura stretta, Marcatura uomo, Contropiede, Linea bassa | ✅ Allineato |
| **Paletti IA** | "SOLO: Offensivo, Difensivo, Ancoraggio (max 2), Marcatura stretta/uomo, Contropiede, Linea bassa" | ✅ Allineato |

**Regole aggiuntive** (tacticalInstructions.js):
- linea_bassa: NON assegnabile a difensori (TD, TS, DC)
- contropiede (slot difesa): SOLO centrocampisti e attaccanti (MED, CC, TRQ, SP, P, CF, CLD, CLS, EDA, ESA)
- Ancoraggio: max 2 in squadra (solo AI/prompt, non validato in API)

**Azione**: Verificare che §10 citi "Linea bassa non assegnabile a difensori" e "Contropiede (slot difesa) solo CC/attaccanti".

---

## 3. playing_styles (Stili giocatore)

| Livello | Stato |
|---------|-------|
| **Supabase** (playing_styles) | 24 righe, nomi IT ufficiali |
| **info_rag §2** | Stessi nomi + sinonimi EN in parentesi |
| **Paletti IA** | "Terminologia ufficiale: Opportunista non Poacher, Resistenza non Stamina" | ✅ Allineato |

---

## 4. Contromisure e Analyze-match: §10 incluso

| Flusso | Sezioni caricate | §10 NOTE CRITICHE |
|--------|------------------|-------------------|
| **Chat** | getRelevantSections (keyword) | Sempre aggiunta se non presente |
| **Contromisure** | COUNTERMEASURES_SECTION_TITLES (1-10) | ✅ Inclusa |
| **Analyze-match** | ANALYZE_MATCH_SECTION_TITLES (1-10) | ✅ Inclusa |

---

## 5. Azioni correttive implementate (2 feb 2026)

1. ✅ **info_rag §10** punto 5: team_playing_style SOLO 5 valori (Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali). Non suggerire §4.2-4.5 come stile da impostare.
2. ✅ **info_rag §10** punto 8: Restrizioni Linea bassa (non a difensori), Contropiede (solo CC/attaccanti), Ancoraggio max 2.
3. ✅ **Paletti Chat** (route.js): tabella paletti aggiornata; system content con STILI SQUADRA e ISTRUZIONI (restrizioni).
4. ✅ **countermeasuresHelper**: sezione 5 (ADEGUAMENTI TATTICI) e 7 (ISTRUZIONI INDIVIDUALI) aggiornate con vincoli Supabase.

---

*Fine audit.*
