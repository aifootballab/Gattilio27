# Audit codice morto e documenti inutili

**Data**: 3 Febbraio 2026  
**Obiettivo**: Identificare codice non utilizzato e documentazione obsoleta o ridondante.

---

## 1. Codice morto (mai importato o chiamato)

### 1.0 Dettaglio: a cosa servivano e perché sono morti

- **useAlert.js**: Sistema alert centralizzato (toast, banner, modal). AlertProvider + useAlert. Mai completato: AlertProvider non nel layout, componente `Alert` non esiste, useAlert mai importato. Le pagine usano ConfirmModal o alert().
- **alertHelper.js**: showAlert, showConfirm, createErrorAlert (network/auth/quota). Ponte verso useAlert. Mai importato; fa solo console.warn.
- **useIsMounted.js**: Hook per evitare setState su componenti smontati dopo fetch. Mai importato.
- **aiRules.js**: Export STILI_GIOCO_FISSI, COMPETENZE_ALLENATORE_RULES, NON_INVENTARE_DATI, ecc. Single source of truth per paletti AI. Mai importato; regole copiate inline nei prompt.
- **playerPerformanceHelper.js**: Calcola media rating, trend match per giocatore → tabella player_performance_aggregates. Doveva essere chiamato dopo save-match. Mai chiamato; commenti in route "che non esiste"; tabella vuota.
- **remove-dead-lines.js**: One-off per rimuovere righe 928–999 da gestione-formazione. Eseguito; rieseguirlo romperebbe.
- **fix-prompt.js**: One-off per sostituire sezione SUGGERIMENTI del prompt. Prompt cambiato; script obsoleto.
- **rollback/**: Backup ragHelper, countermeasuresHelper, analyze-match. Solo storico; Git equivalente.

### 1.1 Librerie – mai importate (riepilogo)

| File | Motivo |
|------|--------|
| **`lib/useAlert.js`** | AlertProvider e useAlert mai importati. Nessun componente li usa. alertHelper li richiama concettualmente ma l’hook non è nel layout. |
| **`lib/useIsMounted.js`** | Mai importato da nessun file. |
| **`lib/alertHelper.js`** | Mai importato. showAlert/showConfirm esistono ma nessuna chiamata. |
| **`lib/aiRules.js`** | STILI_GIOCO_FISSI, COMPETENZE_ALLENATORE_RULES, ecc. mai usati. Le regole sono inline nei prompt (assistant-chat, countermeasuresHelper, analyze-match). |
| **`lib/playerPerformanceHelper.js`** | Mai importato. save-match e update-match hanno commenti "Rimuovi chiamata a playerPerformanceHelper che non esiste". Aggregati `player_performance_aggregates` non usati. |

### 1.2 Script one-off

| File | Motivo |
|------|--------|
| **`scripts/remove-dead-lines.js`** | Script one-off che rimuove righe 928–999 da gestione-formazione. Dopo l’uso può causare problemi se rieseguito. |
| **`scripts/fix-prompt.js`** | Script one-off per sostituire una sezione del prompt. Prompt cambiato; script probabilmente obsoleto. |

### 1.3 Cartella rollback

| Percorso | Contenuto |
|----------|-----------|
| **`rollback/`** | 9+ file di backup (ragHelper, countermeasuresHelper, analyze-match da 26/29 gen). Non usati a runtime. Utili solo per rollback manuale. |

---

## 2. Codice parzialmente morto

| File | Nota |
|------|------|
| **`lib/useAlert.js` + `lib/alertHelper.js`** | Sistema alert progettato ma mai integrato (no AlertProvider nel layout). Le pagine usano `ConfirmModal`, `alert()`, o gestione errori custom. |

---

## 3. Documenti potenzialmente inutili o ridondanti

### 3.1 Superseduti / storici

| Documento | Motivo |
|-----------|--------|
| **`docs/AUDIT_DOCUMENTAZIONE_2026.md`** | Esplicitamente sostituito da `docs/AUDIT_ENTERPRISE_2026.md`. Mantiene solo mappatura storica. |
| **`memoria_attila_backup/*.md`** | 7 file di backup (01–08). Contenuto probabilmente confluito in `info_rag.md` e `memoria_attila_definitiva_unificata.txt`. Nessun riferimento nel codice. |

### 3.2 Duplicati / molto sovrapposti

| Documento | Nota |
|-----------|------|
| **`docs/VERIFICA_STILI_EFOOTBALL.md`** vs **`docs/VERIFICA_RAG_STILI_E_ABILITA.md`** | Entrambi su stili eFootball. Possibile unificazione. |
| **`docs/AUDIT_STILI_GIOCATORE_CREARE_RICEVERE.md`** vs **`docs/AUDIT_ALLINEAMENTO_SUPABASE_ISTRUZIONI_PALETTI.md`** | Diversi focus, ma entrambi audit. Tenere entrambi o unificare. |

### 3.3 Peso vs utilità

| Documento | Dimensione | Nota |
|-----------|------------|------|
| **`docs/BRAINSTORM_DOCUMENTO.md`** | ~122 KB | Backlog/analisi molto grande. Referenziato da ANALISI_BRAINSTORM. Valutare archivio o sfoltimento. |
| **`docs/ANALISI_BRAINSTORM_RIGA_PER_RIGA.md`** | Analisi dettagliata | Riferita da FLUSSO_DATI. Utile per integrazioni RAG; non rimuovere senza valutazione. |

### 3.4 Check one-off (eseguiti)

| Documento | Nota |
|-----------|------|
| **`docs/CHECK_COERENZA_CREDITI_END_TO_END.md`** | Risolveva il bug "5 crediti". Fix applicato. Storico utile, ma non più operativo. |
| **`docs/AUDIT_ENTERPRISE_CREDITI_PERCHÉ_SOLO_5.md`** | Stesso contesto. Storico. |

---

## 4. Valutazione: in più, compromette, conviene implementare?

| File | In più al sistema? | Compromette se rimosso? | Conviene implementare? |
|------|--------------------|-------------------------|-------------------------|
| **useAlert + alertHelper** | Sì, surplus | No | No. L'app usa `errorHelper` (mapErrorToUserMessage) + `ConfirmModal` + `alert()`. Sistema già funzionante. Implementare richiederebbe creare componente Alert, integrare AlertProvider nel layout, sostituire tutti i punti che usano alert/ConfirmModal. Costo alto, beneficio marginale (UX leggermente migliore). |
| **useIsMounted** | Sì | No | No. Pattern obsoleto; oggi si usa AbortController o useEffect con cleanup. Nessun componente lo richiede. |
| **aiRules** | Sì, pura ridondanza | No | **Sì, refactor conveniente**. Le regole sono duplicate in 3 file (assistant-chat, countermeasuresHelper, analyze-match). Refactoring: import da aiRules invece di copiare. Beneficio: single source of truth, modifica una riga e aggiorna ovunque. Impatto: cambiare 3 file, basso rischio. |
| **playerPerformanceHelper** | Sì | No | **Forse, bassa priorità**. generate-countermeasures calcola già `playerPerformanceAgainstSimilar` on-the-fly da matches. Il helper avrebbe pre-aggregato in tabella per evitare ricalcolo. Beneficio: performance (meno query) e riuso in assistant-chat. Ma oggi funziona già. Implementare = aggiungere 2 righe in save-match e update-match. ROI basso. |
| **Scripts + rollback** | Sì | No | No. Eliminare. |

### Raccomandazione sintetica

1. **Rimuovere senza pensieri**: useAlert, alertHelper, useIsMounted, scripts, rollback.
2. **Rimuovere aiRules** solo se non si fa refactor; **altrimenti usarlo** con refactor (import nei 3 prompt).
3. **playerPerformanceHelper**: rimuovere oppure tenere per implementazione futura (2 righe in save-match). Non critico.

---

## 5. Azioni consigliate (priorità)

### Priorità alta (rimozione sicura)

| Azione | File |
|--------|------|
| Rimuovere | `lib/useAlert.js`, `lib/useIsMounted.js`, `lib/alertHelper.js` (sistema alert non usato) |
| Rimuovere | `lib/aiRules.js` (regole non importate; presenti inline nei prompt) |
| Rimuovere | `lib/playerPerformanceHelper.js` (mai chiamato; tabelle `player_performance_aggregates` non usate) |
| Archiviare/rimuovere | Cartella `rollback/` (backup datati) |
| Rimuovere | `scripts/remove-dead-lines.js`, `scripts/fix-prompt.js` (one-off obsoleti) |

### Priorità media (valutare)

| Azione | File |
|--------|------|
| Archiviare | `memoria_attila_backup/*` (se contenuto confluito altrove) |
| Unificare o marcare storico | `docs/AUDIT_DOCUMENTAZIONE_2026.md` |
| Valutare | `docs/BRAINSTORM_DOCUMENTO.md` (archivio o versione ridotta) |

### Priorità bassa (manutenzione)

| Azione | File |
|--------|------|
| Verificare riferimento | `DOCUMENTAZIONE_RIFERIMENTO.md` – rimuovere voci per useAlert, alertHelper, playerPerformanceHelper dopo eliminazione |
| Aggiornare | `INDICE_DOCUMENTAZIONE.md` se si rimuovono documenti |

---

## 6. RIMOSSI (pulizia 3 feb 2026)

- `lib/useAlert.js`
- `lib/alertHelper.js`
- `lib/useIsMounted.js`
- `lib/aiRules.js`
- `lib/playerPerformanceHelper.js`
- `scripts/remove-dead-lines.js`
- `scripts/fix-prompt.js`
- `rollback/*` (10 file)

## 7. File verificati come usati

- `lib/guideTours.js` → GuideTour.jsx
- `lib/playerPhotoTypes.js` → gestione-formazione, giocatore/[id]
- `lib/tacticalInstructions.js` → TacticalSettingsPanel, save-tactical-settings
- `lib/validateFormationLimits.js` → validateFormationLimits
- `app/favicon.ico/route.ts` → favicon dinamico (usato)
- Tutte le API route documentate → usate
- `app/api/tasks/generate` → documentato, usato per generazione manuale/test
