# Documentazione enterprise (docs/)

Solo documenti utili e di riferimento per produzione.

## Indice rapido

| Sezione | Contenuto |
|--------|-----------|
| [Check e coerenza](#check-e-coerenza) | Supabase, sicurezza, task, impostazioni |
| [Barra Conoscenza AI](#barra-conoscenza-ai) | Analisi e audit barra |
| [Diagnostic, chat, RAG](#diagnostic-chat-e-rag) | Diagnostic, riassunto, roadmap, DB |
| [Auth e email](#auth-e-email) | Recupero password, SMTP, redirect |
| [Crediti e business](#crediti-e-business) | Crediti AI, Hero Points, pagamenti |
| [Classifica](#classifica) | Audit e design classifica mensile |
| [UX enterprise e guida cliente](#ux-enterprise-e-guida-cliente) | Guida cliente, fiducia, profilazione, responsività, linee guida UX/responsive |
| [Riferimento e audit](#riferimento-e-audit) | Rosa, task, chat, UX, servizio cliente |
| [Backlog](#backlog) | Cose da fare (priorità) |

---

## Check e coerenza
- **CHECK_COERENZA_SUPABASE_FRONT_BACK_SICUREZZA_TRADUZIONI.md** – Check Supabase (tabelle, RLS, migration), backend (auth, user_id), frontend, sicurezza, traduzioni IT/EN
- **COERENZA_SAVE_TACTICAL_SETTINGS.md** – Coerenza salvataggio impostazioni tattiche
- **COERENZA_TASK_DATI_CLIENTE.md** – Coerenza task e dati cliente
- **AUDIT_TASK_CLIENTE_SUPABASE_ROUTE.md** – Audit task cliente, Supabase e route

## Barra Conoscenza AI
- **ANALISI_ENTERPRISE_BARRA_CONOSCENZA_AI.md** – Come funziona la barra, perché non si aggiorna, Pattern/Successi, CTA dinamica, fix (coach, refresh dopo Informazioni IA)
- **AUDIT_BARRA_CONOSCENZA_AI.md** – Audit tecnico barra, API, i18n, eventi (knowledge-should-refresh, ?refresh=1, utilizzo stimato)

## Diagnostic, chat e RAG
- **IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md** – Piano e implementazione: diagnostic, "Aggiorna analisi", cache, suggerimenti (stato: implementato)
- **DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md** – Dati, flussi, difficoltà e struttura del riassunto analisi
- **CONTROLLO_E2E_DIAGNOSTIC_CHAT.md** – Controllo end-to-end: auth, flussi (diagnostic, Informazioni IA, Statistiche di gioco, partite inserite), sicurezza, coerenza
- **RIASSUNTO_E_NUOVE_INFORMAZIONI_CHAT.md** – Da dove arrivano le informazioni (Informazioni IA, Statistiche di gioco), come entrano nel riassunto, come la chat le usa; RAG vs riassunto; partite inserite vs statistiche screenshot (nessun conflitto)
- **ROADMAP_ENTERPRISE_COACH.md** – Roadmap prodotto enterprise e coach vero (priorità profilo, freschezza dati, UX/responsivo)
- **AUDIT_SUPABASE_TABELLE_E_ALLINEAMENTO.md** – Allineamento DB/codice, tabelle public, quando si popolano (auth/storage/realtime/vault), sottotabelle (players ↔ playing_styles)
- **AUDIT_IA_RAG.md** – RAG eFootball, info_rag.md, classificazione domande

## Auth e email
- **RECUPERO_PASSWORD.md** – Flusso recupero password, configurazione Supabase, task SMTP
- **AUTH_EMAIL_ENTERPRISE_E_REDIRECT.md** – Redirect email, Site URL, NEXT_PUBLIC_APP_URL
- **SICUREZZA.md** – Checklist sicurezza, env, RLS, avvisi Supabase
- **AUDIT_EMAIL_RECUPERO_PASSWORD_E2E.md** – Audit log email, cosa controllare in Dashboard
- **EMAIL_NON_ARRIVANO_DIAGNOSI_ENTERPRISE.md** – Diagnosi email non arrivate, Custom SMTP
- **SMTP_RESEND_SETUP_NOCODE.md** – Setup SMTP con Resend (guida passo-passo)

## Crediti e business
- **SISTEMA_CREDITI_AI.md** – Sistema crediti, utilizzo, periodi
- **COSTI_API_E_PRICING_CREDITI.md** – Costi API e pricing crediti
- **RIEPILOGO_HERO_POINTS_CREDITI.md** – Hero points e crediti
- **INTEGRAZIONE_SITO_PAGAMENTI_HERO_POINTS.md** – Integrazione pagamenti

## Classifica
- **CLASSIFICA_AUDIT.md** – Audit classifica
- **DESIGN_CLASSIFICA_MENSILE_E_PREMI.md** – Design classifica mensile e premi

## UX enterprise e guida cliente
- **PIANO_UX_ENTERPRISE_GUIDA_CLIENTE.md** – Piano enterprise: guida il cliente, fiducia (ragionamenti/calcoli da conoscenza), importanza profilazione, responsività, priorità P0–P3
- **UX_RESPONSIVE_LINEE_GUIDA.md** – Linee guida obbligatorie: responsività (breakpoint, touch target, overflow), UX “siamo una guida”, checklist pre-release

## Riferimento e audit
- **GESTIONE_ROSA_FUNZIONI.md** – Funzioni gestione rosa, formazione
- **TASK_E_KNOWLEDGE_ESPERIENZA_CLIENTE.md** – Task (obiettivi settimanali), barra Conoscenza, cosa succede quando il cliente completa un task
- **TUTORIAL_COMPLETAMENTO_CLIENTE.md** – Ordine consigliato per completare setup (profilo, rosa, partite, statistiche), perché la barra non si aggiornava, utilizzo stimato, idee tutorial in-app
- **AUDIT_CHAT_COACH.md** – Audit chat coach (ripetività, tasti, varietà consigli)
- **SERVIZI_CLIENTE_EFOOTBALL_AI_COACH_DESCRIZIONE_COMPLETA.md** – Descrizione cartelle e funzioni per servizio al cliente (pagine, API, lib, components)
- **AUDIT_UX_IMPOSTAZIONI_PROFILO_E_HERO_POINTS.md** – UX impostazioni profilo e Hero Points
- **AUDIT_ENTERPRISE_TASK_FONTI_VERITA.md** – Enterprise task e fonti di verità
- **ODIT_CODEX.md** – Riferimento ODIT/Codex

## Backlog
- **COSE_DA_FARE.md** – Cose da fare (backlog): rate limiting, PII nei log, rate limiter serverless, priorità

## Operativi (check account / interno)
- **CHECK_ACCOUNT_ATTILIO_MAZZETTI.md** – Check account specifico (uso interno)
