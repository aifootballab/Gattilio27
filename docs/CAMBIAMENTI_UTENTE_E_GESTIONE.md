# Cosa è cambiato — Lato utente e lato gestione

**Riferimento:** sessioni audit, revisione logica, fix e documentazione (2026-02-14).

---

## Lato utente (cosa vede / vive)

| Cambiamento | Effetto |
|-------------|--------|
| **Task dopo pause lunghe** | I task delle settimane passate si aggiornano quando salvi una partita o apri gli obiettivi. Niente più obiettivi “bloccati” da settimane. |
| **Modifica partita** | Se modifichi una partita (risultato, statistiche, formazione consigliata), il progresso degli obiettivi settimanali si ricalcola subito (come quando ne salvi una nuova). |
| **Dettaglio punteggio AI (barra)** | Nel punteggio Conoscenza AI compare anche la voce **Palestra Coach** (il 10%). Il messaggio “come aumentare il punteggio” può suggerire di usare la Palestra Coach. |
| **Errori e sessione nella tua lingua** | Messaggi come “Sessione scaduta”, “Autenticazione richiesta” e altri errori di rete/permessi sono mostrati in **italiano o inglese** in base alla lingua scelta, non più solo in inglese. |
| **Conferme eliminazione / recupero password** | Testi già presenti in IT/EN; nessun cambiamento di comportamento. |

---

## Lato gestione (team / prodotto / operazioni)

| Cambiamento | Effetto |
|-------------|--------|
| **Documentazione** | Aggiunti/aggiornati: revisione logica (REVISIONE_LOGICA_PIATTAFORMA), flussi e Supabase (FLUSSI_LOGICA_SUPABASE), confronto dashboard (CONFRONTO_DASHBOARD), sicurezza e doppia lingua (SICUREZZA_DOPPIA_LINGUA), audit (AUDIT_*, CONFRONTO_DASHBOARD). Riferimenti precisi a file e righe per fix e decisioni. |
| **API e backend** | (1) Finestra task: nessun limite “ultime 2 settimane”; (2) API ai-knowledge: breakdown sempre con `coach_training` e cache normalizzata; (3) update-match: dopo modifica partita viene chiamato anche l’aggiornamento task (come in save-match). |
| **Codice** | Rimosse costanti non usate in leaderboardHelper (CAP_TASKS, PTS_PER_TASK, GROWTH_GOAL_TYPES, ecc.). Barra conoscenza: CTA “prossimo step” con pesi corretti e passo Palestra Coach; i18n: chiave `ctaNextStepCoachTraining`. |
| **Errori e lingua** | errorHelper: messaggi IT+EN per tutti i tipi di errore mappati; componenti (AssistantChat, CoachFeedbackChat, match/new, gestione-formazione) passano `lang` a `mapErrorToUserMessage` così l’utente vede sempre il messaggio nella lingua attiva. |
| **Nessun cambiamento di processo** | Nessuna nuova procedura operativa o di rilascio; nessun cambio di configurazione Supabase obbligatorio. |

---

**In sintesi:** L’utente ha task sempre allineati (anche dopo pause o dopo modifica partita), vede il punteggio AI completo (con Palestra Coach) e messaggi di errore/sessione nella propria lingua. La gestione ha documentazione aggiornata, codice ripulito e comportamento API/backend allineato alle decisioni di prodotto.
