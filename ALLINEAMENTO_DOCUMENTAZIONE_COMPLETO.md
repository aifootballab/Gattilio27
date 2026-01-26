# 📚 ALLINEAMENTO DOCUMENTAZIONE COMPLETO

**Data**: 24 Gennaio 2026  
**Scopo**: Allineare tutta la documentazione con lo stato attuale del codice  
**Status**: 🔄 In Analisi

---

## 📋 CATALOGO DOCUMENTI (74 file .md)

### **CATEGORIA 1: DOCUMENTAZIONE PRINCIPALE** (3 file)

1. **`DOCUMENTAZIONE_MASTER_COMPLETA.md`** ✅ **ATTIVO**
   - Status: Documentazione principale aggiornata al 24 gen 2026
   - Contenuto: Panoramica, architettura, DB schema, API, pagine, librerie, sicurezza, i18n
   - Da verificare: Allineamento con codice attuale

2. **`DOCUMENTAZIONE_GUIDA_INTERATTIVA.md`** ✅ **ATTIVO**
   - Status: Documentazione Assistant Chat (23 gen 2026)
   - Contenuto: Architettura, prompt engineering, flussi Assistant Chat
   - Da verificare: Coerenza con `app/api/assistant-chat/route.js`

3. **`README.md`** ✅ **ATTIVO**
   - Status: Documentazione entry point progetto
   - Contenuto: Panoramica, stack, struttura, endpoint, setup
   - Da verificare: Allineamento con stato attuale

---

### **CATEGORIA 2: AUDIT** (8 file)

4. **`AUDIT_FLUSSI_ENDPOINT_2026.md`** ✅ **ATTIVO**
   - Status: Audit completo flussi e endpoint (24 gen 2026)
   - Contenuto: Flussi match, endpoint, fix applicati, coerenza
   - Da verificare: Coerenza con codice attuale

5. **`AUDIT_ENTERPRISE_IA_DATI.md`** ⚠️ **DA VERIFICARE**
   - Status: Audit dati IA (allucinazioni)
   - Contenuto: Verifica dati disponibili vs dati inventati
   - Da verificare: Se fix sono stati applicati

6. **`AUDIT_ENTERPRISE_IA_RAGIONAMENTO_GIOCATORI.md`** ⚠️ **DA VERIFICARE**
   - Status: Audit ragionamento IA giocatori
   - Contenuto: Analisi perché IA suggerisce giocatori sbagliati
   - Da verificare: Se fix sono stati applicati

7. **`AUDIT_COERENZA_COMPLETO.md`** ⚠️ **DA VERIFICARE**
   - Status: Audit coerenza generale
   - Contenuto: Verifica allineamento front/back/DB
   - Da verificare: Se ancora rilevante

8. **`AUDIT_COERENZA_POSIZIONI_MULTIPLE.md`** ⚠️ **DA VERIFICARE**
   - Status: Audit posizioni multiple
   - Contenuto: Verifica implementazione posizioni multiple
   - Da verificare: Se ancora rilevante

9. **`AUDIT_CONTROMISURE_LIVE.md`** ⚠️ **DA VERIFICARE**
   - Status: Audit contromisure live
   - Contenuto: Verifica implementazione contromisure
   - Da verificare: Se ancora rilevante

10. **`AUDIT_SICUREZZA_INPUT_MANUALE.md`** ✅ **ATTIVO**
    - Status: Audit sicurezza input manuale
    - Contenuto: Verifica sicurezza input nome avversario
    - Riferimento: `AUDIT_FLUSSI_ENDPOINT_2026.md`

11. **`AUDIT_SICUREZZA_PATTERN_DASHBOARD.md`** ⚠️ **DA VERIFICARE**
    - Status: Audit pattern dashboard
    - Contenuto: Verifica implementazione pattern tattici
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 3: ANALISI PROBLEMI** (15 file)

12. **`ANALISI_PROBLEMA_STILE_GIoco_ALLENATORE.md`** ✅ **ATTIVO**
    - Status: Analisi problema stile gioco allenatore (24 gen 2026)
    - Contenuto: Perché IA suggerisce stili sbagliati
    - Da verificare: Se fix sono stati applicati

13. **`ANALISI_DOCUMENTAZIONE_ATTILA_IA.md`** ✅ **ATTIVO**
    - Status: Analisi documentazione Attila (24 gen 2026)
    - Contenuto: Verifica inclusione memoria_attila in prompt
    - Da verificare: Se fix sono stati applicati

14. **`ANALISI_PROBLEMA_MCP_SUPABASE.md`** ✅ **ATTIVO**
    - Status: Analisi problema MCP Supabase (24 gen 2026)
    - Contenuto: Perché MCP Supabase ha errore
    - Conclusione: Non critico, verifiche completate

15. **`ANALISI_PROBLEMA_PATTERN.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi problema pattern
    - Contenuto: Problemi con pattern tattici
    - Da verificare: Se ancora rilevante

16. **`ANALISI_PROBLEMA_ANDROID.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi problema Android
    - Contenuto: Problemi drag & drop su Android
    - Da verificare: Se ancora rilevante

17. **`ANALISI_ESTRAZIONE_VS_INPUT_MANUALE.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi estrazione vs input manuale
    - Contenuto: Confronto metodi
    - Da verificare: Se ancora rilevante

18. **`ANALISI_CONFERMA_POSIZIONE_CLIENTE.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi conferma posizione cliente
    - Contenuto: Logica conferma posizioni
    - Da verificare: Se ancora rilevante

19. **`ANALISI_COMPETENZE_POSIZIONE_ACQUISITE.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi competenze posizione
    - Contenuto: Come vengono acquisite competenze
    - Da verificare: Se ancora rilevante

20. **`ANALISI_ADATTAMENTO_POSIZIONE_AUTOMATICO.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi adattamento posizione automatico
    - Contenuto: Logica adattamento automatico
    - Da verificare: Se ancora rilevante

21. **`ANALISI_GESTIONE_POSIZIONI_GIOCATORI.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi gestione posizioni giocatori
    - Contenuto: Logica gestione posizioni
    - Da verificare: Se ancora rilevante

22. **`ANALISI_POSIZIONI_MULTIPLE_ORIGINALI.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi posizioni multiple originali
    - Contenuto: Logica posizioni multiple
    - Da verificare: Se ancora rilevante

23. **`ANALISI_PROBLEMATICHE_POSIZIONI_MULTIPLE.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi problematiche posizioni multiple
    - Contenuto: Problemi con posizioni multiple
    - Da verificare: Se ancora rilevante

24. **`ANALISI_PATTERN_E_DIFFERENZE_IA.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi pattern e differenze IA
    - Contenuto: Differenze pattern in IA
    - Da verificare: Se ancora rilevante

25. **`ANALISI_INCROCIO_DATI_IA.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi incrocio dati IA
    - Contenuto: Come IA incrocia dati
    - Da verificare: Se ancora rilevante

26. **`ANALISI_INCROCI_COMPLETI_IA.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi incroci completi IA
    - Contenuto: Incroci completi dati IA
    - Da verificare: Se ancora rilevante

27. **`ANALISI_SUGGERIMENTI_IA.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi suggerimenti IA
    - Contenuto: Come IA genera suggerimenti
    - Da verificare: Se ancora rilevante

28. **`ANALISI_FOTO_CAMPO_CLIENTE.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi foto campo cliente
    - Contenuto: Gestione foto campo
    - Da verificare: Se ancora rilevante

29. **`ANALISI_CAMPO_2D_UPLOAD.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi campo 2D upload
    - Contenuto: Upload campo 2D
    - Da verificare: Se ancora rilevante

30. **`ANALISI_RISCHI_INPUT_MANUALE.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi rischi input manuale
    - Contenuto: Rischi input manuale
    - Da verificare: Se ancora rilevante

31. **`ANALISI_RISCHI_OPPONENT_NAME.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi rischi opponent_name
    - Contenuto: Rischi input opponent_name
    - Da verificare: Se ancora rilevante

32. **`ANALISI_RISCHI_MODIFICHE.md`** ⚠️ **DA VERIFICARE**
    - Status: Analisi rischi modifiche
    - Contenuto: Rischi modifiche codice
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 4: PROPOSTE** (6 file)

33. **`PROPOSTA_INPUT_MANUALE_OPPONENT.md`** ⚠️ **IMPLEMENTATO**
    - Status: Proposta input manuale opponent
    - Contenuto: Proposta implementazione
    - Status attuale: ✅ Implementato (vedi `AUDIT_FLUSSI_ENDPOINT_2026.md`)
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

34. **`PROPOSTA_UX_IDENTIFICAZIONE_PARTITE.md`** ⚠️ **DA VERIFICARE**
    - Status: Proposta UX identificazione partite
    - Contenuto: Proposta UX
    - Da verificare: Se implementato

35. **`PROPOSTA_DRAG_DROP_GIOCATORI.md`** ⚠️ **IMPLEMENTATO**
    - Status: Proposta drag & drop giocatori
    - Contenuto: Proposta implementazione
    - Status attuale: ✅ Implementato (vedi `DOCUMENTAZIONE_DRAG_DROP.md`)
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

36. **`PROPOSTA_IMPLEMENTAZIONE_CAMPO_2D.md`** ⚠️ **IMPLEMENTATO**
    - Status: Proposta implementazione campo 2D
    - Contenuto: Proposta implementazione
    - Status attuale: ✅ Implementato (vedi `DOCUMENTAZIONE_MASTER_COMPLETA.md`)
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

37. **`PROPOSTA_MODULI_EFOOTBALL.md`** ⚠️ **DA VERIFICARE**
    - Status: Proposta moduli eFootball
    - Contenuto: Proposta moduli tattici
    - Da verificare: Se implementato

38. **`BRAINSTORM_PERSONALIZZAZIONE_FORMAZIONI.md`** ⚠️ **DA VERIFICARE**
    - Status: Brainstorm personalizzazione formazioni
    - Contenuto: Idee personalizzazione
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 5: ROLLBACK** (8 file)

39. **`ROLLBACK_MIGLIORAMENTI_IA_COMPLETI.md`** ✅ **ATTIVO**
    - Status: Rollback miglioramenti IA (24 gen 2026)
    - Contenuto: Documentazione modifiche previste
    - Status attuale: In attesa implementazione

40. **`ROLLBACK_PLAN_INPUT_MANUALE.md`** ✅ **ATTIVO**
    - Status: Rollback input manuale opponent
    - Contenuto: Procedura rollback
    - Riferimento: `AUDIT_FLUSSI_ENDPOINT_2026.md`

41. **`ROLLBACK_INCLUSIONE_DATI_IA.md`** ⚠️ **OBSOLETO**
    - Status: Rollback inclusione dati IA
    - Contenuto: Rollback vecchio
    - **AZIONE**: Verificare se sostituito da `ROLLBACK_MIGLIORAMENTI_IA_COMPLETI.md`

42. **`ROLLBACK_PATTERN_DASHBOARD.md`** ⚠️ **DA VERIFICARE**
    - Status: Rollback pattern dashboard
    - Contenuto: Rollback pattern
    - Da verificare: Se ancora rilevante

43. **`ROLLBACK_CONTROMISURE.md`** ⚠️ **DA VERIFICARE**
    - Status: Rollback contromisure
    - Contenuto: Rollback contromisure
    - Da verificare: Se ancora rilevante

44. **`ROLLBACK_DRAG_DROP.md`** ⚠️ **OBSOLETO**
    - Status: Rollback drag & drop
    - Contenuto: Rollback vecchio
    - Status attuale: ✅ Drag & drop implementato
    - **AZIONE**: Spostare in archivio

45. **`ROLLBACK_COMPLETO_POSIZIONI_MULTIPLE.md`** ⚠️ **DA VERIFICARE**
    - Status: Rollback posizioni multiple
    - Contenuto: Rollback posizioni multiple
    - Da verificare: Se ancora rilevante

46. **`ROLLBACK_POSIZIONI_MULTIPLE_ORIGINALI.md`** ⚠️ **DA VERIFICARE**
    - Status: Rollback posizioni multiple originali
    - Contenuto: Rollback posizioni multiple
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 6: PIANI IMPLEMENTAZIONE** (4 file)

47. **`PIANO_IMPLEMENTAZIONE_DRAG_DROP.md`** ⚠️ **IMPLEMENTATO**
    - Status: Piano implementazione drag & drop
    - Contenuto: Piano implementazione
    - Status attuale: ✅ Implementato
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

48. **`PIANO_IMPLEMENTAZIONE_POSIZIONI_MULTIPLE.md`** ⚠️ **IMPLEMENTATO**
    - Status: Piano implementazione posizioni multiple
    - Contenuto: Piano implementazione
    - Status attuale: ✅ Implementato (vedi `DOCUMENTAZIONE_MODIFICHE_POSIZIONI_MULTIPLE.md`)
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

49. **`PIANO_IMPLEMENTAZIONE_FINALE_POSIZIONI.md`** ⚠️ **IMPLEMENTATO**
    - Status: Piano implementazione finale posizioni
    - Contenuto: Piano implementazione finale
    - Status attuale: ✅ Implementato
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

50. **`SPECIFICA_FINALE_POSIZIONI_MULTIPLE.md`** ⚠️ **IMPLEMENTATO**
    - Status: Specifica finale posizioni multiple
    - Contenuto: Specifica implementazione
    - Status attuale: ✅ Implementato
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

---

### **CATEGORIA 7: DOCUMENTAZIONE TECNICA** (5 file)

51. **`DOCUMENTAZIONE_DRAG_DROP.md`** ✅ **ATTIVO**
    - Status: Documentazione drag & drop
    - Contenuto: Documentazione implementazione drag & drop
    - Da verificare: Coerenza con codice

52. **`DOCUMENTAZIONE_MODIFICHE_POSIZIONI_MULTIPLE.md`** ✅ **ATTIVO**
    - Status: Documentazione modifiche posizioni multiple
    - Contenuto: Documentazione implementazione
    - Da verificare: Coerenza con codice

53. **`SPECIFICA_PROMPT_FINALE_IA.md`** ⚠️ **DA VERIFICARE**
    - Status: Specifica prompt finale IA
    - Contenuto: Specifica prompt IA
    - Da verificare: Se ancora rilevante o sostituito

54. **`SOLUZIONI_INCLUSIONE_DOCUMENTAZIONE_ATTILA.md`** ⚠️ **DA VERIFICARE**
    - Status: Soluzioni inclusione documentazione Attila
    - Contenuto: Soluzioni per includere memoria_attila
    - Da verificare: Se ancora rilevante o sostituito da `ANALISI_DOCUMENTAZIONE_ATTILA_IA.md`

55. **`SOLUZIONE_DRAG_DROP_CAMPO_2D.md`** ⚠️ **IMPLEMENTATO**
    - Status: Soluzione drag & drop campo 2D
    - Contenuto: Soluzione implementazione
    - Status attuale: ✅ Implementato
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

56. **`SOLUZIONI_AUTOMATICHE_CAMPO_2D.md`** ⚠️ **IMPLEMENTATO**
    - Status: Soluzioni automatiche campo 2D
    - Contenuto: Soluzioni implementazione
    - Status attuale: ✅ Implementato
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

57. **`SOLUZIONE_GESTIONE_VARIAZIONI.md`** ⚠️ **DA VERIFICARE**
    - Status: Soluzione gestione variazioni
    - Contenuto: Soluzione gestione variazioni
    - Da verificare: Se ancora rilevante

58. **`SOLUZIONE_UX_OPPONENT_NAME.md`** ⚠️ **IMPLEMENTATO**
    - Status: Soluzione UX opponent_name
    - Contenuto: Soluzione UX
    - Status attuale: ✅ Implementato (vedi `AUDIT_FLUSSI_ENDPOINT_2026.md`)
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

---

### **CATEGORIA 8: COMUNICAZIONE IA** (3 file)

59. **`200_DOMANDE_PRE_PARTITA_CLIENTE.md`** ✅ **ATTIVO**
    - Status: 200 domande pre partita (24 gen 2026)
    - Contenuto: Domande cliente e stile comunicazione IA
    - Da verificare: Se stile è stato implementato

60. **`COMUNICAZIONE_IA_FIDUCIA_CLIENTE.md`** ⚠️ **SOSTITUITO**
    - Status: Comunicazione IA fiducia cliente
    - Contenuto: Stile comunicazione iniziale
    - Status attuale: ⚠️ Sostituito da `200_DOMANDE_PRE_PARTITA_CLIENTE.md`
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a nuovo documento

61. **`BRAINSTORM_INCROCI_DATI_IA.md`** ✅ **ATTIVO**
    - Status: Brainstorm incroci dati IA (24 gen 2026)
    - Contenuto: Brainstorm incroci dati per IA
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 9: VERIFICHE** (3 file)

62. **`VERIFICA_IA_NON_DICA_SBAGLIATE.md`** ✅ **ATTIVO**
    - Status: Verifica IA non dica sbagliate (24 gen 2026)
    - Contenuto: Verifica istruzioni anti-errore IA
    - Da verificare: Se fix sono stati applicati

63. **`VERIFICA_MOBILE_DRAG_DROP.md`** ⚠️ **DA VERIFICARE**
    - Status: Verifica mobile drag & drop
    - Contenuto: Verifica implementazione mobile
    - Da verificare: Se ancora rilevante

64. **`VERIFICA_COERENZA_DRAG_DROP.md`** ⚠️ **DA VERIFICARE**
    - Status: Verifica coerenza drag & drop
    - Contenuto: Verifica coerenza implementazione
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 10: ESEMPI** (3 file)

65. **`ESEMPIO_IMPLEMENTAZIONE_DIRETTA.md`** ⚠️ **DA VERIFICARE**
    - Status: Esempio implementazione diretta
    - Contenuto: Esempio implementazione
    - Da verificare: Se ancora rilevante

66. **`ESEMPIO_RISPOSTA_IA_PRIMA_DOPO.md`** ⚠️ **DA VERIFICARE**
    - Status: Esempio risposta IA prima/dopo
    - Contenuto: Esempio risposte IA
    - Da verificare: Se ancora rilevante

67. **`ESEMPIO_UI_CLIENTE_SEMPLIFICATA.md`** ⚠️ **DA VERIFICARE**
    - Status: Esempio UI cliente semplificata
    - Contenuto: Esempio UI
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 11: VALUTAZIONI** (3 file)

68. **`VALUTAZIONE_CODICE.md`** ⚠️ **DA VERIFICARE**
    - Status: Valutazione codice
    - Contenuto: Valutazione qualità codice
    - Da verificare: Se ancora rilevante

69. **`VALUTAZIONE_KNOWLEDGE_MANAGEMENT_IA.md`** ⚠️ **DA VERIFICARE**
    - Status: Valutazione knowledge management IA
    - Contenuto: Valutazione gestione conoscenza IA
    - Da verificare: Se ancora rilevante

70. **`VALUTAZIONE_ENTERPRISE_IMPLEMENTAZIONE.md`** ⚠️ **DA VERIFICARE**
    - Status: Valutazione enterprise implementazione
    - Contenuto: Valutazione implementazione enterprise
    - Da verificare: Se ancora rilevante

---

### **CATEGORIA 12: RIEPILOGHI** (1 file)

71. **`RIEPILOGO_IMPLEMENTAZIONE_POSIZIONI_MULTIPLE.md`** ⚠️ **IMPLEMENTATO**
    - Status: Riepilogo implementazione posizioni multiple
    - Contenuto: Riepilogo implementazione
    - Status attuale: ✅ Implementato
    - **AZIONE**: Spostare in archivio o aggiornare con riferimento a implementazione

---

### **CATEGORIA 13: TODO** (1 file)

72. **`TODO_OTTIMIZZAZIONI_PERFORMANCE.md`** ⚠️ **DA VERIFICARE**
    - Status: TODO ottimizzazioni performance
    - Contenuto: TODO ottimizzazioni
    - Da verificare: Se ancora rilevante

---

## 🔍 ANALISI COERENZA CON CODICE

### **API Routes Verificate** (21 endpoint)

✅ **Endpoint Documentati in DOCUMENTAZIONE_MASTER_COMPLETA.md**:
- `/api/extract-formation`
- `/api/extract-player`
- `/api/extract-match-data`
- `/api/extract-coach`
- `/api/analyze-match`
- `/api/generate-countermeasures`
- `/api/assistant-chat`
- `/api/supabase/save-match`
- `/api/supabase/update-match`
- `/api/supabase/delete-match`
- `/api/supabase/save-player`
- `/api/supabase/assign-player-to-slot`
- `/api/supabase/remove-player-from-slot`
- `/api/supabase/delete-player`
- `/api/supabase/save-formation-layout`
- `/api/supabase/save-coach`
- `/api/supabase/set-active-coach`
- `/api/supabase/save-profile`
- `/api/supabase/save-tactical-settings`
- `/api/supabase/save-opponent-formation`
- `/api/admin/recalculate-patterns` ⚠️ **NUOVO - DA AGGIUNGERE**

---

## 📊 STATO DOCUMENTAZIONE

### **✅ DOCUMENTAZIONE ATTIVA E AGGIORNATA** (10 file)

1. `DOCUMENTAZIONE_MASTER_COMPLETA.md` - Documentazione principale
2. `DOCUMENTAZIONE_GUIDA_INTERATTIVA.md` - Assistant Chat
3. `README.md` - Entry point
4. `AUDIT_FLUSSI_ENDPOINT_2026.md` - Audit flussi
5. `AUDIT_SICUREZZA_INPUT_MANUALE.md` - Audit sicurezza
6. `ANALISI_PROBLEMA_STILE_GIoco_ALLENATORE.md` - Analisi problema stile
7. `ANALISI_DOCUMENTAZIONE_ATTILA_IA.md` - Analisi documentazione Attila
8. `ANALISI_PROBLEMA_MCP_SUPABASE.md` - Analisi MCP
9. `ROLLBACK_MIGLIORAMENTI_IA_COMPLETI.md` - Rollback IA
10. `ROLLBACK_PLAN_INPUT_MANUALE.md` - Rollback input manuale

### **⚠️ DOCUMENTAZIONE DA VERIFICARE/AGGIORNARE** (40+ file)

- Molti documenti di analisi/proposta/rollback potrebbero essere obsoleti
- Alcuni documenti potrebbero essere duplicati
- Alcuni documenti potrebbero riferirsi a funzionalità implementate

### **🗑️ DOCUMENTAZIONE OBSOLETA/DA ARCHIVIARE** (24+ file)

- Documenti di proposta per funzionalità già implementate
- Documenti di rollback per modifiche già applicate
- Documenti di piano implementazione per funzionalità completate

---

## 🔍 INCOERENZE IDENTIFICATE

### **1. Endpoint `/api/admin/recalculate-patterns` NON Documentato**

**Problema**: Endpoint esiste nel codice ma non è documentato in `DOCUMENTAZIONE_MASTER_COMPLETA.md`

**File**: `app/api/admin/recalculate-patterns/route.js`
- ✅ Esiste e funziona
- ✅ Usato in `app/page.jsx` (dashboard)
- ❌ NON documentato in DOCUMENTAZIONE_MASTER_COMPLETA.md

**AZIONE**: Aggiungere sezione endpoint in DOCUMENTAZIONE_MASTER_COMPLETA.md

---

### **2. Tabella `team_tactical_patterns` NON Documentata**

**Problema**: Tabella esiste e viene usata ma non è documentata nello schema DB

**Verifica**:
- ✅ Usata in `app/api/analyze-match/route.js` (riga 484)
- ✅ Usata in `app/api/generate-countermeasures/route.js`
- ✅ Usata in `app/api/admin/recalculate-patterns/route.js`
- ✅ Usata in `app/page.jsx` (dashboard)
- ❌ NON documentata in DOCUMENTAZIONE_MASTER_COMPLETA.md sezione Database Schema
- ❌ NON esiste migration SQL (probabilmente creata manualmente o via Supabase Dashboard)

**Struttura Tabella** (da codice):
```sql
team_tactical_patterns:
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- formation_usage (JSONB) - { "4-3-3": { matches: 10, wins: 7, losses: 2, draws: 1, win_rate: 0.7 }, ... }
- playing_style_usage (JSONB) - { "contrattacco": { matches: 8, wins: 5, ... }, ... }
- recurring_issues (JSONB) - Array problemi ricorrenti
- last_50_matches_count (integer)
- last_updated (timestamp)
```

**AZIONE**: 
- ⚠️ **CRITICO**: Creare migration SQL per `team_tactical_patterns`
- Aggiornare documentazione tabella in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 948-958) con struttura completa

---

### **3. Documentazione `memoria_attila_definitiva_unificata.txt` NON Inclusa**

**Problema**: File esiste ma non è documentato come parte del sistema

**Verifica**:
- ✅ File esiste in root progetto
- ✅ Analizzato in `ANALISI_DOCUMENTAZIONE_ATTILA_IA.md`
- ❌ NON documentato in DOCUMENTAZIONE_MASTER_COMPLETA.md
- ❌ NON incluso nei prompt IA (da implementare)

**AZIONE**: 
- Aggiungere sezione documentazione Attila in DOCUMENTAZIONE_MASTER_COMPLETA.md
- Documentare come dovrebbe essere incluso nei prompt

---

## 🎯 PROSSIMI STEP

1. ✅ **Completato**: Catalogazione tutti i documenti
2. 🔄 **In corso**: Verifica coerenza con codice
3. ⏳ **Prossimo**: Identificare documenti obsoleti da eliminare/modificare
4. ⏳ **Prossimo**: Allineare DOCUMENTAZIONE_MASTER_COMPLETA.md (endpoint, tabelle, documentazione Attila)
5. ⏳ **Prossimo**: Aggiornare README.md con informazioni corrette e aggiornate
6. ⏳ **Prossimo**: Creare documento finale con tutte le modifiche

---

---

## 🔍 VERIFICA SCHEMA DATABASE

### **Metodo 1: Migrations SQL** ✅ (Completato)

Verifica completata confrontando migrations con documentazione.

### **Metodo 2: MCP Supabase** ⚠️ (In attesa autenticazione)

**Status MCP Supabase**:
- ✅ Server visibile in Cursor Settings (toggle verde)
- ✅ Tool elencati (list_tables, execute_sql, ecc.)
- ❌ Tool non ancora funzionanti (richiede autenticazione completa)

**Prossimo Step**: Completare autenticazione browser o aggiungere PAT negli headers per abilitare tool MCP.

**Documento**: Vedi `VERIFICA_SCHEMA_DATABASE_MCP.md`

---

## 🔍 VERIFICA SCHEMA DATABASE (da Migrations vs Documentazione)

### **TABELLE CON MIGRATION SQL** ✅

1. **`user_profiles`** ✅
   - Migration: `create_user_profiles_table.sql`
   - Documentazione: ✅ Presente in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 850-867)
   - Status: ✅ Allineato

2. **`players`** ✅
   - Migration: `fix_slot_index_and_rls.sql` (modifica), `add_original_positions_column.sql` (aggiunta colonna)
   - Documentazione: ✅ Presente in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 870-890)
   - ⚠️ **INCOERENZA**: Documentazione NON menziona `original_positions` (aggiunta 24 gen 2026)
   - ⚠️ **INCOERENZA**: Documentazione usa `name`, `role`, `position`, `rating`, `team` ma codice usa `player_name`, `overall_rating`, `base_stats`, `skills`, `com_skills`, `height`, `weight`, `original_positions`, `position_ratings`

3. **`matches`** ✅
   - Migration: `create_matches_table.sql`
   - Documentazione: ✅ Presente in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 893-916)
   - ⚠️ **INCOERENZA**: Documentazione NON menziona `opponent_name` (aggiunto 24 gen 2026)
   - ⚠️ **INCOERENZA**: Documentazione NON menziona `ai_summary` (JSONB per riassunto AI)
   - ⚠️ **INCOERENZA**: Documentazione NON menziona `photos_uploaded`, `missing_photos`, `data_completeness`

4. **`coaches`** ✅
   - Migration: `create_coaches_table.sql`
   - Documentazione: ✅ Presente in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 962-973)
   - ⚠️ **INCOERENZA**: Documentazione usa `name` ma migration usa `coach_name`
   - ⚠️ **INCOERENZA**: Documentazione NON menziona `playing_style_competence` (JSONB)
   - ⚠️ **INCOERENZA**: Documentazione NON menziona `stat_boosters`, `connection`, `photo_slots`, `extracted_data`

5. **`team_tactical_settings`** ✅
   - Migration: `create_team_tactical_settings.sql`
   - Documentazione: ❌ **NON PRESENTE** in DOCUMENTAZIONE_MASTER_COMPLETA.md
   - **AZIONE**: Aggiungere documentazione tabella

---

### **TABELLE SENZA MIGRATION SQL** ⚠️

6. **`formation_layout`** ⚠️
   - Migration: ❌ **NON TROVATA**
   - Documentazione: ✅ Presente in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 919-930)
   - Usata in: `app/api/supabase/save-formation-layout/route.js`
   - **AZIONE**: Verificare se esiste migration o crearla

7. **`opponent_formations`** ⚠️
   - Migration: ❌ **NON TROVATA**
   - Documentazione: ✅ Presente in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 933-944)
   - Usata in: `app/api/supabase/save-opponent-formation/route.js`, `app/api/generate-countermeasures/route.js`
   - Referenziata in: `create_matches_table.sql` (FK `opponent_formation_id`)
   - **AZIONE**: Verificare se esiste migration o crearla

8. **`playing_styles`** ⚠️
   - Migration: ❌ **NON TROVATA**
   - Documentazione: ❌ **NON PRESENTE** in DOCUMENTAZIONE_MASTER_COMPLETA.md
   - Usata in: `app/api/supabase/save-player/route.js` (lookup `playing_style_id`)
   - Referenziata in: `fix_slot_index_and_rls.sql` (indice per JOIN)
   - **AZIONE**: Verificare se esiste migration o crearla, aggiungere documentazione

9. **`team_tactical_patterns`** ⚠️ **CRITICO**
   - Migration: ❌ **NON TROVATA**
   - Documentazione: ⚠️ **INCOMPLETA** in DOCUMENTAZIONE_MASTER_COMPLETA.md (riga 948-958)
   - Usata in: `app/api/analyze-match/route.js`, `app/api/generate-countermeasures/route.js`, `app/api/admin/recalculate-patterns/route.js`, `app/page.jsx`
   - Struttura reale (da codice):
     - `id` (UUID, PK)
     - `user_id` (UUID, FK → auth.users, UNIQUE)
     - `formation_usage` (JSONB) - NON documentato
     - `playing_style_usage` (JSONB) - NON documentato
     - `recurring_issues` (JSONB) - Documentato
     - `last_50_matches_count` (integer) - NON documentato
     - `last_updated` (timestamp) - NON documentato
   - **AZIONE**: ⚠️ **CRITICO** - Creare migration SQL, aggiornare documentazione completa

---

## 📊 RIEPILOGO INCOERENZE SCHEMA DATABASE

### **INCOERENZE CRITICHE** ⚠️

1. **`team_tactical_patterns`**: 
   - ❌ Migration mancante
   - ❌ Documentazione incompleta (manca `formation_usage`, `playing_style_usage`, `last_50_matches_count`, `last_updated`)

2. **`formation_layout`**: 
   - ❌ Migration mancante (ma documentata)

3. **`opponent_formations`**: 
   - ❌ Migration mancante (ma documentata e referenziata in FK)

4. **`playing_styles`**: 
   - ❌ Migration mancante
   - ❌ Documentazione mancante

5. **`team_tactical_settings`**: 
   - ✅ Migration presente
   - ❌ Documentazione mancante

---

### **INCOERENZE DATI** ⚠️

1. **`players`**: 
   - Documentazione usa nomi colonne vecchi (`name`, `role`, `rating`) vs codice usa (`player_name`, `overall_rating`, `base_stats`, `skills`, `com_skills`, `height`, `weight`, `original_positions`, `position_ratings`)

2. **`matches`**: 
   - Documentazione NON menziona `opponent_name`, `ai_summary`, `photos_uploaded`, `missing_photos`, `data_completeness`

3. **`coaches`**: 
   - Documentazione usa `name` vs migration usa `coach_name`
   - Documentazione NON menziona `playing_style_competence`, `stat_boosters`, `connection`, `photo_slots`, `extracted_data`

---

## 🎯 PROSSIMI STEP

1. ✅ **Completato**: Catalogazione tutti i documenti
2. ✅ **Completato**: Verifica coerenza con codice
3. ✅ **Completato**: Verifica schema database (migrations vs documentazione)
4. ⏳ **Prossimo**: Identificare documenti obsoleti da eliminare/modificare
5. ⏳ **Prossimo**: Allineare DOCUMENTAZIONE_MASTER_COMPLETA.md (endpoint, tabelle, colonne, documentazione Attila)
6. ⏳ **Prossimo**: Aggiornare README.md con informazioni corrette e aggiornate
7. ⏳ **Prossimo**: Creare documento finale con tutte le modifiche

---

**Fine Prima Fase - Catalogazione Completa + Incoerenze Identificate + Verifica Schema Database**
